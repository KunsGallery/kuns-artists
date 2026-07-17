# KÜN’S Artists AR 구현 리뷰 핸드오프

> 목적: 외부 프로그래머가 현재 AR 생성/표시 구조를 빠르게 파악하고, iPhone Quick Look 문제의 원인과 개선 방향을 검토할 수 있도록 정리한 기술 인수인계 문서입니다.

## 0. 작성 범위와 전제

- 이 문서는 **현재 코드의 구조를 설명하고, 관련 코드를 발췌해 문서화**하는 데 목적이 있습니다.
- 이 문서를 작성하는 시점에는 **앱 코드 수정은 하지 않았습니다.**
- 문서에 적힌 일부 원인 분석은 현재까지 확인된 코드와 사용자 확인 증상을 바탕으로 한 **추정**입니다.
- 확정된 사실과 추정은 분리해서 작성했습니다.

## 1. 프로젝트 개요

### 프로젝트

- 프로젝트명: `KÜN’S Artists`
- 프레임워크: `Next.js App Router`
- 데이터 저장: `Firebase Firestore`
- 파일 업로드: `Cloudflare R2`
- 배포: `Netlify`
- AR 사용 위치: 공개 `/ar/{slug}` 페이지

### 주요 목적

- 작품 이미지를 기반으로 캔버스형 3D 오브젝트를 생성합니다.
- `GLB`는 웹과 Android preview 용도입니다.
- `USDZ`는 iPhone Quick Look AR 배치용입니다.
- 관리자는 `/admin/works`에서 작품별 AR 파일을 생성하고 저장합니다.
- 공개 사용자는 `/ar/{slug}`에서 `View in AR`로 작품을 감상합니다.

## 2. 현재 AR 전체 흐름

아래 순서가 현재 코드의 핵심 흐름입니다.

1. 관리자가 `/admin/works`에 접속합니다.
2. 작품을 선택합니다.
3. `AR Preview Builder` 또는 `AR Model Preview & Settings`에서 방향, 테두리, 두께, 뒷면 라벨 관련 설정을 조정합니다.
4. `Generate AR Files`를 클릭합니다.
5. `src/lib/ar/createCanvasGlb.ts`에서 `GLB`와 `USDZ`를 생성합니다.
6. `src/lib/r2/client.ts`의 업로드 helper를 통해 R2에 업로드합니다.
7. 업로드 결과의 `generatedGlbUrl` / `generatedUsdzUrl`이 `selectedForm`에 입력됩니다.
8. `Save Changes`를 눌러 Firestore `works` 문서에 저장합니다.
9. 공개 `/ar/{slug}`에서 해당 URL을 읽습니다.
10. iPhone이면 `USDZ`와 `rel="ar"` 기반 Quick Look을 사용합니다.
11. Android/Web이면 `GLB` 기반 preview 또는 fallback 흐름을 사용합니다.

### 흐름 다이어그램

```text
Admin Works
  → Generate AR Files
  → createCanvasArFiles()
  → GLB Blob / USDZ Blob
  → R2 Upload
  → generatedGlbUrl / generatedUsdzUrl
  → Firestore Save
  → /ar/{slug}
  → DeviceRedirect
  → iPhone Quick Look
```

## 3. 관련 파일 맵

| 파일 | 역할 | 왜 중요한가 |
|---|---|---|
| [`src/app/admin/works/page.tsx`](/Users/jaewookim/Desktop/kuns-artists/src/app/admin/works/page.tsx) | 관리자 작품 검수/수정 페이지, AR 생성 버튼, AR 설정 상태, 저장 흐름 | 실제 운영자가 AR 파일을 생성하고 연결하는 진입점입니다. |
| [`src/lib/ar/createCanvasGlb.ts`](/Users/jaewookim/Desktop/kuns-artists/src/lib/ar/createCanvasGlb.ts) | 작품 이미지 기반 GLB/USDZ 생성 핵심 | front/back/edge 구조, texture transform, USDZ export 제약이 이 파일에 집중되어 있습니다. |
| [`src/lib/r2/client.ts`](/Users/jaewookim/Desktop/kuns-artists/src/lib/r2/client.ts) | R2 업로드 client helper | 생성된 GLB/USDZ Blob을 실제 공개 URL로 바꾸는 단계입니다. |
| [`netlify/functions/r2-presign-upload.ts`](/Users/jaewookim/Desktop/kuns-artists/netlify/functions/r2-presign-upload.ts) | R2 presigned upload URL 생성 | target별 prefix, content type 제한, `usdz` 업로드 경로를 확인할 수 있습니다. |
| [`src/components/ar/DeviceRedirect.tsx`](/Users/jaewookim/Desktop/kuns-artists/src/components/ar/DeviceRedirect.tsx) | `/ar/{slug}` 기기 분기 | iPhone Quick Look, Android Scene Viewer, desktop QR fallback을 담당합니다. |
| [`src/components/public/PublicArWorkPage.tsx`](/Users/jaewookim/Desktop/kuns-artists/src/components/public/PublicArWorkPage.tsx) | 공개 AR viewing room UI | `DeviceRedirect`를 렌더하고 작품 정보 및 도슨트 오디오를 함께 노출합니다. |
| [`src/types/work.ts`](/Users/jaewookim/Desktop/kuns-artists/src/types/work.ts) | 작품 타입 정의 | AR 관련 필드가 실제 타입에 들어가 있는지 확인하는 기준입니다. |
| [`src/lib/firebase/firestore.ts`](/Users/jaewookim/Desktop/kuns-artists/src/lib/firebase/firestore.ts) | works 문서 read/write | 관리자 저장 payload와 Firestore 문서 스키마를 연결합니다. |

