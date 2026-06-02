import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminCard } from "@/components/admin/admin-card";
import { StatusChip } from "@/components/admin/status-chip";

export default async function AdminSettingsPage() {
  const adminEmails = [process.env.PLATFORM_ADMIN_EMAIL, process.env.PLATFORM_ADMIN_EMAILS].filter(Boolean).join(", ") || "تنظیم نشده";
  const hasAdminEnv = adminEmails !== "تنظیم نشده";

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="تنظیمات پلتفرم" title="تنظیمات سامانه" subtitle="تنظیمات مالک SaaS، دسترسی مدیر کل، اطلاعات پشتیبانی و سیاست‌های عمومی پلتفرم." />
      <section className="grid gap-4 xl:grid-cols-2">
        <AdminCard>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-[#172033]">دسترسی مدیر کل</h2>
            <StatusChip tone={hasAdminEnv ? "emerald" : "rose"}>{hasAdminEnv ? "فعال" : "نیازمند تنظیم"}</StatusChip>
          </div>
          <p className="mt-3 text-sm font-bold leading-8 text-[#6d5f49]">در این نسخه، دسترسی platform admin از طریق متغیر محیطی کنترل می‌شود و در UI tenant نمایش داده نمی‌شود.</p>
          <div className="mt-4 rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3 text-xs font-bold leading-7 text-[#172033]">
            <p className="font-black">ایمیل‌های مجاز:</p>
            <p className="mt-1 break-all text-[#7b6a4b]">{adminEmails}</p>
          </div>
        </AdminCard>
        <AdminCard>
          <h2 className="text-lg font-black text-[#172033]">اطلاعات پشتیبانی</h2>
          <p className="mt-3 text-sm font-bold leading-8 text-[#6d5f49]">پشتیبانی tenantها از مسیر `/dashboard/support` ثبت می‌شود و مالک پلتفرم از `/admin/support` پاسخ می‌دهد.</p>
          <div className="mt-4 grid gap-2 text-xs font-bold text-[#7b6a4b]">
            <p>ایمیل پشتیبانی: {process.env.SUPPORT_EMAIL || "تنظیم نشده"}</p>
            <p>تلفن پشتیبانی: {process.env.SUPPORT_PHONE || "تنظیم نشده"}</p>
          </div>
        </AdminCard>
      </section>
      <AdminCard>
        <h2 className="text-lg font-black text-[#172033]">قوانین امنیتی این پنل</h2>
        <ul className="mt-3 grid gap-2 text-sm font-bold leading-8 text-[#6d5f49] md:grid-cols-2">
          <li>• مسیر `/admin` فقط با `PLATFORM_ADMIN_EMAIL` یا `PLATFORM_ADMIN_EMAILS` باز می‌شود.</li>
          <li>• dashboard معمولی tenant و سطح دسترسی آن تغییر نکرده است.</li>
          <li>• داده‌های cross-tenant فقط در helperهای `/admin` خوانده می‌شوند.</li>
          <li>• اطلاعات حساس مثل رمز، توکن تلگرام و کلید پیامک نمایش داده نمی‌شود.</li>
        </ul>
      </AdminCard>
    </div>
  );
}
