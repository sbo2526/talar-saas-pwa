import type { DefaultSession } from "next-auth";

type AppUserStatus = "ACTIVE" | "INVITED" | "SUSPENDED";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      status: AppUserStatus;
      isPlatformAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    status: AppUserStatus;
    isPlatformAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    status: AppUserStatus;
    isPlatformAdmin?: boolean;
  }
}
