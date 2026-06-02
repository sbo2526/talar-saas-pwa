import { ArrowRight, Headset } from "lucide-react";
import Link from "next/link";
import { requireTenantMember } from "@/lib/auth/session";
import { SupportTicketForm } from "@/components/dashboard/support/support-ticket-form";

export default async function NewSupportTicketPage() {
  await requireTenantMember();

  return (
    <main className="space-y-6">
      <div className="rounded-[2.2rem] border border-[#e8c478]/32 bg-[linear-gradient(145deg,rgba(23,32,51,0.98),rgba(9,14,23,0.98))] p-6 text-[#fff8ea] shadow-[0_26px_80px_rgba(17,24,39,0.24)] sm:p-8">
        <Link href="/dashboard/support" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-black text-[#f0dba9] transition hover:bg-white/[0.12]"><ArrowRight size={15} /> بازگشت به پشتیبانی</Link>
        <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#e8c478]/28 bg-[#e8c478]/10 px-3 py-1 text-xs font-black text-[#f0dba9]"><Headset size={15} /> ثبت درخواست جدید</p>
        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">ثبت تیکت جدید</h1>
        <p className="mt-3 max-w-3xl text-sm font-bold leading-8 text-[#d9caa9]">موضوع، اولویت و شرح کامل درخواست را وارد کنید تا پیگیری در یک مکاتبه منظم انجام شود.</p>
      </div>
      <SupportTicketForm />
    </main>
  );
}
