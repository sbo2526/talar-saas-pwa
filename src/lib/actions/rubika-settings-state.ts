export type RubikaSettingsActionState = {
  ok: boolean;
  message: string;
  chatId?: string;
  chatTitle?: string;
  recentChats?: Array<{
    chatId: string;
    title: string;
    type: string;
  }>;
};

export const initialRubikaSettingsActionState: RubikaSettingsActionState = {
  ok: false,
  message: "",
};
