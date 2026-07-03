# Bash 셸에 JAVA_HOME/ANDROID_HOME이 없어 Gradle 빌드가 실패한 문제

## 문제상황

`expo-file-system` 설치 후 네이티브 리빌드를 위해 `npx expo run:android`를 실행했더니 두 차례 연속 다른 원인으로 실패했다. 이전 세션에서는 같은 기기·같은 프로젝트로 정상 빌드가 됐던 적이 있어서 환경 자체는 문제 없다고 가정했다가 시간을 더 썼다.

## 시도한 것들

1차 실패: `ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.` → 이번 세션의 Bash 툴이 스폰한 셸에는 `JAVA_HOME`이 export돼 있지 않았음(이전 세션/다른 터미널에서 설정됐던 것과 별개). Android Studio 번들 JBR 경로(`C:\Program Files\Android\Android Studio\jbr`)를 찾아 `JAVA_HOME`/`PATH`에 직접 export.

2차 실패: `SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable...` → 같은 이유로 `ANDROID_HOME`도 비어 있었음. `C:\Users\sm553\AppData\Local\Android\Sdk`를 export한 뒤에야 Gradle 설정 단계를 통과.

## 최종 해결법

같은 프로젝트라도 새 Bash 세션/셸에서는 `JAVA_HOME`, `ANDROID_HOME`이 비어있을 수 있다고 가정하고, 네이티브 빌드 전에 두 값을 먼저 export한다:

```bash
export JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
export ANDROID_HOME="C:\Users\sm553\AppData\Local\Android\Sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
```

## 이력서 소재 한 줄

셸 세션마다 초기화되는 환경변수(JAVA_HOME/ANDROID_HOME) 누락으로 반복되던 네이티브 빌드 실패를, 에러 메시지를 단서로 근본 원인까지 추적해 재현 가능한 해결 절차로 정리.
