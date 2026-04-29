import type {
  R2PresignRequest,
  R2PresignResponse,
  R2UploadResult,
} from "./types";

export async function requestR2UploadUrl(
  payload: R2PresignRequest
): Promise<R2PresignResponse> {
  const response = await fetch("/.netlify/functions/r2-presign-upload", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as
    | R2PresignResponse
    | { error?: string };

  if (!response.ok) {
    throw new Error(
      "error" in data && data.error
        ? data.error
        : "R2 upload URL request failed."
    );
  }

  return data as R2PresignResponse;
}

export async function uploadBlobToR2(
  blob: Blob,
  payload: R2PresignRequest
): Promise<R2UploadResult> {
  const presigned = await requestR2UploadUrl(payload);

  const uploadResponse = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": payload.contentType,
    },
    body: blob,
  });

  if (!uploadResponse.ok) {
    throw new Error("R2 upload failed.");
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