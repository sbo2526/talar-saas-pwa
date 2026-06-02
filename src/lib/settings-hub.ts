import {
  Activity,
  BadgeCheck,
  ArchiveRestore,
  BellRing,
  Bot,
  ClipboardList,
  FileCheck2,
  FileText,
  Settings2,
  KeyRound,
  LockKeyhole,
  LucideIcon,
  Mail,
  MessageSquareText,
  PhoneForwarded,
  ShieldCheck,
  UserCircle,
  Users,
  WalletCards,
} from "lucide-react";

export type SettingsHubItem = {
  title: string;
  description: string;
  href: string;
  cta: string;
  status: string;
  icon: LucideIcon;
};

export const settingsHubItems: SettingsHubItem[] = [
  {
    title: "تنظیمات کلی سامانه",
    description: "مرکز یکپارچه اطلاعات تالار، تعاریف پایه، اعلان‌ها، امنیت و پشتیبان‌گیری.",
    href: "/dashboard/settings/general",
    cta: "ورود به تنظیمات کلی",
    status: "هاب مدیریتی",
    icon: Settings2,
  },
  {
    title: "اطلاعات تالار",
    description: "نام تالار، لوگو، تماس، نشانی و متن‌های رسمی قابل نمایش در چاپ قرارداد.",
    href: "/dashboard/hall-info",
    cta: "ویرایش اطلاعات تالار",
    status: "هویت تالار",
    icon: BadgeCheck,
  },
  {
    title: "تعاریف پایه",
    description: "مدیریت خدمات مراسم، غذاها، سالن‌ها، روش‌های دریافت و دسته‌بندی‌های مالی.",
    href: "/dashboard/base",
    cta: "مدیریت تعاریف پایه",
    status: "کاتالوگ عملیاتی",
    icon: Settings2,
  },
  {
    title: "مدل مالک و پیمان",
    description:
      "تعریف نوع بهره‌برداری تالار، سهم مالک از مراسم، سهم مالک از کنسلی و حداقل تضمین ماهانه.",
    href: "/dashboard/settings/owner-operation",
    cta: "تنظیم مدل مالک",
    status: "کنترل مالی مالک",
    icon: WalletCards,
  },
  {
    title: "قفل ماه مالی",
    description:
      "بعد از تأیید یا پرداخت تسویه، عملیات مالی همان ماه قفل می‌شود تا فاکتور، اصلاح، پاسخ مشتری و تعیین وضعیت مراسم بی‌صدا تغییر نکند.",
    href: "/dashboard/monthly-close-lock",
    cta: "مشاهده قفل‌ها",
    status: "کنترل بستن ماه",
    icon: LockKeyhole,
  },
  {
    title: "سخت‌سازی فاکتور بعد از مراسم",
    description:
      "چک نهایی چرخه بعد از مراسم، وضعیت قفل‌ها، مسیرهای باز، خطاهای اعلان و حذف نمایش توکن خام مشتری از داشبورد.",
    href: "/dashboard/post-event-invoice-hardening",
    cta: "مشاهده چک نهایی",
    status: "Final hardening",
    icon: ShieldCheck,
  },
  {
    title: "تاریخچه فعالیت‌ها",
    description:
      "ردیابی امن ثبت‌ها، ویرایش‌ها، دریافتی‌ها، خروجی‌ها و تغییرات حساس سامانه.",
    href: "/dashboard/settings/activity",
    cta: "مشاهده تاریخچه",
    status: "لاگ عملیاتی",
    icon: Activity,
  },
  {
    title: "تنظیمات اعلان‌ها",
    description:
      "مدیریت اعلان‌های مدیریتی، تلگرام، پیامک، قالب پیام‌ها و لاگ ارسال‌ها.",
    href: "/dashboard/settings/notifications",
    cta: "ورود به اعلان‌ها",
    status: "مرکز اعلان‌ها",
    icon: BellRing,
  },
  {
    title: "تلگرام",
    description:
      "اتصال بات تلگرام برای دریافت اعلان قراردادها، دریافت‌ها، هزینه‌ها و گزارش‌ها.",
    href: "/dashboard/settings/telegram",
    cta: "تنظیم تلگرام",
    status: "آماده تنظیم",
    icon: Bot,
  },
  {
    title: "پیام‌رسان بله",
    description:
      "اتصال بازوی بله برای دریافت اعلان قراردادها، دریافت‌ها، هزینه‌ها و گزارش‌های مدیریتی.",
    href: "/dashboard/settings/bale",
    cta: "تنظیم بله",
    status: "آماده تنظیم",
    icon: Bot,
  },

  {
    title: "پیام‌رسان روبیکا",
    description:
      "اتصال بات روبیکا برای دریافت اعلان قراردادها، دریافت‌ها، هزینه‌ها و گزارش‌های مدیریتی.",
    href: "/dashboard/settings/rubika",
    cta: "تنظیم روبیکا",
    status: "آماده تنظیم",
    icon: Bot,
  },
  {
    title: "پنل پیامکی",
    description:
      "اتصال پنل پیامکی برای ارسال پیامک مدیریتی و پیامک‌های مشتریان.",
    href: "/dashboard/settings/sms",
    cta: "تنظیم پیامک",
    status: "آماده تنظیم",
    icon: PhoneForwarded,
  },
  {
    title: "ایمیل مدیریتی",
    description:
      "اتصال SMTP برای ارسال همه پیام‌های مدیریتی قرارداد، دریافت، هزینه، مشتری، امنیت و گزارش‌ها به ایمیل مالک/مدیر.",
    href: "/dashboard/settings/email",
    cta: "تنظیم ایمیل",
    status: "آماده تنظیم",
    icon: Mail,
  },
  {
    title: "قالب پیام‌ها",
    description:
      "ویرایش متن پیام‌های قرارداد، دریافت، هزینه، گزارش روزانه و یادآوری‌ها.",
    href: "/dashboard/settings/message-templates",
    cta: "مدیریت قالب‌ها",
    status: "متن پیام‌ها",
    icon: MessageSquareText,
  },
  {
    title: "پیام‌ها",
    description:
      "مشاهده پیام‌های مشتری و مدیریت، متن کامل، زمان ارسال، خطاها و ارسال مجدد پیام‌های ناموفق.",
    href: "/dashboard/messages",
    cta: "مشاهده پیام‌ها",
    status: "سوابق ارسال",
    icon: MessageSquareText,
  },

  {
    title: "تسویه گروهی قراردادهای قدیمی",
    description:
      "مالک می‌تواند قراردادهای قدیمی تا یک تاریخ مشخص را یک‌جا تسویه و برای مانده‌ها دریافت تسویه نهایی ثبت کند.",
    href: "/dashboard/settings/bulk-contract-settlement",
    cta: "شروع تسویه گروهی",
    status: "فقط مالک",
    icon: FileCheck2,
  },
  {
    title: "تعریف کاربران",
    description:
      "تعریف کاربران وابسته به همین تالار، تعیین نقش، وضعیت دسترسی و بازنشانی رمز عبور.",
    href: "/dashboard/settings/users",
    cta: "مدیریت کاربران",
    status: "کاربران و دسترسی‌ها",
    icon: Users,
  },
  {
    title: "امنیت",
    description:
      "تنظیمات امنیتی، دسترسی‌ها، ورودها و محافظت از اطلاعات حساس.",
    href: "/dashboard/settings/security",
    cta: "تنظیمات امنیتی",
    status: "محافظت حساب",
    icon: ShieldCheck,
  },
  {
    title: "پشتیبان‌گیری",
    description:
      "مدیریت خروجی اطلاعات، نسخه پشتیبان و بازیابی اطلاعات سامانه.",
    href: "/dashboard/settings/backups",
    cta: "مدیریت پشتیبان‌گیری",
    status: "حفظ اطلاعات",
    icon: ArchiveRestore,
  },
  {
    title: "حساب کاربری",
    description:
      "مشاهده و ویرایش اطلاعات کاربری، وضعیت اشتراک و اطلاعات حساب.",
    href: "/dashboard/account",
    cta: "مشاهده حساب",
    status: "پروفایل و اشتراک",
    icon: UserCircle,
  },
];

