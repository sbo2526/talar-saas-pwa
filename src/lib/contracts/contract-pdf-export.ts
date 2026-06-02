import "server-only";

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { contractStatusLabels, formatContractTimeRange, getPaidAmount, toNumber } from "@/lib/contracts/display";
import { formatJalaliDate, toPersianDigits } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { formatHallAddress, formatHallContactPhones } from "@/lib/notifications/support-contact";
import { stripDemoWordingFromNotificationText } from "@/lib/notifications/template-renderer";
import { getPrisma } from "@/lib/prisma";

type ContractPdfAttachment = {
  fileName: string;
  filePath: string;
  contentType: "application/pdf";
  content: Buffer;
};

const A4_WIDTH_PX = 1240;
const A4_HEIGHT_PX = 1754;
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const pagePadding = 52;
const gold = "#b7832c";
const dark = "#111827";
const muted = "#6b5b43";
const ivory = "#fffdf7";
const soft = "#fff7e8";
const danger = "#b42318";

function cleanText(value: unknown, fallback = "ثبت نشده") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalized = stripDemoWordingFromNotificationText(String(value)).trim();
  return normalized || fallback;
}

function escapeXml(value: unknown) {
  return cleanText(value, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeFileName(value: string) {
  return stripDemoWordingFromNotificationText(value)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/[\u0000-\u001f]+/g, "")
    .replace(/\s+/g, " ")
    .replace(/[-\s]+$/g, "")
    .replace(/^[-\s]+/g, "")
    .trim()
    .slice(0, 170) || "contract";
}

async function pathExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function buildUniqueFilePath(directory: string, baseName: string) {
  const cleanBase = sanitizeFileName(baseName);
  let candidate = path.join(directory, `${cleanBase}.pdf`);

  for (let index = 2; index <= 99 && await pathExists(candidate); index += 1) {
    candidate = path.join(directory, `${cleanBase} - ${toPersianDigits(index)}.pdf`);
  }

  return candidate;
}

function getContractPdfDirectory() {
  const configured = process.env.TALAR_CONTRACT_PDF_DIR?.trim();
  if (configured) {
    return path.resolve(configured);
  }

  return path.join(os.homedir(), "Desktop", "قراردادهای تالار منیجر");
}

async function readVazirmatnFontCss() {
  const fontPath = path.join(
    process.cwd(),
    "node_modules",
    "@fontsource-variable",
    "vazirmatn",
    "files",
    "vazirmatn-wght-normal.woff2",
  );

  try {
    const font = await fs.readFile(fontPath);
    return `@font-face{font-family:VazirmatnPdf;src:url(data:font/woff2;base64,${font.toString("base64")}) format('woff2');font-weight:100 900;font-style:normal;font-display:swap;}`;
  } catch {
    return "";
  }
}

function wrapLine(value: string, maxChars: number) {
  const normalized = cleanText(value, "").replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function textElement(input: {
  x: number;
  y: number;
  text: string;
  size?: number;
  weight?: number;
  fill?: string;
  anchor?: "start" | "middle" | "end";
}) {
  const size = input.size ?? 26;
  const weight = input.weight ?? 700;
  const fill = input.fill ?? dark;
  const anchor = input.anchor ?? "end";
  return `<text x="${input.x}" y="${input.y}" text-anchor="${anchor}" direction="rtl" unicode-bidi="plaintext" font-family="VazirmatnPdf,Tahoma,Arial,sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${escapeXml(input.text)}</text>`;
}

function rectElement(input: {
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  radius?: number;
  strokeWidth?: number;
}) {
  return `<rect x="${input.x}" y="${input.y}" width="${input.width}" height="${input.height}" rx="${input.radius ?? 18}" fill="${input.fill ?? "transparent"}" stroke="${input.stroke ?? gold}" stroke-width="${input.strokeWidth ?? 2}"/>`;
}

function fieldRow(label: string, value: string, x: number, y: number, width: number) {
  return [
    rectElement({ x, y, width, height: 58, fill: "#fffaf0", stroke: "#d7b46a", radius: 14, strokeWidth: 1.5 }),
    textElement({ x: x + width - 18, y: y + 22, text: label, size: 17, weight: 800, fill: muted }),
    textElement({ x: x + width - 18, y: y + 47, text: value, size: 21, weight: 900, fill: dark }),
  ].join("");
}

function sectionTitle(title: string, x: number, y: number, width: number) {
  return [
    rectElement({ x, y, width, height: 42, fill: "#111827", stroke: "#111827", radius: 14, strokeWidth: 0 }),
    textElement({ x: x + width - 20, y: y + 29, text: title, size: 21, weight: 900, fill: "#fff8ea" }),
  ].join("");
}

function bulletLines(lines: string[], x: number, startY: number, maxWidth: number, maxLines = 12) {
  const result: string[] = [];
  let y = startY;
  let used = 0;

  for (const item of lines) {
    for (const line of wrapLine(item, Math.max(30, Math.floor(maxWidth / 17)))) {
      if (used >= maxLines) return result.join("");
      result.push(textElement({ x, y, text: `• ${line}`, size: 19, weight: 700, fill: dark }));
      y += 30;
      used += 1;
    }
  }

  return result.join("");
}

function normalizePdfDate(value: Date | string | number | null | undefined) {
  return stripDemoWordingFromNotificationText(formatJalaliDate(value)).replace(/[\\/:*?"<>|]+/g, "-");
}

function buildLineItemsSummary(
  lineItems: {
    type: string;
    name: string;
    quantity: number;
    unitLabel: string | null;
    totalPrice: { toString(): string } | string | number;
  }[],
) {
  if (!lineItems.length) {
    return ["خدمات و اقلام به صورت توافقی/دستی در قرارداد ثبت شده است."];
  }

  return lineItems.slice(0, 9).map((item) => {
    const quantity = formatPersianNumber(item.quantity);
    const unit = item.unitLabel || "مورد";
    return `${item.name} - ${quantity} ${unit} - ${formatIRR(toNumber(item.totalPrice))}`;
  });
}

async function loadContractPdfData(tenantId: string, contractId: string) {
  const db = await getPrisma();
  const [contract, hallProfile] = await Promise.all([
    db.contract.findFirst({
      where: { id: contractId, tenantId },
      include: {
        customer: true,
        hall: { select: { name: true, address: true, city: true, phone: true, managerName: true } },
        salon: { select: { name: true, capacity: true, floor: true } },
        lineItems: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
        payments: {
          select: { amount: true, type: true, status: true, paidAt: true },
          orderBy: { paidAt: "asc" },
        },
      },
    }),
    db.tenantHallProfile.findUnique({
      where: { tenantId },
      select: {
        brandName: true,
        legalName: true,
        managerName: true,
        licenseNumber: true,
        province: true,
        city: true,
        address: true,
        phone: true,
        mobile: true,
        website: true,
      },
    }),
  ]);

  return { contract, hallProfile };
}

async function buildContractSvg(input: Awaited<ReturnType<typeof loadContractPdfData>>) {
  const { contract, hallProfile } = input;
  if (!contract) {
    throw new Error("قرارداد برای ساخت PDF پیدا نشد.");
  }

  const fontCss = await readVazirmatnFontCss();
  const hallName = cleanText(hallProfile?.brandName || hallProfile?.legalName || contract.hall?.name, "تالار");
  const managerName = cleanText(hallProfile?.managerName || contract.hall?.managerName, "مدیریت تالار");
  const customerName = cleanText(contract.customer.fullName, "مشتری");
  const customerPhone = cleanText(contract.customer.phone, "ثبت نشده");
  const customerNationalCode = cleanText(contract.customer.nationalCode || contract.customer.nationalId, "ثبت نشده");
  const eventType = cleanText(contract.eventTypeName, "مراسم");
  const eventDate = cleanText(formatJalaliDate(contract.eventDate));
  const eventTime = cleanText(formatContractTimeRange(contract.eventStartTime, contract.eventEndTime));
  const hallPlace = cleanText(contract.hall?.name || hallName);
  const hallAddress = formatHallAddress([hallProfile?.province, hallProfile?.city || contract.hall?.city, hallProfile?.address || contract.hall?.address]);
  const hallContactPhones = formatHallContactPhones([hallProfile?.phone, hallProfile?.mobile, contract.hall?.phone]);
  const salonName = cleanText(contract.salon?.name, "ثبت نشده");
  const paidAmount = getPaidAmount(contract.payments, contract.depositAmount);
  const remainingAmount = contract.status === "CANCELED" ? 0 : toNumber(contract.remainingAmount);
  const signatureLabel = `نام و امضای ${managerName}`;
  const itemLines = buildLineItemsSummary(contract.lineItems);
  const terms = [
    "این فایل به صورت خودکار از سامانه تالار منیجر و بر اساس آخرین اطلاعات ثبت‌شده قرارداد تولید شده است.",
    "مبالغ، تاریخ، ساعت، محل برگزاری و خدمات انتخابی باید توسط طرفین بررسی و تأیید شوند.",
    "در صورت مشاهده هرگونه مغایرت، پیش از روز مراسم با مدیریت تالار هماهنگی شود.",
    "نسخه رسمی چاپ‌شده و امضاشده قرارداد، ملاک نهایی توافق طرفین است.",
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${A4_WIDTH_PX}" height="${A4_HEIGHT_PX}" viewBox="0 0 ${A4_WIDTH_PX} ${A4_HEIGHT_PX}">
  <defs>
    <style>${fontCss} text{font-family:VazirmatnPdf,Tahoma,Arial,sans-serif}</style>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#3b2a12" flood-opacity="0.13"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="#efe8dc"/>
  <rect x="${pagePadding}" y="${pagePadding}" width="${A4_WIDTH_PX - pagePadding * 2}" height="${A4_HEIGHT_PX - pagePadding * 2}" rx="28" fill="${ivory}" stroke="${gold}" stroke-width="4" filter="url(#shadow)"/>
  <rect x="${pagePadding + 18}" y="${pagePadding + 18}" width="${A4_WIDTH_PX - (pagePadding + 18) * 2}" height="${A4_HEIGHT_PX - (pagePadding + 18) * 2}" rx="20" fill="none" stroke="#d8b465" stroke-width="1.8"/>

  ${textElement({ x: A4_WIDTH_PX - 95, y: 122, text: hallName, size: 31, weight: 950 })}
  ${textElement({ x: A4_WIDTH_PX - 95, y: 158, text: "قرارداد برگزاری مراسم", size: 25, weight: 900, fill: gold })}
  ${textElement({ x: 115, y: 122, text: `شماره قرارداد: ${toPersianDigits(contract.contractNo)}`, size: 21, weight: 900, anchor: "start" })}
  ${textElement({ x: 115, y: 158, text: `تاریخ تولید فایل: ${formatJalaliDate(new Date())}`, size: 18, weight: 800, fill: muted, anchor: "start" })}
  ${rectElement({ x: 82, y: 192, width: 1076, height: 2, fill: gold, stroke: gold, radius: 0, strokeWidth: 0 })}

  ${sectionTitle("مشخصات طرفین", 82, 224, 1076)}
  ${fieldRow("نام مشتری", customerName, 626, 286, 532)}
  ${fieldRow("شماره همراه", toPersianDigits(customerPhone), 82, 286, 520)}
  ${fieldRow("کد ملی", toPersianDigits(customerNationalCode), 626, 358, 532)}
  ${fieldRow("نماینده تالار", managerName, 82, 358, 520)}

  ${sectionTitle("اطلاعات مراسم", 82, 458, 1076)}
  ${fieldRow("نوع مراسم", eventType, 626, 520, 532)}
  ${fieldRow("تاریخ مراسم", eventDate, 82, 520, 520)}
  ${fieldRow("ساعت مراسم", eventTime, 626, 592, 532)}
  ${fieldRow("تعداد مهمان", `${formatPersianNumber(contract.guestCount)} نفر`, 82, 592, 520)}
  ${fieldRow("تالار / فضا", hallPlace, 626, 664, 532)}
  ${fieldRow("سالن", salonName, 82, 664, 520)}

  ${sectionTitle("جمع‌بندی مالی", 82, 764, 1076)}
  ${fieldRow("مبلغ نهایی", formatIRR(toNumber(contract.finalTotal)), 626, 826, 532)}
  ${fieldRow("بیعانه", formatIRR(toNumber(contract.depositAmount)), 82, 826, 520)}
  ${fieldRow("پرداخت‌شده", formatIRR(paidAmount), 626, 898, 532)}
  ${fieldRow("مانده", formatIRR(remainingAmount), 82, 898, 520)}
  ${fieldRow("وضعیت قرارداد", contractStatusLabels[contract.status] ?? cleanText(contract.status), 626, 970, 532)}
  ${fieldRow("پکیج", cleanText(contract.packageName, "ثبت نشده"), 82, 970, 520)}

  ${sectionTitle("خلاصه خدمات و اقلام", 82, 1070, 1076)}
  ${rectElement({ x: 82, y: 1126, width: 1076, height: 238, fill: soft, stroke: "#d7b46a", radius: 18, strokeWidth: 1.5 })}
  ${bulletLines(itemLines, 1128, 1170, 1000, 7)}

  ${sectionTitle("توضیحات و شرایط مهم", 82, 1392, 1076)}
  ${rectElement({ x: 82, y: 1448, width: 1076, height: 150, fill: "#fffdf9", stroke: "#d7b46a", radius: 18, strokeWidth: 1.5 })}
  ${bulletLines(terms, 1128, 1488, 1000, 4)}

  ${rectElement({ x: 82, y: 1628, width: 520, height: 74, fill: "#fffaf0", stroke: gold, radius: 16, strokeWidth: 1.7 })}
  ${textElement({ x: 570, y: 1672, text: "نام و امضای مشتری", size: 22, weight: 900 })}
  ${rectElement({ x: 638, y: 1628, width: 520, height: 74, fill: "#fffaf0", stroke: gold, radius: 16, strokeWidth: 1.7 })}
  ${textElement({ x: 1128, y: 1672, text: signatureLabel, size: 22, weight: 900 })}
  ${textElement({ x: A4_WIDTH_PX / 2, y: 1716, text: `در صورت مغایرت اطلاعات قرارداد با مدیریت تالار تماس بگیرید. شماره‌ها: ${toPersianDigits(hallContactPhones)}`, size: 16, weight: 900, fill: danger, anchor: "middle" })}
  ${textElement({ x: A4_WIDTH_PX / 2, y: 1740, text: `آدرس تالار: ${hallAddress || "ثبت نشده"}`, size: 15, weight: 800, fill: muted, anchor: "middle" })}
</svg>`;
}

function buildPdfFromJpeg(jpeg: Buffer) {
  const objects: Buffer[] = [];
  const pushObject = (content: string | Buffer) => {
    const id = objects.length + 1;
    const body = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
    objects.push(Buffer.concat([Buffer.from(`${id} 0 obj\n`, "utf8"), body, Buffer.from("\nendobj\n", "utf8")]));
    return id;
  };

  pushObject("<< /Type /Catalog /Pages 2 0 R >>");
  pushObject("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  pushObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH_PT} ${A4_HEIGHT_PT}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  pushObject(Buffer.concat([
    Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${A4_WIDTH_PX} /Height ${A4_HEIGHT_PX} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, "utf8"),
    jpeg,
    Buffer.from("\nendstream", "utf8"),
  ]));
  const contentStream = `q\n${A4_WIDTH_PT} 0 0 ${A4_HEIGHT_PT} 0 0 cm\n/Im0 Do\nQ`;
  pushObject(`<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream`);

  const header = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary");
  const chunks: Buffer[] = [header];
  const offsets = [0];
  let offset = header.length;

  for (const object of objects) {
    offsets.push(offset);
    chunks.push(object);
    offset += object.length;
  }

  const xrefOffset = offset;
  const xrefLines = ["xref", `0 ${objects.length + 1}`, "0000000000 65535 f "];
  for (let index = 1; index <= objects.length; index += 1) {
    xrefLines.push(`${String(offsets[index]).padStart(10, "0")} 00000 n `);
  }

  const trailer = `${xrefLines.join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(Buffer.from(trailer, "utf8"));
  return Buffer.concat(chunks);
}

async function buildContractPdfBuffer(data: Awaited<ReturnType<typeof loadContractPdfData>>) {
  const svg = await buildContractSvg(data);
  const jpeg = await sharp(Buffer.from(svg, "utf8"))
    .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
    .toBuffer();

  return buildPdfFromJpeg(jpeg);
}

export async function generateAndSaveContractPdfForEmail(input: {
  tenantId: string;
  contractId: string;
}): Promise<ContractPdfAttachment | null> {
  const data = await loadContractPdfData(input.tenantId, input.contractId);
  const contract = data.contract;

  if (!contract) {
    return null;
  }

  const directory = getContractPdfDirectory();
  await fs.mkdir(directory, { recursive: true });

  const customerName = cleanText(contract.customer.fullName, "مشتری");
  const eventType = cleanText(contract.eventTypeName, "مراسم");
  const eventDate = normalizePdfDate(contract.eventDate);
  const filePath = await buildUniqueFilePath(directory, `${customerName} - ${eventType} - ${eventDate}`);
  const content = await buildContractPdfBuffer(data);

  await fs.writeFile(filePath, content);

  return {
    fileName: path.basename(filePath),
    filePath,
    contentType: "application/pdf",
    content,
  };
}
