import { IMG_X, MANUAL_X, MODELX, steps, type CaseSeed } from './types';
import type { PartBox } from '../../api/types';

// Model X(2021+) LV 배터리 교체. Model 3와 같은 B0F71이지만 프렁크 안쪽을 9단계로 뜯어야 한다.
// 단계 순서·토크·공구는 Model X Service Manual(Palladium) 기준, 시간·건수는 예시. 시나리오 정리: 김승진님.
// 좌표는 차량 기준(앞 +x, 왼쪽 -z, 전장 5.04 m). 배터리는 카울 스크린과 에어 서스펜션 리저버 사이(오른쪽)로 본다.
const P: Record<string, PartBox> = {
  apronRear: { key: 'apronRear', name: '리어 언더후드 에이프런', box: [1.36, 0.98, 0, 0.14, 0.03, 1.3], offset: [0, 0.5, 0], shape: 'panel' },
  lvConn: { key: 'lvConn', name: 'LV 커넥터', box: [1.48, 0.86, 0.42, 0.08, 0.06, 0.08], offset: [0, 0.35, 0], shape: 'connector' },
  apronL: { key: 'apronL', name: '언더후드 에이프런 (LH)', box: [1.9, 0.92, -0.64, 0.9, 0.03, 0.12], offset: [0, 0.45, -0.2], shape: 'panel' },
  apronR: { key: 'apronR', name: '언더후드 에이프런 (RH)', box: [1.9, 0.92, 0.64, 0.9, 0.03, 0.12], offset: [0, 0.45, 0.2], shape: 'panel' },
  apronFront: { key: 'apronFront', name: '앞 언더후드 에이프런', box: [2.32, 0.88, 0, 0.14, 0.03, 1.1], offset: [0.3, 0.45, 0], shape: 'panel' },
  storage: { key: 'storage', name: '언더후드 수납함', box: [1.92, 0.7, 0, 0.72, 0.32, 1.0], offset: [0, 0.75, 0], shape: 'tub' },
  wiper: { key: 'wiper', name: '와이퍼 모듈', box: [1.24, 1.02, 0, 0.22, 0.1, 1.4], offset: [0, 0.6, 0], shape: 'wiper' },
  hoseClip: { key: 'hoseClip', name: '펌프 호스 클립', box: [1.42, 0.8, 0.3, 0.05, 0.05, 0.05], offset: [0, 0.25, -0.1], shape: 'clip' },
  bolts: { key: 'bolts', name: '배터리 고정 볼트 (x3)', box: [1.4, 0.74, 0.62, 0.06, 0.06, 0.16], offset: [0, 0.3, 0.15], shape: 'bolts' },
  battery: { key: 'battery', name: 'LV 배터리', box: [1.4, 0.7, 0.48, 0.2, 0.18, 0.3], offset: [0, 0.7, 0.3], shape: 'battery' },
};
const CAM = { position: [3.6, 2.6, -1.6] as [number, number, number], target: [1.6, 0.75, 0.2] as [number, number, number] };
const CLOSE = { position: [2.15, 1.4, 1.2] as [number, number, number], target: [1.42, 0.74, 0.45] as [number, number, number] };

