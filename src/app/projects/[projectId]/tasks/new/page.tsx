import { supabaseServer } from "@/lib/supabase/server";
import { createTask } from "@/server-actions/tasks";
import { redirect } from "next/navigation";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Link from "next/link";

export default async function NewTaskPage({
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
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="heading-1 mb-4">Project not found</h1>
          <Link href="/teams">
            <Button>Back to Teams</Button>
          </Link>
        </div>
      </main>
    );
  }

  // Fetch milestones for this project
  const { data: milestones } = await supabase
    .from("milestones")
    .select("id, title")
    .eq("project_id", projectId)
    .order("due_at", { ascending: true });

  async function handleCreateTask(formData: FormData) {
    "use server";

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const dueAt = formData.get("due_at") as string;
    const milestoneId = formData.get("milestone_id") as string;
    const size = formData.get("size") as string;

    const taskInput: {
      project_id: string;
      title: string;
      description?: string;
      due_at?: string;
      size?: number;
      milestone_id?: string;
    } = {
      project_id: projectId,
      title,
    };

    if (description) taskInput.description = description;
    if (dueAt) {
      // Convert to ISO datetime string
      const date = new Date(dueAt);
      taskInput.due_at = date.toISOString();
    }
    if (size) taskInput.size = parseInt(size, 10);
    if (milestoneId) taskInput.milestone_id = milestoneId;

    await createTask(taskInput);
    redirect(`/projects/${projectId}/tasks`);
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Link href={`/projects/${projectId}/tasks`}>
              <Button variant="ghost" className="text-sm">
                ← Back to Tasks
              </Button>
            </Link>
          </div>
          <h1 className="heading-1 mb-2">Create New Task</h1>
          <p className="text-muted">
            Add a new task to {project.name}
          </p>
        </div>

        {/* Task Form */}
        <Card>
          <CardTitle className="mb-2">Task Details</CardTitle>
          <CardDescription className="mb-6">
            Fill in the details for your new task
          </CardDescription>

          <form action={handleCreateTask} className="space-y-6">
            {/* Title */}
            <Input
              name="title"
              label="Title"
              placeholder="e.g., Implement user authentication"
              required
              hint="A clear, concise title for the task"
            />

            {/* Description */}
            <Textarea
              name="description"
              label="Description (Optional)"
              placeholder="Describe what needs to be done..."
              rows={4}
              hint="Additional details, acceptance criteria, or notes"
            />

            {/* Due Date */}
            <Input
              name="due_at"
              label="Due Date (Optional)"
              type="date"
              hint="When should this task be completed?"
            />

            {/* Milestone */}
            {milestones && milestones.length > 0 && (
              <div>
                <label className="block text-sm font-bold mb-2">
                  Milestone (Optional)
                </label>
                <select
                  name="milestone_id"
                  className="w-full px-3 py-2 bg-background border-2 border-border rounded-[6px] text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">No milestone</option>
                  {milestones.map((milestone) => (
                    <option key={milestone.id} value={milestone.id}>
                      {milestone.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted mt-1">
                  Associate this task with a milestone
                </p>
              </div>
            )}

            {/* Size/Effort */}
            <Input
              name="size"
              label="Size/Effort (Optional)"
              type="number"
              min="1"
              max="10"
              placeholder="1-10"
              hint="Estimate the effort required (1 = small, 10 = large)"
            />

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                Create Task
              </Button>
              <Link href={`/projects/${projectId}/tasks`} className="flex-1">
                <Button type="button" variant="ghost" className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
