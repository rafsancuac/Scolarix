/**
 * Uncaught error boundary — spec §10.3.
 *
 * Client component (required by the App Router). Deliberately does not render
 * the exception detail to the visitor: the message goes to the error reporter
 * (Sentry/OTEL when configured, §17.7) and the user gets a recovery path.
 */

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this is the Sentry/OTEL capture call. The digest is what
    // support asks a customer for, because it maps to the server-side record.
    console.error("Unhandled application error", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <span className="inline-flex size-16 items-center justify-center rounded-card-lg bg-danger/10 text-danger">
        <Icon.Alert size={26} />
      </span>

      <h1 className="mt-6 font-display text-h1 font-bold tracking-tight text-primary">
        Something went wrong
      </h1>
      <p className="mt-4 max-w-lg text-body text-secondary">
        An unexpected error stopped this page from rendering. Nothing you entered has been lost, and
        no payment has been taken — if you were in the middle of checkout, your cart is preserved in
        the link you came from.
      </p>

      {error.digest ? (
        <p className="tnum mt-5 rounded-input border border-line bg-surface-1 px-4 py-3 text-caption text-muted">
          Error reference <strong className="font-semibold text-primary">{error.digest}</strong>
          <span className="mt-1 block">
            Quote this reference when you contact support — it maps directly to the server log.
          </span>
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-12 items-center gap-2 rounded-button bg-accent px-6 text-body font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
        >
          <Icon.Refresh size={16} />
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-12 items-center rounded-button border border-line px-6 text-body font-medium text-primary transition-colors hover:border-accent/40 hover:text-link"
        >
          Back to the homepage
        </Link>
      </div>

      <p className="mt-8 text-caption text-muted">
        If this keeps happening, contact support with the reference above.
      </p>
    </div>
  );
}
