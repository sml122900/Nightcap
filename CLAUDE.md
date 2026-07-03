# Nightcap

풀 스펙은 `PROJECT.md` 참고. 앱 코드는 `app/`(Expo dev-client), 세션 기록은 `docs/daily/`, 기술 결정은 `docs/decisions/`, 트러블슈팅은 `docs/troubleshooting/`, 이력서 소재는 `docs/par-materials.md`.

## 진행상황

**완료 (W1, W2 일부)**
- 정리 모드 스와이프 엔진: 4방향 제스처(보류/이전/삭제/별점모드) + 별점 모드(도킹+드래그+접근성) — `app/src/components/triage/`, `app/src/constants/swipeEngine.ts`
- SQLite 영속화 + 마이그레이션 — `app/src/db/`
- 휴지통(소프트 삭제 7일 + 세션종료 일괄 삭제 + 강제종료 재시도) — `app/src/services/trash.ts`
- 완료 요약 / 보관함 / 휴지통 화면 — `app/src/screens/`

**진행 중 아님 / 다음 단계 (W2 나머지 ~ W4)**
- 실제 스크린샷 스캔 파이프라인(MediaLibrary 스캔, DRM 휘도 판별) — 지금은 `MOCK_CAPTURES` 8장으로 시드
- 공유 카드 화면(Letterboxd 스타일)
- 백탭/버블 온보딩(GIF), Android 플로팅 버블 네이티브 모듈
- 보관함 진짜 메이슨리(현재는 고정 2열 그리드로 단순화됨)

**알려진 제약**
- 목데이터 단계라 `asset_id`/`image_uri`가 항상 비어있어 사진첩 일괄 삭제·purge 로직은 코드는 정확하지만 아직 실제 파일에 대해 동작하지 않음(실 캡처 파이프라인 붙으면 그대로 동작)
- 별점 모드 손맛/접근성은 실기기 육안·TalkBack 확인이 아직 필요
