# PROJECT.md — Nightcap (나이트캡)

> 폰 보다가 마주친 모든 콘텐츠를 1탭으로 잡아두고, 자기 전에 스와이프로 별점 정리하는 앱.
> 이름의 뜻: 잠들기 전 마지막 한 잔(nightcap) = 잠들기 전 마지막 의식. cap은 캡처의 캡.
> 정체성: "평점 앱"이 아니라 **도파민 루프의 출구**. 무한 피드와 같은 손맛(스와이프)을 주되, 오늘 캡처한 만큼만 있어서 반드시 끝나는 피드.
> 코드명/레포명: `nightcap` (프로토타입 파일: nightcap-prototype.html).

---

## 1. 코어 루프

1. **낮 (캡처)** — 유저가 콘텐츠를 보다가 최소 동작으로 캡처를 쌓음. 흐름을 0.5초도 끊지 않음. 화면 전환 없음, 피드백은 진동/알림뿐.
2. **밤 (정리)** — 앱을 열면 오늘의 스택이 카드로 쌓여 있음. **왼쪽 = 빠른 평가(별점 모드 없이 즉시 2.5점 커밋) / 오른쪽 = 이전 항목(직전 판정 취소 후 복귀) / 아래 = 삭제(휴지통행) / 위 = 별점 모드 진입**. 삭제한 캡처는 휴지통에 7일간 보관 후 완전 삭제 — **사진첩 원본도 정리 세션 종료 시 일괄 삭제**(사진첩 청소가 부가가치).
3. **끝 (요약)** — Wrapped식 요약("8장을 1.5분 만에 / 평균 ★3.8 / 최다 출처 릴스") → 공유 카드 생성.
4. **나중 (보관함)** — 별점 필터로 재열람, 친구/가족 공유. 하단 "휴지통 N" 진입점에서 7일 이내 삭제 항목을 복원할 수 있음.

## 2. 기술 스택

- **Expo (React Native)** — 단, **Expo Go로는 불가능한 기능이 코어에 있음** (Android 플로팅 버블, 위젯, 사진첩 삭제 등). 처음부터 `expo prebuild` + **dev client** 전제로 시작할 것.
- `react-native-gesture-handler` + `react-native-reanimated` — 스와이프 엔진
- `expo-haptics` — 판정 햅틱
- `expo-media-library` — 스크린샷 읽기/삭제 (삭제는 OS 확인 다이얼로그 경유)
- 로컬 우선: `expo-sqlite` (또는 Drizzle). 서버 동기화/공유 링크는 v2에서 Supabase.
- 스타일: NativeWind 또는 StyleSheet + 토큰 상수. 프로토타입의 CSS 변수와 1:1 매핑 유지.

```bash
npx create-expo-app nightcap --template
cd nightcap
npx expo install react-native-gesture-handler react-native-reanimated expo-haptics expo-media-library expo-sqlite
npx expo prebuild
```

## 3. 캡처 파이프라인 (플랫폼별)

### 3.1 공통 원칙
- MVP의 캡처 트리거는 **"유저가 직접 찍은 스크린샷"**. 앱은 스크린샷을 감지/수집만 한다. 다른 앱 화면을 직접 캡처하려 하지 말 것 (OS 불가/심사 리젝 사유).
- 메타데이터(출처 앱, 링크)는 MVP에서 **best-effort**: 클립보드에 URL이 있으면 파싱해 붙이고, 없으면 비워둔다. OCR/AI 태깅은 v2.

### 3.2 iOS
- **온보딩에서 안내하는 트리거 2종** (앱이 만드는 게 아니라 유저가 설정):
  - 백탭: 설정 → 손쉬운 사용 → 터치 → 뒷면 탭 2번 → "스크린샷". GIF 온보딩 필수.
  - 단축어 자동화: "스크린샷이 찍히면" → 우리 앱 URL scheme 호출(선택). MVP에선 생략 가능.
- **Share Extension** (권장, native target 추가): 유튜브/릴스 공유 시트 → "별점 매기기". 링크+출처 앱을 정확히 확보하는 유일한 경로. `expo-share-extension` 또는 config plugin으로.
- 앱 포그라운드 진입 시 `MediaLibrary`에서 `mediaSubtypes: screenshot` + 마지막 동기화 이후 생성분을 스캔해 스택에 적재.

