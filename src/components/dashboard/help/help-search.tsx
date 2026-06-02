"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toPersianDigits } from "@/lib/date/jalali";
import {
  type HelpCategory,
  getHelpCategoryById,
  searchHelpArticles,
} from "@/lib/help/help-content";

type HelpSearchProps = {
  categories: HelpCategory[];
  initialCategoryId?: string;
};

export function HelpSearch({ categories, initialCategoryId }: HelpSearchProps) {
  const [query, setQuery] = useState("");
  const selectedCategory = getHelpCategoryById(initialCategoryId);
  const results = useMemo(
    () =>
      searchHelpArticles(query, {
        categoryId: selectedCategory?.id,
        limit: query.trim() || selectedCategory ? 12 : 0,
      }),
    [query, selectedCategory],
  );
  const shouldShowResults = Boolean(query.trim() || selectedCategory);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#9f7131]"
          size={20}
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="input-luxury min-h-14 w-full rounded-[1.25rem] border-[#e8c478]/55 bg-[#fffdf7] py-3 pl-4 pr-12 text-sm font-bold text-[#172033] shadow-[0_18px_50px_rgba(17,24,39,0.08)] placeholder:text-[#9f7131]/70 sm:text-base"
          placeholder="مثلاً ثبت قرارداد، چاپ پیش‌فاکتور، ثبت دریافت، چک، اقساط، تغییر قیمت غذا"
          dir="rtl"
        />
      </div>

      {selectedCategory ? (
        <div className="flex flex-wrap items-center gap-2 text-xs font-black text-[#7d6841]">
          <span className="rounded-full border border-[#c7a15a]/35 bg-[#fff4d8] px-3 py-1.5">
            دسته‌بندی فعال: {selectedCategory.title}
          </span>
          <Link
            href="/dashboard/help"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#d8c08b]/55 bg-white/70 px-3 py-1.5 transition hover:border-[#c7a15a]/70 hover:text-[#172033]"
          >
            <X size={13} />
            حذف فیلتر
          </Link>
        </div>
      ) : null}

      {shouldShowResults ? (
        <div className="overflow-hidden rounded-[1.5rem] border border-[#d8c08b]/62 bg-[#fff9ee]/92 shadow-[0_16px_50px_rgba(17,24,39,0.08)]">
          {results.length > 0 ? (
            <div className="divide-y divide-[#d8c08b]/45">
              {results.map((article) => {
                const category = categories.find(
                  (item) => item.id === article.categoryId,
                );

                return (
                  <Link
                    key={article.slug}
                    href={`/dashboard/help/${article.slug}`}
                    className="block p-4 transition hover:bg-[#fff4d8]/68 sm:p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-black text-[#7d6841]">
                      <span className="rounded-full border border-[#c7a15a]/35 bg-[#fff4d8] px-2.5 py-1">
                        {category?.title}
                      </span>
                      <span>{toPersianDigits(article.readMinutes)} دقیقه مطالعه</span>
                    </div>
                    <h3 className="mt-2 text-base font-black text-[#172033]">
                      {article.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm font-bold leading-7 text-[#6d5f49]">
                      {article.summary}
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-5 text-center text-sm font-black leading-7 text-[#7d6841]">
              نتیجه‌ای پیدا نشد. عبارت ساده‌تری را امتحان کنید یا از پشتیبانی کمک بگیرید.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
