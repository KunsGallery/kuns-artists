"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ModelViewerDefinitionStatus,
  ModelViewerLoadStatus,
} from "@/lib/ar-v2";

type Props = {
  objectUrl: string | null;
  arDisabled: boolean;
  onEvent: (type: string, message: string) => void;
  onLoadStatusChange?: (status: ModelViewerLoadStatus, message?: string) => void;
};

function getModelViewerErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Could not load model-viewer.";
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

  return "Actual GLB preview failed.";
}

export function ArtworkModelViewer({
  objectUrl,
  arDisabled,
  onEvent,
  onLoadStatusChange,
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
        onEvent("component", "model-viewer is ready");
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

    onLoadStatusChange?.("loading", "Actual GLB preview is loading.");
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

        onEvent("load", "Actual GLB loaded successfully.");
        onLoadStatusChange?.("ready", "Actual GLB loaded successfully.");
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
          progress === null ? "GLB loading" : `GLB loading ${progress}%`,
        );
        onLoadStatusChange?.(
          "loading",
          progress === null
            ? "Actual GLB preview is loading."
            : `Actual GLB preview is loading (${progress}%).`,
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
      <div className="arv2-viewer-stage">
        {!objectUrl ? (
          <div className="arv2-viewer-placeholder">
            <span className="arv2-placeholder-mark">+</span>
            <p>Build the preview model to inspect the canonical GLB.</p>
          </div>
        ) : definitionStatus === "loading" ? (
          <div className="arv2-viewer-placeholder">
            <span className="arv2-placeholder-mark">…</span>
            <p>Preparing 3D viewer…</p>
          </div>
        ) : definitionStatus === "error" ? (
          <div className="arv2-viewer-placeholder">
            <span className="arv2-placeholder-mark">!</span>
            <p>The 3D viewer could not be loaded.</p>
          </div>
        ) : (
          <model-viewer
            key={objectUrl}
            ref={setViewerNode}
            src={objectUrl}
            alt="Actual GLB Preview of the AR v2 artwork model"
            camera-controls
            ar={!arDisabled}
            ar-modes="webxr scene-viewer quick-look"
            ar-placement="wall"
            ar-scale="auto"
            shadow-intensity="1"
            exposure="1"
            interaction-prompt="none"
            loading="eager"
          >
            <button
              slot="ar-button"
              type="button"
              className="arv2-ar-button"
              disabled={arDisabled}
            >
              View in AR
            </button>
          </model-viewer>
        )}
      </div>
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
    </div>
  );
}
