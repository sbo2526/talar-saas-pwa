import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CircleUserRound,
  Clock3,
  Filter,
  LayoutGrid,
  MessageCircleWarning,
  Search,
  ShieldCheck,
  Table2,
  UserCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { AdminCard } from "@/components/admin/admin-card";
import { AdminStatCard } from "@/components/admin/stat-card";
import { StatusChip } from "@/components/admin/status-chip";
import {
  getAdminUsersPageData,
  type AdminUserListItem,
  type AdminUserListParams,
} from "@/lib/admin/admin-users-data";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { formatJalaliAuditDateTime, formatJalaliDate } from "@/lib/date/jalali";

export const metadata = {
  title: "کاربران سامانه | مدیریت کل سامانه",
};

type PageProps = { searchParams?: Promise<AdminUserListParams> };

const kpiIcons = [
  UsersRound,
  UserCheck,
  AlertTriangle,
  Clock3,
  BriefcaseBusiness,
  ShieldCheck,
  CircleUserRound,
  MessageCircleWarning,
  BadgeCheck,
];

function buildUsersHref(current: AdminUserListParams, patch: Record<string, string | null | undefined>) {
  const search = new URLSearchParams();
  const merged = { ...current, ...patch };
  Object.entries(merged).forEach(([key, value]) => {
    if (value && value !== "all" && !(key === "page" && value === "1")) {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const notice = params as AdminUserListParams & { deletedUser?: string; deletedTenants?: string; deleteError?: string };
  const data = await getAdminUsersPageData(params);
  const current = data.currentFilters;
  const cardView = current.view !== "table";

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] border border-[#e8c478]/35 bg-[radial-gradient(circle_at_top_left,rgba(232,196,120,0.22),transparent_34%),linear-gradient(145deg,rgba(23,32,51,0.98),rgba(9,14,23,0.98))] p-5 text-[#fff8ea] shadow-[0_24px_72px_rgba(15,23,42,0.18)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-4xl">
            <p className="inline-flex rounded-full border border-[#e8c478]/28 bg-[#e8c478]/10 px-3 py-1 text-xs font-black text-[#f0dba9]">مرکز مدیریت کاربران سامانه</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">کاربران سامانه</h1>
            <p className="mt-2 text-sm font-bold leading-7 text-[#d9caa9]">
              همه کاربران ثبت‌نام‌شده، نقش‌ها، فضاهای کاری، وضعیت حساب و فعالیت آن‌ها را از این بخش مدیریت کنید.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={buildUsersHref(current, { tab: "new", page: "1" })} className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-2 text-xs font-black text-[#f0dba9] hover:bg-white/[0.12]">
              <UserCheck size={15} /> کاربران جدید
            </Link>
            <Link href={buildUsersHref(current, { tab: "no-activity", sort: "needs-review", page: "1" })} className="inline-flex items-center gap-2 rounded-2xl border border-amber-200/25 bg-amber-400/10 px-4 py-2 text-xs font-black text-amber-100 hover:bg-amber-400/15">
              <AlertTriangle size={15} /> کاربران نیازمند بررسی
            </Link>
            <Link href="/admin" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-2 text-xs font-black text-white hover:bg-white/[0.12]">
              <ArrowRight size={15} /> بازگشت به نمای کلی
            </Link>
          </div>
        </div>
      </section>

      {notice.deletedUser ? (
        <AdminCard className="border-emerald-200 bg-emerald-50">
          <div className="flex flex-wrap items-center justify-between gap-3 text-emerald-800">
            <div>
              <h2 className="text-sm font-black">کاربر با موفقیت حذف شد</h2>
              <p className="mt-1 text-xs font-bold">تعداد تالارهای مالکیتی حذف‌شده: {formatPersianNumber(Number(notice.deletedTenants ?? 0))}</p>
            </div>
            <BadgeCheck size={22} />
          </div>
        </AdminCard>
      ) : null}

      {notice.deleteError ? (
        <AdminCard className="border-rose-200 bg-rose-50">
          <div className="flex flex-wrap items-center justify-between gap-3 text-rose-800">
            <div>
              <h2 className="text-sm font-black">حذف کاربر انجام نشد</h2>
              <p className="mt-1 text-xs font-bold">درخواست حذف معتبر نبود یا کاربر پیدا نشد.</p>
            </div>
            <AlertTriangle size={22} />
          </div>
        </AdminCard>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {data.kpis.map((kpi, index) => {
          const Icon = kpiIcons[index % kpiIcons.length];
          return <AdminStatCard key={kpi.key} title={kpi.title} value={kpi.value} description={kpi.description} tone={kpi.tone} icon={<Icon size={20} />} />;
        })}
      </section>

      <AdminCard className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {data.tabs.map((tab) => {
            const active = (current.tab ?? "all") === tab.key;
            return (
              <Link
                key={tab.key}
                href={buildUsersHref(current, { tab: tab.key, page: "1" })}
                className={`rounded-full border px-3 py-2 text-xs font-black transition ${
                  active
                    ? "border-[#172033] bg-[#172033] text-[#f0dba9]"
                    : "border-[#d8c08b]/55 bg-white/70 text-[#172033] hover:bg-[#fff7df]"
                }`}
              >
                {tab.label} <span className="opacity-75">({formatPersianNumber(tab.count)})</span>
              </Link>
            );
          })}
        </div>

        <form className="grid gap-3">
          <input type="hidden" name="tab" value={current.tab ?? "all"} />
          <input type="hidden" name="view" value={current.view ?? "card"} />
          <div className="grid gap-3 lg:grid-cols-[1fr_11rem_11rem_11rem_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9a875f]" size={17} />
              <input name="q" defaultValue={current.q ?? ""} placeholder="جست‌وجوی نام، ایمیل، موبایل یا تالار" className="h-12 w-full rounded-2xl border border-[#e8c478]/45 bg-white/85 pr-10 pl-3 text-sm font-bold outline-none focus:border-[#c79b3b]" />
            </label>
            <select name="status" defaultValue={current.status ?? "all"} className="h-12 rounded-2xl border border-[#e8c478]/45 bg-white/85 px-3 text-xs font-black outline-none">
              <option value="all">همه وضعیت‌ها</option>
              <option value="ACTIVE">فعال</option>
              <option value="INVITED">دعوت‌شده</option>
              <option value="SUSPENDED">غیرفعال</option>
            </select>
            <select name="role" defaultValue={current.role ?? "all"} className="h-12 rounded-2xl border border-[#e8c478]/45 bg-white/85 px-3 text-xs font-black outline-none">
              <option value="all">همه نقش‌ها</option>
              <option value="owner">مالک تالار</option>
              <option value="admin">مدیر تالار</option>
              <option value="member">عضو</option>
              <option value="platform-admin">مدیر کل سامانه</option>
              <option value="no-workspace">بدون فضای کاری</option>
            </select>
            <select name="sort" defaultValue={current.sort ?? "newest"} className="h-12 rounded-2xl border border-[#e8c478]/45 bg-white/85 px-3 text-xs font-black outline-none">
              <option value="newest">جدیدترین</option>
              <option value="oldest">قدیمی‌ترین</option>
              <option value="last-login">آخرین ورود</option>
              <option value="workspaces">بیشترین تالار</option>
              <option value="tickets">بیشترین تیکت</option>
              <option value="needs-review">نیازمند بررسی</option>
              <option value="name">نام کاربر</option>
            </select>
            <div className="flex gap-2">
              <button className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#172033] px-5 text-xs font-black text-[#f0dba9]">اعمال</button>
              <Link href="/admin/users" className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8c08b]/55 bg-white/70 px-4 text-xs font-black text-[#172033]">حذف</Link>
            </div>
          </div>

          <details className="rounded-2xl border border-[#e8c478]/30 bg-[#fffaf0]/75 p-3">
            <summary className="flex cursor-pointer items-center gap-2 text-xs font-black text-[#172033]"><Filter size={16} /> فیلترهای پیشرفته</summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select name="subscription" defaultValue={current.subscription ?? "all"} className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none">
                <option value="all">همه دوره بررسی/اشتراک‌ها</option>
                <option value="trialing">دوره بررسی فعال</option>
                <option value="active">اشتراک فعال</option>
                <option value="expired">منقضی یا نیازمند تمدید</option>
                <option value="none">بدون اشتراک</option>
              </select>
              <select name="tickets" defaultValue={current.tickets ?? "all"} className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none">
                <option value="all">همه تیکت‌ها</option>
                <option value="open">دارای تیکت باز</option>
                <option value="none">بدون تیکت باز</option>
              </select>
              <select name="workspace" defaultValue={current.workspace ?? "all"} className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none">
                <option value="all">همه فضاهای کاری</option>
                <option value="has">دارای تالار</option>
                <option value="none">بدون تالار</option>
              </select>
              <select name="inactive" defaultValue={current.inactive ?? "all"} className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none">
                <option value="all">همه فعالیت‌ها</option>
                <option value="yes">بدون فعالیت اخیر</option>
              </select>
              <select name="emailVerified" defaultValue={current.emailVerified ?? "all"} className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none">
                <option value="all">همه ایمیل‌ها</option>
                <option value="yes">ایمیل تأیید شده</option>
                <option value="no">ایمیل تأیید نشده</option>
              </select>
              <select name="phoneVerified" defaultValue={current.phoneVerified ?? "all"} className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none">
                <option value="all">همه موبایل‌ها</option>
                <option value="yes">موبایل ثبت/تأیید شده</option>
                <option value="no">موبایل ثبت نشده</option>
              </select>
            </div>
          </details>
        </form>
      </AdminCard>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-[#6d5f49]">
        <p>نمایش {formatPersianNumber(data.from)} تا {formatPersianNumber(data.to)} از {formatPersianNumber(data.filteredCount)} کاربر</p>
        <div className="flex rounded-2xl border border-[#d8c08b]/55 bg-white/70 p-1">
          <Link href={buildUsersHref(current, { view: "card", page: "1" })} className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 font-black ${cardView ? "bg-[#172033] text-[#f0dba9]" : "text-[#172033]"}`}><LayoutGrid size={15} /> نمای کارت</Link>
          <Link href={buildUsersHref(current, { view: "table", page: "1" })} className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 font-black ${!cardView ? "bg-[#172033] text-[#f0dba9]" : "text-[#172033]"}`}><Table2 size={15} /> نمای جدول</Link>
        </div>
      </div>

      {data.users.length === 0 ? (
        <AdminCard className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#172033] text-[#f0dba9]"><UserRound size={24} /></div>
          <h2 className="mt-4 text-lg font-black text-[#172033]">هیچ کاربری با این فیلترها پیدا نشد.</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-7 text-[#7b6a4b]">فیلترها را تغییر دهید یا همه کاربران ثبت‌نام‌شده را دوباره مشاهده کنید.</p>
          <Link href="/admin/users" className="mt-4 inline-flex rounded-2xl bg-[#172033] px-5 py-3 text-sm font-black text-[#f0dba9]">حذف فیلترها</Link>
        </AdminCard>
      ) : cardView ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {data.users.map((user) => <UserCard key={user.id} user={user} />)}
        </section>
      ) : (
        <UserTable users={data.users} />
      )}

      {data.totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {data.page > 1 ? <Link href={buildUsersHref(current, { page: String(data.page - 1) })} className="rounded-2xl border border-[#d8c08b]/55 bg-white/70 px-4 py-2 text-sm font-black">قبلی</Link> : null}
          <span className="rounded-2xl border border-[#d8c08b]/55 bg-[#fffaf0] px-4 py-2 text-sm font-black text-[#172033]">صفحه {formatPersianNumber(data.page)} از {formatPersianNumber(data.totalPages)}</span>
          {data.page < data.totalPages ? <Link href={buildUsersHref(current, { page: String(data.page + 1) })} className="rounded-2xl border border-[#d8c08b]/55 bg-white/70 px-4 py-2 text-sm font-black">بعدی</Link> : null}
        </div>
      ) : null}
    </div>
  );
}

function UserCard({ user }: { user: AdminUserListItem }) {
  return (
    <AdminCard className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#172033] text-[#f0dba9] text-base font-black">
            {user.fullName.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <Link href={user.availableActions.detailsHref} className="block truncate text-lg font-black text-[#172033] hover:text-[#9a6a15]">{user.fullName}</Link>
            <p className="mt-1 text-xs font-bold leading-6 text-[#7b6a4b]">{user.email} {user.mobile ? `— ${user.mobile}` : "— موبایل ثبت نشده"}</p>
            <p className="text-xs font-bold text-[#8a795a]">{user.roleLabel} — {user.primaryWorkspaceName}</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <StatusChip tone={user.statusTone}>{user.statusLabel}</StatusChip>
          <StatusChip tone={user.roleTone}>{user.roleLabel}</StatusChip>
          <StatusChip tone={user.health.tone}>{user.health.label}</StatusChip>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3">
          <p className="text-xs font-black text-[#7b6a4b]">دسترسی و فضاهای کاری</p>
          <p className="mt-2 text-sm font-black text-[#172033]">{user.primaryWorkspaceName}</p>
          <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">
            عضویت‌ها: {formatPersianNumber(user.membershipsCount)} · مالکیت‌ها: {formatPersianNumber(user.ownedTenantsCount)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusChip tone={user.emailVerified ? "emerald" : "amber"}>{user.emailVerified ? "ایمیل تأیید شده" : "ایمیل تأیید نشده"}</StatusChip>
            <StatusChip tone={user.phoneVerified ? "emerald" : "amber"}>{user.phoneVerified ? "موبایل ثبت شده" : "موبایل ثبت نشده"}</StatusChip>
          </div>
        </div>
        <div className="rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3">
          <p className="text-xs font-black text-[#7b6a4b]">سلامت حساب</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {user.health.reasons.map((reason) => <StatusChip key={reason} tone={reason === "وضعیت پایدار" ? "emerald" : user.health.tone}>{reason}</StatusChip>)}
          </div>
          <p className="mt-2 text-xs font-bold text-[#6d5f49]">آخرین وضعیت: {user.activityLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <MiniMetric label="تالارها" value={formatPersianNumber(user.workspacesCount)} />
        <MiniMetric label="قراردادها" value={formatPersianNumber(user.contractsCount)} />
        <MiniMetric label="دریافتی‌ها" value={formatIRR(user.receiptsTotal)} />
        <MiniMetric label="تیکت باز" value={formatPersianNumber(user.openTicketsCount)} tone={user.openTicketsCount > 0 ? "rose" : "navy"} />
        <MiniMetric label="اشتراک" value={user.subscriptionLabel} />
      </div>

      <div className="grid gap-2 rounded-2xl border border-[#e8c478]/28 bg-white/70 p-3 text-xs font-bold leading-6 text-[#6d5f49] sm:grid-cols-2">
        <p>ثبت‌نام: <span className="font-black text-[#172033]">{formatJalaliDate(user.createdAt)}</span></p>
        <p>آخرین ورود: <span className="font-black text-[#172033]">{formatJalaliAuditDateTime(user.lastLoginAt)}</span></p>
        <p>آخرین فعالیت: <span className="font-black text-[#172033]">{formatJalaliAuditDateTime(user.lastActivityAt)}</span></p>
        <p>پایان دوره بررسی/دوره: <span className="font-black text-[#172033]">{user.trialEndsAt ? formatJalaliDate(user.trialEndsAt) : "ثبت نشده"}</span></p>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-[#e8c478]/25 pt-3">
        <Link href={user.availableActions.detailsHref} className="rounded-2xl bg-[#172033] px-4 py-2.5 text-xs font-black text-[#f0dba9]">مشاهده کاربر</Link>
        <Link href={user.availableActions.workspacesHref} className="rounded-2xl border border-[#d8c08b]/55 bg-white/70 px-4 py-2.5 text-xs font-black text-[#172033]">مشاهده تالارها</Link>
        <Link href={user.availableActions.ticketsHref} className="rounded-2xl border border-[#d8c08b]/55 bg-white/70 px-4 py-2.5 text-xs font-black text-[#172033]">مشاهده تیکت‌ها</Link>
        <Link href={user.availableActions.subscriptionHref} className="rounded-2xl border border-[#d8c08b]/55 bg-white/70 px-4 py-2.5 text-xs font-black text-[#172033]">دوره بررسی و اشتراک</Link>
        <Link href={`${user.availableActions.detailsHref}#delete-user`} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-700">حذف و پاک‌سازی</Link>
      </div>
    </AdminCard>
  );
}

function MiniMetric({ label, value, tone = "navy" }: { label: string; value: string; tone?: "navy" | "rose" }) {
  return (
    <div className={`rounded-2xl border p-3 ${tone === "rose" ? "border-rose-200 bg-rose-50" : "border-[#e8c478]/28 bg-[#fffaf0]"}`}>
      <p className="text-[10px] font-black text-[#7b6a4b]">{label}</p>
      <p className={`mt-1 truncate text-xs font-black ${tone === "rose" ? "text-rose-700" : "text-[#172033]"}`}>{value}</p>
    </div>
  );
}

function UserTable({ users }: { users: AdminUserListItem[] }) {
  return (
    <AdminCard className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#e8c478]/25 text-right text-xs">
          <thead className="bg-[#fff7df] text-[#7b6a4b]">
            <tr>
              <th className="px-4 py-3 font-black">کاربر</th>
              <th className="px-4 py-3 font-black">نقش</th>
              <th className="px-4 py-3 font-black">وضعیت حساب</th>
              <th className="px-4 py-3 font-black">تالار / فضای کاری اصلی</th>
              <th className="px-4 py-3 font-black">عضویت‌ها</th>
              <th className="px-4 py-3 font-black">آخرین ورود</th>
              <th className="px-4 py-3 font-black">آخرین فعالیت</th>
              <th className="px-4 py-3 font-black">تیکت‌ها</th>
              <th className="px-4 py-3 font-black">سلامت</th>
              <th className="px-4 py-3 font-black">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8c478]/20 bg-white/70">
            {users.map((user) => (
              <tr key={user.id} className="align-top hover:bg-[#fffaf0]">
                <td className="px-4 py-3">
                  <Link href={user.availableActions.detailsHref} className="font-black text-[#172033] hover:text-[#9a6a15]">{user.fullName}</Link>
                  <p className="mt-1 text-[#7b6a4b]">{user.email}</p>
                  <p className="mt-1 text-[#8a795a]">{user.mobile || "موبایل ثبت نشده"}</p>
                </td>
                <td className="px-4 py-3"><StatusChip tone={user.roleTone}>{user.roleLabel}</StatusChip></td>
                <td className="px-4 py-3"><StatusChip tone={user.statusTone}>{user.statusLabel}</StatusChip></td>
                <td className="px-4 py-3 font-bold text-[#172033]">{user.primaryWorkspaceName}</td>
                <td className="px-4 py-3 font-bold text-[#6d5f49]">{formatPersianNumber(user.membershipsCount)} عضویت · {formatPersianNumber(user.ownedTenantsCount)} مالکیت</td>
                <td className="px-4 py-3 font-bold text-[#6d5f49]">{formatJalaliAuditDateTime(user.lastLoginAt)}</td>
                <td className="px-4 py-3 font-bold text-[#6d5f49]">{formatJalaliAuditDateTime(user.lastActivityAt)}</td>
                <td className="px-4 py-3"><StatusChip tone={user.openTicketsCount > 0 ? "rose" : "emerald"}>{formatPersianNumber(user.openTicketsCount)} باز</StatusChip></td>
                <td className="px-4 py-3"><StatusChip tone={user.health.tone}>{user.health.label}</StatusChip></td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2">
                    <Link href={user.availableActions.detailsHref} className="rounded-xl bg-[#172033] px-3 py-2 text-center font-black text-[#f0dba9]">مشاهده</Link>
                    <Link href={user.availableActions.ticketsHref} className="rounded-xl border border-[#d8c08b]/55 bg-white px-3 py-2 text-center font-black text-[#172033]">تیکت‌ها</Link>
                    <Link href={`${user.availableActions.detailsHref}#delete-user`} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center font-black text-rose-700">حذف</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminCard>
  );
}
