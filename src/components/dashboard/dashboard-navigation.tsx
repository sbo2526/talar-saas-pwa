"use client";

import {
  BookOpen,
  ChevronDown,
  ClipboardList,
  FileCheck2,
  Headset,
  Home,
  ShieldCheck,
  SlidersHorizontal,
  UserCircle,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  managementItems,
  ownerAuthorityItems,
  secondaryOperationalItems,
  type NavItem,
} from "@/lib/app-data";
import {
  canTenantAccess,
  type TenantPermission,
  type TenantPermissionMemberLike,
} from "@/lib/auth/tenant-permissions";

type DashboardNavigationProps = {
  currentRole?: string | null;
  currentStatus?: string | null;
  permissionsOverride?: unknown;
  onNavigate?: () => void;
};

type PermissionNavItem = NavItem & {
  permission?: TenantPermission;
};

type NavSection = {
  title: string;
  icon: LucideIcon;
  items: PermissionNavItem[];
};

const navPermissionByHref: Record<string, TenantPermission | undefined> = {
  "/dashboard": "dashboard.view",
  "/dashboard/customers": "customers.view",
  "/dashboard/contracts": "contracts.view",
  "/dashboard/payments": "payments.view",
  "/dashboard/invoices": "invoices.view",
  "/dashboard/reports": "reports.view",
  "/dashboard/crm": "customers.view",
  "/dashboard/calendar": "calendar.view",
  "/dashboard/expenses": "expenses.view",
  "/dashboard/settings": "settings.view",
  "/dashboard/messages": "notifications.manage",
  "/dashboard/settings/users": "users.view",
  "/dashboard/settings/bulk-contract-settlement": "owner.settlement.manage",
  "/dashboard/settings/owner-operation": "owner.settings.view",
  "/dashboard/owner-financial-overview": "owner.financial.view",
  "/dashboard/owner-settlements": "owner.settlement.view",
  "/dashboard/owner-financial-audit": "owner.audit.view",
};

const homeItem: PermissionNavItem = {
  title: "داشبورد",
  href: "/dashboard",
  icon: Home,
  description: "نمای کلی داشبورد مدیریتی",
  permission: "dashboard.view",
};

const accountItem: PermissionNavItem = {
  title: "حساب کاربری",
  href: "/dashboard/account",
  icon: UserCircle,
  description: "مدیریت پروفایل، دوره بررسی و اشتراک",
};

const helpItem: PermissionNavItem = {
  title: "راهنما",
  href: "/dashboard/help",
  icon: BookOpen,
  description: "آموزش و راهنمای استفاده از تالار منیجر",
};

const supportItem: PermissionNavItem = {
  title: "پشتیبانی",
  href: "/dashboard/support",
  icon: Headset,
  description: "ثبت و پیگیری تیکت‌های پشتیبانی",
};

const settingsHubItem: PermissionNavItem = {
  title: "تنظیمات",
  href: "/dashboard/settings",
  icon: SlidersHorizontal,
  description: "مرکز تنظیمات، تعاریف پایه، امنیت، اعلان‌ها و پشتیبان‌گیری",
  permission: "settings.view",
};

const tenantUsersItem: PermissionNavItem = {
  title: "تعریف کاربران",
  href: "/dashboard/settings/users",
  icon: UserCog,
  description: "تعریف کاربران وابسته به تالار و مدیریت نقش‌ها و دسترسی‌ها.",
  permission: "users.view",
};

const bulkContractSettlementItem: PermissionNavItem = {
  title: "تسویه گروهی قراردادها",
  href: "/dashboard/settings/bulk-contract-settlement",
  icon: FileCheck2,
  description: "تسویه گروهی قراردادهای قدیمی تا تاریخ انتخاب‌شده، فقط برای مالک.",
  permission: "owner.settlement.manage",
};

function withPermission(item: NavItem): PermissionNavItem {
  return {
    ...item,
    permission: navPermissionByHref[item.href],
  };
}

const reservationCalendarHref = "/dashboard/calendar";
const reservationCalendarItem = secondaryOperationalItems.find(
  (item) => item.href === reservationCalendarHref,
);
const operationItemsWithoutReservationCalendar = secondaryOperationalItems.filter(
  (item) => item.href !== reservationCalendarHref,
);

