import "server-only";

import { normalizeSmsProvider } from "@/lib/integrations/sms-providers";

type SendSmsMessageInput = {
  provider: string;
  apiKey: string;
  senderNumber?: string | null;
  receptor: string;
  message: string;
};

type SendSmsMessageResult =
  | { ok: true; providerMessageId?: string }
  | { ok: false; error: string };

type KavenegarResponse = {
  return?: {
    status?: number;
    message?: string;
  };
  entries?: Array<{
    messageid?: number | string;
  }>;
};

type IppanelResponse = {
  code?: string | number;
  errorMessage?: string;
  message?: string;
  data?: {
    message_id?: number | string;
  } | null;
  errors?: unknown;
};

const requestTimeoutMs = 10_000;
const smsMessageLimit = 900;
const ippanelBaseUrl = "https://api2.ippanel.com/api/v1";

function sanitizeSmsText(message: string) {
  const normalized = message.replace(/\r\n/g, "\n").trim();

  if (normalized.length <= smsMessageLimit) {
    return normalized;
  }

  return `${normalized.slice(0, smsMessageLimit - 1)}…`;
}

function cleanKavenegarError(payload: KavenegarResponse | null, status: number) {
  const providerMessage = payload?.return?.message?.trim();

  if (providerMessage) {
    if (/invalid api/i.test(providerMessage) || /api/i.test(providerMessage)) {
      return "کلید API کاوه‌نگار معتبر نیست یا دسترسی ارسال ندارد.";
    }

    if (/receptor/i.test(providerMessage) || /mobile/i.test(providerMessage)) {
      return "شماره گیرنده پیامک معتبر نیست.";
    }

    return providerMessage.slice(0, 500);
  }

  if (status === 401 || status === 403) {
    return "کلید API پنل پیامکی معتبر نیست یا دسترسی ارسال ندارد.";
  }

  return `درخواست پیامک با کد ${status} ناموفق بود.`;
}

function normalizeIppanelRecipient(value: string) {
  const normalized = value.trim().replace(/[\s\-()]/g, "").replace(/^\+/, "");

  if (/^09\d{9}$/.test(normalized)) {
    return `98${normalized.slice(1)}`;
  }

  if (/^989\d{9}$/.test(normalized)) {
    return normalized;
  }

  if (/^00989\d{9}$/.test(normalized)) {
    return normalized.slice(2);
  }

  return normalized;
}

function normalizeIppanelSender(value: string | null | undefined) {
  const normalized = value?.trim().replace(/[\s\-()]/g, "").replace(/^\+/, "");

  if (!normalized) {
    return undefined;
  }

  if (normalized.startsWith("00")) {
    return normalized.slice(2);
  }

  return normalized;
}

function getIppanelErrorText(payload: IppanelResponse | null, status: number) {
  const providerMessage =
    payload?.errorMessage?.trim() ||
    payload?.message?.trim() ||
    (typeof payload?.errors === "string" ? payload.errors.trim() : "");

  if (providerMessage) {
    if (/api|apikey|token|unauthorized|forbidden|auth/i.test(providerMessage)) {
      return "کلید API فراز اس‌ام‌اس معتبر نیست یا دسترسی ارسال ندارد.";
    }

    if (/credit|balance|amount/i.test(providerMessage)) {
      return "اعتبار پنل فراز اس‌ام‌اس برای ارسال کافی نیست.";
    }

    if (/sender|originator|number/i.test(providerMessage)) {
      return "شماره ارسال‌کننده یا گیرنده در فراز اس‌ام‌اس معتبر نیست.";
    }

    return providerMessage.slice(0, 500);
  }

  if (status === 401 || status === 403) {
    return "کلید API فراز اس‌ام‌اس معتبر نیست یا دسترسی ارسال ندارد.";
  }

  return `درخواست فراز اس‌ام‌اس با کد ${status} ناموفق بود.`;
}

async function sendWithKavenegar(input: SendSmsMessageInput): Promise<SendSmsMessageResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const body = new URLSearchParams({
      receptor: input.receptor,
      message: sanitizeSmsText(input.message),
    });

    if (input.senderNumber?.trim()) {
      body.set("sender", input.senderNumber.trim());
    }

    const response = await fetch(
      `https://api.kavenegar.com/v1/${encodeURIComponent(input.apiKey.trim())}/sms/send.json`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: controller.signal,
      },
    );
    const payload = (await response.json().catch(() => null)) as KavenegarResponse | null;

    if (!response.ok || payload?.return?.status !== 200) {
      return { ok: false, error: cleanKavenegarError(payload, response.status) };
    }

    const providerMessageId = payload.entries?.[0]?.messageid;
    return {
      ok: true,
      providerMessageId: providerMessageId === undefined ? undefined : String(providerMessageId),
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "پاسخ پنل پیامکی در زمان مناسب دریافت نشد. دوباره تلاش کنید." };
    }

    return { ok: false, error: "ارسال پیامک با خطای ارتباطی مواجه شد." };
  } finally {
    clearTimeout(timeout);
  }
}

async function sendWithFarazSms(input: SendSmsMessageInput): Promise<SendSmsMessageResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const sender = normalizeIppanelSender(input.senderNumber);
  const recipient = normalizeIppanelRecipient(input.receptor);

  if (!sender) {
    return { ok: false, error: "برای فراز اس‌ام‌اس، شماره ارسال‌کننده پنل الزامی است." };
  }

  if (!/^98\d{10}$/.test(recipient)) {
    return { ok: false, error: "شماره گیرنده فراز اس‌ام‌اس باید موبایل معتبر ایران باشد." };
  }

  try {
    const response = await fetch(`${ippanelBaseUrl}/sms/send/webservice/single`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        apikey: input.apiKey.trim(),
      },
      body: JSON.stringify({
        sender,
        recipient: [recipient],
        message: sanitizeSmsText(input.message),
        description: {
          summary: "Talar Manager test SMS",
          count_recipient: "1",
        },
      }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as IppanelResponse | null;
    const providerMessageId = payload?.data?.message_id;

    if (!response.ok || providerMessageId === undefined || providerMessageId === null) {
      return { ok: false, error: getIppanelErrorText(payload, response.status) };
    }

    return { ok: true, providerMessageId: String(providerMessageId) };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "پاسخ فراز اس‌ام‌اس در زمان مناسب دریافت نشد. دوباره تلاش کنید." };
    }

    return { ok: false, error: "ارسال پیامک فراز اس‌ام‌اس با خطای ارتباطی مواجه شد." };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendSmsMessage(input: SendSmsMessageInput): Promise<SendSmsMessageResult> {
  const provider = normalizeSmsProvider(input.provider);
  const apiKey = input.apiKey.trim();
  const receptor = input.receptor.trim();
  const message = sanitizeSmsText(input.message);

  if (!provider) {
    return { ok: false, error: "ارائه‌دهنده پیامک معتبر نیست." };
  }

  if (!apiKey || !receptor || !message) {
    return { ok: false, error: "کلید API، شماره گیرنده و متن پیامک الزامی است." };
  }

  switch (provider) {
    case "KAVENEGAR":
      return sendWithKavenegar({ ...input, apiKey, receptor, message });
    case "FARAZSMS":
      return sendWithFarazSms({ ...input, apiKey, receptor, message });
    case "GHASEDAK":
    case "MELIPAYAMAK":
    case "CUSTOM":
      return { ok: false, error: "ارسال تست برای این ارائه‌دهنده هنوز پیکربندی نشده است." };
    default:
      return { ok: false, error: "ارائه‌دهنده پیامک معتبر نیست." };
  }
}
