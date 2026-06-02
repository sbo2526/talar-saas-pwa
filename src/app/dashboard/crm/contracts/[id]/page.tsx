import type { ReactNode } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Link2, MessageSquareText, Music2, ShieldCheck, UsersRound, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createContractPortalLinkAction, revokeContractPortalLinkAction, updateWeddingMusicRequestStatusAction } from "@/lib/actions/crm-actions";
import { requireTenantMember } from "@/lib/auth/session";
import { getCrmContractData, resolveLinkRuntimeStatus } from "@/lib/crm/data";
import { crmFeedbackAudienceLabels, crmLinkKindLabels, getCrmStatusPill, musicRequesterLabels, musicStatusLabels } from "@/lib/crm/labels";
import { formatJalaliDate, formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";

type CrmContractPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ createdKind?: string; createdToken?: string; revoked?: string; music?: string; error?: string }>;
};

export default async function CrmContractPage({ params, searchParams }: CrmContractPageProps) {
  const membership = await requireTenantMember();
  const { id } = await params;
  const query = await searchParams;
  const contract = await getCrmContractData(membership.tenantId, id) as any;
  if (!contract) notFound();
  const createdPath = query.createdKind === "GUEST_LOCATION" ? `/g/${query.createdToken}` : `/portal/contracts/${query.createdToken}`;

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-[1.35rem] border border-[#d8c08b]/60 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.14),transparent_15rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 shadow-[0_14px_44px_rgba(17,24,39,0.07)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 max-w-4xl">
            <Link href="/dashboard/crm" className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/70 bg-white/75 px-3 py-1.5 text-xs font-black text-[#7d6841]"><ArrowRight size={14} />بازگشت به باشگاه و مهمانان</Link>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black text-[#7d6841]">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/35 bg-[#fff4d8]/90 px-3 py-1"><CalendarDays size={13} />{formatJalaliDate(contract.eventDate)}</span>
              <span className="rounded-full border border-[#d8c08b]/65 bg-white/70 px-3 py-1">{contract.eventTypeName ?? "نوع مراسم ثبت نشده"}</span>
              <span className="rounded-full border border-[#d8c08b]/65 bg-white/70 px-3 py-1">{contract.hall?.name ?? "تالار نامشخص"}</span>
            </div>
            <h1 className="mt-3 text-2xl font-black leading-tight text-[#111827] sm:text-[1.75rem]">باشگاه و مهمانان قرارداد {toPersianDigits(contract.contractNo)}</h1>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49]">
              این صفحه مرکز کنترل ارتباطات همین مراسم است؛ از اینجا لینک مهمانان، دسترسی صاحب قرارداد، نظرها، باشگاه مشتریان و درخواست‌های آهنگ را مدیریت می‌کنید.
            </p>
            <p className="mt-2 text-xs font-black text-[#7d6841]">صاحب قرارداد: {contract.customer.fullName}</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 rounded-2xl border border-[#ead6a6]/80 bg-white/65 p-3 sm:flex-row sm:items-center lg:flex-col xl:flex-row">
            <Link href={`/dashboard/contracts/${contract.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#c7a15a]/55 bg-[#fff4d8] px-4 text-sm font-black text-[#4a3514]"><ArrowRight size={15} />باز کردن قرارداد اصلی</Link>
            <span className="text-xs font-bold leading-6 text-[#7d6841] sm:max-w-[15rem]">برای دیدن جزئیات مالی و اجرایی قرارداد اصلی استفاده شود.</span>
          </div>
        </div>
      </div>

      {query.createdToken ? (
        <div className="rounded-[1.25rem] border border-[#25a46d]/24 bg-[#ecfdf3] p-4 text-[#17483f] shadow-[0_10px_32px_rgba(37,164,109,0.08)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-2xl bg-[#25a46d]/12 text-[#147457]"><Link2 size={17} /></span>
              <div>
                <p className="text-sm font-black">لینک جدید ساخته شد</p>
                <p className="mt-1 text-xs font-bold leading-6">این مسیر فقط همین بار کامل نمایش داده می‌شود. آن را برای همان فرد مجاز کپی کنید و عمومی منتشر نکنید.</p>
              </div>
            </div>
            <code className="block max-w-full overflow-x-auto rounded-2xl border border-[#25a46d]/18 bg-white/82 px-3 py-2 text-left text-sm font-bold direction-ltr lg:min-w-[18rem]">{createdPath}</code>
          </div>
        </div>
      ) : null}
      {query.revoked ? <Notice tone="success">لینک انتخاب‌شده لغو شد.</Notice> : null}
      {query.music ? <Notice tone="success">وضعیت آهنگ به‌روزرسانی شد.</Notice> : null}
      {query.error ? <Notice tone="danger">درخواست معتبر نبود یا خارج از محدوده قرارداد بود.</Notice> : null}

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <Panel icon={MessageSquareText} title="نظرها و بازخورد مراسم" description="نظرهای ثبت‌شده از طرف صاحب قرارداد یا مهمانان اینجا دیده می‌شود تا پیگیری خدمات بعد از مراسم ساده باشد.">
            <div className="grid gap-3">
              {contract.feedbacks.length ? contract.feedbacks.map((feedback: any) => (
                <article key={feedback.id} className="rounded-2xl border border-[#ead6a6] bg-white/72 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-[#111827]">{feedback.fullName ?? "بدون نام"}</p>
                      <p className="mt-1 text-xs font-bold text-[#7d6841]">{crmFeedbackAudienceLabels[feedback.audience] ?? feedback.audience}</p>
                    </div>
                    <span className="rounded-full border border-[#d8c08b]/70 bg-[#fff8ea] px-3 py-1 text-[11px] font-black text-[#7d6841]">{formatJalaliDateTime(feedback.createdAt)}</span>
                  </div>
                  <p className="mt-2 rounded-2xl bg-[#fff9ee] px-3 py-2 text-xs font-bold leading-6 text-[#6d5f49]">امتیاز کلی: {feedback.ratingOverall ? toPersianDigits(feedback.ratingOverall) : "—"} · مسئول قرارداد: {feedback.ratingContractManager ? toPersianDigits(feedback.ratingContractManager) : "—"}</p>
                  {feedback.message ? <p className="mt-2 rounded-2xl bg-white/80 p-3 text-sm font-bold leading-7 text-[#4a3514]">{feedback.message}</p> : null}
                  {feedback.suggestion ? <p className="mt-2 text-xs font-bold leading-6 text-[#7d6841]">پیشنهاد: {feedback.suggestion}</p> : null}
                </article>
              )) : <Empty>هنوز نظری برای این مراسم ثبت نشده است. بعد از اشتراک لینک، بازخوردها در همین بخش نمایش داده می‌شود.</Empty>}
            </div>
          </Panel>

          <Panel icon={UsersRound} title="باشگاه مشتریان" description="وضعیت عضویت و رضایت پیامکی افرادی که از مسیر این مراسم وارد باشگاه مشتریان شده‌اند در این بخش دیده می‌شود.">
            {contract.clubMembers.length ? (
              <div className="grid gap-3">
                {contract.clubMembers.map((member: any) => (
                  <article key={member.id} className="rounded-2xl border border-[#ead6a6] bg-white/72 p-3">
                    <p className="text-sm font-black text-[#111827]">{member.fullName}</p>
                    <p className="mt-1 text-xs font-bold leading-6 text-[#7d6841]">{member.phone} · منبع: {member.source} · پیامک مناسبت: {member.consentOccasionSms ? "مجاز" : "غیرفعال"} · پیامک تبلیغاتی: {member.consentPromotionSms ? "مجاز" : "غیرفعال"}</p>
                  </article>
                ))}
              </div>
            ) : <Empty>هنوز عضوی از این مراسم وارد باشگاه مشتریان نشده است.</Empty>}
          </Panel>

          <Panel icon={Music2} title="درخواست آهنگ مراسم" description="درخواست‌های آهنگ عروس‌داماد یا مهمانان اینجا ثبت و پیگیری می‌شود تا تیم اجرا قبل از مراسم آماده باشد.">
            {contract.weddingProfile ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-[#ead6a6] bg-white/72 p-3">
                  <p className="text-sm font-black text-[#111827]">پروفایل عروس‌داماد: {contract.weddingProfile.isComplete ? "کامل" : "ناقص"}</p>
                  <p className="mt-1 text-xs font-bold leading-6 text-[#7d6841]">عروس: {[contract.weddingProfile.brideFirstName, contract.weddingProfile.brideLastName].filter(Boolean).join(" ") || "—"} · داماد: {[contract.weddingProfile.groomFirstName, contract.weddingProfile.groomLastName].filter(Boolean).join(" ") || "—"}</p>
                </div>
                {contract.weddingProfile.musicRequests.length ? contract.weddingProfile.musicRequests.map((request: any) => (
                  <article key={request.id} className="rounded-2xl border border-[#ead6a6] bg-white/72 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-[#111827]">{request.songTitle}</p>
                        <p className="mt-1 text-xs font-bold text-[#7d6841]">{musicRequesterLabels[request.requester] ?? request.requester}</p>
                      </div>
                      <span className="rounded-full border border-[#d8c08b]/70 bg-[#fff8ea] px-3 py-1 text-[11px] font-black text-[#7d6841]">{musicStatusLabels[request.status] ?? request.status}</span>
                    </div>
                    <p className="mt-2 text-xs font-bold leading-6 text-[#6d5f49]">خواننده: {request.artistName ?? "—"} · زمان پخش: {request.playMoment ?? "—"}</p>
                    <form action={updateWeddingMusicRequestStatusAction} className="mt-3 grid gap-2 md:grid-cols-[12rem_1fr_auto]">
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="contractId" value={contract.id} />
                      <select name="status" defaultValue={request.status} className="min-h-10 rounded-xl border border-[#d8c08b]/70 bg-white px-3 text-sm font-bold">
                        {Object.entries(musicStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <input name="adminNote" defaultValue={request.adminNote ?? ""} placeholder="توضیح مدیر" className="min-h-10 rounded-xl border border-[#d8c08b]/70 bg-white px-3 text-sm font-bold" />
                      <button className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#172033] px-4 text-sm font-black text-[#fff8ea]">ثبت وضعیت</button>
                    </form>
                  </article>
                )) : <Empty>هنوز آهنگی برای این مراسم ثبت نشده است.</Empty>}
              </div>
            ) : <Empty>برای این قرارداد هنوز پروفایل عروس‌داماد ثبت نشده است.</Empty>}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel icon={Link2} title="ساخت و مدیریت لینک‌های دسترسی" description="لینک مهمان برای افراد دعوت‌شده است؛ لینک صاحب قرارداد برای مالک مراسم است و دسترسی بیشتری به پیگیری قرارداد و نظرخواهی دارد.">
            <div className="grid gap-3 sm:grid-cols-2">
              <CreateLinkForm contractId={contract.id} kind="OWNER_CONTRACT" title="لینک صاحب قرارداد" description="برای مالک قرارداد یا برگزارکننده مراسم؛ مناسب پیگیری قرارداد، فایل‌ها و نظرخواهی." />
              <CreateLinkForm contractId={contract.id} kind="GUEST_LOCATION" title="لینک مهمانان" description="برای مهمانان دعوت‌شده؛ مناسب آدرس، مسیریابی، نظر، عضویت باشگاه و درخواست‌های عمومی." />
            </div>
            <div className="mt-4 space-y-3">
              {contract.accessLinks.length ? contract.accessLinks.map((link: any) => {
                const status = resolveLinkRuntimeStatus(link);
                return (
                  <article key={link.id} className="rounded-2xl border border-[#ead6a6] bg-white/72 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-[#111827]">{crmLinkKindLabels[link.kind] ?? link.kind}</p>
                        <p className="mt-1 text-xs font-bold leading-6 text-[#7d6841]">این ردیف وضعیت و مصرف همین لینک را نشان می‌دهد: توکن ...{link.tokenPreview} · بازدید: {toPersianDigits(link.viewCount)} · دانلود: {toPersianDigits(link.downloadCount)} · انقضا: {formatJalaliDate(link.expiresAt)}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${getCrmStatusPill(status)}`}>{status === "ACTIVE" ? "فعال" : status === "REVOKED" ? "لغوشده" : "منقضی"}</span>
                    </div>
                    {status === "ACTIVE" ? (
                      <form action={revokeContractPortalLinkAction} className="mt-3">
                        <input type="hidden" name="linkId" value={link.id} />
                        <input type="hidden" name="contractId" value={contract.id} />
                        <button className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[#b42318]/25 bg-[#fef3f2] px-3 text-xs font-black text-[#7a271a]">لغو لینک</button>
                      </form>
                    ) : null}
                  </article>
                );
              }) : <Empty>هنوز لینک دسترسی ساخته نشده است. ابتدا مشخص کنید لینک برای مهمانان است یا صاحب قرارداد.</Empty>}
            </div>
          </Panel>

          <Panel icon={ShieldCheck} title="راهنمای دسترسی و امنیت" description="این بخش ساده توضیح می‌دهد هر لینک برای چه کسی است و چه چیزهایی را می‌تواند ببیند یا انجام دهد.">
            <div className="grid gap-3">
              <SecurityItem ok title="لینک صاحب قرارداد" text="برای مالک قرارداد یا برگزارکننده مراسم است؛ می‌تواند اطلاعات قرارداد، فایل‌ها، نظرخواهی و بخش‌های مربوط به باشگاه را ببیند." />
              <SecurityItem ok title="لینک مهمانان" text="برای مهمانان دعوت‌شده است؛ فقط اطلاعات عمومی مثل آدرس، مسیریابی، نظر، عضویت باشگاه و درخواست‌های عمومی را می‌بیند." />
              <SecurityItem title="تأیید پیامکی" text="ساختار تأیید پیامکی آماده است؛ فعال شدن ارسال و تأیید واقعی به اتصال پنل پیامکی بستگی دارد." />
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}

