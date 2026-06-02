export type SecurityActionState = {
  ok: boolean;
  message: string;
};

export const initialSecurityActionState: SecurityActionState = {
  ok: false,
  message: "",
};
