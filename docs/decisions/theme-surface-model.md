# 테마를 "모드"가 아니라 "서페이스"로 모델링 — makeStyles 팔레트 캐시

## Problem

라이트 모드를 넣어야 하는데, 이 앱은 화면마다 테마를 따르는 규칙이 다르다.

- **Triage 덱**은 라이트 모드에서도 어두워야 한다. 화면 대부분이 사용자 스크린샷이고, 흰 배경이 콘텐츠와 싸운다(PROJECT.md §5.1 "콘텐츠가 주인공").
- **공유 카드**는 테마를 따르면 안 된다. `captureRef`로 PNG를 뽑는 출력물이라, 같은 주를 공유한 두 사람이 다른 그림을 얻으면 안 된다.
- **LibraryDetail**은 한 화면 안에서 갈린다 — 이미지 영역은 어둡고, 그 아래 메타·편집 영역은 테마를 따른다.

즉 `resolved === 'dark' ? A : B` 같은 단일 이분기로는 표현이 안 된다. 게다가 기존 코드는 전부 모듈 레벨 `StyleSheet.create`라 테마를 볼 수 없었고, 21개 파일 × 수백 개 스타일을 전부 인라인 객체로 바꾸면 매 렌더 재생성 비용이 붙는다.

`cinemaBg`/`cinemaText` 같은 별도 이름의 토큰을 추가하는 안(원 지시서)은 컴포넌트마다 "여기선 `textPrimary`, 저기선 `cinemaText`"를 골라 쓰게 만든다. 공용 컴포넌트(`CoverImage`, `RateModeLayer`, `CardContent`)가 두 문맥에 다 쓰이므로 그 선택이 호출부마다 갈라진다.

## Action

**토큰 이름을 늘리는 대신 팔레트를 하나 더 만들었다.** `cinema`는 `dark`를 덮어쓴 완전한 `Colors` 객체다 — 이름은 그대로 `bg`/`surface`/`textPrimary`고 값만 다르다. 컴포넌트는 자기가 어느 팔레트로 칠해지는지 모르고, 부모가 서페이스를 지정한다.

```ts
type Surface = 'theme' | 'cinema' | 'dark';
useTheme(surface?)   // 'theme'=사용자 선택 따름 / 'cinema'=콘텐츠 우선 고정 / 'dark'=출력물 고정
```

스타일은 팩토리로 선언하고 훅으로 해소한다:

```ts
const useStyles = makeStyles((t) => ({ screen: { backgroundColor: t.c.bg } }));
const styles = useStyles('cinema');
```

`makeStyles`는 **팔레트별로 결과를 캐시**한다. 팩토리는 앱 수명 동안 최대 3번(dark/light/cinema) 실행되므로 비용 프로파일이 기존 모듈 레벨 시트와 같다. 대가는 제약 하나 — 팩토리 안에서 `t.mode`/`t.resolved`로 분기하면 안 된다(캐시 키가 팔레트뿐이라 틀린 값이 재사용된다). 이 제약은 `makeStyles.ts` 주석에 명시했다.

한 파일 안에서 서페이스가 갈리는 화면은 팩토리를 두 개 둔다. `LibraryDetailScreen`은 `useStyles()` + `useMediaStyles('cinema')`, `ShareCardScreen`은 `useStyles()` + `useCardStyles('dark')`.

부팅 시 `ThemeProvider`는 DB에서 `theme_mode`를 읽기 전까지 children을 렌더하지 않는다. 다크로 그렸다가 라이트로 튀는 한 프레임이, 테마 시스템이 절대 보이면 안 되는 유일한 아티팩트다.

## Result

- 공용 컴포넌트 4개(`CoverImage`/`CardContent`/`RateModeLayer`/`StarRating`)가 문맥을 몰라도 된다. 호출부가 `useStyles('cinema')` 한 줄로 문맥을 주입한다. 지시서대로 `cinemaText` 계열 이름을 따로 뒀다면 이 컴포넌트들 내부에 문맥 분기가 들어갔을 것이다.
- 서페이스가 3개라 "공유 카드는 시네마인가?"라는 질문에 답이 생겼다 — **아니다, `dark`다.** 시네마는 "지금 보는 화면이 어두워야 한다"이고 공유 카드는 "결과물이 항상 같아야 한다"로, 지금은 값이 겹치지만 이유가 다르다. 이름이 갈려 있어 나중에 시네마 값만 조정해도 출력물이 안 흔들린다.
- 색상 리터럴이 `theme/tokens.ts` 한 파일에만 남았다. 구 `constants/tokens.ts`는 소비자가 0이 되어 삭제.
- `bg` 값 재검토(순수 검정 회귀) 같은 논의가 **토큰 파일 한 줄 수정**으로 끝나는 구조가 됐다. 실기기 비교 후 결정 예정(`docs/verification-checklist.md`).

## 관련 커밋/PR

- `f8fbc87` feat(theme): 토큰 정의 + ThemeProvider + migration v7
- `db11fea` refactor(ui): 하드코딩 색상 → 토큰 치환 + 테마/시네마 서페이스 적용
- `1917b65` refactor(ui): StarRating 공통화
