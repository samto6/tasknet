import Card from "@/components/ui/Card";

export default function NotificationsLoading() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-10 w-44 bg-surface rounded-lg animate-pulse mb-2" />
          <div className="h-5 w-64 bg-surface rounded animate-pulse" />
        </div>

        {/* Actions skeleton */}
        <div className="flex justify-end mb-6">
          <div className="h-10 w-32 bg-surface rounded-lg animate-pulse" />
        </div>

        {/* Notifications list skeleton */}
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-surface rounded-full animate-pulse flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-5 w-3/4 bg-surface rounded animate-pulse mb-2" />
                  <div className="h-4 w-1/2 bg-surface rounded animate-pulse mb-2" />
                  <div className="h-3 w-24 bg-surface rounded animate-pulse" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
