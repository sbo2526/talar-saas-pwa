import { headers } from "next/headers";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PostEventConfirmationGate } from "@/components/dashboard/post-event-confirmation-gate";
import { NoTenantState } from "@/components/dashboard/no-tenant-state";
import { PurchasePendingState } from "@/components/dashboard/purchase-pending-state";
import { isPurchaseRequestReference } from "@/lib/subscriptions/plans";
import { getCurrentTenantMember, requireUser } from "@/lib/auth/session";
import { getPostEventDecisionGateData } from "@/lib/post-event/post-event-decision-gate";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const membership = await getCurrentTenantMember(user.id);
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-pathname") ?? "";
  const accountPaths = pathname === "/dashboard/account" || pathname === "/dashboard/account/plans";
  const supportPaths = pathname === "/dashboard/support" || pathname.startsWith("/dashboard/support/");
  const isPendingPurchaseWorkspace =
    membership?.tenant.status === "SUSPENDED" &&
    isPurchaseRequestReference(membership.tenant.subscription?.purchaseReference);
  const postEventGate = membership && !isPendingPurchaseWorkspace
    ? await getPostEventDecisionGateData({
        tenantId: membership.tenantId,
        role: membership.role,
      })
    : null;
  const canRenderChildRoute = Boolean(membership) || accountPaths;
  const canRenderPendingPurchaseRoute = accountPaths || supportPaths;

  return (
    <DashboardShell user={user} membership={membership}>
      {canRenderChildRoute ? (
        postEventGate?.shouldBlock ? (
          <section className="space-y-4 sm:space-y-6">
            <div className="rounded-[1.5rem] border border-[#c7a15a]/34 bg-[#fff7e6] p-4 text-[#4a3514] shadow-[0_18px_60px_rgba(199,161,90,0.12)] sm:rounded-[1.9rem] sm:p-6">
              <h1 className="text-xl font-black sm:text-2xl">چند قرارداد بعد از مراسم نیاز به تعیین وضعیت دارند</h1>
              <p className="mt-2 text-sm font-bold leading-7">
                برای دقیق ماندن گزارش‌ها و صورتحساب‌های نهایی، ابتدا وضعیت قراردادهای گذشته را مشخص کنید. قراردادهای آرشیوی قبل از تاریخ شروع محاسبات مالک در این بررسی وارد نمی‌شوند.
              </p>
            </div>
            <PostEventConfirmationGate
              items={postEventGate.items}
              totalCount={postEventGate.count}
              startDate={postEventGate.startDate}
            />
          </section>
        ) : isPendingPurchaseWorkspace && !canRenderPendingPurchaseRoute ? (
          <PurchasePendingState
            tenantName={membership?.tenant.name}
            purchaseReference={membership?.tenant.subscription?.purchaseReference}
          />
        ) : (
          children
        )
      ) : (
        <NoTenantState />
      )}
    </DashboardShell>
  );
}
