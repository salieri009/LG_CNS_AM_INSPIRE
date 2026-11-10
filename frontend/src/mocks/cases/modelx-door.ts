import { IMG_X, MANUAL_X, MODELX, steps, type CaseSeed } from './types';
import type { PartBox } from '../../api/types';

// Model X(2021+) 팰컨 윙(리어) 도어·충전 포트 사례. 단계 순서·토크·공구·그림은 Model X Service Manual(Palladium) 기준,
// 고장코드 번호·건수·시간·팁은 예시. 좌표는 차량 기준(앞 +x, 왼쪽 -z, 전장 5.04 m)의 대략 위치다.
// 실제 Model X 메쉬를 측면 투영해 잰 값 (scratch 측정, 2026-11-10):
//  리어(팰컨 윙) 도어: x -1.0(뒷바퀴 아치) ~ -0.22(B필러), 아래 y 0.22 ~ 벨트라인 y 1.0, 위로는 지붕(y 1.6)까지
//  바깥 철판 z -0.95, 안쪽 트림 z -0.70 → 도어 속 공간은 z -0.93 ~ -0.74
//  뒷바퀴 중심 (-1.42, 0.37) 반지름 약 0.48, C필러 안쪽 트림 z -0.77, 테일램프 바깥 z -0.86
const IN = -0.83; // 도어 속 공간 가운데 깊이
// 도어 윤곽: 앞 B필러 → 아래 → 뒷바퀴 아치를 따라 → 뒤 → 벨트라인
const arch = Array.from({ length: 7 }, (_, i) => { const a = (-14 + i * 7) * Math.PI / 180; return [-1.42 + 0.5 * Math.cos(a), 0.37 + 0.5 * Math.sin(a)] as [number, number]; });
const DOOR_OUTLINE: [number, number][] = [[-0.26, 0.26], [-0.94, 0.26], ...arch.slice(1), [-0.98, 0.97], [-0.26, 0.97]];
const D: Record<string, PartBox> = {
  trim: { key: 'trim', name: '리어 도어 트림 패널', box: [-0.61, 0.62, -0.69, 0.76, 0.72, 0.18], offset: [0, 0, 0], shape: 'surface' },
  latchCover: { key: 'latchCover', name: '하부 래치 커버', box: [-0.86, 0.275, IN, 0.12, 0.03, 0.08], offset: [0, -0.2, 0], shape: 'panel' },
  airbagConn: { key: 'airbagConn', name: '팰컨 윙 에어백 커넥터', box: [-0.32, 0.92, IN, 0.05, 0.035, 0.035], offset: [0, 0, 0.2], shape: 'connector' },
  closeout: { key: 'closeout', name: '클로즈아웃 패널', box: [-0.62, 0.615, -0.76, 0.76, 0.71, 0.012], offset: [0, 0, 0.45], shape: 'panel', outline: DOOR_OUTLINE },
  winMotor: { key: 'winMotor', name: '리어 윈도 모터', box: [-0.6, 0.66, IN, 0.11, 0.11, 0.06], offset: [0, 0.15, 0.3], shape: 'drum' },
  doorEcu: { key: 'doorEcu', name: '도어 보호 ECU·도어 모듈', box: [-0.42, 0.8, IN, 0.12, 0.08, 0.03], offset: [0, 0.12, 0.3], shape: 'module' },
  speaker: { key: 'speaker', name: '리어 도어 스피커', box: [-0.42, 0.44, IN, 0.16, 0.16, 0.06], offset: [0, 0, 0.3], shape: 'drum' },
  cincher: { key: 'cincher', name: '시칭 액추에이터', box: [-0.86, 0.43, IN, 0.06, 0.1, 0.05], offset: [0, 0.2, 0.25], shape: 'module' },
  shroud: { key: 'shroud', name: '래치 슈라우드', box: [-0.86, 0.33, -0.87, 0.1, 0.08, 0.015], offset: [0, 0, 0.2], shape: 'panel' },
  latch: { key: 'latch', name: '래치·액추에이터 어셈블리', box: [-0.86, 0.33, -0.82, 0.08, 0.07, 0.06], offset: [-0.1, 0, 0.3], shape: 'latch' },
  usSensor: { key: 'usSensor', name: '도어 초음파 센서', box: [-0.6, 0.92, -0.9, 0.04, 0.04, 0.03], offset: [0, 0, 0.2], shape: 'connector' },
  cpTrim: { key: 'cpTrim', name: 'C필러 트림 (미드·어퍼)', box: [-1.45, 1.1, -0.72, 0.5, 0.4, 0.14], offset: [0, 0, 0], shape: 'surface' },
  foam: { key: 'foam', name: 'C필러 NVH 폼', box: [-1.45, 1.12, -0.83, 0.3, 0.24, 0.03], offset: [0, 0, 0.3], shape: 'panel' },
  cable: { key: 'cable', name: '충전 포트 수동 해제 케이블', box: [-1.95, 0.95, -0.83, 0.7, 0.03, 0.03], offset: [0, 0, 0.15], shape: 'harness' },
  zoneBracket: { key: 'zoneBracket', name: 'C필러 존 브래킷', box: [-1.45, 1.0, -0.81, 0.24, 0.16, 0.015], offset: [0, 0, 0.35], shape: 'panel' },
  cpEcu: { key: 'cpEcu', name: '충전 포트 ECU', box: [-1.5, 0.98, -0.79, 0.14, 0.09, 0.05], offset: [0, 0.25, 0.25], shape: 'module' },
  cpConn: { key: 'cpConn', name: 'ECU 커넥터 (x3)', box: [-1.41, 0.98, -0.77, 0.05, 0.04, 0.04], offset: [0, 0, 0.15], shape: 'connector' },
};
const DOOR_ZONE = { min: [-1.0, 0.2, -0.95] as [number, number, number], max: [-0.2, 1.0, -0.6] as [number, number, number] };
const PILLAR_ZONE = { min: [-2.45, 0.8, -0.9] as [number, number, number], max: [-1.15, 1.35, -0.6] as [number, number, number] };
const SIDE = { position: [-0.6, 1.05, -3.0] as [number, number, number], target: [-0.6, 0.6, -0.82] as [number, number, number] };
const LATCH = { position: [-1.35, 0.85, -2.1] as [number, number, number], target: [-0.86, 0.34, -0.83] as [number, number, number] };
const CPIL = { position: [-2.4, 1.5, -2.5] as [number, number, number], target: [-1.6, 1.0, -0.8] as [number, number, number] };

