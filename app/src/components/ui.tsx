"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { BountyState, SubmissionState } from "@/lib/data";

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const bountyStyles: Record<BountyState, string> = {
  open: "bg-brand-50 text-brand-700 ring-brand-200",
  filled: "bg-neutral-100 text-ink ring-neutral-300",
  expired: "bg-amber-50 text-amber-800 ring-amber-200",
  closed: "bg-neutral-100 text-ink-muted ring-neutral-200",
};
const bountyLabels: Record<BountyState, string> = { open: "Open", filled: "Filled", expired: "Expired", closed: "Closed" };

export function BountyBadge({ state }: { state: BountyState }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${bountyStyles[state]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${state === "open" ? "bg-brand-600" : "bg-current opacity-60"}`} />
      {bountyLabels[state]}
    </span>
  );
}

const subStyles: Record<SubmissionState, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  approved: "bg-brand-600 text-white ring-brand-600",
  rejected: "bg-neutral-100 text-ink-muted ring-neutral-200",
};
const subLabels: Record<SubmissionState, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected" };

export function SubmissionBadge({ state }: { state: SubmissionState }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${subStyles[state]}`}>
      {subLabels[state]}
    </span>
  );
}

export function Notice({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warn" | "error";
  title?: string;
  children?: ReactNode;
}) {
  const t = {
    info: "border-brand-200 bg-brand-50 text-brand-900",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-red-200 bg-red-50 text-red-900",
  }[tone];
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${t}`}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-1" : ""}>{children}</div>}
    </div>
  );
}

export function ExtLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`font-semibold text-brand-600 underline-offset-2 hover:underline ${className}`}
    >
      {children}
    </a>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-bold tracking-wide sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, body, cta }: { title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-2xl text-brand-600">⬡</div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-ink-soft">{body}</p>
      {cta && (
        <Link href={cta.href} className="btn-primary mt-5">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

export function SkeletonCards({ n = 3 }: { n?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card h-52 animate-pulse p-6">
          <div className="h-5 w-2/3 rounded bg-neutral-100" />
          <div className="mt-4 h-8 w-1/3 rounded bg-brand-50" />
          <div className="mt-8 h-4 w-full rounded bg-neutral-100" />
          <div className="mt-3 h-4 w-1/2 rounded bg-neutral-100" />
        </div>
      ))}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200/80 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-ink">{value}</p>
      {sub && <p className="text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}
