export type AccountActionState = {
  ok: boolean;
  message: string;
};

export const initialAccountActionState: AccountActionState = {
  ok: false,
  message: "",
};
