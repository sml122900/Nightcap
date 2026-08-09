# Nightcap

풀 스펙은 `PROJECT.md` 참고. 앱 코드는 `app/`(Expo dev-client), 세션 기록은 `docs/daily/`, 기술 결정은 `docs/decisions/`, 트러블슈팅은 `docs/troubleshooting/`, 이력서 소재는 `docs/par-materials.md`.

## 진행상황

**완료 (W1, W2, W3-1, W3-2, W3-3, 디자인 시스템/라이트 모드)**
- **디자인 시스템 + 라이트 모드** — 스펙과 배경은 PROJECT.md §5(디자인 시스템) / §4(화면별 테마 배정). 기능 변경 0의 순수 리페인트.
  - `app/src/theme/` 신설: `tokens.ts`(역할 기반 시맨틱 토큰 + dark/light/cinema 3팔레트 + space/radius/type/shadow/motion), `ThemeProvider.tsx`(`useTheme(surface?)`/`useCinema()`/`useThemeMode()`), `makeStyles.ts`(팔레트별 1회 생성·캐시하는 스타일 팩토리 훅), `SystemBars.tsx`(화면별 StatusBar + Android 내비바 버튼색), `colorClamp.ts`(+`colorClamp.test.ts`).
  - 구 `app/src/constants/tokens.ts`는 소비자 0이 되어 삭제. 색상 리터럴은 `theme/tokens.ts` 안에만 있다.
  - migration v7: `meta.theme_mode` 기본 `'dark'` 명시 삽입(값 없음→system으로 흘러가면 기존 사용자가 폰 설정에 따라 조용히 뒤집힌다). 설정 화면에 3분기 세그먼트 UI.
  - `npm test`(app/): `colorClamp` 8케이스를 tsc + node:test로 돌린다. jest 미도입 — RN import가 없는 순수 모듈 하나 때문에 러너를 들이지 않았다.
  - 곁가지 정리: 터치 타겟 44pt 하한, 빈 상태 3곳 톤 통일, `CoverImage` 레터박스 색 부모 주입, `StarRating` 공통화, 전역 `maxFontSizeMultiplier` 1.4.
  - **네이티브 리빌드 필요** — `expo-navigation-bar` 추가 + `app.json`의 `userInterfaceStyle`을 `"dark"`→`"automatic"`으로 바꿔야 `'system'` 모드가 동작한다(고정이면 `useColorScheme()`이 항상 dark). 아직 안 함.
