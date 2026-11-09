import { IMG, MANUAL, steps, type CaseSeed } from './types';

// 리어 왼쪽 도어가 안쪽 버튼으로 안 열림. 래치까지 트림 → 글라스 → 레귤레이터를 먼저 떼야 한다.
export const LATCH_CASE: CaseSeed = {
  code: 'B1A24', description: '리어 왼쪽 도어 래치 이상 (예시 코드)', symptom: '리어 왼쪽 도어가 안쪽 버튼으로 열리지 않음', searches: 184,
  candidates: [
    { partId: 'part-latch-rl', partName: '리어 도어 래치 (LH)', officialOrder: 1, checkMethod: '래치 커넥터 체결과 작동음 확인', count: 25, n: 48, chronic: true, agree: 25, procedureId: 'proc-latch-rl', highlightNode: 'latch' },
    { partId: 'part-switch-rl', partName: '실내 도어 열림 스위치 (리어 LH)', officialOrder: 2, checkMethod: '스위치 커넥터와 버튼 입력 확인', count: 12, n: 48, chronic: false, agree: 12, box: { key: 'switch', name: '실내 도어 열림 스위치', box: [-0.25, 0.86, -0.72, 0.07, 0.03, 0.04], offset: [0, 0, 0], shape: 'connector' } },
    { partId: 'part-harness-rl', partName: '리어 도어 하네스 (LH)', officialOrder: 3, checkMethod: '래치·스위치 구간 도통 시험', count: 8, n: 48, chronic: false, agree: 8, box: { key: 'harness', name: '리어 도어 하네스', box: [-0.6, 0.7, -0.84, 0.9, 0.025, 0.025], offset: [0, 0, 0], shape: 'harness' } },
    { partId: 'part-hall-rl', partName: '외부 핸들 홀 센서 (리어 LH)', officialOrder: 4, checkMethod: '외부 핸들 누름 신호 확인', count: 2, n: 9, chronic: false, agree: 2, box: { key: 'hall', name: '외부 핸들 홀 센서', box: [-0.6, 0.95, -0.97, 0.14, 0.03, 0.03], offset: [0, 0, 0], shape: 'connector' } },
  ],
  procedures: [{
    procedureId: 'proc-latch-rl', procedureVersion: 'M3-2017-2023 / 11353702', targetPartId: 'part-latch-rl', targetPartName: '리어 도어 래치 (LH)',
    standardMinutes: 44, sourceRef: MANUAL + 'GUID-28A0C028-0EE9-492F-85DF-F1ECE9CC74DD.html', heroImage: IMG + 't-hero-latch.jpg', partSet: 'door-rl',
    steps: steps('latch', [
      { title: '도어 트림 패널 나사·클립 풀기', description: '팔걸이 앞쪽 나사 커버를 떼고 나사를 푼 뒤, 퍼들 램프 구멍부터 아래에서 위로 클립을 풉니다.', fastenerType: 'clip', torque: '6 N·m · Torx T30 · 재사용', minutes: 8, requiresHvAck: false, highlightNodes: ['trim'], fallbackImage: IMG + 't-s1.jpg', camera: { position: [-0.3, 0.95, -2.7], target: [-0.55, 0.68, -0.82] } },
      { title: '트림 패널 분리', description: '트림 쪽 하네스 커넥터를 분리하고, 패널을 위로 들어 도어에서 빼냅니다.', fastenerType: 'connector', minutes: 4, requiresHvAck: false, highlightNodes: ['trim'], fallbackImage: IMG + 't-s2.jpg', camera: { position: [-0.2, 1.05, -2.9], target: [-0.55, 0.72, -1.0] } },
      { title: '도어 글라스 탈거', description: '인너 벨트 실을 떼고 글라스를 내려 레귤레이터 클램프 볼트를 풉니다. 볼트는 재사용하지 않습니다.', fastenerType: 'bolt', torque: '9.5 N·m · 13 mm · 교체', minutes: 12, requiresHvAck: false, highlightNodes: ['glass'], fallbackImage: IMG + 't-s3.jpg', camera: { position: [0.1, 1.35, -2.9], target: [-0.55, 0.9, -1.0] } },
      { title: '윈도 레귤레이터 탈거', description: '모터 커넥터와 수동 해제 케이블 클립(2개)을 풀고, 나사 13개와 금속 클립을 풀어 레귤레이터를 뺍니다.', fastenerType: 'screw', minutes: 10, requiresHvAck: false, highlightNodes: ['regulator'], fallbackImage: IMG + 't-s4.jpg', camera: { position: [-0.35, 0.95, -2.4], target: [-0.55, 0.72, -0.86] } },
      { title: '래치 커넥터 분리', description: '리어 도어 하네스를 래치 커넥터에서 분리합니다.', fastenerType: 'connector', minutes: 3, requiresHvAck: false, highlightNodes: ['latchConn'], fallbackImage: IMG + 't-s5.jpg', camera: { position: [-1.55, 0.95, -1.75], target: [-0.93, 0.68, -0.86] } },
      { title: '래치 볼트 해제', description: '도어 뒤쪽 면에서 래치를 고정한 볼트를 풉니다.', fastenerType: 'bolt', torque: 'Torx T25 · 4인치 연장대', minutes: 4, requiresHvAck: false, highlightNodes: ['latchBolts'], fallbackImage: IMG + 't-s6.jpg', camera: { position: [-2.0, 0.9, -1.25], target: [-1.0, 0.7, -0.86] } },
      { title: '래치 탈거', description: '래치 케이블 그로밋을 도어 격벽 안쪽으로 밀어 넣으면서 케이블과 함께 래치를 빼냅니다.', fastenerType: 'cable', minutes: 5, requiresHvAck: false, highlightNodes: ['latch'], fallbackImage: IMG + 't-s7.jpg', camera: { position: [-1.75, 1.05, -2.1], target: [-1.05, 0.72, -1.05] } },
    ]),
  }],
  knowledge: [
    { entryId: 'k-latch-1', stepId: 'latch-s1', type: 'tip', author: '박 실장', body: '퍼들 램프를 먼저 빼 두면 클립 풀 때 손이 덜 갑니다.', helpful: 31 },
    { entryId: 'k-latch-3', stepId: 'latch-s3', type: 'tip', author: '이 정비사', body: '글라스를 내릴 때 퍼들 램프를 임시로 꽂아야 창문 스위치가 동작합니다.', helpful: 18 },
  ],
};
