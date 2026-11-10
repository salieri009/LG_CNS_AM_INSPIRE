-- 자동 생성 파일: backend/tools/export-seed.ts. 직접 고치지 말고 프론트 목 데이터를 고친 뒤 다시 생성한다.
-- 절차·토크·그림 경로는 Tesla Service Manual 참고, 건수·시간·팁·VIN·고장코드는 모두 예시 데이터.

INSERT INTO auth.app_user (id, name, organization, role, clearance_level, career, badges_json) VALUES
  ('tech-kim', '김 주임', '정비소 #A-1042 (비공개)', 'TECHNICIAN', 'L2', '경력 2년', '["자동차정비기능사","EV 고전압 교육 이수"]');

INSERT INTO production.vehicle_profile (id, manufacturer, model, spec, model_years, body_summary) VALUES
  ('m3-lr-rwd-2018', 'Tesla', 'Tesla Model 3', 'Long Range RWD', '2017-2023', '세단 · 전기차 · 2017-2023'),
  ('mx-lr-2022', 'Tesla', 'Tesla Model X', 'Long Range AWD', '2021-', 'SUV · 전기차 · 2021-');

INSERT INTO production.vehicle (id, profile_id, vin_lookup_hmac, production_date, plant_line, demo_vin, data_origin) VALUES
  ('veh-m3-001', 'm3-lr-rwd-2018', '3fbf8450c35787e4db5485cedd1d42ef0f823c0b6447f741de559752014191c6', '2018-06', 'Fremont GA4 (예시)', '5YJ3E1EA0JF000000', 'DEMO'),
  ('veh-mx-001', 'mx-lr-2022', 'd883b71a0b18a2b0f7d3ce6ce225cdfa6ca3428660d3df864a9aa9104c4b7290', '2022-03', 'Fremont (예시)', '7SAXCBE50NF000000', 'DEMO');

INSERT INTO production.part (id, display_name) VALUES
  ('part-latch-rl', '리어 도어 래치 (LH)'),
  ('part-switch-rl', '실내 도어 열림 스위치 (리어 LH)'),
  ('part-harness-rl', '리어 도어 하네스 (LH)'),
  ('part-hall-rl', '외부 핸들 홀 센서 (리어 LH)'),
  ('part-headlight-lh', '헤드램프 어셈블리 (LH)'),
  ('part-headlight-conn', '헤드램프 커넥터 접촉 불량'),
  ('part-front-bcm', '전방 차체 제어 모듈'),
  ('part-front-fuse', '퓨즈·전원 공급'),
  ('part-12v', '12V 배터리'),
  ('part-12v-terminal', '배터리 단자 체결 불량·부식'),
  ('part-dcdc', 'DC-DC 컨버터 충전 불량'),
  ('part-parasitic', '대기 전력 큰 모듈 (암전류)'),
  ('part-rdu-resolver', '리졸버 커넥터 어셈블리'),
  ('part-resolver-harness', '리졸버–인버터 하네스 손상'),
  ('part-resolver-sensor', '리졸버 센서 자체 불량'),
  ('part-inverter', '인버터 신호 처리 이상'),
  ('part-mx-lv', 'LV 배터리'),
  ('part-mx-lv-conn', 'LV 커넥터 체결 불량'),
  ('part-mx-parasitic', '대기 전력 큰 모듈 (암전류)'),
  ('part-mx-fw-latch', '팰컨 윙 래치·액추에이터 (LH)'),
  ('part-mx-fw-cincher', '시칭 액추에이터'),
  ('part-mx-fw-ecu', '도어 보호 ECU·도어 모듈'),
  ('part-mx-fw-cal', '도어 캘리브레이션 틀어짐'),
  ('part-mx-us-sensor', '도어 초음파 센서 (리어 LH)'),
  ('part-mx-us-module', '초음파 도어 센서 모듈'),
  ('part-mx-us-harness', '도어 하네스 굴곡부 단선'),
  ('part-mx-cp-ecu', '충전 포트 ECU'),
  ('part-mx-cp-door', '충전 포트 도어 어셈블리'),
  ('part-mx-cp-cable', '수동 해제 케이블 걸림');

INSERT INTO diagnosis.dtc_code (profile_id, code, description, symptom, searches) VALUES
  ('m3-lr-rwd-2018', 'B1A24', '리어 왼쪽 도어 래치 이상 (예시 코드)', '리어 왼쪽 도어가 안쪽 버튼으로 열리지 않음', 184),
  ('m3-lr-rwd-2018', 'B1C12', '왼쪽 헤드램프 점등 불량 (예시 코드)', '왼쪽 헤드램프가 켜지지 않거나 깜빡이고, 램프 안에 습기가 참', 142),
  ('m3-lr-rwd-2018', 'B0F71', '12V 배터리 전압 낮음 (예시 코드)', '알림이 여러 개 동시에 뜨고, 문이 안 열리거나 화면이 간헐적으로 꺼짐', 233),
  ('m3-lr-rwd-2018', 'P0A3F', '구동 모터 위치 센서 회로 이상 (예시 코드)', '주행 중 구동계 경고와 함께 출력이 제한되고, 심하면 정차 후 다시 출발하지 못함', 61),
  ('mx-lr-2022', 'B0F71', 'LV(12V) 배터리 전압 낮음 (예시 코드)', '알림이 여러 개 동시에 뜨고, 팰컨 윙 도어가 열리지 않거나 화면이 간헐적으로 꺼짐', 97),
  ('mx-lr-2022', 'B1A24', '왼쪽 팰컨 윙 도어 래치 이상 (예시 코드)', '팰컨 윙 도어가 끝까지 닫히지 않거나, 닫힌 뒤 열림 버튼에 반응하지 않음', 88),
  ('mx-lr-2022', 'B1A3C', '왼쪽 팰컨 윙 도어 초음파 센서 이상 (예시 코드)', '팰컨 윙 도어가 장애물이 없는데도 중간에 멈추거나 열리다가 되돌아감', 54),
  ('mx-lr-2022', 'B1F42', '충전 포트 ECU 통신 이상 (예시 코드)', '충전 포트 도어가 열리지 않거나 충전이 시작되지 않고, 포트 LED가 켜지지 않음', 112);

