"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { CityProvider, useCity } from "@/components/city";
import { SessionProvider, useSession } from "@/components/session";
import { cx } from "@/lib/client";

const links = [
  { href: "/", label: "Explore" },
  { href: "/games", label: "Games" },
  { href: "/bookings", label: "Bookings" },
  { href: "/owner", label: "Host" },
];

function Mark() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-2xl bg-pitch text-sm font-bold text-lime">M</span>
  );
}

function CityButton() {
  const { city, setCity } = useCity();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(city);

  return (
    <div className="relative">
      <button
        type="button"
        className="rounded-full bg-card px-3 py-1.5 text-sm font-semibold ring-1 ring-line"
        onClick={() => {
          setDraft(city);
          setOpen((value) => !value);
        }}
      >
        {city}
      </button>
      {open ? (
        <form
          className="absolute right-0 z-30 mt-2 w-64 rounded-3xl bg-card p-3 shadow-xl ring-1 ring-line"
          onSubmit={(event) => {
            event.preventDefault();
            void setCity(draft);
            setOpen(false);
          }}
        >
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="city">
            City
          </label>
          <input
            id="city"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-line px-3 py-2 text-sm"
          />
          <button type="submit" className="mt-2 w-full rounded-full bg-pitch py-2 text-sm font-semibold text-lime">
            Show this city
          </button>
        </form>
      ) : null}
    </div>
  );
}

function AccountLink() {
  const { user, loading } = useSession();
  if (loading) return <span className="text-sm text-muted">…</span>;
  if (!user) {
    return (
      <Link href="/login" className="rounded-full bg-lime px-3 py-1.5 text-sm font-semibold text-pitch">
        Log in
      </Link>
    );
  }
  return (
    <Link href="/account" className="max-w-28 truncate text-sm font-semibold">
      {user.name.split(" ")[0]}
    </Link>
  );
}

function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav className={className}>
      {links.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cx(
              "rounded-full px-3 py-2 text-sm font-semibold",
              active ? "bg-pitch text-lime" : "text-ink hover:bg-card",
            )}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/90 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Mark />
          <span className="font-display text-2xl leading-none text-pitch">Mohalla</span>
        </Link>
        <Suspense fallback={null}>
          <NavLinks className="ml-4 hidden items-center gap-1 md:flex" />
        </Suspense>
        <div className="ml-auto flex items-center gap-2">
          <CityButton />
          <AccountLink />
        </div>
      </div>
    </header>
  );
}

function BottomNav() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <Suspense fallback={<div className="h-14" />}>
        <NavLinks className="grid grid-cols-4" />
      </Suspense>
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CityProvider>
        <div className="mx-auto min-h-full max-w-6xl">
          <Header />
          <main className="px-4 pb-28 pt-4 md:pb-16">{children}</main>
          <BottomNav />
        </div>
      </CityProvider>
    </SessionProvider>
  );
}
