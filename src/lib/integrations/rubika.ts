import "server-only";

type SendRubikaMessageInput = {
  botToken: string;
  chatId: string;
  text: string;
};

type SendRubikaMessageResult =
  | { ok: true; messageId?: number | string }
  | { ok: false; error: string };

type RubikaRecentChatsResult =
  | {
      ok: true;
      chats: Array<{
        chatId: string;
        title: string;
        type: string;
      }>;
    }
  | { ok: false; error: string };

type RubikaApiResponse = {
  status?: string;
  ok?: boolean;
  message?: string;
  description?: string;
  data?: {
    message_id?: number | string;
    updates?: RubikaUpdate[];
    next_offset_id?: string;
  };
  result?: {
    message_id?: number | string;
    updates?: RubikaUpdate[];
  };
  message_id?: number | string;
  updates?: RubikaUpdate[];
};

type RubikaUpdate = {
  type?: string;
  chat_id?: string;
  chat?: RubikaChat;
  new_message?: RubikaMessage;
  message?: RubikaMessage;
  inline_message?: RubikaMessage;
};

type RubikaMessage = {
  message_id?: string;
  text?: string;
  chat_id?: string;
  chat?: RubikaChat;
  sender_type?: string;
  sender_id?: string;
};

type RubikaChat = {
  chat_id?: string;
  id?: number | string;
  chat_type?: string;
  type?: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

const rubikaMessageLimit = 4096;
const defaultRubikaApiBaseUrl = "https://botapi.rubika.ir/v3";
const requestTimeoutMs = 25_000;

function getRubikaApiBaseUrl() {
  const configured = process.env.RUBIKA_API_BASE_URL?.trim();
  const baseUrl = configured || defaultRubikaApiBaseUrl;

  return baseUrl.replace(/\/+$/, "");
}

function buildRubikaApiUrl(botToken: string, method: string) {
  return `${getRubikaApiBaseUrl()}/${encodeURIComponent(botToken)}/${method}`;
}

function cleanRubikaNetworkError(error: unknown, action: "recent" | "send") {
  const actionLabel = action === "send" ? "ارسال پیام" : "دریافت گفتگوهای اخیر";

  if (error instanceof Error && error.name === "AbortError") {
    return `${actionLabel} از روبیکا در زمان مناسب انجام نشد. اتصال سرور برنامه به Rubika Bot API یا مقدار RUBIKA_API_BASE_URL را بررسی کنید.`;
  }

  if (error instanceof Error && /fetch failed|ENOTFOUND|ECONNRESET|ETIMEDOUT|ECONNREFUSED|network/i.test(error.message)) {
    return `${actionLabel} به‌خاطر خطای شبکه انجام نشد. اتصال سرور برنامه به botapi.rubika.ir یا پراکسی مجاز را بررسی کنید.`;
  }

  return `${actionLabel} با روبیکا انجام نشد. اتصال شبکه، توکن بات و شناسه گفتگو را بررسی کنید.`;
}

function getRubikaDescription(payload: RubikaApiResponse, status: number) {
  return payload.message || payload.description || `درخواست روبیکا با کد ${status} ناموفق بود.`;
}

function isRubikaPayloadFailed(payload: RubikaApiResponse, responseOk: boolean) {
  if (!responseOk) {
    return true;
  }

  if (payload.ok === false) {
    return true;
  }

  if (typeof payload.status === "string" && !/^ok$/i.test(payload.status)) {
    return true;
  }

  return false;
}

function cleanRubikaError(description: string | undefined, status: number) {
  if (!description) {
    return `درخواست روبیکا با کد ${status} ناموفق بود.`;
  }

  if (/chat not found|chat_id/i.test(description)) {
    return "شناسه گفت‌وگو در روبیکا پیدا نشد. مطمئن شوید بات به گفت‌وگو اضافه شده و chat_id درست است.";
  }

  if (/blocked/i.test(description)) {
    return "بات روبیکا توسط گیرنده مسدود شده است. ابتدا گفت‌وگو با بات را فعال کنید.";
  }

  if (/unauthorized|token|not found/i.test(description)) {
    return "توکن بات روبیکا معتبر نیست یا دسترسی لازم را ندارد.";
  }

  if (/forbidden|permission|access/i.test(description)) {
    return "بات روبیکا به این گفتگو دسترسی ندارد. برای گروه یا کانال، بات باید عضو یا مدیر گفتگو باشد.";
  }

  return description.replace(/^Bad Request:\s*/i, "").slice(0, 500);
}

function sanitizeMessage(text: string) {
  const normalized = text.trim();

  if (normalized.length <= rubikaMessageLimit) {
    return normalized;
  }

  return `${normalized.slice(0, rubikaMessageLimit - 1)}…`;
}

function getChatTitle(chat: RubikaChat | undefined, chatId: string) {
  if (!chat) {
    return `گفتگوی روبیکا ${chatId}`;
  }

  const name = [chat.first_name, chat.last_name].filter(Boolean).join(" ").trim();

  return chat.title || name || (chat.username ? `@${chat.username}` : `گفتگوی روبیکا ${chatId}`);
}

function extractChatIdFromUpdate(update: RubikaUpdate) {
  return (
    update.chat_id ??
    update.chat?.chat_id ??
    update.chat?.id?.toString() ??
    update.new_message?.chat_id ??
    update.new_message?.chat?.chat_id ??
    update.new_message?.chat?.id?.toString() ??
    update.message?.chat_id ??
    update.message?.chat?.chat_id ??
    update.message?.chat?.id?.toString() ??
    update.inline_message?.chat_id ??
    update.inline_message?.chat?.chat_id ??
    update.inline_message?.chat?.id?.toString() ??
    ""
  );
}

function extractChatFromUpdate(update: RubikaUpdate) {
  return update.chat ?? update.new_message?.chat ?? update.message?.chat ?? update.inline_message?.chat;
}

function extractUpdates(payload: RubikaApiResponse) {
  return payload.data?.updates ?? payload.result?.updates ?? payload.updates ?? [];
}

export function normalizeRubikaChatLookup(value: string) {
  const normalized = value.trim().replace(/[‎‏‪-‮]/g, "");

  if (!normalized) {
    return "";
  }

  const withoutProtocol = normalized
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "");
  const rubikaMatch = /^(?:rubika\.ir|rubika\.ai|web\.rubika\.ir)\/([^/?#\s]+)(?:[/?#].*)?$/i.exec(withoutProtocol);

  if (rubikaMatch?.[1]) {
    const slug = rubikaMatch[1].replace(/^@/, "").trim();

    return /^[A-Za-z0-9_@-]{3,128}$/.test(slug) ? slug : "";
  }

  if (/^[A-Za-z0-9_@-]{3,128}$/.test(normalized)) {
    return normalized;
  }

  return "";
}

export async function getRubikaRecentChats({
  botToken,
}: {
  botToken: string;
}): Promise<RubikaRecentChatsResult> {
  const token = botToken.trim();

  if (!token) {
    return { ok: false, error: "توکن بات روبیکا ثبت نشده است." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(buildRubikaApiUrl(token, "getUpdates"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 30 }),
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => ({}))) as RubikaApiResponse;

    if (isRubikaPayloadFailed(payload, response.ok)) {
      return {
        ok: false,
        error: cleanRubikaError(getRubikaDescription(payload, response.status), response.status),
      };
    }

    const uniqueChats = new Map<string, { chatId: string; title: string; type: string }>();

    for (const update of extractUpdates(payload)) {
      const chatId = extractChatIdFromUpdate(update);

      if (!chatId) {
        continue;
      }

      const chat = extractChatFromUpdate(update);

      if (!uniqueChats.has(chatId)) {
        uniqueChats.set(chatId, {
          chatId,
          title: getChatTitle(chat, chatId),
          type: chat?.chat_type ?? chat?.type ?? update.type ?? "chat",
        });
      }

      if (uniqueChats.size >= 10) {
        break;
      }
    }

    return { ok: true, chats: Array.from(uniqueChats.values()) };
  } catch (error) {
    return { ok: false, error: cleanRubikaNetworkError(error, "recent") };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendRubikaMessage(
  input: SendRubikaMessageInput,
): Promise<SendRubikaMessageResult> {
  const botToken = input.botToken.trim();
  const chatId = input.chatId.trim();
  const text = sanitizeMessage(input.text);

  if (!botToken || !chatId || !text) {
    return { ok: false, error: "توکن بات، شناسه گفت‌وگو و متن پیام الزامی است." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(buildRubikaApiUrl(botToken, "sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => ({}))) as RubikaApiResponse;

    if (isRubikaPayloadFailed(payload, response.ok)) {
      return {
        ok: false,
        error: cleanRubikaError(getRubikaDescription(payload, response.status), response.status),
      };
    }

    return { ok: true, messageId: payload.data?.message_id ?? payload.result?.message_id ?? payload.message_id };
  } catch (error) {
    return { ok: false, error: cleanRubikaNetworkError(error, "send") };
  } finally {
    clearTimeout(timeout);
  }
}