function CreateLinkForm({ contractId, kind, title, description }: { contractId: string; kind: string; title: string; description: string }) {
  return (
    <form action={createContractPortalLinkAction} className="rounded-2xl border border-[#ead6a6] bg-white/72 p-3">
      <input type="hidden" name="contractId" value={contractId} />
      <input type="hidden" name="kind" value={kind} />
      <p className="text-sm font-black text-[#111827]">{title}</p>
      <p className="mt-1 min-h-[2.5rem] text-xs font-bold leading-5 text-[#7d6841]">{description}</p>
      <label className="mt-3 block text-xs font-black text-[#7d6841]">اعتبار لینک</label>
      <select name="months" defaultValue="6" className="mt-1 min-h-10 w-full rounded-xl border border-[#d8c08b]/70 bg-white px-3 text-sm font-bold">
        <option value="3">۳ ماه</option>
        <option value="6">۶ ماه</option>
        <option value="12">۱۲ ماه</option>
        <option value="24">۲۴ ماه</option>
      </select>
      <button className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#172033] px-4 text-sm font-black text-[#fff8ea]"><Link2 size={15} />ساخت لینک امن</button>
    </form>
  );
}

function Panel({ icon: Icon, title, description, children }: { icon: typeof Link2; title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-[1.35rem] border border-[#d8c08b]/60 bg-[#fff9ee]/96 p-4 shadow-[0_12px_42px_rgba(17,24,39,0.055)]">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#172033] text-[#fff8ea]"><Icon size={18} /></span>
        <div>
          <h2 className="text-base font-black text-[#111827] sm:text-lg">{title}</h2>
          {description ? <p className="mt-1 text-xs font-bold leading-6 text-[#7d6841]">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-[#d8c08b]/70 bg-white/58 p-4 text-center text-sm font-bold leading-7 text-[#7d6841]">{children}</div>;
}

function Notice({ tone, children }: { tone: "success" | "danger"; children: ReactNode }) {
  const cls = tone === "success" ? "border-[#25a46d]/22 bg-[#25a46d]/9 text-[#17483f]" : "border-[#b42318]/25 bg-[#fef3f2] text-[#7a271a]";
  return <div className={`rounded-2xl border p-4 text-sm font-black ${cls}`}>{children}</div>;
}

function SecurityItem({ ok, title, text }: { ok?: boolean; title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-[#ead6a6] bg-white/72 p-3">
      <div className="flex items-start gap-2 text-sm font-black text-[#111827]">{ok ? <CheckCircle2 className="mt-0.5 shrink-0 text-[#25a46d]" size={17} /> : <XCircle className="mt-0.5 shrink-0 text-[#9f7131]" size={17} />}<span>{title}</span></div>
      <p className="mt-2 text-xs font-bold leading-6 text-[#6d5f49]">{text}</p>
    </article>
  );
}
