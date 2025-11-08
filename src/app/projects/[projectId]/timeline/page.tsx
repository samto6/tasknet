"use client";
import { useState, useEffect } from "react";
import { use } from "react";
import { getProjectTimeline, TimelineData } from "@/server-actions/timeline";
import TimelineNav from "@/components/timeline/TimelineNav";
import CalendarGrid from "@/components/timeline/CalendarGrid";
import GanttChart from "@/components/timeline/GanttChart";
import WeeklyBreakdown from "@/components/timeline/WeeklyBreakdown";
import TaskEditModal from "@/components/timeline/TaskEditModal";

type View = "calendar" | "gantt" | "weekly";

export default function ProjectTimelinePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const resolvedParams = use(params);
  const [currentView, setCurrentView] = useState<View>("weekly");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTimeline() {
      try {
        setIsLoading(true);
        const data = await getProjectTimeline(resolvedParams.projectId);
        setTimelineData(data);
      } catch (error) {
        console.error("Failed to load timeline:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTimeline();
  }, [resolvedParams.projectId]);

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
          <h1 className="heading-1 mb-2">{timelineData.projectName} Timeline</h1>
          <p className="text-muted">
            Visualize your project schedule and milestones
          </p>
        </div>

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
            getProjectTimeline(resolvedParams.projectId).then(setTimelineData);
          }}
        />
      </div>
    </main>
  );
}
