import type { ReactNode } from "react";
import type { User } from "@prisma/client";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";

export function AdminShell({
  user,
  children,
}: {
  user: Pick<User, "name" | "email">;
  children: ReactNode;
}) {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(232,196,120,0.20),transparent_28rem),radial-gradient(circle_at_bottom_right,rgba(23,32,51,0.08),transparent_30rem),linear-gradient(180deg,#fbf6ea,#f3ead7)] text-[#172033]"
    >
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="min-w-0 flex-1">
          <AdminTopbar user={user} />
          <main className="admin-shell-content mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
