export type TenantUserActionState = {
  ok: boolean;
  message: string;
};

export const initialTenantUserActionState: TenantUserActionState = {
  ok: false,
  message: "",
};
