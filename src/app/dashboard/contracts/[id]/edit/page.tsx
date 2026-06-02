import { notFound } from "next/navigation";
import { ContractEditForm } from "@/components/dashboard/contracts/contract-edit-form";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { getPaidAmount, toNumber } from "@/lib/contracts/display";
import { toDateOnlyString } from "@/lib/date/jalali";
import { getPrisma } from "@/lib/prisma";

type ContractEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContractEditPage({ params }: ContractEditPageProps) {
  const membership = await requireTenantPermission("contracts.edit");
  const db = await getPrisma();
  const { id } = await params;

  const [contract, eventTypes, halls, salons] = await Promise.all([
    db.contract.findFirst({
      where: { id, tenantId: membership.tenantId },
      include: {
        customer: { select: { salutation: true, fullName: true, phone: true, nationalCode: true, nationalId: true, address: true } },
        lineItems: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
        payments: { select: { amount: true, type: true, status: true } },
      },
    }),
    db.contractEventType.findMany({
      where: { tenantId: membership.tenantId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    db.hall.findMany({
      where: { tenantId: membership.tenantId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.salon.findMany({
      where: { tenantId: membership.tenantId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, hallId: true, name: true },
    }),
  ]);

  if (!contract) {
    notFound();
  }

  const paidAmount = getPaidAmount(contract.payments, contract.depositAmount);

  return (
    <section className="space-y-5">
      <ContractEditForm
        contract={{
          id: contract.id,
          contractNo: contract.contractNo,
          salutation: contract.customer.salutation ?? "",
          customerName: contract.customer.fullName,
          customerMobile: contract.customer.phone,
          nationalCode: contract.customer.nationalCode ?? contract.customer.nationalId ?? "",
          address: contract.customer.address ?? "",
          eventTypeId: contract.eventTypeId ?? "none",
          eventTypeName: contract.eventTypeName ?? "",
          eventDate: toDateOnlyString(contract.eventDate),
          eventStartTime: contract.eventStartTime ?? "",
          eventEndTime: contract.eventEndTime ?? "",
          guestCount: String(contract.guestCount),
          hallId: contract.hallId ?? "none",
          salonId: contract.salonId ?? "none",
          status: contract.status,
          notes: contract.notes ?? "",
          servicesTotal: toNumber(contract.servicesTotal),
          servicesTotalManual: contract.servicesTotalManual,
          menuTotal: toNumber(contract.menuTotal),
          menuTotalManual: contract.menuTotalManual,
          discountAmount: toNumber(contract.discountAmount),
          depositAmount: toNumber(contract.depositAmount),
          finalTotal: toNumber(contract.finalTotal),
          finalTotalManual: contract.finalTotalManual,
          remainingAmount: toNumber(contract.remainingAmount),
          remainingAmountManual: contract.remainingAmountManual,
          paidAmount,
          lineItems: contract.lineItems.map((item) => ({
            id: item.id,
            key: item.id,
            type: item.type,
            pricingType: item.pricingType,
            sourceId: item.sourceId,
            category: item.category ?? "",
            name: item.name,
            quantity: String(item.quantity),
            unitLabel: item.unitLabel ?? "مورد",
            unitPrice: String(item.unitPrice),
            totalPrice: String(item.totalPrice),
            note: item.note ?? "",
          })),
        }}
        eventTypes={eventTypes}
        halls={halls}
        salons={salons}
      />
    </section>
  );
}
