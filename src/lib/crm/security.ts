import { createHash, randomBytes } from "crypto";

export function createPortalToken() {
  return randomBytes(32).toString("base64url");
}

export function hashPortalToken(token: string) {
  return createHash("sha256").update(token.trim(), "utf8").digest("hex");
}

export function previewPortalToken(token: string) {
  const normalized = token.trim();
  return normalized.length <= 10 ? normalized : normalized.slice(-10);
}

export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function isExpired(date: Date | null | undefined) {
  return Boolean(date && date.getTime() < Date.now());
}