export const notificationChannelItems = settingsHubItems.filter((item) =>
  [
    "/dashboard/settings/telegram",
    "/dashboard/settings/bale",
    "/dashboard/settings/rubika",
    "/dashboard/settings/sms",
    "/dashboard/settings/email",
    "/dashboard/settings/message-templates",
    "/dashboard/messages",
    "/dashboard/settings/notification-logs",
  ].includes(item.href),
);

export const notificationEvents = [
  "ثبت قرارداد",
  "ثبت دریافت",
  "ثبت هزینه",
  "ثبت مشتری",
  "تغییر وضعیت قرارداد",
  "گزارش روزانه",
  "یادآوری مراسم",
];

export const messageTemplateGroups = [
  "قرارداد",
  "دریافت",
  "هزینه",
  "گزارش روزانه",
  "یادآوری مراسم",
  "پیامک مشتری",
];

export const messageTemplateVariables = [
  "{{tenantName}}",
  "{{currentDate}}",
  "{{currentDateTime}}",
  "{{operatorName}}",
  "{{userName}}",
  "{{userEmail}}",
  "{{customerName}}",
  "{{customerMobile}}",
  "{{customerNationalCode}}",
  "{{customerSupportPhone}}",
  "{{supportPhone}}",
  "{{hallAddress}}",
  "{{tenantAddress}}",
  "{{contractNumber}}",
  "{{eventType}}",
  "{{eventDate}}",
  "{{eventDay}}",
  "{{eventDateFull}}",
  "{{eventTime}}",
  "{{eventTimeRange}}",
  "{{guestCount}}",
  "{{contractStatus}}",
  "{{paymentStatus}}",
  "{{contractPaymentStatus}}",
  "{{finalTotal}}",
  "{{depositAmount}}",
  "{{paidAmount}}",
  "{{remainingAmount}}",
  "{{hallName}}",
  "{{salonName}}",
  "{{packageName}}",
  "{{contractNotes}}",
  "{{lineItemsSummary}}",
  "{{paymentAmount}}",
  "{{paymentType}}",
  "{{paymentMethod}}",
  "{{paidAt}}",
  "{{trackingCode}}",
  "{{referenceNumber}}",
  "{{expenseTitle}}",
  "{{expenseAmount}}",
  "{{expenseCategory}}",
  "{{expenseStatus}}",
  "{{occurredAt}}",
  "{{vendorName}}",
  "{{reportPeriod}}",
  "{{todayContractsCount}}",
  "{{todayEventsCount}}",
  "{{tomorrowEventsCount}}",
  "{{contractsCount}}",
  "{{paymentsCount}}",
  "{{expensesCount}}",
  "{{contractsTotal}}",
  "{{paymentsTotal}}",
  "{{expensesTotal}}",
  "{{estimatedProfit}}",
  "{{outstandingTotal}}",
  "{{outstandingContractsCount}}",
  "{{latestPaymentsSummary}}",
  "{{latestExpensesSummary}}",
  "{{upcomingEventsSummary}}",
  "{{outstandingBalancesSummary}}",
  "{{invoiceNumber}}",
  "{{payableAmount}}",
  "{{portalUrl}}",
];

