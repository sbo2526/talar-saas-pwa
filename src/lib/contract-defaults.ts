import type { PrismaClient } from "@prisma/client";

type CatalogClient = Pick<PrismaClient, "service" | "menu" | "contractEventType">;

type ServicePricingTypeValue = "FIXED" | "PER_GUEST" | "PER_HOUR" | "PER_ITEM" | "CUSTOM";

type DefaultServiceCatalogItem = {
  code: string;
  title: string;
  aliases?: string[];
  category: string;
  pricingType: ServicePricingTypeValue;
  unit: string;
  price: string;
  sortOrder: number;
};

type DefaultMenuCatalogItem = {
  code: string;
  title: string;
  aliases?: string[];
  category: string;
  pricingType: ServicePricingTypeValue;
  unit: string;
  pricePerGuest: string;
  sortOrder: number;
};

const defaultServiceCatalog: DefaultServiceCatalogItem[] = [
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

const defaultMenuCatalog: DefaultMenuCatalogItem[] = [
  { code: "FOOD_BAGHALI_CHICKEN_100", title: "باقالی پلو با مرغ ۱۰۰٪", aliases: ["باقالی‌پلو با مرغ ۱۰۰٪"], category: "غذاهای اصلی", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "9500000", sortOrder: 10 },
  { code: "FOOD_BAGHALI_CHICKEN_50", title: "باقالی پلو با مرغ ۵۰٪", aliases: ["باقالی‌پلو با مرغ ۵۰٪"], category: "غذاهای اصلی", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "6500000", sortOrder: 20 },
  { code: "FOOD_BAGHALI_MEAT_100", title: "باقالی پلو با گوشت ۱۰۰٪", aliases: ["باقالی‌پلو با گوشت ۱۰۰٪"], category: "غذاهای اصلی", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "14500000", sortOrder: 30 },
  { code: "FOOD_BAGHALI_MEAT_50", title: "باقالی پلو با گوشت ۵۰٪", aliases: ["باقالی‌پلو با گوشت ۵۰٪"], category: "غذاهای اصلی", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "9500000", sortOrder: 40 },
  { code: "FOOD_JOOJE_NO_RICE_50", title: "جوجه بدون برنج ۵۰٪", category: "غذاهای اصلی", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "4500000", sortOrder: 50 },
  { code: "FOOD_JOOJE_100", title: "جوجه ۱۰۰٪", category: "غذاهای اصلی", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "8500000", sortOrder: 60 },
  { code: "FOOD_JOOJE_50", title: "جوجه ۵۰٪", category: "غذاهای اصلی", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "5500000", sortOrder: 70 },
  { code: "FOOD_ZERESHK_CHICKEN_100", title: "زرشک پلو با مرغ ۱۰۰٪", aliases: ["زرشک‌پلو با مرغ ۱۰۰٪"], category: "غذاهای اصلی", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "8500000", sortOrder: 80 },
  { code: "FOOD_ZERESHK_CHICKEN_50", title: "زرشک پلو با مرغ ۵۰٪", aliases: ["زرشک‌پلو با مرغ ۵۰٪"], category: "غذاهای اصلی", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "5500000", sortOrder: 90 },
  { code: "FOOD_SELF_SERVICE", title: "سلف", category: "غذاهای اصلی", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "12000000", sortOrder: 100 },
  { code: "FOOD_SHIRIN_POLO_50", title: "شیرین پلو ۵۰٪", aliases: ["شیرین‌پلو ۵۰٪"], category: "غذاهای اصلی", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "6500000", sortOrder: 110 },
  { code: "FOOD_FESENJAN_NO_RICE_50", title: "فسنجان بدون برنج ۵۰٪", category: "غذاهای اصلی", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "7500000", sortOrder: 120 },
  { code: "FOOD_LOGHME_NO_RICE_50", title: "لقمه بدون برنج ۵۰٪", category: "غذاهای اصلی", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "5000000", sortOrder: 130 },
  { code: "FOOD_LOGHME_100", title: "لقمه ۱۰۰٪", category: "غذاهای اصلی", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "9000000", sortOrder: 140 },
  { code: "FOOD_LOGHME_50", title: "لقمه ۵۰٪", category: "غذاهای اصلی", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "6000000", sortOrder: 150 },
  { code: "FOOD_CHICKEN_RICE_50", title: "مرغ و پلو ۵۰٪", category: "غذاهای اصلی", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "5500000", sortOrder: 160 },

  { code: "DRINK_WATER", title: "آب معدنی", category: "نوشیدنی‌ها", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "450000", sortOrder: 210 },
  { code: "DRINK_INDUSTRIAL_JUICE", title: "آب میوه صنعتی", aliases: ["آب‌میوه صنعتی"], category: "نوشیدنی‌ها", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "800000", sortOrder: 220 },
  { code: "DRINK_NATURAL_JUICE", title: "آب میوه طبیعی", aliases: ["آب‌میوه طبیعی"], category: "نوشیدنی‌ها", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "1800000", sortOrder: 230 },
  { code: "DRINK_NESCAFE", title: "نسکافه", category: "نوشیدنی‌ها", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "900000", sortOrder: 240 },
  { code: "DRINK_CAN_SODA", title: "نوشابه قوطی", category: "نوشیدنی‌ها", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "850000", sortOrder: 250 },
  { code: "DRINK_TEA", title: "چای", category: "نوشیدنی‌ها", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "350000", sortOrder: 260 },
  { code: "DRINK_TEA_NESCAFE", title: "چای و نسکافه", category: "نوشیدنی‌ها", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "1100000", sortOrder: 270 },

  { code: "DESSERT_TRADITIONAL_ICE_CREAM", title: "بستنی سنتی", category: "دسرها و مخلفات", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "900000", sortOrder: 310 },
  { code: "DESSERT_GENERIC", title: "دسر", category: "دسرها و مخلفات", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "850000", sortOrder: 320 },
  { code: "DESSERT_SEASON_SALAD", title: "سالاد فصل", category: "دسرها و مخلفات", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "750000", sortOrder: 330 },
  { code: "DESSERT_JELLY", title: "ژله", category: "دسرها و مخلفات", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "450000", sortOrder: 340 },
  { code: "DESSERT_CARAMEL", title: "کرم کارامل", category: "دسرها و مخلفات", pricingType: "PER_GUEST", unit: "نفر", pricePerGuest: "800000", sortOrder: 350 },
];

const defaultEventTypes = [
  "عروسی",
  "نامزدی",
  "تولد",
  "مذهبی",
  "سازمانی",
  "همایش",
  "ولیمه",
  "ترحیم",
  "سایر",
] as const;

function isEmptyPrice(value: unknown) {
  return value === null || value === undefined || Number(value.toString()) <= 0;
}

async function findExistingService(
  db: CatalogClient,
  tenantId: string,
  item: DefaultServiceCatalogItem,
) {
  return db.service.findFirst({
    where: {
      tenantId,
      OR: [
        { code: item.code },
        { title: item.title },
        ...(item.aliases ?? []).map((title) => ({ title })),
      ],
    },
    select: {
      id: true,
      code: true,
      title: true,
      price: true,
      basePrice: true,
    },
  });
}

async function ensureDefaultService(
  db: CatalogClient,
  tenantId: string,
  item: DefaultServiceCatalogItem,
) {
  const existing = await findExistingService(db, tenantId, item);

  if (!existing) {
    await db.service.create({
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
    ? await db.service.findFirst({
        where: { tenantId, code: item.code, NOT: { id: existing.id } },
        select: { id: true },
      })
    : null;

  await db.service.update({
    where: { id: existing.id },
    data: {
      code: existing.code || codeConflict ? undefined : item.code,
      price: isEmptyPrice(existing.price) ? item.price : undefined,
      basePrice: isEmptyPrice(existing.basePrice) ? item.price : undefined,
    },
  });
}

async function findExistingMenu(
  db: CatalogClient,
  tenantId: string,
  item: DefaultMenuCatalogItem,
) {
  return db.menu.findFirst({
    where: {
      tenantId,
      OR: [
        { code: item.code },
        { title: item.title },
        ...(item.aliases ?? []).map((title) => ({ title })),
      ],
    },
    select: {
      id: true,
      code: true,
      title: true,
      pricePerGuest: true,
      basePrice: true,
    },
  });
}

async function ensureDefaultMenu(
  db: CatalogClient,
  tenantId: string,
  item: DefaultMenuCatalogItem,
) {
  const existing = await findExistingMenu(db, tenantId, item);

  if (!existing) {
    await db.menu.create({
      data: {
        tenantId,
        code: item.code,
        title: item.title,
        category: item.category,
        pricingType: item.pricingType,
        unit: item.unit,
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
    ? await db.menu.findFirst({
        where: { tenantId, code: item.code, NOT: { id: existing.id } },
        select: { id: true },
      })
    : null;

  await db.menu.update({
    where: { id: existing.id },
    data: {
      code: existing.code || codeConflict ? undefined : item.code,
      pricePerGuest: isEmptyPrice(existing.pricePerGuest) ? item.pricePerGuest : undefined,
      basePrice: isEmptyPrice(existing.basePrice) ? item.pricePerGuest : undefined,
    },
  });
}

export async function ensureContractCatalogDefaults(
  db: CatalogClient,
  tenantId: string,
) {
  for (const item of defaultServiceCatalog) {
    await ensureDefaultService(db, tenantId, item);
  }

  for (const item of defaultMenuCatalog) {
    await ensureDefaultMenu(db, tenantId, item);
  }

  await Promise.all(
    defaultEventTypes.map((name, index) =>
      db.contractEventType.upsert({
        where: {
          tenantId_name: {
            tenantId,
            name,
          },
        },
        update: {},
        create: {
          tenantId,
          name,
          sortOrder: index,
          isActive: true,
        },
      }),
    ),
  );
}
