# Phase 6C: iOS Quick Look Upgrade

## 1. 목적
- iPhone/iPad에서 전용 USDZ 파일을 사용해 Quick Look 경험을 개선한다.
- 기존 공개 AR 라우트 `/ar/[slug]`는 유지한다.
- Android WebXR Beta, 기존 GLB 흐름, public desktop QR 흐름은 유지한다.

## 2. 전용 USDZ와 자동 USDZ
- 전용 USDZ는 `quickLookAsset.status === "ready"` 이고 `usdzUrl`이 HTTPS URL일 때만 공개 사용한다.
- 전용 파일이 없거나, 업로드만 되었거나, 오류 상태인 경우에는 기존 model-viewer 기본 Quick Look fallback을 유지한다.
- 공개 사용자는 전용 USDZ 여부나 상태를 보지 않는다.

## 3. `quickLookAsset` 구조
- `quickLookAsset`은 공개 사용 중인 전용 USDZ 메타데이터다.
- `quickLookPendingAsset`은 검수 대기 중인 업로드 파일이다.
- 기존 `arV2Asset`, `arV2Review`, `sourceSignature`, `generatorVersion` 구조는 변경하지 않는다.

## 4. pending -> ready 승인 흐름
1. 관리자가 USDZ를 업로드한다.
2. 파일은 `quickLookPendingAsset`으로 저장된다.
3. 관리자는 iPhone/iPad Safari에서 검수 링크로 확인한다.
4. 체크리스트를 모두 확인한 뒤 공개 사용을 승인한다.
5. 승인 시 `quickLookAsset`이 `ready`로 저장되고 `quickLookPendingAsset`은 제거된다.
6. 이전 공개 USDZ가 있으면 새 파일 승인 후 cleanup 대상으로 정리한다.

## 5. R2 key
- Quick Look 전용 업로드는 `quick-look/{workId}/{timestamp}-{sanitizedFileName}` 패턴을 사용한다.
- 같은 URL에 덮어쓰지 않고, 교체 시 새 immutable key를 생성한다.

## 6. `ios-src` 연결
- `ArtworkModelViewer`에 선택 prop `iosSrc`를 추가했다.
- `iosSrc`가 있으면 `model-viewer`의 `ios-src` 속성으로 전달한다.
- `iosSrc`가 없으면 해당 속성은 렌더하지 않는다.
- 모바일 공개 AR 화면에만 연결하고 데스크톱에는 연결하지 않는다.

## 7. fallback 정책
- ready USDZ가 있으면 iOS Quick Look은 전용 USDZ를 사용한다.
- uploaded 상태는 공개 페이지에서 사용하지 않는다.
- failed 상태는 기존 자동 Quick Look fallback을 사용한다.
- 전용 파일이 없으면 기존 동작 그대로 자동 fallback을 사용한다.

## 8. 실제 크기 검수
- 관리자 화면에 작품의 widthCm, heightCm, depthCm를 표시한다.
- 실제 작품 크기와 USDZ bounding size가 일치해야 한다.
- 브라우저 자동 bounding-box 검증은 강제하지 않는다.

## 9. wall placement
- 기존 `ar-placement="wall"` intent를 유지한다.
- 별도 floor placement fallback은 추가하지 않는다.

## 10. scaling 정책
- 기존 `ar-scale="auto"`를 유지한다.
- Quick Look에서 자유롭게 pinch scaling 검수가 가능해야 한다.

## 11. iPhone 검수 절차
- 업로드된 pending USDZ 링크를 iPhone/iPad Safari에서 연다.
- 첫 화면 방향, 크기, 벽면 배치, 조명 상태를 확인한다.
- 체크리스트를 모두 완료한 뒤 공개 사용을 승인한다.

## 12. CTA 지원 여부
- Quick Look 내부 CTA는 Apple이 지원하는 범위와 실제 동작 근거가 확인된 경우에만 구현한다.
- 이번 구현에서는 전용 USDZ 연결까지만 완료했다.
- Quick Look 전용 커스텀 CTA는 `capability: pending`으로 문서화한다.

## 13. 오디오·애니메이션 future scope
- `quickLookAsset.hasAudio`, `quickLookAsset.audioDescription`, `quickLookAsset.hasAnimation` 필드는 남겨두었다.
- 이번 단계에서는 USDZ에 오디오나 애니메이션을 자동 삽입하지 않는다.

## 14. cache busting
- Quick Look 교체 시 새 object key와 새 URL을 사용한다.
- query string으로 캐시를 무효화하지 않는다.
- 기존 공개 파일은 새 파일 승인 전까지 유지한다.

## 15. security
- Quick Look 업로드는 관리자 인증이 필요하다.
- 업로드 크기 제한은 100MB다.
- `.usdz` 확장자를 확인하고, MIME allowlist도 검증한다.
- R2 object key는 서버에서 생성하고 sanitize한다.

## 16. regression checklist
- 기존 AR v2 GLB 생성 흐름이 유지되는가
- Android/WebXR Beta가 유지되는가
- desktop QR 화면이 유지되는가
- legacy GLB/USDZ fallback이 유지되는가
- public page에서 전용 USDZ 정보가 노출되지 않는가
- 관리자 승인 전에는 공개 사용이 전환되지 않는가
- 교체 시 이전 공개 파일이 즉시 사라지지 않는가
