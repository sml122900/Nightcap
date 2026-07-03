# expo-media-library 신규 클래스 기반 API 채택 (구 deleteAssetsAsync 대신)

## Problem

세션 종료 시 휴지통에 쌓인 사진첩 원본을 일괄 삭제하는 기능이 필요했다. 학습 자료/과거 예제 대부분은 `MediaLibrary.deleteAssetsAsync(assetIds)` 자유 함수를 쓰는데, AGENTS.md에 "Expo API가 자주 바뀌니 코드 작성 전 버전별 문서를 반드시 확인하라"는 명시적 경고가 있어 그대로 믿지 않고 실제 설치된 SDK57 타입 선언을 확인했다.

## Action

`node_modules/expo-media-library/build/index.d.ts`를 직접 열어 확인한 결과, SDK57의 메인 엔트리포인트는 `Asset`/`Album`/`Query` 클래스 기반 API로 이미 전환돼 있었고, `deleteAssetsAsync`는 `legacy/` 하위 경로에서만 제공됐다. 신규 API는 `new MediaLibrary.Asset(assetId)`로 저장된 id 문자열을 재구성한 뒤 정적 메서드 `MediaLibrary.Asset.delete(assets: Asset[])`로 일괄 삭제한다. 같은 방식으로 `expo-file-system`도 confirm 없이 WebFetch/unpkg로 실제 v57 타입 선언을 확인했는데, 구 `FileSystem.deleteAsync()` 자유 함수는 SDK57에서 **런타임에 예외를 던지도록 하드 폐기**되어 있었다(`new File(uri).delete()`로 교체해야 함, 게다가 동기 API라 `exists` 체크 후 호출해야 함).

## Result

- 구 API로 작성했다면 타입 에러 없이 컴파일은 됐겠지만(legacy 모듈이 여전히 존재) 실기기에서 `FileSystem.deleteAsync` 호출 시점에 즉시 크래시했을 것 — 사전에 문서/소스를 확인해 런타임 장애를 코드 작성 전에 회피
- `app/src/services/trash.ts`의 `syncPendingAssetDeletes`/`purgeExpiredTrash`가 처음부터 올바른 API로 작성돼 추가 디버깅 사이클 없이 통과
- "라이브러리가 설치돼 있다고 최신 API라고 가정하지 말고, 실제 .d.ts나 공식 문서로 시그니처를 확인한다"는 습관을 팀 문서화

## 관련 커밋/PR

-
