import { createTeam, joinTeamByCode } from "@/server-actions/teams";

export default function TeamsPage() {
  async function createTeamAction(form: FormData) {
    "use server";
    await createTeam(form);
  }
  async function joinTeam(form: FormData) {
    "use server";
    const code = (form.get("code") as string | null)?.trim();
    if (!code) throw new Error("Code required");
    await joinTeamByCode(code);
  }

  return (
    <main className="mx-auto max-w-xl p-6 space-y-10">
      <section>
        <h1 className="text-2xl font-semibold mb-3">Create a team</h1>
  <form action={createTeamAction} className="space-y-3">
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

      <section>
        <h2 className="text-xl font-semibold mb-3">Join by invite code</h2>
        <form action={joinTeam} className="space-y-3">
          <input
            type="text"
            name="code"
            placeholder="e.g. abcd1234"
            required
            className="border w-full p-2 rounded"
          />
          <button className="bg-black text-white px-4 py-2 rounded">
            Join team
          </button>
        </form>
      </section>
    </main>
  );
}