## 4. 현재 구조에서 확인된 것

### 4-1. 확인된 사실

- `GLB`와 `USDZ` 생성 흐름이 모두 코드에 존재합니다.
- `USDZ`는 별도 export 경로가 있고, 실패해도 `GLB`는 유지되도록 설계되어 있습니다.
- `R2` presign에는 `usdz` target이 존재합니다.
- 관리자 화면에는 AR 설정 UI와 `Generate AR Files` 흐름이 이미 있습니다.
- 공개 AR 페이지는 `DeviceRedirect`를 통해 기기별 분기합니다.
- Firestore와 타입에 AR 관련 필드가 반영되어 있습니다.

### 4-2. 추정

- iPhone Quick Look에서 보이는 방향 문제는 `texture` transform만으로 해결되지 않고, geometry 방향과 USDZ exporter 제약이 함께 작용할 가능성이 있습니다.
- 뒷면 라벨이 보이지 않는 문제는 `material.map` 연결뿐 아니라, mesh normal / rotation / export 호환성 문제가 같이 얽혀 있을 가능성이 있습니다.
- side/edge가 안쪽면처럼 보이는 현상은 edge mesh 위치, front/back 기준, Quick Look의 렌더링 방식 차이 중 하나 또는 복합 원인일 수 있습니다.

## 5. 코드 발췌

### 5-1. `src/app/admin/works/page.tsx`

#### 파일 경로

- [`src/app/admin/works/page.tsx`](/Users/jaewookim/Desktop/kuns-artists/src/app/admin/works/page.tsx)

#### 역할

- 관리자 작품 검수/수정 페이지입니다.
- AR 관련 설정을 `selectedForm` 상태로 관리합니다.
- `Generate AR Files` 버튼을 통해 GLB/USDZ를 생성하고 R2에 업로드합니다.
- `Save Changes`에서 Firestore 저장 payload에 AR 관련 필드를 포함합니다.

#### 왜 중요한가

- 실제 운영자가 AR 파일을 만들고 연결하는 진입점입니다.
- 생성 결과가 Firestore에 들어가야 공개 `/ar/{slug}`가 읽을 수 있습니다.

#### 발췌 1: AR 관련 form state와 기본값

```ts
type WorkFormValues = {
  isPublished: boolean;
  archived: boolean;
  coverImageUrl: string;
  modelGlb: string;
  modelUsdz: string;
  generatedGlbUrl: string;
  generatedUsdzUrl: string;
  displayOrder?: number;
  arTextureRotationDeg: number;
  arTextureFlipX: boolean;
  arTextureFlipY: boolean;
  arSideColor: string;
  arDepthCm: string;
  arBackLabelEnabled: boolean;
  frontRotationXDeg?: number;
  frontRotationYDeg?: number;
  sideMode?: "canvas" | "image";
  showBackLabel?: boolean;
  docentAudioEnabled?: boolean;
  docentAudioUrl?: string;
  docentAudioTitle?: string;
  docentAudioDescription?: string;
};

const EMPTY_FORM: WorkFormValues = {
  isPublished: false,
  archived: false,
  coverImageUrl: "",
  modelGlb: "",
  modelUsdz: "",
  generatedGlbUrl: "",
  generatedUsdzUrl: "",
  arTextureRotationDeg: 0,
  arTextureFlipX: false,
  arTextureFlipY: false,
  arSideColor: DEFAULT_AR_SIDE_COLOR,
  arDepthCm: String(DEFAULT_AR_DEPTH_CM),
  arBackLabelEnabled: true,
  docentAudioEnabled: false,
  docentAudioUrl: "",
  docentAudioTitle: "",
  docentAudioDescription: "",
};
```

#### 발췌 2: `Generate AR Files` 핸들러

```ts
async function handleGenerateArTestFile() {
  if (!selectedWork) {
    return;
  }

  const coverImageUrl =
    selectedForm.coverImageUrl?.trim() || selectedWork.coverImageUrl?.trim() || "";
  const widthCm = selectedWork.widthCm;
  const heightCm = selectedWork.heightCm;
  const artistSlugForUpload =
    selectedWork.artistSlug?.trim() || selectedWork.id?.trim() || "";
  const workSlugForUpload = selectedWorkSlug || selectedWork.id?.trim() || "";

  const { glbBlob, usdzBlob, usdzError } = await createCanvasArFiles(
    {
      imageUrl: coverImageUrl,
      title: selectedWork.title || "Artwork",
      widthCm,
      heightCm,
      depthCm: selectedWork.depthCm,
      artistName: selectedWork.artistName,
      year: selectedWork.year,
      medium: selectedWork.medium,
      dimensions: selectedWork.dimensions,
    },
    {
      useArModelSettings: true,
      textureRotationDeg: currentArTextureRotationDeg,
      textureFlipX: currentArTextureFlipX,
      textureFlipY: currentArTextureFlipY,
      sideColor: currentArSideColor,
      depthCm: currentArDepthCm,
      showBackLabel: currentArBackLabelEnabled,
    }
  );

  const glbUploadResult = await uploadGlbFileToR2({
    blob: glbBlob,
    filename: glbFilename,
    artistSlug: artistSlugForUpload,
    workSlug: workSlugForUpload,
  });

  let usdzUploadResult: Awaited<ReturnType<typeof uploadUsdzFileToR2>> | null = null;

  if (usdzBlob) {
    usdzUploadResult = await uploadUsdzFileToR2({
      blob: usdzBlob,
      filename: usdzFilename,
      artistSlug: artistSlugForUpload,
      workSlug: workSlugForUpload,
    });
  }

  setSelectedForm((current) => ({
    ...current,
    generatedGlbUrl: glbUploadResult.publicUrl,
    ...(usdzUploadResult?.publicUrl
      ? { generatedUsdzUrl: usdzUploadResult.publicUrl }
      : {}),
  }));
}
```

