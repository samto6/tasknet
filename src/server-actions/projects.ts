"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { SEMESTER_16 } from "@/lib/templates";

export async function createProjectFromTemplate(args: {
  team_id: string;
  name: string;
  semester_start_date: string; // ISO date (yyyy-mm-dd)
}) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Insert project
  const { data: proj, error: pErr } = await supabase
    .from("projects")
    .insert({ team_id: args.team_id, name: args.name, template_key: "SEMESTER_16" })
    .select("id")
    .single();
  if (pErr) throw pErr;

  // Compute milestone due dates from semester_start_date + (week-1)*7 days
  const start = new Date(args.semester_start_date + "T00:00:00Z");
  const milestones = SEMESTER_16.map((m) => {
    const due = new Date(start);
    due.setUTCDate(due.getUTCDate() + (m.week - 1) * 7);
    return { project_id: proj!.id, title: m.title, due_at: due.toISOString() };
  });
  if (milestones.length) {
    const { error: mErr } = await supabase.from("milestones").insert(milestones);
    if (mErr) throw mErr;
  }
  return proj!.id as string;
}
