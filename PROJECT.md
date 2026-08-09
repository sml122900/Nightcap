# PROJECT.md — Nightcap (나이트캡)

> 폰 보다가 마주친 모든 콘텐츠를 1탭으로 잡아두고, 자기 전에 스와이프로 별점 정리하는 앱.
> 이름의 뜻: 잠들기 전 마지막 한 잔(nightcap) = 잠들기 전 마지막 의식. cap은 캡처의 캡.
> 정체성: Nightcap = **나에게 공유하는 숏폼 콘텐츠 박물관**. 릴스방·단톡방은 일주일이면 죽지만, 재밌게 본 콘텐츠는 그 뒤에도 생각난다 — 죽은 채팅방에 다시 보내는 대신 자신에게 보내고, 별점으로 큐레이션해서 언제든 다시 꺼내보는 개인 아카이브. 기존 "도파민 루프의 출구" 정체성은 밤 정리 세션의 정체성으로 유지(수집=낮/박물관, 정리=밤/출구).
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

## 3. 캡처 파이프라인

**W3-1 도그푸딩 이후 변경**: 최초엔 스크린샷 자동 스캔이 유일한 유입 경로였으나(§3.5 참고), 도그푸딩 결과 전 스샷 자동 유입이 업무/일회성 캡처까지 스택에 밀어넣어 "정리가 숙제가 되는" 문제가 확인됨. → **공유시트("공유하기" → Nightcap) 수신을 주 경로로 전환, 자동 스캔은 설정에서 켜는 옵션(기본 OFF)으로 강등**. "의도적으로 보낸 것만 담는다"는 원칙이 우선.

### 3.1 공통 원칙
- 유입 경로는 두 가지: **공유시트(주 경로)** / **스크린샷 자동 스캔(옵션, 기본 OFF)**. 둘 다 최종적으로 `captures` 테이블에 같은 스키마로 적재되며, 이후 파이프라인(휴지통/보관함/정리 세션)은 유입 경로를 구분하지 않는다.
- 공유 수신 시 앱이 열리면 토스트("스택에 담았어요")만 띄우고 **정리 모드(스와이프 UI)로 바로 진입하지 않는다** — 낮의 흐름을 끊지 않는 원칙. 그래서 정리 모드(`TriageScreen`)와 분리된 홈 화면(`HomeScreen`, 오늘 담은 개수 + "정리 시작" 버튼)이 있다.

### 3.2 공유시트 (주 경로) — `expo-share-intent`
- 이미지 공유: 기존 스크린샷 스캔 파이프라인의 사본복사(`services/screenshotScan.ts`의 `copyToSandbox`)와 DRM 판별(`isLikelyDrm`)을 그대로 재사용(`services/shareIntake.ts`). `asset_id`가 없으므로 파일 SHA-256 해시(`content_hash` 컬럼, 부분 유니크 인덱스)로 재공유 dedup.
- 텍스트/URL 공유: `source_url` 저장, URL 호스트에서 출처 앱 추론(`constants/sourceApps.ts`의 매핑 상수로 격리 — youtube.com/youtu.be→유튜브, instagram.com→인스타, netflix.com→넷플릭스 등). 공유 텍스트/웹페이지 메타에서 제목 후보 추출해 `title`에, 없으면 URL 자체로 폴백. `kind='text'`, 이미지 없음.
- Android는 `androidIntentFilters: ["text/*", "image/*"]`, iOS는 `iosActivationRules`(WebURL/WebPage/Image)로 app.json 플러그인 설정. 네이티브 모듈이라 `expo prebuild` + dev-client 리빌드 필요(Expo Go 불가).
- **Direct Share(Sharing Shortcuts) 등록**(W3-3): 공유시트 "더보기"를 뒤지지 않고 상단 행에서 바로 고를 수 있게 `res/xml/shortcuts.xml`(`<share-target>` + 정적 shortcut)과 `MainActivity`의 `android.app.shortcuts` meta-data를 config plugin(`plugins/withDirectShareShortcut.js`)으로 생성한다. `share-target`의 `targetClass`는 expo-share-intent가 이미 intent-filter를 붙여둔 `.MainActivity`라 수신 코드는 그대로다. shortcut 자체의 intent는 `ACTION_SEND`가 아니라 `ACTION_MAIN` — 런처 롱프레스로 실행하면 payload 없는 SEND가 들어와 빈 인테이크를 시도하게 된다.