#### 발췌 3: 저장 payload에 AR 필드 반영

```ts
await updateWorkForAdmin(selectedWork.id, {
  isPublished: selectedForm.isPublished,
  archived: selectedForm.archived,
  coverImageUrl: selectedForm.coverImageUrl,
  modelGlb: selectedForm.modelGlb,
  modelUsdz: selectedForm.modelUsdz,
  generatedGlbUrl: selectedForm.generatedGlbUrl,
  generatedUsdzUrl: selectedForm.generatedUsdzUrl,
  arTextureRotationDeg: getArTextureRotationDeg(selectedForm, selectedWork),
  arTextureFlipX: Boolean(selectedForm.arTextureFlipX),
  arTextureFlipY: Boolean(selectedForm.arTextureFlipY),
  arSideColor: getArSideColor(selectedForm, selectedWork),
  arDepthCm: getArDepthCmNumber(selectedForm, selectedWork),
  arBackLabelEnabled: getArBackLabelEnabled(selectedForm, selectedWork),
  docentAudioEnabled: selectedForm.docentAudioEnabled,
  docentAudioUrl: selectedForm.docentAudioUrl,
  docentAudioTitle: selectedForm.docentAudioTitle,
  docentAudioDescription: selectedForm.docentAudioDescription,
});
```

#### 발췌 4: 현재 AR Model Preview & Settings 구조

```tsx
<AdminArModelPreview
  imageUrl={selectedArtworkImageUrl}
  sideColor={currentArSideColor}
  depthCm={currentArDepthCm}
  backLabelEnabled={currentArBackLabelEnabled}
  backLabelRows={arBackLabelPreviewRows}
  previewMode={arCanvasPreviewMode}
  onPreviewModeChange={setArCanvasPreviewMode}
/>

<ArBackLabelPreview
  enabled={currentArBackLabelEnabled}
  rows={arBackLabelPreviewRows}
/>

<ArDirectionControls
  rotationDeg={currentArTextureRotationDeg}
  flipX={currentArTextureFlipX}
  flipY={currentArTextureFlipY}
  onRotateLeft={() => updateSelectedField("arTextureRotationDeg", normalizeArTextureRotationDeg(currentArTextureRotationDeg - 90))}
  onRotateRight={() => updateSelectedField("arTextureRotationDeg", normalizeArTextureRotationDeg(currentArTextureRotationDeg + 90))}
  onRotate180={() => updateSelectedField("arTextureRotationDeg", normalizeArTextureRotationDeg(currentArTextureRotationDeg + 180))}
  onFlipX={() => updateSelectedField("arTextureFlipX", !currentArTextureFlipX)}
  onFlipY={() => updateSelectedField("arTextureFlipY", !currentArTextureFlipY)}
  onReset={() => {
    updateSelectedField("arTextureRotationDeg", 0);
    updateSelectedField("arTextureFlipX", false);
    updateSelectedField("arTextureFlipY", false);
  }}
/>
```

#### 발췌 5: UI에서 확인되는 사용자 입력 필드

```tsx
<ArTextField
  label="generatedGlbUrl"
  value={selectedForm.generatedGlbUrl || ""}
  onChange={(value) => updateSelectedField("generatedGlbUrl", value)}
  placeholder="https://..."
  helpText="Generated GLB URL. This powers web and Android preview."
/>
<ArTextField
  label="generatedUsdzUrl"
  value={selectedForm.generatedUsdzUrl || ""}
  onChange={(value) => updateSelectedField("generatedUsdzUrl", value)}
  placeholder="https://..."
  helpText="Generated USDZ URL. This restores iPhone Quick Look placement."
/>
<ArTextField
  label="modelGlb"
  value={selectedForm.modelGlb || ""}
  onChange={(value) => updateSelectedField("modelGlb", value)}
  placeholder="https://..."
  helpText="Manual GLB URL if you already prepared one."
/>
<ArTextField
  label="modelUsdz"
  value={selectedForm.modelUsdz || ""}
  onChange={(value) => updateSelectedField("modelUsdz", value)}
  placeholder="https://..."
  helpText="Manual USDZ URL for iPhone AR placement."
/>
```

### 5-2. `src/lib/ar/createCanvasGlb.ts`

#### 파일 경로

- [`src/lib/ar/createCanvasGlb.ts`](/Users/jaewookim/Desktop/kuns-artists/src/lib/ar/createCanvasGlb.ts)

