import "server-only";

import net from "node:net";
import tls from "node:tls";

type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string | null;
};

type SendEmailMessageInput = {
  smtpHost: string | null | undefined;
  smtpPort: number | null | undefined;
  smtpSecure?: boolean | null;
  smtpUsername?: string | null;
  smtpPassword?: string | null;
  fromEmail: string | null | undefined;
  fromName?: string | null;
  to: string;
  subject: string;
  text: string;
  html?: string | null;
  attachments?: EmailAttachment[] | null;
};

type SendEmailMessageResult =
  | { ok: true; providerMessageId?: string }
  | { ok: false; error: string };

const emailRegex = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i;

function encodeMimeWord(value: string) {
  const normalized = value.trim();
  return /^[\x00-\x7F]*$/.test(normalized)
    ? normalized
    : `=?UTF-8?B?${Buffer.from(normalized, "utf8").toString("base64")}?=`;
}

function formatAddress(email: string, name?: string | null) {
  const normalizedEmail = email.trim();
  const normalizedName = name?.trim();
  return normalizedName ? `${encodeMimeWord(normalizedName)} <${normalizedEmail}>` : normalizedEmail;
}

function sanitizeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(value: string) {
  return `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:14px;line-height:2;color:#111827;white-space:pre-wrap">${escapeHtml(value)}</div>`;
}

