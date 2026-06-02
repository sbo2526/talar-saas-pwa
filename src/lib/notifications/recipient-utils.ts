import "server-only";

import { toEnglishDigits } from "@/lib/validation/normalizers";

const recipientSeparators = /[\n\r,،;؛|]+/g;

function normalizeIranianMobile(value: string) {
  const normalized = toEnglishDigits(value).trim().replace(/[\s\-()]/g, "").replace(/^\+/, "");

  if (/^09\d{9}$/.test(normalized)) {
    return normalized;
  }

  if (/^989\d{9}$/.test(normalized)) {
    return `0${normalized.slice(2)}`;
  }

  if (/^00989\d{9}$/.test(normalized)) {
    return `0${normalized.slice(4)}`;
  }

  return normalized;
}

export function parseSmsRecipients(value: string | null | undefined) {
  if (!value?.trim()) {
    return [];
  }

  const recipients = value
    .replace(recipientSeparators, "\n")
    .split("\n")
    .map((item) => normalizeIranianMobile(item))
    .filter((item) => /^09\d{9}$/.test(item));

  return [...new Set(recipients)];
}

export function formatSmsRecipientsForStorage(value: string | null | undefined) {
  return parseSmsRecipients(value).join("\n");
}

export function parseTelegramRecipients(value: string | null | undefined) {
  if (!value?.trim()) {
    return [];
  }

  const recipients = value
    .replace(recipientSeparators, "\n")
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => /^-?\d{5,30}$/.test(item) || /^@[A-Za-z0-9_]{5,64}$/.test(item));

  return [...new Set(recipients)];
}

const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i;

export function parseEmailRecipients(value: string | null | undefined) {
  if (!value?.trim()) {
    return [];
  }

  const recipients = value
    .replace(recipientSeparators, "\n")
    .split("\n")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => emailPattern.test(item));

  return [...new Set(recipients)].slice(0, 20);
}

export function formatEmailRecipientsForStorage(value: string | null | undefined) {
  return parseEmailRecipients(value).join("\n");
}