INSERT INTO diagnosis.diagnostic_rule (profile_id, dtc_code, candidate_part_id, candidate_name, official_order, check_method, procedure_id, chronic, highlight_node, box_json) VALUES
  ('m3-lr-rwd-2018', 'B1A24', 'part-latch-rl', '리어 도어 래치 (LH)', 1, '래치 커넥터 체결과 작동음 확인', 'proc-latch-rl', TRUE, 'latch', NULL),
  ('m3-lr-rwd-2018', 'B1A24', 'part-switch-rl', '실내 도어 열림 스위치 (리어 LH)', 2, '스위치 커넥터와 버튼 입력 확인', NULL, FALSE, NULL, '{"key":"switch","name":"실내 도어 열림 스위치","box":[-0.25,0.86,-0.72,0.07,0.03,0.04],"offset":[0,0,0],"shape":"connector"}'),
  ('m3-lr-rwd-2018', 'B1A24', 'part-harness-rl', '리어 도어 하네스 (LH)', 3, '래치·스위치 구간 도통 시험', NULL, FALSE, NULL, '{"key":"harness","name":"리어 도어 하네스","box":[-0.6,0.7,-0.84,0.9,0.025,0.025],"offset":[0,0,0],"shape":"harness"}'),
  ('m3-lr-rwd-2018', 'B1A24', 'part-hall-rl', '외부 핸들 홀 센서 (리어 LH)', 4, '외부 핸들 누름 신호 확인', NULL, FALSE, NULL, '{"key":"hall","name":"외부 핸들 홀 센서","box":[-0.6,0.95,-0.97,0.14,0.03,0.03],"offset":[0,0,0],"shape":"connector"}'),
  ('m3-lr-rwd-2018', 'B1C12', 'part-headlight-lh', '헤드램프 어셈블리 (LH)', 1, '램프 안 습기·하우징 파손 육안 확인', 'proc-headlight-lh', TRUE, 'headlight', NULL),
  ('m3-lr-rwd-2018', 'B1C12', 'part-headlight-conn', '헤드램프 커넥터 접촉 불량', 2, '커넥터 핀 부식·잠금 탭 확인', NULL, FALSE, NULL, '{"key":"headConn","name":"헤드램프 커넥터","box":[1.86,0.7,-0.56,0.05,0.04,0.05],"offset":[0.05,0.2,-0.25],"shape":"connector"}'),
  ('m3-lr-rwd-2018', 'B1C12', 'part-front-bcm', '전방 차체 제어 모듈', 3, 'Toolbox 출력 신호 확인', NULL, FALSE, NULL, '{"key":"bcm","name":"전방 차체 제어 모듈","box":[1.55,0.66,0.32,0.16,0.06,0.2],"offset":[0,0,0]}'),
  ('m3-lr-rwd-2018', 'B1C12', 'part-front-fuse', '퓨즈·전원 공급', 4, '퓨즈 도통과 전원 전압 측정', NULL, FALSE, NULL, '{"key":"fuse","name":"퓨즈 박스","box":[1.45,0.72,0.42,0.1,0.05,0.1],"offset":[0,0,0]}'),
  ('m3-lr-rwd-2018', 'B0F71', 'part-12v', '12V 배터리 노화', 1, '12V 전압부터 측정 (다른 모듈 의심 전에)', 'proc-12v', TRUE, 'battery', NULL),
  ('m3-lr-rwd-2018', 'B0F71', 'part-12v-terminal', '배터리 단자 체결 불량·부식', 2, '단자 토크와 부식 확인', NULL, FALSE, NULL, '{"key":"terminalNeg","name":"음극(-) 케이블","box":[1.36,0.76,0.18,0.05,0.03,0.05],"offset":[0,0.3,0],"shape":"connector"}'),
  ('m3-lr-rwd-2018', 'B0F71', 'part-dcdc', 'DC-DC 컨버터 충전 불량', 3, '주행 준비 상태에서 12V 충전 전압 확인', NULL, FALSE, NULL, '{"key":"dcdc","name":"DC-DC 컨버터","box":[0.6,0.3,0,0.3,0.08,0.3],"offset":[0,0,0],"shape":"module"}'),
  ('m3-lr-rwd-2018', 'B0F71', 'part-parasitic', '대기 전력 큰 모듈 (암전류)', 4, '슬립 상태 암전류 측정', NULL, FALSE, NULL, NULL),
  ('m3-lr-rwd-2018', 'P0A3F', 'part-rdu-resolver', '리졸버 커넥터 접촉 불량·부식', 1, '커넥터 잠금 탭·핀 부식 확인 (하부라 습기·진동 노출)', 'proc-resolver', TRUE, 'resolverAsm', NULL),
  ('m3-lr-rwd-2018', 'P0A3F', 'part-resolver-harness', '리졸버–인버터 하네스 손상', 2, '하네스 도통·절연 확인', NULL, FALSE, NULL, '{"key":"rharness","name":"리졸버 하네스","box":[-1,0.36,0.22,0.5,0.025,0.025],"offset":[0,0,0],"shape":"harness"}'),
  ('m3-lr-rwd-2018', 'P0A3F', 'part-resolver-sensor', '리졸버 센서 자체 불량', 3, 'Toolbox 리졸버 신호 확인', NULL, FALSE, NULL, '{"key":"rdu","name":"리어 드라이브 유닛","box":[-1.44,0.34,0,0.42,0.3,0.55],"offset":[0,0,0],"shape":"drum"}'),
  ('m3-lr-rwd-2018', 'P0A3F', 'part-inverter', '인버터 신호 처리 이상', 4, '인버터 자기진단 (고전압 작업)', NULL, FALSE, NULL, '{"key":"inverter","name":"인버터","box":[-1.44,0.52,0,0.3,0.08,0.4],"offset":[0,0,0]}'),
  ('mx-lr-2022', 'B0F71', 'part-mx-lv', 'LV 배터리 노화', 1, '교체 전에 Toolbox로 LV 배터리 복구부터 시도', 'proc-mx-lv', TRUE, 'battery', NULL),
  ('mx-lr-2022', 'B0F71', 'part-mx-lv-conn', 'LV 커넥터 체결 불량', 2, '초록 잠금 탭과 검은 커넥터 락이 끝까지 걸렸는지 확인', NULL, FALSE, NULL, '{"key":"lvConn","name":"LV 커넥터","box":[1.48,0.86,0.42,0.08,0.06,0.08],"offset":[0,0.35,0],"shape":"connector"}'),
  ('mx-lr-2022', 'B0F71', 'part-mx-parasitic', '대기 전력 큰 모듈 (암전류)', 3, '슬립 상태 암전류 측정', NULL, FALSE, NULL, NULL),
  ('mx-lr-2022', 'B1A24', 'part-mx-fw-latch', '팰컨 윙 래치·액추에이터', 1, '래치 커넥터 체결과 액추에이터 작동음 확인', 'proc-mx-fw-latch', TRUE, 'latch', NULL),
  ('mx-lr-2022', 'B1A24', 'part-mx-fw-cincher', '시칭 액추에이터', 2, '닫힘 끝 단계에서 당겨 잠그는 동작 확인', NULL, FALSE, NULL, '{"key":"cincher","name":"시칭 액추에이터","box":[-0.86,0.43,-0.83,0.06,0.1,0.05],"offset":[0,0.2,0.25],"shape":"module"}'),
  ('mx-lr-2022', 'B1A24', 'part-mx-fw-ecu', '도어 보호 ECU·도어 모듈', 3, 'Toolbox로 도어 모듈 통신·오류 이력 확인', NULL, FALSE, NULL, '{"key":"doorEcu","name":"도어 보호 ECU·도어 모듈","box":[-0.42,0.8,-0.83,0.12,0.08,0.03],"offset":[0,0.12,0.3],"shape":"module"}'),
  ('mx-lr-2022', 'B1A24', 'part-mx-fw-cal', '도어 캘리브레이션 틀어짐', 4, '수동 캘리브레이션 후 증상 재현 확인', NULL, FALSE, NULL, NULL),
  ('mx-lr-2022', 'B1A3C', 'part-mx-us-sensor', '도어 초음파 센서 (리어 LH)', 1, '센서 표면 오염·손상과 커넥터 확인', 'proc-mx-us', TRUE, 'usSensor', NULL),
  ('mx-lr-2022', 'B1A3C', 'part-mx-us-module', '초음파 도어 센서 모듈', 2, 'Toolbox로 센서 모듈 진단', NULL, FALSE, NULL, '{"key":"usModule","name":"초음파 도어 센서 모듈","box":[-0.42,0.8,-0.83,0.12,0.08,0.03],"offset":[0,0.12,0.3],"shape":"module"}'),
  ('mx-lr-2022', 'B1A3C', 'part-mx-us-harness', '도어 하네스 굴곡부 단선', 3, '힌지 굴곡부 하네스 도통 시험', NULL, FALSE, NULL, '{"key":"usHarness","name":"도어 하네스","box":[-0.6,0.97,-0.86,0.66,0.02,0.02],"offset":[0,0,0],"shape":"harness"}'),
  ('mx-lr-2022', 'B1F42', 'part-mx-cp-ecu', '충전 포트 ECU', 1, 'ECU 커넥터 3개 체결과 전원 공급 확인', 'proc-mx-cp-ecu', FALSE, 'cpEcu', NULL),
  ('mx-lr-2022', 'B1F42', 'part-mx-cp-door', '충전 포트 도어 어셈블리', 2, '도어 모터 작동음과 수동 해제 케이블 확인', NULL, TRUE, NULL, '{"key":"cpDoor","name":"충전 포트 도어","box":[-2.3,0.93,-0.85,0.14,0.12,0.06],"offset":[0,0,0],"shape":"surface"}'),
  ('mx-lr-2022', 'B1F42', 'part-mx-cp-cable', '수동 해제 케이블 걸림', 3, '트렁크 쪽 수동 해제 케이블을 당겨 걸림 확인', NULL, FALSE, NULL, '{"key":"cable","name":"충전 포트 수동 해제 케이블","box":[-1.95,0.95,-0.83,0.7,0.03,0.03],"offset":[0,0,0.15],"shape":"harness"}');

