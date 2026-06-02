import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Headset,
  Link2,
  ListChecks,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenantMember } from "@/lib/auth/session";
import { toPersianDigits } from "@/lib/date/jalali";
import {
  getHelpArticleBySlug,
  getHelpCategoryById,
  getRelatedHelpArticles,
} from "@/lib/help/help-content";

type HelpArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: HelpArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getHelpArticleBySlug(slug);

  if (!article) {
    return {
      title: "راهنما | تالار منیجر",
      description: "مرکز راهنمای استفاده از سامانه مدیریت تالار.",
    };
  }

  return {
    title: `${article.title} | راهنما`,
    description: article.summary,
  };
}

export default async function HelpArticlePage({ params }: HelpArticlePageProps) {
  await requireTenantMember();
  const { slug } = await params;
  const article = getHelpArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const category = getHelpCategoryById(article.categoryId);
  const relatedArticles = getRelatedHelpArticles(article);

  return (
    <main className="space-y-5 sm:space-y-7">
      <nav className="flex flex-wrap items-center gap-2 text-xs font-black text-[#7d6841]">
        <Link href="/dashboard/help" className="transition hover:text-[#172033]">
          راهنما
        </Link>
        <span className="text-[#c7a15a]">/</span>
        <Link
          href={`/dashboard/help?category=${category?.id ?? article.categoryId}`}
          className="transition hover:text-[#172033]"
        >
          {category?.title}
        </Link>
        <span className="text-[#c7a15a]">/</span>
        <span className="text-[#172033]">{article.title}</span>
      </nav>

      <section className="overflow-hidden rounded-[2.2rem] border border-[#e8c478]/32 bg-[radial-gradient(circle_at_top_left,rgba(240,219,169,0.30),transparent_34%),linear-gradient(145deg,rgba(23,32,51,0.98),rgba(9,14,23,0.98))] p-5 text-[#fff8ea] shadow-[0_28px_90px_rgba(17,24,39,0.26)] sm:p-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-black">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e8c478]/28 bg-[#e8c478]/10 px-3 py-1 text-[#f0dba9]">
                <BookOpen size={15} />
                {category?.title}
              </span>
              <span className="rounded-full border border-white/[0.10] bg-white/[0.06] px-3 py-1 text-[#d9caa9]">
                {toPersianDigits(article.readMinutes)} دقیقه مطالعه
              </span>
            </div>
            <h1 className="mt-4 max-w-4xl text-3xl font-black leading-tight sm:text-4xl">
              {article.title}
            </h1>
            <p className="mt-4 max-w-4xl text-sm font-bold leading-8 text-[#d9caa9] sm:text-base">
              {article.summary}
            </p>
          </div>
          <Link
            href="/dashboard/help"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#e8c478]/35 bg-white/[0.07] px-5 py-3 text-sm font-black text-[#fff8ea] transition hover:bg-white/[0.12]"
          >
            بازگشت به مرکز راهنما
            <ArrowLeft size={17} />
          </Link>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
        <article className="space-y-5">
          <ArticleSection
            id="usage"
            icon={Sparkles}
            title="چه زمانی از این بخش استفاده کنیم؟"
          >
            <ul className="grid gap-2">
              {article.whenToUse.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-[#d8c08b]/50 bg-white/62 p-3 text-sm font-bold leading-7 text-[#6d5f49]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </ArticleSection>

          <ArticleSection id="steps" icon={ListChecks} title="مراحل انجام کار">
            <ol className="grid gap-3">
              {article.steps.map((step, index) => (
                <li
                  key={step}
                  className="grid gap-3 rounded-[1.25rem] border border-[#d8c08b]/56 bg-white/65 p-3 sm:grid-cols-[auto_1fr] sm:items-start"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-[#172033] text-xs font-black text-[#f0dba9]">
                    {toPersianDigits(index + 1)}
                  </span>
                  <span className="text-sm font-bold leading-8 text-[#172033]">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </ArticleSection>

          {article.notes?.length ? (
            <ArticleSection id="notes" icon={CheckCircle2} title="نکته‌های مهم">
              <ul className="grid gap-2">
                {article.notes.map((note) => (
                  <li
                    key={note}
                    className="rounded-2xl border border-[#17483f]/16 bg-[#eaf7ef]/80 p-3 text-sm font-bold leading-7 text-[#17483f]"
                  >
                    {note}
                  </li>
                ))}
              </ul>
            </ArticleSection>
          ) : null}

          {article.commonIssues?.length ? (
            <ArticleSection id="issues" icon={CircleAlert} title="خطاهای رایج">
              <div className="grid gap-3">
                {article.commonIssues.map((issue) => (
                  <div
                    key={issue.title}
                    className="rounded-[1.25rem] border border-[#d8a25f]/35 bg-[#fff4d8]/78 p-4"
                  >
                    <h3 className="text-sm font-black text-[#7d4a1f]">
                      {issue.title}
                    </h3>
                    <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
                      {issue.solution}
                    </p>
                  </div>
                ))}
              </div>
            </ArticleSection>
          ) : null}

          <ArticleSection id="related" icon={Link2} title="آموزش‌های مرتبط">
            <div className="grid gap-3 md:grid-cols-2">
              {relatedArticles.map((related) => (
                <Link
                  key={related.slug}
                  href={`/dashboard/help/${related.slug}`}
                  className="rounded-[1.25rem] border border-[#d8c08b]/56 bg-white/65 p-4 transition hover:border-[#c7a15a]/70 hover:bg-[#fff4d8]/65"
                >
                  <h3 className="text-sm font-black text-[#172033]">
                    {related.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-xs font-bold leading-6 text-[#6d5f49]">
                    {related.summary}
                  </p>
                </Link>
              ))}
            </div>
          </ArticleSection>

          {article.relatedActions?.length ? (
            <ArticleSection id="actions" icon={ArrowLeft} title="اقدام‌های مرتبط در سامانه">
              <div className="flex flex-wrap gap-2">
                {article.relatedActions.map((action) => (
                  <Link
                    key={`${action.href}-${action.label}`}
                    href={action.href}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#d8c08b]/64 bg-[#fff8ea]/82 px-4 py-2 text-sm font-black text-[#172033] transition hover:border-[#c7a15a]/70 hover:bg-[#fff4d8]"
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            </ArticleSection>
          ) : null}
        </article>

        <aside className="space-y-3 xl:sticky xl:top-28">
          <div className="rounded-[1.6rem] border border-[#d8c08b]/62 bg-[#fff9ee]/88 p-4 shadow-[0_18px_60px_rgba(17,24,39,0.07)]">
            <p className="text-xs font-black text-[#9f7131]">فهرست مقاله</p>
            <div className="mt-3 grid gap-2 text-sm font-black">
              <a href="#usage" className="text-[#172033] transition hover:text-[#9f7131]">
                چه زمانی استفاده کنیم؟
              </a>
              <a href="#steps" className="text-[#172033] transition hover:text-[#9f7131]">
                مراحل انجام کار
              </a>
              {article.notes?.length ? (
                <a href="#notes" className="text-[#172033] transition hover:text-[#9f7131]">
                  نکته‌های مهم
                </a>
              ) : null}
              {article.commonIssues?.length ? (
                <a href="#issues" className="text-[#172033] transition hover:text-[#9f7131]">
                  خطاهای رایج
                </a>
              ) : null}
              <a href="#related" className="text-[#172033] transition hover:text-[#9f7131]">
                آموزش‌های مرتبط
              </a>
              {article.relatedActions?.length ? (
                <a href="#actions" className="text-[#172033] transition hover:text-[#9f7131]">
                  اقدام‌های مرتبط
                </a>
              ) : null}
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_20px_70px_rgba(17,24,39,0.20)]">
            <Headset className="text-[#f0dba9]" size={22} />
            <h2 className="mt-3 text-lg font-black">هنوز مشکل دارید؟</h2>
            <p className="mt-2 text-xs font-bold leading-6 text-[#d9caa9]">
              اگر این آموزش کافی نبود، مشکل را با جزئیات برای پشتیبانی ارسال کنید.
            </p>
            <Link
              href="/dashboard/support/new"
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-[#f0dba9] px-4 py-2 text-sm font-black text-[#172033] transition hover:bg-[#fff4d5]"
            >
              ثبت تیکت پشتیبانی
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}

function ArticleSection({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-[1.8rem] border border-[#d8c08b]/62 bg-[#fff9ee]/88 p-4 shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:p-5"
    >
      <div className="mb-4 flex items-center gap-2 text-[#172033]">
        <span className="grid size-10 place-items-center rounded-2xl border border-[#c7a15a]/30 bg-[#fff4d8] text-[#9f7131]">
          <Icon size={18} />
        </span>
        <h2 className="text-lg font-black">{title}</h2>
      </div>
      {children}
    </section>
  );
}
