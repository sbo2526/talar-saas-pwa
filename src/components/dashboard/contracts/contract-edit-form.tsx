"use client";

import type { ReactNode } from "react";
import type { ContractStatus } from "@prisma/client";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CircleDollarSign, Plus, Save, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { updateContractFinancialsAction } from "@/lib/actions/contract-actions";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { RialInput } from "@/components/ui/rial-input";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { contractStatusLabels } from "@/lib/contracts/display";

type TotalMode = "AUTO" | "MANUAL";
type LineType = "PACKAGE" | "SERVICE" | "MENU" | "DRINK" | "DESSERT";
type PricingType = "FIXED" | "PER_GUEST" | "PER_HOUR" | "PER_ITEM" | "CUSTOM";

type EditableLineItem = {
  id?: string | null;
  key: string;
  type: LineType;
  pricingType: PricingType | null;
  sourceId?: string | null;
  category: string;
  name: string;
  quantity: string;
  unitLabel: string;
  unitPrice: string;
  totalPrice: string;
  note: string;
};

type ContractEditFormProps = {
  contract: {
    id: string;
    contractNo: string;
    salutation: string;
    customerName: string;
    customerMobile: string;
    nationalCode: string;
    address: string;
    eventTypeId: string;
    eventTypeName: string;
    eventDate: string;
    eventStartTime: string;
    eventEndTime: string;
    guestCount: string;
    hallId: string;
    salonId: string;
    status: ContractStatus;
    notes: string;
    servicesTotal: number;
    servicesTotalManual: boolean;
    menuTotal: number;
    menuTotalManual: boolean;
    discountAmount: number;
    depositAmount: number;
    finalTotal: number;
    finalTotalManual: boolean;
    remainingAmount: number;
    remainingAmountManual: boolean;
    paidAmount: number;
    lineItems: EditableLineItem[];
  };
  eventTypes: { id: string; name: string }[];
  halls: { id: string; name: string }[];
  salons: { id: string; hallId: string; name: string }[];
};

const lineTypeLabels: Record<LineType, string> = {
  PACKAGE: "پکیج",
  SERVICE: "خدمات",
  MENU: "منو",
  DRINK: "نوشیدنی",
  DESSERT: "دسر/مخلفات",
};

const pricingTypeLabels: Record<PricingType, string> = {
  FIXED: "ثابت",
  PER_GUEST: "هر مهمان",
  PER_HOUR: "هر ساعت",
  PER_ITEM: "هر تعداد",
  CUSTOM: "سفارشی",
};

const contractStatuses: ContractStatus[] = ["DRAFT", "RESERVED", "CONFIRMED", "COMPLETED", "CANCELED"];
const salutationOptions = ["جناب آقای", "سرکار خانم", "آقای", "خانم", "شرکت", "مجموعه"] as const;

