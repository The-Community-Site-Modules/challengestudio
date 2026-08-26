// Skeleton for the workspace picker. Mirrors the real layout closely enough
// that nothing jumps when the data arrives.

function Shimmer({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200/70 ${className}`} />
}

export default function DashboardLoading() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-50">
      <div className="h-16 shrink-0 border-b border-slate-200 bg-white" />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-12 lg:px-8">
          <Shimmer className="h-3 w-24" />
          <Shimmer className="mt-3 h-8 w-64" />
          <Shimmer className="mt-3 h-4 w-96" />

          <div className="mt-8 grid grid-cols-2 rounded-xl border border-slate-200 bg-white lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4">
                <Shimmer className="h-9 w-9 rounded-lg" />
                <div className="flex-1">
                  <Shimmer className="h-5 w-10" />
                  <Shimmer className="mt-2 h-3 w-20" />
                </div>
              </div>
            ))}
          </div>

          <Shimmer className="mt-10 h-6 w-40" />

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <Shimmer className="h-10 w-10 rounded-lg" />
                  <Shimmer className="h-5 w-14 rounded-md" />
                </div>
                <Shimmer className="mt-4 h-5 w-36" />
                <Shimmer className="mt-2 h-3 w-24" />
                <Shimmer className="mt-4 h-3 w-full" />
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <Shimmer className="h-3 w-28" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
