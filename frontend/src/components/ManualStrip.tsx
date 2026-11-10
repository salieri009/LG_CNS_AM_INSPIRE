import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { KnowledgeEntry } from '../api/types';
import { canLeave, repairStore, useRepair } from '../store/useRepairStore';
import { FASTENER_LABEL } from './labels';
import { StepLogBar } from './StepLogBar';


/** 아래 수리 매뉴얼: 단계마다 매뉴얼 실사 그림 카드. 지금 단계 카드로 자동 스크롤 */
interface Props { height: number; onResize: (h: number) => void; collapsed: boolean; onCollapse: () => void }

export function ManualStrip({ height, onResize, collapsed, onCollapse }: Props) {
  const s = useRepair(st => st);
  const { task, step } = s;
  const strip = useRef<HTMLDivElement>(null);
  const [tips, setTips] = useState<Record<string, KnowledgeEntry[]>>({});

  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>('[aria-current="step"]');
    if (el && strip.current) strip.current.scrollTo({ left: el.offsetLeft - 18, behavior: 'smooth' });
  }, [step]);
  // 장갑 낀 손이나 숙련자를 위해 ←/→ 키로 단계를 옮긴다 (입력 칸에서는 무시)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') repairStore.getState().next();
      if (e.key === 'ArrowLeft') repairStore.getState().prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    const id = task?.steps[step]?.stepId; if (!id || tips[id]) return;
    let live = true;
    api.getStepKnowledge(id).then(k => { if (live) setTips(t => ({ ...t, [id]: k })); });
    return () => { live = false; };
  }, [task, step, tips]);

  if (!task) return null;
  const total = task.steps.reduce((a, x) => a + x.minutes, 0);
  const cur = task.steps[step];
  const last = step === task.steps.length - 1;
  const hvPending = !!cur?.requiresHvAck && !canLeave(s);
  return (
    <section className={`manual ${collapsed ? 'closed' : ''}`} aria-label="수리 순서" inert={collapsed}>
      {/* 위쪽 손잡이를 끌어 높이를 바꾼다 (예전 높이 ~ 화면 절반) */}
      <div className="grip" role="separator" aria-orientation="horizontal" aria-label="매뉴얼 창 높이 조절" aria-valuenow={height} tabIndex={0}
        onKeyDown={e => { if (e.key === 'ArrowUp') onResize(height + 40); if (e.key === 'ArrowDown') onResize(height - 40); }}
        onPointerDown={e => {
          const y0 = e.clientY, h0 = height; (e.target as HTMLElement).setPointerCapture(e.pointerId);
          const move = (ev: PointerEvent) => onResize(h0 + (y0 - ev.clientY));
          const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
          window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
        }} />
      <header className="manual-h">
        <p className="label">수리 순서 · 매뉴얼</p>
        <h3>{task.targetPartName}</h3>
        <span className="mono muted">{step + 1} / {task.steps.length}단계 · 예상 {total}분 (예시)</span>
        <a className="src" href={task.sourceRef} target="_blank" rel="noopener noreferrer">매뉴얼 원문 ↗</a>
        {cur?.requiresHvAck && !hvPending && <span className="hv-done">고전압 차단·0V 확인 완료</span>}
        <span className="spacer" />
        <div className="nav" aria-label="단계 이동 (← → 키)">
          <button className="pill" onClick={s.prev} disabled={step === 0}>← 이전</button>
          <button className="pill solid" onClick={last ? s.openRecord : s.next} disabled={!canLeave(s)}>{last ? '결과 기록 →' : '다음 →'}</button>
          <button className="icon-btn" aria-label="매뉴얼 접기 (3D 크게 보기)" title="접기" onClick={onCollapse}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 4l8 8M12 6v6H6" /></svg>
          </button>
        </div>
      </header>
      {hvPending && (
        <label className="hvband">
          <span className="hv-ic" aria-hidden="true">⚡</span>
          <span><b>고전압 작업 단계</b>서비스 플러그를 뽑고 멀티미터로 0V를 확인한 뒤 체크하세요. 체크 전에는 다음 단계와 결과 기록이 열리지 않습니다.</span>
          <input type="checkbox" onChange={() => void s.ackCurrentStep()} aria-label="0V 확인 완료" />
        </label>
      )}
      <StepLogBar />
      <div className="strip" ref={strip}>
        {task.steps.map((st, i) => (
          <button key={st.stepId} className={`card ${i < step ? 'done' : ''} ${st.requiresHvAck ? 'hv' : ''}`} aria-current={i === step ? 'step' : undefined} onClick={() => s.goTo(i)}>
            {st.fallbackImage && <img src={st.fallbackImage} alt={`${i + 1}단계 ${st.title} 매뉴얼 그림`} loading="lazy" />}
            <div className="card-b">
              <p className="card-t"><b>{String(i + 1).padStart(2, '0')}</b> {st.title}</p>
              <p className="tags"><span className="tag">{FASTENER_LABEL[st.fastenerType]}</span><span className="tag">{st.minutes}분</span>{st.torque && <span className="tag">{st.torque}</span>}</p>
              <p className="desc">{st.description}</p>
              {i === step && [...s.myTips.filter(k => k.stepId === st.stepId), ...(tips[st.stepId] ?? []).filter(k => !s.myTips.some(m => m.entryId === k.entryId))].map(k => <p key={k.entryId} className="tip">{k.body}<small>{k.author} · 도움됐어요 {k.helpful} · 정비사 팁 (예시)</small></p>)}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
