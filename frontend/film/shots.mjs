// 영상 v2 장면 목록 (docs/video/v2-plan.md 7분 배분). 장면마다 setup은 녹화 전 상태 맞추기, act는 녹화되는 동작.
// 자막은 한 번에 한 문장, 최소 한 마디(2초) 보이게 둔다.
import { readFileSync } from 'node:fs';

const M3 = '5YJ3E1EA0JF000000', MX = '7SAXCBE50NF000000';
// 녹화 전에 차량·코드·수리 상태를 맞춘다 (화면 밖 준비)
const prep = (vin, code, part) => async t => t.page.evaluate(async (v, c, p) => {
  const S = window.__repairStore;
  if (v) await S.getState().lookup(v);
  if (c) await S.getState().pickCode(c);
  if (p) await S.getState().startRepair(p);
}, vin, code, part);
const projection = 'data:image/png;base64,' + readFileSync(new URL('./assets/mx-side-projection.png', import.meta.url)).toString('base64');

export const SHOTS = {
  // ── 프롤로그 (0:35) ──
  s00_prologue: {
    normal: true, // 글자만 나오는 장면이라 배속하지 않음
    setup: async t => { await t.page.evaluate(() => document.getElementById('film-title').classList.remove('off')); },
    act: async t => {
      await t.beats(2);
      await t.film('lines', [{ text: '작년에 처음 나온 전기차.', hold: 2400 }, { text: '10년 차 정비사도, 처음 봅니다.', hold: 3000 }]);
      await t.film('lines', [{ text: '고장코드는 어디가 아픈지만 알려 줍니다.', hold: 2600 }, { text: '어디부터 볼지, 무엇을 먼저 뗄지는', hold: 2000 }, { text: '아직 경험에 맡겨져 있습니다.', hold: 3000 }]);
      await t.film('lines', [{ text: '공장은 조립하기 쉬운 차를 만듭니다.', hold: 2400 }, { text: '그 차가 얼마나 고치기 어려운지는,', hold: 2000 }, { text: '모릅니다.', hold: 3200 }]);
      await t.film('lines', [{ text: '그래서, 차에도', hold: 1800 }, { text: '의사의 X-ray를 쥐여 주기로 했습니다.', hold: 3000 }]);
      await t.film('logo', '고장코드에서 마지막 볼트까지.'); await t.beats(8);
    },
  },
  // ── 개념 (0:20) ──
  s01_concept: {
    normal: true, // 글자만 나오는 장면이라 배속하지 않음
    setup: async t => { await t.page.evaluate(() => document.getElementById('film-title').classList.remove('off')); },
    act: async t => {
      await t.beats(1);
      await t.film('loop', ['정비사가 고친다', '한 번 기록한다', '공장이 배운다', '다음 정비사가 빨라진다']);
      await t.beats(14);
      await t.film('lines', [{ text: 'CarDoc', hold: 1600 }, { text: '차를 진찰하듯, 고장코드에서 마지막 볼트까지.', small: true, hold: 2600 }]);
    },
  },
  // ── 1장 첫 화면 (0:30) ──
  s02_first: {
    setup: async t => { await t.waitCanvas(); await t.panels(false, false); },
    act: async t => {
      await t.film('chapter', '01', '첫 화면', '차를 고르면, 차가 열립니다');
      await t.orbit(-120, 3600, 10); await t.beats(1);
      await t.panels(true, false, '.icon-btn[aria-label^="정비사·차량"]'); await t.beats(1);
      await t.panels(true, true, '.icon-btn[aria-label^="진단 패널"]'); await t.beats(1);
      await t.cap('정비사', '누가, 어떤 자격으로 고치는지부터.'); await t.focus('.lside .me'); await t.beats(4);
      await t.cap('차량', 'VIN 17자리를 넣으면,');
      await t.tap('#vin'); await t.type('#vin', '5YJ3E1EA0JF000000', 45); await t.tap('.vin button', '조회'); await t.beats(2);
      await t.cap('차량', '사양과 생산 시기가 바로 잡힙니다.'); await t.focus('.rp-h'); await t.beats(4);
      await t.cap('오늘 내 작업', '멈춘 작업은 그 단계부터, 그 차로 다시 열립니다.'); await t.focus('.hist'); await t.beats(4);
      await t.cap('두 차종', 'Model 3와 Model X, 같은 방식으로.');
      await t.tap('.vsel button', 'Tesla Model X'); await t.beats(4);
    },
  },
  // ── 2장 코드 찾기 (0:25) ──
  s03_find: {
    setup: async t => { await t.waitCanvas(); await prep(MX)(t); },
    act: async t => {
      await t.film('chapter', '02', '고장코드 찾기', '코드를 몰라도, 증상에서');
      await t.cap('접수 증상', '고객에게 들은 증상을 고르면');
      await t.tap('.chip', '문이 안 닫힘'); await t.beats(2);
      await t.cap('접수 증상', '맞는 고장코드가 위로 올라옵니다.'); await t.focus('.codes'); await t.beats(3);
      await t.tap('.chips .link', '증상 더 보기'); await t.beats(2);
      await t.cap('검색', '돋보기로, 코드든 증상이든.');
      await t.tap('.search-btn'); await t.beats(1); await t.type('.search-box input', '충전', 140); await t.beats(2);
      await t.cap('검색', '↑ ↓ 와 Enter, 키보드만으로 바로 진단.');
      await t.key('ArrowDown', 1, 1); await t.key('Enter', 1, 3);
      await t.focus('.code-card'); await t.beats(3);
    },
  },
  // ── 3장 원인 후보 (0:40) ──
  s04_cands: {
    setup: async t => { await t.waitCanvas(); await prep(M3)(t); },
    act: async t => {
      await t.film('chapter', '03', '원인 후보', '어디부터 볼지');
      await t.tap('.codes button', 'B1A24'); await t.beats(3);
      await t.cap('공식 점검 순서', '제조사 진단 순서 그대로, 실제로 확인된 비율과 함께.'); await t.focus('.cands > li.on .pct'); await t.beats(4);
      await t.cap('3D', '후보를 고를 때마다, 그 부품으로 날아갑니다.');
      for (const n of ['실내 도어 열림 스위치', '리어 도어 하네스', '외부 핸들 홀 센서']) { await t.tap('.cands > li .cand-h', n); await t.beats(3); }
      await t.cap('표본 기준', '30건이 안 되면, 참고용이라고 솔직하게.'); await t.focus('.cands > li.on .meta'); await t.beats(4);
      await t.tap('.cands > li .cand-h', '리어 도어 래치'); await t.beats(2);
      await t.cap('같은 코드, 다른 차', 'Model X는 같은 코드에 10단계입니다.'); await t.focus('.cands > li.on dl'); await t.beats(4);
    },
  },
  // ── 4장 점검 (0:30) ──
  s05_inspect: {
    setup: async t => { await t.waitCanvas(); await prep(MX, 'B1A24')(t); await t.page.evaluate(() => window.__repairStore.getState().select(1)); },
    act: async t => {
      await t.film('chapter', '04', '점검', '확인하고, 확정하고, 다음으로');
      await t.cap('점검 방법', '단계마다 정상 기준이 있습니다.');
      for (const i of [1, 2]) { await t.tap(`.cands > li.on .inspect li:nth-child(${i}) input`); await t.beats(1); }
      await t.cap('점검 방법', '모두 정상이면, 다음 후보로.');
      await t.tap('.cands > li.on .verdict button', '모두 정상'); await t.beats(3);
      await t.cap('코드 여러 개', '진단기에 코드가 더 떴다면, 공통 원인부터.');
      await t.select('.add-code select', 'B0F71'); await t.beats(4);
      await t.tap('.code-list .link[aria-label="B0F71 빼기"]'); await t.beats(2);
      await t.tap('.cands > li .cand-h', '팰컨 윙 래치'); await t.beats(1);
      await t.cap('원인 확정', '이상이 보이면, 그 자리에서 확정.');
      await t.tap('.cands > li.on .verdict button', '이상 있음'); await t.beats(3);
    },
  },
  // ── 5장 3D 분해 (0:55) ──
  s06_repair: {
    setup: async t => { await t.waitCanvas(); await prep(M3, 'B1A24', 'part-latch-rl')(t); await t.beats(4); },
    act: async t => {
      await t.film('chapter', '05', '3D 분해 경로', '무엇을 먼저 뗄지, 손대기 전에');
      await t.cap('실제 차체', '떼어 낼 부품은 빨강, 목표는 파랑.'); await t.beats(4);
      await t.cap('단계', '한 단계씩, 부품이 빠져나갑니다.');
      await t.key('ArrowRight', 3, 3);
      await t.cap('매뉴얼', '실제 매뉴얼 그림과 토크, 공구까지.'); await t.focus('.card[aria-current="step"]'); await t.beats(4);
      await t.cap('매뉴얼', '그림을 크게 보고 싶을 땐 접고,');
      await t.tap('[aria-label^="매뉴얼 접기"]'); await t.beats(3); await t.orbit(220, 2600, -30); await t.beats(1);
      await t.cap('매뉴얼', '필요할 땐 언제든 다시.');
      await t.tap('.manual-fab'); await t.beats(3);
      await t.cap('매뉴얼', '창 높이도 손에 맞게.');
      { const g = await (await t.page.$('.grip')).boundingBox(); const x = g.x + g.width / 2, y = g.y + 5; await t.page.evaluate((a, b) => window.film.point(a, b), x, y); await new Promise(r => setTimeout(r, 520)); await t.page.evaluate((a, b) => window.film.ripple(a, b), x, y); t.mark(g); await t.page.mouse.move(x, y); await t.page.mouse.down(); for (let i = 1; i <= 40; i++) { await t.page.mouse.move(x, y - i * 2); await t.page.evaluate((a, b) => window.film.point(a, b), x, y - i * 2); await new Promise(r => setTimeout(r, 16)); } await t.page.mouse.up(); }
      await t.beats(2);
      await t.cap('단계 이동', '진행 단계를 눌러도, 키보드 ← → 로도.');
      await t.tap('.tl li button', '도어 트림'); await t.beats(2); await t.key('ArrowRight', 3, 2);
    },
  },
  // ── 6장 단계 기록 (0:20) ──
  s07_steplog: {
    setup: async t => { await t.waitCanvas(); await prep(MX, 'B1A24', 'part-mx-fw-latch')(t); await t.page.keyboard.press('ArrowRight'); await t.beats(4); },
    act: async t => {
      await t.film('chapter', '06', '단계 기록', '막힌 곳은, 그 단계에');
      await t.cap('시간', '단계마다 걸린 시간은 저절로 잽니다.'); await t.focus('.steplog'); await t.beats(3);
      await t.cap('막혔어요', '막힌 이유를 한 번에.');
      await t.tap('.steplog button', '막혔어요'); await t.beats(1); await t.tap('.reasons button', '부품 고착'); await t.beats(2);
      await t.cap('팁', '요령은 다음 정비사에게.');
      await t.tap('.steplog button', '팁 남기기'); await t.type('.tipform input:not([type])', '커버 둘레에 마스킹 테이프로 위치를 꼭 표시하세요', 40); await t.tap('.tipform button', '저장'); await t.beats(3);
    },
  },
  // ── 7장 고전압 (0:20) ──
  s08_hv: {
    setup: async t => { await t.waitCanvas(); await prep(M3, 'P0A3F', 'part-rdu-resolver')(t); await t.beats(4); },
    act: async t => {
      await t.film('chapter', '07', '고전압', '확인 전에는, 잠깁니다');
      await t.cap('고전압', '0V 확인 전에는, 다음 단계도 기록도 잠깁니다.'); await t.focus('.hvband'); await t.beats(3);
      await t.key('ArrowRight', 1, 2); await t.focus('.rp-f .pill.solid'); await t.beats(2);
      await t.cap('고전압', '확인하는 순간, 길이 열립니다.');
      await t.tap('.hvband input'); await t.beats(3); await t.focus('.hv-done'); await t.key('ArrowRight', 1, 2);
    },
  },
  // ── 8장 결과 기록 (0:25) ──
  s09_record: {
    setup: async t => { await t.waitCanvas(); await prep(MX, 'B1A24', 'part-mx-fw-latch')(t); await t.page.evaluate(async () => { const S = window.__repairStore; S.getState().goTo(3); S.getState().markBlocked('공구 접근 어려움'); S.getState().goTo(9); }); await t.beats(3); },
    act: async t => {
      await t.film('chapter', '08', '결과 기록', '1분이면 됩니다');
      await t.tap('.manual-h .nav button', '결과 기록'); await t.beats(2);
      await t.cap('요약', '걸린 시간과 막힌 단계는, 이미 채워져 있습니다.'); await t.focus('.record .summary'); await t.beats(3);
      await t.cap('장착 뒤 할 일', '팰컨 윙 캘리브레이션까지 확인해야 제출됩니다.');
      for (const i of [1, 2]) { await t.tap(`.record .after label:nth-of-type(${i}) input`); await t.beats(1); }
      await t.page.click('.record input[type=number]', { clickCount: 3 }); await t.type('.record input[type=number]', '92', 120); await t.beats(1);
      await t.tap('.record button[type=submit]'); await t.beats(1);
      await t.cap('반영', '내 기록 한 건이, 다음 정비사의 숫자를 바꿉니다.'); await t.focus('.rr-nums'); await t.beats(5);
    },
  },
  // ── 9장 Model X (0:50) ──
  s10_modelx_lv: {
    setup: async t => { await t.waitCanvas(); await prep(MX)(t); await t.beats(3); },
    act: async t => {
      await t.film('chapter', '09', 'Model X', '같은 코드, 다른 차');
      await t.tap('.codes button', 'B0F71'); await t.beats(2);
      await t.cap('같은 코드, 다른 차', 'Model 3는 5단계. Model X는 9단계.'); await t.focus('.cands > li.on dl'); await t.beats(3);
      await t.tap('.cands > li.on button', '수리 진행'); await t.beats(2);
      await t.cap('프렁크', '에이프런, 수납함, 와이퍼까지 뜯어야 배터리가 보입니다.'); await t.key('ArrowRight', 8, 1.5);
      await t.focus('.card[aria-current="step"]'); await t.beats(3);
    },
  },
  s11_modelx_doors: {
    setup: async t => { await t.waitCanvas(); await prep(MX)(t); await t.beats(3); },
    act: async t => {
      await t.cap('초음파 센서', '문이 중간에 멈추는 팰컨 윙, 센서 하나까지.');
      await t.page.evaluate(async () => { const S = window.__repairStore.getState(); S.reset(); await window.__repairStore.getState().pickCode('B1A3C'); });
      await t.beats(2); await t.tap('.cands > li.on button', '수리 진행'); await t.beats(2); await t.key('ArrowRight', 5, 1.2);
      await t.cap('충전 포트', 'C필러 안쪽, 충전 포트 ECU까지.');
      await t.page.evaluate(async () => { const S = window.__repairStore.getState(); S.reset(); await window.__repairStore.getState().pickCode('B1F42'); });
      await t.beats(2); await t.tap('.cands > li.on button', '수리 진행'); await t.beats(2); await t.key('ArrowRight', 6, 1.2);
    },
  },
  // ── 10장 Model 3 나머지 (0:30) ──
  s12_model3_more: {
    setup: async t => { await t.waitCanvas(); await prep(M3, 'B1C12')(t); await t.beats(3); },
    act: async t => {
      await t.film('chapter', '10', 'Model 3', '헤드램프부터 구동 모터까지');
      await t.cap('헤드램프', '범퍼와 헤드램프는, 실제 면 그대로.');
      await t.tap('.cands > li.on button', '수리 진행'); await t.beats(2); await t.key('ArrowRight', 3, 1.5);
      await t.cap('12V 배터리', '프렁크 뒤 에이프런 아래, 단자 하나까지.');
      await t.page.evaluate(async () => { const S = window.__repairStore; S.getState().reset(); await S.getState().pickCode('B0F71'); await S.getState().startRepair('part-12v'); });
      await t.beats(2); await t.key('ArrowRight', 4, 1.5);
      await t.cap('구동 모터', '차 밑 리어 드라이브 유닛, 리졸버 커넥터까지.');
      await t.page.evaluate(async () => { const S = window.__repairStore; S.getState().reset(); await S.getState().pickCode('P0A3F'); await S.getState().startRepair('part-rdu-resolver'); S.setState({ acked: Object.fromEntries(S.getState().task.steps.map(x => [x.stepId, true])) }); });
      await t.beats(2); await t.key('ArrowRight', 5, 1.4);
    },
  },
  // ── 11장 공장·설계 (0:45) ──
  s13_factory: {
    setup: async t => {
      await t.waitCanvas();
      await t.page.evaluate(async () => { const S = window.__repairStore; await S.getState().lookup('7SAXCBE50NF000000'); await S.getState().pickCode('B1A24'); await S.getState().startRepair('part-mx-fw-latch'); await S.getState().submitRecord({ actualCausePartId: 'part-mx-fw-latch', actualMinutes: 92, stuckStepId: null, moduleReplaced: false, memo: '', memoPublic: false }); });
      await t.beats(1);
    },
    act: async t => {
      await t.film('chapter', '11', '공장·설계', '조립하기 쉬운 차가, 고치기에도 쉬운지');
      await t.tap('.record-result a', '공장 화면'); await t.page.waitForSelector('.factory-view canvas', { timeout: 20000 }); await t.beats(3);
      await t.cap('정비 난이도', '표준 시간을 넘긴 만큼, 차 위에 밝게.'); await t.beats(3);
      await t.tap('.cands > li .cand-h', '리졸버'); await t.beats(3);
      await t.cap('정비 난이도', '설계 담당자가 보는 말: 무엇이, 왜 오래 걸리는지.'); await t.focus('.cands > li.on .insight-line'); await t.beats(4);
      await t.cap('사양·생산 비교', '같은 부품, 다른 생산분.');
      await t.tap('.seg button', '사양·생산'); await t.beats(2); await t.tap('.cands > li .cand-h', '헤드램프'); await t.beats(3);
      await t.cap('차종', 'Model X로 바꾸면, 그 차의 지표로.'); await t.tap('.vsel button', 'Tesla Model X'); await t.beats(3);
      await t.cap('고장 다발', '방금 정비사가 남긴 팰컨 윙 기록이, 원인 분포에 더해졌습니다.');
      await t.tap('.seg button', '고장 다발'); await t.beats(1); await t.tap('.cands > li .cand-h', 'B1A24'); await t.beats(3);
      await t.focus('.cluster'); await t.beats(3);
    },
  },
  // ── 12장 디테일 (0:30) ──
  s14_details: {
    setup: async t => { await t.waitCanvas(); await prep(MX)(t); },
    act: async t => {
      await t.film('chapter', '12', '디테일', '보이지 않는 곳까지');
      await t.film('figure', projection, '실제 차체를 옆에서 투영해, 문과 래치와 C필러의 위치를 쟀습니다.'); await t.beats(4);
      await t.film('lines', [{ text: '부품이 측정한 자리를 벗어나면,', hold: 1800 }, { text: '테스트가 실패합니다.', hold: 2200 }, { text: '자동 테스트 77개, 모두 통과.', small: true, hold: 2400 }]);
      await t.beats(1);
    },
  },
  // ── 아웃트로 (0:15) ──
  s15_outro: {
    normal: true, // 글자만 나오는 장면이라 배속하지 않음
    setup: async t => { await t.page.evaluate(() => document.getElementById('film-title').classList.remove('off')); },
    act: async t => {
      await t.beats(1);
      await t.film('lines', [{ text: '정비사의 한 번이,', hold: 1600 }, { text: '다음 정비사의 길이 됩니다.', hold: 2600 }]);
      await t.film('logo', '고장코드에서 마지막 볼트까지.', '해커톤 시연 · 모든 수치와 고장코드 번호는 예시 데이터입니다 · Model X 3D: David_Holiday, CC BY 4.0 · 5조 팩토리');
      await t.beats(9);
    },
  },
};
