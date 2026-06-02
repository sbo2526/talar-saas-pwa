import {
  type NotificationChannel,
  type NotificationEventType,
  isNotificationChannel,
  isNotificationEventType,
} from "@/lib/notifications/constants";
import { formatCustomerSupportPhones } from "@/lib/notifications/support-contact";

type TemplateDefinition = { title: string; body: string };
type TemplateMap = Partial<Record<NotificationEventType, TemplateDefinition>>;

function lines(items: string[]) {
  return items.join("\n");
}

const ownerMessengerTemplates: TemplateMap = {
  CONTRACT_CREATED: {
    title: "ثبت قرارداد جدید",
    body: lines([
      "قرارداد جدید ثبت شد | {{tenantName}}",
      "قرارداد: {{contractNumber}}",
      "مشتری: {{customerName}} | {{customerMobile}}",
      "مراسم: {{eventType}}",
      "زمان: {{eventDateFull}}، {{eventTimeRange}}",
      "سالن: {{salonName}} | مهمان: {{guestCount}} نفر",
      "مالی: کل {{finalTotal}} | پرداخت‌شده {{paidAmount}} | مانده {{remainingAmount}}",
      "ثبت‌کننده: {{operatorName}}",
    ]),
  },
  CONTRACT_UPDATED: {
    title: "ویرایش قرارداد",
    body: lines([
      "قرارداد ویرایش شد | {{tenantName}}",
      "قرارداد: {{contractNumber}}",
      "مشتری: {{customerName}} | {{customerMobile}}",
      "مراسم: {{eventType}} | {{eventDateFull}}",
      "وضعیت فعلی: {{contractStatus}}",
      "مالی: کل {{finalTotal}} | پرداخت‌شده {{paidAmount}} | مانده {{remainingAmount}}",
      "ویرایش‌کننده: {{operatorName}}",
    ]),
  },
  CONTRACT_STATUS_CHANGED: {
    title: "تغییر وضعیت قرارداد",
    body: lines([
      "وضعیت قرارداد تغییر کرد | {{tenantName}}",
      "قرارداد: {{contractNumber}}",
      "مشتری: {{customerName}} | {{customerMobile}}",
      "وضعیت جدید: {{contractStatus}}",
      "مراسم: {{eventType}} | {{eventDateFull}}",
      "سالن: {{salonName}}",
      "مانده فعلی: {{remainingAmount}}",
      "اپراتور: {{operatorName}}",
    ]),
  },
  CONTRACT_CANCELED: {
    title: "لغو قرارداد",
    body: lines([
      "قرارداد لغو و بسته شد | {{tenantName}}",
      "قرارداد: {{contractNumber}}",
      "مشتری: {{customerName}} | {{customerMobile}}",
      "مراسم: {{eventType}} | {{eventDateFull}}",
      "دریافت‌شده: {{paidAmount}}",
      "مانده قابل پیگیری: {{remainingAmount}}",
      "لغوکننده: {{operatorName}}",
    ]),
  },
  PAYMENT_CREATED: {
    title: "ثبت دریافت جدید",
    body: lines([
      "دریافت جدید ثبت شد | {{tenantName}}",
      "مبلغ: {{paymentAmount}}",
      "قرارداد: {{contractNumber}}",
      "مشتری: {{customerName}} | {{customerMobile}}",
      "روش: {{paymentMethod}} | نوع: {{paymentType}}",
      "کد پیگیری: {{trackingCode}}",
      "مانده قرارداد: {{remainingAmount}}",
      "ثبت‌کننده: {{operatorName}}",
    ]),
  },
  PAYMENT_UPDATED: {
    title: "ویرایش دریافت",
    body: lines([
      "دریافت ویرایش شد | {{tenantName}}",
      "مبلغ فعلی: {{paymentAmount}}",
      "قرارداد: {{contractNumber}}",
      "مشتری: {{customerName}} | {{customerMobile}}",
      "روش: {{paymentMethod}} | وضعیت: {{paymentStatus}}",
      "مانده فعلی قرارداد: {{remainingAmount}}",
      "ویرایش‌کننده: {{operatorName}}",
    ]),
  },
  PAYMENT_CANCELED: {
    title: "لغو دریافت",
    body: lines([
      "دریافت لغو شد | {{tenantName}}",
      "مبلغ لغوشده: {{paymentAmount}}",
      "قرارداد: {{contractNumber}}",
      "مشتری: {{customerName}} | {{customerMobile}}",
      "روش: {{paymentMethod}}",
      "پرداخت‌شده فعلی: {{paidAmount}}",
      "مانده فعلی: {{remainingAmount}}",
      "لغوکننده: {{operatorName}}",
    ]),
  },
  EXPENSE_CREATED: {
    title: "ثبت هزینه جدید",
    body: lines([
      "هزینه جدید ثبت شد | {{tenantName}}",
      "عنوان: {{expenseTitle}}",
      "مبلغ: {{expenseAmount}}",
      "دسته: {{expenseCategory}}",
      "طرف حساب: {{vendorName}}",
      "روش پرداخت: {{paymentMethod}}",
      "قرارداد مرتبط: {{contractNumber}}",
      "ثبت‌کننده: {{operatorName}}",
    ]),
  },
  EXPENSE_UPDATED: {
    title: "ویرایش هزینه",
    body: lines([
      "هزینه ویرایش شد | {{tenantName}}",
      "عنوان: {{expenseTitle}}",
      "مبلغ فعلی: {{expenseAmount}}",
      "دسته: {{expenseCategory}}",
      "طرف حساب: {{vendorName}}",
      "قرارداد مرتبط: {{contractNumber}}",
      "ویرایش‌کننده: {{operatorName}}",
    ]),
  },
  EXPENSE_CANCELED: {
    title: "لغو هزینه",
    body: lines([
      "هزینه لغو شد | {{tenantName}}",
      "عنوان: {{expenseTitle}}",
      "مبلغ: {{expenseAmount}}",
      "دسته: {{expenseCategory}}",
      "طرف حساب: {{vendorName}}",
      "قرارداد مرتبط: {{contractNumber}}",
      "لغوکننده: {{operatorName}}",
    ]),
  },
  CUSTOMER_CREATED: {
    title: "ثبت مشتری جدید",
    body: lines([
      "مشتری جدید ثبت شد | {{tenantName}}",
      "نام: {{customerName}}",
      "موبایل: {{customerMobile}}",
      "کد ملی/شناسه: {{customerNationalCode}}",
      "ثبت‌کننده: {{operatorName}}",
      "زمان ثبت: {{currentDateTime}}",
    ]),
  },
  CUSTOMER_UPDATED: {
    title: "ویرایش مشتری",
    body: lines([
      "اطلاعات مشتری ویرایش شد | {{tenantName}}",
      "نام: {{customerName}}",
      "موبایل: {{customerMobile}}",
      "کد ملی/شناسه: {{customerNationalCode}}",
      "ویرایش‌کننده: {{operatorName}}",
      "زمان ویرایش: {{currentDateTime}}",
    ]),
  },
  DAILY_REPORT: {
    title: "گزارش روزانه مدیریت",
    body: lines([
      "گزارش روزانه {{tenantName}} | {{currentDate}}",
      "قرارداد امروز: {{todayContractsCount}} مورد",
      "مراسم امروز: {{todayEventsCount}} مورد",
      "مراسم فردا: {{tomorrowEventsCount}} مورد",
      "دریافت امروز: {{paymentsTotal}} | {{paymentsCount}} تراکنش",
      "هزینه امروز: {{expensesTotal}} | {{expensesCount}} سند",
      "جریان خالص تقریبی: {{estimatedProfit}}",
      "مانده قابل پیگیری: {{outstandingTotal}} | {{outstandingContractsCount}} قرارداد",
    ]),
  },
  WEEKLY_REPORT: {
    title: "گزارش هفتگی مدیریت",
    body: lines([
      "گزارش هفتگی {{tenantName}}",
      "دوره: {{reportPeriod}}",
      "قراردادها: {{contractsCount}} مورد",
      "جمع قراردادها: {{contractsTotal}}",
      "دریافت‌ها: {{paymentsTotal}} | {{paymentsCount}} تراکنش",
      "هزینه‌ها: {{expensesTotal}} | {{expensesCount}} سند",
      "جریان خالص تقریبی: {{estimatedProfit}}",
      "مانده قابل پیگیری: {{outstandingTotal}} | {{outstandingContractsCount}} قرارداد",
    ]),
  },
  MONTHLY_REPORT: {
    title: "گزارش ماهانه مدیریت",
    body: lines([
      "گزارش ماهانه {{tenantName}}",
      "دوره: {{reportPeriod}}",
      "قراردادها: {{contractsCount}} مورد",
      "مبلغ کل قراردادها: {{contractsTotal}}",
      "دریافت‌شده: {{paymentsTotal}}",
      "هزینه‌ها: {{expensesTotal}}",
      "جریان خالص تقریبی: {{estimatedProfit}}",
      "مانده قابل دریافت: {{outstandingTotal}} | {{outstandingContractsCount}} قرارداد",
    ]),
  },
  EVENT_REMINDER_TOMORROW: {
    title: "یادآوری مراسم فردا",
    body: lines([
      "یادآوری مراسم فردا | {{tenantName}}",
      "تاریخ بررسی: {{currentDate}}",
      "تعداد مراسم‌ها: {{tomorrowEventsCount}} مورد",
      "",
      "{{upcomingEventsSummary}}",
      "",
      "لطفاً وضعیت سالن، منو، خدمات، پرسنل و هماهنگی مالی نهایی بررسی شود.",
    ]),
  },
  OUTSTANDING_BALANCE_REMINDER: {
    title: "مانده‌های قابل پیگیری",
    body: lines([
      "مانده‌های قابل پیگیری | {{tenantName}}",
      "جمع کل مانده‌ها: {{outstandingTotal}}",
      "تعداد قراردادهای دارای مانده: {{outstandingContractsCount}} مورد",
      "زمان بررسی: {{currentDateTime}}",
      "",
      "{{outstandingBalancesSummary}}",
    ]),
  },
  POST_EVENT_INVOICE_DELIVERY_CUSTOMER: {
    title: "ارسال صورتحساب به مشتری",
    body: lines([
      "{{customerName}} عزیز، صورتحساب مراسم شما در {{tenantName}} آماده مشاهده است.",
      "شماره قرارداد: {{contractNumber}}",
      "شماره صورتحساب: {{invoiceNumber}}",
      "مبلغ قابل پرداخت: {{payableAmount}}",
      "",
      "مشاهده و پیگیری صورتحساب:",
      "{{portalUrl}}",
      "",
      "در صورت مشاهده مغایرت، با شماره‌های {{customerSupportPhone}} تماس بگیرید.",
      "آدرس تالار: {{hallAddress}}",
      "با احترام؛ {{tenantName}}",
    ]),
  },
  POST_EVENT_INVOICE_DELIVERY_MANAGER: {
    title: "اطلاع صورتحساب",
    body: lines([
      "صورتحساب بعد از مراسم ثبت شد | {{tenantName}}",
      "مشتری: {{customerName}} | {{customerMobile}}",
      "قرارداد: {{contractNumber}}",
      "صورتحساب: {{invoiceNumber}}",
      "مبلغ قابل پرداخت: {{payableAmount}}",
      "لینک مشتری:",
      "{{portalUrl}}",
      "زمان ثبت: {{currentDateTime}}",
    ]),
  },
  SECURITY_EVENT: {
    title: "هشدار امنیتی",
    body: lines([
      "هشدار امنیتی | {{tenantName}}",
      "رویداد: {{eventType}}",
      "کاربر: {{userName}}",
      "ایمیل/شناسه: {{userEmail}}",
      "زمان: {{currentDateTime}}",
      "",
      "در صورت ناشناس بودن این فعالیت، دسترسی کاربران و نشست‌های فعال را بررسی کنید.",
    ]),
  },
  TEST_MESSAGE: {
    title: "پیام تست مدیریت",
    body: lines([
      "پیام تست مدیریت | {{tenantName}}",
      "اتصال کانال اطلاع‌رسانی با موفقیت بررسی شد.",
      "از این پس پیام‌های مدیریتی با متن رسمی، دقیق و قابل پیگیری ارسال می‌شوند.",
      "زمان تست: {{currentDateTime}}",
    ]),
  },
};

