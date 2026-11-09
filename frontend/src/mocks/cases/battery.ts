import { IMG, MANUAL, steps, type CaseSeed } from './types';
import type { PartBox } from '../../api/types';

// 알림은 여러 모듈에서 동시에 뜨지만 원인은 대부분 12V 배터리 하나다.
// Model 3 실측(원본 GLB 노드·측면 투영, 2026-11-10): 앞 범퍼 x 1.73~2.35 y 0.14~0.65, 왼쪽 헤드램프 x 1.70~2.15 y 0.60~0.80 z -0.87~-0.45,
// 리어 언더후드 에이프런(frunkplastic) x 1.00~1.48 y 0.77~0.92, 후드 선 y 0.93(x 1.4)~0.78(x 1.97), 바닥 y 0.17, 뒷바퀴 축 x -1.44
const FRONT_ZONE = { min: [0.95, 0.12, -0.95] as [number, number, number], max: [2.36, 0.95, 0.98] as [number, number, number], ceiling: [[0.95, 1.0], [1.4, 0.93], [1.97, 0.78], [2.36, 0.55]] as [number, number][] };
const P: Record<string, PartBox> = {
  apron: { key: 'apron', name: '리어 언더후드 에이프런', box: [1.24, 0.845, 0.015, 0.48, 0.15, 1.51], offset: [0, 0, 0], shape: 'surface' },
  duct: { key: 'duct', name: '캐빈 흡기 덕트', box: [1.32, 0.78, -0.3, 0.2, 0.1, 0.38], offset: [0, 0.5, -0.25], shape: 'module' },
  terminalNeg: { key: 'terminalNeg', name: '음극(-) 케이블', box: [1.36, 0.76, 0.18, 0.05, 0.03, 0.05], offset: [0, 0.3, 0], shape: 'connector' },
  terminalPos: { key: 'terminalPos', name: '양극(+) 케이블', box: [1.36, 0.76, 0.34, 0.05, 0.03, 0.05], offset: [0, 0.3, 0.1], shape: 'connector' },
  battery: { key: 'battery', name: '12V 배터리', box: [1.36, 0.64, 0.26, 0.24, 0.18, 0.17], offset: [0, 0.65, 0.35], shape: 'battery' },
};
const CAM = { position: [3.0, 2.5, -1.3] as [number, number, number], target: [1.35, 0.68, 0.1] as [number, number, number] };

export const BATTERY_CASE: CaseSeed = {
  code: 'B0F71', description: '12V 배터리 전압 낮음 (예시 코드)', symptom: '알림이 여러 개 동시에 뜨고, 문이 안 열리거나 화면이 간헐적으로 꺼짐', searches: 233,
  candidates: [
    { partId: 'part-12v', partName: '12V 배터리 노화', officialOrder: 1, checkMethod: '12V 전압부터 측정 (다른 모듈 의심 전에)', count: 27, n: 52, chronic: true, agree: 27, procedureId: 'proc-12v', highlightNode: 'battery' },
    { partId: 'part-12v-terminal', partName: '배터리 단자 체결 불량·부식', officialOrder: 2, checkMethod: '단자 토크와 부식 확인', count: 11, n: 52, chronic: false, agree: 11, box: P.terminalNeg },
    { partId: 'part-dcdc', partName: 'DC-DC 컨버터 충전 불량', officialOrder: 3, checkMethod: '주행 준비 상태에서 12V 충전 전압 확인', count: 9, n: 52, chronic: false, agree: 9, box: { key: 'dcdc', name: 'DC-DC 컨버터', box: [0.6, 0.3, 0, 0.3, 0.08, 0.3], offset: [0, 0, 0], shape: 'module' } },
    { partId: 'part-parasitic', partName: '대기 전력 큰 모듈 (암전류)', officialOrder: 4, checkMethod: '슬립 상태 암전류 측정', count: 5, n: 52, chronic: false, agree: 5 },
  ],
  procedures: [{
    procedureId: 'proc-12v', procedureVersion: 'M3-2017-2023 / 00020003', targetPartId: 'part-12v', targetPartName: '12V 배터리',
    standardMinutes: 30, sourceRef: MANUAL + 'GUID-A457202A-D5B8-4DAD-A374-C91A41A7B4F5.html', heroImage: IMG + 'A457202A-hero.jpg', partSet: 'boxes', zone: FRONT_ZONE,
    parts: [P.apron, P.duct, P.terminalNeg, P.terminalPos, P.battery],
    steps: steps('lv', [
      { title: '리어 언더후드 에이프런 탈거', description: '프렁크 뒤쪽 에이프런을 떼어 냅니다. 작업 전 충전 케이블을 분리하고 창문을 내려 둡니다.', fastenerType: 'clip', minutes: 4, requiresHvAck: false, highlightNodes: ['apron'], camera: CAM },
      { title: '캐빈 흡기 덕트 탈거', description: '배터리 위를 덮은 캐빈 흡기 덕트를 빼냅니다.', fastenerType: 'clip', minutes: 3, requiresHvAck: false, highlightNodes: ['duct'], camera: CAM },
      { title: '12V 전원 차단 (음극 분리)', description: '화면에서 Controls > Safety > Power Off 후, 음극 케이블 너트를 풀고 분리합니다. 문이 닫히지 않게 스트라이커에 수건을 걸어 둡니다.', fastenerType: 'connector', torque: '6 N·m · 10 mm 딥 소켓', minutes: 8, requiresHvAck: false, highlightNodes: ['terminalNeg'], fallbackImage: IMG + 'E11A35CC-10-1.jpg', camera: { position: [2.4, 1.9, -0.6], target: [1.36, 0.74, 0.2] } },
      { title: '양극 단자 분리', description: '양극 단자 커버를 열고 너트를 풀어 케이블을 분리합니다.', fastenerType: 'connector', torque: '6 N·m · 10 mm', minutes: 3, requiresHvAck: false, highlightNodes: ['terminalPos'], fallbackImage: IMG + 'A457202A-05-1.jpg', camera: { position: [2.4, 1.9, -0.4], target: [1.36, 0.74, 0.32] } },
      { title: '12V 배터리 탈거', description: '배터리 스트랩을 풀고 왼쪽 호스를 분리한 뒤 배터리를 들어냅니다. 떼어 낸 배터리에 VIN 끝 6자리를 적어 둡니다.', fastenerType: 'module', minutes: 7, requiresHvAck: false, highlightNodes: ['battery'], fallbackImage: IMG + 'A457202A-07-1.jpg', camera: CAM },
    ]),
  }],
  knowledge: [
    { entryId: 'k-lv-3', stepId: 'lv-s3', type: 'tip', author: '이 정비사', body: '알림이 여러 개 떠도 다른 모듈보다 12V 전압부터 재 보세요. 대부분 여기서 끝납니다.', helpful: 41 },
  ],
};
