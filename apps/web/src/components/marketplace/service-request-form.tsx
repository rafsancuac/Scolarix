/**
 * Service request form — spec §12.5 / §12.6.
 *
 * Server contract: POST /api/v1/service-requests
 *   { serviceSlug, packageId?, name, email, phone?, institution?, deadline?,
 *     brief, integrityAcknowledged: true }
 *
 * The form never sends a price. Quotation is produced server-side by a
 * specialist, and the quote is immutable once issued (§15.4). Client-side
 * validation is a convenience only — the route re-validates everything,
 * screens the brief for prohibited scope and requires the declaration.
 */

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { formatBDT } from "@/lib/money";
import { formatTurnaround } from "@/lib/format";
import type { Service } from "@/lib/types";

interface FormState {
  status: "idle" | "submitting" | "error" | "accepted";
  message?: string;
  reference?: string;
  fieldErrors?: Record<string, string>;
}

const INITIAL: FormState = { status: "idle" };

async function submitRequest(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const response = await fetch("/api/v1/service-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceSlug: String(formData.get("serviceSlug") ?? ""),
        packageId: String(formData.get("packageId") ?? "") || undefined,
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? "") || undefined,
        institution: String(formData.get("institution") ?? "") || undefined,
        deadline: String(formData.get("deadline") ?? "") || undefined,
        brief: String(formData.get("brief") ?? ""),
        integrityAcknowledged: formData.get("integrityAcknowledged") === "on",
      }),
    });

    const payload = (await response.json()) as {
      reference?: string;
      message?: string;
      errors?: Record<string, string>;
    };

    if (!response.ok) {
      return {
        status: "error",
        message: payload.message ?? "We could not submit that request. Please try again.",
        fieldErrors: payload.errors,
      };
    }

    return {
      status: "accepted",
      reference: payload.reference,
      message: payload.message,
    };
  } catch {
    return {
      status: "error",
      message: "Network error — your request was not sent. Please try again.",
    };
  }
}