export function DashboardNavigation({
  currentRole,
  currentStatus,
  permissionsOverride,
  onNavigate,
}: DashboardNavigationProps) {
  const pathname = usePathname();
  const permissionMember: TenantPermissionMemberLike | null = currentRole
    ? {
        role: currentRole,
        status: currentStatus,
        permissionsOverride,
      }
    : null;

  const sections: NavSection[] = [
    {
      title: "صفحه اصلی",
      icon: Home,
      items: [
        homeItem,
        ...(reservationCalendarItem ? [withPermission(reservationCalendarItem)] : []),
      ],
    },
    {
      title: "عملیات تالار",
      icon: ClipboardList,
      items: [...managementItems, ...operationItemsWithoutReservationCalendar].map(withPermission),
    },
    ...(currentRole === "OWNER"
      ? [
          {
            title: "اختیارات مالک",
            icon: ShieldCheck,
            items: ownerAuthorityItems.map(withPermission),
          },
        ]
      : []),
    {
      title: "تنظیمات",
      icon: SlidersHorizontal,
      items: [
        settingsHubItem,
        ...(currentRole === "OWNER" ? [tenantUsersItem, bulkContractSettlementItem] : []),
        accountItem,
        supportItem,
        helpItem,
      ],
    },
  ]
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canSeeNavItem(permissionMember, item)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <nav className="dashboard-nav grid gap-1.5">
      {sections.map((section) => (
        <NavGroup
          key={section.title}
          section={section}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

function canSeeNavItem(
  member: TenantPermissionMemberLike | null,
  item: PermissionNavItem,
) {
  if (!item.permission) return true;

  return canTenantAccess(member, item.permission);
}

function NavGroup({
  section,
  pathname,
  onNavigate,
}: {
  section: NavSection;
  pathname: string;
  onNavigate?: () => void;
}) {
  const Icon = section.icon;
  const hasActiveItem = section.items.some((item) => isNavItemActive(item, pathname));

  return (
    <details className="group/nav rounded-[1.1rem] border border-transparent">
      <summary
        className={`flex min-h-10 cursor-pointer list-none items-center justify-between gap-2.5 rounded-[1.05rem] border px-2.5 py-2 text-xs font-black transition marker:hidden focus:outline-none focus:ring-2 focus:ring-[#e8c478]/35 focus:ring-offset-2 focus:ring-offset-[#111827] ${
          hasActiveItem
            ? "border-[#e8c478]/28 bg-[#e8c478]/12 text-[#fff4d5]"
            : "border-white/[0.055] bg-white/[0.035] text-[#d8c79e]/85 hover:border-white/[0.10] hover:bg-white/[0.065] hover:text-[#f0dba9]"
        }`}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className={`flex size-7 shrink-0 items-center justify-center rounded-[0.8rem] ${hasActiveItem ? "bg-[#e8c478]/16 text-[#f0dba9]" : "bg-white/[0.05] text-[#d9caa9]"}`}>
            <Icon size={16} />
          </span>
          <span className="truncate">{section.title}</span>
        </span>
        <ChevronDown size={15} className="shrink-0 text-[#d9caa9] transition group-open/nav:rotate-180 lg:group-hover/nav:rotate-180" />
      </summary>

      <div className="hidden pt-1.5 group-open/nav:grid lg:group-hover/nav:grid lg:group-focus-within/nav:grid">
        <div className="grid gap-1 border-r border-[#e8c478]/16 pr-2.5">
          {section.items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </details>
  );
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: PermissionNavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const isActive = isNavItemActive(item, pathname);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group flex min-h-10 items-center gap-2.5 rounded-[1.05rem] px-2.5 py-2 text-sm font-black transition ${
        isActive
          ? "border border-[#e8c478]/34 bg-[#e8c478]/14 text-[#fff4d5] shadow-[0_16px_44px_rgba(232,196,120,0.12)]"
          : "border border-transparent text-[#f8ecd3]/82 hover:border-white/[0.08] hover:bg-white/[0.07] hover:text-[#f0dba9]"
      }`}
    >
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-[0.8rem] ${
          isActive
            ? "bg-[#e8c478]/16 text-[#f0dba9]"
            : "bg-white/[0.05] text-[#d9caa9] group-hover:text-[#f0dba9]"
        }`}
      >
        <Icon size={16} />
      </span>
      <span className="min-w-0 truncate">{item.title}</span>
    </Link>
  );
}

function isNavItemActive(item: Pick<NavItem, "href">, pathname: string) {
  if (item.href === "/dashboard") {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
