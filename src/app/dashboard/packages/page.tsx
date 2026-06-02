import {
  ArrowLeft,
  Boxes,
  CalendarDays,
  Edit3,
  PackagePlus,
  Plus,
} from "lucide-react";
import Link from "next/link";
import {
  CeremonyPackageForm,
  ToggleCeremonyPackageStatusForm,
  type CeremonyPackageFormValues,
} from "@/components/dashboard/ceremony-package-forms";
import { requireTenantMember } from "@/lib/auth/session";
import { ensureContractCatalogDefaults } from "@/lib/contract-defaults";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { getPrisma } from "@/lib/prisma";

type PackagesPageProps = {
  searchParams: Promise<{ action?: string; edit?: string }>;
};

export default async function CeremonyPackagesPage({
  searchParams,
}: PackagesPageProps) {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const tenantId = membership.tenantId;
  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";
  const params = await searchParams;

  if (canEdit) {
    await ensureContractCatalogDefaults(db, tenantId);
  }

  const [packages, services, menus] = await Promise.all([
    db.ceremonyPackage.findMany({
      where: { tenantId },
      orderBy: [
        { isActive: "desc" },
        { sortOrder: "asc" },
        { updatedAt: "desc" },
      ],
    }),
    db.service.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, title: true, category: true },
    }),
    db.menu.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, title: true, category: true },
    }),
  ]);

  const selectedPackage = params.edit
    ? packages.find((item) => item.id === params.edit)
    : null;
  const showCreate = params.action === "add";
  const showEditor = showCreate || Boolean(selectedPackage);
  const activeCount = packages.filter((item) => item.isActive).length;
  const selectedValues: CeremonyPackageFormValues | undefined = selectedPackage
    ? {
        id: selectedPackage.id,
        title: selectedPackage.title,
        code: selectedPackage.code ?? "",
        description: selectedPackage.description ?? "",
        pricePerGuest: selectedPackage.pricePerGuest.toString(),
        includedItemsNote: selectedPackage.includedItemsNote ?? "",
        serviceIds: selectedPackage.serviceIds,
        menuIds: selectedPackage.menuIds,
        sortOrder: String(selectedPackage.sortOrder ?? ""),
        allowPriceOverride: selectedPackage.allowPriceOverride,
        isActive: selectedPackage.isActive,
      }
    : undefined;

  return (
    <section className="space-y-5 sm:space-y-7">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2.25rem] sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <Link
              href="/dashboard/base"
              className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-3 py-1.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"
            >
              <ArrowLeft size={15} />
              بازگشت به تعاریف پایه
            </Link>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
              <Boxes size={15} />
              تنظیم پکیج‌ها
            </div>
            <h1 className="mt-3 text-2xl font-black leading-tight sm:text-4xl">
              تنظیم پکیج‌ها
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">
              پکیج‌های مراسم را ساده و حرفه‌ای بسازید؛ زیرمجموعه‌ها را از منوها
              و خدمات تیک بزنید تا هنگام انتخاب پکیج در قرارداد، همان موارد
              خودکار انتخاب شوند و قیمت پکیج به ازای هر مهمان محاسبه شود.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-black text-[#7d6841]">
              <CalendarDays size={16} className="text-[#9f7131]" />
              <span>{formatJalaliDate(new Date())}</span>
            </div>
          </div>
          <div className="rounded-[1.6rem] border border-[#111827]/10 bg-[#111827] p-4 text-[#fff8ea] sm:min-w-80">
            <p className="text-xs font-black text-[#f0dba9]">خلاصه پکیج‌ها</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric
                label="کل پکیج‌ها"
                value={formatPersianNumber(packages.length)}
              />
              <Metric label="فعال" value={formatPersianNumber(activeCount)} />
            </div>
          </div>
        </div>
      </div>

      {showEditor ? (
        <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black">
                {selectedPackage
                  ? "ویرایش پکیج اختصاصی"
                  : "ثبت پکیج اختصاصی جدید"}
              </h2>
              <p className="mt-1 text-sm font-bold leading-7 text-[#6d5f49]">
                خدمات و منوهای عضو این پکیج را با تیک انتخاب کنید؛ همین
                زیرمجموعه‌ها در ثبت قرارداد خودکار فعال می‌شوند.
              </p>
            </div>
            <Link
              href="/dashboard/packages"
              className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[#d8c08b]/62 bg-white/60 px-4 py-2 text-xs font-black text-[#7d6841]"
            >
              بستن فرم
            </Link>
          </div>
          <CeremonyPackageForm
            mode={selectedPackage ? "edit" : "create"}
            values={selectedValues}
            services={services}
            menus={menus}
            canEdit={canEdit}
          />
        </section>
      ) : null}

      <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black">فهرست پکیج‌های مراسم</h2>
            <p className="mt-1 text-sm font-bold leading-7 text-[#6d5f49]">
              پکیج‌های فعال در ثبت قرارداد نمایش داده می‌شوند.
            </p>
          </div>
          <Link
            href="/dashboard/packages?action=add"
            className="btn-luxury-primary justify-center px-5 py-3"
          >
            <Plus size={18} />
            افزودن پکیج
          </Link>
        </div>

        {packages.length > 0 ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {packages.map((item) => {
              const selectedServices = services.filter((service) =>
                item.serviceIds.includes(service.id),
              );
              const selectedMenus = menus.filter((menu) =>
                item.menuIds.includes(menu.id),
              );
              return (
                <article
                  key={item.id}
                  className="rounded-[1.45rem] border border-[#d8c08b]/56 bg-white/62 p-4 shadow-[0_12px_38px_rgba(17,24,39,0.06)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-black text-[#111827]">
                          {item.title}
                        </h3>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${item.isActive ? "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]" : "border-[#b45353]/18 bg-[#fff1f1] text-[#8f2c2c]"}`}
                        >
                          {item.isActive ? "فعال" : "غیرفعال"}
                        </span>
                      </div>
                      {item.code ? (
                        <p
                          className="mt-1 text-xs font-bold text-[#7d6841]"
                          dir="ltr"
                        >
                          {item.code}
                        </p>
                      ) : null}
                    </div>
                    <span className="rounded-2xl border border-[#c7a15a]/24 bg-[#c7a15a]/10 px-3 py-2 text-xs font-black text-[#7d6841]">
                      {formatIRR(Number(item.pricePerGuest))} / نفر
                    </span>
                  </div>
                  {item.description ? (
                    <p className="mt-3 text-sm font-bold leading-7 text-[#6d5f49]">
                      {item.description}
                    </p>
                  ) : null}
                  <div className="mt-4 grid gap-3 text-sm font-bold text-[#111827]">
                    <PackageSummary
                      title="خدمات"
                      items={selectedServices.map((service) => service.title)}
                    />
                    <PackageSummary
                      title="منو و پذیرایی"
                      items={selectedMenus.map((menu) => menu.title)}
                    />
                    {item.includedItemsNote ? (
                      <PackageSummary
                        title="توضیحات تکمیلی"
                        items={item.includedItemsNote
                          .split(/\r?\n/)
                          .filter(Boolean)}
                      />
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/packages?edit=${item.id}`}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-4 py-2 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"
                    >
                      <Edit3 size={15} />
                      ویرایش
                    </Link>
                    <ToggleCeremonyPackageStatusForm
                      packageId={item.id}
                      isActive={item.isActive}
                      canEdit={canEdit}
                    />
                  </div>
                  <p className="mt-3 text-xs font-bold text-[#8a7a5f]">
                    آخرین ویرایش: {formatJalaliDateTime(item.updatedAt)}
                  </p>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-[1.45rem] border border-dashed border-[#d8c08b]/60 bg-[#fff8ea]/60 p-6 text-center">
            <PackagePlus className="mx-auto text-[#9f7131]" size={30} />
            <p className="mt-3 text-sm font-black text-[#111827]">
              هنوز پکیج اختصاصی ثبت نشده است.
            </p>
            <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
              اولین پکیج را بسازید و زیرمجموعه‌هایش را از منو و خدمات انتخاب
              کنید تا در ثبت قرارداد خودکار فعال شوند.
            </p>
          </div>
        )}
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e8c478]/18 bg-[#e8c478]/10 p-3">
      <p className="text-xs font-black text-[#f0dba9]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[#fff9ed]">{value}</p>
    </div>
  );
}

function PackageSummary({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-[#d8c08b]/42 bg-[#fff8ea]/70 px-3 py-2">
      <span className="text-xs font-black text-[#7d6841]">{title}</span>
      <p className="mt-1 leading-7">
        {items.length ? items.slice(0, 8).join("، ") : "ثبت نشده"}
        {items.length > 8
          ? `، +${formatPersianNumber(items.length - 8)} مورد دیگر`
          : ""}
      </p>
    </div>
  );
}
