import { createTeam } from "@/server-actions/teams";
import { getUserStreak, getUserBadges } from "@/server-actions/gamification";
import { getMyTasks, getUserStats } from "@/server-actions/tasks";
import { redirect } from "next/navigation";
import Link from "next/link";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

// User-specific page - must be dynamic
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  async function createTeamAndGo(form: FormData) {
    "use server";
    const teamId = await createTeam(form);
    redirect(`/teams/${teamId}`);
  }

  // Fetch user data in parallel
  const [streak, badges, upcomingTasks, stats] = await Promise.all([
    getUserStreak(),
    getUserBadges(),
    getMyTasks({ limit: 5, dueSoon: true }),
    getUserStats(),
  ]);

  // Check which badges are unlocked
  const badgeKinds = badges.map((b) => b.kind);
  const has7DayStreak = badgeKinds.includes("streak_7");
  const has30DayStreak = badgeKinds.includes("streak_30");

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="heading-1 mb-2">Dashboard</h1>
          <p className="text-muted">Your overview at a glance</p>
        </div>

        {/* Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Stats Overview */}
          <Card className="md:col-span-3">
            <CardTitle className="mb-4">Your Activity</CardTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-sage-green">{stats.completedTasks}</div>
                <div className="text-sm text-muted mt-1">Tasks Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-soft-lavender">{stats.activeProjects}</div>
                <div className="text-sm text-muted mt-1">Active Projects</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-warm-coral">{stats.teamMemberships}</div>
                <div className="text-sm text-muted mt-1">Teams</div>
              </div>
            </div>
          </Card>

          {/* Quick Actions - Tall Card */}
          <Card className="md:row-span-2">
            <CardTitle className="mb-4">Quick Actions</CardTitle>
            <div className="space-y-3">
              <Link
                href="/tasks"
                className="flex items-center gap-3 p-3 bg-background rounded-[6px] border-2 border-transparent hover:border-mint-green transition-colors group"
              >
                <div className="p-2 bg-mint-green/20 rounded-[6px] group-hover:bg-mint-green/30 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mint-green">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium">My Tasks</div>
                  <div className="text-xs text-muted">View all your tasks</div>
                </div>
              </Link>

              <Link
                href="/teams"
                className="flex items-center gap-3 p-3 bg-background rounded-[6px] border-2 border-transparent hover:border-sage-green transition-colors group"
              >
                <div className="p-2 bg-sage-green/20 rounded-[6px] group-hover:bg-sage-green/30 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sage-green">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium">View Teams</div>
                  <div className="text-xs text-muted">Manage your projects</div>
                </div>
              </Link>

              <Link
                href="/timeline"
                className="flex items-center gap-3 p-3 bg-background rounded-[6px] border-2 border-transparent hover:border-warm-coral transition-colors group"
              >
                <div className="p-2 bg-warm-coral/20 rounded-[6px] group-hover:bg-warm-coral/30 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-warm-coral">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium">View Timeline</div>
                  <div className="text-xs text-muted">See your schedule</div>
                </div>
              </Link>

              <Link
                href="/wellness"
                className="flex items-center gap-3 p-3 bg-background rounded-[6px] border-2 border-transparent hover:border-soft-lavender transition-colors group"
              >
                <div className="p-2 bg-soft-lavender/20 rounded-[6px] group-hover:bg-soft-lavender/30 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-soft-lavender">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium">Daily Check-in</div>
                  <div className="text-xs text-muted">Track your wellness</div>
                </div>
              </Link>
            </div>
          </Card>

          {/* Streak Card */}
          <Card className="md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="mb-1">Current Streak</CardTitle>
                <CardDescription>
                  {streak.current_days > 0 ? "Keep it going!" : "Start your streak today!"}
                </CardDescription>
              </div>
              <div className="text-5xl">🔥</div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <div className="text-4xl font-bold text-warm-coral">{streak.current_days}</div>
              <div className="text-muted">days</div>
            </div>
            <div className="mt-2 text-sm text-muted">
              {streak.longest_days > 0 && (
                <span>Longest streak: {streak.longest_days} days • </span>
              )}
              Check in daily to build your streak
            </div>
          </Card>

          {/* My Tasks */}
          <Card className="md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Upcoming Tasks</CardTitle>
              <Link
                href="/tasks"
                className="text-xs text-sage-green hover:text-sage-green/80 transition-colors"
              >
                View All →
              </Link>
            </div>
            <div className="space-y-2">
              {upcomingTasks.length === 0 ? (
                <div className="text-sm text-muted text-center py-8">
                  No upcoming tasks. Create a team and project to get started.
                </div>
              ) : (
                <>
                  {upcomingTasks.map((task) => {
                    const projectData = task.projects as unknown as { name: string; team_id: string };
                    const dueDate = task.due_at ? new Date(task.due_at) : null;
                    const isOverdue = dueDate && dueDate < new Date();

                    return (
                      <Link
                        key={task.id}
                        href={`/projects/${task.project_id}/tasks`}
                        className="flex items-start gap-3 p-3 bg-background rounded-[6px] border-2 border-transparent hover:border-sage-green transition-colors group"
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                          task.status === "done" ? "bg-sage-green border-sage-green" :
                          task.status === "in_progress" ? "border-warm-coral" :
                          "border-border"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{task.title}</div>
                          <div className="text-xs text-muted mt-0.5">
                            {projectData.name}
                            {dueDate && (
                              <span className={isOverdue ? "text-warm-coral ml-2" : "ml-2"}>
                                • Due {dueDate.toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        {task.status === "in_progress" && (
                          <span className="text-xs px-2 py-1 bg-warm-coral/20 text-warm-coral rounded-[4px] flex-shrink-0">
                            In Progress
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </>
              )}
            </div>
          </Card>

          {/* Badges */}
          <Card>
            <CardTitle className="mb-4">Badges</CardTitle>
            <div className="grid grid-cols-2 gap-3">
              <div className={`flex flex-col items-center justify-center p-3 bg-background rounded-[6px] border-2 ${
                has7DayStreak
                  ? "border-sage-green bg-sage-green/5"
                  : "border-border opacity-50"
              }`}>
                <div className="text-2xl mb-1">🏅</div>
                <div className={`text-xs text-center ${has7DayStreak ? "text-sage-green font-medium" : "text-muted"}`}>
                  7-day streak
                </div>
                {has7DayStreak && (
                  <div className="text-[10px] text-muted mt-0.5">Unlocked!</div>
                )}
              </div>
              <div className={`flex flex-col items-center justify-center p-3 bg-background rounded-[6px] border-2 ${
                has30DayStreak
                  ? "border-warm-coral bg-warm-coral/5"
                  : "border-border opacity-50"
              }`}>
                <div className="text-2xl mb-1">🏆</div>
                <div className={`text-xs text-center ${has30DayStreak ? "text-warm-coral font-medium" : "text-muted"}`}>
                  30-day streak
                </div>
                {has30DayStreak && (
                  <div className="text-[10px] text-muted mt-0.5">Unlocked!</div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Create Team Section */}
        <Card>
          <CardTitle className="mb-4">Create a Team</CardTitle>
          <CardDescription className="mb-6">
            Start a new team to collaborate on projects
          </CardDescription>
          <form action={createTeamAndGo} className="flex gap-3">
            <Input
              name="name"
              placeholder="Enter team name"
              required
              className="flex-1"
            />
            <Button type="submit">
              Create Team
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