#### 역할

- 작품 이미지를 캔버스형 3D 오브젝트로 변환합니다.
- `GLB`와 `USDZ`를 모두 생성합니다.
- front texture, back label texture, side/edge mesh를 구성합니다.
- `USDZExporter` 호환성을 검사합니다.

#### 왜 중요한가

- iPhone Quick Look 문제는 사실상 이 파일의 geometry/material/export 구조와 직접 연결됩니다.

#### 발췌 1: 입력 타입과 옵션, 기본값

```ts
export type CanvasGlbInput = {
  imageUrl: string;
  title: string;
  widthCm: number;
  heightCm: number;
  depthCm?: number;
  artistName?: string;
  year?: string;
  medium?: string;
  dimensions?: string;
};

export type CanvasGlbOptions = {
  sideColor?: string;
  backColor?: string;
  depthCm?: number;
  maxTextureSize?: number;
  textureRotationDeg?: number;
  textureFlipX?: boolean;
  textureFlipY?: boolean;
  useArModelSettings?: boolean;
  frontRotationXDeg?: number;
  frontRotationYDeg?: number;
  sideMode?: CanvasSideMode;
  showBackLabel?: boolean;
  frontTextureRotationDeg?: number;
  frontTextureFlipX?: boolean;
  frontTextureFlipY?: boolean;
};

export const DEFAULT_DEPTH_CM = 3.5;
export const DEFAULT_SIDE_COLOR = "#111111";
export const DEFAULT_BACK_COLOR = "#f6f1e8";
```

#### 발췌 2: front texture transform

```ts
function createFrontTextureFromImage(
  image: HTMLImageElement,
  maxTextureSize = DEFAULT_MAX_TEXTURE_SIZE,
  options: { rotationDeg?: number; flipX?: boolean; flipY?: boolean } = {}
) {
  const { width, height } = getImageDimensions(image);
  const rotationDeg = options.rotationDeg ?? 0;
  const flipX = options.flipX ?? false;
  const normalizedRotationDeg = ((rotationDeg % 360) + 360) % 360;
  const swapsDimensions =
    normalizedRotationDeg === 90 || normalizedRotationDeg === 270;
  const canvas = document.createElement("canvas");

  canvas.width = swapsDimensions ? targetHeight : targetWidth;
  canvas.height = swapsDimensions ? targetWidth : targetHeight;

  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  if (rotationDeg !== 0) {
    ctx.rotate((rotationDeg * Math.PI) / 180);
  }
  ctx.scale(flipX ? -1 : 1, 1);
  ctx.drawImage(image, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
  ctx.restore();

  return createCanvasTexture(canvas, { flipY: options.flipY });
}
```

#### 발췌 3: back label texture

```ts
function createBackLabelTexture(
  input: CanvasGlbInput,
  options: CanvasGlbOptions & {
    rotationDeg?: number;
    flipX?: boolean;
    flipY?: boolean;
  } = {}
) {
  const infoRows = [
    { label: "Artist", value: normalizeOptionalText(input.artistName) },
    { label: "Year", value: normalizeOptionalText(input.year) },
    { label: "Medium", value: normalizeOptionalText(input.medium) },
    { label: "Size", value: getDimensionsText(input) },
  ].filter((row) => Boolean(row.value));

  ctx.fillStyle = "rgba(251, 247, 239, 0.98)";
  ctx.fillRect(cardX, cardY, cardSide, cardSide);

  ctx.fillStyle = primaryTextColor;
  ctx.font = `600 ${Math.max(24, Math.round(cardSide * 0.078))}px Arial, sans-serif`;
  y = drawWrappedText(
    ctx,
    normalizeOptionalText(input.title) ?? "Untitled",
    contentX,
    y,
    contentWidth,
    titleLineHeight,
    3
  );
  ...
  return createCanvasTexture(canvas, { flipY: options.flipY });
}
```

#### 발췌 4: GLB scene 구성

```ts
const frontMaterial = new MeshStandardMaterial({
  map: frontTexture,
  color: 0xffffff,
  metalness: 0,
  roughness: 0.98,
  transparent: false,
  opacity: 1,
  depthWrite: true,
  depthTest: true,
  alphaTest: 0,
  side: DoubleSide,
});

const sideMaterial = new MeshStandardMaterial({
  color: sideColor,
  metalness: 0,
  roughness: 0.98,
  transparent: false,
  opacity: 1,
  depthWrite: true,
  depthTest: true,
  alphaTest: 0,
  side: DoubleSide,
});

const backMaterial = backTexture
  ? new MeshStandardMaterial({
      map: backTexture,
      color: 0xffffff,
      metalness: 0,
      roughness: 0.94,
      transparent: false,
      opacity: 1,
      depthWrite: true,
      depthTest: true,
      alphaTest: 0,
      side: DoubleSide,
    })
  : new MeshStandardMaterial({
      color: backColor,
      metalness: 0,
      roughness: 0.94,
      transparent: false,
      opacity: 1,
      depthWrite: true,
      depthTest: true,
      alphaTest: 0,
      side: DoubleSide,
    });

const frontMesh = new Mesh(frontGeometry, frontMaterial);
frontMesh.position.z = frontZ;

const backMesh = new Mesh(backGeometry, backMaterial);
backMesh.position.z = backZ;
backMesh.rotation.y = Math.PI;

const rightMesh = new Mesh(rightGeometry, sideMaterial);
rightMesh.position.x = halfW + halfD;
```

