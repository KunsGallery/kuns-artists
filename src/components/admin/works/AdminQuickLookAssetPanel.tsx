"use client";

import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react";
import { deleteR2ObjectsByPublicUrls, MAX_QUICK_LOOK_USDZ_BYTES, RECOMMENDED_QUICK_LOOK_USDZ_BYTES, uploadQuickLookUsdzFileToR2 } from "@/lib/r2/client";
import { getReadyArV2GlbUrl } from "@/lib/workDisplay";
import { updateWorkForAdmin, type ArtistWorkDoc } from "@/lib/firebase/firestore";
import type { QuickLookAsset, QuickLookPendingAsset } from "@/types/work";

const APPROVAL_CHECKLIST = [
  {
    id: "direction",
    label: "작품 방향이 올바릅니다",
  },
  {
    id: "size",
    label: "실제 크기가 적절합니다",
  },
  {
    id: "front",
    label: "작품 앞면이 정상적으로 보입니다",
  },
  {
    id: "wall",
    label: "벽면 배치가 정상입니다",
  },
  {
    id: "light",
    label: "지나치게 어둡거나 밝지 않습니다",
  },
] as const;

function formatByteSize(value?: number) {
  if (!value || !Number.isFinite(value)) {
    return "—";
  }

  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${Math.round(value)} B`;
}

function formatDateTime(value?: string) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function getStatusMeta({
  readyAsset,
  pendingAsset,
}: {
  readyAsset: QuickLookAsset | null;
  pendingAsset: QuickLookPendingAsset | null;
}) {
  if (pendingAsset?.status === "failed") {
    return {
      label: "오류",
      tone: "red" as const,
      detail:
        pendingAsset.errorMessage || "전용 파일 업로드 또는 검수에 오류가 발생했습니다.",
    };
  }

  if (pendingAsset?.status === "uploaded") {
    return {
      label: "검수 필요",
      tone: "amber" as const,
      detail: "새 전용 USDZ가 업로드되었습니다. 공개 전 검수가 필요합니다.",
    };
  }

  if (readyAsset?.status === "ready") {
    return {
      label: "공개 사용 중",
      tone: "green" as const,
      detail: "전용 USDZ가 iPhone과 iPad Quick Look에서 사용됩니다.",
    };
  }

  return {
    label: "미등록",
    tone: "neutral" as const,
    detail:
      "전용 파일이 없습니다. 등록하지 않으면 기존 작품 모델을 기반으로 자동 생성됩니다.",
  };
}

function toPreviewImageSrc(work: ArtistWorkDoc) {
  return work.coverImageUrl?.trim() || "";
}

function getPreviewPlaceholder() {
  return (
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#1f1b18"/><stop offset="100%" stop-color="#3a2111"/></linearGradient></defs><rect width="960" height="720" fill="url(#g)"/><circle cx="160" cy="160" r="120" fill="#f37021" fill-opacity=".16"/><rect x="120" y="410" width="720" height="120" rx="28" fill="#ffffff" fill-opacity=".08"/><text x="120" y="470" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#f7f1e8">Quick Look Preview</text><text x="120" y="520" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#d8cbbf">iPhone Safari 검수용 이미지</text></svg>',
    )
  );
}

function buildUploadWarning(file: File) {
  const warnings: string[] = [];

  if (file.size > RECOMMENDED_QUICK_LOOK_USDZ_BYTES) {
    warnings.push("30MB 이하를 권장합니다.");
  }

  if (file.name.split(".").length > 2) {
    warnings.push("파일명에 이중 확장자가 포함되어 있는지 다시 확인하세요.");
  }

  return warnings.join(" ");
}

function getChecklistState() {
  return Object.fromEntries(
    APPROVAL_CHECKLIST.map((item) => [item.id, false]),
  ) as Record<(typeof APPROVAL_CHECKLIST)[number]["id"], boolean>;
}

export function AdminQuickLookAssetPanel({
  work,
  adminUid,
}: {
  work: ArtistWorkDoc;
  adminUid?: string;
}) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [readyAsset, setReadyAsset] = useState<QuickLookAsset | null>(
    work.quickLookAsset?.status === "ready" ? work.quickLookAsset : null,
  );
  const [pendingAsset, setPendingAsset] = useState<QuickLookPendingAsset | null>(
    work.quickLookPendingAsset ?? null,
  );
  const [notes, setNotes] = useState(work.quickLookAsset?.notes ?? "");
  const [checklist, setChecklist] = useState<Record<string, boolean>>(
    getChecklistState(),
  );
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [actionState, setActionState] = useState<
    "idle" | "uploading" | "saving" | "approving" | "releasing" | "deleting"
  >("idle");
  const [lastSelectedFileName, setLastSelectedFileName] = useState("");

  useEffect(() => {
    setReadyAsset(work.quickLookAsset?.status === "ready" ? work.quickLookAsset : null);
    setPendingAsset(work.quickLookPendingAsset ?? null);
    setNotes(work.quickLookAsset?.notes ?? "");
    setChecklist(getChecklistState());
    setMessage("");
    setErrorMessage("");
    setWarningMessage("");
    setActionState("idle");
    setLastSelectedFileName("");
  }, [work.id, work.quickLookAsset, work.quickLookPendingAsset]);

  const statusMeta = useMemo(
    () => getStatusMeta({ readyAsset, pendingAsset }),
    [pendingAsset, readyAsset],
  );

  const readyUrl = readyAsset?.usdzUrl?.trim() || "";
  const pendingUrl = pendingAsset?.usdzUrl?.trim() || "";
  const currentSourceGlbUrl = getReadyArV2GlbUrl(work);
  const currentSourceVersion = work.arV2Asset?.generatorVersion?.trim() || "";
  const previewImageSrc = toPreviewImageSrc(work) || getPreviewPlaceholder();
  const checklistComplete = APPROVAL_CHECKLIST.every((item) => checklist[item.id]);
  const displayNotes =
    readyAsset?.notes?.trim() ||
    (pendingAsset?.status === "uploaded" ? notes.trim() : "") ||
    "—";

  async function copyToClipboard(value: string, label: string) {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label}을 복사했습니다.`);
      setErrorMessage("");
    } catch {
      setErrorMessage("URL 복사에 실패했습니다. 브라우저 권한을 확인해주세요.");
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(file: File) {
    setActionState("uploading");
    setErrorMessage("");
    setMessage("");
    setWarningMessage(buildUploadWarning(file));

    const previousPendingUrl = pendingUrl;
    let uploadedUrl = "";

    try {
      const result = await uploadQuickLookUsdzFileToR2({
        file,
        artistSlug: work.artistSlug,
        workSlug: work.slug,
        workId: work.id,
      });

      uploadedUrl = result.publicUrl;

      const nextPendingAsset: QuickLookPendingAsset = {
        status: "uploaded",
        usdzUrl: result.publicUrl,
        objectKey: result.key,
        fileName: file.name,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: adminUid || undefined,
      };

      setActionState("saving");
      await updateWorkForAdmin(work.id, {
        quickLookPendingAsset: nextPendingAsset,
      });

      setPendingAsset(nextPendingAsset);
      setMessage(
        "전용 USDZ가 업로드되었습니다. iPhone 또는 iPad Safari에서 검수할 수 있습니다.",
      );

      if (previousPendingUrl && previousPendingUrl !== uploadedUrl) {
        void deleteR2ObjectsByPublicUrls([previousPendingUrl]).catch(() => undefined);
      }
    } catch (error) {
      if (uploadedUrl) {
        void deleteR2ObjectsByPublicUrls([uploadedUrl]).catch(() => undefined);
      }

      setErrorMessage(
        error instanceof Error ? error.message : "USDZ 파일을 업로드하지 못했습니다.",
      );
    } finally {
      setActionState("idle");
    }
  }

  async function handleApprove() {
    if (!pendingAsset?.usdzUrl || !pendingAsset.objectKey || !pendingAsset.fileName) {
      setErrorMessage("먼저 업로드된 USDZ 파일이 필요합니다.");
      return;
    }

    if (!adminUid) {
      setErrorMessage("관리자 정보를 확인할 수 없습니다.");
      return;
    }

    if (!checklistComplete) {
      setErrorMessage("승인 전 체크리스트를 모두 확인해 주세요.");
      return;
    }

    const nextReadyAsset: QuickLookAsset = {
      status: "ready",
      usdzUrl: pendingAsset.usdzUrl,
      objectKey: pendingAsset.objectKey,
      fileName: pendingAsset.fileName,
      sizeBytes: pendingAsset.sizeBytes,
      contentType: "model/vnd.usdz+zip",
      uploadedAt: pendingAsset.uploadedAt,
      uploadedBy: pendingAsset.uploadedBy,
      approvedAt: new Date().toISOString(),
      approvedBy: adminUid,
      sourceArV2AssetUrl: currentSourceGlbUrl || undefined,
      sourceArV2GeneratorVersion: currentSourceVersion || undefined,
      notes: notes.trim() || undefined,
    };

    setActionState("approving");
    setErrorMessage("");
    setMessage("");
    setWarningMessage("");

    try {
      await updateWorkForAdmin(work.id, {
        quickLookAsset: nextReadyAsset,
        quickLookPendingAsset: null,
      });

      setReadyAsset(nextReadyAsset);
      setPendingAsset(null);
      setMessage("전용 USDZ가 공개 사용 중으로 전환되었습니다.");
      setChecklist(getChecklistState());
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Quick Look 파일을 공개 상태로 전환하지 못했습니다.",
      );
    } finally {
      setActionState("idle");
    }
  }

  async function handleRelease() {
    if (!readyAsset?.usdzUrl) {
      setMessage("공개 사용 중인 전용 파일이 없습니다.");
      return;
    }

    setActionState("releasing");
    setErrorMessage("");
    setMessage("");
    setWarningMessage("");

    try {
      await updateWorkForAdmin(work.id, {
        quickLookAsset: null,
      });

      setReadyAsset(null);
      setMessage("전용 USDZ 공개 사용이 해제되었습니다.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Quick Look 파일 공개 해제에 실패했습니다.",
      );
    } finally {
      setActionState("idle");
    }
  }

  async function handleDeletePending() {
    if (!pendingAsset) {
      setMessage("삭제할 검수용 파일이 없습니다.");
      return;
    }

    const pendingUrlToDelete = pendingAsset.usdzUrl?.trim() || "";

    setActionState("deleting");
    setErrorMessage("");
    setMessage("");
    setWarningMessage("");

    try {
      await updateWorkForAdmin(work.id, {
        quickLookPendingAsset: null,
      });

      setPendingAsset(null);
      setMessage("검수용 Quick Look 파일을 삭제했습니다.");

      if (pendingUrlToDelete) {
        try {
          await deleteR2ObjectsByPublicUrls([pendingUrlToDelete]);
        } catch {
          setWarningMessage(
            "R2 cleanup failed. The Firestore record was removed, but the old file may remain in storage.",
          );
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Quick Look 파일을 삭제하지 못했습니다.",
      );
    } finally {
      setActionState("idle");
    }
  }

  async function handleDeleteReady() {
    if (!readyAsset) {
      setMessage("삭제할 공개 파일이 없습니다.");
      return;
    }

    const readyUrlToDelete = readyAsset.usdzUrl?.trim() || "";

    setActionState("deleting");
    setErrorMessage("");
    setMessage("");
    setWarningMessage("");

    try {
      await updateWorkForAdmin(work.id, {
        quickLookAsset: null,
      });

      setReadyAsset(null);
      setMessage("공개 Quick Look 파일을 삭제했습니다.");

      if (readyUrlToDelete) {
        try {
          await deleteR2ObjectsByPublicUrls([readyUrlToDelete]);
        } catch {
          setWarningMessage(
            "R2 cleanup failed. The Firestore record was removed, but the old file may remain in storage.",
          );
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Quick Look 파일을 삭제하지 못했습니다.",
      );
    } finally {
      setActionState("idle");
    }
  }

  function handleSelectFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    void handleFileSelected(file);
    setLastSelectedFileName(file.name);
  }

  const displayWidth = work.widthCm ? `${work.widthCm} cm` : "—";
  const displayHeight = work.heightCm ? `${work.heightCm} cm` : "—";
  const displayDepth = work.depthCm ? `${work.depthCm} cm` : "—";

  return (
    <section className="rounded-[1.6rem] border border-black/8 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
            iPhone Quick Look
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-600">
            iPhone과 iPad에서 사용할 전용 USDZ 파일을 관리합니다. 등록하지 않으면 기존 작품 모델을 기반으로 자동 생성됩니다.
          </p>
        </div>

        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.22em] ${
            statusMeta.tone === "green"
              ? "border-emerald-300/40 bg-emerald-500/20 text-white"
              : statusMeta.tone === "amber"
                ? "border-amber-400/25 bg-amber-400/10 text-amber-900"
                : statusMeta.tone === "red"
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-black/10 bg-white text-neutral-700"
          }`}
        >
          {statusMeta.label}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <InfoRow label="현재 상태" value={statusMeta.detail} wide />
        <InfoRow label="공개 사용 여부" value={readyUrl ? "사용 중" : "사용 안 함"} />
        <InfoRow label="파일명" value={readyAsset?.fileName || pendingAsset?.fileName || "—"} />
        <InfoRow label="파일 크기" value={formatByteSize(readyAsset?.sizeBytes || pendingAsset?.sizeBytes)} />
        <InfoRow
          label="실제 크기"
          value={`${displayWidth} × ${displayHeight} × ${displayDepth}`}
        />
        <InfoRow label="업로드 일시" value={formatDateTime(readyAsset?.uploadedAt || pendingAsset?.uploadedAt)} />
        <InfoRow label="승인 일시" value={formatDateTime(readyAsset?.approvedAt)} />
        <InfoRow label="USDZ URL" value={readyUrl || pendingUrl || "—"} link={readyUrl || pendingUrl || undefined} wide />
        <InfoRow label="원본 AR v2 GLB URL" value={readyAsset?.sourceArV2AssetUrl || currentSourceGlbUrl || "—"} link={readyAsset?.sourceArV2AssetUrl || currentSourceGlbUrl || undefined} wide />
        <InfoRow label="원본 AR v2 Generator" value={readyAsset?.sourceArV2GeneratorVersion || currentSourceVersion || "—"} />
        <InfoRow label="메모" value={displayNotes} wide />
      </div>

      <div className="mt-5 rounded-[1.4rem] border border-black/8 bg-[#fcfbf8] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
              업로드 가이드
            </p>
            <p className="mt-2 text-sm leading-7 text-neutral-600">
              USDZ 파일은 최대 {Math.round(MAX_QUICK_LOOK_USDZ_BYTES / (1024 * 1024))}MB까지 업로드할 수 있습니다. {lastSelectedFileName ? `최근 선택한 파일: ${lastSelectedFileName}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openFilePicker}
              disabled={actionState !== "idle"}
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#F37021]/35 bg-[#F37021]/10 px-4 text-sm text-[#b85d18] transition hover:border-[#F37021]/55 hover:bg-[#F37021]/16 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingAsset ? "파일 교체" : "USDZ 업로드"}
            </button>

            {pendingUrl ? (
              <button
                type="button"
                onClick={() => void copyToClipboard(pendingUrl, "검수용 URL")}
                disabled={actionState !== "idle"}
                className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                URL 복사
              </button>
            ) : readyUrl ? (
              <button
                type="button"
                onClick={() => void copyToClipboard(readyUrl, "공개 URL")}
                disabled={actionState !== "idle"}
                className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                URL 복사
              </button>
            ) : null}
          </div>
        </div>

        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept=".usdz,model/vnd.usdz+zip,model/usd,application/octet-stream"
          onChange={handleSelectFileChange}
          className="hidden"
          disabled={actionState !== "idle"}
        />

        <p className="mt-3 text-[12px] leading-6 text-neutral-500">
          iPhone 또는 iPad Safari에서 검수하세요. 데스크톱에서는 다운로드 또는 새 탭으로 열릴 수 있습니다.
        </p>

        {warningMessage ? (
          <p className="mt-3 rounded-[1.15rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            {warningMessage}
          </p>
        ) : null}
      </div>

      {pendingAsset ? (
        <div className="mt-5 rounded-[1.4rem] border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.24em] text-amber-700">
                검수 중인 파일
              </p>
              <p className="mt-2 text-sm leading-7 text-amber-950">
                새 파일은 승인 전까지 공개 사용 파일을 바꾸지 않습니다.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full border border-amber-300 bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-amber-900">
              {pendingAsset.status === "failed" ? "오류" : "검수 필요"}
            </span>
          </div>

          {pendingUrl ? (
            <a
              rel="ar"
              href={pendingUrl}
              className="mt-4 block overflow-hidden rounded-[1.4rem] border border-amber-200 bg-white"
            >
              <img
                src={previewImageSrc}
                alt={`${work.title} Quick Look preview`}
                className="h-48 w-full object-cover"
              />
              <div className="border-t border-amber-100 px-4 py-3 text-sm text-amber-900">
                iPhone에서 Quick Look 열기
              </div>
            </a>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <InfoRow label="파일명" value={pendingAsset.fileName || "—"} />
            <InfoRow label="업로드 일시" value={formatDateTime(pendingAsset.uploadedAt)} />
            <InfoRow label="파일 크기" value={formatByteSize(pendingAsset.sizeBytes)} />
            <InfoRow label="오류 메시지" value={pendingAsset.errorMessage || "—"} wide />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block rounded-[1.15rem] border border-amber-200 bg-white px-4 py-4">
              <span className="text-[11px] uppercase tracking-[0.24em] text-amber-700">
                메모
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-neutral-900 outline-none transition focus:border-amber-300"
                placeholder="검수 메모를 남겨두면 승인 후에도 함께 보관됩니다."
                disabled={actionState !== "idle"}
              />
            </label>

            <div className="rounded-[1.15rem] border border-amber-200 bg-white px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-amber-700">
                승인 체크리스트
              </p>
              <div className="mt-3 space-y-2">
                {APPROVAL_CHECKLIST.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-3 rounded-[1rem] border border-amber-100 bg-amber-50 px-3 py-3 text-sm leading-6 text-neutral-800"
                  >
                    <input
                      type="checkbox"
                      checked={checklist[item.id]}
                      onChange={(event) =>
                        setChecklist((current) => ({
                          ...current,
                          [item.id]: event.target.checked,
                        }))
                      }
                      className="mt-1 h-4 w-4 rounded border-amber-300"
                      disabled={actionState !== "idle"}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleApprove()}
              disabled={actionState !== "idle" || !checklistComplete || !pendingUrl}
              className="inline-flex h-11 items-center justify-center rounded-full border border-emerald-300/45 bg-emerald-500/20 px-4 text-sm text-white transition hover:bg-emerald-500/28 disabled:cursor-not-allowed disabled:opacity-60"
            >
              공개 사용 승인
            </button>

            <button
              type="button"
              onClick={() => void handleDeletePending()}
              disabled={actionState !== "idle"}
              className="inline-flex h-11 items-center justify-center rounded-full border border-amber-300 bg-white px-4 text-sm text-amber-900 transition hover:border-amber-400 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              삭제
            </button>
          </div>
        </div>
      ) : null}

      {readyAsset ? (
        <div className="mt-5 rounded-[1.4rem] border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-700">
                공개 사용 중인 파일
              </p>
              <p className="mt-2 text-sm leading-7 text-emerald-950">
                현재 iPhone과 iPad Quick Look에서 공개 사용되는 전용 파일입니다.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-emerald-800">
              공개 사용 중
            </span>
          </div>

          {readyUrl ? (
            <a
              href={readyUrl}
              rel="ar"
              className="mt-4 block overflow-hidden rounded-[1.4rem] border border-emerald-200 bg-white"
            >
              <img
                src={previewImageSrc}
                alt={`${work.title} Quick Look preview`}
                className="h-48 w-full object-cover"
              />
              <div className="border-t border-emerald-100 px-4 py-3 text-sm text-emerald-900">
                iPhone에서 Quick Look 열기
              </div>
            </a>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <InfoRow label="승인 일시" value={formatDateTime(readyAsset.approvedAt)} />
            <InfoRow label="승인자" value={readyAsset.approvedBy || "—"} />
            <InfoRow label="파일명" value={readyAsset.fileName || "—"} />
            <InfoRow label="파일 크기" value={formatByteSize(readyAsset.sizeBytes)} />
            <InfoRow label="메모" value={readyAsset.notes || "—"} wide />
          </div>

          {readyAsset.hasAudio ? (
            <BadgeRow label="오디오 포함" />
          ) : null}

          {readyAsset.hasAnimation ? (
            <BadgeRow label="애니메이션 포함" />
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void copyToClipboard(readyUrl, "공개 URL")}
              disabled={actionState !== "idle" || !readyUrl}
              className="inline-flex h-11 items-center justify-center rounded-full border border-emerald-300 bg-white px-4 text-sm text-emerald-900 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              URL 복사
            </button>

            <button
              type="button"
              onClick={() => void handleRelease()}
              disabled={actionState !== "idle"}
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm text-neutral-900 transition hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              공개 사용 해제
            </button>

            <button
              type="button"
              onClick={() => void handleDeleteReady()}
              disabled={actionState !== "idle"}
              className="inline-flex h-11 items-center justify-center rounded-full border border-red-300 bg-white px-4 text-sm text-red-700 transition hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              삭제
            </button>
          </div>
        </div>
      ) : null}

      {!readyAsset && !pendingAsset ? (
        <div className="mt-5 rounded-[1.4rem] border border-dashed border-black/10 bg-[#fcfbf8] px-4 py-5 text-sm leading-7 text-neutral-600">
          전용 파일이 없으면 기존 작품 모델을 기반으로 Quick Look이 자동 생성됩니다.
        </div>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-[1.15rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
          {message}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 rounded-[1.15rem] border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}

function InfoRow({
  label,
  value,
  link,
  wide,
}: {
  label: string;
  value: string;
  link?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={
        wide
          ? "md:col-span-2 rounded-[1.15rem] border border-black/8 bg-white px-4 py-3"
          : "rounded-[1.15rem] border border-black/8 bg-white px-4 py-3"
      }
    >
      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
        {label}
      </p>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="mt-2 break-all text-sm leading-6 text-[#b85d18] underline-offset-2 hover:underline"
        >
          {value}
        </a>
      ) : (
        <p className="mt-2 break-all text-sm leading-6 text-neutral-600">
          {value}
        </p>
      )}
    </div>
  );
}

function BadgeRow({ label }: { label: string }) {
  return (
    <span className="mt-3 mr-2 inline-flex items-center rounded-full border border-emerald-300 bg-white px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-emerald-800">
      {label}
    </span>
  );
}
