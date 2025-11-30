import Card from "@/components/ui/Card";

export default function TeamsLoading() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-10 w-32 bg-surface rounded-lg animate-pulse mb-2" />
          <div className="h-5 w-72 bg-surface rounded animate-pulse" />
        </div>

        {/* Teams list skeleton */}
        <div className="mb-8">
          <div className="h-6 w-28 bg-surface rounded animate-pulse mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <div className="flex items-start justify-between mb-3">
                  <div className="h-6 w-32 bg-surface rounded animate-pulse" />
                  <div className="h-5 w-14 bg-surface rounded-full animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-surface rounded animate-pulse" />
                  <div className="h-4 w-20 bg-surface rounded animate-pulse" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Create/Join forms skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <div className="h-6 w-32 bg-surface rounded animate-pulse mb-2" />
            <div className="h-4 w-56 bg-surface rounded animate-pulse mb-6" />
            <div className="space-y-4">
              <div className="h-10 w-full bg-surface rounded-lg animate-pulse" />
              <div className="h-10 w-full bg-surface rounded-lg animate-pulse" />
            </div>
          </Card>
          <Card>
            <div className="h-6 w-28 bg-surface rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-surface rounded animate-pulse mb-6" />
            <div className="space-y-4">
              <div className="h-10 w-full bg-surface rounded-lg animate-pulse" />
              <div className="h-10 w-full bg-surface rounded-lg animate-pulse" />
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