function encodeHeaderParameter(value: string) {
  const sanitized = sanitizeHeader(value).replace(/"/g, "'");
  return /^[\x20-\x7E]*$/.test(sanitized)
    ? `"${sanitized}"`
    : `utf-8''${encodeURIComponent(sanitized)}`;
}

function chunkBase64(value: Buffer) {
  return value.toString("base64").replace(/.{1,76}/g, "$&\r\n").trimEnd();
}

function buildAlternativePart(input: Required<Pick<SendEmailMessageInput, "subject" | "text">> & SendEmailMessageInput, boundary: string) {
  const html = input.html?.trim() || textToHtml(input.text);
  return [
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    input.text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

function buildEmailData(input: Required<Pick<SendEmailMessageInput, "fromEmail" | "to" | "subject" | "text">> & SendEmailMessageInput) {
  const alternativeBoundary = `talar-alt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const attachments = (input.attachments ?? []).filter(
    (attachment) => attachment.filename.trim() && attachment.content.length > 0,
  );
  const mixedBoundary = `talar-mixed-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const hasAttachments = attachments.length > 0;
  const headers = [
    `From: ${formatAddress(input.fromEmail, input.fromName)}`,
    `To: ${input.to}`,
    `Subject: ${encodeMimeWord(sanitizeHeader(input.subject))}`,
    "MIME-Version: 1.0",
    `Message-ID: <${Date.now()}.${Math.random().toString(16).slice(2)}@talar-manager.local>`,
    `Date: ${new Date().toUTCString()}`,
    hasAttachments
      ? `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`
      : `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
  ];

  if (!hasAttachments) {
    return [
      ...headers,
      "",
      buildAlternativePart(input, alternativeBoundary),
    ].join("\r\n").replace(/^\./gm, "..");
  }

  const attachmentParts = attachments.map((attachment) => {
    const contentType = attachment.contentType?.trim() || "application/octet-stream";
    const filename = sanitizeHeader(attachment.filename || "attachment");
    const encodedName = encodeHeaderParameter(filename);
    return [
      `--${mixedBoundary}`,
      `Content-Type: ${contentType}; name=${encodedName}`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename=${encodedName}`,
      "",
      chunkBase64(attachment.content),
      "",
    ].join("\r\n");
  });

  return [
    ...headers,
    "",
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
    "",
    buildAlternativePart(input, alternativeBoundary),
    ...attachmentParts,
    `--${mixedBoundary}--`,
    "",
  ].join("\r\n").replace(/^\./gm, "..");
}

class SmtpConnection {
  private socket: net.Socket | tls.TLSSocket | null = null;
  private buffer = "";

  constructor(private readonly host: string, private readonly port: number, private readonly secure: boolean) {}

  async connect() {
    this.socket = await new Promise<net.Socket | tls.TLSSocket>((resolve, reject) => {
      const onError = (error: Error) => reject(error);
      const socket = this.secure
        ? tls.connect({ host: this.host, port: this.port, servername: this.host }, () => resolve(socket))
        : net.connect({ host: this.host, port: this.port }, () => resolve(socket));
      socket.once("error", onError);
      socket.setTimeout(25000, () => reject(new Error("زمان اتصال به SMTP تمام شد.")));
    });
    await this.readResponse([220]);
  }

  close() {
    this.socket?.end();
    this.socket?.destroy();
    this.socket = null;
  }

  private async readResponse(expected: number[]) {
    if (!this.socket) throw new Error("اتصال SMTP برقرار نیست.");
    while (true) {
      const line = await this.readLine();
      const code = Number(line.slice(0, 3));
      const isFinal = line[3] === " ";
      if (isFinal) {
        if (!expected.includes(code)) {
          throw new Error(`پاسخ نامعتبر SMTP: ${line}`);
        }
        return line;
      }
    }
  }

  private readLine(): Promise<string> {
    if (!this.socket) return Promise.reject(new Error("اتصال SMTP برقرار نیست."));
    const existingLineEnd = this.buffer.indexOf("\n");
    if (existingLineEnd >= 0) {
      const line = this.buffer.slice(0, existingLineEnd + 1);
      this.buffer = this.buffer.slice(existingLineEnd + 1);
      return Promise.resolve(line.trimEnd());
    }
    return new Promise((resolve, reject) => {
      const socket = this.socket!;
      const cleanup = () => {
        socket.off("data", onData);
        socket.off("error", onError);
        socket.off("timeout", onTimeout);
      };
      const onError = (error: Error) => { cleanup(); reject(error); };
      const onTimeout = () => { cleanup(); reject(new Error("پاسخ SMTP دیر دریافت شد.")); };
      const onData = (chunk: Buffer) => {
        this.buffer += chunk.toString("utf8");
        const lineEnd = this.buffer.indexOf("\n");
        if (lineEnd >= 0) {
          const line = this.buffer.slice(0, lineEnd + 1);
          this.buffer = this.buffer.slice(lineEnd + 1);
          cleanup();
          resolve(line.trimEnd());
        }
      };
      socket.on("data", onData);
      socket.once("error", onError);
      socket.once("timeout", onTimeout);
    });
  }

  async command(command: string, expected: number[]) {
    if (!this.socket) throw new Error("اتصال SMTP برقرار نیست.");
    this.socket.write(`${command}\r\n`, "utf8");
    return this.readResponse(expected);
  }

  async writeData(data: string) {
    if (!this.socket) throw new Error("اتصال SMTP برقرار نیست.");
    this.socket.write(`${data}\r\n.\r\n`, "utf8");
    return this.readResponse([250]);
  }

  async startTls() {
    if (!this.socket) throw new Error("اتصال SMTP برقرار نیست.");
    await this.command("STARTTLS", [220]);
    this.socket = tls.connect({ socket: this.socket, servername: this.host });
    await new Promise<void>((resolve, reject) => {
      this.socket!.once("secureConnect", () => resolve());
      this.socket!.once("error", reject);
    });
  }
}

export async function sendEmailMessage(input: SendEmailMessageInput): Promise<SendEmailMessageResult> {
  const host = input.smtpHost?.trim();
  const port = Number(input.smtpPort ?? (input.smtpSecure ? 465 : 587));
  const fromEmail = input.fromEmail?.trim();
  const to = input.to.trim().toLowerCase();
  const subject = input.subject.trim() || "اعلان مدیریت تالار";
  const text = input.text.trim();

  if (!host || !Number.isInteger(port) || port <= 0 || port > 65535) return { ok: false, error: "هاست یا پورت SMTP معتبر نیست." };
  if (!fromEmail || !emailRegex.test(fromEmail)) return { ok: false, error: "ایمیل فرستنده معتبر نیست." };
  if (!emailRegex.test(to)) return { ok: false, error: "ایمیل گیرنده معتبر نیست." };
  if (!text) return { ok: false, error: "متن ایمیل خالی است." };

  const connection = new SmtpConnection(host, port, Boolean(input.smtpSecure));
  try {
    await connection.connect();
    await connection.command(`EHLO ${host}`, [250]);
    if (!input.smtpSecure && port !== 25) {
      try {
        await connection.startTls();
        await connection.command(`EHLO ${host}`, [250]);
      } catch {
        // Some local SMTP servers do not advertise STARTTLS. Continue without TLS only when the user disabled secure mode.
      }
    }

    const username = input.smtpUsername?.trim();
    const password = input.smtpPassword?.trim();
    if (username && password) {
      await connection.command(`AUTH PLAIN ${Buffer.from(`\0${username}\0${password}`, "utf8").toString("base64")}`, [235, 503]);
    }

    await connection.command(`MAIL FROM:<${fromEmail}>`, [250]);
    await connection.command(`RCPT TO:<${to}>`, [250, 251]);
    await connection.command("DATA", [354]);
    await connection.writeData(buildEmailData({ ...input, fromEmail, to, subject, text }));
    try { await connection.command("QUIT", [221]); } catch {}
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message.slice(0, 700) : "ارسال ایمیل ناموفق بود." };
  } finally {
    connection.close();
  }
}
