"use client";

import { useEffect, useRef } from "react";
import {
  drawArtworkSourceThumbnail,
  drawProductionBackLabel,
  formatDimensions,
  formatRatioPercent,
  getArtworkImageRatio,
  type ArtworkOrientation,
  type ArtworkProductionMetadata,
  type PhysicalDimensions,
} from "@/lib/ar-v2";

type SourceProps = {
  image?: HTMLImageElement;
  dimensions: PhysicalDimensions;
  orientation: ArtworkOrientation;
};

export function ArtworkSourcePreview({ image, dimensions, orientation }: SourceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ratio = getArtworkImageRatio(image, dimensions, orientation);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    canvas.width = 360;
    canvas.height = 240;
    const context = canvas.getContext("2d");
    if (context) drawArtworkSourceThumbnail(context, image, canvas.width, canvas.height, orientation);
  }, [image, orientation]);

  return (
    <section className="arv2-panel" aria-labelledby="source-preview-title">
      <div className="arv2-section-heading">
        <div>
          <p className="arv2-kicker">Input review only</p>
          <h2 id="source-preview-title">Artwork Source Preview</h2>
        </div>
        <span className={`arv2-status arv2-status-${ratio?.status ?? "—"}`}>{ratio?.status?.toUpperCase() ?? "IDLE"}</span>
      </div>
      {!image ? <p className="arv2-empty">Choose a local image to inspect its source ratio and orientation.</p> : (
        <div className="arv2-source-preview-grid">
          <div className="arv2-source-image-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.src} alt="Selected artwork source" />
          </div>
          <canvas ref={canvasRef} className="arv2-source-thumbnail" aria-label="Oriented artwork source thumbnail" />
          <div className="arv2-source-facts">
            <span>Natural pixels <strong>{image.naturalWidth} × {image.naturalHeight}</strong></span>
            <span>Image aspect <strong>{ratio?.imageAspect.toFixed(3) ?? "—"}</strong></span>
            <span>Physical aspect <strong>{ratio?.physicalAspect.toFixed(3) ?? "—"}</strong></span>
            <span>Difference <strong>{formatRatioPercent(ratio)}</strong></span>
            <span>Orientation <strong>{orientation.rotationDeg}° / X {orientation.flipX ? "ON" : "OFF"} / Y {orientation.flipY ? "ON" : "OFF"}</strong></span>
            <span>Fit <strong>contain / no crop / no stretch</strong></span>
          </div>
        </div>
      )}
    </section>
  );
}

type BackProps = {
  metadata: ArtworkProductionMetadata;
  dimensions: PhysicalDimensions;
};

export function BackLabelSourcePreview({ metadata, dimensions }: BackProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 360;
    canvas.height = 360;
    const context = canvas.getContext("2d");
    if (context) drawProductionBackLabel(context, { x: 0, y: 0, width: canvas.width, height: canvas.height, padding: 0 }, metadata, dimensions);
  }, [dimensions, metadata]);

  return (
    <section className="arv2-panel" aria-labelledby="back-label-preview-title">
      <div className="arv2-section-heading">
        <div>
          <p className="arv2-kicker">Input review only</p>
          <h2 id="back-label-preview-title">Back Label Source Preview</h2>
        </div>
        <span className="arv2-value-chip">FIXED</span>
      </div>
      <canvas ref={canvasRef} className="arv2-back-label-preview" aria-label="Production back label preview" />
      <p className="arv2-helper-text">This preview uses the same label layout as the production atlas. Orientation is never applied to the back label.</p>
      <p className="arv2-helper-text">Dimensions: {formatDimensions(dimensions)}</p>
    </section>
  );
}
