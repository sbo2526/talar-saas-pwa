import type { Prisma } from "@prisma/client";
import type { ReactNode } from "react";
import { PrintLogoMark } from "@/components/dashboard/contracts/print-logo-mark";
import {
  formatContractTime,
  getLineItemGroupKey,
  getPaidAmount,
  lineItemTypeLabels,
  toNumber,
} from "@/lib/contracts/display";
import {
  formatJalaliDate,
  formatJalaliWeekday,
  toPersianDigits,
} from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import {
  CONTRACT_CANCELLATION_EXPLANATION,
  CONTRACT_HALL_TERMS,
} from "@/lib/contracts/print-terms";
import { formatHallContactPhones } from "@/lib/notifications/support-contact";

const PERSIAN_TERM_NUMBERS = [
  "۱",
  "۲",
  "۳",
  "۴",
  "۵",
  "۶",
  "۷",
  "۸",
  "۹",
  "۱۰",
] as const;

type ContractForPrint = Prisma.ContractGetPayload<{
  include: {
    customer: true;
    hall: {
      select: {
        name: true;
        address: true;
        city: true;
        phone: true;
        managerName: true;
      };
    };
    salon: { select: { name: true; capacity: true; floor: true } };
    lineItems: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] };
    payments: {
      select: {
        amount: true;
        type: true;
        status: true;
        paidAt: true;
      };
    };
  };
}>;

type ContractPrintSettings = {
  defaultClauses: string | null;
  paymentTerms: string | null;
  cancellationPolicy: string | null;
  footerNote: string | null;
  customerSignatureLabel: string;
  managerSignatureLabel: string;
  printTemplateName: string | null;
  showLogoOnPrint: boolean;
  showLicenseInfoOnPrint: boolean;
} | null;

type HallProfileForPrint = {
  brandName: string | null;
  legalName: string | null;
  managerName: string | null;
  licenseNumber: string | null;
  province: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  mobile: string | null;
  website: string | null;
  hallLogoUrl: string | null;
} | null;

type TenantForPrint = {
  name: string;
};