### 3.3 Android
- **플로팅 버블**: `SYSTEM_ALERT_WINDOW`(다른 앱 위에 표시) 권한 + Foreground Service. 탭 1회 = 최신 스크린샷 마킹 or 스크린샷 촬영 인텐트. 네이티브 모듈 필요 → config plugin 작성.
- **스크린샷 감지**: Android 14+는 공식 Screenshot Detection API(포그라운드 한정), 그 이하는 MediaStore ContentObserver. 감지 시 조용한 알림 "방금 캡처, 스택에 추가됨".
- 접근성 서비스는 쓰지 않는다 (플레이스토어 심사 리스크).

### 3.4 DRM 분기 (필수)
- 넷플릭스/티빙/디즈니+ 등 `FLAG_SECURE` 콘텐츠는 스크린샷이 검은 화면. 
- 처리: 캡처 이미지가 거의 전부 검정(휘도 임계값)이면 **DRM 카드**로 전환 → 이미지 대신 제목 입력/검색(작품 정보)으로 저장. 프로토타입의 `.drm` 카드가 이 상태의 UI.

## 4. 화면 명세 × 디자인 시스템 매핑

토큰은 하나, 화면별로 밀도와 온도만 달라진다. "여러 스타일 짜깁기"가 아니라 "화면마다 목적이 다른 한 브랜드".

| 화면 | 벤치마킹 | 핵심 |
|---|---|---|
| 홈 (오늘의 스택) | 토스/몽타주 | 무경계 헤더, 큰 숫자 히어로("N장 쌓임"), CTA 1개 |
| 정리 모드 | Apple HIG + Spotify Encore | 카드 피직스가 UX의 전부. OLED 블랙 위 콘텐츠 |
| 완료 요약 | Spotify Wrapped | 색 제한 해제 구간. 평균 별점 행은 앰버 인버트 블록, 대담한 타이포 |
| 보관함 | Pinterest + mymind | 메이슨리(유형별 높이: 쇼츠 세로/유튜브 가로/텍스트), 무장식, 별점 구간 칩 필터, 하단 휴지통 진입점 |
| 휴지통 | 보관함의 하위 화면 | 그리드 + 항목별 복원 버튼, "N일 뒤 완전 삭제" 잔여일 표기 |
| 공유 카드 | Letterboxd | "알고리즘 말고 내가 고른 피드" — 취향 정체성이 카피의 축 |

**완료 요약 화면 상세**:
- 히어로(앰버 인버트 블록): "평균 별점" — 평가한(rated) 캡처의 평균, 소수 1자리, 평가 0장이면 "—"
- 행: 평가한 캡처 N / 보류 · 내일로 이월 N / 삭제 · 사진첩에서 제거 N / 최다 출처
- 하단 카피: "삭제한 N장은 휴지통에 7일 보관 후 완전히 지워져요." + 보류가 있으면 "보류한 N장은 내일 스택 맨 위에서 다시 만나요."

**보관함 화면 상세**:
- 별점 배지: 소수 1자리 표기 (예: ★3.5)
- 필터 칩: 전체 / 4.5↑ / 4.0↑ / 3.0↑ (해당 별점 이상 구간 필터)

## 5. 디자인 토큰

프로토타입(nightcap-prototype.html)의 CSS 변수가 원본. 그대로 이식:

```ts
export const tokens = {
  bg: '#000000',        // OLED 순수 블랙 — 발광 최소화
  surface: '#121214',
  surface2: '#1a1a1e',
  surface3: '#26262b',
  border: '#26262b',
  borderStrong: '#34343a',
  text: '#f4f4f5',
  text2: '#8e8e96',
  text3: '#55555c',
  brand: '#f5b942',     // 앰버 = 별점의 색. 유일한 브랜드 컬러
  brandDim: 'rgba(245,185,66,.14)',
  danger: '#e5484d',    // 버림 전용
  radius: 20,
  radiusSm: 12,
};
```

