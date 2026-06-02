import { NextResponse } from "next/server";
import { requireTenantMember } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { toEnglishDigits } from "@/lib/validation/normalizers";

type CustomerSearchRow = {
  id: string;
  salutation: string | null;
  fullName: string;
  phone: string;
  nationalCode: string | null;
  nationalId: string | null;
  address: string | null;
};

export async function GET(request: Request) {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const normalizedQuery = toEnglishDigits(query).replace(/[\s-]/g, "");

  if (query.length < 2 && normalizedQuery.length < 2) {
    return NextResponse.json({ customers: [] });
  }

  const customers = (await db.customer.findMany({
    where: {
      tenantId: membership.tenantId,
      OR: [
        { fullName: { contains: query } },
        { phone: { contains: normalizedQuery || query } },
        { nationalId: { contains: normalizedQuery || query } },
        { nationalCode: { contains: normalizedQuery || query } },
      ],
    },
    select: {
      id: true,
      salutation: true,
      fullName: true,
      phone: true,
      nationalCode: true,
      nationalId: true,
      address: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
  })) as CustomerSearchRow[];

  return NextResponse.json({
    customers: customers.map((customer) => {
      const nationalCode = customer.nationalCode ?? customer.nationalId ?? "";

      return {
        id: customer.id,
        salutation: customer.salutation,
        fullName: customer.fullName,
        phone: customer.phone,
        nationalCode,
        maskedNationalCode: nationalCode
          ? `${nationalCode.slice(0, 3)}••••${nationalCode.slice(-3)}`
          : "",
        address: customer.address ?? "",
      };
    }),
  });
}
