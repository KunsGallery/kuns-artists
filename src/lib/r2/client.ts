import type {
  R2DeleteRequest,
  R2DeleteResponse,
  R2PresignRequest,
  R2PresignResponse,
  R2UploadResult,
} from "./types";
import { auth } from "@/lib/firebase/client";

export const R2_IMAGE_UPLOAD_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const R2_IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

function isAllowedImageContentType(contentType: string) {
  return (
    R2_IMAGE_UPLOAD_CONTENT_TYPES as readonly string[]
  ).includes(contentType);
}

function getFriendlyUploadErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (
      error.message === "이미지 파일은 10MB 이하만 업로드할 수 있습니다." ||
      error.message ===
        "이미지 파일은 JPG, PNG, WEBP 형식만 업로드할 수 있습니다."
    ) {
      return error.message;
    }
  }

  return "이미지 업로드에 실패했습니다. 파일 형식, 용량 또는 네트워크 상태를 확인해주세요.";
}

async function getCurrentIdToken() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  return user.getIdToken();
}

export async function requestR2UploadUrl(
  payload: R2PresignRequest
): Promise<R2PresignResponse> {
  let response: Response;

  try {
    response = await fetch("/.netlify/functions/r2-presign-upload", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("이미지 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }

  const data = (await response.json()) as
    | R2PresignResponse
    | { error?: string };

  if (!response.ok) {
    throw new Error(
      "error" in data && data.error
        ? data.error
        : "이미지 업로드에 실패했습니다. 잠시 후 다시 시도해주세요."
    );
  }

  return data as R2PresignResponse;
}

export async function uploadBlobToR2(
  blob: Blob,
  payload: R2PresignRequest
): Promise<R2UploadResult> {
  const presigned = await requestR2UploadUrl(payload);

  try {
    const uploadResponse = await fetch(presigned.uploadUrl, {
      method: "PUT",
      headers: {
        "content-type": payload.contentType,
      },
      body: blob,
    });

    if (!uploadResponse.ok) {
      throw new Error("이미지 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  } catch {
    throw new Error("이미지 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }

  return {
    publicUrl: presigned.publicUrl,
    key: presigned.key,
  };
}

export async function uploadGlbBlobToR2({
  blob,
  filename,
  artistSlug,
  workSlug,
}: {
  blob: Blob;
  filename: string;
  artistSlug?: string;
  workSlug?: string;
}) {
  return uploadBlobToR2(blob, {
    filename,
    contentType: "model/gltf-binary",
    target: "glb",
    artistSlug,
    workSlug,
  });
}

export async function uploadGlbFileToR2({
  blob,
  filename,
  artistSlug,
  workSlug,
}: {
  blob: Blob;
  filename: string;
  artistSlug?: string;
  workSlug?: string;
}): Promise<R2UploadResult> {
  try {
    return await uploadBlobToR2(blob, {
      filename,
      contentType: "model/gltf-binary",
      target: "ar-model",
      artistSlug,
      workSlug,
    });
  } catch {
    throw new Error("AR 준비용 파일 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }
}

export async function uploadImageFileToR2({
  file,
  target,
  artistSlug,
  workSlug,
}: {
  file: File;
  target: "profile" | "work-image";
  artistSlug?: string;
  workSlug?: string;
}): Promise<R2UploadResult> {
  if (!isAllowedImageContentType(file.type)) {
    throw new Error(
      "이미지 파일은 JPG, PNG, WEBP 형식만 업로드할 수 있습니다."
    );
  }

  if (file.size > R2_IMAGE_UPLOAD_MAX_BYTES) {
    throw new Error("이미지 파일은 10MB 이하만 업로드할 수 있습니다.");
  }

  try {
    return await uploadBlobToR2(file, {
      filename: file.name,
      contentType: file.type,
      target,
      artistSlug,
      workSlug,
    });
  } catch (error) {
    throw new Error(getFriendlyUploadErrorMessage(error));
  }
}

export async function deleteR2ObjectsByPublicUrls(
  urls: string[]
): Promise<R2DeleteResponse> {
  const normalizedUrls = urls.map((value) => value.trim()).filter(Boolean);

  if (normalizedUrls.length === 0) {
    return {
      ok: true,
      deletedKeys: [],
      skippedKeys: [],
      failedKeys: [],
    };
  }

  const token = await getCurrentIdToken();
  const payload: R2DeleteRequest = { urls: normalizedUrls };

  let response: Response;

  try {
    response = await fetch("/.netlify/functions/r2-delete-object", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("R2 파일 정리에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }

  const data = (await response.json()) as R2DeleteResponse | { error?: string };

  if (!response.ok) {
    throw new Error(
      "error" in data && data.error
        ? data.error
        : "R2 파일 정리에 실패했습니다. 잠시 후 다시 시도해주세요."
    );
  }

  return data as R2DeleteResponse;
}
