-- Add support-ticket user relations.
ALTER TABLE "SupportTicket"
ADD CONSTRAINT "SupportTicket_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupportTicketMessage"
ADD CONSTRAINT "SupportTicketMessage_senderUserId_fkey"
FOREIGN KEY ("senderUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
