"use client";

import { useEffect, useState } from "react";
import {
  createCanvasGlbBlob,
  createSafeGlbFilename,
  DEFAULT_DEPTH_CM,
  DEFAULT_FRONT_ROTATION_X_DEG,
  DEFAULT_FRONT_ROTATION_Y_DEG,
  DEFAULT_SHOW_BACK_LABEL,
  DEFAULT_SIDE_MODE,
  downloadBlob,
} from "@/lib/ar/createCanvasGlb";
import R2ImageUploadField from "@/components/shared/R2ImageUploadField";
import type { WorkFormValues } from "@/types/work";

export type ArtistWorkPublicationState = "published" | "pending" | "archived";

type ArtistWorkGlbFormProps = {
  mode: "new" | "edit";
  initialValues?: Partial<WorkFormValues>;
  onSave?: (values: WorkFormValues) => Promise<string | void>;
  saveButtonLabel?: string;
  artistSlug?: string;
  workSlug?: string;
  publicationState?: ArtistWorkPublicationState;
  showLegacyArPreparation?: boolean;
};

type BadgeTone = "required" | "recommended" | "optional" | "auto";
type StatusTone = "success" | "warning" | "muted";

const FRONT_ROTATION_X_OPTIONS = [
  "-15",
  "-10",
  "-5",
  "0",
  "5",
  "10",
  "15",
] as const;
const FRONT_ROTATION_Y_OPTIONS = [
  "-90",
  "0",
  "30",
  "45",
  "60",
  "90",
  "180",
  "270",
] as const;

const DEFAULT_FORM_VALUES: WorkFormValues = {
  title: "",
  artistName: "",
  year: "",
  medium: "",
  dimensions: "",
  description: "",
  coverImageUrl: "",
  widthCm: "",
  heightCm: "",
  depthCm: String(DEFAULT_DEPTH_CM),
  frontRotationXDeg: String(DEFAULT_FRONT_ROTATION_X_DEG),
  frontRotationYDeg: String(DEFAULT_FRONT_ROTATION_Y_DEG),
  sideMode: DEFAULT_SIDE_MODE,
  showBackLabel: DEFAULT_SHOW_BACK_LABEL,
};

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function getPanelTitle(mode: "new" | "edit") {
  return mode === "new" ? "새 작품 등록" : "작품 정보 수정";
}

function getDescription(mode: "new" | "edit") {
  return mode === "new"
    ? "작품 이미지와 기본 정보를 입력하면 갤러리 검수 후 공개 작가 페이지에 반영됩니다."
    : "등록한 작품의 이미지와 정보를 수정할 수 있습니다. 공개 여부는 갤러리 검수 후 반영됩니다.";
}

function getPublicationStateLabel(state: ArtistWorkPublicationState) {
  if (state === "published") {
    return "공개 상태";
  }

  if (state === "archived") {
    return "보관 상태";
  }

  return "검수 대기";
}

function getPublicationStateMessage(state: ArtistWorkPublicationState) {
  if (state === "published") {
    return "현재 공개 작가 페이지에 표시 중입니다.";
  }

  if (state === "archived") {
    return "보관 처리된 작품입니다.";
  }

  return "관리자 검수 후 공개됩니다.";
}

function getPublicationStateTone(state: ArtistWorkPublicationState) {
  if (state === "published") {
    return "success";
  }

  if (state === "archived") {
    return "muted";
  }

  return "warning";
}

function mergeInitialValues(initialValues?: Partial<WorkFormValues>) {
  return {
    ...DEFAULT_FORM_VALUES,
    ...Object.fromEntries(
      Object.entries(initialValues ?? {}).filter(([, value]) => value !== undefined)
    ),
  } satisfies WorkFormValues;
}

function getOptionalNumberError(value: string, label: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return `${label}은 0보다 큰 숫자로 입력해 주세요.`;
  }

  return null;
}

function validateArDownload(form: WorkFormValues) {
  if (!form.coverImageUrl.trim()) {
    return "AR 준비용 파일을 내려받으려면 이미지를 먼저 입력해 주세요.";
  }

  if (!form.widthCm.trim() || !form.heightCm.trim()) {
    return "AR 준비용 파일을 내려받으려면 가로와 세로 치수를 입력해 주세요.";
  }

  const widthError = getOptionalNumberError(form.widthCm, "가로");
  const heightError = getOptionalNumberError(form.heightCm, "세로");
  const depthError = getOptionalNumberError(form.depthCm, "깊이");
  const rotationXError = getOptionalNumberError(
    form.frontRotationXDeg,
    "앞면 기울기 X"
  );
  const rotationYError = getOptionalNumberError(
    form.frontRotationYDeg,
    "앞면 기울기 Y"
  );

  return (
    widthError ||
    heightError ||
    depthError ||
    rotationXError ||
    rotationYError ||
    null
  );
}

