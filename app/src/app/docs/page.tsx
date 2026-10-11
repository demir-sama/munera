import type { Metadata } from "next";
import Link from "next/link";
import { DOCS } from "@/lib/docs";
import { PageHeader } from "@/components/ui";
import { X_URL } from "@/lib/site";
import { XIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Docs",
  description: "Munera documentation: quickstart, concepts, guides, smart contract reference and security model.",
};

export default function DocsIndex() {
  return (
    <div>
      <PageHeader
        eyebrow="Documentation"
        title="Munera Docs"
        subtitle="Everything about escrowed content bounties on Solana: how to use Munera, how it works under the hood, and how to verify every payout."
        action={
          <a href={X_URL} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm self-start">
            <XIcon className="h-3.5 w-3.5" /> Follow on X
          </a>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {DOCS.map((d, i) => (
          <Link key={d.slug} href={`/docs/${d.slug}`} className="card group flex flex-col gap-1 p-5 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift">
            <span className="text-xs font-semibold text-brand-600">{String(i + 1).padStart(2, "0")}</span>
            <span className="font-bold group-hover:text-brand-700">{d.title}</span>
            <span className="text-sm text-ink-soft">{d.summary}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