- 정리 모드 스와이프 엔진: 4방향 제스처(보류/이전/삭제/별점모드) + 별점 모드(도킹+드래그+접근성) — `app/src/components/triage/`, `app/src/constants/swipeEngine.ts`
- SQLite 영속화 + 마이그레이션(v5까지: captures/meta/content_hash/source_author + 1회성 엔티티 디코딩 데이터 정리) — `app/src/db/`
- 휴지통(소프트 삭제 7일 + 세션종료 일괄 삭제 + 강제종료 재시도) — `app/src/services/trash.ts`
- 완료 요약 / 보관함 / 휴지통 화면 — `app/src/screens/`
- 스크린샷 스캔 파이프라인 — `app/src/services/screenshotScan.ts`: 권한 요청(`photo` 세분화 권한, `accessPrivileges` 부분접근 판별) → `Screenshots` 앨범(+파일명 폴백) 스캔 → 앱 샌드박스 사본 복사(`copyToSandbox`, export돼 공유시트 경로와 공유) → DRM 휘도 판별(`isLikelyDrm`, `react-native-image-colors`, 임계값은 `app/src/constants/drm.ts`) → `captures` INSERT. **W3-2부터 기본 OFF** — 설정 화면 토글로만 켜짐(`app/src/services/settings.ts`, `meta` 테이블).
- 카드/보관함/휴지통/별점모드 실이미지 렌더(`CoverImage` — 이미지·컨테이너 비율을 비교해 세로로 긴 스샷은 상단 기준 크롭, 가로로 긴 링크 썸네일은 높이 기준 중앙 크롭으로 자동 분기), DRM 카드 제목 직접입력(TextInput)
- **공유 링크 메타데이터 보강** — `app/src/services/urlMetadata.ts`: 유튜브 oEmbed 직행 → 그 외 도메인은 oEmbed 디스커버리 → `og:title`/`og:image`/`og:site_name` 파싱, 3초 타임아웃/실패 시 조용히 폴백(원칙 예외 배경은 `docs/decisions/url-metadata-fetch.md`). `shareIntake.ts`가 카드 INSERT 직후 비동기로 title/`source_author`/썸네일(`image_uri`, 샌드박스 사본화)을 UPDATE. 인스타 og:title `"{author} on Instagram: ..."` 패턴 분리, X는 URL의 `@handle`을 게시자로(oEmbed/og가 로그인 벽으로 막히는 곳이라 URL 패턴 폴백 우선), 스크랩 텍스트는 `app/src/utils/htmlEntities.ts`로 HTML 엔티티 디코딩. 보관함 상세 화면 제목 편집을 `kind` 무관 전체 허용 + `source_url` 있으면 "원본 열기"(`Linking.openURL`, 정리 모드 카드에는 없음).
- **홈/정리 화면 분리 + 유입 경로를 공유시트로 전환(W3-2)** — 배경/근거는 `docs/decisions/share-intent-primary-ingestion.md`.
  - `app/src/screens/HomeScreen.tsx` 신설: 앱 기본 화면, 오늘 담은 캡처 개수 + "정리 시작" 버튼. `TriageScreen`(스와이프 UI)은 이제 명시적으로 진입/종료(`onExit`)하는 별도 화면.
  - `expo-share-intent`(v8, native module) 도입 — `App.tsx`의 `RootNavigator`에서 `useShareIntent()`로 항상 수신 → `app/src/services/shareIntake.ts`의 `ingestShareIntent`가 이미지(사본복사+DRM판별 재사용, `content_hash` SHA-256 dedup)/URL·텍스트(`source_url`+`sourceAppFromUrl`로 출처 추론, `app/src/constants/sourceApps.ts`) 분기 INSERT → 홈으로 이동 + 토스트("스택에 담았어요"), 정리 모드로 안 끌고 감.
  - 보관함 상세 화면(`app/src/screens/LibraryDetailScreen.tsx`) 신설: 원본 이미지 전체보기, 별점 수정(별점 모드 `RateModeLayer` 재사용 + `onBackgroundTap` 옵션 prop으로 실수 덮어쓰기 방지), DRM 제목 수정, 삭제. `LibraryScreen`이 자체 `selectedId`/`BackHandler`로 서브화면 관리(`App.tsx` 미변경).
  - Android edge-to-edge 하단 잘림 수정: 전 화면 `SafeAreaView edges={['top']}` + `useSafeAreaInsets().bottom`을 스크롤/하단 고정 요소에 명시적으로 더하는 방식으로 통일.
  - 설정 화면(`app/src/screens/SettingsScreen.tsx`) 신설: 스크린샷 자동 수집 토글 1개(기본 OFF).
- **첫 실행 온보딩(3장, W3-2)** — `app/src/screens/OnboardingScreen.tsx` 신설: 탭으로 넘기는 3단계(정체성 공감 카피 → 공유시트 사용법 스켈레톤 목업 → 자동 수집 권한 토글+CTA). 완료 여부는 `meta.onboarding_completed_at`(`app/src/services/settings.ts`의 `getOnboardingCompleted`/`setOnboardingCompleted`, 기존 `auto_scan_enabled`와 같은 upsert 패턴)로 저장 — `App.tsx`의 `RootNavigator`가 마운트 시 이 플래그를 읽어 미완료면 온보딩을, 완료면 기존 홈 로직을 그대로 태운다. 3장 토글 ON 시 `requestMediaAccess()`(기존엔 어디서도 호출 안 되던 정식 권한 요청 함수)를 호출하고 결과와 무관하게 진행 — 거부해도 스캔 파이프라인이 조용히 no-op하므로 별도 분기 불필요. iOS 백탭/버블 GIF 온보딩은 이걸로 대체(아래 참고).

