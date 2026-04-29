export type R2UploadTarget = "profile" | "work-image" | "glb" | "usdz" | "cv";

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
