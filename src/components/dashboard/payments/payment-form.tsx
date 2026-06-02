"use client";

import type { ReactNode } from "react";
import { AlertCircle, Banknote, FileImage, Save, ShieldCheck } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { createPaymentAction, updatePaymentAction } from "@/lib/actions/payment-actions";
import { initialPaymentActionState } from "@/lib/actions/payment-state";
import {
  formatPaymentMethodLabel,
  paymentMethodTypeLabels,
  paymentStatusRecordLabels,
  paymentStatusValues,
  paymentTypeLabels,
  paymentTypeValues,
  type PaymentRecordStatus,
  type PaymentTypeValue,
} from "@/lib/payments/display";
import { toPersianDigits } from "@/lib/date/jalali";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { ReceiptUploadField } from "@/components/dashboard/payments/receipt-upload-field";
import { RialInput } from "@/components/ui/rial-input";

type ContractFinancialStateCode = "POSITIVE" | "SETTLED" | "NEGATIVE" | "NEUTRAL" | "CANCELED";
type InstallmentStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELED";

export type PaymentFormContract = {
  id: string;
  contractNo: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  eventDateLabel: string;
  finalTotal: number;
  paidAmount: number;
  remainingAmount: number;
  financialState: ContractFinancialStateCode;
  financialStateLabel: string;
  canReceiveReceipt: boolean;
  receiptBlockReason?: string;
};

export type PaymentFormCustomer = {
  id: string;
  fullName: string;
  phone: string;
};

export type PaymentFormMethod = {
  id: string;
  title: string;
  type: keyof typeof paymentMethodTypeLabels;
};

export type InstallmentFormRow = {
  amount: string;
  dueDate: string;
  status: InstallmentStatus;
  notes?: string;
};

export type PaymentFormValues = {
  id?: string;
  contractId?: string;
  customerId?: string;
  paymentMethodId?: string;
  type: PaymentTypeValue;
  status: PaymentRecordStatus;
  amount: string;
  paidAt: string;
  referenceNumber?: string;
  trackingCode?: string;
  chequeNumber?: string;
  chequeDueDate?: string;
  chequeBankName?: string;
  chequeBranchName?: string;
  chequeOwnerName?: string;
  chequeAmount?: string;
  chequeStatus?: string;
  installmentCount?: string;
  installmentStartDate?: string;
  installmentIntervalDays?: string;
  installments?: InstallmentFormRow[];
  note?: string;
  receiptImageUrl?: string | null;
};

type PaymentFormProps = {
  mode: "create" | "edit";
  canEdit: boolean;
  contracts: PaymentFormContract[];
  customers: PaymentFormCustomer[];
  methods: PaymentFormMethod[];
  values: PaymentFormValues;
  backHref?: string;
};

const installmentStatusLabels: Record<InstallmentStatus, string> = {
  PENDING: "در انتظار دریافت",
  PAID: "دریافت‌شده",
  OVERDUE: "سررسید گذشته",
  CANCELED: "لغوشده",
};

const installmentStatusValues = Object.keys(installmentStatusLabels) as InstallmentStatus[];

function parseLocalizedAmount(value: string | number | null | undefined) {
  const english = String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[,\s٬،]/g, "");
  const amount = Number(english);

  return Number.isFinite(amount) ? amount : 0;
}

function normalizeIntegerText(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^0-9]/g, "");
}

