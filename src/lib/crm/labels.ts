export const crmLinkKindLabels: Record<string, string> = {
  OWNER_CONTRACT: "لینک صاحب قرارداد",
  GUEST_LOCATION: "لینک مهمان و آدرس",
};

export const crmFeedbackAudienceLabels: Record<string, string> = {
  OWNER: "صاحب قرارداد",
  GUEST: "مهمان",
};

export const musicRequesterLabels: Record<string, string> = {
  BRIDE: "عروس",
  GROOM: "داماد",
};

export const musicStatusLabels: Record<string, string> = {
  REGISTERED: "ثبت‌شده",
  REVIEWING: "در حال بررسی",
  APPROVED: "تأیید شده",
  NEEDS_CHANGE: "نیازمند اصلاح",
  REJECTED: "رد شده",
  PLAYED: "اجرا شده",
};

export const musicPlayMomentLabels: Record<string, string> = {
  ENTRANCE: "ورود عروس و داماد",
  FIRST_DANCE: "رقص دو نفره",
  CAKE: "کیک",
  DINNER: "شام",
  ENDING: "پایان مراسم",
  OTHER: "سایر",
};

export const crmReminderTypeLabels: Record<string, string> = {
  BRIDE_BIRTHDAY: "تولد عروس",
  GROOM_BIRTHDAY: "تولد داماد",
  ENGAGEMENT_ANNIVERSARY: "سالگرد عقد",
  WEDDING_ANNIVERSARY: "سالگرد عروسی",
  CLUB_BIRTHDAY: "تولد عضو باشگاه",
  CLUB_MARRIAGE_ANNIVERSARY: "سالگرد ازدواج عضو باشگاه",
};

export function isWeddingEvent(eventTypeName: string | null | undefined) {
  const value = String(eventTypeName ?? "").trim().toLowerCase();
  return value.includes("عروسی") || value.includes("wedding") || value.includes("ازدواج");
}

export function getCrmStatusPill(status: string | null | undefined) {
  if (status === "ACTIVE") return "border-[#25a46d]/22 bg-[#25a46d]/9 text-[#17483f]";
  if (status === "REVOKED") return "border-[#b42318]/25 bg-[#fef3f2] text-[#7a271a]";
  if (status === "EXPIRED") return "border-[#d6b15f]/40 bg-[#f4dfaa]/35 text-[#6f4a18]";
  return "border-[#d8c08b]/65 bg-white/65 text-[#6d5f49]";
}
