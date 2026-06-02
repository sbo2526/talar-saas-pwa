import { Sparkles } from "lucide-react";
import {
  SettingsCard,
  SettingsPageShell,
} from "@/components/dashboard/settings/settings-page-shell";
import { requireTenantMember } from "@/lib/auth/session";
import { canTenantAccess } from "@/lib/auth/tenant-permissions";
import { settingsHubItems } from "@/lib/settings-hub";
import { getIntegrationStatusLabel, getNotificationSettingsOverview } from "@/lib/notifications/data";
import { toPersianDigits } from "@/lib/date/jalali";
import { getInitialSetupOverview } from "@/lib/settings/initial-setup";

export default async function SettingsHubPage() {
  const membership = await requireTenantMember();
  const [overview, setupOverview] = await Promise.all([
    getNotificationSettingsOverview(membership.tenantId),
    getInitialSetupOverview(membership.tenantId),
  ]);
  const setupHubItem = {
    title: "راه‌اندازی اولیه سامانه",
    description:
      "تنظیم اطلاعات پایه، فضای کاری، تالار، سالن‌ها، نقش‌های اولیه و موارد ضروری برای شروع استفاده از سامانه.",
    href: "/dashboard/settings/setup",
    cta: "شروع راه‌اندازی اولیه",
    status: setupOverview.statusLabel,
    icon: Sparkles,
  };
  const visibleSettingsHubItems = settingsHubItems.filter((item) => {
    if (item.href === "/dashboard/settings/owner-operation") {
      return canTenantAccess(membership, "owner.settings.view");
    }

    if (item.href === "/dashboard/settings/users" || item.href === "/dashboard/settings/bulk-contract-settlement") {
      return membership.role === "OWNER";
    }

    return true;
  });
  const hubItems = [
    setupHubItem,
    ...visibleSettingsHubItems.map((item) => {
      if (item.href === "/dashboard/settings/telegram") {
        return { ...item, status: getIntegrationStatusLabel(overview.telegramStatus) };
      }

      if (item.href === "/dashboard/settings/bale") {
        return { ...item, status: getIntegrationStatusLabel(overview.baleStatus) };
      }

      if (item.href === "/dashboard/settings/rubika") {
        return { ...item, status: getIntegrationStatusLabel(overview.rubikaStatus) };
      }

      if (item.href === "/dashboard/settings/sms") {
        return { ...item, status: getIntegrationStatusLabel(overview.smsStatus) };
      }

      if (item.href === "/dashboard/settings/email") {
        return { ...item, status: getIntegrationStatusLabel(overview.emailStatus) };
      }

      if (item.href === "/dashboard/settings/message-templates") {
        return { ...item, status: `${toPersianDigits(overview.templateCount)} قالب` };
      }

      if (item.href === "/dashboard/messages" || item.href === "/dashboard/settings/notification-logs") {
        return { ...item, status: `${toPersianDigits(overview.logCount)} پیام` };
      }

      return item;
    }),
  ];

  return (
    <SettingsPageShell
      title="تنظیمات سامانه"
      subtitle="تنظیمات پایه، ارتباطات، امنیت، پشتیبان‌گیری و بخش‌های مدیریتی تالار را از این مرکز کنترل کنید."
      badge="مرکز تنظیمات"
      showMeta={false}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {hubItems.map((item) => (
          <SettingsCard key={item.href} {...item} />
        ))}
      </div>
    </SettingsPageShell>
  );
}
