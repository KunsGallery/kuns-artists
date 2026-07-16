"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  RingGeometry,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { PublicArWork } from "@/lib/publicArWork";

type PublicArWebXrSessionProps = {
  work: PublicArWork;
  glbUrl: string;
  backHref: string;
};

type HitPose = {
  position: Vector3;
  normal: Vector3;
  matrix: Matrix4;
  wallLike: boolean;
};

type SceneParts = {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  placementRoot: Group;
  adjustmentRoot: Group;
  modelRoot: Group;
  reticleRoot: Group;
  reticleMesh: Mesh;
  reticleMaterial: MeshBasicMaterial;
};

const DEFAULT_SCALE_PERCENT = 100;
const MIN_SCALE_PERCENT = 50;
const MAX_SCALE_PERCENT = 150;
const SNAP_MIN = 95;
const SNAP_MAX = 105;
const DEFAULT_HEIGHT_CM = 0;
const HEIGHT_MIN_CM = -100;
const HEIGHT_MAX_CM = 100;
const WALL_NORMAL_THRESHOLD = 0.4;
const WALL_GAP_METERS = 0.003;

function formatPhysicalSize(work: PublicArWork) {
  const width = work.widthCm ? `${work.widthCm} cm` : "—";
  const height = work.heightCm ? `${work.heightCm} cm` : "—";
  const depth = work.depthCm ? `${work.depthCm} cm` : "—";

  return `${width} × ${height} × ${depth}`;
}

function makeArtworkRoot(source: Object3D) {
  const root = source.clone(true);
  const bounds = new Box3().setFromObject(root);
  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());

  root.position.sub(center);
  root.updateMatrixWorld(true);

  return {
    root,
    size,
  };
}

function createSceneParts({
  width,
  height,
  modelRoot,
}: {
  width: number;
  height: number;
  modelRoot: Group;
}): SceneParts {
  const renderer = new WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: false,
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(new Color("#000000"), 0);
  renderer.xr.enabled = true;

  const scene = new Scene();
  scene.background = null;

  const camera = new PerspectiveCamera(60, width / height, 0.01, 50);
  camera.position.set(0, 1.6, 0);

  const ambient = new AmbientLight(0xffffff, 1.25);
  const key = new DirectionalLight(0xffffff, 1.4);
  key.position.set(1.5, 2.5, 1.8);
  scene.add(ambient, key);

  const placementRoot = new Group();
  const adjustmentRoot = new Group();
  const reticleRoot = new Group();

  const reticleMesh = new Mesh(
    new RingGeometry(0.055, 0.08, 40),
    new MeshBasicMaterial({
      color: "#f37021",
      transparent: true,
      opacity: 0.88,
      depthTest: false,
      depthWrite: false,
      side: 2,
    }),
  );
  const reticleMaterial = reticleMesh.material as MeshBasicMaterial;
  reticleMesh.rotation.x = Math.PI / 2;
  reticleRoot.add(reticleMesh);
  reticleRoot.visible = false;

  adjustmentRoot.add(modelRoot);
  placementRoot.add(adjustmentRoot);
  scene.add(placementRoot);
  scene.add(reticleRoot);

  return {
    renderer,
    scene,
    camera,
    placementRoot,
    adjustmentRoot,
    modelRoot,
    reticleRoot,
    reticleMesh,
    reticleMaterial,
  };
}

function disposeObject(root: Object3D) {
  root.traverse((node) => {
    const mesh = node as Mesh;
    if ("geometry" in mesh && mesh.geometry) {
      mesh.geometry.dispose();
    }

    const material = (node as Mesh).material;
    if (material) {
      if (Array.isArray(material)) {
        material.forEach((item) => item.dispose());
      } else {
        material.dispose();
      }
    }
  });
}

function createPlacementBasis(normal: Vector3) {
  const forward = normal.clone().normalize();
  const up = new Vector3(0, 1, 0);
  const right = new Vector3().crossVectors(up, forward).normalize();

  if (right.lengthSq() === 0) {
    right.set(1, 0, 0);
  }

  const correctedUp = new Vector3().crossVectors(forward, right).normalize();

  return new Matrix4().makeBasis(right, correctedUp, forward);
}

function getScalePercent(value: number) {
  const snapped = value >= SNAP_MIN && value <= SNAP_MAX ? DEFAULT_SCALE_PERCENT : value;
  return Math.max(MIN_SCALE_PERCENT, Math.min(MAX_SCALE_PERCENT, snapped));
}

