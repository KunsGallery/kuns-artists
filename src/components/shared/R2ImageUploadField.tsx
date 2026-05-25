"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  R2_IMAGE_UPLOAD_CONTENT_TYPES,
  uploadImageFileToR2,
} from "@/lib/r2/client";

type R2ImageUploadFieldProps = {
  label: string;
  description?: string;
  value: string;
  onChange: (url: string) => void;
  target: "profile" | "work-image";
  artistSlug?: string;
  workSlug?: string;
  disabled?: boolean;
};

type UploadFeedback =
  | {
      tone: "success";
      message: string;
    }
  | {
      tone: "error";
      message: string;
    };

export default function R2ImageUploadField({
  label,
  description,
  value,
  onChange,
  target,
  artistSlug,
  workSlug,
  disabled = false,
}: R2ImageUploadFieldProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<UploadFeedback | null>(null);
  const [hasPreviewError, setHasPreviewError] = useState(false);

  useEffect(() => {
    setHasPreviewError(false);
  }, [value]);

  const uploadDisabled = disabled || isUploading || !artistSlug;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    setIsUploading(true);
    setFeedback(null);

    try {
      const result = await uploadImageFileToR2({
        file,
        target,
        artistSlug,
        workSlug,
      });

      onChange(result.publicUrl);
      setFeedback({
        tone: "success",
        message: "이미지 업로드가 완료되었습니다. 저장 후 공개 페이지에 반영됩니다.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "이미지 업로드에 실패했습니다. 파일 형식이나 연결 상태를 확인해주세요.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  function handleBrowseClick() {
    fileInputRef.current?.click();
  }

  const previewBoxClassName =
    target === "profile"
      ? "aspect-square w-full"
      : "aspect-[4/3] w-full";
  const emptyPreviewMessage =
    target === "profile"
      ? "대표 이미지를 업로드하면 이곳에 미리보기가 표시됩니다."
      : "작품 이미지를 업로드하면 이곳에 미리보기가 표시됩니다.";
  const emptyPreviewHeightClassName =
    target === "profile" ? "min-h-[280px]" : "min-h-[220px]";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <label
            htmlFor={inputId}
            className="text-[13px] font-medium tracking-[-0.01em] text-neutral-700"
          >
            {label}
          </label>

          <span className="rounded-full border border-[#F37021]/35 bg-[#F37021]/10 px-2.5 py-1 text-[10px] tracking-[0.18em] text-[#B85D18]">
            이미지 업로드
          </span>
        </div>

        {description ? (
          <p className="max-w-2xl text-sm leading-7 text-neutral-500">
            {description}
          </p>
        ) : null}

        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-13 w-full rounded-[1.25rem] border border-black/10 bg-white px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20 disabled:cursor-not-allowed disabled:bg-neutral-100"
          placeholder="이미지 주소를 직접 붙여넣거나 업로드하세요."
          disabled={disabled}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleBrowseClick}
            disabled={uploadDisabled}
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#F37021]/45 bg-[#F37021]/10 px-5 text-sm font-medium text-[#B85D18] transition hover:border-[#F37021] hover:bg-[#F37021] hover:text-[#171717] disabled:cursor-not-allowed disabled:border-[#F37021]/25 disabled:bg-[#F37021]/10 disabled:text-[#B85D18]/60 disabled:opacity-80"
          >
            {isUploading ? "업로드 중..." : "이미지 업로드"}
          </button>

          <p className="text-[12px] leading-6 text-neutral-500">
            JPG, PNG, WEBP 형식만 가능하고 10MB 이하만 업로드할 수 있습니다.
          </p>
        </div>

        <p className="text-[12px] leading-6 text-neutral-500">
          이미지 업로드 후 저장 버튼을 눌러야 반영됩니다.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept={R2_IMAGE_UPLOAD_CONTENT_TYPES.join(",")}
          onChange={handleFileChange}
          className="hidden"
          disabled={uploadDisabled}
        />
      </div>

      <div className="space-y-3">
        <div
          className={`overflow-hidden rounded-[1.5rem] border border-black/8 bg-[#f7f6f2] ${previewBoxClassName}`}
        >
          {value.trim() && !hasPreviewError ? (
            <img
              src={value}
              alt={`${label} preview`}
              className="h-full w-full object-cover"
              onError={() => setHasPreviewError(true)}
            />
          ) : (
            <div
              className={`flex h-full items-center justify-center p-6 text-center text-sm leading-7 text-neutral-400 ${emptyPreviewHeightClassName}`}
            >
              {value.trim() ? "미리보기를 불러올 수 없습니다." : emptyPreviewMessage}
            </div>
          )}
        </div>

        {value.trim() ? (
          <p className="break-all text-[12px] leading-6 text-neutral-500">
            {value}
          </p>
        ) : null}
      </div>

      {feedback ? (
        <div
          role={feedback.tone === "error" ? "alert" : "status"}
          aria-live={feedback.tone === "error" ? "assertive" : "polite"}
          className={
            feedback.tone === "error"
              ? "rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
              : "rounded-[1.5rem] border border-[#F37021]/25 bg-[#fef4ea] p-4 text-sm leading-6 text-[#a95e14]"
          }
        >
          {feedback.message}
        </div>
      ) : null}
    </div>
  );
}
