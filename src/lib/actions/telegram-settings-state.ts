export type TelegramSettingsActionState = {
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

export const initialTelegramSettingsActionState: TelegramSettingsActionState = {
  ok: false,
  message: "",
};
