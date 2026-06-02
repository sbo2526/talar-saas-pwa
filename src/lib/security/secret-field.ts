import crypto from "crypto";

const encryptionVersion = "v1";
const algorithm = "aes-256-gcm";

function resolveSecretKey() {
  return (
    process.env.NOTIFICATION_SECRET_KEY ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    ""
  ).trim();
}

function createKey(secret: string) {
  return crypto.createHash("sha256").update(secret).digest();
}

export function maskSecret(value: string, visibleStart = 6, visibleEnd = 4): string {
  const normalized = value.trim();

  if (!normalized) {
    return "";
  }

  if (normalized.length <= visibleStart + visibleEnd + 2) {
    const first = normalized.slice(0, Math.min(2, normalized.length));
    const last = normalized.length > 4 ? normalized.slice(-2) : "";
    return `${first}••••${last}`;
  }

  return `${normalized.slice(0, visibleStart)}••••••••${normalized.slice(-visibleEnd)}`;
}

export function encryptSecret(value: string): string {
  const secret = resolveSecretKey();

  if (!secret) {
    throw new Error(
      "NOTIFICATION_SECRET_KEY, NEXTAUTH_SECRET یا AUTH_SECRET برای ذخیره امن مقدار محرمانه تنظیم نشده است.",
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error("مقدار محرمانه برای رمزگذاری خالی است.");
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, createKey(secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(normalized, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    encryptionVersion,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptSecret(value: string): string {
  const secret = resolveSecretKey();

  if (!secret) {
    throw new Error(
      "NOTIFICATION_SECRET_KEY, NEXTAUTH_SECRET یا AUTH_SECRET برای خواندن مقدار محرمانه تنظیم نشده است.",
    );
  }

  const [version, ivValue, authTagValue, encryptedValue] = value.split(":");

  if (version !== encryptionVersion || !ivValue || !authTagValue || !encryptedValue) {
    throw new Error("ساختار مقدار محرمانه معتبر نیست.");
  }

  const decipher = crypto.createDecipheriv(
    algorithm,
    createKey(secret),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
