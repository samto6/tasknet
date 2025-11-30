import { supabaseServer, getCurrentUser } from "@/lib/supabase/server";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import CheckInForm from "./CheckInForm";

// User-specific page - must be dynamic
export const dynamic = "force-dynamic";

export default async function WellnessPage() {
  const [supabase, user] = await Promise.all([
    supabaseServer(),
    getCurrentUser(),
  ]);
  let currentDays = 0;
  let longestDays = 0;
  if (user) {
    const { data: s } = await supabase.from("streaks").select("current_days,longest_days").eq("user_id", user.id).maybeSingle();
    currentDays = s?.current_days ?? 0;
    longestDays = s?.longest_days ?? 0;
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="heading-1 mb-2">Daily Check-in</h1>
          <p className="text-muted">How are you feeling today?</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Main Check-in Form */}
          <div className="space-y-6">
            <Card>
              <CardTitle className="mb-2">Your Mood</CardTitle>
              <CardDescription className="mb-6">
                Select how you&apos;re feeling today
              </CardDescription>

              <CheckInForm />
            </Card>

            {/* Disclaimer */}
            <Card className="bg-soft-lavender/10 border-soft-lavender/40">
              <div className="flex gap-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-soft-lavender flex-shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <div>
                  <CardTitle className="mb-2 text-base">Not a Mental Health Service</CardTitle>
                  <p className="text-sm text-muted">
                    TaskNet is a productivity tool, not a mental health service. If you&apos;re struggling,
                    please reach out to campus counseling or call a crisis helpline.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Streak Card */}
            <Card className="bg-warm-coral/10 border-warm-coral/40">
              <div className="flex items-center justify-between mb-4">
                <CardTitle>Your Streak</CardTitle>
                <div className="text-4xl animate-flicker">🔥</div>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <div className="text-5xl font-bold text-warm-coral">{currentDays}</div>
                <div className="text-muted">day{currentDays === 1 ? "" : "s"}</div>
              </div>
              <div className="text-sm text-muted">Longest streak: {longestDays} days</div>
            </Card>

            {/* Badges */}
            <Badges supabaseUserId={user?.id ?? null} />

            {/* Team Pulse */}
            <TeamPulse />
          </aside>
        </div>
      </div>
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
    <Card>
      <CardTitle className="mb-4">Badges</CardTitle>
      <div className="grid grid-cols-2 gap-3">
        <div className={`flex flex-col items-center justify-center p-4 bg-background rounded-[6px] border-2 ${
          kinds.has("streak_7") ? "border-mustard-yellow" : "border-border opacity-50"
        }`}>
          <div className="text-3xl mb-2">🏅</div>
          <div className="text-xs text-center font-medium">7-day streak</div>
        </div>
        <div className={`flex flex-col items-center justify-center p-4 bg-background rounded-[6px] border-2 ${
          kinds.has("streak_30") ? "border-mustard-yellow" : "border-border opacity-50"
        }`}>
          <div className="text-3xl mb-2">🏆</div>
          <div className="text-xs text-center font-medium">30-day streak</div>
        </div>
      </div>
    </Card>
  );
}

async function TeamPulse() {
  const supabase = await supabaseServer();
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const { data: my } = await supabase
    .from("checkins")
    .select("mood")
    .gte("created_at", since.toISOString());
  const moods = (my ?? []).map((m) => m.mood as number);
  const avg = moods.length ? (moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1) : "-";

  return (
    <Card>
      <CardTitle className="mb-2">Team Pulse</CardTitle>
      <CardDescription className="mb-4">Your average (last 14 days)</CardDescription>
      <div className="flex items-baseline gap-2">
        <div className="text-4xl font-bold text-soft-lavender">{avg}</div>
        <div className="text-muted">/ 5</div>
      </div>
      <div className="mt-3 text-xs text-muted">
        MVP shows your own average. Team-wide aggregates coming soon.
      </div>
    </Card>
  );
}
