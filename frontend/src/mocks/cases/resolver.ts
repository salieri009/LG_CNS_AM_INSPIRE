import { IMG, MANUAL, steps, type CaseSeed } from './types';
import type { PartBox } from '../../api/types';

// 구동 모터(리어 드라이브 유닛) 안쪽의 작은 센서 커넥터. 차를 리프트에 올리고 하부를 열어야 닿는다.
const P: Record<string, PartBox> = {
  rdu: { key: 'rdu', name: '리어 드라이브 유닛', box: [-1.44, 0.34, 0, 0.42, 0.3, 0.55], offset: [0, 0, 0] },
  aero: { key: 'aero', name: '리어 에어로 실드', box: [-1.25, 0.1, 0, 1.0, 0.02, 1.2], offset: [0, -0.02, -1.5] },
  clip: { key: 'clip', name: '리졸버 커버 호스 클립', box: [-1.3, 0.3, 0.2, 0.06, 0.04, 0.04], offset: [0, -0.2, 0.25] },
  resolverConn: { key: 'resolverConn', name: '리졸버 커넥터', box: [-1.22, 0.36, 0.26, 0.06, 0.06, 0.05], offset: [0.1, -0.25, 0.3] },
  resolverAsm: { key: 'resolverAsm', name: '리졸버 커넥터 어셈블리', box: [-1.26, 0.34, 0.28, 0.1, 0.09, 0.06], offset: [0.2, -0.3, 0.55] },
};
const CAM = { position: [-3.3, 0.55, 1.9] as [number, number, number], target: [-1.3, 0.32, 0.2] as [number, number, number] };

export const RESOLVER_CASE: CaseSeed = {
  code: 'P0A3F', description: '구동 모터 위치 센서 회로 이상 (예시 코드)', symptom: '주행 중 구동계 경고와 함께 출력이 제한되고, 심하면 정차 후 다시 출발하지 못함', searches: 61,
  candidates: [
    { partId: 'part-rdu-resolver', partName: '리졸버 커넥터 접촉 불량·부식', officialOrder: 1, checkMethod: '커넥터 잠금 탭·핀 부식 확인 (하부라 습기·진동 노출)', count: 16, n: 34, chronic: true, agree: 16, procedureId: 'proc-resolver', highlightNode: 'resolverAsm' },
    { partId: 'part-resolver-harness', partName: '리졸버–인버터 하네스 손상', officialOrder: 2, checkMethod: '하네스 도통·절연 확인', count: 9, n: 34, chronic: false, agree: 9, box: { key: 'rharness', name: '리졸버 하네스', box: [-1.0, 0.36, 0.22, 0.5, 0.025, 0.025], offset: [0, 0, 0] } },
    { partId: 'part-resolver-sensor', partName: '리졸버 센서 자체 불량', officialOrder: 3, checkMethod: 'Toolbox 리졸버 신호 확인', count: 6, n: 34, chronic: false, agree: 6, box: P.rdu },
    { partId: 'part-inverter', partName: '인버터 신호 처리 이상', officialOrder: 4, checkMethod: '인버터 자기진단 (고전압 작업)', count: 3, n: 11, chronic: false, agree: 3, box: { key: 'inverter', name: '인버터', box: [-1.44, 0.52, 0, 0.3, 0.08, 0.4], offset: [0, 0, 0] } },
  ],
  procedures: [{
    procedureId: 'proc-resolver', procedureVersion: 'M3-2017-2023 / 40014802 (4DU)', targetPartId: 'part-rdu-resolver', targetPartName: '리졸버 커넥터 어셈블리',
    standardMinutes: 72, sourceRef: MANUAL + 'GUID-A7D5D2BF-8BFC-45D4-B9E1-29F173F968FF.html', heroImage: IMG + 'A7D5D2BF-hero.jpg', partSet: 'boxes',
    parts: [P.rdu, P.aero, P.clip, P.resolverConn, P.resolverAsm],
    steps: steps('rsv', [
      { title: '리프트 고정·고전압 차단', description: '2주식 리프트로 차량을 올려 잠금 소리를 확인합니다. 구동계 주변 작업이라 서비스 플러그를 뽑아 고전압을 차단하고 멀티미터로 0V를 확인합니다.', fastenerType: 'measure', minutes: 10, requiresHvAck: true, highlightNodes: ['rdu'], camera: { position: [-3.6, 1.2, 2.6], target: [-1.4, 0.35, 0] } },
      { title: '리어 에어로 실드 탈거', description: '차량 하부의 리어 에어로 실드 패널을 떼어 냅니다.', fastenerType: 'clip', minutes: 8, requiresHvAck: false, highlightNodes: ['aero'], camera: CAM },
      { title: '리졸버 커버 호스 클립 풀기', description: '리졸버 커버의 호스 클립을 풀고 반시계 방향으로 90° 돌립니다.', fastenerType: 'clip', minutes: 3, requiresHvAck: false, highlightNodes: ['clip'], fallbackImage: IMG + 'A7D5D2BF-04-1.jpg', camera: CAM },
      { title: '리졸버 커넥터 분리', description: '잠금 탭을 풀어 리졸버 커넥터를 분리합니다. 하네스 브래킷은 옆으로 비켜 둡니다.', fastenerType: 'connector', minutes: 4, requiresHvAck: false, highlightNodes: ['resolverConn'], fallbackImage: IMG + 'A7D5D2BF-05-1.jpg', camera: { position: [-2.6, 0.5, 1.5], target: [-1.24, 0.35, 0.26] } },
      { title: '리졸버 커넥터 어셈블리 분리', description: '어셈블리를 고정한 볼트 3개를 풀어 폐기하고 어셈블리를 빼냅니다.', fastenerType: 'bolt', minutes: 6, requiresHvAck: false, highlightNodes: ['resolverAsm'], fallbackImage: IMG + 'A7D5D2BF-06-1.jpg', camera: { position: [-2.6, 0.5, 1.5], target: [-1.26, 0.34, 0.28] } },
      { title: '새 어셈블리 장착', description: 'O링에 깨끗한 KAF1 오일을 얇게 바르고 새 볼트 3개로 장착합니다. 이후 감속기 오일을 보충합니다.', fastenerType: 'bolt', torque: '8 N·m · Torx T25 · 볼트 교체', minutes: 8, requiresHvAck: false, highlightNodes: ['resolverAsm'], fallbackImage: IMG + 'A7D5D2BF-07-1.jpg', camera: CAM },
    ]),
  }],
  knowledge: [
    { entryId: 'k-rsv-2', stepId: 'rsv-s2', type: 'tip', author: '한 정비사', body: '에어로 실드 볼트는 길이가 섞여 있어서 위치별로 따로 모아 두세요.', helpful: 12 },
  ],
};
