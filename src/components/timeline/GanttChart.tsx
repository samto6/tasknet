"use client";
import { TimelineTask, TimelineMilestone } from "@/server-actions/timeline";

type GanttItem = {
  id: string;
  title: string;
  type: "task" | "milestone";
  status: string;
  startDate: Date;
  endDate: Date;
  projectName?: string;
  assignees?: { user_id: string; name: string | null }[];
};

function calculateDateRange(
  tasks: TimelineTask[],
  milestones: TimelineMilestone[]
): { start: Date; end: Date } {
  const allDates: Date[] = [];

  tasks.forEach((task) => {
    if (task.due_at) allDates.push(new Date(task.due_at));
  });

  milestones.forEach((milestone) => {
    if (milestone.due_at) allDates.push(new Date(milestone.due_at));
  });

  if (allDates.length === 0) {
    const today = new Date();
    return {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: new Date(today.getFullYear(), today.getMonth() + 3, 0),
    };
  }

  const sortedDates = allDates.sort((a, b) => a.getTime() - b.getTime());
  const start = new Date(sortedDates[0]);
  const end = new Date(sortedDates[sortedDates.length - 1]);

  // Add padding: start 1 week before first item, end 1 week after last item
  start.setDate(start.getDate() - 7);
  end.setDate(end.getDate() + 14);

  return { start, end };
}

