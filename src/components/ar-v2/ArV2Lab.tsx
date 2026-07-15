"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProtectedArtist } from "@/hooks/useProtectedArtist";
import {
  buildArtworkGlb,
  DEFAULT_FRONT_BRIGHTNESS,
  FRONT_BRIGHTNESS_PRESETS,
  formatRatioPercent,
  getArtworkImageRatio,
  LEGACY_FRONT_BRIGHTNESS,
  revokeArtworkObjectUrl,
  type ArV2BuildMode,
  type ArV2Diagnostic,
  type ArV2Event,
  type ArtworkOrientation,
  type ArtworkProductionMetadata,
  type ArtworkSourceMode,
  type PhysicalDimensions,
} from "@/lib/ar-v2";
import { ArV2Diagnostics } from "./ArV2Diagnostics";
import { ArV2EventLog } from "./ArV2EventLog";
import { ArV2TestChecklist } from "./ArV2TestChecklist";
import { ArtworkMetadataEditor } from "./ArtworkMetadataEditor";
import { ArtworkModelViewer } from "./ArtworkModelViewer";
import { ArtworkOrientationEditor } from "./ArtworkOrientationEditor";
import { ArtworkSourcePreview, BackLabelSourcePreview } from "./ArtworkSourcePreview";

const DEFAULT_ORIENTATION: ArtworkOrientation = { rotationDeg: 0, flipX: false, flipY: false };
const DEFAULT_DIMENSIONS = { widthCm: "100", heightCm: "100", depthCm: "3.5" };
const DEFAULT_METADATA: ArtworkProductionMetadata = {
  title: "Untitled Test",
  artistName: "Test Artist",
  year: "2026",
  medium: "Acrylic on canvas",
  inventoryNumber: "TEST-001",
};
const PRESETS = {
  Portrait: { widthCm: "60", heightCm: "90", depthCm: "3.5" },
  Landscape: { widthCm: "120", heightCm: "80", depthCm: "3.5" },
  Square: { widthCm: "100", heightCm: "100", depthCm: "3.5" },
} as const;

function parsePositive(value: string, label: string, minimum = 0) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= minimum) throw new Error(`${label} must be greater than ${minimum}.`);
  return number;
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getGlbFileName(buildMode: ArV2BuildMode, metadata?: ArtworkProductionMetadata) {
  if (buildMode !== "production") return "ar-v2-orientation-fixture.glb";
  const artist = slugify(metadata?.artistName ?? "");
  const title = slugify(metadata?.title ?? "");
  return artist && title ? `${artist}-${title}-ar-v2.glb` : "artwork-ar-v2.glb";
}

function toPhysicalDimensions(dimensions: { widthCm: string; heightCm: string; depthCm: string }): PhysicalDimensions {
  return { widthCm: Number(dimensions.widthCm), heightCm: Number(dimensions.heightCm), depthCm: Number(dimensions.depthCm) };
}

