import type { Prisma, User } from "@prisma/client";
import { Gem } from "lucide-react";
import Link from "next/link";
import { DashboardNavigation } from "@/components/dashboard/dashboard-navigation";
import { DashboardAutomationTick } from "@/components/dashboard/automation/dashboard-automation-tick";
import { DashboardGlobalSearch } from "@/components/dashboard/header/dashboard-global-search";
import { DashboardUserMenu } from "@/components/dashboard/header/dashboard-user-menu";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { MobileMenu } from "@/components/dashboard/mobile-menu";
import { NotificationBellServer } from "@/components/dashboard/notification-bell-server";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { canTenantAccess } from "@/lib/auth/tenant-permissions";
import {
  getVisiblePlanLabel,
  resolveWorkspaceDisplayName,
} from "@/lib/subscriptions/display";

type TenantMemberWithTenant = Prisma.TenantMemberGetPayload<{
  include: {
    tenant: {
      include: {
        subscription: true;
        hallProfile: {
          select: {
            brandName: true;
            legalName: true;
          };
        };
      };
    };
  };
}>;

type DashboardShellProps = {
  children: React.ReactNode;
  user?: User;
  membership?: TenantMemberWithTenant | null;
};

export function DashboardShell({
  children,
  user,
  membership,
}: DashboardShellProps) {
  const displayName = user?.name ?? user?.email ?? "کاربر";
  const subscription = membership?.tenant?.subscription;
  const tenantName = resolveWorkspaceDisplayName({
    tenantName: membership?.tenant?.name,
    hallProfile: membership?.tenant?.hallProfile,
    ownerName: displayName,
    subscription,
    tenantStatus: membership?.tenant?.status,
    fallback: "بدون فضای کاری",
  });
  const roleLabel = membership ? translateRole(membership.role) : "آماده شروع";
  const planLabel = getVisiblePlanLabel(subscription);
  const canRunNotificationAutomation = canTenantAccess(membership, "notifications.manage");

  return (
    <div className="dashboard-shell-root relative isolate min-h-screen bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.12),transparent_24rem),radial-gradient(circle_at_78%_14%,rgba(23,72,63,0.18),transparent_26rem),linear-gradient(180deg,#0a1019_0%,#08111d_100%)] text-[#111827] lg:grid lg:grid-cols-[18rem_1fr] 2xl:grid-cols-[18.75rem_1fr]">
      <DashboardAutomationTick enabled={canRunNotificationAutomation} tenantId={membership?.tenantId} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[44rem] bg-[linear-gradient(135deg,transparent_0%,transparent_48%,rgba(245,237,221,0.026)_48%,rgba(245,237,221,0.012)_58%,transparent_58%,transparent_100%)]"
      />
      <aside className="dashboard-shell-sidebar sticky top-0 z-40 hidden h-screen self-start bg-[radial-gradient(circle_at_20%_0%,rgba(232,196,120,0.18),transparent_18rem),linear-gradient(180deg,#111827_0%,#08111d_100%)] text-[#fff8ea] shadow-[24px_0_90px_rgba(17,24,39,0.18)] lg:block">
        <div className="flex h-full flex-col border-l border-[#e8c478]/18">
          <div className="px-4 pb-3 pt-4 2xl:px-5 2xl:pt-5">
            <Link
              href="/dashboard"
              className="group flex items-center justify-center gap-3 rounded-[1.25rem] border border-[#e8c478]/16 bg-white/[0.04] px-3 py-3 text-center transition hover:border-[#e8c478]/30 hover:bg-white/[0.065]"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[1rem] border border-[#e8c478]/38 bg-[radial-gradient(circle_at_35%_20%,rgba(255,255,255,0.2),transparent_1.15rem),rgba(232,196,120,0.13)] text-[#f0dba9] shadow-[0_16px_44px_rgba(232,196,120,0.14)] transition group-hover:scale-[1.03]">
                <Gem size={22} />
              </span>
              <span className="min-w-0 leading-none">
                <span className="block text-[1.18rem] font-black leading-tight text-[#fff4d5]">
                  تالار منیجر
                </span>
                <span className="mt-1 block truncate text-[11px] font-bold text-[#d9caa9]">
                  سامانه لوکس مدیریت تالار
                </span>
              </span>
            </Link>
          </div>

          <div className="gold-divider" />

          <div className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-5 pt-3 2xl:px-4">
            <DashboardNavigation currentRole={membership?.role} currentStatus={membership?.status} permissionsOverride={membership?.permissionsOverride} />
          </div>
        </div>
      </aside>

      <div className="relative z-10 min-w-0">
        <header className="dashboard-shell-header sticky top-0 z-50 border-b border-[#d8c08b]/45 bg-[#fff9ee]/90 backdrop-blur-2xl supports-[backdrop-filter]:bg-[#fff9ee]/78">
          <div className="px-3 pb-2.5 pt-[calc(0.65rem+env(safe-area-inset-top))] sm:px-5 lg:px-6 lg:py-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <MobileMenu currentRole={membership?.role} currentStatus={membership?.status} permissionsOverride={membership?.permissionsOverride} />

              <div className="min-w-0 flex-1 lg:hidden">
                <p className="truncate text-sm font-black text-[#111827]">
                  داشبورد مدیریتی
                </p>
                <p className="mt-0.5 truncate text-[11px] font-bold text-[#7d6841]">
                  {tenantName}
                </p>
              </div>

              <div className="hidden min-w-0 flex-1 items-center gap-4 lg:flex">
                <div className="min-w-0">
                  <p className="text-xs font-black text-[#7d6841]">
                    داشبورد مدیریتی تالار منیجر
                  </p>
                  <p className="mt-1 truncate text-lg font-black text-[#111827]">
                    {tenantName}
                  </p>
                </div>
                <DashboardGlobalSearch />
              </div>

              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <NotificationBellServer membership={membership} />
                <DashboardUserMenu
                  displayName={displayName}
                  roleLabel={roleLabel}
                  tenantName={tenantName}
                  planLabel={planLabel}
                />
                <div className="md:hidden">
                  <LogoutButton />
                </div>
              </div>
            </div>

            <div className="mt-3 lg:hidden">
              <DashboardGlobalSearch compact />
            </div>
          </div>
        </header>

        <main className="dashboard-shell-main px-3 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-4 sm:px-5 sm:pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:pt-5 lg:px-6 xl:px-8">
          <InstallPrompt />
          <div className="dashboard-shell-content talar-admin-page mx-auto w-full max-w-[86rem] 2xl:max-w-[90rem]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function translateRole(role: string) {
  const labels: Record<string, string> = {
    OWNER: "مالک",
    ADMIN: "مدیر",
    STAFF: "کارمند",
    ACCOUNTANT: "حسابدار",
    PARTNER: "شریک",
    TENANT_OPERATOR: "مستاجر / بهره‌بردار",
    RECEPTION: "پذیرش",
    VIEWER: "مشاهده‌گر",
  };

  return labels[role] ?? role;
}
