import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import type { Scene } from "three";
import type { ArtworkGlbBuildResult, ArV2Diagnostic } from "./types";

export async function exportArtworkGlb(scene: Scene, diagnostics: ArV2Diagnostic[] = []): Promise<ArtworkGlbBuildResult> {
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(scene, {
    binary: true,
    trs: true,
    onlyVisible: true,
    maxTextureSize: 2048,
  });
  if (!(result instanceof ArrayBuffer)) throw new Error("GLB export did not return a binary ArrayBuffer.");
  const blob = new Blob([result], { type: "model/gltf-binary" });
  const objectUrl = URL.createObjectURL(blob);
  return {
    blob,
    objectUrl,
    byteSize: blob.size,
    diagnostics,
  };
}

export function revokeArtworkObjectUrl(objectUrl: string | null | undefined) {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
}
