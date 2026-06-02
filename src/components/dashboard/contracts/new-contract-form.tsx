"use client";

import type { ReactNode } from "react";
import { useActionState, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Search,
  PackagePlus,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { createContractAction, saveContractServerDraftAction } from "@/lib/actions/contract-actions";
import { initialContractActionState } from "@/lib/actions/contract-action-state";
import {
  formatJalaliWeekday,
  parseDateLikeToDate,
  toDateOnlyString,
  toPersianDigits,
} from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { RialInput } from "@/components/ui/rial-input";
import { PrintLogoMark } from "@/components/dashboard/contracts/print-logo-mark";

type PricingType = "FIXED" | "PER_ITEM" | "PER_GUEST" | "PER_HOUR" | "CUSTOM";

type CustomerResult = {
  id: string;
  salutation: string | null;
  fullName: string;
  phone: string;
  nationalCode: string;
  maskedNationalCode: string;
  address: string;
};

type SelectOption = {
  id: string;
  title: string;
  category?: string | null;
  pricingType: PricingType;
  unitLabel: string;
  unitPrice: number;
  basePrice: number | null;
  allowPriceOverride: boolean;
};

type EventTypeOption = {
  id: string;
  name: string;
};

type HallOption = {
  id: string;
  name: string;
};

type SalonOption = {
  id: string;
  name: string;
  hallId: string;
};

type PackageOption = {
  id: string;
  title: string;
  description: string | null;
  pricePerGuest: number;
  allowPriceOverride: boolean;
  serviceIds: string[];
  menuIds: string[];
  serviceNames: string[];
  menuNames: string[];
  includedItemsNote: string | null;
};

type ContractLineDraft = {
  key: string;
  type: "PACKAGE" | "SERVICE" | "MENU" | "DRINK" | "DESSERT";
  sourceId: string;
  pricingType: PricingType;
  category: string;
  name: string;
  quantity: number;
  unitLabel: string;
  unitPrice: number;
  totalPrice: number;
  note?: string;
};

type ItemDraft = {
  selected: boolean;
  quantity: string;
  unitPrice: string;
  note: string;
};

type TotalMode = "AUTO" | "MANUAL";

type ContractExtraLineDraft = {
  key: string;
  type: "SERVICE" | "MENU" | "DRINK" | "DESSERT";
  category: string;
  name: string;
  amount: string;
  note: string;
};

type ReservationAvailabilityConflict = {
  id: string;
  contractNo: string;
  title: string;
  customerName: string;
  eventStartTime: string | null;
  eventEndTime: string | null;
  status: string;
};

type ReservationAvailabilityState = {
  status: "IDLE" | "INCOMPLETE" | "CHECKING" | "AVAILABLE" | "CONFLICT" | "ERROR";
  message: string;
  conflicts: ReservationAvailabilityConflict[];
};

type ServerDraftSummary = {
  id: string;
  contractNo: string;
  customerName: string;
  customerPhone: string;
  eventDate: string;
  updatedAt: string;
  finalTotal: number;
};

type PrintBrandInfo = {
  hallName: string;
  hallLogoUrl: string | null;
  showLogoOnPrint: boolean;
};

type NewContractFormProps = {
  initialEventDateIso: string | null;
  initialCustomer?: CustomerResult | null;
  eventTypes: EventTypeOption[];
  services: SelectOption[];
  menus: SelectOption[];
  packages: PackageOption[];
  halls: HallOption[];
  salons: SalonOption[];
  serverDrafts: ServerDraftSummary[];
  printBrand: PrintBrandInfo;
};

const salutationOptions = ["آقا", "خانم", "شرکت / سازمان"];

const pricingTypeLabels: Record<PricingType, string> = {
  FIXED: "مبلغ ثابت",
  PER_ITEM: "به ازای تعداد",
  PER_GUEST: "به ازای هر مهمان",
  PER_HOUR: "به ازای هر ساعت",
  CUSTOM: "توافقی / سفارشی",
};

const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const totalMinutes = index * 30;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  return {
    value,
    label: toPersianDigits(value),
  };
});

function toEnglishDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persian = "۰۱۲۳۴۵۶۷۸۹".indexOf(digit);
    if (persian >= 0) {
      return String(persian);
    }

    const arabic = "٠١٢٣٤٥٦٧٨٩".indexOf(digit);
    return arabic >= 0 ? String(arabic) : digit;
  });
}

