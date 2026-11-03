import { cx } from "@/lib/client";

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "lime" | "ghost" | "danger";
}) {
  const styles = {
    primary: "bg-pitch text-lime hover:bg-pitch-soft",
    lime: "bg-lime text-pitch hover:brightness-95",
    ghost: "bg-card text-pitch ring-1 ring-line hover:bg-paper",
    danger: "bg-card text-danger ring-1 ring-danger/30 hover:bg-red-50",
  };
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-2xl border border-line bg-card px-3 py-2.5 text-sm outline-none ring-pitch/30 placeholder:text-muted/70 focus:ring-2";

export function Banner({ tone = "error", children }: { tone?: "error" | "info"; children: React.ReactNode }) {
  return (
    <p
      className={cx(
        "rounded-2xl px-3 py-2 text-sm",
        tone === "error" ? "bg-red-50 text-danger" : "bg-lime/40 text-pitch",
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

export function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-clay/15 text-clay",
    accepted: "bg-pitch text-lime",
    rejected: "bg-red-50 text-danger",
    cancelled: "bg-line text-muted",
    open: "bg-lime text-pitch",
    full: "bg-pitch text-lime",
    pay_at_venue: "bg-paper text-pitch ring-1 ring-line",
    paid: "bg-pitch text-lime",
  };
  const label = status.replaceAll("_", " ");
  return (
    <span className={cx("rounded-full px-2.5 py-1 text-xs font-semibold capitalize", styles[status] ?? "bg-paper text-ink")}>
      {label}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-card/70 px-5 py-8 text-center">
      <div className="pitch-pattern mx-auto mb-4 h-16 w-24 rounded-2xl" />
      <h2 className="font-display text-2xl text-pitch">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
