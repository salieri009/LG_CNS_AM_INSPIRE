import { useEffect, useState } from 'react';
import { useRepair } from '../store/useRepairStore';

const REASONS = ['공구 접근 어려움', '부품 고착', '매뉴얼과 다름', '부품·공구 없음'];
// 시각 갱신이 1초 단위라 단계를 막 옮긴 순간엔 음수가 나올 수 있어 0으로 막는다
const mmss = (raw: number) => { const ms = Math.max(0, raw); return `${Math.floor(ms / 60_000)}분 ${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}초`; };

/** 지금 단계 기록 (job_step_log·knowledge_entry): 걸린 시간은 자동으로 재고, 막힌 이유와 팁은 그 자리에서 남긴다 */
export function StepLogBar() {
  const { task, step, stepLog, markBlocked, addTip } = useRepair(s => s);
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState<'none' | 'blocked' | 'tip'>('none');
  const [tip, setTip] = useState('');
  const [pub, setPub] = useState(true);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const st = task?.steps[step];
  const log = st && stepLog[st.stepId];
  if (!st) return null;
  return (
    <div className="steplog" aria-label="이 단계 기록">
      <span className="mono muted">이 단계 {log ? mmss(now - log.startedAt) : '–'} · 예상 {st.minutes}분</span>
      {log?.blocked
        ? <span className="blocked">막힘 · {log.reason}<button className="link" onClick={() => markBlocked(null)}>해제</button></span>
        : <button className="pill" aria-expanded={open === 'blocked'} onClick={() => setOpen(o => (o === 'blocked' ? 'none' : 'blocked'))}>막혔어요</button>}
      <button className="pill" aria-expanded={open === 'tip'} onClick={() => setOpen(o => (o === 'tip' ? 'none' : 'tip'))}>팁 남기기</button>
      {open === 'blocked' && !log?.blocked && (
        <div className="reasons" role="group" aria-label="막힌 이유">
          {REASONS.map(r => <button key={r} className="pill" onClick={() => { markBlocked(r); setOpen('none'); }}>{r}</button>)}
        </div>
      )}
      {open === 'tip' && (
        <form className="tipform" onSubmit={async e => { e.preventDefault(); if (!tip.trim()) return; await addTip(tip, pub); setTip(''); setOpen('none'); }}>
          <input value={tip} onChange={e => setTip(e.target.value)} placeholder={`${st.order}단계에서 다음 정비사에게 알려 줄 점`} aria-label="팁 내용" autoFocus />
          <label><input type="checkbox" checked={pub} onChange={e => setPub(e.target.checked)} />공개</label>
          <button className="pill solid" type="submit" disabled={!tip.trim()}>저장</button>
        </form>
      )}
    </div>
  );
}