INSERT INTO guide.model_asset (id, asset_url, mesh_manifest_json) VALUES
  ('asset-model3', '/models/tesla-model3.glb', '{"door":"door_lr","hubFrontLeft":"hub_lf","hubRearLeft":"hub_lb","hubFrontRight":"hub_rf","length":"4.69"}'),
  ('asset-modelx', '/models/tesla-model-x.glb', '{"forward":"+z","left":"+x","length":"5.04"}');

INSERT INTO guide.procedure_def (id, profile_id, target_part_id, target_part_name, asset_id, version, source_ref, standard_minutes, hero_image, part_set, parts_json, after_steps_json) VALUES
  ('proc-latch-rl', 'm3-lr-rwd-2018', 'part-latch-rl', '리어 도어 래치 (LH)', 'asset-model3', 'M3-2017-2023 / 11353702', 'https://service.tesla.com/docs/Model3/ServiceManual/en-us/GUID-28A0C028-0EE9-492F-85DF-F1ECE9CC74DD.html', 44, '/manual/model3/t-hero-latch.jpg', 'door-rl', NULL, NULL),
  ('proc-headlight-lh', 'm3-lr-rwd-2018', 'part-headlight-lh', '헤드램프 어셈블리 (LH)', 'asset-model3', 'M3-2017-2023 / 17400102', 'https://service.tesla.com/docs/Model3/ServiceManual/en-us/GUID-FF5D0BE4-B85F-4616-B3B6-0908123A45F4.html', 54, '/manual/model3/FF5D0BE4-hero.jpg', 'boxes', '[{"key":"frunk","name":"프렁크 수납함","box":[1.72,0.62,0,0.5,0.22,0.95],"offset":[0,0.7,0],"shape":"tub"},{"key":"fascia","name":"앞 범퍼 커버","box":[2.225,0.4,0.03,0.25,0.5,1.85],"offset":[0.9,0,0],"shape":"surface"},{"key":"headConn","name":"헤드램프 커넥터","box":[1.86,0.7,-0.56,0.05,0.04,0.05],"offset":[0.05,0.2,-0.25],"shape":"connector"},{"key":"bracket","name":"펜더 브래킷","box":[1.95,0.72,-0.78,0.12,0.04,0.06],"offset":[0,0.3,-0.35],"shape":"panel"},{"key":"headlight","name":"헤드램프 (LH)","box":[1.925,0.7,-0.66,0.45,0.2,0.42],"offset":[0.75,0.2,-0.45],"shape":"surface"}]', NULL),
  ('proc-12v', 'm3-lr-rwd-2018', 'part-12v', '12V 배터리', 'asset-model3', 'M3-2017-2023 / 00020003', 'https://service.tesla.com/docs/Model3/ServiceManual/en-us/GUID-A457202A-D5B8-4DAD-A374-C91A41A7B4F5.html', 30, '/manual/model3/A457202A-hero.jpg', 'boxes', '[{"key":"apron","name":"리어 언더후드 에이프런","box":[1.24,0.845,0.015,0.48,0.15,1.51],"offset":[0,0,0],"shape":"surface"},{"key":"duct","name":"캐빈 흡기 덕트","box":[1.32,0.78,-0.3,0.2,0.1,0.38],"offset":[0,0.5,-0.25],"shape":"module"},{"key":"terminalNeg","name":"음극(-) 케이블","box":[1.36,0.76,0.18,0.05,0.03,0.05],"offset":[0,0.3,0],"shape":"connector"},{"key":"terminalPos","name":"양극(+) 케이블","box":[1.36,0.76,0.34,0.05,0.03,0.05],"offset":[0,0.3,0.1],"shape":"connector"},{"key":"battery","name":"12V 배터리","box":[1.36,0.64,0.26,0.24,0.18,0.17],"offset":[0,0.65,0.35],"shape":"battery"}]', NULL),
  ('proc-resolver', 'm3-lr-rwd-2018', 'part-rdu-resolver', '리졸버 커넥터 어셈블리', 'asset-model3', 'M3-2017-2023 / 40014802 (4DU)', 'https://service.tesla.com/docs/Model3/ServiceManual/en-us/GUID-A7D5D2BF-8BFC-45D4-B9E1-29F173F968FF.html', 72, '/manual/model3/A7D5D2BF-hero.jpg', 'boxes', '[{"key":"rdu","name":"리어 드라이브 유닛","box":[-1.44,0.34,0,0.42,0.3,0.55],"offset":[0,0,0],"shape":"drum"},{"key":"aero","name":"리어 에어로 실드","box":[-1.25,0.1,0,1,0.02,1.2],"offset":[0,-0.02,-1.5],"shape":"panel"},{"key":"clip","name":"리졸버 커버 호스 클립","box":[-1.3,0.3,0.2,0.06,0.04,0.04],"offset":[0,-0.2,0.25],"shape":"clip"},{"key":"resolverConn","name":"리졸버 커넥터","box":[-1.22,0.36,0.26,0.06,0.06,0.05],"offset":[0.1,-0.25,0.3],"shape":"connector"},{"key":"resolverAsm","name":"리졸버 커넥터 어셈블리","box":[-1.26,0.34,0.28,0.1,0.09,0.06],"offset":[0.2,-0.3,0.55],"shape":"drum"}]', NULL),
  ('proc-mx-lv', 'mx-lr-2022', 'part-mx-lv', 'LV 배터리', 'asset-modelx', 'MX-2021+ / 17011222', 'https://service.tesla.com/docs/ModelX/ServiceManual/Palladium/en-us/GUID-7CCA7945-F936-47B0-9878-FA85FCA1A10B.html', 46, '/manual/modelx/7DCA0054.jpg', 'boxes', '[{"key":"apronRear","name":"리어 언더후드 에이프런","box":[1.36,0.98,0,0.14,0.03,1.3],"offset":[0,0.5,0],"shape":"panel"},{"key":"lvConn","name":"LV 커넥터","box":[1.48,0.86,0.42,0.08,0.06,0.08],"offset":[0,0.35,0],"shape":"connector"},{"key":"apronL","name":"언더후드 에이프런 (LH)","box":[1.9,0.92,-0.64,0.9,0.03,0.12],"offset":[0,0.45,-0.2],"shape":"panel"},{"key":"apronR","name":"언더후드 에이프런 (RH)","box":[1.9,0.92,0.64,0.9,0.03,0.12],"offset":[0,0.45,0.2],"shape":"panel"},{"key":"apronFront","name":"앞 언더후드 에이프런","box":[2.32,0.88,0,0.14,0.03,1.1],"offset":[0.3,0.45,0],"shape":"panel"},{"key":"storage","name":"언더후드 수납함","box":[1.92,0.7,0,0.72,0.32,1],"offset":[0,0.75,0],"shape":"tub"},{"key":"wiper","name":"와이퍼 모듈","box":[1.24,1.02,0,0.22,0.1,1.4],"offset":[0,0.6,0],"shape":"wiper"},{"key":"hoseClip","name":"펌프 호스 클립","box":[1.42,0.8,0.3,0.05,0.05,0.05],"offset":[0,0.25,-0.1],"shape":"clip"},{"key":"bolts","name":"배터리 고정 볼트 (x3)","box":[1.4,0.74,0.62,0.06,0.06,0.16],"offset":[0,0.3,0.15],"shape":"bolts"},{"key":"battery","name":"LV 배터리","box":[1.4,0.7,0.48,0.2,0.18,0.3],"offset":[0,0.7,0.3],"shape":"battery"}]', '["새 배터리 학습: Low Voltage > Power Distribution > Battery 아이콘 > Learn New Battery","서비스 모드 해제","팰컨 윙 도어 수동 캘리브레이션: B필러 위 버튼을 Close 방향으로 누름"]'),
  ('proc-mx-fw-latch', 'mx-lr-2022', 'part-mx-fw-latch', '팰컨 윙 래치·액추에이터 (LH)', 'asset-modelx', 'MX-2021+ / Latch and Actuator Assembly - Rear - LH', 'https://service.tesla.com/docs/ModelX/ServiceManual/Palladium/en-us/GUID-73B91BD6-10DC-44A2-B2FA-E3AC03B55743.html', 85, '/manual/modelx/8811EB0E.jpg', 'boxes', '[{"key":"trim","name":"리어 도어 트림 패널","box":[-0.61,0.62,-0.69,0.76,0.72,0.18],"offset":[0,0,0],"shape":"surface"},{"key":"latchCover","name":"하부 래치 커버","box":[-0.86,0.275,-0.83,0.12,0.03,0.08],"offset":[0,-0.2,0],"shape":"panel"},{"key":"airbagConn","name":"팰컨 윙 에어백 커넥터","box":[-0.32,0.92,-0.83,0.05,0.035,0.035],"offset":[0,0,0.2],"shape":"connector"},{"key":"closeout","name":"클로즈아웃 패널","box":[-0.62,0.615,-0.76,0.76,0.71,0.012],"offset":[0,0,0.45],"shape":"panel","outline":[[-0.26,0.26],[-0.94,0.26],[-0.9237269241793389,0.3090653282974263],[-0.9199999999999999,0.37],[-0.9237269241793389,0.4309346717025737],[-0.9348521368620017,0.49096094779983385],[-0.9532097867513991,0.5491839747726501],[-0.9785262035705364,0.6047357813929454],[-0.98,0.97],[-0.26,0.97]]},{"key":"winMotor","name":"리어 윈도 모터","box":[-0.6,0.66,-0.83,0.11,0.11,0.06],"offset":[0,0.15,0.3],"shape":"drum"},{"key":"doorEcu","name":"도어 보호 ECU·도어 모듈","box":[-0.42,0.8,-0.83,0.12,0.08,0.03],"offset":[0,0.12,0.3],"shape":"module"},{"key":"speaker","name":"리어 도어 스피커","box":[-0.42,0.44,-0.83,0.16,0.16,0.06],"offset":[0,0,0.3],"shape":"drum"},{"key":"cincher","name":"시칭 액추에이터","box":[-0.86,0.43,-0.83,0.06,0.1,0.05],"offset":[0,0.2,0.25],"shape":"module"},{"key":"shroud","name":"래치 슈라우드","box":[-0.86,0.33,-0.87,0.1,0.08,0.015],"offset":[0,0,0.2],"shape":"panel"},{"key":"latch","name":"래치·액추에이터 어셈블리","box":[-0.86,0.33,-0.82,0.08,0.07,0.06],"offset":[-0.1,0,0.3],"shape":"latch"}]', '["팰컨 윙 도어 수동 캘리브레이션: B필러 위 버튼을 Close 방향으로 누름","도어 닫힘·시칭 동작과 에어백 경고등 소등 확인"]'),
  ('proc-mx-us', 'mx-lr-2022', 'part-mx-us-sensor', '도어 초음파 센서 (리어 LH)', 'asset-modelx', 'MX-2021+ / Sensor - Ultrasonic - Rear Door - LH (Manual)', 'https://service.tesla.com/docs/ModelX/ServiceManual/Palladium/en-us/GUID-DBDAD146-A0D9-47A1-885D-B6ADCE7A5127.html', 40, '/manual/modelx/40B96632.jpg', 'boxes', '[{"key":"trim","name":"리어 도어 트림 패널","box":[-0.61,0.62,-0.69,0.76,0.72,0.18],"offset":[0,0,0],"shape":"surface"},{"key":"closeout","name":"클로즈아웃 패널","box":[-0.62,0.615,-0.76,0.76,0.71,0.012],"offset":[0,0,0.45],"shape":"panel","outline":[[-0.26,0.26],[-0.94,0.26],[-0.9237269241793389,0.3090653282974263],[-0.9199999999999999,0.37],[-0.9237269241793389,0.4309346717025737],[-0.9348521368620017,0.49096094779983385],[-0.9532097867513991,0.5491839747726501],[-0.9785262035705364,0.6047357813929454],[-0.98,0.97],[-0.26,0.97]]},{"key":"usSensor","name":"도어 초음파 센서","box":[-0.6,0.92,-0.9,0.04,0.04,0.03],"offset":[0,0,0.2],"shape":"connector"}]', '["팰컨 윙 도어 열림·닫힘을 장애물 없이 3회 반복해 중간 멈춤이 없는지 확인"]'),
  ('proc-mx-cp-ecu', 'mx-lr-2022', 'part-mx-cp-ecu', '충전 포트 ECU', 'asset-modelx', 'MX-2021+ / ECU - Charge Port', 'https://service.tesla.com/docs/ModelX/ServiceManual/Palladium/en-us/GUID-093BC7A0-6B4A-4469-814D-6A9868680F04.html', 45, '/manual/modelx/3F01EBAA.jpg', 'boxes', '[{"key":"cpTrim","name":"C필러 트림 (미드·어퍼)","box":[-1.45,1.1,-0.72,0.5,0.4,0.14],"offset":[0,0,0],"shape":"surface"},{"key":"foam","name":"C필러 NVH 폼","box":[-1.45,1.12,-0.83,0.3,0.24,0.03],"offset":[0,0,0.3],"shape":"panel"},{"key":"cable","name":"충전 포트 수동 해제 케이블","box":[-1.95,0.95,-0.83,0.7,0.03,0.03],"offset":[0,0,0.15],"shape":"harness"},{"key":"zoneBracket","name":"C필러 존 브래킷","box":[-1.45,1,-0.81,0.24,0.16,0.015],"offset":[0,0,0.35],"shape":"panel"},{"key":"cpConn","name":"ECU 커넥터 (x3)","box":[-1.41,0.98,-0.77,0.05,0.04,0.04],"offset":[0,0,0.15],"shape":"connector"},{"key":"cpEcu","name":"충전 포트 ECU","box":[-1.5,0.98,-0.79,0.14,0.09,0.05],"offset":[0,0.25,0.25],"shape":"module"}]', '["충전 포트 도어 열림·닫힘과 LED 표시 확인","충전 케이블을 꽂아 충전 시작 확인"]');