- **도그푸딩 계측(W3-3 A)** — 마이그레이션 v6(`captures.intake_source`/`has_link` + `triage_sessions` 테이블, 백필은 확정 가능한 것만) + `app/src/services/metrics.ts`. `TriageScreen`이 진입 시 세션 open → 판정마다 카운터(±1, 되돌리기 반영) → Done 도달 시 `completed=1` / 언마운트·백그라운드 5분 초과 시 `completed=0`으로 닫고 새 세션. 세션 쓰기도 writeQueue(`session:{id}`) 경유. '보류'는 rate@2.5로 즉시 커밋돼 rate 모드 2.5와 구분이 안 되므로 `TriageDeck.onCommit`에 `quickHold` 플래그를 추가해 `deferred`/`kept`를 가름. 설정 화면 하단 개발자 섹션에 리터럴 숫자로 표시(도그푸딩은 릴리즈 빌드로 하므로 `__DEV__` 대신 버전 라벨 5탭 히든 게이트 병행).
- **Direct Share 등록(W3-3 B)** — `app/plugins/withDirectShareShortcut.js`: `res/xml/shortcuts.xml`(share-target + 정적 shortcut) + MainActivity `android.app.shortcuts` meta-data + 라벨 string. `dumpsys shortcut`으로 `categories={com.anonymous.nightcap.category.SHARE_TARGET}` 등록 확인됨. 실제 공유시트 상단 행 노출은 실기기 육안 확인 필요(정적 share-target만으로 상단행에 뜨지 않으면 동적 shortcut push가 필요 — 그건 네이티브 코드).
- **클립보드 URL 병합(W3-3 C)** — `app/src/services/clipboardLink.ts`. 이미지 유입 시 클립보드가 URL이고 `meta.last_clipboard_url`과 다를 때만 병합. Android엔 클립보드 타임스탬프가 없어 "30분 이내"를 직접 못 재고 문자열 변화 감지가 실질 게이트. `image_uri`는 절대 안 덮음(스샷이 원본). 카드 "🔗 링크 포함" 라벨 + 보관함 상세 "링크 해제". 시도/성공 카운터는 개발자 섹션에 노출.
- **공유 카드(W3-3 D)** — `app/src/screens/ShareCardScreen.tsx`: 상단 카피 / 별점 상위 4~9장 3열 그리드 / 하단 기간·평균·총 개수. `captureRef`는 카드 뷰에만. 진입은 완료 요약 + 보관함 상단, 4장 미만이면 버튼 숨김.

**진행 중 아님 / 다음 단계 (W4~)**
- 플로팅 버블 — W3-3 계측 2주치 보고 판단(스펙은 PROJECT.md §10에 선반영: 재탭 병합/피드백 라벨/하단 끌어 숨김)
- 보관함 진짜 메이슨리(현재는 고정 2열 그리드로 단순화됨)
- `DRM_LUMINANCE_THRESHOLD` 실기기 튜닝(다크모드 오탐 체크 포함, 아직 미검증)
- iOS 공유시트(Share Extension) 실기기 검증 — macOS/Xcode 환경이 없어 이번 라운드는 Android(`expo run:android`)만 실기기 확인, iOS는 `expo prebuild`까지만(네이티브 프로젝트 생성 확인) 하고 실행은 못 함

**알려진 제약**
- **밀린 실기기 검증은 `docs/verification-checklist.md`에 순서대로 정리돼 있다**(① 온보딩 → ② W3-3 → ③ 테마). ①이 실패하면 나머지가 무의미하므로 순서를 지킬 것
- 라이트 모드는 실기기 육안 확인 전 — 코드상 대비는 맞췄지만(4.5:1 기준) 실제로 본 적은 없다. 시네마↔테마 경계(보관함 상세)와 Android 내비바 버튼색이 특히 확인 대상
- `bg` 값(`#0B0D12` vs 순수 `#000000`)은 **미결**. OLED 배터리 + 스샷 명암비가 순수 검정 편이고, 층위 구분은 `surface`가 이미 하고 있어 `bg`만 내려도 위계가 안 무너진다. 반대급부는 스크롤 잔상 — 실기기 비교 후 결정한다. 시네마 `#08090C`도 같이. 그 전까지 코드 수정 금지
- 추출색 클램프(`theme/colorClamp.ts`)는 만들어뒀지만 **소비자가 없다**. 원래 후보였던 보관함 셀 틴트는 무의미 — 셀에 커버가 꽉 차서 틴트가 안 보인다. 쓸 자리는 LibraryDetail 메타 영역 배경 하나(시네마↔테마 경계를 부드럽게 만드는 용도). 테스트 있는 순수 함수라 유지비 0이므로 남겨두고 백로그
- 보관함은 여전히 고정 2열 그리드(진짜 메이슨리 아님) — 디자인 시스템 작업에서 건드리지 않았다
- 별점 모드 손맛/접근성은 실기기 육안·TalkBack 확인이 아직 필요
- 릴리즈 빌드는 실기기(Galaxy S24+)에 설치까지 확인됨. 다만 스캔/DRM/휴지통 등 실제 기능 동작은 `docs/verification-checklist.md`로 수동 검증 필요 — 공유시트 유입 경로(이미지/URL 공유)는 이번 라운드에 dev-client 빌드 후 실기기로 검증 예정(사용자 확인 필요, `docs/verification-checklist.md`)
- 2026-08-09: W3-3 네이티브 리빌드(dev-client debug) + 설치까지 확인(`adb install` Success, `lastUpdateTime` 갱신, `dumpsys shortcut`에 share-target 등록). 지시대로 `am start`는 하지 않음 — 실제 기능(공유시트 상단 노출/클립보드 병합/공유 카드 이미지)은 실기기 수동 검증 필요
- 2026-07-13: W3-2 반영분 릴리즈 재빌드+실행 확인 완료 — 빌드 성공(3m30s), `dumpsys package` `lastUpdateTime` + `dumpsys activity` `ResumedActivity=com.anonymous.nightcap/.MainActivity`로 설치·포그라운드 실행 모두 확인(`docs/troubleshooting/release-build-launch-confirmation-cut-off.md`의 미해결 항목 해소). 단, 이건 "앱이 켜진다"만 확인된 것 — 공유시트 유입 등 실제 기능 동작은 여전히 `docs/verification-checklist.md`로 수동 검증 필요
- Android `FLAG_SECURE`(넷플릭스 등) 콘텐츠는 스크린샷 자체가 차단돼 스캔 경로로 DRM 카드가 실제로 만들어지는 일은 없음(지뢰 목록 참고) — 검증은 검정 이미지 스샷으로 대체