- 폰트: 시스템 스택 (iOS Apple SD Gothic Neo / Android는 Pretendard 번들 권장). 위계는 색이 아니라 weight(600/700/800) + letterSpacing(-0.02 ~ -0.05em)으로.
- 그라데이션 금지, 장식 아이콘 금지 (탭바 2개 예외). 요약 화면만 앰버 블록 허용.

## 6. 스와이프 엔진 스펙 (프로토타입 검증값)

제스처 맵 — 가로축 = 탐색, 세로축 = 판정:

| 방향 | 동작 | 비고 |
|---|---|---|
| ← 왼쪽 | 빠른 평가 | 별점 모드 없이 즉시 2.5점(평가 생략 기본값)으로 커밋 — "후딱후딱" 넘기기용. 더 이상 이월하지 않음(`docs/decisions/hold-becomes-quick-rate.md`) |
| → 오른쪽 | 이전 항목 | 직전 판정을 되돌리고 그 카드를 맨 위로 (이력 없으면 스프링백 + 토스트) |
| ↓ 아래 | 삭제 | 사진첩에서도 제거. 실수 방지 위해 임계값 높게 |
| ↑ 위 | 별점 모드 진입 | 아래 상세 |

```ts
const TH_X = 92;        // 좌우 판정 임계값 (px)
const TH_DOWN = 110;    // 아래(삭제) — 좌우보다 높게, 파괴적 동작 보호
const TH_UP = 110;      // 위(별점 모드 진입)
const ROT = 0.055;      // rotate(deg) = dx * ROT (가로 이동에만 적용)
// 축 분리: upness = max(0, -dy - |dx|*0.6), downness = max(0, dy - |dx|*0.6)
// 복원 스프링: cubic-bezier(.2, 1.4, .3, 1) 0.4s
// 퇴장 0.38s: hold(←빠른평가, 커밋은 rate)→(-480,-30,-20deg) / drop→(0,+640,5deg) / rate→(0,-660,-4deg,scale 1.04)
// 햅틱: rate = notificationSuccess, drop = impactLight (← 빠른 평가도 커밋은 rate라 notificationSuccess)

const DEPTH_SCALE_STEP = 0.045;        // 뒤 카드: scale(1 - depth*DEPTH_SCALE_STEP)
const DEPTH_TRANSLATE_Y_STEP = 14;     // 뒤 카드: translateY(depth*DEPTH_TRANSLATE_Y_STEP)
const DEPTH_TRANSITION_DURATION = 350; // 카드 스택 전환 0.35s
const DEPTH_EASING = 'cubic-bezier(.2, .8, .2, 1)';
```

**별점 모드**: 위 스와이프가 TH_UP을 넘기면 덱의 카드는 중앙으로 스프링백(도킹 없음)하고, RN `Modal`(transparent, statusBarTranslucent)이 모든 뷰 위에 떠서 미니 프리뷰(썸네일/스켈레톤+제목+출처) + 별 5개 바를 보여줌 — **항상 2.5(평가 생략 기본값)로 시작**해서 나타남 — 드래그 거리 기반 프리필은 없음(고정된 드래그 구간이 0.5~5.0 전체를 선형으로 커버할 수 없어 플릭만으로는 5.0에 도달 불가능한 설계 결함이었음).
- ~~카드가 상단에 도킹(translateY -152, scale .9)~~은 최초 설계였으나 Android에서 zIndex로 카드를 별점 레이어 위에 띄우는 방식이 z-order를 보장하지 못해(`docked ? 30 : 10 - depth`가 레이어의 zIndex 20보다 커짐) Modal 방식으로 교체됨 — `docs/decisions/rate-mode-modal-not-docking.md`
- 별 바를 가로 드래그 → 0.5 단위로 값 조정(반 별 채움), 손을 떼면 그 값으로 확정
- **바 바깥 아무 곳 탭 = 2.5점 고정 저장** (평가 생략의 기본값)
- 별점 모드 중 덱 드래그는 잠금
- Android 백버튼(Modal `onRequestClose`) = 평가 취소, 카드 스택 유지(커밋 아님)