export function ArV2Lab() {
  const { errorMessage: accessErrorMessage, isLoading } = useProtectedArtist({
    requireAdmin: true,
    fallbackErrorMessage: "관리자 전용 도구입니다.",
  });
  const [buildMode, setBuildMode] = useState<ArV2BuildMode>("diagnostic");
  const [sourceMode, setSourceMode] = useState<ArtworkSourceMode>("fixture");
  const [dimensions, setDimensions] = useState(DEFAULT_DIMENSIONS);
  const [orientation, setOrientation] = useState(DEFAULT_ORIENTATION);
  const [metadata, setMetadata] = useState(DEFAULT_METADATA);
  const [sideColor, setSideColor] = useState("#111111");
  const [showBackLabel, setShowBackLabel] = useState(true);
  const [frontBrightness, setFrontBrightness] = useState(DEFAULT_FRONT_BRIGHTNESS);
  const [allowRatioMismatch, setAllowRatioMismatch] = useState(false);
  const [image, setImage] = useState<HTMLImageElement | undefined>();
  const [imageName, setImageName] = useState("");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [diagnostics, setDiagnostics] = useState<ArV2Diagnostic[]>([]);
  const [events, setEvents] = useState<ArV2Event[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [builtMode, setBuiltMode] = useState<ArV2BuildMode | null>(null);
  const [arStatus, setArStatus] = useState("idle");
  const previousObjectUrl = useRef<string | null>(null);
  const eventId = useRef(0);

  const addEvent = useCallback((type: string, message: string) => {
    setEvents((current) => [{ id: eventId.current++, timestamp: new Date().toISOString(), type, message }, ...current].slice(0, 80));
  }, []);

  const handleViewerEvent = useCallback((type: string, message: string) => {
    addEvent(type, message);
    if (type === "ar-status") setArStatus(message);
    if (type === "ar-support") setArStatus("AR unavailable");
  }, [addEvent]);

  useEffect(() => () => {
    revokeArtworkObjectUrl(previousObjectUrl.current);
  }, []);

  useEffect(() => () => {
    if (image?.src.startsWith("blob:")) URL.revokeObjectURL(image.src);
  }, [image]);

  const numericDimensions = useMemo(() => toPhysicalDimensions(dimensions), [dimensions]);
  const ratio = useMemo(() => getArtworkImageRatio(image, numericDimensions, orientation), [image, numericDimensions, orientation]);
  const productionMode = buildMode === "production";
  const productionSource = productionMode && sourceMode === "local-image";
  const metadataValid = Boolean(metadata.title.trim() && metadata.artistName.trim());
  const ratioBlocked = productionSource && ratio?.status === "fail" && !allowRatioMismatch;
  const hasBuiltProduction = builtMode === "production";
  const buildBlockReason = productionSource && !image
    ? "Choose an artwork image before building."
    : productionSource && !metadataValid
      ? "Artwork Title and Artist Name are required before building."
      : ratioBlocked
        ? "Image ratio differs by more than 5%. Confirm the intentional mismatch to enable build."
        : null;
  const canBuild = !isBuilding && !buildBlockReason;

  const changeBuildMode = (nextMode: ArV2BuildMode) => {
    setBuildMode(nextMode);
    setSourceMode(nextMode === "production" ? "local-image" : "fixture");
    setFrontBrightness(nextMode === "production" ? DEFAULT_FRONT_BRIGHTNESS : LEGACY_FRONT_BRIGHTNESS);
    setErrorMessage(null);
  };

  const handleImageChange = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setErrorMessage("Image file must be JPG, PNG, or WEBP.");
      return;
    }
    const url = URL.createObjectURL(file);
    const nextImage = new Image();
    nextImage.onload = () => {
      setImage((previous) => {
        if (previous?.src.startsWith("blob:")) URL.revokeObjectURL(previous.src);
        return nextImage;
      });
      setImageName(file.name);
      setBuildMode("production");
      setSourceMode("local-image");
      setErrorMessage(null);
      addEvent("image", `Local image loaded: ${file.name}`);
    };
    nextImage.onerror = () => {
      URL.revokeObjectURL(url);
      setErrorMessage("Could not read the selected image file.");
      addEvent("error", "Image file could not be read");
    };
    nextImage.src = url;
  };

  const handleBuild = async () => {
    setIsBuilding(true);
    setErrorMessage(null);
    addEvent("build", "Building canonical GLB model");
    try {
      const widthCm = parsePositive(dimensions.widthCm, "Width cm");
      const heightCm = parsePositive(dimensions.heightCm, "Height cm");
      const depthCm = parsePositive(dimensions.depthCm, "Depth cm", 0.999);
      if (sourceMode === "local-image" && !image) throw new Error("Select a local image or switch back to Diagnostic Fixture.");
      if (productionSource && !metadataValid) throw new Error("Production Artwork requires Artwork Title and Artist Name.");
      if (ratioBlocked) throw new Error("Image ratio differs by more than 5%. Confirm the intentional mismatch before building.");
      const result = await buildArtworkGlb({
        widthCm,
        heightCm,
        depthCm,
        buildMode,
        sourceMode,
        orientation,
        image,
        sideColor,
        showBackLabel,
        frontBrightness: buildMode === "production" ? frontBrightness : LEGACY_FRONT_BRIGHTNESS,
        metadata: productionMode ? metadata : undefined,
        allowRatioMismatch,
      });
      revokeArtworkObjectUrl(previousObjectUrl.current);
      previousObjectUrl.current = result.objectUrl;
      setObjectUrl(result.objectUrl);
      setDownloadBlob(result.blob);
      setDiagnostics(result.diagnostics);
      setBuiltMode(buildMode);
      setArStatus("idle");
      addEvent("build", `GLB ready (${Math.round(result.byteSize / 1024)} KB)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not build the AR v2 model.";
      setErrorMessage(message);
      addEvent("error", message);
      setDiagnostics([{ severity: "FAIL", code: "build", label: "Build failed", detail: message }]);
    } finally {
      setIsBuilding(false);
    }
  };

  const hasFailure = diagnostics.some((item) => item.severity === "FAIL");
  const handleDownload = () => {
    if (!downloadBlob || hasFailure) return;
    const url = URL.createObjectURL(downloadBlob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = getGlbFileName(builtMode ?? buildMode, productionMode ? metadata : undefined);
    anchor.click();
    URL.revokeObjectURL(url);
    addEvent("download", `GLB download started: ${anchor.download}`);
  };

  const applyPreset = (preset: keyof typeof PRESETS) => {
    setDimensions(PRESETS[preset]);
    addEvent("preset", `${preset} dimensions applied`);
  };

  const resetLab = () => {
    setBuildMode("diagnostic");
    setSourceMode("fixture");
    setDimensions(DEFAULT_DIMENSIONS);
    setOrientation(DEFAULT_ORIENTATION);
    setMetadata(DEFAULT_METADATA);
    setSideColor("#111111");
    setShowBackLabel(true);
    setFrontBrightness(DEFAULT_FRONT_BRIGHTNESS);
    setAllowRatioMismatch(false);
    setErrorMessage(null);
    setImageName("");
    setImage(undefined);
    setObjectUrl(null);
    setDownloadBlob(null);
    setDiagnostics([]);
    setBuiltMode(null);
    setArStatus("idle");
    revokeArtworkObjectUrl(previousObjectUrl.current);
    previousObjectUrl.current = null;
    addEvent("reset", "Lab reset");
  };

  if (isLoading) return <AccessState title="Checking administrator access" detail="The isolated lab is loading." />;
  if (accessErrorMessage) return <AccessState title="Admin-only technical lab" detail={accessErrorMessage} />;

  return (
    <main className="arv2-page">
      <div className="arv2-container">
        <header className="arv2-header">
          <div>
            <Link href="/" className="arv2-brand">KÜN’S GALLERY</Link>
            <div className="arv2-title-row"><h1>AR V2 LAB</h1><span className="arv2-badge">Experimental / Admin Only</span></div>
            <p className="arv2-description">Phase 2 production artwork validation. Desktop preview, AR, and download use one generated GLB Blob.</p>
          </div>
          <span className="arv2-coordinate-note">+Z FRONT<br />+Y TOP<br />+X RIGHT</span>
        </header>

        <div className="arv2-layout">
          <section className="arv2-preview-column">
            <div className="arv2-section-heading arv2-preview-heading"><div><p className="arv2-kicker">One Blob / One Viewer Source</p><h2>Actual GLB Preview</h2></div><span className="arv2-value-chip">{objectUrl ? "READY" : "IDLE"}</span></div>
            <ArtworkModelViewer objectUrl={objectUrl} arDisabled={!objectUrl || hasFailure} onEvent={handleViewerEvent} />
            <div className="arv2-preview-note"><span className="arv2-note-mark">i</span><p>This is the actual generated GLB preview. Download and Quick Look use the same Blob; no `ios-src` or manual USDZ is supplied.</p></div>
            {hasBuiltProduction && objectUrl ? <div className="arv2-ar-status"><strong>iPhone Quick Look reminder</strong><span>Desktop preview passed does not automatically confirm iPhone Quick Look. Test the same model using View in AR.</span><em>{arStatus}</em></div> : null}
            {productionMode && !objectUrl ? <div className="arv2-production-note">Production Artwork requires a local image, metadata, and ratio review before the canonical GLB can be generated.</div> : null}
          </section>

          <aside className="arv2-controls-column">
            <section className="arv2-panel">
              <p className="arv2-kicker">A / Build Mode</p>
              <div className="arv2-segmented"><button type="button" className={buildMode === "diagnostic" ? "is-active" : ""} onClick={() => changeBuildMode("diagnostic")}>Diagnostic Faces</button><button type="button" className={buildMode === "production" ? "is-active" : ""} onClick={() => changeBuildMode("production")}>Production Artwork</button></div>
              <p className="arv2-helper-text">{buildMode === "diagnostic" ? "Verify geometry, face order, UV direction, and physical scale." : "Build a real artwork model with image, side finish, and back label."}</p>
            </section>

            <section className="arv2-panel">
              <p className="arv2-kicker">B / Artwork Source</p>
              <div className="arv2-segmented"><button type="button" className={sourceMode === "fixture" ? "is-active" : ""} onClick={() => setSourceMode("fixture")}>Diagnostic Fixture</button><button type="button" className={sourceMode === "local-image" ? "is-active" : ""} onClick={() => setSourceMode("local-image")}>Local Image</button></div>
              <label className="arv2-file-input"><span>{imageName || "Choose JPG, PNG, or WEBP"}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleImageChange(event.target.files?.[0])} /></label>
              {ratio ? <p className={`arv2-inline-${ratio.status}`}>Ratio difference: {formatRatioPercent(ratio)} ({ratio.status === "pass" ? "PASS" : ratio.status === "warning" ? "WARNING" : "FAIL"}) after orientation.</p> : null}
            </section>

            <section className="arv2-panel"><p className="arv2-kicker">C / Physical Dimensions</p><div className="arv2-field-grid"><Field label="Width cm" value={dimensions.widthCm} onChange={(value) => setDimensions((current) => ({ ...current, widthCm: value }))} /><Field label="Height cm" value={dimensions.heightCm} onChange={(value) => setDimensions((current) => ({ ...current, heightCm: value }))} /><Field label="Depth cm" value={dimensions.depthCm} onChange={(value) => setDimensions((current) => ({ ...current, depthCm: value }))} /></div><div className="arv2-preset-row"><span>Presets</span>{(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((preset) => <button type="button" className="arv2-button arv2-button-quiet" key={preset} onClick={() => applyPreset(preset)}>{preset}</button>)}</div></section>

            {productionMode ? <ArtworkMetadataEditor metadata={metadata} onChange={setMetadata} /> : null}
            {productionMode && sourceMode === "local-image" ? <ArtworkSourcePreview image={image} dimensions={numericDimensions} orientation={orientation} frontBrightness={frontBrightness} /> : null}
            {productionMode ? <BackLabelSourcePreview metadata={metadata} dimensions={numericDimensions} showBackLabel={showBackLabel} /> : null}

            <ArtworkOrientationEditor orientation={orientation} onChange={setOrientation} />

            <section className="arv2-control-section">
              <div className="arv2-section-heading">
                <div>
                  <p className="arv2-kicker">F / Finish</p>
                  <h2>Finish</h2>
                </div>
              </div>
              <label className="arv2-color-field"><span>Side Color</span><input type="color" value={sideColor} onChange={(event) => setSideColor(event.target.value)} /></label>
              <label className="arv2-toggle"><input type="checkbox" checked={showBackLabel} onChange={(event) => setShowBackLabel(event.target.checked)} /><span>Back Label On</span></label>
              {productionMode ? (
                <div className="arv2-brightness-panel">
                  <div className="arv2-section-heading">
                    <div>
                      <p className="arv2-kicker">Front Brightness</p>
                      <h3>Artwork Front Tone</h3>
                    </div>
                    <span className="arv2-value-chip">{Math.round(frontBrightness * 100)}%</span>
                  </div>
                  <p className="arv2-helper-text">Front-only brightness is baked into the GLB texture so the viewer and native AR stay aligned.</p>
                  <div className="arv2-preset-row">
                    {FRONT_BRIGHTNESS_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        className={`arv2-button arv2-button-quiet${frontBrightness === preset.value ? " is-active" : ""}`}
                        onClick={() => setFrontBrightness(preset.value)}
                      >
                        {preset.label} · {preset.description}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="arv2-helper-text">Diagnostic fixture keeps the front brightness at 100%.</p>
              )}
              {productionSource && ratio?.status === "fail" ? <label className="arv2-confirmation-toggle"><input type="checkbox" checked={allowRatioMismatch} onChange={(event) => setAllowRatioMismatch(event.target.checked)} /><span>I confirmed that the image ratio and physical dimensions intentionally differ.</span></label> : null}
            </section>

            <section className="arv2-build-card"><p className="arv2-kicker">G / Generate</p><button type="button" className="arv2-build-button" onClick={() => void handleBuild()} disabled={!canBuild}>{isBuilding ? "Building…" : "Build Preview Model"}</button><button type="button" className="arv2-download-button" onClick={handleDownload} disabled={!downloadBlob || hasFailure}>Download GLB</button><button type="button" className="arv2-text-button" onClick={resetLab}>Reset Lab</button>{buildBlockReason ? <p className="arv2-build-block-reason">{buildBlockReason}</p> : null}</section>

            {errorMessage ? <div className="arv2-error-card" role="alert"><strong>Build message</strong><p>{errorMessage}</p></div> : null}
            <ArV2Diagnostics diagnostics={diagnostics} />
            {productionMode ? <ArV2TestChecklist /> : null}
            <ArV2EventLog events={events} />
          </aside>
        </div>

        <section className="arv2-phase3-card" aria-labelledby="phase3-title"><p className="arv2-kicker">Next phase / read only</p><h2 id="phase3-title">Next Phase: Admin One-Click Builder</h2><p>When all three production test cases pass, this builder can be connected to <code>/admin/works</code> for one-click GLB generation and R2 upload.</p><div className="arv2-phase3-fields"><span>work image URL</span><span>work title</span><span>artist name</span><span>year</span><span>medium</span><span>widthCm / heightCm / depthCm</span><span>sideColor</span><span>orientation</span><span>back label enabled</span><span>generated GLB Blob</span><span>validation result</span></div></section>
      </div>
    </main>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="arv2-field"><span>{label}</span><input type="number" min="0.01" step="0.1" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function AccessState({ title, detail }: { title: string; detail: string }) {
  return <main className="arv2-page"><div className="arv2-access-state"><p className="arv2-kicker">KÜN’S GALLERY / AR V2 LAB</p><h1>{title}</h1><p>{detail}</p><Link href="/artist/login" className="arv2-build-button">Go to login</Link></div></main>;
}
