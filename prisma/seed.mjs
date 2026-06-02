import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getPrimaryPlatformAdminEmail() {
  return normalizeEmail(
    process.env.PLATFORM_ADMIN_EMAIL ||
      String(process.env.PLATFORM_ADMIN_EMAILS || "").split(",")[0],
  );
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run prisma seed.");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const ownerEmail = normalizeEmail(process.env.SEED_OWNER_EMAIL || "owner@talar.local");
const ownerPassword = process.env.SEED_OWNER_PASSWORD || "TalarDemo123!";
const tenantSlug = process.env.SEED_TENANT_SLUG || "demo-talar-local";
const platformAdminEmail = getPrimaryPlatformAdminEmail();
const platformAdminPassword = process.env.PLATFORM_ADMIN_PASSWORD || "";

const defaultServiceCatalog = [
  { code: "SERVICE_TV_WALL", title: "تی‌وی وال", category: "خدمات تصویری و اجرایی", pricingType: "FIXED", unit: "مورد", price: "25000000", sortOrder: 10 },
  { code: "SERVICE_FIREWORKS", title: "آتش‌بازی", category: "خدمات تصویری و اجرایی", pricingType: "FIXED", unit: "مورد", price: "18000000", sortOrder: 20 },
  { code: "SERVICE_VIDEOGRAPHY", title: "فیلم‌برداری", aliases: ["فیلم برداری"], category: "خدمات تصویری و اجرایی", pricingType: "FIXED", unit: "مراسم", price: "40000000", sortOrder: 30 },
  { code: "SERVICE_PHOTOGRAPHY", title: "عکاسی", category: "خدمات تصویری و اجرایی", pricingType: "FIXED", unit: "مراسم", price: "30000000", sortOrder: 40 },
  { code: "SERVICE_SPOTLIGHT", title: "نورافکن", category: "خدمات تصویری و اجرایی", pricingType: "PER_ITEM", unit: "عدد", price: "12000000", sortOrder: 50 },
  { code: "SERVICE_PROJECTION", title: "پروجکشن", category: "خدمات تصویری و اجرایی", pricingType: "FIXED", unit: "مورد", price: "15000000", sortOrder: 60 },
  { code: "SERVICE_LIVE_BAND", title: "بند موسیقی", category: "خدمات موسیقی و هنری", pricingType: "FIXED", unit: "مراسم", price: "70000000", sortOrder: 110 },
  { code: "SERVICE_DJ", title: "دیجی", aliases: ["دی‌جی"], category: "خدمات موسیقی و هنری", pricingType: "FIXED", unit: "مراسم", price: "35000000", sortOrder: 120 },
  { code: "SERVICE_AGHD_ROOM", title: "اتاق عقد", category: "خدمات تشریفاتی عقد", pricingType: "FIXED", unit: "مراسم", price: "45000000", sortOrder: 210 },
  { code: "SERVICE_ANGEL_BALLET", title: "باله فرشته", category: "خدمات تشریفاتی عقد", pricingType: "PER_ITEM", unit: "نفر", price: "25000000", sortOrder: 220 },
  { code: "SERVICE_AGHD_TABLE", title: "سفره عقد", category: "خدمات تشریفاتی عقد", pricingType: "FIXED", unit: "مراسم", price: "55000000", sortOrder: 230 },
  { code: "SERVICE_STAFF", title: "خدمات و پرسنل", aliases: ["خدمات", "پرسنل"], category: "خدمات نیروی انسانی عمومی", pricingType: "PER_ITEM", unit: "نفر", price: "8000000", sortOrder: 310 },
  { code: "SERVICE_EXTRA_STAFF", title: "هزینه پرسنل اضافه", category: "خدمات نیروی انسانی عمومی", pricingType: "PER_ITEM", unit: "نفر", price: "8000000", sortOrder: 320 },
  { code: "SERVICE_ARTIFICIAL_SNOW", title: "برف مصنوعی", category: "افکت‌ها و جلوه‌های ویژه", pricingType: "FIXED", unit: "مورد", price: "12000000", sortOrder: 410 },
  { code: "SERVICE_BUBBLE_MACHINE", title: "حباب‌ساز", category: "افکت‌ها و جلوه‌های ویژه", pricingType: "FIXED", unit: "مورد", price: "8000000", sortOrder: 420 },
  { code: "SERVICE_TANGO_LASER", title: "لیزر تانگو", category: "افکت‌ها و جلوه‌های ویژه", pricingType: "FIXED", unit: "مورد", price: "15000000", sortOrder: 430 },
  { code: "SERVICE_COLD_FOG", title: "مه سرد", category: "افکت‌ها و جلوه‌های ویژه", pricingType: "FIXED", unit: "مورد", price: "10000000", sortOrder: 440 },
  { code: "SERVICE_WARM_FOG", title: "مه گرم", category: "افکت‌ها و جلوه‌های ویژه", pricingType: "FIXED", unit: "مورد", price: "10000000", sortOrder: 450 },
  { code: "PHOTO_MAIN", title: "عکاسی مراسم", category: "عکاسی و فیلم‌برداری", pricingType: "FIXED", unit: "مراسم", price: "30000000", sortOrder: 610 },
  { code: "VIDEO_MAIN", title: "فیلم‌برداری مراسم", category: "عکاسی و فیلم‌برداری", pricingType: "FIXED", unit: "مراسم", price: "40000000", sortOrder: 620 },
  { code: "PHOTO_VIDEO_FULL_PACKAGE", title: "پکیج کامل عکاسی و فیلم‌برداری", aliases: ["پکیج عکاسی و فیلم‌برداری کامل"], category: "عکاسی و فیلم‌برداری", pricingType: "FIXED", unit: "پکیج", price: "75000000", sortOrder: 630 },
  { code: "SECOND_PHOTOGRAPHER", title: "عکاس دوم", category: "عکاسی و فیلم‌برداری", pricingType: "PER_ITEM", unit: "نفر", price: "18000000", sortOrder: 640 },
  { code: "SECOND_VIDEOGRAPHER", title: "فیلم‌بردار دوم", category: "عکاسی و فیلم‌برداری", pricingType: "PER_ITEM", unit: "نفر", price: "22000000", sortOrder: 650 },
  { code: "HIGHLIGHT_CLIP", title: "کلیپ کوتاه مراسم", category: "عکاسی و فیلم‌برداری", pricingType: "FIXED", unit: "کلیپ", price: "20000000", sortOrder: 660 },
  { code: "FULL_FILM_EDIT", title: "تدوین فیلم کامل مراسم", category: "عکاسی و فیلم‌برداری", pricingType: "FIXED", unit: "پروژه", price: "25000000", sortOrder: 670 },
  { code: "INSTAGRAM_TEASER", title: "تیزر اینستاگرامی", category: "عکاسی و فیلم‌برداری", pricingType: "FIXED", unit: "تیزر", price: "12000000", sortOrder: 680 },
  { code: "DRONE_VIDEO", title: "هلی‌شات / هلی‌کم", category: "عکاسی و فیلم‌برداری", pricingType: "FIXED", unit: "مراسم", price: "35000000", sortOrder: 690 },
  { code: "LUXURY_PRINTED_ALBUM", title: "آلبوم چاپی لوکس", category: "عکاسی و فیلم‌برداری", pricingType: "PER_ITEM", unit: "عدد", price: "35000000", sortOrder: 700 },
  { code: "FULL_PHOTO_FILES", title: "تحویل فایل کامل عکس‌ها", category: "عکاسی و فیلم‌برداری", pricingType: "FIXED", unit: "پروژه", price: "8000000", sortOrder: 710 },
  { code: "CONTRACT_EXTRA_SERVICE", title: "خدمات اضافه", category: "هزینه‌های انتخابی قرارداد", pricingType: "FIXED", unit: "مورد", price: "10000000", sortOrder: 810 },
  { code: "CONTRACT_BASE_HALL_COST", title: "هزینه پایه سالن", category: "هزینه‌های انتخابی قرارداد", pricingType: "FIXED", unit: "مراسم", price: "50000000", sortOrder: 820 },
];

const defaultMenuCatalog = [
  { code: "FOOD_BAGHALI_CHICKEN_100", title: "باقالی پلو با مرغ ۱۰۰٪", aliases: ["باقالی‌پلو با مرغ ۱۰۰٪"], category: "غذاهای اصلی", pricePerGuest: "9500000", sortOrder: 10 },
  { code: "FOOD_BAGHALI_CHICKEN_50", title: "باقالی پلو با مرغ ۵۰٪", aliases: ["باقالی‌پلو با مرغ ۵۰٪"], category: "غذاهای اصلی", pricePerGuest: "6500000", sortOrder: 20 },
  { code: "FOOD_BAGHALI_MEAT_100", title: "باقالی پلو با گوشت ۱۰۰٪", aliases: ["باقالی‌پلو با گوشت ۱۰۰٪"], category: "غذاهای اصلی", pricePerGuest: "14500000", sortOrder: 30 },
  { code: "FOOD_BAGHALI_MEAT_50", title: "باقالی پلو با گوشت ۵۰٪", aliases: ["باقالی‌پلو با گوشت ۵۰٪"], category: "غذاهای اصلی", pricePerGuest: "9500000", sortOrder: 40 },
  { code: "FOOD_JOOJE_NO_RICE_50", title: "جوجه بدون برنج ۵۰٪", category: "غذاهای اصلی", pricePerGuest: "4500000", sortOrder: 50 },
  { code: "FOOD_JOOJE_100", title: "جوجه ۱۰۰٪", category: "غذاهای اصلی", pricePerGuest: "8500000", sortOrder: 60 },
  { code: "FOOD_JOOJE_50", title: "جوجه ۵۰٪", category: "غذاهای اصلی", pricePerGuest: "5500000", sortOrder: 70 },
  { code: "FOOD_ZERESHK_CHICKEN_100", title: "زرشک پلو با مرغ ۱۰۰٪", aliases: ["زرشک‌پلو با مرغ ۱۰۰٪"], category: "غذاهای اصلی", pricePerGuest: "8500000", sortOrder: 80 },
  { code: "FOOD_ZERESHK_CHICKEN_50", title: "زرشک پلو با مرغ ۵۰٪", aliases: ["زرشک‌پلو با مرغ ۵۰٪"], category: "غذاهای اصلی", pricePerGuest: "5500000", sortOrder: 90 },
  { code: "FOOD_SELF_SERVICE", title: "سلف", category: "غذاهای اصلی", pricePerGuest: "12000000", sortOrder: 100 },
  { code: "FOOD_SHIRIN_POLO_50", title: "شیرین پلو ۵۰٪", aliases: ["شیرین‌پلو ۵۰٪"], category: "غذاهای اصلی", pricePerGuest: "6500000", sortOrder: 110 },
  { code: "FOOD_FESENJAN_NO_RICE_50", title: "فسنجان بدون برنج ۵۰٪", category: "غذاهای اصلی", pricePerGuest: "7500000", sortOrder: 120 },
  { code: "FOOD_LOGHME_NO_RICE_50", title: "لقمه بدون برنج ۵۰٪", category: "غذاهای اصلی", pricePerGuest: "5000000", sortOrder: 130 },
  { code: "FOOD_LOGHME_100", title: "لقمه ۱۰۰٪", category: "غذاهای اصلی", pricePerGuest: "9000000", sortOrder: 140 },
  { code: "FOOD_LOGHME_50", title: "لقمه ۵۰٪", category: "غذاهای اصلی", pricePerGuest: "6000000", sortOrder: 150 },
  { code: "FOOD_CHICKEN_RICE_50", title: "مرغ و پلو ۵۰٪", category: "غذاهای اصلی", pricePerGuest: "5500000", sortOrder: 160 },
  { code: "DRINK_WATER", title: "آب معدنی", category: "نوشیدنی‌ها", pricePerGuest: "450000", sortOrder: 210 },
  { code: "DRINK_INDUSTRIAL_JUICE", title: "آب میوه صنعتی", aliases: ["آب‌میوه صنعتی"], category: "نوشیدنی‌ها", pricePerGuest: "800000", sortOrder: 220 },
  { code: "DRINK_NATURAL_JUICE", title: "آب میوه طبیعی", aliases: ["آب‌میوه طبیعی"], category: "نوشیدنی‌ها", pricePerGuest: "1800000", sortOrder: 230 },
  { code: "DRINK_NESCAFE", title: "نسکافه", category: "نوشیدنی‌ها", pricePerGuest: "900000", sortOrder: 240 },
  { code: "DRINK_CAN_SODA", title: "نوشابه قوطی", category: "نوشیدنی‌ها", pricePerGuest: "850000", sortOrder: 250 },
  { code: "DRINK_TEA", title: "چای", category: "نوشیدنی‌ها", pricePerGuest: "350000", sortOrder: 260 },
  { code: "DRINK_TEA_NESCAFE", title: "چای و نسکافه", category: "نوشیدنی‌ها", pricePerGuest: "1100000", sortOrder: 270 },
  { code: "DESSERT_TRADITIONAL_ICE_CREAM", title: "بستنی سنتی", category: "دسرها و مخلفات", pricePerGuest: "900000", sortOrder: 310 },
  { code: "DESSERT_GENERIC", title: "دسر", category: "دسرها و مخلفات", pricePerGuest: "850000", sortOrder: 320 },
  { code: "DESSERT_SEASON_SALAD", title: "سالاد فصل", category: "دسرها و مخلفات", pricePerGuest: "750000", sortOrder: 330 },
  { code: "DESSERT_JELLY", title: "ژله", category: "دسرها و مخلفات", pricePerGuest: "450000", sortOrder: 340 },
  { code: "DESSERT_CARAMEL", title: "کرم کارامل", category: "دسرها و مخلفات", pricePerGuest: "800000", sortOrder: 350 },
];

function decimalIsEmpty(value) {
  return value === null || value === undefined || Number(value.toString()) <= 0;
}

function aliasesWhere(item) {
  return [{ code: item.code }, { title: item.title }, ...(item.aliases ?? []).map((title) => ({ title }))];
}

async function ensureDefaultService(tenantId, item) {
  const existing = await prisma.service.findFirst({
    where: { tenantId, OR: aliasesWhere(item) },
    select: { id: true, code: true, title: true, price: true, basePrice: true },
  });

  if (!existing) {
    await prisma.service.create({
      data: {
        tenantId,
        code: item.code,
        title: item.title,
        category: item.category,
        pricingType: item.pricingType,
        unit: item.unit,
        price: item.price,
        basePrice: item.price,
        allowPriceOverride: true,
        sortOrder: item.sortOrder,
        isActive: true,
      },
    });
    return;
  }

  const codeConflict = existing.code !== item.code
    ? await prisma.service.findFirst({ where: { tenantId, code: item.code, NOT: { id: existing.id } }, select: { id: true } })
    : null;

  await prisma.service.update({
    where: { id: existing.id },
    data: {
      code: existing.code || codeConflict ? undefined : item.code,
      price: decimalIsEmpty(existing.price) ? item.price : undefined,
      basePrice: decimalIsEmpty(existing.basePrice) ? item.price : undefined,
    },
  });
}

async function ensureDefaultMenu(tenantId, item) {
  const existing = await prisma.menu.findFirst({
    where: { tenantId, OR: aliasesWhere(item) },
    select: { id: true, code: true, title: true, pricePerGuest: true, basePrice: true },
  });

  if (!existing) {
    await prisma.menu.create({
      data: {
        tenantId,
        code: item.code,
        title: item.title,
        category: item.category,
        pricingType: "PER_GUEST",
        unit: "نفر",
        pricePerGuest: item.pricePerGuest,
        basePrice: item.pricePerGuest,
        allowPriceOverride: true,
        currency: "IRR",
        sortOrder: item.sortOrder,
        isActive: true,
      },
    });
    return;
  }

  const codeConflict = existing.code !== item.code
    ? await prisma.menu.findFirst({ where: { tenantId, code: item.code, NOT: { id: existing.id } }, select: { id: true } })
    : null;

  await prisma.menu.update({
    where: { id: existing.id },
    data: {
      code: existing.code || codeConflict ? undefined : item.code,
      pricePerGuest: decimalIsEmpty(existing.pricePerGuest) ? item.pricePerGuest : undefined,
      basePrice: decimalIsEmpty(existing.basePrice) ? item.pricePerGuest : undefined,
    },
  });
}

async function seedContractCatalogDefaults(tenantId) {
  for (const item of defaultServiceCatalog) {
    await ensureDefaultService(tenantId, item);
  }

  for (const item of defaultMenuCatalog) {
    await ensureDefaultMenu(tenantId, item);
  }
}

async function main() {
  const passwordHash = await hash(ownerPassword, 12);

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {
      name: "مالک تست تالار",
      passwordHash,
      status: "ACTIVE",
    },
    create: {
      name: "مالک تست تالار",
      email: ownerEmail,
      phone: "09120000000",
      passwordHash,
      status: "ACTIVE",
    },
  });

  if (platformAdminEmail && platformAdminPassword) {
    const platformAdminPasswordHash = await hash(platformAdminPassword, 12);

    await prisma.user.upsert({
      where: { email: platformAdminEmail },
      update: {
        name: "مدیر کل سامانه",
        passwordHash: platformAdminPasswordHash,
        status: "ACTIVE",
      },
      create: {
        name: "مدیر کل سامانه",
        email: platformAdminEmail,
        passwordHash: platformAdminPasswordHash,
        status: "ACTIVE",
      },
    });
  }

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: {
      name: "تالار محلی",
      status: "DEMO",
      ownerId: owner.id,
    },
    create: {
      name: "تالار محلی",
      slug: tenantSlug,
      status: "DEMO",
      ownerId: owner.id,
    },
  });

  await prisma.tenantMember.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: owner.id,
      },
    },
    update: {
      role: "OWNER",
    },
    create: {
      tenantId: tenant.id,
      userId: owner.id,
      role: "OWNER",
    },
  });

  await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: {
      plan: "DEMO",
      status: "TRIALING",
    },
    create: {
      tenantId: tenant.id,
      plan: "DEMO",
      status: "TRIALING",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  await seedContractCatalogDefaults(tenant.id);

  await prisma.contractSetting.upsert({
    where: { tenantId: tenant.id },
    update: {
      contractPrefix: "TLR",
      defaultTaxPercent: "0",
    },
    create: {
      tenantId: tenant.id,
      contractPrefix: "TLR",
      nextNumber: 1,
      defaultTaxPercent: "0",
      defaultClauses:
        "پرداخت ها طبق برنامه توافق شده انجام می شود و تغییرات مراسم باید کتبا ثبت شود.",
      templateBody:
        "قالب نمونه قرارداد تالار؛ اطلاعات مشتری، سالن، منو، خدمات و پرداخت ها در ثبت قرارداد جایگزین می شود.",
    },
  });

  const hall = await prisma.hall.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: "تالار مرکزی",
      },
    },
    update: {
      address: "تهران، خیابان نمونه",
      phone: "02100000000",
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      name: "تالار مرکزی",
      address: "تهران، خیابان نمونه",
      phone: "02100000000",
      isActive: true,
    },
  });

  await prisma.salon.upsert({
    where: {
      hallId_name: {
        hallId: hall.id,
        name: "سالن یاس",
      },
    },
    update: {
      tenantId: tenant.id,
      capacity: 350,
      floor: "همکف",
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      hallId: hall.id,
      name: "سالن یاس",
      capacity: 350,
      floor: "همکف",
      isActive: true,
    },
  });

  await prisma.menu.upsert({
    where: {
      tenantId_title: {
        tenantId: tenant.id,
        title: "منوی ویژه",
      },
    },
    update: {
      pricePerGuest: "2500000",
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      title: "منوی ویژه",
      description: "غذای اصلی، سالاد، دسر و نوشیدنی",
      pricePerGuest: "2500000",
      currency: "IRR",
      items: ["چلوکباب", "زرشک پلو", "سالاد فصل", "دسر"],
      isActive: true,
    },
  });



  await prisma.paymentMethod.createMany({
    data: [
      { tenantId: tenant.id, title: "نقدی", type: "CASH" },
      { tenantId: tenant.id, title: "کارت خوان", type: "CARD" },
      { tenantId: tenant.id, title: "حواله بانکی", type: "BANK_TRANSFER" },
      { tenantId: tenant.id, title: "چک", type: "CHECK" },
    ],
    skipDuplicates: true,
  });

  await prisma.financialCategory.createMany({
    data: [
      {
        tenantId: tenant.id,
        title: "پیش دریافت قرارداد",
        type: "INCOME",
        sortOrder: 1,
      },
      {
        tenantId: tenant.id,
        title: "تسویه قرارداد",
        type: "INCOME",
        sortOrder: 2,
      },
      { tenantId: tenant.id, title: "حقوق و دستمزد", type: "EXPENSE", sortOrder: 10 },
      { tenantId: tenant.id, title: "خرید مواد غذایی", type: "EXPENSE", sortOrder: 20 },
      { tenantId: tenant.id, title: "تشریفات و گل‌آرایی", type: "EXPENSE", sortOrder: 30 },
      { tenantId: tenant.id, title: "موسیقی و سرگرمی", type: "EXPENSE", sortOrder: 40 },
      { tenantId: tenant.id, title: "تجهیزات و تعمیرات", type: "EXPENSE", sortOrder: 50 },
      { tenantId: tenant.id, title: "قبوض و انرژی", type: "EXPENSE", sortOrder: 60 },
      { tenantId: tenant.id, title: "اجاره و ملک", type: "EXPENSE", sortOrder: 70 },
      { tenantId: tenant.id, title: "تبلیغات و بازاریابی", type: "EXPENSE", sortOrder: 80 },
      { tenantId: tenant.id, title: "حمل‌ونقل", type: "EXPENSE", sortOrder: 90 },
      { tenantId: tenant.id, title: "مالیات و عوارض", type: "EXPENSE", sortOrder: 100 },
      { tenantId: tenant.id, title: "هزینه‌های اداری", type: "EXPENSE", sortOrder: 110 },
      { tenantId: tenant.id, title: "سایر هزینه‌ها", type: "EXPENSE", sortOrder: 120 },
    ],
    skipDuplicates: true,
  });

  await prisma.demoAccess.upsert({
    where: { userId: owner.id },
    update: {
      tenantId: tenant.id,
      status: "USED",
      usedAt: new Date(),
    },
    create: {
      userId: owner.id,
      tenantId: tenant.id,
      status: "USED",
      usedAt: new Date(),
    },
  });

  console.log(`Seed completed. Tenant owner: ${ownerEmail}`);
  if (platformAdminEmail && platformAdminPassword) {
    console.log(`Platform admin user is ready: ${platformAdminEmail}`);
  } else {
    console.log("Platform admin user was not created because PLATFORM_ADMIN_EMAIL or PLATFORM_ADMIN_PASSWORD is missing.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
