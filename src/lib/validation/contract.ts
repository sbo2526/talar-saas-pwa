import { z } from "zod";
import { parseDateLikeToDate } from "@/lib/date/jalali";
import {
  normalizeOptionalDecimal,
  normalizeOptionalDigits,
  normalizeOptionalInteger,
  normalizeOptionalPhone,
  normalizeOptionalString,
  toEnglishDigits,
} from "@/lib/validation/normalizers";

const lineItemTypes = ["PACKAGE", "SERVICE", "MENU", "DRINK", "DESSERT"] as const;
const pricingTypes = ["FIXED", "PER_GUEST", "PER_HOUR", "PER_ITEM", "CUSTOM"] as const;
const totalModes = ["AUTO", "MANUAL"] as const;

function requiredText(message: string, max = 150) {
  return z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine((value) => Boolean(value), message)
    .transform((value) => value as string)
    .refine(
      (value) => !value || value.length <= max,
      "متن واردشده بیش از حد طولانی است.",
    );
}

function optionalText(max: number, message: string) {
  return z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine((value) => !value || value.length <= max, message);
}

function optionalMoney(message: string) {
  return z
    .unknown()
    .transform((value) => normalizeOptionalDecimal(value))
    .transform((value) => (value === undefined ? 0 : Number(value)))
    .refine((value) => Number.isFinite(value) && value >= 0, message);
}

function optionalMode() {
  return z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .transform((value) => (value === "MANUAL" ? "MANUAL" : "AUTO"))
    .pipe(z.enum(totalModes));
}

function requiredPositiveInteger(message: string) {
  return z
    .unknown()
    .transform((value) => normalizeOptionalInteger(value))
    .refine(
      (value) => Number.isInteger(value) && Number(value) > 0,
      message,
    )
    .transform((value) => Number(value));
}

function optionalId() {
  return z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .transform((value) => (value === "none" ? undefined : value));
}


function parseTimeToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function normalizeTime(value: unknown) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return undefined;
  }

  return toEnglishDigits(normalized.trim());
}

function parseEventDate(value: unknown) {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return null;
  }

  return parseDateLikeToDate(normalized);
}

export const contractLineItemSchema = z.object({
  type: z.enum(lineItemTypes),
  pricingType: z.enum(pricingTypes).optional(),
  sourceId: z.string().optional(),
  category: z.string().optional(),
  name: z.string().trim().min(1, "نام ردیف قرارداد معتبر نیست.").max(150),
  quantity: z.coerce.number().int().positive(),
  unitLabel: z.string().trim().max(50).optional(),
  unitPrice: z.coerce.number().nonnegative(),
  totalPrice: z.coerce.number().nonnegative(),
  note: z.string().trim().max(500).optional(),
}).superRefine((value, context) => {
  if (value.pricingType === "PER_GUEST" && value.quantity <= 0) {
    context.addIssue({
      code: "custom",
      path: ["quantity"],
      message: "ابتدا تعداد مهمان‌ها را وارد کنید.",
    });
  }
});

