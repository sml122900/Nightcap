# app.json의 `userInterfaceStyle: "dark"`가 `useColorScheme()`을 고정시켜 '시스템' 테마가 죽은 기능이 되는 문제

## 문제상황

테마 3분기(`dark` / `light` / `system`)를 구현하면서 `'system'` 분기를 `useColorScheme()` 구독으로 처리했다.

```ts
const resolved = mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;
```

코드만 보면 맞다. 타입체크도 통과하고, 다크/라이트 수동 선택은 잘 동작한다. 그런데 이 앱의 `app.json`에는 프로젝트 초기부터 이게 들어 있었다:

```json
"userInterfaceStyle": "dark"
```

이 값은 네이티브 레벨에서 앱의 UI 스타일을 **고정**한다. 즉 OS가 라이트 모드여도 `useColorScheme()`이 항상 `'dark'`를 반환한다. 결과적으로 `'system'`을 선택한 사용자는 OS 설정과 무관하게 영원히 다크를 보게 되고, 설정 화면의 세 번째 옵션이 **아무것도 안 하는 버튼**이 된다.

고약한 점: 크래시도 없고 경고도 없고 타입 에러도 없다. 다크 모드로 테스트하면 "잘 동작하는 것처럼" 보인다. OS를 라이트로 바꿔놓고 '시스템'을 눌러봐야만 드러난다.

## 시도한 것들

- 처음엔 `ThemeProvider`의 `useMemo` 의존성 배열을 의심했다 — `system`이 deps에 있는지, 리렌더가 도는지. 다 정상이었다
- `useColorScheme()`이 RN에서 언제 `null`을 반환하는지 확인(초기 프레임). `null`이면 다크로 폴백하게 짜뒀으니 그 경로도 아니었다
- 설정을 DB에 쓰고 읽는 경로를 의심 — `meta.theme_mode`에 `'system'`이 제대로 저장/조회되는지. 정상이었다
- 코드를 더 파는 대신 **"JS가 아니라 네이티브 설정이 값을 강제하는 것 아닌가"** 로 방향을 틀어 `app.json`을 읽었고, `userInterfaceStyle: "dark"`를 발견

## 최종 해결법

```diff
- "userInterfaceStyle": "dark",
- "backgroundColor": "#000000",
+ "userInterfaceStyle": "automatic",
+ "backgroundColor": "#0B0D12",
```

`"automatic"`이어야 `useColorScheme()`이 OS 값을 그대로 흘려준다. 앱의 **기본 테마**는 여전히 다크지만, 그건 이제 네이티브 고정이 아니라 `meta.theme_mode`의 기본값 `'dark'`(migration v7이 명시 삽입)가 담당한다. 관심사가 갈렸다:

- `app.json` = "OS 값을 받아볼 것인가"
- DB = "사용자가 무엇을 골랐는가"

같은 리빌드에서 `expo-navigation-bar`도 추가했는데, 여기도 비슷한 함정이 하나 더 있었다. 플러그인 옵션 `enforceContrast`가 기본 `true`면 OS가 내비바에 대비 스크림을 강제로 깔아 `<NavigationBar style="..." />`가 무시된다. `app.json`에서 명시적으로 꺼야 한다:

```json
["expo-navigation-bar", { "enforceContrast": false }]
```

적용 여부는 prebuild 후 `android/app/src/main/res/values/styles.xml`에서 확인 가능하다:
```
<item name="android:enforceNavigationBarContrast" tools:targetApi="29">false</item>
```

**둘 다 네이티브 설정이라 JS 리로드로는 반영되지 않는다** — `expo prebuild` + 리빌드 1회가 필요하다.

## 이력서 소재 한 줄

타입체크·런타임 에러 없이 조용히 무력화되던 '시스템 테마' 기능의 원인을, JS 상태 관리 코드가 아니라 프로젝트 초기부터 있던 네이티브 설정(`userInterfaceStyle: "dark"`)이 `useColorScheme()`의 반환값을 고정하고 있던 것으로 특정 — "기본값을 강제하는 층"과 "사용자 선택을 저장하는 층"을 분리해 해결했다.
