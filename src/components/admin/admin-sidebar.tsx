"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Building2,
  CreditCard,
  Gauge,
  LifeBuoy,
  Settings2,
  UsersRound,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "نمای کلی", icon: Gauge, exact: true },
  { href: "/admin/tenants", label: "تالارها / فضاهای کاری", icon: Building2 },
  { href: "/admin/users", label: "کاربران", icon: UsersRound },
  {
    href: "/admin/subscriptions",
    label: "اشتراک‌ها و دوره‌های بررسی",
    icon: CreditCard,
  },
  { href: "/admin/support", label: "تیکت‌های پشتیبانی", icon: LifeBuoy },
  { href: "/admin/reports", label: "گزارش‌ها و آمار سامانه", icon: BarChart3 },
  { href: "/admin/activity", label: "فعالیت‌ها و لاگ‌ها", icon: Activity },
  { href: "/admin/settings", label: "تنظیمات سامانه", icon: Settings2 },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-l border-[#d8c08b]/18 bg-[#101827] px-4 py-5 text-[#fff8ea] shadow-[0_28px_80px_rgba(15,23,42,0.24)] lg:block">
      <div className="rounded-[1.75rem] border border-[#e8c478]/24 bg-[radial-gradient(circle_at_20%_0%,rgba(232,196,120,0.18),transparent_9rem),rgba(255,255,255,0.06)] p-4">
        <p className="text-xs font-black text-[#f0dba9]">تالار منیجر</p>
        <h1 className="mt-2 text-xl font-black">مدیریت کل سامانه</h1>
        <p className="mt-2 text-xs font-bold leading-6 text-[#c9b993]">
          پنل اختصاصی مالک پلتفرم SaaS
        </p>
      </div>
      <nav className="mt-5 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black transition ${
                active
                  ? "bg-[#e8c478] text-[#172033] shadow-[0_16px_32px_rgba(232,196,120,0.22)]"
                  : "text-[#e9ddc1] hover:bg-white/[0.08] hover:text-white hover:shadow-[inset_0_0_0_1px_rgba(232,196,120,0.10)]"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
