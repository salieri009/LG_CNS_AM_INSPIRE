// 시연 영상 녹화: 개발 서버(localhost:5180)의 실제 앱을 스토리보드(docs/video/storyboard.md) 순서대로 조작하며
// 설치된 Chrome의 화면 프레임을 받아 ffmpeg으로 1920×1080 30fps 영상을 만든다. 마우스 포인터는 숨기고 클릭 지점에 원만 남긴다.
// 실행: node film/record.mjs  (결과: film/out/raw.mp4)
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const APP_URL = process.env.FILM_URL ?? 'http://localhost:5180/';
const OUT = new URL('./out/', import.meta.url).pathname;
const W = 1920, H = 1080, BEAT = 500; // 120 BPM
rmSync(OUT + 'frames', { recursive: true, force: true }); mkdirSync(OUT + 'frames', { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: false,
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  args: [`--window-size=${W},${H + 120}`, '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check'],
});
const page = (await browser.pages())[0];
const overlay = readFileSync(new URL('./overlay.js', import.meta.url), 'utf8');
await page.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch { /* 새 프로필 */ } });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const beats = n => sleep(n * BEAT);
const film = (fn, ...a) => page.evaluate((f, args) => window.film[f](...args), fn, a);
// 화면의 요소를 찾아 그 가운데에 원을 그리고 누른다
async function tap(sel, text) {
  const h = await page.waitForFunction((s, t) => [...document.querySelectorAll(s)].find(e => !t || e.textContent.includes(t)), { timeout: 15000 }, sel, text ?? '');
  const el = h.asElement();
  await el.evaluate(e => e.scrollIntoView({ block: 'nearest', behavior: 'smooth' })); await sleep(250);
  const b = await el.boundingBox();
  await page.evaluate((x, y) => window.film.ripple(x, y), b.x + b.width / 2, b.y + b.height / 2);
  await sleep(120); await el.click(); return el;
}
const setSelect = (sel, value) => page.evaluate((s, v) => { const e = document.querySelector(s); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(e, v); e.dispatchEvent(new Event('change', { bubbles: true })); }, sel, value);
const key = async (k, n = 1, gap = 2) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await beats(gap); } };
// 패널 열기·닫기는 상태로 정확히 맞추고, 누른 자리에는 원만 남긴다
async function panels(left, right, rippleSel) {
  if (rippleSel) await page.evaluate(s => { const b = document.querySelector(s)?.getBoundingClientRect(); if (b) window.film.ripple(b.x + b.width / 2, b.y + b.height / 2); }, rippleSel);
  await page.evaluate((l, r) => window.__repairStore.setState({ panels: { left: l, right: r } }), left, right);
}
// 3D 위에서 천천히 끌어 차를 돌린다
async function orbit(dx, ms) {
  const x0 = W * 0.45, y0 = H * 0.45, steps = Math.round(ms / 16);
  await page.mouse.move(x0, y0); await page.mouse.down();
  for (let i = 1; i <= steps; i++) { await page.mouse.move(x0 + (dx * i) / steps, y0 + Math.sin(i / steps * Math.PI) * 6); await sleep(16); }
  await page.mouse.up();
}

// ── 녹화 시작 ──
await page.goto(APP_URL, { waitUntil: 'networkidle2' });
await page.evaluate(overlay);
await page.evaluate(() => { document.getElementById('film-title').classList.remove('off'); });
const cdp = await page.createCDPSession();
const frames = [];
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  const i = frames.length; frames.push(metadata.timestamp);
  writeFileSync(`${OUT}frames/${String(i).padStart(6, '0')}.jpg`, Buffer.from(data, 'base64'));
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
await beats(2);

// 0 콜드 오픈
await film('lines', [{ text: '작년에 처음 나온 전기차.', hold: 2200 }, { text: '10년 차 정비사도, 처음 봅니다.', hold: 2600 }]);
await film('lines', [{ text: '고장코드는 어디가 아픈지만 알려 줍니다.', hold: 2400 }, { text: '어디부터 볼지, 무엇을 먼저 뗄지는', hold: 1800 }, { text: '아직 경험에 맡겨져 있습니다.', hold: 2600 }]);
// 1 타이틀
await film('logo', '고장코드에서 마지막 볼트까지.'); await beats(6);

