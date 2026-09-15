export default function LoadingState() {
  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-2" aria-busy="true" aria-label="Loading species">
      <div className="aspect-[4/5] w-full animate-pulse bg-ink-800" />
      <div className="space-y-4 pt-6">
        <div className="h-3 w-40 animate-pulse rounded bg-ink-800" />
        <div className="h-14 w-3/4 animate-pulse rounded bg-ink-800" />
        <div className="h-6 w-1/2 animate-pulse rounded bg-ink-800" />
        <div className="h-24 w-full animate-pulse rounded bg-ink-800" />
      </div>
    </div>
  );
}
