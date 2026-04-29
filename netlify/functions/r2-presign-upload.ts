import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type R2UploadTarget = "profile" | "work-image" | "glb" | "usdz" | "cv";

type PresignBody = {
  filename?: string;
  contentType?: string;
  target?: R2UploadTarget;
  artistSlug?: string;
  workSlug?: string;
};

const ALLOWED_TARGETS: R2UploadTarget[] = [
  "profile",
  "work-image",
  "glb",
  "usdz",
  "cv",
];

const TARGET_PREFIX: Record<R2UploadTarget, string> = {
  profile: "profiles",
  "work-image": "work-images",
  glb: "models/glb",
  usdz: "models/usdz",
  cv: "cv",
};

const TARGET_CONTENT_TYPES: Record<R2UploadTarget, string[]> = {
  profile: ["image/jpeg", "image/png", "image/webp"],
  "work-image": ["image/jpeg", "image/png", "image/webp"],
  glb: ["model/gltf-binary", "application/octet-stream"],
  usdz: ["model/vnd.usdz+zip", "application/octet-stream"],
  cv: ["application/pdf"],
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
    body: JSON.stringify(body),
  };
}

function sanitizeSegment(value: string | undefined, fallback: string) {
  const source = value?.trim() || fallback;

  const sanitized = source
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9가-힣_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitized || fallback;
}

function getExtension(filename: string, target: R2UploadTarget) {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".glb")) return "glb";
  if (lower.endsWith(".usdz")) return "usdz";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".webp")) return "webp";
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpg";

  if (target === "glb") return "glb";
  if (target === "usdz") return "usdz";
  if (target === "cv") return "pdf";

  return "webp";
}

function createObjectKey(payload: Required<Pick<PresignBody, "filename" | "target">> & PresignBody) {
  const prefix = TARGET_PREFIX[payload.target];
  const artistSlug = sanitizeSegment(payload.artistSlug, "unknown-artist");
  const baseName = sanitizeSegment(payload.workSlug || payload.filename, "upload");
  const extension = getExtension(payload.filename, payload.target);
  const stamp = Date.now();

  if (payload.target === "profile") {
    return `${prefix}/${artistSlug}/${baseName}-${stamp}.${extension}`;
  }

  if (payload.target === "cv") {
    return `${prefix}/${artistSlug}/${baseName}-${stamp}.${extension}`;
  }

  return `${prefix}/${artistSlug}/${baseName}-${stamp}.${extension}`;
}

function normalizePublicBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export const handler = async (event: {
  httpMethod: string;
  body: string | null;
}) => {
  if (event.httpMethod === "OPTIONS") {
    return jsonResponse(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  try {
    const accountId = getRequiredEnv("R2_ACCOUNT_ID");
    const accessKeyId = getRequiredEnv("R2_ACCESS_KEY_ID");
    const secretAccessKey = getRequiredEnv("R2_SECRET_ACCESS_KEY");
    const bucketName = getRequiredEnv("R2_BUCKET_NAME");
    const publicBaseUrl = normalizePublicBaseUrl(
      getRequiredEnv("R2_PUBLIC_BASE_URL")
    );

    const payload = JSON.parse(event.body || "{}") as PresignBody;

    if (!payload.filename || !payload.contentType || !payload.target) {
      return jsonResponse(400, {
        error: "filename, contentType, target are required.",
      });
    }

    if (!ALLOWED_TARGETS.includes(payload.target)) {
      return jsonResponse(400, {
        error: "Invalid upload target.",
      });
    }

    const allowedContentTypes = TARGET_CONTENT_TYPES[payload.target];

    if (!allowedContentTypes.includes(payload.contentType)) {
      return jsonResponse(400, {
        error: `Invalid content type for target ${payload.target}.`,
      });
    }

    const key = createObjectKey({
      filename: payload.filename,
      target: payload.target,
      artistSlug: payload.artistSlug,
      workSlug: payload.workSlug,
      contentType: payload.contentType,
    });

    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: payload.contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: 60 * 5,
    });

    const publicUrl = `${publicBaseUrl}/${key}`;

    return jsonResponse(200, {
      uploadUrl,
      publicUrl,
      key,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create upload URL.";

    return jsonResponse(500, {
      error: message,
    });
  }
};