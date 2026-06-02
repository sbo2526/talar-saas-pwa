import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

export type SavedTenantUpload = {
  key: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl?: string;
};

export function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File && value.size > 0;
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 80) || "file";
}

function safeDisplayFileName(value: string | undefined, fallback: string) {
  const normalized = value
    ?.replace(/[\\/\u0000-\u001f\u007f]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return normalized ? normalized.slice(0, 180) : fallback;
}

function buildTenantUploadLocation(input: {
  tenantId: string;
  area: string;
  extension: string;
}) {
  const tenantSegment = safeSegment(input.tenantId);
  const areaSegment = safeSegment(input.area);
  const normalizedExtension = input.extension.startsWith(".")
    ? input.extension
    : `.${input.extension}`;
  const fileName = `${Date.now()}-${randomUUID()}${normalizedExtension}`;
  const relativeKey = `tenants/${tenantSegment}/${areaSegment}/${fileName}`;
  const directory = path.join(
    process.cwd(),
    "public",
    "uploads",
    "tenants",
    tenantSegment,
    areaSegment,
  );

  return {
    fileName,
    relativeKey,
    directory,
    filePath: path.join(directory, fileName),
    publicUrl: `/uploads/${relativeKey}`,
  };
}

function assertAllowedMimeType(
  file: File,
  allowedMimeTypes: Map<string, string>,
) {
  const extension = allowedMimeTypes.get(file.type);
  if (!extension) {
    throw new Error("INVALID_UPLOAD_MIME");
  }

  return extension;
}

function assertFileSize(file: File, maxBytes: number) {
  if (file.size > maxBytes) {
    throw new Error("INVALID_UPLOAD_SIZE");
  }
}

function assertImageSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") {
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (!isJpeg) throw new Error("INVALID_UPLOAD_MIME");
    return;
  }

  if (mimeType === "image/png") {
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (!buffer.subarray(0, 8).equals(pngSignature)) {
      throw new Error("INVALID_UPLOAD_MIME");
    }
    return;
  }

  if (mimeType === "image/webp") {
    const hasWebpSignature =
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP";
    if (!hasWebpSignature) throw new Error("INVALID_UPLOAD_MIME");
  }
}

export async function saveTenantUpload(input: {
  file: File;
  tenantId: string;
  area: string;
  allowedMimeTypes: Map<string, string>;
  maxBytes: number;
}): Promise<SavedTenantUpload> {
  const extension = assertAllowedMimeType(input.file, input.allowedMimeTypes);
  assertFileSize(input.file, input.maxBytes);

  const location = buildTenantUploadLocation({
    tenantId: input.tenantId,
    area: input.area,
    extension,
  });
  const bytes = Buffer.from(await input.file.arrayBuffer());

  await mkdir(location.directory, { recursive: true });
  await writeFile(location.filePath, bytes);

  return {
    key: location.relativeKey,
    publicUrl: location.publicUrl,
    fileName: safeDisplayFileName(input.file.name, location.fileName),
    mimeType: input.file.type,
    sizeBytes: input.file.size,
  };
}

export async function saveTenantLogoUpload(input: {
  file: File;
  tenantId: string;
  area?: string;
  maxBytes: number;
}): Promise<SavedTenantUpload> {
  const allowedLogoMimeTypes = new Map([
    ["image/jpeg", ".jpg"],
    ["image/png", ".png"],
    ["image/webp", ".webp"],
  ]);

  assertAllowedMimeType(input.file, allowedLogoMimeTypes);
  assertFileSize(input.file, input.maxBytes);

  const originalBytes = Buffer.from(await input.file.arrayBuffer());
  assertImageSignature(originalBytes, input.file.type);

  let processedBytes: Buffer;
  try {
    processedBytes = await sharp(originalBytes)
      .rotate()
      .resize(512, 512, {
        fit: "cover",
        position: "centre",
        withoutEnlargement: false,
      })
      .webp({ quality: 90, effort: 4 })
      .toBuffer();
  } catch {
    throw new Error("INVALID_IMAGE_PROCESSING");
  }

  const location = buildTenantUploadLocation({
    tenantId: input.tenantId,
    area: input.area ?? "hall-logo",
    extension: ".webp",
  });

  await mkdir(location.directory, { recursive: true });
  await writeFile(location.filePath, processedBytes);

  return {
    key: location.relativeKey,
    publicUrl: location.publicUrl,
    dataUrl: `data:image/webp;base64,${processedBytes.toString("base64")}`,
    fileName: location.fileName,
    mimeType: "image/webp",
    sizeBytes: processedBytes.byteLength,
  };
}

export async function deleteTenantUploadByKey(key: string | null | undefined) {
  if (!key) return;

  const normalizedKey = key.replace(/^\/+/, "");
  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  const filePath = path.resolve(uploadsRoot, normalizedKey);

  if (!filePath.startsWith(uploadsRoot + path.sep)) {
    return;
  }

  try {
    await unlink(filePath);
  } catch {
    // Deleting a previous local upload is best-effort. The database update must
    // not fail if the file was already removed or storage is read-only.
  }
}
