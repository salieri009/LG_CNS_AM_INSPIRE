import { useRef, useState, type CSSProperties } from 'react';
import { LeftSidebar } from '../components/LeftSidebar';
import { MANUAL_DEFAULT, clampManual } from '../components/manualSize';
import { ManualStrip } from '../components/ManualStrip';
import { RightPanel } from '../components/RightPanel';
import { TopBar } from '../components/TopBar';
import { useRepair } from '../store/useRepairStore';
import { RepairViewer } from '../viewer/RepairViewer';
import { modelFor } from '../viewer/config';

/** 정비사 화면 (A①~A③): 가운데 3D가 화면 전체, 왼쪽 정비사·차량, 오른쪽 진단, 아래 매뉴얼 */
export function MechanicPage() {
  const { panels, mode, task, step, job, selected, goTo, vehicle } = useRepair(s => s);
  const candidate = mode === 'cands' ? job?.candidates[selected] : undefined;
  // 매뉴얼 창 높이는 사람마다 다르게 쓰므로 이 브라우저에만 기억해 둔다
  const [manualH, setManualH] = useState(() => {
    try { return clampManual(Number(localStorage.getItem('manualH')) || MANUAL_DEFAULT, window.innerHeight); } catch { return MANUAL_DEFAULT; }
  });
  const [collapsed, setCollapsed] = useState(false);
  const fab = useRef<HTMLButtonElement>(null);
  // 접으면 숨은 매뉴얼 버튼에 포커스가 남지 않게 펼치기 버튼으로 옮긴다
  const collapse = () => { setCollapsed(true); requestAnimationFrame(() => fab.current?.focus()); };
  const resize = (h: number) => { const v = clampManual(h, window.innerHeight); setManualH(v); try { localStorage.setItem('manualH', String(v)); } catch { /* 저장 못 해도 동작에는 지장 없음 */ } };
  const repairing = mode === 'repair';
  const cls = ['mechanic', panels.left && 'l-open', panels.right && 'r-open', repairing && 'm-open', repairing && collapsed && 'm-closed'].filter(Boolean).join(' ');
  const vars = (repairing ? { '--manual-h': `${manualH}px`, '--manual': collapsed ? '0px' : `${manualH}px` } : {}) as CSSProperties;
  return (
    <div className={cls} style={vars}>
      <div className="glow" aria-hidden="true" />
      <div className="stage">
        <RepairViewer task={mode === 'repair' || mode === 'record' ? task : null} stepIndex={mode === 'repair' || mode === 'record' ? step : -1} onSelectStep={goTo} candidate={candidate} model={modelFor(vehicle?.model)} />
      </div>
      <TopBar />
      {panels.left && <LeftSidebar />}
      {panels.right && <RightPanel />}
      {mode === 'idle' && (
        <section className="hero">
          <p className="label">고장코드 검색</p>
          <h1>{vehicle ? `${vehicle.model}, 어디가 문제인가요?` : '정비할 차량부터 고르세요'}</h1>
          <p className="muted">{vehicle ? '오른쪽 목록에서 고르거나 위의 돋보기로 진단기에서 읽은 고장코드를 검색하세요. 공식 점검 순서와 같은 사양의 관측 원인 비율을 함께 보여 줍니다.' : '왼쪽에서 차종을 고르거나 VIN을 넣으면 사양·생산 시기가 자동으로 잡힙니다. 오른쪽에서 진행 중인 작업을 이어서 할 수도 있습니다.'}</p>
        </section>
      )}
      {repairing && <ManualStrip height={manualH} onResize={resize} collapsed={collapsed} onCollapse={collapse} />}
      {repairing && (
        <button ref={fab} className="manual-fab" aria-label="수리 순서·매뉴얼 펼치기" aria-hidden={!collapsed} tabIndex={collapsed ? 0 : -1} onClick={() => setCollapsed(false)}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="4" width="16" height="14" rx="2.5" /><path d="M3 9h16M8 13h6" /></svg>
          <span>{step + 1}/{task?.steps.length}</span>
        </button>
      )}
    </div>
  );
}
