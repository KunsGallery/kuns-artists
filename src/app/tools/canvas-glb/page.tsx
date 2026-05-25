"use client";

import { useState } from "react";
import Link from "next/link";
import {
  createCanvasGlbBlob,
  createSafeGlbFilename,
  DEFAULT_BACK_COLOR,
  DEFAULT_DEPTH_CM,
  DEFAULT_FRONT_ROTATION_X_DEG,
  DEFAULT_FRONT_ROTATION_Y_DEG,
  DEFAULT_SHOW_BACK_LABEL,
  DEFAULT_SIDE_COLOR,
  DEFAULT_SIDE_MODE,
  downloadBlob,
  type CanvasSideMode,
} from "@/lib/ar/createCanvasGlb";
import {
  getAllWorksForTool,
  type WorkToolDoc,
} from "@/lib/firebase/firestore";
import { uploadGlbBlobToR2 } from "@/lib/r2/client";

type CanvasGlbFormState = {
  imageUrl: string;
  title: string;
  artistName: string;
  year: string;
  medium: string;
  dimensions: string;
  widthCm: string;
  heightCm: string;
  depthCm: string;
  frontRotationXDeg: string;
  frontRotationYDeg: string;
  sideMode: CanvasSideMode;
  sideColor: string;
  backColor: string;
  showBackLabel: boolean;
};

type ToolMode = "manual" | "select";

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

const DEFAULT_FORM: CanvasGlbFormState = {
  imageUrl: "/images/works/kim-hwan-sample-01.jpg",
  title: "Test Canvas",
  artistName: "Kim Hwan",
  year: "2026",
  medium: "Acrylic and Pigment on Canvas",
  dimensions: "116.8 x 91.0 cm",
  widthCm: "116.8",
  heightCm: "91",
  depthCm: String(DEFAULT_DEPTH_CM),
  frontRotationXDeg: String(DEFAULT_FRONT_ROTATION_X_DEG),
  frontRotationYDeg: String(DEFAULT_FRONT_ROTATION_Y_DEG),
  sideMode: DEFAULT_SIDE_MODE,
  sideColor: DEFAULT_SIDE_COLOR,
  backColor: DEFAULT_BACK_COLOR,
  showBackLabel: DEFAULT_SHOW_BACK_LABEL,
};

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function getSideModeLabel(sideMode: CanvasSideMode) {
  return sideMode === "canvas" ? "Canvas Beige" : "Image Edge";
}

function getUploadMetaFromWork(work: WorkToolDoc | null, form: CanvasGlbFormState) {
  const extendedWork = work as
    | (WorkToolDoc & {
        slug?: string;
        workSlug?: string;
        artistSlug?: string;
      })
    | null;

  return {
    artistSlug: extendedWork?.artistSlug || "unknown-artist",
    workSlug:
      extendedWork?.slug ||
      extendedWork?.workSlug ||
      form.title ||
      "canvas-work",
  };
}