export const MODELX_LATCH_CASE: CaseSeed = {
  vehicle: 'Tesla Model X', model: MODELX,
  code: 'B1A24', description: '왼쪽 팰컨 윙 도어 래치 이상 (예시 코드)', symptom: '팰컨 윙 도어가 끝까지 닫히지 않거나, 닫힌 뒤 열림 버튼에 반응하지 않음', searches: 88,
  candidates: [
    { partId: 'part-mx-fw-latch', partName: '팰컨 윙 래치·액추에이터', officialOrder: 1, checkMethod: '래치 커넥터 체결과 액추에이터 작동음 확인', count: 15, n: 33, chronic: true, agree: 15, procedureId: 'proc-mx-fw-latch', highlightNode: 'latch' },
    { partId: 'part-mx-fw-cincher', partName: '시칭 액추에이터', officialOrder: 2, checkMethod: '닫힘 끝 단계에서 당겨 잠그는 동작 확인', count: 9, n: 33, chronic: false, agree: 9, box: D.cincher },
    { partId: 'part-mx-fw-ecu', partName: '도어 보호 ECU·도어 모듈', officialOrder: 3, checkMethod: 'Toolbox로 도어 모듈 통신·오류 이력 확인', count: 6, n: 33, chronic: false, agree: 6, box: D.doorEcu },
    { partId: 'part-mx-fw-cal', partName: '도어 캘리브레이션 틀어짐', officialOrder: 4, checkMethod: '수동 캘리브레이션 후 증상 재현 확인', count: 3, n: 33, chronic: false, agree: 3 },
    { partId: 'part-mx-lv', partName: 'LV 배터리 전압 저하', officialOrder: 5, checkMethod: 'Toolbox로 LV 배터리 상태 확인', count: 2, n: 33, chronic: false, agree: 2, procedureId: 'proc-mx-lv', highlightNode: 'battery' },
  ],
  procedures: [{
    procedureId: 'proc-mx-fw-latch', procedureVersion: 'MX-2021+ / Latch and Actuator Assembly - Rear - LH', targetPartId: 'part-mx-fw-latch', targetPartName: '팰컨 윙 래치·액추에이터 (LH)',
    standardMinutes: 85, sourceRef: MANUAL_X + 'GUID-73B91BD6-10DC-44A2-B2FA-E3AC03B55743.html', heroImage: IMG_X + '8811EB0E.jpg', partSet: 'boxes', zone: DOOR_ZONE,
    afterSteps: ['팰컨 윙 도어 수동 캘리브레이션: B필러 위 버튼을 Close 방향으로 누름', '도어 닫힘·시칭 동작과 에어백 경고등 소등 확인'],
    parts: [D.trim, D.latchCover, D.airbagConn, D.closeout, D.winMotor, D.doorEcu, D.speaker, D.cincher, D.shroud, D.latch],
    steps: steps('mxfw', [
      { title: '리어 도어 트림 탈거', description: '앞문을 열고 앞창을 내린 뒤 리어 도어 하단 가니시, 트림 데코, 트림 패널을 차례로 떼어 냅니다.', fastenerType: 'clip', minutes: 10, requiresHvAck: false, highlightNodes: ['trim'], camera: SIDE },
      { title: '하부 래치 커버 탈거', description: '커버 둘레에 마스킹 테이프로 위치를 표시하고, 나사 2개를 풀어 커버를 뗍니다. 나사는 재사용하지 않습니다.', fastenerType: 'screw', torque: '12 N·m · T30', minutes: 4, requiresHvAck: false, highlightNodes: ['latchCover'], fallbackImage: IMG_X + 'C2239346.jpg', camera: LATCH },
      { title: 'LV 전원 차단·에어백 커넥터 분리', description: 'LV 전원을 끊은 뒤 주황색 잠금 탭을 풀고 팰컨 윙 도어 에어백 커넥터를 분리합니다. 에어백 회로라 반드시 전원 차단 후 작업합니다.', fastenerType: 'connector', minutes: 5, requiresHvAck: false, highlightNodes: ['airbagConn'], fallbackImage: IMG_X + '6BA79EF4.jpg', camera: SIDE },
      { title: '클로즈아웃 패널 나사 풀기', description: '클로즈아웃 패널을 도어에 고정한 나사 10개를 풉니다.', fastenerType: 'screw', torque: '1.8 N·m · T25', minutes: 8, requiresHvAck: false, highlightNodes: ['closeout'], fallbackImage: IMG_X + 'F6456A27.jpg', camera: SIDE },
      { title: '윈도 모터 분리', description: '윈도 모터 나사 3개를 풀고, 패널 탭 2개를 풀어 패널을 당긴 뒤 모터를 위로 들어 뺍니다.', fastenerType: 'screw', torque: '1.8 N·m · T30', minutes: 6, requiresHvAck: false, highlightNodes: ['winMotor'], fallbackImage: IMG_X + '5C2335A2.jpg', camera: SIDE },
      { title: '도어 ECU·모듈 커넥터 분리', description: '검은 잠금 탭을 풀어 도어 보호 ECU를 분리하고, 도어 모듈 커넥터 2개와 하네스 클립 7개를 풉니다.', fastenerType: 'connector', minutes: 8, requiresHvAck: false, highlightNodes: ['doorEcu'], fallbackImage: IMG_X + 'D5F8D603.jpg', camera: SIDE },
      { title: '리어 도어 스피커 탈거', description: '스피커 볼트 4개를 풀고 커넥터를 분리해 스피커를 빼냅니다.', fastenerType: 'bolt', torque: '4 N·m · T25', minutes: 5, requiresHvAck: false, highlightNodes: ['speaker'], fallbackImage: IMG_X + 'D09CE733.jpg', camera: SIDE },
      { title: '시칭 액추에이터 탈거', description: '너트 3개를 풀고 액추에이터를 위로 들어 도어에서 분리합니다.', fastenerType: 'bolt', torque: '3 N·m · 10 mm', minutes: 6, requiresHvAck: false, highlightNodes: ['cincher'], fallbackImage: IMG_X + 'E40DEAC4.jpg', camera: LATCH },
      { title: '래치 슈라우드 탈거', description: '탭 2개를 풀어 래치 슈라우드를 뗍니다.', fastenerType: 'clip', minutes: 3, requiresHvAck: false, highlightNodes: ['shroud'], fallbackImage: IMG_X + '07327300.jpg', camera: LATCH },
      { title: '래치·액추에이터 어셈블리 탈거', description: '커넥터 2개를 분리하고 래치·액추에이터 어셈블리를 도어에서 빼냅니다.', fastenerType: 'module', minutes: 6, requiresHvAck: false, highlightNodes: ['latch'], fallbackImage: IMG_X + '8811EB0E.jpg', camera: LATCH },
    ]),
  }],
  knowledge: [
    { entryId: 'k-mxfw-2', stepId: 'mxfw-s2', type: 'tip', author: '정 정비사', body: '마스킹 테이프로 커버 위치를 꼭 표시하세요. 위치가 틀어지면 도어가 끝까지 안 닫힙니다.', helpful: 17 },
    { entryId: 'k-mxfw-4', stepId: 'mxfw-s4', type: 'tip', author: '박 정비사', body: '나사 10개가 길이가 같아서 섞여도 되지만, 토크가 1.8 N·m라 전동 드라이버는 저속으로 쓰세요.', helpful: 9 },
  ],
};

