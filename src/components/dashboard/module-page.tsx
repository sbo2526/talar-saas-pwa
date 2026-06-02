import { CheckCircle2, Plus, Sparkles } from "lucide-react";

type ModulePageProps = {
  title: string;
  description: string;
  badge: string;
  nextSteps: string[];
};

export function ModulePage({
  title,
  description,
  badge,
  nextSteps,
}: ModulePageProps) {
  return (
    <section className="space-y-7">
      <div className="overflow-hidden rounded-[2rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.20),transparent_20rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-5 text-[#111827] shadow-[0_28px_100px_rgba(17,24,39,0.12)] sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-4 py-2 text-sm font-black text-[#17483f]">
              <Sparkles size={17} />
              {badge}
            </div>
            <h1 className="mt-5 text-3xl font-black leading-tight text-[#111827] sm:text-4xl">
              {title}
            </h1>
            <p className="mt-4 max-w-3xl leading-8 text-[#6d5f49]">
              {description}
            </p>
          </div>
          <button className="btn-luxury-dark px-5 py-3">
            <Plus size={18} />
            افزودن
          </button>
        </div>
      </div>

      <div className="rounded-[2rem] border border-dashed border-[#c7a15a]/58 bg-[#fff9ee]/92 p-5 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.08)] sm:p-6">
        <h2 className="text-xl font-black">امکانات این بخش</h2>
        <p className="mt-3 leading-8 text-[#6d5f49]">
          این بخش برای مدیریت منظم عملیات تالار طراحی شده و امکانات اصلی آن به‌صورت مرحله‌ای در دسترس قرار می‌گیرد.
        </p>
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {nextSteps.map((step) => (
            <li
              key={step}
              className="flex items-start gap-3 rounded-[1.5rem] border border-[#d8c08b]/62 bg-[#fff8ea]/78 p-4 text-sm leading-7 text-[#111827]"
            >
              <CheckCircle2 className="mt-1 shrink-0 text-[#c7a15a]" size={17} />
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
