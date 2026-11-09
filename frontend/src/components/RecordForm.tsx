import { useState } from 'react';
import { recordDraft, useRepair } from '../store/useRepairStore';

/** 결과 기록 (A④): 실제 원인·걸린 시간·막힌 단계를 남기면 원인 통계와 공장 지표(B①)에 반영된다 */
export function RecordForm() {
  const st = useRepair(s => s);
  const { job, task, submitRecord, stepLog, myTips } = st;
  // 단계마다 자동으로 잰 시간과 막힌 단계로 초안을 채운다 (처음 열릴 때 한 번)
  const [draft] = useState(() => recordDraft(st, Date.now()));
  const [cause, setCause] = useState(task?.targetPartId ?? '');
  // 표준 시간이 아니라 실제로 잰 시간으로 채운다 (표준으로 채우면 기록이 쏠린다)
  const [minutes, setMinutes] = useState(draft.minutes > 0 ? String(draft.minutes) : '');
  const [stuck, setStuck] = useState(draft.stuckStepId ?? '');
  const [moduleReplaced, setModule] = useState(false);
  const [memo, setMemo] = useState('');
  const [memoPublic, setPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [after, setAfter] = useState<Record<number, boolean>>({});
  const afterDone = (task?.afterSteps ?? []).every((_, i) => after[i]);
  if (!job || !task) return null;

  return (
    <form className="record" onSubmit={async e => {
      e.preventDefault(); setBusy(true);
      try { await submitRecord({ actualCausePartId: cause, actualMinutes: Number(minutes), stuckStepId: stuck || null, moduleReplaced, memo, memoPublic }); }
      finally { setBusy(false); }
    }}>
      <p className="label">결과 기록</p>
      <ul className="summary">
        <li>단계별로 잰 시간 합 <b>{draft.minutes}분</b></li>
        <li>막힘 표시 <b>{Object.values(stepLog).filter(l => l.blocked).length}단계</b>{Object.values(stepLog).filter(l => l.blocked).map(l => ` · ${task?.steps.find(x => x.stepId === l.stepId)?.order}단계 ${l.reason}`).join('')}</li>
        <li>이번 작업에서 남긴 팁 <b>{myTips.length}개</b></li>
      </ul>
      {task.afterSteps?.length ? (
        <fieldset className="after">
          <legend>장착 뒤 할 일 (매뉴얼)</legend>
          {task.afterSteps.map((a, i) => <label key={a} className="check"><input type="checkbox" checked={!!after[i]} onChange={e => setAfter(x => ({ ...x, [i]: e.target.checked }))} />{a}</label>)}
        </fieldset>
      ) : null}
      <label>실제 원인
        <select value={cause} onChange={e => setCause(e.target.value)}>
          {job.candidates.map(c => <option key={c.partId} value={c.partId}>{c.partName}</option>)}
        </select>
      </label>
      <label>걸린 시간 (분)
        <input type="number" min={1} max={600} value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="실제로 걸린 시간" required />
        <small>자동 측정값입니다. 쉬는 시간이 있었다면 고쳐 주세요. 참고: 단계별 예상 합 {task.steps.reduce((a, x) => a + x.minutes, 0)}분 · 공식 표준 {task.standardMinutes}분</small>
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
      <button className="pill solid" type="submit" disabled={busy || !afterDone} title={afterDone ? '' : '장착 뒤 할 일을 먼저 확인하세요'}>{busy ? '기록 중…' : '기록하고 마치기'}</button>
      <p className="note">기록은 같은 사양의 원인 통계와 공장·설계 화면 지표에 반영됩니다. 정비소 이름은 공개되지 않습니다.</p>
    </form>
  );
}
