# 한글 사용자 경로 때문에 `expo prebuild`가 세그폴트 나고 Gradle 워커가 죽던 문제

## 문제상황

W3-3 네이티브 변경(Direct Share 플러그인 + expo-clipboard + view-shot) 후 리빌드를 하려는데 두 단계가 연달아 깨졌다.

1. `npx expo prebuild -p android` → `android` 폴더를 지우고 "Creating native directory"에서 **node가 그냥 죽음**. Git Bash에선 `Segmentation fault`, PowerShell에선 종료 코드 `-1073741819`(= `0xC0000005`, ACCESS_VIOLATION). 재실행해도 100% 재현.
2. 그걸 넘긴 뒤 `gradlew assembleDebug` → 여러 서브프로젝트의 `compileDebugJavaWithJavac`가
   `java.lang.ClassNotFoundException: worker.org.gradle.process.internal.worker.GradleWorkerMain`
   (`Failed to run Gradle Worker Daemon`)으로 실패.

두 실패 모두 "우리가 방금 바꾼 코드"와는 무관해 보이는 자리에서 났다.

## 원인

이 머신의 사용자 이름이 한글(`C:\Users\이성민`)이고, JVM/노드가 보는 네이티브 인코딩이 UTF-8이 아니다:

```
file.encoding   = UTF-8
native.encoding = MS949
sun.jnu.encoding = MS949
user.home        = C:\Users\?̼???   ← 깨져서 보임
```

`sun.jnu.encoding`(파일 경로를 OS로 넘길 때 쓰는 인코딩)이 MS949라, 한글이 든 경로가 자식 프로세스로 전달되는 순간 깨진다.

- **prebuild**: 템플릿 tarball을 `%TEMP%`(= `C:\Users\이성민\AppData\Local\Temp\...`)에 풀고 프로젝트로 옮기는 단계에서 죽는다. 디버그 로그를 보면 압축 해제는 마지막 파일(`LICENSE`)까지 정상적으로 끝난 뒤 크래시 — 즉 tar가 아니라 그 다음 이동/복사 단계가 문제.
- **Gradle**: 워커 데몬을 띄울 때 `GRADLE_USER_HOME`(기본값 `C:\Users\이성민\.gradle`) 아래의 워커 classpath jar를 `java -cp`로 넘기는데, 그 경로가 깨져 전달돼 클래스 자체를 못 찾는다.

`file.encoding=UTF-8`은 이미 UTF-8이라 도움이 안 된다 — 문제는 `sun.jnu.encoding`이고, 이건 JVM 시작 인자로 바꿔도 신뢰할 수 없다.

## 최종 해결법

경로에서 한글을 없앤다. 셸 환경변수 3개면 충분하고, 시스템 설정이나 계정 이름은 건드릴 필요 없다.

```powershell
$env:TMP='C:\tmp_expo'; $env:TEMP='C:\tmp_expo'     # prebuild 크래시 해결
$env:GRADLE_USER_HOME='C:\gradle_home'              # Gradle 워커 ClassNotFound 해결
```

- `TMP`/`TEMP`만 바꾸면 prebuild는 통과하지만 Gradle 워커는 여전히 죽는다. 둘은 원인은 같아도 **읽는 경로가 달라서 각각 고쳐야 한다**.
- `GRADLE_USER_HOME`을 새 위치로 옮기면 의존성을 처음부터 다시 받으므로 첫 빌드만 오래 걸린다(이후 캐시됨).
- 셸마다 다시 설정해야 한다 — `JAVA_HOME`/`ANDROID_HOME`과 같은 취급(`docs/troubleshooting/gradle-java-android-home-missing.md`).

## 재발 방지 체크

- 빌드/프리빌드가 "우리 코드와 상관없어 보이는 자리"에서 죽으면, 스택트레이스를 파기 전에 먼저 `java -XshowSettings:properties -version`으로 `sun.jnu.encoding`과 `user.home`을 확인한다. `user.home`이 깨져 보이면 이 문서의 케이스다.
- 특히 Gradle의 `ClassNotFoundException: GradleWorkerMain`은 "Gradle 설치가 깨졌다"처럼 보이지만 대개 경로 인코딩 문제다.

## 이력서 소재 한 줄

빌드 실패 두 건(node 세그폴트, Gradle 워커 ClassNotFound)이 서로 무관해 보였지만 `sun.jnu.encoding=MS949` + 한글 사용자 경로라는 하나의 원인으로 수렴함을 확인하고, 계정/시스템을 건드리지 않고 환경변수 3개로 해결.
