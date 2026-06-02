import { getPortalLinkByToken, markPortalDownload } from "@/lib/crm/data";
import { formatJalaliDate, toPersianDigits } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";

type OwnerPortalPrintPageProps = {
  params: Promise<{ token: string }>;
};

type PortalPrintLineItem = {
  id: string;
  name: string;
  totalPrice: { toString(): string } | string | number | null;
};

type PortalPrintContract = {
  contractNo: string;
  status: string;
  eventTypeName: string | null;
  eventDate: Date;
  eventStartTime: string | null;
  eventEndTime: string | null;
  guestCount: number;
  finalTotal: { toString(): string } | string | number | null;
  totalAmount: { toString(): string } | string | number | null;
  remainingAmount: { toString(): string } | string | number | null;
  customer: { fullName: string; phone: string };
  hall: { name: string | null } | null;
  salon: { name: string | null } | null;
  tenant: { name: string | null; hallProfile: { brandName: string | null } | null } | null;
  lineItems: PortalPrintLineItem[];
};

type PortalPrintLink = {
  contract: PortalPrintContract;
};

export default async function OwnerPortalPrintPage({ params }: OwnerPortalPrintPageProps) {
  const { token } = await params;
  const link = await getPortalLinkByToken(token, "OWNER_CONTRACT") as PortalPrintLink | null;
  if (!link) return <main className="p-8 text-center font-bold">لینک قرارداد معتبر نیست.</main>;
  await markPortalDownload(token);
  const contract = link.contract;
  const tenantName = contract.tenant?.hallProfile?.brandName ?? contract.tenant?.name ?? "تالار";
  const remainingAmount = contract.status === "CANCELED" ? 0 : Number(contract.remainingAmount ?? 0);

  return (
    <main dir="rtl" className="min-h-screen bg-white p-5 text-[#111827] print:p-0">
      <section className="mx-auto max-w-4xl rounded-3xl border border-[#d8c08b] bg-white p-6 print:rounded-none print:border-0">
        <div className="text-center">
          <p className="text-sm font-bold text-[#7d6841]">نسخه مشتری قرارداد</p>
          <h1 className="mt-2 text-2xl font-black">{tenantName}</h1>
          <p className="mt-2 text-sm font-bold">قرارداد شماره {toPersianDigits(contract.contractNo)}</p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Info label="نام مشتری" value={contract.customer.fullName} />
          <Info label="شماره تماس" value={contract.customer.phone} />
          <Info label="نوع مراسم" value={contract.eventTypeName ?? "—"} />
          <Info label="تاریخ مراسم" value={formatJalaliDate(contract.eventDate)} />
          <Info label="ساعت" value={[contract.eventStartTime, contract.eventEndTime].filter(Boolean).join(" تا ") || "—"} />
          <Info label="تعداد مهمان" value={`${toPersianDigits(formatPersianNumber(contract.guestCount))} نفر`} />
          <Info label="تالار" value={contract.hall?.name ?? "—"} />
          <Info label="سالن" value={contract.salon?.name ?? "—"} />
          <Info label="مبلغ نهایی" value={formatIRR(Number(contract.finalTotal ?? contract.totalAmount ?? 0))} />
          <Info label="مانده" value={contract.status === "CANCELED" ? "بسته‌شده" : formatIRR(remainingAmount)} />
        </div>
        <div className="mt-6 rounded-2xl border border-[#d8c08b] p-4">
          <h2 className="font-black">آیتم‌های قرارداد</h2>
          <div className="mt-3 space-y-2">
            {contract.lineItems.length ? contract.lineItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 border-b border-[#ead6a6] py-2 text-sm">
                <span className="font-bold">{item.name}</span>
                <span className="font-black">{formatIRR(Number(item.totalPrice ?? 0))}</span>
              </div>
            )) : <p className="text-sm font-bold text-[#7d6841]">آیتمی برای نمایش ثبت نشده است.</p>}
          </div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="h-28 rounded-2xl border border-dashed border-[#d8c08b] p-4 font-black">امضای مشتری</div>
          <div className="h-28 rounded-2xl border border-dashed border-[#d8c08b] p-4 font-black">امضای مدیر تالار</div>
        </div>
        <p className="mt-6 rounded-2xl bg-[#172033] px-4 py-3 text-sm font-black text-white print:hidden">برای چاپ یا ذخیره PDF از Ctrl+P استفاده کنید.</p>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[#ead6a6] p-3"><p className="text-xs font-bold text-[#7d6841]">{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>;
}