export const MODELX_BATTERY_CASE: CaseSeed = {
  vehicle: 'Tesla Model X', model: MODELX,
  code: 'B0F71', description: 'LV(12V) 배터리 전압 낮음 (예시 코드)', symptom: '알림이 여러 개 동시에 뜨고, 팰컨 윙 도어가 열리지 않거나 화면이 간헐적으로 꺼짐', searches: 97,
  candidates: [
    { partId: 'part-mx-lv', partName: 'LV 배터리 노화', officialOrder: 1, checkMethod: '교체 전에 Toolbox로 LV 배터리 복구부터 시도', count: 14, n: 31, chronic: true, agree: 14, procedureId: 'proc-mx-lv', highlightNode: 'battery' },
    { partId: 'part-mx-lv-conn', partName: 'LV 커넥터 체결 불량', officialOrder: 2, checkMethod: '초록 잠금 탭과 검은 커넥터 락이 끝까지 걸렸는지 확인', count: 9, n: 31, chronic: false, agree: 9, box: P.lvConn },
    { partId: 'part-mx-parasitic', partName: '대기 전력 큰 모듈 (암전류)', officialOrder: 3, checkMethod: '슬립 상태 암전류 측정', count: 4, n: 17, chronic: false, agree: 4 },
  ],
  procedures: [{
    procedureId: 'proc-mx-lv', procedureVersion: 'MX-2021+ / 17011222', targetPartId: 'part-mx-lv', targetPartName: 'LV 배터리',
    standardMinutes: 46, sourceRef: MANUAL_X + 'GUID-7CCA7945-F936-47B0-9878-FA85FCA1A10B.html', heroImage: IMG_X + '7DCA0054.jpg', partSet: 'boxes',
    afterSteps: ['새 배터리 학습: Low Voltage > Power Distribution > Battery 아이콘 > Learn New Battery', '서비스 모드 해제', '팰컨 윙 도어 수동 캘리브레이션: B필러 위 버튼을 Close 방향으로 누름'],
    parts: [P.apronRear, P.lvConn, P.apronL, P.apronR, P.apronFront, P.storage, P.wiper, P.hoseClip, P.bolts, P.battery],
    steps: steps('mxlv', [
      { title: '리어 언더후드 에이프런 탈거', description: '왼쪽 앞문을 열고 창문을 내린 뒤 서비스 모드를 켭니다. 충전 케이블을 뽑고 공조를 끈 채 30초 기다린 다음 에이프런을 떼어 냅니다.', fastenerType: 'clip', minutes: 3, requiresHvAck: false, highlightNodes: ['apronRear'], fallbackImage: IMG_X + '7DCA0054.jpg', camera: CAM },
      { title: 'LV 전원 차단', description: 'Controls > Safety & Security > Power Off 후 LV 커넥터를 위로 뽑고, 퍼스트 리스폰더 루프를 분리합니다.', fastenerType: 'connector', minutes: 5, requiresHvAck: false, highlightNodes: ['lvConn'], camera: CLOSE },
      { title: '좌우 언더후드 에이프런 탈거', description: '프렁크 양옆의 에이프런(LH·RH)을 떼어 냅니다.', fastenerType: 'clip', minutes: 3, requiresHvAck: false, highlightNodes: ['apronL', 'apronR'], camera: CAM },
      { title: '앞 언더후드 에이프런 탈거', description: '프렁크 앞쪽 에이프런을 떼어 냅니다.', fastenerType: 'clip', minutes: 2, requiresHvAck: false, highlightNodes: ['apronFront'], camera: CAM },
      { title: '언더후드 수납함 탈거', description: '수납함을 빼야 배터리 쪽 공간이 열립니다.', fastenerType: 'bolt', minutes: 12, requiresHvAck: false, highlightNodes: ['storage'], camera: CAM },
      { title: '와이퍼 모듈 탈거', description: '와이퍼 모듈을 떼어 냅니다. 개정된 매뉴얼에서 추가된 단계라 예전 절차에는 없습니다.', fastenerType: 'module', minutes: 10, requiresHvAck: false, highlightNodes: ['wiper'], camera: CAM },
      { title: '펌프 호스 클립 해제', description: '슈퍼매니폴드-배터리 펌프 호스를 LV 배터리에 고정한 클립을 풉니다.', fastenerType: 'clip', minutes: 2, requiresHvAck: false, highlightNodes: ['hoseClip'], fallbackImage: IMG_X + '265CD33D.jpg', camera: CLOSE },
      { title: '고정 볼트 3개 풀기', description: 'LV 배터리를 에어 서스펜션 리저버에 고정한 볼트 3개를 풉니다.', fastenerType: 'bolt', torque: '9 N·m · 10 mm · 플렉스 헤드 렌치 · 4인치 연장대', minutes: 5, requiresHvAck: false, highlightNodes: ['bolts'], fallbackImage: IMG_X + 'E63F56B4.jpg', camera: CLOSE },
      { title: 'LV 배터리 탈거', description: '배터리를 돌려서 카울 스크린 패널과 에어 서스펜션 리저버 사이로 빼냅니다. 장착 후에는 새 배터리 학습과 팰컨 윙 도어 캘리브레이션이 필요합니다.', fastenerType: 'module', minutes: 4, requiresHvAck: false, highlightNodes: ['battery'], fallbackImage: IMG_X + 'C4133FF3.jpg', camera: CLOSE },
    ]),
  }],
  knowledge: [
    { entryId: 'k-mxlv-5', stepId: 'mxlv-s5', type: 'tip', author: '박 정비사', body: '수납함 볼트가 안쪽 깊이 있어서 긴 연장대가 있으면 훨씬 빠릅니다.', helpful: 12 },
    { entryId: 'k-mxlv-9', stepId: 'mxlv-s9', type: 'tip', author: '이 정비사', body: '장착 뒤 팰컨 윙 도어 캘리브레이션을 빼먹으면 문이 끝까지 안 닫힙니다. B필러 위 버튼을 Close 방향으로 누르세요.', helpful: 19 },
  ],
};
