import Link from "next/link";
import { startDemoAction } from "@/lib/actions/auth-actions";
import { getCurrentTenantMember, requireUser } from "@/lib/auth/session";
import { formatJalaliDate } from "@/lib/date/jalali";
import {
  getPlanLabel,
  getSubscriptionStatusLabel,
  getTenantStatusLabel,
  isPurchasedSubscription,
  resolveWorkspaceDisplayName,
} from "@/lib/subscriptions/display";

export default async function AccountPage() {
  const user = await requireUser();
  const membership = await getCurrentTenantMember(user.id);
  const subscription = membership?.tenant?.subscription;
  const workspaceName = resolveWorkspaceDisplayName({
    tenantName: membership?.tenant?.name,
    hallProfile: membership?.tenant?.hallProfile,
    ownerName: user.name ?? user.email,
    subscription,
    tenantStatus: membership?.tenant?.status,
    fallback: "تالار بدون نام",
  });
  const purchased = isPurchasedSubscription(subscription);

  return (
    <main className="min-h-screen bg-[#f5eddd] px-4 py-10 text-primary sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl space-y-6">
        <div className="card-luxury rounded-3xl p-7">
          <p className="text-sm font-black text-accent">حساب کاربری</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            {user.name ?? user.email}
          </h1>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoItem label="ایمیل" value={user.email} />
            <InfoItem
              label="وضعیت حساب"
              value={translateUserStatus(user.status)}
            />
            <InfoItem label="موبایل" value={user.phone ?? "ثبت نشده"} />
            <InfoItem
              label="تاریخ عضویت"
              value={formatJalaliDate(user.createdAt)}
            />
          </div>
        </div>

        {membership ? (
          <div className="card-luxury-dark rounded-3xl p-7 text-primary-foreground">
            <p className="text-sm font-black text-gold-soft">فضای کاری فعال</p>
            <h2 className="mt-3 text-3xl font-black">{workspaceName}</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <DarkInfoItem
                label="نقش شما"
                value={translateRole(membership.role)}
              />
              <DarkInfoItem
                label="وضعیت مستاجر"
                value={
                  purchased
                    ? "فعال"
                    : getTenantStatusLabel(membership.tenant?.status)
                }
              />
              <DarkInfoItem
                label="اشتراک"
                value={
                  subscription
                    ? `${getPlanLabel(subscription.plan)} / ${getSubscriptionStatusLabel(subscription.status)}`
                    : "ثبت نشده"
                }
              />
            </div>
            <Link
              href="/dashboard"
              className="btn-luxury-primary mt-7 px-6 py-3"
            >
              ورود به داشبورد
            </Link>
          </div>
        ) : (
          <div className="card-luxury rounded-3xl p-7">
            <p className="text-sm font-black text-accent">
              فضای کاری فعال نیست
            </p>
            <h2 className="mt-3 text-3xl font-black">
              هنوز به هیچ تالاری دسترسی ندارید
            </h2>
            <p className="mt-4 max-w-3xl leading-8 text-muted">
              برای ورود به داشبورد باید یک فضای کاری داشته باشید. می‌توانید دوره بررسی
              یک‌باره را شروع کنید یا به صفحه خرید بروید.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <form action={startDemoAction}>
                <button className="btn-luxury-dark px-6 py-3">
                  شروع دوره بررسی یک‌باره
                </button>
              </form>
              <Link
                href="/dashboard/account/plans"
                className="btn-luxury-secondary px-6 py-3 !text-primary"
              >
                رفتن به صفحه خرید
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-surface-elevated p-4">
      <p className="text-xs font-black text-muted">{label}</p>
      <p className="mt-2 text-sm font-black text-primary">{value}</p>
    </div>
  );
}

function DarkInfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gold/25 bg-white/[0.07] p-4">
      <p className="text-xs font-black text-gold-soft">{label}</p>
      <p className="mt-2 text-sm font-black text-[#fff7e5]">{value}</p>
    </div>
  );
}

function translateUserStatus(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "فعال",
    INVITED: "دعوت شده",
    SUSPENDED: "معلق",
  };

  return labels[status] ?? status;
}

function translateRole(role: string) {
  const labels: Record<string, string> = {
    OWNER: "مالک",
    ADMIN: "مدیر",
    STAFF: "کارمند",
  };

  return labels[role] ?? role;
}