export function ServiceRequestForm({ service }: { service: Service }) {
  const [state, submit, isPending] = useActionState<FormState, FormData>(submitRequest, INITIAL);
  const [packageId, setPackageId] = useState<string>(service.packages[0]?.id ?? "");
  /** Bumping this remounts the form, clearing every field after a success. */
  const [formKey, setFormKey] = useState(0);
  const successRef = useRef<HTMLDivElement>(null);

  const selectedPackage = service.packages.find((pkg) => pkg.id === packageId);

  useEffect(() => {
    if (state.status === "accepted") successRef.current?.focus();
  }, [state.status]);

  if (state.status === "accepted") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="card card-elevated border-success/30 bg-success/[0.06] p-6 outline-none"
      >
        <span className="inline-flex size-11 items-center justify-center rounded-pill bg-success/15 text-success">
          <Icon.Check size={22} />
        </span>
        <h2 className="mt-4 text-body font-semibold text-primary">Request received</h2>
        <p className="mt-2 text-caption leading-relaxed text-secondary">
          {state.message ??
            "A specialist will review the scope and send a fixed quotation to your email."}
        </p>
        {state.reference ? (
          <p className="tnum mt-4 rounded-input border border-line bg-surface-1 px-4 py-3 text-caption text-primary">
            Reference <strong className="font-semibold">{state.reference}</strong>
          </p>
        ) : null}
        <p className="mt-4 text-caption text-muted">
          Nothing has been charged. You pay only after you accept a quotation.
        </p>
        <button
          type="button"
          onClick={() => {
            setPackageId(service.packages[0]?.id ?? "");
            setFormKey((key) => key + 1);
          }}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-button border border-line text-caption font-medium text-primary transition-colors hover:border-accent/40 hover:text-link"
        >
          <Icon.Refresh size={15} />
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form key={formKey} action={submit} className="card card-elevated p-5 sm:p-6" noValidate>
      <input type="hidden" name="serviceSlug" value={service.slug} />

      <h2 className="text-body font-semibold text-primary">Request {service.name}</h2>
      <p className="mt-1 text-caption text-muted">
        {service.requiresQuotation
          ? "You will receive a fixed quotation before any payment."
          : "Fixed price. You pay after we confirm the scope."}
      </p>

      {service.packages.length > 0 ? (
        <div className="mt-5">
          <label htmlFor="packageId" className="text-caption font-medium text-primary">
            Package
          </label>
          <select
            id="packageId"
            name="packageId"
            value={packageId}
            onChange={(event) => setPackageId(event.target.value)}
            className="mt-1.5 h-12 w-full rounded-button border border-line bg-surface-1 px-3 text-caption text-primary outline-none transition-colors focus:border-accent"
          >
            {service.packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.label} — {pkg.pricePoisha > 0 ? formatBDT(pkg.pricePoisha) : "quoted"}
              </option>
            ))}
          </select>
          {selectedPackage ? (
            <p className="mt-2 text-caption text-muted">
              {formatTurnaround(selectedPackage.turnaroundDays)} ·{" "}
              {selectedPackage.revisionsIncluded} revision
              {selectedPackage.revisionsIncluded === 1 ? "" : "s"} included
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4">
        <Field
          id="name"
          label="Full name"
          required
          error={state.fieldErrors?.name}
          autoComplete="name"
          placeholder="Your name"
        />
        <Field
          id="email"
          label="Email"
          type="email"
          required
          error={state.fieldErrors?.email}
          autoComplete="email"
          placeholder="you@example.com"
          hint="An .edu or university email speeds up student verification."
        />
        <Field
          id="phone"
          label="Phone"
          type="tel"
          error={state.fieldErrors?.phone}
          autoComplete="tel"
          placeholder="+880 1XXX-XXXXXX"
        />
        <Field
          id="institution"
          label="University or institution"
          error={state.fieldErrors?.institution}
          autoComplete="organization"
          placeholder="Optional"
        />
        <Field
          id="deadline"
          label="When do you need it?"
          type="date"
          error={state.fieldErrors?.deadline}
        />

        <div>
          <label htmlFor="brief" className="text-caption font-medium text-primary">
            Describe the work <span className="text-danger">*</span>
          </label>
          <textarea
            id="brief"
            name="brief"
            rows={5}
            required
            minLength={40}
            placeholder="Subject, document type, length, formatting standard (APA 7 / IEEE / university template), what you have already written, and what you need from us."
            className="mt-1.5 w-full rounded-input border border-line bg-surface-1 p-3 text-caption text-primary outline-none transition-colors placeholder:text-muted focus:border-accent"
          />
          {state.fieldErrors?.brief ? (
            <FieldError message={state.fieldErrors.brief} />
          ) : (
            <p className="mt-1.5 text-caption text-muted">
              Minimum 40 characters. Do not paste your full manuscript here — you will be given a
              secure upload link after the quote is accepted.
            </p>
          )}
        </div>

        {/* §12.6 mandatory declaration — timestamp + IP recorded server-side */}
        <div
          className={`rounded-input border p-4 ${
            state.fieldErrors?.integrityAcknowledged
              ? "border-danger/40 bg-danger/[0.06]"
              : "border-line bg-surface-2"
          }`}
        >
          <label htmlFor="integrityAcknowledged" className="flex cursor-pointer items-start gap-3">
            <input
              id="integrityAcknowledged"
              name="integrityAcknowledged"
              type="checkbox"
              required
              className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
            />
            <span className="text-caption leading-relaxed text-secondary">
              <strong className="font-medium text-primary">I understand and agree: </strong>
              {service.integrityNotice}
              <span className="mt-1.5 block text-muted">
                My acknowledgement, the submission timestamp and my IP address are recorded with
                this request. Requests outside the permitted scope will be declined.
              </span>
            </span>
          </label>
          {state.fieldErrors?.integrityAcknowledged ? (
            <FieldError message={state.fieldErrors.integrityAcknowledged} />
          ) : null}
        </div>
      </div>

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className="mt-4 rounded-input border border-danger/30 bg-danger/10 px-4 py-3 text-caption text-danger"
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        aria-busy={isPending}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-button bg-accent px-6 text-body font-medium text-accent-contrast transition-colors duration-fast hover:bg-accent-hover active:translate-y-px disabled:pointer-events-none disabled:opacity-60"
      >
        {isPending ? (
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
        ) : (
          <Icon.Send size={17} />
        )}
        {isPending ? "Submitting…" : "Submit request"}
      </button>

      <p className="mt-3 text-caption text-muted">
        Submitting creates a request, not an order.{" "}
        <span className="whitespace-nowrap">No payment is taken now.</span>
      </p>
    </form>
  );
}

/* -------------------------------------------------------------------------- */

function Field({
  id,
  label,
  type = "text",
  required,
  error,
  hint,
  ...rest
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  error?: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="text-caption font-medium text-primary">
        {label} {required ? <span className="text-danger">*</span> : null}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`mt-1.5 h-12 w-full rounded-input border bg-surface-1 px-3 text-caption text-primary outline-none transition-colors placeholder:text-muted focus:border-accent ${
          error ? "border-danger/60" : "border-line"
        }`}
        {...rest}
      />
      {error ? (
        <FieldError id={`${id}-error`} message={error} />
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-caption text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function FieldError({ id, message }: { id?: string; message: string }) {
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-caption text-danger">
      <Icon.Alert size={13} className="mt-0.5 shrink-0" />
      {message}
    </p>
  );
}
