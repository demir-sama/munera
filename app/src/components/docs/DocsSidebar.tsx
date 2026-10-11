"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DOCS } from "@/lib/docs";
import { GITHUB_URL, X_URL } from "@/lib/site";
import { GitHubIcon, XIcon } from "../icons";

export function DocsSidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const current = DOCS.find((d) => path === `/docs/${d.slug}`);

  const list = (
    <nav aria-label="Docs" className="flex flex-col gap-0.5">
      <Link
        href="/docs"
        className={`flex min-h-[44px] items-center rounded-lg px-3 text-sm font-semibold lg:min-h-[36px] ${path === "/docs" ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-neutral-100"}`}
      >
        Overview
      </Link>
      {DOCS.map((d) => (
        <Link
          key={d.slug}
          href={`/docs/${d.slug}`}
          aria-current={path === `/docs/${d.slug}` ? "page" : undefined}
          className={`flex min-h-[44px] items-center rounded-lg px-3 text-sm font-semibold lg:min-h-[36px] ${
            path === `/docs/${d.slug}` ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-neutral-100 hover:text-ink"
          }`}
        >
          {d.title}
        </Link>
      ))}
      <div className="mt-3 flex gap-2 border-t border-neutral-100 pt-3">
        <a href={X_URL} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm flex-1">
          <XIcon className="h-3.5 w-3.5" /> X
        </a>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm flex-1">
          <GitHubIcon className="h-3.5 w-3.5" /> GitHub
        </a>
      </div>
    </nav>
  );

  return (
    <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:pr-2">
      {/* mobile: collapsible */}
      <div className="lg:hidden">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-[48px] w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 text-left text-sm font-semibold"
        >
          <span className="min-w-0 truncate">
            <span className="text-ink-muted">Docs · </span>
            {current?.title ?? "Overview"}
          </span>
          <svg className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {open && <div className="mt-2 rounded-xl border border-neutral-200 bg-white p-2">{list}</div>}
      </div>
      <div className="hidden lg:block">{list}</div>
    </aside>
  );
}
