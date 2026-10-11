import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DOCS, getDoc, getNeighbors } from "@/lib/docs";
import { DocSections } from "@/components/docs/DocContent";

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const d = getDoc(params.slug);
  return d ? { title: `${d.title} · Docs`, description: d.summary } : { title: "Docs" };
}

export default function DocPage({ params }: { params: { slug: string } }) {
  const doc = getDoc(params.slug);
  if (!doc) notFound();
  const { prev, next } = getNeighbors(doc.slug);
  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_200px]">
      <article className="min-w-0">
        <p className="eyebrow mb-2">Docs</p>
        <h1 className="font-display text-3xl font-bold tracking-wide sm:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-lg text-ink-soft">{doc.summary}</p>

        {/* TOC: inline on small screens, sticky rail on xl */}
        <nav aria-label="On this page" className="mt-6 rounded-xl border border-neutral-200 bg-white p-4 xl:hidden">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">On this page</p>
          <ul className="mt-2 grid gap-0.5 sm:grid-cols-2">
            {doc.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="flex min-h-[40px] items-center text-sm font-semibold text-brand-600 hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8">
          <DocSections sections={doc.sections} />
        </div>

        <nav aria-label="Pagination" className="mt-12 grid gap-3 border-t border-neutral-200 pt-6 sm:grid-cols-2">
          {prev ? (
            <Link href={`/docs/${prev.slug}`} className="card flex min-h-[64px] flex-col justify-center px-5 py-3 transition hover:border-brand-300">
              <span className="text-xs text-ink-muted">← Previous</span>
              <span className="font-semibold">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/docs/${next.slug}`} className="card flex min-h-[64px] flex-col justify-center px-5 py-3 text-right transition hover:border-brand-300">
              <span className="text-xs text-ink-muted">Next →</span>
              <span className="font-semibold">{next.title}</span>
            </Link>
          )}
        </nav>
      </article>

      <aside className="hidden xl:block">
        <nav aria-label="On this page" className="sticky top-24">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">On this page</p>
          <ul className="mt-3 space-y-2 border-l border-neutral-200">
            {doc.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="-ml-px block border-l border-transparent pl-3 text-sm text-ink-soft hover:border-brand-600 hover:text-brand-700">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  );
}
