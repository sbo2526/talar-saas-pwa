import Link from "next/link";
import { ArrowRight, FileSignature } from "lucide-react";
import { NewContractForm } from "@/components/dashboard/contracts/new-contract-form";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { ensureContractCatalogDefaults } from "@/lib/contract-defaults";
import { formatJalaliDate, formatJalaliWeekday } from "@/lib/date/jalali";
import { getPrisma } from "@/lib/prisma";

type NewContractPageProps = {
  searchParams: Promise<{
    eventDate?: string;
    date?: string;
    customerId?: string;
  }>;
};

function parseInitialEventDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default async function NewContractPage({
  searchParams,
}: NewContractPageProps) {
  const membership = await requireTenantPermission("contracts.create");
  const db = await getPrisma();
  const tenantId = membership.tenantId;
  const params = await searchParams;
  const initialEventDateIso = parseInitialEventDate(
    params.eventDate ?? params.date,
  );

  await ensureContractCatalogDefaults(db, tenantId);

  const [
    eventTypes,
    services,
    menus,
    packages,
    halls,
    salons,
    initialCustomer,
    serverDrafts,
    hallProfile,
    contractSetting,
  ] = await Promise.all([
    db.contractEventType.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    db.service.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        category: true,
        pricingType: true,
        unit: true,
        price: true,
        basePrice: true,
        allowPriceOverride: true,
      },
    }),
    db.menu.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        category: true,
        pricingType: true,
        unit: true,
        pricePerGuest: true,
        basePrice: true,
        allowPriceOverride: true,
      },
    }),
    db.ceremonyPackage.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        pricePerGuest: true,
        allowPriceOverride: true,
        serviceIds: true,
        menuIds: true,
        includedItemsNote: true,
      },
    }),
    db.hall.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.salon.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, hallId: true },
    }),
    params.customerId
      ? db.customer.findFirst({
          where: { id: params.customerId, tenantId, isActive: true },
          select: {
            id: true,
            salutation: true,
            fullName: true,
            phone: true,
            nationalCode: true,
            nationalId: true,
            address: true,
          },
        })
      : Promise.resolve(null),
    db.contract.findMany({
      where: { tenantId, status: "DRAFT", contractNo: { startsWith: "DRAFT-" } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        contractNo: true,
        eventDate: true,
        updatedAt: true,
        finalTotal: true,
        customer: { select: { fullName: true, phone: true } },
      },
    }),
    db.tenantHallProfile.findUnique({
      where: { tenantId },
      select: {
        brandName: true,
        legalName: true,
        hallLogoUrl: true,
      },
    }),
    db.contractSetting.findUnique({
      where: { tenantId },
      select: { showLogoOnPrint: true },
    }),
  ]);

  const initialCustomerValue = initialCustomer
    ? {
        id: initialCustomer.id,
        salutation: initialCustomer.salutation,
        fullName: initialCustomer.fullName,
        phone: initialCustomer.phone,
        nationalCode: initialCustomer.nationalCode ?? initialCustomer.nationalId ?? "",
        maskedNationalCode: "",
        address: initialCustomer.address ?? "",
      }
    : null;

  return (
    <section className="space-y-3 sm:space-y-4 xl:space-y-5">
      <div className="overflow-hidden rounded-[1.5rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.18),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-3 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2rem] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/dashboard/contracts"
              className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-3 py-1.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"
            >
              <ArrowRight size={15} />
              بازگشت به قراردادها
            </Link>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f] sm:mt-4">
              <FileSignature size={15} />
              ثبت مرحله‌ای قرارداد
            </div>
            <h1 className="mt-2 text-xl font-black leading-tight sm:mt-3 sm:text-3xl">
              ثبت قرارداد جدید
            </h1>
            <p className="mt-2 max-w-3xl text-xs font-bold leading-6 text-[#6d5f49] sm:mt-3 sm:text-sm sm:leading-7">
              اطلاعات قرارداد را مرحله‌به‌مرحله وارد کنید؛ در موبایل دکمه ادامه و خلاصه مالی همیشه در دسترس است.
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-[#111827]/10 bg-[#111827] p-3 text-[#fff8ea] sm:rounded-[1.45rem] sm:p-4">
            <p className="text-xs font-black text-[#f0dba9]">
              فضای کاری فعال
            </p>
            <p className="mt-1 text-xl font-black">{membership.tenant.name}</p>
            <p className="mt-3 text-sm font-bold leading-7 text-[#d9caa9]">
              {initialEventDateIso
                ? `تاریخ پیش‌فرض: ${formatJalaliWeekday(initialEventDateIso)}، ${formatJalaliDate(initialEventDateIso)}`
                : ""}
            </p>
          </div>
        </div>
      </div>

      <NewContractForm
        initialEventDateIso={initialEventDateIso}
        initialCustomer={initialCustomerValue}
        eventTypes={eventTypes}
        services={services.map((service) => ({
          id: service.id,
          title: service.title,
          category: service.category,
          pricingType: service.pricingType,
          unitLabel: service.unit,
          unitPrice: Number(service.price),
          basePrice: service.basePrice ? Number(service.basePrice) : null,
          allowPriceOverride: service.allowPriceOverride,
        }))}
        menus={menus.map((menu) => ({
          id: menu.id,
          title: menu.title,
          category: menu.category,
          pricingType: menu.pricingType,
          unitLabel: menu.unit,
          unitPrice: Number(menu.pricePerGuest),
          basePrice: menu.basePrice ? Number(menu.basePrice) : null,
          allowPriceOverride: menu.allowPriceOverride,
        }))}
        packages={packages.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          pricePerGuest: Number(item.pricePerGuest),
          allowPriceOverride: item.allowPriceOverride,
          serviceIds: item.serviceIds,
          menuIds: item.menuIds,
          serviceNames: services
            .filter((service) => item.serviceIds.includes(service.id))
            .map((service) => service.title),
          menuNames: menus
            .filter((menu) => item.menuIds.includes(menu.id))
            .map((menu) => menu.title),
          includedItemsNote: item.includedItemsNote,
        }))}
        halls={halls}
        salons={salons}
        serverDrafts={serverDrafts.map((draft) => ({
          id: draft.id,
          contractNo: draft.contractNo,
          customerName: draft.customer.fullName,
          customerPhone: draft.customer.phone,
          eventDate: formatJalaliDate(draft.eventDate),
          updatedAt: formatJalaliDate(draft.updatedAt),
          finalTotal: Number(draft.finalTotal.toString()),
        }))}
        printBrand={{
          hallName: hallProfile?.brandName || hallProfile?.legalName || membership.tenant.name,
          hallLogoUrl: hallProfile?.hallLogoUrl ?? null,
          showLogoOnPrint: contractSetting?.showLogoOnPrint ?? true,
        }}
      />
    </section>
  );
}