function getWeeksBetween(start: Date, end: Date): Date[] {
  const weeks: Date[] = [];
  const current = new Date(start);

  // Align to Monday
  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diff);
  current.setHours(0, 0, 0, 0);

  while (current <= end) {
    weeks.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

function calculatePosition(
  date: Date,
  rangeStart: Date,
  rangeEnd: Date
): number {
  const totalDuration = rangeEnd.getTime() - rangeStart.getTime();
  const itemOffset = date.getTime() - rangeStart.getTime();
  return (itemOffset / totalDuration) * 100;
}

type Props = {
  tasks: TimelineTask[];
  milestones: TimelineMilestone[];
  onTaskClick?: (taskId: string) => void;
};

export default function GanttChart({ tasks, milestones, onTaskClick }: Props) {
  const { start: rangeStart, end: rangeEnd } = calculateDateRange(tasks, milestones);
  const weeks = getWeeksBetween(rangeStart, rangeEnd);

  // Prepare Gantt items
  const ganttItems: GanttItem[] = [];

  // Add milestones
  milestones.forEach((milestone) => {
    if (!milestone.due_at) return;
    const date = new Date(milestone.due_at);
    ganttItems.push({
      id: milestone.id,
      title: milestone.title,
      type: "milestone",
      status: milestone.status,
      startDate: date,
      endDate: date,
    });
  });

  // Add tasks
  tasks.forEach((task) => {
    if (!task.due_at) return;
    const dueDate = new Date(task.due_at);
    ganttItems.push({
      id: task.id,
      title: task.title,
      type: "task",
      status: task.status,
      startDate: dueDate,
      endDate: dueDate,
      projectName: task.project_name,
      assignees: task.assignees,
    });
  });

  // Sort by start date
  ganttItems.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayPosition = calculatePosition(today, rangeStart, rangeEnd);

  // Group weeks by month for header
  const monthGroups: { month: string; weeks: Date[]; startIndex: number; count: number }[] = [];
  let currentMonth = "";
  let currentGroup: Date[] = [];
  let startIndex = 0;

  weeks.forEach((week, index) => {
    const monthYear = week.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    if (monthYear !== currentMonth) {
      if (currentGroup.length > 0) {
        monthGroups.push({
          month: currentMonth,
          weeks: currentGroup,
          startIndex,
          count: currentGroup.length,
        });
      }
      currentMonth = monthYear;
      currentGroup = [week];
      startIndex = index;
    } else {
      currentGroup.push(week);
    }
  });
  if (currentGroup.length > 0) {
    monthGroups.push({
      month: currentMonth,
      weeks: currentGroup,
      startIndex,
      count: currentGroup.length,
    });
  }

  if (ganttItems.length === 0) {
    return (
      <div className="text-center py-16 text-muted">
        <div className="text-4xl mb-4">📊</div>
        <p>No tasks or milestones to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline Header */}
      <div className="relative border-2 border-border rounded-lg overflow-hidden bg-surface">
        <div className="flex">
          {/* Label column header */}
          <div className="w-[280px] flex-shrink-0 bg-surface border-r-2 border-border p-4">
            <div className="font-semibold text-sm">Tasks & Milestones</div>
          </div>

          {/* Timeline header */}
          <div className="flex-1 relative">
            {/* Month headers */}
            <div className="flex border-b border-border bg-surface/50">
              {monthGroups.map((group, index) => (
                <div
                  key={index}
                  className="text-center py-2 px-2 font-semibold text-sm border-r border-border last:border-r-0"
                  style={{ flex: group.count }}
                >
                  {group.month}
                </div>
              ))}
            </div>

            {/* Week headers */}
            <div className="flex bg-surface">
              {weeks.map((week, index) => {
                const nextWeek = weeks[index + 1] || rangeEnd;
                const weekStart = week;
                const weekEnd = new Date(nextWeek);
                weekEnd.setDate(weekEnd.getDate() - 1);
                const isCurrentWeek = today >= weekStart && today <= weekEnd;

                return (
                  <div
                    key={week.toISOString()}
                    className={`flex-1 text-center text-xs py-2 px-1 border-r border-border last:border-r-0 min-w-[60px] ${
                      isCurrentWeek ? "bg-sage-green/10 font-bold text-sage-green" : ""
                    }`}
                  >
                    {week.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Items */}
      <div className="border-2 border-border rounded-lg overflow-hidden">
        {ganttItems.map((item, rowIndex) => {
          const leftPos = calculatePosition(item.startDate, rangeStart, rangeEnd);
          const isMilestone = item.type === "milestone";
          const isEvenRow = rowIndex % 2 === 0;

          return (
            <div
              key={item.id}
              className={`flex items-stretch hover:bg-surface/50 transition-colors relative ${
                isEvenRow ? "bg-background" : "bg-surface/30"
              }`}
            >
              {/* Task Label */}
              <div className="w-[280px] flex-shrink-0 p-4 border-r-2 border-border">
                <div className="flex items-start gap-2">
                  {isMilestone ? (
                    <span className="text-lg leading-none">🎯</span>
                  ) : (
                    <div className="mt-1">
                      {item.status === "done" ? (
                        <span className="text-sage-green text-sm">✓</span>
                      ) : item.status === "in_progress" ? (
                        <span className="text-warm-coral text-sm">⏵</span>
                      ) : (
                        <span className="text-muted text-sm">○</span>
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate" title={item.title}>
                      {item.title}
                    </div>
                    {item.projectName && (
                      <div className="text-xs text-muted mt-1 truncate">
                        {item.projectName}
                      </div>
                    )}
                    {item.assignees && item.assignees.length > 0 && (
                      <div className="text-xs text-muted mt-1 truncate">
                        👤 {item.assignees[0].name || "Unknown"}
                        {item.assignees.length > 1 && ` +${item.assignees.length - 1}`}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="flex-1 relative min-h-[80px] py-4">
                {/* Vertical gridlines */}
                <div className="absolute inset-0 flex">
                  {weeks.map((week, index) => (
                    <div
                      key={week.toISOString()}
                      className="flex-1 border-r border-border/30 last:border-r-0"
                    />
                  ))}
                </div>

                {/* Today indicator line (if in range) */}
                {todayPosition >= 0 && todayPosition <= 100 && (
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-sage-green/50 z-0"
                    style={{ left: `${todayPosition}%` }}
                  />
                )}

                {/* Task/Milestone Bar */}
                {isMilestone ? (
                  // Milestone marker (diamond shape)
                  <div
                    className="absolute top-1/2 -translate-y-1/2 z-10 cursor-pointer transition-all hover:scale-125"
                    style={{
                      left: `calc(${leftPos}% - 14px)`,
                    }}
                    title={`Milestone: ${item.title} - ${item.startDate.toLocaleDateString()}`}
                  >
                    <div className="relative">
                      <div className="w-7 h-7 bg-soft-lavender border-2 border-soft-lavender rotate-45 shadow-lg"></div>
                      {/* Connecting line to label */}
                      <div className="absolute left-10 top-1/2 -translate-y-1/2 text-xs font-medium text-soft-lavender whitespace-nowrap">
                        {item.title}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Task bar (horizontal bar with proper width)
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 h-9 rounded-lg cursor-pointer transition-all hover:shadow-xl hover:scale-105 px-3 flex items-center justify-between gap-2 text-xs font-medium z-10 ${
                      item.status === "done"
                        ? "bg-sage-green text-white shadow-md"
                        : item.status === "in_progress"
                        ? "bg-warm-coral text-white shadow-md"
                        : "bg-slate-700 text-white shadow-md"
                    }`}
                    style={{
                      left: `${leftPos}%`,
                      width: "140px",
                    }}
                    onClick={() => onTaskClick?.(item.id)}
                    title={`${item.title} - ${item.startDate.toLocaleDateString()}`}
                  >
                    <span className="truncate flex-1">{item.title}</span>
                    {item.status === "done" && <span className="text-xs">✓</span>}
                    {item.status === "in_progress" && <span className="text-xs">⏵</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-8 text-sm bg-surface/50 p-4 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-5 rounded-md bg-sage-green shadow-sm"></div>
          <span className="text-muted">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-5 rounded-md bg-warm-coral shadow-sm"></div>
          <span className="text-muted">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-5 rounded-md bg-slate-700 shadow-sm"></div>
          <span className="text-muted">Open</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-soft-lavender border-2 border-soft-lavender rotate-45 shadow-md"></div>
          <span className="text-muted">Milestone</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-sage-green/60 shadow-sm"></div>
          <span className="text-muted">Today</span>
        </div>
      </div>
    </div>
  );
}
