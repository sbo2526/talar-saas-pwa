import { formatIRR } from "@/lib/formatters";
import { formatJalaliAuditDateTime } from "@/lib/date/jalali";

export function getAuditActorName(user: { name?: string | null; email?: string | null } | null | undefined) {
  return user?.name?.trim() || user?.email?.trim() || "سامانه";
}

export function buildAuditMessage(input: {
  entityLabel: string;
  recordLabel?: string | null;
  actionLabel: string;
  userName?: string | null;
  createdAt?: Date;
}) {
  const subject = input.recordLabel
    ? `${input.entityLabel} ${input.recordLabel}`
    : input.entityLabel;
  return `${subject} در ${formatJalaliAuditDateTime(input.createdAt ?? new Date())} توسط ${input.userName ?? "سامانه"} ${input.actionLabel} شد.`;
}

export function buildStatusChangeMessage(input: {
  entityLabel: string;
  recordLabel?: string | null;
  oldStatus: string;
  newStatus: string;
  userName?: string | null;
  createdAt?: Date;
}) {
  const subject = input.recordLabel
    ? `${input.entityLabel} ${input.recordLabel}`
    : input.entityLabel;
  return `${subject} در ${formatJalaliAuditDateTime(input.createdAt ?? new Date())} توسط ${input.userName ?? "سامانه"} از «${input.oldStatus}» به «${input.newStatus}» تغییر کرد.`;
}

export function buildPaymentReceivedMessage(input: {
  amount: number | string | { toString(): string };
  contractNo?: string | null;
  userName?: string | null;
  createdAt?: Date;
}) {
  const amountLabel = formatIRR(input.amount.toString());
  const target = input.contractNo ? ` برای قرارداد ${input.contractNo}` : "";
  return `دریافت مبلغ ${amountLabel}${target} در ${formatJalaliAuditDateTime(input.createdAt ?? new Date())} توسط ${input.userName ?? "سامانه"} ثبت شد.`;
}

export function buildExpenseMessage(input: {
  title: string;
  amount?: number | string | { toString(): string } | null;
  actionLabel: string;
  userName?: string | null;
  createdAt?: Date;
}) {
  const amount = input.amount ? ` به مبلغ ${formatIRR(input.amount.toString())}` : "";
  return `هزینه «${input.title}»${amount} در ${formatJalaliAuditDateTime(input.createdAt ?? new Date())} توسط ${input.userName ?? "سامانه"} ${input.actionLabel} شد.`;
}
