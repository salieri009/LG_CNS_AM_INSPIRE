// 장면 녹화 러너. 실행: node film/run.mjs            (전체)
//                       node film/run.mjs s06_repair (그 장면만 다시)
// 결과: film/out/v2/<장면>.mp4 (3840×2160 30fps), <장면>.events.json (클릭·펀치인 위치)
import { launch, shot } from './lib.mjs';
import { SHOTS } from './shots.mjs';

const pick = process.argv.slice(2);
const ids = pick.length ? pick : Object.keys(SHOTS);
const browser = await launch();
const report = [];
for (const id of ids) {
  if (!SHOTS[id]) { console.log('없는 장면:', id); continue; }
  const t0 = Date.now();
  try {
    const r = await shot(browser, id, SHOTS[id]);
    report.push(r); console.log(`${id.padEnd(18)} ${r.seconds.toFixed(1)}초 ${r.frames}프레임 (${((Date.now() - t0) / 1000).toFixed(0)}초 걸림)`);
  } catch (e) { console.log(`${id.padEnd(18)} 실패: ${e.message.split('\n')[0]}`); }
}
await browser.close();
console.log('합계', report.reduce((a, r) => a + r.seconds, 0).toFixed(1), '초');