---

# CLAUDE.md — 프로젝트 컨텍스트

> 이 파일은 Claude Code가 항상 읽는 프로젝트 개요다.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---
# Role & Tone: Caveman Mode (Extreme Conciseness)
- Speak like a caveman: Remove all fluff, pleasantries, introductory, and concluding remarks.
- Do not say "Sure, I can help with that" or "Here is the solution."
- Eliminate articles (a, an, the) and filler words where possible, but maintain precise technical/coding terms.
- Focus ONLY on the core answer, solution, or code snippet.



- Reduce output token usage by 70%+.
- Deliver immediate value without making me read a textbook.

---

프로젝트: Nightcap (스와이프 정리 + 별점 아카이브 앱)

한 줄 정의
폰 보다가 마주친 모든 콘텐츠를 1탭으로 캡처해두고, 자기 전에 스와이프로 별점 정리하는 Android/iOS 앱.
정체성: "평점 앱"이 아니라 **도파민 루프의 출구** — 무한 피드와 같은 손맛(스와이프)을 주되, 오늘 캡처한 만큼만 있어서 반드시 끝나는 피드.
차별점: 정리 세션 종료 시 사진첩 원본도 일괄 삭제(사진첩 청소가 부가가치).

문서 체계 (세션 시작 시 이 순서로 읽을 것)
1. CLAUDE.md 진행상황 섹션 — 현재 어디까지 됐는지 (가변 상태. 작업 완료 시 갱신 필수)
2. PROJECT.md — 코어 루프, 화면 명세, 데이터 모델, 스와이프 엔진 스펙, 마일스톤
3. docs/decisions/ — 기술 결정과 그 근거 (예: 왜 클래스 기반 MediaLibrary API인지, 왜 휴지통을 deleted_at 시간창으로 필터하는지)
4. docs/troubleshooting/ — 환경/빌드 삽질 기록
5. docs/par-materials.md — 이력서 소재

핵심 원칙 (모든 작업에서 지킬 것)

스와이프 엔진 손맛이 제품의 생명: 임계값·회전 계수·스프링 커브는 PROJECT.md §6와 `app/src/constants/swipeEngine.ts`가 유일한 소스.
- 재튜닝은 도그푸딩 후 사용자가 확정한다. 임의 변경 금지 (프로토타입 검증값).
- 상수는 이 파일에서만 가져다 쓴다. 컴포넌트에 하드코딩 금지.

삭제는 파괴적 동작 — 사진첩 원본 삭제는 스와이프 시점이 아니라 정리 세션 종료 시 일괄 처리(PROJECT.md §8).
- "`deleted_at` 존재 + asset이 사진첩에 아직 남아있음" 조건으로 항상 재구성 가능해야 함(강제종료 유실 방지). 별도 pending 테이블 금지.