- 카드 스택: 상위 3장 렌더, 뒤 카드는 `DEPTH_SCALE_STEP`/`DEPTH_TRANSLATE_Y_STEP`/`DEPTH_TRANSITION_DURATION`/`DEPTH_EASING` (위 코드 블록).
- 접근성: 스와이프 대신 버튼 4개(보류/삭제/별점/이전)로도 판정 가능하게 (VoiceOver/TalkBack). 별점 모드는 키보드 ←→ 0.5 조정 / Enter 확정 / Esc 2.5와 동일한 시맨틱 — 조정/확정/생략(바깥 탭) 모두 스크린리더로 접근 가능해야 함.
- 되돌리기(undo) 전용 버튼 UI는 없음 — 오른쪽 스와이프(또는 "이전" 버튼)가 대체.
- 하단 제스처 힌트: "← 보류 · ↓ 삭제 · ↑ 별점 · → 이전"

## 7. 데이터 모델 (SQLite)

```sql
CREATE TABLE captures (
  id            TEXT PRIMARY KEY,          -- uuid
  created_at    INTEGER NOT NULL,          -- 캡처 시각 (epoch ms)
  triaged_at    INTEGER,                   -- null = 아직 스택에 있음
  deleted_at    INTEGER,                   -- 휴지통 진입 시각 (epoch ms), null = 휴지통 아님
  image_uri     TEXT,                      -- 로컬 사본 경로 (원본 삭제 대비 앱 샌드박스로 복사)
  asset_id      TEXT,                      -- MediaLibrary asset id (원본 삭제용)
  source_app    TEXT,                      -- '유튜브 쇼츠' 등, nullable
  source_url    TEXT,                      -- 클립보드/공유시트에서 확보, nullable
  title         TEXT,                      -- DRM/수동 입력, nullable
  stars         REAL,                      -- 0.5~5.0 (0.5 단위), null = 무평점
  verdict       TEXT CHECK(verdict IN ('rated','hold','drop')),
  held_count    INTEGER DEFAULT 0,         -- 미사용(과거 "보류=내일 이월" 흔적, 아래 각주)
  is_drm        INTEGER DEFAULT 0,
  kind          TEXT NOT NULL DEFAULT 'video' CHECK(kind IN ('video','text','drm')),
  channel       TEXT,                      -- 출처 채널/핸들 (예: '@요리하는_공대생'), source_url과 별개
  progress      TEXT                       -- 영상 시청 진행률 (예: '62%'), video kind만
);
CREATE INDEX idx_captures_stack ON captures(triaged_at) WHERE triaged_at IS NULL;
CREATE INDEX idx_captures_stars ON captures(stars, triaged_at);
CREATE INDEX idx_captures_trash ON captures(deleted_at) WHERE deleted_at IS NOT NULL;
```

- `kind`/`channel`/`progress`는 위 §7 초안에 없던 컬럼: `is_drm` 플래그만으로는 video/text를 구분할 수 없고, `source_url`은 채널 핸들과 의미가 달라 카드 렌더링(§6 카드 UI)에 반드시 필요해 마이그레이션 1에 포함시켰다.
- `verdict` CHECK의 `'hold'`와 `held_count` 컬럼은 과거 "보류=내일 이월" 설계의 흔적으로 스키마에는 남아있지만 더 이상 어떤 코드도 쓰지 않는다(← 스와이프는 즉시 `rated`로 커밋, `docs/decisions/hold-becomes-quick-rate.md`) — 기존 설치본 마이그레이션 비용 대비 이득이 없어 컬럼 제거는 보류.
- 평가 생략 기본값 = 2.5 (별점 모드 바깥 탭, 그리고 ← 빠른 평가 스와이프 모두 이 값으로 즉시 커밋).
- verdict 'drop' 행은 통계용으로 남기되, 휴지통 보관 기간(7일) 동안은 image_uri/asset을 유지하고 기간 만료 후 이미지 파일만 삭제(행 자체는 유지).
- 사진첩 원본 삭제는 스와이프 시점이 아니라 **정리 세션 종료 시 일괄** 처리(§8). 별도 pending 테이블 없이, "`deleted_at`이 있고 asset이 아직 존재" 조건으로 다음 세션에서 재조회해 큐를 재구성할 수 있어야 함(강제종료 유실 대비).

