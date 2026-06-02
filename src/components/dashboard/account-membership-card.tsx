import { BadgeCheck, Building2, Layers3, UserRoundCheck } from "lucide-react";
import { AccountSummaryCard } from "@/components/dashboard/account-summary-card";

type AccountMembershipCardProps = {
  accountStatus: string;
  roleLabel: string;
  workspaceCount: string;
  activeWorkspace: string;
  accessType: string;
};

export function AccountMembershipCard({
  accountStatus,
  roleLabel,
  workspaceCount,
  activeWorkspace,
  accessType,
}: AccountMembershipCardProps) {
  return (
    <AccountSummaryCard
      title="خلاصه وضعیت حساب"
      eyebrow="وضعیت حساب و دسترسی"
      items={[
        {
          label: "وضعیت حساب",
          value: accountStatus,
          icon: BadgeCheck,
        },
        {
          label: "نقش کاربری",
          value: roleLabel,
          icon: UserRoundCheck,
        },
        {
          label: "فضاهای کاری مرتبط",
          value: workspaceCount,
          icon: Layers3,
        },
        {
          label: "فضای کاری فعال",
          value: activeWorkspace,
          helper: accessType,
          icon: Building2,
        },
      ]}
    />
  );
}
