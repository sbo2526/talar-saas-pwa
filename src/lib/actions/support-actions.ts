"use server";

import type { SupportTicketActionState } from "@/lib/actions/support-ticket-state";
import {
  closeSupportTicketAction as closeSupportTicket,
  createSupportTicketAction as createSupportTicket,
  reopenSupportTicketAction as reopenSupportTicket,
  replySupportTicketAction as replySupportTicket,
} from "@/lib/actions/support-ticket-actions";

export async function createSupportTicketAction(
  previousState: SupportTicketActionState,
  formData: FormData,
) {
  return createSupportTicket(previousState, formData);
}

export async function replySupportTicketAction(
  previousState: SupportTicketActionState,
  formData: FormData,
) {
  return replySupportTicket(previousState, formData);
}

export async function closeSupportTicketAction(formData: FormData) {
  return closeSupportTicket(formData);
}

export async function reopenSupportTicketAction(formData: FormData) {
  return reopenSupportTicket(formData);
}
