import Card from "@/components/ui/Card";

export default function DashboardLoading() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-10 w-48 bg-surface rounded-lg animate-pulse mb-2" />
          <div className="h-5 w-64 bg-surface rounded animate-pulse" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="md:col-span-3">
            <div className="h-6 w-32 bg-surface rounded animate-pulse mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="text-center">
                  <div className="h-9 w-16 bg-surface rounded animate-pulse mx-auto mb-2" />
                  <div className="h-4 w-24 bg-surface rounded animate-pulse mx-auto" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Bento grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="md:row-span-2">
            <div className="h-6 w-32 bg-surface rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-surface rounded-lg animate-pulse" />
              ))}
            </div>
          </Card>
          <Card className="md:col-span-2">
            <div className="h-6 w-40 bg-surface rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-surface rounded-lg animate-pulse" />
              ))}
            </div>
          </Card>
          <Card>
            <div className="h-6 w-24 bg-surface rounded animate-pulse mb-4" />
            <div className="h-24 bg-surface rounded-lg animate-pulse" />
          </Card>
          <Card>
            <div className="h-6 w-28 bg-surface rounded animate-pulse mb-4" />
            <div className="h-24 bg-surface rounded-lg animate-pulse" />
          </Card>
        </div>
      </div>
    </main>
  );
}
