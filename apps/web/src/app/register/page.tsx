import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentSession } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await getCurrentSession()) redirect("/dashboard");

  return (
    <div className="container-page py-12 sm:py-16">
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-h2 font-bold tracking-tight text-primary">Create an account</h1>
        <p className="mt-2 text-body text-secondary">
          Track requests and orders in one place. We never ask for card numbers or mobile-banking PINs.
        </p>
        <div className="card mt-6 p-6">
          <AuthForm mode="register" />
        </div>
      </div>
    </div>
  );
}
