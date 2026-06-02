import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronLeft,
  Crown,
  FileSignature,
  Gem,
  LayoutDashboard,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Utensils,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { startDemoAction } from "@/lib/actions/auth-actions";
import { getCurrentUser } from "@/lib/auth/session";
import { formatJalaliDate } from "@/lib/date/jalali";

type DemoPageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

type DemoFeature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const statusMessages: Record<string, { title: string; message: string }> = {
  "already-used": {
    title: "دوره بررسی این حساب قبلاً استفاده شده است",
    message:
      "برای ادامه استفاده، می‌توانید اشتراک خود را فعال کنید یا وارد داشبورد فضای کاری موجود شوید.",
  },
  failed: {
    title: "فعال‌سازی دوره بررسی کامل نشد",
    message:
      "شروع دوره بررسی با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید یا از مسیر مشاهده تعرفه‌ها ادامه دهید.",
  },
};

const heroBullets = [
  "ثبت قرارداد در فضای بررسی",
  "انتخاب منو و خدمات",
  "بررسی پرداخت‌ها و مانده حساب",
  "تجربه پنل مدیر تالار",
];

const demoFeatures: DemoFeature[] = [
  {
    title: "ثبت یک قرارداد در فضای بررسی",
    description:
      "مسیر ثبت قرارداد، مبلغ کل، بیعانه، مانده حساب و وضعیت تسویه را بدون ریسک بررسی کنید.",
    icon: FileSignature,
  },
  {
    title: "بررسی تعرفه سالن و خدمات",
    description:
      "تعرفه سالن، ظرفیت، خدمات پایه و موارد قراردادی را مثل یک سناریوی واقعی مرور کنید.",
    icon: Building2,
  },
  {
    title: "انتخاب منو و خدمات جانبی",
    description:
      "غذا، پذیرایی، خدمات جانبی و آیتم‌هایی را ببینید که بعداً داخل قرارداد انتخاب می‌شوند.",
    icon: Utensils,
  },
  {
    title: "بررسی بیعانه، اقساط و مانده حساب",
    description:
      "دریافت‌ها، بدهی، مانده تسویه، دسته‌بندی مالی و مسیر گزارش‌های مدیریتی را بررسی کنید.",
    icon: WalletCards,
  },
  {
    title: "تجربه پنل مدیر تالار",
    description:
      "چیدمان پنل، مسیرهای اصلی و سرعت دسترسی به بخش‌های روزمره مدیریت تالار را ببینید.",
    icon: LayoutDashboard,
  },
  {
    title: "کنترل وضعیت‌ها و دسترسی‌ها",
    description:
      "وضعیت حساب، مسیر فعال‌سازی، فضای اختصاصی و کنترل‌های پایه سامانه را واضح‌تر بررسی کنید.",
    icon: ShieldCheck,
  },
];

const demoRules = [
  "برای فعال‌سازی دوره بررسی باید وارد حساب شوید یا حساب جدید بسازید.",
  "دوره بررسی برای هر حساب فقط یک‌بار فعال می‌شود و برای بررسی امکانات قبل از خرید است.",
  "فضای بررسی رایگان برای آشنایی با مسیرهای اصلی سامانه است و جایگزین فضای عملیاتی تالار نیست.",
  "پس از بررسی دوره بررسی، می‌توانید تعرفه مناسب را انتخاب و فضای واقعی تالار را فعال کنید.",
];

const processSteps = [
  {
    title: "ورود یا ساخت حساب",
    description:
      "برای فعال‌سازی دوره بررسی، ابتدا وارد حساب شوید یا یک حساب جدید بسازید.",
  },
  {
    title: "فعال‌سازی دوره بررسی رایگان",
    description:
      "با یک کلیک، فضای بررسی حساب شما آماده می‌شود و امکانات اصلی را بررسی می‌کنید.",
  },
  {
    title: "انتخاب تعرفه و شروع واقعی",
    description:
      "پس از بررسی دوره بررسی، تعرفه مناسب را انتخاب می‌کنید و فضای واقعی تالار فعال می‌شود.",
  },
];

const demoStatusItems = [
  ["نوع دوره بررسی", "رایگان"],
  ["نوع فضا", "بررسی رایگان"],
  ["محدودیت", "یک‌بار برای هر حساب"],
  ["ادامه مسیر", "انتخاب تعرفه"],
];

