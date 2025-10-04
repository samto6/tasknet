import { createProjectFromTemplate } from "@/server-actions/projects";
import { redirect } from "next/navigation";

export default function NewProjectPage({ params }: { params: { teamId: string } }) {
  async function action(form: FormData) {
    "use server";
    const name = String(form.get("name") || "").trim();
    const start = String(form.get("start") || "").trim();
    if (!name || !start) throw new Error("Missing fields");
    const projectId = await createProjectFromTemplate({ team_id: params.teamId, name, semester_start_date: start });
    redirect(`/projects/${projectId}/tasks`);
  }

  return (
    <main className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">New Project</h1>
      <form action={action} className="space-y-3">
        <input className="border p-2 rounded w-full" name="name" placeholder="Project name" required />
        <label className="block text-sm">Semester start date</label>
        <input className="border p-2 rounded w-full" type="date" name="start" required />
        <button className="bg-black text-white px-4 py-2 rounded">Create from template</button>
      </form>
    </main>
  );
}
