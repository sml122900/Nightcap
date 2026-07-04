# 별점 모드를 카드 도킹 대신 RN Modal로 재설계

## Problem

PROJECT.md §6 초안은 웹 프로토타입을 그대로 이식해, 별점 모드 진입 시 실제 제스처 카드를 `translateY(-152) scale(.9)`로 "도킹"시키고 그 위에 별 바 레이어를 zIndex로 띄우는 구조였다(`TriageCard`의 `docked ? 30 : 10 - depth`, `RateModeLayer`의 `zIndex: 20`). 실기기(Android)에서 확인해보니 도킹된 카드가 별 바 레이어를 덮어 별 바/확정/생략 버튼을 조작할 수 없었다 — 정확히는 `docked` 상태에서 카드의 zIndex가 30으로 뛰어 레이어의 20을 넘어버리는 단순 비교 실수였지만, 더 근본적으로 Reanimated가 구동하는 애니메이션 zIndex/elevation은 Android의 네이티브 뷰 z-order를 안정적으로 보장하지 않는다. 같은 시점에 드래그 verdict 오버레이("별점" 라벨)가 제스처 종료 시 리셋되지 않고 잔존하는 버그도 함께 발견됐다(`dragX`/`dragY`가 별점 모드 진입 분기에서 리셋되지 않음).

## Action

- `RateModeLayer`를 절대 위치 zIndex 레이어에서 RN `Modal`(transparent, statusBarTranslucent, animationType="fade")로 교체 — Modal은 자체 네이티브 윈도우에 렌더되어 zIndex 경쟁 없이 항상 최상단에 보장됨.
- 카드 "도킹" 개념 자체를 폐기: 별점 모드 진입 시 덱의 실제 카드는 그대로 중앙으로 스프링백(`RESTORE_SPRING`)하고 별도 위치로 옮기지 않음. `TriageCard`의 `docked` prop을 `ratingActive`로 대체(의미: 제스처 비활성화 + 중앙 리셋만, 변형 없음).
- Modal 안에는 실제 카드 대신 "미니 프리뷰"(썸네일/스켈레톤 + 제목 + 출처) 컴포넌트를 새로 렌더.
- `TriageCard.pan.onEnd`의 `up > TH_UP` 분기에 `dragX`/`dragY` 리셋을 추가하고, `ratingActive` 진입에 대한 방어적 리셋 이펙트도 추가(제스처를 거치지 않는 접근성 "별점" 버튼 진입 경로 커버) — verdict 오버레이 잔존 버그 함께 수정.
- `ExitingCard`의 'rate' 퇴장 애니메이션은 더 이상 도킹 위치(`RATE_DOCK`)에서 시작하지 않고, 카드가 실제로 있던 중앙(0,0)에서 시작하도록 단순화.
- `swipeEngine.ts`의 `RATE_DOCK`/`RATE_DOCK_DURATION`/`RATE_DOCK_EASING`은 더 이상 쓰이지 않아 제거.
- Modal의 `onRequestClose`(Android 백버튼)는 새 `onCancel` 콜백으로 연결 — 커밋 없이 모달만 닫히고 카드 스택은 그대로 유지.

## Result

- 별 바/확정/생략 버튼이 Android에서 항상 최상단에 보이고 조작 가능해짐 (zIndex 경쟁 자체가 사라짐).
- 별점 모드 진입 직후 뒤 카드에 남아있던 "별점" 라벨 잔존 버그도 함께 해결.
- PROJECT.md §6는 "도킹" 대신 이 Modal 구조를 반영하도록 갱신.

## 관련 커밋/PR

-
