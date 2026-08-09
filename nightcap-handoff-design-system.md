# Nightcap 변경 지시서 — 디자인 시스템 + 라이트 모드

전제: W3-3(계측/Direct Share/클립보드 병합/공유 카드) 6커밋 완료, 실기기 검증 대기 중.
이 작업은 **기능 변경 0**. 순수 토큰화 + 테마 + 일관성 정리.

---

## 0. 원칙 (충돌 시 이 순서로 판단)

1. **콘텐츠가 주인공.** 커버 이미지가 있는 화면에서 UI는 물러남.
2. **밤이 기본.** 라이트는 동등한 시민이되 기본값은 아님.
3. **강조색은 하나.** 별점 골드. 나머지는 중립 + 의미색(삭제/보류)뿐.
4. **손맛 상수 불가침.** `constants/swipeEngine.ts`(TH_X=92, TH_DOWN=110, TH_UP=110, ROT=0.055)는 이 작업에서 **절대 건드리지 않음**. 디자인 토큰과 물리 상수는 별개 파일로 유지.

---

## 1. 테마 구조

### 1-1. 3분기 + 시네마 예외

```ts
type ThemeMode = 'dark' | 'light' | 'system';  // 저장값
type ResolvedTheme = 'dark' | 'light';          // 실제 적용값
```

- 기본값 `'dark'`. 기존 사용자 마이그레이션도 `'dark'`.
- `'system'`은 `useColorScheme()` 구독.
- **시네마 서페이스**: Triage 화면 전체, LibraryDetail의 이미지 영역은 `ResolvedTheme` 무시하고 항상 어두운 팔레트. 그 위에 얹히는 텍스트/컨트롤도 시네마 토큰 사용.
  - LibraryDetail은 이미지 영역만 시네마, 하단 메타/편집 영역은 테마 따름 → 경계에 구분선 없이 자연 전환.

### 1-2. migration v7

```sql
-- meta 테이블 사용 (이미 설정/워터마크 용도로 존재)
-- key='theme_mode', value='dark'  기본 삽입
```
새 컬럼 불필요. `services/settings`에 getter/setter 추가.

### 1-3. ThemeProvider

`theme/ThemeProvider.tsx` 신규.
- Context로 `{ mode, resolved, tokens, setMode }` 제공
- `useTheme()` 훅
- 앱 루트에서 감쌈. **DB에서 mode를 읽기 전에는 렌더 보류**(다크로 그렸다가 라이트로 튀는 플래시 방지). 스플래시 유지로 처리.
- `useCinema()` — 시네마 서페이스에서 호출하면 테마 무관 다크 토큰 반환

---

## 2. 토큰

`theme/tokens.ts` 신규. **하드코딩 색상 전면 금지.** 이 파일 외에 hex 리터럴이 남으면 안 됨.

### 2-1. 색상 — 시맨틱 네이밍

역할 기반으로만 명명. `gray900` 같은 이름 금지 — 라이트에서 뒤집히면 이름이 거짓말이 됨.

| 토큰 | Dark | Light | 용도 |
|---|---|---|---|
| `bg` | `#0B0D12` | `#FBFAF7` | 화면 최하단 |
| `surface` | `#14171F` | `#FFFFFF` | 카드, 시트, 리스트 아이템 |
| `surfaceRaised` | `#1C2029` | `#FFFFFF` | 모달, 팝오버 (라이트는 그림자로 구분) |
| `border` | `#262B36` | `#E5E2DB` | 구분선, 외곽선 |
| `textPrimary` | `#ECEFF5` | `#16181D` | 본문, 제목 |
| `textSecondary` | `#9AA3B2` | `#5C6270` | 메타 정보, 출처 |
| `textTertiary` | `#626B7B` | `#8B92A0` | 비활성, 플레이스홀더 |
| `accent` | `#F5C451` | `#C99400` | 별점, 주요 CTA |
| `accentMuted` | `#3A3120` | `#F5EBD0` | 별점 배경, 선택 상태 |
| `danger` | `#E5544B` | `#C93A31` | 삭제, 휴지통 |
| `defer` | `#5B8DEF` | `#3B6FD4` | 보류 |
| `overlay` | `rgba(0,0,0,0.72)` | `rgba(0,0,0,0.48)` | 모달 백드롭 |

