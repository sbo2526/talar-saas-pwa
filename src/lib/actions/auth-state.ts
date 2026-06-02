export type AuthActionState = {
  ok: boolean;
  message: string;
  autoLoginEmail?: string;
  redirectTo?: string;
};

export const initialAuthActionState: AuthActionState = {
  ok: false,
  message: "",
};
