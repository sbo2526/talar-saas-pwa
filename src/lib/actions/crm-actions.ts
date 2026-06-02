"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { createPortalToken, hashPortalToken, previewPortalToken, addMonths } from "@/lib/crm/security";
import { getCrmClient, getPortalLinkByToken } from "@/lib/crm/data";
import { isWeddingEvent } from "@/lib/crm/labels";

function text(value: FormDataEntryValue | null, max = 500) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.slice(0, max) : null;
}

function bool(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

function intInRange(value: FormDataEntryValue | null, min: number, max: number) {
  const parsed = Number(String(value ?? "").replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))));
  if (!Number.isInteger(parsed)) return null;
  return Math.min(max, Math.max(min, parsed));
}

const createLinkSchema = z.object({
  contractId: z.string().trim().min(1),
  kind: z.enum(["OWNER_CONTRACT", "GUEST_LOCATION"]),
  months: z.coerce.number().int().min(1).max(24).default(6),
});

export async function createContractPortalLinkAction(formData: FormData) {
  const membership = await requireTenantPermission("contracts.edit");
  const input = createLinkSchema.parse({
    contractId: formData.get("contractId"),
    kind: formData.get("kind"),
    months: formData.get("months") ?? 6,
  });
  const db = await getCrmClient();
  const contract = await db.contract.findFirst({ where: { id: input.contractId, tenantId: membership.tenantId }, select: { id: true } });

  if (!contract) {
    redirect("/dashboard/crm?error=contract-not-found");
  }

  const token = createPortalToken();
  const expiresAt = addMonths(new Date(), input.months);

  await db.contractAccessLink.create({
    data: {
      tenantId: membership.tenantId,
      contractId: input.contractId,
      kind: input.kind,
      tokenHash: hashPortalToken(token),
      tokenPreview: previewPortalToken(token),
      expiresAt,
      createdByUserId: membership.userId,
    },
  });

  revalidatePath(`/dashboard/crm/contracts/${input.contractId}`);
  redirect(`/dashboard/crm/contracts/${input.contractId}?createdKind=${input.kind}&createdToken=${encodeURIComponent(token)}`);
}

export async function revokeContractPortalLinkAction(formData: FormData) {
  const membership = await requireTenantPermission("contracts.edit");
  const linkId = String(formData.get("linkId") ?? "").trim();
  const contractId = String(formData.get("contractId") ?? "").trim();
  if (!linkId || !contractId) redirect("/dashboard/crm?error=invalid-link");
  const db = await getCrmClient();
  await db.contractAccessLink.updateMany({
    where: { id: linkId, tenantId: membership.tenantId, contractId },
    data: { revokedAt: new Date() },
  });
  revalidatePath(`/dashboard/crm/contracts/${contractId}`);
  redirect(`/dashboard/crm/contracts/${contractId}?revoked=1`);
}

export async function updateWeddingMusicRequestStatusAction(formData: FormData) {
  const membership = await requireTenantPermission("contracts.edit");
  const requestId = String(formData.get("requestId") ?? "").trim();
  const contractId = String(formData.get("contractId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!requestId || !contractId || !["REGISTERED", "REVIEWING", "APPROVED", "NEEDS_CHANGE", "REJECTED", "PLAYED"].includes(status)) {
    redirect(`/dashboard/crm/contracts/${contractId}?error=invalid-music-status`);
  }
  const db = await getCrmClient();
  await db.weddingMusicRequest.updateMany({
    where: { id: requestId, tenantId: membership.tenantId, contractId },
    data: {
      status,
      adminNote: text(formData.get("adminNote"), 700),
      reviewedAt: status === "REGISTERED" ? null : new Date(),
      executedAt: status === "PLAYED" ? new Date() : null,
    },
  });
  revalidatePath(`/dashboard/crm/contracts/${contractId}`);
  redirect(`/dashboard/crm/contracts/${contractId}?music=updated`);
}

export async function submitContractOwnerFeedbackAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const link = await getPortalLinkByToken(token, "OWNER_CONTRACT") as any;
  if (!link) redirect("/portal/contracts/invalid?error=invalid-link");
  const db = await getCrmClient();
  await db.contractFeedback.create({
    data: {
      tenantId: link.tenantId,
      contractId: link.contractId,
      linkId: link.id,
      audience: "OWNER",
      fullName: text(formData.get("fullName"), 120) ?? link.contract.customer.fullName,
      mobile: text(formData.get("mobile"), 30) ?? link.contract.customer.phone,
      ratingOverall: intInRange(formData.get("ratingOverall"), 1, 5),
      ratingContractManager: intInRange(formData.get("ratingContractManager"), 1, 5),
      message: text(formData.get("message"), 1200),
      suggestion: text(formData.get("suggestion"), 1200),
      source: "OWNER_CONTRACT_PORTAL",
      isMobileVerified: true,
    },
  });
  redirect(`/portal/contracts/${encodeURIComponent(token)}?saved=feedback`);
}

export async function joinClubFromOwnerPortalAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const link = await getPortalLinkByToken(token, "OWNER_CONTRACT") as any;
  if (!link) redirect("/portal/contracts/invalid?error=invalid-link");
  const db = await getCrmClient();
  const phone = text(formData.get("phone"), 30) ?? link.contract.customer.phone;
  const fullName = text(formData.get("fullName"), 120) ?? link.contract.customer.fullName;
  await db.customerClubMember.upsert({
    where: { tenantId_phone: { tenantId: link.tenantId, phone } },
    create: {
      tenantId: link.tenantId,
      customerId: link.contract.customerId,
      contractId: link.contractId,
      source: "OWNER_CONTRACT_PORTAL",
      sourceLinkKind: link.kind,
      fullName,
      phone,
      nationalCode: text(formData.get("nationalCode"), 20),
      city: text(formData.get("city"), 80),
      birthDateText: text(formData.get("birthDateText"), 30),
      consentClub: true,
      consentOccasionSms: bool(formData.get("consentOccasionSms")),
      consentPromotionSms: bool(formData.get("consentPromotionSms")),
      consentReminderSms: bool(formData.get("consentReminderSms")),
    },
    update: {
      customerId: link.contract.customerId,
      contractId: link.contractId,
      source: "OWNER_CONTRACT_PORTAL",
      sourceLinkKind: link.kind,
      fullName,
      nationalCode: text(formData.get("nationalCode"), 20),
      city: text(formData.get("city"), 80),
      birthDateText: text(formData.get("birthDateText"), 30),
      consentClub: true,
      consentOccasionSms: bool(formData.get("consentOccasionSms")),
      consentPromotionSms: bool(formData.get("consentPromotionSms")),
      consentReminderSms: bool(formData.get("consentReminderSms")),
    },
  });
  redirect(`/portal/contracts/${encodeURIComponent(token)}?saved=club`);
}

function isWeddingProfileComplete(input: Record<string, string | null>) {
  return Boolean(input.brideFirstName && input.bridePhone && input.groomFirstName && input.groomPhone && input.weddingDateText);
}

export async function saveWeddingProfileAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const link = await getPortalLinkByToken(token, "OWNER_CONTRACT") as any;
  if (!link) redirect("/portal/contracts/invalid?error=invalid-link");
  if (!isWeddingEvent(link.contract.eventTypeName)) redirect(`/portal/contracts/${encodeURIComponent(token)}?error=not-wedding`);
  const db = await getCrmClient();
  const input = {
    brideFirstName: text(formData.get("brideFirstName"), 80),
    brideLastName: text(formData.get("brideLastName"), 80),
    bridePhone: text(formData.get("bridePhone"), 30),
    brideBirthDateText: text(formData.get("brideBirthDateText"), 30),
    groomFirstName: text(formData.get("groomFirstName"), 80),
    groomLastName: text(formData.get("groomLastName"), 80),
    groomPhone: text(formData.get("groomPhone"), 30),
    groomBirthDateText: text(formData.get("groomBirthDateText"), 30),
    engagementDateText: text(formData.get("engagementDateText"), 30),
    weddingDateText: text(formData.get("weddingDateText"), 30),
  };
  const isComplete = isWeddingProfileComplete(input);
  await db.weddingProfile.upsert({
    where: { contractId: link.contractId },
    create: {
      tenantId: link.tenantId,
      contractId: link.contractId,
      ...input,
      consentOccasionSms: bool(formData.get("consentOccasionSms")),
      consentReminderSms: bool(formData.get("consentReminderSms")),
      consentPromotionSms: bool(formData.get("consentPromotionSms")),
      consentMusicStatusSms: bool(formData.get("consentMusicStatusSms")),
      musicEditDeadlineText: text(formData.get("musicEditDeadlineText"), 30),
      isComplete,
      completedAt: isComplete ? new Date() : null,
    },
    update: {
      ...input,
      consentOccasionSms: bool(formData.get("consentOccasionSms")),
      consentReminderSms: bool(formData.get("consentReminderSms")),
      consentPromotionSms: bool(formData.get("consentPromotionSms")),
      consentMusicStatusSms: bool(formData.get("consentMusicStatusSms")),
      musicEditDeadlineText: text(formData.get("musicEditDeadlineText"), 30),
      isComplete,
      completedAt: isComplete ? new Date() : null,
    },
  });
  redirect(`/portal/contracts/${encodeURIComponent(token)}?saved=wedding-profile`);
}

export async function submitWeddingMusicRequestAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const link = await getPortalLinkByToken(token, "OWNER_CONTRACT") as any;
  if (!link) redirect("/portal/contracts/invalid?error=invalid-link");
  if (!isWeddingEvent(link.contract.eventTypeName)) redirect(`/portal/contracts/${encodeURIComponent(token)}?error=not-wedding`);
  const requester = String(formData.get("requester") ?? "").trim();
  if (!["BRIDE", "GROOM"].includes(requester)) redirect(`/portal/contracts/${encodeURIComponent(token)}?error=invalid-requester`);
  const db = await getCrmClient();
  const profile = await db.weddingProfile.findUnique({ where: { contractId: link.contractId }, include: { musicRequests: true } }) as any;
  if (!profile?.isComplete) redirect(`/portal/contracts/${encodeURIComponent(token)}?error=wedding-profile-required`);
  const alreadyCount = profile.musicRequests.filter((item: any) => item.requester === requester).length;
  if (alreadyCount >= 2) redirect(`/portal/contracts/${encodeURIComponent(token)}?error=music-limit`);
  const songTitle = text(formData.get("songTitle"), 160);
  if (!songTitle) redirect(`/portal/contracts/${encodeURIComponent(token)}?error=music-title-required`);
  await db.weddingMusicRequest.create({
    data: {
      tenantId: link.tenantId,
      contractId: link.contractId,
      weddingProfileId: profile.id,
      requester,
      songTitle,
      artistName: text(formData.get("artistName"), 160),
      songUrl: text(formData.get("songUrl"), 500),
      playMoment: text(formData.get("playMoment"), 80),
      note: text(formData.get("note"), 700),
      status: "REGISTERED",
    },
  });
  redirect(`/portal/contracts/${encodeURIComponent(token)}?saved=music`);
}

export async function submitGuestFeedbackAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const link = await getPortalLinkByToken(token, "GUEST_LOCATION") as any;
  if (!link) redirect("/g/invalid?error=invalid-link");
  const db = await getCrmClient();
  await db.contractFeedback.create({
    data: {
      tenantId: link.tenantId,
      contractId: link.contractId,
      linkId: link.id,
      audience: "GUEST",
      fullName: text(formData.get("fullName"), 120),
      mobile: text(formData.get("mobile"), 30),
      ratingOverall: intInRange(formData.get("ratingOverall"), 1, 5),
      message: text(formData.get("message"), 1200),
      suggestion: text(formData.get("suggestion"), 1200),
      source: "GUEST_LOCATION_PORTAL",
      isMobileVerified: false,
    },
  });
  redirect(`/g/${encodeURIComponent(token)}?saved=feedback&otp=pending`);
}

export async function joinClubFromGuestLinkAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const link = await getPortalLinkByToken(token, "GUEST_LOCATION") as any;
  if (!link) redirect("/g/invalid?error=invalid-link");
  const phone = text(formData.get("phone"), 30);
  const fullName = text(formData.get("fullName"), 120);
  if (!phone || !fullName) redirect(`/g/${encodeURIComponent(token)}?error=club-required`);
  const db = await getCrmClient();
  await db.customerClubMember.upsert({
    where: { tenantId_phone: { tenantId: link.tenantId, phone } },
    create: {
      tenantId: link.tenantId,
      contractId: link.contractId,
      source: "GUEST_LOCATION_PORTAL",
      sourceLinkKind: link.kind,
      fullName,
      phone,
      birthDateText: text(formData.get("birthDateText"), 30),
      marriedStatus: text(formData.get("marriedStatus"), 40),
      marriageDateText: text(formData.get("marriageDateText"), 30),
      consentClub: true,
      consentOccasionSms: bool(formData.get("consentOccasionSms")),
      consentPromotionSms: bool(formData.get("consentPromotionSms")),
      consentReminderSms: bool(formData.get("consentReminderSms")),
    },
    update: {
      contractId: link.contractId,
      source: "GUEST_LOCATION_PORTAL",
      sourceLinkKind: link.kind,
      fullName,
      birthDateText: text(formData.get("birthDateText"), 30),
      marriedStatus: text(formData.get("marriedStatus"), 40),
      marriageDateText: text(formData.get("marriageDateText"), 30),
      consentClub: true,
      consentOccasionSms: bool(formData.get("consentOccasionSms")),
      consentPromotionSms: bool(formData.get("consentPromotionSms")),
      consentReminderSms: bool(formData.get("consentReminderSms")),
    },
  });
  redirect(`/g/${encodeURIComponent(token)}?saved=club&otp=pending`);
}
