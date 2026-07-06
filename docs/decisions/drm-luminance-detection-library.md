# DRM 판별용 픽셀 접근 라이브러리로 react-native-image-colors 채택

## Problem

PROJECT.md §3.4은 스크린샷 이미지의 평균 휘도가 임계값 이하면 DRM(FLAG_SECURE) 카드로 분기하라고 명시한다. 이를 구현하려면 스캔한 이미지의 실제 픽셀 값을 읽어야 하는데, 프로젝트에는 이미지 픽셀에 접근할 수 있는 라이브러리가 전혀 없었다. 후보였던 `expo-image-manipulator`는 리사이즈/크롭만 제공하고 픽셀 값 자체를 반환하지 않아 휘도 계산이 불가능했다.

## Action

세 가지 방안을 사용자에게 제시했다: (1) `react-native-image-colors` 신규 추가 — 네이티브(Android Palette API/iOS)로 평균/대표 색상을 직접 계산해 반환, (2) `expo-image-manipulator`만 추가하고 파일 크기로 근사(검은 화면은 압축률이 높아 파일이 작아지는 경향) — 부정확하지만 새 네이티브 의존성 없음, (3) 지금은 스킵하고 항상 `is_drm=0`. 사용자는 (1)을 선택했다 — 정확도가 목적에 더 맞고, 이미 `expo prebuild` 기반 dev-client 프로젝트라 새 네이티브 모듈 추가 비용이 낮다는 판단.

`getColors(uri, { pixelSpacing, quality, cache })`로 평균색(Android: `.average`, iOS: `.background`, web: `.dominant`)을 얻어 표준 상대휘도 공식(0.299R+0.587G+0.114B)으로 환산하고, 임계값(`DRM_LUMINANCE_THRESHOLD`)과 비교하도록 구현했다. 임계값은 하드코딩하지 않고 `app/src/constants/drm.ts`에 격리했다(스와이프 엔진 상수와 같은 관례) — 실기기에서 다크모드 앱 스크린샷과 실제 DRM 검정화면을 비교해 튜닝해야 하는 프로토타입 검증값이라는 걸 주석에 명시했다.

## Result

- 픽셀 근사가 아닌 실제 네이티브 색상 추출로 정확도를 확보했지만, 아직 실기기에서 임계값을 검증하지 않아 다크모드 UI 오탐 가능성이 남아있음(검증 체크리스트에 명시)
- Android `FLAG_SECURE` 콘텐츠는 애초에 스크린샷 자체가 OS에서 차단돼 파일이 생성되지 않는다는 걸 뒤늦게 확인 — 이 라이브러리로 구현한 DRM 분기 로직은 스크린샷 스캔 경로로는 절대 트리거될 수 없고, 검증도 대체 시나리오(검정 이미지 직접 촬영)로만 가능하다. 실사용 가능한 DRM 캡처 경로는 v2 Share Extension/공유시트가 붙어야 열린다(CLAUDE.md 지뢰 목록에 기록)
- 새 네이티브 의존성 추가가 `expo prebuild` 재실행을 요구했고, 이 과정에서 해당 라이브러리 자체의 Gradle 설정 결함(AGP8+에서 JVM 타깃 미설정)이 릴리즈 빌드를 막아 별도 troubleshooting 대응이 필요했다(`docs/troubleshooting/kotlin-jvm-target-mismatch-release-build.md`)

## 관련 커밋/PR

-
