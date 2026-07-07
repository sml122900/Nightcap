# expo-crypto의 digest()가 expo-file-system의 ArrayBuffer를 못 받아들인 문제

## 문제상황

공유시트로 받은 이미지의 재공유 dedup을 위해 SHA-256 해시(`content_hash`)를 계산하는 `hashFile()`에서, `expo-file-system`의 `File.arrayBuffer()`가 반환한 `ArrayBuffer`를 `expo-crypto`의 `Crypto.digest()`에 그대로 넘겼다. 안드로이드 실기기에서 스크린샷을 공유할 때마다 조용히 실패했고, `ingestShareIntent`가 실패를 catch해 로그만 남기고 넘어가는 구조라 UI엔 아무 에러도 안 뜨고 그냥 "캡처가 스택에 안 담김"으로만 보였다.

## 시도한 것들

- `expo-share-intent` 수신 흐름(`App.tsx`)부터 재점검 — 정상 동작
- `adb logcat -d`로 전체 로그를 덤프한 뒤 `ReactNativeJS` 태그로 필터링해 실제 예외 메시지를 확보: `[digest] Cannot convert '[object ArrayBuffer]' to a Kotlin type. no ArrayBuffer attached`
- 설치된 `expo-crypto`의 `.d.ts`와 공식 예제 코드를 다시 확인 — 공식 예제는 `digest()`에 `Uint8Array`를 넘기지, 순수 `ArrayBuffer` 인스턴스를 직접 넘기지 않는다는 걸 발견

## 최종 해결법

```ts
const buffer = await file.arrayBuffer();
const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new Uint8Array(buffer));
```

`ArrayBuffer`를 `Uint8Array`로 감싸서 넘기면 해결. 네이티브(JSI) 바인딩이 "JS 런타임에 붙어있는(attached) TypedArray 뷰"를 기대하는데, 다른 네이티브 모듈(`expo-file-system`)이 만들어 넘긴 순수 `ArrayBuffer`는 이 조건을 만족하지 못했던 것으로 보임. 순수 JS 레벨 수정이라 네이티브 리빌드 불필요.

## 이력서 소재 한 줄

UI 에러 없이 조용히 실패하던 이미지 dedup 파이프라인을 `adb logcat` 필터링으로 실제 네이티브 예외까지 추적해, 문서에 명시되지 않은 네이티브 바인딩의 타입 요구사항(ArrayBuffer vs TypedArray) 불일치를 원인으로 특정하고 재현 가능한 한 줄 수정으로 해결.