function parseNumber(value: string | number | null | undefined) {
  const normalized = toEnglishDigits(String(value ?? "")).replace(
    /[،,٬\s]/g,
    "",
  );
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getItemType(
  category: string | null | undefined,
): ContractLineDraft["type"] {
  const normalizedCategory = category ?? "";

  if (normalizedCategory.includes("نوشیدنی")) {
    return "DRINK";
  }

  if (normalizedCategory.includes("دسر")) {
    return "DESSERT";
  }

  return "MENU";
}

function getCatalogPrice(item: SelectOption) {
  if (item.pricingType === "FIXED") {
    return item.basePrice ?? item.unitPrice;
  }

  return item.unitPrice;
}

function isManualLineType(
  type: ContractLineDraft["type"],
  servicesTotalMode: TotalMode,
  menuTotalMode: TotalMode,
) {
  if (type === "PACKAGE") {
    return false;
  }

  return type === "SERVICE"
    ? servicesTotalMode === "MANUAL"
    : menuTotalMode === "MANUAL";
}

function makeInitialDraft(item: SelectOption, quantity = "1"): ItemDraft {
  return {
    selected: true,
    quantity,
    unitPrice: String(getCatalogPrice(item)),
    note: "",
  };
}

function getEffectiveUnitPrice(
  item: SelectOption,
  draft: ItemDraft | undefined,
) {
  if (item.pricingType === "CUSTOM") {
    return parseNumber(draft?.unitPrice ?? "0");
  }

  if (item.allowPriceOverride && draft?.unitPrice !== undefined) {
    return parseNumber(draft.unitPrice);
  }

  return getCatalogPrice(item);
}

function getEffectiveQuantity(
  item: SelectOption,
  draft: ItemDraft | undefined,
  guestCountNumber: number,
) {
  if (item.pricingType === "PER_GUEST") {
    return Math.max(0, guestCountNumber);
  }

  if (item.pricingType === "PER_ITEM" || item.pricingType === "PER_HOUR") {
    return Math.max(1, parseNumber(draft?.quantity ?? "1"));
  }

  return 1;
}

function calculateItemTotal(
  item: SelectOption,
  draft: ItemDraft | undefined,
  guestCountNumber: number,
) {
  const unitPrice = getEffectiveUnitPrice(item, draft);
  const quantity = getEffectiveQuantity(item, draft, guestCountNumber);

  if (item.pricingType === "FIXED" || item.pricingType === "CUSTOM") {
    return unitPrice;
  }

  return quantity * unitPrice;
}

function getFormulaPreview(
  item: SelectOption,
  draft: ItemDraft | undefined,
  guestCountNumber: number,
  manualPricingLocked = false,
) {
  if (manualPricingLocked) {
    return "جمع این بخش دستی است؛ مبلغ این ردیف صفر و قفل می‌شود.";
  }

  const unitPrice = getEffectiveUnitPrice(item, draft);
  const quantity = getEffectiveQuantity(item, draft, guestCountNumber);

  if (item.pricingType === "FIXED") {
    return `مبلغ ثابت: ${formatIRR(unitPrice)}`;
  }

  if (item.pricingType === "PER_GUEST") {
    if (guestCountNumber <= 0) {
      return "ابتدا تعداد مهمان‌ها را وارد کنید.";
    }

    return `${formatPersianNumber(quantity)} مهمان × ${formatIRR(unitPrice)}`;
  }

  if (item.pricingType === "PER_HOUR") {
    return `${formatPersianNumber(quantity)} ساعت × ${formatIRR(unitPrice)}`;
  }

  if (item.pricingType === "PER_ITEM") {
    return `${formatPersianNumber(quantity)} ${item.unitLabel || "مورد"} × ${formatIRR(unitPrice)}`;
  }

  return unitPrice > 0 ? `مبلغ توافقی: ${formatIRR(unitPrice)}` : "توافقی";
}

export function NewContractForm({
  initialEventDateIso,
  initialCustomer,
  eventTypes,
  services,
  menus,
  packages,
  halls,
  salons,
  printBrand,
}: NewContractFormProps) {
  const [state, action, isPending] = useActionState(
    createContractAction,
    initialContractActionState,
  );
  const [customerQuery, setCustomerQuery] = useState(
    initialCustomer?.fullName ?? "",
  );
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerResult | null>(initialCustomer ?? null);
  const [customerName, setCustomerName] = useState(
    initialCustomer?.fullName ?? "",
  );
  const [customerMobile, setCustomerMobile] = useState(
    initialCustomer?.phone ?? "",
  );
  const [nationalCode, setNationalCode] = useState(
    initialCustomer?.nationalCode ?? "",
  );
  const [address, setAddress] = useState(initialCustomer?.address ?? "");
  const [salutation, setSalutation] = useState(
    initialCustomer?.salutation ?? "آقا",
  );
  const [eventDate, setEventDate] = useState<string | null>(() => {
    const date = parseDateLikeToDate(initialEventDateIso);
    return date ? toDateOnlyString(date) : null;
  });
  const [eventTypeId, setEventTypeId] = useState(eventTypes[0]?.id ?? "");
  const [customEventType, setCustomEventType] = useState("");
  const [guestCount, setGuestCount] = useState("۱۰۰");
  const [hallId, setHallId] = useState("none");
  const [salonId, setSalonId] = useState("none");
  const [serviceDrafts, setServiceDrafts] = useState<Record<string, ItemDraft>>(
    {},
  );
  const [menuDrafts, setMenuDrafts] = useState<Record<string, ItemDraft>>({});
  const [discountAmount, setDiscountAmount] = useState("۰");
  const [depositAmount, setDepositAmount] = useState("۰");
  const [servicesTotalMode, setServicesTotalMode] = useState<TotalMode>("AUTO");
  const [servicesManualTotal, setServicesManualTotal] = useState("۰");
  const [menuTotalMode, setMenuTotalMode] = useState<TotalMode>("AUTO");
  const [menuManualTotal, setMenuManualTotal] = useState("۰");
  const [selectedPackageId, setSelectedPackageId] = useState("none");
  const [packageTotalMode, setPackageTotalMode] = useState<TotalMode>("AUTO");
  const [packageManualTotal, setPackageManualTotal] = useState("۰");
  const [finalTotalMode, setFinalTotalMode] = useState<TotalMode>("AUTO");
  const [finalManualTotal, setFinalManualTotal] = useState("۰");
  const [extraLineItems, setExtraLineItems] = useState<
    ContractExtraLineDraft[]
  >([]);
  const [activeStep, setActiveStep] = useState(0);
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [serviceCatalogSearch, setServiceCatalogSearch] = useState("");
  const [menuCatalogSearch, setMenuCatalogSearch] = useState("");
  const [customizePackageItems, setCustomizePackageItems] = useState(false);
  const [contractNotes, setContractNotes] = useState("");
  const [reservationAvailability, setReservationAvailability] =
    useState<ReservationAvailabilityState>({
      status: "IDLE",
      message: "برای بررسی رزرو، تاریخ، ساعت و سالن را تکمیل کنید.",
      conflicts: [],
    });
  useEffect(() => {
    const query = customerQuery.trim();

    if (query.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      const response = await fetch(
        `/api/dashboard/customers/search?q=${encodeURIComponent(query)}`,
        { signal: controller.signal },
      );

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { customers: CustomerResult[] };
      setCustomerResults(data.customers);
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [customerQuery]);

  useEffect(() => {
    if (!eventDate || !eventStartTime || !eventEndTime || salonId === "none") {
      setReservationAvailability({
        status: "INCOMPLETE",
        message: "برای بررسی رزرو، تاریخ، سالن، ساعت شروع و ساعت پایان را تکمیل کنید.",
        conflicts: [],
      });
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setReservationAvailability((current) => ({
        ...current,
        status: "CHECKING",
        message: "در حال بررسی آزاد بودن سالن...",
        conflicts: [],
      }));

      const params = new URLSearchParams({
        eventDate,
        salonId,
        eventStartTime,
        eventEndTime,
      });

      try {
        const response = await fetch(
          `/api/dashboard/contracts/check-availability?${params.toString()}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("AVAILABILITY_CHECK_FAILED");
        }

        const data = (await response.json()) as {
          status: ReservationAvailabilityState["status"];
          message: string;
          conflicts?: ReservationAvailabilityConflict[];
        };

        setReservationAvailability({
          status: data.status,
          message: data.message,
          conflicts: data.conflicts ?? [],
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setReservationAvailability({
          status: "ERROR",
          message: "بررسی آنلاین رزرو انجام نشد؛ هنگام ثبت نهایی دوباره کنترل می‌شود.",
          conflicts: [],
        });
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [eventDate, eventEndTime, eventStartTime, salonId]);

  const selectedDate = parseDateLikeToDate(eventDate);
  const weekday = selectedDate ? formatJalaliWeekday(selectedDate) : "—";
  const guestCountNumber = Math.max(0, parseNumber(guestCount));
  const selectedPackage =
    packages.find((item) => item.id === selectedPackageId) ?? null;
  const selectedPackageServiceIds = useMemo(
    () => new Set(selectedPackage?.serviceIds ?? []),
    [selectedPackage],
  );
  const selectedPackageMenuIds = useMemo(
    () => new Set(selectedPackage?.menuIds ?? []),
    [selectedPackage],
  );
  const selectedHallSalons = useMemo(
    () =>
      salons.filter((salon) => hallId === "none" || salon.hallId === hallId),
    [hallId, salons],
  );

  const autoLineItems = useMemo<ContractLineDraft[]>(() => {
    const packageLineItems: ContractLineDraft[] = selectedPackage
      ? (() => {
          const manualPackageTotal = parseNumber(packageManualTotal);
          const unitPrice =
            packageTotalMode === "MANUAL"
              ? manualPackageTotal
              : selectedPackage.pricePerGuest;
          const totalPrice =
            packageTotalMode === "MANUAL"
              ? manualPackageTotal
              : guestCountNumber * unitPrice;
          const includedSummary = [
            selectedPackage.serviceNames.length
              ? `خدمات: ${selectedPackage.serviceNames.join("، ")}`
              : "",
            selectedPackage.menuNames.length
              ? `منو: ${selectedPackage.menuNames.join("، ")}`
              : "",
            selectedPackage.includedItemsNote || "",
          ]
            .filter(Boolean)
            .join(" | ");

          return [
            {
              key: `package-${selectedPackage.id}`,
              type: "PACKAGE" as const,
              sourceId: selectedPackage.id,
              pricingType:
                packageTotalMode === "MANUAL"
                  ? ("CUSTOM" as const)
                  : ("PER_GUEST" as const),
              category: "پکیج اختصاصی مراسم",
              name: selectedPackage.title,
              quantity:
                packageTotalMode === "MANUAL"
                  ? 1
                  : Math.max(0, guestCountNumber),
              unitLabel: packageTotalMode === "MANUAL" ? "پکیج" : "نفر",
              unitPrice,
              totalPrice,
              note: includedSummary || undefined,
            },
          ];
        })()
      : [];

    const serviceItems = services
      .filter((service) => serviceDrafts[service.id]?.selected)
      .map((service) => {
        const draft = serviceDrafts[service.id];
        const quantity = getEffectiveQuantity(service, draft, guestCountNumber);
        const unitPrice = getEffectiveUnitPrice(service, draft);

        return {
          key: `service-${service.id}`,
          type: "SERVICE" as const,
          sourceId: service.id,
          pricingType: service.pricingType,
          category: service.category ?? "خدمات مراسم",
          name: service.title,
          quantity,
          unitLabel: service.unitLabel,
          unitPrice,
          totalPrice: calculateItemTotal(service, draft, guestCountNumber),
          note: draft?.note?.trim() || undefined,
        };
      });

    const menuItems = menus
      .filter((menu) => menuDrafts[menu.id]?.selected)
      .map((menu) => {
        const draft = menuDrafts[menu.id];
        const quantity = getEffectiveQuantity(menu, draft, guestCountNumber);
        const unitPrice = getEffectiveUnitPrice(menu, draft);

        return {
          key: `menu-${menu.id}`,
          type: getItemType(menu.category),
          sourceId: menu.id,
          pricingType: menu.pricingType,
          category: menu.category ?? "منوی پذیرایی",
          name: menu.title,
          quantity,
          unitLabel: menu.unitLabel,
          unitPrice,
          totalPrice: calculateItemTotal(menu, draft, guestCountNumber),
          note: draft?.note?.trim() || undefined,
        };
      });

    const customItems = extraLineItems
      .map((item) => {
        const amount = parseNumber(item.amount);

        return {
          key: item.key,
          type: item.type,
          sourceId: "",
          pricingType: "CUSTOM" as const,
          category:
            item.category.trim() ||
            (item.type === "SERVICE" ? "خدمات سفارشی" : "آیتم‌های اضافی منو"),
          name: item.name.trim(),
          quantity: 1,
          unitLabel: "مورد",
          unitPrice: amount,
          totalPrice: amount,
          note: item.note.trim() || undefined,
        };
      })
      .filter((item) => item.name && item.totalPrice > 0);

    return [...packageLineItems, ...serviceItems, ...menuItems, ...customItems];
  }, [
    extraLineItems,
    guestCountNumber,
    menuDrafts,
    menus,
    packageManualTotal,
    packageTotalMode,
    selectedPackage,
    serviceDrafts,
    services,
  ]);

  const lineItems = useMemo<ContractLineDraft[]>(
    () =>
      autoLineItems.map((item) => {
        const isPackageSubItem =
          item.type === "SERVICE"
            ? selectedPackageServiceIds.has(item.sourceId)
            : item.type !== "PACKAGE"
              ? selectedPackageMenuIds.has(item.sourceId)
              : false;
        const shouldZero =
          isPackageSubItem ||
          isManualLineType(item.type, servicesTotalMode, menuTotalMode);

        if (!shouldZero) {
          return item;
        }

        const zeroReason = isPackageSubItem
          ? "زیرمجموعه پکیج انتخاب‌شده است و مبلغ جداگانه ندارد."
          : "مبلغ ردیف به‌دلیل جمع دستی دسته صفر شده است.";

        return {
          ...item,
          unitPrice: 0,
          totalPrice: 0,
          note: item.note ? `${item.note} | ${zeroReason}` : zeroReason,
        };
      }),
    [
      autoLineItems,
      menuTotalMode,
      selectedPackageMenuIds,
      selectedPackageServiceIds,
      servicesTotalMode,
    ],
  );

  const autoPackageTotal = lineItems
    .filter((item) => item.type === "PACKAGE")
    .reduce((sum, item) => sum + item.totalPrice, 0);
  const autoServicesTotal = lineItems
    .filter((item) => item.type === "SERVICE")
    .reduce((sum, item) => sum + item.totalPrice, 0);
  const autoMenuTotal = lineItems
    .filter((item) => item.type !== "SERVICE" && item.type !== "PACKAGE")
    .reduce((sum, item) => sum + item.totalPrice, 0);
  const packageTotal = selectedPackage
    ? packageTotalMode === "MANUAL"
      ? parseNumber(packageManualTotal)
      : autoPackageTotal
    : 0;
  const servicesTotal =
    servicesTotalMode === "MANUAL"
      ? parseNumber(servicesManualTotal)
      : autoServicesTotal;
  const menuTotal =
    menuTotalMode === "MANUAL" ? parseNumber(menuManualTotal) : autoMenuTotal;
  const subtotal = packageTotal + servicesTotal + menuTotal;
  const discount = parseNumber(discountAmount);
  const deposit = parseNumber(depositAmount);
  const autoFinalTotal = Math.max(0, subtotal - discount);
  const finalTotal =
    finalTotalMode === "MANUAL"
      ? parseNumber(finalManualTotal)
      : autoFinalTotal;
  const remaining = Math.max(0, finalTotal - deposit);
  const discountWarning = discount > subtotal;
  const depositWarning = deposit > finalTotal;
  const selectedItemsMissingPrice = lineItems.filter((item) => {
    const isPackageSubItem =
      item.type === "SERVICE"
        ? selectedPackageServiceIds.has(item.sourceId)
        : item.type !== "PACKAGE"
          ? selectedPackageMenuIds.has(item.sourceId)
          : false;

    return (
      !isPackageSubItem &&
      !isManualLineType(item.type, servicesTotalMode, menuTotalMode) &&
      item.unitPrice <= 0 &&
      item.pricingType !== "CUSTOM"
    );
  });
  const selectedServicesMissingPrice = selectedItemsMissingPrice.filter(
    (item) => item.type === "SERVICE",
  );
  const selectedMenusMissingPrice = selectedItemsMissingPrice.filter(
    (item) => item.type !== "SERVICE" && item.type !== "PACKAGE",
  );
  const customItemsMissingPrice = lineItems.filter((item) => {
    const isPackageSubItem =
      item.type === "SERVICE"
        ? selectedPackageServiceIds.has(item.sourceId)
        : item.type !== "PACKAGE"
          ? selectedPackageMenuIds.has(item.sourceId)
          : false;

    return (
      !isPackageSubItem &&
      !isManualLineType(item.type, servicesTotalMode, menuTotalMode) &&
      item.pricingType === "CUSTOM" &&
      item.totalPrice <= 0
    );
  });
  const hasPerGuestSelection = autoLineItems.some(
    (item) => item.pricingType === "PER_GUEST",
  );

  const visibleServices = useMemo(
    () => filterCatalogItems(services, serviceCatalogSearch),
    [services, serviceCatalogSearch],
  );
  const visibleMenus = useMemo(
    () => filterCatalogItems(menus, menuCatalogSearch),
    [menus, menuCatalogSearch],
  );
  const groupedServices = groupByCategory(visibleServices);
  const groupedMenus = groupByCategory(visibleMenus);
  const selectedEventTypeLabel =
    customEventType.trim() ||
    eventTypes.find((type) => type.id === eventTypeId)?.name ||
    "انتخاب نشده";
  const selectedHallLabel =
    halls.find((hall) => hall.id === hallId)?.name ?? "انتخاب نشده";
  const selectedSalonLabel =
    selectedHallSalons.find((salon) => salon.id === salonId)?.name ??
    "انتخاب نشده";
  const selectedServicesCount = Object.values(serviceDrafts).filter(
    (item: ItemDraft) => item.selected,
  ).length;
  const selectedMenusCount = Object.values(menuDrafts).filter(
    (item: ItemDraft) => item.selected,
  ).length;
  const customerStepComplete = Boolean(
    customerName.trim() && customerMobile.trim(),
  );
  const reservationHasConflict = reservationAvailability.status === "CONFLICT";
  const reservationIsChecking = reservationAvailability.status === "CHECKING";
  const eventStepComplete = Boolean(
    eventDate &&
      eventStartTime &&
      eventEndTime &&
      guestCountNumber > 0 &&
      !reservationHasConflict,
  );
  const catalogStepComplete = Boolean(
    selectedPackage ||
    selectedServicesCount ||
    selectedMenusCount ||
    extraLineItems.length,
  );
  const financeStepComplete =
    finalTotal > 0 && !discountWarning && !depositWarning;
  const finalStepReady =
    customerStepComplete &&
    eventStepComplete &&
    financeStepComplete &&
    !reservationHasConflict;
  const customerValidationIssues = [
    !customerName.trim() ? "نام مشتری را وارد کنید." : "",
    !customerMobile.trim() ? "شماره همراه مشتری را وارد کنید." : "",
  ].filter(Boolean);
  const customerValidationWarnings = [
    !nationalCode.trim() ? "کد ملی برای نسخه چاپی قرارداد تکمیل نشده است." : "",
    !address.trim() ? "آدرس مشتری برای پیگیری‌های بعدی تکمیل نشده است." : "",
  ].filter(Boolean);
  const eventValidationIssues = [
    !eventDate ? "تاریخ مراسم را انتخاب کنید." : "",
    !eventStartTime || !eventEndTime ? "ساعت شروع و پایان مراسم را مشخص کنید." : "",
    guestCountNumber <= 0 ? "تعداد مهمان باید بیشتر از صفر باشد." : "",
    reservationHasConflict ? "سالن انتخاب‌شده در این زمان تداخل رزرو دارد." : "",
  ].filter(Boolean);
  const eventValidationWarnings = [
    salonId === "none" ? "سالن هنوز انتخاب نشده است؛ کنترل رزرو بدون سالن کامل نیست." : "",
    reservationIsChecking ? "بررسی تداخل رزرو هنوز در حال انجام است." : "",
    reservationAvailability.status === "ERROR"
      ? "بررسی آنلاین رزرو انجام نشد؛ هنگام ثبت نهایی دوباره کنترل می‌شود."
      : "",
  ].filter(Boolean);
  const catalogValidationWarnings = [
    !catalogStepComplete
      ? "پکیج، خدمت یا منویی انتخاب نشده است. اگر قرارداد دستی است، توضیح توافق را در یادداشت ثبت کنید."
      : "",
    selectedItemsMissingPrice.length > 0
      ? "برخی آیتم‌های انتخاب‌شده قیمت پایه ندارند."
      : "",
    customItemsMissingPrice.length > 0
      ? "برای آیتم‌های توافقی، مبلغ را وارد کنید."
      : "",
  ].filter(Boolean);
  const financeValidationIssues = [
    finalTotal <= 0 ? "مبلغ نهایی قرارداد باید بیشتر از صفر باشد." : "",
    discountWarning ? "تخفیف نمی‌تواند از جمع قرارداد بیشتر باشد." : "",
    depositWarning ? "بیعانه نمی‌تواند از مبلغ نهایی بیشتر باشد." : "",
  ].filter(Boolean);
  const financeValidationWarnings = [
    deposit <= 0 ? "بیعانه اولیه ثبت نشده است." : "",
    remaining > 0 ? "قرارداد پس از ثبت دارای مانده قابل پیگیری است." : "",
  ].filter(Boolean);
  const requiredChecklist = [
    { label: "مشتری و شماره تماس", done: customerStepComplete },
    { label: "تاریخ، ساعت و تعداد مهمان", done: eventStepComplete },
    { label: "مبلغ نهایی معتبر", done: financeStepComplete },
  ];
  const wizardSteps = [
    {
      label: "مشتری",
      description: "انتخاب یا ثبت سریع مشتری",
      complete: customerStepComplete,
      issueCount: customerValidationIssues.length,
      warningCount: customerValidationWarnings.length,
    },
    {
      label: "مراسم",
      description: "تاریخ، ساعت، سالن و مهمان",
      complete: eventStepComplete,
      issueCount: eventValidationIssues.length,
      warningCount: eventValidationWarnings.length,
    },
    {
      label: "پکیج و خدمات",
      description: "انتخاب پکیج، منو و خدمات",
      complete: catalogStepComplete,
      issueCount: 0,
      warningCount: catalogValidationWarnings.length,
    },
    {
      label: "مالی",
      description: "بیعانه، تخفیف و مانده",
      complete: financeStepComplete,
      issueCount: financeValidationIssues.length,
      warningCount: financeValidationWarnings.length,
    },
    {
      label: "بررسی نهایی",
      description: "کنترل و ثبت قرارداد",
      complete: finalStepReady,
      issueCount: finalStepReady ? 0 : 1,
      warningCount: 0,
    },
  ];
  const completionPercent = Math.round(
    (wizardSteps.filter((step) => step.complete).length / wizardSteps.length) *
      100,
  );
  const customerSourceLabel = selectedCustomer
    ? "مشتری موجود انتخاب شده"
    : customerQuery.trim().length >= 2
      ? "در صورت پیدا نشدن، مشتری جدید ثبت می‌شود"
      : "جستجو یا ثبت سریع مشتری";
  const customerNameStatus = customerName.trim()
    ? customerName.trim()
    : "نام مشتری وارد نشده";
  const customerPhoneStatus = customerMobile.trim()
    ? toPersianDigits(customerMobile.trim())
    : "شماره همراه وارد نشده";
  const customerIdentityStatus = nationalCode.trim()
    ? toPersianDigits(nationalCode.trim())
    : "کد ملی ثبت نشده";
  const customerAddressStatus = address.trim()
    ? "آدرس ثبت شده"
    : "آدرس هنوز ثبت نشده";
  const eventDateSummary = eventDate
    ? `${weekday}، ${toPersianDigits(eventDate)}`
    : "تاریخ مراسم انتخاب نشده";
  const eventTimeSummary =
    eventStartTime && eventEndTime
      ? `${toPersianDigits(eventStartTime)} تا ${toPersianDigits(eventEndTime)}`
      : "ساعت شروع و پایان را وارد کنید";
  const eventLocationSummary =
    salonId !== "none"
      ? selectedSalonLabel
      : hallId !== "none"
        ? "سالن را برای تالار انتخابی مشخص کنید"
        : "تالار و سالن انتخاب نشده";
  const eventReservationReady = Boolean(
    eventDate && eventStartTime && eventEndTime && salonId !== "none",
  );
  const eventReservationStatusLabel = !eventReservationReady
    ? "نیازمند تکمیل"
    : reservationIsChecking
      ? "در حال بررسی"
      : reservationHasConflict
        ? "دارای تداخل"
        : reservationAvailability.status === "AVAILABLE"
          ? "آزاد"
          : reservationAvailability.status === "ERROR"
            ? "نیازمند کنترل نهایی"
            : "آماده بررسی";
  const eventReservationMessage = eventReservationReady
    ? reservationAvailability.message
    : "برای بررسی رزرو، تاریخ، ساعت و سالن را وارد کنید.";
  const financeHealth = discountWarning || depositWarning
    ? {
        label: "نیازمند اصلاح مالی",
        description: "تخفیف یا بیعانه از حد مجاز بیشتر است.",
        tone: "danger" as const,
      }
    : finalTotal <= 0
      ? {
          label: "مبلغ قرارداد ناقص است",
          description: "برای ثبت قرارداد، مبلغ نهایی را وارد یا اصلاح کنید.",
          tone: "warning" as const,
        }
      : remaining === 0
        ? {
            label: "تسویه کامل",
            description: "بیعانه یا دریافت اولیه کل مبلغ نهایی را پوشش می‌دهد.",
            tone: "success" as const,
          }
        : deposit > 0
          ? {
              label: "دارای مانده پس از بیعانه",
              description: "قرارداد ثبت می‌شود و مانده برای پیگیری مالی باقی می‌ماند.",
              tone: "warning" as const,
            }
          : {
              label: "بدون بیعانه اولیه",
              description: "قرارداد بدون دریافت اولیه ثبت می‌شود و بعداً باید پیگیری مالی انجام شود.",
              tone: "neutral" as const,
            };
  const financeChecklist = [
    { label: "جمع قرارداد ثبت شده", done: subtotal > 0 },
    { label: "تخفیف مجاز است", done: !discountWarning },
    { label: "بیعانه مجاز است", done: !depositWarning },
  ];
  const nextPaymentHint = remaining > 0
    ? "پس از ثبت، مانده را از بخش دریافتی‌ها پیگیری کنید."
    : "مانده‌ای برای پیگیری بعدی باقی نمی‌ماند.";
  const finalReviewIssues = [
    !customerName.trim() ? "نام مشتری وارد نشده است." : "",
    !customerMobile.trim() ? "شماره همراه مشتری وارد نشده است." : "",
    !eventDate ? "تاریخ مراسم انتخاب نشده است." : "",
    !eventStartTime || !eventEndTime
      ? "ساعت شروع و پایان مراسم وارد نشده است."
      : "",
    guestCountNumber <= 0 ? "تعداد مهمان باید بیشتر از صفر باشد." : "",
    reservationHasConflict
      ? "سالن انتخاب‌شده در این تاریخ و ساعت با قرارداد دیگری تداخل دارد."
      : "",
    finalTotal <= 0 ? "مبلغ نهایی قرارداد را وارد یا اصلاح کنید." : "",
    discountWarning ? "تخفیف از جمع قرارداد بیشتر است." : "",
    depositWarning ? "بیعانه نمی‌تواند از مبلغ نهایی بیشتر باشد." : "",
  ].filter(Boolean);
  const finalReviewWarnings = [
    salonId === "none"
      ? "سالن هنوز مشخص نشده است؛ برای کنترل رزرو و گزارش سالن بهتر است سالن را انتخاب کنید."
      : "",
    reservationIsChecking
      ? "بررسی آنلاین تداخل رزرو هنوز در حال انجام است؛ چند لحظه صبر کنید."
      : "",
    reservationAvailability.status === "ERROR"
      ? "بررسی آنلاین رزرو انجام نشد؛ هنگام ثبت نهایی دوباره کنترل می‌شود."
      : "",
    !selectedPackage && selectedServicesCount + selectedMenusCount === 0
      ? "پکیج، خدمت یا منوی مشخصی انتخاب نشده است؛ اگر مبلغ نهایی دستی است، جزئیات توافق را در یادداشت ثبت کنید."
      : "",
    deposit <= 0
      ? "بیعانه اولیه ثبت نشده است؛ بعد از ثبت قرارداد، پیگیری دریافت را فراموش نکنید."
      : "",
    !nationalCode.trim()
      ? "کد ملی وارد نشده است؛ برای نسخه چاپی قرارداد بهتر است تکمیل شود."
      : "",
    !address.trim()
      ? "آدرس مشتری وارد نشده است؛ برای پیگیری‌های بعدی بهتر است تکمیل شود."
      : "",
  ].filter(Boolean);
  const finalReviewReady = finalReviewIssues.length === 0;
  const finalReviewPreviewItems = lineItems.slice(0, 8);
  const hiddenPreviewItemsCount = Math.max(0, lineItems.length - finalReviewPreviewItems.length);
  function goToStep(nextStep: number) {
    setActiveStep(Math.min(Math.max(nextStep, 0), wizardSteps.length - 1));
  }

  function goNext() {
    goToStep(activeStep + 1);
  }

  function goPrevious() {
    goToStep(activeStep - 1);
  }

  function selectCustomer(customer: CustomerResult) {
    setSelectedCustomer(customer);
    setSalutation(customer.salutation ?? "آقا");
    setCustomerName(customer.fullName);
    setCustomerMobile(customer.phone);
    setNationalCode(customer.nationalCode);
    setAddress(customer.address);
    setCustomerQuery(customer.fullName);
    setCustomerResults([]);
  }

  function toggleService(service: SelectOption) {
    setServiceDrafts((current) => {
      const existing = current[service.id];
      return {
        ...current,
        [service.id]: existing
          ? { ...existing, selected: !existing.selected }
          : makeInitialDraft(service),
      };
    });
  }

  function toggleMenu(menu: SelectOption) {
    setMenuDrafts((current) => {
      const existing = current[menu.id];
      return {
        ...current,
        [menu.id]: existing
          ? { ...existing, selected: !existing.selected }
          : makeInitialDraft(menu, guestCount || "1"),
      };
    });
  }

  function selectPackage(packageId: string) {
    setSelectedPackageId(packageId);

    const nextPackage = packages.find((item) => item.id === packageId) ?? null;
    if (!nextPackage) {
      setCustomizePackageItems(false);
      return;
    }

    setCustomizePackageItems(false);

    setServiceDrafts((current) => {
      const next = { ...current };
      for (const service of services) {
        if (nextPackage.serviceIds.includes(service.id)) {
          next[service.id] = {
            ...(next[service.id] ?? makeInitialDraft(service)),
            selected: true,
          };
        }
      }

      return next;
    });

    setMenuDrafts((current) => {
      const next = { ...current };
      for (const menu of menus) {
        if (nextPackage.menuIds.includes(menu.id)) {
          next[menu.id] = {
            ...(next[menu.id] ?? makeInitialDraft(menu, guestCount || "1")),
            selected: true,
          };
        }
      }

      return next;
    });
  }

  function addExtraLine(type: ContractExtraLineDraft["type"]) {
    setExtraLineItems((current) => [
      ...current,
      {
        key: `custom-${Date.now()}-${current.length}`,
        type,
        category:
          type === "SERVICE"
            ? "خدمات سفارشی"
            : type === "DRINK"
              ? "نوشیدنی‌های اضافی"
              : "آیتم‌های اضافی منو",
        name: "",
        amount: "۰",
        note: "",
      },
    ]);
  }

  function updateExtraLine(
    key: string,
    patch: Partial<ContractExtraLineDraft>,
  ) {
    setExtraLineItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  }

  function removeExtraLine(key: string) {
    setExtraLineItems((current) => current.filter((item) => item.key !== key));
  }

  return (
    <>
    <form
      action={action}
      className="grid gap-3 pb-32 sm:pb-28 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start xl:gap-4 xl:pb-0 print:hidden"
    >
      <input
        name="customerId"
        type="hidden"
        value={selectedCustomer?.id ?? ""}
      />
      <input name="lineItems" type="hidden" value={JSON.stringify(lineItems)} />
      <input
        name="packageId"
        type="hidden"
        value={selectedPackage?.id ?? "none"}
      />
      <input name="packageTotalMode" type="hidden" value={packageTotalMode} />
      <input name="servicesTotalMode" type="hidden" value={servicesTotalMode} />
      <input name="menuTotalMode" type="hidden" value={menuTotalMode} />
      <input name="finalTotalMode" type="hidden" value={finalTotalMode} />
      {packageTotalMode !== "MANUAL" ? (
        <input
          name="packageManualTotal"
          type="hidden"
          value={packageManualTotal}
        />
      ) : null}
      {servicesTotalMode !== "MANUAL" ? (
        <input
          name="servicesManualTotal"
          type="hidden"
          value={servicesManualTotal}
        />
      ) : null}
      {menuTotalMode !== "MANUAL" ? (
        <input name="menuManualTotal" type="hidden" value={menuManualTotal} />
      ) : null}
      {finalTotalMode !== "MANUAL" ? (
        <input name="finalManualTotal" type="hidden" value={finalManualTotal} />
      ) : null}

      <div className="space-y-3 xl:space-y-4">
        <WizardStepper
          steps={wizardSteps}
          activeStep={activeStep}
          completionPercent={completionPercent}
          onStepChange={goToStep}
        />

        <StepPanel active={activeStep === 0}>
          <section className="card-luxury p-4 sm:p-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
              <div>
                <SectionTitle
                  icon={Search}
                  title="مشتری قرارداد"
                  description="اول مشتری را پیدا کنید یا همان‌جا اطلاعات مشتری جدید را وارد کنید؛ این مرحله فقط روی هویت و راه ارتباطی تمرکز دارد."
                />
                <div className="relative mt-4">
                  <input
                    value={customerQuery}
                    onChange={(event) => {
                      setCustomerQuery(event.target.value);
                      if (event.target.value.trim().length < 2) {
                        setCustomerResults([]);
                      }
                    }}
                    placeholder="نام، شماره همراه یا کد ملی مشتری را وارد کنید"
                    className="input-luxury w-full"
                  />
                  {customerResults.length > 0 ? (
                    <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-3xl border border-[#d8c08b]/70 bg-[#fffdf8] shadow-[0_24px_80px_rgba(17,24,39,0.16)]">
                      {customerResults.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => selectCustomer(customer)}
                          className="flex w-full items-start justify-between gap-3 border-b border-[#d8c08b]/36 px-4 py-3 text-right transition last:border-b-0 hover:bg-[#fff8ea]"
                        >
                          <span>
                            <span className="block text-sm font-black text-[#111827]">
                              {customer.fullName}
                            </span>
                            <span className="mt-1 block text-xs font-bold text-[#7d6841]">
                              {toPersianDigits(customer.phone)}
                              {customer.maskedNationalCode
                                ? ` · ${toPersianDigits(customer.maskedNationalCode)}`
                                : ""}
                            </span>
                          </span>
                          <Check className="mt-1 text-[#25a46d]" size={17} />
                        </button>
                      ))}
                    </div>
                  ) : customerQuery.trim().length >= 2 && !selectedCustomer ? (
                    <p className="mt-2 rounded-2xl border border-[#d8c08b]/48 bg-[#fff8ea]/72 px-3 py-2 text-xs font-bold leading-6 text-[#7d6841]">
                      مشتری پیدا نشد؛ اطلاعات مشتری جدید را در کارت هویت وارد
                      کنید.
                    </p>
                  ) : null}
                </div>
                {selectedCustomer ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#25a46d]/22 bg-[#25a46d]/10 px-4 py-3">
                    <span className="text-sm font-black text-[#17483f]">
                      مشتری انتخاب‌شده: {selectedCustomer.fullName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(null)}
                      className="text-xs font-black text-[#7d6841]"
                    >
                      پاک کردن انتخاب
                    </button>
                  </div>
                ) : null}
              </div>

              <CustomerSummaryPanel
                source={customerSourceLabel}
                name={customerNameStatus}
                phone={customerPhoneStatus}
                nationalCode={customerIdentityStatus}
                address={customerAddressStatus}
                complete={customerStepComplete}
              />
            </div>
          </section>

          <section className="card-luxury p-4 sm:p-5">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start">
              <div>
                <SectionTitle
                  icon={UserRound}
                  title="هویت و اطلاعات تماس"
                  description="حداقل نام و شماره همراه وارد نشده؛ کد ملی و آدرس برای پیگیری و نسخه چاپی قرارداد استفاده می‌شوند."
                />
                <div className="mt-4 grid items-start gap-3 md:grid-cols-2">
                  <Field label="پیشوند / عنوان" className="min-h-[5.75rem]">
                    <select
                      name="salutation"
                      value={salutation}
                      onChange={(event) => setSalutation(event.target.value)}
                      className="input-luxury"
                    >
                      {salutationOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="نام و نام خانوادگی" className="min-h-[5.75rem]">
                    <input
                      name="customerName"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      className="input-luxury"
                      required={activeStep === 0}
                      aria-invalid={activeStep === 0 && !customerName.trim()}
                    />
                    {activeStep === 0 && !customerName.trim() ? (
                      <FieldError message="نام مشتری برای ادامه ضروری است." />
                    ) : null}
                  </Field>
                  <Field label="شماره همراه" className="min-h-[5.75rem]">
                    <input
                      name="customerMobile"
                      value={customerMobile}
                      onChange={(event) =>
                        setCustomerMobile(event.target.value)
                      }
                      className="input-luxury"
                      inputMode="tel"
                      required={activeStep === 0}
                      aria-invalid={activeStep === 0 && !customerMobile.trim()}
                    />
                    {activeStep === 0 && !customerMobile.trim() ? (
                      <FieldError message="شماره همراه مشتری برای پیگیری قرارداد ضروری است." />
                    ) : null}
                  </Field>
                  <Field label="شماره ملی" className="min-h-[5.75rem]">
                    <input
                      name="nationalCode"
                      value={nationalCode}
                      onChange={(event) => setNationalCode(event.target.value)}
                      className="input-luxury"
                      inputMode="numeric"
                    />
                  </Field>
                  <label className="grid min-h-[5.75rem] gap-2 text-sm font-black text-[#172033] md:col-span-2">
                    <span>آدرس منزل</span>
                    <textarea
                      name="address"
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      className="input-luxury min-h-20 resize-y"
                      placeholder="آدرس برای متن قرارداد و پیگیری‌های بعدی"
                    />
                  </label>
                </div>
              </div>
              <div className="rounded-[1.35rem] border border-[#d8c08b]/52 bg-[#fff8ea]/72 p-4">
                <p className="text-xs font-black text-[#17483f]">
                  وضعیت اطلاعات مشتری
                </p>
                <div className="mt-3 grid gap-2">
                  <ChecklistPill
                    label="نام مشتری"
                    done={Boolean(customerName.trim())}
                  />
                  <ChecklistPill
                    label="شماره همراه"
                    done={Boolean(customerMobile.trim())}
                  />
                  <ChecklistPill
                    label="کد ملی"
                    done={Boolean(nationalCode.trim())}
                    optional
                  />
                  <ChecklistPill
                    label="آدرس"
                    done={Boolean(address.trim())}
                    optional
                  />
                </div>
              </div>
            </div>
          </section>
        </StepPanel>

        <StepPanel active={activeStep === 1}>
          <section className="card-luxury p-4 sm:p-5">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
              <div>
                <SectionTitle
                  icon={CalendarDays}
                  title="زمان و محل مراسم"
                  description="تاریخ، ساعت، سالن و تعداد مهمان را مشخص کنید تا پکیج و مالی دقیق‌تر محاسبه شود."
                />
                <div className="mt-4 grid items-start gap-3 md:grid-cols-2">
                  <Field label="نوع مراسم" className="min-h-[5.75rem]">
                    <select
                      name="eventTypeId"
                      value={customEventType ? "none" : eventTypeId}
                      onChange={(event) => {
                        setEventTypeId(event.target.value);
                        setCustomEventType("");
                      }}
                      className="input-luxury"
                    >
                      <option value="none">انتخاب نوع مراسم</option>
                      {eventTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="افزودن نوع مراسم" className="min-h-[5.75rem]">
                    <input
                      name="customEventType"
                      value={customEventType}
                      onChange={(event) =>
                        setCustomEventType(event.target.value)
                      }
                      placeholder="اگر در فهرست نبود، اینجا بنویسید"
                      className="input-luxury"
                    />
                  </Field>
                  <JalaliDatePicker
                    name="eventDate"
                    label="تاریخ مراسم"
                    value={eventDate}
                    onChange={setEventDate}
                    minJalaliYear={1400}
                    required={activeStep === 1}
                    error={activeStep === 1 && !eventDate ? "تاریخ مراسم را انتخاب کنید." : undefined}
                    className="min-h-[5.75rem]"
                  />
                  <Field label="روز مراسم" className="min-h-[5.75rem]">
                    <input
                      value={weekday}
                      readOnly
                      className="input-luxury bg-[#fff8ea]"
                    />
                  </Field>
                  <TimeSelect
                    className="min-h-[5.75rem]"
                    name="eventStartTime"
                    label="ساعت شروع مراسم"
                    value={eventStartTime}
                    onChange={setEventStartTime}
                    required={activeStep === 1}
                  />
                  <TimeSelect
                    className="min-h-[5.75rem]"
                    name="eventEndTime"
                    label="ساعت پایان مراسم"
                    value={eventEndTime}
                    onChange={setEventEndTime}
                    required={activeStep === 1}
                  />
                  <Field label="تعداد مهمان‌ها" className="min-h-[5.75rem]">
                    <input
                      name="guestCount"
                      value={guestCount}
                      onChange={(event) => setGuestCount(event.target.value)}
                      className="input-luxury"
                      inputMode="numeric"
                      required={activeStep === 1}
                      aria-invalid={activeStep === 1 && guestCountNumber <= 0}
                    />
                    {activeStep === 1 && guestCountNumber <= 0 ? (
                      <FieldError message="تعداد مهمان باید بیشتر از صفر باشد." />
                    ) : null}
                  </Field>
                  <Field label="تالار" className="min-h-[5.75rem]">
                    <select
                      name="hallId"
                      value={hallId}
                      onChange={(event) => {
                        setHallId(event.target.value);
                        setSalonId("none");
                      }}
                      className="input-luxury"
                    >
                      <option value="none">انتخاب نشده</option>
                      {halls.map((hall) => (
                        <option key={hall.id} value={hall.id}>
                          {hall.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="سالن" className="min-h-[5.75rem]">
                    <select
                      name="salonId"
                      value={salonId}
                      onChange={(event) => setSalonId(event.target.value)}
                      className="input-luxury"
                      disabled={
                        hallId !== "none" && selectedHallSalons.length === 0
                      }
                    >
                      <option value="none">انتخاب نشده</option>
                      {selectedHallSalons.map((salon) => (
                        <option key={salon.id} value={salon.id}>
                          {salon.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                {hallId !== "none" && selectedHallSalons.length === 0 ? (
                  <InlineWarning className="mt-4">
                    برای تالار انتخاب‌شده سالن فعالی ثبت نشده است. قبل از ثبت
                    قرارداد، سالن را در تعاریف پایه تکمیل کنید.
                  </InlineWarning>
                ) : null}
              </div>

              <EventReadinessPanel
                date={eventDateSummary}
                time={eventTimeSummary}
                eventType={selectedEventTypeLabel}
                guestCount={
                  guestCountNumber > 0
                    ? `${formatPersianNumber(guestCountNumber)} نفر`
                    : "وارد نشده"
                }
                location={eventLocationSummary}
                ready={eventReservationReady && !reservationHasConflict}
                statusLabel={eventReservationStatusLabel}
                message={eventReservationMessage}
                conflicts={reservationAvailability.conflicts}
              />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <MiniStatusCard label="تاریخ" value={eventDateSummary} />
              <MiniStatusCard label="ساعت" value={eventTimeSummary} />
              <MiniStatusCard label="سالن" value={selectedSalonLabel} />
              <MiniStatusCard
                label="وضعیت رزرو"
                value={eventReservationStatusLabel}
              />
            </div>
          </section>
        </StepPanel>

        <StepPanel active={activeStep === 2}>
          <section className="card-luxury p-4 sm:p-5">
            <SectionTitle
              icon={PackagePlus}
              title="انتخاب پکیج قرارداد"
              description="یک پکیج آماده انتخاب کنید تا خدمات و منوی آن خودکار اضافه شود؛ در صورت نیاز بعداً آن را ویرایش می‌کنید."
            />
            <PackageSelector
              packages={packages}
              selectedPackageId={selectedPackageId}
              guestCountNumber={guestCountNumber}
              onSelect={selectPackage}
            />

            {selectedPackage ? (
              <div className="mt-4 rounded-[1.45rem] border border-[#c7a15a]/36 bg-[#fff8ea]/72 p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/30 bg-[#c7a15a]/10 px-3 py-1 text-xs font-black text-[#17483f]">
                      <PackagePlus size={14} />
                      پکیج انتخاب‌شده برای این قرارداد
                    </div>
                    <h3 className="mt-3 text-base font-black text-[#111827]">
                      {selectedPackage.title}
                    </h3>
                    {selectedPackage.description ? (
                      <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
                        {selectedPackage.description}
                      </p>
                    ) : null}
                    <div className="mt-3 grid gap-2 text-xs font-bold leading-6 text-[#7d6841] sm:grid-cols-2">
                      <PackageIncludedSummary
                        title="خدمات داخل پکیج"
                        items={selectedPackage.serviceNames}
                      />
                      <PackageIncludedSummary
                        title="منوهای داخل پکیج"
                        items={selectedPackage.menuNames}
                      />
                      {selectedPackage.includedItemsNote ? (
                        <div className="rounded-2xl border border-[#d8c08b]/42 bg-white/55 px-3 py-2 sm:col-span-2">
                          <span className="font-black text-[#17483f]">
                            توضیحات
                          </span>
                          <p className="mt-1 whitespace-pre-line">
                            {selectedPackage.includedItemsNote}
                          </p>
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-3 rounded-2xl border border-[#17483f]/12 bg-[#17483f]/5 px-3 py-2 text-xs font-bold leading-6 text-[#17483f]">
                      خدمات و منوهای این پکیج خودکار انتخاب شده‌اند. برای تغییر آیتم‌ها، از گزینه ویرایش خدمات و منو استفاده کنید.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#17483f]/14 bg-white/58 p-3 lg:min-w-64">
                    <p className="text-xs font-black text-[#7d6841]">
                      مبلغ پکیج
                    </p>
                    <p className="mt-1 text-xl font-black text-[#111827]">
                      {formatIRR(packageTotal)}
                    </p>
                    <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">
                      {packageTotalMode === "MANUAL"
                        ? "مبلغ پکیج دستی تنظیم شده است."
                        : `${formatPersianNumber(guestCountNumber)} نفر × ${formatIRR(selectedPackage.pricePerGuest)}`}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <CategoryManualTotalControl
                    title="تنظیم مبلغ پکیج"
                    description="در حالت عادی، مبلغ از قیمت هر نفر و تعداد مهمان محاسبه می‌شود. اگر مبلغ توافقی دارید، آن را دستی وارد کنید."
                    checkboxLabel="تعیین مبلغ توافقی پکیج"
                    mode={packageTotalMode}
                    onModeChange={setPackageTotalMode}
                    manualValue={packageManualTotal}
                    onManualValueChange={setPackageManualTotal}
                    inputName="packageManualTotal"
                    autoValue={guestCountNumber * selectedPackage.pricePerGuest}
                    effectiveValue={packageTotal}
                  />
                </div>
              </div>
            ) : packages.length === 0 ? (
              <CatalogEmptyState
                title="پکیجی برای انتخاب وجود ندارد"
                description="برای ثبت سریع قرارداد، ابتدا در تعاریف پایه یک پکیج بسازید. تا آن زمان می‌توانید قرارداد را به‌صورت سفارشی و با خدمات دستی ثبت کنید."
                actionLabel="ادامه با قرارداد سفارشی"
              />
            ) : null}
            {selectedPackage ? (
              <PackageCustomizationToggle
                open={customizePackageItems}
                onToggle={() => setCustomizePackageItems((current) => !current)}
                servicesCount={selectedPackage.serviceIds.length}
                menusCount={selectedPackage.menuIds.length}
              />
            ) : null}

            {hasPerGuestSelection && guestCountNumber <= 0 ? (
              <InlineWarning className="mt-4">
                ابتدا تعداد مهمان‌ها را وارد کنید.
              </InlineWarning>
            ) : null}
          </section>

          {selectedPackage && !customizePackageItems ? (
            <section className="card-luxury p-4 sm:p-5">
              <SectionTitle
                icon={Check}
                title="خلاصه پکیج انتخاب‌شده"
                description="خدمات و منوی پکیج فعال است. فقط اگر لازم دارید آیتمی را اضافه یا حذف کنید، ویرایش خدمات و منو را باز کنید."
              />
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <MiniStatusCard
                  label="خدمات"
                  value={`${formatPersianNumber(selectedPackage.serviceIds.length)} مورد`}
                />
                <MiniStatusCard
                  label="منوها"
                  value={`${formatPersianNumber(selectedPackage.menuIds.length)} مورد`}
                />
                <MiniStatusCard
                  label="مبلغ پکیج"
                  value={formatIRR(packageTotal)}
                />
              </div>
            </section>
          ) : (
            <>
              <CatalogSection
                title="خدمات مراسم"
                description="خدمات فعال با آخرین قیمت ثبت‌شده نمایش داده می‌شوند و کنترل‌های مرتبط با نوع قیمت‌گذاری در دسترس هستند."
                missingPriceMessage="قیمت این خدمت ثبت نشده است. اگر تغییر قیمت مجاز است، مبلغ را همین‌جا وارد کنید؛ در غیر این صورت ابتدا قیمت پایه را تکمیل کنید."
                manualPricingMode={servicesTotalMode === "MANUAL"}
                manualPricingNotice="جمع خدمات دستی تنظیم شده است؛ خدمات برای متن قرارداد ثبت می‌شوند و مبلغ جداگانه محاسبه نمی‌شود."
                categoryTotalControl={
                  <CategoryManualTotalControl
                    title="کنترل جمع خدمات"
                    description="اگر روشن باشد، جمع خدمات را دستی وارد می‌کنید و قیمت ردیف‌های خدمات صفر و قفل می‌شود."
                    checkboxLabel="تنظیم دستی مبلغ خدمات"
                    mode={servicesTotalMode}
                    onModeChange={setServicesTotalMode}
                    manualValue={servicesManualTotal}
                    onManualValueChange={setServicesManualTotal}
                    inputName="servicesManualTotal"
                    autoValue={autoServicesTotal}
                    effectiveValue={servicesTotal}
                  />
                }
                groups={groupedServices}
                drafts={serviceDrafts}
                guestCountNumber={guestCountNumber}
                searchValue={serviceCatalogSearch}
                onSearchChange={setServiceCatalogSearch}
                includedItemIds={selectedPackageServiceIds}
                emptyLabel="خدمتی با این عبارت پیدا نشد."
                onToggle={toggleService}
                onChange={(id, patch) =>
                  setServiceDrafts((current) => ({
                    ...current,
                    [id]: {
                      ...(current[id] ?? {
                        selected: false,
                        quantity: "1",
                        unitPrice: "0",
                        note: "",
                      }),
                      ...patch,
                    },
                  }))
                }
              />

              <CatalogSection
                title="منوی پذیرایی"
                description="منو، نوشیدنی و دسر بر اساس تعداد مهمان‌ها محاسبه می‌شوند."
                missingPriceMessage="قیمت این آیتم ثبت نشده است. اگر تغییر قیمت مجاز است، مبلغ را همین‌جا وارد کنید؛ در غیر این صورت ابتدا قیمت پایه منو را تکمیل کنید."
                manualPricingMode={menuTotalMode === "MANUAL"}
                manualPricingNotice="جمع منو دستی تنظیم شده است؛ آیتم‌ها برای متن قرارداد ثبت می‌شوند و مبلغ جداگانه محاسبه نمی‌شود."
                categoryTotalControl={
                  <CategoryManualTotalControl
                    title="کنترل جمع منو"
                    description="اگر روشن باشد، جمع منو را دستی وارد می‌کنید و قیمت ردیف‌های غذا و نوشیدنی صفر و قفل می‌شود."
                    checkboxLabel="تنظیم دستی مبلغ منو"
                    mode={menuTotalMode}
                    onModeChange={setMenuTotalMode}
                    manualValue={menuManualTotal}
                    onManualValueChange={setMenuManualTotal}
                    inputName="menuManualTotal"
                    autoValue={autoMenuTotal}
                    effectiveValue={menuTotal}
                  />
                }
                groups={groupedMenus}
                drafts={menuDrafts}
                guestCountNumber={guestCountNumber}
                searchValue={menuCatalogSearch}
                onSearchChange={setMenuCatalogSearch}
                includedItemIds={selectedPackageMenuIds}
                emptyLabel="آیتم منویی با این عبارت پیدا نشد."
                onToggle={toggleMenu}
                onChange={(id, patch) =>
                  setMenuDrafts((current) => ({
                    ...current,
                    [id]: {
                      ...(current[id] ?? {
                        selected: false,
                        quantity: guestCount || "1",
                        unitPrice: "0",
                        note: "",
                      }),
                      ...patch,
                    },
                  }))
                }
              />

              <CustomAdditionsSection
                items={extraLineItems}
                onAdd={addExtraLine}
                onChange={updateExtraLine}
                onRemove={removeExtraLine}
              />
            </>
          )}
        </StepPanel>

        <StepPanel active={activeStep === 3}>
          <section className="card-luxury p-3 sm:p-4">
            <SectionTitle
              icon={CircleDollarSign}
              title="مالی و پرداخت قرارداد"
              description="فقط مبلغ‌های مهم را کنترل کنید؛ جزئیات محاسبه داخل بخش بازشونده آمده است."
            />

            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <FinancialPreviewCard label="جمع قبل از تخفیف" value={subtotal} compact />
              <FinancialPreviewCard label="مبلغ نهایی" value={finalTotal} strong compact />
              <FinancialPreviewCard label="بیعانه" value={deposit} compact />
              <FinancialPreviewCard label="مانده" value={remaining} strong compact />
            </div>

            <FinanceHealthBanner
              label={financeHealth.label}
              description={financeHealth.description}
              tone={financeHealth.tone}
              compact
            />

            <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <div className="rounded-[1.25rem] border border-[#17483f]/16 bg-[#17483f]/5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-[#111827]">
                      مبلغ نهایی قرارداد
                    </p>
                    <p className="mt-1 text-xs font-bold leading-5 text-[#6d5f49]">
                      اگر توافق خاص دارید، همین مبلغ نهایی را دستی اصلاح کنید.
                    </p>
                  </div>
                  <span className="rounded-full border border-[#17483f]/18 bg-white/70 px-3 py-1 text-xs font-black text-[#17483f]">
                    {formatIRR(finalTotal)}
                  </span>
                </div>

                <div className="mt-3">
                  <FinanceManualControlCard
                    label="مبلغ نهایی"
                    mode={finalTotalMode}
                    onModeChange={setFinalTotalMode}
                    manualValue={finalManualTotal}
                    onManualValueChange={setFinalManualTotal}
                    inputName="finalManualTotal"
                    autoValue={autoFinalTotal}
                    effectiveValue={finalTotal}
                    strong
                    compact
                  />
                </div>

                {finalTotal <= 0 ? (
                  <div className="mt-3">
                    <InlineWarning>
                      مبلغ نهایی قرارداد باید بیشتر از صفر باشد.
                    </InlineWarning>
                  </div>
                ) : null}
              </div>

              <div className="rounded-[1.25rem] border border-[#d8c08b]/52 bg-white/62 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-[#111827]">
                      پرداخت اولیه و یادداشت
                    </p>
                    <p className="mt-1 text-xs font-bold leading-5 text-[#6d5f49]">
                      بیعانه، مانده و نکات پرداخت را کوتاه ثبت کنید.
                    </p>
                  </div>
                  <span className="rounded-full border border-[#c7a15a]/28 bg-[#c7a15a]/10 px-3 py-1 text-xs font-black text-[#7d6841]">
                    {deposit > 0 ? "بیعانه ثبت شده" : "بدون بیعانه"}
                  </span>
                </div>

                <div className="mt-3 grid gap-3">
                  <RialInput
                    label="بیعانه"
                    name="depositAmount"
                    value={depositAmount}
                    onValueChange={setDepositAmount}
                    inputClassName="input-luxury min-h-10 py-2 text-sm"
                    className="text-sm font-black text-[#172033]"
                  />
                  {depositWarning ? (
                    <InlineWarning>
                      بیعانه نمی‌تواند از مبلغ نهایی بیشتر باشد.
                    </InlineWarning>
                  ) : null}
                  <label className="grid gap-2 text-sm font-black text-[#172033]">
                    <span>یادداشت قرارداد</span>
                    <textarea
                      name="notes"
                      value={contractNotes}
                      onChange={(event) => setContractNotes(event.target.value)}
                      className="input-luxury min-h-16 resize-y py-2 text-sm"
                      placeholder="اختیاری؛ توافق مالی، شرایط پرداخت یا نکات مهم قرارداد"
                    />
                  </label>
                  <p className="rounded-2xl border border-[#d8c08b]/48 bg-[#fff8ea]/70 px-3 py-2 text-xs font-bold leading-5 text-[#7d6841]">
                    {nextPaymentHint}
                  </p>
                </div>
              </div>
            </div>

            <details
              className="mt-3 rounded-[1.25rem] border border-[#d8c08b]/48 bg-[#fff8ea]/54 p-3"
              open={
                packageTotalMode === "MANUAL" ||
                servicesTotalMode === "MANUAL" ||
                menuTotalMode === "MANUAL" ||
                discount > 0 ||
                discountWarning
              }
            >
              <summary className="cursor-pointer list-none text-sm font-black text-[#111827] marker:hidden">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/52 bg-white/70 px-3 py-1">
                  جزئیات محاسبه و تخفیف
                  <span className="text-xs text-[#7d6841]">
                    {formatIRR(subtotal)}
                  </span>
                </span>
              </summary>

              <div className="mt-3 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
                {selectedPackage ? (
                  <FinanceManualControlCard
                    label="مبلغ پکیج"
                    mode={packageTotalMode}
                    onModeChange={setPackageTotalMode}
                    manualValue={packageManualTotal}
                    onManualValueChange={setPackageManualTotal}
                    inputName="packageManualTotal"
                    autoValue={autoPackageTotal}
                    effectiveValue={packageTotal}
                    compact
                  />
                ) : null}
                <FinanceManualControlCard
                  label="مبلغ خدمات"
                  mode={servicesTotalMode}
                  onModeChange={setServicesTotalMode}
                  manualValue={servicesManualTotal}
                  onManualValueChange={setServicesManualTotal}
                  inputName="servicesManualTotal"
                  autoValue={autoServicesTotal}
                  effectiveValue={servicesTotal}
                  compact
                />
                <FinanceManualControlCard
                  label="مبلغ منو"
                  mode={menuTotalMode}
                  onModeChange={setMenuTotalMode}
                  manualValue={menuManualTotal}
                  onManualValueChange={setMenuManualTotal}
                  inputName="menuManualTotal"
                  autoValue={autoMenuTotal}
                  effectiveValue={menuTotal}
                  compact
                />
                <div className="rounded-2xl border border-[#d8c08b]/50 bg-white/62 px-3 py-2">
                  <RialInput
                    label="تخفیف"
                    name="discountAmount"
                    value={discountAmount}
                    onValueChange={setDiscountAmount}
                    inputClassName="input-luxury min-h-10 py-2 text-sm"
                    className="text-sm font-black text-[#172033]"
                  />
                  {discountWarning ? (
                    <div className="mt-2">
                      <InlineWarning>
                        تخفیف نمی‌تواند از جمع قرارداد بیشتر باشد.
                      </InlineWarning>
                    </div>
                  ) : null}
                </div>
              </div>
            </details>

            <div className="mt-3 rounded-[1.25rem] border border-[#d8c08b]/48 bg-white/58 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black text-[#111827]">
                  کنترل قبل از ثبت
                </p>
                <span className="rounded-full border border-[#17483f]/14 bg-[#17483f]/5 px-3 py-1 text-xs font-black text-[#17483f]">
                  {financeHealth.label}
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {financeChecklist.map((item) => (
                  <ChecklistPill
                    key={item.label}
                    label={item.label}
                    done={item.done}
                  />
                ))}
              </div>
            </div>
          </section>
        </StepPanel>

        <StepPanel active={activeStep === 4}>
          <section className="card-luxury p-4 sm:p-5">
            <SectionTitle
              icon={Check}
              title="بررسی نهایی قرارداد"
              description="موارد ضروری، مبلغ‌ها و خلاصه قرارداد را کنترل کنید؛ سپس ثبت نهایی را انجام دهید."
            />

            <div
              className={`mt-4 rounded-[1.45rem] border px-4 py-3 ${
                finalReviewReady
                  ? "border-[#25a46d]/24 bg-[#eafaf1] text-[#17483f]"
                  : "border-[#b45353]/24 bg-[#fff1f1] text-[#8f2c2c]"
              }`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black">
                    {finalReviewReady
                      ? "آماده ثبت نهایی"
                      : "موارد ضروری باید تکمیل شود"}
                  </p>
                  <p className="mt-1 text-xs font-bold leading-6">
                    {finalReviewReady
                      ? "خلاصه قرارداد آماده است؛ قبل از ثبت نهایی یک‌بار مبلغ و مراسم را کنترل کنید."
                      : "تا زمانی که موارد ضروری تکمیل نشوند، دکمه ثبت نهایی فعال نمی‌شود."}
                  </p>
                </div>
                <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-black">
                  {finalReviewReady
                    ? "قابل ثبت"
                    : `${formatPersianNumber(finalReviewIssues.length)} نقص ضروری`}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.55fr)]">
              <div className="rounded-[1.25rem] border border-[#d8c08b]/46 bg-white/62 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-black text-[#111827]">
                    خلاصه قابل ثبت
                  </h3>
                  <span className="rounded-full border border-[#d8c08b]/52 bg-[#fff8ea] px-3 py-1 text-[11px] font-black text-[#7d6841]">
                    مرحله آخر
                  </span>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <div className="rounded-2xl border border-[#d8c08b]/42 bg-white/70 px-3 py-2">
                    <p className="text-[11px] font-black text-[#7d6841]">مشتری</p>
                    <p className="mt-1 truncate text-sm font-black text-[#111827]">
                      {customerName || "وارد نشده"}
                    </p>
                    <p className="mt-1 truncate text-[11px] font-bold text-[#6d5f49]">
                      {customerMobile ? toPersianDigits(customerMobile) : "موبایل وارد نشده"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#d8c08b]/42 bg-white/70 px-3 py-2">
                    <p className="text-[11px] font-black text-[#7d6841]">مراسم</p>
                    <p className="mt-1 truncate text-sm font-black text-[#111827]">
                      {selectedEventTypeLabel}
                    </p>
                    <p className="mt-1 truncate text-[11px] font-bold text-[#6d5f49]">
                      {eventDateSummary} · {eventTimeSummary}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#25a46d]/22 bg-[#eafaf1] px-3 py-2">
                    <p className="text-[11px] font-black text-[#17483f]">مبلغ نهایی</p>
                    <p className="mt-1 truncate text-sm font-black text-[#17483f]">
                      {formatIRR(finalTotal)}
                    </p>
                    <p className="mt-1 truncate text-[11px] font-bold text-[#17483f]/80">
                      مانده: {formatIRR(remaining)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => goToStep(0)}
                    className="rounded-2xl border border-[#d8c08b]/46 bg-[#fff8ea]/74 px-3 py-2 text-xs font-black text-[#7d6841] transition hover:bg-white"
                  >
                    ویرایش مشتری
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="rounded-2xl border border-[#d8c08b]/46 bg-[#fff8ea]/74 px-3 py-2 text-xs font-black text-[#7d6841] transition hover:bg-white"
                  >
                    ویرایش مراسم
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className="rounded-2xl border border-[#17483f]/18 bg-[#17483f]/6 px-3 py-2 text-xs font-black text-[#17483f] transition hover:bg-white"
                  >
                    ویرایش مالی
                  </button>
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-[#d8c08b]/46 bg-white/62 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-black text-[#111827]">
                    کنترل نهایی
                  </h3>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-black ${
                      finalReviewReady
                        ? "bg-[#eafaf1] text-[#17483f]"
                        : "bg-[#fff1f1] text-[#8f2c2c]"
                    }`}
                  >
                    {finalReviewReady
                      ? "آماده ثبت"
                      : `${formatPersianNumber(finalReviewIssues.length)} نقص`}
                  </span>
                </div>

                <div className="mt-3 grid gap-2">
                  {finalReviewIssues.slice(0, 3).map((message) => (
                    <ReviewAlert key={message} tone="danger" message={message} />
                  ))}
                  {finalReviewIssues.length === 0
                    ? finalReviewWarnings.slice(0, 2).map((message) => (
                        <ReviewAlert key={message} tone="warning" message={message} />
                      ))
                    : null}
                  {finalReviewIssues.length === 0 && finalReviewWarnings.length === 0 ? (
                    <ReviewAlert
                      tone="success"
                      message="مورد مهمی برای بررسی باقی نمانده است."
                    />
                  ) : null}
                  {finalReviewIssues.length > 3 ? (
                    <p className="rounded-2xl border border-[#b45353]/18 bg-[#fff1f1]/72 px-3 py-2 text-xs font-black text-[#8f2c2c]">
                      {formatPersianNumber(finalReviewIssues.length - 3)} نقص دیگر در جزئیات پایین نمایش داده شده است.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <details className="mt-3 rounded-[1.25rem] border border-[#d8c08b]/50 bg-[#fffdf8]/82 p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black text-[#111827] [&::-webkit-details-marker]:hidden">
                <span>جزئیات قرارداد و چاپ</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] font-black text-[#7d6841]">
                  {formatPersianNumber(lineItems.length)} ردیف
                  <ChevronDown size={14} />
                </span>
              </summary>

              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                <div className="rounded-2xl border border-[#d8c08b]/42 bg-white/66 p-3">
                  <p className="text-xs font-black text-[#7d6841]">مشتری</p>
                  <div className="mt-2 grid gap-2 text-xs font-bold text-[#6d5f49]">
                    <PrintPreviewRow label="نام" value={customerName || "وارد نشده"} />
                    <PrintPreviewRow label="موبایل" value={customerMobile ? toPersianDigits(customerMobile) : "وارد نشده"} />
                    <PrintPreviewRow label="کد ملی" value={nationalCode ? toPersianDigits(nationalCode) : "ثبت نشده"} />
                  </div>
                </div>

                <div className="rounded-2xl border border-[#d8c08b]/42 bg-white/66 p-3">
                  <p className="text-xs font-black text-[#7d6841]">مراسم</p>
                  <div className="mt-2 grid gap-2 text-xs font-bold text-[#6d5f49]">
                    <PrintPreviewRow label="نوع" value={selectedEventTypeLabel} />
                    <PrintPreviewRow label="تاریخ" value={eventDate ? `${weekday}، ${toPersianDigits(eventDate)}` : "وارد نشده"} />
                    <PrintPreviewRow label="محل" value={eventLocationSummary} />
                  </div>
                </div>

                <div className="rounded-2xl border border-[#d8c08b]/42 bg-white/66 p-3">
                  <p className="text-xs font-black text-[#7d6841]">مالی</p>
                  <div className="mt-2 grid gap-2 text-xs font-bold text-[#6d5f49]">
                    <PrintPreviewRow label="مبلغ نهایی" value={formatIRR(finalTotal)} strong />
                    <PrintPreviewRow label="بیعانه" value={formatIRR(deposit)} />
                    <PrintPreviewRow label="مانده" value={formatIRR(remaining)} strong />
                  </div>
                </div>
              </div>

              {finalReviewPreviewItems.length > 0 ? (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {finalReviewPreviewItems.map((item) => (
                    <div
                      key={item.key}
                      className="grid gap-2 rounded-2xl border border-[#d8c08b]/42 bg-white/62 px-3 py-2 text-xs font-bold text-[#6d5f49] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <span className="min-w-0">
                        <strong className="block truncate text-[#111827]">
                          {item.name}
                        </strong>
                        <span className="mt-1 block truncate">
                          {item.category} · {formatPersianNumber(item.quantity)} {item.unitLabel || "مورد"}
                        </span>
                      </span>
                      <strong className="text-right text-[#17483f]">
                        {formatIRR(item.totalPrice)}
                      </strong>
                    </div>
                  ))}
                  {hiddenPreviewItemsCount > 0 ? (
                    <p className="rounded-2xl border border-[#d8c08b]/40 bg-white/50 px-3 py-2 text-xs font-black text-[#7d6841]">
                      {formatPersianNumber(hiddenPreviewItemsCount)} ردیف دیگر در قرارداد ثبت می‌شود.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 rounded-2xl border border-[#d8c08b]/42 bg-white/58 px-3 py-3 text-xs font-bold leading-6 text-[#7d6841]">
                  هنوز پکیج، خدمت یا منویی انتخاب نشده است. اگر مبلغ قرارداد دستی است، توضیح توافق را در یادداشت مالی بنویسید.
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#17483f]/14 bg-[#17483f]/5 px-3 py-2">
                <span className="text-xs font-bold leading-6 text-[#17483f]">
                  پیش‌نمایش چاپی از همین اطلاعات ساخته می‌شود.
                </span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex min-h-9 items-center justify-center rounded-2xl border border-[#17483f]/18 bg-[#17483f] px-4 py-2 text-xs font-black text-white transition hover:bg-[#0f342d]"
                >
                  چاپ پیش‌نمایش
                </button>
              </div>
            </details>

            {finalReviewIssues.length > 3 || finalReviewWarnings.length > 2 ? (
              <details className="mt-3 rounded-[1.25rem] border border-[#b45353]/18 bg-[#fff8ea]/68 p-3">
                <summary className="cursor-pointer list-none text-sm font-black text-[#111827] [&::-webkit-details-marker]:hidden">
                  نمایش همه هشدارها و نقص‌ها
                </summary>
                <div className="mt-3 grid gap-2">
                  {finalReviewIssues.slice(3).map((message) => (
                    <ReviewAlert key={message} tone="danger" message={message} />
                  ))}
                  {finalReviewWarnings.slice(finalReviewIssues.length === 0 ? 2 : 0).map((message) => (
                    <ReviewAlert key={message} tone="warning" message={message} />
                  ))}
                </div>
              </details>
            ) : null}

            <div className="mt-3 rounded-[1.25rem] border border-[#d8c08b]/50 bg-white/62 p-3">
              <div className="grid gap-2 sm:grid-cols-3">
                {requiredChecklist.map((item) => (
                  <ChecklistPill
                    key={item.label}
                    label={item.label}
                    done={item.done}
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[#d8c08b]/62 bg-white/70 px-4 py-2 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a] hover:text-[#111827]"
                >
                  بازگشت به مالی
                </button>
                <p className="text-xs font-bold leading-6 text-[#6d5f49]">
                  پس از ثبت، قرارداد در لیست قراردادها و مسیرهای دریافت قابل پیگیری است.
                </p>
              </div>
            </div>

          </section>
        </StepPanel>

        <WizardNavigation
          activeStep={activeStep}
          maxStep={wizardSteps.length - 1}
          onPrevious={goPrevious}
          onNext={goNext}
          canSubmit={finalStepReady}
        />
      </div>

      <aside className="hidden xl:sticky xl:top-24 xl:block">
        <section className="card-luxury-dark p-4 text-[#fff8ea] sm:p-5">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="text-[#f0dba9]" size={20} />
            <h2 className="text-lg font-black">خلاصه مالی قرارداد</h2>
          </div>
          <p className="mt-2 text-xs font-bold leading-6 text-[#d8c08b]">
            مبلغ‌ها در هر مرحله به‌روزرسانی می‌شوند.
          </p>
          <div className="mt-3 grid gap-2">
            {selectedPackage ? (
              <SummaryRow label="مبلغ پکیج" value={packageTotal} />
            ) : null}
            <SummaryRow label="مبلغ خدمات" value={servicesTotal} />
            <SummaryRow label="مبلغ منو" value={menuTotal} />
            <SummaryRow label="جمع قرارداد" value={subtotal} />
            <SummaryRow label="تخفیف" value={discount} />
            <SummaryRow label="مبلغ نهایی" value={finalTotal} strong />
            <SummaryRow label="بیعانه" value={deposit} />
            <SummaryRow label="مانده قرارداد" value={remaining} />
          </div>

          <div className="mt-4 rounded-2xl border border-[#f0dba9]/18 bg-[#f0dba9]/10 px-4 py-3">
            <p className="text-xs font-black text-[#ffe8ad]">
              {financeHealth.label}
            </p>
            <p className="mt-1 text-[11px] font-bold leading-5 text-[#d8c08b]">
              {financeHealth.description}
            </p>
          </div>

          {selectedItemsMissingPrice.length > 0 ? (
            <WarningBox>
              {selectedServicesMissingPrice.length > 0
                ? `قیمت ${formatPersianNumber(selectedServicesMissingPrice.length)} خدمت در تعاریف پایه ثبت نشده است. `
                : ""}
              {selectedMenusMissingPrice.length > 0
                ? `قیمت ${formatPersianNumber(selectedMenusMissingPrice.length)} آیتم پذیرایی در تعاریف پایه ثبت نشده است. `
                : ""}
              اگر تغییر قیمت مجاز باشد می‌توانید قیمت قرارداد را در کارت
              انتخاب‌شده وارد کنید؛ در غیر این صورت ابتدا قیمت پایه را کامل
              کنید.
            </WarningBox>
          ) : null}

          {customItemsMissingPrice.length > 0 ? (
            <WarningBox>
              برای آیتم‌های توافقی، مبلغ را وارد کنید.
            </WarningBox>
          ) : null}

          {state.message ? (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-[#b45353]/28 bg-[#fff1f1] px-4 py-3 text-sm font-bold leading-7 text-[#8f2c2c]">
              <AlertCircle className="mt-1 shrink-0" size={17} />
              {state.message}
            </div>
          ) : null}

          <button
            type={activeStep === wizardSteps.length - 1 ? "submit" : "button"}
            onClick={
              activeStep === wizardSteps.length - 1
                ? undefined
                : () => goToStep(wizardSteps.length - 1)
            }
            disabled={
              activeStep === wizardSteps.length - 1
                ? isPending || !finalStepReady
                : false
            }
            className="btn-luxury-primary mt-5 w-full px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {activeStep === wizardSteps.length - 1
              ? isPending
                ? "در حال ثبت قرارداد..."
                : "ثبت نهایی قرارداد"
              : "بررسی نهایی"}
          </button>
          <button
            type="submit"
            formAction={saveContractServerDraftAction}
            className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-[#f0dba9]/28 bg-[#f0dba9]/10 px-4 py-3 text-sm font-black text-[#ffe8ad] transition hover:bg-[#f0dba9]/16"
          >
            ذخیره پیش‌نویس در حساب
          </button>

          {activeStep === wizardSteps.length - 1 && !finalStepReady ? (
            <p className="mt-3 rounded-2xl border border-[#ffd37a]/24 bg-[#f0dba9]/12 px-3 py-2 text-xs font-black leading-6 text-[#ffe8ad]">
              برای ثبت نهایی، مشتری، زمان مراسم و مبلغ معتبر را تکمیل
              کنید.
            </p>
          ) : null}
        </section>
      </aside>

      <MobileContractActionBar
        activeStep={activeStep}
        maxStep={wizardSteps.length - 1}
        finalTotal={finalTotal}
        remaining={remaining}
        canSubmit={finalStepReady}
        isPending={isPending}
        onPrevious={goPrevious}
        onNext={goNext}
      />
    </form>
    <ContractPrintSheet
      customerName={customerName || "وارد نشده"}
      customerMobile={customerMobile ? toPersianDigits(customerMobile) : "وارد نشده"}
      nationalCode={nationalCode ? toPersianDigits(nationalCode) : "ثبت نشده"}
      address={address || "ثبت نشده"}
      eventType={selectedEventTypeLabel}
      eventDate={eventDateSummary}
      eventTime={eventTimeSummary}
      eventLocation={eventLocationSummary}
      guestCount={formatPersianNumber(guestCountNumber)}
      packageTitle={selectedPackage?.title ?? "قرارداد سفارشی"}
      lineItems={lineItems}
      subtotal={subtotal}
      discount={discount}
      finalTotal={finalTotal}
      deposit={deposit}
      remaining={remaining}
      notes={contractNotes}
      printBrand={printBrand}
    />
    </>
  );
}

function buildPrintMonogram(value: string) {
  const cleanValue = value.replace(/\s+/g, "").trim();
  return cleanValue ? cleanValue.slice(0, 2) : "ت";
}

function ContractPrintSheet({
  customerName,
  customerMobile,
  nationalCode,
  address,
  eventType,
  eventDate,
  eventTime,
  eventLocation,
  guestCount,
  packageTitle,
  lineItems,
  subtotal,
  discount,
  finalTotal,
  deposit,
  remaining,
  notes,
  printBrand,
}: {
  customerName: string;
  customerMobile: string;
  nationalCode: string;
  address: string;
  eventType: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  guestCount: string;
  packageTitle: string;
  lineItems: ContractLineDraft[];
  subtotal: number;
  discount: number;
  finalTotal: number;
  deposit: number;
  remaining: number;
  notes: string;
  printBrand: PrintBrandInfo;
}) {
  const previewItems = lineItems.slice(0, 18);
  const hiddenItemsCount = Math.max(0, lineItems.length - previewItems.length);

  return (
    <section
      dir="rtl"
      className="hidden bg-white p-0 text-[#111111] print:block"
    >
      <div className="mx-auto h-[297mm] max-h-[297mm] w-[210mm] max-w-[210mm] overflow-hidden border border-[#8b6b2e] bg-[#fffdf8] p-[5mm] text-[11px] leading-[1.45]">
        <div className="grid grid-cols-[1fr_1.3fr_1fr] items-center gap-3 border-b border-[#8b6b2e]/55 pb-2">
          <div className="flex items-center gap-2">
            {printBrand.showLogoOnPrint ? (
              <PrintLogoMark
                logoUrl={printBrand.hallLogoUrl}
                monogram={buildPrintMonogram(printBrand.hallName)}
                className="flex h-14 w-16 items-center justify-center bg-transparent text-[15px] font-black text-[#8b6b2e]"
                fallbackClassName="flex size-full items-center justify-center rounded bg-[#fff7e7] text-[15px] font-black text-[#8b6b2e]"
                imageClassName="size-full object-contain"
              />
            ) : null}
            <div>
              <p className="text-[13px] font-black text-[#111111]">{printBrand.hallName}</p>
              <p className="mt-1 text-[10px] font-bold text-[#4a4030]">{getPrintPreviewEventSlogan(eventType)}</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-[14px] font-black text-[#1f1f1f]">بسمه تعالی</p>
            <h1 className="mt-1 text-[20px] font-black text-[#111111]">قرارداد برگزاری مراسم</h1>
          </div>
          <div className="text-left text-[10px] font-bold leading-5 text-[#333333]">
            <p>تاریخ چاپ: {toPersianDigits(new Date().toLocaleDateString("fa-IR"))}</p>
            <p>وضعیت: پیش‌نمایش</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
          <PrintBox title="مشخصات مشتری">
            <PrintLine label="نام مشتری" value={customerName} />
            <PrintLine label="شماره همراه" value={customerMobile} />
            <PrintLine label="کد ملی" value={nationalCode} />
            <PrintLine label="آدرس" value={address} />
          </PrintBox>
          <PrintBox title="مشخصات مراسم">
            <PrintLine label="نوع مراسم" value={eventType} />
            <PrintLine label="تاریخ" value={eventDate} />
            <PrintLine label="ساعت" value={eventTime} />
            <PrintLine label="محل" value={eventLocation} />
            <PrintLine label="تعداد مهمان" value={`${guestCount} نفر`} />
          </PrintBox>
        </div>

        <PrintBox title="پکیج و اقلام قرارداد" className="mt-3">
          <PrintLine label="پکیج" value={packageTitle} />
          {previewItems.length > 0 ? (
            <table className="mt-2 w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-black/5">
                  <th className="border border-[#8b6b2e]/35 px-2 py-1 text-right">شرح</th>
                  <th className="border border-[#8b6b2e]/35 px-2 py-1 text-right">دسته</th>
                  <th className="border border-[#8b6b2e]/35 px-2 py-1 text-center">تعداد</th>
                  <th className="border border-[#8b6b2e]/35 px-2 py-1 text-left">مبلغ</th>
                </tr>
              </thead>
              <tbody>
                {previewItems.map((item) => (
                  <tr key={item.key}>
                    <td className="border border-[#8b6b2e]/35 px-2 py-1 font-bold">{item.name}</td>
                    <td className="border border-[#8b6b2e]/35 px-2 py-1">{item.category}</td>
                    <td className="border border-[#8b6b2e]/35 px-2 py-1 text-center">
                      {formatPersianNumber(item.quantity)} {item.unitLabel || "مورد"}
                    </td>
                    <td className="border border-[#8b6b2e]/35 px-2 py-1 text-left font-bold">
                      {formatIRR(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-2 rounded border border-[#8b6b2e]/35 p-2 text-[11px]">
              اقلام مشخصی انتخاب نشده است.
            </p>
          )}
          {hiddenItemsCount > 0 ? (
            <p className="mt-3 text-xs font-bold">
              {formatPersianNumber(hiddenItemsCount)} ردیف دیگر در نسخه کامل قرارداد وجود دارد.
            </p>
          ) : null}
        </PrintBox>

        <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
          <PrintBox title="جمع‌بندی مالی">
            <PrintLine label="جمع قرارداد" value={formatIRR(subtotal)} />
            <PrintLine label="تخفیف" value={formatIRR(discount)} />
            <PrintLine label="مبلغ نهایی" value={formatIRR(finalTotal)} strong />
            <PrintLine label="بیعانه" value={formatIRR(deposit)} />
            <PrintLine label="مانده قرارداد" value={formatIRR(remaining)} strong />
          </PrintBox>
          <PrintBox title="توضیحات و شرایط">
            <p className="min-h-16 whitespace-pre-line leading-6">
              {notes.trim() || "توضیحی برای قرارداد ثبت نشده است."}
            </p>
          </PrintBox>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-10 text-center text-[12px] font-black">
          <div className="border-t border-black/40 pt-3">امضای مشتری</div>
          <div className="border-t border-black/40 pt-3">امضای مسئول تالار</div>
        </div>
      </div>
    </section>
  );
}

function getPrintPreviewEventSlogan(eventType: string) {
  const normalized = eventType.trim();
  const lower = normalized.toLowerCase();

  if (["ترحیم", "ختم", "فوت", "یادبود", "سوم", "هفتم", "چهلم"].some((keyword) => lower.includes(keyword))) {
    return "یاد و نام عزیز سفرکرده گرامی باد";
  }

  if (lower.includes("تولد") || lower.includes("زادروز")) {
    return "زادروزتان مبارک و روزگارتان سرشار از شادی";
  }

  if (lower.includes("سالگرد ازدواج") || lower.includes("سالگرد عقد")) {
    return "سالگرد پیوندتان مبارک و پایدار";
  }

  if (["عروسی", "عقد", "نامزدی", "حنابندان"].some((keyword) => lower.includes(keyword))) {
    return "سعادت و نیک‌بختی شما آرزوی ماست";
  }

  return "برگزاری شایسته مراسم شما افتخار ماست";
}

function PrintBox({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded border border-black/20 p-3 ${className}`}>
      <h2 className="border-b border-black/20 pb-2 text-base font-black">{title}</h2>
      <div className="mt-3 grid gap-2">{children}</div>
    </section>
  );
}

function PrintLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-black/10 pb-1 last:border-b-0">
      <span className="font-bold text-black/70">{label}</span>
      <strong className={`text-left ${strong ? "text-base" : "text-sm"}`}>{value}</strong>
    </div>
  );
}

function PrintPreviewRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#d8c08b]/32 bg-[#fff8ea]/62 px-3 py-2">
      <span>{label}</span>
      <strong className={`text-right ${strong ? "text-[#17483f]" : "text-[#111827]"}`}>{value}</strong>
    </div>
  );
}

function groupByCategory(items: SelectOption[]) {
  return items.reduce<Record<string, SelectOption[]>>((groups, item) => {
    const category = item.category ?? "سایر";
    groups[category] = [...(groups[category] ?? []), item];
    return groups;
  }, {});
}

function filterCatalogItems(items: SelectOption[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) =>
    [
      item.title,
      item.category ?? "",
      item.unitLabel,
      pricingTypeLabels[item.pricingType],
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

function StepPanel({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <div className={active ? "grid gap-3 sm:gap-4" : "hidden"} aria-hidden={!active}>
      {children}
    </div>
  );
}

function WizardStepper({
  steps,
  activeStep,
  completionPercent,
  onStepChange,
}: {
  steps: {
    label: string;
    description: string;
    complete: boolean;
    issueCount?: number;
    warningCount?: number;
  }[];
  activeStep: number;
  completionPercent: number;
  onStepChange: (step: number) => void;
}) {
  return (
    <section className="rounded-[1.35rem] border border-[#d8c08b]/56 bg-[#fff8ea]/74 p-3 shadow-[0_14px_36px_rgba(17,24,39,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-black text-[#17483f]">ثبت قرارداد جدید</p>
          <p className="mt-0.5 text-[11px] font-bold leading-5 text-[#7d6841]">
            فقط مرحله فعال باز است؛ برای کاهش شلوغی، جزئیات هر مرحله داخل همان بخش کنترل می‌شود.
          </p>
        </div>
        <span className="inline-flex shrink-0 rounded-full border border-[#17483f]/14 bg-white/70 px-3 py-1 text-[11px] font-black text-[#17483f]">
          پیشرفت {formatPersianNumber(completionPercent)}٪
        </span>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-5 md:overflow-visible md:pb-0">
        {steps.map((step, index) => {
          const active = index === activeStep;
          const issueCount = step.issueCount ?? 0;
          const warningCount = step.warningCount ?? 0;
          const hasIssue = issueCount > 0;
          const hasWarning = !hasIssue && warningCount > 0;
          return (
            <button
              key={step.label}
              type="button"
              onClick={() => onStepChange(index)}
              className={`min-h-11 w-28 shrink-0 rounded-2xl border px-2.5 py-2 text-right transition md:w-auto ${
                active
                  ? "border-[#111827] bg-[#111827] text-[#fff8ea] shadow-[0_12px_28px_rgba(17,24,39,0.16)]"
                  : step.complete
                    ? "border-[#25a46d]/22 bg-[#eafaf1] text-[#17483f] hover:border-[#25a46d]/40"
                    : "border-[#d8c08b]/56 bg-white/66 text-[#6d5f49] hover:border-[#c7a15a]/50"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-black">{step.label}</span>
                <span
                  className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                    active
                      ? "bg-[#f0dba9] text-[#111827]"
                      : step.complete
                        ? "bg-[#25a46d] text-white"
                        : hasIssue
                          ? "bg-[#b45353] text-white"
                          : hasWarning
                            ? "bg-[#f0dba9] text-[#111827]"
                            : "bg-[#fff8ea] text-[#7d6841]"
                  }`}
                >
                  {step.complete ? "✓" : formatPersianNumber(index + 1)}
                </span>
              </span>
              {hasIssue || hasWarning ? (
                <span
                  className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${
                    hasIssue ? "bg-[#fff1f1] text-[#8f2c2c]" : "bg-[#fff8ea] text-[#7d6841]"
                  }`}
                >
                  {hasIssue
                    ? `${formatPersianNumber(issueCount)} نقص`
                    : `${formatPersianNumber(warningCount)} هشدار`}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function WizardNavigation({
  activeStep,
  maxStep,
  onPrevious,
  onNext,
  canSubmit,
}: {
  activeStep: number;
  maxStep: number;
  onPrevious: () => void;
  onNext: () => void;
  canSubmit: boolean;
}) {
  return (
    <div className="hidden rounded-[1.5rem] border border-[#d8c08b]/56 bg-[#fff8ea]/70 p-3 xl:flex xl:items-center xl:justify-between xl:gap-2">
      <button
        type="button"
        onClick={onPrevious}
        disabled={activeStep === 0}
        className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#d8c08b]/62 bg-white/70 px-4 py-2 text-sm font-black text-[#7d6841] disabled:cursor-not-allowed disabled:opacity-45"
      >
        مرحله قبل
      </button>
      <span className="text-center text-xs font-black leading-6 text-[#7d6841]">
        {activeStep === maxStep
          ? canSubmit
            ? "همه موارد اصلی آماده ثبت است."
            : "چند مورد ضروری هنوز ناقص است."
          : `مرحله ${formatPersianNumber(activeStep + 1)} از ${formatPersianNumber(maxStep + 1)}`}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={activeStep === maxStep}
        className="btn-luxury-primary min-h-11 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-45"
      >
        ادامه
      </button>
    </div>
  );
}

function CustomerSummaryPanel({
  source,
  name,
  phone,
  nationalCode,
  address,
  complete,
}: {
  source: string;
  name: string;
  phone: string;
  nationalCode: string;
  address: string;
  complete: boolean;
}) {
  return (
    <div className="rounded-[1.45rem] border border-[#111827]/10 bg-[#111827] p-4 text-[#fff8ea] shadow-[0_18px_44px_rgba(17,24,39,0.18)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-[#f0dba9]">وضعیت مشتری</p>
          <h3 className="mt-1 text-lg font-black">
            {complete ? "آماده ادامه" : "نیازمند تکمیل"}
          </h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            complete ? "bg-[#25a46d] text-white" : "bg-[#f0dba9] text-[#111827]"
          }`}
        >
          {complete ? "تکمیل" : "ناقص"}
        </span>
      </div>
      <div className="mt-4 grid gap-2">
        <SummaryTextRow label="مسیر" value={source} />
        <SummaryTextRow label="نام" value={name} />
        <SummaryTextRow label="موبایل" value={phone} />
        <SummaryTextRow label="کد ملی" value={nationalCode} />
        <SummaryTextRow label="آدرس" value={address} />
      </div>
    </div>
  );
}

function SummaryTextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-xs font-bold text-[#d9caa9]">
      <span>{label}</span>
      <strong className="text-right text-[#fff9ed]">{value}</strong>
    </div>
  );
}

function ChecklistPill({
  label,
  done,
  optional,
}: {
  label: string;
  done: boolean;
  optional?: boolean;
}) {
  return (
    <span
      className={`inline-flex min-h-10 items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-xs font-black ${
        done
          ? "border-[#25a46d]/25 bg-[#eafaf1] text-[#17483f]"
          : optional
            ? "border-[#d8c08b]/52 bg-white/60 text-[#7d6841]"
            : "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]"
      }`}
    >
      {label}
      <span>{done ? "تکمیل" : optional ? "اختیاری" : "ناقص"}</span>
    </span>
  );
}

function EventReadinessPanel({
  date,
  time,
  eventType,
  guestCount,
  location,
  ready,
  statusLabel,
  message,
  conflicts,
}: {
  date: string;
  time: string;
  eventType: string;
  guestCount: string;
  location: string;
  ready: boolean;
  statusLabel: string;
  message: string;
  conflicts: ReservationAvailabilityConflict[];
}) {
  const hasConflict = conflicts.length > 0;

  return (
    <div
      className={`rounded-[1.45rem] border p-4 ${
        hasConflict
          ? "border-[#b45353]/30 bg-[#fff1f1]/82"
          : ready
            ? "border-[#25a46d]/24 bg-[#eafaf1]/82"
            : "border-[#d8c08b]/56 bg-[#fff8ea]/76"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-[#17483f]">خلاصه مراسم</p>
          <h3 className="mt-1 text-lg font-black text-[#111827]">
            {statusLabel}
          </h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            hasConflict
              ? "bg-[#b45353] text-white"
              : ready
                ? "bg-[#25a46d] text-white"
                : "bg-[#f0dba9] text-[#111827]"
          }`}
        >
          {hasConflict ? "تداخل" : ready ? "آزاد" : "کنترل"}
        </span>
      </div>
      <div className="mt-4 grid gap-2">
        <EventSummaryRow label="نوع مراسم" value={eventType} />
        <EventSummaryRow label="تاریخ" value={date} />
        <EventSummaryRow label="ساعت" value={time} />
        <EventSummaryRow label="مهمان" value={guestCount} />
        <EventSummaryRow label="محل" value={location} />
      </div>
      <p
        className={`mt-3 rounded-2xl border px-3 py-2 text-xs font-bold leading-6 ${
          hasConflict
            ? "border-[#b45353]/20 bg-white/62 text-[#8f2c2c]"
            : ready
              ? "border-[#25a46d]/16 bg-white/58 text-[#17483f]"
              : "border-[#17483f]/12 bg-[#17483f]/5 text-[#17483f]"
        }`}
      >
        {message}
      </p>
      {conflicts.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {conflicts.slice(0, 3).map((contract) => (
            <div
              key={contract.id}
              className="rounded-2xl border border-[#b45353]/18 bg-white/70 px-3 py-2 text-xs font-bold leading-6 text-[#8f2c2c]"
            >
              <strong className="block text-[#111827]">
                {contract.contractNo} · {contract.customerName}
              </strong>
              <span>
                {contract.eventStartTime && contract.eventEndTime
                  ? `${toPersianDigits(contract.eventStartTime)} تا ${toPersianDigits(contract.eventEndTime)}`
                  : "ساعت این قرارداد کامل نیست"}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EventSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#d8c08b]/46 bg-white/62 px-3 py-2 text-xs font-bold text-[#6d5f49]">
      <span>{label}</span>
      <strong className="text-right text-[#111827]">{value}</strong>
    </div>
  );
}

function MiniStatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#d8c08b]/52 bg-white/58 px-3 py-3">
      <p className="text-xs font-black text-[#7d6841]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#111827]">{value}</p>
    </div>
  );
}

function FinancialPreviewCard({
  label,
  value,
  strong,
  compact,
}: {
  label: string;
  value: number;
  strong?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`${compact ? "rounded-[1.1rem] px-3 py-2" : "rounded-2xl px-4 py-3"} border ${strong ? "border-[#17483f]/22 bg-[#17483f]/8" : "border-[#d8c08b]/52 bg-white/58"}`}
    >
      <p className="text-xs font-black text-[#7d6841]">{label}</p>
      <p className={`${compact ? "mt-1 text-base" : "mt-2 text-lg"} font-black text-[#111827]`}>
        {formatIRR(value)}
      </p>
    </div>
  );
}


function FinanceHealthBanner({
  label,
  description,
  tone,
  compact,
}: {
  label: string;
  description: string;
  tone: "success" | "warning" | "danger" | "neutral";
  compact?: boolean;
}) {
  const toneClass = {
    success: "border-[#25a46d]/25 bg-[#eafaf1] text-[#17483f]",
    warning: "border-[#c7a15a]/34 bg-[#fff8ea] text-[#7d6841]",
    danger: "border-[#b45353]/24 bg-[#fff1f1] text-[#8f2c2c]",
    neutral: "border-[#d8c08b]/56 bg-white/60 text-[#6d5f49]",
  }[tone];

  return (
    <div className={`${compact ? "mt-3 rounded-[1.15rem] px-3 py-2" : "mt-4 rounded-[1.35rem] px-4 py-3"} border ${toneClass}`}>
      <p className="text-sm font-black">{label}</p>
      <p className={`${compact ? "mt-0.5 leading-5" : "mt-1 leading-6"} text-xs font-bold`}>{description}</p>
    </div>
  );
}

function FinanceManualControlCard({
  label,
  mode,
  onModeChange,
  manualValue,
  onManualValueChange,
  inputName,
  autoValue,
  effectiveValue,
  strong,
  compact,
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
  compact?: boolean;
}) {
  return (
    <div
      className={`${compact ? "gap-1.5 rounded-[1.1rem] px-3 py-2" : "gap-2 rounded-2xl px-4 py-3"} grid border ${strong ? "border-[#17483f]/20 bg-[#17483f]/8" : "border-[#d8c08b]/50 bg-white/62"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-black text-[#172033]">{label}</span>
        <span className="text-sm font-black text-[#17483f]">
          {formatIRR(effectiveValue)}
        </span>
      </div>
      <label className={`${compact ? "min-h-9 rounded-xl px-3 py-1.5" : "min-h-10 rounded-2xl px-3 py-2"} flex cursor-pointer items-center justify-between gap-3 border border-[#d8c08b]/42 bg-[#fff8ea]/92 text-xs font-black text-[#7d6841]`}>
        <span>تنظیم دستی</span>
        <input
          type="checkbox"
          checked={mode === "MANUAL"}
          onChange={(event) =>
            onModeChange(event.target.checked ? "MANUAL" : "AUTO")
          }
          className="size-4 accent-[#c7a15a]"
        />
      </label>
      {mode === "MANUAL" ? (
        <div className="grid gap-2">
          <RialInput
            name={inputName}
            value={manualValue}
            onValueChange={onManualValueChange}
            inputClassName={compact ? "input-luxury min-h-9 py-1.5 text-sm" : "input-luxury min-h-10 py-2 text-sm"}
          />
          <p className={`${compact ? "rounded-xl px-3 py-1.5 leading-4" : "rounded-2xl px-3 py-2 leading-5"} border border-[#c7a15a]/28 bg-[#fff8ea] text-[11px] font-black text-[#7d6841]`}>
            مبلغ این بخش دستی تنظیم شده؛ مبلغ خودکار {formatIRR(autoValue)} است.
          </p>
        </div>
      ) : (
        <p className="text-[11px] font-bold leading-5 text-[#6d5f49]">
          محاسبه خودکار: {formatIRR(autoValue)}
        </p>
      )}
    </div>
  );
}

function ReviewAlert({
  tone,
  message,
}: {
  tone: "success" | "warning" | "danger";
  message: string;
}) {
  const toneClass = {
    success: "border-[#25a46d]/24 bg-[#eafaf1] text-[#17483f]",
    warning: "border-[#c7a15a]/32 bg-[#fff8ea] text-[#7d6841]",
    danger: "border-[#b45353]/24 bg-[#fff1f1] text-[#8f2c2c]",
  }[tone];

  return (
    <div
      className={`flex items-start gap-2 rounded-2xl border px-3 py-2 text-xs font-bold leading-6 ${toneClass}`}
    >
      <span className="mt-1 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-white/70 text-[10px] font-black">
        {tone === "success" ? "✓" : "!"}
      </span>
      <span>{message}</span>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
        <Icon size={17} />
      </span>
      <div className="min-w-0">
        <h2 className="text-base font-black text-[#111827] sm:text-lg">{title}</h2>
        <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49] sm:text-sm">
          {description}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid content-start gap-2 text-sm font-black text-[#172033] ${className}`}>
      <span className="leading-6">{label}</span>
      {children}
    </label>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <span className="rounded-xl border border-[#b45353]/18 bg-[#fff1f1] px-3 py-1.5 text-[11px] font-black leading-5 text-[#8f2c2c]">
      {message}
    </span>
  );
}

function TimeSelect({
  name,
  label,
  value,
  onChange,
  required,
  className = "",
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`grid content-start gap-2 text-sm font-black text-[#172033] ${className}`}>
      <span>{label}</span>
      <div className="relative">
        <Clock3
          size={17}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9f7131]"
        />
        <select
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          className="input-luxury w-full appearance-none pl-11"
        >
          <option value="">انتخاب ساعت</option>
          {timeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <span className="text-xs font-bold text-[#7d6841]">
        نمونه: ۱۸:۰۰
      </span>
    </label>
  );
}

function PackageSelector({
  packages,
  selectedPackageId,
  guestCountNumber,
  onSelect,
}: {
  packages: PackageOption[];
  selectedPackageId: string;
  guestCountNumber: number;
  onSelect: (packageId: string) => void;
}) {
  if (packages.length === 0) {
    return null;
  }

  const customSelected = selectedPackageId === "none";

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#d8c08b]/50 bg-white/56 px-3 py-2">
        <p className="text-sm font-black text-[#111827]">پکیج‌های آماده</p>
        <span className="inline-flex rounded-full border border-[#17483f]/14 bg-[#17483f]/5 px-3 py-1 text-[11px] font-black text-[#17483f]">
          {formatPersianNumber(packages.length)} پکیج فعال
        </span>
      </div>

      <div className="grid gap-2">
        <button
          type="button"
          onClick={() => onSelect("none")}
          className={`grid min-h-12 gap-2 rounded-2xl border px-3 py-2 text-right transition sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${
            customSelected
              ? "border-[#111827] bg-[#111827] text-[#fff8ea] shadow-[0_12px_28px_rgba(17,24,39,0.14)]"
              : "border-[#d8c08b]/56 bg-white/66 text-[#6d5f49] hover:border-[#c7a15a]/70 hover:bg-[#fff8ea]"
          }`}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full border ${
                customSelected
                  ? "border-[#c7a15a] bg-[#c7a15a] text-[#111827]"
                  : "border-[#d8c08b] bg-white text-[#7d6841]"
              }`}
            >
              {customSelected ? <Check size={15} /> : <PackagePlus size={14} />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black">قرارداد سفارشی</span>
              <span className={`mt-0.5 block truncate text-[11px] font-bold ${customSelected ? "text-[#d9caa9]" : "text-[#7d6841]"}`}>
                برای قرارداد توافقی بدون پکیج آماده
              </span>
            </span>
          </span>
          <span className={`w-fit rounded-full border px-2.5 py-1 text-[11px] font-black ${customSelected ? "border-[#c7a15a]/40 bg-[#c7a15a]/10 text-[#fff8ea]" : "border-[#17483f]/14 bg-[#17483f]/5 text-[#17483f]"}`}>
            سفارشی
          </span>
        </button>

        {packages.map((item) => {
          const selected = selectedPackageId === item.id;
          const estimatedTotal = item.pricePerGuest * Math.max(0, guestCountNumber);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`grid min-h-12 gap-2 rounded-2xl border px-3 py-2 text-right transition sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${
                selected
                  ? "border-[#17483f]/45 bg-[#eafaf1] shadow-[0_12px_28px_rgba(23,72,63,0.1)]"
                  : "border-[#d8c08b]/58 bg-white/66 hover:border-[#c7a15a]/70 hover:bg-[#fff8ea]"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full border ${
                    selected
                      ? "border-[#25a46d] bg-[#25a46d] text-white"
                      : "border-[#d8c08b] bg-white text-[#7d6841]"
                  }`}
                >
                  {selected ? <Check size={15} /> : <PackagePlus size={14} />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-[#111827]">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-bold text-[#6d5f49]">
                    {formatPersianNumber(item.serviceIds.length)} خدمت · {formatPersianNumber(item.menuIds.length)} منو · هر نفر {formatIRR(item.pricePerGuest)}
                  </span>
                </span>
              </span>
              <span className="w-fit rounded-full border border-[#17483f]/12 bg-[#17483f]/5 px-2.5 py-1 text-[11px] font-black text-[#17483f]">
                {formatIRR(estimatedTotal)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PackageCustomizationToggle({
  open,
  onToggle,
  servicesCount,
  menusCount,
}: {
  open: boolean;
  onToggle: () => void;
  servicesCount: number;
  menusCount: number;
}) {
  return (
    <div className="mt-4 rounded-3xl border border-[#d8c08b]/58 bg-white/60 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-black text-[#111827]">
ویرایش خدمات و منو
          </h3>
          <p className="mt-1 text-xs font-bold leading-6 text-[#7d6841]">
این پکیج {formatPersianNumber(servicesCount)} خدمت و{" "}
            {formatPersianNumber(menusCount)} آیتم منو دارد. فقط برای تغییر آیتم‌ها، این بخش را باز کنید.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={
            open
              ? "btn-luxury-secondary px-4 py-2"
              : "btn-luxury-primary px-4 py-2"
          }
        >
          {open ? "بستن ویرایش" : "ویرایش خدمات و منو"}
        </button>
      </div>
    </div>
  );
}

function PackageIncludedSummary({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  const visibleItems = items.slice(0, 4);
  const remainingCount = Math.max(0, items.length - visibleItems.length);

  return (
    <div className="rounded-2xl border border-[#d8c08b]/42 bg-white/55 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-black text-[#17483f]">{title}</span>
        <span className="rounded-full border border-[#17483f]/12 bg-[#17483f]/5 px-2 py-0.5 text-[11px] font-black text-[#17483f]">
          {formatPersianNumber(items.length)} مورد
        </span>
      </div>
      <p className="mt-2 text-xs leading-6">
        {visibleItems.length ? visibleItems.join("، ") : "ثبت نشده"}
        {remainingCount > 0 ? ` و ${formatPersianNumber(remainingCount)} مورد دیگر` : ""}
      </p>
    </div>
  );
}

function CustomAdditionsSection({
  items,
  onAdd,
  onChange,
  onRemove,
}: {
  items: ContractExtraLineDraft[];
  onAdd: (type: ContractExtraLineDraft["type"]) => void;
  onChange: (key: string, patch: Partial<ContractExtraLineDraft>) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <section className="card-luxury p-4 sm:p-5">
      <SectionTitle
        icon={CircleDollarSign}
        title="آیتم‌های اضافی و سفارشی"
        description="برای اقلام جانبی مثل نوشابه، اقلام خاص، خدمات اضافه یا هر توافق سفارشی، ردیف جداگانه ثبت کنید."
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onAdd("MENU")}
          className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-4 py-2 text-xs font-black text-[#7d6841]"
        >
          افزودن آیتم منو
        </button>
        <button
          type="button"
          onClick={() => onAdd("DRINK")}
          className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-4 py-2 text-xs font-black text-[#7d6841]"
        >
          افزودن نوشیدنی/اقلام جانبی
        </button>
        <button
          type="button"
          onClick={() => onAdd("SERVICE")}
          className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-4 py-2 text-xs font-black text-[#7d6841]"
        >
          افزودن خدمت سفارشی
        </button>
      </div>

      {items.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {items.map((item) => (
            <div
              key={item.key}
              className="grid gap-3 rounded-3xl border border-[#d8c08b]/56 bg-[#fff8ea]/64 p-3 md:grid-cols-[10rem_minmax(0,1fr)_12rem]"
            >
              <Field label="دسته">
                <select
                  value={item.type}
                  onChange={(event) =>
                    onChange(item.key, {
                      type: event.target
                        .value as ContractExtraLineDraft["type"],
                    })
                  }
                  className="input-luxury min-h-11 py-2 text-sm"
                >
                  <option value="MENU">منو</option>
                  <option value="DRINK">نوشیدنی</option>
                  <option value="DESSERT">دسر/مخلفات</option>
                  <option value="SERVICE">خدمات</option>
                </select>
              </Field>
              <Field label="نام آیتم">
                <input
                  value={item.name}
                  onChange={(event) =>
                    onChange(item.key, { name: event.target.value })
                  }
                  className="input-luxury min-h-11 py-2 text-sm"
                  placeholder="مثلاً نوشابه اضافه، نورپردازی ویژه، اقلام جانبی"
                />
              </Field>
              <RialInput
                label="مبلغ"
                value={item.amount}
                onValueChange={(value) => onChange(item.key, { amount: value })}
                inputClassName="input-luxury min-h-11 py-2 text-sm"
                className="text-xs font-black text-[#172033]"
              />
              <Field label="عنوان گروه">
                <input
                  value={item.category}
                  onChange={(event) =>
                    onChange(item.key, { category: event.target.value })
                  }
                  className="input-luxury min-h-11 py-2 text-sm"
                  placeholder="گروه نمایش در قرارداد"
                />
              </Field>
              <label className="grid gap-2 text-sm font-black text-[#172033] md:col-span-2">
                <span>توضیح</span>
                <textarea
                  value={item.note}
                  onChange={(event) =>
                    onChange(item.key, { note: event.target.value })
                  }
                  className="input-luxury min-h-20 resize-y py-2 text-sm"
                  placeholder="اختیاری؛ توضیح توافق یا دلیل آیتم اضافه"
                />
              </label>
              <button
                type="button"
                onClick={() => onRemove(item.key)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#b45353]/22 bg-[#fff1f1] px-3 py-2 text-xs font-black text-[#8f2c2c] md:col-span-3"
              >
                <Trash2 size={14} />
                حذف این آیتم اضافه
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-[#d8c08b]/42 bg-white/55 px-4 py-3 text-xs font-bold leading-6 text-[#7d6841]">
          هنوز آیتم سفارشی اضافه نشده است. در صورت نیاز، یک آیتم منو، نوشیدنی یا
          خدمت سفارشی اضافه کنید.
        </p>
      )}
    </section>
  );
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
    <div
      className={`rounded-2xl border px-3 py-3 ${isManual ? "border-[#2fa66f]/34 bg-[#eafaf1]" : "border-[#d8c08b]/58 bg-[#fff8ea]/72"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <strong className="text-sm font-black text-[#172033]">{title}</strong>
          <span className="text-xs font-bold leading-6 text-[#7d6841]">
            {description}
          </span>
        </div>
        <span className="rounded-full border border-[#d8c08b]/62 bg-white/74 px-3 py-1 text-xs font-black text-[#17483f]">
          جمع فعلی: {formatIRR(effectiveValue)}
        </span>
      </div>
      <label className="mt-3 flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[#c7a15a]/52 bg-white px-3 py-2 text-xs font-black text-[#172033] shadow-[0_10px_24px_rgba(23,32,51,0.055)]">
        <span>{checkboxLabel}</span>
        <input
          type="checkbox"
          checked={isManual}
          onChange={(event) =>
            onModeChange(event.target.checked ? "MANUAL" : "AUTO")
          }
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
            حالت دستی فعال است؛ جمع اتوماتیک {formatIRR(autoValue)} فقط برای
            به‌صورت راهنما نمایش داده می‌شود و جایگزین مبلغ دستی نیست.
          </p>
        </div>
      ) : (
        <p className="mt-3 rounded-2xl border border-[#d8c08b]/42 bg-white/58 px-3 py-2 text-xs font-bold leading-6 text-[#7d6841]">
          حالت فعلی خودکار است؛ مبلغ آیتم‌های انتخاب‌شده بر اساس
          تعداد و تعرفه حساب می‌کند.
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
    <div
      className={`grid gap-2 rounded-2xl border px-4 py-3 ${strong ? "border-[#f0dba9]/28 bg-[#f0dba9]/12" : "border-white/[0.08] bg-white/[0.05]"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold text-[#d9caa9]">{label}</span>
        <span className="text-sm font-black text-[#fff9ed]">
          {formatIRR(effectiveValue)}
        </span>
      </div>
      <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-bold text-[#d9caa9]">
        <span>تنظیم دستی</span>
        <input
          type="checkbox"
          checked={mode === "MANUAL"}
          onChange={(event) =>
            onModeChange(event.target.checked ? "MANUAL" : "AUTO")
          }
          className="size-4 accent-[#d8b15d]"
        />
      </label>
      {mode === "MANUAL" ? (
        <div className="grid gap-2">
          <RialInput
            name={inputName}
            value={manualValue}
            onValueChange={onManualValueChange}
            inputClassName="input-luxury min-h-10 py-2 text-sm"
          />
          <p className="rounded-2xl border border-[#ffd37a]/28 bg-[#f0dba9]/12 px-3 py-2 text-[11px] font-black leading-5 text-[#ffe8ad]">
            جمع این بخش دستی است؛ تا وقتی دستی غیرفعال نشود، سیستم جمع اتوماتیک{" "}
            {formatIRR(autoValue)} را جایگزین نمی‌کند.
          </p>
        </div>
      ) : (
        <p className="text-[11px] font-bold leading-5 text-[#d8c08b]">
          محاسبه خودکار: {formatIRR(autoValue)}
        </p>
      )}
    </div>
  );
}

function CatalogSection({
  title,
  description,
  missingPriceMessage,
  manualPricingMode,
  manualPricingNotice,
  categoryTotalControl,
  groups,
  drafts,
  guestCountNumber,
  searchValue,
  onSearchChange,
  includedItemIds,
  emptyLabel,
  onToggle,
  onChange,
}: {
  title: string;
  description: string;
  missingPriceMessage: string;
  manualPricingMode: boolean;
  manualPricingNotice: string;
  categoryTotalControl: ReactNode;
  groups: Record<string, SelectOption[]>;
  drafts: Record<string, ItemDraft>;
  guestCountNumber: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  includedItemIds: Set<string>;
  emptyLabel: string;
  onToggle: (item: SelectOption) => void;
  onChange: (id: string, patch: Partial<ItemDraft>) => void;
}) {
  const entries = Object.entries(groups);
  const searchIsActive = searchValue.trim().length > 0;
  const selectedCount = Object.values(drafts).filter((draft) => draft.selected).length;
  const totalVisibleCount = entries.reduce((total, [, items]) => total + items.length, 0);

  return (
    <section className="card-luxury p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <SectionTitle icon={ChevronDown} title={title} description={description} />
        <div className="flex flex-wrap gap-2 text-[11px] font-black">
          <span className="rounded-full border border-[#17483f]/14 bg-[#17483f]/5 px-3 py-1 text-[#17483f]">
            {formatPersianNumber(selectedCount)} انتخاب شده
          </span>
          <span className="rounded-full border border-[#d8c08b]/54 bg-white/62 px-3 py-1 text-[#7d6841]">
            {formatPersianNumber(totalVisibleCount)} مورد در فهرست
          </span>
        </div>
      </div>

      <details
        open={manualPricingMode}
        className="mt-3 rounded-2xl border border-[#d8c08b]/50 bg-white/58 p-2"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-xs font-black text-[#17483f] [&::-webkit-details-marker]:hidden">
          <span>تنظیم مبلغ دستی این بخش</span>
          <span className="rounded-full border border-[#d8c08b]/54 bg-[#fff8ea] px-2 py-0.5 text-[10px] text-[#7d6841]">
            {manualPricingMode ? "فعال" : "اختیاری"}
          </span>
        </summary>
        <div className="mt-2">{categoryTotalControl}</div>
      </details>
      {manualPricingMode ? (
        <InlineWarning className="mt-3">{manualPricingNotice}</InlineWarning>
      ) : null}

      <div className="mt-3 rounded-2xl border border-[#d8c08b]/50 bg-white/58 p-3">
        <label className="grid gap-2 text-xs font-black text-[#172033]">
          <span>جستجو در {title}</span>
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9f7131]"
            />
            <input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              className="input-luxury w-full pl-11"
              placeholder="نام آیتم یا دسته را جستجو کنید"
            />
          </div>
        </label>
      </div>

      {selectedCount > 0 ? (
        <div className="mt-3 rounded-2xl border border-[#25a46d]/18 bg-[#eafaf1]/70 px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-black text-[#17483f]">
                انتخاب‌های فعال این بخش
              </p>
              <p className="mt-1 text-xs font-bold leading-6 text-[#17483f]/80">
                انتخاب‌ها فعال‌اند؛ برای ویرایش، دسته موردنظر را باز کنید.
              </p>
            </div>
            <span className="rounded-full border border-[#25a46d]/20 bg-white/72 px-3 py-1 text-xs font-black text-[#17483f]">
              {formatPersianNumber(selectedCount)} مورد
            </span>
          </div>
        </div>
      ) : null}

      <div className="mt-3 grid gap-2">
        {entries.length > 0 ? (
          entries.map(([category, items]) => {
            const selectedItems = items.filter((item) => drafts[item.id]?.selected);
            const hasSelectedItem = selectedItems.length > 0;
            const shouldOpen = searchIsActive;

            return (
              <details
                key={category}
                className="group rounded-2xl border border-[#d8c08b]/58 bg-[#fff8ea]/64 p-2"
                open={shouldOpen}
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 rounded-xl border border-[#d8c08b]/42 bg-white/60 px-3 py-2 text-sm font-black text-[#17483f] transition hover:border-[#c7a15a]/62">
                  <span className="flex min-w-0 flex-col gap-1">
                    <span>{category}</span>
                    <span className="text-[11px] font-bold text-[#7d6841]">
                      {formatPersianNumber(items.length)} مورد در این دسته
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-[11px] font-black">
                    {hasSelectedItem ? (
                      <span className="rounded-full border border-[#25a46d]/22 bg-[#eafaf1] px-2.5 py-1 text-[#17483f]">
                        {formatPersianNumber(selectedItems.length)} انتخاب شده
                      </span>
                    ) : null}
                    <span className="rounded-full border border-[#d8c08b]/52 bg-[#fff8ea] px-2.5 py-1 text-[#7d6841]">
                      باز
                    </span>
                  </span>
                </summary>

                <div className="mt-3 grid gap-2">
                  {items.map((item) => {
                    const draft = drafts[item.id];
                    const selected = Boolean(draft?.selected);
                    const unitPrice = manualPricingMode
                      ? 0
                      : getEffectiveUnitPrice(item, draft);
                    const totalPrice = manualPricingMode
                      ? 0
                      : calculateItemTotal(item, draft, guestCountNumber);
                    const needsPrice =
                      selected &&
                      !manualPricingMode &&
                      unitPrice <= 0 &&
                      item.pricingType !== "CUSTOM";

                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl border transition ${
                          selected
                            ? "border-[#25a46d]/34 bg-[#ecfff5]"
                            : "border-[#d8c08b]/46 bg-white/[0.62]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onToggle(item)}
                          className="grid w-full gap-2 px-3 py-2 text-right md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                        >
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-black text-[#111827]">
                                {item.title}
                              </span>
                              {includedItemIds.has(item.id) ? (
                                <span className="rounded-full border border-[#25a46d]/24 bg-[#eafaf1] px-2.5 py-1 text-[11px] font-black text-[#17483f]">
                                  داخل پکیج
                                </span>
                              ) : null}
                              <span className="rounded-full border border-[#c7a15a]/30 bg-[#c7a15a]/10 px-2.5 py-1 text-[11px] font-black text-[#7d6841]">
                                {pricingTypeLabels[item.pricingType]}
                              </span>
                            </span>
                            <span className="mt-1 block text-[11px] font-bold leading-5 text-[#6d5f49]">
                              {getFormulaPreview(
                                item,
                                draft,
                                guestCountNumber,
                                manualPricingMode,
                              )}
                            </span>
                          </span>

                          <span className="flex items-center justify-between gap-3 md:justify-end">
                            <span className="text-xs font-black text-[#17483f]">
                              {selected ? formatIRR(totalPrice) : "انتخاب"}
                            </span>
                            <span
                              className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${
                                selected
                                  ? "border-[#25a46d] bg-[#25a46d] text-white"
                                  : "border-[#d8c08b] bg-white text-[#7d6841]"
                              }`}
                            >
                              {selected ? <Check size={13} /> : "+"}
                            </span>
                          </span>
                        </button>

                        {selected ? (
                          <div className="grid gap-3 border-t border-[#25a46d]/16 bg-white/58 px-3 py-3">
                            {needsPrice ? (
                              <InlineWarning>{missingPriceMessage}</InlineWarning>
                            ) : null}

                            <PricingControls
                              item={item}
                              draft={draft}
                              guestCountNumber={guestCountNumber}
                              manualPricingLocked={manualPricingMode}
                              onChange={(patch) =>
                                onChange(item.id, { ...patch, selected: true })
                              }
                            />

                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#d8c08b]/52 bg-[#fff8ea]/74 px-3 py-2">
                              <span className="text-xs font-black text-[#7d6841]">
                                جمع این مورد
                              </span>
                              <span className="text-sm font-black text-[#17483f]">
                                {formatIRR(totalPrice)}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => onToggle(item)}
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#b45353]/22 bg-[#fff1f1] px-3 py-2 text-xs font-black text-[#8f2c2c]"
                            >
                              <Trash2 size={14} />
                              حذف از انتخاب‌ها
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })
        ) : (
          <CatalogEmptyState
            title={emptyLabel}
            description="عبارت جستجو را کوتاه‌تر کنید یا از دسته‌های دیگر آیتم انتخاب کنید."
            actionLabel="پاک کردن جستجو"
            onAction={() => onSearchChange("")}
          />
        )}
      </div>
    </section>
  );
}

function CatalogEmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[#d8c08b]/62 bg-white/60 p-4 text-center sm:p-5">
      <p className="text-sm font-black text-[#111827]">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-xs font-bold leading-6 text-[#7d6841]">
        {description}
      </p>
      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 inline-flex min-h-10 items-center justify-center rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea] px-4 py-2 text-xs font-black text-[#17483f] transition hover:border-[#c7a15a]"
        >
          {actionLabel}
        </button>
      ) : (
        <span className="mt-3 inline-flex min-h-10 items-center justify-center rounded-2xl border border-[#d8c08b]/54 bg-[#fff8ea]/80 px-4 py-2 text-xs font-black text-[#7d6841]">
          {actionLabel}
        </span>
      )}
    </div>
  );
}

function MobileContractActionBar({
  activeStep,
  maxStep,
  finalTotal,
  remaining,
  canSubmit,
  isPending,
  onPrevious,
  onNext,
}: {
  activeStep: number;
  maxStep: number;
  finalTotal: number;
  remaining: number;
  canSubmit: boolean;
  isPending: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const finalStep = activeStep === maxStep;
  const nextLabel = finalStep
    ? isPending
      ? "در حال ثبت..."
      : "ثبت نهایی"
    : activeStep === maxStep - 1
      ? "بررسی نهایی"
      : "ادامه";

  return (
    <div className="fixed inset-x-2 bottom-2 z-40 rounded-[1.25rem] border border-[#f0dba9]/24 bg-[#111827]/96 p-2.5 text-[#fff8ea] shadow-[0_24px_80px_rgba(0,0,0,0.36)] backdrop-blur xl:hidden">
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2 text-[11px] font-black text-[#f0dba9]">
          <span>
            مرحله {formatPersianNumber(activeStep + 1)} از {formatPersianNumber(maxStep + 1)}
          </span>
          <span className="truncate rounded-full border border-[#f0dba9]/18 bg-[#f0dba9]/10 px-2 py-1 text-[#fff1c5]">
            مانده: {formatIRR(remaining)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevious}
            disabled={activeStep === 0}
            className="inline-flex min-h-11 w-20 shrink-0 items-center justify-center rounded-2xl border border-[#f0dba9]/22 bg-white/8 px-3 py-2 text-xs font-black text-[#ffe8ad] disabled:cursor-not-allowed disabled:opacity-35"
          >
            قبل
          </button>
          <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/7 px-3 py-2">
            <p className="truncate text-[11px] font-black text-[#d8c08b]">
              مبلغ نهایی
            </p>
            <p className="truncate text-xs font-black text-[#fff8ea]">
              {formatIRR(finalTotal)}
            </p>
          </div>
          <button
            type={finalStep ? "submit" : "button"}
            onClick={finalStep ? undefined : onNext}
            disabled={finalStep ? isPending || !canSubmit : false}
            className="inline-flex min-h-11 min-w-28 shrink-0 items-center justify-center rounded-2xl bg-[#f0dba9] px-4 py-2 text-xs font-black text-[#111827] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PricingControls({
  item,
  draft,
  guestCountNumber,
  manualPricingLocked,
  onChange,
}: {
  item: SelectOption;
  draft: ItemDraft | undefined;
  guestCountNumber: number;
  manualPricingLocked: boolean;
  onChange: (patch: Partial<ItemDraft>) => void;
}) {
  return (
    <div className="grid gap-3">
      {item.pricingType === "PER_ITEM" ? (
        <CompactInput
          label={`تعداد ${item.unitLabel || "مورد"}`}
          value={draft?.quantity ?? "1"}
          onChange={(value) => onChange({ quantity: value })}
        />
      ) : null}

      {item.pricingType === "PER_HOUR" ? (
        <CompactInput
          label="تعداد ساعت"
          value={draft?.quantity ?? "1"}
          onChange={(value) => onChange({ quantity: value })}
        />
      ) : null}

      {item.pricingType === "PER_GUEST" ? (
        <div className="rounded-2xl border border-[#d8c08b]/52 bg-[#fff8ea]/72 px-3 py-2 text-xs font-bold leading-6 text-[#6d5f49]">
          مبنای محاسبه این آیتم تعداد مهمان‌ها است:{" "}
          {formatPersianNumber(guestCountNumber)} نفر
        </div>
      ) : null}

      {manualPricingLocked ? (
        <div className="rounded-2xl border border-[#c7a15a]/32 bg-[#fff8ea] px-3 py-2 text-xs font-black leading-6 text-[#7d6841]">
          چون جمع این بخش دستی است، برای این ردیف هیچ فیلد قیمت نمایش داده
          نمی‌شود؛ مبلغ ردیف در ذخیره‌سازی صفر می‌شود و فقط نام آیتم در قرارداد
          می‌ماند.
        </div>
      ) : item.pricingType === "CUSTOM" ? (
        <CompactInput
          label="مبلغ توافقی"
          value={draft?.unitPrice ?? "0"}
          onChange={(value) => onChange({ unitPrice: value })}
        />
      ) : item.allowPriceOverride ? (
        <CompactInput
          label={
            item.pricingType === "FIXED"
              ? "مبلغ ثابت قابل تغییر"
              : "قیمت واحد قابل تغییر"
          }
          value={draft?.unitPrice ?? String(getCatalogPrice(item))}
          onChange={(value) => onChange({ unitPrice: value })}
        />
      ) : (
        <div className="rounded-2xl border border-[#d8c08b]/52 bg-[#fff8ea]/72 px-3 py-2 text-xs font-bold leading-6 text-[#6d5f49]">
          قیمت از تعاریف پایه خوانده شده و برای این آیتم قابل تغییر نیست.
        </div>
      )}

      {!manualPricingLocked &&
      (item.pricingType === "CUSTOM" || item.allowPriceOverride) ? (
        <label className="grid gap-2 text-xs font-black text-[#172033]">
          <span>یادداشت قرارداد</span>
          <textarea
            value={draft?.note ?? ""}
            onChange={(event) => onChange({ note: event.target.value })}
            className="input-luxury min-h-20 resize-y py-2 text-sm"
            placeholder="اختیاری؛ توضیح توافق یا دلیل تغییر قیمت"
          />
        </label>
      ) : null}
    </div>
  );
}

function CompactInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <RialInput
      label={label}
      value={value}
      onValueChange={onChange}
      inputClassName="input-luxury min-h-10 py-2 text-sm"
      className="text-xs font-black text-[#172033]"
    />
  );
}

function InlineWarning({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-start gap-2 rounded-2xl border border-[#c7a15a]/32 bg-[#fff8ea] px-3 py-2 text-xs font-bold leading-6 text-[#7d6841] ${className}`}
    >
      <AlertCircle className="mt-1 shrink-0" size={15} />
      <span>{children}</span>
    </div>
  );
}

function WarningBox({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-2xl border border-[#ffd37a]/28 bg-[#f0dba9]/12 px-4 py-3 text-sm font-bold leading-7 text-[#ffe8ad]">
      <AlertCircle className="mt-1 shrink-0" size={17} />
      <span>{children}</span>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
        strong
          ? "border-[#f0dba9]/28 bg-[#f0dba9]/12"
          : "border-white/[0.08] bg-white/[0.05]"
      }`}
    >
      <span className="text-sm font-bold text-[#d9caa9]">{label}</span>
      <span className="text-sm font-black text-[#fff9ed]">
        {formatIRR(value)}
      </span>
    </div>
  );
}
