import "server-only";

type SendTelegramMessageInput = {
  botToken: string;
  chatId: string;
  text: string;
  parseMode?: "HTML" | "MarkdownV2";
};

type SendTelegramMessageResult =
  | { ok: true; messageId?: number }
  | { ok: false; error: string };

type TelegramChatResult =
  | { ok: true; chatId: string; title: string; type?: string }
  | { ok: false; error: string };

type TelegramRecentChatsResult =
  | {
      ok: true;
      chats: Array<{
        chatId: string;
        title: string;
        type: string;
      }>;
    }
  | { ok: false; error: string };

type TelegramApiResponse = {
  ok?: boolean;
  description?: string;
  result?: {
    message_id?: number;
  };
};

type TelegramGetChatApiResponse = {
  ok?: boolean;
  description?: string;
  result?: {
    id?: number | string;
    type?: string;
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
};

type TelegramUpdatesApiResponse = {
  ok?: boolean;
  description?: string;
  result?: Array<{
    message?: { chat?: TelegramGetChatApiResponse["result"] };
    edited_message?: { chat?: TelegramGetChatApiResponse["result"] };
    channel_post?: { chat?: TelegramGetChatApiResponse["result"] };
    edited_channel_post?: { chat?: TelegramGetChatApiResponse["result"] };
    my_chat_member?: { chat?: TelegramGetChatApiResponse["result"] };
  }>;
};

const telegramMessageLimit = 4096;
const defaultTelegramApiBaseUrl = "https://api.telegram.org";
const requestTimeoutMs = 25_000;


function getTelegramApiBaseUrl() {
  const configured = process.env.TELEGRAM_API_BASE_URL?.trim();
  const baseUrl = configured || defaultTelegramApiBaseUrl;

  return baseUrl.replace(/\/+$/, "");
}

function buildTelegramApiUrl(botToken: string, method: string) {
  return `${getTelegramApiBaseUrl()}/bot${botToken}/${method}`;
}

function cleanTelegramNetworkError(error: unknown, action: "discover" | "recent" | "send") {
  const actionLabel =
    action === "send"
      ? "ارسال پیام"
      : action === "recent"
        ? "دریافت گفتگوهای اخیر"
        : "دریافت اطلاعات گفتگو";

  if (error instanceof Error && error.name === "AbortError") {
    return `${actionLabel} از تلگرام در زمان مناسب انجام نشد. معمولاً یعنی سرور برنامه به api.telegram.org دسترسی ندارد، اینترنت/فیلترینگ مسیر را بسته یا به VPN/Proxy سراسری نیاز دارید. اگر فقط مرورگر VPN دارد کافی نیست؛ Node.js هم باید به تلگرام دسترسی داشته باشد.`;
  }

  if (error instanceof Error && /fetch failed|ENOTFOUND|ECONNRESET|ETIMEDOUT|ECONNREFUSED|network/i.test(error.message)) {
    return `${actionLabel} به‌خاطر خطای شبکه انجام نشد. اتصال سرور برنامه به Telegram Bot API را بررسی کنید یا TELEGRAM_API_BASE_URL را روی پراکسی مجاز تنظیم کنید.`;
  }

  return `${actionLabel} با تلگرام انجام نشد. اتصال شبکه و دسترسی بات را بررسی کنید.`;
}

function sanitizeMessage(text: string) {
  const normalized = text.trim();

  if (normalized.length <= telegramMessageLimit) {
    return normalized;
  }

  return `${normalized.slice(0, telegramMessageLimit - 1)}…`;
}

function cleanTelegramError(description: string | undefined, status: number) {
  if (!description) {
    return `درخواست تلگرام با کد ${status} ناموفق بود.`;
  }

  if (/chat not found/i.test(description)) {
    return "شناسه گفت‌وگو در تلگرام پیدا نشد. مطمئن شوید بات به گفت‌وگو اضافه شده و chat_id درست است.";
  }

  if (/bot was blocked/i.test(description)) {
    return "بات توسط گیرنده مسدود شده است. ابتدا گفت‌وگو با بات را فعال کنید.";
  }

  if (/unauthorized/i.test(description) || /not found/i.test(description)) {
    return "توکن بات تلگرام معتبر نیست یا دسترسی لازم را ندارد.";
  }

  return description.replace(/^Bad Request:\s*/i, "").slice(0, 500);
}

function cleanTelegramDiscoveryError(description: string | undefined, status: number) {
  if (!description) {
    return `ارتباط با تلگرام با کد ${status} ناموفق بود. دوباره تلاش کنید.`;
  }

  if (/chat not found/i.test(description)) {
    return "بات به این گفتگو دسترسی ندارد یا شناسه گفتگو معتبر نیست.";
  }

  if (/unauthorized|not found/i.test(description)) {
    return "توکن بات تلگرام معتبر نیست.";
  }

  if (/forbidden/i.test(description)) {
    return "برای کانال یا گروه خصوصی، بات باید عضو یا مدیر گفتگو باشد.";
  }

  if (/conflict/i.test(description)) {
    return "دریافت گفتگوهای اخیر ممکن نیست؛ ممکن است webhook بات در جای دیگری فعال باشد.";
  }

  return description.replace(/^Bad Request:\s*/i, "").slice(0, 280);
}

function getChatTitle(chat: TelegramGetChatApiResponse["result"]) {
  if (!chat) {
    return "گفتگوی تلگرام";
  }

  const name = [chat.first_name, chat.last_name].filter(Boolean).join(" ").trim();

  return chat.title || name || (chat.username ? `@${chat.username}` : "گفتگوی تلگرام");
}

function extractChatFromUpdate(update: NonNullable<TelegramUpdatesApiResponse["result"]>[number]) {
  return (
    update.message?.chat ??
    update.edited_message?.chat ??
    update.channel_post?.chat ??
    update.edited_channel_post?.chat ??
    update.my_chat_member?.chat ??
    null
  );
}

export function normalizeTelegramChatLookup(value: string) {
  const normalized = value.trim().replace(/[\u200e\u200f\u202a-\u202e]/g, "");

  if (!normalized) {
    return "";
  }

  const withoutProtocol = normalized
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "");
  const tmeMatch = /^(?:t\.me|telegram\.me)\/([^/?#\s]+)(?:[/?#].*)?$/i.exec(withoutProtocol);

  if (tmeMatch?.[1]) {
    const slug = tmeMatch[1].replace(/^@/, "").trim();

    if (/^(joinchat|\+|c$)/i.test(slug)) {
      return "";
    }

    return /^-?\d+$/.test(slug) ? slug : `@${slug}`;
  }

  if (/^-?\d+$/.test(normalized)) {
    return normalized;
  }

  if (/^@[A-Za-z0-9_]{5,64}$/.test(normalized)) {
    return normalized;
  }

  if (/^[A-Za-z0-9_]{5,64}$/.test(normalized)) {
    return `@${normalized}`;
  }

  return "";
}

export async function getTelegramChat({
  botToken,
  chatIdOrUsername,
}: {
  botToken: string;
  chatIdOrUsername: string;
}): Promise<TelegramChatResult> {
  const token = botToken.trim();
  const chatId = normalizeTelegramChatLookup(chatIdOrUsername);

  if (!token) {
    return { ok: false, error: "توکن بات تلگرام ثبت نشده است." };
  }

  if (!chatId) {
    return { ok: false, error: "شناسه یا لینک گفتگو معتبر نیست." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const url = new URL(buildTelegramApiUrl(token, "getChat"));
    url.searchParams.set("chat_id", chatId);

    const response = await fetch(url, { signal: controller.signal });
    const payload = (await response.json().catch(() => ({}))) as TelegramGetChatApiResponse;

    if (!response.ok || payload.ok === false || !payload.result?.id) {
      return {
        ok: false,
        error: cleanTelegramDiscoveryError(payload.description, response.status),
      };
    }

    return {
      ok: true,
      chatId: String(payload.result.id),
      title: getChatTitle(payload.result),
      type: payload.result.type,
    };
  } catch (error) {
    return { ok: false, error: cleanTelegramNetworkError(error, "discover") };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getTelegramRecentChats({
  botToken,
}: {
  botToken: string;
}): Promise<TelegramRecentChatsResult> {
  const token = botToken.trim();

  if (!token) {
    return { ok: false, error: "توکن بات تلگرام ثبت نشده است." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const url = new URL(buildTelegramApiUrl(token, "getUpdates"));
    url.searchParams.set("limit", "30");

    const response = await fetch(url, {
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => ({}))) as TelegramUpdatesApiResponse;

    if (!response.ok || payload.ok === false) {
      return {
        ok: false,
        error: cleanTelegramDiscoveryError(payload.description, response.status),
      };
    }

    const uniqueChats = new Map<string, { chatId: string; title: string; type: string }>();

    for (const update of payload.result ?? []) {
      const chat = extractChatFromUpdate(update);

      if (!chat?.id) {
        continue;
      }

      const chatId = String(chat.id);

      if (!uniqueChats.has(chatId)) {
        uniqueChats.set(chatId, {
          chatId,
          title: getChatTitle(chat),
          type: chat.type ?? "private",
        });
      }

      if (uniqueChats.size >= 10) {
        break;
      }
    }

    return { ok: true, chats: Array.from(uniqueChats.values()) };
  } catch (error) {
    return { ok: false, error: cleanTelegramNetworkError(error, "recent") };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendTelegramMessage(
  input: SendTelegramMessageInput,
): Promise<SendTelegramMessageResult> {
  const botToken = input.botToken.trim();
  const chatId = input.chatId.trim();
  const text = sanitizeMessage(input.text);

  if (!botToken || !chatId || !text) {
    return { ok: false, error: "توکن بات، شناسه گفت‌وگو و متن پیام الزامی است." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(
      buildTelegramApiUrl(botToken, "sendMessage"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: input.parseMode ?? "HTML",
          disable_web_page_preview: true,
        }),
        signal: controller.signal,
      },
    );

    const payload = (await response.json().catch(() => ({}))) as TelegramApiResponse;

    if (!response.ok || payload.ok === false) {
      return {
        ok: false,
        error: cleanTelegramError(payload.description, response.status),
      };
    }

    return { ok: true, messageId: payload.result?.message_id };
  } catch (error) {
    return { ok: false, error: cleanTelegramNetworkError(error, "send") };
  } finally {
    clearTimeout(timeout);
  }
}
