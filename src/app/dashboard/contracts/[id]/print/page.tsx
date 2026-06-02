import { notFound } from "next/navigation";
import { ContractPrintDocument } from "@/components/dashboard/contracts/contract-print-document";
import { PrintActions } from "@/components/dashboard/contracts/print-actions";
import { requireTenantMember } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { getAuditActorName } from "@/lib/audit/audit-log-messages";

type ContractPrintPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContractPrintPage({ params }: ContractPrintPageProps) {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const { id } = await params;
  const tenantId = membership.tenantId;

  const [contract, settings, hallProfile] = await Promise.all([
    db.contract.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        customer: true,
        hall: {
          select: {
            name: true,
            address: true,
            city: true,
            phone: true,
            managerName: true,
          },
        },
        salon: { select: { name: true, capacity: true, floor: true } },
        lineItems: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
        payments: {
          select: {
            amount: true,
            type: true,
            status: true,
            paidAt: true,
          },
          orderBy: { paidAt: "asc" },
        },
      },
    }),
    db.contractSetting.findUnique({
      where: { tenantId },
      select: {
        defaultClauses: true,
        paymentTerms: true,
        cancellationPolicy: true,
        footerNote: true,
        customerSignatureLabel: true,
        managerSignatureLabel: true,
        printTemplateName: true,
        showLogoOnPrint: true,
        showLicenseInfoOnPrint: true,
      },
    }),
    db.tenantHallProfile.findUnique({
      where: { tenantId },
      select: {
        brandName: true,
        legalName: true,
        managerName: true,
        licenseNumber: true,
        province: true,
        city: true,
        address: true,
        phone: true,
        mobile: true,
        website: true,
        hallLogoUrl: true,
      },
    }),
  ]);

  if (!contract) {
    notFound();
  }

  await createAuditLog({
    tenantId,
    userId: membership.userId,
    action: "PRINT",
    entityType: "CONTRACT",
    entityId: contract.id,
    title: "چاپ قرارداد",
    message: `نسخه چاپی قرارداد ${contract.contractNo} توسط ${getAuditActorName(membership.user)} مشاهده یا چاپ شد.`,
    metadata: { contractNo: contract.contractNo },
    href: `/dashboard/contracts/${contract.id}`,
  });

  return (
    <section className="print-contract-route -mx-3 min-h-screen bg-[#ece5d8] px-3 py-4 text-[#111827] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 print:m-0 print:min-h-0 print:bg-white print:p-0">
      <PrintActions contractId={contract.id} />
      <div className="print-contract-preview-wrap">
        <ContractPrintDocument
          contract={contract}
          settings={settings}
          hallProfile={hallProfile}
          tenant={{ name: membership.tenant.name }}
        />
      </div>
    </section>
  );
}
