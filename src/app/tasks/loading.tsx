import Card from "@/components/ui/Card";

export default function TasksLoading() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-32 bg-surface rounded animate-pulse mb-2"></div>
          <div className="h-4 w-64 bg-surface rounded animate-pulse"></div>
        </div>

        {/* Stats skeleton */}
        <Card className="mb-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-8 w-12 bg-surface rounded animate-pulse mx-auto mb-2"></div>
                <div className="h-4 w-16 bg-surface rounded animate-pulse mx-auto"></div>
              </div>
            ))}
          </div>
        </Card>

        {/* Task list skeleton */}
        <div className="space-y-8">
          {[1, 2].map((section) => (
            <section key={section}>
              <div className="h-6 w-40 bg-surface rounded animate-pulse mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-4 bg-surface rounded-lg border-2 border-border"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="h-5 w-48 bg-background rounded animate-pulse mb-2"></div>
                        <div className="h-4 w-full bg-background rounded animate-pulse mb-2"></div>
                        <div className="flex gap-2">
                          <div className="h-6 w-20 bg-background rounded animate-pulse"></div>
                          <div className="h-6 w-16 bg-background rounded animate-pulse"></div>
                        </div>
                      </div>
                      <div className="h-6 w-16 bg-background rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
