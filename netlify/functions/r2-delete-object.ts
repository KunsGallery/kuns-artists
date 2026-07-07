import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createVerify } from "node:crypto";

type DeleteBody = {
  keys?: unknown;
  urls?: unknown;
};

type FirebaseIdTokenPayload = {
  aud?: unknown;
  email?: unknown;
  exp?: unknown;
  iss?: unknown;
  email_verified?: unknown;
};

const ALLOWED_EMAILS = new Set([
  "gallerykuns@gmail.com",
  "boramine5255@gmail.com",
  "wwwrosaweb@gmail.com",
  "chlwotjq127@gmail.com",
]);

const GOOGLE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let cachedCerts: Record<string, string> | null = null;
let cachedCertsExpiresAt = 0;

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
      "access-control-allow-headers": "content-type, authorization",
    },
    body: JSON.stringify(body),
  };
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function safeDecodeJwtPart(part: string) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as unknown;
}

async function getGoogleCerts() {
  if (cachedCerts && Date.now() < cachedCertsExpiresAt) {
    return cachedCerts;
  }

  const response = await fetch(GOOGLE_CERTS_URL);

  if (!response.ok) {
    throw new Error("Failed to fetch Firebase signing certificates.");
  }

  const certs = (await response.json()) as Record<string, string>;
  const cacheControl = response.headers.get("cache-control") ?? "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 300;

  cachedCerts = certs;
  cachedCertsExpiresAt = Date.now() + maxAgeSeconds * 1000;

  return certs;
}

async function verifyFirebaseIdToken(token: string, projectId: string) {
  const [headerPart, payloadPart, signaturePart] = token.split(".");

  if (!headerPart || !payloadPart || !signaturePart) {
    throw new Error("Invalid authorization token.");
  }

  const header = safeDecodeJwtPart(headerPart) as {
    alg?: unknown;
    kid?: unknown;
  };
  const payload = safeDecodeJwtPart(payloadPart) as FirebaseIdTokenPayload;

  if (header.alg !== "RS256" || typeof header.kid !== "string") {
    throw new Error("Invalid authorization token.");
  }

  const certs = await getGoogleCerts();
  const cert = certs[header.kid];

  if (!cert) {
    throw new Error("Invalid authorization token.");
  }

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${headerPart}.${payloadPart}`);
  verifier.end();

  const verified = verifier.verify(cert, Buffer.from(signaturePart, "base64url"));

  if (!verified) {
    throw new Error("Invalid authorization token.");
  }

  const expectedIssuer = `https://securetoken.google.com/${projectId}`;

  if (payload.aud !== projectId || payload.iss !== expectedIssuer) {
    throw new Error("Invalid authorization token.");
  }

  if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) {
    throw new Error("Authorization token has expired.");
  }

  if (typeof payload.email !== "string" || !payload.email) {
    throw new Error("Account email is required.");
  }

  if (!ALLOWED_EMAILS.has(payload.email.toLowerCase())) {
    throw new Error("Access denied.");
  }

  return payload;
}

function isSafeR2Key(key: string) {
  return (
    key.trim().length > 0 &&
    !key.includes("..") &&
    !key.startsWith("/") &&
    !key.includes("\\") &&
    !key.includes("\0")
  );
}

function extractKeyFromPublicUrl(urlValue: string, publicBaseUrl: string) {
  try {
    const candidate = new URL(urlValue);
    const base = new URL(publicBaseUrl);

    if (candidate.origin !== base.origin) {
      return null;
    }

    const basePath = base.pathname.replace(/\/+$/, "");
    const path = candidate.pathname;

    if (basePath && basePath !== "/") {
      if (path !== basePath && !path.startsWith(`${basePath}/`)) {
        return null;
      }

      const relativePath = path.slice(basePath.length).replace(/^\/+/, "");
      return decodeURIComponent(relativePath);
    }

    return decodeURIComponent(path.replace(/^\/+/, ""));
  } catch {
    return null;
  }
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

export const handler = async (event: {
  httpMethod: string;
  body: string | null;
  headers?: Record<string, string | undefined>;
}) => {
  if (event.httpMethod === "OPTIONS") {
    return jsonResponse(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  try {
    const authorization = event.headers?.authorization ?? event.headers?.Authorization;
    const bearerToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : "";

    if (!bearerToken) {
      return jsonResponse(401, { error: "Authorization header is required." });
    }

    const projectId = getRequiredEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
    await verifyFirebaseIdToken(bearerToken, projectId);

    const accountId = getRequiredEnv("R2_ACCOUNT_ID");
    const accessKeyId = getRequiredEnv("R2_ACCESS_KEY_ID");
    const secretAccessKey = getRequiredEnv("R2_SECRET_ACCESS_KEY");
    const bucketName = getRequiredEnv("R2_BUCKET_NAME");
    const publicBaseUrl = normalizeBaseUrl(
      getRequiredEnv("R2_PUBLIC_BASE_URL")
    );

    const payload = JSON.parse(event.body || "{}") as DeleteBody;
    const candidateKeys = [
      ...(Array.isArray(payload.keys)
        ? payload.keys.filter((value): value is string => typeof value === "string")
        : []),
      ...(Array.isArray(payload.urls)
        ? payload.urls
            .filter((value): value is string => typeof value === "string")
            .map((value) => extractKeyFromPublicUrl(value, publicBaseUrl))
            .filter((value): value is string => typeof value === "string")
        : []),
    ];

    const keys = uniqueStrings(
      candidateKeys.filter((key) => isSafeR2Key(key))
    );

    if (keys.length === 0) {
      return jsonResponse(200, {
        ok: true,
        deletedKeys: [],
        skippedKeys: [],
        failedKeys: [],
      });
    }

    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const results = await Promise.allSettled(
      keys.map((key) =>
        client.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
          })
        )
      )
    );

    const deletedKeys: string[] = [];
    const failedKeys: string[] = [];

    results.forEach((result, index) => {
      const key = keys[index];

      if (result.status === "fulfilled") {
        deletedKeys.push(key);
      } else {
        failedKeys.push(key);
      }
    });

    return jsonResponse(200, {
      ok: true,
      deletedKeys,
      skippedKeys: [],
      failedKeys,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete R2 objects.";

    if (
      message === "Access denied." ||
      message === "Authorization token has expired." ||
      message === "Authorization header is required." ||
      message === "Invalid authorization token." ||
      message === "Account email is required."
    ) {
      return jsonResponse(403, { error: message });
    }

    return jsonResponse(500, { error: message });
  }
};
