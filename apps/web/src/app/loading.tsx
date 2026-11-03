/**
 * Route-level loading state — spec §10.3 (Loading state is mandatory).
 *
 * Matches the card grid geometry of the catalogue pages so the transition does
 * not shift layout (CLS budget ≤ 0.1, §18.1).
 */

export default function Loading() {
  return (
    <div className="container-page py-10 lg:py-14" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="skeleton h-4 w-40 rounded-pill" />
      <div className="skeleton mt-4 h-10 w-2/3 max-w-md rounded-pill" />
      <div className="skeleton mt-3 h-4 w-full max-w-xl rounded-pill" />
      <div className="skeleton mt-2 h-4 w-4/5 max-w-lg rounded-pill" />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="card flex h-full flex-col gap-4 p-5">
            <div className="flex items-start gap-3">
              <div className="skeleton size-12 rounded-card" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-2/3 rounded-pill" />
                <div className="skeleton h-3 w-1/3 rounded-pill" />
              </div>
            </div>
            <div className="skeleton h-3 w-full rounded-pill" />
            <div className="skeleton h-3 w-4/5 rounded-pill" />
            <div className="skeleton h-6 w-32 rounded-pill" />
            <div className="mt-auto flex items-end justify-between border-t border-line pt-4">
              <div className="skeleton h-8 w-24 rounded-pill" />
              <div className="skeleton h-11 w-28 rounded-button" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
