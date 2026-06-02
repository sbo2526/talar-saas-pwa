import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Edit3,
  MapPin,
  Phone,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  HallForm,
  type HallFormValues,
  ToggleHallStatusForm,
} from "@/components/dashboard/hall-management-forms";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/date/jalali";
import { formatPersianNumber } from "@/lib/formatters";
import { getPrisma } from "@/lib/prisma";

const nextSteps = [
  "تالار اصلی را ثبت کنید",
  "سالن‌ها را تعریف کنید",
  "منوها و خدمات را اضافه کنید",
  "ثبت قرارداد را شروع کنید",
];

export default async function HallsPage() {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const tenantId = membership.tenantId;
  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";
  const halls = await db.hall.findMany({
    where: { tenantId },
    include: {
      _count: {
        select: {
          salons: true,
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  });

  const activeCount = halls.filter((hall) => hall.isActive).length;
  const totalCapacity = halls.reduce(
    (sum, hall) => sum + (hall.totalCapacity ?? 0),
    0,
  );
  const lastUpdated = halls[0]?.updatedAt ?? null;

  return (
    <section className="space-y-5 sm:space-y-7">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2.25rem] sm:p-7 lg:p-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f] sm:px-4 sm:py-2 sm:text-sm">
              <Building2 size={15} />
              تعاریف پایه / تالارها
            </div>
            <h1 className="mt-4 text-2xl font-black leading-tight sm:mt-5 sm:text-4xl">
              مدیریت تالارها
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:mt-4 sm:text-base sm:leading-8">
              تالارها، شعبه‌ها یا مجموعه‌های پذیرایی خود را تعریف کنید تا در
              مراحل بعدی سالن‌ها، قراردادها و گزارش‌ها به‌درستی به آن‌ها متصل
              شوند.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-black text-[#7d6841]">
              <CalendarDays size={16} className="text-[#9f7131]" />
              <span>{formatJalaliDate(new Date())}</span>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:min-w-80 sm:p-5">
            <p className="text-xs font-black text-[#f0dba9]">فضای کاری</p>
            <h2 className="mt-2 text-2xl font-black text-[#fff9ed]">
              {membership.tenant.name}
            </h2>
            <div className="gold-divider my-4" />
            <a href="#new-hall" className="btn-luxury-primary w-full px-5 py-3">
              <Plus size={17} />
              افزودن تالار جدید
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard label="تعداد تالارها" value={formatPersianNumber(halls.length)} />
        <SummaryCard label="تالارهای فعال" value={formatPersianNumber(activeCount)} />
        <SummaryCard
          label="مجموع ظرفیت ثبت‌شده"
          value={
            totalCapacity
              ? `${formatPersianNumber(totalCapacity)} نفر`
              : formatPersianNumber(0)
          }
        />
        <SummaryCard
          label="آخرین به‌روزرسانی"
          value={formatJalaliDate(lastUpdated)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-4">
          {halls.length ? (
            halls.map((hall) => (
              <HallCard
                key={hall.id}
                hall={{
                  id: hall.id,
                  name: hall.name,
                  code: hall.code,
                  province: hall.province,
                  city: hall.city,
                  address: hall.address,
                  phone: hall.phone,
                  managerName: hall.managerName,
                  totalCapacity: hall.totalCapacity,
                  description: hall.description,
                  isActive: hall.isActive,
                  updatedAt: hall.updatedAt,
                  salonCount: hall._count.salons,
                }}
                canEdit={canEdit}
              />
            ))
          ) : (
            <EmptyState />
          )}
        </div>

        <aside className="space-y-4">
          <section
            id="new-hall"
            className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6"
          >
            <p className="text-xs font-black text-[#17483f]">
              افزودن تالار جدید
            </p>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">
              ثبت تالار یا شعبه
            </h2>
            <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
              پس از ثبت تالار، می‌توانید سالن‌ها، منوها و قراردادها را به این
              ساختار متصل کنید.
            </p>
            <div className="mt-5">
              <HallForm mode="create" canEdit={canEdit} />
            </div>
          </section>

          <RelatedSections />
        </aside>
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-3.5 text-[#111827] shadow-[0_18px_56px_rgba(17,24,39,0.07)] sm:rounded-[1.65rem] sm:p-5">
      <p className="text-xs font-black leading-6 text-[#7d6841] sm:text-sm">
        {label}
      </p>
      <p className="mt-2 break-words text-xl font-black leading-tight sm:text-2xl">
        {value}
      </p>
    </article>
  );
}

type HallCardProps = {
  hall: {
    id: string;
    name: string;
    code: string | null;
    province: string | null;
    city: string | null;
    address: string | null;
    phone: string | null;
    managerName: string | null;
    totalCapacity: number | null;
    description: string | null;
    isActive: boolean;
    updatedAt: Date;
    salonCount: number;
  };
  canEdit: boolean;
};

function HallCard({ hall, canEdit }: HallCardProps) {
  const location = [hall.province, hall.city].filter(Boolean).join(" / ");

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-black ${
                hall.isActive
                  ? "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]"
                  : "border-[#b45353]/24 bg-[#fff1f1] text-[#8f2c2c]"
              }`}
            >
              {hall.isActive ? "فعال" : "غیرفعال"}
            </span>
            {hall.code ? (
              <span className="rounded-full border border-[#c7a15a]/28 bg-[#c7a15a]/10 px-3 py-1 text-xs font-black text-[#7d6841]">
                کد: {hall.code}
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 text-2xl font-black leading-tight">{hall.name}</h2>
          <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
            {hall.description || "توضیحی برای این تالار ثبت نشده است."}
          </p>
        </div>

        <ToggleHallStatusForm
          hallId={hall.id}
          isActive={hall.isActive}
          canEdit={canEdit}
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <InfoItem
          icon={MapPin}
          label="موقعیت"
          value={location || "ثبت نشده"}
          helper={hall.address ?? "آدرس کامل ثبت نشده است"}
        />
        <InfoItem
          icon={Phone}
          label="تماس"
          value={hall.phone ?? "ثبت نشده"}
          helper={hall.managerName ? `مسئول: ${hall.managerName}` : "مسئول ثبت نشده"}
        />
        <InfoItem
          icon={Users}
          label="ظرفیت و سالن"
          value={
            hall.totalCapacity
              ? `${formatPersianNumber(hall.totalCapacity)} نفر`
              : "ظرفیت ثبت نشده"
          }
          helper={`${formatPersianNumber(hall.salonCount)} سالن متصل`}
        />
        <InfoItem
          icon={CalendarDays}
          label="آخرین به‌روزرسانی"
          value={formatJalaliDateTime(hall.updatedAt)}
          helper="بر اساس آخرین تغییر اطلاعات تالار"
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link href="/dashboard/salons" className="btn-luxury-dark px-5 py-3">
          مشاهده سالن‌ها
          <ArrowLeft size={17} />
        </Link>
        <details className="group rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-center gap-2 px-5 py-3 text-sm font-black text-[#111827]">
            <Edit3 size={17} />
            ویرایش
          </summary>
          <div className="border-t border-[#d8c08b]/50 p-4">
            <HallForm mode="edit" values={toFormValues(hall)} canEdit={canEdit} />
          </div>
        </details>
      </div>
    </article>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 p-3.5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black text-[#7d6841]">{label}</p>
          <p className="mt-1 break-words text-sm font-black leading-6 text-[#111827]">
            {value}
          </p>
          <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">
            {helper}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="rounded-[1.75rem] border border-dashed border-[#c7a15a]/55 bg-[#fff9ee]/94 p-5 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-7">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
        <Building2 size={24} />
      </div>
      <h2 className="mt-5 text-2xl font-black">هنوز تالاری تعریف نشده است</h2>
      <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">
        برای شروع ساختار پایه، ابتدا تالار یا شعبه اصلی مجموعه خود را ثبت
        کنید. سپس می‌توانید سالن‌ها، منوها و قراردادها را به آن متصل کنید.
      </p>
      <a href="#new-hall" className="btn-luxury-primary mt-5 px-5 py-3">
        <Plus size={17} />
        افزودن اولین تالار
      </a>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {nextSteps.map((step, index) => (
          <div
            key={step}
            className="flex items-start gap-3 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 p-4 text-sm font-bold leading-7 text-[#111827]"
          >
            <CheckCircle2 className="mt-1 shrink-0 text-[#c7a15a]" size={17} />
            <span>
              {formatPersianNumber(index + 1)}. {step}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function RelatedSections() {
  const links = [
    {
      href: "/dashboard/salons",
      title: "مدیریت سالن‌ها",
      icon: Users,
    },
    {
      href: "/dashboard/menus",
      title: "تعریف منوها",
      icon: Sparkles,
    },
    {
      href: "/dashboard/contract-settings",
      title: "تنظیمات قرارداد",
      icon: ClipboardList,
    },
  ];

  return (
    <section className="rounded-[1.75rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:rounded-[2rem] sm:p-6">
      <p className="text-xs font-black text-[#f0dba9]">گام‌های بعدی</p>
      <h2 className="mt-1 text-xl font-black">بعد از ثبت تالار</h2>
      <div className="gold-divider my-5" />
      <div className="grid gap-2.5">
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.10] bg-white/[0.055] p-3 text-sm font-black text-[#fff8ea] transition hover:border-[#e8c478]/30 hover:bg-white/[0.08]"
            >
              <span className="flex items-center gap-3">
                <Icon size={18} className="text-[#f0dba9]" />
                {link.title}
              </span>
              <ArrowLeft size={16} className="text-[#f0dba9]" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function toFormValues(hall: HallCardProps["hall"]): HallFormValues {
  return {
    id: hall.id,
    name: hall.name,
    code: hall.code ?? "",
    province: hall.province ?? "",
    city: hall.city ?? "",
    address: hall.address ?? "",
    phone: hall.phone ?? "",
    managerName: hall.managerName ?? "",
    totalCapacity: hall.totalCapacity ? String(hall.totalCapacity) : "",
    description: hall.description ?? "",
    isActive: hall.isActive,
  };
}
