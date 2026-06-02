"use client";

import type { PaymentMethodType } from "@prisma/client";
import type { ReactNode } from "react";
import { AlertCircle, Building2, FileImage, ReceiptText, Save } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { createExpenseAction, updateExpenseAction } from "@/lib/actions/expense-actions";
import { initialExpenseActionState } from "@/lib/actions/expense-state";
import { toPersianDigits } from "@/lib/date/jalali";
import { expenseChequeStatusOptions, expenseStatusOptions, type ExpenseStatus } from "@/lib/expenses/display";
import { formatIRR } from "@/lib/formatters";
import { formatPaymentMethodLabel } from "@/lib/payments/display";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { ReceiptUploadField } from "@/components/dashboard/payments/receipt-upload-field";
import { RialInput } from "@/components/ui/rial-input";

export type ExpenseFormOption = {
  id: string;
  label: string;
};

export type ExpenseFormPaymentMethod = {
  id: string;
  title: string;
  type: PaymentMethodType;
};

export type ExpenseFormContract = {
  id: string;
  contractNo: string;
  customerId: string;
  customerName: string;
  eventDateLabel: string;
  hallId?: string | null;
  hallName?: string | null;
  salonId?: string | null;
  salonName?: string | null;
  finalTotal?: string | number | null;
};

export type ExpenseFormValues = {
  id?: string;
  title: string;
  amount: string;
  occurredAt: string | Date;
  status: ExpenseStatus;
  financialCategoryId?: string | null;
  paymentMethodId?: string | null;
  contractId?: string | null;
  customerId?: string | null;
  hallId?: string | null;
  salonId?: string | null;
  vendorName?: string | null;
  referenceNumber?: string | null;
  note?: string | null;
  receiptImageUrl?: string | null;
  chequeNumber?: string | null;
  chequeDueDate?: string | Date | null;
  chequeBankName?: string | null;
  chequeBranchName?: string | null;
  chequeRecipientName?: string | null;
  chequeAmount?: string | null;
  chequeStatus?: string | null;
};

type ExpenseFormProps = {
  mode: "create" | "edit";
  canEdit: boolean;
  categories: ExpenseFormOption[];
  paymentMethods: ExpenseFormPaymentMethod[];
  contracts: ExpenseFormContract[];
  customers: ExpenseFormOption[];
  halls: ExpenseFormOption[];
  salons: Array<ExpenseFormOption & { hallId: string }>;
  values: ExpenseFormValues;
  backHref?: string;
};

function parseLocalizedAmount(value: string) {
  const english = value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[,\s٬،]/g, "");
  const amount = Number(english);
  return Number.isFinite(amount) ? amount : 0;
}

