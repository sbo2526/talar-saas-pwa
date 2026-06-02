export type CustomerActionState = {
  ok: boolean;
  message: string;
};

export const initialCustomerActionState: CustomerActionState = {
  ok: false,
  message: "",
};
