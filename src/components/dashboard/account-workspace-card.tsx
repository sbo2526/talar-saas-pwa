import Link from "next/link";
import {
  Building2,
  DoorOpen,
  type LucideIcon,
  ShieldCheck,
  Users,
} from "lucide-react";
import { startDemoAction } from "@/lib/actions/auth-actions";

type AccountWorkspaceCardProps = {
  hasWorkspace: boolean;
  tenantName: string;
  tenantStatus: string;
  roleLabel: string;
  memberCount: string;
  hallCount: string;
  salonCount: string;
};

export function AccountWorkspaceCard({
  hasWorkspace,
  tenantName,
  tenantStatus,
  roleLabel,
  memberCount,
  hallCount,
  salonCount,
}: AccountWorkspaceCardProps) {
  return (
    <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
      <p className="text-xs font-black text-[#17483f]">
        فضای کاری و دسترسی‌ها
      </p>
      <h2 className="mt-1 text-xl font-black sm:text-2xl">
        {hasWorkspace ? tenantName : "فضای کاری فعال وجود ندارد"}
      </h2>

      {hasWorkspace ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <WorkspaceMetric
              icon={ShieldCheck}
              label="وضعیت فضا"
              value={tenantStatus}
              helper={roleLabel}
            />
            <WorkspaceMetric
              icon={Users}
              label="اعضای فضا"
              value={memberCount}
              helper="کاربران مرتبط با این تالار"
            />
            <WorkspaceMetric
              icon={Building2}
              label="تالارها"
              value={hallCount}
              helper="بر اساس اطلاعات پایه"
            />
            <WorkspaceMetric
              icon={DoorOpen}
              label="سالن‌ها"
              value={salonCount}
              helper="بر اساس اطلاعات پایه"
            />
          </div>
          <Link href="/dashboard" className="btn-luxury-dark mt-5 px-5 py-3">
            بازگشت به داشبورد
          </Link>
        </>
      ) : (
        <div className="mt-4 rounded-[1.5rem] border border-dashed border-[#c7a15a]/48 bg-[#fff8ea]/76 p-4">
          <p className="text-sm font-bold leading-7 text-[#6d5f49]">
            برای شروع استفاده از داشبورد، دوره بررسی یک‌باره را فعال کنید یا پس از
            خرید، فضای اختصاصی تالار خود را راه‌اندازی نمایید.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <form action={startDemoAction}>
              <button className="btn-luxury-dark w-full px-5 py-3 sm:w-auto">
                شروع دوره بررسی یک‌باره
              </button>
            </form>
            <Link
              href="/dashboard/account/plans"
              className="btn-luxury-secondary px-5 py-3 !text-[#111827]"
            >
              مشاهده پلن خرید
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

function WorkspaceMetric({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 p-3.5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
          <Icon size={17} />
        </span>
        <div>
          <p className="text-xs font-black text-[#7d6841]">{label}</p>
          <p className="mt-1 text-sm font-black leading-6 text-[#111827]">
            {value}
          </p>
          <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">
            {helper}
          </p>
        </div>
      </div>
    </div>
  );
}
