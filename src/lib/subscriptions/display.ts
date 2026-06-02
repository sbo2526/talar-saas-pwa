export type SubscriptionDisplayInput =
  | {
      plan?: string | null;
      status?: string | null;
      purchaseReference?: string | null;
      currentPeriodEnd?: Date | string | number | null;
    }
  | null
  | undefined;

export type HallProfileDisplayInput =
  | {
      brandName?: string | null;
      legalName?: string | null;
    }
  | null
  | undefined;

export const subscriptionPlanLabels: Record<string, string> = {
  DEMO: "دوره بررسی",
  STARTER: "پایه",
  PROFESSIONAL: "حرفه‌ای",
  ENTERPRISE: "سازمانی",
};

export const subscriptionStatusLabels: Record<string, string> = {
  TRIALING: "دوره بررسی",
  ACTIVE: "فعال",
  PAST_DUE: "معوق",
  CANCELED: "لغوشده",
  EXPIRED: "منقضی",
};

export const tenantStatusLabels: Record<string, string> = {
  DEMO: "دوره بررسی",
  ACTIVE: "فعال",
  SUSPENDED: "تعلیق‌شده",
  ARCHIVED: "آرشیوشده",
};

export function getPlanLabel(plan?: string | null) {
  return plan ? (subscriptionPlanLabels[plan] ?? "ثبت نشده") : "ثبت نشده";
}

export function getSubscriptionStatusLabel(status?: string | null) {
  return status ? (subscriptionStatusLabels[status] ?? "ثبت نشده") : "ثبت نشده";
}

export function getTenantStatusLabel(status?: string | null) {
  return status ? (tenantStatusLabels[status] ?? "ثبت نشده") : "ثبت نشده";
}

export function isPurchasedSubscription(
  subscription: SubscriptionDisplayInput,
) {
  return Boolean(
    subscription?.plan &&
    subscription.plan !== "DEMO" &&
    (subscription.status === "ACTIVE" || subscription.status === "TRIALING"),
  );
}

export function isPaidPlan(subscription: SubscriptionDisplayInput) {
  return Boolean(subscription?.plan && subscription.plan !== "DEMO");
}

export function isDisplayablePaidSubscription(
  subscription: SubscriptionDisplayInput,
) {
  return Boolean(
    isPaidPlan(subscription) &&
    subscription?.status !== "EXPIRED" &&
    subscription?.status !== "CANCELED",
  );
}

export function getVisiblePlanLabel(subscription: SubscriptionDisplayInput) {
  return isDisplayablePaidSubscription(subscription)
    ? getPlanLabel(subscription?.plan)
    : null;
}

export function getWorkspaceSubscriptionStatusLabel(
  subscription: SubscriptionDisplayInput,
) {
  if (isDisplayablePaidSubscription(subscription)) {
    return subscription?.status === "ACTIVE"
      ? "فعال"
      : getSubscriptionStatusLabel(subscription?.status);
  }

  if (subscription?.status === "TRIALING" || subscription?.plan === "DEMO") {
    return "دوره بررسی";
  }

  return "نیازمند انتخاب پلن";
}

export function getSubscriptionValidityLabel(
  subscription: SubscriptionDisplayInput,
  now = new Date(),
) {
  if (!isDisplayablePaidSubscription(subscription)) {
    return "پس از خرید فعال می‌شود";
  }

  const endDate = normalizeSubscriptionDate(subscription?.currentPeriodEnd);

  if (!endDate) {
    return "اعتبار ثبت نشده";
  }

  const remainingMilliseconds = endDate.getTime() - now.getTime();
  const remainingDays = Math.max(
    0,
    Math.ceil(remainingMilliseconds / (1000 * 60 * 60 * 24)),
  );

  if (remainingDays <= 0) {
    return "اعتبار پایان‌یافته";
  }

  return `${remainingDays.toLocaleString("fa-IR")} روز اعتبار`;
}

export function getSubscriptionActionLabel(
  subscription: SubscriptionDisplayInput,
) {
  if (isPurchasedSubscription(subscription)) return "مدیریت اشتراک";
  if (subscription?.plan && subscription.plan !== "DEMO")
    return "پیگیری یا تغییر پلن";
  return "مشاهده پلن‌ها";
}

export function resolveWorkspaceDisplayName({
  tenantName,
  hallProfile,
  ownerName,
  subscription,
  tenantStatus,
  fallback = "فضای کاری فعال",
}: {
  tenantName?: string | null;
  hallProfile?: HallProfileDisplayInput;
  ownerName?: string | null;
  subscription?: SubscriptionDisplayInput;
  tenantStatus?: string | null;
  fallback?: string;
}) {
  const hallName =
    normalizeOptionalText(hallProfile?.brandName) ??
    normalizeOptionalText(hallProfile?.legalName);
  const normalizedTenantName = normalizeOptionalText(tenantName);
  const normalizedOwnerName = normalizeOptionalText(ownerName);
  const mustHideDemoLabel = shouldHideDemoWorkspaceLabel({
    subscription,
    tenantStatus,
  });

  if (mustHideDemoLabel) {
    return (
      sanitizePurchasedWorkspaceName(hallName) ??
      sanitizePurchasedWorkspaceName(normalizedTenantName) ??
      normalizedOwnerName ??
      fallback
    );
  }

  return normalizedTenantName ?? hallName ?? fallback;
}

export function shouldHideDemoWorkspaceLabel({
  subscription,
  tenantStatus,
}: {
  subscription?: SubscriptionDisplayInput;
  tenantStatus?: string | null;
}) {
  return Boolean(
    tenantStatus === "ACTIVE" ||
    isPurchasedSubscription(subscription) ||
    (isPaidPlan(subscription) &&
      subscription?.status !== "EXPIRED" &&
      subscription?.status !== "CANCELED"),
  );
}

function normalizeSubscriptionDate(
  value: Date | string | number | null | undefined,
) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = value instanceof Date ? value : new Date(value);

  return Number.isNaN(normalized.getTime()) ? null : normalized;
}

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim().replace(/\s+/g, " ") ?? "";
  return normalized.length > 0 ? normalized : null;
}

function sanitizePurchasedWorkspaceName(value?: string | null) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) return null;

  const cleaned = normalized
    .replace(/^\s*(?:\u062f\u0648\u0631\u0647 \u0628\u0631\u0631\u0633\u06cc|\u062f\u0648\u0631\u0647 \u0628\u0631\u0631\u0633\u06cc(?:\u06cc)?|\u0646\u0633\u062e\u0647\s+\u062f\u0648\u0631\u0647 \u0628\u0631\u0631\u0633\u06cc|\u0641\u0636\u0627\u06cc\s+\u062f\u0648\u0631\u0647 \u0628\u0631\u0631\u0633\u06cc|\u062f\u0645\u0648\u06cc|\u062f\u0645\u0648(?:\u06cc)?|\u0646\u0633\u062e\u0647\s+\u062f\u0645\u0648|\u0641\u0636\u0627\u06cc\s+\u062f\u0645\u0648|\u0622\u0632\u0645\u0627\u06cc\u0634\u06cc)[\s‌]+/u, "")
    .replace(/^\s*درخواست\s+خرید[\s‌]+/u, "")
    .replace(/[\s‌]+(?:\u062f\u0648\u0631\u0647 \u0628\u0631\u0631\u0633\u06cc|\u062f\u0645\u0648|\u0622\u0632\u0645\u0627\u06cc\u0634\u06cc)\s*$/u, "")
    .trim()
    .replace(/\s+/g, " ");

  return cleaned.length > 1 ? cleaned : null;
}
