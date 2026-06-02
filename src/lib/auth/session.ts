import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Prisma, User, UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth/options";
import { getPrisma } from "@/lib/prisma";

type TenantMemberWithTenant = Prisma.TenantMemberGetPayload<{
  include: {
    tenant: {
      include: {
        subscription: true;
        hallProfile: {
          select: {
            brandName: true;
            legalName: true;
          };
        };
      };
    };
    user: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
  };
}>;

export async function getCurrentUser(): Promise<User | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const db = await getPrisma();

  return db.user.findUnique({
    where: { id: session.user.id },
  });
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.status === "SUSPENDED") {
    redirect("/login?error=suspended");
  }

  return user;
}

export async function getCurrentTenantMember(
  userId?: string,
): Promise<TenantMemberWithTenant | null> {
  const user = userId ? null : await getCurrentUser();
  const resolvedUserId = userId ?? user?.id;

  if (!resolvedUserId) {
    return null;
  }

  const db = await getPrisma();

  const memberships = await db.tenantMember.findMany({
    where: {
      userId: resolvedUserId,
      tenant: {
        status: {
          not: "ARCHIVED",
        },
      },
    },
    include: {
      tenant: {
        include: {
          subscription: true,
          hallProfile: {
            select: {
              brandName: true,
              legalName: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return memberships.sort(compareTenantMembershipPriority)[0] ?? null;
}

function compareTenantMembershipPriority(
  left: TenantMemberWithTenant,
  right: TenantMemberWithTenant,
) {
  const scoreDiff =
    getTenantMembershipPriorityScore(right) -
    getTenantMembershipPriorityScore(left);

  if (scoreDiff !== 0) return scoreDiff;

  return right.updatedAt.getTime() - left.updatedAt.getTime();
}

function getTenantMembershipPriorityScore(membership: TenantMemberWithTenant) {
  const subscription = membership.tenant.subscription;
  const hasPaidPlan = Boolean(
    subscription?.plan && subscription.plan !== "DEMO",
  );

  if (hasPaidPlan && subscription?.status === "ACTIVE") return 100;
  if (hasPaidPlan && subscription?.status === "TRIALING") return 90;
  if (membership.tenant.status === "ACTIVE") return 80;
  if (
    hasPaidPlan &&
    subscription?.status !== "EXPIRED" &&
    subscription?.status !== "CANCELED"
  ) {
    return 70;
  }
  if (membership.tenant.status === "SUSPENDED") return 30;

  return 10;
}

export async function getCurrentTenant() {
  const membership = await getCurrentTenantMember();

  return membership?.tenant ?? null;
}

export async function requireTenantMember(): Promise<TenantMemberWithTenant> {
  const user = await requireUser();
  const membership = await getCurrentTenantMember(user.id);

  if (!membership) {
    redirect("/account");
  }

  return membership;
}

export async function requireTenantRole(
  roles: UserRole[],
): Promise<TenantMemberWithTenant> {
  const membership = await requireTenantMember();

  if (!roles.includes(membership.role)) {
    redirect("/dashboard");
  }

  return membership;
}
