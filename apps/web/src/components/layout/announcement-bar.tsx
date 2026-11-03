/**
 * Announcement bar — spec §9.1.2. Admin-controlled, dismissible per session,
 * never fabricates urgency (no countdowns, no false scarcity).
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

const DISMISS_KEY = "announcement-dismissed";

export function AnnouncementBar({
  text,
  href,
  ctaLabel,
  announcementId,
}: {
  text: string;
  href: string;
  ctaLabel: string;
  announcementId: string;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(DISMISS_KEY) !== announcementId);
    } catch {
      // Storage unavailable (private mode / sandboxed frame) — keep it visible.
    }
  }, [announcementId]);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, announcementId);
    } catch {
      /* non-fatal */
    }
  }

  return (
    <div className="border-b border-line bg-accent-soft">
      <div className="container-page flex min-h-11 items-center justify-center gap-3 py-2 text-caption">
        <Icon.Sparkle size={14} className="hidden shrink-0 text-accent sm:block" />
        <p className="text-center text-secondary">
          {text}{" "}
          <Link
            href={href}
            className="font-medium text-link underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
          >
            {ctaLabel}
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="shrink-0 rounded-button p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-primary"
        >
          <Icon.Close size={14} />
        </button>
      </div>
    </div>
  );
}
