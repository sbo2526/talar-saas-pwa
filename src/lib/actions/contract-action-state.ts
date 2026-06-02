export type ContractActionState = {
  ok: boolean;
  message: string;
};

export const initialContractActionState: ContractActionState = {
  ok: false,
  message: "",
};
