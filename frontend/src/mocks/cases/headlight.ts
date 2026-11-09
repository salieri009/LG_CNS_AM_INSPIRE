import { IMG, MANUAL, steps, type CaseSeed } from './types';
import type { PartBox } from '../../api/types';

// 헤드램프 하나를 바꾸려면 앞 범퍼 커버 전체를 떼야 한다 (조립 효율 vs 정비 용이성 사례).
const P: Record<string, PartBox> = {
  frunk: { key: 'frunk', name: '프렁크 수납함', box: [1.72, 0.62, 0, 0.5, 0.22, 0.95], offset: [0, 0.7, 0] },
  fascia: { key: 'fascia', name: '앞 범퍼 커버', box: [2.24, 0.52, 0, 0.18, 0.42, 1.78], offset: [0.9, 0, 0] },
  headConn: { key: 'headConn', name: '헤드램프 커넥터', box: [1.86, 0.76, -0.56, 0.05, 0.04, 0.05], offset: [0.05, 0.2, -0.25] },
  bracket: { key: 'bracket', name: '펜더 브래킷', box: [1.95, 0.82, -0.78, 0.12, 0.04, 0.06], offset: [0, 0.3, -0.35] },
  headlight: { key: 'headlight', name: '헤드램프 (LH)', box: [2.05, 0.76, -0.6, 0.34, 0.12, 0.3], offset: [0.75, 0.2, -0.45] },
};
const CAM = { position: [4.1, 1.55, -2.3] as [number, number, number], target: [1.95, 0.68, -0.35] as [number, number, number] };

export const HEADLIGHT_CASE: CaseSeed = {
  code: 'B1C12', description: '왼쪽 헤드램프 점등 불량 (예시 코드)', symptom: '왼쪽 헤드램프가 켜지지 않거나 깜빡이고, 램프 안에 습기가 참', searches: 142,
  candidates: [
    { partId: 'part-headlight-lh', partName: '헤드램프 어셈블리 (LH)', officialOrder: 1, checkMethod: '램프 안 습기·하우징 파손 육안 확인', count: 21, n: 44, chronic: true, agree: 21, procedureId: 'proc-headlight-lh', highlightNode: 'headlight' },
    { partId: 'part-headlight-conn', partName: '헤드램프 커넥터 접촉 불량', officialOrder: 2, checkMethod: '커넥터 핀 부식·잠금 탭 확인', count: 13, n: 44, chronic: false, agree: 13, box: P.headConn },
    { partId: 'part-front-bcm', partName: '전방 차체 제어 모듈', officialOrder: 3, checkMethod: 'Toolbox 출력 신호 확인', count: 6, n: 44, chronic: false, agree: 6, box: { key: 'bcm', name: '전방 차체 제어 모듈', box: [1.55, 0.66, 0.32, 0.16, 0.06, 0.2], offset: [0, 0, 0] } },
    { partId: 'part-front-fuse', partName: '퓨즈·전원 공급', officialOrder: 4, checkMethod: '퓨즈 도통과 전원 전압 측정', count: 4, n: 12, chronic: false, agree: 4, box: { key: 'fuse', name: '퓨즈 박스', box: [1.45, 0.72, 0.42, 0.1, 0.05, 0.1], offset: [0, 0, 0] } },
  ],
  procedures: [{
    procedureId: 'proc-headlight-lh', procedureVersion: 'M3-2017-2023 / 17400102', targetPartId: 'part-headlight-lh', targetPartName: '헤드램프 어셈블리 (LH)',
    standardMinutes: 54, sourceRef: MANUAL + 'GUID-FF5D0BE4-B85F-4616-B3B6-0908123A45F4.html', heroImage: IMG + 'FF5D0BE4-hero.jpg', partSet: 'boxes',
    parts: [P.frunk, P.fascia, P.headConn, P.bracket, P.headlight],
    steps: steps('head', [
      { title: '서비스 모드 켜고 프렁크 수납함 탈거', description: '터치스크린에서 서비스 모드를 켜고, 언더후드 에이프런과 프렁크 수납함을 떼어 냅니다.', fastenerType: 'clip', minutes: 10, requiresHvAck: false, highlightNodes: ['frunk'], camera: { position: [3.4, 2.6, -1.6], target: [1.7, 0.6, 0] } },
      { title: '앞 범퍼 상단 볼트 풀기', description: '앞 범퍼 커버 위쪽을 차체에 고정한 볼트를 풉니다.', fastenerType: 'bolt', torque: '4 N·m · 10 mm', minutes: 6, requiresHvAck: false, highlightNodes: ['fascia'], fallbackImage: IMG + '7A57FF6F-06-1.jpg', camera: { position: [3.6, 2.2, -1.2], target: [2.1, 0.6, 0] } },
      { title: '휠 아치 라이너 클립 풀기 (좌우)', description: '좌우 휠 아치 라이너 앞쪽 클립(각 5개)과 펜더 쪽 볼트를 풉니다.', fastenerType: 'clip', torque: '4 N·m / 3 N·m · 10 mm', minutes: 12, requiresHvAck: false, highlightNodes: ['fascia'], fallbackImage: IMG + '7A57FF6F-07-1.jpg', camera: CAM },
      { title: '앞 범퍼 커버 분리', description: '언더 에어로 실드 볼트 4개를 풀고 범퍼 쪽 커넥터를 분리한 뒤 커버를 앞으로 빼냅니다.', fastenerType: 'bolt', torque: '5 N·m', minutes: 14, requiresHvAck: false, highlightNodes: ['fascia'], fallbackImage: IMG + '7A57FF6F-12-1.jpg', camera: { position: [4.6, 1.2, -1.6], target: [2.2, 0.5, -0.2] } },
      { title: '헤드램프 커넥터 분리', description: '빨간 잠금 탭이 있으면 먼저 풀고 헤드램프 커넥터를 분리합니다.', fastenerType: 'connector', minutes: 3, requiresHvAck: false, highlightNodes: ['headConn'], fallbackImage: IMG + 'FF5D0BE4-04-1.jpg', camera: { position: [3.2, 1.3, -1.6], target: [1.9, 0.75, -0.55] } },
      { title: '펜더 브래킷 분리', description: '펜더 브래킷을 차체에 고정한 볼트를 풀고 브래킷을 떼어 냅니다.', fastenerType: 'bolt', torque: '3 N·m · Torx T20', minutes: 3, requiresHvAck: false, highlightNodes: ['bracket'], fallbackImage: IMG + 'FF5D0BE4-05-1.jpg', camera: { position: [3.0, 1.4, -2.0], target: [1.95, 0.8, -0.75] } },
      { title: '헤드램프 탈거', description: '헤드램프를 차체에 고정한 나사를 풀고 램프를 빼냅니다. 연식별로 리플렉터형·프로젝터형이 달라 호환되지 않습니다.', fastenerType: 'screw', torque: '5.9 N·m · 10 mm', minutes: 6, requiresHvAck: false, highlightNodes: ['headlight'], fallbackImage: IMG + 'FF5D0BE4-06-1.jpg', camera: CAM },
    ]),
  }],
  knowledge: [
    { entryId: 'k-head-3', stepId: 'head-s3', type: 'tip', author: '최 기사', body: '범퍼 클립이 잘 부러지니 8 mm 리벳 클립을 20개 이상 미리 준비하세요.', helpful: 27 },
    { entryId: 'k-head-7', stepId: 'head-s7', type: 'tip', author: '박 실장', body: '교체 후 Toolbox에서 램프 코딩이 필요할 수 있습니다.', helpful: 15 },
  ],
};
