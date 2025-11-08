import { createTeam, joinTeamByCode } from "@/server-actions/teams";
import { supabaseServer } from "@/lib/supabase/server";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Link from "next/link";
import Badge from "@/components/ui/Badge";

import { redirect } from "next/navigation";

export default async function TeamsPage() {
  async function createTeamAction(form: FormData) {
    "use server";
    const teamId = await createTeam(form);
    redirect(`/teams/${teamId}`);
  }
  async function joinTeam(form: FormData) {
    "use server";
    const code = (form.get("code") as string | null)?.trim();
    if (!code) throw new Error("Code required");
    await joinTeamByCode(code);
    redirect("/teams");
  }

  // Fetch user's teams
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let teams: Array<{
    id: string;
    name: string;
    role: string;
    memberCount: number;
    projectCount: number;
  }> = [];

  if (user) {
    const { data: memberships } = await supabase
      .from("memberships")
      .select("team_id, role, teams!inner(id, name)")
      .eq("user_id", user.id);

    if (memberships) {
      teams = await Promise.all(
        memberships.map(async (m) => {
          const team = m.teams as unknown as { id: string; name: string };

          // Count members
          const { count: memberCount } = await supabase
            .from("memberships")
            .select("user_id", { count: "exact", head: true })
            .eq("team_id", team.id);

          // Count projects
          const { count: projectCount } = await supabase
            .from("projects")
            .select("id", { count: "exact", head: true })
            .eq("team_id", team.id);

          return {
            id: team.id,
            name: team.name,
            role: m.role,
            memberCount: memberCount || 0,
            projectCount: projectCount || 0,
          };
        })
      );
    }
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="heading-1 mb-2">Teams</h1>
          <p className="text-muted">
            {teams.length > 0
              ? "Manage your teams and create new ones"
              : "Create a new team or join an existing one"}
          </p>
        </div>

        {/* Teams List */}
        {teams.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Your Teams</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <Link key={team.id} href={`/teams/${team.id}`}>
                  <Card className="h-full hover:border-primary/50 transition-all cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <Badge variant={team.role === "admin" ? "success" : "default"}>
                        {team.role}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm text-muted">
                      <div className="flex items-center gap-2">
                        <span>👥</span>
                        <span>
                          {team.memberCount}{" "}
                          {team.memberCount === 1 ? "member" : "members"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>📁</span>
                        <span>
                          {team.projectCount}{" "}
                          {team.projectCount === 1 ? "project" : "projects"}
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
          {/* Create Team */}
          <Card>
            <div className="mb-6">
              <CardTitle className="mb-2">Create a Team</CardTitle>
              <CardDescription>
                Start a new team to collaborate on projects
              </CardDescription>
            </div>
            <form action={createTeamAction} className="space-y-4">
              <Input
                name="name"
                label="Team Name"
                placeholder="e.g., CS101 Final Project"
                required
              />
              <Button type="submit" className="w-full">
                Create Team
              </Button>
            </form>
          </Card>

          {/* Join Team */}
          <Card>
            <div className="mb-6">
              <CardTitle className="mb-2">Join by Invite Code</CardTitle>
              <CardDescription>
                Use an invite code shared by your teammates
              </CardDescription>
            </div>
            <form action={joinTeam} className="space-y-4">
              <Input
                name="code"
                label="Invite Code"
                placeholder="e.g., abcd1234"
                required
              />
              <Button type="submit" variant="secondary" className="w-full">
                Join Team
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}
