import { Capture } from '../types/capture';

/**
 * 8 mock captures — ported 1:1 from nightcap-prototype.html's CAPTURES array
 * (넷플릭스 항목이 DRM 케이스). Phase 1 uses this in place of the real
 * MediaLibrary scan pipeline (PROJECT.md §3) to validate swipe feel first.
 */
export const MOCK_CAPTURES: Capture[] = [
  {
    id: 'c1',
    app: '유튜브 쇼츠',
    time: '09:12',
    title: '자취생 5분 마라탕, 이건 진짜다',
    src: '@요리하는_공대생',
    kind: 'video',
    progress: '62%',
  },
  {
    id: 'c2',
    app: '인스타 릴스',
    time: '11:47',
    title: '한강뷰 카페 신상, 평일 오전 웨이팅 없음',
    src: '@seoul.cafe.log',
    kind: 'video',
    progress: '18%',
  },
  {
    id: 'c3',
    app: 'X',
    time: '12:30',
    title: 'Claude Code로 위젯 앱 하루 만에 만든 후기 스레드',
    src: '@indie_dev_kr',
    kind: 'text',
  },
  {
    id: 'c4',
    app: '카카오톡',
    time: '14:05',
    title: '동아리 단톡에 올라온 유도 대회 일정 공지',
    src: '한양대 유도부',
    kind: 'text',
  },
  {
    id: 'c5',
    app: '유튜브',
    time: '16:22',
    title: 'KBL 파이널 하이라이트, 4쿼터 역전 장면',
    src: 'KBL 공식 채널',
    kind: 'video',
    progress: '87%',
  },
  {
    id: 'c6',
    app: '넷플릭스',
    time: '20:40',
    title: '주말에 볼 신작 시리즈',
    src: '시즌 1 · 8부작',
    kind: 'drm',
  },
  {
    id: 'c7',
    app: '인스타 릴스',
    time: '22:15',
    title: '집에서 하는 10분 스트레칭 루틴',
    src: '@move.daily',
    kind: 'video',
    progress: '44%',
  },
  {
    id: 'c8',
    app: '유튜브 쇼츠',
    time: '23:02',
    title: '옵시디언 Dataview 꿀팁 30초 정리',
    src: '@생산성덕후',
    kind: 'video',
    progress: '71%',
  },
];