### 3.3 스크린샷 자동 스캔 (옵션, 기본 OFF)
- 설정 화면(`SettingsScreen`) 토글 1개, `meta` 테이블에 저장(`services/settings.ts`). OFF 상태에선 사진 라이브러리 권한 요청 자체를 하지 않음 — 온보딩 마찰 감소.
- ON일 때 로직은 기존과 동일: 앱 포그라운드 진입 시 `MediaLibrary` `Screenshots` 앨범(+파일명 폴백)을 마지막 동기화 이후로 스캔, 사본복사 → DRM 판별 → INSERT.
- Android 플로팅 버블/iOS 백탭 온보딩 등 "자동 감지" 강화는 이 옵션 경로에 한해 v2 이후 고려(현재는 포그라운드 스캔만).

### 3.3-1 클립보드 URL 병합 (W3-3)
- 문제: 스샷/이미지로 담은 카드는 원본으로 돌아갈 길이 없다(링크 공유 카드와 달리 `source_url`이 비어있음). 버블의 선행 작업이 아니라 이 공백 자체를 메우는 단독 기능.
- 규칙: 이미지 유입(자동 스캔 / 공유시트 이미지) 시점에 클립보드를 읽어 URL 형태면, **직전에 처리한 문자열과 다를 때만** 신선하다고 보고 병합(`services/clipboardLink.ts`, 마지막 문자열은 `meta.last_clipboard_url`).
- Android에는 클립보드 타임스탬프 API가 없어 "직전 30분 이내"를 직접 잴 수 없다 — 문자열 변화 감지가 실질 게이트다. 같은 문자열이 반복 등장하면 예전에 복사해 둔 것으로 보고 병합하지 않는다(오염 방지 우선).
- 병합 시 `source_url`/`has_link=1`/`source_app`을 채우고 제목·게시자는 `urlMetadata`로 보강한다. **`image_uri`는 건드리지 않는다** — 캡처 자체가 사용자가 찍은 스샷인데 og:image로 덮으면 정작 담은 것을 버리게 된다(링크 공유 경로와 다른 점).
- 스캔 배치에선 새로 들어온 첫 장에만 시도한다. 클립보드 링크는 하나뿐이라 여러 장에 붙이면 추측이 된다.
- UI: 카드에 "🔗 링크 포함" 라벨(사용자가 규칙을 학습해야 함) + 보관함 상세에 "링크 해제"(잘못 붙은 링크를 뗄 수 없으면 기능 자체가 불신됨).

### 3.4 DRM 분기 (필수)
- 넷플릭스/티빙/디즈니+ 등 `FLAG_SECURE` 콘텐츠는 스크린샷이 검은 화면.
- 처리: 캡처 이미지가 거의 전부 검정(휘도 임계값)이면 **DRM 카드**로 전환 → 이미지 대신 제목 입력/검색(작품 정보)으로 저장. 공유시트 이미지 경로와 자동 스캔 경로 모두 동일한 `isLikelyDrm` 판별을 거친다.

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

**공유 카드 화면 상세**(`ShareCardScreen`, W3-3):
- 구성: 상단 카피("알고리즘이 고른 게 아니라 / 내가 고른 것들") / 별점 상위 **4~6장** 그리드(`CoverImage` 재사용, 별점 배지) / 하단 기간 · 평균 별점 · 총 개수
- 셀은 `aspectRatio: 0.72`의 **세로형**이다. 콘텐츠가 숏폼 세로 스크린샷이라 가로 셀은 무엇을 담았는지가 안 보여 카드의 목적이 성립하지 않는다. 세로로 길어지는 건 공유 목적지(인스타 스토리 9:16)에 오히려 맞는다
- 열 수는 장수에 따라 갈린다 — **4장은 2열(2×2)**, 5·6장은 3열. 4장을 3열에 깔면 둘째 행에 빈 칸이 남기 때문이다. 5장(3+2)처럼 마지막 행이 덜 차면 좌측 정렬로 두고 남는 칸을 늘려 채우지 않는다
- 상한이 9가 아니라 6인 이유: 세로형 셀에서 3행이면 카드가 공유 이미지로 쓰기엔 지나치게 길어진다. 실측 기준 6장 975×1301px(세로/가로 1.33), 4장 975×1696px(1.74 — 2열이라 셀이 커져 오히려 더 길다)
- `captureRef`는 카드 뷰에만 걸어 헤더·버튼이 이미지에 들어가지 않게 한다. 저장 후 `Sharing.shareAsync`
- 진입: 완료 요약 + 보관함 상단. 별점 4장 미만이면 두 곳 다 **버튼 자체를 숨긴다**(보관함은 별점 필터와 무관하게 전체 기준)

