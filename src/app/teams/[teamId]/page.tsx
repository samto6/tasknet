import { supabaseServer } from "@/lib/supabase/server";
import CopyButton from "./components/CopyButton";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";

export default async function TeamDetailPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const supabase = await supabaseServer();
  const { data: team } = await supabase
    .from("teams")
    .select("id,name,invite_code")
    .eq("id", teamId)
    .maybeSingle();

  // Fetch projects for this team
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, created_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "";
  const inviteUrl = team?.invite_code ? `${origin}/join?code=${encodeURIComponent(team.invite_code)}` : "";

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="heading-1 mb-2">{team?.name ?? "Team"}</h1>
          <p className="text-muted">Manage your team and invite members</p>
        </div>

        {/* Projects Section */}
        {projects && projects.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}/tasks`}>
                  <Card className="h-full hover:border-primary/50 transition-all cursor-pointer">
                    <CardTitle className="text-lg mb-3">{project.name}</CardTitle>
                    <div className="text-sm text-muted">
                      <div className="flex items-center gap-2">
                        <span>📅</span>
                        <span>
                          Created{" "}
                          {new Date(project.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardTitle className="mb-4">Quick Actions</CardTitle>
            <div className="space-y-3">
              <Link href={`/teams/${teamId}/new-project`}>
                <Button variant="secondary" className="w-full">
                  <span className="mr-2">➕</span>
                  Create Project from Template
                </Button>
              </Link>
              <Link href={`/teams/${teamId}/members`}>
                <Button variant="secondary" className="w-full">
                  <span className="mr-2">👥</span>
                  View Team Members
                </Button>
              </Link>
            </div>
          </Card>

          {/* Invite Members */}
          {team?.invite_code ? (
            <Card className="md:row-span-2">
              <CardTitle className="mb-2">Invite Members</CardTitle>
              <CardDescription className="mb-6">
                Share this code or URL with your teammates
              </CardDescription>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold uppercase tracking-wide text-foreground mb-2 block">
                    Invite Code
                  </label>
                  <div className="font-mono text-2xl p-4 bg-background rounded-[8px] border-2 border-border text-center">
                    {team.invite_code}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold uppercase tracking-wide text-foreground mb-2 block">
                    Invite URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 px-3 py-2 bg-background border-2 border-border rounded-[6px] text-sm font-mono"
                      readOnly
                      value={inviteUrl}
                    />
                    <CopyButton text={inviteUrl} />
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {/* Team Info */}
          <Card>
            <CardTitle className="mb-4">Team Info</CardTitle>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Team ID</span>
                <span className="font-mono text-xs">{teamId.slice(0, 8)}...</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
