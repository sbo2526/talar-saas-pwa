import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { StaleSessionCleaner } from "@/components/auth/stale-session-cleaner";
import { authOptions } from "@/lib/auth/options";
import { getCurrentUser } from "@/lib/auth/session";

type LoginPageProps = {
  searchParams: Promise<{
    registered?: string;
    error?: string;
    session?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const session = await getServerSession(authOptions);
  const user = await getCurrentUser();
  const hasStaleSession = Boolean(session?.user && !user);

  if (user && session?.user?.isPlatformAdmin) {
    redirect("/admin");
  }

  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      title="ورود به تالار منیجر"
      description="برای ادامه، وارد حساب کاربری خود شوید و به پنل مدیریت تالار دسترسی پیدا کنید."
      footerText="هنوز حساب ندارید؟"
      footerHref="/register"
      footerLink="ساخت حساب جدید"
    >
      <StaleSessionCleaner shouldClear={hasStaleSession} />
      <LoginForm
        registered={resolvedSearchParams.registered === "1"}
        suspended={resolvedSearchParams.error === "suspended"}
        staleSession={hasStaleSession || resolvedSearchParams.session === "expired"}
      />
    </AuthShell>
  );
}
