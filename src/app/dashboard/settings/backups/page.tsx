import {
  AlertTriangle,
  Archive,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  CreditCard,
  DatabaseBackup,
  Download,
  FileText,
  History,
  LockKeyhole,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  Users,
} from "lucide-react";
import Link from "next/link";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import {
  importLegacyBackupAction,
  restoreFullBackupJsonAction,
  reviewFullBackupJsonAction,
} from "@/lib/actions/legacy-backup-import-actions";
import {
  backupExportFormatLabels,
  backupExportStatusLabels,
  backupExportTypeLabels,
} from "@/lib/backups/export-service";
import { formatJalaliDateTime } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { getPrisma } from "@/lib/prisma";
import { SettingsPageShell } from "@/components/dashboard/settings/settings-page-shell";

const roleLabels = {
  OWNER: "مالک",
  ADMIN: "مدیر",
  STAFF: "کاربر",
} as const;

const exportCards = [
  {
    title: "خروجی قراردادها",
    description:
      "دریافت فهرست قراردادها، مشتری، تاریخ مراسم، مبلغ نهایی، دریافت‌شده و مانده.",
    format: "CSV",
    href: "/api/dashboard/exports/contracts",
    icon: FileText,
  },
  {
    title: "خروجی مشتریان",
    description:
      "دریافت اطلاعات مشتریان شامل نام، شماره همراه، کد ملی و سوابق کلی.",
    format: "CSV",
    href: "/api/dashboard/exports/customers",
    icon: Users,
  },
  {
    title: "خروجی دریافت‌ها",
    description:
      "دریافت دریافت‌ها، روش دریافت، تاریخ دریافت، مبلغ و وضعیت ثبت‌شده.",
    format: "CSV",
    href: "/api/dashboard/exports/payments",
    icon: CreditCard,
  },
  {
    title: "خروجی هزینه‌ها",
    description:
      "دریافت هزینه‌ها، دسته‌بندی مالی، تاریخ، مبلغ و قرارداد مرتبط.",
    format: "CSV",
    href: "/api/dashboard/exports/expenses",
    icon: ReceiptText,
  },
  {
    title: "خروجی گزارش مالی",
    description:
      "خلاصه مالی قابل استفاده برای حسابداری و مرور عملکرد مدیریتی تالار.",
    format: "CSV",
    href: "/api/dashboard/exports/financial",
    icon: BarChart3,
  },
] as const;

