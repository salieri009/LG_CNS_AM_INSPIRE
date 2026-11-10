// 영상 v2 녹화 공용 도구. 품질 시험(2026-11-10) 결과: 헤드리스 Chrome + 배율 2.4 강제 + JPEG 100 스크린캐스트
// → 논리 화면 1600×900, 실제 프레임 3840×2160, 약 43fps (GPU: Metal). 창을 띄우면 모니터 크기에 막혀 흐려지므로 헤드리스를 쓴다.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { chromeExecutable, gpuArgs, filmPath } from './platform.mjs';

// BEAT는 화면이 머무는 기본 단위. 애니메이션 속도는 그대로 두고 머무는 시간만 늘려 7분에 맞춘다(2026-11-10)
export const W = 1600, H = 900, SCALE = 2.4, BEAT = 780;
export const OUT = filmPath('./out/v2/');
const OVERLAY = readFileSync(new URL('./overlay.js', import.meta.url), 'utf8');
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function launch() {
  return puppeteer.launch({
    executablePath: chromeExecutable(), headless: true, defaultViewport: null,
    args: [...gpuArgs(), '--hide-scrollbars', `--window-size=${W},${H + 87}`, `--force-device-scale-factor=${SCALE}`, '--no-first-run'],
  });
}

/** 장면 하나를 새 탭에서 준비(setup)하고 녹화(act)한다. 결과: out/v2/<id>.mp4, <id>.events.json */
export async function shot(browser, id, { url = 'http://localhost:5180/', setup, act }) {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch { /* 새 프로필 */ } });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.fonts.status === 'loaded' && window.__repairStore, { timeout: 20000 });
  await page.evaluate(() => { window.__filmPostCaptions = true; });
  await page.evaluate(OVERLAY);
  // 검정 타이틀 레이어는 기본으로 숨긴다. 프롤로그처럼 필요한 장면만 setup에서 연다
  await page.evaluate(() => document.getElementById('film-title').classList.add('off'));
  const t = makeTools(page);
  if (setup) await setup(t);
  // 장 타이틀로 시작하는 장면은 첫 프레임부터 검정으로 시작해 앱 화면이 번쩍 보이지 않게 한다
  if (String(act).includes("film('chapter'")) await page.evaluate(() => { const el = document.getElementById('film-title'); el.innerHTML = ''; el.classList.remove('off'); });
  const dir = `${OUT}${id}/`; rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const cdp = await page.createCDPSession(); const frames = []; let t0 = null;
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    t0 ??= metadata.timestamp; frames.push(metadata.timestamp);
    writeFileSync(`${dir}${String(frames.length - 1).padStart(6, '0')}.jpg`, Buffer.from(data, 'base64'));
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 100, maxWidth: W * SCALE, maxHeight: H * SCALE, everyNthFrame: 1 });
  const started = Date.now();
  t.now = () => (Date.now() - started) / 1000;
  await act(t);
  await sleep(300);
  await cdp.send('Page.stopScreencast');
  await page.close();
  // 프레임 시각대로 이어 붙여 30fps 4K로 고정한다 (마지막 압축은 편집 단계에서 한 번 더 하므로 여기서는 거의 무손실)
  const list = frames.map((ts, i) => `file '${String(i).padStart(6, '0')}.jpg'\nduration ${Math.max(0.001, (frames[i + 1] ?? ts + 0.3) - ts).toFixed(4)}`).join('\n') + `\nfile '${String(frames.length - 1).padStart(6, '0')}.jpg'\n`;
  writeFileSync(`${dir}frames.txt`, list);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${dir}frames.txt`, '-vf', `scale=3840:2160:flags=lanczos,fps=30`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '10', '-pix_fmt', 'yuv420p', `${OUT}${id}.mp4`]);
  writeFileSync(`${OUT}${id}.events.json`, JSON.stringify(t.events, null, 1));
  rmSync(dir, { recursive: true, force: true });
  return { id, frames: frames.length, seconds: frames.length ? frames.at(-1) - frames[0] : 0 };
}

function makeTools(page) {
  const t = { page, events: [], now: () => 0 };
  t.beats = n => sleep(n * BEAT);
  t.film = async (fn, ...a) => {
    const t0 = t.now();
    await page.evaluate((f, args) => window.film[f](...args), fn, a);
    // 검정 화면 글자(장 타이틀·문장)가 나오는 동안은 배속하지 않도록 구간을 남긴다
    if (['chapter', 'lines', 'logo', 'loop', 'figure'].includes(fn)) t.events.push({ t: t0, kind: 'title', end: t.now() });
  };
  // 자막은 화면에 그리지 않고 시각만 남긴다. 편집 단계(edit.mjs)에서 줌 위에 고정 위치로 얹는다
  t.cap = async (label, text) => { t.events.push({ t: t.now(), kind: 'cap', label, text }); };
  t.store = fn => page.evaluate(fn);
  // 클릭: 요소 가운데에 얇은 원을 남기고, 편집 단계 펀치인을 위해 위치·시각을 기록한다
  t.mark = (rect, kind = 'tap') => t.events.push({ t: t.now(), kind, x: (rect.x + rect.width / 2) / W, y: (rect.y + rect.height / 2) / H, w: rect.width / W, h: rect.height / H });
  t.tap = async (sel, text, { mark = true } = {}) => {
    const h = await page.waitForFunction((s, x) => [...document.querySelectorAll(s)].find(e => !x || e.textContent.includes(x)), { timeout: 15000 }, sel, text ?? '');
    const el = h.asElement();
    await el.evaluate(e => e.scrollIntoView({ block: 'nearest', behavior: 'smooth' })); await sleep(260);
    const b = await el.boundingBox();
    // 흰 점이 누를 곳으로 미끄러져 간 뒤 원이 퍼지고 눌린다 (보는 사람이 따라올 수 있게)
    await page.evaluate((x, y) => window.film.point(x, y), b.x + b.width / 2, b.y + b.height / 2); await sleep(520);
    await page.evaluate((x, y) => window.film.ripple(x, y), b.x + b.width / 2, b.y + b.height / 2);
    if (mark) t.mark(b);
    await sleep(130); await el.click(); return el;
  };
  t.focus = async (sel, text) => { // 클릭 없이 펀치인 지점만 기록
    const h = await page.waitForFunction((s, x) => [...document.querySelectorAll(s)].find(e => !x || e.textContent.includes(x)), { timeout: 15000 }, sel, text ?? '');
    t.mark(await h.asElement().boundingBox(), 'focus');
  };
  t.select = async (sel, value) => { await page.evaluate(s => { const b = document.querySelector(s).getBoundingClientRect(); window.film.point(b.x + b.width / 2, b.y + b.height / 2); }, sel); await sleep(520); return page.evaluate((s, v) => { const e = document.querySelector(s); const b = e.getBoundingClientRect(); window.film.ripple(b.x + b.width / 2, b.y + b.height / 2); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(e, v); e.dispatchEvent(new Event('change', { bubbles: true })); }, sel, value); };
  t.key = async (k, n = 1, gap = 2) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await t.beats(gap); } };
  t.type = (sel, text, delay = 55) => page.type(sel, text, { delay });
  t.panels = async (left, right, rippleSel) => {
    if (rippleSel) { await page.evaluate(s => { const b = document.querySelector(s)?.getBoundingClientRect(); if (b) window.film.point(b.x + b.width / 2, b.y + b.height / 2); }, rippleSel); await sleep(520); await page.evaluate(s => { const b = document.querySelector(s)?.getBoundingClientRect(); if (b) window.film.ripple(b.x + b.width / 2, b.y + b.height / 2); }, rippleSel); }
    await page.evaluate((l, r) => window.__repairStore.setState({ panels: { left: l, right: r } }), left, right);
  };
  t.orbit = async (dx, ms, dy = 0) => { // 3D 위에서 천천히 끌어 돌린다
    const x0 = W * 0.42, y0 = H * 0.45, steps = Math.round(ms / 16);
    await page.evaluate((x, y) => window.film.point(x, y), x0, y0); await sleep(450);
    await page.mouse.move(x0, y0); await page.mouse.down();
    for (let i = 1; i <= steps; i++) { const e = 0.5 - Math.cos((i / steps) * Math.PI) / 2; await page.mouse.move(x0 + dx * e, y0 + dy * e); await page.evaluate((x, y) => window.film.point(x, y), x0 + dx * e, y0 + dy * e); await sleep(16); }
    await page.mouse.up();
  };
  t.waitCanvas = () => page.waitForSelector('canvas', { timeout: 20000 }).then(() => sleep(2500));
  return t;
}
