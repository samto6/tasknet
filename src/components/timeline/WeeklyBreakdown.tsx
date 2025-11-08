"use client";
import { TimelineTask, TimelineMilestone } from "@/server-actions/timeline";
import Card, { CardTitle } from "@/components/ui/Card";

type WeekData = {
  weekStart: Date;
  weekEnd: Date;
  weekNumber: number;
  tasks: TimelineTask[];
  milestones: TimelineMilestone[];
};

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Adjust to Sunday
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function groupTasksByWeek(
  tasks: TimelineTask[],
  milestones: TimelineMilestone[]
): WeekData[] {
  const weekMap = new Map<string, WeekData>();

  // Process tasks
  tasks.forEach((task) => {
    if (!task.due_at) return;
    const dueDate = new Date(task.due_at);
    const { start, end } = getWeekBounds(dueDate);
    const weekKey = start.toISOString();

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, {
        weekStart: start,
        weekEnd: end,
        weekNumber: getWeekNumber(start),
        tasks: [],
        milestones: [],
      });
    }

    weekMap.get(weekKey)!.tasks.push(task);
  });

  // Process milestones
  milestones.forEach((milestone) => {
    if (!milestone.due_at) return;
    const dueDate = new Date(milestone.due_at);
    const { start, end } = getWeekBounds(dueDate);
    const weekKey = start.toISOString();

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, {
        weekStart: start,
        weekEnd: end,
        weekNumber: getWeekNumber(start),
        tasks: [],
        milestones: [],
      });
    }

    weekMap.get(weekKey)!.milestones.push(milestone);
  });

  // Sort weeks by date
  return Array.from(weekMap.values()).sort(
    (a, b) => a.weekStart.getTime() - b.weekStart.getTime()
  );
}

function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startStr = start.toLocaleDateString("en-US", options);
  const endStr = end.toLocaleDateString("en-US", options);
  return `${startStr} - ${endStr}`;
}

type Props = {
  tasks: TimelineTask[];
  milestones: TimelineMilestone[];
  onTaskClick?: (taskId: string) => void;
};

export default function WeeklyBreakdown({ tasks, milestones, onTaskClick }: Props) {
  const weeks = groupTasksByWeek(tasks, milestones);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (weeks.length === 0) {
    return (
      <div className="text-center py-16 text-muted">
        <div className="text-4xl mb-4">📅</div>
        <p>No tasks or milestones scheduled yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {weeks.map((week) => {
        const isCurrentWeek =
          today >= week.weekStart && today <= week.weekEnd;

        return (
          <Card
            key={week.weekStart.toISOString()}
            className={isCurrentWeek ? "border-sage-green border-2" : ""}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle className="mb-1">
                  Week {week.weekNumber}
                  {isCurrentWeek && (
                    <span className="ml-2 text-xs px-2 py-1 bg-sage-green/20 text-sage-green rounded-[4px]">
                      This Week
                    </span>
                  )}
                </CardTitle>
                <p className="text-sm text-muted">
                  {formatDateRange(week.weekStart, week.weekEnd)}
                </p>
              </div>
              <div className="text-sm text-muted">
                {week.tasks.length} {week.tasks.length === 1 ? "task" : "tasks"}
                {week.milestones.length > 0 &&
                  ` • ${week.milestones.length} ${week.milestones.length === 1 ? "milestone" : "milestones"}`}
              </div>
            </div>

            {/* Milestones */}
            {week.milestones.length > 0 && (
              <div className="mb-4">
                {week.milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="flex items-center gap-2 p-3 bg-soft-lavender/10 rounded-[6px] border-2 border-soft-lavender/30 mb-2"
                  >
                    <div className="text-lg">🎯</div>
                    <div className="flex-1">
                      <div className="font-medium text-soft-lavender">
                        {milestone.title}
                      </div>
                      <div className="text-xs text-muted">
                        Milestone •{" "}
                        {milestone.due_at &&
                          new Date(milestone.due_at).toLocaleDateString()}
                      </div>
                    </div>
                    {milestone.status === "done" && (
                      <div className="text-xs px-2 py-1 bg-sage-green/20 text-sage-green rounded-[4px]">
                        ✓ Complete
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tasks */}
            <div className="space-y-2">
              {week.tasks.length === 0 ? (
                <p className="text-sm text-muted text-center py-4">
                  No tasks this week
                </p>
              ) : (
                week.tasks.map((task) => {
                  const isOverdue = task.due_at && new Date(task.due_at) < today;

                  return (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick?.(task.id)}
                      className="flex items-start gap-3 p-3 bg-background rounded-[6px] border-2 border-transparent hover:border-sage-green transition-colors cursor-pointer group"
                    >
                      <div
                        className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                          task.status === "done"
                            ? "bg-sage-green border-sage-green"
                            : task.status === "in_progress"
                            ? "border-warm-coral"
                            : "border-border"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {task.title}
                        </div>
                        <div className="text-xs text-muted mt-0.5">
                          {task.project_name}
                          {task.milestone_title && ` • ${task.milestone_title}`}
                          {task.due_at && (
                            <span className={isOverdue ? "text-warm-coral ml-2" : "ml-2"}>
                              • {new Date(task.due_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {task.assignees.length > 0 && (
                          <div className="text-xs text-muted mt-1">
                            👤 {task.assignees.map((a) => a.name || "Unknown").join(", ")}
                          </div>
                        )}
                      </div>
                      {task.status === "in_progress" && (
                        <span className="text-xs px-2 py-1 bg-warm-coral/20 text-warm-coral rounded-[4px] flex-shrink-0">
                          In Progress
                        </span>
                      )}
                      {task.status === "done" && (
                        <span className="text-xs px-2 py-1 bg-sage-green/20 text-sage-green rounded-[4px] flex-shrink-0">
                          ✓ Done
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
