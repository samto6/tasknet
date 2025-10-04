"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

export async function createTeam(form: FormData) {
  const name = z.string().min(2).parse(form.get("name"));
  const supabase = await supabaseServer();
  const {
    data: { user },
    error: auErr,
  } = await supabase.auth.getUser();
  if (!user) throw new Error(auErr?.message ?? "Unauthenticated");

  const invite_code = Math.random().toString(36).slice(2, 10);
  const { data, error } = await supabase
    .from("teams")
    .insert({ name, invite_code })
    .select("id")
    .single();
  if (error) throw error;

  // also ensure profile rows exist
  await supabase
    .from("users")
    .upsert({
      id: user.id,
      email: user.email ?? null,
      name: typeof user.user_metadata === "object" && user.user_metadata && "full_name" in user.user_metadata
        ? String((user.user_metadata as Record<string, unknown>).full_name ?? "") || null
        : null,
    });
  // create default prefs if missing (idempotent)
  await supabase
    .from("user_prefs")
    .upsert(
      { user_id: user.id },
      { onConflict: "user_id", ignoreDuplicates: true }
    );

  return data!.id as string;
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