export default function ArtistWorkGlbForm({
  mode,
  initialValues,
  onSave,
  saveButtonLabel,
  artistSlug,
  workSlug,
  publicationState = "pending",
  showLegacyArPreparation = false,
}: ArtistWorkGlbFormProps) {
  const [form, setForm] = useState<WorkFormValues>(() =>
    mergeInitialValues(initialValues)
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [glbErrorMessage, setGlbErrorMessage] = useState<string | null>(null);
  const [glbSuccessMessage, setGlbSuccessMessage] = useState<string | null>(
    null
  );
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(
    null
  );

  useEffect(() => {
    setForm(mergeInitialValues(initialValues));
  }, [initialValues]);

  function updateField<K extends keyof WorkFormValues>(
    key: K,
    value: WorkFormValues[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!onSave) {
      return;
    }

    setIsSaving(true);
    setSaveErrorMessage(null);
    setSaveSuccessMessage(null);

    try {
      const message = await onSave(form);
      setSaveSuccessMessage(message ?? "작품이 저장되었습니다.");
    } catch (error) {
      setSaveErrorMessage(
        error instanceof Error
          ? error.message
          : "저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGenerateGlb() {
    setGlbErrorMessage(null);
    setGlbSuccessMessage(null);

    const validationError = validateArDownload(form);

    if (validationError) {
      setGlbErrorMessage(validationError);
      return;
    }

    const widthCm = Number(form.widthCm);
    const heightCm = Number(form.heightCm);
    const depthCm = Number(form.depthCm || String(DEFAULT_DEPTH_CM));
    const frontRotationXDeg = Number(
      form.frontRotationXDeg || String(DEFAULT_FRONT_ROTATION_X_DEG)
    );
    const frontRotationYDeg = Number(
      form.frontRotationYDeg || String(DEFAULT_FRONT_ROTATION_Y_DEG)
    );

    setIsGenerating(true);

    try {
      const filename = createSafeGlbFilename(form.title || "artwork-canvas");
      const blob = await createCanvasGlbBlob(
        {
          imageUrl: form.coverImageUrl,
          title: form.title,
          artistName: normalizeOptionalText(form.artistName),
          year: normalizeOptionalText(form.year),
          medium: normalizeOptionalText(form.medium),
          dimensions: normalizeOptionalText(form.dimensions),
          widthCm,
          heightCm,
          depthCm,
        },
        {
          frontRotationXDeg,
          frontRotationYDeg,
          sideMode: form.sideMode,
          showBackLabel: form.showBackLabel,
        }
      );

      downloadBlob(blob, filename);
      setGlbSuccessMessage(
        "AR 준비용 파일이 생성되어 브라우저에 다운로드되었습니다."
      );
    } catch (error) {
      setGlbErrorMessage(
        error instanceof Error
          ? error.message
          : "AR 준비용 파일을 생성하지 못했습니다."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  const previewTitle = form.title.trim() || "작품 제목";
  const previewYear = form.year.trim() || "연도 미입력";
  const previewMedium = form.medium.trim() || "재료 미입력";
  const previewDimensions = form.dimensions.trim() || "크기 미입력";
  const previewImageUrl = form.coverImageUrl.trim();
  const saveActionLabel =
    saveButtonLabel ?? (mode === "new" ? "작품 저장" : "변경사항 저장");

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_370px]">
      <div className="space-y-6">
        <form
          onSubmit={handleSave}
          className="rounded-[2rem] border border-black/8 bg-white p-6 shadow-sm md:p-7"
        >
          <div className="mb-8 space-y-3">
            <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-400">
              작품 편집
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-4xl">
              {getPanelTitle(mode)}
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-neutral-600 md:text-[15px]">
              {getDescription(mode)}
            </p>
            <p className="max-w-2xl text-sm leading-7 text-neutral-500">
              이미지 업로드 후 저장 버튼을 눌러야 반영됩니다.
            </p>
          </div>

          <div className="space-y-6">
            <FormSection
              label="1. Artwork Image"
              description="공개 작가 페이지와 작품 카드에 표시될 대표 이미지를 업로드해주세요."
            >
              <R2ImageUploadField
                label="Artwork Image"
                description="이미지를 업로드하거나 공개 페이지 주소를 직접 입력할 수 있습니다."
                value={form.coverImageUrl}
                onChange={(value) => updateField("coverImageUrl", value)}
                target="work-image"
                artistSlug={artistSlug}
                workSlug={workSlug}
                disabled={isGenerating || isSaving}
              />
            </FormSection>

            <FormSection
              label="2. Basic Information"
              description="작품명, 제작연도, 재료, 크기 등 기본 정보를 입력해주세요."
            >
              <InputField
                label="Title"
                badge="필수"
                badgeTone="required"
                value={form.title}
                onChange={(value) => updateField("title", value)}
                placeholder="작품 제목을 입력하세요."
                disabled={isGenerating || isSaving}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  label="Artist Name"
                  badge="자동"
                  badgeTone="auto"
                  value={form.artistName}
                  onChange={(value) => updateField("artistName", value)}
                  placeholder="작가명이 자동으로 채워집니다."
                  disabled
                  note="프로필에서 자동으로 불러옵니다."
                />

                <InputField
                  label="Year"
                  badge="권장"
                  badgeTone="recommended"
                  value={form.year}
                  onChange={(value) => updateField("year", value)}
                  placeholder="2026"
                  disabled={isGenerating || isSaving}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  label="Medium"
                  badge="권장"
                  badgeTone="recommended"
                  value={form.medium}
                  onChange={(value) => updateField("medium", value)}
                  placeholder="Acrylic and Pigment on Canvas"
                  disabled={isGenerating || isSaving}
                />

                <InputField
                  label="Dimensions"
                  badge="권장"
                  badgeTone="recommended"
                  value={form.dimensions}
                  onChange={(value) => updateField("dimensions", value)}
                  placeholder="116.8 x 91.0 cm"
                  disabled={isGenerating || isSaving}
                />
              </div>

              <TextareaField
                label="Description"
                badge="선택"
                badgeTone="optional"
                value={form.description}
                rows={6}
                onChange={(value) => updateField("description", value)}
                placeholder="작품 설명을 입력해주세요."
                disabled={isGenerating || isSaving}
              />
            </FormSection>

            <FormSection
              label="3. Physical Dimensions"
              description="AR 제작과 작품 기록에 사용되는 실제 크기입니다."
            >
              <div className="grid gap-4 md:grid-cols-3">
                <InputField
                  label="가로 cm"
                  badge="필수"
                  badgeTone="required"
                  value={form.widthCm}
                  onChange={(value) => updateField("widthCm", value)}
                  placeholder="116.8"
                  type="number"
                  min="0.1"
                  step="0.1"
                  inputMode="decimal"
                  disabled={isGenerating || isSaving}
                />

                <InputField
                  label="세로 cm"
                  badge="필수"
                  badgeTone="required"
                  value={form.heightCm}
                  onChange={(value) => updateField("heightCm", value)}
                  placeholder="91"
                  type="number"
                  min="0.1"
                  step="0.1"
                  inputMode="decimal"
                  disabled={isGenerating || isSaving}
                />

                <InputField
                  label="깊이 cm"
                  badge="필수"
                  badgeTone="required"
                  value={form.depthCm}
                  onChange={(value) => updateField("depthCm", value)}
                  placeholder={String(DEFAULT_DEPTH_CM)}
                  type="number"
                  min="0.1"
                  step="0.1"
                  inputMode="decimal"
                  disabled={isGenerating || isSaving}
                />
              </div>
            </FormSection>

            {showLegacyArPreparation ? (
              <FormSection
                label="4. Legacy AR Preparation"
                description="관리자용 기존 AR V1 준비 영역입니다. 작가 화면에서는 표시되지 않습니다."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    label="앞면 기울기 X"
                    badge="선택"
                    badgeTone="optional"
                    value={form.frontRotationXDeg}
                    onChange={(value) => updateField("frontRotationXDeg", value)}
                    disabled={isGenerating || isSaving}
                  >
                    {FRONT_ROTATION_X_OPTIONS.map((rotation) => (
                      <option key={rotation} value={rotation}>
                        {rotation}°
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    label="앞면 기울기 Y"
                    badge="선택"
                    badgeTone="optional"
                    value={form.frontRotationYDeg}
                    onChange={(value) => updateField("frontRotationYDeg", value)}
                    disabled={isGenerating || isSaving}
                  >
                    {FRONT_ROTATION_Y_OPTIONS.map((rotation) => (
                      <option key={rotation} value={rotation}>
                        {rotation}°
                      </option>
                    ))}
                  </SelectField>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    label="측면 표현"
                    badge="선택"
                    badgeTone="optional"
                    value={form.sideMode}
                    onChange={(value) =>
                      updateField("sideMode", value as WorkFormValues["sideMode"])
                    }
                    disabled={isGenerating || isSaving}
                  >
                    <option value="canvas">캔버스형</option>
                    <option value="image">이미지형</option>
                  </SelectField>

                  <ToggleField
                    label="뒷면 라벨"
                    badge="선택"
                    badgeTone="optional"
                    checked={form.showBackLabel}
                    onChange={(checked) => updateField("showBackLabel", checked)}
                    disabled={isGenerating || isSaving}
                  />
                </div>

                <p className="text-sm leading-6 text-neutral-500">
                  AR 준비용 파일은 필요할 때만 내려받을 수 있습니다. 저장에는 영향을
                  주지 않습니다.
                </p>
              </FormSection>
            ) : null}

            <div className="space-y-3 pt-2">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={isSaving || isGenerating || !onSave}
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-neutral-950 px-6 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-500 sm:flex-1"
                >
                  {isSaving ? "저장 중..." : saveActionLabel}
                </button>

                {showLegacyArPreparation ? (
                  <button
                    type="button"
                    onClick={() => void handleGenerateGlb()}
                    disabled={isGenerating || isSaving}
                    className="inline-flex h-12 w-full items-center justify-center rounded-full border border-black/10 bg-white px-6 text-sm font-medium text-neutral-900 transition hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {isGenerating ? "준비 중..." : "AR 준비용 파일 다운로드"}
                  </button>
                ) : null}
              </div>

              {saveSuccessMessage ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
                >
                  {saveSuccessMessage}
                </div>
              ) : null}

              {saveErrorMessage ? (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
                >
                  {saveErrorMessage}
                </div>
              ) : null}

              {showLegacyArPreparation && glbSuccessMessage ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
                >
                  {glbSuccessMessage}
                </div>
              ) : null}

              {showLegacyArPreparation && glbErrorMessage ? (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
                >
                  {glbErrorMessage}
                </div>
              ) : null}
            </div>
          </div>
        </form>
      </div>

      <aside className="space-y-4">
        <PreviewCard
          title={previewTitle}
          year={previewYear}
          medium={previewMedium}
          dimensions={previewDimensions}
          imageUrl={previewImageUrl}
          publicationState={publicationState}
        />

        <div className="rounded-[2rem] border border-black/8 bg-white p-6 shadow-sm md:p-7">
          <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
            저장 안내
          </p>
          <p className="mt-4 text-sm leading-7 text-neutral-600">
            이미지와 기본 정보를 먼저 정리한 뒤 저장하면, 갤러리 검수 후 공개
            작가 페이지에 반영됩니다.
          </p>
          <p className="mt-3 text-sm leading-7 text-neutral-500">
            작품 이미지가 없으면 미리보기는 자리만 유지하고 안내 문구가 표시됩니다.
          </p>
        </div>
      </aside>
    </section>
  );
}

function FormSection({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-black/8 bg-[#fcfbf8] p-5 md:p-6">
      <div className="mb-5 space-y-2">
        <p className="text-[11px] font-medium tracking-[0.24em] text-neutral-500">
          {label}
        </p>
        <p className="max-w-2xl text-sm leading-7 text-neutral-600">
          {description}
        </p>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function FieldBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: BadgeTone;
}) {
  const styles = {
    required: "border-[#F37021]/35 bg-[#F37021]/10 text-[#B85D18]",
    recommended: "border-[#d8c8a0] bg-[#f6f0e3] text-[#7a6640]",
    optional: "border-[#cfc5b4] bg-[#eee6d8] text-[#63574b]",
    auto: "border-slate-200 bg-slate-50 text-slate-600",
  }[tone];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-[0.18em] ${styles}`}
    >
      {children}
    </span>
  );
}

function StatusBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: StatusTone;
}) {
  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    muted: "border-slate-200 bg-slate-50 text-slate-700",
  }[tone];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] tracking-[0.18em] ${styles}`}
    >
      {children}
    </span>
  );
}

function FieldLabel({
  label,
  badge,
  badgeTone = "optional",
}: {
  label: string;
  badge?: string;
  badgeTone?: BadgeTone;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[13px] font-medium tracking-[-0.01em] text-neutral-700">
        {label}
      </span>
      {badge ? <FieldBadge tone={badgeTone}>{badge}</FieldBadge> : null}
    </div>
  );
}

function InputField({
  label,
  badge,
  badgeTone = "optional",
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  step,
  inputMode,
  disabled,
  note,
}: {
  label: string;
  badge?: string;
  badgeTone?: BadgeTone;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
  min?: string;
  step?: string;
  inputMode?: "text" | "decimal";
  disabled?: boolean;
  note?: string;
}) {
  return (
    <label className="block">
      <FieldLabel label={label} badge={badge} badgeTone={badgeTone} />
      <input
        type={type}
        min={min}
        step={step}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-white px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
        placeholder={placeholder}
        disabled={disabled}
      />
      {note ? (
        <p className="mt-2 text-[12px] leading-6 text-neutral-500">{note}</p>
      ) : null}
    </label>
  );
}

function TextareaField({
  label,
  badge,
  badgeTone = "optional",
  value,
  rows,
  onChange,
  placeholder,
  disabled,
  note,
}: {
  label: string;
  badge?: string;
  badgeTone?: BadgeTone;
  value: string;
  rows: number;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  note?: string;
}) {
  return (
    <label className="block">
      <FieldLabel label={label} badge={badge} badgeTone={badgeTone} />
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-[1.25rem] border border-black/10 bg-white px-4 py-4 text-sm leading-7 text-neutral-900 outline-none transition focus:border-black/20"
        placeholder={placeholder}
        disabled={disabled}
      />
      {note ? (
        <p className="mt-2 text-[12px] leading-6 text-neutral-500">{note}</p>
      ) : null}
    </label>
  );
}

function SelectField({
  label,
  badge,
  badgeTone = "optional",
  value,
  onChange,
  children,
  disabled,
  note,
}: {
  label: string;
  badge?: string;
  badgeTone?: BadgeTone;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
  note?: string;
}) {
  return (
    <label className="block">
      <FieldLabel label={label} badge={badge} badgeTone={badgeTone} />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-white px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
        disabled={disabled}
      >
        {children}
      </select>
      {note ? (
        <p className="mt-2 text-[12px] leading-6 text-neutral-500">{note}</p>
      ) : null}
    </label>
  );
}

function ToggleField({
  label,
  badge,
  badgeTone = "optional",
  checked,
  onChange,
  disabled,
  note,
}: {
  label: string;
  badge?: string;
  badgeTone?: BadgeTone;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  note?: string;
}) {
  return (
    <label className="block rounded-[1.25rem] border border-black/10 bg-white px-4 py-4">
      <FieldLabel label={label} badge={badge} badgeTone={badgeTone} />
      <div className="mt-3 flex items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-black/20"
          disabled={disabled}
        />
        <span className="text-sm leading-6 text-neutral-600">
          뒷면에 작품 정보를 표시합니다.
        </span>
      </div>
      {note ? (
        <p className="mt-2 text-[12px] leading-6 text-neutral-500">{note}</p>
      ) : null}
    </label>
  );
}

function PreviewCard({
  title,
  year,
  medium,
  dimensions,
  imageUrl,
  publicationState,
}: {
  title: string;
  year: string;
  medium: string;
  dimensions: string;
  imageUrl: string;
  publicationState: ArtistWorkPublicationState;
}) {
  const hasImage = imageUrl.trim().length > 0;
  const tone = getPublicationStateTone(publicationState);

  return (
    <aside className="rounded-[2rem] border border-black/8 bg-white p-6 shadow-sm md:p-7">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
              작품 미리보기
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-neutral-950">
              {title}
            </h3>
          </div>

          <StatusBadge tone={tone}>
            {getPublicationStateLabel(publicationState)}
          </StatusBadge>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] border border-black/8 bg-[#f7f6f2]">
          {hasImage ? (
            <img
              src={imageUrl}
              alt="작품 미리보기"
              className="aspect-[4/3] h-full w-full object-cover"
            />
          ) : (
            <div className="flex min-h-[280px] items-center justify-center p-6 text-center text-sm leading-7 text-neutral-400">
              작품 이미지를 업로드하면 이곳에 미리보기가 표시됩니다.
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <PreviewMeta label="Year" value={year} />
          <PreviewMeta label="Medium" value={medium} />
          <div className="sm:col-span-2">
            <PreviewMeta label="Dimensions" value={dimensions} />
          </div>
        </div>

        <div className="rounded-[1.5rem] bg-[#f7f6f2] p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
            공개 상태 안내
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            {getPublicationStateMessage(publicationState)}
          </p>
        </div>

        <p className="text-sm leading-7 text-neutral-500">
          저장 후 갤러리 검수를 거쳐 공개 작가 페이지에 표시됩니다.
        </p>
      </div>
    </aside>
  );
}

function PreviewMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-black/8 bg-[#fcfbf8] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-neutral-700">{value}</p>
    </div>
  );
}
