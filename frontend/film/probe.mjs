// 품질 시험: 녹화 설정마다 3D를 8초 돌리며 초당 프레임을 재고, 같은 자리를 잘라 선명도를 비교한다.
// 실행: node film/probe.mjs   결과: film/out/probe/<설정>.png, 콘솔에 fps
import { mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { chromeExecutable, gpuArgs, filmPath } from './platform.mjs';

const OUT = filmPath('./out/probe/'); mkdirSync(OUT, { recursive: true });
const CONFIGS = [
  { id: 'hl-1600x2.4-png', w: 1600, h: 900, dsf: 2.4, format: 'png', headless: true },
  { id: 'hl-1600x2.4-jpeg100', w: 1600, h: 900, dsf: 2.4, format: 'jpeg', headless: true },
];
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const c of CONFIGS) {
  const browser = await puppeteer.launch({
    executablePath: chromeExecutable(), headless: c.headless ?? false,
    defaultViewport: { width: c.w, height: c.h, deviceScaleFactor: c.dsf },
    args: [...gpuArgs(), `--window-size=${c.w},${c.h + 120}`, '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--no-first-run'],
  });
  const page = (await browser.pages())[0];
  await page.goto('http://localhost:5180/', { waitUntil: 'networkidle2' });
  await page.click('.vsel button'); await page.waitForSelector('canvas'); await sleep(4000);
  const cdp = await page.createCDPSession();
  const ts = []; let keep = null;
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => { ts.push(metadata.timestamp); if (ts.length === 40) keep = data; cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: c.format, quality: 100, maxWidth: Math.round(c.w * c.dsf), maxHeight: Math.round(c.h * c.dsf), everyNthFrame: 1 });
  // 3D를 천천히 돌려 계속 화면이 바뀌게 한다
  await page.mouse.move(c.w * 0.45, c.h * 0.45); await page.mouse.down();
  for (let i = 0; i < 480; i++) { await page.mouse.move(c.w * 0.45 + i * 0.6, c.h * 0.45); await sleep(16); }
  await page.mouse.up();
  await cdp.send('Page.stopScreencast');
  const fps = (ts.length - 1) / (ts.at(-1) - ts[0]);
  if (keep) writeFileSync(`${OUT}${c.id}.${c.format === 'png' ? 'png' : 'jpg'}`, Buffer.from(keep, 'base64'));
  const gl = await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const d = g?.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'none'; });
  console.log(c.id.padEnd(22), `${ts.length}프레임`, `${fps.toFixed(1)} fps`, gl);
  await browser.close();
}