function parseAmount(value: string | number | null | undefined) {
  const normalized = String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[٬،,\s]/g, "");
  const parsed = Number(normalized || "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

function toMoneyText(value: number) {
  return String(Math.max(0, Math.round(value)));
}

function isManualLineType(type: LineType, servicesTotalMode: TotalMode, menuTotalMode: TotalMode) {
  if (type === "PACKAGE") {
    return false;
  }

  return type === "SERVICE"
    ? servicesTotalMode === "MANUAL"
    : menuTotalMode === "MANUAL";
}

export function ContractEditForm({ contract, eventTypes, halls, salons }: ContractEditFormProps) {
  const [lineItems, setLineItems] = useState<EditableLineItem[]>(contract.lineItems);
  const [servicesTotalMode, setServicesTotalMode] = useState<TotalMode>(contract.servicesTotalManual ? "MANUAL" : "AUTO");
  const [servicesManualTotal, setServicesManualTotal] = useState(toMoneyText(contract.servicesTotal));
  const [menuTotalMode, setMenuTotalMode] = useState<TotalMode>(contract.menuTotalManual ? "MANUAL" : "AUTO");
  const [menuManualTotal, setMenuManualTotal] = useState(toMoneyText(contract.menuTotal));
  const [finalTotalMode, setFinalTotalMode] = useState<TotalMode>(contract.finalTotalManual ? "MANUAL" : "AUTO");
  const [finalManualTotal, setFinalManualTotal] = useState(toMoneyText(contract.finalTotal));
  const [remainingAmountMode, setRemainingAmountMode] = useState<TotalMode>(contract.remainingAmountManual ? "MANUAL" : "AUTO");
  const [remainingManualAmount, setRemainingManualAmount] = useState(toMoneyText(contract.remainingAmount));
  const [discountAmount, setDiscountAmount] = useState(toMoneyText(contract.discountAmount));
  const [depositAmount, setDepositAmount] = useState(toMoneyText(contract.depositAmount));
  const eventTypeIsCatalogItem = eventTypes.some((type) => type.id === contract.eventTypeId);
  const [salutation, setSalutation] = useState(contract.salutation || salutationOptions[0]);
  const [customerName, setCustomerName] = useState(contract.customerName);
  const [customerMobile, setCustomerMobile] = useState(contract.customerMobile);
  const [nationalCode, setNationalCode] = useState(contract.nationalCode);
  const [address, setAddress] = useState(contract.address);
  const [eventTypeId, setEventTypeId] = useState(eventTypeIsCatalogItem ? contract.eventTypeId : "none");
  const [customEventType, setCustomEventType] = useState(eventTypeIsCatalogItem ? "" : contract.eventTypeName);
  const [eventDate, setEventDate] = useState<string | null>(contract.eventDate || null);
  const [eventStartTime, setEventStartTime] = useState(contract.eventStartTime);
  const [eventEndTime, setEventEndTime] = useState(contract.eventEndTime);
  const [guestCount, setGuestCount] = useState(contract.guestCount);
  const [hallId, setHallId] = useState(contract.hallId || "none");
  const [salonId, setSalonId] = useState(contract.salonId || "none");
  const [status, setStatus] = useState<ContractStatus>(contract.status);
  const [notes, setNotes] = useState(contract.notes);

  const pricedLineItems = useMemo(
    () => lineItems
      .map((item) => {
        const quantity = Math.max(1, Math.trunc(parseAmount(item.quantity)));
        const unitPrice = parseAmount(item.unitPrice);
        const totalPrice = parseAmount(item.totalPrice);

        return {
          id: item.id ?? null,
          type: item.type,
          pricingType: item.pricingType ?? "CUSTOM",
          sourceId: item.sourceId ?? null,
          category: item.category.trim(),
          name: item.name.trim(),
          quantity,
          unitLabel: item.unitLabel.trim() || "مورد",
          unitPrice,
          totalPrice,
          note: item.note.trim() || undefined,
        };
      })
      .filter((item) => item.name && item.totalPrice >= 0),
    [lineItems],
  );

  const normalizedLineItems = useMemo(
    () => pricedLineItems.map((item) => {
      if (!isManualLineType(item.type, servicesTotalMode, menuTotalMode)) {
        return item;
      }

      return {
        ...item,
        unitPrice: 0,
        totalPrice: 0,
        note: item.note
          ? `${item.note} | مبلغ ردیف به‌دلیل جمع دستی دسته صفر شده است.`
          : "مبلغ ردیف به‌دلیل جمع دستی دسته صفر شده است.",
      };
    }),
    [menuTotalMode, pricedLineItems, servicesTotalMode],
  );

  const autoServicesTotal = pricedLineItems
    .filter((item) => item.type === "SERVICE")
    .reduce((sum, item) => sum + item.totalPrice, 0);
  const autoMenuTotal = pricedLineItems
    .filter((item) => item.type !== "SERVICE" && item.type !== "PACKAGE")
    .reduce((sum, item) => sum + item.totalPrice, 0);
  const autoPackageTotal = pricedLineItems
    .filter((item) => item.type === "PACKAGE")
    .reduce((sum, item) => sum + item.totalPrice, 0);
  const servicesTotal = servicesTotalMode === "MANUAL" ? parseAmount(servicesManualTotal) : autoServicesTotal;
  const menuTotal = menuTotalMode === "MANUAL" ? parseAmount(menuManualTotal) : autoMenuTotal;
  const subtotal = autoPackageTotal + servicesTotal + menuTotal;
  const discount = parseAmount(discountAmount);
  const deposit = parseAmount(depositAmount);
  const autoFinalTotal = Math.max(0, subtotal - discount);
  const finalTotal = finalTotalMode === "MANUAL" ? parseAmount(finalManualTotal) : autoFinalTotal;
  const autoRemaining = Math.max(0, finalTotal - contract.paidAmount);
  const remainingAmount = remainingAmountMode === "MANUAL" ? parseAmount(remainingManualAmount) : autoRemaining;
  const hasDiscountWarning = discount > subtotal;
  const hasDepositWarning = deposit > finalTotal;
  const selectedHallSalons = useMemo(
    () => salons.filter((salon) => hallId === "none" || salon.hallId === hallId),
    [hallId, salons],
  );

  function updateLine(key: string, patch: Partial<EditableLineItem>) {
    setLineItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function removeLine(key: string) {
    setLineItems((current) => current.filter((item) => item.key !== key));
  }

  function addLine(type: LineType) {
    setLineItems((current) => [
      ...current,
      {
        key: `new-${Date.now()}-${current.length}`,
        id: null,
        type,
        pricingType: "CUSTOM",
        sourceId: null,
        category: type === "SERVICE" ? "خدمات سفارشی" : type === "PACKAGE" ? "پکیج اختصاصی مراسم" : "آیتم‌های اضافی منو",
        name: "",
        quantity: "1",
        unitLabel: "مورد",
        unitPrice: "0",
        totalPrice: "0",
        note: "",
      },
    ]);
  }

  return (
    <form action={updateContractFinancialsAction} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
      <input type="hidden" name="contractId" value={contract.id} />
      <input type="hidden" name="lineItems" value={JSON.stringify(normalizedLineItems)} />
      <input type="hidden" name="servicesTotalMode" value={servicesTotalMode} />
      <input type="hidden" name="menuTotalMode" value={menuTotalMode} />
      <input type="hidden" name="finalTotalMode" value={finalTotalMode} />
      <input type="hidden" name="remainingAmountMode" value={remainingAmountMode} />
      {servicesTotalMode !== "MANUAL" ? <input type="hidden" name="servicesManualTotal" value={servicesManualTotal} /> : null}
      {menuTotalMode !== "MANUAL" ? <input type="hidden" name="menuManualTotal" value={menuManualTotal} /> : null}
      {finalTotalMode !== "MANUAL" ? <input type="hidden" name="finalManualTotal" value={finalManualTotal} /> : null}
      {remainingAmountMode !== "MANUAL" ? <input type="hidden" name="remainingManualAmount" value={remainingManualAmount} /> : null}

      <section className="space-y-4">
        <div className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_14px_42px_rgba(17,24,39,0.055)] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-[#7d6841]">ویرایش کنترل‌شده قرارداد</p>
              <h2 className="mt-1 text-xl font-black text-[#111827]">قرارداد {contract.contractNo}</h2>
            </div>
            <Link href={`/dashboard/contracts/${contract.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-4 py-2 text-xs font-black text-[#7d6841]">
              <ArrowRight size={15} />
              بازگشت
            </Link>
          </div>
          <p className="mt-3 text-sm font-bold leading-7 text-[#6d5f49]">
            مبالغ، مانده و ردیف‌های قرارداد اینجا قابل اصلاح هستند. هر تغییر در تاریخچه فعالیت ثبت می‌شود.
          </p>
        </div>

        <div className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_14px_42px_rgba(17,24,39,0.055)] sm:p-5">
          <div className="flex items-center gap-2">
            <UserRound size={18} className="text-[#9f7131]" />
            <h3 className="text-lg font-black text-[#111827]">اطلاعات مشتری</h3>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Select name="salutation" label="عنوان" value={salutation} onChange={setSalutation}>
              {salutationOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </Select>
            <Field name="customerName" label="نام و نام خانوادگی" value={customerName} onChange={setCustomerName} placeholder="نام مشتری" required />
            <Field name="customerMobile" label="شماره همراه" value={customerMobile} onChange={setCustomerMobile} placeholder="09..." inputMode="tel" required />
            <Field name="nationalCode" label="کد ملی" value={nationalCode} onChange={setNationalCode} placeholder="اختیاری" inputMode="numeric" />
            <label className="grid gap-1.5 text-xs font-black text-[#172033] md:col-span-2">
              <span>نشانی مشتری</span>
              <textarea name="address" value={address} onChange={(event) => setAddress(event.target.value)} className="input-luxury min-h-24 resize-y py-2 text-sm" />
            </label>
          </div>
        </div>

        <div className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_14px_42px_rgba(17,24,39,0.055)] sm:p-5">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-[#9f7131]" />
            <h3 className="text-lg font-black text-[#111827]">اطلاعات مراسم و وضعیت</h3>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Select
              name="eventTypeId"
              label="نوع مراسم"
              value={customEventType ? "none" : eventTypeId}
              onChange={(value) => {
                setEventTypeId(value);
                setCustomEventType("");
              }}
            >
              <option value="none">انتخاب نوع مراسم</option>
              {eventTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
            </Select>
            <Field name="customEventType" label="نوع مراسم سفارشی" value={customEventType} onChange={setCustomEventType} placeholder="اگر در فهرست نبود، اینجا بنویسید" />
            <JalaliDatePicker name="eventDate" label="تاریخ مراسم" value={eventDate} onChange={setEventDate} minJalaliYear={1400} required />
            <Select name="status" label="وضعیت قرارداد" value={status} onChange={(value) => setStatus(value as ContractStatus)}>
              {contractStatuses.map((item) => <option key={item} value={item}>{contractStatusLabels[item]}</option>)}
            </Select>
            <Field name="eventStartTime" label="ساعت شروع" value={eventStartTime} onChange={setEventStartTime} placeholder="18:00" required />
            <Field name="eventEndTime" label="ساعت پایان" value={eventEndTime} onChange={setEventEndTime} placeholder="23:00" required />
            <Field name="guestCount" label="تعداد مهمان" value={guestCount} onChange={setGuestCount} placeholder="100" inputMode="numeric" required />
            <Select name="hallId" label="تالار" value={hallId} onChange={(value) => { setHallId(value); setSalonId("none"); }}>
              <option value="none">انتخاب نشده</option>
              {halls.map((hall) => <option key={hall.id} value={hall.id}>{hall.name}</option>)}
            </Select>
            <Select name="salonId" label="سالن" value={salonId} onChange={setSalonId}>
              <option value="none">انتخاب نشده</option>
              {selectedHallSalons.map((salon) => <option key={salon.id} value={salon.id}>{salon.name}</option>)}
            </Select>
            <label className="grid gap-1.5 text-xs font-black text-[#172033] md:col-span-2">
              <span>توضیحات قرارداد</span>
              <textarea name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} className="input-luxury min-h-24 resize-y py-2 text-sm" placeholder="توضیحات داخلی یا توافق‌های خاص قرارداد" />
            </label>
            <label className="grid gap-1.5 text-xs font-black text-[#172033] md:col-span-2">
              <span>توضیح ویرایش برای لاگ</span>
              <textarea name="editReason" className="input-luxury min-h-20 resize-y py-2 text-sm" placeholder="اختیاری؛ علت اصلاح قرارداد برای تاریخچه ثبت می‌شود." />
            </label>
          </div>
        </div>

        <div className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_14px_42px_rgba(17,24,39,0.055)] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-black text-[#111827]">ردیف‌های قرارداد</h3>
            <div className="flex flex-wrap gap-2">
              <AddButton onClick={() => addLine("MENU")}>افزودن آیتم منو</AddButton>
              <AddButton onClick={() => addLine("SERVICE")}>افزودن خدمت</AddButton>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <CategoryManualTotalControl
              title="کنترل جمع خدمات"
              description="اگر روشن باشد، جمع خدمات را دستی وارد می‌کنید و قیمت ردیف‌های خدمات صفر و قفل می‌شود."
              checkboxLabel="ورود دستی جمع خدمات"
              mode={servicesTotalMode}
              onModeChange={setServicesTotalMode}
              manualValue={servicesManualTotal}
              onManualValueChange={setServicesManualTotal}
              inputName="servicesManualTotal"
              autoValue={autoServicesTotal}
              effectiveValue={servicesTotal}
            />
            <CategoryManualTotalControl
              title="کنترل جمع منو"
              description="اگر روشن باشد، جمع منو را دستی وارد می‌کنید و قیمت ردیف‌های غذا و نوشیدنی صفر و قفل می‌شود."
              checkboxLabel="ورود دستی جمع منو"
              mode={menuTotalMode}
              onModeChange={setMenuTotalMode}
              manualValue={menuManualTotal}
              onManualValueChange={setMenuManualTotal}
              inputName="menuManualTotal"
              autoValue={autoMenuTotal}
              effectiveValue={menuTotal}
            />
          </div>

          <div className="mt-4 grid gap-3">
            {lineItems.map((item, index) => {
              const manualPricingLocked = isManualLineType(item.type, servicesTotalMode, menuTotalMode);

              return (
              <div key={item.key} className="rounded-3xl border border-[#d8c08b]/58 bg-white/60 p-3">
                <div className={manualPricingLocked ? "grid gap-3 md:grid-cols-[7rem_minmax(0,1fr)_9rem]" : "grid gap-3 md:grid-cols-[7rem_minmax(0,1fr)_9rem_9rem_9rem]"}>
                  <Select label="دسته" value={item.type} onChange={(value) => updateLine(item.key, { type: value as LineType })}>
                    {(Object.keys(lineTypeLabels) as LineType[]).map((type) => <option key={type} value={type}>{lineTypeLabels[type]}</option>)}
                  </Select>
                  <Field label={`نام آیتم ${formatPersianNumber(index + 1)}`} value={item.name} onChange={(value) => updateLine(item.key, { name: value })} placeholder="نام ردیف قرارداد" />
                  <Field label="تعداد" value={item.quantity} onChange={(value) => updateLine(item.key, { quantity: value })} placeholder="1" />
                  {!manualPricingLocked ? (
                    <>
                      <RialField label="قیمت واحد" value={item.unitPrice} onChange={(value) => updateLine(item.key, { unitPrice: value })} />
                      <RialField label="جمع ردیف" value={item.totalPrice} onChange={(value) => updateLine(item.key, { totalPrice: value })} />
                    </>
                  ) : null}
                </div>
                {manualPricingLocked ? (
                  <p className="mt-3 rounded-2xl border border-[#c7a15a]/32 bg-[#fff8ea] px-3 py-2 text-xs font-black leading-6 text-[#7d6841]">
                    جمع دسته این ردیف دستی است؛ فیلدهای قیمت واحد و جمع ردیف نمایش داده نمی‌شوند، مبلغ ردیف در ذخیره‌سازی صفر می‌شود و فقط نام آیتم در قرارداد باقی می‌ماند.
                  </p>
                ) : null}
                <div className="mt-3 grid gap-3 md:grid-cols-[10rem_minmax(0,1fr)_auto] md:items-end">
                  <Select label="نوع قیمت" value={item.pricingType ?? "CUSTOM"} onChange={(value) => updateLine(item.key, { pricingType: value as PricingType })}>
                    {(Object.keys(pricingTypeLabels) as PricingType[]).map((type) => <option key={type} value={type}>{pricingTypeLabels[type]}</option>)}
                  </Select>
                  <Field label="توضیح" value={item.note} onChange={(value) => updateLine(item.key, { note: value })} placeholder="توضیح اختیاری" />
                  <button type="button" onClick={() => removeLine(item.key)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#b45353]/22 bg-[#fff1f1] px-4 py-2 text-xs font-black text-[#8f2c2c]">
                    <Trash2 size={14} />
                    حذف
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="xl:sticky xl:top-24">
        <section className="card-luxury-dark p-4 text-[#fff8ea] sm:p-5">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="text-[#f0dba9]" size={20} />
            <h2 className="text-lg font-black">کنترل مالی قرارداد</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <ManualTotalControl label="جمع خدمات" mode={servicesTotalMode} onModeChange={setServicesTotalMode} manualValue={servicesManualTotal} onManualValueChange={setServicesManualTotal} autoValue={autoServicesTotal} effectiveValue={servicesTotal} />
            <ManualTotalControl label="جمع منو" mode={menuTotalMode} onModeChange={setMenuTotalMode} manualValue={menuManualTotal} onManualValueChange={setMenuManualTotal} autoValue={autoMenuTotal} effectiveValue={menuTotal} />
            <SummaryRow label="جمع قرارداد" value={subtotal} />
            <RialInput label="تخفیف" name="discountAmount" value={discountAmount} onValueChange={setDiscountAmount} inputClassName="input-luxury" className="text-sm font-black text-[#f0dba9]" />
            {hasDiscountWarning ? <Warning>تخفیف نمی‌تواند بیشتر از جمع قرارداد باشد.</Warning> : null}
            <RialInput label="بیعانه" name="depositAmount" value={depositAmount} onValueChange={setDepositAmount} inputClassName="input-luxury" className="text-sm font-black text-[#f0dba9]" />
            {hasDepositWarning ? <Warning>بیعانه نمی‌تواند بیشتر از مبلغ نهایی باشد.</Warning> : null}
            <ManualTotalControl label="جمع نهایی قرارداد" mode={finalTotalMode} onModeChange={setFinalTotalMode} manualValue={finalManualTotal} onManualValueChange={setFinalManualTotal} inputName="finalManualTotal" autoValue={autoFinalTotal} effectiveValue={finalTotal} strong />
            <SummaryRow label="دریافتی ثبت‌شده" value={contract.paidAmount} />
            <ManualTotalControl label="مانده قرارداد" mode={remainingAmountMode} onModeChange={setRemainingAmountMode} manualValue={remainingManualAmount} onManualValueChange={setRemainingManualAmount} inputName="remainingManualAmount" autoValue={autoRemaining} effectiveValue={remainingAmount} strong />
          </div>
          <button type="submit" className="btn-luxury-primary mt-5 w-full px-5 py-3">
            <Save size={17} />
            ذخیره ویرایش قرارداد
          </button>
        </section>
      </aside>
    </form>
  );
}

function AddButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-4 py-2 text-xs font-black text-[#7d6841]">
      <Plus size={14} />
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  name,
  required,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  name?: string;
  required?: boolean;
  inputMode?: "text" | "search" | "email" | "tel" | "url" | "none" | "numeric" | "decimal";
}) {
  return (
    <label className="grid gap-1.5 text-xs font-black text-[#172033]">
      <span>{label}</span>
      <input
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="input-luxury min-h-11 py-2 text-sm"
        required={required}
        inputMode={inputMode}
      />
    </label>
  );
}

function RialField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <RialInput
      label={label}
      value={value}
      onValueChange={disabled ? () => undefined : onChange}
      inputClassName={`input-luxury min-h-11 py-2 text-sm ${disabled ? "cursor-not-allowed bg-[#f3ede1] opacity-80" : ""}`}
      className="text-xs font-black text-[#172033]"
      disabled={disabled}
    />
  );
}

function Select({
  label,
  value,
  onChange,
  children,
  name,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  name?: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-black text-[#172033]">
      <span>{label}</span>
      <select name={name} value={value} onChange={(event) => onChange(event.target.value)} className="input-luxury min-h-11 py-2 text-sm">
        {children}
      </select>
    </label>
  );
}

function Warning({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-[#b45353]/28 bg-[#b45353]/12 px-3 py-2 text-xs font-black leading-6 text-[#ffd7d7]">{children}</p>;
}

function CategoryManualTotalControl({
  title,
  description,
  checkboxLabel,
  mode,
  onModeChange,
  manualValue,
  onManualValueChange,
  inputName,
  autoValue,
  effectiveValue,
}: {
  title: string;
  description: string;
  checkboxLabel: string;
  mode: TotalMode;
  onModeChange: (mode: TotalMode) => void;
  manualValue: string;
  onManualValueChange: (value: string) => void;
  inputName?: string;
  autoValue: number;
  effectiveValue: number;
}) {
  const isManual = mode === "MANUAL";

  return (
    <div className={`rounded-3xl border px-4 py-4 ${isManual ? "border-[#2fa66f]/34 bg-[#eafaf1]" : "border-[#d8c08b]/58 bg-[#fff8ea]/72"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <strong className="text-sm font-black text-[#172033]">{title}</strong>
          <span className="text-xs font-bold leading-6 text-[#7d6841]">{description}</span>
        </div>
        <span className="rounded-full border border-[#d8c08b]/62 bg-white/74 px-3 py-1 text-xs font-black text-[#17483f]">
          جمع فعلی: {formatIRR(effectiveValue)}
        </span>
      </div>
      <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[#c7a15a]/52 bg-white px-4 py-3 text-sm font-black text-[#172033] shadow-[0_10px_24px_rgba(23,32,51,0.055)]">
        <span>{checkboxLabel}</span>
        <input
          type="checkbox"
          checked={isManual}
          onChange={(event) => onModeChange(event.target.checked ? "MANUAL" : "AUTO")}
          className="size-5 accent-[#c7a15a]"
        />
      </label>
      {isManual ? (
        <div className="mt-3 grid gap-2">
          <RialInput
            name={inputName}
            value={manualValue}
            onValueChange={onManualValueChange}
            inputClassName="input-luxury min-h-12 py-2 text-sm"
          />
          <p className="rounded-2xl border border-[#2fa66f]/24 bg-white/70 px-3 py-2 text-xs font-black leading-6 text-[#17483f]">
            حالت دستی فعال است؛ جمع اتوماتیک {formatIRR(autoValue)} فقط برای اطلاع نمایش داده می‌شود و جایگزین مبلغ دستی نمی‌شود.
          </p>
        </div>
      ) : (
        <p className="mt-3 rounded-2xl border border-[#d8c08b]/42 bg-white/58 px-3 py-2 text-xs font-bold leading-6 text-[#7d6841]">
          حالت فعلی اتوماتیک است؛ سیستم مبلغ آیتم‌های انتخاب‌شده را بر اساس تعداد و تعرفه حساب می‌کند.
        </p>
      )}
    </div>
  );
}

function ManualTotalControl({
  label,
  mode,
  onModeChange,
  manualValue,
  onManualValueChange,
  inputName,
  autoValue,
  effectiveValue,
  strong,
}: {
  label: string;
  mode: TotalMode;
  onModeChange: (mode: TotalMode) => void;
  manualValue: string;
  onManualValueChange: (value: string) => void;
  inputName?: string;
  autoValue: number;
  effectiveValue: number;
  strong?: boolean;
}) {
  return (
    <div className={`grid gap-2 rounded-2xl border px-4 py-3 ${strong ? "border-[#f0dba9]/28 bg-[#f0dba9]/12" : "border-white/[0.08] bg-white/[0.05]"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold text-[#d9caa9]">{label}</span>
        <span className="text-sm font-black text-[#fff9ed]">{formatIRR(effectiveValue)}</span>
      </div>
      <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[#d8c08b]/42 bg-[#fff8ea]/92 px-3 py-2 text-xs font-black text-[#7d6841]">
        <span>ورود دستی جمع</span>
        <input
          type="checkbox"
          checked={mode === "MANUAL"}
          onChange={(event) => onModeChange(event.target.checked ? "MANUAL" : "AUTO")}
          className="size-4 accent-[#c7a15a]"
        />
      </label>
      {mode === "MANUAL" ? (
        <div className="grid gap-2">
          <RialInput name={inputName} value={manualValue} onValueChange={onManualValueChange} inputClassName="input-luxury min-h-10 py-2 text-sm" />
          <p className="rounded-2xl border border-[#ffd37a]/28 bg-[#f0dba9]/12 px-3 py-2 text-[11px] font-black leading-5 text-[#ffe8ad]">
            این جمع دستی است؛ تا وقتی دستی غیرفعال نشود، جمع اتوماتیک {formatIRR(autoValue)} جایگزین نمی‌شود.
          </p>
        </div>
      ) : (
        <p className="text-[11px] font-bold leading-5 text-[#d8c08b]">مبنای فعلی اتوماتیک است: {formatIRR(autoValue)}</p>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3">
      <span className="text-sm font-bold text-[#d9caa9]">{label}</span>
      <span className="text-sm font-black text-[#fff9ed]">{formatIRR(value)}</span>
    </div>
  );
}