#### 발췌 5: USDZ 호환성 검사와 exporter

```ts
function assertUsdzCompatibleScene(scene: Scene) {
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;

    if (Array.isArray(object.material)) {
      invalidObjects.push(
        `${object.name || "UnnamedMesh"}: material array is not supported for USDZ`
      );
      return;
    }

    if (!isUsdzStandardMaterial(object.material)) {
      invalidMaterials.push(
        `${object.name || "UnnamedMesh"}: ${material?.type || "unknown"}`
      );
    }
  });

  if (invalidObjects.length > 0 || invalidMaterials.length > 0) {
    throw new Error(
      `USDZ export requires MeshStandardMaterial only. Invalid materials: ${[
        ...invalidObjects,
        ...invalidMaterials,
      ].join(", ")}`
    );
  }
}

async function exportCanvasUsdzBlob(scene: Scene, maxTextureSize: number) {
  scene.updateMatrixWorld(true);
  assertUsdzCompatibleScene(scene);

  const exporter = new USDZExporter();
  const result = await exporter.parseAsync(scene, {
    includeAnchoringProperties: true,
    quickLookCompatible: true,
    onlyVisible: true,
    maxTextureSize,
  });

  return new Blob([result], { type: "model/vnd.usdz+zip" });
}
```

#### 발췌 6: GLB/USDZ를 함께 생성하는 helper

```ts
export async function createCanvasArFiles(
  input: CanvasGlbInput,
  options: CanvasUsdzOptions = {}
): Promise<CanvasArFilesResult> {
  const [glbResult, usdzResult] = await Promise.allSettled([
    createCanvasGlbBlob(input, options),
    createCanvasUsdzBlob(input, options),
  ]);

  if (glbResult.status === "rejected") {
    throw glbResult.reason;
  }

  if (usdzResult.status === "fulfilled") {
    return {
      glbBlob: glbResult.value,
      usdzBlob: usdzResult.value,
    };
  }

  const usdzError =
    usdzResult.reason instanceof Error
      ? usdzResult.reason.message
      : typeof usdzResult.reason === "string"
        ? usdzResult.reason
        : "USDZ generation failed.";

  return {
    glbBlob: glbResult.value,
    usdzError,
  };
}
```

### 5-3. `src/lib/r2/client.ts`

#### 파일 경로

- [`src/lib/r2/client.ts`](/Users/jaewookim/Desktop/kuns-artists/src/lib/r2/client.ts)

#### 역할

- Blob을 R2에 업로드합니다.
- GLB/USDZ 업로드를 각각 다른 target/content type으로 보냅니다.

#### 왜 중요한가

- 생성된 바이너리 파일이 실제 공개 URL이 되는 마지막 단계입니다.

#### 발췌

```ts
export async function uploadBlobToR2(
  blob: Blob,
  payload: R2PresignRequest
): Promise<R2UploadResult> {
  const presigned = await requestR2UploadUrl(payload);

  const uploadResponse = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": payload.contentType,
    },
    body: blob,
  });

  return {
    publicUrl: presigned.publicUrl,
    key: presigned.key,
  };
}

export async function uploadGlbFileToR2({
  blob,
  filename,
  artistSlug,
  workSlug,
}: {
  blob: Blob;
  filename: string;
  artistSlug?: string;
  workSlug?: string;
}): Promise<R2UploadResult> {
  return await uploadBlobToR2(blob, {
    filename,
    contentType: "model/gltf-binary",
    target: "ar-model",
    artistSlug,
    workSlug,
  });
}

export async function uploadUsdzFileToR2({
  blob,
  filename,
  artistSlug,
  workSlug,
}: {
  blob: Blob;
  filename: string;
  artistSlug?: string;
  workSlug?: string;
}): Promise<R2UploadResult> {
  return await uploadBlobToR2(blob, {
    filename,
    contentType: "model/vnd.usdz+zip",
    target: "usdz",
    artistSlug,
    workSlug,
  });
}
```

### 5-4. `netlify/functions/r2-presign-upload.ts`

#### 파일 경로

- [`netlify/functions/r2-presign-upload.ts`](/Users/jaewookim/Desktop/kuns-artists/netlify/functions/r2-presign-upload.ts)

#### 역할

- presigned upload URL을 만듭니다.
- target별 prefix와 content type을 제한합니다.

#### 왜 중요한가

- `usdz` 업로드가 실제로 가능한 구조인지 확인할 수 있습니다.

#### 발췌

```ts
type R2UploadTarget =
  | "profile"
  | "work-image"
  | "exhibition-image"
  | "glb"
  | "ar-model"
  | "usdz"
  | "cv";

const TARGET_PREFIX: Record<R2UploadTarget, string> = {
  profile: "profiles",
  "work-image": "work-images",
  "exhibition-image": "exhibition-images",
  glb: "models/glb",
  "ar-model": "ar-models",
  usdz: "models/usdz",
  cv: "cv",
};

const TARGET_CONTENT_TYPES: Record<R2UploadTarget, string[]> = {
  profile: ["image/jpeg", "image/png", "image/webp"],
  "work-image": ["image/jpeg", "image/png", "image/webp"],
  "exhibition-image": ["image/jpeg", "image/png", "image/webp"],
  glb: ["model/gltf-binary", "application/octet-stream"],
  "ar-model": ["model/gltf-binary", "application/octet-stream"],
  usdz: ["model/vnd.usdz+zip", "application/octet-stream"],
  cv: ["application/pdf"],
};

function createObjectKey(payload: Required<Pick<PresignBody, "filename" | "target">> & PresignBody) {
  const prefix = TARGET_PREFIX[payload.target];

  if (payload.target === "ar-model") {
    return `${prefix}/${artistSlug}/${workSlug}/${stamp}-${safeFilename}.${extension}`;
  }

  return `${prefix}/${artistSlug}/${baseName}-${stamp}.${extension}`;
}
```

