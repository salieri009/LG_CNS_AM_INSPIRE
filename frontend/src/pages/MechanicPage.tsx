import { LeftSidebar } from '../components/LeftSidebar';
import { ManualStrip } from '../components/ManualStrip';
import { RightPanel } from '../components/RightPanel';
import { TopBar } from '../components/TopBar';
import { useRepair } from '../store/useRepairStore';
import { RepairViewer } from '../viewer/RepairViewer';

/** 정비사 화면 (A①~A③): 가운데 3D가 화면 전체, 왼쪽 정비사·차량, 오른쪽 진단, 아래 매뉴얼 */
export function MechanicPage() {
  const { panels, mode, task, step, job, selected, goTo, vehicle } = useRepair(s => s);
  const candidate = mode === 'cands' ? job?.candidates[selected] : undefined;
  const cls = ['mechanic', panels.left && 'l-open', panels.right && 'r-open', mode === 'repair' && 'm-open'].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <div className="glow" aria-hidden="true" />
      <div className="stage">
        <RepairViewer task={mode === 'repair' || mode === 'record' ? task : null} stepIndex={mode === 'repair' || mode === 'record' ? step : -1} onSelectStep={goTo} candidate={candidate} />
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
      {mode === 'repair' && <ManualStrip />}
    </div>
  );
}