// 2 차량이 열림: 패널을 닫은 채 X-ray 차를 보여 주고 패널을 연다
await panels(false, false);
await page.evaluate(() => window.film.fadeTitle()); await beats(2);
await film('caption', '', '차를 고르면, 차가 열립니다.');
await orbit(-260, 3200); await beats(2);
await panels(true, false, '.icon-btn[aria-label^="정비사·차량"]'); await beats(1); await panels(true, true, '.icon-btn[aria-label^="진단 패널"]'); await beats(2);

// 3 A① 차량·증상
await film('caption', 'A① 차량·증상', 'VIN 하나로 사양과 생산 시기까지.');
await tap('.vsel button', 'Tesla Model 3'); await beats(4);
await film('caption', 'A① 차량·증상', '코드를 몰라도, 증상에서 시작합니다.');
await tap('.chip', '문이 안 열림'); await beats(4);

// 4 A② 점검 우선순위
await film('caption', 'A② 점검 우선순위', '공식 점검 순서 그대로, 같은 사양에서 실제로 확인된 비율을 함께.');
await tap('.codes button', 'B1A24'); await beats(6);
await film('caption', 'A② 점검 우선순위', '코드가 여러 개 뜨면, 공통 원인부터.');
await page.evaluate(() => { const e = document.querySelector('.add-code select'); const b = e.getBoundingClientRect(); window.film.ripple(b.x + b.width / 2, b.y + b.height / 2); });
await sleep(150); await setSelect('.add-code select', 'B0F71'); await beats(6);
await tap('.code-list .link[aria-label="B0F71 빼기"]'); await beats(3);

// 5 점검 → 확정
await film('caption', 'A② 점검', '점검하고, 확정하고, 다음으로.');
for (const i of [0, 1]) { await page.evaluate(k => document.querySelectorAll('.cands > li.on .inspect input')[k].scrollIntoView({ block: 'center', behavior: 'smooth' }), i); await sleep(300); await tap(`.cands > li.on .inspect li:nth-child(${i + 1}) input`); await beats(1); }
await tap('.cands > li.on button', '이상 있음'); await beats(3);

// 6 A③ 3D 분해 경로
await film('caption', 'A③ 3D 분해 경로', '무엇을 먼저 떼야 하는지, 손대기 전에.');
await tap('.cands > li.on button', '수리 진행'); await beats(6);
await key('ArrowRight', 2, 4);
await film('caption', 'A③ 3D 분해 경로', '그림을 크게 보고 싶을 땐 접고,');
await tap('[aria-label^="매뉴얼 접기"]'); await beats(4); await orbit(180, 2200); await beats(2);
await film('caption', 'A③ 3D 분해 경로', '필요할 땐 언제든 다시.');
await tap('.manual-fab'); await beats(4);
await film('caption', 'A③ 3D 분해 경로', '창 높이도 손에 맞게.');
{ const g = await (await page.$('.grip')).boundingBox(); const x = g.x + g.width / 2, y = g.y + 5; await page.evaluate((a, b) => window.film.ripple(a, b), x, y); await page.mouse.move(x, y); await page.mouse.down(); for (let i = 1; i <= 40; i++) { await page.mouse.move(x, y - i * 1.6); await sleep(16); } await page.mouse.up(); }
await beats(2);
await film('caption', 'A③ 3D 분해 경로', '막힌 곳과 요령은, 그 단계에 남깁니다.');
await key('ArrowRight', 1, 2);
await tap('.steplog button', '막혔어요'); await beats(1); await tap('.reasons button', '부품 고착'); await beats(2);
await tap('.steplog button', '팁 남기기'); await beats(1);
await page.type('.tipform input:not([type])', '글라스 클립은 아래쪽부터 풀면 덜 부러집니다', { delay: 45 }); await beats(1);
await tap('.tipform button', '저장'); await beats(3);
await key('ArrowRight', 3, 2);

