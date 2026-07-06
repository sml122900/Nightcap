# 릴리즈 빌드 후 `expo run:android`가 기기 화면 잠금 때문에 무한정 멈춰있던 문제

## 문제상황

JVM 타깃 문제(`docs/troubleshooting/kotlin-jvm-target-mismatch-release-build.md`)를 고치고 `expo run:android --variant release`를 백그라운드로 재실행했는데, 1시간 가까이 아무 출력도 없이 "진행 중"처럼 보였다. 사용자가 반복해서 "아직도?"라고 물어 근본 원인을 확인해야 했다.

## 시도한 것들

- Gradle 데몬(`java.exe`) 5초 구간 CPU 사용량을 샘플링 → 0.09초. 컴파일이 실제로 돌고 있다면 CPU를 거의 다 써야 하는데 사실상 유휴 상태였다 — "느린 것"이 아니라 "멈춘 것"이라는 신호
- `android/app/build/outputs/apk/release/app-release.apk` 파일 타임스탬프 확인 → 빌드 시작 7분 만에(01:27) 이미 생성 완료돼 있었다. 즉 컴파일은 진작 끝났고, 그 이후 단계에서 멈춘 것
- `adb shell pm dumpsys package com.anonymous.nightcap`로 `lastUpdateTime` 확인 → 01:28:34, APK 생성 직후 설치도 이미 성공한 상태였다
- 남은 용의자는 설치 후 앱 자동 실행(`am start`) 단계뿐이었다. `adb shell dumpsys power`로 확인하니 `mWakefulness=Dozing`(화면 잠김) — 기기가 잠들어 있어서 CLI가 앱을 포그라운드로 올리는 마지막 단계에서 응답 없이 계속 대기하고 있었던 것으로 추정(활성 자식 프로세스도 전혀 없어 진짜 응답 대기 상태였음을 재확인)

## 최종 해결법

빌드+설치는 이미 끝난 상태였으므로, 멈춰있던 CLI 프로세스(`expo run:android` node 프로세스와 그 부모 `cmd.exe`)를 강제 종료하고 `adb shell am start -n <package>/.MainActivity`로 직접 앱을 실행해 마무리했다. 앞으로는 릴리즈 빌드를 백그라운드로 돌릴 때 기기 화면을 깨워두거나(`adb shell input keyevent KEYCODE_WAKEUP`), 빌드가 예상 소요시간(이번 케이스 기준 컴파일 ~10분)을 한참 넘기면 로그 유무보다 "데몬 CPU 사용량 + 산출물 타임스탬프 + 기기 상태"로 먼저 진단한다.

## 이력서 소재 한 줄

"출력이 없다 = 멈췄다"로 바로 단정하지 않고 데몬 CPU 사용률·빌드 산출물 타임스탬프·기기 잠금 상태를 교차 확인해, 실제로는 빌드/설치가 끝났고 화면 잠금 때문에 마지막 실행 단계만 멎어 있었던 것을 정확히 짚어낸 뒤 수동으로 마무리.
