# Android 15 "선택된 사진만 허용"에서 자동수집이 조용히 무력화되는 문제 — 조사

> 조사만 한 문서다. 코드는 바꾸지 않았다. UX 선택지는 아래 §4에서 제시하고 결정은 사용자 몫이다.

## Problem

Android 14부터 사진 권한이 3상태다 — 전체 허용 / **선택된 사진만 허용** / 거부.
Android 15의 Samsung One UI에서는 `MediaLibrary.requestPermissionsAsync`가 클래식 다이얼로그가
아니라 **사진 선택기**를 띄우고, 사용자가 아무것도 고르지 않고 취소해도
`READ_MEDIA_VISUAL_USER_SELECTED`가 부여된다. 즉 "거부하려던 사용자"가 limited 상태로 착지한다.

이 상태에서 `getMediaAccessStatus()`는 `granted: true`를 돌려주므로, 자동수집 토글은 켜진 채
유지되는 게 "정직한" 동작이 된다. 문제는 **그 상태에서 스캔이 무엇을 볼 수 있느냐**다.

## Action — 실기기 측정 (2026-08-09, Galaxy S24 / Android 15)

`pm grant`로 `READ_MEDIA_VISUAL_USER_SELECTED`만 부여하고
(`READ_MEDIA_IMAGES`는 `granted=false`), 자동수집을 켠 뒤 확인했다.

| 확인 항목 | 결과 |
|---|---|
| 앱이 limited를 인지하는가 | **예.** 정리 화면에 `PartialAccessBanner`("일부 사진에만 접근 가능해요 · 스캔 결과가 제한될 수 있어요" + "전체 허용") 정상 노출 |
| 새로 찍은 스크린샷을 감지하는가 | **아니오.** 스크린샷 촬영 → 백그라운드/포그라운드 왕복 후에도 스택 1/1 그대로 |
| 대조군(전체 허용) | 같은 절차로 1/1 → 2/2. 새 스크린샷이 정상 유입 |

즉 **토글 ON · 배너 노출 · 기능 산출물 0**이 동시에 성립한다. 크래시도 에러도 없다.

원인은 `findScreenshotCandidates`가 `MediaLibrary.Album.get('Screenshots')` / 전체 이미지 쿼리로
"새로 생긴 자산"을 찾는 구조라는 점이다. limited 접근에서 앱에 보이는 건 사용자가 명시적으로 고른
자산 집합뿐이고, 촬영된 지 몇 초 된 스크린샷은 그 집합에 들어갈 방법이 없다. 사용자가 매번 선택기를
열어 새 스크린샷을 추가하지 않는 한 이 경로는 구조적으로 0장이다.

### 3상태 판별 가능 여부

가능하다. 이미 `MediaAccessStatus`가 값을 들고 있다:

```ts
{ granted: boolean; accessPrivileges: 'all' | 'limited' | 'none' }
```

- 전체: `granted && accessPrivileges === 'all'`
- 제한: `granted && accessPrivileges === 'limited'`
- 거부: `!granted`

`TriageScreen`이 이미 `accessPrivileges === 'limited'`로 배너를 띄우고 있으니 판별은 검증까지 끝났다.
`READ_MEDIA_IMAGES`의 granted 여부만 보고 판단하면 **틀린다** — limited에서도 그 권한은 false다.

## Result — 선택지와 구현 난이도

배너 자체는 이미 있다. 남은 판단은 "limited일 때 자동수집을 어떻게 취급할 것인가"다.

| 선택지 | 구현 비용 | 평가 |
|---|---|---|
| **A. 토글을 limited에서 켜지 못하게(비활성) 한다** | 낮음. `setAutoScanRequested`가 `accessPrivileges === 'all'`일 때만 `true`를 저장하고, 설정 화면은 limited면 토글을 `disabled` 처리 | 상태와 기능이 어긋나지 않는다. 다만 "왜 안 켜지는지" 설명이 없으면 고장으로 보인다 — 보조 문구가 필수 |
| **B. 재선택 유도 배너를 설정 화면에도 둔다** | 낮음. `PartialAccessBanner`를 설정으로 재사용하고 `presentAccessPicker()`(이미 있음) 연결 | 토글은 켜진 채 두되 "지금은 결과가 0"임을 알린다. 사용자가 무시하면 무력화 상태가 계속된다 |
| **C. 3상태를 그대로 표기한다**(전체/제한/꺼짐) | 중간. 토글을 3상태 표시로 바꿔야 해서 설정 UI 구조가 바뀐다 | 가장 정직하지만 토글 하나짜리 설정 화면의 단순함을 잃는다 |

**의견: A + B 조합이 현실적이다.** limited에서는 토글을 켜지지 않게 막고(A), 그 자리에 "전체 허용"
버튼을 노출한다(B). 근거는 셋이다.

1. 이번에 고친 결함 1의 원칙과 같다 — **저장값이 실제 능력을 따라가야 한다.** limited는 능력이 0인데
   토글만 ON인 상태를 허용하면 설정 화면이 다시 거짓말을 한다.
2. `presentAccessPicker()`가 이미 구현돼 있고 정리 화면 배너에서 쓰이고 있어, 설정으로 옮기는 데
   새 네이티브 작업이 없다.
3. C는 UI 구조 변경이 필요한데, 얻는 정보량이 A+B보다 크지 않다. 사용자가 알아야 할 것은
   "지금 안 된다"와 "어떻게 켜는가" 둘뿐이다.

다만 A에는 함정이 하나 있다. **Android 15에서는 사용자가 "거부"를 고르기 어렵다** — 선택기를 취소하면
limited가 된다. 그래서 A를 넣으면 온보딩에서 토글을 켰다가 선택기를 취소한 사용자가 "토글이 안 켜지는"
경험을 하게 된다. 그 경로에서는 B의 안내가 반드시 함께 보여야 한다.

## 관련 커밋/PR

- 조사만. 코드 변경 없음
- 배경이 된 결함 1 수정: `aad4a31`, `98d4a1c`
