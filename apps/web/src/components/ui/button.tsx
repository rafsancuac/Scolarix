/**
 * Button — spec §10.3 requires: Default · Hover · Focus-visible · Active ·
 * Loading · Disabled. Touch target ≥ 44px (§21.2). Semantic tokens only.
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-contrast hover:bg-accent-hover active:translate-y-px shadow-[0_1px_2px_rgba(0,0,0,0.12)]",
  secondary: "bg-surface-2 text-primary hover:bg-surface-3 border border-line active:translate-y-px",
  outline: "border border-line-strong text-primary hover:bg-surface-2 hover:border-accent/40",
  ghost: "text-secondary hover:text-primary hover:bg-surface-2",
  danger: "bg-danger text-white hover:bg-danger/90",
};

const SIZE: Record<Size, string> = {
  sm: "h-9 px-3 text-caption gap-1.5",
  md: "h-11 px-4 text-body gap-2",
  lg: "h-12 px-6 text-body gap-2",
};

const BASE =
  "inline-flex items-center justify-center rounded-button font-medium transition-[background-color,color,border-color,transform] duration-fast ease-brand disabled:pointer-events-none disabled:opacity-50";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
} & React.ComponentProps<typeof Link>) {
  return (
    <Link
      href={href}
      className={`${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}

function Spinner() {
  return (
    <span
      className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80"
      aria-hidden="true"
    />
  );
}
