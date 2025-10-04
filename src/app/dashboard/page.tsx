import { createTeam } from "@/server-actions/teams";
import { redirect } from "next/navigation";

export default function DashboardPage() {
  async function createTeamAndGo(form: FormData) {
    "use server";
    const teamId = await createTeam(form);
    redirect(`/teams/${teamId}`);
  }

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-8">
      <section>
        <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
        <p className="opacity-70">You are signed in.</p>
        <div className="mt-4 space-x-3">
          <a href="/teams" className="underline">Teams</a>
          <a href="/wellness" className="underline">Wellness</a>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Create a team</h2>
        <form action={createTeamAndGo} className="space-y-3">
          <input
            type="text"
            name="name"
            placeholder="Team name"
            required
            className="border w-full p-2 rounded"
          />
          <button className="bg-black text-white px-4 py-2 rounded">
            Create team
          </button>
        </form>
      </section>
    </main>
  );
}
