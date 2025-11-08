"use client";
import { useState } from "react";
import { TimelineTask, TimelineMilestone } from "@/server-actions/timeline";
import Button from "@/components/ui/Button";

type DayData = {
  date: Date;
  tasks: TimelineTask[];
  milestones: TimelineMilestone[];
  isCurrentMonth: boolean;
  isToday: boolean;
};

function getDaysInMonth(year: number, month: number): DayData[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Get the day of week for the first day (0 = Sunday)
  const startDayOfWeek = firstDay.getDay();

  // Get days from previous month to fill the first week
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const prevMonthDays = startDayOfWeek;

  const days: DayData[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Previous month days
  for (let i = prevMonthDays - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonthLastDay - i);
    days.push({
      date,
      tasks: [],
      milestones: [],
      isCurrentMonth: false,
      isToday: date.getTime() === today.getTime(),
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    days.push({
      date,
      tasks: [],
      milestones: [],
      isCurrentMonth: true,
      isToday: date.getTime() === today.getTime(),
    });
  }

  // Next month days to complete the grid (6 weeks)
  const remainingDays = 42 - days.length; // 6 weeks * 7 days
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i);
    days.push({
      date,
      tasks: [],
      milestones: [],
      isCurrentMonth: false,
      isToday: date.getTime() === today.getTime(),
    });
  }

  return days;
}

function addTasksToDays(
  days: DayData[],
  tasks: TimelineTask[],
  milestones: TimelineMilestone[]
): DayData[] {
  const dayMap = new Map<string, DayData>();

  days.forEach((day) => {
    const key = day.date.toDateString();
    dayMap.set(key, day);
  });

  // Add tasks to their due dates
  tasks.forEach((task) => {
    if (!task.due_at) return;
    const dueDate = new Date(task.due_at);
    dueDate.setHours(0, 0, 0, 0);
    const key = dueDate.toDateString();
    if (dayMap.has(key)) {
      dayMap.get(key)!.tasks.push(task);
    }
  });

  // Add milestones to their due dates
  milestones.forEach((milestone) => {
    if (!milestone.due_at) return;
    const dueDate = new Date(milestone.due_at);
    dueDate.setHours(0, 0, 0, 0);
    const key = dueDate.toDateString();
    if (dayMap.has(key)) {
      dayMap.get(key)!.milestones.push(milestone);
    }
  });

  return days;
}

type Props = {
  tasks: TimelineTask[];
  milestones: TimelineMilestone[];
  onTaskClick?: (taskId: string) => void;
};

export default function CalendarGrid({ tasks, milestones, onTaskClick }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  let days = getDaysInMonth(year, month);
  days = addTasksToDays(days, tasks, milestones);

  return (
    <div>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">
          {monthNames[month]} {year}
        </h2>
        <div className="flex gap-2">
          <Button onClick={goToToday} variant="outline" size="sm">
            Today
          </Button>
          <Button onClick={goToPreviousMonth} variant="outline" size="sm">
            ← Prev
          </Button>
          <Button onClick={goToNextMonth} variant="outline" size="sm">
            Next →
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border-2 border-border rounded-[8px] overflow-hidden">
        {/* Week Day Headers */}
        <div className="grid grid-cols-7 bg-surface">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-3 text-center text-sm font-medium border-b border-r border-border last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const hasItems = day.tasks.length > 0 || day.milestones.length > 0;

            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 border-b border-r border-border last:border-r-0 ${
                  !day.isCurrentMonth ? "bg-surface/50" : "bg-background"
                } ${
                  day.isToday ? "bg-sage-green/5 border-sage-green border-2" : ""
                }`}
              >
                <div
                  className={`text-sm mb-2 ${
                    day.isToday
                      ? "font-bold text-sage-green"
                      : day.isCurrentMonth
                      ? "font-medium"
                      : "text-muted"
                  }`}
                >
                  {day.date.getDate()}
                </div>

                {hasItems && (
                  <div className="space-y-1">
                    {/* Milestones */}
                    {day.milestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        className="text-xs px-2 py-1 bg-soft-lavender/20 text-soft-lavender rounded-[4px] truncate border border-soft-lavender/30"
                        title={milestone.title}
                      >
                        🎯 {milestone.title}
                      </div>
                    ))}

                    {/* Tasks */}
                    {day.tasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        onClick={() => onTaskClick?.(task.id)}
                        className={`text-xs px-2 py-1 rounded-[4px] truncate cursor-pointer hover:opacity-80 transition-opacity ${
                          task.status === "done"
                            ? "bg-sage-green/20 text-sage-green border border-sage-green/30"
                            : task.status === "in_progress"
                            ? "bg-warm-coral/20 text-warm-coral border border-warm-coral/30"
                            : "bg-surface text-foreground border border-border"
                        }`}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}

                    {/* More indicator */}
                    {day.tasks.length > 3 && (
                      <div className="text-xs text-muted px-2">
                        +{day.tasks.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-sage-green/20 border border-sage-green/30"></div>
          <span className="text-muted">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-warm-coral/20 border border-warm-coral/30"></div>
          <span className="text-muted">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-soft-lavender/20 border border-soft-lavender/30"></div>
          <span className="text-muted">Milestone</span>
        </div>
      </div>
    </div>
  );
}
