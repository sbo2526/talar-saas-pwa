export type PaymentMethodActionState = {
  ok: boolean;
  message: string;
};

export const initialPaymentMethodActionState: PaymentMethodActionState = {
  ok: false,
  message: "",
};
