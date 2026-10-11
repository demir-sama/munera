"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; kind: ToastKind; title: string; message?: string; href?: string; linkLabel?: string };
type Opts = { message?: string; href?: string; linkLabel?: string; duration?: number };

type ToastApi = {
  success: (title: string, opts?: Opts) => void;
  error: (title: string, opts?: Opts) => void;
  info: (title: string, opts?: Opts) => void;
};

const Ctx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast must be used within ToastProvider");
  return c;
}

const styles: Record<ToastKind, { bar: string; icon: string; glyph: string }> = {
  success: { bar: "bg-brand-600", icon: "bg-brand-50 text-brand-700", glyph: "✓" },
  error: { bar: "bg-red-600", icon: "bg-red-50 text-red-700", glyph: "!" },
  info: { bar: "bg-ink", icon: "bg-neutral-100 text-ink", glyph: "i" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (kind: ToastKind) => (title: string, opts: Opts = {}) => {
      const id = Date.now() + Math.random();
      setItems((xs) => [...xs.slice(-3), { id, kind, title, message: opts.message, href: opts.href, linkLabel: opts.linkLabel }]);
      setTimeout(() => dismiss(id), opts.duration ?? (kind === "error" ? 9000 : 8000));
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({ success: push("success"), error: push("error"), info: push("info") }),
    [push]
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto relative flex gap-3 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 pl-5 shadow-lift"
          >
            <span className={`absolute inset-y-0 left-0 w-1.5 ${styles[t.kind].bar}`} />
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${styles[t.kind].icon}`}>
              {styles[t.kind].glyph}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{t.title}</p>
              {t.message && <p className="mt-0.5 break-words text-sm text-ink-soft">{t.message}</p>}
              {t.href && (
                <a
                  href={t.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-block text-sm font-semibold text-brand-600 underline-offset-2 hover:underline"
                >
                  {t.linkLabel ?? "View on Solana Explorer"} ↗
                </a>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="h-6 w-6 shrink-0 rounded-full text-ink-muted hover:bg-neutral-100"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
