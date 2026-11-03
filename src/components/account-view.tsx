"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui";
import { api } from "@/lib/client";
import { formatPhone } from "@/lib/phone";

export function AccountView() {
  const { user, loading, refresh } = useSession();
  const router = useRouter();

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (!user) {
    return (
      <p className="text-sm">
        <Link href="/login?next=/account" className="font-semibold text-pitch">
          Log in
        </Link>{" "}
        to see your account.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="font-display text-4xl text-pitch">{user.name}</h1>
      <div className="space-y-1 rounded-3xl bg-card p-4 text-sm ring-1 ring-line">
        <p>{user.email || "No email"}</p>
        <p>{user.phone ? formatPhone(user.phone) : "No mobile number"}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/bookings" className="rounded-full bg-paper px-4 py-2 text-sm font-semibold ring-1 ring-line">
          My bookings
        </Link>
        <Link href="/owner" className="rounded-full bg-paper px-4 py-2 text-sm font-semibold ring-1 ring-line">
          Host a ground
        </Link>
      </div>
      <Button
        variant="ghost"
        type="button"
        onClick={() => {
          api("/api/auth/logout", { method: "POST" })
            .then(() => refresh())
            .then(() => router.push("/"));
        }}
      >
        Log out
      </Button>
    </div>
  );
}
