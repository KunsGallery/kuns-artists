# AR v2 Phase 1 — Isolated Model Lab

## 1. 기존 AR와 분리한 이유

Phase 1은 기존 AR 기능의 수정이 아니라, canonical GLB 하나를 기준으로 한 기술 검증입니다. 기존 AR 관련 파일은 참고만 하고 동결했습니다. 이 실험실의 결과를 실기기에서 검증한 뒤 운영 연결 여부를 판단합니다.

## 2. 핵심 원칙

- 유일한 원본은 브라우저에서 생성한 하나의 GLB Blob입니다.
- 관리자 preview, model-viewer, GLB 다운로드는 같은 Blob을 사용합니다.
- 모델은 단일 Mesh, 단일 MeshStandardMaterial, 단일 CanvasTexture atlas입니다.
- 브라우저에서 USDZExporter를 호출하거나 수동 USDZ를 생성하지 않습니다.
- iPhone Quick Look 변환은 `model-viewer`에 맡기고 `ios-src`는 지정하지 않습니다.
- 방향 보정은 atlas에 이미지를 그릴 때만 적용하며 geometry transform은 고정합니다.

## 3. 좌표계

모델 중심은 원점 `(0, 0, 0)`입니다.

- `+X`: 작품 오른쪽
- `-X`: 작품 왼쪽
- `+Y`: 작품 위쪽
- `-Y`: 작품 아래쪽
- `+Z`: 작품 정면
- `-Z`: 작품 뒷면

센티미터 입력값은 GL 단위로 `/ 100` 변환합니다. 기본값은 `100 × 100 × 3.5 cm`입니다.

## 4. 단일 Mesh / Material / Atlas

`Scene → Mesh → BufferGeometry + MeshStandardMaterial → CanvasTexture` 구조를 사용합니다. material array, BoxGeometry groups, front/back/side mesh 조립, helper object는 사용하지 않습니다. atlas는 2048×2048 불투명 canvas이며 front, back, left, right, top, bottom 셀을 모두 별도로 갖습니다.

## 5. Geometry vertex 순서

각 면은 독립 vertex 4개와 triangle 2개를 갖습니다. 총 24개 vertex와 36개 index입니다. front/back/right/left/top/bottom 순으로 6개 면을 작성하며, 외부에서 보았을 때 반시계 winding을 유지합니다.

## 6. Face normal 방향

면별 normal은 직접 입력합니다.

| Face | Normal |
| --- | --- |
| Front | `+Z` |
| Back | `-Z` |
| Right | `+X` |
| Left | `-X` |
| Top | `+Y` |
| Bottom | `-Y` |

normal은 `computeVertexNormals()`로 재계산하지 않습니다. validation은 unit length, 예상 방향, face center와의 outward 방향을 확인합니다.

## 7. Atlas layout

| Cell | Rect |
| --- | --- |
| Front | `x:0, y:0, 1024×1024` |
| Back | `x:1024, y:0, 1024×1024` |
| Left | `x:0, y:1024, 512×512` |
| Right | `x:512, y:1024, 512×512` |
| Top | `x:1024, y:1024, 512×512` |
| Bottom | `x:1536, y:1024, 512×512` |

각 셀은 16~20px padding을 사용합니다. diagnostic mode는 모든 면을 식별 가능한 fixture로 채우고, production mode는 side color와 back label을 사용합니다.

## 8. UV 변환

Canvas의 좌상단 pixel 좌표를 WebGL의 좌하단 UV 좌표로 변환합니다.

```text
u0 = (x + padding) / atlasWidth
u1 = (x + width - padding) / atlasWidth
v0 = 1 - (y + height - padding) / atlasHeight
v1 = 1 - (y + padding) / atlasHeight
```

각 face는 고유 rect를 사용하고 `CanvasTexture.flipY = false`를 고정합니다. front/back/side 방향은 각 면의 vertex 순서와 viewer 기준에서 글자가 읽히도록 지정했습니다.

