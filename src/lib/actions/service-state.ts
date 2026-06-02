export type ServiceActionState = {
  ok: boolean;
  message: string;
};

export const initialServiceActionState: ServiceActionState = {
  ok: false,
  message: "",
};
