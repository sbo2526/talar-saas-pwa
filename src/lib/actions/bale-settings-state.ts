export type BaleSettingsActionState = {
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

export const initialBaleSettingsActionState: BaleSettingsActionState = {
  ok: false,
  message: "",
};
