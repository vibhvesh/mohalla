"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/components/session";
import { Banner, Button, Field, inputClass } from "@/components/ui";
import { api } from "@/lib/client";
import { safeNextPath } from "@/lib/validators";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useSession();
  const next = safeNextPath(params.get("next"));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", identifier: "", password: "" });

  return (
    <form
      className="mx-auto max-w-md space-y-4 rounded-3xl bg-card p-5 ring-1 ring-line"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const path = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
        const body =
          mode === "login"
            ? { identifier: form.identifier, password: form.password }
            : { name: form.name, email: form.email, phone: form.phone, password: form.password };
        api(path, { method: "POST", body: JSON.stringify(body) })
          .then(() => refresh())
          .then(() => router.push(next))
          .catch((err: unknown) => {
            setError(err instanceof Error ? err.message : "Could not continue");
            setPending(false);
          });
      }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pitch-soft">Mohalla</p>
        <h1 className="font-display text-4xl text-pitch">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Use an email, a mobile number, or both. The same account can book a slot and list a ground.
        </p>
      </div>
      {mode === "signup" ? (
        <Field label="Name">
          <input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </Field>
      ) : null}
      {mode === "signup" ? (
        <>
          <Field label="Email" hint="Optional if you add a mobile number">
            <input className={inputClass} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </Field>
          <Field label="Mobile" hint="Optional if you add an email. Indian numbers can be 10 digits.">
            <input className={inputClass} inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </Field>
        </>
      ) : (
        <Field label="Email or mobile">
          <input className={inputClass} value={form.identifier} onChange={(event) => setForm({ ...form, identifier: event.target.value })} required />
        </Field>
      )}
      <Field label="Password" hint="At least 8 characters">
        <input className={inputClass} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
      </Field>
      {error ? <Banner>{error}</Banner> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
      </Button>
      <p className="text-sm text-muted">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link className="font-semibold text-pitch" href={`/signup?next=${encodeURIComponent(next)}`}>
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link className="font-semibold text-pitch" href={`/login?next=${encodeURIComponent(next)}`}>
              Log in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
