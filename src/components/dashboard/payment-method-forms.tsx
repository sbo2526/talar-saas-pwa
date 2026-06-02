"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Landmark,
  Power,
  Save,
  Star,
} from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import {
  createPaymentMethodAction,
  setDefaultPaymentMethodAction,
  togglePaymentMethodStatusAction,
  updatePaymentMethodAction,
} from "@/lib/actions/payment-method-actions";
import { initialPaymentMethodActionState } from "@/lib/actions/payment-method-state";
import {
  paymentTypeOptions,
  type PaymentTypeValue,
} from "@/lib/payment-method-options";

export type PaymentMethodTypeValue = PaymentTypeValue;

export type PaymentMethodFormValues = {
  id?: string;
  title: string;
  code: string;
  type: PaymentMethodTypeValue;
  description: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  cardNumber: string;
  iban: string;
  posTerminalId: string;
  gatewayName: string;
  isDefault: boolean;
  isActive: boolean;
};

type PaymentMethodFormProps = {
  mode: "create" | "edit";
  values?: PaymentMethodFormValues;
  canEdit: boolean;
  focus?: "all" | "details";
};

const defaultFormValues: PaymentMethodFormValues = {
  title: "",
  code: "",
  type: "CASH",
  description: "",
  bankName: "",
  accountHolder: "",
  accountNumber: "",
  cardNumber: "",
  iban: "",
  posTerminalId: "",
  gatewayName: "",
  isDefault: false,
  isActive: true,
};

const typeGuidance: Record<PaymentMethodTypeValue, string> = {
  CASH: "برای دریافت نقدی فقط نام، وضعیت و توضیح کوتاه کافی است.",
  CARD: "برای کارت‌خوان، شناسه ترمینال مهم‌ترین اطلاعات عملیاتی است.",
  CARD_TO_CARD: "برای کارت‌به‌کارت، شماره کارت در لیست‌ها به‌صورت ماسک‌شده نمایش داده می‌شود.",
  BANK_TRANSFER: "برای حواله بانکی، بانک و یکی از شماره حساب یا شبا را تکمیل کنید.",
  CHECK: "برای دریافت چک، اطلاعات بانکی الزامی نیست و هنگام ثبت دریافت جزئیات چک وارد می‌شود.",
  ONLINE: "برای درگاه آنلاین، نام درگاه و شناسه ترمینال یا پذیرنده را ثبت کنید.",
  OTHER: "برای روش‌های خاص، توضیح کوتاه نحوه دریافت وجه را ثبت کنید.",
};

function getVisibleFields(type: PaymentMethodTypeValue) {
  return {
    bankName: ["CARD", "CARD_TO_CARD", "BANK_TRANSFER", "CHECK", "ONLINE"].includes(type),
    accountHolder: ["CARD", "CARD_TO_CARD", "BANK_TRANSFER", "CHECK"].includes(type),
    accountNumber: ["CARD_TO_CARD", "BANK_TRANSFER"].includes(type),
    cardNumber: type === "CARD_TO_CARD",
    iban: type === "BANK_TRANSFER",
    posTerminalId: type === "CARD" || type === "ONLINE",
    gatewayName: type === "ONLINE",
    description: true,
  };
}