**시네마 토큰** (테마 무관 고정):
| 토큰 | 값 |
|---|---|
| `cinemaBg` | `#08090C` |
| `cinemaText` | `#ECEFF5` |
| `cinemaTextMuted` | `#8A919E` |
| `cinemaControl` | `rgba(255,255,255,0.10)` |

라이트 액센트가 다크보다 어두운 건 의도. 골드는 흰 배경에서 대비가 죽음 → 4.5:1 확보용.

### 2-2. 타이포

시스템 폰트 유지(커스텀 폰트 도입 안 함 — 번들 비용 대비 효과 낮음).

| 토큰 | size / lineHeight / weight | 용도 |
|---|---|---|
| `display` | 32 / 38 / 700 | Done 화면 요약 숫자, 온보딩 헤드 |
| `title` | 22 / 28 / 700 | 화면 제목 |
| `heading` | 17 / 22 / 600 | 섹션, 카드 제목 |
| `body` | 15 / 21 / 400 | 본문 |
| `meta` | 13 / 18 / 400 | 출처, 날짜 |
| `caption` | 11 / 14 / 500 | 라벨, 칩 |

`allowFontScaling`은 켜두되 `maxFontSizeMultiplier={1.4}` — 마조리 레이아웃 붕괴 방지.

### 2-3. 간격 / 반경 / 그림자

```ts
space = { xs:4, sm:8, md:12, lg:16, xl:24, xxl:32, xxxl:40 }
radius = { chip:8, card:12, sheet:20, full:999 }
```

그림자: **다크는 그림자 금지**(안 보이고 성능만 먹음). 라이트만:
```ts
shadow.card  = { elevation:1, shadowOpacity:0.06, shadowRadius:3, shadowOffset:{w:0,h:1} }
shadow.modal = { elevation:8, shadowOpacity:0.14, shadowRadius:16, shadowOffset:{w:0,h:6} }
```
다크에서 층 구분은 그림자 대신 `surface` → `surfaceRaised` 밝기 차로.

### 2-4. 모션

```ts
motion.fast = 140    // 탭 피드백, 칩 토글
motion.base = 220    // 화면 전환, 모달
motion.slow = 380    // Done 화면 등장, 공유 카드
```
이징은 Reanimated `Easing.out(Easing.cubic)` 통일.
**스와이프 스프링/임계값은 여기 포함 안 됨** — swipeEngine 소관.

---

## 3. 추출색(image-colors) 규칙

`react-native-image-colors`로 뽑은 커버 지배색이 라이트 모드에서 대비를 깨뜨림. 규칙 고정:

1. 추출색은 **배경 틴트로만** 사용. 텍스트/아이콘 색으로 절대 쓰지 않음.
2. 사용 전 클램프: 채도 상한 0.5, 명도는 다크에서 0.12~0.28 / 라이트에서 0.82~0.94로 강제 리맵.
3. 클램프 후에도 `textPrimary`와 대비 4.5:1 미달이면 **추출색 폐기하고 `surface` 사용**. 폴백이 기본값이어야 함.
4. `theme/colorClamp.ts`로 분리. 순수 함수 + 유닛 테스트.

---

## 4. 화면별 적용

