export type NotificationLogActionState = {
  ok: boolean;
  message: string;
};

export const initialNotificationLogActionState: NotificationLogActionState = {
  ok: false,
  message: "",
};
