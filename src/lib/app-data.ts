import {
  BadgeCheck,
  Banknote,
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  HandCoins,
  ReceiptText,
  LayoutDashboard,
  LineChart,
  MessageSquareText,
  ShieldAlert,
  Settings2,
  LucideIcon,
  Sparkles,
  Users,
  Utensils,
  WalletCards,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

export const marketingFeatures = [
  {
    title: "مدیریت چند شعبه و چند سالن",
    description:
      "ساختار چندمستاجری برای هر تالار، با تفکیک اطلاعات پایه، کاربران، قراردادها و گزارش‌های مالی.",
  },
  {
    title: "قرارداد حرفه‌ای آماده توسعه",
    description:
      "تعریف سالن، منو، خدمات، روش دریافت و بندهای پیش‌فرض برای استفاده خودکار در ثبت قرارداد.",
  },
  {
    title: "کنترل مالی دقیق",
    description:
      "پایه گزارش‌گیری از دریافت‌ها، هزینه‌ها، دسته‌بندی‌های مالی و وضعیت قراردادها از روز اول آماده شده است.",
  },
];

export const pricingPlans = [
  {
    name: "دوره بررسی محدود",
    price: "رایگان",
    detail: "یک‌بار برای هر حساب کاربری",
  },
  {
    name: "اشتراک حرفه‌ای",
    price: "به‌زودی",
    detail: "فعال‌سازی فضای اختصاصی تالار بعد از خرید",
  },
];

export const businessInfoItem: NavItem = {
  title: "اطلاعات تالار",
  href: "/dashboard/hall-info",
  icon: BadgeCheck,
  description:
    "نشانی، مجوز، اطلاعات تماس و مشخصات رسمی تالار برای راه‌اندازی و پشتیبانی.",
};

export const baseConfigItems: NavItem[] = [
  {
    title: "تالارها",
    href: "/dashboard/base/halls",
    icon: Building2,
    description: "تعریف تالارها یا شعبه‌های مجموعه.",
  },
  {
    title: "سالن‌ها",
    href: "/dashboard/base/salons",
    icon: LayoutDashboard,
    description: "تعریف سالن‌ها، ظرفیت و موقعیت هر سالن.",
  },
  {
    title: "منوها",
    href: "/dashboard/base/menus",
    icon: Utensils,
    description: "تعریف پکیج‌ها، منوها و قیمت‌های پایه.",
  },
  {
    title: "خدمات",
    href: "/dashboard/base/services",
    icon: Sparkles,
    description: "خدمات اضافه، تشریفات، موسیقی، عکاسی و فیلم‌برداری، گل‌آرایی و موارد مشابه.",
  },
  {
    title: "تنظیمات قرارداد",
    href: "/dashboard/base/contract-settings",
    icon: FileText,
    description: "شماره‌گذاری، شروط پیش‌فرض و متن‌های قراردادی.",
  },
  {
    title: "روش‌های دریافت",
    href: "/dashboard/base/payment-methods",
    icon: CreditCard,
    description: "کارت‌خوان، نقدی، حواله، چک و روش‌های دریافت.",
  },
  {
    title: "دسته‌بندی مالی",
    href: "/dashboard/base/financial-categories",
    icon: WalletCards,
    description: "دسته‌بندی درآمدها، هزینه‌ها و گزارش‌های مالی.",
  },
];

export const managementItems: NavItem[] = [
  {
    title: "مشتریان",
    href: "/dashboard/customers",
    icon: Users,
    description: "پرونده مشتریان، شماره تماس و سوابق رزرو.",
  },
  {
    title: "قراردادها",
    href: "/dashboard/contracts",
    icon: ClipboardList,
    description: "ثبت قرارداد، وضعیت رزرو، تعداد مهمان و مبلغ نهایی.",
  },
  {
    title: "دریافتی‌ها",
    href: "/dashboard/payments",
    icon: Banknote,
    description: "دریافتی‌های مرتبط با قرارداد و روش دریافت.",
  },
  {
    title: "صورتحساب‌ها",
    href: "/dashboard/invoices",
    icon: ReceiptText,
    description: "مرکز صدور و پیگیری صورتحساب‌های بعد از مراسم.",
  },
  {
    title: "گزارش‌ها",
    href: "/dashboard/reports",
    icon: BarChart3,
    description: "تحلیل فروش، دریافت‌ها، هزینه‌ها و وضعیت مالی تالار.",
  },
];

export const ownerAuthorityItems: NavItem[] = [
  {
    title: "تنظیمات مالک",
    href: "/dashboard/settings/owner-operation",
    icon: Settings2,
    description: "تاریخ شروع محاسبات، مدل بهره‌برداری، سهم مالک، سهم کنسلی و حداقل تضمین ماهانه.",
  },
  {
    title: "نمای مالی مالک",
    href: "/dashboard/owner-financial-overview",
    icon: LineChart,
    description: "خلاصه سهم مالک، وضعیت تسویه، هشدارها، پرداخت خارج از فاکتور و اقدام‌های مهم ماهانه.",
  },
  {
    title: "تسویه مالک",
    href: "/dashboard/owner-settlements",
    icon: HandCoins,
    description: "محاسبه ماهانه سهم مالک از مراسم‌ها، کنسلی‌ها، خدمات اضافه و حداقل تضمین.",
  },
  {
    title: "کنترل مالی مالک",
    href: "/dashboard/owner-financial-audit",
    icon: ShieldAlert,
    description: "کشف پرداخت خارج از فاکتور، اختلاف نفرات، اعتراض مشتری و مراسم برگزارشده بدون صورتحساب.",
  },
];

export const secondaryOperationalItems: NavItem[] = [
  {
    title: "پیام‌ها",
    href: "/dashboard/messages",
    icon: MessageSquareText,
    description: "مرکز مشاهده پیام‌های ارسالی مشتری و مدیریت، خطاها و ارسال مجدد.",
  },
  {
    title: "باشگاه و مهمانان",
    href: "/dashboard/crm",
    icon: MessageSquareText,
    description: "لینک صاحب قرارداد، لینک مهمانان، نظرخواهی، باشگاه مشتریان و درخواست آهنگ.",
  },
  {
    title: "تقویم رزرو",
    href: "/dashboard/calendar",
    icon: CalendarDays,
    description: "نمای شمسی روزهای آزاد، رزرو شده، قراردادی و مسدود.",
  },
  {
    title: "هزینه‌ها",
    href: "/dashboard/expenses",
    icon: WalletCards,
    description: "ثبت هزینه‌ها بر اساس سرفصل مالی و تاریخ وقوع.",
  },
];

export const dashboardStats = [
  { label: "قراردادهای ماه", value: 24, trend: "۱۲٪ رشد" },
  { label: "مبلغ دریافتی", value: 860000000, trend: "ماه جاری" },
  { label: "رزروهای آینده", value: 18, trend: "۳۰ روز آینده" },
  { label: "هزینه ثبت‌شده", value: 140000000, trend: "ماه جاری" },
];