// This route stays public for quick iteration during implementation.
// Move it under an admin-only route once the asset pipeline is connected.
export default function CanvasGlbToolPage() {
  const [toolMode, setToolMode] = useState<ToolMode>("manual");
  const [form, setForm] = useState<CanvasGlbFormState>(DEFAULT_FORM);
  const [availableWorks, setAvailableWorks] = useState<WorkToolDoc[]>([]);
  const [selectedWorkId, setSelectedWorkId] = useState("");
  const [isLoadingWorks, setIsLoadingWorks] = useState(false);
  const [worksErrorMessage, setWorksErrorMessage] = useState<string | null>(
    null
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(
    null
  );
  const [uploadedGlbUrl, setUploadedGlbUrl] = useState("");

  const selectedWork =
    availableWorks.find((work) => work.id === selectedWorkId) ?? null;

  function updateField<K extends keyof CanvasGlbFormState>(
    key: K,
    value: CanvasGlbFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function applySelectedWork(work: WorkToolDoc) {
    setForm((current) => ({
      ...current,
      imageUrl: work.coverImageUrl ?? "",
      title: work.title ?? "",
      artistName: work.artistName ?? "",
      year: work.year ?? "",
      medium: work.medium ?? "",
      dimensions: work.dimensions ?? "",
      widthCm: work.widthCm?.toString() ?? "",
      heightCm: work.heightCm?.toString() ?? "",
      depthCm: work.depthCm?.toString() ?? String(DEFAULT_DEPTH_CM),
    }));
  }

  async function loadWorksForSelection() {
    setIsLoadingWorks(true);
    setWorksErrorMessage(null);

    try {
      const works = await getAllWorksForTool();
      setAvailableWorks(works);
    } catch (error) {
      setWorksErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load works from Firestore."
      );
    } finally {
      setIsLoadingWorks(false);
    }
  }

  async function handleToolModeChange(nextMode: ToolMode) {
    setToolMode(nextMode);
    setSuccessMessage(null);
    setErrorMessage(null);
    setUploadErrorMessage(null);
    setUploadedGlbUrl("");

    if (nextMode === "select" && availableWorks.length === 0 && !isLoadingWorks) {
      await loadWorksForSelection();
    }
  }

  function handleWorkSelect(nextWorkId: string) {
    setSelectedWorkId(nextWorkId);
    setSuccessMessage(null);
    setErrorMessage(null);
    setUploadErrorMessage(null);
    setUploadedGlbUrl("");

    if (!nextWorkId) return;

    const work = availableWorks.find((entry) => entry.id === nextWorkId);

    if (!work) return;

    applySelectedWork(work);
  }

  function validateAndGetNumbers() {
    const widthCm = Number(form.widthCm);
    const heightCm = Number(form.heightCm);
    const depthCm = Number(form.depthCm || String(DEFAULT_DEPTH_CM));
    const frontRotationXDeg = Number(
      form.frontRotationXDeg || String(DEFAULT_FRONT_ROTATION_X_DEG)
    );
    const frontRotationYDeg = Number(
      form.frontRotationYDeg || String(DEFAULT_FRONT_ROTATION_Y_DEG)
    );

    if (!form.imageUrl.trim()) {
      throw new Error("작품 이미지 URL이 필요합니다.");
    }

    if (!form.title.trim()) {
      throw new Error("작품명이 필요합니다.");
    }

    if (!widthCm || Number.isNaN(widthCm)) {
      throw new Error("작품의 가로 cm 값을 입력해주세요.");
    }

    if (!heightCm || Number.isNaN(heightCm)) {
      throw new Error("작품의 세로 cm 값을 입력해주세요.");
    }

    if (!depthCm || Number.isNaN(depthCm)) {
      throw new Error("작품의 두께 cm 값을 입력해주세요.");
    }

    return {
      widthCm,
      heightCm,
      depthCm,
      frontRotationXDeg,
      frontRotationYDeg,
    };
  }

  async function createCurrentGlbBlob() {
    const {
      widthCm,
      heightCm,
      depthCm,
      frontRotationXDeg,
      frontRotationYDeg,
    } = validateAndGetNumbers();

    return await createCanvasGlbBlob(
      {
        imageUrl: form.imageUrl,
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
        sideColor: form.sideColor || DEFAULT_SIDE_COLOR,
        backColor: form.backColor || DEFAULT_BACK_COLOR,
        sideMode: form.sideMode,
        showBackLabel: form.showBackLabel,
      }
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setUploadErrorMessage(null);

    setIsGenerating(true);

    try {
      const filename = createSafeGlbFilename(form.title);
      const blob = await createCurrentGlbBlob();

      downloadBlob(blob, filename);
      setSuccessMessage(
        `${filename} has been generated and downloaded in your browser.`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to generate the canvas GLB."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateAndUploadGlb() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setUploadErrorMessage(null);
    setUploadedGlbUrl("");

    setIsUploading(true);

    try {
      const filename = createSafeGlbFilename(form.title);
      const blob = await createCurrentGlbBlob();
      const { artistSlug, workSlug } = getUploadMetaFromWork(
        selectedWork,
        form
      );

      const result = await uploadGlbBlobToR2({
        blob,
        filename,
        artistSlug,
        workSlug,
      });

      setUploadedGlbUrl(result.publicUrl);
      setSuccessMessage(
        "GLB가 생성되어 R2에 업로드되었습니다. 아직 Firestore generatedGlbUrl에는 자동 저장하지 않았습니다."
      );
    } catch (error) {
      setUploadErrorMessage(
        error instanceof Error
          ? error.message
          : "GLB 업로드 중 오류가 발생했습니다."
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="theme-dark min-h-screen bg-[#f5f3ee] text-neutral-950">
      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="text-[11px] uppercase tracking-[0.28em] text-neutral-500"
          >
            KÜN’S GALLERY
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
            >
              Admin
            </Link>

            <Link
              href="/artist/login"
              className="inline-flex h-11 items-center rounded-full bg-black px-5 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Artist Login
            </Link>
          </div>
        </header>

        <section className="grid gap-8 py-12 md:grid-cols-[1.08fr_0.92fr] md:items-end md:py-16">
          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
              Canvas GLB Tool
            </p>

            <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
              Generate a
              <br />
              canvas GLB.
            </h1>

            <p className="mt-8 max-w-2xl text-sm leading-7 text-neutral-600 md:text-[15px]">
              작품 이미지 URL을 직접 입력하거나 Firestore 작품을 선택해, 앞면
              이미지와 옆면, 뒷면 정보 표현까지 조정 가능한 캔버스형 GLB를
              브라우저에서 바로 생성해 다운로드하거나 R2에 업로드할 수 있습니다.
            </p>
          </div>

          <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 backdrop-blur-sm md:p-7">
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
              Notes
            </p>

            <div className="mt-4 space-y-3 text-sm leading-6 text-neutral-600">
              <p>
                기본 두께는 {DEFAULT_DEPTH_CM}cm이며, 입력하지 않으면 자동
                적용됩니다.
              </p>
              <p>
                대부분의 경우 Front Rotation X는 0을 권장합니다. 작품이
                위아래로 기울어져 보일 때만 -5, 5처럼 작은 값부터 조정하세요.
              </p>
              <p>
                Canvas Beige: 옆면을 캔버스 베이지 재질로 처리합니다.
                <br />
                Image Edge: 정면 이미지의 가장자리 픽셀을 추출해 옆면에
                이어지는 느낌을 만듭니다.
              </p>
              <p>
                Back Label을 켜면 뒷면에 작품 정보가 표시되고, 끄면 단색 베이지
                뒷면으로 생성됩니다.
              </p>
              <p>
                Select Work Mode에서는 Firestore `works` 문서를 불러와 폼을
                자동 채웁니다. `widthCm`, `heightCm`가 없는 작품은 dimensions를
                자동 파싱하지 않으니 직접 입력해주세요.
              </p>
              <p>
                R2 업로드는 generatedGlbUrl 자동 저장 전 단계입니다. 성공하면
                public URL이 표시됩니다.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] border border-black/8 bg-white p-6 shadow-sm md:p-7"
          >
            <div className="grid gap-5">
              <div className="rounded-[1.5rem] border border-black/8 bg-[#f7f6f2] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                  Input Mode
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleToolModeChange("manual")}
                    className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm transition ${
                      toolMode === "manual"
                        ? "bg-black text-white"
                        : "border border-black/10 bg-white text-neutral-900 hover:border-black/20"
                    }`}
                  >
                    Manual Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToolModeChange("select")}
                    className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm transition ${
                      toolMode === "select"
                        ? "bg-black text-white"
                        : "border border-black/10 bg-white text-neutral-900 hover:border-black/20"
                    }`}
                  >
                    Select Work Mode
                  </button>
                </div>
              </div>

              {toolMode === "select" ? (
                <div className="rounded-[1.5rem] border border-black/8 bg-[#f7f6f2] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                        Firestore Works
                      </p>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">
                        작품을 선택하면 title, artistName, year, medium,
                        dimensions, widthCm, heightCm, depthCm, coverImageUrl이
                        자동 채워집니다.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void loadWorksForSelection()}
                      disabled={isLoadingWorks}
                      className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoadingWorks ? "Loading..." : "Refresh Works"}
                    </button>
                  </div>

                  <label className="mt-4 block">
                    <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                      Select Work
                    </span>
                    <select
                      value={selectedWorkId}
                      onChange={(event) => handleWorkSelect(event.target.value)}
                      className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-white px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
                      disabled={isLoadingWorks}
                    >
                      <option value="">Choose a Firestore work</option>
                      {availableWorks.map((work) => (
                        <option key={work.id} value={work.id}>
                          {(work.artistName ?? "Unknown Artist") +
                            " / " +
                            (work.title ?? "Untitled")}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedWork &&
                  (selectedWork.widthCm === undefined ||
                    selectedWork.heightCm === undefined) ? (
                    <div className="mt-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-800">
                      선택된 작품에 `widthCm` 또는 `heightCm`가 없습니다.
                      <br />
                      `dimensions`는 표시만 유지하고, 실제 GLB 생성을 위해서는
                      폭과 높이를 직접 입력해주세요.
                    </div>
                  ) : null}

                  {worksErrorMessage ? (
                    <div className="mt-4 rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-700">
                      {worksErrorMessage}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  Image URL
                </span>
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(event) =>
                    updateField("imageUrl", event.target.value)
                  }
                  className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
                  placeholder="/images/works/kim-hwan-sample-01.jpg"
                  disabled={isGenerating || isUploading}
                />
              </label>

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
                  disabled={isGenerating || isUploading}
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
                    className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
                    placeholder="Kim Hwan"
                    disabled={isGenerating || isUploading}
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
                    disabled={isGenerating || isUploading}
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
                  disabled={isGenerating || isUploading}
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
                  disabled={isGenerating || isUploading}
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
                    onChange={(event) =>
                      updateField("widthCm", event.target.value)
                    }
                    className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
                    placeholder="100"
                    disabled={isGenerating || isUploading}
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
                    placeholder="100"
                    disabled={isGenerating || isUploading}
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
                    onChange={(event) =>
                      updateField("depthCm", event.target.value)
                    }
                    className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
                    placeholder={String(DEFAULT_DEPTH_CM)}
                    disabled={isGenerating || isUploading}
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
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
                    disabled={isGenerating || isUploading}
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
                    disabled={isGenerating || isUploading}
                  >
                    {FRONT_ROTATION_Y_OPTIONS.map((rotation) => (
                      <option key={rotation} value={rotation}>
                        {rotation}°
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                    Side Mode
                  </span>
                  <select
                    value={form.sideMode}
                    onChange={(event) =>
                      updateField(
                        "sideMode",
                        event.target.value as CanvasSideMode
                      )
                    }
                    className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
                    disabled={isGenerating || isUploading}
                  >
                    <option value="canvas">Canvas Beige</option>
                    <option value="image">Image Edge</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                    Side Color
                  </span>
                  <input
                    type="color"
                    value={form.sideColor}
                    onChange={(event) =>
                      updateField("sideColor", event.target.value)
                    }
                    className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-2 text-sm text-neutral-900 outline-none transition focus:border-black/20"
                    disabled={isGenerating || isUploading}
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                    Back Color
                  </span>
                  <input
                    type="color"
                    value={form.backColor}
                    onChange={(event) =>
                      updateField("backColor", event.target.value)
                    }
                    className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-2 text-sm text-neutral-900 outline-none transition focus:border-black/20"
                    disabled={isGenerating || isUploading}
                  />
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
                      disabled={isGenerating || isUploading}
                    />
                    <span className="text-sm leading-6 text-neutral-600">
                      Show artwork info on the back.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-between">
                <p className="text-sm leading-6 text-neutral-500">
                  입력된 비율, 회전값, 옆면 모드, 뒷면 라벨 설정으로 캔버스 GLB를
                  생성합니다.
                </p>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="submit"
                    disabled={isGenerating || isUploading}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-500"
                  >
                    {isGenerating
                      ? "Generating GLB..."
                      : "GLB 생성 및 다운로드"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleGenerateAndUploadGlb()}
                    disabled={isGenerating || isUploading}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUploading ? "R2 업로드 중..." : "GLB 생성 후 R2 업로드"}
                  </button>
                </div>
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
                  {createSafeGlbFilename(form.title)}
                </p>
              </div>

              <div className="rounded-[1.5rem] bg-[#f7f6f2] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                  Mode
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  {toolMode === "manual" ? "Manual Mode" : "Select Work Mode"}
                  {selectedWork ? (
                    <>
                      <br />
                      {selectedWork.artistName ?? "Unknown Artist"} /{" "}
                      {selectedWork.title ?? "Untitled"}
                    </>
                  ) : null}
                </p>
              </div>

              <div className="rounded-[1.5rem] bg-[#f7f6f2] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                  Rotation
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  X {form.frontRotationXDeg}°
                  <br />
                  Y {form.frontRotationYDeg}°
                </p>
              </div>

              <div className="rounded-[1.5rem] bg-[#f7f6f2] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                  Side Finish
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  {getSideModeLabel(form.sideMode)}
                  <br />
                  Side {form.sideColor}
                </p>
              </div>

              <div className="rounded-[1.5rem] bg-[#f7f6f2] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                  Back
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  {form.showBackLabel ? "Artwork info label on" : "Solid back color"}
                  <br />
                  Back {form.backColor}
                </p>
              </div>

              {form.showBackLabel ? (
                <div className="rounded-[1.5rem] bg-[#f7f6f2] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                    Back Label Preview
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    {form.title || "Untitled"}
                    <br />
                    {form.artistName || "Artist name not set"}
                    <br />
                    {form.year || "Year not set"}
                  </p>
                </div>
              ) : null}

              {uploadedGlbUrl ? (
                <div className="rounded-[1.5rem] border border-[rgba(243,112,33,0.18)] bg-[rgba(255,255,255,0.05)] p-4 text-sm leading-6 text-[var(--foreground)]">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--kuns-orange)]">
                    Uploaded GLB URL
                  </p>

                  <a
                    href={uploadedGlbUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block break-all underline underline-offset-4"
                  >
                    {uploadedGlbUrl}
                  </a>

                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(uploadedGlbUrl)}
                    className="mt-4 inline-flex h-10 items-center rounded-full border border-[rgba(247,241,232,0.14)] bg-[rgba(255,255,255,0.07)] px-4 text-xs font-medium text-[var(--foreground)] transition hover:border-[rgba(243,112,33,0.38)]"
                  >
                    URL 복사
                  </button>
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
                  {successMessage}
                </div>
              ) : null}

              {errorMessage ? (
                <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              {uploadErrorMessage ? (
                <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                  {uploadErrorMessage}
                </div>
              ) : null}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
