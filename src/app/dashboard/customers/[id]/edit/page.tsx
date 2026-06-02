import { ArrowRight, UserRound } from "lucide-react";
import Link from "next/link";
import { CustomerForm } from "@/components/dashboard/customers/customer-form";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { getPrisma } from "@/lib/prisma";

type EditCustomerPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  const membership = await requireTenantPermission("customers.edit");
  const db = await getPrisma();
  const { id } = await params;

  const customer = await db.customer.findFirst({
    where: { id, tenantId: membership.tenantId },
  });

  if (!customer) {
    return (
      <section className="rounded-[2rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-6 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.08)]">
        <h1 className="text-2xl font-black">مشتری پیدا نشد</h1>
        <p className="mt-3 leading-8 text-[#6d5f49]">این مشتری وجود ندارد یا دسترسی شما به آن مجاز نیست.</p>
        <Link href="/dashboard/customers" className="btn-luxury-dark mt-5 px-5 py-3">بازگشت به مشتریان</Link>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2rem] sm:p-6">
        <Link href={`/dashboard/customers/${customer.id}`} className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-3 py-1.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/70">
          <ArrowRight size={15} />
          بازگشت به پرونده مشتری
        </Link>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
          <UserRound size={15} />
          ویرایش مشتری
        </div>
        <h1 className="mt-4 text-2xl font-black leading-tight sm:text-4xl">ویرایش {customer.fullName}</h1>
      </div>
      <CustomerForm
        mode="edit"
        backHref={`/dashboard/customers/${customer.id}`}
        values={{
          id: customer.id,
          salutation: customer.salutation,
          fullName: customer.fullName,
          phone: customer.phone,
          nationalCode: customer.nationalCode ?? customer.nationalId,
          address: customer.address,
          notes: customer.notes,
          isActive: customer.isActive,
        }}
      />
    </section>
  );
}
