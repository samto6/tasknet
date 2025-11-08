"use client";
import { useState, useEffect } from "react";
import { getPersonalTimeline, TimelineData } from "@/server-actions/timeline";
import TimelineNav from "@/components/timeline/TimelineNav";
import CalendarGrid from "@/components/timeline/CalendarGrid";
import GanttChart from "@/components/timeline/GanttChart";
import WeeklyBreakdown from "@/components/timeline/WeeklyBreakdown";
import TaskEditModal from "@/components/timeline/TaskEditModal";

type View = "calendar" | "gantt" | "weekly";

export default function PersonalTimelinePage() {
  const [currentView, setCurrentView] = useState<View>("weekly");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTimeline() {
      try {
        setIsLoading(true);
        const data = await getPersonalTimeline();
        setTimelineData(data);
      } catch (error) {
        console.error("Failed to load timeline:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTimeline();
  }, []);

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-surface rounded w-1/3 mb-8"></div>
            <div className="h-64 bg-surface rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!timelineData) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-muted">Failed to load timeline data.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="heading-1 mb-2">My Timeline</h1>
          <p className="text-muted">
            All your tasks and milestones across all projects
          </p>
        </div>

        {/* Stats Summary */}
        {timelineData.tasks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 bg-surface rounded-[8px] border-2 border-border">
              <div className="text-2xl font-bold text-sage-green">
                {timelineData.tasks.length}
              </div>
              <div className="text-sm text-muted">Total Tasks</div>
            </div>
            <div className="p-4 bg-surface rounded-[8px] border-2 border-border">
              <div className="text-2xl font-bold text-warm-coral">
                {timelineData.tasks.filter((t) => t.status === "in_progress").length}
              </div>
              <div className="text-sm text-muted">In Progress</div>
            </div>
            <div className="p-4 bg-surface rounded-[8px] border-2 border-border">
              <div className="text-2xl font-bold text-soft-lavender">
                {timelineData.tasks.filter((t) => t.status === "done").length}
              </div>
              <div className="text-sm text-muted">Completed</div>
            </div>
            <div className="p-4 bg-surface rounded-[8px] border-2 border-border">
              <div className="text-2xl font-bold text-foreground">
                {timelineData.milestones.length}
              </div>
              <div className="text-sm text-muted">Milestones</div>
            </div>
          </div>
        )}

        {/* View Tabs */}
        <TimelineNav currentView={currentView} onViewChange={setCurrentView} />

        {/* Timeline Views */}
        {currentView === "calendar" && (
          <CalendarGrid
            tasks={timelineData.tasks}
            milestones={timelineData.milestones}
            onTaskClick={handleTaskClick}
          />
        )}

        {currentView === "gantt" && (
          <GanttChart
            tasks={timelineData.tasks}
            milestones={timelineData.milestones}
            onTaskClick={handleTaskClick}
          />
        )}

        {currentView === "weekly" && (
          <WeeklyBreakdown
            tasks={timelineData.tasks}
            milestones={timelineData.milestones}
            onTaskClick={handleTaskClick}
          />
        )}

        {/* Task Edit Modal */}
        <TaskEditModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={() => {
            // Refetch timeline data after update
            getPersonalTimeline().then(setTimelineData);
          }}
        />
      </div>
    </main>
  );
}