export function PaymentMethodForm({
  mode,
  values,
  canEdit,
  focus = "all",
}: PaymentMethodFormProps) {
  const action =
    mode === "create" ? createPaymentMethodAction : updatePaymentMethodAction;
  const [state, formAction, isPending] = useActionState(
    action,
    initialPaymentMethodActionState,
  );
  const defaults = values ?? defaultFormValues;
  const [selectedType, setSelectedType] = useState<PaymentMethodTypeValue>(
    defaults.type,
  );
  const visible = useMemo(() => getVisibleFields(selectedType), [selectedType]);

  return (
    <form action={formAction} className="grid gap-4">
      {values?.id ? (
        <input type="hidden" name="paymentMethodId" value={values.id} />
      ) : null}

      {!canEdit ? (
        <Alert tone="warning">
          فقط مالک یا مدیر فضای کاری می‌تواند روش‌های دریافت را تغییر دهد.
        </Alert>
      ) : null}

      {state.message ? (
        <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="نام روش دریافت"
          name="title"
          defaultValue={defaults.title}
          placeholder="مثلاً کارت‌خوان سالن اصلی"
          disabled={!canEdit}
        />
        <Field
          label="کد داخلی"
          name="code"
          defaultValue={defaults.code}
          placeholder="مثلاً POS-MAIN"
          disabled={!canEdit}
          dir="ltr"
        />
        <label className="grid gap-2 text-sm font-black text-[#172033]">
          <span>نوع دریافت</span>
          <select
            name="type"
            value={selectedType}
            onChange={(event) =>
              setSelectedType(event.target.value as PaymentMethodTypeValue)
            }
            disabled={!canEdit}
            className="input-luxury disabled:cursor-not-allowed disabled:opacity-60"
          >
            {paymentTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-2xl border border-[#d8c08b]/58 bg-[#fff8ea]/68 px-4 py-3 text-xs font-bold leading-6 text-[#7d6841] md:self-end">
          {typeGuidance[selectedType]}
        </div>
      </div>

      {focus === "details" ? null : (
        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleField
            name="isDefault"
            label="روش پیش‌فرض باشد"
            defaultChecked={defaults.isDefault}
            disabled={!canEdit}
          />
          <ToggleField
            name="isActive"
            label="روش دریافت فعال است"
            defaultChecked={defaults.isActive}
            disabled={!canEdit}
          />
        </div>
      )}

      <section className="rounded-3xl border border-[#d8c08b]/58 bg-[#fff8ea]/58 p-3 sm:p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-black text-[#17483f]">
          <Landmark size={17} />
          اطلاعات مرتبط با نوع دریافت
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {visible.bankName ? (
            <Field
              label="نام بانک"
              name="bankName"
              defaultValue={defaults.bankName}
              placeholder="مثلاً ملت"
              disabled={!canEdit}
            />
          ) : null}
          {visible.accountHolder ? (
            <Field
              label="صاحب حساب"
              name="accountHolder"
              defaultValue={defaults.accountHolder}
              placeholder="نام صاحب حساب"
              disabled={!canEdit}
            />
          ) : null}
          {visible.accountNumber ? (
            <Field
              label="شماره حساب"
              name="accountNumber"
              defaultValue={defaults.accountNumber}
              placeholder="شماره حساب"
              disabled={!canEdit}
              dir="ltr"
              inputMode="numeric"
            />
          ) : null}
          {visible.cardNumber ? (
            <Field
              label="شماره کارت"
              name="cardNumber"
              defaultValue={defaults.cardNumber}
              placeholder="۱۶ رقم"
              disabled={!canEdit}
              dir="ltr"
              inputMode="numeric"
            />
          ) : null}
          {visible.iban ? (
            <Field
              label="شماره شبا"
              name="iban"
              defaultValue={defaults.iban}
              placeholder="IR..."
              disabled={!canEdit}
              dir="ltr"
            />
          ) : null}
          {visible.posTerminalId ? (
            <Field
              label={selectedType === "ONLINE" ? "شناسه پذیرنده / ترمینال" : "شناسه کارت‌خوان / ترمینال"}
              name="posTerminalId"
              defaultValue={defaults.posTerminalId}
              placeholder="شناسه ترمینال"
              disabled={!canEdit}
              dir="ltr"
              inputMode="numeric"
            />
          ) : null}
          {visible.gatewayName ? (
            <Field
              label="نام درگاه"
              name="gatewayName"
              defaultValue={defaults.gatewayName}
              placeholder="مثلاً زرین‌پال یا بانک ملت"
              disabled={!canEdit}
            />
          ) : null}
          <Textarea
            label="توضیحات"
            name="description"
            defaultValue={defaults.description}
            placeholder="توضیح کوتاه برای تیم مالی"
            disabled={!canEdit}
            className="md:col-span-2"
          />
        </div>
      </section>

      {focus === "details" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleField
            name="isDefault"
            label="روش پیش‌فرض باشد"
            defaultChecked={defaults.isDefault}
            disabled={!canEdit}
          />
          <ToggleField
            name="isActive"
            label="روش دریافت فعال است"
            defaultChecked={defaults.isActive}
            disabled={!canEdit}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold leading-6 text-[#7d6841]">
          روش‌های غیرفعال در ثبت دریافت جدید نمایش داده نمی‌شوند.
        </p>
        <button
          type="submit"
          disabled={!canEdit || isPending}
          className="btn-luxury-dark px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mode === "create" ? <Save size={17} /> : <Edit3 size={17} />}
          {isPending
            ? "در حال ذخیره..."
            : mode === "create"
              ? "ذخیره روش دریافت"
              : "ذخیره تغییرات"}
        </button>
      </div>
    </form>
  );
}

export function TogglePaymentMethodStatusForm({
  paymentMethodId,
  isActive,
  canEdit,
}: {
  paymentMethodId: string;
  isActive: boolean;
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    togglePaymentMethodStatusAction,
    initialPaymentMethodActionState,
  );

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="paymentMethodId" value={paymentMethodId} />
      <input
        type="hidden"
        name="nextStatus"
        value={isActive ? "inactive" : "active"}
      />
      <button
        type="submit"
        disabled={!canEdit || isPending}
        className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border px-4 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
          isActive
            ? "border-[#b45353]/24 bg-[#fff1f1] text-[#8f2c2c] hover:border-[#b45353]/45"
            : "border-[#25a46d]/24 bg-[#ecfff5] text-[#126141] hover:border-[#25a46d]/45"
        }`}
      >
        <Power size={15} />
        {isPending
          ? "در حال تغییر..."
          : isActive
            ? "غیرفعال‌سازی"
            : "فعال‌سازی"}
      </button>
      {state.message ? (
        <p
          className={`text-xs font-bold leading-6 ${
            state.ok ? "text-[#126141]" : "text-[#8f2c2c]"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function SetDefaultPaymentMethodForm({
  paymentMethodId,
  isDefault,
  isActive,
  canEdit,
}: {
  paymentMethodId: string;
  isDefault: boolean;
  isActive: boolean;
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    setDefaultPaymentMethodAction,
    initialPaymentMethodActionState,
  );

  if (isDefault) {
    return (
      <div className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#c7a15a]/35 bg-[#c7a15a]/12 px-4 py-2 text-xs font-black text-[#7d6841]">
        <Star size={15} />
        پیش‌فرض
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="paymentMethodId" value={paymentMethodId} />
      <button
        type="submit"
        disabled={!canEdit || !isActive || isPending}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 px-4 py-2 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/70 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Star size={15} />
        {isPending ? "در حال تنظیم..." : "انتخاب پیش‌فرض"}
      </button>
      {state.message ? (
        <p
          className={`text-xs font-bold leading-6 ${
            state.ok ? "text-[#126141]" : "text-[#8f2c2c]"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  disabled,
  dir,
  inputMode,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  dir?: "ltr" | "rtl" | "auto";
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-[#172033]">
      <span>{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        dir={dir}
        inputMode={inputMode}
        className="input-luxury disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function ToggleField({
  name,
  label,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 px-4 py-3 text-sm font-black text-[#111827]">
      <span>{label}</span>
      <span className="relative inline-flex h-7 w-12 items-center rounded-full bg-[#d8c08b]/72 p-1 transition has-[:checked]:bg-[#17483f]">
        <input
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          disabled={disabled}
          className="peer sr-only disabled:cursor-not-allowed"
        />
        <span className="size-5 rounded-full bg-white shadow transition peer-checked:-translate-x-5" />
      </span>
    </label>
  );
}

function Textarea({
  label,
  name,
  defaultValue,
  placeholder,
  disabled,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={`grid gap-2 text-sm font-black text-[#172033] ${className}`}>
      <span>{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        className="input-luxury min-h-24 resize-y py-3 leading-7 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function Alert({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "success" | "error" | "warning";
}) {
  const className =
    tone === "success"
      ? "border-[#25a46d]/22 bg-[#ecfff5] text-[#17483f]"
      : tone === "warning"
        ? "border-[#c7a15a]/32 bg-[#fff8ea] text-[#7d6841]"
        : "border-[#b45353]/18 bg-[#fff1f1] text-[#8f2c2c]";

  return (
    <div
      className={`flex items-start gap-2 rounded-3xl border px-4 py-3 text-sm font-black leading-7 ${className}`}
    >
      {tone === "success" ? (
        <CheckCircle2 size={18} className="mt-1 shrink-0" />
      ) : (
        <AlertCircle size={18} className="mt-1 shrink-0" />
      )}
      <span>{children}</span>
    </div>
  );
}