function getHeightCm(value: number) {
  return Math.max(HEIGHT_MIN_CM, Math.min(HEIGHT_MAX_CM, value));
}

export function PublicArWebXrSession({
  work,
  glbUrl,
  backHref,
}: PublicArWebXrSessionProps) {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const overlayRootRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<XRSession | null>(null);
  const referenceSpaceRef = useRef<XRReferenceSpace | null>(null);
  const viewerSpaceRef = useRef<XRReferenceSpace | null>(null);
  const hitTestSourceRef = useRef<XRHitTestSource | null>(null);
  const partsRef = useRef<SceneParts | null>(null);
  const modelTemplateRef = useRef<Group | null>(null);
  const modelDepthMetersRef = useRef(Math.max((work.depthCm ?? 3.5) / 100, 0.01));
  const currentHitRef = useRef<HitPose | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const animationFrameStateRef = useRef({
    tracking: "searching" as "searching" | "tracking" | "lost",
    placed: false,
    scalePercent: DEFAULT_SCALE_PERCENT,
    heightCm: DEFAULT_HEIGHT_CM,
  });
  const [phase, setPhase] = useState<"entry" | "starting" | "active">("entry");
  const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "error">("loading");
  const [modelMessage, setModelMessage] = useState("정밀 배치용 3D 모델을 준비하는 중입니다.");
  const [sessionMessage, setSessionMessage] = useState("");
  const [trackingState, setTrackingState] = useState<"searching" | "tracking" | "lost">("searching");
  const [scalePercent, setScalePercent] = useState(DEFAULT_SCALE_PERCENT);
  const [heightCm, setHeightCm] = useState(DEFAULT_HEIGHT_CM);
  const [isPlaced, setIsPlaced] = useState(false);

  const actualSize = useMemo(() => formatPhysicalSize(work), [work]);
  const coverImage = work.coverImageUrl || work.coverImage || "";

  useEffect(() => {
    let cancelled = false;

    const loader = new GLTFLoader();

    void loader
      .loadAsync(glbUrl)
      .then((gltf) => {
        if (cancelled) {
          return;
        }

        const { root, size } = makeArtworkRoot(gltf.scene);
        const widthMeters = Number.isFinite(size.z) && size.z > 0 ? size.z : (work.depthCm ?? 3.5) / 100;

        modelTemplateRef.current = root as Group;
        modelDepthMetersRef.current = Math.max(widthMeters, 0.01);
        setModelStatus("ready");
        setModelMessage("정밀 배치용 3D 모델을 준비했습니다.");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setModelStatus("error");
        setModelMessage("정밀 배치용 3D 모델을 불러오지 못했습니다.");
      });

    return () => {
      cancelled = true;
    };
  }, [glbUrl, work.depthCm]);

  useEffect(() => {
    const overlay = overlayRootRef.current;
    if (!overlay) {
      return;
    }

    const handleBeforeXrSelect = (event: Event) => {
      event.preventDefault();
    };

    overlay.addEventListener("beforexrselect", handleBeforeXrSelect);

    return () => {
      overlay.removeEventListener("beforexrselect", handleBeforeXrSelect);
    };
  }, []);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const state = animationFrameStateRef.current;
    state.scalePercent = scalePercent;

    const parts = partsRef.current;
    if (!parts || phase !== "active") {
      return;
    }

    parts.adjustmentRoot.scale.setScalar(scalePercent / 100);
    if (currentHitRef.current) {
      const offset =
        (modelDepthMetersRef.current * (scalePercent / 100)) / 2 + WALL_GAP_METERS;
      parts.placementRoot.position
        .copy(currentHitRef.current.position)
        .addScaledVector(currentHitRef.current.normal, offset);
    }
  }, [phase, scalePercent]);

  useEffect(() => {
    const state = animationFrameStateRef.current;
    state.heightCm = heightCm;

    const parts = partsRef.current;
    if (!parts || phase !== "active") {
      return;
    }

    parts.adjustmentRoot.position.y = heightCm / 100;
  }, [heightCm, phase]);

  useEffect(() => {
    animationFrameStateRef.current.placed = isPlaced;

    const parts = partsRef.current;
    if (!parts || phase !== "active") {
      return;
    }

    parts.placementRoot.visible = isPlaced;
    parts.reticleRoot.visible = !isPlaced;
  }, [isPlaced, phase]);

  useEffect(() => {
    animationFrameStateRef.current.tracking = trackingState;
  }, [trackingState]);

  const updateTrackingState = (
    next: "searching" | "tracking" | "lost",
  ) => {
    if (animationFrameStateRef.current.tracking === next) {
      return;
    }

    animationFrameStateRef.current.tracking = next;
    setTrackingState(next);
  };

  const syncCurrentPlacement = (hitPose: HitPose) => {
    const parts = partsRef.current;
    if (!parts) {
      return;
    }

    const scale = animationFrameStateRef.current.scalePercent / 100;
    const appliedHeightCm = animationFrameStateRef.current.heightCm;
    const offset = (modelDepthMetersRef.current * scale) / 2 + WALL_GAP_METERS;

    parts.placementRoot.visible = true;
    parts.reticleRoot.visible = false;
    parts.placementRoot.position.copy(hitPose.position).addScaledVector(hitPose.normal, offset);
    parts.placementRoot.quaternion.setFromRotationMatrix(
      createPlacementBasis(hitPose.normal),
    );
    parts.adjustmentRoot.position.y = appliedHeightCm / 100;
    parts.adjustmentRoot.scale.setScalar(scale);
    currentHitRef.current = hitPose;
    animationFrameStateRef.current.placed = true;
    setIsPlaced(true);
    updateTrackingState("tracking");
  };

  const handleReticleUpdate = (hitPose: HitPose | null) => {
    const parts = partsRef.current;
    if (!parts) {
      return;
    }

    const placed = animationFrameStateRef.current.placed;

    if (!hitPose) {
      parts.reticleRoot.visible = false;
      if (!placed) {
        updateTrackingState("lost");
      }
      return;
    }

    parts.reticleRoot.visible = !placed;
    parts.reticleRoot.position.copy(hitPose.position).addScaledVector(hitPose.normal, 0.0025);
    parts.reticleRoot.quaternion.setFromRotationMatrix(createPlacementBasis(hitPose.normal));

    if (!placed) {
      updateTrackingState(hitPose.wallLike ? "tracking" : "searching");
    }
  };

  const handleResetPlacement = () => {
    animationFrameStateRef.current.placed = false;
    currentHitRef.current = null;
    updateTrackingState("searching");
    setIsPlaced(false);
    const parts = partsRef.current;
    if (parts) {
      parts.placementRoot.visible = false;
      parts.reticleRoot.visible = true;
    }
  };

  const handleResetAdjustments = () => {
    animationFrameStateRef.current.scalePercent = DEFAULT_SCALE_PERCENT;
    animationFrameStateRef.current.heightCm = DEFAULT_HEIGHT_CM;
    setScalePercent(DEFAULT_SCALE_PERCENT);
    setHeightCm(DEFAULT_HEIGHT_CM);
  };

  const handleFullReset = () => {
    animationFrameStateRef.current.scalePercent = DEFAULT_SCALE_PERCENT;
    animationFrameStateRef.current.heightCm = DEFAULT_HEIGHT_CM;
    animationFrameStateRef.current.placed = false;
    currentHitRef.current = null;
    updateTrackingState("searching");
    setScalePercent(DEFAULT_SCALE_PERCENT);
    setHeightCm(DEFAULT_HEIGHT_CM);
    setIsPlaced(false);
    const parts = partsRef.current;
    if (parts) {
      parts.placementRoot.visible = false;
      parts.reticleRoot.visible = true;
    }
  };

  const startSession = async () => {
    const overlay = overlayRootRef.current;
    const host = canvasHostRef.current;
    const modelRoot = modelTemplateRef.current;
    const xr = navigator.xr;

    if (!overlay || !host || !modelRoot || !xr || modelStatus !== "ready" || phase !== "entry") {
      return;
    }

    cleanupRef.current?.();
    cleanupRef.current = null;
    setSessionMessage("");
    setPhase("starting");

    try {
      const session = await xr.requestSession("immersive-ar", {
        requiredFeatures: ["hit-test", "dom-overlay"],
        optionalFeatures: ["light-estimation"],
        domOverlay: {
          root: overlay,
        },
      });

      const rendererParts = createSceneParts({
        width: host.clientWidth || window.innerWidth,
        height: host.clientHeight || window.innerHeight,
        modelRoot: modelRoot.clone(true) as Group,
      });

      partsRef.current = rendererParts;
      sessionRef.current = session;

      host.replaceChildren(rendererParts.renderer.domElement);
      rendererParts.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      rendererParts.renderer.setSize(host.clientWidth || window.innerWidth, host.clientHeight || window.innerHeight, false);
      rendererParts.renderer.setAnimationLoop((_, frame) => {
        if (!frame || !partsRef.current) {
          return;
        }

        const parts = partsRef.current;
        const referenceSpace = referenceSpaceRef.current;
        const hitSource = hitTestSourceRef.current;
        let latestHit: HitPose | null = null;

        if (referenceSpace && hitSource) {
          const hitResults = frame.getHitTestResults(hitSource);

          if (hitResults.length > 0) {
            const pose = hitResults[0].getPose(referenceSpace);

            if (pose) {
              const position = new Vector3().setFromMatrixPosition(
                new Matrix4().fromArray(pose.transform.matrix),
              );
              const hitMatrix = new Matrix4().fromArray(pose.transform.matrix);
              const normal = new Vector3();
              const unusedX = new Vector3();
              const unusedZ = new Vector3();
              hitMatrix.extractBasis(unusedX, normal, unusedZ);
              normal.normalize();
              const wallLike = Math.abs(normal.y) < WALL_NORMAL_THRESHOLD;

              latestHit = {
                position,
                normal,
                matrix: hitMatrix,
                wallLike,
              };

              const color = wallLike ? "#f37021" : "#f6c453";
              parts.reticleMaterial.color.set(color);
              parts.reticleMaterial.opacity = wallLike ? 0.88 : 0.72;
            }
          }
        }

        handleReticleUpdate(latestHit);

        if (latestHit && !animationFrameStateRef.current.placed && latestHit.wallLike) {
          currentHitRef.current = latestHit;
        }

        parts.renderer.render(parts.scene, parts.camera);
      });

      rendererParts.renderer.domElement.className = "h-full w-full";

      const resizeObserver = new ResizeObserver(() => {
        const currentParts = partsRef.current;
        if (!currentParts || !host) {
          return;
        }

        const width = host.clientWidth || window.innerWidth;
        const height = host.clientHeight || window.innerHeight;
        currentParts.renderer.setSize(width, height, false);
        currentParts.camera.aspect = width / height;
        currentParts.camera.updateProjectionMatrix();
      });
      resizeObserver.observe(host);

      const handleSelect = () => {
        const hit = currentHitRef.current;
        if (!hit || !hit.wallLike) {
          return;
        }

        syncCurrentPlacement(hit);
      };

      const handleSessionEnd = () => {
        resizeObserver.disconnect();
        hitTestSourceRef.current?.cancel?.();
        hitTestSourceRef.current = null;
        viewerSpaceRef.current = null;
        referenceSpaceRef.current = null;
        sessionRef.current = null;
        cleanupRef.current = null;
        rendererParts.renderer.setAnimationLoop(null);
        rendererParts.renderer.dispose();
        rendererParts.renderer.forceContextLoss();
        host.replaceChildren();
        disposeObject(rendererParts.scene);
        partsRef.current = null;
        currentHitRef.current = null;
        animationFrameStateRef.current.tracking = "searching";
        animationFrameStateRef.current.placed = false;
        setTrackingState("searching");
        setIsPlaced(false);
        setPhase("entry");
      };

      session.addEventListener("select", handleSelect);
      session.addEventListener("end", handleSessionEnd);

      const localSpace = await session.requestReferenceSpace("local");
      referenceSpaceRef.current = localSpace;
      rendererParts.renderer.xr.setReferenceSpace(localSpace);

      const viewerSpace = await session.requestReferenceSpace("viewer");
      viewerSpaceRef.current = viewerSpace;
      if (!session.requestHitTestSource) {
        throw new Error("Hit test source is unavailable.");
      }

      const hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
      if (!hitTestSource) {
        throw new Error("Hit test source unavailable.");
      }

      hitTestSourceRef.current = hitTestSource;

      rendererParts.renderer.xr.setSession(session);

      cleanupRef.current = () => {
        session.removeEventListener("select", handleSelect);
        session.removeEventListener("end", handleSessionEnd);
        void session.end();
      };

      setPhase("active");
      animationFrameStateRef.current.placed = false;
      animationFrameStateRef.current.tracking = "searching";
      setIsPlaced(false);
      setTrackingState("searching");
      partsRef.current = rendererParts;
      rendererParts.placementRoot.visible = false;
      rendererParts.reticleRoot.visible = true;
      rendererParts.adjustmentRoot.position.y = heightCm / 100;
      rendererParts.adjustmentRoot.scale.setScalar(scalePercent / 100);
    } catch (error) {
      setSessionMessage(
        error instanceof Error && error.message.trim()
          ? error.message
          : "WebXR 세션을 시작하지 못했습니다.",
      );
      setPhase("entry");
      cleanupRef.current?.();
      cleanupRef.current = null;
    }
  };

  useEffect(() => {
    if (phase !== "active") {
      document.body.classList.remove("webxr-session-active");
      return;
    }

    document.body.classList.add("webxr-session-active");

    return () => {
      document.body.classList.remove("webxr-session-active");
    };
  }, [phase]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#111111] text-[#F7F1E8]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(243,112,33,0.18),transparent_30%),radial-gradient(circle_at_84%_12%,rgba(255,255,255,0.04),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_20%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/5" />

      <div
        ref={overlayRootRef}
        className={`fixed inset-0 z-30 flex flex-col transition-opacity duration-300 ${
          phase === "active" ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {phase === "active" ? (
          <div className="flex min-h-0 flex-1 flex-col justify-between p-4 md:p-6">
            <header className="pointer-events-none flex items-start justify-between gap-4">
              <div className="rounded-full border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-md">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/42">
                  KÜN’S GALLERY
                </p>
                <p className="mt-1 text-sm text-white/82">{work.title}</p>
              </div>
              <Link
                href={backHref}
                className="pointer-events-auto inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-black/25 px-4 text-sm text-white/80 backdrop-blur-md transition hover:border-[#F37021]/35 hover:bg-[#F37021]/10"
              >
                기본 AR로 돌아가기
              </Link>
            </header>

            <div className="pointer-events-none flex justify-center px-4">
              <div className="max-w-2xl rounded-[1.5rem] border border-white/10 bg-black/35 px-4 py-3 text-center text-sm text-white/74 backdrop-blur-md">
                {trackingState === "lost"
                  ? "추적이 잠시 끊겼습니다. 벽면을 다시 화면 중앙에 비춰 주세요."
                  : trackingState === "searching"
                    ? "벽면을 찾는 중입니다. 화면을 천천히 움직여 보세요."
                    : isPlaced
                      ? "작품이 배치되었습니다. 필요하면 조정 패널로 크기와 높이를 바꿔 주세요."
                      : "벽면을 향해 화면을 탭하면 작품을 배치합니다."}
              </div>
            </div>

            <div className="pointer-events-auto mx-auto w-full max-w-5xl rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,17,17,0.88),rgba(17,17,17,0.95))] p-4 shadow-[0_22px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl md:p-5">
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.34em] text-white/40">
                    WebXR Beta
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    카메라와 WebXR 권한이 필요합니다. 임베드 환경에서는 `xr-spatial-tracking`
                    권한 정책이 허용되어야 합니다.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-[#F7F1E8] transition hover:border-[#F37021]/35 hover:bg-[#F37021]/10"
                    onClick={handleResetPlacement}
                  >
                    배치 다시 잡기
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-[#F7F1E8] transition hover:border-[#F37021]/35 hover:bg-[#F37021]/10"
                    onClick={handleResetAdjustments}
                  >
                    조정 초기화
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#F37021]/35 bg-[#F37021]/10 px-4 text-sm text-[#F7F1E8] transition hover:border-[#F37021]/55 hover:bg-[#F37021]/18"
                    onClick={handleFullReset}
                  >
                    전체 초기화
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-[#F7F1E8] transition hover:border-[#F37021]/35 hover:bg-[#F37021]/10"
                    onClick={() => {
                      void sessionRef.current?.end();
                    }}
                  >
                    세션 종료
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <label className="grid gap-2 rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] uppercase tracking-[0.28em] text-white/40">
                      Scale
                    </span>
                    <span className="text-sm text-white/76">{scalePercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={MIN_SCALE_PERCENT}
                    max={MAX_SCALE_PERCENT}
                    step={1}
                    value={scalePercent}
                    onChange={(event) => {
                      const next = getScalePercent(Number(event.currentTarget.value));
                      animationFrameStateRef.current.scalePercent = next;
                      setScalePercent(next);
                    }}
                    className="w-full accent-[#F37021]"
                  />
                </label>

                <label className="grid gap-2 rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] uppercase tracking-[0.28em] text-white/40">
                      Height
                    </span>
                    <span className="text-sm text-white/76">{heightCm} cm</span>
                  </div>
                  <input
                    type="range"
                    min={HEIGHT_MIN_CM}
                    max={HEIGHT_MAX_CM}
                    step={1}
                    value={heightCm}
                    onChange={(event) => {
                      const next = getHeightCm(Number(event.currentTarget.value));
                      animationFrameStateRef.current.heightCm = next;
                      setHeightCm(next);
                    }}
                    className="w-full accent-[#F37021]"
                  />
                </label>
              </div>

              {sessionMessage ? (
                <p className="mt-4 rounded-[1.2rem] border border-[#F37021]/20 bg-[#F37021]/8 px-4 py-3 text-sm leading-6 text-[#FFCFB0]">
                  {sessionMessage}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {phase === "entry" || phase === "starting" ? (
        <div className="mx-auto flex min-h-screen max-w-6xl items-center px-5 py-6 md:px-8 md:py-8">
          <section className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="overflow-hidden rounded-[2.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018)),#161616] p-5 shadow-[0_28px_110px_rgba(0,0,0,0.32)] md:p-6">
              <p className="text-[11px] uppercase tracking-[0.34em] text-white/42">
                KÜN’S GALLERY
              </p>
              <div className="mt-3 inline-flex rounded-full border border-[#F37021]/25 bg-[#F37021]/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[#FFB37B]">
                Beta
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#F7F1E8] md:text-5xl">
                {work.title}
              </h1>
              <p className="mt-3 text-lg text-white/72">{work.artistName}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">
                    실제 크기
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/80">{actualSize}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">
                    WebXR 상태
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/80">지원됨</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">
                    3D 모델
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/80">
                    {modelStatus === "ready" ? "준비 완료" : modelStatus === "error" ? "불러오기 실패" : "준비 중"}
                  </p>
                </div>
              </div>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/66">
                실제 벽면에 맞춰 배치하는 WebXR 베타 화면입니다. 시작 후 화면을 탭해 배치하고,
                아래 슬라이더로 크기와 높이를 조정하세요.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[#F37021]/35 bg-[#F37021]/12 px-4 text-sm text-[#F7F1E8] transition hover:border-[#F37021]/55 hover:bg-[#F37021]/18 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => {
                    void startSession();
                  }}
                  disabled={modelStatus !== "ready" || phase !== "entry"}
                >
                  {phase === "starting" ? "세션을 여는 중…" : "정밀 배치 시작"}
                </button>
                <Link
                  href={backHref}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] px-4 text-sm text-[#F7F1E8] transition hover:border-[#F37021]/35 hover:bg-[#F37021]/10"
                >
                  기본 AR 페이지로 돌아가기
                </Link>
              </div>

              {sessionMessage ? (
                <p className="mt-4 rounded-[1.2rem] border border-[#F37021]/20 bg-[#F37021]/8 px-4 py-3 text-sm leading-6 text-[#FFCFB0]">
                  {sessionMessage}
                </p>
              ) : null}

              <p className="mt-4 text-[12px] leading-6 text-white/45">
                보안 컨텍스트(HTTPS 또는 localhost)가 필요하며, 일부 브라우저는 `xr-spatial-tracking`
                권한 정책이 허용되어야 동작합니다.
              </p>
            </div>

            <div className="overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#161616] shadow-[0_28px_110px_rgba(0,0,0,0.32)]">
              <div className="border-b border-white/10 px-5 py-4 md:px-6">
                <p className="text-[11px] uppercase tracking-[0.34em] text-white/42">
                  작품 미리보기
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#F7F1E8]">
                  벽면에 배치할 작품을 확인합니다.
                </h2>
              </div>

              <div className="p-4 md:p-6">
                <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#141414]">
                  {coverImage ? (
                    // The preview image may be an external work asset, so we keep a plain <img> here.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverImage}
                      alt={`${work.title} 작품 이미지`}
                      className="h-[clamp(300px,66vw,540px)] w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-[clamp(300px,66vw,540px)] w-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(243,112,33,0.18),transparent_35%),#111111] text-sm text-white/48">
                      작품 이미지가 준비되지 않았습니다.
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white/66">
                  {modelMessage}
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <div
        ref={canvasHostRef}
        className={`fixed inset-0 z-20 ${phase === "active" ? "block" : "hidden"}`}
      />
    </div>
  );
}