export const MODELX_SENSOR_CASE: CaseSeed = {
  vehicle: 'Tesla Model X', model: MODELX,
  code: 'B1A3C', description: '왼쪽 팰컨 윙 도어 초음파 센서 이상 (예시 코드)', symptom: '팰컨 윙 도어가 장애물이 없는데도 중간에 멈추거나 열리다가 되돌아감', searches: 54,
  candidates: [
    { partId: 'part-mx-us-sensor', partName: '도어 초음파 센서 (리어 LH)', officialOrder: 1, checkMethod: '센서 표면 오염·손상과 커넥터 확인', count: 10, n: 19, chronic: true, agree: 10, procedureId: 'proc-mx-us', highlightNode: 'usSensor' },
    { partId: 'part-mx-us-module', partName: '초음파 도어 센서 모듈', officialOrder: 2, checkMethod: 'Toolbox로 센서 모듈 진단', count: 6, n: 19, chronic: false, agree: 6, box: { ...D.doorEcu, key: 'usModule', name: '초음파 도어 센서 모듈' } },
    { partId: 'part-mx-us-harness', partName: '도어 하네스 굴곡부 단선', officialOrder: 3, checkMethod: '힌지 굴곡부 하네스 도통 시험', count: 3, n: 19, chronic: false, agree: 3, box: { key: 'usHarness', name: '도어 하네스', box: [-0.6, 0.97, -0.86, 0.66, 0.02, 0.02], offset: [0, 0, 0], shape: 'harness' } },
  ],
  procedures: [{
    procedureId: 'proc-mx-us', procedureVersion: 'MX-2021+ / Sensor - Ultrasonic - Rear Door - LH (Manual)', targetPartId: 'part-mx-us-sensor', targetPartName: '도어 초음파 센서 (리어 LH)',
    standardMinutes: 40, sourceRef: MANUAL_X + 'GUID-DBDAD146-A0D9-47A1-885D-B6ADCE7A5127.html', heroImage: IMG_X + '40B96632.jpg', partSet: 'boxes', zone: DOOR_ZONE,
    afterSteps: ['팰컨 윙 도어 열림·닫힘을 장애물 없이 3회 반복해 중간 멈춤이 없는지 확인'],
    parts: [D.trim, D.closeout, D.usSensor],
    steps: steps('mxus', [
      { title: '도어 열고 트림 패널 탈거', description: '앞문을 열고 앞·뒤 창을 내린 뒤 팰컨 윙 도어를 열고 리어 도어 트림 패널을 떼어 냅니다.', fastenerType: 'clip', minutes: 10, requiresHvAck: false, highlightNodes: ['trim'], camera: SIDE },
      { title: 'LV 전원 차단', description: 'Controls > Safety & Security > Power Off 후 LV 전원을 차단합니다.', fastenerType: 'connector', minutes: 5, requiresHvAck: false, highlightNodes: ['closeout'], camera: SIDE },
      { title: '클로즈아웃 패널 탈거', description: '리어 도어 클로즈아웃 패널을 떼어 냅니다.', fastenerType: 'screw', torque: '1.8 N·m · T25', minutes: 10, requiresHvAck: false, highlightNodes: ['closeout'], camera: SIDE },
      { title: '센서 캡·스프링·스페이서 분리', description: '초음파 센서의 캡, 스프링, 스페이서를 차례로 뺍니다.', fastenerType: 'clip', minutes: 4, requiresHvAck: false, highlightNodes: ['usSensor'], fallbackImage: IMG_X + '308838DC.jpg', camera: SIDE },
      { title: '잠금 클립 해제·커넥터 분리', description: '클립 프라이 툴로 센서 잠금 클립을 풀고 센서 커넥터를 분리합니다.', fastenerType: 'connector', minutes: 3, requiresHvAck: false, highlightNodes: ['usSensor'], fallbackImage: IMG_X + '9745A764.jpg', camera: SIDE },
      { title: '초음파 센서 탈거', description: '센서를 빼내 폐기합니다. 새 센서는 재사용하지 않는 부품으로 교체합니다.', fastenerType: 'module', minutes: 3, requiresHvAck: false, highlightNodes: ['usSensor'], fallbackImage: IMG_X + '40B96632.jpg', camera: SIDE },
    ]),
  }],
  knowledge: [
    { entryId: 'k-mxus-1', stepId: 'mxus-s1', type: 'tip', author: '정 정비사', body: '교체 전에 센서 표면부터 닦아 보세요. 세차 왁스 막 때문에 오작동하는 경우가 꽤 있습니다.', helpful: 23 },
  ],
};

