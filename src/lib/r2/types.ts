export type R2UploadTarget =
  | "profile"
  | "work-image"
  | "exhibition-image"
  | "glb"
  | "ar-model"
  | "quick-look"
  | "usdz"
  | "cv";

export type R2PresignRequest = {
  filename: string;
  contentType: string;
  target: R2UploadTarget;
  artistSlug?: string;
  workSlug?: string;
  workId?: string;
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