INSERT INTO guide.procedure_step (id, procedure_id, step_order, title, description, fastener_type, torque, minutes, requires_hv_ack, highlight_nodes_json, fallback_image, camera_json) VALUES
  ('latch-s1', 'proc-latch-rl', 1, '도어 트림 패널 나사·클립 풀기', '팔걸이 앞쪽 나사 커버를 떼고 나사를 푼 뒤, 퍼들 램프 구멍부터 아래에서 위로 클립을 풉니다.', 'clip', '6 N·m · Torx T30 · 재사용', 8, FALSE, '["trim"]', '/manual/model3/t-s1.jpg', '{"position":[-0.3,0.95,-2.7],"target":[-0.55,0.68,-0.82]}'),
  ('latch-s2', 'proc-latch-rl', 2, '트림 패널 분리', '트림 쪽 하네스 커넥터를 분리하고, 패널을 위로 들어 도어에서 빼냅니다.', 'connector', NULL, 4, FALSE, '["trim"]', '/manual/model3/t-s2.jpg', '{"position":[-0.2,1.05,-2.9],"target":[-0.55,0.72,-1]}'),
  ('latch-s3', 'proc-latch-rl', 3, '도어 글라스 탈거', '인너 벨트 실을 떼고 글라스를 내려 레귤레이터 클램프 볼트를 풉니다. 볼트는 재사용하지 않습니다.', 'bolt', '9.5 N·m · 13 mm · 교체', 12, FALSE, '["glass"]', '/manual/model3/t-s3.jpg', '{"position":[0.1,1.35,-2.9],"target":[-0.55,0.9,-1]}'),
  ('latch-s4', 'proc-latch-rl', 4, '윈도 레귤레이터 탈거', '모터 커넥터와 수동 해제 케이블 클립(2개)을 풀고, 나사 13개와 금속 클립을 풀어 레귤레이터를 뺍니다.', 'screw', NULL, 10, FALSE, '["regulator"]', '/manual/model3/t-s4.jpg', '{"position":[-0.35,0.95,-2.4],"target":[-0.55,0.72,-0.86]}'),
  ('latch-s5', 'proc-latch-rl', 5, '래치 커넥터 분리', '리어 도어 하네스를 래치 커넥터에서 분리합니다.', 'connector', NULL, 3, FALSE, '["latchConn"]', '/manual/model3/t-s5.jpg', '{"position":[-1.55,0.95,-1.75],"target":[-0.93,0.68,-0.86]}'),
  ('latch-s6', 'proc-latch-rl', 6, '래치 볼트 해제', '도어 뒤쪽 면에서 래치를 고정한 볼트를 풉니다.', 'bolt', 'Torx T25 · 4인치 연장대', 4, FALSE, '["latchBolts"]', '/manual/model3/t-s6.jpg', '{"position":[-2,0.9,-1.25],"target":[-1,0.7,-0.86]}'),
  ('latch-s7', 'proc-latch-rl', 7, '래치 탈거', '래치 케이블 그로밋을 도어 격벽 안쪽으로 밀어 넣으면서 케이블과 함께 래치를 빼냅니다.', 'cable', NULL, 5, FALSE, '["latch"]', '/manual/model3/t-s7.jpg', '{"position":[-1.75,1.05,-2.1],"target":[-1.05,0.72,-1.05]}'),
  ('head-s1', 'proc-headlight-lh', 1, '서비스 모드 켜고 프렁크 수납함 탈거', '터치스크린에서 서비스 모드를 켜고, 언더후드 에이프런과 프렁크 수납함을 떼어 냅니다.', 'clip', NULL, 10, FALSE, '["frunk"]', NULL, '{"position":[3.4,2.6,-1.6],"target":[1.7,0.6,0]}'),
  ('head-s2', 'proc-headlight-lh', 2, '앞 범퍼 상단 볼트 풀기', '앞 범퍼 커버 위쪽을 차체에 고정한 볼트를 풉니다.', 'bolt', '4 N·m · 10 mm', 6, FALSE, '["fascia"]', '/manual/model3/7A57FF6F-06-1.jpg', '{"position":[3.6,2.2,-1.2],"target":[2.1,0.6,0]}'),
  ('head-s3', 'proc-headlight-lh', 3, '휠 아치 라이너 클립 풀기 (좌우)', '좌우 휠 아치 라이너 앞쪽 클립(각 5개)과 펜더 쪽 볼트를 풉니다.', 'clip', '4 N·m / 3 N·m · 10 mm', 12, FALSE, '["fascia"]', '/manual/model3/7A57FF6F-07-1.jpg', '{"position":[4.1,1.55,-2.3],"target":[1.95,0.68,-0.35]}'),
  ('head-s4', 'proc-headlight-lh', 4, '앞 범퍼 커버 분리', '언더 에어로 실드 볼트 4개를 풀고 범퍼 쪽 커넥터를 분리한 뒤 커버를 앞으로 빼냅니다.', 'bolt', '5 N·m', 14, FALSE, '["fascia"]', '/manual/model3/7A57FF6F-12-1.jpg', '{"position":[4.6,1.2,-1.6],"target":[2.2,0.5,-0.2]}'),
  ('head-s5', 'proc-headlight-lh', 5, '헤드램프 커넥터 분리', '빨간 잠금 탭이 있으면 먼저 풀고 헤드램프 커넥터를 분리합니다.', 'connector', NULL, 3, FALSE, '["headConn"]', '/manual/model3/FF5D0BE4-04-1.jpg', '{"position":[3.2,1.3,-1.6],"target":[1.9,0.75,-0.55]}'),
  ('head-s6', 'proc-headlight-lh', 6, '펜더 브래킷 분리', '펜더 브래킷을 차체에 고정한 볼트를 풀고 브래킷을 떼어 냅니다.', 'bolt', '3 N·m · Torx T20', 3, FALSE, '["bracket"]', '/manual/model3/FF5D0BE4-05-1.jpg', '{"position":[3,1.4,-2],"target":[1.95,0.8,-0.75]}'),
  ('head-s7', 'proc-headlight-lh', 7, '헤드램프 탈거', '헤드램프를 차체에 고정한 나사를 풀고 램프를 빼냅니다. 연식별로 리플렉터형·프로젝터형이 달라 호환되지 않습니다.', 'screw', '5.9 N·m · 10 mm', 6, FALSE, '["headlight"]', '/manual/model3/FF5D0BE4-06-1.jpg', '{"position":[4.1,1.55,-2.3],"target":[1.95,0.68,-0.35]}'),
  ('lv-s1', 'proc-12v', 1, '리어 언더후드 에이프런 탈거', '프렁크 뒤쪽 에이프런을 떼어 냅니다. 작업 전 충전 케이블을 분리하고 창문을 내려 둡니다.', 'clip', NULL, 4, FALSE, '["apron"]', NULL, '{"position":[3,2.5,-1.3],"target":[1.35,0.68,0.1]}'),
  ('lv-s2', 'proc-12v', 2, '캐빈 흡기 덕트 탈거', '배터리 위를 덮은 캐빈 흡기 덕트를 빼냅니다.', 'clip', NULL, 3, FALSE, '["duct"]', NULL, '{"position":[3,2.5,-1.3],"target":[1.35,0.68,0.1]}'),
  ('lv-s3', 'proc-12v', 3, '12V 전원 차단 (음극 분리)', '화면에서 Controls > Safety > Power Off 후, 음극 케이블 너트를 풀고 분리합니다. 문이 닫히지 않게 스트라이커에 수건을 걸어 둡니다.', 'connector', '6 N·m · 10 mm 딥 소켓', 8, FALSE, '["terminalNeg"]', '/manual/model3/E11A35CC-10-1.jpg', '{"position":[2.4,1.9,-0.6],"target":[1.36,0.74,0.2]}'),
  ('lv-s4', 'proc-12v', 4, '양극 단자 분리', '양극 단자 커버를 열고 너트를 풀어 케이블을 분리합니다.', 'connector', '6 N·m · 10 mm', 3, FALSE, '["terminalPos"]', '/manual/model3/A457202A-05-1.jpg', '{"position":[2.4,1.9,-0.4],"target":[1.36,0.74,0.32]}'),
  ('lv-s5', 'proc-12v', 5, '12V 배터리 탈거', '배터리 스트랩을 풀고 왼쪽 호스를 분리한 뒤 배터리를 들어냅니다. 떼어 낸 배터리에 VIN 끝 6자리를 적어 둡니다.', 'module', NULL, 7, FALSE, '["battery"]', '/manual/model3/A457202A-07-1.jpg', '{"position":[3,2.5,-1.3],"target":[1.35,0.68,0.1]}'),
  ('rsv-s1', 'proc-resolver', 1, '리프트 고정·고전압 차단', '2주식 리프트로 차량을 올려 잠금 소리를 확인합니다. 구동계 주변 작업이라 서비스 플러그를 뽑아 고전압을 차단하고 멀티미터로 0V를 확인합니다.', 'measure', NULL, 10, TRUE, '["rdu"]', NULL, '{"position":[-3.6,1.2,2.6],"target":[-1.4,0.35,0]}'),
  ('rsv-s2', 'proc-resolver', 2, '리어 에어로 실드 탈거', '차량 하부의 리어 에어로 실드 패널을 떼어 냅니다.', 'clip', NULL, 8, FALSE, '["aero"]', NULL, '{"position":[-3.3,0.55,1.9],"target":[-1.3,0.32,0.2]}'),
  ('rsv-s3', 'proc-resolver', 3, '리졸버 커버 호스 클립 풀기', '리졸버 커버의 호스 클립을 풀고 반시계 방향으로 90° 돌립니다.', 'clip', NULL, 3, FALSE, '["clip"]', '/manual/model3/A7D5D2BF-04-1.jpg', '{"position":[-3.3,0.55,1.9],"target":[-1.3,0.32,0.2]}'),
  ('rsv-s4', 'proc-resolver', 4, '리졸버 커넥터 분리', '잠금 탭을 풀어 리졸버 커넥터를 분리합니다. 하네스 브래킷은 옆으로 비켜 둡니다.', 'connector', NULL, 4, FALSE, '["resolverConn"]', '/manual/model3/A7D5D2BF-05-1.jpg', '{"position":[-2.6,0.5,1.5],"target":[-1.24,0.35,0.26]}'),
  ('rsv-s5', 'proc-resolver', 5, '리졸버 커넥터 어셈블리 분리', '어셈블리를 고정한 볼트 3개를 풀어 폐기하고 어셈블리를 빼냅니다.', 'bolt', NULL, 6, FALSE, '["resolverAsm"]', '/manual/model3/A7D5D2BF-06-1.jpg', '{"position":[-2.6,0.5,1.5],"target":[-1.26,0.34,0.28]}'),
  ('rsv-s6', 'proc-resolver', 6, '새 어셈블리 장착', 'O링에 깨끗한 KAF1 오일을 얇게 바르고 새 볼트 3개로 장착합니다. 이후 감속기 오일을 보충합니다.', 'bolt', '8 N·m · Torx T25 · 볼트 교체', 8, FALSE, '["resolverAsm"]', '/manual/model3/A7D5D2BF-07-1.jpg', '{"position":[-3.3,0.55,1.9],"target":[-1.3,0.32,0.2]}'),
  ('mxlv-s1', 'proc-mx-lv', 1, '리어 언더후드 에이프런 탈거', '왼쪽 앞문을 열고 창문을 내린 뒤 서비스 모드를 켭니다. 충전 케이블을 뽑고 공조를 끈 채 30초 기다린 다음 에이프런을 떼어 냅니다.', 'clip', NULL, 3, FALSE, '["apronRear"]', '/manual/modelx/7DCA0054.jpg', '{"position":[3.6,2.6,-1.6],"target":[1.6,0.75,0.2]}'),
  ('mxlv-s2', 'proc-mx-lv', 2, 'LV 전원 차단', 'Controls > Safety & Security > Power Off 후 LV 커넥터를 위로 뽑고, 퍼스트 리스폰더 루프를 분리합니다.', 'connector', NULL, 5, FALSE, '["lvConn"]', NULL, '{"position":[2.15,1.4,1.2],"target":[1.42,0.74,0.45]}'),
  ('mxlv-s3', 'proc-mx-lv', 3, '좌우 언더후드 에이프런 탈거', '프렁크 양옆의 에이프런(LH·RH)을 떼어 냅니다.', 'clip', NULL, 3, FALSE, '["apronL","apronR"]', NULL, '{"position":[3.6,2.6,-1.6],"target":[1.6,0.75,0.2]}'),
  ('mxlv-s4', 'proc-mx-lv', 4, '앞 언더후드 에이프런 탈거', '프렁크 앞쪽 에이프런을 떼어 냅니다.', 'clip', NULL, 2, FALSE, '["apronFront"]', NULL, '{"position":[3.6,2.6,-1.6],"target":[1.6,0.75,0.2]}'),
  ('mxlv-s5', 'proc-mx-lv', 5, '언더후드 수납함 탈거', '수납함을 빼야 배터리 쪽 공간이 열립니다.', 'bolt', NULL, 12, FALSE, '["storage"]', NULL, '{"position":[3.6,2.6,-1.6],"target":[1.6,0.75,0.2]}'),
  ('mxlv-s6', 'proc-mx-lv', 6, '와이퍼 모듈 탈거', '와이퍼 모듈을 떼어 냅니다. 개정된 매뉴얼에서 추가된 단계라 예전 절차에는 없습니다.', 'module', NULL, 10, FALSE, '["wiper"]', NULL, '{"position":[3.6,2.6,-1.6],"target":[1.6,0.75,0.2]}'),
  ('mxlv-s7', 'proc-mx-lv', 7, '펌프 호스 클립 해제', '슈퍼매니폴드-배터리 펌프 호스를 LV 배터리에 고정한 클립을 풉니다.', 'clip', NULL, 2, FALSE, '["hoseClip"]', '/manual/modelx/265CD33D.jpg', '{"position":[2.15,1.4,1.2],"target":[1.42,0.74,0.45]}'),
  ('mxlv-s8', 'proc-mx-lv', 8, '고정 볼트 3개 풀기', 'LV 배터리를 에어 서스펜션 리저버에 고정한 볼트 3개를 풉니다.', 'bolt', '9 N·m · 10 mm · 플렉스 헤드 렌치 · 4인치 연장대', 5, FALSE, '["bolts"]', '/manual/modelx/E63F56B4.jpg', '{"position":[2.15,1.4,1.2],"target":[1.42,0.74,0.45]}'),
  ('mxlv-s9', 'proc-mx-lv', 9, 'LV 배터리 탈거', '배터리를 돌려서 카울 스크린 패널과 에어 서스펜션 리저버 사이로 빼냅니다. 장착 후에는 새 배터리 학습과 팰컨 윙 도어 캘리브레이션이 필요합니다.', 'module', NULL, 4, FALSE, '["battery"]', '/manual/modelx/C4133FF3.jpg', '{"position":[2.15,1.4,1.2],"target":[1.42,0.74,0.45]}'),
  ('mxfw-s1', 'proc-mx-fw-latch', 1, '리어 도어 트림 탈거', '앞문을 열고 앞창을 내린 뒤 리어 도어 하단 가니시, 트림 데코, 트림 패널을 차례로 떼어 냅니다.', 'clip', NULL, 10, FALSE, '["trim"]', NULL, '{"position":[-0.6,1.05,-3],"target":[-0.6,0.6,-0.82]}'),
  ('mxfw-s2', 'proc-mx-fw-latch', 2, '하부 래치 커버 탈거', '커버 둘레에 마스킹 테이프로 위치를 표시하고, 나사 2개를 풀어 커버를 뗍니다. 나사는 재사용하지 않습니다.', 'screw', '12 N·m · T30', 4, FALSE, '["latchCover"]', '/manual/modelx/C2239346.jpg', '{"position":[-1.35,0.85,-2.1],"target":[-0.86,0.34,-0.83]}'),
  ('mxfw-s3', 'proc-mx-fw-latch', 3, 'LV 전원 차단·에어백 커넥터 분리', 'LV 전원을 끊은 뒤 주황색 잠금 탭을 풀고 팰컨 윙 도어 에어백 커넥터를 분리합니다. 에어백 회로라 반드시 전원 차단 후 작업합니다.', 'connector', NULL, 5, FALSE, '["airbagConn"]', '/manual/modelx/6BA79EF4.jpg', '{"position":[-0.6,1.05,-3],"target":[-0.6,0.6,-0.82]}'),
  ('mxfw-s4', 'proc-mx-fw-latch', 4, '클로즈아웃 패널 나사 풀기', '클로즈아웃 패널을 도어에 고정한 나사 10개를 풉니다.', 'screw', '1.8 N·m · T25', 8, FALSE, '["closeout"]', '/manual/modelx/F6456A27.jpg', '{"position":[-0.6,1.05,-3],"target":[-0.6,0.6,-0.82]}'),
  ('mxfw-s5', 'proc-mx-fw-latch', 5, '윈도 모터 분리', '윈도 모터 나사 3개를 풀고, 패널 탭 2개를 풀어 패널을 당긴 뒤 모터를 위로 들어 뺍니다.', 'screw', '1.8 N·m · T30', 6, FALSE, '["winMotor"]', '/manual/modelx/5C2335A2.jpg', '{"position":[-0.6,1.05,-3],"target":[-0.6,0.6,-0.82]}'),
  ('mxfw-s6', 'proc-mx-fw-latch', 6, '도어 ECU·모듈 커넥터 분리', '검은 잠금 탭을 풀어 도어 보호 ECU를 분리하고, 도어 모듈 커넥터 2개와 하네스 클립 7개를 풉니다.', 'connector', NULL, 8, FALSE, '["doorEcu"]', '/manual/modelx/D5F8D603.jpg', '{"position":[-0.6,1.05,-3],"target":[-0.6,0.6,-0.82]}'),
  ('mxfw-s7', 'proc-mx-fw-latch', 7, '리어 도어 스피커 탈거', '스피커 볼트 4개를 풀고 커넥터를 분리해 스피커를 빼냅니다.', 'bolt', '4 N·m · T25', 5, FALSE, '["speaker"]', '/manual/modelx/D09CE733.jpg', '{"position":[-0.6,1.05,-3],"target":[-0.6,0.6,-0.82]}'),
  ('mxfw-s8', 'proc-mx-fw-latch', 8, '시칭 액추에이터 탈거', '너트 3개를 풀고 액추에이터를 위로 들어 도어에서 분리합니다.', 'bolt', '3 N·m · 10 mm', 6, FALSE, '["cincher"]', '/manual/modelx/E40DEAC4.jpg', '{"position":[-1.35,0.85,-2.1],"target":[-0.86,0.34,-0.83]}'),
  ('mxfw-s9', 'proc-mx-fw-latch', 9, '래치 슈라우드 탈거', '탭 2개를 풀어 래치 슈라우드를 뗍니다.', 'clip', NULL, 3, FALSE, '["shroud"]', '/manual/modelx/07327300.jpg', '{"position":[-1.35,0.85,-2.1],"target":[-0.86,0.34,-0.83]}'),
  ('mxfw-s10', 'proc-mx-fw-latch', 10, '래치·액추에이터 어셈블리 탈거', '커넥터 2개를 분리하고 래치·액추에이터 어셈블리를 도어에서 빼냅니다.', 'module', NULL, 6, FALSE, '["latch"]', '/manual/modelx/8811EB0E.jpg', '{"position":[-1.35,0.85,-2.1],"target":[-0.86,0.34,-0.83]}'),
  ('mxus-s1', 'proc-mx-us', 1, '도어 열고 트림 패널 탈거', '앞문을 열고 앞·뒤 창을 내린 뒤 팰컨 윙 도어를 열고 리어 도어 트림 패널을 떼어 냅니다.', 'clip', NULL, 10, FALSE, '["trim"]', NULL, '{"position":[-0.6,1.05,-3],"target":[-0.6,0.6,-0.82]}'),
  ('mxus-s2', 'proc-mx-us', 2, 'LV 전원 차단', 'Controls > Safety & Security > Power Off 후 LV 전원을 차단합니다.', 'connector', NULL, 5, FALSE, '["closeout"]', NULL, '{"position":[-0.6,1.05,-3],"target":[-0.6,0.6,-0.82]}'),
  ('mxus-s3', 'proc-mx-us', 3, '클로즈아웃 패널 탈거', '리어 도어 클로즈아웃 패널을 떼어 냅니다.', 'screw', '1.8 N·m · T25', 10, FALSE, '["closeout"]', NULL, '{"position":[-0.6,1.05,-3],"target":[-0.6,0.6,-0.82]}'),
  ('mxus-s4', 'proc-mx-us', 4, '센서 캡·스프링·스페이서 분리', '초음파 센서의 캡, 스프링, 스페이서를 차례로 뺍니다.', 'clip', NULL, 4, FALSE, '["usSensor"]', '/manual/modelx/308838DC.jpg', '{"position":[-0.6,1.05,-3],"target":[-0.6,0.6,-0.82]}'),
  ('mxus-s5', 'proc-mx-us', 5, '잠금 클립 해제·커넥터 분리', '클립 프라이 툴로 센서 잠금 클립을 풀고 센서 커넥터를 분리합니다.', 'connector', NULL, 3, FALSE, '["usSensor"]', '/manual/modelx/9745A764.jpg', '{"position":[-0.6,1.05,-3],"target":[-0.6,0.6,-0.82]}'),
  ('mxus-s6', 'proc-mx-us', 6, '초음파 센서 탈거', '센서를 빼내 폐기합니다. 새 센서는 재사용하지 않는 부품으로 교체합니다.', 'module', NULL, 3, FALSE, '["usSensor"]', '/manual/modelx/40B96632.jpg', '{"position":[-0.6,1.05,-3],"target":[-0.6,0.6,-0.82]}'),
  ('mxcp-s1', 'proc-mx-cp-ecu', 1, '미드 C필러 트림 탈거', '앞좌석을 앞으로 밀고 팰컨 윙 도어를 연 뒤 왼쪽 미드 C필러 트림을 떼어 냅니다. 6·7인승은 2열 모노포스트와 3열 등받이를 접습니다.', 'clip', NULL, 8, FALSE, '["cpTrim"]', NULL, '{"position":[-2.4,1.5,-2.5],"target":[-1.6,1,-0.8]}'),
  ('mxcp-s2', 'proc-mx-cp-ecu', 2, 'LV 전원 차단·어퍼 C필러 트림 탈거', 'LV 전원을 차단하고 어퍼 C필러 트림을 떼어 냅니다.', 'clip', NULL, 8, FALSE, '["cpTrim"]', NULL, '{"position":[-2.4,1.5,-2.5],"target":[-1.6,1,-0.8]}'),
  ('mxcp-s3', 'proc-mx-cp-ecu', 3, 'NVH 폼 분리', 'C필러 NVH 폼을 떼어 냅니다. 찢어지지 않게 조심합니다.', 'adhesive', NULL, 3, FALSE, '["foam"]', '/manual/modelx/10F53455.jpg', '{"position":[-2.4,1.5,-2.5],"target":[-1.6,1,-0.8]}'),
  ('mxcp-s4', 'proc-mx-cp-ecu', 4, '수동 해제 케이블 클립 해제', '충전 포트 수동 해제 케이블을 존 브래킷에 고정한 클립을 풉니다.', 'clip', NULL, 2, FALSE, '["cable"]', '/manual/modelx/5665BDA3.jpg', '{"position":[-2.4,1.5,-2.5],"target":[-1.6,1,-0.8]}'),
  ('mxcp-s5', 'proc-mx-cp-ecu', 5, '존 브래킷 탈거', '나사 4개와 푸시 클립 3개를 풀어 미드 C필러 존 브래킷을 뗍니다.', 'screw', 'T20 · 4인치 연장대 · 유니버설 조인트', 8, FALSE, '["zoneBracket"]', '/manual/modelx/735C81A3.jpg', '{"position":[-2.4,1.5,-2.5],"target":[-1.6,1,-0.8]}'),
  ('mxcp-s6', 'proc-mx-cp-ecu', 6, 'ECU 커넥터 3개 분리', '충전 포트 ECU의 하네스 커넥터 3개를 분리합니다.', 'connector', NULL, 3, FALSE, '["cpConn"]', '/manual/modelx/9620FB97.jpg', '{"position":[-2.4,1.5,-2.5],"target":[-1.6,1,-0.8]}'),
  ('mxcp-s7', 'proc-mx-cp-ecu', 7, '충전 포트 ECU 탈거', '볼트를 풀고 ECU를 위로 밀어 클립에서 빼낸 뒤 꺼냅니다.', 'bolt', '10 mm · 플렉스 헤드 렌치', 4, FALSE, '["cpEcu"]', '/manual/modelx/3F01EBAA.jpg', '{"position":[-2.4,1.5,-2.5],"target":[-1.6,1,-0.8]}');

