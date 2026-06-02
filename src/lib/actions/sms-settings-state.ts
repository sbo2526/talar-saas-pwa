export type SmsSettingsActionState = {
  ok: boolean;
  message: string;
};

export const initialSmsSettingsActionState: SmsSettingsActionState = {
  ok: false,
  message: "",
};