const telegramTemplates: TemplateMap = ownerMessengerTemplates;

const baleTemplates: TemplateMap = {
  ...ownerMessengerTemplates,
  TEST_MESSAGE: {
    title: "پیام تست بله",
    body: lines([
      "پیام تست بله | {{tenantName}}",
      "اتصال بله با موفقیت بررسی شد.",
      "پیام‌های مدیریتی با متن رسمی، دقیق و قابل پیگیری ارسال می‌شوند.",
      "زمان تست: {{currentDateTime}}",
    ]),
  },
};

const rubikaTemplates: TemplateMap = {
  ...ownerMessengerTemplates,
  TEST_MESSAGE: {
    title: "پیام تست روبیکا",
    body: lines([
      "پیام تست روبیکا | {{tenantName}}",
      "اتصال روبیکا با موفقیت بررسی شد.",
      "پیام‌های مدیریتی با متن رسمی، دقیق و قابل پیگیری ارسال می‌شوند.",
      "زمان تست: {{currentDateTime}}",
    ]),
  },
};

const legacySmsTemplates: TemplateMap = {
  CONTRACT_CREATED: {
    title: "ثبت قرارداد",
    body: "قرارداد {{contractNumber}} برای {{customerName}} ثبت شد. مبلغ نهایی: {{finalTotal}}",
  },
  CONTRACT_UPDATED: {
    title: "ویرایش قرارداد",
    body: "قرارداد {{contractNumber}} به‌روزرسانی شد. تاریخ مراسم: {{eventDate}}",
  },
  CONTRACT_STATUS_CHANGED: {
    title: "تغییر وضعیت قرارداد",
    body: "وضعیت قرارداد {{contractNumber}} به {{contractStatus}} تغییر کرد.",
  },
  CONTRACT_CANCELED: {
    title: "لغو قرارداد",
    body: "قرارداد {{contractNumber}} برای {{customerName}} لغو شد.",
  },
  PAYMENT_CREATED: {
    title: "ثبت دریافت",
    body: "دریافت {{paymentAmount}} برای قرارداد {{contractNumber}} ثبت شد. مانده: {{remainingAmount}}",
  },
  PAYMENT_UPDATED: {
    title: "ویرایش دریافت",
    body: "دریافت قرارداد {{contractNumber}} به مبلغ {{paymentAmount}} به‌روزرسانی شد.",
  },
  PAYMENT_CANCELED: {
    title: "لغو دریافت",
    body: "دریافت {{paymentAmount}} برای قرارداد {{contractNumber}} لغو شد.",
  },
  EXPENSE_CREATED: {
    title: "ثبت هزینه",
    body: "هزینه {{expenseTitle}} به مبلغ {{expenseAmount}} ثبت شد.",
  },
  EXPENSE_UPDATED: {
    title: "ویرایش هزینه",
    body: "هزینه {{expenseTitle}} به مبلغ {{expenseAmount}} به‌روزرسانی شد.",
  },
  EXPENSE_CANCELED: {
    title: "لغو هزینه",
    body: "هزینه {{expenseTitle}} به مبلغ {{expenseAmount}} لغو شد.",
  },
  CUSTOMER_CREATED: {
    title: "ثبت مشتری",
    body: "مشتری {{customerName}} در {{tenantName}} ثبت شد.",
  },
  CUSTOMER_UPDATED: {
    title: "ویرایش مشتری",
    body: "اطلاعات مشتری {{customerName}} به‌روزرسانی شد.",
  },
  DAILY_REPORT: {
    title: "گزارش روزانه",
    body: "گزارش روزانه {{tenantName}}\nدریافت: {{paymentsTotal}}\nهزینه: {{expensesTotal}}\nمانده: {{outstandingTotal}}\nمراسم فردا: {{tomorrowEventsCount}}",
  },
  WEEKLY_REPORT: {
    title: "گزارش هفتگی",
    body: "گزارش هفتگی {{tenantName}}؛ دریافت‌ها: {{paymentsTotal}}، مانده‌ها: {{outstandingTotal}}",
  },
  MONTHLY_REPORT: {
    title: "گزارش ماهانه",
    body: "گزارش ماهانه {{tenantName}}؛ قراردادها: {{contractsCount}}، دریافت: {{paymentsTotal}}، سود: {{estimatedProfit}}",
  },
  EVENT_REMINDER_TOMORROW: {
    title: "یادآوری مراسم فردا",
    body: "یادآوری {{tenantName}}؛ مراسم فردا: {{tomorrowEventsCount}} مورد. {{upcomingEventsSummary}}",
  },
  OUTSTANDING_BALANCE_REMINDER: {
    title: "یادآوری مانده",
    body: "مانده‌های {{tenantName}}؛ مجموع: {{outstandingTotal}}، تعداد: {{outstandingContractsCount}}",
  },
  POST_EVENT_INVOICE_DELIVERY_CUSTOMER: {
    title: "ارسال صورتحساب",
    body: "صورتحساب مراسم شما آماده مشاهده است. قرارداد: {{contractNumber}} مبلغ قابل پرداخت: {{payableAmount}} لینک: {{portalUrl}}",
  },
  POST_EVENT_INVOICE_DELIVERY_MANAGER: {
    title: "اطلاع صورتحساب",
    body: "صورتحساب {{invoiceNumber}} برای {{customerName}} ثبت ارسال شد. قرارداد: {{contractNumber}} مبلغ: {{payableAmount}}",
  },
  SECURITY_EVENT: {
    title: "رویداد امنیتی",
    body: "رویداد امنیتی در {{tenantName}} ثبت شد. زمان: {{currentDateTime}}",
  },
  TEST_MESSAGE: {
    title: "پیامک تست",
    body: lines([
      "پیامک تست تالار منیجر",
      "اتصال پنل پیامکی برای {{tenantName}} بررسی شد.",
      "زمان: {{currentDateTime}}",
    ]),
  },
};

