import type { ReactNode } from "react";
import { CalendarDays, Download, Link2, MapPinned, MessageSquareText, Music2, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { getPortalLinkByToken } from "@/lib/crm/data";
import { isWeddingEvent, musicPlayMomentLabels, musicRequesterLabels, musicStatusLabels } from "@/lib/crm/labels";
import { submitContractOwnerFeedbackAction, joinClubFromOwnerPortalAction, saveWeddingProfileAction, submitWeddingMusicRequestAction } from "@/lib/actions/crm-actions";
import { formatJalaliDate, toPersianDigits } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";

type OwnerPortalPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function OwnerContractPortalPage({ params, searchParams }: OwnerPortalPageProps) {
  const { token } = await params;
  const query = await searchParams;
  const link = await getPortalLinkByToken(token, "OWNER_CONTRACT") as any;
  if (!link) return <PortalUnavailable />;
  const contract = link.contract;
  const tenantName = contract.tenant?.hallProfile?.brandName ?? contract.tenant?.name ?? "تالار";
  const isWedding = isWeddingEvent(contract.eventTypeName);
  const profile = contract.weddingProfile;
  const musicRequests = profile?.musicRequests ?? [];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.16),transparent_22rem),linear-gradient(180deg,#fff8ea,#f7ecd2)] px-3 py-5 text-[#111827] sm:px-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="overflow-hidden rounded-[2rem] border border-[#d8c08b]/65 bg-white/82 p-5 shadow-[0_18px_62px_rgba(17,24,39,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="rounded-full border border-[#c7a15a]/36 bg-[#fff4d8] px-3 py-1 text-xs font-black text-[#7d6841]">پرتال امن صاحب قرارداد</span>
              <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] sm:text-3xl">{tenantName}</h1>
              <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">قرارداد {toPersianDigits(contract.contractNo)} برای {contract.customer.fullName}</p>
            </div>
            <Link href={`/portal/contracts/${encodeURIComponent(token)}/print`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#172033] px-4 py-2.5 text-sm font-black text-[#fff8ea]"><Download size={17} />دانلود / چاپ PDF</Link>
          </div>
        </section>

        {query.saved ? <Notice>اطلاعات با موفقیت ثبت شد.</Notice> : null}
        {query.error ? <Notice danger>{getPortalError(query.error)}</Notice> : null}

        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <PortalCard icon={CalendarDays} title="خلاصه قرارداد">
            <InfoRow label="نوع مراسم" value={contract.eventTypeName ?? "—"} />
            <InfoRow label="تاریخ مراسم" value={formatJalaliDate(contract.eventDate)} />
            <InfoRow label="ساعت" value={[contract.eventStartTime, contract.eventEndTime].filter(Boolean).join(" تا ") || "—"} />
            <InfoRow label="تعداد مهمان" value={`${toPersianDigits(formatPersianNumber(contract.guestCount))} نفر`} />
            <InfoRow label="تالار / سالن" value={`${contract.hall?.name ?? "—"} / ${contract.salon?.name ?? "—"}`} />
            <InfoRow label="مبلغ نهایی" value={formatIRR(Number(contract.finalTotal ?? contract.totalAmount ?? 0))} />
          </PortalCard>

          <PortalCard icon={MapPinned} title="لینک آدرس مهمانان">
            <p className="text-sm font-bold leading-7 text-[#6d5f49]">لینک مهمان باید جدا از لینک قرارداد ساخته و برای مهمانان ارسال شود. مهمان در آن صفحه مبلغ، PDF و اطلاعات خصوصی قرارداد را نمی‌بیند. چه ایده عجیبی: حریم خصوصی.</p>
            <div className="mt-3 rounded-2xl border border-[#d8c08b]/70 bg-[#fff8ea] p-3 text-sm font-bold text-[#4a3514]">
              آدرس فعلی: {contract.hall?.address ?? contract.tenant?.hallProfile?.address ?? "آدرس کامل تالار هنوز ثبت نشده است."}
            </div>
          </PortalCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <PortalCard icon={MessageSquareText} title="ثبت رضایت‌مندی و پیشنهاد">
            <form action={submitContractOwnerFeedbackAction} className="grid gap-3">
              <input type="hidden" name="token" value={token} />
              <Input name="fullName" label="نام" defaultValue={contract.customer.fullName} />
              <Input name="mobile" label="موبایل" defaultValue={contract.customer.phone} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select name="ratingOverall" label="رضایت کلی"><RatingOptions /></Select>
                <Select name="ratingContractManager" label="رضایت از مسئول قرارداد"><RatingOptions /></Select>
              </div>
              <Textarea name="message" label="نظر شما" />
              <Textarea name="suggestion" label="پیشنهاد برای بهتر شدن خدمات" />
              <Submit>ثبت نظر</Submit>
            </form>
          </PortalCard>

          <PortalCard icon={UsersRound} title="عضویت اختیاری در باشگاه مشتریان">
            <form action={joinClubFromOwnerPortalAction} className="grid gap-3">
              <input type="hidden" name="token" value={token} />
              <Input name="fullName" label="نام و نام خانوادگی" defaultValue={contract.customer.fullName} />
              <Input name="phone" label="شماره موبایل" defaultValue={contract.customer.phone} />
              <Input name="nationalCode" label="کد ملی، اختیاری" defaultValue={contract.customer.nationalCode ?? contract.customer.nationalId ?? ""} />
              <Input name="city" label="شهر" />
              <Input name="birthDateText" label="تاریخ تولد شمسی، اختیاری" placeholder="مثلاً ۱۳۷۰/۰۵/۲۴" />
              <Checkbox name="consentOccasionSms" label="رضایت دریافت پیامک مناسبتی" />
              <Checkbox name="consentReminderSms" label="رضایت دریافت یادآوری قبل از مناسبت" />
              <Checkbox name="consentPromotionSms" label="رضایت دریافت پیشنهاد ویژه تالار" />
              <Submit>عضویت در باشگاه</Submit>
            </form>
          </PortalCard>
        </div>

        {isWedding ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <PortalCard icon={UsersRound} title="تکمیل اطلاعات عروس و داماد">
              <form action={saveWeddingProfileAction} className="grid gap-3">
                <input type="hidden" name="token" value={token} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input name="brideFirstName" label="نام عروس" defaultValue={profile?.brideFirstName ?? ""} />
                  <Input name="brideLastName" label="نام خانوادگی عروس" defaultValue={profile?.brideLastName ?? ""} />
                  <Input name="bridePhone" label="موبایل عروس" defaultValue={profile?.bridePhone ?? ""} />
                  <Input name="brideBirthDateText" label="تولد عروس" defaultValue={profile?.brideBirthDateText ?? ""} />
                  <Input name="groomFirstName" label="نام داماد" defaultValue={profile?.groomFirstName ?? ""} />
                  <Input name="groomLastName" label="نام خانوادگی داماد" defaultValue={profile?.groomLastName ?? ""} />
                  <Input name="groomPhone" label="موبایل داماد" defaultValue={profile?.groomPhone ?? ""} />
                  <Input name="groomBirthDateText" label="تولد داماد" defaultValue={profile?.groomBirthDateText ?? ""} />
                  <Input name="engagementDateText" label="تاریخ عقد" defaultValue={profile?.engagementDateText ?? ""} />
                  <Input name="weddingDateText" label="تاریخ عروسی" defaultValue={profile?.weddingDateText ?? ""} />
                  <Input name="musicEditDeadlineText" label="مهلت ویرایش آهنگ" defaultValue={profile?.musicEditDeadlineText ?? ""} />
                </div>
                <Checkbox name="consentOccasionSms" label="رضایت پیامک مناسبتی عروس و داماد" defaultChecked={profile?.consentOccasionSms} />
                <Checkbox name="consentReminderSms" label="رضایت یادآوری ۱۰ روز قبل" defaultChecked={profile?.consentReminderSms} />
                <Checkbox name="consentPromotionSms" label="رضایت پیشنهاد ویژه تالار" defaultChecked={profile?.consentPromotionSms} />
                <Checkbox name="consentMusicStatusSms" label="رضایت پیامک وضعیت آهنگ" defaultChecked={profile?.consentMusicStatusSms} />
                <Submit>ذخیره اطلاعات عروس و داماد</Submit>
              </form>
            </PortalCard>

            <PortalCard icon={Music2} title="درخواست آهنگ مراسم">
              {profile?.isComplete ? (
                <form action={submitWeddingMusicRequestAction} className="grid gap-3">
                  <input type="hidden" name="token" value={token} />
                  <Select name="requester" label="درخواست‌دهنده">
                    {Object.entries(musicRequesterLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </Select>
                  <Input name="songTitle" label="نام آهنگ" />
                  <Input name="artistName" label="نام خواننده، اختیاری" />
                  <Input name="songUrl" label="لینک معرفی آهنگ، اختیاری" />
                  <Select name="playMoment" label="زمان پیشنهادی پخش">
                    {Object.entries(musicPlayMomentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </Select>
                  <Textarea name="note" label="توضیح تکمیلی" />
                  <Submit>ثبت آهنگ</Submit>
                </form>
              ) : (
                <div className="rounded-2xl border border-[#d8c08b]/70 bg-[#fff8ea] p-4 text-sm font-bold leading-7 text-[#7d6841]">برای ثبت آهنگ، ابتدا اطلاعات اصلی عروس و داماد را کامل کنید. هر نفر حداکثر دو آهنگ دارد؛ چون مراسم عروسی است، نه پلی‌لیست بی‌پایان.</div>
              )}
              <div className="mt-4 space-y-2">
                {musicRequests.length ? musicRequests.map((item: any) => (
                  <div key={item.id} className="rounded-2xl border border-[#ead6a6] bg-white/65 p-3">
                    <p className="text-sm font-black text-[#111827]">{item.songTitle} · {musicRequesterLabels[item.requester] ?? item.requester}</p>
                    <p className="mt-1 text-xs font-bold text-[#7d6841]">وضعیت: {musicStatusLabels[item.status] ?? item.status}</p>
                  </div>
                )) : null}
              </div>
            </PortalCard>
          </div>
        ) : null}

        <section className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-white/78 p-4 shadow-[0_14px_52px_rgba(17,24,39,0.05)]">
          <div className="flex items-center gap-2 text-sm font-black text-[#17483f]"><ShieldCheck size={18} />حریم خصوصی</div>
          <p className="mt-2 text-xs font-bold leading-6 text-[#6d5f49]">این صفحه مخصوص صاحب قرارداد است. لینک مهمان جداگانه است و اطلاعات مالی، PDF و جزئیات خصوصی قرارداد در صفحه مهمان نمایش داده نمی‌شود.</p>
        </section>
      </div>
    </main>
  );
}

function PortalUnavailable() {
  return <main className="grid min-h-screen place-items-center bg-[#fff8ea] p-6 text-center"><div className="max-w-lg rounded-3xl border border-[#d8c08b]/70 bg-white p-6 shadow-xl"><h1 className="text-xl font-black">لینک قرارداد معتبر نیست</h1><p className="mt-3 text-sm font-bold leading-7 text-[#7d6841]">لینک ممکن است منقضی، لغوشده یا اشتباه باشد.</p></div></main>;
}

function getPortalError(error: string) {
  const messages: Record<string, string> = {
    "not-wedding": "این قابلیت فقط برای مراسم عروسی فعال است.",
    "wedding-profile-required": "ابتدا اطلاعات عروس و داماد را کامل کنید.",
    "music-limit": "برای هر نفر حداکثر دو آهنگ قابل ثبت است.",
    "music-title-required": "نام آهنگ الزامی است.",
    "invalid-requester": "درخواست‌دهنده معتبر نیست.",
  };
  return messages[error] ?? "درخواست معتبر نبود.";
}

function PortalCard({ icon: Icon, title, children }: { icon: typeof CalendarDays; title: string; children: ReactNode }) {
  return <section className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-white/82 p-4 shadow-[0_14px_52px_rgba(17,24,39,0.05)]"><div className="mb-4 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-[#172033] text-[#fff8ea]"><Icon size={18} /></span><h2 className="text-lg font-black">{title}</h2></div>{children}</section>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 border-b border-[#ead6a6] py-2 text-sm"><span className="font-bold text-[#7d6841]">{label}</span><span className="font-black text-[#111827]">{value}</span></div>;
}

function Input({ name, label, defaultValue = "", placeholder = "" }: { name: string; label: string; defaultValue?: string; placeholder?: string }) {
  return <label className="grid gap-1.5 text-xs font-black text-[#7d6841]"><span>{label}</span><input name={name} defaultValue={defaultValue} placeholder={placeholder} className="min-h-11 rounded-2xl border border-[#d8c08b]/70 bg-[#fffdf8] px-3 text-sm font-bold text-[#111827]" /></label>;
}

function Textarea({ name, label }: { name: string; label: string }) {
  return <label className="grid gap-1.5 text-xs font-black text-[#7d6841]"><span>{label}</span><textarea name={name} rows={4} className="rounded-2xl border border-[#d8c08b]/70 bg-[#fffdf8] px-3 py-2 text-sm font-bold leading-7 text-[#111827]" /></label>;
}

function Select({ name, label, children }: { name: string; label: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-xs font-black text-[#7d6841]"><span>{label}</span><select name={name} className="min-h-11 rounded-2xl border border-[#d8c08b]/70 bg-[#fffdf8] px-3 text-sm font-bold text-[#111827]">{children}</select></label>;
}

function Checkbox({ name, label, defaultChecked = false }: { name: string; label: string; defaultChecked?: boolean }) {
  return <label className="flex items-center gap-2 rounded-2xl border border-[#d8c08b]/60 bg-[#fff8ea]/75 px-3 py-2 text-xs font-black text-[#6d5f49]"><input type="checkbox" name={name} defaultChecked={defaultChecked} />{label}</label>;
}

function RatingOptions() {
  return <>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{toPersianDigits(value)} از ۵</option>)}</>;
}

function Submit({ children }: { children: ReactNode }) {
  return <button className="min-h-11 rounded-2xl bg-[#172033] px-4 text-sm font-black text-[#fff8ea]">{children}</button>;
}

function Notice({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return <div className={`rounded-2xl border p-4 text-sm font-black ${danger ? "border-[#b42318]/25 bg-[#fef3f2] text-[#7a271a]" : "border-[#25a46d]/22 bg-[#25a46d]/9 text-[#17483f]"}`}>{children}</div>;
}