## 8. 휴지통 & 삭제 플로우

- 아래 스와이프(또는 삭제 버튼) → `verdict='drop'`, `deleted_at=now`. 사진첩 원본은 그대로 두고, 앱 샌드박스 사본(`image_uri`)만 유지.
- **사진첩 원본 일괄 삭제**: 스와이프마다 하지 않고, 정리 세션 종료 시 아직 asset이 남아있는 drop 행을 모아 `MediaLibrary.Asset.delete(assets)` 1회 호출(iOS 확인 다이얼로그를 세션당 1번으로 묶기 위함; SDK57부터 구 `deleteAssetsAsync` 프리 함수 대신 클래스 기반 API 사용). "이번 세션의 drop만" 필터링하지 않고 매번 "아직 asset이 남아있는 모든 drop 행"을 대상으로 하는 것 자체가 아래 강제종료 재시도 요구사항을 자동으로 만족시킨다 — 세션 종료 트리거와 앱 시작(강제종료 복원) 트리거가 같은 함수를 공유.
- 첫 drop 시 **1회 한정** 토스트: "휴지통으로 이동 · 7일 뒤 완전 삭제".
- 보관함 하단 "휴지통 N" 진입점 → 휴지통 화면: 그리드 + 항목별 복원 버튼. 복원 = `deleted_at`/`verdict`/`triaged_at`을 초기화 → 오늘/내일 스택으로 복귀.
- **앱 시작 시 purge 작업**: `deleted_at`이 7일 지난 행의 이미지 파일(`image_uri`)을 삭제. 행 자체는 통계용으로 유지.
- **강제종료 복원력**: 정리 세션 중간에 앱이 죽어도 일괄 삭제 큐가 유실되지 않도록, "`deleted_at` 존재 + asset이 아직 사진첩에 남아있음" 조건으로 다음 세션 시작 시 삭제 대상을 재구성해 재시도한다.

## 9. MVP 범위

**포함**: 스크린샷 스캔 적재(iOS/Android) · 정리 모드(스와이프+햅틱, "이전" 스와이프가 undo 겸임) · 삭제 시 휴지통 이동(7일 보관) + 세션 종료 시 사진첩 일괄 삭제 · 휴지통 복원 · Wrapped 요약 · 보관함 메이슨리+별점 구간 필터 · 공유 카드 이미지 저장(view-shot) · 백탭/버블 온보딩(GIF) · DRM 분기 · 다크 온리.

**제외 (v2 백로그)**: Share Extension 딥 연동 · 클립보드 URL 자동 파싱 고도화 · OCR/AI 태깅(Claude API로 스샷 → 앱/제목 추론) · Supabase 동기화 & 웹 공유 링크 · 홈 위젯 · 주간/월간 Wrapped · 친구 팔로우.

## 10. 마일스톤

1. **W1**: Expo prebuild 세팅, 토큰/네비게이션 뼈대, 정리 모드 스와이프 엔진 (프로토타입 스펙 이식) — 목데이터로 손맛부터 검증
2. **W2**: MediaLibrary 스캔 파이프라인 + SQLite(휴지통 포함) + 세션 종료 시 일괄 삭제 플로우, DRM 분기
3. **W3**: 보관함 메이슨리 + 휴지통 화면, Wrapped 요약, 공유 카드 캡처, 온보딩
4. **W4**: Android 버블 네이티브 모듈 (가장 리스키 — 실패 시 알림 기반으로 폴백), 내부 테스트

## 11. Claude Code 착수 프롬프트 (복붙용)

```
PROJECT.md와 nightcap-prototype.html을 읽고 시작해.
1단계: Expo dev client 프로젝트 세팅 후, 프로토타입의 정리 모드(스와이프 엔진)를
react-native-gesture-handler + reanimated로 이식해. 임계값·회전 계수·스프링 커브·
별 점등 로직은 PROJECT.md 6번 스펙을 그대로 따를 것. 목데이터 8장으로 시작하고,
디자인 토큰은 5번 섹션 값을 상수 파일로 만들어 사용해. 스와이프 손맛 검증이 1순위다.
```