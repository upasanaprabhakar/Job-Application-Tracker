import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

/* ── helpers ── */
const toDate  = (str) => str ? new Date(str + 'T00:00:00') : null;
const toStr   = (d)   => d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '';
const today   = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const sameDay = (a, b) => a && b && a.getTime() === b.getTime();
const isToday = (d) => sameDay(d, today());

const DatePicker = ({ value, onChange, placeholder = 'Pick a date', hasError, clearable = true }) => {
  const [open,      setOpen]      = useState(false);
  const [viewYear,  setViewYear]  = useState(() => value ? toDate(value).getFullYear()  : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => value ? toDate(value).getMonth()     : new Date().getMonth());
  const [rect,      setRect]      = useState(null);
  const triggerRef                = useRef(null);
  const selected                  = toDate(value);

  // sync view when value changes externally
  useEffect(() => {
    if (value) {
      const d = toDate(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  const openPicker = () => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    setOpen(true);
  };

  const closePicker = () => setOpen(false);

  const selectDate = (d) => {
    onChange(toStr(d));
    closePicker();
  };

  const clearDate = (e) => {
    e.stopPropagation();
    onChange('');
  };

  // build calendar grid
  const firstDay   = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1); }
    else setViewMonth(v => v - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1); }
    else setViewMonth(v => v + 1);
  };

  // position calendar
  const calHeight = 310;
  const calWidth  = 260;
  const htmlZoom  = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
  const spaceBelow = rect ? (window.innerHeight / htmlZoom) - (rect.bottom / htmlZoom) : 0;
  const calTop  = rect
    ? spaceBelow < calHeight
      ? (rect.top    / htmlZoom) - calHeight - 6
      : (rect.bottom / htmlZoom) + 6
    : 0;
  const calLeft = rect
    ? Math.max(8, Math.min(rect.left / htmlZoom, window.innerWidth / htmlZoom - calWidth - 8))
    : 0;

  const displayValue = selected
    ? selected.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <>
      {/* trigger */}
      <div
        ref={triggerRef}
        onClick={openPicker}
        className={`inp${hasError ? ' err' : ''}`}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', userSelect: 'none', gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <Calendar size={13} style={{ color: open ? 'var(--accent)' : 'var(--t3)', flexShrink: 0 }} />
          <span style={{ fontSize: 14, color: displayValue ? 'var(--t1)' : 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayValue || placeholder}
          </span>
        </div>
        {clearable && selected && (
          <button onClick={clearDate}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 2, display: 'flex', alignItems: 'center', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--t3)'}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* calendar portal */}
      {open && createPortal(
        <>
          {/* backdrop */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 99998 }} onMouseDown={closePicker} />

          {/* calendar */}
          <div
            onMouseDown={e => e.stopPropagation()}
            style={{
              position: 'fixed', top: calTop, left: calLeft, width: calWidth,
              zIndex: 99999,
              background: '#1e1f2c',
              border: '1px solid rgba(0,200,150,0.2)',
              borderRadius: 14,
              boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
              overflow: 'hidden',
              animation: 'popIn 0.15s cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={prevMonth} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', color: 'var(--t2)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.color='var(--t1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='var(--t2)'; }}
              >
                <ChevronLeft size={14} />
              </button>

              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                {MONTHS[viewMonth]} {viewYear}
              </div>

              <button onClick={nextMonth} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', color: 'var(--t2)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.color='var(--t1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='var(--t2)'; }}
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: '8px 12px 4px' }}>
              {DAYS.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: 'var(--t3)', paddingBottom: 4 }}>{d}</div>
              ))}
            </div>

            {/* day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: '0 12px 12px', gap: 2 }}>
              {cells.map((date, i) => {
                if (!date) return <div key={`e-${i}`} />;
                const isSel   = sameDay(date, selected);
                const isTod   = isToday(date);
                return (
                  <button
                    key={i}
                    onClick={() => selectDate(date)}
                    style={{
                      width: '100%', aspectRatio: '1', borderRadius: 8, border: 'none',
                      cursor: 'pointer', fontSize: 12.5, fontWeight: isSel ? 700 : 400,
                      background: isSel ? 'var(--accent)' : 'transparent',
                      color: isSel ? '#051410' : isTod ? 'var(--accent)' : 'var(--t1)',
                      outline: isTod && !isSel ? '1px solid rgba(0,200,150,0.3)' : 'none',
                      transition: 'background 0.12s, color 0.12s',
                    }}
                    onMouseEnter={e => { if (!isSel) { e.currentTarget.style.background='rgba(0,200,150,0.12)'; e.currentTarget.style.color='var(--accent)'; } }}
                    onMouseLeave={e => { if (!isSel) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color= isTod ? 'var(--accent)' : 'var(--t1)'; } }}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {clearable && selected ? (
                <button onClick={() => { onChange(''); closePicker(); }}
                  style={{ fontSize: 12, color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color='#f87171'}
                  onMouseLeave={e => e.currentTarget.style.color='var(--t3)'}
                >Clear</button>
              ) : <div />}
              <button onClick={() => selectDate(today())}
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', transition: 'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity='0.7'}
                onMouseLeave={e => e.currentTarget.style.opacity='1'}
              >Today</button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default DatePicker;