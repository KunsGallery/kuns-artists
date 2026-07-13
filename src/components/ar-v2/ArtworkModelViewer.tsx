"use client";

import { useEffect, useRef } from "react";

type Props = {
  objectUrl: string | null;
  arDisabled: boolean;
  onEvent: (type: string, message: string) => void;
};

export function ArtworkModelViewer({ objectUrl, arDisabled, onEvent }: Props) {
  const viewerRef = useRef<HTMLModelViewerElement | null>(null);

  useEffect(() => {
    let active = true;
    void import("@google/model-viewer").then(() => {
      if (active) onEvent("component", "model-viewer is ready");
    }).catch((error: unknown) => {
      if (active) onEvent("error", error instanceof Error ? error.message : "Could not load model-viewer.");
    });
    return () => { active = false; };
  }, [onEvent]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const listeners: Array<[string, EventListener]> = [
      ["load", () => {
        onEvent("load", "GLB loaded");
        if (viewer.canActivateAR === false) onEvent("ar-support", "AR unsupported on this browser or device");
      }],
      ["error", () => onEvent("error", "Model viewer error")],
      ["ar-status", (event) => {
        const status = String((event as CustomEvent).detail?.status ?? "status changed");
        const message = status === "failed"
          ? "AR session failed"
          : status === "session-started"
            ? "AR session started"
            : status === "not-presenting"
              ? "AR opened"
              : `AR ${status}`;
        onEvent("ar-status", message);
      }],
      ["progress", (event) => {
        const detail = (event as CustomEvent).detail as { totalProgress?: number } | undefined;
        const progress = typeof detail?.totalProgress === "number" ? Math.round(detail.totalProgress * 100) : null;
        onEvent("progress", progress === null ? "GLB loading" : `GLB loading ${progress}%`);
      }],
      ["camera-change", () => onEvent("camera-change", "Camera changed")],
    ];
    listeners.forEach(([name, listener]) => viewer.addEventListener(name, listener));
    return () => listeners.forEach(([name, listener]) => viewer.removeEventListener(name, listener));
  }, [objectUrl, onEvent]);

  const setOrbit = (orbit: string) => {
    if (viewerRef.current) viewerRef.current.cameraOrbit = orbit;
  };

  return (
    <div className="arv2-viewer-shell">
      <div className="arv2-viewer-stage">
        {objectUrl ? (
          <model-viewer
            ref={viewerRef}
            src={objectUrl}
            alt="Actual GLB Preview of the AR v2 artwork model"
            camera-controls
            ar={!arDisabled}
            ar-modes="webxr scene-viewer quick-look"
            ar-placement="wall"
            ar-scale="fixed"
            shadow-intensity="1"
            exposure="1"
            interaction-prompt="none"
            loading="eager"
          >
            <button slot="ar-button" type="button" className="arv2-ar-button" disabled={arDisabled}>View in AR</button>
          </model-viewer>
        ) : (
          <div className="arv2-viewer-placeholder">
            <span className="arv2-placeholder-mark">+</span>
            <p>Build the preview model to inspect the canonical GLB.</p>
          </div>
        )}
      </div>
      <div className="arv2-viewer-toolbar" aria-label="Viewer controls">
        <button type="button" className="arv2-button arv2-button-quiet" disabled={!objectUrl} onClick={() => setOrbit("0deg 75deg auto")}>Reset Camera</button>
        <button type="button" className="arv2-button arv2-button-quiet" disabled={!objectUrl} onClick={() => setOrbit("0deg 90deg auto")}>Front</button>
        <button type="button" className="arv2-button arv2-button-quiet" disabled={!objectUrl} onClick={() => setOrbit("45deg 75deg auto")}>Angle</button>
        <button type="button" className="arv2-button arv2-button-quiet" disabled={!objectUrl} onClick={() => setOrbit("180deg 75deg auto")}>Back</button>
      </div>
    </div>
  );
}
