"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type Mode = "login" | "register";

interface Props {
  mode: Mode;
  next?: string;
}

interface ApiError {
  message?: string;
  errors?: Record<string, string>;
}

const COPY = {
  login: { submit: "Sign in", busy: "Signing in…", switchText: "New here?", switchLink: "Create an account", switchHref: "/register" },
  register: { submit: "Create account", busy: "Creating account…", switchText: "Already registered?", switchLink: "Sign in", switchHref: "/login" },
} as const;

const inputClass =
  "mt-1.5 h-11 w-full rounded-input border border-line bg-surface-1 px-3 text-body text-primary placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function AuthForm({ mode, next }: Props) {
  const copy = COPY[mode];
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFormError(null);
    setFieldErrors({});
    const data = new FormData(event.currentTarget);
    const payload: Record<string, string> = {
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    };
    if (mode === "register") payload.name = String(data.get("name") ?? "");
    if (mode === "login" && next) payload.next = next;

    try {
      const response = await fetch(`/api/v1/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => ({}))) as ApiError & { redirectTo?: string };
      if (response.ok && body.redirectTo) {
        window.location.assign(body.redirectTo);
        return;
      }
      setFieldErrors(body.errors ?? {});
      setFormError(body.message ?? "Something went wrong. Please try again.");
    } catch {
      setFormError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-busy={pending}>
      {mode === "register" ? (
        <div>
          <label htmlFor="name" className="text-caption font-medium text-primary">Full name</label>
          <input id="name" name="name" type="text" autoComplete="name" required className={inputClass}
            aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "name-error" : undefined} />
          {fieldErrors.name ? <p id="name-error" className="mt-1 text-caption text-danger">{fieldErrors.name}</p> : null}
        </div>
      ) : null}

      <div>
        <label htmlFor="email" className="text-caption font-medium text-primary">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass}
          aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "email-error" : undefined} />
        {fieldErrors.email ? <p id="email-error" className="mt-1 text-caption text-danger">{fieldErrors.email}</p> : null}
      </div>

      <div>
        <label htmlFor="password" className="text-caption font-medium text-primary">Password</label>
        <input id="password" name="password" type="password" required
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "register" ? 12 : undefined} className={inputClass}
          aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? "password-error" : "password-hint"} />
        {fieldErrors.password ? (
          <p id="password-error" className="mt-1 text-caption text-danger">{fieldErrors.password}</p>
        ) : mode === "register" ? (
          <p id="password-hint" className="mt-1 text-caption text-muted">At least 12 characters. A short passphrase works well.</p>
        ) : null}
      </div>

      {formError ? (
        <p role="alert" className="rounded-input border border-danger/30 bg-danger/10 px-3 py-2 text-caption text-danger">{formError}</p>
      ) : null}

      <button type="submit" disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-button bg-accent px-5 text-body font-semibold text-accent-contrast hover:bg-accent-hover disabled:opacity-60">
        {pending ? copy.busy : copy.submit}
      </button>

      <p className="text-center text-caption text-secondary">
        {copy.switchText}{" "}
        <Link href={copy.switchHref} className="font-medium text-accent underline underline-offset-2">{copy.switchLink}</Link>
      </p>
    </form>
  );
}
