"use client";

import { AlertCircle, CheckCircle2, Save, ShieldCheck } from "lucide-react";
import { useActionState } from "react";
import { HallLicenseUpload } from "@/components/dashboard/hall-license-upload";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { updateHallInfoAction } from "@/lib/actions/hall-info-actions";
import { initialHallInfoActionState } from "@/lib/actions/hall-info-state";

export type HallInfoFormValues = {
  brandName: string;
  legalName: string;
  managerName: string;
  managerNationalCode: string;
  registrationNumber: string;
  economicCode: string;
  licenseNumber: string;
  licenseIssuedAt: string;
  licenseExpiresAt: string;
  licenseImageUrl: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  phone: string;
  mobile: string;
  email: string;
  website: string;
  instagram: string;
  totalCapacity: string;
  parkingCapacity: string;
  hasParking: boolean;
  hasBrideRoom: boolean;
  hasCateringKitchen: boolean;
  hasOutdoorSpace: boolean;
  hasValet: boolean;
  description: string;
  internalNote: string;
};

type HallInfoFormProps = {
  values: HallInfoFormValues;
  canEdit: boolean;
};

export function HallInfoForm({ values, canEdit }: HallInfoFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateHallInfoAction,
    initialHallInfoActionState,
  );

  return (
    <form action={formAction} className="grid gap-5">
      {!canEdit ? (
        <Alert tone="warning">
          فقط مالک یا مدیر فضای کاری می‌تواند اطلاعات هویتی تالار را ویرایش
          کند.
        </Alert>
      ) : null}

      {state.message ? (
        <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

      <FormSection
        eyebrow="هویت کسب‌وکار"
        title="اطلاعات پایه مجموعه"
        description="این اطلاعات برای شناسایی مجموعه، پشتیبانی و تکمیل فضای اختصاصی تالار استفاده می‌شود."
      >
        <Field
          label="نام برند تالار"
          name="brandName"
          defaultValue={values.brandName}
          placeholder="مثلاً تالار قصر نور"
          disabled={!canEdit}
        />
        <Field
          label="نام حقوقی / رسمی مجموعه"
          name="legalName"
          defaultValue={values.legalName}
          placeholder="نام ثبت‌شده مجموعه"
          disabled={!canEdit}
        />
        <Field
          label="نام مدیر / مالک"
          name="managerName"
          defaultValue={values.managerName}
          placeholder="نام مدیر مسئول"
          disabled={!canEdit}
        />
        <Field
          label="کد ملی مدیر"
          name="managerNationalCode"
          defaultValue={values.managerNationalCode}
          placeholder="کد ملی ۱۰ رقمی"
          disabled={!canEdit}
          dir="ltr"
          inputMode="numeric"
        />
        <Field
          label="شماره ثبت / شناسه ثبت"
          name="registrationNumber"
          defaultValue={values.registrationNumber}
          placeholder="شماره ثبت مجموعه"
          disabled={!canEdit}
          dir="ltr"
        />
        <Field
          label="کد اقتصادی"
          name="economicCode"
          defaultValue={values.economicCode}
          placeholder="کد اقتصادی"
          disabled={!canEdit}
          dir="ltr"
          inputMode="numeric"
        />
        <Textarea
          label="توضیح کوتاه درباره مجموعه"
          name="description"
          defaultValue={values.description}
          placeholder="معرفی کوتاه تالار، ظرفیت، سبک پذیرایی یا ویژگی‌های اصلی"
          disabled={!canEdit}
          className="md:col-span-2"
        />
      </FormSection>

      <FormSection
        eyebrow="نشانی و ارتباط"
        title="اطلاعات تماس و آدرس"
        description="اطلاعات تماس برای راه‌اندازی، پشتیبانی و تکمیل پروفایل کسب‌وکار استفاده می‌شود."
      >
        <Field
          label="استان"
          name="province"
          defaultValue={values.province}
          placeholder="استان"
          disabled={!canEdit}
        />
        <Field
          label="شهر"
          name="city"
          defaultValue={values.city}
          placeholder="شهر"
          disabled={!canEdit}
        />
        <Textarea
          label="آدرس کامل تالار"
          name="address"
          defaultValue={values.address}
          placeholder="نشانی کامل تالار"
          disabled={!canEdit}
          className="md:col-span-2"
        />
        <Field
          label="کد پستی"
          name="postalCode"
          defaultValue={values.postalCode}
          placeholder="کد پستی ۱۰ رقمی"
          disabled={!canEdit}
          dir="ltr"
          inputMode="numeric"
        />
        <Textarea
          label="تلفن‌های ثابت"
          name="phone"
          defaultValue={values.phone}
          placeholder={"مثلاً 02112345678\n02187654321"}
          disabled={!canEdit}
          dir="ltr"
          className="md:col-span-1"
          helper="برای ثبت چند شماره، هر شماره را در یک خط جدا وارد کنید."
        />
        <Textarea
          label="شماره‌های موبایل"
          name="mobile"
          defaultValue={values.mobile}
          placeholder={"مثلاً 09121234567\n09129876543"}
          disabled={!canEdit}
          dir="ltr"
          className="md:col-span-1"
          helper="اگر چند شماره موبایل دارید، هر شماره را در یک خط جدا ثبت کنید."
        />
        <Field
          label="ایمیل"
          name="email"
          type="email"
          defaultValue={values.email}
          placeholder="email@example.com"
          disabled={!canEdit}
          dir="ltr"
        />
        <Field
          label="وب‌سایت"
          name="website"
          type="url"
          defaultValue={values.website}
          placeholder="https://example.com"
          disabled={!canEdit}
          dir="ltr"
        />
        <Field
          label="اینستاگرام"
          name="instagram"
          defaultValue={values.instagram}
          placeholder="@hallname"
          disabled={!canEdit}
          dir="ltr"
        />
      </FormSection>

      <FormSection
        eyebrow="مجوزها"
        title="اطلاعات مجوز تالار"
        description=""
      >
        <Field
          label="شماره مجوز تالار"
          name="licenseNumber"
          defaultValue={values.licenseNumber}
          placeholder="شماره مجوز"
          disabled={!canEdit}
        />
        <JalaliDatePicker
          label="تاریخ صدور مجوز"
          name="licenseIssuedAt"
          defaultValue={values.licenseIssuedAt}
          disabled={!canEdit}

        />
        <JalaliDatePicker
          label="تاریخ پایان اعتبار مجوز"
          name="licenseExpiresAt"
          defaultValue={values.licenseExpiresAt}
          disabled={!canEdit}

        />
        <div className="md:col-span-2">
          <HallLicenseUpload
            previewUrl={values.licenseImageUrl}
            disabled={!canEdit}
          />
        </div>
      </FormSection>

      <FormSection
        eyebrow="امکانات و ظرفیت"
        title="مشخصات عملیاتی تالار"
        description="این اطلاعات تصویر کلی ظرفیت و امکانات اصلی مجموعه را برای راه‌اندازی دقیق‌تر فراهم می‌کند."
      >
        <Field
          label="ظرفیت کل پذیرایی"
          name="totalCapacity"
          defaultValue={values.totalCapacity}
          placeholder="تعداد نفرات"
          disabled={!canEdit}
          dir="ltr"
          inputMode="numeric"
        />
        <Field
          label="ظرفیت پارکینگ"
          name="parkingCapacity"
          defaultValue={values.parkingCapacity}
          placeholder="تعداد خودرو"
          disabled={!canEdit}
          dir="ltr"
          inputMode="numeric"
        />
        <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
          <Toggle label="پارکینگ دارد؟" name="hasParking" defaultChecked={values.hasParking} disabled={!canEdit} />
          <Toggle label="اتاق عقد یا اتاق عروس دارد؟" name="hasBrideRoom" defaultChecked={values.hasBrideRoom} disabled={!canEdit} />
          <Toggle label="آشپزخانه یا کترینگ داخلی دارد؟" name="hasCateringKitchen" defaultChecked={values.hasCateringKitchen} disabled={!canEdit} />
          <Toggle label="فضای باز دارد؟" name="hasOutdoorSpace" defaultChecked={values.hasOutdoorSpace} disabled={!canEdit} />
          <Toggle label="خدمات تشریفات / valet دارد؟" name="hasValet" defaultChecked={values.hasValet} disabled={!canEdit} />
        </div>
        <Textarea
          label="یادداشت داخلی"
          name="internalNote"
          defaultValue={values.internalNote}
          placeholder="یادداشت داخلی برای پشتیبانی، راه‌اندازی یا بررسی‌های بعدی"
          disabled={!canEdit}
          className="md:col-span-2"
        />
      </FormSection>

      <div className="sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 rounded-[1.5rem] border border-[#d8c08b]/62 bg-[#fff9ee]/92 p-3 shadow-[0_18px_70px_rgba(17,24,39,0.16)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold leading-6 text-[#7d6841]">
            اطلاعات حساس مانند کد ملی مدیر و تصویر مجوز فقط در فضای امن سامانه
            استفاده می‌شود.
          </p>
          <button
            type="submit"
            disabled={!canEdit || isPending}
            className="btn-luxury-dark px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={17} />
            {isPending ? "در حال ذخیره..." : "ذخیره اطلاعات تالار"}
          </button>
        </div>
      </div>
    </form>
  );
}

function FormSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
      <p className="text-xs font-black text-[#17483f]">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black sm:text-2xl">{title}</h2>
      <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
        {description}
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  disabled,
  dir,
  inputMode,
  helper,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  dir?: "ltr" | "rtl" | "auto";
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  helper?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-[#172033]">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        dir={dir}
        inputMode={inputMode}
        className="input-luxury disabled:cursor-not-allowed disabled:opacity-60"
      />
      {helper ? (
        <span className="text-xs font-bold leading-6 text-[#7d6841]">
          {helper}
        </span>
      ) : null}
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
  dir,
  helper,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dir?: "ltr" | "rtl" | "auto";
  helper?: string;
}) {
  return (
    <label className={`grid gap-2 text-sm font-black text-[#172033] ${className}`}>
      <span>{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        dir={dir}
        className="input-luxury min-h-28 resize-y disabled:cursor-not-allowed disabled:opacity-60"
      />
      {helper ? (
        <span className="text-xs font-bold leading-6 text-[#7d6841]">
          {helper}
        </span>
      ) : null}
    </label>
  );
}

function Toggle({
  label,
  name,
  defaultChecked,
  disabled,
}: {
  label: string;
  name: string;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 px-4 py-3 text-sm font-black text-[#111827]">
      <span>{label}</span>
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="size-5 accent-[#9f7131] disabled:cursor-not-allowed"
      />
    </label>
  );
}

function Alert({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "success" | "error" | "warning";
}) {
  const className =
    tone === "success"
      ? "border-[#25a46d]/22 bg-[#ecfff5] text-[#126141]"
      : tone === "warning"
        ? "border-[#c7a15a]/28 bg-[#fff8ea] text-[#7d6841]"
        : "border-[#b45353]/25 bg-[#fff1f1] text-[#8f2c2c]";

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-bold leading-7 ${className}`}
    >
      {tone === "success" ? (
        <CheckCircle2 className="mt-1 shrink-0" size={18} />
      ) : tone === "warning" ? (
        <ShieldCheck className="mt-1 shrink-0" size={18} />
      ) : (
        <AlertCircle className="mt-1 shrink-0" size={18} />
      )}
      <span>{children}</span>
    </div>
  );
}
