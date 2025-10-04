import { supabaseServer } from "@/lib/supabase/server";
import CopyButton from "./components/CopyButton";

export default async function TeamDetailPage({ params }: { params: { teamId: string } }) {
  const supabase = await supabaseServer();
  const { data: team } = await supabase
    .from("teams")
    .select("id,name,invite_code")
    .eq("id", params.teamId)
    .maybeSingle();

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "";
  const inviteUrl = team?.invite_code ? `${origin}/join?code=${encodeURIComponent(team.invite_code)}` : "";

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{team?.name ?? "Team"}</h1>
      <div>
        <a className="underline" href={`/teams/${params.teamId}/new-project`}>Create project from template</a>
      </div>
      {team?.invite_code ? (
        <section className="space-y-2">
          <div className="text-sm opacity-70">Invite code</div>
          <div className="font-mono text-lg">{team.invite_code}</div>
          <div className="flex items-center gap-2">
            <input className="border p-2 rounded w-full" readOnly value={inviteUrl} />
            <CopyButton text={inviteUrl} />
          </div>
        </section>
      ) : null}
    </main>
  );
}
