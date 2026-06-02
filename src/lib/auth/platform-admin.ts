import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { requireUser, getCurrentUser } from "@/lib/auth/session";

function parsePlatformAdminEmails() {
  const raw = [
    process.env.PLATFORM_ADMIN_EMAIL,
    process.env.PLATFORM_ADMIN_EMAILS,
  ]
    .filter(Boolean)
    .join(",");

  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function isPlatformAdminUser(user?: Pick<User, "email" | "status"> | null) {
  if (!user || user.status !== "ACTIVE") {
    return false;
  }

  const allowedEmails = parsePlatformAdminEmails();
  if (allowedEmails.size === 0) {
    return false;
  }

  return allowedEmails.has(user.email.toLowerCase());
}

export async function getCurrentPlatformAdmin() {
  const user = await getCurrentUser();

  if (!(await isPlatformAdminUser(user))) {
    return null;
  }

  return user;
}

export async function requirePlatformAdmin() {
  const user = await requireUser();

  if (!(await isPlatformAdminUser(user))) {
    redirect("/dashboard?adminError=forbidden");
  }

  return user;
}
