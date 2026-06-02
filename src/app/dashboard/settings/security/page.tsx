import type { LucideIcon } from "lucide-react";
import {
  BellRing,
  CheckCircle2,
  Clock3,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  MessagesSquare,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  UserCog,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import {
  BackToSettingsLink,
  SettingsPageShell,
  SettingsSecondaryLink,
} from "@/components/dashboard/settings/settings-page-shell";
import { SecurityPasswordForm } from "@/components/dashboard/settings/security-password-form";
import { createTenantUserAction } from "@/lib/actions/security-actions";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/date/jalali";
import { toPersianDigits } from "@/lib/date/jalali";
import {
  getNotificationChannelLabel,
  getNotificationStatusLabel,
} from "@/lib/notifications/constants";
import { getPrisma } from "@/lib/prisma";

const roleLabels = {
  OWNER: "مالک",
  ADMIN: "مدیر",
  STAFF: "کاربر",
} as const;

const userStatusLabels = {
  ACTIVE: "فعال",
  INVITED: "دعوت‌شده",
  SUSPENDED: "تعلیق‌شده",
} as const;

const recommendations = [
  "رمز عبور قوی و غیرتکراری استفاده کنید.",
  "اعلان‌های امنیتی تلگرام را برای مدیر فعال کنید.",
  "دسترسی مدیران را به افراد ضروری محدود کنید.",
  "پس از پایان کار، از حساب کاربری خارج شوید.",
  "کلیدهای API و توکن‌های تلگرام را در اختیار دیگران قرار ندهید.",
];

type SecuritySettingsPageProps = {
  searchParams?: Promise<{ createUser?: string }>;
};

export default async function SecuritySettingsPage({ searchParams }: SecuritySettingsPageProps) {
  const notice = (await searchParams) ?? {};
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const tenantId = membership.tenantId;

  const [user, tenantMembers, telegramSetting, smsSetting, securityLogs, securityLogCount] =
    await Promise.all([
      db.user.findUnique({
        where: { id: membership.userId },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          passwordHash: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.tenantMember.findMany({
        where: { tenantId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
              lastLoginAt: true,
              updatedAt: true,
            },
          },
        },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      }),
      db.telegramIntegrationSetting.findUnique({
        where: { tenantId },
        select: {
          isEnabled: true,
          sendSecurityEvents: true,
          chatTitle: true,
          chatId: true,
          lastSuccessAt: true,
          lastErrorAt: true,
          lastErrorMessage: true,
        },
      }),
      db.smsIntegrationSetting.findUnique({
        where: { tenantId },
        select: {
          isEnabled: true,
          managerMobile: true,
          lastSuccessAt: true,
          lastErrorAt: true,
          lastErrorMessage: true,
        },
      }),
      db.notificationLog.findMany({
        where: { tenantId, eventType: "SECURITY_EVENT" },
        select: {
          id: true,
          channel: true,
          status: true,
          title: true,
          message: true,
          errorMessage: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.notificationLog.count({
        where: { tenantId, eventType: "SECURITY_EVENT" },
      }),
    ]);

  const currentRoleLabel = roleLabels[membership.role];
  const passwordStatus = user?.passwordHash ? "فعال" : "ثبت نشده";
  const securityAlertsEnabled = Boolean(
    telegramSetting?.isEnabled && telegramSetting.sendSecurityEvents,
  );
  const telegramAlertStatus = securityAlertsEnabled
    ? "فعال"
    : telegramSetting?.isEnabled
      ? "غیرفعال"
      : "نیازمند اتصال";

  return (
    <SettingsPageShell
      title="تنظیمات امنیتی"
      subtitle="امنیت حساب، نشست‌های فعال، دسترسی مدیران و اعلان‌های حساس سامانه را از این بخش مدیریت کنید."
      badge="امنیت سامانه"
      tenantName={membership.tenant.name}
      actions={
        <>
          <SettingsSecondaryLink href="/dashboard/settings/notifications">
            تنظیمات اعلان‌ها
          </SettingsSecondaryLink>
          <BackToSettingsLink />
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatusCard
          icon={LockKeyhole}
          title="وضعیت رمز عبور"
          value={passwordStatus}
          description={user?.passwordHash ? "ورود با رمز عبور فعال است." : "برای این حساب رمز عبور محلی ثبت نشده است."}
          tone={user?.passwordHash ? "success" : "warning"}
        />
        <StatusCard
          icon={Smartphone}
          title="نشست‌های فعال"
          value="قابل بررسی"
          description="نشست فعلی از مسیر خروج حساب مدیریت می‌شود."
          tone="warning"
        />
        <StatusCard
          icon={BellRing}
          title="اعلان‌های امنیتی"
          value={securityAlertsEnabled ? "فعال" : telegramAlertStatus}
          description="مسیر اصلی اعلان امنیتی، تلگرام مدیریتی است."
          tone={securityAlertsEnabled ? "success" : "warning"}
        />
        <StatusCard
          icon={UserCog}
          title="سطح دسترسی شما"
          value={currentRoleLabel}
          description={`فضای کاری ${membership.tenant.name}`}
          tone={membership.role === "OWNER" ? "success" : "neutral"}
        />
        <StatusCard
          icon={Clock3}
          title="آخرین ورود"
          value={formatValue(formatJalaliDateTime(user?.lastLoginAt))}
          description="بر اساس آخرین ورود موفق حساب"
          tone="neutral"
        />
      </div>

      {notice.createUser ? <CreateUserNotice code={notice.createUser} /> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="space-y-5">
          <SecurityPanel
            icon={KeyRound}
            eyebrow="مدیریت رمز عبور"
            title="تغییر رمز عبور"
            description="رمز عبور جدید فقط پس از تأیید رمز فعلی و هش‌سازی امن ذخیره می‌شود."
          >
            {user?.passwordHash ? (
              <SecurityPasswordForm />
            ) : (
              <ActionStateCard
                icon={LockKeyhole}
                title="تغییر رمز عبور برای این حساب فعال نیست"
                description="برای این حساب رمز عبور محلی ثبت نشده است. تنظیمات هویتی حساب را از مرکز حساب کاربری بررسی کنید."
                href="/dashboard/account"
                cta="رفتن به حساب کاربری"
              />
            )}
          </SecurityPanel>

          <SecurityPanel
            icon={Smartphone}
            eyebrow="نشست‌های فعال"
            title="مدیریت دستگاه‌ها و نشست‌ها"
            description="فهرست جداگانه دستگاه‌ها در سامانه ذخیره نمی‌شود؛ بنابراین داده ساختگی برای نشست‌ها نمایش داده نمی‌شود."
          >
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff8ea]/78 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
                    <Fingerprint size={20} />
                  </span>
                  <div>
                    <h3 className="font-black text-[#111827]">نشست جاری مرورگر</h3>
                    <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
                      برای پایان دادن به نشست فعلی، از حساب خارج شوید. لغو دسترسی
                      تک‌تک دستگاه‌ها نیازمند مرکز اختصاصی مدیریت دستگاه‌هاست و
                      در حال حاضر از این صفحه انجام نمی‌شود.
                    </p>
                    <p className="mt-2 text-xs font-black text-[#7d6841]">
                      آخرین ورود موفق: {formatValue(formatJalaliDateTime(user?.lastLoginAt))}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <LogoutButton />
                <Link
                  href="/dashboard/account"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#d8c08b]/64 bg-[#fff8ea]/82 px-4 py-2 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"
                >
                  بررسی حساب کاربری
                </Link>
              </div>
            </div>
          </SecurityPanel>

          <SecurityPanel
            icon={UsersRound}
            eyebrow="کنترل دسترسی"
            title="دسترسی مدیران"
            description="اعضای فضای کاری، نقش فعلی و ساخت حساب کاربری جدید فقط با دسترسی مالک مدیریت می‌شود."
          >
            <div className="grid gap-3">
              {tenantMembers.map((member) => (
                <MemberRow
                  key={member.id}
                  name={member.user.name ?? "بدون نام"}
                  email={member.user.email}
                  role={roleLabels[member.role]}
                  status={userStatusLabels[member.user.status]}
                  lastActive={member.user.lastLoginAt}
                  isCurrentUser={member.user.id === user?.id}
                />
              ))}
            </div>
            {membership.role === "OWNER" ? (
              <CreateTenantUserForm />
            ) : (
              <div className="mt-4 rounded-[1.35rem] border border-[#c7a15a]/34 bg-[#c7a15a]/10 p-4 text-center text-sm font-bold leading-7 text-[#7d6841]">
                ساخت حساب کاربری و تغییر نقش‌ها فقط برای مالک نمایش داده می‌شود.
                این بخش برای کاربران غیرمالک فقط نمای بررسی اعضاست.
              </div>
            )}
          </SecurityPanel>

          <SecurityPanel
            icon={BellRing}
            eyebrow="اعلان‌های حساس"
            title="اعلان فعالیت‌های امنیتی"
            description="برای رویدادهایی مانند تغییر رمز عبور و تغییرات حساس، مسیر اعلان مدیریتی را بررسی کنید."
          >
            <div className="grid gap-3 lg:grid-cols-2">
              <ChannelStatusCard
                title="تلگرام"
                status={telegramAlertStatus}
                description="اعلان تغییر رمز عبور و رویدادهای امنیتی از این کانال ارسال می‌شوند."
                detail={
                  telegramSetting?.chatTitle
                    ? `گیرنده: ${telegramSetting.chatTitle}`
                    : telegramSetting?.chatId
                      ? "گیرنده تلگرام ثبت شده است."
                      : "گیرنده تلگرام ثبت نشده است."
                }
                href="/dashboard/settings/telegram"
                cta="تنظیم تلگرام"
                active={securityAlertsEnabled}
              />
              <ChannelStatusCard
                title="پیامک"
                status={smsSetting?.isEnabled ? "فعال برای اعلان‌های عمومی" : "نیازمند اتصال"}
                description="تنظیم امنیتی جداگانه برای پیامک در مدل فعلی وجود ندارد؛ کانال تلگرام مسیر اصلی رویداد امنیتی است."
                detail={
                  smsSetting?.managerMobile
                    ? `شماره مدیر: ${toPersianDigits(smsSetting.managerMobile)}`
                    : "شماره مدیر ثبت نشده است."
                }
                href="/dashboard/settings/sms"
                cta="تنظیم پیامک"
                active={Boolean(smsSetting?.isEnabled)}
              />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {[
                "اعلان ورود موفق مدیر",
                "اعلان تلاش ناموفق ورود",
                "اعلان تغییر رمز عبور",
                "اعلان تغییر تنظیمات تلگرام/پیامک",
                "اعلان تغییر تنظیمات قرارداد",
                "اعلان غیرفعال شدن اعلان‌ها",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-2xl border border-[#d8c08b]/55 bg-white/55 px-3 py-2 text-xs font-black text-[#111827]"
                >
                  <CheckCircle2 size={15} className="shrink-0 text-[#17483f]" />
                  {item}
                </div>
              ))}
            </div>
            <Link
              href="/dashboard/settings/notifications"
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#111827] bg-[#111827] px-4 py-2 text-sm font-black text-[#fff8ea]"
            >
              <MessagesSquare size={16} />
              تنظیم کانال‌های اعلان
            </Link>
          </SecurityPanel>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24">
          <SecurityPanel
            icon={ShieldAlert}
            eyebrow="سوابق امنیتی"
            title="آخرین فعالیت‌های امنیتی"
            description={`${toPersianDigits(securityLogCount)} رویداد امنیتی ثبت شده است.`}
            compact
          >
            {securityLogs.length > 0 ? (
              <div className="grid gap-3">
                {securityLogs.map((log) => (
                  <SecurityLogRow
                    key={log.id}
                    channel={log.channel}
                    status={log.status}
                    title={log.title ?? "رویداد امنیتی"}
                    message={log.message}
                    errorMessage={log.errorMessage}
                    createdAt={log.createdAt}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-[#d8c08b]/70 bg-white/55 p-4 text-sm font-bold leading-7 text-[#6d5f49]">
                هنوز فعالیت امنیتی مهمی ثبت نشده است.
              </p>
            )}
            <Link
              href="/dashboard/settings/notification-logs?eventType=SECURITY_EVENT"
              className="mt-4 inline-flex w-full min-h-11 items-center justify-center rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-2 text-sm font-black text-[#4a3514]"
            >
              مشاهده لاگ اعلان‌ها
            </Link>
          </SecurityPanel>

          <SecurityPanel
            icon={ShieldCheck}
            eyebrow="حفاظت حساب"
            title="پیشنهادهای امنیتی"
            description="این موارد را برای کاهش ریسک دسترسی غیرمجاز رعایت کنید."
            compact
          >
            <div className="grid gap-2">
              {recommendations.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2 rounded-2xl border border-[#d8c08b]/55 bg-white/55 px-3 py-2 text-sm font-bold leading-7 text-[#6d5f49]"
                >
                  <CheckCircle2 size={16} className="mt-1 shrink-0 text-[#17483f]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </SecurityPanel>
        </aside>
      </div>
    </SettingsPageShell>
  );
}

function formatValue(value: string) {
  return value === "—" ? "ثبت نشده" : value;
}

function CreateUserNotice({ code }: { code: string }) {
  const messages: Record<string, { title: string; message: string; tone: "success" | "warning" }> = {
    created: {
      title: "حساب کاربری ساخته شد",
      message: "کاربر جدید به فضای کاری اضافه شد و لاگ امنیتی آن ثبت شد.",
      tone: "success",
    },
    invalid: {
      title: "اطلاعات حساب معتبر نیست",
      message: "ایمیل، رمز عبور یا نقش انتخاب‌شده معتبر نیست. رمز عبور باید حداقل ۸ کاراکتر باشد.",
      tone: "warning",
    },
    "already-member": {
      title: "این کاربر قبلاً عضو است",
      message: "این ایمیل همین حالا در فضای کاری فعلی عضویت دارد.",
      tone: "warning",
    },
    "email-exists": {
      title: "ایمیل در سامانه وجود دارد",
      message: "این ایمیل قبلاً برای حساب دیگری ثبت شده است و اتصال امن چندفضایی برای آن مجاز نیست.",
      tone: "warning",
    },
  };
  const item = messages[code] ?? messages.invalid;

  return (
    <div
      className={`rounded-[1.35rem] border p-4 text-center text-sm font-black leading-7 ${
        item.tone === "success"
          ? "border-[#25a46d]/22 bg-[#f1fbf5] text-[#17483f]"
          : "border-[#c7a15a]/38 bg-[#fff7e6] text-[#7d6841]"
      }`}
    >
      <p className="text-base font-black">{item.title}</p>
      <p className="mt-1 text-sm font-bold">{item.message}</p>
    </div>
  );
}

function CreateTenantUserForm() {
  return (
    <form
      action={createTenantUserAction}
      className="mt-4 rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff8ea]/78 p-4 text-center"
    >
      <p className="text-base font-black text-[#111827]">ساخت حساب کاربری</p>
      <p className="mx-auto mt-1 max-w-2xl text-xs font-bold leading-6 text-[#7d6841]">
        ساخت کاربر فقط برای مالک فعال است. نقش‌ها بر اساس schema فعلی سامانه محدود به مالک، مدیر و کاربر هستند.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-right text-xs font-black text-[#111827]">
          نام کاربر
          <input
            name="name"
            placeholder="نام و نام خانوادگی"
            className="min-h-11 rounded-2xl border border-[#d8c08b]/65 bg-white/85 px-3 text-sm font-bold outline-none focus:border-[#c7a15a]"
          />
        </label>
        <label className="grid gap-2 text-right text-xs font-black text-[#111827]">
          ایمیل ورود
          <input
            name="email"
            type="email"
            required
            placeholder="user@example.com"
            className="min-h-11 rounded-2xl border border-[#d8c08b]/65 bg-white/85 px-3 text-left text-sm font-bold outline-none focus:border-[#c7a15a]"
          />
        </label>
        <label className="grid gap-2 text-right text-xs font-black text-[#111827]">
          رمز عبور اولیه
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="حداقل ۸ کاراکتر"
            className="min-h-11 rounded-2xl border border-[#d8c08b]/65 bg-white/85 px-3 text-sm font-bold outline-none focus:border-[#c7a15a]"
          />
        </label>
        <label className="grid gap-2 text-right text-xs font-black text-[#111827]">
          نقش
          <select
            name="role"
            defaultValue="STAFF"
            className="min-h-11 rounded-2xl border border-[#d8c08b]/65 bg-white/85 px-3 text-sm font-black outline-none focus:border-[#c7a15a]"
          >
            <option value="STAFF">کاربر</option>
            <option value="ADMIN">مدیر</option>
            <option value="OWNER">مالک</option>
          </select>
        </label>
      </div>
      <button
        type="submit"
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-[#111827] bg-[#111827] px-4 py-2 text-sm font-black text-[#fff8ea] md:w-auto"
      >
        ساخت حساب کاربری
      </button>
    </form>
  );
}

function StatusCard({
  icon: Icon,
  title,
  value,
  description,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  description: string;
  tone: "success" | "warning" | "neutral";
}) {
  const toneClass =
    tone === "success"
      ? "border-[#25a46d]/22 bg-[#25a46d]/9 text-[#17483f]"
      : tone === "warning"
        ? "border-[#c7a15a]/38 bg-[#c7a15a]/10 text-[#7d6841]"
        : "border-[#d8c08b]/62 bg-white/55 text-[#111827]";

  return (
    <article className="rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_14px_44px_rgba(17,24,39,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
          <Icon size={18} />
        </span>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${toneClass}`}>
          {value}
        </span>
      </div>
      <h2 className="mt-4 text-sm font-black text-[#111827]">{title}</h2>
      <p className="mt-2 text-xs font-bold leading-6 text-[#6d5f49]">
        {description}
      </p>
    </article>
  );
}

function SecurityPanel({
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
  compact,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={`rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] ${compact ? "p-4" : "p-4 sm:p-6"}`}>
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#c7a15a]/35 bg-[#c7a15a]/10 text-[#17483f]">
          <Icon size={20} />
        </span>
        <div>
          <p className="text-xs font-black text-[#17483f]">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-black leading-8">{title}</h2>
          <p className="mt-1 text-sm font-bold leading-7 text-[#6d5f49]">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ActionStateCard({
  icon: Icon,
  title,
  description,
  href,
  cta,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff8ea]/78 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
          <Icon size={20} />
        </span>
        <div>
          <h3 className="font-black text-[#111827]">{title}</h3>
          <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
            {description}
          </p>
          <Link
            href={href}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#111827] bg-[#111827] px-4 py-2 text-sm font-black text-[#fff8ea]"
          >
            {cta}
          </Link>
        </div>
      </div>
    </div>
  );
}

function MemberRow({
  name,
  email,
  role,
  status,
  lastActive,
  isCurrentUser,
}: {
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive: Date | null;
  isCurrentUser: boolean;
}) {
  return (
    <article className="rounded-[1.35rem] border border-[#d8c08b]/55 bg-white/55 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-[#111827]">{name}</h3>
            {isCurrentUser ? (
              <span className="rounded-full border border-[#25a46d]/22 bg-[#25a46d]/10 px-3 py-1 text-[11px] font-black text-[#17483f]">
                حساب شما
              </span>
            ) : null}
          </div>
          <p className="mt-1 break-all text-xs font-bold text-[#6d5f49]">{email}</p>
          <p className="mt-2 text-xs font-black text-[#7d6841]">
            آخرین فعالیت: {formatValue(formatJalaliDateTime(lastActive))}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <span className="rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/84 px-3 py-1 text-xs font-black text-[#7d6841]">
            {role}
          </span>
          <span className="rounded-full border border-[#25a46d]/22 bg-[#25a46d]/10 px-3 py-1 text-xs font-black text-[#17483f]">
            {status}
          </span>
          <Link
            href="/dashboard/account"
            className="rounded-full border border-[#111827]/12 bg-[#111827] px-3 py-1 text-xs font-black text-[#fff8ea]"
          >
            مشاهده
          </Link>
        </div>
      </div>
    </article>
  );
}

function ChannelStatusCard({
  title,
  status,
  description,
  detail,
  href,
  cta,
  active,
}: {
  title: string;
  status: string;
  description: string;
  detail: string;
  href: string;
  cta: string;
  active: boolean;
}) {
  return (
    <article className="rounded-[1.35rem] border border-[#d8c08b]/55 bg-white/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[#111827]">{title}</h3>
          <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
            {description}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${
            active
              ? "border-[#25a46d]/22 bg-[#25a46d]/10 text-[#17483f]"
              : "border-[#c7a15a]/34 bg-[#c7a15a]/10 text-[#7d6841]"
          }`}
        >
          {status}
        </span>
      </div>
      <p className="mt-3 rounded-2xl border border-[#d8c08b]/45 bg-[#fff8ea]/70 px-3 py-2 text-xs font-bold leading-6 text-[#7d6841]">
        {detail}
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex min-h-10 items-center justify-center rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-2 text-xs font-black text-[#4a3514]"
      >
        {cta}
      </Link>
    </article>
  );
}

function SecurityLogRow({
  channel,
  status,
  title,
  message,
  errorMessage,
  createdAt,
}: {
  channel: string;
  status: string;
  title: string;
  message: string;
  errorMessage: string | null;
  createdAt: Date;
}) {
  return (
    <article className="rounded-2xl border border-[#d8c08b]/55 bg-white/55 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[#d8b76a] bg-[#fff7e6] px-2.5 py-1 text-[11px] font-black text-[#4a3514]">
          {getNotificationChannelLabel(channel)}
        </span>
        <span className="rounded-full border border-[#d8c08b]/62 bg-white/70 px-2.5 py-1 text-[11px] font-black text-[#6d5f49]">
          {getNotificationStatusLabel(status)}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-black text-[#111827]">{title}</h3>
      <p className="mt-1 line-clamp-2 text-xs font-bold leading-6 text-[#6d5f49]">
        {message}
      </p>
      {errorMessage ? (
        <p className="mt-2 text-xs font-bold leading-6 text-[#8f2c2c]">
          {errorMessage}
        </p>
      ) : null}
      <p className="mt-2 text-xs font-black text-[#7d6841]">
        {formatJalaliDate(createdAt)} · {formatJalaliDateTime(createdAt)}
      </p>
    </article>
  );
}
