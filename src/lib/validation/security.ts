import { z } from "zod";

function passwordField(minLength: number, message: string) {
  return z
    .unknown()
    .transform((value) => (typeof value === "string" ? value : ""))
    .pipe(
      z
        .string()
        .min(minLength, message)
        .max(128, "رمز عبور نباید بیشتر از ۱۲۸ کاراکتر باشد"),
    );
}

export const changePasswordSchema = z
  .object({
    currentPassword: passwordField(1, "رمز عبور فعلی الزامی است."),
    newPassword: passwordField(
      8,
      "رمز عبور جدید باید حداقل ۸ کاراکتر باشد.",
    ),
    confirmPassword: passwordField(1, "تکرار رمز عبور جدید الزامی است."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "تکرار رمز عبور با رمز عبور جدید یکسان نیست.",
    path: ["confirmPassword"],
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "رمز عبور جدید نباید با رمز عبور فعلی یکسان باشد.",
    path: ["newPassword"],
  });
