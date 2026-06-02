import { z } from "zod";
import {
  supportTicketCategoryValues,
  supportTicketPriorityValues,
} from "@/lib/support/tickets";
import { normalizeOptionalString } from "@/lib/validation/normalizers";

const cuidLike = z.string().trim().min(1, "شناسه معتبر نیست.").max(128, "شناسه معتبر نیست.");

export const supportTicketIdSchema = z.object({ ticketId: cuidLike });

export const createSupportTicketSchema = z.object({
  title: z.preprocess(
    normalizeOptionalString,
    z.string({ error: "عنوان تیکت الزامی است." }).min(3, "عنوان تیکت را کامل‌تر وارد کنید.").max(180, "عنوان تیکت بیش از حد طولانی است."),
  ),
  category: z.enum(supportTicketCategoryValues, { error: "موضوع تیکت معتبر نیست." }),
  priority: z.enum(supportTicketPriorityValues, { error: "اولویت تیکت معتبر نیست." }),
  body: z.preprocess(
    normalizeOptionalString,
    z.string({ error: "شرح تیکت الزامی است." }).min(10, "شرح تیکت را کامل‌تر وارد کنید.").max(4000, "شرح تیکت بیش از حد طولانی است."),
  ),
});

export const replySupportTicketSchema = z.object({
  ticketId: cuidLike,
  body: z.preprocess(
    normalizeOptionalString,
    z.string({ error: "متن پاسخ الزامی است." }).min(2, "متن پاسخ را وارد کنید.").max(4000, "متن پاسخ بیش از حد طولانی است."),
  ),
});

export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;
export type ReplySupportTicketInput = z.infer<typeof replySupportTicketSchema>;
