"use server";
import { randomUUID } from "crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

export async function createTeam(form: FormData) {
  const name = z.string().min(2).parse(form.get("name"));
  const supabase = await supabaseServer();
  const {
    data: { session },
    error: sessionErr,
  } = await supabase.auth.getSession();
  if (!session) throw new Error(sessionErr?.message ?? "No active session");
  const {
    data: { user },
    error: auErr,
  } = await supabase.auth.getUser();
  if (!user) throw new Error(auErr?.message ?? "Unauthenticated");

  // ensure the profile row exists before inserting the team so the trigger can add the membership without FK issues
  const { error: profileErr } = await supabase
    .from("users")
    .upsert({
      id: user.id,
      email: user.email ?? null,
      name: typeof user.user_metadata === "object" && user.user_metadata && "full_name" in user.user_metadata
        ? String((user.user_metadata as Record<string, unknown>).full_name ?? "") || null
        : null,
    });
  if (profileErr) throw profileErr;

  const invite_code = Math.random().toString(36).slice(2, 10);
  const teamId = randomUUID();
  const { error } = await supabase
    .from("teams")
    .insert({ id: teamId, name, invite_code }, { returning: "minimal" });
  if (error) throw error;

  // create default prefs if missing (idempotent)
  const { error: prefsErr } = await supabase
    .from("user_prefs")
    .upsert(
      { user_id: user.id },
      { onConflict: "user_id", ignoreDuplicates: true }
    );
  if (prefsErr) throw prefsErr;

  return teamId;
}

export async function joinTeamByCode(code: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  const { error } = await supabase.rpc("join_team_by_token", { _token: code });
  if (error) throw error;
}
