import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { safeRedirectPath } from "@/server/auth/policy";
import { getCurrentSession } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = safeRedirectPath(next, "");
  if (await getCurrentSession()) redirect(safeNext || "/dashboard");

  return (
    <div className="container-page py-12 sm:py-16">
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-h2 font-bold tracking-tight text-primary">Sign in</h1>
        <p className="mt-2 text-body text-secondary">Access your orders, requests and account.</p>
        <div className="card mt-6 p-6">
          <AuthForm mode="login" next={safeNext || undefined} />
        </div>
      </div>
    </div>
  );
}
