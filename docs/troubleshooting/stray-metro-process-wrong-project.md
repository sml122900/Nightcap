# 포트 8081을 다른 프로젝트(power-nap)의 Metro가 점유하고 있었던 문제

## 문제상황

Metro 개발 서버가 "healthy"하다고 여러 번 확인했음에도(`curl http://localhost:8081/status` → `packager-status:running`) 기기에서 앱을 열면 번들을 못 받아오는 증상이 반복됐다. 백그라운드 태스크가 "killed"로 보고돼 재시작을 시도하면 포트 충돌로 실패하기도 했다.

## 시도한 것들

- `packager-status:running` 응답만 보고 "정상"이라고 판단 → 실제로는 응답은 하지만 **다른 프로젝트**의 Metro였다
- `netstat -ano | grep 8081`로 포트를 점유한 PID 확인
- `curl "http://localhost:8081/index.ts.bundle?platform=android&dev=true"`로 실제 번들 내용을 요청해봤더니 에러 메시지에 `C:\Users\sm553\project_2026\power-nap`라는 **완전히 다른 프로젝트 경로**가 찍혀 있었음 — 예전에 그 프로젝트에서 띄운 Metro가 좀비 프로세스로 남아 있던 것
- `PowerShell Get-Process`로 해당 PID가 진짜 `node.exe`인지, 언제 시작됐는지 확인 후 `Stop-Process -Force`로 종료
- 같은 문제가 세션 중 **두 번** 재발(빌드 스크립트가 자동으로 새 Metro를 띄우려다 포트 충돌로 실패하고, 정작 점유 중인 건 엉뚱한 프로젝트였던 패턴)

## 최종 해결법

`/status` 엔드포인트가 200을 준다고 내가 원하는 프로젝트의 Metro라고 가정하지 않는다. 의심스러우면 항상 실제 번들 엔드포인트(`/index.ts.bundle?...`)를 요청해서 에러 메시지에 찍히는 origin 경로를 확인한다. 점유 중인 프로세스를 종료한 뒤 반드시 **해당 프로젝트 디렉터리에서** 새로 `expo start`/`expo run:android`를 실행한다.

## 이력서 소재 한 줄

포트 충돌로 인한 개발 서버 장애를 "응답 코드"가 아닌 "실제 서빙 중인 프로젝트 경로"까지 검증하는 방식으로 근본 원인을 진단해, 겉보기엔 정상인데 반복되던 빌드 실패를 해결.
