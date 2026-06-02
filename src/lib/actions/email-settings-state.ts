export type EmailSettingsActionState = {
  ok: boolean;
  message: string;
};

export const initialEmailSettingsActionState: EmailSettingsActionState = {
  ok: false,
  message: "",
};