INSERT INTO knowledge.knowledge_entry (id, step_id, author_id, author_name, parent_id, entry_type, body, visibility, helpful, created_at) VALUES
  ('k-latch-1', 'latch-s1', 'seed-박 실장', '박 실장', NULL, 'TIP', '퍼들 램프를 먼저 빼 두면 클립 풀 때 손이 덜 갑니다.', 'PUBLIC', 31, '2026-11-01 09:00:00'),
  ('k-latch-3', 'latch-s3', 'seed-이 정비사', '이 정비사', NULL, 'TIP', '글라스를 내릴 때 퍼들 램프를 임시로 꽂아야 창문 스위치가 동작합니다.', 'PUBLIC', 18, '2026-11-01 09:00:00'),
  ('k-head-3', 'head-s3', 'seed-최 기사', '최 기사', NULL, 'TIP', '범퍼 클립이 잘 부러지니 8 mm 리벳 클립을 20개 이상 미리 준비하세요.', 'PUBLIC', 27, '2026-11-01 09:00:00'),
  ('k-head-7', 'head-s7', 'seed-박 실장', '박 실장', NULL, 'TIP', '교체 후 Toolbox에서 램프 코딩이 필요할 수 있습니다.', 'PUBLIC', 15, '2026-11-01 09:00:00'),
  ('k-lv-3', 'lv-s3', 'seed-이 정비사', '이 정비사', NULL, 'TIP', '알림이 여러 개 떠도 다른 모듈보다 12V 전압부터 재 보세요. 대부분 여기서 끝납니다.', 'PUBLIC', 41, '2026-11-01 09:00:00'),
  ('k-rsv-2', 'rsv-s2', 'seed-한 정비사', '한 정비사', NULL, 'TIP', '에어로 실드 볼트는 길이가 섞여 있어서 위치별로 따로 모아 두세요.', 'PUBLIC', 12, '2026-11-01 09:00:00'),
  ('k-mxlv-5', 'mxlv-s5', 'seed-박 정비사', '박 정비사', NULL, 'TIP', '수납함 볼트가 안쪽 깊이 있어서 긴 연장대가 있으면 훨씬 빠릅니다.', 'PUBLIC', 12, '2026-11-01 09:00:00'),
  ('k-mxlv-9', 'mxlv-s9', 'seed-이 정비사', '이 정비사', NULL, 'TIP', '장착 뒤 팰컨 윙 도어 캘리브레이션을 빼먹으면 문이 끝까지 안 닫힙니다. B필러 위 버튼을 Close 방향으로 누르세요.', 'PUBLIC', 19, '2026-11-01 09:00:00'),
  ('k-mxfw-2', 'mxfw-s2', 'seed-정 정비사', '정 정비사', NULL, 'TIP', '마스킹 테이프로 커버 위치를 꼭 표시하세요. 위치가 틀어지면 도어가 끝까지 안 닫힙니다.', 'PUBLIC', 17, '2026-11-01 09:00:00'),
  ('k-mxfw-4', 'mxfw-s4', 'seed-박 정비사', '박 정비사', NULL, 'TIP', '나사 10개가 길이가 같아서 섞여도 되지만, 토크가 1.8 N·m라 전동 드라이버는 저속으로 쓰세요.', 'PUBLIC', 9, '2026-11-01 09:00:00'),
  ('k-mxus-1', 'mxus-s1', 'seed-정 정비사', '정 정비사', NULL, 'TIP', '교체 전에 센서 표면부터 닦아 보세요. 세차 왁스 막 때문에 오작동하는 경우가 꽤 있습니다.', 'PUBLIC', 23, '2026-11-01 09:00:00'),
  ('k-mxcp-5', 'mxcp-s5', 'seed-이 정비사', '이 정비사', NULL, 'TIP', '아래쪽 나사는 유니버설 조인트 없이는 거의 안 닿습니다. 미리 준비해 두세요.', 'PUBLIC', 14, '2026-11-01 09:00:00');

