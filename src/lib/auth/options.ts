import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { loginSchema } from "@/lib/auth/schemas";
import { getPrisma } from "@/lib/prisma";

function parsePlatformAdminEmails() {
  const raw = [process.env.PLATFORM_ADMIN_EMAIL, process.env.PLATFORM_ADMIN_EMAILS]
    .filter(Boolean)
    .join(",");

  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isPlatformAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  return parsePlatformAdminEmails().has(email.trim().toLowerCase());
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const db = await getPrisma();
        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user?.passwordHash || user.status === "SUSPENDED") {
          return null;
        }

        const passwordIsValid = await compare(
          parsed.data.password,
          user.passwordHash,
        );

        if (!passwordIsValid) {
          return null;
        }

        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.status = user.status;
        token.isPlatformAdmin = isPlatformAdminEmail(user.email);
      } else if (token.email) {
        token.isPlatformAdmin = isPlatformAdminEmail(String(token.email));
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.status = token.status;
        session.user.isPlatformAdmin = Boolean(token.isPlatformAdmin);
      }

      return session;
    },
  },
};
