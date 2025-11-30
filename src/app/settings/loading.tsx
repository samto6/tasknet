import Card from "@/components/ui/Card";

export default function SettingsLoading() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-10 w-32 bg-surface rounded-lg animate-pulse mb-2" />
          <div className="h-5 w-56 bg-surface rounded animate-pulse" />
        </div>

        {/* Settings sections skeleton */}
        <div className="space-y-6">
          {/* Profile section */}
          <Card>
            <div className="h-6 w-28 bg-surface rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-surface rounded animate-pulse mb-6" />
            <div className="space-y-4">
              <div className="h-10 w-full bg-surface rounded-lg animate-pulse" />
              <div className="h-10 w-full bg-surface rounded-lg animate-pulse" />
              <div className="h-10 w-32 bg-surface rounded-lg animate-pulse" />
            </div>
          </Card>

          {/* Email preferences section */}
          <Card>
            <div className="h-6 w-44 bg-surface rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-surface rounded animate-pulse mb-6" />
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-5 w-48 bg-surface rounded animate-pulse" />
                  <div className="h-6 w-12 bg-surface rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