function addDaysToIsoDate(isoDate: string, days: number) {
  const base = isoDate ? new Date(`${isoDate}T00:00:00.000Z`) : new Date();
  if (Number.isNaN(base.getTime())) {
    return "";
  }

  base.setUTCDate(base.getUTCDate() + days);
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}-${String(base.getUTCDate()).padStart(2, "0")}`;
}

function buildInstallmentRows(total: number, count: number, startDate: string, intervalDays: number, existingRows?: InstallmentFormRow[]) {
  if (!count || count < 1) return [];

  const safeCount = Math.min(Math.max(count, 1), 60);
  const baseAmount = safeCount > 0 ? Math.floor(total / safeCount) : 0;
  const remainder = total - baseAmount * safeCount;

  return Array.from({ length: safeCount }, (_, index): InstallmentFormRow => {
    const previous = existingRows?.[index];

    return {
      amount: previous?.amount ?? String(baseAmount + (index === safeCount - 1 ? remainder : 0)),
      dueDate: previous?.dueDate ?? addDaysToIsoDate(startDate, index * intervalDays),
      status: previous?.status ?? "PENDING",
      notes: previous?.notes ?? "",
    };
  });
}

export function PaymentForm({
  mode,
  canEdit,
  contracts,
  customers,
  methods,
  values,
  backHref = "/dashboard/payments",
}: PaymentFormProps) {
  const action = mode === "create" ? createPaymentAction : updatePaymentAction;
  const [state, formAction, isPending] = useActionState(action, initialPaymentActionState);
  const [selectedContractId, setSelectedContractId] = useState(values.contractId ?? "");
  const [selectedMethodId, setSelectedMethodId] = useState(values.paymentMethodId ?? methods[0]?.id ?? "");
  const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentTypeValue>(values.type);
  const [amountValue, setAmountValue] = useState(values.amount);
  const [finalSettlement, setFinalSettlement] = useState(false);
  const [chequeAmountValue, setChequeAmountValue] = useState(values.chequeAmount ?? values.amount);
  const [chequeAmountTouched, setChequeAmountTouched] = useState(Boolean(values.chequeAmount && values.chequeAmount !== values.amount));
  const [installmentCount, setInstallmentCount] = useState(values.installmentCount ?? "3");
  const [installmentStartDate, setInstallmentStartDate] = useState(values.installmentStartDate ?? values.paidAt);
  const [installmentIntervalDays, setInstallmentIntervalDays] = useState(values.installmentIntervalDays ?? "30");
  const [installmentRows, setInstallmentRows] = useState<InstallmentFormRow[]>(() => buildInstallmentRows(
    parseLocalizedAmount(values.amount),
    Number(normalizeIntegerText(values.installmentCount ?? "3")) || 3,
    values.installmentStartDate ?? values.paidAt,
    Number(normalizeIntegerText(values.installmentIntervalDays ?? "30")) || 30,
    values.installments,
  ));

  const selectedContract = useMemo(
    () => contracts.find((contract) => contract.id === selectedContractId),
    [contracts, selectedContractId],
  );
  const selectedMethod = useMemo(
    () => methods.find((method) => method.id === selectedMethodId),
    [methods, selectedMethodId],
  );
  const isCheque = selectedMethod?.type === "CHECK";
  const isInstallment = selectedPaymentType === "INSTALLMENT";
  const isContractBlocked = Boolean(mode === "create" && selectedContract && selectedPaymentType !== "REFUND" && !selectedContract.canReceiveReceipt);

  useEffect(() => {
    if (!finalSettlement || !selectedContract) {
      return;
    }

    const nextAmount = String(Math.max(0, Math.round(selectedContract.remainingAmount)));
    setAmountValue(nextAmount);
    if (isInstallment) {
      resetInstallmentRows(nextAmount);
    }
  }, [finalSettlement, selectedContract?.id, selectedContract?.remainingAmount]);

  const paymentAmount = useMemo(() => parseLocalizedAmount(amountValue), [amountValue]);
  const effectiveChequeAmountValue = chequeAmountTouched ? chequeAmountValue : amountValue;
  const chequeAmount = useMemo(() => parseLocalizedAmount(effectiveChequeAmountValue), [effectiveChequeAmountValue]);
  const effectivePaymentAmount = selectedPaymentType === "REFUND" ? -paymentAmount : paymentAmount;
  const remainingAfterPayment = selectedContract
    ? selectedContract.remainingAmount - effectivePaymentAmount
    : null;
  const isOverpayment = Boolean(
    mode === "create" && selectedContract && selectedContract.canReceiveReceipt && selectedPaymentType !== "REFUND" && paymentAmount > selectedContract.remainingAmount,
  );
  const settlesContract = Boolean(
    selectedContract && paymentAmount > 0 && selectedPaymentType !== "REFUND" && remainingAfterPayment !== null && remainingAfterPayment <= 0,
  );
  const installmentTotal = installmentRows.reduce((sum, row) => sum + parseLocalizedAmount(row.amount), 0);
  const installmentMismatch = isInstallment && installmentRows.length > 0 && paymentAmount > 0 && installmentTotal !== paymentAmount;
  const chequeAmountMismatch = isCheque && chequeAmount > 0 && paymentAmount > 0 && chequeAmount !== paymentAmount;
  const submitBlocked = !canEdit || isPending || isContractBlocked || isOverpayment || installmentMismatch;

  function resetInstallmentRows(nextAmount: string, nextCount = installmentCount, nextStartDate = installmentStartDate, nextIntervalDays = installmentIntervalDays) {
    setInstallmentRows(buildInstallmentRows(
      parseLocalizedAmount(nextAmount),
      Number(normalizeIntegerText(nextCount)) || 1,
      nextStartDate,
      Number(normalizeIntegerText(nextIntervalDays)) || 30,
    ));
  }

  function refreshInstallmentRows(nextCount = installmentCount, nextStartDate = installmentStartDate, nextIntervalDays = installmentIntervalDays) {
    setInstallmentRows((previousRows) => buildInstallmentRows(
      paymentAmount,
      Number(normalizeIntegerText(nextCount)) || 1,
      nextStartDate,
      Number(normalizeIntegerText(nextIntervalDays)) || 30,
      previousRows,
    ));
  }

  function handleAmountChange(nextValue: string) {
    setFinalSettlement(false);
    setAmountValue(nextValue);
    if (isInstallment) {
      resetInstallmentRows(nextValue);
    }
  }

  function handleFinalSettlementChange(checked: boolean) {
    setFinalSettlement(checked);
    if (checked && selectedContract) {
      const nextAmount = String(Math.max(0, Math.round(selectedContract.remainingAmount)));
      setAmountValue(nextAmount);
      if (isInstallment) {
        resetInstallmentRows(nextAmount);
      }
    }
  }

  function handlePaymentTypeChange(nextValue: string) {
    const nextType = nextValue as PaymentTypeValue;
    setSelectedPaymentType(nextType);
    if (nextType === "INSTALLMENT" && installmentRows.length === 0) {
      resetInstallmentRows(amountValue);
    }
  }

  return (
    <form action={formAction} className="grid gap-4 sm:gap-5" encType="multipart/form-data">
      {values.id ? <input type="hidden" name="paymentId" value={values.id} /> : null}

      {!canEdit ? (
        <Alert tone="warning">فقط مالک یا مدیر فضای کاری می‌تواند دریافت ثبت یا ویرایش کند.</Alert>
      ) : null}
      {state.message ? <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert> : null}

      <section className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_14px_42px_rgba(17,24,39,0.055)] sm:p-5">
        <SectionTitle icon={<Banknote size={18} />} title="اتصال به قرارداد" />
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <label className="grid gap-1.5 text-xs font-black text-[#172033]">
            <span>قرارداد</span>
            <select
              name="contractId"
              value={selectedContractId}
              onChange={(event) => setSelectedContractId(event.target.value)}
              className="input-luxury min-h-12 py-2 text-sm"
              disabled={!canEdit}
            >
              <option value="">بدون قرارداد / دریافت مستقل</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {toPersianDigits(contract.contractNo)} - {contract.customerName} - {contract.customerPhone} {!contract.canReceiveReceipt ? `— ${contract.financialStateLabel}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-xs font-black text-[#172033]">
            <span>مشتری</span>
            <select
              name="customerId"
              defaultValue={values.customerId ?? selectedContract?.customerId ?? ""}
              className="input-luxury min-h-12 py-2 text-sm"
              disabled={!canEdit || Boolean(selectedContract)}
            >
              <option value="">انتخاب مشتری</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.fullName} - {toPersianDigits(customer.phone)}
                </option>
              ))}
            </select>
            {selectedContract ? <input type="hidden" name="customerId" value={selectedContract.customerId} /> : null}
          </label>
        </div>

        {selectedContract ? (
          <>
            <div className={`mt-4 grid gap-2 rounded-[1.25rem] border p-3 text-sm font-bold sm:grid-cols-2 lg:grid-cols-5 ${getFinancialPanelClassName(selectedContract.financialState)}`}>
              <MiniRow label="تاریخ مراسم" value={selectedContract.eventDateLabel} />
              <MiniRow label="مبلغ نهایی" value={formatIRR(selectedContract.finalTotal)} />
              <MiniRow label="دریافتی ثبت‌شده" value={formatIRR(selectedContract.paidAmount)} />
              <MiniRow label="مانده قابل دریافت" value={formatIRR(Math.max(0, selectedContract.remainingAmount))} strong />
              <MiniRow label="وضعیت تسویه" value={selectedContract.financialStateLabel} strong={!selectedContract.canReceiveReceipt} />
            </div>
            {mode === "create" && selectedPaymentType !== "REFUND" && selectedContract.canReceiveReceipt ? (
              <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-[1.25rem] border border-[#25a46d]/24 bg-[#25a46d]/10 px-4 py-3 text-sm font-black leading-7 text-[#17483f]">
                <input
                  type="checkbox"
                  name="finalSettlement"
                  checked={finalSettlement}
                  onChange={(event) => handleFinalSettlementChange(event.target.checked)}
                  className="mt-1 size-4 accent-[#25a46d]"
                  disabled={!canEdit}
                />
                <span>
                  تسویه نهایی این قرارداد
                  <span className="block text-xs font-bold text-[#28715d]">
                    با فعال‌سازی، مبلغ دریافت برابر مانده قرارداد ثبت می‌شود، مانده صفر می‌شود و وضعیت قرارداد به «تسویه کامل» تغییر می‌کند.
                  </span>
                </span>
              </label>
            ) : null}
          </>
        ) : (
          <p className="mt-3 rounded-2xl border border-[#d8c08b]/46 bg-white/[0.48] px-4 py-3 text-xs font-bold leading-6 text-[#7d6841]">
            برای دریافت مستقل، مشتری را مشخص کنید.
          </p>
        )}
      </section>

      {isContractBlocked ? <Alert tone="error">{selectedContract?.receiptBlockReason ?? "این قرارداد امکان ثبت دریافت جدید ندارد."}</Alert> : null}
      {isOverpayment ? <Alert tone="error">مبلغ دریافتی از مانده قرارداد بیشتر است.</Alert> : null}

      <section className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_14px_42px_rgba(17,24,39,0.055)] sm:p-5">
        <SectionTitle icon={<ShieldCheck size={18} />} title="اطلاعات دریافت" />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Select
            label="نوع دریافت"
            name="type"
            value={selectedPaymentType}
            onChange={handlePaymentTypeChange}
            disabled={!canEdit}
          >
            {paymentTypeValues.map((type) => (
              <option key={type} value={type}>{paymentTypeLabels[type]}</option>
            ))}
          </Select>
          <Select label="وضعیت" name="status" defaultValue={values.status} disabled={!canEdit}>
            {paymentStatusValues.filter((status) => status !== "CANCELED" && status !== "RETURNED").map((status) => (
              <option key={status} value={status}>{paymentStatusRecordLabels[status]}</option>
            ))}
          </Select>
          <label className="grid gap-1.5 text-xs font-black text-[#172033]">
            <span>روش دریافت</span>
            <select
              name="paymentMethodId"
              value={selectedMethodId}
              onChange={(event) => setSelectedMethodId(event.target.value)}
              className="input-luxury min-h-12 py-2 text-sm"
              disabled={!canEdit}
              required
            >
              <option value="">انتخاب روش دریافت</option>
              {methods.map((method) => (
                <option key={method.id} value={method.id}>
                  {formatPaymentMethodLabel(method)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-black text-[#172033]">
            <span>مبلغ دریافتی</span>
            <RialInput name="amount" value={amountValue} onValueChange={handleAmountChange} placeholder="25,000,000" disabled={!canEdit || finalSettlement} required />
          </label>
          <JalaliDatePicker name="paidAt" label="تاریخ دریافت" defaultValue={values.paidAt} disabled={!canEdit} required />
          <Field label="کد پیگیری / مرجع" name="trackingCode" defaultValue={values.trackingCode ?? values.referenceNumber ?? ""} placeholder="کد پیگیری کارت‌خوان یا حواله" disabled={!canEdit} dir="ltr" />
          <input type="hidden" name="referenceNumber" value={values.referenceNumber ?? ""} />
        </div>
      </section>

      {isCheque ? (
        <section className="rounded-[1.55rem] border border-[#c7a15a]/48 bg-[#fff7e6]/88 p-4 shadow-[0_14px_42px_rgba(17,24,39,0.05)] sm:p-5">
          <SectionTitle icon={<Banknote size={18} />} title="اطلاعات چک" />
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Field label="شماره چک" name="chequeNumber" defaultValue={values.chequeNumber ?? ""} placeholder="شماره چک" disabled={!canEdit} dir="ltr" required />
            <JalaliDatePicker name="chequeDueDate" label="تاریخ سررسید چک" defaultValue={values.chequeDueDate ?? null} disabled={!canEdit} required />
            <label className="grid gap-1.5 text-xs font-black text-[#172033]">
              <span>مبلغ چک</span>
              <RialInput
                name="chequeAmount"
                value={effectiveChequeAmountValue}
                onValueChange={(value) => {
                  setChequeAmountTouched(true);
                  setChequeAmountValue(value);
                }}
                placeholder="25,000,000"
                disabled={!canEdit}
                required
              />
            </label>
            <Field label="بانک" name="chequeBankName" defaultValue={values.chequeBankName ?? ""} placeholder="نام بانک" disabled={!canEdit} />
            <Field label="شعبه" name="chequeBranchName" defaultValue={values.chequeBranchName ?? ""} placeholder="نام شعبه" disabled={!canEdit} />
            <Field label="صاحب چک" name="chequeOwnerName" defaultValue={values.chequeOwnerName ?? ""} placeholder="نام صاحب چک" disabled={!canEdit} />
            <Select label="وضعیت چک" name="chequeStatus" defaultValue={values.chequeStatus ?? "PENDING"} disabled={!canEdit}>
              <option value="PENDING">در انتظار وصول</option>
              <option value="CLEARED">وصول‌شده</option>
              <option value="BOUNCED">برگشتی</option>
              <option value="CANCELED">لغوشده</option>
              <option value="TRANSFERRED">خرج‌شده / واگذار شده</option>
            </Select>
          </div>
          {chequeAmountMismatch ? (
            <p className="mt-3 rounded-2xl border border-[#c7a15a]/34 bg-white/55 px-4 py-3 text-xs font-black leading-6 text-[#7d6841]">
              مبلغ چک با مبلغ دریافتی برابر نیست. در صورت ثبت دریافت جزئی یا چندابزاری، قبل از ذخیره مبلغ‌ها را دوباره بررسی کنید.
            </p>
          ) : null}
        </section>
      ) : null}

      {isInstallment ? (
        <section className="rounded-[1.55rem] border border-[#25a46d]/24 bg-[#ecfff5]/84 p-4 shadow-[0_14px_42px_rgba(17,24,39,0.05)] sm:p-5">
          <SectionTitle icon={<ShieldCheck size={18} />} title="برنامه اقساط" />
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1.5 text-xs font-black text-[#172033]">
              <span>تعداد اقساط</span>
              <input
                name="installmentCount"
                value={installmentCount}
                onChange={(event) => {
                  const nextValue = normalizeIntegerText(event.target.value);
                  setInstallmentCount(nextValue);
                  refreshInstallmentRows(nextValue);
                }}
                placeholder="۳"
                className="input-luxury min-h-12 py-2 text-sm"
                disabled={!canEdit}
                inputMode="numeric"
                required
              />
            </label>
            <label className="grid gap-1.5 text-xs font-black text-[#172033]">
              <span>مبلغ کل اقساط</span>
              <RialInput name="installmentTotalAmount" value={amountValue} onValueChange={handleAmountChange} placeholder="25,000,000" disabled={!canEdit} required />
            </label>
            <JalaliDatePicker name="installmentStartDate" label="تاریخ شروع اقساط" value={installmentStartDate} onChange={(value) => {
                const nextValue = value ?? "";
                setInstallmentStartDate(nextValue);
                refreshInstallmentRows(installmentCount, nextValue);
              }} disabled={!canEdit} required />
            <Field
              label="فاصله اقساط (روز)"
              name="installmentIntervalDays"
              value={installmentIntervalDays}
              onChange={(value) => {
                const nextValue = normalizeIntegerText(value);
                setInstallmentIntervalDays(nextValue);
                refreshInstallmentRows(installmentCount, installmentStartDate, nextValue);
              }}
              placeholder="۳۰"
              disabled={!canEdit}
              inputMode="numeric"
              required
            />
          </div>

          <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-[#25a46d]/22 bg-white/62">
            <div className="hidden grid-cols-[5rem_minmax(11rem,1fr)_minmax(11rem,1fr)_minmax(11rem,1fr)_minmax(12rem,1.1fr)] gap-2 border-b border-[#25a46d]/18 bg-[#17483f]/8 px-3 py-2 text-xs font-black text-[#17483f] lg:grid">
              <span>شماره</span>
              <span>مبلغ قسط</span>
              <span>تاریخ سررسید</span>
              <span>وضعیت</span>
              <span>توضیحات</span>
            </div>
            <div className="grid gap-2 p-3">
              {installmentRows.map((row, index) => (
                <div key={index} className="grid gap-2 rounded-2xl border border-[#d8c08b]/42 bg-[#fff9ee]/78 p-3 lg:grid-cols-[5rem_minmax(11rem,1fr)_minmax(11rem,1fr)_minmax(11rem,1fr)_minmax(12rem,1.1fr)] lg:items-center">
                  <div className="text-xs font-black text-[#17483f]">قسط {formatPersianNumber(index + 1)}</div>
                  <label className="grid gap-1 text-xs font-black text-[#172033] lg:block">
                    <span className="lg:hidden">مبلغ قسط</span>
                    <RialInput
                      name="installmentAmount"
                      value={row.amount}
                      onValueChange={(value) => setInstallmentRows((rows) => rows.map((item, rowIndex) => rowIndex === index ? { ...item, amount: value } : item))}
                      disabled={!canEdit}
                      required
                    />
                  </label>
                  <JalaliDatePicker
                    name="installmentDueDate"
                    label="تاریخ سررسید"
                    value={row.dueDate}
                    onChange={(value) => setInstallmentRows((rows) => rows.map((item, rowIndex) => rowIndex === index ? { ...item, dueDate: value ?? "" } : item))}
                    disabled={!canEdit}
                    required
                    className="lg:[&>span]:hidden"
                  />
                  <Select
                    label="وضعیت"
                    name="installmentStatus"
                    value={row.status}
                    onChange={(value) => setInstallmentRows((rows) => rows.map((item, rowIndex) => rowIndex === index ? { ...item, status: value as InstallmentStatus } : item))}
                    disabled={!canEdit}
                  >
                    {installmentStatusValues.map((status) => <option key={status} value={status}>{installmentStatusLabels[status]}</option>)}
                  </Select>
                  <Field
                    label="توضیحات"
                    name="installmentNotes"
                    value={row.notes ?? ""}
                    onChange={(value) => setInstallmentRows((rows) => rows.map((item, rowIndex) => rowIndex === index ? { ...item, notes: value } : item))}
                    placeholder="توضیح اختیاری"
                    disabled={!canEdit}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className={`mt-3 rounded-2xl border px-4 py-3 text-xs font-black leading-6 ${installmentMismatch ? "border-[#b45353]/18 bg-[#fff1f1] text-[#8f2c2c]" : "border-[#25a46d]/22 bg-white/58 text-[#17483f]"}`}>
            مجموع اقساط: {formatIRR(installmentTotal)} · مبلغ تعریف‌شده: {paymentAmount > 0 ? formatIRR(paymentAmount) : "—"}
            {installmentMismatch ? <span className="block">مجموع اقساط با مبلغ تعریف‌شده برابر نیست.</span> : null}
          </div>
        </section>
      ) : null}

      <section className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_14px_42px_rgba(17,24,39,0.055)] sm:p-5">
        <SectionTitle icon={<FileImage size={18} />} title="رسید و توضیحات" />
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.15fr)]">
          <ReceiptUploadField disabled={!canEdit} currentReceiptUrl={values.receiptImageUrl} />
          <label className="grid gap-1.5 text-xs font-black text-[#172033]">
            <span>توضیحات</span>
            <textarea
              name="note"
              defaultValue={values.note ?? ""}
              placeholder="توضیح حسابداری، شرایط دریافت یا نکته مرتبط با رسید"
              className="input-luxury min-h-28 resize-y py-3 text-sm leading-7"
              disabled={!canEdit}
            />
          </label>
        </div>
      </section>

      <div className="sticky bottom-3 z-10 grid gap-3 rounded-[1.4rem] border border-[#c7a15a]/30 bg-[linear-gradient(135deg,rgba(23,31,43,0.98),rgba(12,20,31,0.98))] p-3 text-[#fff8ea] shadow-[0_18px_70px_rgba(17,24,39,0.22)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <PaymentImpactSummary
          selectedContract={selectedContract}
          paymentAmount={paymentAmount}
          remainingAfterPayment={remainingAfterPayment}
          isOverpayment={isOverpayment}
          settlesContract={settlesContract}
          isBlocked={isContractBlocked}
          installmentTotal={isInstallment ? installmentTotal : null}
          installmentMismatch={installmentMismatch}
          chequeAmount={isCheque ? chequeAmount : null}
          chequeAmountMismatch={chequeAmountMismatch}
        />
        <div className="grid grid-cols-2 gap-2 sm:flex lg:justify-end">
          <a href={backHref} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 px-5 py-3 text-sm font-black text-[#7d6841]">
            انصراف
          </a>
          <button type="submit" disabled={submitBlocked} className="btn-luxury-dark min-h-12 px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60">
            <Save size={17} />
            {isPending ? "در حال ذخیره..." : mode === "create" ? "ثبت دریافت" : "ذخیره تغییرات"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Alert({ children, tone }: { children: ReactNode; tone: "success" | "error" | "warning" }) {
  const className =
    tone === "success"
      ? "border-[#25a46d]/22 bg-[#ecfff5] text-[#17483f]"
      : tone === "warning"
        ? "border-[#c7a15a]/32 bg-[#fff8ea] text-[#7d6841]"
        : "border-[#b45353]/18 bg-[#fff1f1] text-[#8f2c2c]";

  return (
    <div className={`flex items-start gap-2 rounded-3xl border px-4 py-3 text-sm font-black leading-7 ${className}`}>
      <AlertCircle size={18} className="mt-1 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-black text-[#17483f]">
      <span className="flex size-9 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">{icon}</span>
      <h2>{title}</h2>
    </div>
  );
}

function getFinancialPanelClassName(state: ContractFinancialStateCode) {
  if (state === "SETTLED") {
    return "border-[#25a46d]/22 bg-[#25a46d]/10 text-[#17483f]";
  }

  if (state === "POSITIVE") {
    return "border-[#c7a15a]/32 bg-[#fff7e6]/72 text-[#7d6841]";
  }

  if (state === "NEGATIVE" || state === "CANCELED") {
    return "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]";
  }

  return "border-[#6b7280]/20 bg-[#f3f4f6] text-[#374151]";
}

function MiniRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/50 bg-white/45 px-3 py-2">
      <p className="text-[11px] font-black text-[#7d6841]">{label}</p>
      <p className={`mt-1 text-sm font-black ${strong ? "text-[#17483f]" : "text-[#111827]"}`}>{value}</p>
    </div>
  );
}

function PaymentImpactSummary({
  selectedContract,
  paymentAmount,
  remainingAfterPayment,
  isOverpayment,
  settlesContract,
  isBlocked,
  installmentTotal,
  installmentMismatch,
  chequeAmount,
  chequeAmountMismatch,
}: {
  selectedContract: PaymentFormContract | undefined;
  paymentAmount: number;
  remainingAfterPayment: number | null;
  isOverpayment: boolean;
  settlesContract: boolean;
  isBlocked: boolean;
  installmentTotal: number | null;
  installmentMismatch: boolean;
  chequeAmount: number | null;
  chequeAmountMismatch: boolean;
}) {
  if (!selectedContract) {
    return (
      <div>
        <p className="text-sm font-black text-[#f0dba9]">ثبت دریافت مستقل</p>
        <p className="mt-1 text-xs font-bold leading-6 text-[#d8c08b]">برای نمایش مانده، یک قرارداد مرتبط انتخاب کنید.</p>
      </div>
    );
  }

  const displayRemainingAfter = remainingAfterPayment === null
    ? selectedContract.remainingAmount
    : Math.max(0, remainingAfterPayment);

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 text-xs font-black sm:grid-cols-3">
        <ImpactMetric label="مبلغ این دریافت" value={paymentAmount > 0 ? formatIRR(paymentAmount) : "—"} />
        <ImpactMetric label="مانده فعلی" value={formatIRR(Math.max(0, selectedContract.remainingAmount))} />
        <ImpactMetric label="مانده پس از ثبت" value={paymentAmount > 0 ? formatIRR(displayRemainingAfter) : "—"} emphasis />
      </div>
      {installmentTotal !== null ? (
        <p className={`rounded-2xl border px-3 py-2 text-xs font-black leading-6 ${installmentMismatch ? "border-[#b45353]/28 bg-[#b45353]/12 text-[#ffecec]" : "border-[#25a46d]/28 bg-[#25a46d]/14 text-[#d8fff0]"}`}>
          مجموع اقساط: {formatIRR(installmentTotal)}
        </p>
      ) : null}
      {chequeAmount !== null ? (
        <p className={`rounded-2xl border px-3 py-2 text-xs font-black leading-6 ${chequeAmountMismatch ? "border-[#f0dba9]/28 bg-[#f0dba9]/12 text-[#ffe8ad]" : "border-[#25a46d]/28 bg-[#25a46d]/14 text-[#d8fff0]"}`}>
          مبلغ چک: {chequeAmount > 0 ? formatIRR(chequeAmount) : "—"}
        </p>
      ) : null}
      {settlesContract ? (
        <p className="rounded-2xl border border-[#25a46d]/28 bg-[#25a46d]/14 px-3 py-2 text-xs font-black leading-6 text-[#d8fff0]">
          این دریافت قرارداد را تسویه می‌کند.
        </p>
      ) : null}
      {isBlocked ? (
        <p className="rounded-2xl border border-[#b45353]/28 bg-[#b45353]/12 px-3 py-2 text-xs font-black leading-6 text-[#ffecec]">
          {selectedContract.receiptBlockReason ?? "این قرارداد امکان ثبت دریافت جدید ندارد."}
        </p>
      ) : null}
      {isOverpayment ? (
        <p className="rounded-2xl border border-[#f0dba9]/28 bg-[#f0dba9]/12 px-3 py-2 text-xs font-black leading-6 text-[#ffe8ad]">
          مبلغ دریافتی از مانده قرارداد بیشتر است.
        </p>
      ) : null}
    </div>
  );
}

function ImpactMetric({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={`rounded-2xl border px-3 py-2 ${emphasis ? "border-[#25a46d]/32 bg-[#25a46d]/12" : "border-[#f0dba9]/18 bg-white/[0.055]"}`}>
      <p className="text-[11px] text-[#d8c08b]">{label}</p>
      <p className={`mt-1 text-sm font-black ${emphasis ? "text-[#d8fff0]" : "text-[#fff8ea]"}`}>{value}</p>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  value,
  onChange,
  placeholder,
  disabled,
  required,
  inputMode,
  dir,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
  inputMode?: "numeric" | "text";
  dir?: "ltr" | "rtl";
}) {
  return (
    <label className="grid gap-1.5 text-xs font-black text-[#172033]">
      <span>{label}</span>
      <input
        name={name}
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        placeholder={placeholder}
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
  value,
  onChange,
  disabled,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-black text-[#172033]">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className="input-luxury min-h-12 py-2 text-sm"
        disabled={disabled}
      >
        {children}
      </select>
    </label>
  );
}
