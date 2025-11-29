import { supabaseServer } from "@/lib/supabase/server";
import { getProjectMilestones } from "@/server-actions/milestones";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import MilestoneRow from "./MilestoneRow";
import NewMilestoneForm from "./NewMilestoneForm";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default async function MilestonesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await supabaseServer();

  // Get project info
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, team_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    return (
      <main className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="heading-1 mb-4">Project not found</h1>
          <Link href="/teams">
            <Button>Back to Teams</Button>
          </Link>
        </div>
      </main>
    );
  }

  // Get current user's role
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("team_id", project.team_id)
    .eq("user_id", user?.id || "")
    .maybeSingle();

  const isAdmin = membership?.role === "admin";

  // Get all milestones with stats
  let milestones: Awaited<ReturnType<typeof getProjectMilestones>> = [];
  try {
    milestones = await getProjectMilestones(projectId);
  } catch (error) {
    console.error("Error fetching milestones:", error);
  }

  // Calculate overall progress
  const totalTasks = milestones.reduce((sum, m) => sum + m.totalTasks, 0);
  const completedTasks = milestones.reduce((sum, m) => sum + m.completedTasks, 0);
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Link href={`/projects/${projectId}/tasks`}>
              <Button variant="ghost" className="text-sm">
                ← Back to Tasks
              </Button>
            </Link>
            <Link href={`/projects/${projectId}/timeline`}>
              <Button variant="secondary" size="sm">
                <span className="mr-2">📅</span>
                Timeline
              </Button>
            </Link>
          </div>
          <h1 className="heading-1 mb-2">{project.name} - Milestones</h1>
          <p className="text-muted">
            View and manage project milestones
            {!isAdmin && " (view only)"}
          </p>
        </div>

        {/* Overall Progress */}
        <Card className="mb-6">
          <CardTitle className="mb-2">Overall Progress</CardTitle>
          <CardDescription className="mb-4">
            {completedTasks} of {totalTasks} tasks completed across all milestones
          </CardDescription>
          <div className="w-full bg-muted/30 rounded-full h-6 overflow-hidden border-2 border-border">
            <div
              className="h-full bg-sage-green flex items-center justify-center text-xs font-bold text-white transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            >
              {overallProgress > 10 && `${overallProgress}%`}
            </div>
          </div>
          {overallProgress <= 10 && overallProgress > 0 && (
            <p className="text-xs text-muted mt-2">{overallProgress}%</p>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Milestones List */}
          <div className="lg:col-span-2">
            <Card>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <CardTitle>Milestones</CardTitle>
                  <CardDescription>
                    {milestones.length} {milestones.length === 1 ? "milestone" : "milestones"}
                  </CardDescription>
                </div>
              </div>

              {milestones.length === 0 ? (
                <div className="text-center py-12 text-muted">
                  <p className="mb-2">No milestones yet</p>
                  {isAdmin && (
                    <p className="text-sm">Create your first milestone using the form →</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {milestones.map((milestone) => (
                    <MilestoneRow
                      key={milestone.id}
                      milestone={milestone}
                      isAdmin={isAdmin}
                      projectId={projectId}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Add Milestone Form (Admin Only) */}
          {isAdmin && (
            <div>
              <Card>
                <CardTitle className="mb-2">New Milestone</CardTitle>
                <CardDescription className="mb-6">
                  Add a new milestone to your project
                </CardDescription>
                <NewMilestoneForm projectId={projectId} />
              </Card>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