## 9. model-viewer 사용 방식

`ArtworkModelViewer`가 client-side에서 `@google/model-viewer`를 한 번 등록하고, 생성된 object URL을 `src`로 전달합니다. `camera-controls`, `ar`, `ar-modes="webxr scene-viewer quick-look"`, `ar-placement="wall"`, `ar-scale="fixed"`를 사용합니다. load, error, progress, ar-status, camera-change 이벤트를 화면의 Event Log에 기록합니다.

## 10. ios-src를 생략한 이유

Phase 1의 검증 대상은 GLB를 canonical source로 하는 model-viewer delivery입니다. 따라서 수동 USDZ 파일이나 `ios-src`를 넣으면 source가 분리되고, GLB와 Quick Look 결과의 일치 여부를 검증할 수 없습니다. iPhone Safari와 HTTPS 환경에서 model-viewer 자동 변환 결과를 확인합니다.

## 11. Diagnostic fixture

front에는 `FRONT`, 방향 화살표, 모서리 라벨, 비대칭 `F`를 표시합니다. back에는 `BACK`, 작품명, 작가명, 연도와 치수를 표시합니다. 네 측면은 `LEFT OUTSIDE`, `RIGHT OUTSIDE`, `TOP OUTSIDE`, `BOTTOM OUTSIDE`와 서로 다른 색을 사용합니다. Rotate/Flip은 fixture와 local image를 atlas에 그리는 단계에만 반영됩니다.

## 12. Validation 항목

검증에는 mesh 수, material array 여부와 material 종류, 24 vertex/36 index, UV 범위, finite attribute, bounding box 크기, face normal, atlas rect와 flipY, rotation/scale/negative scale, helper object, GLB MIME type와 크기가 포함됩니다. FAIL이 있으면 preview는 가능하지만 AR와 Download GLB는 비활성화합니다.

## 13. 실기기 테스트 절차

1. HTTPS 배포 주소에서 관리자 계정으로 `/tools/ar-v2`에 접근합니다.
2. Diagnostic Faces / Diagnostic Fixture를 선택하고 `Build Preview Model`을 누릅니다.
3. Desktop viewer에서 앞·뒤·좌·우·위·아래 라벨과 모든 면의 표시를 확인합니다.
4. Diagnostics가 FAIL 없이 PASS인지 확인합니다.
5. iPhone Safari에서 `View in AR`를 눌러 Quick Look에 진입합니다. 정면, 위쪽, 좌우, 뒷면, 네 측면, wall placement, 실제 크기를 확인합니다.
6. Android Chrome에서 WebXR 또는 Scene Viewer 진입 여부와 같은 방향/크기를 확인합니다.
7. Local Image를 선택해 작품 비율 warning과 atlas-only orientation을 확인합니다.

실기기와 HTTPS 배포 환경은 Codex의 로컬 검증 범위 밖이므로 Phase 1 완료 전 대표 확인이 필요합니다.

## 14. Phase 1에서 의도적으로 제외한 것

Firestore, R2, 작품 문서 필드, Admin Works와 공개 `/ar` 연결, generated URL 저장, 기존 AR 파일 수정, 수동 USDZ 생성, USDZExporter, `ios-src`, 외부 변환 API, 서버 function, 관리자 메뉴 링크는 제외했습니다.

## 15. Phase 2 통과 기준

실기기에서 diagnostic fixture가 iPhone Quick Look과 Android AR 양쪽에서 방향·면·비율 문제 없이 표시되고, browser diagnostics가 PASS이며, model-viewer 자동 Quick Look 변환 실패가 재현되지 않아야 합니다. 이 기준을 통과한 뒤에만 운영 연결, 작품 이미지 정책, R2/Firestore 저장 여부를 별도 설계합니다. Phase 1 결과에 따라 기존 AR의 향후 처리 방향을 판단합니다.