휴지통 조회는 `image_uri` 존재가 아니라 `deleted_at` 시간창(7일)으로 필터한다.
- 이유: 목데이터 단계에선 `image_uri`가 항상 비어있어, 존재 여부로 필터하면 휴지통 화면이 영구히 비어 검증이 불가능해짐(`docs/decisions/trash-retention-query.md`).

SQLite 스키마 변경은 `PRAGMA user_version` 마이그레이션 러너(`app/src/db/migrations.ts`)의 `MIGRATIONS` 배열에 추가하는 방식으로만 한다.
- `CREATE TABLE IF NOT EXISTS`로 스키마를 바꾸지 않는다 — 기존 설치본에 안전하게 적용할 방법이 없어짐.

라이브러리가 설치돼 있다고 최신 API라고 가정하지 않는다.
- `app/AGENTS.md`: Expo SDK57 API는 자주 바뀐다. 코드 작성 전 실제 `.d.ts` 또는 버전별 공식 문서(`docs.expo.dev/versions/v57.0.0/`)로 시그니처를 확인한다.
- 예: `expo-media-library`/`expo-file-system`의 구 자유 함수(`deleteAssetsAsync`, `FileSystem.deleteAsync`)는 SDK57에서 legacy로 이동/런타임 예외 대상 — 클래스 기반 API(`Asset.delete`, `new File(uri).delete()`)로 교체됨.

유저 데이터는 전부 로컬. 단, 유저가 공유한 공개 URL의 메타데이터(제목/썸네일)를 해당 플랫폼 공개 엔드포인트에서 읽는 것은 허용 — 키/계정/자체서버 불요, 실패해도 기능 동작에 지장 없어야 함(graceful). 배경/범위는 `docs/decisions/url-metadata-fetch.md`. 이 예외를 벗어나는 서버·계정 연동(Supabase 동기화/공유 링크 등)은 v2 백로그(PROJECT.md §9 "제외" 목록) — 사용자 확인 없이 착수 금지.

기술 스택 (변경 시 반드시 사용자에게 확인)

- Expo SDK 57 + TypeScript, `expo-dev-client` 필수 (Expo Go 사용 불가 — 사진첩 삭제·플로팅 버블 등 코어 기능이 Expo Go 밖)
- `react-native-gesture-handler` + `react-native-reanimated` 4 — 스와이프 엔진
- `expo-haptics`(판정 햅틱), `expo-media-library`(스크린샷 스캔/삭제, 클래스 기반 API), `expo-sqlite`(휴지통/보관함), `expo-file-system`(`new File(...)`)
- 네이티브 빌드 전 새 셸에서는 `JAVA_HOME`/`ANDROID_HOME` export 여부 확인(`docs/troubleshooting/gradle-java-android-home-missing.md`)

도메인 모델 (`app/src/db/types.ts` / PROJECT.md §7 — 단일 소스)

- `captures` 테이블: `id`, `created_at`, `triaged_at`(null=아직 스택에 있음), `deleted_at`(휴지통 진입 시각), `image_uri`, `asset_id`, `source_app`/`source_url`, `title`, `stars`(0.5~5.0), `verdict`(rated/hold/drop), `held_count`, `is_drm`, `kind`(video/text/drm), `channel`, `progress`
- 보류(hold): `triaged_at` NULL 유지 + `held_count` 증가로 다음 날 스택에 자동 재등장 — 별도 이월 테이블 없음
- 평가 생략 기본값 = 2.5 (별점 모드에서 바 바깥 탭)
- `verdict='drop'` 행은 통계용으로 유지, 7일 경과 후 이미지 파일만 purge(행 자체는 유지)

지뢰 목록 (밟았던 버그/삽질 — 재발 금지)

