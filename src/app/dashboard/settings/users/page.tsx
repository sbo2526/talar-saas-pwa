import type { ReactNode } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Clock3,
  Crown,
  MoreHorizontal,
  Info,
  KeyRound,
  Mail,
  PencilLine,
  Phone,
  ShieldCheck,
  UserCog,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { redirect } from "next/navigation";
import {
  BackToSettingsLink,
  SettingsPageShell,
} from "@/components/dashboard/settings/settings-page-shell";
import {
  createTenantUserAction,
  resetTenantUserPasswordAction,
  updateTenantUserRoleAction,
  updateTenantUserStatusAction,
} from "@/lib/actions/tenant-user-actions";
import {
  getSelectableTenantRoles,
  getTenantMemberStatusLabel,
  getTenantUserRoleLabel,
} from "@/lib/tenant-users/tenant-user-display";
import { requireTenantMember } from "@/lib/auth/session";
import { getTenantPermissionSet, tenantMemberStatusKeys } from "@/lib/auth/tenant-permissions";
import { formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";
import { getPrisma } from "@/lib/prisma";

type TenantUsersPageProps = {
  searchParams?: Promise<{ status?: string }>;
};

const inputClass =
  "w-full rounded-2xl border border-[#d8c08b]/65 bg-white/90 px-3 py-3 text-sm font-black text-[#111827] outline-none transition focus:border-[#17483f]/55 focus:bg-white";
const compactInputClass =
  "w-full rounded-xl border border-[#d8c08b]/58 bg-white/92 px-3 py-2 text-xs font-black text-[#111827] outline-none transition focus:border-[#17483f]/55 focus:bg-white";

function getStatusMessage(status?: string) {
  const messages: Record<string, { tone: "success" | "danger"; text: string }> = {
    created: { tone: "success", text: "کاربر تالار با موفقیت ثبت شد." },
    updated: { tone: "success", text: "نقش و عنوان کاربر به‌روزرسانی شد." },
    "status-updated": { tone: "success", text: "وضعیت کاربر به‌روزرسانی شد." },
    "password-reset": { tone: "success", text: "رمز عبور کاربر بازنشانی شد و تغییر رمز در ورود بعدی فعال شد." },
    "create-invalid": { tone: "danger", text: "اطلاعات کاربر جدید کامل یا معتبر نیست." },
    "password-short": { tone: "danger", text: "رمز عبور باید حداقل ۸ کاراکتر باشد." },
    "owner-role-forbidden": { tone: "danger", text: "تنظیم نقش مالک فقط از همین صفحه و توسط مالک اصلی انجام می‌شود." },
    "duplicate-user": { tone: "danger", text: "ایمیل یا شماره موبایل برای حساب دیگری ثبت شده است." },
    "create-failed": { tone: "danger", text: "ثبت کاربر با خطا مواجه شد." },
    "update-invalid": { tone: "danger", text: "درخواست ویرایش نقش معتبر نیست." },
    "status-invalid": { tone: "danger", text: "درخواست تغییر وضعیت معتبر نیست." },
    "reset-invalid": { tone: "danger", text: "درخواست بازنشانی رمز معتبر نیست." },
    "member-not-found": { tone: "danger", text: "عضویت کاربر در این تالار پیدا نشد." },
    "self-owner-demotion-blocked": { tone: "danger", text: "برای حفظ مدیریت تالار، نقش مالکِ فعال از روی حساب خودتان برداشته نمی‌شود." },
    "self-suspend-blocked": { tone: "danger", text: "برای اینکه دسترسی مالک حفظ شود، وضعیت حساب خودتان غیرفعال نمی‌شود." },
    "owner-status-forbidden": { tone: "danger", text: "تغییر وضعیت مالک فقط توسط مالک انجام می‌شود." },
    "owner-reset-forbidden": { tone: "danger", text: "بازنشانی رمز مالک فقط توسط مالک انجام می‌شود." },
    "owner-only": { tone: "danger", text: "مدیریت کاربران فقط از حساب مالک تالار انجام می‌شود." },
  };

  return status ? messages[status] : null;
}

export default async function TenantUsersPage({ searchParams }: TenantUsersPageProps) {
  const membership = await requireTenantMember();

  if (membership.role !== "OWNER") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const message = getStatusMessage(params?.status);
  const db = await getPrisma();
  const selectableRoles = getSelectableTenantRoles(membership.role);

  const members = await db.tenantMember.findMany({
    where: {
      tenantId: membership.tenantId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
        },
      },
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [
      { role: "asc" },
      { createdAt: "asc" },
    ],
  });

  const activeCount = members.filter((item) => item.status === "ACTIVE").length;
  const invitedCount = members.filter((item) => item.status === "INVITED").length;

  return (
    <SettingsPageShell
      title="تعریف کاربران و دسترسی‌ها"
      subtitle="کاربران تالار را تعریف کنید، نقش بدهید و وضعیت دسترسی‌ها را مدیریت کنید. این بخش فقط برای مالک تالار نمایش داده می‌شود."
      badge="فقط مالک"
      tenantName={membership.tenant.hallProfile?.brandName ?? membership.tenant.name}
      actions={(
        <>
          <a href="#add-user" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#111827]/16 bg-[#111827] px-4 py-2.5 text-sm font-black text-[#fff8ea] shadow-[0_16px_38px_rgba(17,24,39,0.18)] transition hover:border-[#c7a15a]">
            <UserPlus size={17} /> افزودن کاربر
          </a>
          <BackToSettingsLink />
        </>
      )}
    >
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <section className="grid gap-3 md:grid-cols-3">
        <SummaryCard icon={<UsersRound size={19} />} label="کل کاربران" value={toPersianDigits(members.length)} hint="کاربر ثبت‌شده" />
        <SummaryCard icon={<BadgeCheck size={19} />} label="کاربران فعال" value={toPersianDigits(activeCount)} hint={`از ${toPersianDigits(members.length)} کاربر`} />
        <SummaryCard icon={<Mail size={19} />} label="دعوت‌نامه‌های در انتظار" value={toPersianDigits(invitedCount)} hint="دعوت‌نامه ارسال‌شده" />
      </section>

      <Notice tone="success" icon={<Info size={20} />}>
        فقط مالک می‌تواند کاربران جدید تعریف کند، نقش‌ها را تغییر دهد و دسترسی‌ها را مدیریت کند. برای ایجاد دسترسی، ابتدا کاربر را اضافه کنید و سپس نقش مناسب را اختصاص دهید.
      </Notice>

      <section id="add-user" className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#17483f]/16 bg-[#f1fbf5] px-3 py-1.5 text-xs font-black text-[#17483f]">
              <UserPlus size={15} /> افزودن کاربر
            </p>
            <h2 className="mt-3 text-xl font-black">ایجاد یا اتصال کاربر به همین تالار</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
              اگر ایمیل از قبل وجود داشته باشد، همان حساب به این تالار متصل می‌شود؛ در غیر این صورت حساب جدید ساخته می‌شود.
            </p>
          </div>
        </div>

        <form action={createTenantUserAction} className="mt-5 grid gap-3 lg:grid-cols-4">
          <Field label="نام کامل">
            <input name="name" className={inputClass} required />
          </Field>
          <Field label="ایمیل ورود">
            <input name="email" type="email" dir="ltr" className={inputClass} required />
          </Field>
          <Field label="موبایل، اختیاری">
            <input name="phone" dir="ltr" className={inputClass} />
          </Field>
          <Field label="رمز اولیه">
            <input name="password" type="password" className={inputClass} required minLength={8} />
          </Field>
          <Field label="نقش">
            <select name="role" className={inputClass} defaultValue="RECEPTION">
              {selectableRoles.map((role) => (
                <option key={role} value={role}>{getTenantUserRoleLabel(role)}</option>
              ))}
            </select>
          </Field>
          <Field label="عنوان داخلی، اختیاری">
            <input name="title" className={inputClass} placeholder="مثلاً حسابدار شیفت عصر" />
          </Field>
          <Field label="وضعیت">
            <select name="status" className={inputClass} defaultValue="ACTIVE">
              {tenantMemberStatusKeys.map((status) => (
                <option key={status} value={status}>{getTenantMemberStatusLabel(status)}</option>
              ))}
            </select>
          </Field>
          <label className="flex min-h-14 items-center gap-2 rounded-2xl border border-[#d8c08b]/58 bg-white/72 px-3 py-2 text-xs font-black text-[#7d6841] lg:mt-7">
            <input name="mustChangePassword" type="checkbox" className="size-4 accent-[#17483f]" defaultChecked />
            اجبار تغییر رمز در ورود بعدی
          </label>
          <div className="lg:col-span-4">
            <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#111827]/16 bg-[#111827] px-5 py-3 text-sm font-black text-[#fff8ea] transition hover:border-[#c7a15a]/60">
              <UserPlus size={17} /> ثبت کاربر تالار
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">لیست کاربران</h2>
            <p className="mt-1 text-sm font-bold text-[#6d5f49]">نمایش {toPersianDigits(members.length)} کاربر از مجموع {toPersianDigits(members.length)} کاربر</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#7d6841]">
            <Crown size={14} /> فقط مالک
          </span>
        </div>

        <div className="space-y-3">
          {members.map((item) => {
            const permissionCount = getTenantPermissionSet(item).size;
            const invitedByLabel = item.invitedBy?.name ?? item.invitedBy?.email ?? "ثبت نشده";

            return (
              <article key={item.id} className="overflow-hidden rounded-[1.35rem] border border-[#d8c08b]/58 bg-white/62 p-3 shadow-[0_10px_32px_rgba(17,24,39,0.04)]">
                <div className="grid gap-4 xl:grid-cols-[15rem_minmax(0,1fr)] xl:items-stretch">
                  <div className="order-2 grid content-start gap-2 xl:order-1">
                    <ActionDetails label="جزئیات" icon={<Info size={15} />}>
                      <div className="space-y-2 text-xs font-bold leading-6 text-[#6d5f49]">
                        <p>دعوت‌کننده: {invitedByLabel}</p>
                        <p>تعداد دسترسی: {toPersianDigits(permissionCount)}</p>
                        <p>وضعیت حساب کاربری: {item.user.status}</p>
                      </div>
                    </ActionDetails>

                    <ActionDetails label="ویرایش نقش" icon={<PencilLine size={15} />}>
                      <form action={updateTenantUserRoleAction} className="grid gap-2">
                        <input type="hidden" name="memberId" value={item.id} />
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                          <Field label="نقش">
                            <select name="role" className={compactInputClass} defaultValue={item.role}>
                              {selectableRoles.map((role) => (
                                <option key={role} value={role}>{getTenantUserRoleLabel(role)}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="عنوان">
                            <input name="title" className={compactInputClass} defaultValue={item.title ?? ""} />
                          </Field>
                        </div>
                        <button type="submit" className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-[#17483f]/20 bg-[#f1fbf5] px-3 py-2 text-xs font-black text-[#17483f] transition hover:border-[#17483f]/38">
                          <UserCog size={14} /> ذخیره نقش
                        </button>
                      </form>
                    </ActionDetails>

                    <ActionDetails label="مدیریت دسترسی" icon={<ShieldCheck size={15} />}>
                      <form action={updateTenantUserStatusAction} className="grid gap-2">
                        <input type="hidden" name="memberId" value={item.id} />
                        <Field label="وضعیت کاربر">
                          <select name="status" className={compactInputClass} defaultValue={item.status}>
                            {tenantMemberStatusKeys.map((status) => (
                              <option key={status} value={status}>{getTenantMemberStatusLabel(status)}</option>
                            ))}
                          </select>
                        </Field>
                        <button type="submit" className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 px-3 py-2 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/72">
                          <ShieldCheck size={14} /> ذخیره وضعیت
                        </button>
                      </form>
                    </ActionDetails>

                    <ActionDetails label="بیشتر" icon={<MoreHorizontal size={15} />}>
                      <form action={resetTenantUserPasswordAction} className="grid gap-2 rounded-2xl border border-[#b45353]/18 bg-[#fff1f1]/52 p-3">
                        <input type="hidden" name="memberId" value={item.id} />
                        <Field label="رمز جدید">
                          <input name="password" type="password" className={compactInputClass} minLength={8} required />
                        </Field>
                        <button type="submit" className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-[#b45353]/24 bg-[#fff1f1]/75 px-3 py-2 text-xs font-black text-[#8f2c2c] transition hover:border-[#b45353]/45">
                          <KeyRound size={14} /> بازنشانی رمز
                        </button>
                      </form>
                    </ActionDetails>
                  </div>

                  <div className="order-1 grid gap-4 rounded-[1.2rem] border border-[#d8c08b]/36 bg-[#fffdf8]/75 p-4 xl:order-2 xl:grid-cols-[minmax(13rem,0.8fr)_minmax(0,1fr)_minmax(14rem,0.8fr)] xl:items-center">
                    <div className="flex min-w-0 items-center gap-3 text-right">
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-[#c7a15a]/38 bg-[#fff7e6] text-[#7d6841]">
                        <UserCog size={25} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-xl font-black">{item.user.name ?? "بدون نام"}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <RolePill role={item.role} />
                          <StatusPill status={item.status} />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2 border-y border-dashed border-[#d8c08b]/55 py-3 text-sm font-bold text-[#6d5f49] xl:border-x xl:border-y-0 xl:px-5 xl:py-0">
                      <InfoLine icon={<Phone size={15} />} label="موبایل" value={item.user.phone ? toPersianDigits(item.user.phone) : "ثبت نشده"} />
                      <InfoLine icon={<Mail size={15} />} label="ایمیل" value={item.user.email} ltr />
                    </div>

                    <div className="grid gap-2 text-sm font-bold text-[#6d5f49]">
                      <InfoLine icon={<Clock3 size={15} />} label="آخرین ورود" value={item.user.lastLoginAt ? formatJalaliDateTime(item.user.lastLoginAt) : "ثبت نشده"} />
                      <InfoLine icon={<CalendarDays size={15} />} label="تاریخ ایجاد" value={formatJalaliDateTime(item.createdAt)} />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </SettingsPageShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-black text-[#172033]">
      <span>{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[1.35rem] border border-[#d8c08b]/58 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_10px_32px_rgba(17,24,39,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <span className="flex size-12 items-center justify-center rounded-[1.1rem] border border-[#c7a15a]/32 bg-[#fff7e6] text-[#7d6841]">{icon}</span>
        <p className="text-3xl font-black">{value}</p>
      </div>
      <p className="mt-3 text-sm font-black text-[#111827]">{label}</p>
      <p className="mt-1 text-xs font-bold text-[#7d6841]">{hint}</p>
    </div>
  );
}

function InfoLine({ icon, label, value, ltr = false }: { icon: ReactNode; label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 text-[#7d6841]">{icon}{label}</span>
      <span className="truncate font-black text-[#172033]" dir={ltr ? "ltr" : "rtl"}>{value}</span>
    </div>
  );
}

function RolePill({ role }: { role: string }) {
  const isOwner = role === "OWNER";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${isOwner ? "border-[#c7a15a]/40 bg-[#fff7e6] text-[#7a4a12]" : "border-[#17483f]/18 bg-[#f1fbf5] text-[#17483f]"}`}>
      {isOwner ? <Crown size={13} /> : <UserCog size={13} />}
      {getTenantUserRoleLabel(role)}
    </span>
  );
}

function StatusPill({ status }: { status: "ACTIVE" | "INVITED" | "SUSPENDED" }) {
  const className =
    status === "ACTIVE"
      ? "border-[#25a46d]/22 bg-[#25a46d]/10 text-[#17483f]"
      : status === "INVITED"
        ? "border-[#c7a15a]/36 bg-[#fff7e6] text-[#7a4a12]"
        : "border-[#b45353]/18 bg-[#fff1f1] text-[#8f2c2c]";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${className}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {getTenantMemberStatusLabel(status)}
    </span>
  );
}

function ActionDetails({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <details className="group rounded-2xl border border-[#d8c08b]/56 bg-[#fffaf0]/80 text-[#111827]">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-3 py-2 text-xs font-black marker:hidden">
        <span className="inline-flex items-center gap-2">{icon}{label}</span>
        <span className="text-[#7d6841] transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="border-t border-[#d8c08b]/44 p-3">
        {children}
      </div>
    </details>
  );
}

function Notice({ children, tone, icon }: { children: ReactNode; tone: "success" | "danger"; icon?: ReactNode }) {
  return (
    <div className={`flex items-start gap-3 rounded-3xl border px-5 py-4 text-sm font-black leading-7 ${tone === "success" ? "border-[#25a46d]/22 bg-[#ecfff5] text-[#17483f]" : "border-[#b45353]/18 bg-[#fff1f1] text-[#8f2c2c]"}`}>
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <span>{children}</span>
    </div>
  );
}