**설정 화면 개발자 섹션**(W3-3 A-3): 최근 14일 세션 수/일평균, 완주 수, 보류 비율, 세션 소요 중앙값, 캡처 수, 링크 비율, 유입 경로 분포, 클립보드 병합 누적. 리터럴 숫자만, 차트 없음. 도그푸딩은 릴리즈 빌드로 하므로 `__DEV__`만으로 감추면 정작 볼 수 없어 버전 라벨 5탭 히든 게이트를 함께 둔다.

**보관함 화면 상세**:
- 별점 배지: 소수 1자리 표기 (예: ★3.5)
- 필터 칩: 전체 / 4.5↑ / 4.0↑ / 3.0↑ (해당 별점 이상 구간 필터)

**화면별 테마 배정**(§5.3):

| 화면 | 테마 |
|---|---|
| 온보딩 / 홈 / 완료 요약 / 보관함 / 휴지통 / 설정 / 권한거부 | 테마 따름 |
| 정리 모드(별점 모달 포함) | 시네마 고정 |
| 보관함 상세 | 혼합 — 이미지=시네마 / 메타·편집=테마 |
| 공유 카드 | `cardRef` 안=다크 고정 / 바깥 크롬=테마 따름 |

## 5. 디자인 시스템 (토큰 + 테마)

단일 소스는 `app/src/theme/tokens.ts`. **이 파일 밖에 색상 리터럴을 두지 않는다.**
(프로토타입 CSS 변수에서 출발했지만 라이트 모드 도입 시점에 역할 기반 이름으로 재정의됐다 —
`surface2`/`text3` 같은 값 기반 이름은 라이트에서 뒤집히면 이름이 거짓말이 되기 때문.)

### 5.1 원칙 (충돌 시 이 순서)

1. 콘텐츠가 주인공. 커버 이미지가 있는 화면에서 UI는 물러난다.
2. 밤이 기본. 라이트는 동등한 시민이되 기본값은 아니다.
3. 강조색은 하나 — 별점 골드(`accent`). 나머지는 중립 + 의미색(`danger`/`defer`)뿐.
4. 손맛 상수 불가침. 스와이프 임계값·회전·스프링은 §6/`constants/swipeEngine.ts` 소관이고
   디자인 토큰과 같은 파일에 두지 않는다.

### 5.2 팔레트 3종

| 팔레트 | 언제 |
|---|---|
| `dark` | 기본값. `theme_mode`가 dark이거나 system→다크일 때 |
| `light` | `theme_mode`가 light이거나 system→라이트일 때 |
| `cinema` | 테마 무관 고정. 콘텐츠가 주인공인 서페이스 전용 |

토큰 이름은 역할 기반: `bg` / `surface` / `surfaceRaised` / `border` / `textPrimary` /
`textSecondary` / `textTertiary` / `accent` / `accentMuted` / `onAccent` / `danger` /
`dangerMuted` / `defer` / `deferMuted` / `control` / `overlay`,
그리고 판정 오버레이용 반투명 `accentScrim`·`dangerScrim`·`deferScrim`,
사용자 스샷 위에 얹혀 전 팔레트 공통인 `imageScrim`·`imageScrimSoft`·`onImage`·`shadowColor`.

