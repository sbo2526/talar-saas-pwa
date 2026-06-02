export type ExpenseActionState = {
  ok: boolean;
  message: string;
};

export const initialExpenseActionState: ExpenseActionState = {
  ok: false,
  message: "",
};
