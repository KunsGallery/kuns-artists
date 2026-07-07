export type R2UploadTarget =
  | "profile"
  | "work-image"
  | "glb"
  | "ar-model"
  | "usdz"
  | "cv";

export type R2PresignRequest = {
  filename: string;
  contentType: string;
  target: R2UploadTarget;
  artistSlug?: string;
  workSlug?: string;
};

export type R2PresignResponse = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
};

export type R2UploadResult = {
  publicUrl: string;
  key: string;
};

export type R2DeleteRequest = {
  keys?: string[];
  urls?: string[];
};

export type R2DeleteResponse = {
  ok: boolean;
  deletedKeys: string[];
  skippedKeys: string[];
  failedKeys: string[];
};