- Metro `/status` 200 응답만 보고 "내 프로젝트 서버"라고 가정 금지 — 다른 프로젝트(`power-nap`)의 좀비 Metro가 8081을 점유했던 사례. 의심되면 실제 번들 엔드포인트(`/index.ts.bundle?...`) 응답에 찍히는 origin 경로로 확인(`docs/troubleshooting/stray-metro-process-wrong-project.md`).
- Nightcap의 Metro는 항상 8081 포트만 쓴다 — 포트 충돌 시(위 좀비 Metro 사례처럼 다른 프로젝트가 8081을 점유) `expo start`가 제안하는 대체 포트(8082 등)로 넘어가지 말고, 점유 프로세스를 확인해서 정리한 뒤 8081을 그대로 쓴다. 기기 쪽 `adb reverse tcp:8081 tcp:8081`과 맞춰야 하므로 포트를 바꾸면 기기 연결이 깨진다.
- 새 Bash 셸엔 `JAVA_HOME`/`ANDROID_HOME`이 비어있을 수 있다 — 네이티브 리빌드 전 매번 확인.
- 목데이터(`MOCK_CAPTURES`) 단계라 `asset_id`/`image_uri`가 항상 비어있음 — 사진첩 일괄 삭제·purge 로직은 코드는 맞아도 아직 실제 파일에는 동작하지 않는다는 걸 잊지 말 것.
- Android `FLAG_SECURE`(넷플릭스 등 DRM) 콘텐츠는 스크린샷 자체가 OS에서 차단돼 파일이 생성되지 않는다 — 스크린샷 스캔 경로로는 절대 유입 불가. DRM 분기는 스샷이 아닌 다른 캡처 경로(v2 Share Extension/공유시트)가 붙어야 실사용 가능해지고, 지금은 로직 검증용으로만 존재(검증 시 완전 검정 이미지를 전체화면으로 띄워 찍은 스샷으로 대체 테스트).
- 서드파티 네이티브 모듈이 AGP 버전 조건부로 Kotlin/Java JVM 타깃 설정을 건너뛰어(dead code) 릴리즈 빌드가 실패할 수 있다 — `android/build.gradle`을 직접 고쳐도 `expo prebuild`가 매번 지우므로, 고정은 반드시 config plugin(`app/plugins/withKotlinJvmTargetFix.js`)으로. `docs/troubleshooting/kotlin-jvm-target-mismatch-release-build.md` 참고.
- 릴리즈 빌드+설치가 다 끝났는데도 `expo run:android`가 응답 없이 멈춰 있으면, 로그가 없다고 바로 "멈췄다"고 판단하지 말고 데몬 CPU 사용률·APK 산출물 타임스탬프·기기 화면 잠금 상태부터 확인할 것 — 화면이 잠겨있으면 마지막 `am start` 단계에서 그냥 대기만 하고 있는 것일 수 있다. `docs/troubleshooting/adb-install-hang-locked-device.md` 참고.
- `expo-crypto`의 `Crypto.digest()`에 다른 네이티브 모듈(`expo-file-system`의 `File.arrayBuffer()` 등)이 반환한 순수 `ArrayBuffer`를 그대로 넘기면 안드로이드에서 `no ArrayBuffer attached`로 조용히 실패한다 — `new Uint8Array(buffer)`로 감싸서 TypedArray 뷰로 넘길 것. `docs/troubleshooting/expo-crypto-digest-arraybuffer-attach.md` 참고.
- 이 머신은 사용자 경로가 한글(`C:\Users\이성민`)이고 `sun.jnu.encoding=MS949`라, 네이티브 빌드 전에 `TMP`/`TEMP`(→ `C:\tmp_expo`)와 `GRADLE_USER_HOME`(→ `C:\gradle_home`)을 ASCII 경로로 지정해야 한다. 안 하면 `expo prebuild`는 node 세그폴트, Gradle은 `ClassNotFoundException: GradleWorkerMain`으로 죽는다 — 둘 다 우리 코드와 무관해 보이는 자리에서 터진다. `docs/troubleshooting/non-ascii-user-path-breaks-prebuild-and-gradle.md` 참고.
- 이미지 크롭 컴포넌트(`CoverImage`)를 세로 이미지(스크린샷) 기준으로만 짜지 말 것 — 가로형 이미지(링크 썸네일 등)가 들어오면 크롭 방향이 반대여야 한다. 컨테이너/이미지 비율을 실측 비교해서 분기하는 현재 구현이 정답. `docs/troubleshooting/coverimage-landscape-thumbnail-empty-space.md` 참고.

코드 규칙

- 커밋은 작은 단위로, conventional 메시지 유지(`feat:`/`fix:`/`docs:`/`chore:`)
- 색상·radius는 `app/src/constants/tokens.ts` 토큰만(프로토타입 CSS 변수와 1:1 매핑 유지, PROJECT.md §5). 하드코딩 금지.
- 스와이프 엔진 수치는 `app/src/constants/swipeEngine.ts`만(PROJECT.md §6). 컴포넌트에 하드코딩 금지.

현재 단계
CLAUDE.md "진행상황" 섹션 참고. (이 프로젝트 컨텍스트 블록에는 상태를 적지 않는다 — 진행상황 섹션이 가변 상태다.)