export function ContractPrintDocument({
  contract,
  settings,
  hallProfile,
  tenant,
}: {
  contract: ContractForPrint;
  settings: ContractPrintSettings;
  hallProfile: HallProfileForPrint;
  tenant: TenantForPrint;
}) {
  const hallName =
    hallProfile?.brandName ||
    hallProfile?.legalName ||
    contract.hall?.name ||
    tenant.name;
  const legalHallName = hallProfile?.legalName || hallName;
  const hallAddress = formatAddress([
    hallProfile?.province,
    hallProfile?.city || contract.hall?.city,
    hallProfile?.address || contract.hall?.address,
  ]);
  const printableHallAddress = compactText(hallAddress, 120);
  const hallPhones = getPrintablePhoneNumbers([
    hallProfile?.phone,
    hallProfile?.mobile,
    contract.hall?.phone,
  ]);
  const hallPhone = toPersianDigits(formatHallContactPhones(hallPhones));
  const managerName =
    hallProfile?.managerName || contract.hall?.managerName || "مدیریت تالار";
  const customerNationalCode =
    contract.customer.nationalCode || contract.customer.nationalId;
  const customerSalutation = contract.customer.salutation || "جناب/سرکار";
  const printableCustomerName = buildPrintableCustomerName(
    customerSalutation,
    contract.customer.fullName,
  );
  const eventDateDisplay = formatEventDateWithWeekday(contract.eventDate);
  const eventSlogan = getEventSlogan(contract.eventTypeName);
  const printableCustomerAddress = compactText(contract.customer.address, 105);
  const paidAmount = getPaidAmount(contract.payments, contract.depositAmount);
  const remainingAmount = contract.status === "CANCELED" ? 0 : toNumber(contract.remainingAmount);
  const packageItems = contract.lineItems.filter(
    (item) => item.type === "PACKAGE",
  );
  const serviceItems = contract.lineItems.filter(
    (item) => item.type === "SERVICE",
  );
  const menuItems = contract.lineItems.filter(
    (item) => item.type !== "SERVICE" && item.type !== "PACKAGE",
  );
  const menuGroups = groupLineItems(menuItems);
  const monogram = buildMonogram(hallName);
  const showIdentityMark = settings?.showLogoOnPrint ?? true;
  return (
    <>
      <article className="print-contract-page" dir="rtl">
        {showIdentityMark ? (
          <div className="print-contract-watermark" aria-hidden="true">
            {monogram}
          </div>
        ) : null}

        <header className="print-contract-header">
          <div className="print-brand-block">
            {showIdentityMark ? (
              <PrintLogoMark logoUrl={hallProfile?.hallLogoUrl} monogram={monogram} />
            ) : null}
            <div>
              <p className="print-hall-name">{hallName}</p>
              <p className="print-slogan">{eventSlogan}</p>
            </div>
          </div>

          <div className="print-title-block">
            <p>بسمه تعالی</p>
            <h1>قرارداد برگزاری مراسم</h1>

          </div>

          <dl className="print-meta-box">
            <div>
              <dt>شماره قرارداد</dt>
              <dd>{toPersianDigits(contract.contractNo)}</dd>
            </div>
            <div>
              <dt>تاریخ تنظیم</dt>
              <dd>{formatJalaliDate(contract.createdAt)}</dd>
            </div>
            <div>
              <dt>تاریخ چاپ</dt>
              <dd>{formatJalaliDate(new Date())}</dd>
            </div>
          </dl>
        </header>

        <PrintSection
          title="مشخصات طرفین قرارداد"
          className="print-parties-section"
        >
          <p className="print-party-text">
            این قرارداد فی‌مابین <strong>{legalHallName}</strong> و میزبان مراسم
            با مشخصات زیر تنظیم می‌شود.
          </p>
          <div className="print-info-grid print-info-grid-5">
            <InfoCell
              label="نام مشتری"
              value={printableCustomerName}
            />
            <InfoCell
              label="شماره همراه"
              value={toPersianDigits(contract.customer.phone)}
            />
            <InfoCell
              label="کد ملی"
              value={
                customerNationalCode
                  ? toPersianDigits(customerNationalCode)
                  : ""
              }
            />
            <InfoCell label="نشانی" value={printableCustomerAddress} wide />
            <InfoCell
              label="تاریخ تنظیم"
              value={formatJalaliDate(contract.createdAt)}
            />
          </div>
        </PrintSection>

        <div className="print-two-column print-summary-grid">
          <PrintSection title="اطلاعات مراسم">
            <div className="print-table-wrap">
              <table className="print-contract-table">
                <tbody>
                  <TableRow label="نوع مراسم" value={contract.eventTypeName} />
                  <TableRow
                    label="تاریخ و روز مراسم"
                    value={eventDateDisplay}
                    className="print-event-date-row"
                  />
                  <TableRow
                    label="ساعت مراسم"
                    value={formatEventTimeRange(
                      contract.eventStartTime,
                      contract.eventEndTime,
                    )}
                  />
                  <TableRow
                    label="تعداد مهمان"
                    value={`${formatPersianNumber(contract.guestCount)} نفر`}
                  />
                  <TableRow label="تالار" value={contract.hall?.name} />
                  <TableRow label="سالن" value={contract.salon?.name} />
                </tbody>
              </table>
            </div>
          </PrintSection>

          <PrintSection title="جمع‌بندی مالی قرارداد">
            <div className="print-table-wrap">
              <table className="print-contract-table print-finance-table">
                <tbody>
                  {packageItems.length > 0 ? (
                    <TableRow
                      label={
                        contract.packageTotalManual
                          ? "جمع پکیج (دستی)"
                          : "جمع پکیج"
                      }
                      value={formatIRR(
                        toNumber(contract.packageTotal) ||
                          sumLineItems(packageItems),
                      )}
                    />
                  ) : null}
                  <TableRow
                    label={
                      contract.servicesTotalManual
                        ? "جمع خدمات (دستی)"
                        : "جمع خدمات"
                    }
                    value={formatIRR(
                      toNumber(contract.servicesTotal) ||
                        sumLineItems(serviceItems),
                    )}
                  />
                  <TableRow
                    label={
                      contract.menuTotalManual ? "جمع منو (دستی)" : "جمع منو"
                    }
                    value={formatIRR(
                      toNumber(contract.menuTotal) || sumLineItems(menuItems),
                    )}
                  />
                  <TableRow
                    label="تخفیف"
                    value={formatIRR(toNumber(contract.discountAmount))}
                  />
                  <TableRow
                    label={
                      contract.finalTotalManual
                        ? "مبلغ نهایی قرارداد (دستی)"
                        : "مبلغ نهایی قرارداد"
                    }
                    value={formatIRR(toNumber(contract.finalTotal))}
                    strong
                  />
                  <TableRow
                    label="بیعانه"
                    value={formatIRR(toNumber(contract.depositAmount))}
                  />
                  <TableRow label="دریافت‌شده" value={formatIRR(paidAmount)} />
                  <TableRow
                    label={
                      contract.status === "CANCELED"
                        ? "مانده (قرارداد بسته‌شده)"
                        : contract.remainingAmountManual
                          ? "مانده (دستی)"
                          : "مانده"
                    }
                    value={formatIRR(remainingAmount)}
                    strong
                  />
                </tbody>
              </table>
            </div>
          </PrintSection>
        </div>

        <PrintSection title="پکیج، خدمات و منوی انتخابی">
          {packageItems.length > 0 ? (
            <div className="print-list-box print-package-box">
              <h3>پکیج اختصاصی مراسم</h3>
              <CompactLineItems
                items={packageItems}
                emptyText="پکیجی برای این قرارداد ثبت نشده است."
              />
              {packageItems[0]?.note ? (
                <p className="print-muted print-package-note">
                  {packageItems[0].note}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="print-service-grid">
            <div className="print-list-box">
              <h3>خدمات انتخابی</h3>
              <CompactLineItems
                items={serviceItems}
                emptyText="خدمتی برای این قرارداد ثبت نشده است."
              />
            </div>
            <div className="print-list-box">
              <h3>منوی پذیرایی</h3>
              {Object.keys(menuGroups).length > 0 ? (
                <div className="print-menu-groups">
                  {Object.entries(menuGroups)
                    .slice(0, 3)
                    .map(([group, items]) => (
                      <p key={group}>
                        <strong>
                          {
                            lineItemTypeLabels[
                              group as keyof typeof lineItemTypeLabels
                            ]
                          }
                          :
                        </strong>{" "}
                        {summarizeLineItems(items, 5)}
                      </p>
                    ))}
                  {Object.keys(menuGroups).length > 3 ? (
                    <p className="print-muted">
                      +{formatPersianNumber(Object.keys(menuGroups).length - 3)}{" "}
                      گروه پذیرایی دیگر
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="print-muted">
                  آیتم پذیرایی برای این قرارداد ثبت نشده است.
                </p>
              )}
            </div>
          </div>
        </PrintSection>

        <PrintSection
          title="شروط و تعهدات تالار"
          compact
          className="print-terms-section"
        >
          <div className="print-cancellation-note">
            <strong>شرایط کنسلی و انصراف:</strong>
            <span>{CONTRACT_CANCELLATION_EXPLANATION}</span>
          </div>
          <div className="print-terms-list">
            {CONTRACT_HALL_TERMS.map((term, index) => (
              <p key={term}>
                <span>{PERSIAN_TERM_NUMBERS[index]}.</span>
                {term}
              </p>
            ))}
          </div>
        </PrintSection>

        <p className="print-acceptance">
          اینجانب میزبان و صاحب مجلس، مفاد قرارداد و شرایط فوق را مطالعه کرده و
          با علم و رضایت، اجرای مراسم یادشده را در قبال دریافت مبلغ نهایی
          قرارداد تأیید می‌نمایم.
        </p>

        <section className="print-signatures" aria-label="امضاها">
          <SignatureLine
            label={
              settings?.customerSignatureLabel || "امضای میزبان / صاحب مجلس"
            }
            name={printableCustomerName}
          />
          <SignatureLine label="جای مهر تالار" name={hallName} seal />
          <SignatureLine
            label={settings?.managerSignatureLabel || "امضای مدیریت تالار"}
            name={managerName}
          />
        </section>

        <footer className="print-contract-footer">
          <span>
            نشانی: {printableHallAddress || "اطلاعات تالار ثبت نشده است."}
          </span>
          <span>تلفن: {hallPhone || "ثبت نشده"}</span>
          {settings?.showLicenseInfoOnPrint && hallProfile?.licenseNumber ? (
            <span>
              شماره مجوز: {toPersianDigits(hallProfile.licenseNumber)}
            </span>
          ) : null}
          {hallProfile?.website ? <span>{hallProfile.website}</span> : null}
        </footer>
      </article>
    </>
  );
}

function buildPrintableCustomerName(salutation: string, fullName: string) {
  const normalizedName = fullName.replace(/\s+/g, " ").trim();
  const normalizedSalutation = salutation.replace(/\s+/g, " ").trim();
  const hasTitle = /^(آقا|آقای|خانم|سرکار|جناب)\b/.test(normalizedName);

  if (!normalizedName) {
    return "ثبت نشده";
  }

  if (!normalizedSalutation || normalizedSalutation === "جناب/سرکار" || hasTitle) {
    return normalizedName;
  }

  const printableTitle = normalizedSalutation === "آقا" ? "آقای" : normalizedSalutation;
  return `${printableTitle} ${normalizedName}`;
}

function formatEventDateWithWeekday(date: Date | string) {
  const weekday = formatJalaliWeekday(date);
  const formattedDate = formatJalaliDate(date);

  return weekday && weekday !== "ثبت نشده"
    ? `${weekday}، ${formattedDate}`
    : formattedDate;
}

function getEventSlogan(eventType: string | null | undefined) {
  const normalized = (eventType ?? "").replace(/\s+/g, " ").trim();
  const lower = normalized.toLowerCase();

  const funeralKeywords = [
    "ترحیم",
    "ختم",
    "فوت",
    "درگذشت",
    "یادبود",
    "سوم",
    "هفتم",
    "چهلم",
    "سالگرد فوت",
  ];
  const birthdayKeywords = ["تولد", "زادروز", "جشن تولد"];
  const anniversaryKeywords = ["سالگرد ازدواج", "سالگرد عقد", "سالگرد پیوند"];
  const weddingKeywords = ["عروسی", "عقد", "نامزدی", "حنابندان", "بله برون"];
  const officialKeywords = ["همایش", "جلسه", "سمینار", "گردهمایی", "مراسم رسمی"];

  if (funeralKeywords.some((keyword) => lower.includes(keyword))) {
    return pickDeterministicSlogan(normalized, [
      "یاد و نام عزیز سفرکرده گرامی باد",
      "با آرزوی صبر و آرامش برای بازماندگان",
      "روح آن عزیز قرین رحمت الهی باد",
    ]);
  }

  if (birthdayKeywords.some((keyword) => lower.includes(keyword))) {
    return pickDeterministicSlogan(normalized, [
      "زادروزتان مبارک و روزگارتان سرشار از شادی",
      "لحظه‌های شاد شما ماندگار باد",
      "آرزومند شادی و تندرستی شما هستیم",
    ]);
  }

  if (anniversaryKeywords.some((keyword) => lower.includes(keyword))) {
    return pickDeterministicSlogan(normalized, [
      "سالگرد پیوندتان مبارک و پایدار",
      "عشق و همراهی‌تان همیشگی باد",
      "آرزومند سال‌هایی سرشار از مهر و آرامش هستیم",
    ]);
  }

  if (weddingKeywords.some((keyword) => lower.includes(keyword))) {
    return pickDeterministicSlogan(normalized, [
      "سعادت و نیک‌بختی شما آرزوی ماست",
      "آغاز زندگی مشترک‌تان مبارک",
      "شادی امروزتان ماندگار باد",
    ]);
  }

  if (officialKeywords.some((keyword) => lower.includes(keyword))) {
    return pickDeterministicSlogan(normalized, [
      "برگزاری منظم و شایسته مراسم شما افتخار ماست",
      "با آرزوی برگزاری موفق مراسم",
      "همراه شما در برگزاری دقیق و شایسته مراسم",
    ]);
  }

  return "برگزاری شایسته مراسم شما افتخار ماست";
}

function pickDeterministicSlogan(seed: string, slogans: string[]) {
  const index = Array.from(seed || slogans[0]).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  ) % slogans.length;

  return slogans[index] ?? slogans[0];
}

function getPrintablePhoneNumbers(values: Array<string | null | undefined>) {
  const numbers = values.flatMap((value) =>
    value
      ? value
          .split(/[\r\n،,;؛/|]+/g)
          .map((part) => part.trim().replace(/[\s-]/g, ""))
          .filter(Boolean)
      : [],
  );

  return Array.from(new Set(numbers));
}

function PrintSection({
  title,
  children,
  compact,
  className,
}: {
  title: string;
  children: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <section
      className={`print-section ${compact ? "print-section-compact" : ""} ${className ?? ""}`}
    >
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function InfoCell({
  label,
  value,
  wide,
}: {
  label: string;
  value: string | null | undefined;
  wide?: boolean;
}) {
  const hasValue = Boolean(value?.trim());

  return (
    <div className={`print-info-cell ${wide ? "print-info-cell-wide" : ""}`}>
      <span>{label}</span>
      <strong className={hasValue ? "" : "print-muted"}>
        {hasValue ? value : "ثبت نشده"}
      </strong>
    </div>
  );
}

function TableRow({
  label,
  value,
  strong,
  className,
}: {
  label: string;
  value: string | null | undefined;
  strong?: boolean;
  className?: string;
}) {
  const hasValue = Boolean(value?.trim());

  return (
    <tr className={`${strong ? "print-table-strong" : ""} ${className ?? ""}`.trim()}>
      <th>{label}</th>
      <td className={hasValue ? "" : "print-muted"}>
        {hasValue ? value : "ثبت نشده"}
      </td>
    </tr>
  );
}

function CompactLineItems({
  items,
  emptyText,
}: {
  items: ContractForPrint["lineItems"];
  emptyText: string;
}) {
  if (items.length === 0) {
    return <p className="print-muted">{emptyText}</p>;
  }

  return <p>{summarizeLineItems(items, 6)}</p>;
}

function SignatureLine({
  label,
  name,
  seal,
}: {
  label: string;
  name: string;
  seal?: boolean;
}) {
  return (
    <div className={`print-signature-box ${seal ? "print-seal-box" : ""}`}>
      <span>{label}</span>
      <strong>{name}</strong>
      <i aria-hidden="true" />
    </div>
  );
}

function formatCompactLineItem(item: ContractForPrint["lineItems"][number]) {
  const cleanName = stripCalculationText(item.name);
  const shouldShowQuantity =
    item.type === "SERVICE" &&
    item.quantity > 1 &&
    item.pricingType !== "PER_GUEST" &&
    item.pricingType !== "FIXED" &&
    item.pricingType !== "CUSTOM";

  return shouldShowQuantity
    ? `${cleanName} × ${formatPersianNumber(item.quantity)}`
    : cleanName;
}

function stripCalculationText(value: string) {
  return value
    .replace(
      /\s*[\(（][^\)）]*(?:×|مهمان|قیمت|نفر|واحد|ساعت|مبلغ)[^\)）]*[\)）]/g,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function groupLineItems(items: ContractForPrint["lineItems"]) {
  return items.reduce<Record<string, ContractForPrint["lineItems"]>>(
    (groups, item) => {
      const key = getLineItemGroupKey(item);
      groups[key] = [...(groups[key] ?? []), item];
      return groups;
    },
    {},
  );
}

function sumLineItems(items: ContractForPrint["lineItems"]) {
  return items.reduce((sum, item) => sum + toNumber(item.totalPrice), 0);
}

function parseTimeToMinutes(value: string | null | undefined) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? "");

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function formatEventTimeRange(
  start: string | null | undefined,
  end: string | null | undefined,
) {
  if (!start && !end) {
    return "ثبت نشده";
  }

  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  const suffix =
    startMinutes !== null && endMinutes !== null && endMinutes < startMinutes
      ? " روز بعد"
      : "";

  return `${formatContractTime(start)} تا ${formatContractTime(end)}${suffix}`;
}

function formatAddress(parts: Array<string | null | undefined>) {
  return parts.filter((part) => part?.trim()).join("، ");
}

function buildMonogram(name: string) {
  const normalized = name.replace(/[^\u0600-\u06FF\w]/g, "").trim();

  return normalized.slice(0, 2) || "ت‌م";
}

function compactText(value: string | null | undefined, maxLength: number) {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";

  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1).trim()}…`
    : normalized;
}

function summarizeLineItems(
  items: ContractForPrint["lineItems"],
  limit: number,
) {
  const visibleItems = items.slice(0, limit).map(formatCompactLineItem);
  const hiddenCount = Math.max(items.length - limit, 0);

  return hiddenCount > 0
    ? `${visibleItems.join("، ")}، +${formatPersianNumber(hiddenCount)} آیتم دیگر`
    : visibleItems.join("، ");
}