const smsTemplates: TemplateMap = {
  CONTRACT_CREATED: {
    title: "پیامک مالک - ثبت قرارداد",
    body: lines([
      "قرارداد جدید ثبت شد | {{tenantName}}",
      "قرارداد: {{contractNumber}}",
      "مشتری: {{customerName}} | {{customerMobile}}",
      "مراسم: {{eventType}} | {{eventDateFull}}، {{eventTimeRange}}",
      "سالن: {{salonName}} | مهمان: {{guestCount}} نفر",
      "مالی: کل {{finalTotal}} | پرداخت‌شده {{paidAmount}} | مانده {{remainingAmount}}",
      "ثبت‌کننده: {{operatorName}}",
    ]),
  },
  CONTRACT_UPDATED: {
    title: "پیامک مالک - ویرایش قرارداد",
    body: lines([
      "قرارداد ویرایش شد | {{tenantName}}",
      "قرارداد: {{contractNumber}}",
      "مشتری: {{customerName}} | {{customerMobile}}",
      "مراسم: {{eventType}} | {{eventDateFull}}",
      "وضعیت: {{contractStatus}}",
      "مالی: کل {{finalTotal}} | پرداخت‌شده {{paidAmount}} | مانده {{remainingAmount}}",
      "ویرایش‌کننده: {{operatorName}}",
    ]),
  },
  CONTRACT_STATUS_CHANGED: {
    title: "پیامک مالک - تغییر وضعیت قرارداد",
    body: lines([
      "وضعیت قرارداد تغییر کرد | {{tenantName}}",
      "قرارداد: {{contractNumber}} | {{customerName}} | {{customerMobile}}",
      "وضعیت جدید: {{contractStatus}}",
      "مراسم: {{eventType}} | {{eventDateFull}} | سالن {{salonName}}",
      "مانده فعلی: {{remainingAmount}} | اپراتور: {{operatorName}}",
    ]),
  },
  CONTRACT_CANCELED: {
    title: "پیامک مالک - لغو قرارداد",
    body: lines([
      "قرارداد لغو و بسته شد | {{tenantName}}",
      "قرارداد: {{contractNumber}} | {{customerName}} | {{customerMobile}}",
      "مراسم: {{eventType}} | {{eventDateFull}}",
      "دریافت‌شده: {{paidAmount}} | مانده قابل پیگیری: {{remainingAmount}}",
      "لغوکننده: {{operatorName}}",
    ]),
  },
  PAYMENT_CREATED: {
    title: "پیامک مالک - ثبت دریافت جدید",
    body: lines([
      "دریافت جدید ثبت شد | {{tenantName}}",
      "مبلغ: {{paymentAmount}}",
      "قرارداد: {{contractNumber}} | {{customerName}} | {{customerMobile}}",
      "روش: {{paymentMethod}} | نوع: {{paymentType}}",
      "کد پیگیری: {{trackingCode}}",
      "مانده قرارداد: {{remainingAmount}}",
      "ثبت‌کننده: {{operatorName}}",
    ]),
  },
  PAYMENT_UPDATED: {
    title: "پیامک مالک - ویرایش دریافت",
    body: lines([
      "دریافت ویرایش شد | {{tenantName}}",
      "مبلغ فعلی: {{paymentAmount}}",
      "قرارداد: {{contractNumber}} | {{customerName}} | {{customerMobile}}",
      "روش: {{paymentMethod}} | وضعیت: {{paymentStatus}}",
      "مانده فعلی قرارداد: {{remainingAmount}}",
      "ویرایش‌کننده: {{operatorName}}",
    ]),
  },
  PAYMENT_CANCELED: {
    title: "پیامک مالک - لغو دریافت",
    body: lines([
      "دریافت لغو شد | {{tenantName}}",
      "مبلغ لغوشده: {{paymentAmount}}",
      "قرارداد: {{contractNumber}} | {{customerName}} | {{customerMobile}}",
      "روش: {{paymentMethod}}",
      "پرداخت‌شده فعلی: {{paidAmount}} | مانده فعلی: {{remainingAmount}}",
      "لغوکننده: {{operatorName}}",
    ]),
  },
  EXPENSE_CREATED: {
    title: "پیامک مالک - ثبت هزینه جدید",
    body: lines([
      "هزینه جدید ثبت شد | {{tenantName}}",
      "عنوان: {{expenseTitle}} | مبلغ: {{expenseAmount}}",
      "دسته: {{expenseCategory}} | طرف حساب: {{vendorName}}",
      "روش پرداخت: {{paymentMethod}} | قرارداد مرتبط: {{contractNumber}}",
      "ثبت‌کننده: {{operatorName}}",
    ]),
  },
  EXPENSE_UPDATED: {
    title: "پیامک مالک - ویرایش هزینه",
    body: lines([
      "هزینه ویرایش شد | {{tenantName}}",
      "عنوان: {{expenseTitle}} | مبلغ فعلی: {{expenseAmount}}",
      "دسته: {{expenseCategory}} | طرف حساب: {{vendorName}}",
      "قرارداد مرتبط: {{contractNumber}}",
      "ویرایش‌کننده: {{operatorName}}",
    ]),
  },
  EXPENSE_CANCELED: {
    title: "پیامک مالک - لغو هزینه",
    body: lines([
      "هزینه لغو شد | {{tenantName}}",
      "عنوان: {{expenseTitle}} | مبلغ: {{expenseAmount}}",
      "دسته: {{expenseCategory}} | طرف حساب: {{vendorName}}",
      "قرارداد مرتبط: {{contractNumber}}",
      "لغوکننده: {{operatorName}}",
    ]),
  },
  CUSTOMER_CREATED: {
    title: "پیامک مالک - ثبت مشتری جدید",
    body: lines([
      "مشتری جدید ثبت شد | {{tenantName}}",
      "نام: {{customerName}}",
      "موبایل: {{customerMobile}}",
      "کد ملی/شناسه: {{customerNationalCode}}",
      "ثبت‌کننده: {{operatorName}}",
      "زمان ثبت: {{currentDateTime}}",
    ]),
  },
  CUSTOMER_UPDATED: {
    title: "پیامک مالک - ویرایش مشتری",
    body: lines([
      "اطلاعات مشتری ویرایش شد | {{tenantName}}",
      "نام: {{customerName}}",
      "موبایل: {{customerMobile}}",
      "کد ملی/شناسه: {{customerNationalCode}}",
      "ویرایش‌کننده: {{operatorName}}",
      "زمان ویرایش: {{currentDateTime}}",
    ]),
  },
  DAILY_REPORT: {
    title: "پیامک مالک - گزارش روزانه",
    body: lines([
      "گزارش روزانه {{tenantName}} | {{currentDate}}",
      "قرارداد امروز: {{todayContractsCount}} | مراسم امروز: {{todayEventsCount}} | مراسم فردا: {{tomorrowEventsCount}}",
      "دریافت امروز: {{paymentsTotal}} | {{paymentsCount}} تراکنش",
      "هزینه امروز: {{expensesTotal}} | {{expensesCount}} سند",
      "جریان خالص تقریبی: {{estimatedProfit}}",
      "مانده قابل پیگیری: {{outstandingTotal}} | {{outstandingContractsCount}} قرارداد",
    ]),
  },
  WEEKLY_REPORT: {
    title: "پیامک مالک - گزارش هفتگی",
    body: lines([
      "گزارش هفتگی {{tenantName}}",
      "دوره: {{reportPeriod}}",
      "قراردادها: {{contractsCount}} مورد | جمع قراردادها: {{contractsTotal}}",
      "دریافت‌ها: {{paymentsTotal}} | {{paymentsCount}} تراکنش",
      "هزینه‌ها: {{expensesTotal}} | {{expensesCount}} سند",
      "جریان خالص تقریبی: {{estimatedProfit}}",
      "مانده قابل پیگیری: {{outstandingTotal}} | {{outstandingContractsCount}} قرارداد",
    ]),
  },
  MONTHLY_REPORT: {
    title: "پیامک مالک - گزارش ماهانه",
    body: lines([
      "گزارش ماهانه {{tenantName}}",
      "دوره: {{reportPeriod}}",
      "قراردادها: {{contractsCount}} مورد | مبلغ قراردادها: {{contractsTotal}}",
      "دریافت‌شده: {{paymentsTotal}} | هزینه‌ها: {{expensesTotal}}",
      "جریان خالص تقریبی: {{estimatedProfit}}",
      "مانده قابل دریافت: {{outstandingTotal}} | {{outstandingContractsCount}} قرارداد",
    ]),
  },
  EVENT_REMINDER_TOMORROW: {
    title: "پیامک مالک - یادآوری مراسم فردا",
    body: lines([
      "یادآوری مراسم فردا | {{tenantName}}",
      "تاریخ بررسی: {{currentDate}} | تعداد مراسم‌ها: {{tomorrowEventsCount}} مورد",
      "{{upcomingEventsSummary}}",
      "لطفاً سالن، منو، خدمات، پرسنل و هماهنگی مالی نهایی بررسی شود.",
    ]),
  },
  OUTSTANDING_BALANCE_REMINDER: {
    title: "پیامک مالک - مانده‌های قابل پیگیری",
    body: lines([
      "مانده‌های قابل پیگیری | {{tenantName}}",
      "جمع کل مانده‌ها: {{outstandingTotal}} | تعداد قرارداد: {{outstandingContractsCount}}",
      "زمان بررسی: {{currentDateTime}}",
      "{{outstandingBalancesSummary}}",
    ]),
  },
  POST_EVENT_INVOICE_DELIVERY_CUSTOMER: {
    title: "پیامک مشتری - صورتحساب مراسم",
    body: lines([
      "{{customerName}} عزیز، صورتحساب مراسم شما در {{tenantName}} آماده مشاهده است.",
      "شماره قرارداد: {{contractNumber}}",
      "شماره صورتحساب: {{invoiceNumber}}",
      "مبلغ قابل پرداخت: {{payableAmount}}",
      "",
      "مشاهده و پیگیری صورتحساب:",
      "{{portalUrl}}",
      "",
      "در صورت مشاهده مغایرت، با شماره‌های {{customerSupportPhone}} تماس بگیرید.",
      "آدرس تالار: {{hallAddress}}",
      "با احترام؛ {{tenantName}}",
    ]),
  },
  POST_EVENT_INVOICE_DELIVERY_MANAGER: {
    title: "پیامک مالک - اطلاع صورتحساب",
    body: lines([
      "صورتحساب بعد از مراسم ثبت شد | {{tenantName}}",
      "مشتری: {{customerName}} | {{customerMobile}}",
      "قرارداد: {{contractNumber}} | صورتحساب: {{invoiceNumber}}",
      "مبلغ قابل پرداخت: {{payableAmount}}",
      "لینک مشتری: {{portalUrl}}",
      "زمان ثبت: {{currentDateTime}}",
    ]),
  },
  SECURITY_EVENT: {
    title: "پیامک مالک - هشدار امنیتی",
    body: lines([
      "هشدار امنیتی | {{tenantName}}",
      "رویداد: {{eventType}}",
      "کاربر: {{userName}} | {{userEmail}}",
      "زمان: {{currentDateTime}}",
      "در صورت ناشناس بودن این فعالیت، دسترسی کاربران و نشست‌های فعال را بررسی کنید.",
    ]),
  },
  TEST_MESSAGE: {
    title: "پیامک تست مدیریت",
    body: lines([
      "پیام تست مدیریت | {{tenantName}}",
      "اتصال کانال اطلاع‌رسانی با موفقیت بررسی شد.",
      "پیام‌های مدیریتی با متن رسمی، دقیق و قابل پیگیری ارسال می‌شوند.",
      "زمان تست: {{currentDateTime}}",
    ]),
  },
};

