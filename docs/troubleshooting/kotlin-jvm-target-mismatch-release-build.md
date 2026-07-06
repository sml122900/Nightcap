# react-native-image-colors 추가 후 릴리즈 빌드가 JVM 타깃 불일치로 실패한 문제

## 문제상황

DRM 판별용으로 `react-native-image-colors`를 추가하고 `expo prebuild` 후 `expo run:android --variant release`를 실행했더니, 다른 모든 네이티브 모듈은 정상 컴파일됐는데 `:react-native-image-colors:compileReleaseKotlin`에서만 실패했다.

```
Execution failed for task ':react-native-image-colors:compileReleaseKotlin'.
> Inconsistent JVM-target compatibility detected for tasks 'compileReleaseJavaWithJavac' (17) and 'compileReleaseKotlin' (21).
```

## 시도한 것들

- `node_modules/react-native-image-colors/android/build.gradle`를 직접 열어 확인 — `sourceCompatibility`/`kotlinOptions.jvmTarget`을 명시하는 코드가 있긴 했지만 `if (agpVersion.tokenize('.')[0].toInteger() < 8)` 조건 안에 있었다. 이 프로젝트는 AGP 8+라 그 블록 자체가 죽은 코드였고, 결과적으로 이 모듈만 Kotlin 컴파일 타깃을 명시하지 않는 상태였다
- Kotlin 컴파일러는 명시값이 없으면 Gradle을 실행 중인 JDK(이 환경은 Android Studio 번들 JBR, JDK 21)를 기본 타깃으로 잡는 반면, 나머지 프로젝트는 Java 쪽 `compileOptions`가 17로 고정돼 있어 이 라이브러리 하나만 21/17로 어긋난 것으로 확인
- android/build.gradle에 직접 `subprojects { afterEvaluate { ... jvmTarget = "17" ... } } `를 추가해 1차 시도 → `--configure-on-demand` 옵션 때문에 일부 서브프로젝트가 이미 evaluate된 시점이라 `Cannot run Project.afterEvaluate(Closure) when the project is already evaluated` 새 에러 발생

## 최종 해결법

`afterEvaluate` 대신 평가 시점에 의존하지 않는 `pluginManager.withPlugin(...)`/`tasks.withType(...).configureEach(...)`로 교체:

```gradle
subprojects { subproject ->
  subproject.tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
    kotlinOptions { jvmTarget = "17" }
  }
  ['com.android.library', 'com.android.application'].each { pluginId ->
    subproject.pluginManager.withPlugin(pluginId) {
      subproject.android {
        compileOptions {
          sourceCompatibility JavaVersion.VERSION_17
          targetCompatibility JavaVersion.VERSION_17
        }
      }
    }
  }
}
```

`android/build.gradle`은 `expo prebuild`가 실행될 때마다 통째로 재생성되므로, 이 스니펫을 직접 그 파일에 써넣지 않고 `withProjectBuildGradle`을 쓰는 로컬 config plugin(`app/plugins/withKotlinJvmTargetFix.js`)으로 만들어 `app.json`의 `plugins` 배열에 등록했다 — 다음에 `expo prebuild`를 다시 돌려도 자동으로 재적용된다.

## 이력서 소재 한 줄

서드파티 네이티브 모듈의 Gradle 설정 결함(AGP 버전 조건부 dead code)으로 발생한 릴리즈 빌드 실패를, `afterEvaluate` 생명주기 충돌까지 진단해 evaluation-순서에 안전한 방식으로 재작성하고, `expo prebuild`가 매번 지우는 네이티브 디렉터리에도 유실되지 않도록 config plugin으로 영속화.
