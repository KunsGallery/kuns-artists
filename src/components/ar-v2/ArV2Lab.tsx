"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProtectedArtist } from "@/hooks/useProtectedArtist";
import {
  buildArtworkScene,
  exportArtworkGlb,
  revokeArtworkObjectUrl,
  validateArtworkBlob,
  validateArtworkScene,
  type ArV2BuildMode,
  type ArV2Diagnostic,
  type ArV2Event,
  type ArtworkOrientation,
  type ArtworkScene,
  type ArtworkSourceMode,
} from "@/lib/ar-v2";
import { ArV2Diagnostics } from "./ArV2Diagnostics";
import { ArV2EventLog } from "./ArV2EventLog";
import { ArtworkModelViewer } from "./ArtworkModelViewer";
import { ArtworkOrientationEditor } from "./ArtworkOrientationEditor";

const DEFAULT_ORIENTATION: ArtworkOrientation = { rotationDeg: 0, flipX: false, flipY: false };
const DEFAULT_DIMENSIONS = { widthCm: "100", heightCm: "100", depthCm: "3.5" };

function parsePositive(value: string, label: string, minimum = 0) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= minimum) throw new Error(`${label} must be greater than ${minimum}.`);
  return number;
}

function disposeArtworkScene(artwork: ArtworkScene | null) {
  if (!artwork) return;
  artwork.mesh.geometry.dispose();
  const material = artwork.mesh.material;
  if (!Array.isArray(material)) {
    material.dispose();
  }
  artwork.atlas.texture.dispose();
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
  const [sideColor, setSideColor] = useState("#111111");
  const [showBackLabel, setShowBackLabel] = useState(true);
  const [image, setImage] = useState<HTMLImageElement | undefined>();
  const [imageName, setImageName] = useState("");
  const [imageRatioWarning, setImageRatioWarning] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [diagnostics, setDiagnostics] = useState<ArV2Diagnostic[]>([]);
  const [events, setEvents] = useState<ArV2Event[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const currentArtwork = useRef<ArtworkScene | null>(null);
  const previousObjectUrl = useRef<string | null>(null);
  const eventId = useRef(0);

  const addEvent = useCallback((type: string, message: string) => {
    setEvents((current) => [
      { id: eventId.current++, timestamp: new Date().toISOString(), type, message },
      ...current,
    ].slice(0, 80));
  }, []);

  useEffect(() => () => {
    revokeArtworkObjectUrl(previousObjectUrl.current);
    disposeArtworkScene(currentArtwork.current);
    if (image?.src.startsWith("blob:")) URL.revokeObjectURL(image.src);
  }, [image]);

  const imageRatioDetail = useMemo(() => {
    if (!image) return null;
    const physicalAspect = Number(dimensions.widthCm) / Number(dimensions.heightCm);
    if (!Number.isFinite(physicalAspect) || !image.naturalWidth || !image.naturalHeight) return null;
    const difference = Math.abs(image.naturalWidth / image.naturalHeight - physicalAspect) / physicalAspect;
    if (difference <= 0.02) return null;
    return difference > 0.05
      ? "Strong warning: image ratio differs from the physical dimensions by more than 5%."
      : "Image ratio differs from the physical dimensions by more than 2%.";
  }, [dimensions.heightCm, dimensions.widthCm, image]);

  useEffect(() => setImageRatioWarning(imageRatioDetail), [imageRatioDetail]);

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
      const artwork = buildArtworkScene({
        widthCm,
        heightCm,
        depthCm,
        buildMode,
        sourceMode,
        orientation,
        image,
        sideColor,
        showBackLabel,
      });
      const sceneValidation = validateArtworkScene(artwork);
      const exportResult = await exportArtworkGlb(artwork.scene, sceneValidation.diagnostics);
      const nextDiagnostics = [...sceneValidation.diagnostics, validateArtworkBlob(exportResult.blob)];
      if (imageRatioWarning && sourceMode === "local-image") {
        nextDiagnostics.push({ severity: imageRatioWarning.startsWith("Strong") ? "WARNING" : "WARNING", code: "image-ratio", label: "Image / physical ratio", detail: "Image ratio and physical dimensions do not match. The generated model may appear stretched." });
      }
      disposeArtworkScene(currentArtwork.current);
      currentArtwork.current = artwork;
      revokeArtworkObjectUrl(previousObjectUrl.current);
      previousObjectUrl.current = exportResult.objectUrl;
      setObjectUrl(exportResult.objectUrl);
      setDownloadBlob(exportResult.blob);
      setDiagnostics(nextDiagnostics);
      addEvent("build", `GLB ready (${Math.round(exportResult.byteSize / 1024)} KB)`);
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
    anchor.download = "ar-v2-orientation-fixture.glb";
    anchor.click();
    URL.revokeObjectURL(url);
    addEvent("download", "GLB download started");
  };

  const resetLab = () => {
    setBuildMode("diagnostic");
    setSourceMode("fixture");
    setDimensions(DEFAULT_DIMENSIONS);
    setOrientation(DEFAULT_ORIENTATION);
    setSideColor("#111111");
    setShowBackLabel(true);
    setErrorMessage(null);
    setImageName("");
    setImage(undefined);
    setObjectUrl(null);
    setDownloadBlob(null);
    setDiagnostics([]);
    disposeArtworkScene(currentArtwork.current);
    currentArtwork.current = null;
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
            <p className="arv2-description">Isolated technical test for a canonical GLB model and model-viewer AR delivery.</p>
          </div>
          <span className="arv2-coordinate-note">+Z FRONT<br />+Y TOP<br />+X RIGHT</span>
        </header>

        <div className="arv2-layout">
          <section className="arv2-preview-column">
            <div className="arv2-section-heading arv2-preview-heading"><div><p className="arv2-kicker">One Blob / One Viewer Source</p><h2>Actual GLB Preview</h2></div><span className="arv2-value-chip">{objectUrl ? "READY" : "IDLE"}</span></div>
            <ArtworkModelViewer objectUrl={objectUrl} arDisabled={!objectUrl || hasFailure} onEvent={addEvent} />
            <div className="arv2-preview-note"><span className="arv2-note-mark">i</span><p>This viewer uses the exact generated GLB Blob used for download. Quick Look USDZ is generated by model-viewer at runtime; no `ios-src` or manual USDZ is supplied.</p></div>
          </section>

          <aside className="arv2-controls-column">
            <section className="arv2-panel">
              <p className="arv2-kicker">A / Build Mode</p>
              <div className="arv2-segmented"><button type="button" className={buildMode === "diagnostic" ? "is-active" : ""} onClick={() => setBuildMode("diagnostic")}>Diagnostic Faces</button><button type="button" className={buildMode === "production" ? "is-active" : ""} onClick={() => setBuildMode("production")}>Production Finish</button></div>
            </section>

            <section className="arv2-panel">
              <p className="arv2-kicker">B / Artwork Source</p>
              <div className="arv2-segmented"><button type="button" className={sourceMode === "fixture" ? "is-active" : ""} onClick={() => setSourceMode("fixture")}>Diagnostic Fixture</button><button type="button" className={sourceMode === "local-image" ? "is-active" : ""} onClick={() => setSourceMode("local-image")}>Local Image</button></div>
              <label className="arv2-file-input"><span>{imageName || "Choose JPG, PNG, or WEBP"}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleImageChange(event.target.files?.[0])} /></label>
              {imageRatioWarning && sourceMode === "local-image" ? <p className="arv2-inline-warning">{imageRatioWarning}<br />Image ratio and physical dimensions do not match. The generated model may appear stretched.</p> : null}
            </section>

            <section className="arv2-panel"><p className="arv2-kicker">C / Physical Dimensions</p><div className="arv2-field-grid"><Field label="Width cm" value={dimensions.widthCm} onChange={(value) => setDimensions((current) => ({ ...current, widthCm: value }))} /><Field label="Height cm" value={dimensions.heightCm} onChange={(value) => setDimensions((current) => ({ ...current, heightCm: value }))} /><Field label="Depth cm" value={dimensions.depthCm} onChange={(value) => setDimensions((current) => ({ ...current, depthCm: value }))} /></div></section>

            <ArtworkOrientationEditor orientation={orientation} onChange={setOrientation} />

            <section className="arv2-control-section"><div className="arv2-section-heading"><div><p className="arv2-kicker">E / Finish</p><h2>Finish</h2></div></div><label className="arv2-color-field"><span>Side Color</span><input type="color" value={sideColor} onChange={(event) => setSideColor(event.target.value)} /></label><label className="arv2-toggle"><input type="checkbox" checked={showBackLabel} onChange={(event) => setShowBackLabel(event.target.checked)} /><span>Back Label On</span></label></section>

            <section className="arv2-build-card"><p className="arv2-kicker">F / Generate</p><button type="button" className="arv2-build-button" onClick={() => void handleBuild()} disabled={isBuilding}>{isBuilding ? "Building…" : "Build Preview Model"}</button><button type="button" className="arv2-download-button" onClick={handleDownload} disabled={!downloadBlob || hasFailure}>Download GLB</button><button type="button" className="arv2-text-button" onClick={resetLab}>Reset Lab</button></section>

            {errorMessage ? <div className="arv2-error-card" role="alert"><strong>Build message</strong><p>{errorMessage}</p></div> : null}
            <ArV2Diagnostics diagnostics={diagnostics} />
            <ArV2EventLog events={events} />
          </aside>
        </div>
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
