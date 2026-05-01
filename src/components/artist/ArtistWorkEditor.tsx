"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProtectedArtist } from "@/hooks/useProtectedArtist";
import ArtistWorkGlbForm from "./ArtistWorkGlbForm";
import {
  createWorkForArtist,
  getWorkById,
  updateWorkForArtist,
  type ArtistDoc,
  type ArtistWorkDoc,
  type ArtistWorkSavePayload,
} from "@/lib/firebase/firestore";
import type { WorkFormValues } from "@/types/work";

type ArtistWorkEditorProps = {
  mode: "new" | "edit";
  workId?: string;
};

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function buildInitialValues(
  artist: ArtistDoc,
  work?: ArtistWorkDoc | null
): Partial<WorkFormValues> {
  return {
    title: work?.title ?? "",
    artistName: artist.name ?? work?.artistName ?? "",
    year: work?.year ?? "",
    medium: work?.medium ?? "",
    dimensions: work?.dimensions ?? "",
    description: work?.description ?? "",
    coverImageUrl: work?.coverImageUrl ?? "",
    widthCm: work?.widthCm?.toString() ?? "",
    heightCm: work?.heightCm?.toString() ?? "",
    depthCm: work?.depthCm?.toString() ?? "",
    frontRotationXDeg: work?.frontRotationXDeg?.toString(),
    frontRotationYDeg: work?.frontRotationYDeg?.toString(),
    sideMode: work?.sideMode,
    showBackLabel: work?.showBackLabel,
  };
}

function buildSavePayload(values: WorkFormValues): ArtistWorkSavePayload {
  const widthCm = values.widthCm.trim() ? Number(values.widthCm) : undefined;
  const heightCm = values.heightCm.trim() ? Number(values.heightCm) : undefined;
  const depthCm = values.depthCm.trim() ? Number(values.depthCm) : undefined;
  const frontRotationXDeg = values.frontRotationXDeg.trim()
    ? Number(values.frontRotationXDeg)
    : undefined;
  const frontRotationYDeg = values.frontRotationYDeg.trim()
    ? Number(values.frontRotationYDeg)
    : undefined;

  return {
    title: values.title.trim(),
    year: normalizeOptionalText(values.year),
    medium: normalizeOptionalText(values.medium),
    dimensions: normalizeOptionalText(values.dimensions),
    description: normalizeOptionalText(values.description),
    coverImageUrl: normalizeOptionalText(values.coverImageUrl),
    widthCm,
    heightCm,
    depthCm,
    frontRotationXDeg,
    frontRotationYDeg,
    sideMode: values.sideMode,
    showBackLabel: values.showBackLabel,
  };
}

export default function ArtistWorkEditor({
  mode,
  workId,
}: ArtistWorkEditorProps) {
  const router = useRouter();
  const [work, setWork] = useState<ArtistWorkDoc | null>(null);
  const [initialValues, setInitialValues] = useState<Partial<WorkFormValues>>();
  const [editorErrorMessage, setEditorErrorMessage] = useState("");
  const { artist, uid, isLoading, errorMessage } = useProtectedArtist({
    fallbackErrorMessage: "작품 정보를 불러오는 중 오류가 발생했습니다.",
  });

  useEffect(() => {
    let isActive = true;

    void (async () => {
      if (!artist || !uid) {
        await Promise.resolve();

        if (isActive) {
          setWork(null);
          setInitialValues(undefined);
          setEditorErrorMessage("");
        }

        return;
      }

      try {
        setEditorErrorMessage("");

        if (mode === "edit") {
          if (!workId) {
            setWork(null);
            setInitialValues(undefined);
            setEditorErrorMessage("작품 ID가 없습니다.");
            return;
          }

          const workDoc = await getWorkById(workId);

          if (!isActive) {
            return;
          }

          if (!workDoc) {
            setWork(null);
            setInitialValues(undefined);
            setEditorErrorMessage("해당 작품을 찾을 수 없습니다.");
            return;
          }

          if ((workDoc.artistId ?? "") !== uid) {
            setWork(null);
            setInitialValues(undefined);
            setEditorErrorMessage("본인 작품만 수정할 수 있습니다.");
            return;
          }

          setWork(workDoc);
          setInitialValues(buildInitialValues(artist, workDoc));
          return;
        }

        setWork(null);
        setInitialValues(buildInitialValues(artist));
      } catch (error) {
        if (!isActive) {
          return;
        }

        setWork(null);
        setInitialValues(undefined);
        setEditorErrorMessage(
          error instanceof Error
            ? error.message
            : "작품 정보를 불러오는 중 오류가 발생했습니다."
        );
      }
    })();

    return () => {
      isActive = false;
    };
  }, [artist, mode, uid, workId]);

  async function handleSave(values: WorkFormValues) {
    if (!uid) {
      throw new Error("로그인 정보가 없습니다.");
    }

    if (!artist) {
      throw new Error("작가 프로필 정보가 없습니다.");
    }

    const title = values.title.trim();

    if (!title) {
      throw new Error("작품명은 필수입니다.");
    }

    const payload = buildSavePayload(values);

    if (mode === "new") {
      const newWorkId = await createWorkForArtist(uid, artist, payload);
      router.push(`/artist/works/${newWorkId}/edit`);
      return "작품이 저장되었습니다.";
    }

    if (!workId) {
      throw new Error("작품 ID가 없습니다.");
    }

    if ((work?.artistId ?? "") !== uid) {
      throw new Error("본인 작품만 수정할 수 있습니다.");
    }

    await updateWorkForArtist(workId, uid, artist, payload);
    setWork((current) =>
      current
        ? {
            ...current,
            ...payload,
          }
        : current
    );

    return "작품 정보가 저장되었습니다.";
  }

  if (isLoading) {
    return (
      <section className="rounded-[2rem] border border-black/8 bg-white px-6 py-8 text-sm leading-7 text-neutral-600">
        작품 정보를 불러오는 중입니다.
      </section>
    );
  }

  if (errorMessage || editorErrorMessage) {
    return (
      <section className="rounded-[2rem] border border-red-200 bg-white px-6 py-8 text-sm leading-7 text-red-600">
        {errorMessage || editorErrorMessage}
      </section>
    );
  }

  return (
    <ArtistWorkGlbForm
      mode={mode}
      workId={workId}
      initialValues={initialValues}
      onSave={handleSave}
      saveButtonLabel={mode === "new" ? "작품 저장" : "작품 수정 저장"}
    />
  );
}