const activationTrustBullets = [
  "دوره بررسی رایگان قبل از خرید",
  "بدون نیاز به پرداخت اولیه",
  "فعال‌سازی فقط یک‌بار برای هر حساب",
  "امکان انتخاب تعرفه پس از بررسی",
];

const activationStatusItems = [
  ["دوره بررسی", "رایگان برای بررسی"],
  ["نوع فضا", "بررسی رایگان"],
  ["محدودیت", "یک‌بار برای هر حساب"],
  ["ادامه مسیر", "انتخاب تعرفه"],
];

export default async function DemoPage({ searchParams }: DemoPageProps) {
  const user = await getCurrentUser();
  const resolvedSearchParams = await searchParams;
  const status = resolvedSearchParams.status;
  const statusMessage = status ? statusMessages[status] : null;
  const alreadyUsed = status === "already-used";
  const today = new Date();

  return (
    <main
      dir="rtl"
      className="talar-demo-page font-sans isolate min-h-screen overflow-hidden bg-[#070b12] text-[#fff8ea]"
    >
      <LuxuryBackground />

      <section className="demo-top-nav-section relative px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <div className="demo-top-nav mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-[1.5rem] border border-[#e8c478]/20 bg-[#070b12]/70 px-4 py-3 shadow-[0_18px_70px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl border border-[#e8c478]/35 bg-[#e8c478]/10 text-[#f0dba9]">
              <Gem size={21} />
            </span>
            <span>
              <span className="block text-lg font-black text-[#fff4d5]">
                تالار منیجر
              </span>
              <span className="hidden text-xs font-bold text-[#d9caa9] sm:block">
                سامانه لوکس مدیریت تالار
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden rounded-2xl border border-white/[0.10] bg-white/[0.05] px-4 py-2 text-sm font-black text-[#eadcc0] backdrop-blur-xl hover:border-[#e8c478]/35 hover:text-[#f0dba9] sm:inline-flex"
            >
              صفحه اصلی
            </Link>
            <Link
              href="/purchase"
              className="btn-luxury-primary min-h-0 rounded-2xl px-4 py-2 text-sm"
            >
              مشاهده تعرفه‌ها
              <ChevronLeft size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="demo-hero-section relative px-4 pb-20 sm:px-6 lg:px-8">
        <div className="absolute inset-x-0 top-20 -z-10 mx-auto h-96 max-w-6xl rounded-full bg-[#e8c478]/10 blur-3xl" />

        <div className="demo-hero-grid mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_0.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8c478]/35 bg-[#e8c478]/12 px-4 py-2 text-sm font-black text-[#ffe8ad] shadow-[0_0_50px_rgba(232,196,120,0.16)] backdrop-blur-2xl">
              <Crown size={18} />
              دوره بررسی رایگان مدیریت تالار
            </div>

            <h1 className="mt-7 max-w-4xl text-4xl font-black leading-[1.18] tracking-normal text-[#fff9ed] drop-shadow-2xl sm:text-5xl lg:text-6xl">
              دوره بررسی رایگان تالار منیجر را فعال کنید
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-9 text-[#eadcc0] sm:text-xl">
              قبل از خرید اشتراک، وارد فضای بررسی شوید و ثبت قرارداد، رزرو، خدمات، منوها، پرداخت‌ها و گزارش‌های مدیریتی را بررسی کنید.
            </p>

            <div className="demo-hero-bullets mt-7 grid max-w-2xl gap-3 sm:grid-cols-2">
              {heroBullets.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/[0.10] bg-white/[0.06] px-4 py-3 text-sm font-black text-[#f3dfb7] backdrop-blur-xl"
                >
                  <CheckCircle2 className="ml-2 inline text-[#d9b86f]" size={17} />
                  {item}
                </div>
              ))}
            </div>

            <div className="demo-hero-note mt-7 rounded-[1.5rem] border border-[#e8c478]/24 bg-[#e8c478]/[0.08] px-5 py-4 text-sm font-bold leading-8 text-[#f3dfb7] shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
              برای فعال‌سازی دوره بررسی باید وارد حساب شوید. اگر هنوز حساب ندارید، ابتدا ثبت‌نام کنید؛ دوره بررسی برای هر حساب فقط یک‌بار فعال می‌شود.
            </div>

            <div className="demo-cta-row mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="#activate-demo" className="btn-luxury-primary px-7 py-3">
                {user ? "فعال‌سازی دوره بررسی رایگان" : "ورود و فعال‌سازی دوره بررسی"}
                <ArrowLeft size={19} />
              </Link>
              <Link
                href={user ? "/purchase" : "/register"}
                className="btn-luxury-secondary px-7 py-3"
              >
                {user ? "مشاهده تعرفه‌ها" : "ساخت حساب جدید"}
              </Link>
            </div>
          </div>

          <DemoStatusMockup today={today} userIsLoggedIn={Boolean(user)} />
        </div>
      </section>

      <section className="demo-section relative px-4 py-[5rem] sm:px-6 lg:px-8">
        <div className="absolute inset-x-0 top-16 -z-10 mx-auto h-72 max-w-5xl rounded-full bg-[#17483f]/30 blur-3xl" />
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="مسیر شروع"
            title="مسیر روشن فعال‌سازی دوره بررسی"
            description="مسیر ساده است: ورود یا ثبت‌نام، فعال‌سازی دوره بررسی، بررسی امکانات و سپس انتخاب تعرفه مناسب."
          />

          <div className="demo-process-grid mt-11 grid gap-5 lg:grid-cols-3">
            {processSteps.map((step, index) => (
              <article
                key={step.title}
                className="demo-step-card relative overflow-hidden rounded-[2rem] border border-[#e8c478]/24 bg-[linear-gradient(150deg,rgba(255,249,238,0.14),rgba(255,249,238,0.055))] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-2xl"
              >
                <div className="absolute -left-10 -top-10 h-24 w-24 rounded-full bg-[#d9b86f]/16 blur-2xl" />
                <p className="text-4xl font-black text-[#f0dba9]">
                  {["۰۱", "۰۲", "۰۳"][index]}
                </p>
                <h3 className="mt-5 text-xl font-black text-[#fff9ed]">
                  {step.title}
                </h3>
                <p className="mt-3 leading-8 text-[#d9caa9]">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="demo-section relative px-4 py-[5rem] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="امکانات قابل بررسی"
            title="داخل دوره بررسی دقیقاً چه چیزهایی را می‌بینید؟"
            description="بعد از ورود، امکانات اصلی تالار منیجر را در فضای بررسی می‌بینید؛ از قرارداد و رزرو تا منو، خدمات، پرداخت‌ها و گزارش‌های مالی."
          />

          <div className="demo-features-grid mt-11 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {demoFeatures.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="demo-section relative px-4 py-[5rem] sm:px-6 lg:px-8">
        <div className="demo-rules-layout mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="demo-rules-intro rounded-[2rem] border border-[#e8c478]/24 bg-[#101825]/82 p-7 shadow-[0_30px_110px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <div className="inline-flex size-14 items-center justify-center rounded-2xl border border-[#e8c478]/35 bg-[#e8c478]/12 text-[#f0dba9]">
              <LockKeyhole size={27} />
            </div>
            <h2 className="mt-6 text-3xl font-black leading-tight text-[#fff9ed] sm:text-4xl">
              شرایط استفاده از دوره بررسی
            </h2>
            <p className="mt-4 leading-8 text-[#d9caa9]">
              قانون دوره بررسی ساده است: ابتدا وارد حساب می‌شوید، یک‌بار دوره بررسی را فعال می‌کنید، امکانات را بررسی می‌کنید و بعد برای خرید تصمیم می‌گیرید.
            </p>
          </div>

          <div className="demo-rules-grid grid gap-4 md:grid-cols-2">
            {demoRules.map((rule, index) => (
              <article
                key={rule}
                className="demo-rule-card relative overflow-hidden rounded-[1.75rem] border border-[#e8c478]/22 bg-[linear-gradient(145deg,rgba(255,248,234,0.11),rgba(255,248,234,0.045))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-2xl"
              >
                <span className="absolute -left-5 -top-5 h-20 w-20 rounded-full bg-[#e8c478]/10 blur-2xl" />
                <p className="text-3xl font-black text-[#f0dba9]">
                  {["۰۱", "۰۲", "۰۳", "۰۴"][index]}
                </p>
                <p className="mt-4 leading-8 text-[#fff0cf]">{rule}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="activate-demo"
        className="demo-activation-section relative scroll-mt-8 px-4 py-[5rem] sm:px-6 lg:px-8"
      >
        <div className="absolute inset-x-0 top-12 -z-10 mx-auto h-80 max-w-6xl rounded-full bg-[#e8c478]/14 blur-3xl" />
        <div className="mx-auto max-w-7xl">
          <div className="demo-section-heading mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8c478]/30 bg-[#e8c478]/10 px-4 py-2 text-sm font-black text-[#f0dba9]">
              <ShieldCheck size={17} />
              فعال‌سازی امن دوره بررسی رایگان
            </div>
            <h2 className="mt-5 text-3xl font-black leading-tight text-[#fff9ed] sm:text-4xl">
              دوره بررسی رایگان را برای حساب خود فعال کنید
            </h2>
            <p className="mt-4 leading-9 text-[#d9caa9]">
              برای فعال‌سازی دوره بررسی باید وارد حساب شوید. اگر هنوز حساب ندارید، ابتدا ثبت‌نام کنید؛ سپس با یک کلیک فضای بررسی شما آماده می‌شود.
            </p>
          </div>

          {statusMessage ? (
            <StatusNotice
              title={statusMessage.title}
              message={statusMessage.message}
              tone={alreadyUsed ? "warning" : "error"}
            />
          ) : null}

          <ActivationPanel
            today={today}
            userIsLoggedIn={Boolean(user)}
            alreadyUsed={alreadyUsed}
          />

          <div className="demo-note-card mt-5 rounded-[1.75rem] border border-[#e8c478]/24 bg-[linear-gradient(145deg,rgba(255,248,234,0.12),rgba(255,248,234,0.05))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[#e8c478]/30 bg-[#e8c478]/10 text-[#f0dba9]">
                <Sparkles size={22} />
              </div>
              <div>
                <h3 className="text-xl font-black text-[#fff9ed]">
                  نکته مهم درباره دوره بررسی
                </h3>
                <p className="mt-2 leading-8 text-[#d9caa9]">
                  دوره بررسی برای بررسی اولیه طراحی شده است. برای استفاده عملیاتی، ثبت قرارداد واقعی و مدیریت کامل تالار، پس از بررسی باید اشتراک فعال شود.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="demo-final-section relative px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <div className="demo-final-card mx-auto max-w-7xl overflow-hidden rounded-[2.25rem] border border-[#e8c478]/30 bg-[radial-gradient(circle_at_12%_0%,rgba(232,196,120,0.22),transparent_20rem),linear-gradient(135deg,rgba(23,35,51,0.97),rgba(8,13,20,0.98))] p-7 shadow-[0_36px_130px_rgba(0,0,0,0.36)] sm:p-10 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#e8c478]/28 bg-[#e8c478]/10 px-4 py-2 text-sm font-black text-[#f0dba9]">
                <Sparkles size={17} />
                تصمیم با اطمینان
              </div>
              <h2 className="mt-5 text-3xl font-black leading-tight text-[#fff9ed] sm:text-4xl">
                آماده‌اید سامانه را در عمل ببینید؟
              </h2>
              <p className="mt-4 max-w-3xl leading-9 text-[#d9caa9]">
                ابتدا وارد حساب شوید یا حساب جدید بسازید، سپس دوره بررسی رایگان را فعال کنید و قبل از خرید، سامانه را در عمل بررسی کنید.
              </p>
            </div>
            <div className="demo-cta-row flex flex-col gap-3 sm:flex-row">
              <Link href="#activate-demo" className="btn-luxury-primary px-7 py-3">
                {user ? "فعال‌سازی دوره بررسی رایگان" : "ورود و فعال‌سازی دوره بررسی"}
                <ArrowLeft size={18} />
              </Link>
              <Link
                href={user ? "/purchase" : "/register"}
                className="btn-luxury-secondary px-7 py-3"
              >
                {user ? "مشاهده تعرفه‌ها" : "ساخت حساب جدید"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function LuxuryBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_12%,rgba(232,196,120,0.16),transparent_25rem),radial-gradient(circle_at_92%_18%,rgba(23,72,63,0.28),transparent_28rem),linear-gradient(135deg,#050810_0%,#0a1019_48%,#111a28_100%)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="absolute inset-0 opacity-[0.09] [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.55)_0.6px,transparent_0.8px)] [background-size:18px_18px]" />
    </div>
  );
}

function DemoStatusMockup({
  today,
  userIsLoggedIn,
}: {
  today: Date;
  userIsLoggedIn: boolean;
}) {
  const currentStatus = userIsLoggedIn
    ? "آماده فعال‌سازی"
    : "نیازمند ورود";
  const nextStep = userIsLoggedIn
    ? "فعال‌سازی دوره بررسی رایگان"
    : "ورود یا ساخت حساب";

  return (
    <div className="demo-status-mockup relative mx-auto w-full max-w-xl">
      <div className="absolute -inset-5 rounded-[2.5rem] bg-[conic-gradient(from_140deg,rgba(232,196,120,0.28),rgba(23,72,63,0.16),transparent,rgba(232,196,120,0.22))] blur-2xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-[#e8c478]/30 bg-[linear-gradient(145deg,rgba(14,22,34,0.94),rgba(7,11,18,0.94))] p-5 shadow-[0_38px_140px_rgba(0,0,0,0.46)] backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-[#f0dba9]">
              وضعیت شما در دوره بررسی
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#fff9ed]">
              {currentStatus}
            </h2>
            <p className="mt-2 text-sm font-bold leading-7 text-[#d9caa9]">
              قدم بعدی: {nextStep}
            </p>
          </div>
          <span className="rounded-2xl border border-[#25a46d]/30 bg-[#25a46d]/12 px-3 py-2 text-xs font-black text-[#a9f2cf]">
            رایگان قبل از خرید
          </span>
        </div>

        <div className="mt-5 rounded-3xl border border-[#e8c478]/22 bg-[#e8c478]/[0.08] p-4">
          <p className="text-sm font-black text-[#f0dba9]">
            برای فعال‌سازی چه لازم است؟
          </p>
          <p className="mt-2 text-sm font-bold leading-7 text-[#eadcc0]">
            {userIsLoggedIn
              ? "حساب شما آماده است؛ از بخش فعال‌سازی می‌توانید دوره بررسی را شروع کنید."
              : "ابتدا وارد حساب شوید یا حساب جدید بسازید؛ بعد دوره بررسی فقط یک‌بار برای همان حساب فعال می‌شود."}
          </p>
        </div>

        <div className="gold-divider my-5" />

        <div className="demo-status-grid grid gap-3 sm:grid-cols-2">
          {demoStatusItems.map(([label, value]) => (
            <div
              key={label}
              className="rounded-3xl border border-white/[0.10] bg-[#fff8ea]/[0.07] p-4"
            >
              <p className="text-xs font-black text-[#cfc0a0]">{label}</p>
              <p className="mt-2 text-base font-black text-[#fff9ed]">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-3xl border border-white/[0.10] bg-white/[0.045] p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-black text-[#eadcc0]">
              نمونه تاریخ
            </span>
            <span className="text-sm font-black text-[#f0dba9]">
              {formatJalaliDate(today)}
            </span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {["قرارداد", "رزرو", "مالی"].map((item) => (
              <span
                key={item}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.045] px-3 py-2 text-center text-xs font-black text-[#fff0cf]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ feature }: { feature: DemoFeature }) {
  const Icon = feature.icon;

  return (
    <article className="demo-feature-card group relative overflow-hidden rounded-[1.75rem] border border-[#e8c478]/22 bg-[linear-gradient(145deg,rgba(255,248,234,0.11),rgba(255,248,234,0.045))] p-6 shadow-[0_26px_95px_rgba(0,0,0,0.24)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-[#e8c478]/45">
      <div className="absolute -left-12 -top-12 h-28 w-28 rounded-full bg-[#d9b86f]/10 blur-2xl transition group-hover:bg-[#d9b86f]/18" />
      <div className="flex size-12 items-center justify-center rounded-2xl border border-[#e8c478]/28 bg-[#e8c478]/10 text-[#f0dba9]">
        <Icon size={24} />
      </div>
      <h3 className="mt-6 text-xl font-black text-[#fff9ed]">
        {feature.title}
      </h3>
      <p className="mt-3 leading-8 text-[#d9caa9]">{feature.description}</p>
    </article>
  );
}

function ActivationPanel({
  today,
  userIsLoggedIn,
  alreadyUsed,
}: {
  today: Date;
  userIsLoggedIn: boolean;
  alreadyUsed: boolean;
}) {
  return (
    <div className="demo-activation-panel mt-10 overflow-hidden rounded-[2.35rem] border border-[#e8c478]/34 bg-[radial-gradient(circle_at_12%_0%,rgba(232,196,120,0.24),transparent_20rem),radial-gradient(circle_at_88%_26%,rgba(23,72,63,0.28),transparent_24rem),linear-gradient(145deg,rgba(255,248,234,0.14),rgba(12,19,30,0.96))] p-5 shadow-[0_38px_140px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-7 lg:p-8">
      <div className="grid gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <div className="demo-activation-copy rounded-[1.85rem] border border-white/[0.10] bg-white/[0.055] p-6 backdrop-blur-2xl sm:p-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e8c478]/28 bg-[#e8c478]/10 px-3 py-1.5 text-xs font-black text-[#f0dba9]">
            <LockKeyhole size={15} />
            قانون دوره بررسی رایگان
          </div>
          <h3 className="mt-5 text-3xl font-black leading-tight text-[#fff9ed]">
            آماده شروع بررسی سامانه هستید؟
          </h3>
          <p className="mt-4 leading-8 text-[#d9caa9]">
            دوره بررسی فقط یک‌بار برای هر حساب فعال می‌شود. پس از فعال‌سازی،
            می‌توانید امکانات اصلی سامانه را در فضای بررسی رایگان مشاهده کنید.
          </p>

          <div className="demo-trust-grid mt-6 grid gap-3 sm:grid-cols-2">
            {activationTrustBullets.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[#e8c478]/18 bg-[#fff8ea]/[0.07] px-4 py-3 text-sm font-black text-[#fff0cf]"
              >
                <CheckCircle2
                  className="ml-2 inline text-[#d9b86f]"
                  size={17}
                />
                {item}
              </div>
            ))}
          </div>

          <div className="gold-divider my-7" />

          <ActivationStateCta
            userIsLoggedIn={userIsLoggedIn}
            alreadyUsed={alreadyUsed}
          />
        </div>

        <ActivationStatusPanel
          today={today}
          userIsLoggedIn={userIsLoggedIn}
          alreadyUsed={alreadyUsed}
        />
      </div>
    </div>
  );
}

function ActivationStateCta({
  userIsLoggedIn,
  alreadyUsed,
}: {
  userIsLoggedIn: boolean;
  alreadyUsed: boolean;
}) {
  if (!userIsLoggedIn) {
    return (
      <div>
        <h4 className="text-2xl font-black text-[#fff9ed]">
          برای فعال‌سازی دوره بررسی، وارد حساب شوید
        </h4>
        <p className="mt-3 leading-8 text-[#d9caa9]">
          دوره بررسی فقط روی حساب کاربری فعال می‌شود تا وضعیت استفاده و مسیر خرید شما مشخص بماند.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/login" className="btn-luxury-primary px-7 py-3">
            ورود و فعال‌سازی دوره بررسی
          </Link>
          <Link href="/register" className="btn-luxury-secondary px-7 py-3">
            ساخت حساب جدید
          </Link>
        </div>
      </div>
    );
  }

  if (alreadyUsed) {
    return (
      <div>
        <h4 className="text-2xl font-black text-[#fff9ed]">
          دوره بررسی این حساب قبلاً استفاده شده است
        </h4>
        <p className="mt-3 leading-8 text-[#d9caa9]">
          برای ادامه استفاده از تالار منیجر، می‌توانید اشتراک خود را فعال
          کنید.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/purchase" className="btn-luxury-primary px-7 py-3">
            مشاهده تعرفه‌ها
          </Link>
          <Link href="/dashboard" className="btn-luxury-secondary px-7 py-3">
            ورود به داشبورد
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-2xl font-black text-[#fff9ed]">
        دوره بررسی رایگان شما آماده فعال‌سازی است
      </h4>
      <p className="mt-3 leading-8 text-[#d9caa9]">
        با کلیک روی دکمه زیر، فضای بررسی شما برای مشاهده امکانات اصلی سامانه ایجاد می‌شود.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <form action={startDemoAction}>
          <button className="btn-luxury-primary px-7 py-3">
            فعال‌سازی دوره بررسی رایگان
            <ArrowLeft size={18} />
          </button>
        </form>
        <Link href="/purchase" className="btn-luxury-secondary px-7 py-3">
          مشاهده تعرفه‌ها
        </Link>
      </div>
      <p className="mt-4 text-sm font-bold text-[#cfc0a0]">
        پس از فعال‌سازی، دوره بررسی برای همین حساب ثبت می‌شود و مسیر بررسی شما شروع می‌شود.
      </p>
    </div>
  );
}

function ActivationStatusPanel({
  today,
  userIsLoggedIn,
  alreadyUsed,
}: {
  today: Date;
  userIsLoggedIn: boolean;
  alreadyUsed: boolean;
}) {
  const accountStatus = !userIsLoggedIn
    ? "نیازمند ورود"
    : alreadyUsed
      ? "دوره بررسی مصرف شده"
      : "آماده فعال‌سازی";
  const nextStep = !userIsLoggedIn
    ? "ورود یا ثبت‌نام"
    : alreadyUsed
      ? "انتخاب تعرفه"
      : "شروع دوره بررسی";

  return (
    <div className="demo-activation-status relative overflow-hidden rounded-[1.85rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(14,22,34,0.96),rgba(7,11,18,0.96))] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.28)]">
      <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-[#d9b86f]/16 blur-3xl" />
      <div className="absolute -bottom-16 -right-16 h-36 w-36 rounded-full bg-[#17483f]/30 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-[#f0dba9]">
              وضعیت دسترسی شما
            </p>
            <h3 className="mt-2 text-2xl font-black text-[#fff9ed]">
              {accountStatus}
            </h3>
            <p className="mt-2 text-sm font-bold text-[#d9caa9]">
              قدم بعدی: {nextStep}
            </p>
          </div>
          <span className="rounded-2xl border border-[#25a46d]/30 bg-[#25a46d]/12 px-3 py-2 text-xs font-black text-[#a9f2cf]">
            امن و کنترل‌شده
          </span>
        </div>

        <div className="gold-divider my-5" />

        <div className="demo-status-grid grid gap-3 sm:grid-cols-2">
          {activationStatusItems.map(([label, value]) => (
            <div
              key={label}
              className="rounded-3xl border border-white/[0.10] bg-[#fff8ea]/[0.07] p-4"
            >
              <p className="text-xs font-black text-[#cfc0a0]">{label}</p>
              <p className="mt-2 text-base font-black text-[#fff9ed]">
                {value}
              </p>
            </div>
          ))}
          <div className="rounded-3xl border border-[#e8c478]/20 bg-[#e8c478]/[0.08] p-4 sm:col-span-2">
            <p className="text-xs font-black text-[#cfc0a0]">تاریخ امروز</p>
            <p className="mt-2 text-base font-black text-[#fff9ed]">
              {formatJalaliDate(today)}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-white/[0.10] bg-white/[0.045] p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-black text-[#eadcc0]">
              مسیر پس از دوره بررسی
            </span>
            <span className="text-sm font-black text-[#f0dba9]">
              انتخاب تعرفه
            </span>
          </div>
          <p className="mt-3 text-sm leading-7 text-[#cfc0a0]">
            دوره بررسی برای بررسی است؛ برای استفاده واقعی، ثبت قرارداد عملیاتی و مدیریت کامل تالار باید فضای واقعی اشتراک فعال شود.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusNotice({
  title,
  message,
  tone,
}: {
  title: string;
  message: string;
  tone: "warning" | "error";
}) {
  return (
    <div
      className={`demo-status-notice mx-auto mt-8 max-w-5xl rounded-[1.5rem] border p-5 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-2xl ${
        tone === "warning"
          ? "border-[#e8c478]/32 bg-[#e8c478]/10"
          : "border-[#f87171]/30 bg-[#7f1d1d]/20"
      }`}
    >
      <p className="text-lg font-black text-[#fff9ed]">{title}</p>
      <p className="mt-2 leading-8 text-[#d9caa9]">{message}</p>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="demo-section-heading mx-auto max-w-3xl text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#e8c478]/25 bg-[#e8c478]/10 px-4 py-2 text-sm font-black text-[#f0dba9]">
        <BadgeCheck size={17} />
        {eyebrow}
      </div>
      <h2 className="mt-5 text-3xl font-black leading-tight text-[#fff9ed] sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 leading-8 text-[#d9caa9]">{description}</p>
    </div>
  );
}