function StatusCard({
  title,
  value,
  detail,
  tone = "neutral",
}: {
  title: string;
  value: string;
  detail: string;
  tone?: "neutral" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]"
      : tone === "warning"
        ? "border-[#c7a15a]/32 bg-[#c7a15a]/12 text-[#7d6841]"
        : "border-[#111827]/12 bg-[#111827]/6 text-[#172033]";

  return (
    <article className="rounded-[1.5rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-4 shadow-[0_14px_44px_rgba(17,24,39,0.06)]">
      <p className="text-xs font-black text-[#7d6841]">{title}</p>
      <div
        className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-black ${toneClass}`}
      >
        {value}
      </div>
      <p className="mt-3 text-sm font-bold leading-7 text-[#6d5f49]">{detail}</p>
    </article>
  );
}



type BackupSearchParams = Record<string, string | string[] | undefined>;

function getSingleSearchParam(
  params: BackupSearchParams,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function getRestoreStatusCard(params: BackupSearchParams) {
  const restore = getSingleSearchParam(params, "restore");
  if (!restore) {
    return null;
  }

  if (restore === "failed") {
    return {
      title: "بازگردانی ناموفق بود",
      message:
        getSingleSearchParam(params, "message") ??
        "فایل بکاپ بررسی شد اما اطلاعات قابل بازگردانی نبود.",
      tone: "danger" as const,
    };
  }

  const imported = getSingleSearchParam(params, "imported") ?? "0";
  const customers = getSingleSearchParam(params, "customers") ?? "0";
  const payments = getSingleSearchParam(params, "payments") ?? "0";
  const skipped = getSingleSearchParam(params, "skipped") ?? "0";
  const duplicates = getSingleSearchParam(params, "duplicates") ?? "0";

  return {
    title: restore === "review" ? "بازگردانی انجام شد؛ چند ردیف نیازمند بررسی است" : "بازگردانی با موفقیت انجام شد",
    message: `قرارداد واردشده: ${formatPersianNumber(Number(imported))}، مشتری جدید: ${formatPersianNumber(Number(customers))}، دریافت مالی: ${formatPersianNumber(Number(payments))}، ردیف ردشده/تکراری: ${formatPersianNumber(Number(skipped))}، تکراری: ${formatPersianNumber(Number(duplicates))}.`,
    tone: restore === "review" ? "warning" as const : "success" as const,
  };
}


function getBackupReviewStatusCard(params: BackupSearchParams) {
  const review = getSingleSearchParam(params, "review");
  if (!review) {
    return null;
  }

  if (review === "failed") {
    return {
      title: "بازبینی فایل پشتیبان ناموفق بود",
      message:
        getSingleSearchParam(params, "message") ??
        "فایل انتخاب‌شده JSON معتبر یا قابل بازبینی نبود.",
      tone: "danger" as const,
      stats: [] as { label: string; value: string }[],
    };
  }

  const tenantName = getSingleSearchParam(params, "tenantName") ?? "ثبت نشده";
  const exportedAt = getSingleSearchParam(params, "exportedAt") ?? "ثبت نشده";
  const customers = Number(getSingleSearchParam(params, "customers") ?? "0");
  const contracts = Number(getSingleSearchParam(params, "contracts") ?? "0");
  const payments = Number(getSingleSearchParam(params, "payments") ?? "0");
  const expenses = Number(getSingleSearchParam(params, "expenses") ?? "0");
  const halls = Number(getSingleSearchParam(params, "halls") ?? "0");
  const salons = Number(getSingleSearchParam(params, "salons") ?? "0");
  const services = Number(getSingleSearchParam(params, "services") ?? "0");
  const menus = Number(getSingleSearchParam(params, "menus") ?? "0");
  const lineItems = Number(getSingleSearchParam(params, "lineItems") ?? "0");
  const reserved = Number(getSingleSearchParam(params, "reserved") ?? "0");
  const completed = Number(getSingleSearchParam(params, "completed") ?? "0");
  const canceled = Number(getSingleSearchParam(params, "canceled") ?? "0");
  const totalContracts = Number(getSingleSearchParam(params, "totalContracts") ?? "0");
  const totalPayments = Number(getSingleSearchParam(params, "totalPayments") ?? "0");
  const sameTenant = getSingleSearchParam(params, "sameTenant") === "yes";
  const warnings = Number(getSingleSearchParam(params, "warnings") ?? "0");

  return {
    title:
      review === "warning"
        ? "بازبینی انجام شد؛ نیازمند دقت قبل از بازیابی"
        : "بازبینی فایل پشتیبان کامل انجام شد",
    message: `فایل مربوط به «${tenantName}» با تاریخ خروجی ${exportedAt} بررسی شد.`,
    tone: review === "warning" ? "warning" as const : "success" as const,
    stats: [
      { label: "مشتری", value: formatPersianNumber(customers) },
      { label: "قرارداد", value: formatPersianNumber(contracts) },
      { label: "دریافت", value: formatPersianNumber(payments) },
      { label: "هزینه", value: formatPersianNumber(expenses) },
      { label: "تالار/سالن", value: `${formatPersianNumber(halls)} / ${formatPersianNumber(salons)}` },
      { label: "خدمات/منو", value: `${formatPersianNumber(services)} / ${formatPersianNumber(menus)}` },
      { label: "ردیف قرارداد", value: formatPersianNumber(lineItems) },
      { label: "رزرو/تکمیل/لغو", value: `${formatPersianNumber(reserved)} / ${formatPersianNumber(completed)} / ${formatPersianNumber(canceled)}` },
      { label: "جمع قراردادها", value: formatIRR(totalContracts) },
      { label: "جمع دریافت‌ها", value: formatIRR(totalPayments) },
      { label: "همان فضای کاری", value: sameTenant ? "بله" : "خیر" },
      { label: "هشدار", value: formatPersianNumber(warnings) },
    ],
  };
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-xs font-black text-[#17483f]">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black text-[#111827] sm:text-2xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export default async function BackupsSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<BackupSearchParams> | BackupSearchParams;
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const restoreStatusCard = getRestoreStatusCard(resolvedSearchParams);
  const backupReviewStatusCard = getBackupReviewStatusCard(resolvedSearchParams);
  const membership = await requireTenantPermission("backups.manage");
  const db = await getPrisma();

  const [
    latestExport,
    exportCount,
    history,
    contractCount,
    customerCount,
    paymentCount,
    expenseCount,
  ] = await Promise.all([
    db.backupExportLog.findFirst({
      where: { tenantId: membership.tenantId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    }),
    db.backupExportLog.count({ where: { tenantId: membership.tenantId } }),
    db.backupExportLog.findMany({
      where: { tenantId: membership.tenantId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.contract.count({ where: { tenantId: membership.tenantId } }),
    db.customer.count({ where: { tenantId: membership.tenantId } }),
    db.payment.count({ where: { tenantId: membership.tenantId } }),
    db.expense.count({ where: { tenantId: membership.tenantId } }),
  ]);

  const dataSummary = [
    `${formatPersianNumber(contractCount)} قرارداد`,
    `${formatPersianNumber(customerCount)} مشتری`,
    `${formatPersianNumber(paymentCount)} دریافت`,
    `${formatPersianNumber(expenseCount)} هزینه`,
  ].join("، ");

  return (
    <SettingsPageShell
      title="پشتیبان‌گیری و خروجی اطلاعات"
      subtitle="خروجی داده‌های مالی، قراردادها، مشتریان و اطلاعات عملیاتی تالار را مدیریت و برای نگهداری امن دریافت کنید."
      badge="حفظ اطلاعات"
      tenantName={membership.tenant.name}
      actions={
        <>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-3 text-sm font-black text-[#4a3514] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f4dfaa] hover:text-[#111827] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c7a15a]"
          >
            <ArrowRight size={17} />
            بازگشت به تنظیمات
          </Link>
          <Link
            href="/dashboard/reports"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#111827] bg-[#111827] px-4 py-3 text-sm font-black text-[#fff8ea] shadow-[0_18px_44px_rgba(17,24,39,0.18)] transition hover:-translate-y-0.5 hover:border-[#c7a15a] hover:bg-[#0f172a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c7a15a]"
          >
            <BarChart3 size={17} />
            مشاهده گزارش‌ها
          </Link>
        </>
      }
    >
      {restoreStatusCard ? (
        <section
          className={`rounded-[1.5rem] border p-4 text-sm font-black leading-7 shadow-[0_14px_44px_rgba(17,24,39,0.06)] ${
            restoreStatusCard.tone === "danger"
              ? "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]"
              : restoreStatusCard.tone === "warning"
                ? "border-[#c7a15a]/32 bg-[#fff7e6] text-[#7d6841]"
                : "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]"
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle size={19} className="mt-1 shrink-0" />
            <div>
              <p className="text-base font-black">{restoreStatusCard.title}</p>
              <p className="mt-1 font-bold">{restoreStatusCard.message}</p>
            </div>
          </div>
        </section>
      ) : null}

      {backupReviewStatusCard ? (
        <section
          className={`rounded-[1.5rem] border p-4 text-sm font-black leading-7 shadow-[0_14px_44px_rgba(17,24,39,0.06)] ${
            backupReviewStatusCard.tone === "danger"
              ? "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]"
              : backupReviewStatusCard.tone === "warning"
                ? "border-[#c7a15a]/32 bg-[#fff7e6] text-[#7d6841]"
                : "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]"
          }`}
        >
          <div className="flex items-start gap-3">
            <DatabaseBackup size={19} className="mt-1 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-base font-black">{backupReviewStatusCard.title}</p>
              <p className="mt-1 font-bold">{backupReviewStatusCard.message}</p>
              {backupReviewStatusCard.stats.length > 0 ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {backupReviewStatusCard.stats.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-current/15 bg-white/55 px-3 py-2"
                    >
                      <p className="text-[11px] font-black opacity-75">{item.label}</p>
                      <p className="mt-1 text-sm font-black">{item.value}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          title="آخرین خروجی"
          value={latestExport ? formatJalaliDateTime(latestExport.createdAt) : "هنوز انجام نشده"}
          detail="تاریخ آخرین خروجی موفق ثبت‌شده برای همین فضای کاری."
          tone={latestExport ? "success" : "warning"}
        />
        <StatusCard
          title="تعداد خروجی‌ها"
          value={exportCount > 0 ? formatPersianNumber(exportCount) : "نیازمند خروجی اولیه"}
          detail="هر دانلود عملیاتی در تاریخچه همین بخش ثبت می‌شود."
          tone={exportCount > 0 ? "success" : "warning"}
        />
        <StatusCard
          title="وضعیت بازیابی"
          value="کنترل‌شده"
          detail="بازیابی JSON فقط به‌صورت کنترل‌شده، افزایشی و با تأیید مالک/مدیر انجام می‌شود."
          tone="success"
        />
        <StatusCard
          title="سطح دسترسی"
          value={roleLabels[membership.role]}
          detail="دانلود خروجی‌ها فقط برای مالک و مدیر مجاز است."
          tone="neutral"
        />
      </section>

      <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle
            eyebrow="خروجی سریع"
            title="خروجی سریع اطلاعات"
            description="فایل‌های CSV با هدر فارسی، تاریخ شمسی و کدگذاری مناسب Excel تولید می‌شوند."
          />
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#c7a15a]/30 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#7d6841]">
            <Archive size={15} />
            {dataSummary}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {exportCards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.href}
                className="flex h-full flex-col rounded-[1.5rem] border border-[#d8c08b]/62 bg-white/62 p-4 shadow-[0_12px_36px_rgba(17,24,39,0.05)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#c7a15a]/35 bg-[#c7a15a]/10 text-[#17483f]">
                    <Icon size={20} />
                  </span>
                  <span className="rounded-full border border-[#111827]/12 bg-[#111827]/6 px-3 py-1 text-[11px] font-black text-[#172033]">
                    {card.format}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-black text-[#111827]">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
                  {card.description}
                </p>
                <a
                  href={card.href}
                  className="mt-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-[#111827] bg-[#111827] px-4 py-3 text-sm font-black text-[#fff8ea] shadow-[0_16px_38px_rgba(17,24,39,0.16)] transition hover:border-[#c7a15a] hover:bg-[#0f172a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c7a15a]"
                >
                  <Download size={17} />
                  دریافت CSV
                </a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[radial-gradient(circle_at_10%_0%,rgba(199,161,90,0.18),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.98),rgba(247,236,211,0.94))] p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[#c7a15a]/35 bg-[#c7a15a]/10 text-[#17483f]">
              <DatabaseBackup size={22} />
            </span>
            <SectionTitle
              eyebrow="نسخه کامل"
              title="نسخه پشتیبان کامل"
              description="یک فایل JSON شامل داده‌های اصلی فضای کاری تالار برای نگهداری امن دریافت کنید."
            />
          </div>
          <div className="mt-5 grid gap-2 text-sm font-bold leading-7 text-[#5f543f] sm:grid-cols-2">
            {[
              "اطلاعات تالار",
              "مشتریان و قراردادها",
              "دریافت‌ها و هزینه‌ها",
              "تعاریف پایه",
              "روش‌های دریافت",
              "قالب پیام‌ها",
              "تنظیمات اعلان‌ها بدون کلید محرمانه",
              "تنظیمات قرارداد",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#17483f]" />
                {item}
              </div>
            ))}
          </div>
          <a
            href="/api/dashboard/exports/full"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#111827] bg-[#111827] px-4 py-3 text-sm font-black text-[#fff8ea] shadow-[0_18px_44px_rgba(17,24,39,0.18)] transition hover:-translate-y-0.5 hover:border-[#c7a15a] hover:bg-[#0f172a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c7a15a] sm:w-auto"
          >
            <Download size={17} />
            دریافت نسخه پشتیبان کامل
          </a>
        </article>

        <article className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[#c7a15a]/35 bg-[#c7a15a]/10 text-[#17483f]">
              <RotateCcw size={22} />
            </span>
            <SectionTitle
              eyebrow="بازیابی"
              title="بازیابی اطلاعات"
              description="بازیابی اطلاعات فرآیندی حساس است و برای جلوگیری از حذف یا جایگزینی ناخواسته داده‌ها، به‌صورت کنترل‌شده انجام می‌شود."
            />
          </div>
          <div className="mt-5 rounded-[1.5rem] border border-[#c7a15a]/28 bg-[#fff7e6] p-4 text-sm font-bold leading-7 text-[#6d5f49]">
            این بخش دیتابیس فعلی را جایگزین نمی‌کند؛ فقط بکاپ SQLite نرم‌افزار
            قدیمی را می‌خواند و مراسم‌ها را به مشتری، قرارداد، ردیف قرارداد و
            دریافت مالی در سامانه جدید تبدیل می‌کند. قراردادهای تکراری با شماره
            قدیمی مثل OLD-100 دوباره وارد نمی‌شوند.
          </div>

          <div className="mt-4 rounded-[1.5rem] border border-[#17483f]/18 bg-[#f3fbf7] p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-[#17483f]/20 bg-[#17483f]/10 text-[#17483f]">
                <DatabaseBackup size={19} />
              </span>
              <div>
                <h3 className="text-base font-black text-[#17483f]">
                  بازبینی دیتابیس جدید از فایل JSON پشتیبان کامل
                </h3>
                <p className="mt-2 text-sm font-bold leading-7 text-[#5f543f]">
                  این باکس فایل JSON خروجی «نسخه پشتیبان کامل» را بدون جایگزینی دیتابیس
                  می‌خواند و تعداد مشتری، قرارداد، دریافت، هزینه، تعاریف پایه و جمع
                  مبالغ را برای تصمیم‌گیری قبل از بازیابی نشان می‌دهد.
                </p>
              </div>
            </div>

            <form action={reviewFullBackupJsonAction} className="mt-4 grid gap-3">
              <label className="grid cursor-pointer gap-2 rounded-[1.5rem] border border-dashed border-[#17483f]/35 bg-white/68 p-4 text-sm font-bold leading-7 text-[#5f543f] transition hover:bg-[#ecf8f1]">
                <span className="inline-flex items-center gap-2 text-[#17483f]">
                  <UploadCloud size={18} />
                  انتخاب فایل JSON نسخه پشتیبان کامل برای بازبینی
                </span>
                <input
                  name="fullBackupReviewFile"
                  type="file"
                  accept=".json,application/json"
                  required
                  className="block w-full rounded-2xl border border-[#d8c08b]/62 bg-[#fff9ee] px-3 py-2 text-xs font-bold text-[#4a3514] file:ml-3 file:rounded-xl file:border-0 file:bg-[#17483f] file:px-3 file:py-2 file:text-xs file:font-black file:text-[#fff8ea]"
                />
                <span className="text-xs font-bold text-[#7d6841]">
                  بازبینی فقط خواندنی است و هیچ داده‌ای را حذف، جایگزین یا وارد دیتابیس نمی‌کند.
                </span>
              </label>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#17483f] bg-[#17483f] px-4 py-3 text-sm font-black text-[#fff8ea] shadow-[0_18px_44px_rgba(23,72,63,0.18)] transition hover:-translate-y-0.5 hover:border-[#c7a15a] hover:bg-[#12382f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17483f] sm:w-auto"
              >
                <DatabaseBackup size={17} />
                بازبینی فایل JSON
              </button>
            </form>

            <form action={restoreFullBackupJsonAction} className="mt-4 grid gap-3 rounded-[1.5rem] border border-[#b45353]/18 bg-[#fff1f1] p-4">
              <div className="flex items-start gap-3 text-sm font-bold leading-7 text-[#8f2c2c]">
                <AlertTriangle size={18} className="mt-1 shrink-0" />
                <p>
                  این دکمه اطلاعات JSON را به‌صورت کنترل‌شده وارد دیتابیس فعلی می‌کند. قبل از اجرا، یک نسخه پشتیبان کامل جدید از همین صفحه دریافت و نگهداری کنید.
                </p>
              </div>
              <label className="grid cursor-pointer gap-2 rounded-[1.5rem] border border-dashed border-[#b45353]/35 bg-white/70 p-4 text-sm font-bold leading-7 text-[#5f543f] transition hover:bg-[#fff7e6]">
                <span className="inline-flex items-center gap-2 text-[#8f2c2c]">
                  <UploadCloud size={18} />
                  انتخاب همان فایل JSON برای بازیابی واقعی کنترل‌شده
                </span>
                <input
                  name="fullBackupRestoreFile"
                  type="file"
                  accept=".json,application/json"
                  required
                  className="block w-full rounded-2xl border border-[#d8c08b]/62 bg-[#fff9ee] px-3 py-2 text-xs font-bold text-[#4a3514] file:ml-3 file:rounded-xl file:border-0 file:bg-[#8f2c2c] file:px-3 file:py-2 file:text-xs file:font-black file:text-white"
                />
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-[#b45353]/20 bg-white/70 p-3 text-xs font-black leading-6 text-[#8f2c2c]">
                <input
                  name="confirmFullBackupRestore"
                  type="checkbox"
                  value="RESTORE_FULL_BACKUP_JSON"
                  required
                  className="mt-1 size-4 rounded border-[#b45353] accent-[#8f2c2c]"
                />
                تأیید می‌کنم که فایل بازبینی شده است، از اطلاعات فعلی خروجی کامل گرفته‌ام، و می‌خواهم بازیابی JSON به دیتابیس فعلی اعمال شود.
              </label>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#8f2c2c] bg-[#8f2c2c] px-4 py-3 text-sm font-black text-white shadow-[0_18px_44px_rgba(143,44,44,0.18)] transition hover:-translate-y-0.5 hover:border-[#c7a15a] hover:bg-[#6f2323] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f2c2c] sm:w-auto"
              >
                <RotateCcw size={17} />
                شروع بازیابی کنترل‌شده JSON
              </button>
            </form>
          </div>

          <form action={importLegacyBackupAction} className="mt-4 grid gap-3">
            <label className="grid cursor-pointer gap-2 rounded-[1.5rem] border border-dashed border-[#c7a15a]/65 bg-white/62 p-4 text-sm font-bold leading-7 text-[#5f543f] transition hover:bg-[#fff7e6]">
              <span className="inline-flex items-center gap-2 text-[#17483f]">
                <UploadCloud size={18} />
                انتخاب فایل بکاپ قدیمی SQLite
              </span>
              <input
                name="legacyBackupFile"
                type="file"
                accept=".db,.sqlite,.sqlite3,application/octet-stream"
                required
                className="block w-full rounded-2xl border border-[#d8c08b]/62 bg-[#fff9ee] px-3 py-2 text-xs font-bold text-[#4a3514] file:ml-3 file:rounded-xl file:border-0 file:bg-[#111827] file:px-3 file:py-2 file:text-xs file:font-black file:text-[#fff8ea]"
              />
              <span className="text-xs font-bold text-[#7d6841]">
                حداکثر حجم مجاز ۲۵ مگابایت است. فقط مالک و مدیر می‌توانند ایمپورت کنند.
              </span>
            </label>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#111827] bg-[#111827] px-4 py-3 text-sm font-black text-[#fff8ea] shadow-[0_18px_44px_rgba(17,24,39,0.18)] transition hover:-translate-y-0.5 hover:border-[#c7a15a] hover:bg-[#0f172a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c7a15a] sm:w-auto"
            >
              <RotateCcw size={17} />
              بازگردانی بکاپ قدیمی
            </button>
          </form>

          <Link
            href="/dashboard/settings/activity"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-3 text-sm font-black text-[#4a3514] transition hover:bg-[#f4dfaa] hover:text-[#111827] sm:w-auto"
          >
            <History size={17} />
            مشاهده لاگ عملیات
          </Link>
        </article>
      </section>

      <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionTitle
            eyebrow="تاریخچه"
            title="تاریخچه خروجی‌ها و نسخه‌های پشتیبان"
            description="آخرین خروجی‌های همین فضای کاری، بدون نمایش اطلاعات محرمانه یا فایل‌های دیگر تالارها."
          />
          <Link
            href="/dashboard/settings/notification-logs"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-2.5 text-sm font-black text-[#4a3514] transition hover:bg-[#f4dfaa] hover:text-[#111827]"
          >
            <Clock3 size={16} />
            لاگ اعلان‌ها
          </Link>
        </div>

        {history.length > 0 ? (
          <div className="mt-5 grid gap-3">
            {history.map((log) => (
              <article
                key={log.id}
                className="grid gap-3 rounded-[1.5rem] border border-[#d8c08b]/52 bg-white/62 p-4 text-sm font-bold text-[#111827] md:grid-cols-[1.1fr_0.7fr_0.7fr_0.8fr_1fr]"
              >
                <div>
                  <p className="text-xs font-black text-[#7d6841]">نوع خروجی</p>
                  <p className="mt-1 font-black">
                    {backupExportTypeLabels[log.type] ?? "خروجی اطلاعات"}
                  </p>
                  <p className="mt-1 break-all text-xs leading-6 text-[#6d5f49]">
                    {log.fileName ?? "نام فایل ثبت نشده"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black text-[#7d6841]">فرمت</p>
                  <p className="mt-1">
                    {backupExportFormatLabels[log.format] ?? log.format}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black text-[#7d6841]">وضعیت</p>
                  <p className="mt-1">
                    {backupExportStatusLabels[log.status] ?? "ثبت‌شده"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black text-[#7d6841]">تعداد رکورد</p>
                  <p className="mt-1">
                    {log.recordCount === null || log.recordCount === undefined
                      ? "ثبت نشده"
                      : formatPersianNumber(log.recordCount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black text-[#7d6841]">درخواست‌کننده</p>
                  <p className="mt-1">کاربر مجاز سامانه</p>
                  <p className="mt-1 text-xs leading-6 text-[#6d5f49]">
                    {formatJalaliDateTime(log.createdAt)}
                  </p>
                </div>
                {log.errorMessage ? (
                  <p className="md:col-span-5 rounded-2xl border border-[#b45353]/20 bg-[#fff1f1] px-3 py-2 text-xs font-bold text-[#8f2c2c]">
                    {log.errorMessage}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[1.5rem] border border-dashed border-[#d8b76a]/70 bg-[#fff7e6]/72 p-5 text-sm font-bold leading-7 text-[#6d5f49]">
            هنوز خروجی یا نسخه پشتیبان ثبت نشده است. پس از دریافت اولین خروجی،
            تاریخچه در این بخش نمایش داده می‌شود.
          </div>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
        <SectionTitle
          eyebrow="استاندارد نگهداری"
          title="پیشنهادهای نگهداری امن اطلاعات"
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            "حداقل هفته‌ای یک‌بار خروجی کامل دریافت کنید.",
            "فایل پشتیبان را در فضای امن و خارج از سیستم نگهداری کنید.",
            "خروجی‌ها را در اختیار افراد غیرمجاز قرار ندهید.",
            "قبل از تغییرات مهم، یک نسخه پشتیبان تهیه کنید.",
            "کلیدهای محرمانه تلگرام و پیامک در خروجی کامل نمایش داده نمی‌شوند.",
          ].map((item) => (
            <div
              key={item}
              className="flex items-start gap-3 rounded-[1.25rem] border border-[#d8c08b]/42 bg-white/62 p-3 text-sm font-bold leading-7 text-[#5f543f]"
            >
              <ShieldCheck size={18} className="mt-1 shrink-0 text-[#17483f]" />
              {item}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-[1.5rem] border border-[#c7a15a]/28 bg-[#c7a15a]/10 p-4 text-sm font-bold leading-7 text-[#6d5f49]">
          <LockKeyhole size={19} className="mt-1 shrink-0 text-[#17483f]" />
          خروجی کامل شامل رمز عبور، نشست‌ها، توکن‌ها، کلید خام تلگرام یا کلید
          خام پیامک نیست و فقط وضعیت اتصال و مقدار ماسک‌شده تنظیمات حساس را
          ثبت می‌کند.
        </div>
      </section>
    </SettingsPageShell>
  );
}