INSERT INTO record.cause_stat_baseline (profile_id, dtc_code, part_id, cause_count) VALUES
  ('m3-lr-rwd-2018', 'B1A24', 'part-latch-rl', 25),
  ('m3-lr-rwd-2018', 'B1A24', 'part-switch-rl', 12),
  ('m3-lr-rwd-2018', 'B1A24', 'part-harness-rl', 8),
  ('m3-lr-rwd-2018', 'B1A24', 'part-hall-rl', 2),
  ('m3-lr-rwd-2018', 'B1C12', 'part-headlight-lh', 21),
  ('m3-lr-rwd-2018', 'B1C12', 'part-headlight-conn', 13),
  ('m3-lr-rwd-2018', 'B1C12', 'part-front-bcm', 6),
  ('m3-lr-rwd-2018', 'B1C12', 'part-front-fuse', 4),
  ('m3-lr-rwd-2018', 'B0F71', 'part-12v', 27),
  ('m3-lr-rwd-2018', 'B0F71', 'part-12v-terminal', 11),
  ('m3-lr-rwd-2018', 'B0F71', 'part-dcdc', 9),
  ('m3-lr-rwd-2018', 'B0F71', 'part-parasitic', 5),
  ('m3-lr-rwd-2018', 'P0A3F', 'part-rdu-resolver', 16),
  ('m3-lr-rwd-2018', 'P0A3F', 'part-resolver-harness', 9),
  ('m3-lr-rwd-2018', 'P0A3F', 'part-resolver-sensor', 6),
  ('m3-lr-rwd-2018', 'P0A3F', 'part-inverter', 3),
  ('mx-lr-2022', 'B0F71', 'part-mx-lv', 14),
  ('mx-lr-2022', 'B0F71', 'part-mx-lv-conn', 9),
  ('mx-lr-2022', 'B0F71', 'part-mx-parasitic', 4),
  ('mx-lr-2022', 'B1A24', 'part-mx-fw-latch', 15),
  ('mx-lr-2022', 'B1A24', 'part-mx-fw-cincher', 9),
  ('mx-lr-2022', 'B1A24', 'part-mx-fw-ecu', 6),
  ('mx-lr-2022', 'B1A24', 'part-mx-fw-cal', 3),
  ('mx-lr-2022', 'B1A3C', 'part-mx-us-sensor', 10),
  ('mx-lr-2022', 'B1A3C', 'part-mx-us-module', 6),
  ('mx-lr-2022', 'B1A3C', 'part-mx-us-harness', 3),
  ('mx-lr-2022', 'B1F42', 'part-mx-cp-ecu', 13),
  ('mx-lr-2022', 'B1F42', 'part-mx-cp-door', 11),
  ('mx-lr-2022', 'B1F42', 'part-mx-cp-cable', 5);

