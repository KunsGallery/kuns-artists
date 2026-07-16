"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ModelViewerDefinitionStatus,
  ModelViewerLoadStatus,
} from "@/lib/ar-v2";

type Props = {
  objectUrl: string | null;
  arDisabled: boolean;
  onEvent?: (type: string, message: string) => void;
  onLoadStatusChange?: (status: ModelViewerLoadStatus, message?: string) => void;
  showArButton?: boolean;
  arButtonLabel?: string;
  showToolbar?: boolean;
  stageClassName?: string;
  viewerClassName?: string;
};

function getModelViewerErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "3D viewer could not be loaded.";
}

function getEventErrorMessage(event: Event) {
  const detail = (event as CustomEvent).detail as
    | { message?: string; status?: string; error?: unknown }
    | undefined;

  if (detail?.message?.trim()) {
    return detail.message;
  }

  if (detail?.status?.trim()) {
    return `Model viewer ${detail.status}`;
  }

  if (detail?.error instanceof Error && detail.error.message.trim()) {
    return detail.error.message;
  }

  return "3D preview failed.";
}

export function ArtworkModelViewer({
  objectUrl,
  arDisabled,
  onEvent = () => undefined,
  onLoadStatusChange,
  showArButton = true,
  arButtonLabel = "내 공간에 놓아보기",
  showToolbar = true,
  stageClassName,
  viewerClassName,
}: Props) {
  const viewerRef = useRef<HTMLModelViewerElement | null>(null);
  const listenerCleanupRef = useRef<(() => void) | null>(null);
  const [definitionStatus, setDefinitionStatus] =
    useState<ModelViewerDefinitionStatus>("loading");

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        await import("@google/model-viewer");
        await customElements.whenDefined("model-viewer");
        if (!active) return;
        setDefinitionStatus("ready");
        onEvent("component", "3D viewer is ready");
      } catch (error) {
        if (!active) return;
        setDefinitionStatus("error");
        onEvent("error", getModelViewerErrorMessage(error));
      }
    })();

    return () => {
      active = false;
    };
  }, [onEvent]);

  useEffect(() => {
    if (definitionStatus !== "ready") {
      if (definitionStatus === "loading") {
        onLoadStatusChange?.("preparing", "Preparing 3D viewer…");
      } else {
        onLoadStatusChange?.("error", "The 3D viewer could not be loaded.");
      }
      return;
    }

    if (!objectUrl) {
      onLoadStatusChange?.("idle", "No preview model.");
      return;
    }

    onLoadStatusChange?.("loading", "3D preview is loading.");
  }, [definitionStatus, objectUrl, onLoadStatusChange]);

  const setViewerNode = useCallback(
    (node: HTMLModelViewerElement | null) => {
      listenerCleanupRef.current?.();
      listenerCleanupRef.current = null;
      viewerRef.current = node;

      if (!node) {
        return;
      }

      let readyMarked = false;

      const markReady = () => {
        if (readyMarked) return;
        readyMarked = true;

        onEvent("load", "3D preview loaded successfully.");
        onLoadStatusChange?.("ready", "3D preview loaded successfully.");
        if (node.canActivateAR === false) {
          onEvent("ar-support", "AR unsupported on this browser or device");
        }
      };

      const handleLoad = () => {
        markReady();
      };

      const handleError = (event: Event) => {
        const message = getEventErrorMessage(event);
        onEvent("error", message);
        onLoadStatusChange?.("error", message);
      };

      const handleProgress = (event: Event) => {
        if (readyMarked) return;

        const detail = (event as CustomEvent).detail as
          | { totalProgress?: number }
          | undefined;
        const progress =
          typeof detail?.totalProgress === "number"
            ? Math.round(detail.totalProgress * 100)
            : null;

        onEvent(
          "progress",
          progress === null ? "3D loading" : `3D loading ${progress}%`,
        );
        onLoadStatusChange?.(
          "loading",
          progress === null
            ? "3D preview is loading."
            : `3D preview is loading (${progress}%).`,
        );
      };

      const handleArStatus = (event: Event) => {
        const status = String(
          (event as CustomEvent).detail?.status ?? "status changed",
        );
        const message =
          status === "failed"
            ? "AR session failed"
            : status === "session-started"
              ? "AR session started"
              : status === "not-presenting"
                ? "AR opened"
                : `AR ${status}`;
        onEvent("ar-status", message);
      };

      const handleCameraChange = () => {
        onEvent("camera-change", "Camera changed");
      };

      node.addEventListener("load", handleLoad);
      node.addEventListener("error", handleError);
      node.addEventListener("progress", handleProgress);
      node.addEventListener("ar-status", handleArStatus);
      node.addEventListener("camera-change", handleCameraChange);

      if (node.loaded === true) {
        markReady();
      }

      listenerCleanupRef.current = () => {
        node.removeEventListener("load", handleLoad);
        node.removeEventListener("error", handleError);
        node.removeEventListener("progress", handleProgress);
        node.removeEventListener("ar-status", handleArStatus);
        node.removeEventListener("camera-change", handleCameraChange);
      };
    },
    [onEvent, onLoadStatusChange],
  );

  useEffect(() => () => {
    listenerCleanupRef.current?.();
    listenerCleanupRef.current = null;
  }, []);

  const setOrbit = (orbit: string) => {
    if (viewerRef.current) viewerRef.current.cameraOrbit = orbit;
  };

  return (
    <div className="arv2-viewer-shell">
      <div className={`arv2-viewer-stage ${stageClassName ?? ""}`.trim()}>
        {!objectUrl ? (
          <div className="arv2-viewer-placeholder">
            <span className="arv2-placeholder-mark">+</span>
            <p>3D 모델이 준비되는 중입니다.</p>
          </div>
        ) : definitionStatus === "loading" ? (
          <div className="arv2-viewer-placeholder">
            <span className="arv2-placeholder-mark">…</span>
            <p>3D 뷰어를 준비하는 중입니다.</p>
          </div>
        ) : definitionStatus === "error" ? (
          <div className="arv2-viewer-placeholder">
            <span className="arv2-placeholder-mark">!</span>
            <p>3D 모델을 불러오지 못했습니다.</p>
          </div>
        ) : (
          <model-viewer
            key={objectUrl}
            ref={setViewerNode}
            src={objectUrl}
            alt="3D preview of the artwork"
            camera-controls
            ar={!arDisabled}
            ar-modes="webxr scene-viewer quick-look"
            ar-placement="wall"
            ar-scale="auto"
            shadow-intensity="1"
            exposure="1"
            interaction-prompt="none"
            loading="eager"
            className={viewerClassName}
          >
            {showArButton && !arDisabled ? (
              <button
                slot="ar-button"
                type="button"
                className="arv2-ar-button"
              >
                {arButtonLabel}
              </button>
            ) : null}
          </model-viewer>
        )}
      </div>
      {showToolbar ? (
        <div className="arv2-viewer-toolbar" aria-label="Viewer controls">
          <button
            type="button"
            className="arv2-button arv2-button-quiet"
            disabled={!objectUrl}
            onClick={() => setOrbit("0deg 75deg auto")}
          >
            Reset Camera
          </button>
          <button
            type="button"
            className="arv2-button arv2-button-quiet"
            disabled={!objectUrl}
            onClick={() => setOrbit("0deg 90deg auto")}
          >
            Front
          </button>
          <button
            type="button"
            className="arv2-button arv2-button-quiet"
            disabled={!objectUrl}
            onClick={() => setOrbit("45deg 75deg auto")}
          >
            Angle
          </button>
          <button
            type="button"
            className="arv2-button arv2-button-quiet"
            disabled={!objectUrl}
            onClick={() => setOrbit("180deg 75deg auto")}
          >
            Back
          </button>
        </div>
      ) : null}
    </div>
  );
}
