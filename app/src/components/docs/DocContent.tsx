import Link from "next/link";
import type { ReactNode } from "react";
import type { Block, DocSection } from "@/lib/docs";
import { CodeBlock } from "./CodeBlock";

const TOKEN = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

export function Inline({ text }: { text: string }): ReactNode {
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        if (!part) return null;
        if (part.startsWith("`") && part.endsWith("`"))
          return (
            <code key={i} className="break-words rounded-md bg-brand-50 px-1.5 py-0.5 font-mono text-[0.85em] text-brand-800">
              {part.slice(1, -1)}
            </code>
          );
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
        const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
        if (m) {
          const [, label, href] = m;
          const cls = "break-words font-semibold text-brand-600 underline decoration-brand-200 underline-offset-2 hover:text-brand-800";
          return href.startsWith("/") ? (
            <Link key={i} href={href} className={cls}>
              {label}
            </Link>
          ) : (
            <a key={i} href={href} target="_blank" rel="noopener noreferrer" className={cls}>
              {label}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <>
      {/* desktop: real table */}
      <div className="my-4 hidden overflow-x-auto rounded-xl border border-neutral-200 sm:block">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-brand-50/70 text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              {head.map((h) => (
                <th key={h} className="px-4 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((r, i) => (
              <tr key={i} className="align-top">
                {r.map((c, j) => (
                  <td key={j} className={`px-4 py-2.5 text-ink-soft ${j === 0 ? "font-semibold text-ink" : ""} ${j === 1 && head.length === 2 ? "break-all" : ""}`}>
                    <Inline text={c} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* mobile: compact stacked cards */}
      <div className="my-4 space-y-2 sm:hidden">
        {rows.map((r, i) => (
          <dl key={i} className="rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm">
            <dt className="sr-only">{head[0]}</dt>
            <dd className="break-words font-semibold text-ink">
              <Inline text={r[0]} />
            </dd>
            {r.slice(1).map((c, j) =>
              c === "" ? null : (
                <div key={j} className="mt-1 flex gap-2">
                  {head.length > 2 && <dt className="w-14 shrink-0 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{head[j + 1]}</dt>}
                  <dd className="min-w-0 flex-1 break-words text-ink-soft">
                    <Inline text={c} />
                  </dd>
                </div>
              )
            )}
          </dl>
        ))}
      </div>
    </>
  );
}

function BlockView({ b }: { b: Block }) {
  switch (b.t) {
    case "p":
      return (
        <p className="my-3 leading-relaxed text-ink-soft">
          <Inline text={b.text} />
        </p>
      );
    case "h3":
      return <h3 className="mb-1 mt-6 text-lg font-bold">{b.text}</h3>;
    case "ul":
      return (
        <ul className="my-3 list-disc space-y-1.5 pl-5 leading-relaxed text-ink-soft marker:text-brand-400">
          {b.items.map((it, i) => (
            <li key={i}>
              <Inline text={it} />
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="my-3 list-decimal space-y-1.5 pl-5 leading-relaxed text-ink-soft marker:font-semibold marker:text-brand-600">
          {b.items.map((it, i) => (
            <li key={i}>
              <Inline text={it} />
            </li>
          ))}
        </ol>
      );
    case "code":
      return <CodeBlock code={b.code} lang={b.lang} />;
    case "table":
      return <Table head={b.head} rows={b.rows} />;
    case "callout":
      return (
        <div className={`my-4 rounded-xl border px-4 py-3 text-sm leading-relaxed ${b.tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-brand-100 bg-brand-50/70 text-ink-soft"}`}>
          <Inline text={b.text} />
        </div>
      );
  }
}

export function DocSections({ sections }: { sections: DocSection[] }) {
  return (
    <div>
      {sections.map((s) => (
        <section key={s.id} id={s.id} className="scroll-mt-24 border-t border-neutral-100 pt-8 first:border-0 first:pt-0 [&:not(:first-child)]:mt-8">
          <h2 className="font-display text-xl font-bold tracking-wide sm:text-2xl">
            <a href={`#${s.id}`} className="hover:text-brand-700">
              {s.title}
            </a>
          </h2>
          {s.blocks.map((b, i) => (
            <BlockView key={i} b={b} />
          ))}
        </section>
      ))}
    </div>
  );
}