라이트의 `accent`(#C99400)가 다크(#F5C451)보다 어두운 건 의도 — 흰 배경에서 4.5:1 확보용.

그림자는 **라이트에만** 있다(`shadow.card`/`shadow.modal`). 다크에서 층 구분은 그림자가 아니라
`surface` → `surfaceRaised` 명도차로 만든다. 예외는 정리 덱 카드 하나 — 거기선 그림자가 장식이
아니라 카드끼리 겹친 걸 분리하는 유일한 수단이다.

그 외: `space`(4/8/12/16/24/32/40), `radius`(chip 8 / card 12 / sheet 20 / full 999),
`type`(display/title/heading/body/meta/caption), `motion`(fast 140 / base 220 / slow 380).
폰트는 시스템 스택 유지. 위계는 색이 아니라 weight + letterSpacing으로. 그라데이션·장식 아이콘 금지.
`allowFontScaling`은 켜두되 App.tsx에서 전역 `maxFontSizeMultiplier = 1.4`로 상한을 건다.

### 5.3 시네마 서페이스

`ResolvedTheme`를 무시하고 항상 어두운 팔레트를 쓰는 영역:

- **Triage 화면 전체** (덱·카드·판정 오버레이·별점 모달·하단 컨트롤)
- **LibraryDetail의 이미지 영역만** — 하단 메타/편집은 테마를 따르고, 경계에 구분선을 두지 않는다
- 커버 이미지 위에 얹히는 배지(보관함 그리드 별점 배지 등)

**공유 카드는 시네마가 아니라 `dark` 고정이다.** 출력물이라 뷰어 테마에 따라 결과 PNG가 달라지면 안 된다.
헤더/버튼 등 `cardRef` 밖 크롬은 테마를 따른다.

### 5.4 사용법

```ts
const useStyles = makeStyles((t) => ({ screen: { backgroundColor: t.c.bg } }));
// 컴포넌트 안에서
const styles = useStyles();          // 테마 따름
const styles = useStyles('cinema');  // 시네마 고정
const styles = useStyles('dark');    // 다크 고정(공유 카드)
```

- 팔레트별로 1회만 `StyleSheet.create`되어 캐시된다. 그래서 팩토리 안에서 `t.mode`/`t.resolved`로
  분기하면 안 된다 — 팔레트로만 갈린다.
- 색을 값으로 써야 하면(`placeholderTextColor`, `ActivityIndicator color` 등) `useTheme()`/`useCinema()`.
- 화면마다 `<SystemBars />`를 선언한다(시네마 화면은 `surface="cinema"`). StatusBar 아이콘과 Android
  내비바 버튼 색이 여기서 갈린다.

### 5.5 저장/부팅

`meta.theme_mode`(migration v7, 기본 `'dark'`). `ThemeProvider`가 이 값을 읽기 전에는 children을
렌더하지 않는다 — 다크로 그렸다가 라이트로 튀는 플래시를 막기 위해서다.
`'system'`이 실제로 동작하려면 `app.json`의 `userInterfaceStyle`이 `"automatic"`이어야 한다
(`"dark"` 고정이면 `useColorScheme()`이 항상 dark를 반환한다).

### 5.6 추출색(image-colors) 규칙

`theme/colorClamp.ts`(순수 함수 + `npm test`). 커버에서 뽑은 지배색은
① 배경 틴트로만 쓰고 텍스트/아이콘 색으로는 절대 쓰지 않으며,
② 채도 0.5 상한 + 명도를 다크 0.12~0.28 / 라이트 0.82~0.94로 리맵하고,
③ 그러고도 텍스트와 4.5:1 미달이면 폐기하고 `surface`로 떨어진다(폴백이 기본값).
현재 이 클램프를 소비하는 화면은 없다. 보관함 셀 틴트는 후보에서 뺐다 — 셀에 커버 이미지가 꽉 차서
틴트가 보이지 않는다. 남은 후보는 **LibraryDetail 메타 영역 배경** 하나(이미지 아래가 커버 색을 옅게
받으면 시네마↔테마 경계가 자연스러워진다). 경계를 실기기로 보고 어색하면 붙인다 —
`docs/verification-checklist.md`.

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
  progress      TEXT,                      -- 영상 시청 진행률 (예: '62%'), video kind만
  intake_source TEXT,                      -- (v6) 'screenshot_scan'|'share_image'|'share_url'|'bubble'(예약)
  has_link      INTEGER NOT NULL DEFAULT 0 -- (v6) 링크 보유 여부, 집계 편의용
);

-- (v6) 도그푸딩 계측: W4 플로팅 버블 도입 여부를 감이 아니라 데이터로 정하기 위한 세션 기록
CREATE TABLE triage_sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at  INTEGER NOT NULL,
  ended_at    INTEGER,
  completed   INTEGER NOT NULL DEFAULT 0,  -- 끝까지 갔는지 vs 중도 이탈
  total_cards INTEGER NOT NULL DEFAULT 0,
  kept        INTEGER NOT NULL DEFAULT 0,  -- 별점 모드로 실제 평가
  deferred    INTEGER NOT NULL DEFAULT 0,  -- ← '보류' 스와이프(= rate@2.5 즉시 커밋)
  deleted     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_captures_stack ON captures(triaged_at) WHERE triaged_at IS NULL;
