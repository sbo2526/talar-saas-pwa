import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <AuthShell
      title="ساخت حساب تالار منیجر"
      description="حساب خود را بسازید تا بتوانید دوره بررسی یک‌باره را فعال کرده و فضای اختصاصی تالار را بررسی کنید."
      footerText="قبلاً حساب ساخته‌اید؟"
      footerHref="/login"
      footerLink="ورود به سامانه"
    >
      <RegisterForm />
    </AuthShell>
  );
}
