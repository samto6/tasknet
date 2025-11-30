import { supabaseServer, getCurrentUser } from "@/lib/supabase/server";
import { getTeamMembers } from "@/server-actions/teams";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import MemberRow from "./MemberRow";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default async function TeamMembersPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const [supabase, user] = await Promise.all([
    supabaseServer(),
    getCurrentUser(),
  ]);

  // Get team info
  const { data: team } = await supabase
    .from("teams")
    .select("id,name")
    .eq("id", teamId)
    .maybeSingle();

  // Get current user's role
  const { data: currentMembership } = await supabase
    .from("memberships")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user?.id || "")
    .maybeSingle();

  const isAdmin = currentMembership?.role === "admin";

  // Get all team members with stats
  let members: Awaited<ReturnType<typeof getTeamMembers>> = [];
  try {
    members = await getTeamMembers(teamId);
  } catch (error) {
    console.error("Error fetching members:", error);
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Link href={`/teams/${teamId}`}>
              <Button variant="ghost" className="text-sm">
                ← Back to Team
              </Button>
            </Link>
          </div>
          <h1 className="heading-1 mb-2">{team?.name} - Members</h1>
          <p className="text-muted">
            Manage team members and their roles
            {!isAdmin && " (view only)"}
          </p>
        </div>

        {/* Members Card */}
        <Card>
          <div className="flex justify-between items-center mb-6">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                {members.length} {members.length === 1 ? "member" : "members"}
              </CardDescription>
            </div>
            {isAdmin && (
              <Link href={`/teams/${teamId}`}>
                <Button variant="secondary" className="text-sm">
                  <span className="mr-2">👥</span>
                  Invite Members
                </Button>
              </Link>
            )}
          </div>

          {members.length === 0 ? (
            <div className="text-center py-12 text-muted">
              <p>No members found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <MemberRow
                  key={member.userId}
                  member={member}
                  teamId={teamId}
                  isAdmin={isAdmin}
                  isCurrentUser={member.userId === user?.id}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Legend */}
        <div className="mt-6 p-4 bg-muted/20 rounded-[8px] border-2 border-border">
          <h3 className="font-bold text-sm mb-2">Legend</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted">
            <div>
              <span className="font-semibold">Tasks:</span> Completed tasks in
              this team
            </div>
            <div>
              <span className="font-semibold">Current Streak:</span> Days of
              consecutive check-ins
            </div>
            <div>
              <span className="font-semibold">Longest Streak:</span> Personal
              best streak
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
