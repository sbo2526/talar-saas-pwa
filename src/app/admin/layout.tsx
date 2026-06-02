import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";

export const metadata = {
  title: "مدیریت کل سامانه | تالار منیجر",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requirePlatformAdmin();

  return <AdminShell user={user}>{children}</AdminShell>;
}