### 5-5. `src/components/ar/DeviceRedirect.tsx`

#### 파일 경로

- [`src/components/ar/DeviceRedirect.tsx`](/Users/jaewookim/Desktop/kuns-artists/src/components/ar/DeviceRedirect.tsx)

#### 역할

- `/ar/{slug}`에서 iPhone / Android / Desktop을 분기합니다.
- iPhone이면 Quick Look용 `rel="ar"` 링크를 제공합니다.
- GLB가 있으면 3D Preview fallback을 제공합니다.

#### 왜 중요한가

- 사용자가 실제로 AR을 여는 지점입니다.
- 관리자가 `generatedUsdzUrl`을 넣어도 이 컴포넌트가 올바르게 분기하지 않으면 iPhone Quick Look이 살아나지 않습니다.

#### 발췌

```ts
function getPrimaryArAction({
  deviceInfo,
  iosLink,
  androidIntent,
  glbUrl,
}: {
  deviceInfo: DeviceInfo;
  iosLink: string;
  androidIntent: string | null;
  glbUrl: string;
}) {
  if (!deviceInfo.isReady || !deviceInfo.isMobile) {
    return null;
  }

  if (deviceInfo.isIos) {
    if (iosLink) {
      return {
        href: iosLink,
        label: "View in AR",
        rel: "ar",
        note: "Open the artwork in Quick Look and place it in your space.",
      };
    }

    if (glbUrl) {
      return {
        href: glbUrl,
        label: "View 3D Preview",
        note: "Open the 3D preview on this device.",
      };
    }
  }

  if (deviceInfo.isAndroid) {
    if (androidIntent) {
      return {
        href: androidIntent,
        label: "View in AR",
        note: "Open the artwork in Scene Viewer.",
      };
    }
  }

  if (glbUrl) {
    return {
      href: glbUrl,
      label: "View 3D Preview",
      note: "Open the 3D preview on this device.",
    };
  }

  return null;
}

{deviceInfo.isMobile ? (
  primaryArAction ? (
    <a
      href={primaryArAction.href}
      rel={primaryArAction.rel}
    >
      {primaryArAction.label}
    </a>
  ) : (
    <div>AR preview is being prepared for this artwork.</div>
  )
) : (
  <QRCodePanel url={deviceInfo.currentUrl} />
)}
```

### 5-6. `src/components/public/PublicArWorkPage.tsx`

#### 파일 경로

- [`src/components/public/PublicArWorkPage.tsx`](/Users/jaewookim/Desktop/kuns-artists/src/components/public/PublicArWorkPage.tsx)

#### 역할

- 공개 AR viewing room을 구성합니다.
- Firestore/seed 작품을 하나의 `Work` 형태로 정규화합니다.
- `DeviceRedirect`와 도슨트 오디오를 렌더링합니다.

#### 왜 중요한가

- 관리자가 저장한 `generatedGlbUrl` / `generatedUsdzUrl`이 실제 사용자에게 어떻게 노출되는지 확인하는 최종 공개 화면입니다.

#### 발췌

```ts
return {
  modelGlb:
    firestoreWork?.generatedGlbUrl ??
    firestoreWork?.modelGlb ??
    fallbackWork?.modelGlb,
  modelUsdz:
    firestoreWork?.generatedUsdzUrl ??
    firestoreWork?.modelUsdz ??
    fallbackWork?.modelUsdz,
  generatedGlbUrl:
    firestoreWork?.generatedGlbUrl ?? fallbackWork?.generatedGlbUrl,
  generatedUsdzUrl:
    firestoreWork?.generatedUsdzUrl ?? fallbackWork?.generatedUsdzUrl,
};

...

<section id="ar-access" className="mx-auto max-w-7xl px-5 pt-6 md:px-8 md:pt-8">
  <DeviceRedirect work={work} />
</section>

{docentAudioEnabled ? (
  <section className="mx-auto max-w-7xl px-5 pt-6 md:px-8 md:pt-8">
    <DocentAudioPlayer
      title={docentAudioTitle}
      description={docentAudioDescription}
      src={docentAudioUrl}
    />
  </section>
) : null}
```

### 5-7. `src/types/work.ts` / `src/lib/firebase/firestore.ts`

#### 파일 경로

- [`src/types/work.ts`](/Users/jaewookim/Desktop/kuns-artists/src/types/work.ts)
- [`src/lib/firebase/firestore.ts`](/Users/jaewookim/Desktop/kuns-artists/src/lib/firebase/firestore.ts)

#### 역할

- 작품 타입에 AR 관련 필드를 추가합니다.
- Firestore read/write에서 해당 필드를 변환합니다.