CREATE INDEX idx_captures_stars ON captures(stars, triaged_at);
CREATE INDEX idx_captures_trash ON captures(deleted_at) WHERE deleted_at IS NOT NULL;
```

- `kind`/`channel`/`progress`는 위 §7 초안에 없던 컬럼: `is_drm` 플래그만으로는 video/text를 구분할 수 없고, `source_url`은 채널 핸들과 의미가 달라 카드 렌더링(§6 카드 UI)에 반드시 필요해 마이그레이션 1에 포함시켰다.
- `verdict` CHECK의 `'hold'`와 `held_count` 컬럼은 과거 "보류=내일 이월" 설계의 흔적으로 스키마에는 남아있지만 더 이상 어떤 코드도 쓰지 않는다(← 스와이프는 즉시 `rated`로 커밋, `docs/decisions/hold-becomes-quick-rate.md`) — 기존 설치본 마이그레이션 비용 대비 이득이 없어 컬럼 제거는 보류.
- 평가 생략 기본값 = 2.5 (별점 모드 바깥 탭, 그리고 ← 빠른 평가 스와이프 모두 이 값으로 즉시 커밋).
- `intake_source` 백필(v6)은 기존 컬럼으로 **확정** 가능한 것만 채운다(`asset_id`⇒scan, `content_hash`⇒share_image, 둘 다 없고 `source_url`만 있으면 share_url). 나머지(목데이터)는 NULL 유지 — 추정값을 넣으면 이 계측이 재려는 비율 자체가 오염된다.
- `triage_sessions.deferred`는 '보류'가 rate@2.5로 즉시 커밋된 뒤에도 "보류 비율" 신호를 유지하기 위한 것이다. 화면 레벨에선 rate 모드의 2.5와 구분되지 않으므로 `TriageDeck`의 `onCommit(..., quickHold)` 플래그로 가른다.
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

**포함**: 스크린샷 스캔 적재(iOS/Android) · 정리 모드(스와이프+햅틱, "이전" 스와이프가 undo 겸임) · 삭제 시 휴지통 이동(7일 보관) + 세션 종료 시 사진첩 일괄 삭제 · 휴지통 복원 · Wrapped 요약 · 보관함 메이슨리+별점 구간 필터 · 공유 카드 이미지 저장(view-shot) · 첫 실행 온보딩(3장 탭 진행: 정체성/공유시트 사용법/자동 수집 권한, `meta.onboarding_completed_at`으로 재실행 시 스킵) · DRM 분기 · 다크 온리.

클립보드 URL 병합은 W3-3에서 **기본 규칙 수준으로 포함**됐다(§3.3-1). 여기서 더 나가는 것(히스토리 기반 추론, 여러 후보 중 선택 UI 등)은 여전히 v2 백로그.

**제외 (v2 백로그)**: Share Extension 딥 연동 · 클립보드 URL 파싱 고도화 · OCR/AI 태깅(Claude API로 스샷 → 앱/제목 추론) · Supabase 동기화 & 웹 공유 링크 · 홈 위젯 · 주간/월간 Wrapped · 친구 팔로우.

## 10. 마일스톤

1. **W1**: Expo prebuild 세팅, 토큰/네비게이션 뼈대, 정리 모드 스와이프 엔진 (프로토타입 스펙 이식) — 목데이터로 손맛부터 검증
2. **W2**: MediaLibrary 스캔 파이프라인 + SQLite(휴지통 포함) + 세션 종료 시 일괄 삭제 플로우, DRM 분기
3. **W3**: 보관함 메이슨리 + 휴지통 화면, Wrapped 요약, 공유 카드 캡처, 온보딩
3-1. **W3-3**: 도그푸딩 계측(세션 기록 + 개발자 통계) · Direct Share 등록 · 클립보드 URL 병합 · 공유 카드
4. **W4**: Android 버블 네이티브 모듈 (가장 리스키 — 실패 시 알림 기반으로 폴백), 내부 테스트
   - **착수 조건**: W3-3 계측 2주치 데이터를 보고 판단. 미리 정해둔 스펙 — 재탭 병합(5분 내 같은 URL), 피드백 라벨, 하단으로 끌어 임시 숨김
   - iOS 백탭/단축어 자동화는 Android 이후로 유지

## 11. Claude Code 착수 프롬프트 (복붙용)

```
PROJECT.md와 nightcap-prototype.html을 읽고 시작해.
1단계: Expo dev client 프로젝트 세팅 후, 프로토타입의 정리 모드(스와이프 엔진)를
react-native-gesture-handler + reanimated로 이식해. 임계값·회전 계수·스프링 커브·
별 점등 로직은 PROJECT.md 6번 스펙을 그대로 따를 것. 목데이터 8장으로 시작하고,
디자인 토큰은 5번 섹션 값을 상수 파일로 만들어 사용해. 스와이프 손맛 검증이 1순위다.
```