| 화면 | 테마 | 비고 |
|---|---|---|
| Onboarding | 따름 | 라이트에서 3장 카피 대비 재확인 |
| **Triage** | **시네마 고정** | 판정 힌트 색: 보류=`defer`, 삭제=`danger`, 별점=`accent` |
| 별점 모달 | 시네마 | Modal 방식 유지(zIndex 실패 이력). 백드롭 `overlay` |
| Done | 따름 | Wrapped 요약, `display` 타이포 |
| Library | 따름 | 메이슨리 그리드. 셀 배경만 추출색 틴트 |
| LibraryDetail | 혼합 | 이미지=시네마 / 메타·편집=테마 |
| Trash | 따름 | `danger`는 액션에만, 리스트 전체를 붉게 칠하지 않음 |
| Settings | 따름 | 테마 3분기 선택 UI 신설 |
| MediaAccessDenied | 따름 | |
| 공유 카드 | **다크 고정** | 출력물. 테마 따라 결과물 달라지면 안 됨 |
| 통계(개발자용) | 따름 | 토큰만 적용, 디자인 투자 X |

---

## 5. UI 검토 — 손볼 항목

핸드오프 기준으로 예상되는 불일치. 실제 코드 보고 판단하되, 아래는 반드시 확인:

1. **StatusBar** — 테마 연동 누락 확률 높음. 라이트에서 아이콘 검정(`barStyle='dark-content'`), 시네마 화면은 항상 밝은 아이콘. 화면별로 선언.
2. **NavigationBar** — edge-to-edge면 하단 바 색도 테마 따라가야 함. `expo-navigation-bar`.
3. **CoverImage 레터박스** — 4개 화면 공유 컴포넌트. 세로/가로 분기 시 남는 여백 색이 화면마다 다를 것. `surface` 또는 `cinemaBg` 중 **부모가 주입**하도록 prop 추가.
4. **🔗 링크 포함 라벨** — 칩 토큰으로 통일(`radius.chip`, `caption`, `accentMuted` 배경).
5. **별점 표시** — 보관함 그리드 / 상세 / 공유 카드 / Done 4곳에 각각 있을 것. `components/common/StarRating.tsx`로 단일화. 크기 prop만 다르게.
6. **터치 타겟** — 최소 44x44. 별점 별 하나하나, 링크 해제 버튼 특히 확인.
7. **빈 상태** — Library 빈 화면, Trash 빈 화면, 정리할 카드 0개일 때. 셋 다 톤 통일 (아이콘 없이 `textSecondary` 한 줄 + 필요 시 CTA).
8. **insets.bottom** — 새로 만든 통계·공유 카드 화면 포함 전 화면 재확인.
9. **로딩/스켈레톤** — URL 메타데이터 가져오는 동안 상태. 스피너 대신 `surfaceRaised` 블록 유지가 덜 깜빡임.

---

## 6. 커밋 분리

1. `feat(theme): 토큰 정의 + ThemeProvider + migration v7`
2. `refactor(ui): 하드코딩 색상 → 토큰 치환` ← 큰 diff, 로직 변경 0
3. `feat(theme): 설정 화면 테마 3분기 + StatusBar/NavigationBar 연동`
4. `feat(theme): 시네마 서페이스 (Triage, LibraryDetail 이미지)`
5. `refactor(ui): StarRating·CoverImage 공통화 + 빈 상태 통일`
6. `feat(theme): 추출색 클램프 + 폴백`

2번 커밋 후 한 번 빌드해서 다크 모드가 **이전과 픽셀 동일**한지 확인. 다르면 토큰 값이 틀린 것.

---

## 7. 주의

- 네이티브 모듈 추가 없음(`expo-navigation-bar` 미설치 시에만 리빌드 1회)
- 빌드 전 셸: `$env:TMP='C:\tmp_expo'; $env:TEMP='C:\tmp_expo'; $env:GRADLE_USER_HOME='C:\gradle_home'`
- 빌드 후 `am start` 금지
- PROJECT.md에 디자인 시스템 섹션 추가
- 이 작업 중 기능 동작 변경이 필요해 보이면 **하지 말고 보고**. 순수 리페인트 커밋이어야 롤백이 쉬움.