INSERT INTO record.cause_stat_baseline_total (profile_id, dtc_code, n) VALUES
  ('m3-lr-rwd-2018', 'B1A24', 48),
  ('m3-lr-rwd-2018', 'B1C12', 44),
  ('m3-lr-rwd-2018', 'B0F71', 52),
  ('m3-lr-rwd-2018', 'P0A3F', 34),
  ('mx-lr-2022', 'B0F71', 31),
  ('mx-lr-2022', 'B1A24', 33),
  ('mx-lr-2022', 'B1A3C', 19),
  ('mx-lr-2022', 'B1F42', 34);

INSERT INTO record.repair_job (id, vehicle_id, profile_id, dtc_code, technician_id, status, symptoms, data_origin, candidate_part_ids, actual_cause_part_id, actual_minutes, stuck_step_id, module_replaced, memo, memo_public, created_at, completed_at) VALUES
  ('job-seed-h1', 'veh-m3-001', 'm3-lr-rwd-2018', 'P0A3F', 'tech-kim', 'IN_PROGRESS', NULL, 'SEED', 'part-rdu-resolver,part-resolver-harness,part-resolver-sensor,part-inverter', NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-10 11:15:00', NULL),
  ('job-seed-h2', 'veh-m3-001', 'm3-lr-rwd-2018', 'B1A24', 'tech-kim', 'COMPLETED', NULL, 'SEED', 'part-latch-rl,part-switch-rl,part-harness-rl,part-hall-rl', 'part-latch-rl', 52, NULL, FALSE, NULL, FALSE, '2026-11-10 09:40:00', '2026-11-10 09:40:00');

INSERT INTO record.job_task (id, job_id, procedure_id, procedure_version, target_part_id, standard_minutes_snapshot, step_count, created_at) VALUES
  ('task-seed-h1', 'job-seed-h1', 'proc-resolver', 'M3-2017-2023 / 40014802 (4DU)', 'part-rdu-resolver', 72, 6, '2026-11-10 11:15:00'),
  ('task-seed-h2', 'job-seed-h2', 'proc-latch-rl', 'M3-2017-2023 / 11353702', 'part-latch-rl', 44, 7, '2026-11-10 09:40:00');

INSERT INTO record.step_record (task_id, step_id, started_at, ended_at, blocked, difficulty_note, safety_ack_user_id, safety_ack_at) VALUES
  ('task-seed-h1', 'rsv-s1', '2026-11-10 11:15:00', '2026-11-10 11:15:00', FALSE, NULL, 'tech-kim', '2026-11-10 11:15:00'),
  ('task-seed-h1', 'rsv-s2', '2026-11-10 11:15:00', '2026-11-10 11:15:00', FALSE, NULL, NULL, NULL),
  ('task-seed-h1', 'rsv-s3', '2026-11-10 11:15:00', '2026-11-10 11:15:00', FALSE, NULL, NULL, NULL),
  ('task-seed-h2', 'latch-s1', '2026-11-10 09:40:00', '2026-11-10 09:40:00', FALSE, NULL, NULL, NULL),
  ('task-seed-h2', 'latch-s2', '2026-11-10 09:40:00', '2026-11-10 09:40:00', FALSE, NULL, NULL, NULL),
  ('task-seed-h2', 'latch-s3', '2026-11-10 09:40:00', '2026-11-10 09:40:00', FALSE, NULL, NULL, NULL),
  ('task-seed-h2', 'latch-s4', '2026-11-10 09:40:00', '2026-11-10 09:40:00', FALSE, NULL, NULL, NULL),
  ('task-seed-h2', 'latch-s5', '2026-11-10 09:40:00', '2026-11-10 09:40:00', FALSE, NULL, NULL, NULL),
  ('task-seed-h2', 'latch-s6', '2026-11-10 09:40:00', '2026-11-10 09:40:00', FALSE, NULL, NULL, NULL);

