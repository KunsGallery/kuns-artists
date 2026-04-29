import type { R2PresignRequest, R2PresignResponse } from "./types";

export async function requestR2UploadUrl(
  _payload: R2PresignRequest
): Promise<R2PresignResponse> {
  throw new Error("R2 upload is not implemented yet.");
}
