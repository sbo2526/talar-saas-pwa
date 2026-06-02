import "server-only";

type SendBaleMessageInput = {
  botToken: string;
  chatId: string;
  text: string;
};

type SendBaleMessageResult =
  | { ok: true; messageId?: number | string }
  | { ok: false; error: string };

type BaleRecentChatsResult =
  | {
      ok: true;
      chats: Array<{
        chatId: string;
        title: string;
        type: string;
      }>;
    }
  | { ok: false; error: string };

type BaleApiResponse = {
  ok?: boolean;
  description?: string;
  result?: {
    message_id?: number | string;
  };
};

type BaleChat = {
  id?: number | string;
  type?: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type BaleUpdatesApiResponse = {
  ok?: boolean;
  description?: string;
  result?: Array<{
    message?: { chat?: BaleChat };
    edited_message?: { chat?: BaleChat };
    channel_post?: { chat?: BaleChat };
    edited_channel_post?: { chat?: BaleChat };
    my_chat_member?: { chat?: BaleChat };
  }>;
};

const baleMessageLimit = 4096;
const defaultBaleApiBaseUrl = "https://tapi.bale.ai";
const requestTimeoutMs = 25_000;

function getBaleApiBaseUrl() {
  const configured = process.env.BALE_API_BASE_URL?.trim();
  const baseUrl = configured || defaultBaleApiBaseUrl;

  return baseUrl.replace(/\/+$/, "");
}

function buildBaleApiUrl(botToken: string, method: string) {
  return `${getBaleApiBaseUrl()}/bot${botToken}/${method}`;
}

function cleanBaleNetworkError(error: unknown, action: "recent" | "send") {
  const actionLabel = action === "send" ? "ارسال پیام" : "دریافت گفتگوهای اخیر";

  if (error instanceof Error && error.name === "AbortError") {
    return `${actionLabel} از بله در زمان مناسب انجام نشد. اتصال سرور برنامه به Bale Bot API یا مقدار BALE_API_BASE_URL را بررسی کنید.`;
  }

  if (error instanceof Error && /fetch failed|ENOTFOUND|ECONNRESET|ETIMEDOUT|ECONNREFUSED|network/i.test(error.message)) {
    return `${actionLabel} به‌خاطر خطای شبکه انجام نشد. اتصال سرور برنامه به tapi.bale.ai یا پراکسی مجاز را بررسی کنید.`;
  }

  return `${actionLabel} با بله انجام نشد. اتصال شبکه، توکن بازو و شناسه گفتگو را بررسی کنید.`;
}

function cleanBaleError(description: string | undefined, status: number) {
  if (!description) {
    return `درخواست بله با کد ${status} ناموفق بود.`;
  }

  if (/chat not found/i.test(description)) {
    return "شناسه گفت‌وگو در بله پیدا نشد. مطمئن شوید بازو به گفت‌وگو اضافه شده و chat_id درست است.";
  }

  if (/bot was blocked/i.test(description)) {
    return "بازوی بله توسط گیرنده مسدود شده است. ابتدا گفت‌وگو با بازو را فعال کنید.";
  }

  if (/unauthorized|not found/i.test(description)) {
    return "توکن بازوی بله معتبر نیست یا دسترسی لازم را ندارد.";
  }

  if (/forbidden/i.test(description)) {
    return "بازوی بله به این گفتگو دسترسی ندارد. برای گروه یا کانال، بازو باید عضو یا مدیر گفتگو باشد.";
  }

  return description.replace(/^Bad Request:\s*/i, "").slice(0, 500);
}

function sanitizeMessage(text: string) {
  const normalized = text.trim();

  if (normalized.length <= baleMessageLimit) {
    return normalized;
  }

  return `${normalized.slice(0, baleMessageLimit - 1)}…`;
}

function getChatTitle(chat: BaleChat | undefined) {
  if (!chat) {
    return "گفتگوی بله";
  }

  const name = [chat.first_name, chat.last_name].filter(Boolean).join(" ").trim();

  return chat.title || name || (chat.username ? `@${chat.username}` : "گفتگوی بله");
}

function extractChatFromUpdate(update: NonNullable<BaleUpdatesApiResponse["result"]>[number]) {
  return (
    update.message?.chat ??
    update.edited_message?.chat ??
    update.channel_post?.chat ??
    update.edited_channel_post?.chat ??
    update.my_chat_member?.chat ??
    null
  );
}

export function normalizeBaleChatLookup(value: string) {
  const normalized = value.trim().replace(/[‎‏‪-‮]/g, "");

  if (!normalized) {
    return "";
  }

  const withoutProtocol = normalized
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "");
  const baleMatch = /^(?:ble\.ir|bale\.ai|web\.bale\.ai)\/([^/?#\s]+)(?:[/?#].*)?$/i.exec(withoutProtocol);

  if (baleMatch?.[1]) {
    const slug = baleMatch[1].replace(/^@/, "").trim();

    return /^-?\d+$/.test(slug) ? slug : `@${slug}`;
  }

  if (/^-?\d+$/.test(normalized)) {
    return normalized;
  }

  if (/^@[A-Za-z0-9_]{3,64}$/.test(normalized)) {
    return normalized;
  }

  if (/^[A-Za-z0-9_]{3,64}$/.test(normalized)) {
    return `@${normalized}`;
  }

  return "";
}

export async function getBaleRecentChats({
  botToken,
}: {
  botToken: string;
}): Promise<BaleRecentChatsResult> {
  const token = botToken.trim();

  if (!token) {
    return { ok: false, error: "توکن بازوی بله ثبت نشده است." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const url = new URL(buildBaleApiUrl(token, "getUpdates"));
    url.searchParams.set("limit", "30");

    const response = await fetch(url, { signal: controller.signal });
    const payload = (await response.json().catch(() => ({}))) as BaleUpdatesApiResponse;

    if (!response.ok || payload.ok === false) {
      return {
        ok: false,
        error: cleanBaleError(payload.description, response.status),
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
    return { ok: false, error: cleanBaleNetworkError(error, "recent") };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendBaleMessage(
  input: SendBaleMessageInput,
): Promise<SendBaleMessageResult> {
  const botToken = input.botToken.trim();
  const chatId = input.chatId.trim();
  const text = sanitizeMessage(input.text);

  if (!botToken || !chatId || !text) {
    return { ok: false, error: "توکن بازو، شناسه گفت‌وگو و متن پیام الزامی است." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(buildBaleApiUrl(botToken, "sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => ({}))) as BaleApiResponse;

    if (!response.ok || payload.ok === false) {
      return {
        ok: false,
        error: cleanBaleError(payload.description, response.status),
      };
    }

    return { ok: true, messageId: payload.result?.message_id };
  } catch (error) {
    return { ok: false, error: cleanBaleNetworkError(error, "send") };
  } finally {
    clearTimeout(timeout);
  }
}
