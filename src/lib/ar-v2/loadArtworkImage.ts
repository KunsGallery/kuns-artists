import type { LoadedArtworkImage } from "./types";

function getReadableErrorMessage(reason: unknown) {
  if (reason instanceof Error && reason.message.trim()) {
    return reason.message;
  }

  return "작품 이미지를 불러올 수 없습니다. R2 이미지 CORS 설정을 확인해주세요.";
}

export async function loadArtworkImageForArV2(url: string): Promise<LoadedArtworkImage> {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    throw new Error("작품 이미지를 불러올 수 없습니다. R2 이미지 CORS 설정을 확인해주세요.");
  }

  let response: Response;
  try {
    response = await fetch(trimmedUrl, { mode: "cors" });
  } catch (error) {
    throw new Error(getReadableErrorMessage(error));
  }

  if (!response.ok) {
    throw new Error("작품 이미지를 불러올 수 없습니다. R2 이미지 CORS 설정을 확인해주세요.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("작품 이미지의 픽셀 크기를 읽을 수 없습니다."));
      image.src = objectUrl;
    });
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw new Error(getReadableErrorMessage(error));
  }

  if (!image.naturalWidth || !image.naturalHeight) {
    URL.revokeObjectURL(objectUrl);
    throw new Error("작품 이미지의 픽셀 크기를 읽을 수 없습니다.");
  }

  return {
    image,
    revoke: () => URL.revokeObjectURL(objectUrl),
  };
}
