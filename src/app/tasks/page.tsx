import { getMyTasks } from "@/server-actions/tasks";
import Link from "next/link";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

// User-specific page - must be dynamic
export const dynamic = "force-dynamic";

export default async function TasksPage() {
  // Fetch all user tasks grouped by status
  const [openTasks, inProgressTasks, doneTasks] = await Promise.all([
    getMyTasks({ status: "open" }),
    getMyTasks({ status: "in_progress" }),
    getMyTasks({ status: "done" }),
  ]);

  const allTasks = [...openTasks, ...inProgressTasks, ...doneTasks];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, color: "text-warm-coral" };
    if (diffDays === 0) return { text: "Due today", color: "text-warm-coral" };
    if (diffDays === 1) return { text: "Due tomorrow", color: "text-amber-500" };
    if (diffDays <= 7) return { text: `Due in ${diffDays}d`, color: "text-soft-lavender" };
    return { text: date.toLocaleDateString(), color: "text-muted" };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="default">Open</Badge>;
      case "in_progress":
        return <Badge variant="wellness">In Progress</Badge>;
      case "done":
        return <Badge variant="success">Done</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const TaskCard = ({ task }: { task: typeof allTasks[0] }) => {
    const dueInfo = formatDate(task.due_at);
    const project = task.projects as unknown as { name: string; team_id: string };

    return (
      <Link
        href={`/projects/${task.project_id}/tasks`}
        className="block p-4 bg-surface rounded-lg border-2 border-border hover:border-sage-green transition-all group"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground group-hover:text-sage-green transition-colors truncate">
              {task.title}
            </h3>
            {task.description && (
              <p className="text-sm text-muted mt-1 line-clamp-2">{task.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-xs text-muted bg-background px-2 py-1 rounded">
                {project.name}
              </span>
              {dueInfo && (
                <span className={`text-xs ${dueInfo.color}`}>{dueInfo.text}</span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            {getStatusBadge(task.status)}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="heading-1 mb-2">My Tasks</h1>
          <p className="text-muted">All tasks assigned to you across all projects</p>
        </div>

        {allTasks.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <CardTitle className="mb-2">No tasks yet</CardTitle>
              <CardDescription className="mb-6">
                Tasks assigned to you will appear here. Join a team and get started!
              </CardDescription>
              <Link
                href="/teams"
                className="inline-flex items-center justify-center px-4 py-2 bg-sage-green text-white rounded-lg hover:bg-sage-green/90 transition-colors font-medium"
              >
                View Teams
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Summary Stats */}
            <Card className="bg-gradient-to-r from-sage-green/10 to-soft-lavender/10">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-sage-green">{openTasks.length}</div>
                  <div className="text-sm text-muted">Open</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-soft-lavender">{inProgressTasks.length}</div>
                  <div className="text-sm text-muted">In Progress</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-warm-coral">{doneTasks.length}</div>
                  <div className="text-sm text-muted">Completed</div>
                </div>
              </div>
            </Card>

            {/* In Progress Tasks */}
            {inProgressTasks.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-soft-lavender"></span>
                  In Progress ({inProgressTasks.length})
                </h2>
                <div className="space-y-3">
                  {inProgressTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </section>
            )}

            {/* Open Tasks */}
            {openTasks.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sage-green"></span>
                  Open ({openTasks.length})
                </h2>
                <div className="space-y-3">
                  {openTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </section>
            )}

            {/* Done Tasks */}
            {doneTasks.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-warm-coral"></span>
                  Completed ({doneTasks.length})
                </h2>
                <div className="space-y-3 opacity-75">
                  {doneTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
