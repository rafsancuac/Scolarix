/**
 * Demo-mode ribbon — spec §6 rule 13.
 *
 * While DEMO_MODE is on, every dashboard metric and any sample content is
 * labelled "DEMO DATA" and the storefront carries a persistent notice. This is
 * what keeps a seeded fixture catalogue from being mistaken for live trading
 * data. The component renders nothing in production.
 */

import { IS_DEMO_MODE, BRAND } from "@/lib/brand";
import { Icon } from "@/components/ui/icon";

export function DemoModeRibbon() {
  if (!IS_DEMO_MODE) return null;

  return (
    <div className="border-t border-warning/30 bg-warning/10">
      <div className="container-page flex flex-col gap-2 py-4 text-caption sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-warning">
          <Icon.Info size={15} className="mt-0.5 shrink-0" />
          <span>
            <strong className="font-semibold">DEMO DATA.</strong> {BRAND.name} is running in
            demo mode on a seeded catalogue. No payments are processed, no orders are created
            and no figures on this site are live trading data.
          </span>
        </p>
        <p className="shrink-0 text-muted">
          Set <code className="rounded bg-surface-2 px-1.5 py-0.5">DEMO_MODE=false</code> once
          the payment gateway and database adapters are connected.
        </p>
      </div>
    </div>
  );
}

/** Small inline label for metrics and tables rendered from seeded data. */
export function DemoDataTag({ className = "" }: { className?: string }) {
  if (!IS_DEMO_MODE) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill border border-warning/30 bg-warning/10 px-2 py-0.5 text-caption font-medium text-warning ${className}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-warning" />
      Demo data
    </span>
  );
}
