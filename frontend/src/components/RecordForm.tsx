import { useState } from 'react';
import { useRepair } from '../store/useRepairStore';

/** 결과 기록 (A④): 실제 원인·걸린 시간·막힌 단계를 남기면 원인 통계와 공장 지표(B①)에 반영된다 */
export function RecordForm() {
  const { job, task, submitRecord } = useRepair(s => s);
  const [cause, setCause] = useState(task?.targetPartId ?? '');
  // 표준 시간을 미리 채우면 기록이 표준 쪽으로 쏠리므로 비워 둔다
  const [minutes, setMinutes] = useState('');
  const [stuck, setStuck] = useState('');
  const [moduleReplaced, setModule] = useState(false);
  const [memo, setMemo] = useState('');
  const [memoPublic, setPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  if (!job || !task) return null;

  return (
    <form className="record" onSubmit={async e => {
      e.preventDefault(); setBusy(true);
      try { await submitRecord({ actualCausePartId: cause, actualMinutes: Number(minutes), stuckStepId: stuck || null, moduleReplaced, memo, memoPublic }); }
      finally { setBusy(false); }
    }}>
      <p className="label">결과 기록</p>
      <label>실제 원인
        <select value={cause} onChange={e => setCause(e.target.value)}>
          {job.candidates.map(c => <option key={c.partId} value={c.partId}>{c.partName}</option>)}
        </select>
      </label>
      <label>걸린 시간 (분)
        <input type="number" min={1} max={600} value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="실제로 걸린 시간" required />
        <small>참고: 단계별 예상 합 {task.steps.reduce((a, x) => a + x.minutes, 0)}분 · 공식 표준 {task.standardMinutes}분</small>
      </label>
      <label>가장 오래 걸린 단계
        <select value={stuck} onChange={e => setStuck(e.target.value)}>
          <option value="">없음</option>
          {task.steps.map(st => <option key={st.stepId} value={st.stepId}>{st.order}단계 {st.title}</option>)}
        </select>
      </label>
      <label className="check"><input type="checkbox" checked={moduleReplaced} onChange={e => setModule(e.target.checked)} />부품 하나가 아니라 모듈(어셈블리)째 교체했습니다</label>
      <label>메모
        <textarea rows={3} value={memo} onChange={e => setMemo(e.target.value)} placeholder="다음 정비사에게 남길 팁 (선택)" />
      </label>
      <label className="check"><input type="checkbox" checked={memoPublic} onChange={e => setPublic(e.target.checked)} />메모를 다른 정비사에게 팁으로 공개</label>
      <button className="pill solid" type="submit" disabled={busy}>{busy ? '기록 중…' : '기록하고 마치기'}</button>
      <p className="note">기록은 같은 사양의 원인 통계와 공장·설계 화면 지표에 반영됩니다. 정비소 이름은 공개되지 않습니다.</p>
    </form>
  );
}