export const MODELX_CHARGE_CASE: CaseSeed = {
  vehicle: 'Tesla Model X', model: MODELX,
  code: 'B1F42', description: '충전 포트 ECU 통신 이상 (예시 코드)', symptom: '충전 포트 도어가 열리지 않거나 충전이 시작되지 않고, 포트 LED가 켜지지 않음', searches: 112,
  candidates: [
    { partId: 'part-mx-cp-ecu', partName: '충전 포트 ECU', officialOrder: 1, checkMethod: 'ECU 커넥터 3개 체결과 전원 공급 확인', count: 13, n: 34, chronic: false, agree: 13, procedureId: 'proc-mx-cp-ecu', highlightNode: 'cpEcu' },
    { partId: 'part-mx-cp-door', partName: '충전 포트 도어 어셈블리', officialOrder: 2, checkMethod: '도어 모터 작동음과 수동 해제 케이블 확인', count: 11, n: 34, chronic: true, agree: 11, box: { key: 'cpDoor', name: '충전 포트 도어', box: [-2.3, 0.93, -0.85, 0.14, 0.12, 0.06], offset: [0, 0, 0], shape: 'surface' } },
    { partId: 'part-mx-cp-cable', partName: '수동 해제 케이블 걸림', officialOrder: 3, checkMethod: '트렁크 쪽 수동 해제 케이블을 당겨 걸림 확인', count: 5, n: 34, chronic: false, agree: 5, box: D.cable },
  ],
  procedures: [{
    procedureId: 'proc-mx-cp-ecu', procedureVersion: 'MX-2021+ / ECU - Charge Port', targetPartId: 'part-mx-cp-ecu', targetPartName: '충전 포트 ECU',
    standardMinutes: 45, sourceRef: MANUAL_X + 'GUID-093BC7A0-6B4A-4469-814D-6A9868680F04.html', heroImage: IMG_X + '3F01EBAA.jpg', partSet: 'boxes', zone: PILLAR_ZONE,
    afterSteps: ['충전 포트 도어 열림·닫힘과 LED 표시 확인', '충전 케이블을 꽂아 충전 시작 확인'],
    parts: [D.cpTrim, D.foam, D.cable, D.zoneBracket, D.cpConn, D.cpEcu],
    steps: steps('mxcp', [
      { title: '미드 C필러 트림 탈거', description: '앞좌석을 앞으로 밀고 팰컨 윙 도어를 연 뒤 왼쪽 미드 C필러 트림을 떼어 냅니다. 6·7인승은 2열 모노포스트와 3열 등받이를 접습니다.', fastenerType: 'clip', minutes: 8, requiresHvAck: false, highlightNodes: ['cpTrim'], camera: CPIL },
      { title: 'LV 전원 차단·어퍼 C필러 트림 탈거', description: 'LV 전원을 차단하고 어퍼 C필러 트림을 떼어 냅니다.', fastenerType: 'clip', minutes: 8, requiresHvAck: false, highlightNodes: ['cpTrim'], camera: CPIL },
      { title: 'NVH 폼 분리', description: 'C필러 NVH 폼을 떼어 냅니다. 찢어지지 않게 조심합니다.', fastenerType: 'adhesive', minutes: 3, requiresHvAck: false, highlightNodes: ['foam'], fallbackImage: IMG_X + '10F53455.jpg', camera: CPIL },
      { title: '수동 해제 케이블 클립 해제', description: '충전 포트 수동 해제 케이블을 존 브래킷에 고정한 클립을 풉니다.', fastenerType: 'clip', minutes: 2, requiresHvAck: false, highlightNodes: ['cable'], fallbackImage: IMG_X + '5665BDA3.jpg', camera: CPIL },
      { title: '존 브래킷 탈거', description: '나사 4개와 푸시 클립 3개를 풀어 미드 C필러 존 브래킷을 뗍니다.', fastenerType: 'screw', torque: 'T20 · 4인치 연장대 · 유니버설 조인트', minutes: 8, requiresHvAck: false, highlightNodes: ['zoneBracket'], fallbackImage: IMG_X + '735C81A3.jpg', camera: CPIL },
      { title: 'ECU 커넥터 3개 분리', description: '충전 포트 ECU의 하네스 커넥터 3개를 분리합니다.', fastenerType: 'connector', minutes: 3, requiresHvAck: false, highlightNodes: ['cpConn'], fallbackImage: IMG_X + '9620FB97.jpg', camera: CPIL },
      { title: '충전 포트 ECU 탈거', description: '볼트를 풀고 ECU를 위로 밀어 클립에서 빼낸 뒤 꺼냅니다.', fastenerType: 'bolt', torque: '10 mm · 플렉스 헤드 렌치', minutes: 4, requiresHvAck: false, highlightNodes: ['cpEcu'], fallbackImage: IMG_X + '3F01EBAA.jpg', camera: CPIL },
    ]),
  }],
  knowledge: [
    { entryId: 'k-mxcp-5', stepId: 'mxcp-s5', type: 'tip', author: '이 정비사', body: '아래쪽 나사는 유니버설 조인트 없이는 거의 안 닿습니다. 미리 준비해 두세요.', helpful: 14 },
  ],
};
