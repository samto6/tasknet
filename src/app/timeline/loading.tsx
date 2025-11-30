export default function TimelineLoading() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-10 w-40 bg-surface rounded-lg animate-pulse mb-2" />
          <div className="h-5 w-80 bg-surface rounded animate-pulse" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="p-4 bg-surface rounded-[8px] border-2 border-border animate-pulse"
            >
              <div className="h-8 w-12 bg-background rounded mb-2" />
              <div className="h-4 w-20 bg-background rounded" />
            </div>
          ))}
        </div>

        {/* Navigation tabs skeleton */}
        <div className="flex gap-2 mb-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-10 w-24 bg-surface rounded-lg animate-pulse"
            />
          ))}
        </div>

        {/* Calendar/Timeline skeleton */}
        <div className="bg-surface rounded-lg border-2 border-border p-4 animate-pulse">
          <div className="grid grid-cols-7 gap-2">
            {/* Week day headers */}
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-8 bg-background rounded" />
            ))}
            {/* Calendar days */}
            {[...Array(35)].map((_, i) => (
              <div key={i} className="h-24 bg-background rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
