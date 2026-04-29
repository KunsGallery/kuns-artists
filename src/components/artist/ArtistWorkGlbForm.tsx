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
import type { WorkFormValues } from "@/types/work";

type ArtistWorkGlbFormProps = {
  mode: "new" | "edit";
  workId?: string;
  initialValues?: Partial<WorkFormValues>;
  onSave?: (values: WorkFormValues) => Promise<string | void>;
  saveButtonLabel?: string;
};

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
  return mode === "new" ? "작품 등록" : "작품 수정";
}

function getDescription(mode: "new" | "edit") {
  return mode === "new"
    ? "작품 정보를 Firestore works 컬렉션에 저장하고, 같은 폼 값으로 캔버스형 GLB도 바로 생성해 다운로드할 수 있습니다."
    : "작품 정보를 수정 저장하고, 현재 값으로 캔버스형 GLB를 다시 생성해볼 수 있습니다.";
}

function mergeInitialValues(initialValues?: Partial<WorkFormValues>) {
  return {
    ...DEFAULT_FORM_VALUES,
    ...Object.fromEntries(
      Object.entries(initialValues ?? {}).filter(([, value]) => value !== undefined)
    ),
  } satisfies WorkFormValues;
}

export default function ArtistWorkGlbForm({
  mode,
  workId,
  initialValues,
  onSave,
  saveButtonLabel,
}: ArtistWorkGlbFormProps) {
  const [form, setForm] = useState<WorkFormValues>(() =>
    mergeInitialValues(initialValues)
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [glbErrorMessage, setGlbErrorMessage] = useState<string | null>(null);
  const [glbSuccessMessage, setGlbSuccessMessage] = useState<string | null>(null);
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
      setSaveSuccessMessage(message ?? "작품 정보가 저장되었습니다.");
    } catch (error) {
      setSaveErrorMessage(
        error instanceof Error
          ? error.message
          : "작품 저장 중 오류가 발생했습니다."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGenerateGlb() {
    setGlbErrorMessage(null);
    setGlbSuccessMessage(null);

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
        `${filename} has been generated and downloaded in your browser.`
      );
    } catch (error) {
      setGlbErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to generate the artwork GLB."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
      <form
        onSubmit={handleSave}
        className="rounded-[2rem] border border-black/8 bg-white p-6 shadow-sm md:p-7"
      >
        <div className="grid gap-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
              {getPanelTitle(mode)}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
              {getDescription(mode)}
            </p>
            <p className="mt-3 text-sm leading-7 text-neutral-500">
              `coverImageUrl`을 기준으로 현재 폼 값으로 GLB를 생성하며,
              작품명/설명/옵션 값은 Firestore works 문서에 저장됩니다.
            </p>
          </div>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
              Title
            </span>
            <input
              type="text"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
              placeholder="Test Canvas"
              disabled={isGenerating || isSaving}
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                Artist Name
              </span>
              <input
                type="text"
                value={form.artistName}
                onChange={(event) =>
                  updateField("artistName", event.target.value)
                }
                className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 text-sm text-neutral-500 outline-none"
                placeholder="Kim Hwan"
                disabled
              />
            </label>

            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                Year
              </span>
              <input
                type="text"
                value={form.year}
                onChange={(event) => updateField("year", event.target.value)}
                className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
                placeholder="2026"
                disabled={isGenerating || isSaving}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
              Medium
            </span>
            <input
              type="text"
              value={form.medium}
              onChange={(event) => updateField("medium", event.target.value)}
              className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
              placeholder="Acrylic and Pigment on Canvas"
              disabled={isGenerating || isSaving}
            />
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
              Dimensions
            </span>
            <input
              type="text"
              value={form.dimensions}
              onChange={(event) =>
                updateField("dimensions", event.target.value)
              }
              className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
              placeholder="116.8 x 91.0 cm"
              disabled={isGenerating || isSaving}
            />
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              rows={6}
              className="mt-2 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 py-4 text-sm leading-7 text-neutral-900 outline-none transition focus:border-black/20"
              placeholder="작품 설명을 입력해주세요."
              disabled={isGenerating || isSaving}
            />
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
              Cover Image URL
            </span>
            <input
              type="text"
              value={form.coverImageUrl}
              onChange={(event) =>
                updateField("coverImageUrl", event.target.value)
              }
              className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
              placeholder="/images/works/kim-hwan-sample-01.jpg"
              disabled={isGenerating || isSaving}
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                Width cm
              </span>
              <input
                type="number"
                min="0.1"
                step="0.1"
                inputMode="decimal"
                value={form.widthCm}
                onChange={(event) => updateField("widthCm", event.target.value)}
                className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
                placeholder="116.8"
                disabled={isGenerating || isSaving}
              />
            </label>

            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                Height cm
              </span>
              <input
                type="number"
                min="0.1"
                step="0.1"
                inputMode="decimal"
                value={form.heightCm}
                onChange={(event) =>
                  updateField("heightCm", event.target.value)
                }
                className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
                placeholder="91"
                disabled={isGenerating || isSaving}
              />
            </label>

            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                Depth cm
              </span>
              <input
                type="number"
                min="0.1"
                step="0.1"
                inputMode="decimal"
                value={form.depthCm}
                onChange={(event) => updateField("depthCm", event.target.value)}
                className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
                placeholder={String(DEFAULT_DEPTH_CM)}
                disabled={isGenerating || isSaving}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                Front Rotation X
              </span>
              <select
                value={form.frontRotationXDeg}
                onChange={(event) =>
                  updateField("frontRotationXDeg", event.target.value)
                }
                className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
                disabled={isGenerating || isSaving}
              >
                {FRONT_ROTATION_X_OPTIONS.map((rotation) => (
                  <option key={rotation} value={rotation}>
                    {rotation}°
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                Front Rotation Y
              </span>
              <select
                value={form.frontRotationYDeg}
                onChange={(event) =>
                  updateField("frontRotationYDeg", event.target.value)
                }
                className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
                disabled={isGenerating || isSaving}
              >
                {FRONT_ROTATION_Y_OPTIONS.map((rotation) => (
                  <option key={rotation} value={rotation}>
                    {rotation}°
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                Side Mode
              </span>
              <select
                value={form.sideMode}
                onChange={(event) =>
                  updateField(
                    "sideMode",
                    event.target.value as WorkFormValues["sideMode"]
                  )
                }
                className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
                disabled={isGenerating || isSaving}
              >
                <option value="canvas">Canvas Beige</option>
                <option value="image">Image Edge</option>
              </select>
            </label>

            <label className="block rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 py-4">
              <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                Back Label
              </span>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.showBackLabel}
                  onChange={(event) =>
                    updateField("showBackLabel", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-black/20"
                  disabled={isGenerating || isSaving}
                />
                <span className="text-sm leading-6 text-neutral-600">
                  Show artwork info on the back.
                </span>
              </div>
            </label>
          </div>

          <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-between">
            <button
              type="submit"
              disabled={isSaving || isGenerating || !onSave}
              className="inline-flex h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-500"
            >
              {isSaving
                ? "Saving..."
                : saveButtonLabel ?? (mode === "new" ? "작품 저장" : "작품 수정 저장")}
            </button>

            <button
              type="button"
              onClick={() => void handleGenerateGlb()}
              disabled={isGenerating || isSaving}
              className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-6 text-sm font-medium text-neutral-900 transition hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? "Generating GLB..." : "GLB 생성 및 다운로드"}
            </button>
          </div>
        </div>
      </form>

      <aside className="rounded-[2rem] border border-black/8 bg-white p-6 shadow-sm md:p-7">
        <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
          Status
        </p>

        <div className="mt-4 space-y-4">
          <div className="rounded-[1.5rem] bg-[#f7f6f2] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
              Output
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              {createSafeGlbFilename(form.title || "artwork-canvas")}
            </p>
          </div>

          {workId ? (
            <div className="rounded-[1.5rem] bg-[#f7f6f2] p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                Work ID
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                {workId}
              </p>
            </div>
          ) : null}

          <div className="rounded-[1.5rem] bg-[#f7f6f2] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
              Generator
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              X {form.frontRotationXDeg}°
              <br />
              Y {form.frontRotationYDeg}°
              <br />
              Side {form.sideMode}
            </p>
          </div>

          <div className="rounded-[1.5rem] bg-[#f7f6f2] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
              Firestore
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              작품 정보는 works 컬렉션에 저장됩니다.
              <br />
              `modelGlb`, `modelUsdz`, `generatedGlbUrl`은 아직 비워둡니다.
            </p>
          </div>

          {saveSuccessMessage ? (
            <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
              {saveSuccessMessage}
            </div>
          ) : null}

          {saveErrorMessage ? (
            <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
              {saveErrorMessage}
            </div>
          ) : null}

          {glbSuccessMessage ? (
            <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
              {glbSuccessMessage}
            </div>
          ) : null}

          {glbErrorMessage ? (
            <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
              {glbErrorMessage}
            </div>
          ) : null}
        </div>
      </aside>
    </section>
  );
}
