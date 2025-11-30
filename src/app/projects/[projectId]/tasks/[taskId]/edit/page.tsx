import { supabaseServer } from "@/lib/supabase/server";
import { getTask, updateTask } from "@/server-actions/tasks";
import { redirect } from "next/navigation";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Link from "next/link";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ projectId: string; taskId: string }>;
}) {
  const { projectId, taskId } = await params;
  const supabase = await supabaseServer();

  // Get existing task
  let task;
  try {
    task = await getTask(taskId);
  } catch {
    return (
      <main className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="heading-1 mb-4">Task not found</h1>
          <Link href={`/projects/${projectId}/tasks`}>
            <Button>Back to Tasks</Button>
          </Link>
        </div>
      </main>
    );
  }

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

  async function handleUpdateTask(formData: FormData) {
    "use server";

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const dueAt = formData.get("due_at") as string;
    const milestoneId = formData.get("milestone_id") as string;
    const size = formData.get("size") as string;
    const status = formData.get("status") as string;

    const taskUpdate: {
      title?: string;
      description?: string | null;
      due_at?: string | null;
      size?: number | null;
      milestone_id?: string | null;
      status?: "open" | "in_progress" | "done";
    } = {};

    if (title) taskUpdate.title = title;
    
    // Handle description - empty string means clear it
    taskUpdate.description = description || null;

    // Handle due date - preserve timezone by setting to noon UTC
    if (dueAt) {
      // Parse as local date parts to avoid timezone shift
      const [year, month, day] = dueAt.split('-').map(Number);
      // Create date at noon UTC to avoid day boundary issues
      const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      taskUpdate.due_at = date.toISOString();
    } else {
      taskUpdate.due_at = null;
    }

    // Handle size
    if (size) {
      taskUpdate.size = parseInt(size, 10);
    } else {
      taskUpdate.size = null;
    }

    // Handle milestone
    taskUpdate.milestone_id = milestoneId || null;

    // Handle status
    if (status && ["open", "in_progress", "done"].includes(status)) {
      taskUpdate.status = status as "open" | "in_progress" | "done";
    }

    await updateTask(taskId, taskUpdate);
    redirect(`/projects/${projectId}/tasks`);
  }

  // Format date for input - extract just the date part without timezone conversion
  const formatDateForInput = (isoDate: string | null) => {
    if (!isoDate) return "";
    // Parse the ISO string and format as YYYY-MM-DD
    const date = new Date(isoDate);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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
          <h1 className="heading-1 mb-2">Edit Task</h1>
          <p className="text-muted">
            Update task in {project.name}
          </p>
        </div>

        {/* Task Form */}
        <Card>
          <CardTitle className="mb-2">Task Details</CardTitle>
          <CardDescription className="mb-6">
            Modify the task details below
          </CardDescription>

          <form action={handleUpdateTask} className="space-y-6">
            {/* Title */}
            <Input
              name="title"
              label="Title"
              placeholder="e.g., Implement user authentication"
              required
              defaultValue={task.title}
              hint="A clear, concise title for the task"
            />

            {/* Description */}
            <Textarea
              name="description"
              label="Description (Optional)"
              placeholder="Describe what needs to be done..."
              rows={4}
              defaultValue={task.description || ""}
              hint="Additional details, acceptance criteria, or notes"
            />

            {/* Status */}
            <div>
              <label className="block text-sm font-bold mb-2">
                Status
              </label>
              <select
                name="status"
                defaultValue={task.status}
                className="w-full px-3 py-2 bg-background border-2 border-border rounded-[6px] text-sm focus:border-primary focus:outline-none"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
              <p className="text-xs text-muted mt-1">
                Current status of the task
              </p>
            </div>

            {/* Due Date */}
            <Input
              name="due_at"
              label="Due Date (Optional)"
              type="date"
              defaultValue={formatDateForInput(task.due_at)}
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
                  defaultValue={task.milestone_id || ""}
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
              defaultValue={task.size?.toString() || ""}
              hint="Estimate the effort required (1 = small, 10 = large)"
            />

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                Save Changes
              </Button>
              <Link href={`/projects/${projectId}/tasks`} className="flex-1">
                <Button type="button" variant="ghost" className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </Card>

        {/* Task ID for reference */}
        <p className="text-center text-xs text-muted mt-4">
          Task ID: {task.id}
        </p>
      </div>
    </main>
  );
}
