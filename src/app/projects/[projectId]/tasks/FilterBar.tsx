"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface FilterBarProps {
  milestones: Array<{ id: string; title: string; due_at: string | null }>;
  teamMembers: Array<{ id: string; name: string | null; email: string | null }>;
}

export default function FilterBar({ milestones, teamMembers }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentFilter = searchParams.get("filter") || "all";
  const currentAssignee = searchParams.get("assignee") || "";
  const currentMilestone = searchParams.get("milestone_id") || "";
  const currentDateFrom = searchParams.get("date_from") || "";
  const currentDateTo = searchParams.get("date_to") || "";

  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(currentAssignee || currentMilestone || currentDateFrom || currentDateTo)
  );

  const updateFilter = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());

    // Reset page when changing filters
    params.delete("page");

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push(pathname);
  };

  const hasActiveFilters =
    currentFilter !== "all" ||
    currentAssignee ||
    currentMilestone ||
    currentDateFrom ||
    currentDateTo;

  return (
    <Card className="mb-6">
      <div className="space-y-4">
        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={currentFilter === "all" ? "primary" : "secondary"}
            size="sm"
            onClick={() => updateFilter({ filter: "all", assignee: "", milestone_id: "", date_from: "", date_to: "" })}
          >
            All Tasks
          </Button>
          <Button
            variant={currentFilter === "me" ? "primary" : "secondary"}
            size="sm"
            onClick={() => updateFilter({ filter: "me", assignee: "", milestone_id: "", date_from: "", date_to: "" })}
          >
            Assigned to Me
          </Button>
          <Button
            variant={currentFilter === "week" ? "primary" : "secondary"}
            size="sm"
            onClick={() => updateFilter({ filter: "week", assignee: "", milestone_id: "", date_from: "", date_to: "" })}
          >
            This Week
          </Button>
          <Button
            variant={currentFilter === "overdue" ? "primary" : "secondary"}
            size="sm"
            onClick={() => updateFilter({ filter: "overdue", assignee: "", milestone_id: "", date_from: "", date_to: "" })}
          >
            Overdue
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? "Hide" : "Show"} Advanced
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
          )}
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t-2 border-border">
            {/* Assignee Filter */}
            <div>
              <label className="text-sm font-bold block mb-2">
                Filter by Assignee
              </label>
              <select
                value={currentAssignee}
                onChange={(e) => updateFilter({ assignee: e.target.value, filter: "" })}
                className="w-full px-3 py-2 bg-background border-2 border-border rounded-[6px] text-sm focus:border-primary focus:outline-none"
              >
                <option value="">All members</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name || member.email || "Unknown"}
                  </option>
                ))}
              </select>
            </div>

            {/* Milestone Filter */}
            <div>
              <label className="text-sm font-bold block mb-2">
                Filter by Milestone
              </label>
              <select
                value={currentMilestone}
                onChange={(e) => updateFilter({ milestone_id: e.target.value, filter: "" })}
                className="w-full px-3 py-2 bg-background border-2 border-border rounded-[6px] text-sm focus:border-primary focus:outline-none"
              >
                <option value="">All milestones</option>
                {milestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="text-sm font-bold block mb-2">
                Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={currentDateFrom}
                  onChange={(e) => updateFilter({ date_from: e.target.value, filter: "" })}
                  className="flex-1 px-2 py-2 bg-background border-2 border-border rounded-[6px] text-xs focus:border-primary focus:outline-none"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={currentDateTo}
                  onChange={(e) => updateFilter({ date_to: e.target.value, filter: "" })}
                  className="flex-1 px-2 py-2 bg-background border-2 border-border rounded-[6px] text-xs focus:border-primary focus:outline-none"
                  placeholder="To"
                />
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="pt-3 border-t-2 border-border">
            <p className="text-sm text-muted">
              Active filters:{" "}
              {currentFilter !== "all" && <span className="font-semibold">{currentFilter.replace("_", " ")}</span>}
              {currentAssignee && teamMembers.find(m => m.id === currentAssignee) && (
                <span className="font-semibold">
                  {" "}• Assignee: {teamMembers.find(m => m.id === currentAssignee)?.name || teamMembers.find(m => m.id === currentAssignee)?.email}
                </span>
              )}
              {currentMilestone && milestones.find(m => m.id === currentMilestone) && (
                <span className="font-semibold">
                  {" "}• Milestone: {milestones.find(m => m.id === currentMilestone)?.title}
                </span>
              )}
              {currentDateFrom && <span className="font-semibold"> • From: {currentDateFrom}</span>}
              {currentDateTo && <span className="font-semibold"> • To: {currentDateTo}</span>}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