const emailTemplates: TemplateMap = ownerMessengerTemplates;

const forcedTemplates: Partial<Record<NotificationChannel, TemplateMap>> = {};

const defaultTemplates: Record<NotificationChannel, TemplateMap> = {
  TELEGRAM: telegramTemplates,
  BALE: baleTemplates,
  RUBIKA: rubikaTemplates,
  SMS: smsTemplates,
  EMAIL: emailTemplates,
};

const legacyDefaultTemplates: Partial<Record<NotificationChannel, TemplateMap>> = {
  SMS: legacySmsTemplates,
};

function normalizeComparableTemplateText(value: string) {
  return stripDemoWordingFromNotificationText(value)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function stripDemoWordingFromNotificationText(value: string): string {
  return value
    .replace(/دموی\s+/g, "")
    .replace(/(^|[\s\n\r\t،؛:.؟!\-_/])دمو(?=($|[\s\n\r\t،؛:.؟!\-_/]))/g, "$1")
    .replace(/\bDEMO[-_\s]*/gi, "")
    .replace(/\bDemo[-_\s]*/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+([،؛:؟!])/g, "$1")
    .trim();
}

export function renderNotificationTemplate(
  template: string,
  variables: Record<string, unknown>,
): string {
  const normalizedVariables: Record<string, unknown> = { ...variables };
  const supportPhones = formatCustomerSupportPhones(variables.customerSupportPhone ?? variables.supportPhone);
  normalizedVariables.customerSupportPhone = supportPhones;
  normalizedVariables.supportPhone = supportPhones;

  const rendered = template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key: string) => {
    const value = normalizedVariables[key];

    if (value === null || value === undefined) {
      return "";
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return stripDemoWordingFromNotificationText(String(value));
  });

  return stripDemoWordingFromNotificationText(rendered)
    .replace(/^آدرس تالار:\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function getForcedNotificationTemplate(channel: string, eventType: string) {
  if (!isNotificationChannel(channel) || !isNotificationEventType(eventType)) {
    return null;
  }

  return forcedTemplates[channel]?.[eventType] ?? null;
}

export function getDefaultNotificationTemplate(channel: string, eventType: string) {
  if (!isNotificationChannel(channel) || !isNotificationEventType(eventType)) {
    return null;
  }

  const template = defaultTemplates[channel]?.[eventType];

  if (template) {
    return template;
  }

  return {
    title: "اعلان سامانه",
    body: "رویداد {{eventType}} برای {{tenantName}} ثبت شد.",
  };
}

function isOwnerManagementChannel(channel: string) {
  return channel === "TELEGRAM" || channel === "BALE" || channel === "RUBIKA" || channel === "EMAIL";
}

function looksLikePreviousOwnerTemplate(input: {
  channel: string;
  title: string;
  body: string;
}) {
  const title = normalizeComparableTemplateText(input.title);
  const body = normalizeComparableTemplateText(input.body);

  if (input.channel === "SMS") {
    return (
      title.startsWith("پیامک مالک -") ||
      title === "پیامک تست" ||
      body.startsWith("ثبت قرارداد جدید") ||
      body.startsWith("ویرایش قرارداد") ||
      body.startsWith("لغو قرارداد") ||
      body.startsWith("ثبت دریافت جدید") ||
      body.startsWith("گزارش روزانه") ||
      body.startsWith("گزارش هفتگی") ||
      body.startsWith("گزارش ماهانه") ||
      body.includes("اعلان مالی تالار منیجر") ||
      body.includes("اعلان هزینه تالار منیجر") ||
      body.includes("اعلان مشتری تالار منیجر") ||
      body.includes("اعلان صورتحساب بعد از مراسم") ||
      body.includes("پیامک تست تالار منیجر")
    );
  }

  if (!isOwnerManagementChannel(input.channel)) {
    return false;
  }

  return (
    title === "ثبت قرارداد جدید مراسم" ||
    title === "ویرایش قرارداد مراسم" ||
    title === "لغو قرارداد مراسم" ||
    title.endsWith("مالک") ||
    title.includes("اعلان مالک") ||
    title.includes("مالک") ||
    title.includes("رویداد امنیتی مهم") ||
    body.startsWith("قرارداد جدید در") ||
    body.startsWith("قرارداد در") ||
    body.startsWith("دریافت جدید در") ||
    body.startsWith("یک دریافت در") ||
    body.startsWith("هزینه جدید در") ||
    body.startsWith("هزینه در") ||
    body.startsWith("مشتری جدید در") ||
    body.startsWith("اطلاعات مشتری در") ||
    body.startsWith("گزارش روزانه") ||
    body.startsWith("گزارش هفتگی") ||
    body.startsWith("گزارش ماهانه") ||
    body.startsWith("یادآوری مراسم‌های فردا") ||
    body.startsWith("مانده‌های قابل پیگیری") ||
    body.startsWith("صورتحساب بعد از مراسم برای مالک") ||
    body.startsWith("رویداد امنیتی در") ||
    body.startsWith("پیام تست تالار منیجر") ||
    title === "پیام تست بله" ||
    title === "پیام تست روبیکا"
  );
}

export function shouldUpgradeStoredNotificationTemplate(input: {
  channel: string;
  eventType: string;
  title: string;
  body: string;
}) {
  if (!isNotificationChannel(input.channel) || !isNotificationEventType(input.eventType)) {
    return false;
  }

  const current = defaultTemplates[input.channel]?.[input.eventType];
  if (
    current &&
    normalizeComparableTemplateText(input.title) === normalizeComparableTemplateText(current.title) &&
    normalizeComparableTemplateText(input.body) === normalizeComparableTemplateText(current.body)
  ) {
    return false;
  }

  const legacy = legacyDefaultTemplates[input.channel]?.[input.eventType];
  if (
    legacy &&
    normalizeComparableTemplateText(input.title) === normalizeComparableTemplateText(legacy.title) &&
    normalizeComparableTemplateText(input.body) === normalizeComparableTemplateText(legacy.body)
  ) {
    return true;
  }

  return looksLikePreviousOwnerTemplate(input);
}
