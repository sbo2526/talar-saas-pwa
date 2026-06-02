import { ArrowRight, UserRound } from "lucide-react";
import Link from "next/link";
import { CustomerForm } from "@/components/dashboard/customers/customer-form";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";

export default async function NewCustomerPage() {
  const membership = await requireTenantPermission("customers.create");

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2rem] sm:p-6">
        <Link href="/dashboard/customers" className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-3 py-1.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/70">
          <ArrowRight size={15} />
          بازگشت به مشتریان
        </Link>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
          <UserRound size={15} />
          {membership.tenant.name}
        </div>
        <h1 className="mt-4 text-2xl font-black leading-tight sm:text-4xl">افزودن مشتری جدید</h1>
        <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">
          اطلاعات تماس و هویت مشتری را برای قراردادها و پیگیری‌های مالی ثبت کنید.
        </p>
      </div>
      <CustomerForm mode="create" />
    </section>
  );
}
