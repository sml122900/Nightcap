# 릴리즈 빌드+설치 성공 후 앱 실행 확인 전에 세션이 끊긴 문제

## 문제상황

W3-2(공유시트 유입 전환) 반영 후 `expo run:android --variant release`를 다시 돌려 실기기(Galaxy S24, `R3KL20GA0EE`)에 설치하려 했다. 빌드는 백그라운드 Bash로 타임아웃 600000ms(10분)를 주고 실행했는데, 컴파일에만 9분 32초가 걸려 타임아웃 한도에 거의 다 닿은 상태였다.

## 시도한 것들

- 최초 `adb devices -l`에서 기기가 `unauthorized` — 사용자에게 폰 화면의 USB 디버깅 허용 팝업 확인을 요청, 허용 후 `device` 상태로 전환 확인
- 백그라운드 빌드 로그: `BUILD SUCCESSFUL in 9m 32s` → `Installing ... app-release.apk` → `Opening exp+nightcap://expo-development-client/?url=...` → `Logs for your project will appear below.`에서 출력이 멈춤
- 별도 Bash 호출로 `adb shell dumpsys package com.anonymous.nightcap`을 돌려 `lastUpdateTime`으로 실제 설치를 재확인하려 했으나, 이 시점에 기기가 다시 `unauthorized`로 전환돼 있었음(재승인 팝업은 뜨지 않았다고 사용자가 확인)
- 잠시 후 `adb devices -l` 재실행 → 기기 자체가 목록에서 사라짐(USB 연결 끊김으로 추정)
- 백그라운드 빌드 프로세스는 이후 `killed` 상태로 시스템 종료 통지를 받음 — 로그가 "Logs for your project will appear below."에서 멈춘 채 새 줄이 없는 것으로 보아, 빌드·설치·앱 오픈 자체는 CLI 로그상 이미 끝났고 Metro/dev-client 핸드셰이크를 기다리는 단계에서 타임아웃에 걸려 프로세스가 죽은 것으로 추정

## 최종 해결법

2026-07-13 세션에서 재확인 완료. USB 재연결 후 같은 패턴(빌드 전 `adb shell input keyevent KEYCODE_WAKEUP`으로 화면 깨우기 → 빌드는 타임아웃 600000ms 백그라운드 실행 → 완료 후 `adb shell dumpsys package <pkg> | grep lastUpdateTime`로 설치 확인 → `adb shell dumpsys activity activities | grep ResumedActivity`로 실행 확인)으로 진행:

- 빌드 성공: `BUILD SUCCESSFUL in 3m 30s` (이번엔 대부분 UP-TO-DATE라 이전 9m32s보다 짧음)
- 설치 확인: `lastUpdateTime=2026-07-13 02:06:42`
- 실행 확인: `ResumedActivity: ActivityRecord{... com.anonymous.nightcap/.MainActivity ...}` — 앱이 실제로 포그라운드에서 실행 중임을 확인

다음번엔 이 패턴을 피하려면:
- 릴리즈 빌드+설치+실행까지 기다릴 땐 타임아웃을 컴파일 시간(이번 케이스 9분대)보다 넉넉히(15분 이상) 잡거나, 애초에 빌드만 기다리고 실행 확인은 별도 스텝(`adb shell am start` 직접 호출)으로 분리한다
- "CLI 프로세스가 살아있는지"가 아니라 APK 파일 타임스탬프 + `adb shell dumpsys package <pkg> | grep lastUpdateTime`으로 설치 완료 여부를 판단한다(`docs/troubleshooting/adb-install-hang-locked-device.md`와 같은 원칙)
- adb 인가 상태는 같은 세션 안에서도 재승인 팝업 없이 조용히 `unauthorized`로 되돌아갈 수 있다 — 기기가 안 잡히면 바로 "빌드 실패"로 보지 말고 USB 연결 자체부터 재확인한다
- 실행 여부는 `am start` 호출 로그가 아니라 `dumpsys activity activities`의 `ResumedActivity`로 확정하는 게 가장 확실하다(설치는 됐는데 화면 잠금 등으로 실행만 안 된 경우와 구분 가능)

## 이력서 소재 한 줄

빌드 성공 로그가 찍힌 뒤에도 "프로세스가 살아있음"과 "설치가 완료됨"은 별개라는 점을 근거로, 백그라운드 타임아웃으로 잘려나간 세션에서 실제 설치 상태를 CLI 종료 코드가 아닌 기기 측 아티팩트(APK 타임스탬프, 패키지 메타데이터)로 재확인하려 시도.