export function ExpenseForm({
  mode,
  canEdit,
  categories,
  paymentMethods,
  contracts,
  customers,
  halls,
  salons,
  values,
  backHref = "/dashboard/expenses",
}: ExpenseFormProps) {
  const action = mode === "create" ? createExpenseAction : updateExpenseAction;
  const [state, formAction, isPending] = useActionState(action, initialExpenseActionState);
  const [selectedContractId, setSelectedContractId] = useState(values.contractId ?? "");
  const [selectedCustomerId, setSelectedCustomerId] = useState(values.customerId ?? "");
  const [selectedHallId, setSelectedHallId] = useState(values.hallId ?? "");
  const [selectedSalonId, setSelectedSalonId] = useState(values.salonId ?? "");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState(values.paymentMethodId ?? "");
  const [amountValue, setAmountValue] = useState(values.amount);
  const [chequeAmount, setChequeAmount] = useState(values.chequeAmount ?? values.amount);
  const selectedContract = useMemo(
    () => contracts.find((contract) => contract.id === selectedContractId),
    [contracts, selectedContractId],
  );
  const selectedPaymentMethod = useMemo(
    () => paymentMethods.find((method) => method.id === selectedPaymentMethodId),
    [paymentMethods, selectedPaymentMethodId],
  );
  const effectiveCustomerId = selectedContract?.customerId ?? selectedCustomerId;
  const effectiveHallId = selectedContract?.hallId ?? selectedHallId;
  const effectiveSalonId = selectedContract?.salonId ?? selectedSalonId;
  const visibleSalons = useMemo(
    () => salons.filter((salon) => !effectiveHallId || salon.hallId === effectiveHallId),
    [salons, effectiveHallId],
  );
  const amount = useMemo(() => parseLocalizedAmount(amountValue), [amountValue]);
  const chequeAmountNumber = useMemo(() => parseLocalizedAmount(chequeAmount), [chequeAmount]);
  const isCheque = selectedPaymentMethod?.type === "CHECK";
  const hasChequeAmountWarning = isCheque && amount > 0 && chequeAmountNumber > 0 && chequeAmountNumber !== amount;

  return (
    <form action={formAction} className="grid gap-4 sm:gap-5" encType="multipart/form-data">
      {values.id ? <input type="hidden" name="expenseId" value={values.id} /> : null}

      {!canEdit ? (
        <Alert tone="warning">فقط مالک یا مدیر فضای کاری می‌تواند هزینه ثبت یا ویرایش کند.</Alert>
      ) : null}
      {state.message ? <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert> : null}

      <section className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_14px_42px_rgba(17,24,39,0.055)] sm:p-5">
        <SectionTitle icon={<ReceiptText size={18} />} title="اطلاعات هزینه" />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Field label="عنوان هزینه" name="title" defaultValue={values.title} disabled={!canEdit} required />
          <label className="grid gap-1.5 text-xs font-black text-[#172033]">
            <span>مبلغ هزینه<span className="mr-1 text-[#9f7131]">*</span></span>
            <RialInput name="amount" value={amountValue} onValueChange={setAmountValue} disabled={!canEdit} required />
          </label>
          <JalaliDatePicker name="occurredAt" label="تاریخ وقوع هزینه" defaultValue={values.occurredAt} disabled={!canEdit} required />
          <Select label="وضعیت" name="status" defaultValue={values.status} disabled={!canEdit}>
            {expenseStatusOptions.filter((status) => status.value !== "CANCELED" || mode === "edit").map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </Select>
          <Select label="دسته‌بندی مالی" name="financialCategoryId" defaultValue={values.financialCategoryId ?? ""} disabled={!canEdit}>
            <option value="">بدون دسته‌بندی</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
          </Select>
          <label className="grid gap-1.5 text-xs font-black text-[#172033]">
            <span>روش پرداخت هزینه</span>
            <select
              name="paymentMethodId"
              value={selectedPaymentMethodId}
              onChange={(event) => setSelectedPaymentMethodId(event.target.value)}
              className="input-luxury min-h-12 py-2 text-sm"
              disabled={!canEdit}
            >
              <option value="">ثبت نشده</option>
              {paymentMethods.map((method) => <option key={method.id} value={method.id}>{formatPaymentMethodLabel(method)}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-3 rounded-2xl border border-[#d8c08b]/46 bg-white/[0.48] px-4 py-3 text-xs font-bold leading-6 text-[#7d6841]">
          پیش‌نمایش مبلغ: <span className="font-black text-[#172033]">{amount > 0 ? formatIRR(amount) : "—"}</span>
        </div>
        {isCheque ? (
          <div className="mt-4 rounded-[1.35rem] border border-[#c7a15a]/34 bg-[#fff7e6]/78 p-3 shadow-[0_10px_28px_rgba(199,161,90,0.08)] sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-black text-[#172033]">اطلاعات چک هزینه</h3>
                <p className="mt-1 text-xs font-bold leading-6 text-[#7d6841]">
                  برای هزینه‌های چکی، شماره چک، مبلغ و تاریخ سررسید باید به‌صورت ساختاری ثبت شود.
                </p>
              </div>
              <span className="w-fit rounded-full border border-[#c7a15a]/42 bg-white/55 px-3 py-1 text-[11px] font-black text-[#7d6841]">
                روش پرداخت: چک
              </span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Field label="شماره چک" name="chequeNumber" defaultValue={values.chequeNumber ?? ""} disabled={!canEdit} dir="ltr" required />
              <JalaliDatePicker name="chequeDueDate" label="تاریخ سررسید" defaultValue={values.chequeDueDate ?? null} disabled={!canEdit} required />
              <label className="grid gap-1.5 text-xs font-black text-[#172033]">
                <span>مبلغ چک<span className="mr-1 text-[#9f7131]">*</span></span>
                <RialInput name="chequeAmount" value={chequeAmount} onValueChange={setChequeAmount} disabled={!canEdit} required />
              </label>
              <Field label="بانک" name="chequeBankName" defaultValue={values.chequeBankName ?? ""} disabled={!canEdit} />
              <Field label="شعبه" name="chequeBranchName" defaultValue={values.chequeBranchName ?? ""} disabled={!canEdit} />
              <Field label="دریافت‌کننده چک" name="chequeRecipientName" defaultValue={values.chequeRecipientName ?? values.vendorName ?? ""} disabled={!canEdit} />
              <Select label="وضعیت چک" name="chequeStatus" defaultValue={values.chequeStatus ?? "PENDING"} disabled={!canEdit}>
                {expenseChequeStatusOptions.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </Select>
            </div>
            {hasChequeAmountWarning ? (
              <div className="mt-3 rounded-2xl border border-[#c7a15a]/34 bg-white/58 px-4 py-3 text-xs font-bold leading-6 text-[#7d6841]">
                مبلغ چک با مبلغ هزینه برابر نیست. در صورت ثبت چک بخشی از هزینه، این اختلاف را در توضیحات مشخص کنید.
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_14px_42px_rgba(17,24,39,0.055)] sm:p-5">
        <SectionTitle icon={<Building2 size={18} />} title="ارتباطات" />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-1.5 text-xs font-black text-[#172033]">
            <span>قرارداد مرتبط</span>
            <select
              name="contractId"
              value={selectedContractId}
              onChange={(event) => setSelectedContractId(event.target.value)}
              className="input-luxury min-h-12 py-2 text-sm"
              disabled={!canEdit}
            >
              <option value="">بدون قرارداد</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {toPersianDigits(contract.contractNo)} — {contract.customerName}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-black text-[#172033]">
            <span>مشتری مرتبط</span>
            <select
              name="customerId"
              value={effectiveCustomerId ?? ""}
              onChange={(event) => setSelectedCustomerId(event.target.value)}
              className="input-luxury min-h-12 py-2 text-sm"
              disabled={!canEdit || Boolean(selectedContract)}
            >
              <option value="">بدون مشتری</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.label}</option>)}
            </select>
            {selectedContract ? <input type="hidden" name="customerId" value={selectedContract.customerId} /> : null}
          </label>
          <label className="grid gap-1.5 text-xs font-black text-[#172033]">
            <span>تالار</span>
            <select
              name="hallId"
              value={effectiveHallId ?? ""}
              onChange={(event) => {
                setSelectedHallId(event.target.value);
                setSelectedSalonId("");
              }}
              className="input-luxury min-h-12 py-2 text-sm"
              disabled={!canEdit || Boolean(selectedContract)}
            >
              <option value="">بدون تالار</option>
              {halls.map((hall) => <option key={hall.id} value={hall.id}>{hall.label}</option>)}
            </select>
            {selectedContract?.hallId ? <input type="hidden" name="hallId" value={selectedContract.hallId} /> : null}
          </label>
          <label className="grid gap-1.5 text-xs font-black text-[#172033]">
            <span>سالن</span>
            <select
              name="salonId"
              value={effectiveSalonId ?? ""}
              onChange={(event) => setSelectedSalonId(event.target.value)}
              className="input-luxury min-h-12 py-2 text-sm"
              disabled={!canEdit || Boolean(selectedContract)}
            >
              <option value="">بدون سالن</option>
              {visibleSalons.map((salon) => <option key={salon.id} value={salon.id}>{salon.label}</option>)}
            </select>
            {selectedContract?.salonId ? <input type="hidden" name="salonId" value={selectedContract.salonId} /> : null}
          </label>
        </div>
        {selectedContract ? (
          <div className={`mt-4 rounded-[1.35rem] border p-4 text-sm font-bold ${selectedContract.hallId && selectedContract.salonId ? "border-[#25a46d]/18 bg-[#25a46d]/10 text-[#17483f]" : "border-[#c7a15a]/34 bg-[#fff4d8] text-[#7d6841]"}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-black text-[#172033]">خلاصه قرارداد انتخاب‌شده</p>
                <p className="mt-1 text-xs leading-6 text-current">
                  هزینه به قرارداد {toPersianDigits(selectedContract.contractNo)} متصل می‌شود.
                </p>
              </div>
              <span className="w-fit rounded-full border border-white/55 bg-white/46 px-3 py-1 text-[11px] font-black">
                {selectedContract.hallId && selectedContract.salonId ? "تکمیل خودکار فعال" : "نیازمند تکمیل اطلاعات قرارداد"}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <ContractMeta label="مشتری" value={selectedContract.customerName} />
              <ContractMeta label="تاریخ مراسم" value={selectedContract.eventDateLabel} />
              <ContractMeta label="تالار" value={selectedContract.hallName ?? "ثبت نشده"} />
              <ContractMeta label="سالن" value={selectedContract.salonName ?? "ثبت نشده"} />
              <ContractMeta label="مبلغ قرارداد" value={selectedContract.finalTotal ? formatIRR(selectedContract.finalTotal) : "ثبت نشده"} />
            </div>
            <p className="mt-3 text-xs font-black leading-6">
              {selectedContract.hallId && selectedContract.salonId ? "تالار و سالن از قرارداد انتخاب‌شده تکمیل شد." : "اطلاعات تالار یا سالن در قرارداد انتخاب‌شده ثبت نشده است."}
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_14px_42px_rgba(17,24,39,0.055)] sm:p-5">
        <SectionTitle icon={<FileImage size={18} />} title="اطلاعات فاکتور و رسید" />
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.15fr)]">
          <ReceiptUploadField disabled={!canEdit} currentReceiptUrl={values.receiptImageUrl} />
          <div className="grid gap-3">
            <Field label="فروشنده / دریافت‌کننده" name="vendorName" defaultValue={values.vendorName ?? ""} disabled={!canEdit} />
            <Field label="شماره فاکتور یا مرجع" name="referenceNumber" defaultValue={values.referenceNumber ?? ""} disabled={!canEdit} dir="ltr" />
            <label className="grid gap-1.5 text-xs font-black text-[#172033]">
              <span>توضیحات</span>
              <textarea
                name="note"
                defaultValue={values.note ?? ""}
                className="input-luxury min-h-28 resize-y py-3 text-sm leading-7"
                disabled={!canEdit}
              />
            </label>
          </div>
        </div>
      </section>

      <div className="sticky bottom-3 z-10 grid gap-3 rounded-[1.4rem] border border-[#c7a15a]/30 bg-[linear-gradient(135deg,rgba(23,31,43,0.98),rgba(12,20,31,0.98))] p-3 text-[#fff8ea] shadow-[0_18px_70px_rgba(17,24,39,0.22)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <p className="text-sm font-black">{mode === "create" ? "ثبت هزینه جدید" : "ذخیره تغییرات هزینه"}</p>
          <p className="mt-1 text-xs font-bold leading-5 text-[#f0dba9]/78">
            هزینه‌های لغوشده در گزارش سود و زیان محاسبه نمی‌شوند.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[24rem]">
          <a href={backHref} className="btn-luxury-secondary justify-center border-white/10 bg-white/8 px-5 py-3 text-[#fff8ea] hover:bg-white/12">
            بازگشت
          </a>
          <button className="btn-luxury-primary justify-center px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60" disabled={!canEdit || isPending} type="submit">
            <Save size={17} />
            {isPending ? "در حال ذخیره..." : "ذخیره هزینه"}
          </button>
        </div>
      </div>
    </form>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-9 place-items-center rounded-2xl bg-[#172033] text-[#f0dba9]">{icon}</span>
      <h2 className="text-lg font-black text-[#172033]">{title}</h2>
    </div>
  );
}

function ContractMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/55 bg-white/42 px-3 py-2">
      <p className="text-[11px] font-black opacity-75">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-[#172033]">{value}</p>
    </div>
  );
}

function Alert({ children, tone }: { children: ReactNode; tone: "success" | "warning" | "error" }) {
  const styles = {
    success: "border-[#25a46d]/22 bg-[#25a46d]/10 text-[#17483f]",
    warning: "border-[#c7a15a]/34 bg-[#fff4d8] text-[#7d6841]",
    error: "border-[#b45353]/20 bg-[#fff1f1] text-[#8f2c2c]",
  }[tone];

  return (
    <div className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-bold leading-7 ${styles}`}>
      <AlertCircle className="mt-1 shrink-0" size={17} />
      <span>{children}</span>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  defaultValue,
  disabled,
  required,
  inputMode,
  dir,
}: {
  label: string;
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  inputMode?: "numeric" | "text";
  dir?: "ltr" | "rtl";
}) {
  return (
    <label className="grid gap-1.5 text-xs font-black text-[#172033]">
      <span>{label}{required ? <span className="mr-1 text-[#9f7131]">*</span> : null}</span>
      <input
        name={name}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        defaultValue={value === undefined ? defaultValue : undefined}
        className="input-luxury min-h-12 py-2 text-sm"
        disabled={disabled}
        required={required}
        inputMode={inputMode}
        dir={dir}
      />
    </label>
  );
}

function Select({
  label,
  name,
  defaultValue,
  disabled,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-black text-[#172033]">
      <span>{label}</span>
      <select name={name} defaultValue={defaultValue} className="input-luxury min-h-12 py-2 text-sm" disabled={disabled}>
        {children}
      </select>
    </label>
  );
}
