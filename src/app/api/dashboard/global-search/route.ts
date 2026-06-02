import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDate } from "@/lib/date/jalali";
import { formatIRR } from "@/lib/formatters";
import { getPrisma } from "@/lib/prisma";
import { toEnglishDigits } from "@/lib/validation/normalizers";

type GlobalSearchResult = {
  id: string;
  type: "contract";
  title: string;
  subtitle: string;
  meta: string;
  href: string;
  badge: string;
};

export async function GET(request: Request) {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q") ?? "";
  const textQuery = normalizeSearchText(rawQuery);

  if (textQuery.length < 2) {
    return NextResponse.json({ results: [] satisfies GlobalSearchResult[] });
  }

  const customers = await db.customer.findMany({
    where: {
      tenantId: membership.tenantId,
      ...buildCustomerNameWhere(textQuery),
    },
    select: {
      id: true,
      fullName: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 12,
  });

  if (!customers.length) {
    return NextResponse.json({ results: [] satisfies GlobalSearchResult[] });
  }

  const contracts = await db.contract.findMany({
    where: {
      tenantId: membership.tenantId,
      customerId: { in: customers.map((customer) => customer.id) },
    },
    select: {
      id: true,
      contractNo: true,
      title: true,
      status: true,
      eventDate: true,
      finalTotal: true,
      totalAmount: true,
      remainingAmount: true,
      customer: {
        select: {
          fullName: true,
        },
      },
    },
    orderBy: [{ eventDate: "desc" }, { updatedAt: "desc" }],
    take: 20,
  });

  const results = contracts.map<GlobalSearchResult>((contract) => {
    const finalAmount = Number(contract.finalTotal.toString()) > 0 ? contract.finalTotal : contract.totalAmount;
    const remainingAmount = contract.status === "CANCELED" ? 0 : Number(contract.remainingAmount.toString());
    const financialStatus = contract.status === "CANCELED"
      ? "بسته‌شده / کنسلی"
      : remainingAmount <= 0
        ? "تسویه‌شده"
        : "دریافت ناقص";

    return {
      id: contract.id,
      type: "contract",
      title: `${contract.customer.fullName} - قرارداد ${contract.contractNo}`,
      subtitle: `تاریخ مراسم ${formatJalaliDate(contract.eventDate)} · وضعیت ${contractStatusLabel(contract.status)}`,
      meta: `مبلغ نهایی ${formatIRR(finalAmount.toString())} · مانده ${formatIRR(remainingAmount)}`,
      href: `/dashboard/contracts/${contract.id}`,
      badge: financialStatus,
    };
  });

  return NextResponse.json({ results });
}

function normalizeSearchText(value: string) {
  return normalizePersianText(toEnglishDigits(value))
    .replace(/[،,٬]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePersianText(value: string) {
  return value
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .trim();
}

function toArabicPersianVariant(value: string) {
  return value.replace(/ی/g, "ي").replace(/ک/g, "ك");
}

function buildCustomerNameWhere(textQuery: string): Prisma.CustomerWhereInput {
  const terms = textQuery.split(" ").map((term) => term.trim()).filter((term) => term.length >= 2);

  if (terms.length > 1) {
    return {
      AND: terms.map((term) => ({
        OR: customerFullNameFilters(term),
      })),
    };
  }

  return {
    OR: customerFullNameFilters(textQuery),
  };
}

function customerFullNameFilters(value: string): Prisma.CustomerWhereInput[] {
  return uniqueStrings([value, normalizePersianText(value), toArabicPersianVariant(value)])
    .filter((candidate) => candidate.length >= 2)
    .map((candidate) => ({ fullName: { contains: candidate } }));
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function contractStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "پیش‌نویس",
    RESERVED: "رزروشده",
    CONFIRMED: "قطعی",
    COMPLETED: "برگزارشده",
    CANCELLED: "لغوشده",
  };

  return labels[status] ?? status;
}
