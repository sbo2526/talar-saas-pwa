import {
  CalendarClock,
  ClipboardList,
  Link2,
  MessageSquareText,
  Music2,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDate, toPersianDigits } from "@/lib/date/jalali";
import { formatPersianNumber } from "@/lib/formatters";
import { getCrmDashboardData, resolveLinkRuntimeStatus } from "@/lib/crm/data";
import { crmLinkKindLabels } from "@/lib/crm/labels";

type CrmPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function CrmDashboardPage({ searchParams }: CrmPageProps) {
  const membership = await requireTenantMember();
  const query = await searchParams;
  const data = (await getCrmDashboardData(membership.tenantId)) as any;

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-[#d8c08b]/60 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.13),transparent_15rem),linear-gradient(145deg,rgba(255,249,238,0.98),rgba(249,240,219,0.95))] p-4 shadow-[0_14px_44px_rgba(17,24,39,0.065)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/36 bg-[#fff4d8]/90 px-3 py-1 text-xs font-black text-[#7d6841]">
              <MessageSquareText size={14} />
              باشگاه و مهمانان
            </div>
            <h1 className="mt-2 text-[1.45rem] font-black leading-tight tracking-[-0.03em] text-[#111827] sm:text-3xl">
              باشگاه مشتریان و لینک مهمانان
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[#6d5f49]">
              این بخش ارتباطات مهمانان و مشتریان تالار را از لینک امن صاحب قرارداد تا
              لینک مهمان، نظرخواهی، عضویت باشگاه، پروفایل عروس‌داماد و درخواست
              آهنگ مدیریت می‌کند.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 rounded-[1.15rem] border border-[#d8c08b]/55 bg-white/55 p-2.5 shadow-[0_10px_28px_rgba(17,24,39,0.045)] sm:flex-row sm:items-center">
            <Link
              href="/dashboard/contracts"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 py-2 text-sm font-black text-white shadow-[0_10px_24px_rgba(17,24,39,0.12)] transition hover:bg-[#1f2937]"
            >
              <ClipboardList size={16} />
              انتخاب قرارداد برای ساخت لینک
            </Link>
          </div>
        </div>
      </div>

      {query.error ? (
        <div className="rounded-2xl border border-[#b42318]/25 bg-[#fef3f2] p-4 text-sm font-black text-[#7a271a]">
          درخواست باشگاه و مهمانان معتبر نبود یا قرارداد پیدا نشد.
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <CrmStat
          icon={ClipboardList}
          label="قراردادها"
          value={data.contractsCount}
        />
        <CrmStat icon={Link2} label="لینک فعال" value={data.activeLinks} />
        <CrmStat
          icon={MessageSquareText}
          label="نظرها"
          value={data.feedbacksCount}
        />
        <CrmStat
          icon={UsersRound}
          label="اعضای باشگاه"
          value={data.clubMembersCount}
        />
        <CrmStat
          icon={Music2}
          label="آهنگ‌های در صف"
          value={data.musicPendingCount}
        />
        <CrmStat
          icon={CalendarClock}
          label="یادآور فعال"
          value={data.upcomingRemindersCount}
        />
      </div>

      <div className="rounded-[1.35rem] border border-[#d8c08b]/60 bg-[#fff9ee]/96 p-3.5 shadow-[0_12px_40px_rgba(17,24,39,0.055)] sm:p-4">
        <div className="flex flex-col gap-2 rounded-2xl border border-[#ead6a6]/72 bg-white/55 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#a07a35]">
              باشگاه و مهمانان
            </p>
            <h2 className="mt-1 text-base font-black text-[#111827] sm:text-lg">
              قراردادهای اخیر برای اجرای فرایندها
            </h2>
            <p className="mt-1 text-xs font-bold leading-5 text-[#7d6841]">
              برای هر قرارداد می‌توان لینک صاحب قرارداد و لینک مهمان ساخت و
              وضعیت باشگاه و مهمانان همان قرارداد را دید.
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-2.5">
          {data.latestContracts.length ? (
            data.latestContracts.map((contract: any) => {
              const activeLinkCount = contract.accessLinks.filter(
                (link: any) => resolveLinkRuntimeStatus(link) === "ACTIVE",
              ).length;
              const lastLink = contract.accessLinks[0];
              return (
                <article
                  key={contract.id}
                  className="grid gap-3 rounded-[1.15rem] border border-[#ead6a6]/80 bg-white/82 p-3 shadow-[0_8px_24px_rgba(17,24,39,0.035)] lg:grid-cols-[minmax(0,1.25fr)_minmax(220px,0.62fr)_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-black text-[#7d6841]">
                      <span className="inline-flex items-center rounded-full border border-[#d8c08b]/70 bg-[#fff8ea] px-2.5 py-1">
                        قرارداد {toPersianDigits(contract.contractNo)}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-[#f6ead0] px-2.5 py-1">
                        {formatJalaliDate(contract.eventDate)}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-[#f8f3e7] px-2.5 py-1">
                        {contract.eventTypeName ?? "نوع مراسم ثبت نشده"}
                      </span>
                      {lastLink ? (
                        <span className="inline-flex items-center rounded-full bg-[#eef7ed] px-2.5 py-1 text-[#2f6b3b]">
                          آخرین لینک:{" "}
                          {crmLinkKindLabels[lastLink.kind] ?? lastLink.kind}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-2 truncate text-base font-black text-[#111827]">
                      {contract.customer.fullName}
                    </h3>
                    <p className="mt-1 truncate text-xs font-bold text-[#6d5f49]">
                      {contract.hall?.name ?? "تالار نامشخص"} ·{" "}
                      {contract.salon?.name ?? "سالن نامشخص"}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-[#ead6a6]/60 bg-[#fff9ee]/75 p-2 text-center lg:text-right">
                    <CrmRecordMetric
                      label="لینک فعال"
                      value={activeLinkCount}
                    />
                    <CrmRecordMetric
                      label="نظر"
                      value={contract.feedbacks.length}
                    />
                    <CrmRecordMetric
                      label="آهنگ"
                      value={
                        contract.weddingProfile?.musicRequests?.length ?? 0
                      }
                    />
                  </div>

                  <Link
                    href={`/dashboard/crm/contracts/${contract.id}`}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#c7a15a]/55 bg-[#fff4d8] px-3.5 py-2 text-sm font-black text-[#4a3514] transition hover:bg-[#f7e2ad] lg:min-w-[156px]"
                  >
                    <MessageSquareText size={15} />
                    مدیریت باشگاه و مهمانان
                  </Link>
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-[#d8c08b]/70 bg-white/55 p-6 text-center text-sm font-bold text-[#7d6841]">
              هنوز قراردادی برای نمایش وجود ندارد.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CrmStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ClipboardList;
  label: string;
  value: number;
}) {
  return (
    <article className="min-h-[76px] rounded-2xl border border-[#d8c08b]/58 bg-[#fff9ee]/96 p-3 shadow-[0_8px_22px_rgba(17,24,39,0.035)]">
      <div className="flex h-full min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1 text-right">
          <p className="truncate text-[11px] font-black leading-5 text-[#7d6841]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-black leading-none tracking-[-0.04em] text-[#111827]">
            {toPersianDigits(formatPersianNumber(value))}
          </p>
        </div>
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-[#d8c08b]/62 bg-[#fff4d8] text-[#7d6841]">
          <Icon size={15} />
        </span>
      </div>
    </article>
  );
}

function CrmRecordMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/70 px-2 py-1.5">
      <p className="text-[10px] font-black text-[#8c7551]">{label}</p>
      <p className="mt-0.5 text-sm font-black text-[#111827]">
        {toPersianDigits(formatPersianNumber(value))}
      </p>
    </div>
  );
}
