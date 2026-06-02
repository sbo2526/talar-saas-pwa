"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { AUDIT_ACTION_OPTIONS, AUDIT_ENTITY_OPTIONS } from "@/lib/audit/audit-taxonomy";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";

type AuditFilterFormProps = {
  users: Array<{ id: string; label: string }>;
};

export function AuditFilterForm({ users }: AuditFilterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function apply(formData: FormData) {
    const params = new URLSearchParams();
    for (const key of ["q", "entityType", "action", "userId", "from", "to", "entityId"]) {
      const value = String(formData.get(key) ?? "").trim();
      if (value) {
        params.set(key, value);
      }
    }

    startTransition(() => {
      router.push(`/dashboard/settings/activity${params.size ? `?${params.toString()}` : ""}`);
    });
  }

  return (
    <form action={apply} className="rounded-[2rem] border border-[#e8c478]/45 bg-white/72 p-4 shadow-[0_18px_60px_rgba(23,32,51,0.08)] backdrop-blur xl:p-5">
      <div className="mb-4 flex items-center gap-2 text-[#172033]">
        <SlidersHorizontal size={18} className="text-[#9f7131]" />
        <h2 className="text-sm font-black">فیلتر تاریخچه فعالیت‌ها</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <label className="grid gap-1.5 text-xs font-black text-[#172033] xl:col-span-2">
          جست‌وجو
          <span className="relative">
            <Search size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9f7131]" />
            <input
              name="q"
              defaultValue={searchParams.get("q") ?? ""}
              placeholder="شماره قرارداد، عنوان یا متن عملیات"
              className="input-luxury min-h-12 w-full pr-10 text-sm"
            />
          </span>
        </label>

        <label className="grid gap-1.5 text-xs font-black text-[#172033]">
          بخش
          <select name="entityType" defaultValue={searchParams.get("entityType") ?? ""} className="input-luxury min-h-12 text-sm">
            <option value="">همه بخش‌ها</option>
            {AUDIT_ENTITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-xs font-black text-[#172033]">
          عملیات
          <select name="action" defaultValue={searchParams.get("action") ?? ""} className="input-luxury min-h-12 text-sm">
            <option value="">همه عملیات‌ها</option>
            {AUDIT_ACTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-xs font-black text-[#172033]">
          کاربر
          <select name="userId" defaultValue={searchParams.get("userId") ?? ""} className="input-luxury min-h-12 text-sm">
            <option value="">همه کاربران</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.label}</option>
            ))}
          </select>
        </label>

        <JalaliDatePicker name="from" label="از تاریخ" defaultValue={searchParams.get("from")} />
        <JalaliDatePicker name="to" label="تا تاریخ" defaultValue={searchParams.get("to")} />
        <input type="hidden" name="entityId" value={searchParams.get("entityId") ?? ""} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" disabled={isPending} className="rounded-2xl bg-[#172033] px-5 py-3 text-sm font-black text-[#fff8ea] shadow-[0_14px_35px_rgba(23,32,51,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0f1728] disabled:opacity-65">
          اعمال فیلتر
        </button>
        <button type="button" onClick={() => router.push("/dashboard/settings/activity")} className="rounded-2xl border border-[#d8c08b]/70 bg-[#fff8ea] px-5 py-3 text-sm font-black text-[#7d5d23] transition hover:bg-white">
          پاک‌کردن فیلترها
        </button>
      </div>
    </form>
  );
}
