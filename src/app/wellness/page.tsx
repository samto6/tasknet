import { checkIn } from "@/server-actions/wellness";
import { supabaseServer } from "@/lib/supabase/server";
import { Suspense } from "react";

export default async function WellnessPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  let currentDays = 0;
  let longestDays = 0;
  if (user) {
    const { data: s } = await supabase.from("streaks").select("current_days,longest_days").eq("user_id", user.id).maybeSingle();
    currentDays = s?.current_days ?? 0;
    longestDays = s?.longest_days ?? 0;
  }
  async function action(form: FormData) {
    "use server";
    const mood = Number(form.get("mood"));
    const note = (form.get("note") as string | null) ?? undefined;
    if (![1, 2, 3, 4, 5].includes(mood)) throw new Error("Invalid mood");
    await checkIn(mood as 1 | 2 | 3 | 4 | 5, note);
  }

  return (
    <main className="mx-auto max-w-3xl p-6 grid grid-cols-1 md:grid-cols-[1fr_280px] gap-8">
      <h1 className="text-2xl font-semibold mb-3">Daily check-in</h1>
      <form action={action} className="space-y-3">
        <label className="block">
          <span className="text-sm">Mood (1-5)</span>
          <input
            type="number"
            name="mood"
            min={1}
            max={5}
            required
            className="border w-full p-2 rounded"
          />
        </label>
        <textarea
          name="note"
          placeholder="Optional private note"
          className="border w-full p-2 rounded"
          rows={3}
        />
        <button className="bg-black text-white px-4 py-2 rounded">Check in</button>
      </form>

      <aside className="md:col-start-2 space-y-4">
        <section className="border rounded p-3">
          <h2 className="font-medium mb-1">Your streak</h2>
          <div className="text-3xl">{currentDays} day{currentDays === 1 ? "" : "s"}</div>
          <div className="text-sm opacity-70">Longest: {longestDays}</div>
        </section>
        <Badges supabaseUserId={user?.id ?? null} />
        <TeamPulse />
      </aside>
    </main>
  );
}

async function Badges({ supabaseUserId }: { supabaseUserId: string | null }) {
  if (!supabaseUserId) return null;
  const supabase = await supabaseServer();
  const { data: rewards } = await supabase
    .from("rewards")
    .select("kind")
    .eq("user_id", supabaseUserId);
  const kinds = new Set((rewards ?? []).map((r) => r.kind as string));
  return (
    <section className="border rounded p-3">
      <h2 className="font-medium mb-2">Badges</h2>
      <ul className="text-sm space-y-1">
        <li>{kinds.has("streak_7") ? "🏅" : "⬜️"} 7-day streak</li>
        <li>{kinds.has("streak_30") ? "🏆" : "⬜️"} 30-day streak</li>
      </ul>
    </section>
  );
}

async function TeamPulse() {
  // MVP server-side aggregate: last 14 days avg among tasks/checkins you can see
  const supabase = await supabaseServer();
  const since = new Date();
  since.setDate(since.getDate() - 14);
  // For MVP, show only your own checkins average
  const { data: my } = await supabase
    .from("checkins")
    .select("mood")
    .gte("created_at", since.toISOString());
  const moods = (my ?? []).map((m) => m.mood as number);
  const avg = moods.length ? (moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(2) : "-";
  return (
    <section className="border rounded p-3">
      <h2 className="font-medium mb-1">Team pulse (MVP)</h2>
      <div className="text-sm opacity-70">Avg mood (last 14 days)</div>
      <div className="text-2xl">{avg}</div>
      <div className="text-xs opacity-60">This MVP shows your own average; an RPC can compute team-wide averages safely later.</div>
    </section>
  );
}
