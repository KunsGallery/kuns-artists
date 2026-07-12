import {
  FrontSide,
  Mesh,
  MeshStandardMaterial,
  Scene,
} from "three";
import { applyAtlasUvs, buildTextureAtlas } from "./buildTextureAtlas";
import { buildArtworkGeometry } from "./buildArtworkGeometry";
import type { ArtworkBuildConfig, ArtworkScene } from "./types";

export function buildArtworkScene(config: ArtworkBuildConfig): ArtworkScene {
  const width = config.widthCm / 100;
  const height = config.heightCm / 100;
  const depth = config.depthCm / 100;
  const geometry = buildArtworkGeometry(width, height, depth);
  const atlas = buildTextureAtlas(config);
  applyAtlasUvs(geometry);
  const material = new MeshStandardMaterial({
    map: atlas.texture,
    color: 0xffffff,
    metalness: 0,
    roughness: 0.9,
    transparent: false,
    opacity: 1,
    side: FrontSide,
  });
  const mesh = new Mesh(geometry, material);
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.set(1, 1, 1);
  const scene = new Scene();
  scene.add(mesh);
  scene.updateMatrixWorld(true);
  return {
    scene,
    mesh,
    atlas,
    dimensions: { widthCm: config.widthCm, heightCm: config.heightCm, depthCm: config.depthCm },
  };
}
