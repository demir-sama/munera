import { DocsSidebar } from "@/components/docs/DocsSidebar";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
      <DocsSidebar />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
