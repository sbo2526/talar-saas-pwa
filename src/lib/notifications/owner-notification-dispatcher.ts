import "server-only";

import { dispatchSmsNotification } from "@/lib/notifications/sms-dispatcher";
import { dispatchBaleNotification } from "@/lib/notifications/bale-dispatcher";
import { dispatchTelegramNotification } from "@/lib/notifications/telegram-dispatcher";
import { dispatchRubikaNotification } from "@/lib/notifications/rubika-dispatcher";
import { dispatchEmailNotification } from "@/lib/notifications/email-dispatcher";

type OwnerNotificationInput = {
  tenantId: string;
  eventType: string;
  variables: Record<string, unknown>;
  relatedContractId?: string | null;
  relatedPaymentId?: string | null;
  relatedExpenseId?: string | null;
  relatedCustomerId?: string | null;
};

export async function dispatchOwnerNotification(input: OwnerNotificationInput): Promise<void> {
  await Promise.allSettled([
    dispatchTelegramNotification(input),
    dispatchBaleNotification(input),
    dispatchRubikaNotification(input),
    dispatchSmsNotification(input),
    dispatchEmailNotification(input),
  ]);
}
