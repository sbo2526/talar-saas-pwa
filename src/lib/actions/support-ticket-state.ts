export type SupportTicketActionState = {
  ok: boolean;
  message: string;
};

export const initialSupportTicketActionState: SupportTicketActionState = {
  ok: false,
  message: "",
};
