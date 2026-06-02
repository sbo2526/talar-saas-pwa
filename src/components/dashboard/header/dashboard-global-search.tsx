"use client";

import { ArrowUpLeft, FileText, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

type GlobalSearchResult = {
  id: string;
  type: "contract";
  title: string;
  subtitle: string;
  meta: string;
  href: string;
  badge: string;
};

type DashboardGlobalSearchProps = {
  compact?: boolean;
};

const typeLabels: Record<GlobalSearchResult["type"], string> = {
  contract: "مشاهده قرارداد",
};

function ResultIcon() {
  return <FileText className="size-4" />;
}

export function DashboardGlobalSearch({ compact = false }: DashboardGlobalSearchProps) {
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const normalizedQuery = query.trim();

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);

    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      setResults([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setHasSearched(true);

      try {
        const response = await fetch(
          `/api/dashboard/global-search?q=${encodeURIComponent(normalizedQuery)}`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (!response.ok) {
          throw new Error("global-search-failed");
        }

        const data = (await response.json()) as { results?: GlobalSearchResult[] };
        setResults(Array.isArray(data.results) ? data.results : []);
        setOpen(true);
      } catch (error) {
        if (!controller.signal.aborted) {
          setResults([]);
          setOpen(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 240);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [normalizedQuery]);

  const shellClass = compact
    ? "h-10 rounded-2xl px-3 text-xs sm:h-11 sm:px-4"
    : "h-12 rounded-2xl px-4 text-sm";

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <label className="sr-only" htmlFor={inputId}>
        جست‌وجوی سراسری
      </label>
      <div
        className={`flex min-w-0 items-center gap-2 border border-[#d8c08b]/70 bg-[#fff8ea]/92 font-bold text-[#7d6841] shadow-[0_14px_34px_rgba(17,24,39,0.06)] transition focus-within:border-[#c7a15a] focus-within:bg-white focus-within:shadow-[0_18px_42px_rgba(199,161,90,0.13)] ${shellClass}`}
      >
        <Search size={compact ? 16 : 18} className="shrink-0 text-[#9f7131]" />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="نام مشتری را برای نمایش قراردادهای او جست‌وجو کنید"
          className="min-w-0 flex-1 bg-transparent text-right font-bold text-[#111827] outline-none placeholder:text-[#7d6841]/82"
          autoComplete="off"
        />
        {loading ? <Loader2 size={16} className="shrink-0 animate-spin text-[#9f7131]" /> : null}
      </div>

      {open ? (
        <div className="absolute end-0 top-[calc(100%+0.6rem)] z-50 w-[min(calc(100vw-1.5rem),33rem)] overflow-hidden rounded-[1.6rem] border border-[#d8c08b]/76 bg-[#fff9ee] text-[#111827] shadow-[0_28px_90px_rgba(17,24,39,0.20)]">
          <div className="border-b border-[#d8c08b]/55 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.18),transparent_14rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-3.5">
            <p className="text-sm font-black text-[#111827]">جست‌وجوی سراسری پنل</p>
            <p className="mt-1 text-xs font-bold leading-5 text-[#7d6841]">
              نام مشتری را وارد کنید تا قراردادهای مربوط به همان مشتری نمایش داده شود.
            </p>
          </div>

          <div className="max-h-[min(34rem,70vh)] overflow-y-auto p-2.5">
            {normalizedQuery.length < 2 ? (
              <div className="rounded-[1.25rem] border border-dashed border-[#d8c08b]/80 bg-white/55 p-4 text-xs font-bold leading-6 text-[#6d5f49]">
                حداقل دو حرف از نام مشتری را وارد کنید تا قراردادهای همان مشتری نمایش داده شود.
              </div>
            ) : results.length ? (
              <div className="grid gap-2">
                {results.map((result) => (
                  <Link
                    key={`${result.type}-${result.id}`}
                    href={result.href}
                    onClick={() => setOpen(false)}
                    className="group grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 rounded-[1.25rem] border border-[#d8c08b]/48 bg-white/62 p-3 text-right shadow-[0_10px_28px_rgba(17,24,39,0.045)] transition hover:border-[#c7a15a]/70 hover:bg-[#fff4dc]"
                  >
                    <span className="flex size-10 items-center justify-center rounded-2xl border border-[#d8c08b]/64 bg-[#fff7e6] text-[#8a631f] transition group-hover:border-[#c7a15a] group-hover:bg-[#f4dfaa]">
                      <ResultIcon />
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-black text-[#111827]">
                          {result.title}
                        </span>
                        <span className="rounded-full border border-[#111827]/10 bg-[#111827]/6 px-2 py-0.5 text-[10px] font-black text-[#4b5563]">
                          {typeLabels[result.type]}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-xs font-bold text-[#6d5f49]">
                        {result.subtitle || result.badge}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] font-bold text-[#9f7131]">
                        {result.meta}
                      </span>
                    </span>
                    <span className="flex size-9 items-center justify-center rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea] text-[#7d6841] transition group-hover:border-[#111827] group-hover:bg-[#111827] group-hover:text-[#fff8ea]">
                      <ArrowUpLeft size={15} />
                    </span>
                  </Link>
                ))}
              </div>
            ) : hasSearched && !loading ? (
              <div className="rounded-[1.25rem] border border-dashed border-[#d8c08b]/80 bg-white/55 p-5 text-center">
                <p className="text-sm font-black text-[#111827]">نتیجه‌ای پیدا نشد.</p>
                <p className="mt-2 text-xs font-bold leading-6 text-[#6d5f49]">
                  قراردادی برای این مشتری پیدا نشد. نام مشتری را دقیق‌تر وارد کنید.
                </p>
              </div>
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-[#d8c08b]/80 bg-white/55 p-4 text-xs font-bold leading-6 text-[#6d5f49]">
                در حال آماده‌سازی قراردادهای مشتری...
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
