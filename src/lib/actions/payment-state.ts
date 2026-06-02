export type PaymentActionState = {
  ok: boolean;
  message: string;
};

export const initialPaymentActionState: PaymentActionState = {
  ok: false,
  message: "",
};