export const createContractSchema = z
  .object({
    customerId: optionalId(),
    salutation: optionalText(40, "عنوان مشتری بیش از حد طولانی است."),
    customerName: requiredText("نام و نام خانوادگی مشتری الزامی است.", 120),
    customerMobile: z
      .unknown()
      .transform((value) => normalizeOptionalPhone(value))
      .refine(
        (value) => Boolean(value) && String(value).length >= 10,
        "شماره همراه مشتری معتبر نیست.",
      )
      .transform((value) => value as string),
    nationalCode: z
      .unknown()
      .transform((value) => normalizeOptionalDigits(value))
      .refine(
        (value) => !value || /^\d{10}$/.test(value),
        "کد ملی باید ۱۰ رقم باشد.",
      ),
    address: optionalText(500, "آدرس مشتری بیش از حد طولانی است."),
    eventTypeId: optionalId(),
    customEventType: optionalText(80, "نوع مراسم بیش از حد طولانی است."),
    eventDate: z
      .unknown()
      .transform((value) => parseEventDate(value))
      .refine((value) => value instanceof Date, "تاریخ مراسم الزامی است.")
      .transform((value) => value as Date),
    eventStartTime: z
      .unknown()
      .transform((value) => normalizeTime(value))
      .refine(
        (value) => !value || parseTimeToMinutes(value) !== null,
        "ساعت شروع معتبر نیست.",
      ),
    eventEndTime: z
      .unknown()
      .transform((value) => normalizeTime(value))
      .refine(
        (value) => !value || parseTimeToMinutes(value) !== null,
        "ساعت پایان معتبر نیست.",
      ),
    guestCount: requiredPositiveInteger("تعداد مهمان‌ها باید عدد مثبت باشد."),
    hallId: optionalId(),
    salonId: optionalId(),
    packageId: optionalId(),
    packageTotalMode: optionalMode(),
    packageManualTotal: optionalMoney("جمع دستی پکیج معتبر نیست."),
    servicesTotalMode: optionalMode(),
    servicesManualTotal: optionalMoney("جمع دستی خدمات معتبر نیست."),
    menuTotalMode: optionalMode(),
    menuManualTotal: optionalMoney("جمع دستی منو معتبر نیست."),
    finalTotalMode: optionalMode(),
    finalManualTotal: optionalMoney("جمع نهایی دستی معتبر نیست."),
    discountAmount: optionalMoney("مبلغ تخفیف معتبر نیست."),
    depositAmount: optionalMoney("مبلغ بیعانه معتبر نیست."),
    lineItems: z
      .unknown()
      .transform((value) => {
        const raw = normalizeOptionalString(value);
        if (!raw) {
          return [];
        }

        try {
          return JSON.parse(raw) as unknown;
        } catch {
          return null;
        }
      })
      .pipe(z.array(contractLineItemSchema)),
  })
  .superRefine((value, context) => {
    if (!value.eventTypeId && !value.customEventType) {
      context.addIssue({
        code: "custom",
        path: ["eventTypeId"],
        message: "نوع مراسم را انتخاب یا ثبت کنید.",
      });
    }

    if (!value.eventStartTime) {
      context.addIssue({
        code: "custom",
        path: ["eventStartTime"],
        message: "ساعت شروع معتبر نیست.",
      });
    }

    if (!value.eventEndTime) {
      context.addIssue({
        code: "custom",
        path: ["eventEndTime"],
        message: "ساعت پایان معتبر نیست.",
      });
    }

    if (value.eventStartTime && value.eventEndTime) {
      const start = parseTimeToMinutes(value.eventStartTime);
      const end = parseTimeToMinutes(value.eventEndTime);

      if (start !== null && end !== null) {
        const normalizedEnd = end < start ? end + 24 * 60 : end;

        if (end === start || normalizedEnd <= start) {
          context.addIssue({
            code: "custom",
            path: ["eventEndTime"],
            message: "ساعت پایان باید بعد از ساعت شروع باشد.",
          });
        }
      }
    }

    const autoPackageTotal = value.lineItems
      .filter((item) => item.type === "PACKAGE")
      .reduce((sum, item) => sum + item.totalPrice, 0);
    const autoServicesTotal = value.lineItems
      .filter((item) => item.type === "SERVICE")
      .reduce((sum, item) => sum + item.totalPrice, 0);
    const autoMenuTotal = value.lineItems
      .filter((item) => item.type !== "SERVICE" && item.type !== "PACKAGE")
      .reduce((sum, item) => sum + item.totalPrice, 0);
    const effectivePackageTotal = value.packageTotalMode === "MANUAL"
      ? value.packageManualTotal
      : autoPackageTotal;
    const effectiveServicesTotal = value.servicesTotalMode === "MANUAL"
      ? value.servicesManualTotal
      : autoServicesTotal;
    const effectiveMenuTotal = value.menuTotalMode === "MANUAL"
      ? value.menuManualTotal
      : autoMenuTotal;
    const subtotal = effectivePackageTotal + effectiveServicesTotal + effectiveMenuTotal;

    if (value.discountAmount > subtotal) {
      context.addIssue({
        code: "custom",
        path: ["discountAmount"],
        message: "تخفیف نمی‌تواند بیشتر از جمع قرارداد باشد.",
      });
    }

    const autoFinalTotal = Math.max(0, subtotal - value.discountAmount);
    const finalTotal = value.finalTotalMode === "MANUAL"
      ? value.finalManualTotal
      : autoFinalTotal;

    if (value.depositAmount > finalTotal) {
      context.addIssue({
        code: "custom",
        path: ["depositAmount"],
        message: "بیعانه نمی‌تواند بیشتر از مبلغ نهایی باشد.",
      });
    }
  });

export type CreateContractInput = z.infer<typeof createContractSchema>;
