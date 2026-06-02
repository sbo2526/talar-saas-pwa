import {
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Crown,
  DoorOpen,
  Fingerprint,
  Gem,
  KeyRound,
  Layers3,
  LockKeyhole,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { AccountPersonalInfoCard } from "@/components/dashboard/account-personal-info-card";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { getCurrentTenantMember, requireUser } from "@/lib/auth/session";
import {
  formatJalaliDate,
  formatJalaliDateTime,
  formatJalaliWeekday,
} from "@/lib/date/jalali";
import { formatPersianNumber } from "@/lib/formatters";
import { getPrisma } from "@/lib/prisma";
import {
  getPlanLabel,
  getTenantStatusLabel,
  isPaidPlan,
  isPurchasedSubscription,
  resolveWorkspaceDisplayName,
  subscriptionPlanLabels,
  subscriptionStatusLabels,
} from "@/lib/subscriptions/display";
import { isPurchaseRequestReference } from "@/lib/subscriptions/plans";

const roleLabels: Record<string, string> = {
  OWNER: "مالک",
  ADMIN: "مدیر",
  STAFF: "کارمند",
};

const userStatusLabels: Record<string, string> = {
  ACTIVE: "فعال",
  INVITED: "دعوت‌شده",
  SUSPENDED: "تعلیق‌شده",
};

export default async function DashboardAccountPage() {
  const user = await requireUser();
  const db = await getPrisma();
  const membership = await getCurrentTenantMember(user.id);
  const tenantId = membership?.tenantId;

  const [demoAccess, workspaceStats, securityChannels] = await Promise.all([
    db.demoAccess.findUnique({ where: { userId: user.id } }),
    tenantId
      ? Promise.all([
          db.tenantMember.count({ where: { tenantId } }),
          db.tenantMember.count({
            where: { tenantId, role: { in: ["OWNER", "ADMIN"] } },
          }),
          db.hall.count({ where: { tenantId } }),
          db.salon.count({ where: { tenantId } }),
        ])
      : Promise.resolve([0, 0, 0, 0] as const),
    tenantId
      ? Promise.all([
          db.telegramIntegrationSetting.findUnique({
            where: { tenantId },
            select: { isEnabled: true, sendSecurityEvents: true },
          }),
          db.smsIntegrationSetting.findUnique({
            where: { tenantId },
            select: { isEnabled: true },
          }),
        ])
      : Promise.resolve([null, null] as const),
  ]);

  const [memberCount, ownerAdminCount, hallCount, salonCount] = workspaceStats;
  const [telegramSetting, smsSetting] = securityChannels;
  const subscription = membership?.tenant.subscription;
  const userName = user.name ?? "کاربر تالار منیجر";
  const roleLabel = membership
    ? labelOf(roleLabels, membership.role)
    : "بدون نقش فعال";
  const accountStatusLabel = labelOf(userStatusLabels, user.status);
  const workspaceName = resolveWorkspaceDisplayName({
    tenantName: membership?.tenant.name,
    hallProfile: membership?.tenant.hallProfile,
    ownerName: user.name ?? user.email,
    subscription,
    tenantStatus: membership?.tenant?.status,
    fallback: "فضای کاری فعال وجود ندارد",
  });
  const isPurchased = isPurchasedSubscription(subscription);
  const accountPlanLabel = getPlanLabel(subscription?.plan);
  const workspaceStatusLabel = isPurchased
    ? "فعال"
    : getTenantStatusLabel(membership?.tenant.status);
  const access = resolveAccessState({
    hasMembership: Boolean(membership),
    tenantStatus: membership?.tenant.status,
    subscriptionStatus: subscription?.status,
    subscriptionPlan: subscription?.plan,
    subscriptionStart: subscription?.currentPeriodStart,
    subscriptionEnd: subscription?.currentPeriodEnd,
    purchaseReference: subscription?.purchaseReference,
    demoStatus: demoAccess?.status,
    demoStart: demoAccess?.usedAt,
    demoEnd: demoAccess?.expiresAt,
    workspaceName,
  });
  const today = `${formatJalaliWeekday(new Date())}، ${formatJalaliDate(new Date())}`;
  const initials = getInitials(userName || user.email);
  const securityAlertsActive = Boolean(
    telegramSetting?.isEnabled && telegramSetting.sendSecurityEvents,
  );

  return (
    <section className="space-y-5 sm:space-y-7">
      <header className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2.25rem] sm:p-7 lg:p-8">
        <div className="grid gap-5 xl:grid-cols-[1fr_27rem] xl:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f] sm:px-4 sm:py-2 sm:text-sm">
              <Gem size={15} />
              مرکز مدیریت حساب
            </div>
            <h1 className="mt-4 text-2xl font-black leading-tight sm:mt-5 sm:text-4xl">
              مدیریت حساب کاربری
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:mt-4 sm:text-base sm:leading-8">
              اطلاعات شخصی، وضعیت دسترسی، اشتراک، امنیت و فضای کاری خود را از
              این بخش مدیریت کنید.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-black text-[#7d6841]">
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={16} className="text-[#9f7131]" />
                {today}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#c7a15a]" />
              <span className="truncate">{workspaceName}</span>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:p-5">
            <div className="flex items-center gap-4">
              <span className="flex size-16 shrink-0 items-center justify-center rounded-[1.35rem] border border-[#e8c478]/35 bg-[#e8c478]/10 text-2xl font-black text-[#f0dba9]">
                {initials}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-black text-[#fff9ed]">
                  {userName}
                </h2>
                <p className="mt-1 truncate text-sm font-bold text-[#d9caa9]">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="gold-divider my-4" />

            <div className="flex flex-wrap gap-2">
              <StatusPill label={roleLabel} tone="gold" />
              <StatusPill label={accountStatusLabel} tone="green" />
              <StatusPill
                label={access.typeLabel}
                tone={access.isExpired ? "rose" : "navy"}
              />
              <StatusPill
                label={`پلن فعال: ${access.planLabel}`}
                tone={isPurchased ? "green" : "gold"}
              />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link
                href="/dashboard/settings/security"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#e8c478]/24 bg-[#e8c478]/10 px-4 py-3 text-sm font-black text-[#f0dba9] transition hover:border-[#e8c478]/50"
              >
                <ShieldCheck size={17} />
                تنظیمات امنیتی
              </Link>
              <Link
                href="/dashboard/account/plans"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#f0dba9] bg-[#f0dba9] px-4 py-3 text-sm font-black text-[#111827] transition hover:bg-[#fff4cf]"
              >
                <Crown size={17} />
                {access.purchaseCta}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <OverviewCard icon={UserRound} label="نقش کاربری" value={roleLabel} />
        <OverviewCard
          icon={BadgeCheck}
          label="وضعیت حساب"
          value={accountStatusLabel}
        />
        <OverviewCard
          icon={Sparkles}
          label="وضعیت دسترسی"
          value={access.typeLabel}
        />
        <OverviewCard icon={Crown} label="پلن فعال" value={access.planLabel} />
        <OverviewCard
          icon={Building2}
          label="فضای کاری فعال"
          value={workspaceName}
        />
        <OverviewCard
          icon={Clock3}
          label="آخرین ورود"
          value={formatJalaliDateTime(user.lastLoginAt)}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-5">
          <AccessPanel access={access} workspaceName={workspaceName} />
          <WorkspacePanel
            hasWorkspace={Boolean(membership)}
            tenantName={workspaceName}
            tenantStatus={workspaceStatusLabel}
            roleLabel={roleLabel}
            planLabel={accountPlanLabel}
            accessTypeLabel={access.typeLabel}
            memberCount={memberCount}
            ownerAdminCount={ownerAdminCount}
            hallCount={hallCount}
            salonCount={salonCount}
          />
          <SecurityPanel
            hasPassword={Boolean(user.passwordHash)}
            lastLoginAt={formatJalaliDateTime(user.lastLoginAt)}
            securityAlertsActive={securityAlertsActive}
            smsEnabled={Boolean(smsSetting?.isEnabled)}
          />
        </div>

        <div className="space-y-5">
          <AccountPersonalInfoCard
            name={user.name ?? ""}
            phone={user.phone ?? ""}
            nationalCode={user.nationalCode ?? ""}
            address={user.address ?? ""}
            postalCode={user.postalCode ?? ""}
          />
          <VerificationPanel
            accountStatus={accountStatusLabel}
            hasPhone={Boolean(user.phone)}
            phoneVerified={Boolean(user.phoneVerifiedAt)}
            emailVerified={Boolean(user.emailVerifiedAt)}
            hasNationalCode={Boolean(user.nationalCode)}
            hasAddress={Boolean(user.address && user.postalCode)}
          />
          <SystemInfoPanel
            email={user.email}
            accountId={user.id}
            createdAt={formatJalaliDate(user.createdAt)}
            updatedAt={formatJalaliDateTime(user.updatedAt)}
            lastLoginAt={formatJalaliDateTime(user.lastLoginAt)}
            activationStatus={
              user.emailVerifiedAt ? "ایمیل تأیید شده" : "در انتظار تأیید ایمیل"
            }
            accountStatus={accountStatusLabel}
          />
        </div>
      </div>
    </section>
  );
}

function OverviewCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <article className="flex min-h-28 flex-col justify-between rounded-[1.5rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_14px_44px_rgba(17,24,39,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black text-[#7d6841]">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
          <Icon size={17} />
        </span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm font-black leading-6 text-[#111827]">
        {value}
      </p>
    </article>
  );
}

function AccessPanel({
  access,
  workspaceName,
}: {
  access: AccessState;
  workspaceName: string;
}) {
  return (
    <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
      <SectionHeader
        eyebrow="دسترسی"
        title="دسترسی و اشتراک"
        description={access.message}
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <InfoTile icon={Sparkles} label="نوع دسترسی" value={access.typeLabel} />
        <InfoTile icon={BadgeCheck} label="وضعیت" value={access.statusLabel} />
        <InfoTile
          icon={CalendarDays}
          label="تاریخ شروع"
          value={access.startLabel}
        />
        <InfoTile icon={Clock3} label="تاریخ پایان" value={access.endLabel} />
        <InfoTile
          icon={BarChart3}
          label="روزهای باقی‌مانده"
          value={access.remainingLabel}
        />
        <InfoTile icon={Crown} label="نوع پلن" value={access.planLabel} />
      </div>

      {access.progress !== null ? (
        <div className="mt-5 rounded-[1.5rem] border border-[#c7a15a]/28 bg-[#c7a15a]/10 p-4">
          <div className="flex items-center justify-between gap-3 text-xs font-black text-[#7d6841]">
            <span>پیشرفت دوره دسترسی</span>
            <span>{formatPersianNumber(access.progress)}٪</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#d8c08b]/35">
            <div
              className="h-full rounded-full bg-[#17483f]"
              style={{ width: `${access.progress}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/dashboard/account/plans"
          className="btn-luxury-dark px-5 py-3"
        >
          {access.purchaseCta}
        </Link>
        <Link
          href="/dashboard"
          className="btn-luxury-secondary px-5 py-3 !text-[#111827]"
        >
          بازگشت به داشبورد
        </Link>
      </div>

      <p className="mt-4 text-xs font-bold leading-6 text-[#7d6841]">
        فضای کاری:{" "}
        <span className="font-black text-[#111827]">{workspaceName}</span>
      </p>
    </section>
  );
}

function WorkspacePanel({
  hasWorkspace,
  tenantName,
  tenantStatus,
  roleLabel,
  planLabel,
  accessTypeLabel,
  memberCount,
  ownerAdminCount,
  hallCount,
  salonCount,
}: {
  hasWorkspace: boolean;
  tenantName: string;
  tenantStatus: string;
  roleLabel: string;
  planLabel: string;
  accessTypeLabel: string;
  memberCount: number;
  ownerAdminCount: number;
  hallCount: number;
  salonCount: number;
}) {
  return (
    <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
      <SectionHeader
        eyebrow="فضای کاری"
        title="فضای کاری و دسترسی‌ها"
        description={
          hasWorkspace
            ? "دسترسی شما به فضای عملیاتی تالار و تعاریف پایه از این عضویت خوانده می‌شود."
            : "برای شروع استفاده از داشبورد، یک فضای کاری فعال نیاز است."
        }
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <InfoTile icon={Building2} label="نام فضای کاری" value={tenantName} />
        <InfoTile icon={Crown} label="پلن فعال" value={planLabel} />
        <InfoTile icon={Sparkles} label="نوع دسترسی" value={accessTypeLabel} />
        <InfoTile icon={ShieldCheck} label="نقش کاربر" value={roleLabel} />
        <InfoTile
          icon={Users}
          label="اعضای فضا"
          value={`${formatPersianNumber(memberCount)} عضو`}
        />
        <InfoTile
          icon={LockKeyhole}
          label="مدیران و مالک"
          value={`${formatPersianNumber(ownerAdminCount)} نفر`}
        />
        <InfoTile
          icon={Layers3}
          label="تالارها"
          value={`${formatPersianNumber(hallCount)} تالار`}
        />
        <InfoTile
          icon={DoorOpen}
          label="سالن‌ها"
          value={`${formatPersianNumber(salonCount)} سالن`}
        />
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link href="/dashboard/hall-info" className="btn-luxury-dark px-5 py-3">
          مدیریت اطلاعات تالار
        </Link>
        <span className="inline-flex items-center justify-center rounded-2xl border border-[#25a46d]/22 bg-[#25a46d]/10 px-4 py-3 text-sm font-black text-[#17483f]">
          {tenantStatus}
        </span>
      </div>
    </section>
  );
}

function SecurityPanel({
  hasPassword,
  lastLoginAt,
  securityAlertsActive,
  smsEnabled,
}: {
  hasPassword: boolean;
  lastLoginAt: string;
  securityAlertsActive: boolean;
  smsEnabled: boolean;
}) {
  return (
    <section className="rounded-[1.75rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:rounded-[2rem] sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#e8c478]/30 bg-[#e8c478]/10 text-[#f0dba9]">
          <ShieldCheck size={21} />
        </span>
        <div>
          <p className="text-xs font-black text-[#f0dba9]">امنیت حساب</p>
          <h2 className="mt-1 text-xl font-black sm:text-2xl">
            خلاصه محافظت حساب
          </h2>
          <p className="mt-2 text-sm font-bold leading-7 text-[#d9caa9]">
            برای تغییر رمز عبور، بررسی نشست‌ها و اعلان‌های امنیتی، وارد بخش
            تنظیمات امنیتی شوید.
          </p>
        </div>
      </div>

      <div className="gold-divider my-5" />

      <div className="grid gap-3 sm:grid-cols-2">
        <DarkInfoTile
          icon={KeyRound}
          label="وضعیت رمز عبور"
          value={hasPassword ? "قابل مدیریت" : "نیازمند تکمیل"}
        />
        <DarkInfoTile icon={Clock3} label="آخرین ورود" value={lastLoginAt} />
        <DarkInfoTile
          icon={ShieldCheck}
          label="اعلان‌های امنیتی"
          value={
            securityAlertsActive
              ? "فعال"
              : smsEnabled
                ? "نیازمند تنظیم امنیتی"
                : "غیرفعال"
          }
        />
        <DarkInfoTile
          icon={Users}
          label="نشست‌های فعال"
          value="مدیریت از بخش امنیت"
        />
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link
          href="/dashboard/settings/security"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#e8c478]/24 bg-[#e8c478]/10 px-4 py-3 text-sm font-black text-[#f0dba9] transition hover:border-[#e8c478]/50"
        >
          <ShieldCheck size={17} />
          مدیریت امنیت
        </Link>
        <div className="flex min-h-12 items-center justify-center rounded-2xl border border-white/[0.10] bg-white/[0.055] px-4 py-3">
          <LogOut size={17} className="ml-2 text-[#f0dba9]" />
          <LogoutButton />
        </div>
      </div>
    </section>
  );
}

function VerificationPanel({
  accountStatus,
  hasPhone,
  phoneVerified,
  emailVerified,
  hasNationalCode,
  hasAddress,
}: {
  accountStatus: string;
  hasPhone: boolean;
  phoneVerified: boolean;
  emailVerified: boolean;
  hasNationalCode: boolean;
  hasAddress: boolean;
}) {
  return (
    <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeader
          eyebrow="تکمیل اطلاعات"
          title="وضعیت تکمیل و تأیید اطلاعات"
          description="این بخش فقط وضعیت تکمیل را نشان می‌دهد و مقادیر کامل اطلاعات شخصی را تکرار نمی‌کند."
        />
        <a
          href="#personal-info"
          className="inline-flex items-center justify-center rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-2.5 text-sm font-black text-[#4a3514] transition hover:bg-[#f4dfaa] hover:text-[#111827]"
        >
          تکمیل اطلاعات
        </a>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <VerificationItem
          icon={Phone}
          label="شماره موبایل"
          value={
            phoneVerified ? "تأییدشده" : hasPhone ? "ثبت‌شده" : "نیازمند تکمیل"
          }
          complete={hasPhone}
        />
        <VerificationItem
          icon={Mail}
          label="ایمیل"
          value={emailVerified ? "تأییدشده" : "در انتظار تأیید"}
          complete={emailVerified}
        />
        <VerificationItem
          icon={Fingerprint}
          label="کد ملی"
          value={hasNationalCode ? "ثبت‌شده" : "نیازمند تکمیل"}
          complete={hasNationalCode}
        />
        <VerificationItem
          icon={Building2}
          label="آدرس و کد پستی"
          value={hasAddress ? "تکمیل‌شده" : "ناقص"}
          complete={hasAddress}
        />
        <VerificationItem
          icon={BadgeCheck}
          label="وضعیت حساب"
          value={accountStatus}
          complete={accountStatus === "فعال"}
        />
      </div>
    </section>
  );
}

function SystemInfoPanel({
  email,
  accountId,
  createdAt,
  updatedAt,
  lastLoginAt,
  activationStatus,
  accountStatus,
}: {
  email: string;
  accountId: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  activationStatus: string;
  accountStatus: string;
}) {
  return (
    <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
      <SectionHeader
        eyebrow="اطلاعات سیستمی"
        title="اطلاعات سیستمی حساب"
        description="این اطلاعات خواندنی هستند و برای پیگیری‌های پشتیبانی و امنیت حساب استفاده می‌شوند."
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <InfoTile icon={Mail} label="ایمیل حساب" value={email} />
        <InfoTile
          icon={Fingerprint}
          label="شناسه حساب"
          value={`…${accountId.slice(-8)}`}
        />
        <InfoTile icon={CalendarDays} label="تاریخ عضویت" value={createdAt} />
        <InfoTile icon={Clock3} label="آخرین ورود" value={lastLoginAt} />
        <InfoTile
          icon={CheckCircle2}
          label="آخرین بروزرسانی"
          value={updatedAt}
        />
        <InfoTile
          icon={BadgeCheck}
          label="وضعیت فعال‌سازی"
          value={activationStatus}
        />
        <InfoTile icon={ShieldCheck} label="وضعیت حساب" value={accountStatus} />
      </div>
    </section>
  );
}

function SectionHeader({
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
      <h2 className="mt-1 text-xl font-black sm:text-2xl">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 p-3.5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black text-[#7d6841]">{label}</p>
          <p className="mt-1 break-words text-sm font-black leading-6 text-[#111827]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function DarkInfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.10] bg-white/[0.055] p-3.5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#e8c478]/10 text-[#f0dba9]">
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black text-[#d9caa9]">{label}</p>
          <p className="mt-1 break-words text-sm font-black leading-6 text-[#fff9ed]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function VerificationItem({
  icon: Icon,
  label,
  value,
  complete,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  complete: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 p-3.5">
      <div className="flex items-start gap-3">
        <span
          className={
            complete
              ? "flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#25a46d]/12 text-[#17483f]"
              : "flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#c7a15a]/14 text-[#7d6841]"
          }
        >
          <Icon size={17} />
        </span>
        <div>
          <p className="text-xs font-black text-[#7d6841]">{label}</p>
          <p className="mt-1 text-sm font-black leading-6 text-[#111827]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "gold" | "navy" | "rose";
}) {
  const className =
    tone === "green"
      ? "border-[#25a46d]/30 bg-[#25a46d]/12 text-[#a9f2cf]"
      : tone === "gold"
        ? "border-[#e8c478]/35 bg-[#e8c478]/10 text-[#f0dba9]"
        : tone === "rose"
          ? "border-[#ffb4b4]/28 bg-[#ffb4b4]/10 text-[#ffd4d4]"
          : "border-white/[0.12] bg-white/[0.06] text-[#fff9ed]";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black ${className}`}
    >
      {label}
    </span>
  );
}

type AccessState = {
  typeLabel: string;
  statusLabel: string;
  planLabel: string;
  startLabel: string;
  endLabel: string;
  remainingLabel: string;
  message: string;
  purchaseCta: string;
  progress: number | null;
  isExpired: boolean;
};

function resolveAccessState({
  hasMembership,
  tenantStatus,
  subscriptionStatus,
  subscriptionPlan,
  subscriptionStart,
  subscriptionEnd,
  purchaseReference,
  demoStatus,
  demoStart,
  demoEnd,
  workspaceName,
}: {
  hasMembership: boolean;
  tenantStatus?: string;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  subscriptionStart?: Date | null;
  subscriptionEnd?: Date | null;
  purchaseReference?: string | null;
  demoStatus?: string;
  demoStart?: Date | null;
  demoEnd?: Date | null;
  workspaceName: string;
}): AccessState {
  const hasPaidPlan = isPaidPlan({
    plan: subscriptionPlan,
    status: subscriptionStatus,
  });
  const isDemo =
    !hasPaidPlan &&
    (tenantStatus === "DEMO" ||
      subscriptionPlan === "DEMO" ||
      demoStatus === "USED");
  const isSubscriptionActive =
    hasPaidPlan &&
    (subscriptionStatus === "ACTIVE" || subscriptionStatus === "TRIALING");
  const isPurchasePending = isPurchaseRequestReference(purchaseReference);
  const isExpired =
    !isPurchasePending &&
    (subscriptionStatus === "EXPIRED" ||
      subscriptionStatus === "CANCELED" ||
      subscriptionStatus === "PAST_DUE" ||
      demoStatus === "EXPIRED" ||
      isPast(subscriptionEnd ?? demoEnd));
  const startDate = subscriptionStart ?? demoStart ?? null;
  const endDate = subscriptionEnd ?? demoEnd ?? null;
  const totalDays = getDateDiffDays(startDate, endDate);
  const remainingDays = getRemainingDays(endDate);
  const progress =
    totalDays && remainingDays !== null
      ? clamp(
          Math.round(
            ((totalDays - Math.max(remainingDays, 0)) / totalDays) * 100,
          ),
          0,
          100,
        )
      : null;

  if (isPurchasePending) {
    return {
      typeLabel: "درخواست خرید",
      statusLabel: "در انتظار پیگیری",
      planLabel: labelOf(subscriptionPlanLabels, subscriptionPlan),
      startLabel: formatJalaliDate(startDate),
      endLabel: "پس از فعال‌سازی تعیین می‌شود",
      remainingLabel: "در انتظار پاسخ پشتیبانی",
      message:
        "درخواست خرید پلن ثبت شده و ادامه هماهنگی از طریق تیکت انجام می‌شود.",
      purchaseCta: "انتخاب یا تغییر پلن",
      progress: null,
      isExpired: false,
    };
  }

  if (!hasMembership) {
    return {
      typeLabel: "بدون دسترسی",
      statusLabel:
        demoStatus === "AVAILABLE" ? "دوره بررسی قابل فعال‌سازی" : "نیازمند فعال‌سازی",
      planLabel: "بدون پلن",
      startLabel: "ثبت نشده",
      endLabel: "ثبت نشده",
      remainingLabel: "نیازمند فعال‌سازی",
      message:
        "برای استفاده از داشبورد عملیاتی، دوره بررسی را فعال کنید یا اشتراک تهیه کنید.",
      purchaseCta: "مشاهده پلن‌ها",
      progress: null,
      isExpired: false,
    };
  }

  if (isDemo) {
    return {
      typeLabel: "دوره بررسی",
      statusLabel: isExpired ? "منقضی‌شده" : "فعال",
      planLabel: subscriptionPlan
        ? labelOf(subscriptionPlanLabels, subscriptionPlan)
        : "دوره بررسی",
      startLabel: formatJalaliDate(startDate),
      endLabel: formatJalaliDate(endDate),
      remainingLabel: formatRemainingDays(endDate),
      message: `فضای بررسی برای ${workspaceName} فعال است. برای ادامه استفاده پس از پایان این دوره، اشتراک خود را فعال کنید.`,
      purchaseCta: isExpired ? "تمدید اشتراک" : "مشاهده پلن‌ها",
      progress,
      isExpired,
    };
  }

  if (isSubscriptionActive) {
    return {
      typeLabel: "اشتراک فعال",
      statusLabel: labelOf(subscriptionStatusLabels, subscriptionStatus),
      planLabel: labelOf(subscriptionPlanLabels, subscriptionPlan),
      startLabel: formatJalaliDate(startDate),
      endLabel: formatJalaliDate(endDate),
      remainingLabel: formatRemainingDays(endDate),
      message: "اشتراک شما فعال است و دسترسی عملیاتی فضای کاری برقرار است.",
      purchaseCta: "مدیریت اشتراک",
      progress,
      isExpired: false,
    };
  }

  return {
    typeLabel: isExpired ? "اشتراک منقضی‌شده" : "دسترسی فعال",
    statusLabel: subscriptionStatus
      ? labelOf(subscriptionStatusLabels, subscriptionStatus)
      : getTenantStatusLabel(tenantStatus),
    planLabel: labelOf(subscriptionPlanLabels, subscriptionPlan),
    startLabel: formatJalaliDate(startDate),
    endLabel: formatJalaliDate(endDate),
    remainingLabel: formatRemainingDays(endDate),
    message: isExpired
      ? "دسترسی شما منقضی شده است. برای ادامه استفاده، اشتراک را تمدید کنید."
      : "دسترسی شما به فضای کاری برقرار است.",
    purchaseCta: isExpired ? "تمدید اشتراک" : "مشاهده پلن‌ها",
    progress,
    isExpired,
  };
}

function labelOf(labels: Record<string, string>, value?: string | null) {
  return value ? (labels[value] ?? "ثبت نشده") : "ثبت نشده";
}

function normalizeDate(value: Date | string | number | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isPast(value: Date | string | number | null | undefined) {
  const date = normalizeDate(value);
  return date ? date.getTime() < Date.now() : false;
}

function getDateDiffDays(
  start: Date | string | number | null | undefined,
  end: Date | string | number | null | undefined,
) {
  const startDate = normalizeDate(start);
  const endDate = normalizeDate(end);
  if (!startDate || !endDate) return null;
  return Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000),
  );
}

function getRemainingDays(value: Date | string | number | null | undefined) {
  const date = normalizeDate(value);
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

function formatRemainingDays(value: Date | string | number | null | undefined) {
  const days = getRemainingDays(value);
  if (days === null) return "ثبت نشده";
  if (days <= 0) return "پایان‌یافته";
  return `${formatPersianNumber(days)} روز`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getInitials(value: string) {
  const normalized = value.trim();
  if (!normalized) return "ت‌م";
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return `${Array.from(parts[0] ?? "ت")[0] ?? "ت"}${
      Array.from(parts[1] ?? "م")[0] ?? "م"
    }`;
  }
  return Array.from(normalized).slice(0, 2).join("");
}
