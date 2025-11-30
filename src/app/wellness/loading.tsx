import Card from "@/components/ui/Card";

export default function WellnessLoading() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-10 w-48 bg-surface rounded-lg animate-pulse mb-2" />
          <div className="h-5 w-56 bg-surface rounded animate-pulse" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Main form skeleton */}
          <div className="space-y-6">
            <Card>
              <div className="h-6 w-28 bg-surface rounded animate-pulse mb-2" />
              <div className="h-4 w-56 bg-surface rounded animate-pulse mb-6" />

              {/* Mood selector skeleton */}
              <div className="flex gap-4 justify-center mb-6">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-14 h-14 bg-surface rounded-full animate-pulse"
                  />
                ))}
              </div>

              {/* Note textarea skeleton */}
              <div className="h-24 bg-surface rounded-lg animate-pulse mb-4" />

              {/* Button skeleton */}
              <div className="h-10 w-full bg-surface rounded-lg animate-pulse" />
            </Card>

            {/* Disclaimer skeleton */}
            <Card className="bg-soft-lavender/10 border-soft-lavender/40">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-surface rounded animate-pulse flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-5 w-48 bg-surface rounded animate-pulse mb-2" />
                  <div className="h-12 w-full bg-surface rounded animate-pulse" />
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar skeleton */}
          <aside className="space-y-6">
            {/* Streak card skeleton */}
            <Card className="bg-warm-coral/10 border-warm-coral/40">
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-24 bg-surface rounded animate-pulse" />
                <div className="text-4xl">🔥</div>
              </div>
              <div className="h-14 w-20 bg-surface rounded animate-pulse mb-2" />
              <div className="h-4 w-36 bg-surface rounded animate-pulse" />
            </Card>

            {/* Badges skeleton */}
            <Card>
              <div className="h-6 w-20 bg-surface rounded animate-pulse mb-4" />
              <div className="grid grid-cols-2 gap-3">
                {[...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="h-24 bg-surface rounded-lg animate-pulse"
                  />
                ))}
              </div>
            </Card>

            {/* Team pulse skeleton */}
            <Card>
              <div className="h-6 w-28 bg-surface rounded animate-pulse mb-2" />
              <div className="h-4 w-48 bg-surface rounded animate-pulse mb-4" />
              <div className="h-12 w-16 bg-surface rounded animate-pulse" />
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
