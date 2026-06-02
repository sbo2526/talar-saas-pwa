import type { Metadata } from "next";
import {
  ArrowLeft,
  Banknote,
  BarChart3,
  BellRing,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Headset,
  Printer,
  Sparkles,
  UserCircle,
  Users,
  Utensils,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { HelpSearch } from "@/components/dashboard/help/help-search";
import { requireTenantMember } from "@/lib/auth/session";
import { toPersianDigits } from "@/lib/date/jalali";
import {
  type HelpArticle,
  type HelpCategory,
  getHelpArticleCountByCategory,
  getHelpArticleBySlug,
  getPopularHelpArticles,
  helpCategories,
  helpLearningPath,
} from "@/lib/help/help-content";

export const metadata: Metadata = {
  title: "راهنما | تالار منیجر",
  description: "مرکز راهنمای استفاده از سامانه مدیریت تالار.",
};

type HelpPageProps = {
  searchParams?: Promise<{ category?: string }>;
};

const categoryIconMap: Record<string, LucideIcon> = {
  Sparkles,
  Users,
  ClipboardList,
  CalendarDays,
  Banknote,
  WalletCards,
  Utensils,
  Printer,
  BarChart3,
  BellRing,
  UserCircle,
  Headset,
};

export default async function HelpPage({ searchParams }: HelpPageProps) {
  await requireTenantMember();
  const params = (await searchParams) ?? {};
  const selectedCategory = helpCategories.find(
    (category) => category.id === params.category,
  );
  const quickStartArticles = [
    "create-contract",
    "connect-existing-customer",
    "create-contract-from-calendar",
    "create-receipt",
    "change-service-prices",
    "print-contract-preinvoice",
    "create-expense",
    "telegram-settings",
  ]
    .map((slug) => getHelpArticleBySlug(slug))
    .filter((article): article is HelpArticle => Boolean(article));
  const popularArticles = getPopularHelpArticles().slice(0, 10);

  return (
    <main className="space-y-6 sm:space-y-8">
      <section className="overflow-hidden rounded-[2.2rem] border border-[#e8c478]/32 bg-[radial-gradient(circle_at_top_left,rgba(240,219,169,0.30),transparent_34%),linear-gradient(145deg,rgba(23,32,51,0.98),rgba(9,14,23,0.98))] p-5 text-[#fff8ea] shadow-[0_28px_90px_rgba(17,24,39,0.26)] sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr] xl:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#e8c478]/28 bg-[#e8c478]/10 px-3 py-1 text-xs font-black text-[#f0dba9]">
              <BookOpen size={15} />
              مرکز آموزش تالار منیجر
            </p>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">مرکز راهنما</h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-8 text-[#d9caa9] sm:text-base">
              آموزش مرحله‌به‌مرحله استفاده از تالار منیجر؛ از ثبت اولین قرارداد تا مدیریت مالی، گزارش‌ها و پشتیبانی.
            </p>
          </div>
          <div className="rounded-[1.8rem] border border-[#e8c478]/24 bg-white/[0.075] p-4 backdrop-blur-xl sm:p-5">
            <p className="mb-3 text-lg font-black text-[#fff4d5]">
              دنبال چه چیزی می‌گردید؟
            </p>
            <HelpSearch
              categories={helpCategories}
              initialCategoryId={selectedCategory?.id}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="شروع سریع"
          description="مهم‌ترین آموزش‌هایی که معمولاً برای راه‌اندازی و کار روزانه لازم می‌شوند."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickStartArticles.map((article) => (
            <ArticleCard
              key={article.slug}
              articleSlug={article.slug}
              title={article.title}
              description={article.summary}
              icon={getCategoryIcon(article.categoryId)}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[1.8rem] border border-[#d8c08b]/62 bg-[#fff9ee]/88 p-5 shadow-[0_18px_60px_rgba(17,24,39,0.07)]">
          <SectionHeader
            title="سؤال‌های پرتکرار"
            description="پاسخ کوتاه را ببینید و برای توضیح کامل وارد مقاله شوید."
            compact
          />
          <div className="mt-4 space-y-2">
            {popularArticles.map((article) => (
              <details
                key={article.slug}
                className="group rounded-[1.25rem] border border-[#d8c08b]/56 bg-white/65 p-3 open:bg-[#fff4d8]/65"
              >
                <summary className="cursor-pointer list-none text-sm font-black text-[#172033]">
                  {article.title}
                </summary>
                <p className="mt-2 text-xs font-bold leading-6 text-[#6d5f49]">
                  {article.summary}
                </p>
                <Link
                  href={`/dashboard/help/${article.slug}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-[#17483f] transition hover:text-[#9f7131]"
                >
                  مشاهده آموزش کامل
                  <ArrowLeft size={14} />
                </Link>
              </details>
            ))}
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-[#d8c08b]/62 bg-[#fff9ee]/88 p-5 shadow-[0_18px_60px_rgba(17,24,39,0.07)]">
          <SectionHeader
            title="مسیر پیشنهادی یادگیری"
            description="اگر تازه شروع کرده‌اید، این ترتیب کمک می‌کند بدون سردرگمی پیش بروید."
            compact
          />
          <div className="mt-4 grid gap-2">
            {helpLearningPath.map((step, index) => {
              const article = getHelpArticleBySlug(step.articleSlug);

              return (
                <div
                  key={step.articleSlug}
                  className="grid gap-3 rounded-[1.25rem] border border-[#d8c08b]/54 bg-white/62 p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                >
                  <span className="grid size-9 place-items-center rounded-2xl bg-[#172033] text-xs font-black text-[#f0dba9]">
                    {toPersianDigits(index + 1)}
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-[#172033]">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">
                      {step.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {article ? (
                      <Link
                        href={`/dashboard/help/${article.slug}`}
                        className="rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea] px-3 py-2 text-xs font-black text-[#172033] transition hover:border-[#c7a15a]/70"
                      >
                        آموزش
                      </Link>
                    ) : null}
                    {step.action ? (
                      <Link
                        href={step.action.href}
                        className="rounded-2xl border border-[#17483f]/18 bg-[#17483f]/10 px-3 py-2 text-xs font-black text-[#17483f] transition hover:bg-[#17483f]/15"
                      >
                        {step.action.label}
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="دسته‌بندی آموزش‌ها"
          description="آموزش‌ها بر اساس جریان واقعی کار در تالار دسته‌بندی شده‌اند."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {helpCategories.map((category) => {
            const Icon = getCategoryIcon(category.id);
            const count = getHelpArticleCountByCategory(category.id);

            return (
              <Link
                key={category.id}
                href={`/dashboard/help?category=${category.id}`}
                className={`group rounded-[1.6rem] border p-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_56px_rgba(17,24,39,0.10)] ${
                  selectedCategory?.id === category.id
                    ? "border-[#c7a15a]/65 bg-[#fff4d8]"
                    : "border-[#d8c08b]/62 bg-[#fff9ee]/86"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl border border-[#c7a15a]/28 bg-white/72 text-[#9f7131]">
                    <Icon size={20} />
                  </span>
                  <span className="rounded-full border border-[#d8c08b]/58 bg-white/70 px-2.5 py-1 text-[11px] font-black text-[#7d6841]">
                    {toPersianDigits(count)} مقاله
                  </span>
                </div>
                <h3 className="mt-4 text-base font-black text-[#172033]">
                  {category.title}
                </h3>
                <p className="mt-2 min-h-14 text-sm font-bold leading-7 text-[#6d5f49]">
                  {category.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-[#17483f] transition group-hover:text-[#9f7131]">
                  مشاهده مقاله‌ها
                  <ArrowLeft size={14} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-[2rem] border border-[#e8c478]/30 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-5 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#e8c478]/25 bg-[#e8c478]/10 px-3 py-1 text-xs font-black text-[#f0dba9]">
              <Headset size={15} />
              ارتباط با پشتیبانی
            </p>
            <h2 className="mt-4 text-2xl font-black">هنوز پاسخ خود را پیدا نکردید؟</h2>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-8 text-[#d9caa9]">
              اگر با خطا یا سؤال خاصی روبه‌رو هستید، می‌توانید از بخش پشتیبانی برای تیم پشتیبانی پیام ارسال کنید.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/dashboard/support/new" className="btn-luxury-primary px-5 py-3">
              ثبت تیکت پشتیبانی
            </Link>
            <Link
              href="/dashboard/support"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#e8c478]/35 bg-white/[0.07] px-5 py-3 text-sm font-black text-[#fff8ea] transition hover:bg-white/[0.12]"
            >
              مشاهده پشتیبانی
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function SectionHeader({
  title,
  description,
  compact = false,
}: {
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[#172033]">
        <CheckCircle2 size={compact ? 17 : 20} className="text-[#9f7131]" />
        <h2 className={`${compact ? "text-lg" : "text-xl sm:text-2xl"} font-black`}>
          {title}
        </h2>
      </div>
      <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
        {description}
      </p>
    </div>
  );
}

function ArticleCard({
  articleSlug,
  title,
  description,
  icon: Icon,
}: {
  articleSlug: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={`/dashboard/help/${articleSlug}`}
      className="group rounded-[1.6rem] border border-[#d8c08b]/62 bg-[#fff9ee]/88 p-4 shadow-[0_14px_44px_rgba(17,24,39,0.055)] transition hover:-translate-y-0.5 hover:border-[#c7a15a]/70 hover:shadow-[0_20px_60px_rgba(17,24,39,0.10)]"
    >
      <span className="grid size-11 place-items-center rounded-2xl border border-[#c7a15a]/28 bg-[#fff4d8] text-[#9f7131]">
        <Icon size={20} />
      </span>
      <h3 className="mt-4 text-base font-black text-[#172033]">{title}</h3>
      <p className="mt-2 line-clamp-2 min-h-14 text-sm font-bold leading-7 text-[#6d5f49]">
        {description}
      </p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-[#17483f] transition group-hover:text-[#9f7131]">
        مشاهده آموزش
        <ArrowLeft size={14} />
      </span>
    </Link>
  );
}

function getCategoryIcon(categoryIdOrIcon: HelpCategory["id"] | string) {
  const category =
    helpCategories.find((item) => item.id === categoryIdOrIcon) ??
    helpCategories.find((item) => item.icon === categoryIdOrIcon);

  return categoryIconMap[category?.icon ?? "BookOpen"] ?? BookOpen;
}
