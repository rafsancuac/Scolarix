/**
 * Theme toggle — dark default, light available (§10.2).
 * Preference persists to localStorage and is applied by the pre-paint script in
 * the root layout so there is no flash of the wrong theme.
 */

"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icon";

type Theme = "dark" | "light";

const STORAGE_KEY = "theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initial: Theme =
      stored === "light" || stored === "dark"
        ? stored
        : document.documentElement.dataset.theme === "light"
          ? "light"
          : "dark";
    setTheme(initial);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  const label = mounted ? `Switch to ${theme === "dark" ? "light" : "dark"} mode` : "Toggle theme";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex size-11 items-center justify-center rounded-button border border-line text-secondary transition-colors duration-fast hover:border-accent/40 hover:text-primary"
    >
      {mounted && theme === "light" ? <Icon.Sun size={18} /> : <Icon.Moon size={18} />}
    </button>
  );
}
