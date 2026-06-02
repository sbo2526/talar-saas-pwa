import type { ReactNode } from "react";
import { MapPinned, MessageSquareText, Navigation, UsersRound } from "lucide-react";
import { getPortalLinkByToken } from "@/lib/crm/data";
import { submitGuestFeedbackAction, joinClubFromGuestLinkAction } from "@/lib/actions/crm-actions";
import { formatJalaliDate, toPersianDigits } from "@/lib/date/jalali";

type GuestLocationPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ saved?: string; error?: string; otp?: string }>;
};

export default async function GuestLocationPage({ params, searchParams }: GuestLocationPageProps) {
  const { token } = await params;
  const query = await searchParams;
  const link = await getPortalLinkByToken(token, "GUEST_LOCATION") as any;
  if (!link) return <GuestUnavailable />;
  const contract = link.contract;
  const tenantName = contract.tenant?.hallProfile?.brandName ?? contract.tenant?.name ?? "تالار";
  const address = contract.hall?.address ?? contract.tenant?.hallProfile?.address ?? "آدرس کامل تالار هنوز ثبت نشده است.";
  const mapsQuery = encodeURIComponent(`${tenantName} ${address}`);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.16),transparent_22rem),linear-gradient(180deg,#fff8ea,#f7ecd2)] px-3 py-5 text-[#111827] sm:px-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <section className="rounded-[2rem] border border-[#d8c08b]/65 bg-white/84 p-5 text-center shadow-[0_18px_62px_rgba(17,24,39,0.08)]">
          <span className="rounded-full border border-[#c7a15a]/36 bg-[#fff4d8] px-3 py-1 text-xs font-black text-[#7d6841]">لینک مهمان مراسم</span>
          <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] sm:text-3xl">{contract.eventTypeName ?? "مراسم"} در {tenantName}</h1>
          <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">تاریخ مراسم: {formatJalaliDate(contract.eventDate)}</p>
        </section>

        {query.saved ? <Notice>درخواست شما ثبت شد. تأیید موبایل از مسیر امن پیامکی تکمیل می‌شود.</Notice> : null}
        {query.error ? <Notice danger>اطلاعات لازم کامل نبود.</Notice> : null}

        <GuestCard icon={MapPinned} title="آدرس و مسیریابی">
          <div className="rounded-2xl border border-[#d8c08b]/70 bg-[#fff8ea] p-4 text-sm font-black leading-7 text-[#4a3514]">{address}</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <a href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#172033] px-4 text-sm font-black text-[#fff8ea]"><Navigation size={17} />Google Maps</a>
            <a href={`https://nshn.ir/maps/search/${mapsQuery}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#c7a15a]/55 bg-[#fff4d8] px-4 text-sm font-black text-[#4a3514]"><Navigation size={17} />نشان</a>
          </div>
          <p className="mt-3 text-xs font-bold leading-6 text-[#7d6841]">این صفحه مخصوص مهمان است؛ مبلغ قرارداد، PDF و اطلاعات خصوصی صاحب قرارداد در اینجا نمایش داده نمی‌شود. بله، بالاخره یک دیوار درست بین حریم خصوصی و کنجکاوی عمومی کشیده شد.</p>
        </GuestCard>

        <div className="grid gap-4 lg:grid-cols-2">
          <GuestCard icon={MessageSquareText} title="ثبت نظر مهمان">
            <form action={submitGuestFeedbackAction} className="grid gap-3">
              <input type="hidden" name="token" value={token} />
              <Input name="fullName" label="نام و نام خانوادگی، اختیاری" />
              <Input name="mobile" label="شماره موبایل" />
              <Select name="ratingOverall" label="امتیاز کلی"><RatingOptions /></Select>
              <Textarea name="message" label="نظر درباره تالار" />
              <Textarea name="suggestion" label="پیشنهاد" />
              <Submit>ثبت نظر</Submit>
            </form>
          </GuestCard>

          <GuestCard icon={UsersRound} title="عضویت اختیاری در باشگاه مشتریان">
            <form action={joinClubFromGuestLinkAction} className="grid gap-3">
              <input type="hidden" name="token" value={token} />
              <Input name="fullName" label="نام و نام خانوادگی" />
              <Input name="phone" label="شماره موبایل" />
              <Input name="birthDateText" label="تاریخ تولد شمسی، اختیاری" placeholder="مثلاً ۱۳۷۵/۰۲/۱۰" />
              <Select name="marriedStatus" label="وضعیت تأهل">
                <option value="">انتخاب نشده</option>
                <option value="SINGLE">مجرد</option>
                <option value="MARRIED">متأهل</option>
              </Select>
              <Input name="marriageDateText" label="تاریخ ازدواج، اگر متأهل هستید" />
              <Checkbox name="consentOccasionSms" label="رضایت دریافت پیامک مناسبتی" />
              <Checkbox name="consentReminderSms" label="رضایت یادآوری قبل از مناسبت" />
              <Checkbox name="consentPromotionSms" label="رضایت دریافت پیشنهاد ویژه" />
              <Submit>عضویت در باشگاه</Submit>
            </form>
          </GuestCard>
        </div>
      </div>
    </main>
  );
}

function GuestUnavailable() {
  return <main className="grid min-h-screen place-items-center bg-[#fff8ea] p-6 text-center"><div className="max-w-lg rounded-3xl border border-[#d8c08b]/70 bg-white p-6 shadow-xl"><h1 className="text-xl font-black">لینک مهمان معتبر نیست</h1><p className="mt-3 text-sm font-bold leading-7 text-[#7d6841]">لینک ممکن است منقضی، لغوشده یا اشتباه باشد.</p></div></main>;
}

function GuestCard({ icon: Icon, title, children }: { icon: typeof MapPinned; title: string; children: ReactNode }) {
  return <section className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-white/84 p-4 shadow-[0_14px_52px_rgba(17,24,39,0.05)]"><div className="mb-4 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-[#172033] text-[#fff8ea]"><Icon size={18} /></span><h2 className="text-lg font-black">{title}</h2></div>{children}</section>;
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

function Checkbox({ name, label }: { name: string; label: string }) {
  return <label className="flex items-center gap-2 rounded-2xl border border-[#d8c08b]/60 bg-[#fff8ea]/75 px-3 py-2 text-xs font-black text-[#6d5f49]"><input type="checkbox" name={name} />{label}</label>;
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
