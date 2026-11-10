import { useState, type KeyboardEvent } from 'react';
import { NavLink } from 'react-router-dom';
import { useRepair } from '../store/useRepairStore';

const PanelIcon = ({ side }: { side: 'left' | 'right' }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <rect x="2" y="3" width="14" height="12" rx="2.5" /><path d={side === 'left' ? 'M6.5 3v12' : 'M11.5 3v12'} />
  </svg>
);

/** 상단바: 패널 토글, 탭, 고장코드 검색(돋보기를 누르면 옆으로 펼쳐짐) */
export function TopBar({ showMechanicTools = true }: { showMechanicTools?: boolean }) {
  const { panels, togglePanel, vehicle, pickCode, suggestions } = useRepair(s => s);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const matches = suggestions.filter(c => !q || c.code.toLowerCase().includes(q.toLowerCase()) || c.description.includes(q) || c.symptom.includes(q));
  const choose = (code: string) => { setOpen(false); setQ(''); setActive(0); void pickCode(code); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(matches.length - 1, i + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)); }
    if (e.key === 'Enter' && matches[active]) choose(matches[active].code);
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <header className="topbar">
      {showMechanicTools && (
        <button className="icon-btn" aria-label="정비사·차량 패널 열고 닫기" aria-expanded={panels.left} onClick={() => togglePanel('left')}><PanelIcon side="left" /></button>
      )}
      <span className="logo"><i />REPAIR THREAD</span>
      <nav className="tabs">
        <NavLink to="/" end>정비 진단</NavLink>
        <NavLink to="/factory">공장·설계</NavLink>
      </nav>
      <span className="spacer" />
      {showMechanicTools && (
        <>
          <div className={`search ${open ? 'open' : ''}`}>
            <div className="search-box">
              <button className="search-btn" aria-label="고장코드 검색" onClick={() => setOpen(o => !o)} disabled={!vehicle} title={vehicle ? '' : '먼저 왼쪽에서 차량을 고르세요'}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="7" cy="7" r="5" /><path d="M11 11l3.5 3.5" /></svg>
              </button>
              <input aria-label="고장코드 검색어" role="combobox" aria-expanded={open} aria-controls="dtc-list" aria-activedescendant={open && matches[active] ? `dtc-${matches[active].code}` : undefined} placeholder="고장코드나 증상 검색 (예: B1A24, 헤드램프)" value={q} tabIndex={open ? 0 : -1}
                onChange={e => { setQ(e.target.value); setActive(0); }} onKeyDown={onKey} />
            </div>
            {open && (
              <ul className="suggest" role="listbox" id="dtc-list" aria-label="고장코드 후보">
                <li className="hd" role="presentation">{vehicle?.model} · 많이 검색된 코드</li>
                {matches.length ? matches.map((c, i) => (
                  <li key={c.code} id={`dtc-${c.code}`} role="option" aria-selected={i === active} className={i === active ? 'on' : ''}><button tabIndex={-1} onMouseEnter={() => setActive(i)} onClick={() => choose(c.code)}><b>{c.code}</b><span>{c.description}<small>{c.symptom}</small></span><em>{c.searches}회</em></button></li>
                )) : <li className="hd" role="presentation">일치하는 코드가 없습니다</li>}
              </ul>
            )}
          </div>
          <button className="icon-btn" aria-label="진단 패널 열고 닫기" aria-expanded={panels.right} onClick={() => togglePanel('right')}><PanelIcon side="right" /></button>
        </>
      )}
    </header>
  );
}