// 7 A④ 결과 기록
await film('caption', 'A④ 결과 기록', '시간과 막힌 단계는 이미 채워져 있습니다.');
await tap('.manual-h .nav button', '결과 기록'); await beats(2);
await page.evaluate(() => { const i = document.querySelector('.record input[type=number]'); i.scrollIntoView({ block: 'center' }); });
await page.click('.record input[type=number]', { clickCount: 3 }); await page.type('.record input[type=number]', '48', { delay: 90 }); await beats(2);
await tap('.record button[type=submit]'); await beats(2);
await film('caption', 'A④ 결과 기록', '1분 기록이, 다음 정비사의 숫자를 바꿉니다.'); await beats(6);

// 8 B 공장·설계
await tap('.record-result a', '공장 화면');
// 공장 화면은 3D와 지표를 새로 불러오므로, 다 뜬 뒤에 자막을 올린다
await page.waitForSelector('.factory-view canvas', { timeout: 20000 }); await page.waitForSelector('.factory-view .cands > li'); await beats(3);
await film('caption', 'B 공장·설계', '조립하기 쉬운 차가, 고치기에도 쉬운지.'); await beats(6);
await film('caption', 'B② 사양·생산 비교', '같은 부품, 다른 생산분.');
await tap('.seg button', '사양·생산'); await beats(6);
await film('caption', 'B③ 고장 다발', '방금 기록이 원인 분포에 더해졌습니다.');
await tap('.seg button', '고장 다발'); await beats(2); await tap('.cands > li .cand-h', 'B1A24'); await beats(6);

// 9 같은 코드, 다른 차
await film('caption', '같은 코드, 다른 차', '그래서 VIN마다 다른 안내가 필요합니다.');
await tap('.tabs a', '정비 진단'); await page.waitForSelector('.mechanic canvas', { timeout: 20000 }); await beats(2);
await panels(true, true, '.icon-btn[aria-label^="정비사·차량"]'); await beats(1);
await tap('.vsel button', 'Tesla Model X'); await beats(3);
await tap('.codes button', 'B1A24'); await beats(5);
// Model X 래치는 진행 중인 작업이 있어 "이어서"로 열린다 (작업 기록 이어하기도 함께 보여 준다)
await tap('.cands > li.on button', '진행'); await beats(4);
await key('ArrowRight', 3, 3);

// 10 안전: 고전압 단계
await film('caption', '안전', '고전압 단계는, 확인 전까지 잠깁니다.');
await page.evaluate(async () => { const s = window.__repairStore.getState(); s.reset(); await s.lookup('5YJ3E1EA0JF000000'); await window.__repairStore.getState().pickCode('P0A3F'); await window.__repairStore.getState().startRepair('part-rdu-resolver'); });
await page.evaluate(() => { const s = window.__repairStore; s.setState({ step: 0, acked: {} }); });
await beats(5);
await tap('.hvband input'); await beats(4);

// 11 끝
await page.evaluate(() => window.film.clearCaption());
await film('lines', [{ text: '정비사의 한 번이, 다음 정비사의 길이 됩니다.', hold: 3000 }]);
await film('logo', '고장코드에서 마지막 볼트까지.', '해커톤 시연 · 모든 수치와 고장코드 번호는 예시 데이터입니다 · 5조 팩토리'); await beats(8);

await cdp.send('Page.stopScreencast');
await browser.close();

// 프레임 시각 그대로 이어 붙여 30fps로 고정한다
const list = frames.map((t, i) => `file 'frames/${String(i).padStart(6, '0')}.jpg'\nduration ${Math.max(0.001, (frames[i + 1] ?? t + 0.5) - t).toFixed(4)}`).join('\n');
writeFileSync(OUT + 'frames.txt', list + `\nfile 'frames/${String(frames.length - 1).padStart(6, '0')}.jpg'\n`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', OUT + 'frames.txt', '-vf', `scale=${W}:${H}:flags=lanczos,fps=30`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT + 'raw.mp4']);
console.log('frames', frames.length, '→', OUT + 'raw.mp4');