#### 왜 중요한가

- 관리자에서 만든 설정이 저장되지 않으면 공개 `/ar/{slug}`까지 이어지지 않습니다.

#### 발췌

```ts
export type Work = {
  modelGlb?: string;
  modelUsdz?: string;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  arTextureRotationDeg?: number;
  arTextureFlipX?: boolean;
  arTextureFlipY?: boolean;
  arSideColor?: string;
  arDepthCm?: number;
  arBackLabelEnabled?: boolean;
  generatedGlbUrl?: string;
  generatedUsdzUrl?: string;
  docentAudioEnabled?: boolean;
  docentAudioUrl?: string;
  docentAudioTitle?: string;
  docentAudioDescription?: string;
};

export type ArtistWorkDoc = {
  depthCm?: number;
  arTextureRotationDeg?: number;
  arTextureFlipX?: boolean;
  arTextureFlipY?: boolean;
  arSideColor?: string;
  arDepthCm?: number;
  arBackLabelEnabled?: boolean;
  modelGlb?: string;
  modelUsdz?: string;
  generatedGlbUrl?: string;
  generatedUsdzUrl?: string;
};

export type ArtistWorkAdminUpdatePayload = {
  generatedGlbUrl?: string;
  generatedUsdzUrl?: string;
  arTextureRotationDeg?: number;
  arTextureFlipX?: boolean;
  arTextureFlipY?: boolean;
  arSideColor?: string;
  arDepthCm?: number;
  arBackLabelEnabled?: boolean;
};
```

```ts
function toArtistWorkDoc(id: string, rawData: Record<string, unknown>): ArtistWorkDoc {
  return {
    id,
    arTextureRotationDeg: toOptionalNumber(rawData.arTextureRotationDeg),
    arTextureFlipX: toOptionalBoolean(rawData.arTextureFlipX),
    arTextureFlipY: toOptionalBoolean(rawData.arTextureFlipY),
    arSideColor: toOptionalString(rawData.arSideColor),
    arDepthCm: toOptionalNumber(rawData.arDepthCm),
    arBackLabelEnabled: toOptionalBoolean(rawData.arBackLabelEnabled),
    modelGlb: toOptionalString(rawData.modelGlb),
    modelUsdz: toOptionalString(rawData.modelUsdz),
    generatedGlbUrl: toOptionalString(rawData.generatedGlbUrl),
    generatedUsdzUrl: toOptionalString(rawData.generatedUsdzUrl),
  };
}

if (payload.arTextureRotationDeg !== undefined) {
  updatePayload.arTextureRotationDeg = payload.arTextureRotationDeg;
}
if (payload.arTextureFlipX !== undefined) {
  updatePayload.arTextureFlipX = payload.arTextureFlipX;
}
if (payload.arTextureFlipY !== undefined) {
  updatePayload.arTextureFlipY = payload.arTextureFlipY;
}
if (payload.arSideColor !== undefined) {
  updatePayload.arSideColor = payload.arSideColor.trim();
}
if (payload.arDepthCm !== undefined) {
  updatePayload.arDepthCm = payload.arDepthCm;
}
if (payload.arBackLabelEnabled !== undefined) {
  updatePayload.arBackLabelEnabled = payload.arBackLabelEnabled;
}
```

## 6. 문제 히스토리

### 1) GLB만 생성되던 상태

- 초기에는 `GLB`만 생성되는 상태였습니다.
- iPhone Quick Look의 안정적 배치를 위해 `USDZ`가 필요하다는 점이 확인되었습니다.

### 2) USDZExporter 연결

- `three/examples/jsm/exporters/USDZExporter.js`를 연결했습니다.
- 새 라이브러리는 추가하지 않았습니다.
- `GLB`를 먼저 만들고, `USDZ`는 실패해도 `GLB`를 유지하는 흐름이 들어갔습니다.

### 3) USDZ가 투명하게 보임

- `GLB`용 scene/material을 그대로 `USDZExporter`에 넘겼을 때, Quick Look에서 작품이 투명하거나 기대와 다르게 보였습니다.
- 이를 해결하기 위해 `USDZ` 전용 scene 구성을 분리했습니다.

### 4) `Unsupported material type` 에러

- `USDZExporter`가 `MeshStandardMaterial`만 다루는 제약 때문에 오류가 발생했습니다.
- `material array` 또는 비표준 material이 섞인 경우 export가 실패했습니다.
- 현재 코드는 `assertUsdzCompatibleScene`으로 이를 강하게 검사합니다.

### 5) 단일 material 구조의 한계

- 문제를 피하기 위해 단일 material 구조로 단순화한 시도가 있었습니다.
- 그러나 그 방식은 앞면/뒷면/옆면 구분이 무너졌고, 작품 정보 라벨과 edge 표현이 약해졌습니다.

### 6) 6 mesh 구조로 변경

- 현재는 front/back/left/right/top/bottom을 분리한 구조가 들어가 있습니다.
- `PlaneGeometry`와 `BoxGeometry`를 조합하고, 각 mesh에 `MeshStandardMaterial`을 씁니다.
- 다만 iPhone Quick Look에서의 실제 결과는 여전히 사용자가 기대한 방향과 다를 수 있습니다.

### 7) 관리자 설정 UI 추가