export const telegramSetupSteps = [
  "ساخت بات از BotFather",
  "دریافت توکن بات",
  "افزودن بات به گفت‌وگو یا گروه مدیریتی",
  "ثبت شناسه گفت‌وگو در سامانه",
  "ارسال اعلان‌های مدیریتی پس از فعال‌سازی",
];

export const smsConfigurationFields = [
  "ارائه‌دهنده پیامک",
  "کلید API",
  "شماره ارسال‌کننده",
  "شماره مدیر",
  "ارسال پیامک تست",
];

export const securityOverviewCards = [
  {
    title: "تغییر رمز عبور",
    description: "مدیریت رمز ورود و افزایش امنیت حساب مدیران.",
    icon: KeyRound,
  },
  {
    title: "نشست‌های فعال",
    description: "بررسی دستگاه‌ها و نشست‌هایی که به سامانه دسترسی دارند.",
    icon: ShieldCheck,
  },
  {
    title: "اعلان ورودهای حساس",
    description: "اطلاع‌رسانی درباره ورودهای مهم و فعالیت‌های حساس.",
    icon: BellRing,
  },
  {
    title: "دسترسی مدیران",
    description: "مرور سطح دسترسی اعضای مدیریتی فضای کاری.",
    icon: UserCircle,
  },
];

export const backupOverviewCards = [
  {
    title: "خروجی اطلاعات",
    description: "دریافت خروجی از داده‌های مالی، قراردادها و مشتریان.",
    icon: FileText,
  },
  {
    title: "نسخه پشتیبان",
    description: "مدیریت نسخه‌های امن برای حفظ اطلاعات عملیاتی تالار.",
    icon: ArchiveRestore,
  },
  {
    title: "بازیابی اطلاعات",
    description: "مسیر کنترل‌شده برای بازیابی داده‌های ضروری سامانه.",
    icon: ShieldCheck,
  },
  {
    title: "تاریخچه خروجی‌ها",
    description: "مرور خروجی‌ها و نسخه‌هایی که برای مدیریت تهیه شده‌اند.",
    icon: ClipboardList,
  },
];

export const baleSetupSteps = [
  "ساخت بازو/بات بله از BotFather بله",
  "دریافت توکن بازو",
  "ارسال یک پیام به بازو یا افزودن بازو به گروه مدیریتی",
  "ثبت شناسه گفت‌وگو در سامانه",
  "ارسال اعلان‌های مدیریتی پس از فعال‌سازی",
];


export const rubikaSetupSteps = [
  "ساخت بات روبیکا از BotFather روبیکا",
  "دریافت توکن بات و نگهداری امن آن",
  "ارسال یک پیام به بات یا افزودن بات به گروه مدیریتی",
  "دریافت chat_id با getUpdates یا ورود دستی شناسه گفتگو",
  "ارسال اعلان‌های مدیریتی پس از فعال‌سازی",
];