- `arTextureRotationDeg`
- `arTextureFlipX`
- `arTextureFlipY`
- `arSideColor`
- `arDepthCm`
- `arBackLabelEnabled`
- 이 값들을 관리자에서 직접 조정한 뒤 `Generate AR Files`를 다시 만들 수 있도록 했습니다.
- 다만 현재 프리뷰는 실제 USDZ 렌더링이 아니라 CSS 기반 근사 프리뷰라, 실제 Quick Look 결과와 다를 수 있습니다.

## 7. 현재 남은 문제

### 1) iPhone Quick Look에서 앞면 방향이 계속 맞지 않음

- 180도 회전, 좌우 반전, 상하 반전이 반복적으로 발생합니다.
- 코드에서 하드코딩 보정만으로는 안정적으로 맞추기 어렵습니다.

### 2) 측면이 바깥 프레임처럼 보이지 않음

- 사용자가 보기에는 side/edge가 바깥 프레임이 아니라 안쪽면처럼 보입니다.
- edge mesh 위치, normal 방향, rotation, scale 기준을 다시 봐야 할 가능성이 있습니다.

### 3) 뒷면 라벨이 안 보임

- back label texture는 생성한다고 되어 있지만, Quick Look에서 베이지/흰색 면만 보이는 현상이 있습니다.
- `material.map`, back mesh 방향, UV, `side` 설정, exporter 호환성 중 하나 이상이 원인일 수 있습니다.

### 4) Admin preview의 한계

- `AR Front Preview`는 실제 3D/USDZ preview가 아니라 작품 이미지에 CSS transform을 적용한 2D 방향 preview입니다.
- `Canvas Model Preview`도 실제 USDZ 렌더링이 아니라 approximate CSS preview입니다.
- 따라서 관리자 화면의 미리보기와 실제 iPhone 결과가 다를 수 있습니다.

### 5) 운영자가 디버깅하기 어려움

- `Generate AR Files` → `Save Changes` → iPhone 확인의 반복이 필요합니다.
- 관리자에서 Quick Look 결과를 직접 확인하기 어렵습니다.

## 8. 외부 프로그래머에게 묻고 싶은 질문

1. `three`의 `USDZExporter`에서 `PlaneGeometry + BoxGeometry` 조합으로 캔버스 패널을 만드는 현재 접근이 적절한가?
2. iPhone Quick Look에서 front/back 방향을 안정적으로 맞추려면 texture transform으로 보정하는 것이 맞는가, 아니면 geometry rotation 또는 UV 좌표를 조정해야 하는가?
3. 뒷면 라벨 texture가 Quick Look에서 보이지 않는 원인을 어떻게 좁혀야 하는가?
   - `material.map` 문제인지
   - mesh normal 방향인지
   - texture `flipY` 문제인지
   - `backMesh.rotation.y` 문제인지
   - `USDZExporter` 한계인지
4. side/edge가 바깥 프레임처럼 보이지 않고 안쪽면처럼 보이는 현상은 edge BoxGeometry 위치 문제인지, Quick Look의 backface/culling 문제인지, 전체 mesh 조립 기준 문제인지?
5. `USDZExporter` 대신 더 안정적인 변환 방식이 필요한가?
   - Blender / `usd_from_gltf` 오프라인 변환
   - server-side conversion
   - Apple Reality Converter 기반 workflow
   - GLB 생성 후 USDZ 변환 파이프라인
6. 현재 브라우저 클라이언트에서 GLB/USDZ를 모두 생성하는 구조가 운영상 적절한가?
   - 아니면 서버/빌드 파이프라인으로 옮기는 것이 더 나은가?
7. 관리자에서 실제 USDZ preview를 보려면 어떤 접근이 현실적인가?
   - `model-viewer` 사용 여부
   - `three.js` preview
   - Quick Look은 iPhone에서만 확인하는 구조 유지
   - USDZ 대신 GLB preview만 admin에서 제공
8. 작품 이미지를 실제 캔버스 오브젝트로 만들 때 `front/back/side`를 하나의 `BoxGeometry material array`로 쓰는 게 나은가, 6개 mesh로 분리하는 게 나은가, 혹은 UV를 직접 구성한 custom geometry가 나은가?

## 9. 리뷰 요청

이 문서를 검토하고 아래 방향으로 조언을 부탁드립니다.

1. 현재 AR 생성 구조에서 가장 큰 설계 문제
2. iPhone Quick Look용 `USDZ`를 안정적으로 만들기 위한 추천 구조
3. front/back/side geometry 구성 방식
4. texture orientation을 안정적으로 맞추는 방법
5. back label texture를 확실히 보이게 하는 방법
6. edge/side를 실제 캔버스 프레임처럼 보이게 하는 방법
7. 현재 브라우저 생성 방식 유지 가능 여부
8. 외부 변환 파이프라인 도입 필요 여부
9. 수정 우선순위

## 10. 정리

- 이 문서는 **현재 구조를 요약하고, 외부 프로그래머가 검토할 포인트를 정리한 핸드오프 문서**입니다.
- 이번 작업에서는 **앱 코드 수정 없음**이 원칙입니다.
- 외부 리뷰 결과를 받으면, 그 다음 단계에서 구조를 유지할지, 변환 파이프라인을 바꿀지, 혹은 Quick Look 전용 구조를 다시 설계할지 결정하는 것이 좋습니다.
