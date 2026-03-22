import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, X, Calendar, Clock,
  FileText, Zap, ArrowRight, TrendingUp, Target,
  Lightbulb, Activity, CheckCircle2,
} from 'lucide-react';
import { applicationApi } from '../../api/applicationApi';
import MainLayout from '../../components/layout/MainLayout';

/* ─── constants ───────────────────────────────────────── */
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const EVENT_TYPES = {
  application: { label:'Applied',     color:'#e8a820', bg:'rgba(232,168,32,0.12)',  border:'rgba(232,168,32,0.25)',  icon: FileText },
  followup:    { label:'Follow-up',   color:'#00c896', bg:'rgba(0,200,150,0.12)',   border:'rgba(0,200,150,0.25)',   icon: Clock    },
  interview:   { label:'Interview',   color:'#f87171', bg:'rgba(248,113,113,0.12)', border:'rgba(248,113,113,0.25)', icon: Zap      },
  offer:       { label:'Offer',       color:'#c084fc', bg:'rgba(192,132,252,0.12)', border:'rgba(192,132,252,0.25)', icon: Zap      },
  accepted:    { label:'Accepted',    color:'#00c896', bg:'rgba(0,200,150,0.12)',   border:'rgba(0,200,150,0.25)',   icon: CheckCircle2 },
  rejected:    { label:'Rejected',    color:'#5a5a72', bg:'rgba(90,90,114,0.12)',   border:'rgba(90,90,114,0.25)',   icon: X        },
};

// Safe accessor — falls back to application type if unknown
const getEventType = (type) => EVENT_TYPES[type] || EVENT_TYPES.application;

/* ─── helpers ─────────────────────────────────────────── */
const badgeClass  = (s) => ({ applied:'b-applied', screening:'b-screening', interviewing:'b-interviewing', offer:'b-offer', accepted:'b-accepted', rejected:'b-rejected', withdrawn:'b-withdrawn' })[s?.toLowerCase()] || 'b-withdrawn';
const statusLabel = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
const isSameDay   = (a, b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
const toDate      = (v) => { if (!v) return null; try { const d = new Date(v); return isNaN(d) ? null : d; } catch { return null; } };
const toKey       = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const norm = (a) => ({
  id:              a._id || a.id,
  company:         a.companyName || a.company  || '',
  position:        a.jobTitle    || a.position || a.title || '',
  status:          (a.status || 'applied').toLowerCase(),
  applicationDate: a.applicationDate || a.appliedDate || a.createdAt,
  followUpDate:    a.followUpDate  || null,   // always a reminder/follow-up, never interview
  updatedAt:       a.updatedAt || null,        // status changes recorded here
  createdAt:       a.createdAt || null,
  jobUrl:          a.jobUrl        || '',
});

// Statuses that indicate meaningful progress worth recording on the heatmap
const PROGRESS_STATUSES = ['screening','interviewing','offer','accepted','rejected'];

const buildEvents = (apps) => {
  const map = {};
  const add = (dateVal, type, app) => {
    const d = toDate(dateVal);
    if (!d) return;
    const key = toKey(d);
    if (!map[key]) map[key] = [];
    const dup = map[key].some(e => e.type === type && e.app.id === app.id);
    if (!dup) map[key].push({ type, app, date: d });
  };

  apps.forEach(a => {
    // 1. Application submitted date — always yellow "Applied" dot
    add(a.applicationDate, 'application', a);

    // 2. Status change activity — recorded on updatedAt.
    //    Only show if updatedAt is genuinely different from BOTH applicationDate AND createdAt.
    //    This prevents bulk-added demo data from flooding today with fake events.
    if (PROGRESS_STATUSES.includes(a.status) && a.updatedAt) {
      const appKey     = toKey(toDate(a.applicationDate) || new Date(0));
      const createdKey = toKey(toDate(a.createdAt)       || new Date(0));
      const updatedKey = toKey(toDate(a.updatedAt));
      const genuineChange = updatedKey !== appKey && updatedKey !== createdKey;
      if (genuineChange) {
        const evType =
          a.status === 'interviewing' ? 'interview' :
          a.status === 'offer'        ? 'offer'     :
          a.status === 'accepted'     ? 'accepted'  :
          a.status === 'rejected'     ? 'rejected'  :
                                        'followup';
        add(a.updatedAt, evType, a);
      }
    }

    // 3. followUpDate — always shown as a follow-up reminder (green dot).
    //    Never treated as an interview event to avoid confusion with status-change dots.
    //    The status-change dot on updatedAt already communicates the interview move.
    if (a.followUpDate) {
      add(a.followUpDate, 'followup', a);
    }
  });

  return map;
};

/* ─── CompanyLogo ─────────────────────────────────────── */
const CompanyLogo = ({ name, size = 32 }) => {
  const [stage, setStage] = useState('clearbit');
  const [src, setSrc]     = useState('');
  const domain = (n) => n?.toLowerCase().trim().replace(/\s+(inc|llc|ltd|corp|co|group|technologies|technology|solutions|services)\.?$/i,'').replace(/[^a-z0-9]/g,'') + '.com';
  useEffect(() => { if (!name) { setStage('letter'); return; } setSrc(`https://logo.clearbit.com/${domain(name)}`); setStage('clearbit'); }, [name]);
  const onErr = () => { if (stage==='clearbit') { setSrc(`https://www.google.com/s2/favicons?domain=${domain(name)}&sz=128`); setStage('fav'); } else setStage('letter'); };
  const bgs = ['#1a2e20','#1a1e2e','#2a1e2e','#2e241a','#1e2a2a'];
  const tcs = ['#00c896','#5aabf0','#c084fc','#e8a820','#00d4bb'];
  const idx = (name?.charCodeAt(0) ?? 0) % bgs.length;
  const s = { width:size, height:size, minWidth:size, flexShrink:0 };
  if (!name || stage==='letter' || !src) return <div style={{ ...s, borderRadius:7, background:bgs[idx], display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ fontSize:size*0.4, fontWeight:700, color:tcs[idx] }}>{name?.[0]?.toUpperCase()?? '?'}</span></div>;
  return <img key={src} src={src} alt={name} style={{ ...s, borderRadius:7, objectFit:'contain', background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)' }} onError={onErr}/>;
};

/* ─── Day Modal ──────────────────────────────────────── */
const DayModal = ({ date, events, onClose, navigate }) => {
  const fmtFull = (d) => d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  return createPortal(
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:20 }}>
      <div onClick={e => e.stopPropagation()} className="ap"
        style={{ width:'100%', maxWidth:440, background:'#1a1b25', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, boxShadow:'0 40px 100px rgba(0,0,0,0.8)', overflow:'hidden' }}>

        {/* header */}
        <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:10.5, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>
              {fmtFull(date)}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:28, fontWeight:800, color:'var(--t1)', fontFamily:'var(--mono)', letterSpacing:'-1px' }}>{date.getDate()}</span>
              <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                {Object.entries(events.reduce((a, e) => { a[e.type]=(a[e.type]||0)+1; return a; }, {})).map(([type, count]) => (
                  <div key={type} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 7px', background:getEventType(type).bg, border:`1px solid ${getEventType(type).border}`, borderRadius:99 }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background:getEventType(type).color }}/>
                    <span style={{ fontSize:10, fontWeight:700, color:getEventType(type).color }}>{count} {getEventType(type).label}{count>1?'s':''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'rgba(255,255,255,0.04)', color:'var(--t2)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.15s', flexShrink:0 }}
            onMouseEnter={e => { e.currentTarget.style.color='var(--t1)'; e.currentTarget.style.background='rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color='var(--t2)'; e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}>
            <X size={14}/>
          </button>
        </div>

        {/* events */}
        <div style={{ maxHeight:400, overflowY:'auto' }}>
          {events.map((ev, i) => {
            const c = getEventType(ev.type);
            const Icon = c.icon;
            return (
              <div key={i} style={{ padding:'14px 20px', borderBottom: i < events.length-1 ? '1px solid var(--border)' : 'none', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:c.bg, border:`1px solid ${c.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={15} style={{ color:c.color }}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <span style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.app.position}</span>
                    <span className={`badge ${badgeClass(ev.app.status)}`} style={{ fontSize:10, flexShrink:0 }}>{statusLabel(ev.app.status)}</span>
                  </div>
                  <div style={{ fontSize:12, color:'var(--t2)' }}>{ev.app.company}</div>
                </div>
                <button onClick={() => { onClose(); navigate(`/applications/${ev.app.id}`); }}
                  style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12, fontWeight:600, color:'var(--accent)', background:'rgba(0,200,150,0.08)', border:'1px solid rgba(0,200,150,0.2)', borderRadius:7, padding:'5px 10px', cursor:'pointer', transition:'all 0.15s', flexShrink:0 }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(0,200,150,0.16)'; e.currentTarget.style.borderColor='rgba(0,200,150,0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(0,200,150,0.08)'; e.currentTarget.style.borderColor='rgba(0,200,150,0.2)'; }}>
                  View <ArrowRight size={11}/>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ─── Activity Heatmap (last 26 weeks) ───────────────── */
const CELL = 13;
const GAP  = 3;

const ActivityHeatmap = ({ eventMap }) => {
  const [tooltip, setTooltip] = useState(null); // { x, y, date, count, apps[] }

  const weeks = useMemo(() => {
    const today  = new Date();
    const result = [];
    const start  = new Date(today);
    start.setDate(today.getDate() - 25 * 7);
    start.setDate(start.getDate() - start.getDay());
    for (let w = 0; w < 26; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const date  = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        const key   = toKey(date);
        const evs   = eventMap[key] || [];
        const count = evs.length;
        week.push({ date, count, evs, future: date > today });
      }
      result.push(week);
    }
    return result;
  }, [eventMap]);

  const maxCount = useMemo(() => Math.max(1, ...weeks.flat().map(d => d.count)), [weeks]);

  const getColor = (count, future) => {
    if (future || count === 0) return 'rgba(255,255,255,0.05)';
    const intensity = count / maxCount;
    if (intensity > 0.75) return 'rgba(0,200,150,0.9)';
    if (intensity > 0.5)  return 'rgba(0,200,150,0.6)';
    if (intensity > 0.25) return 'rgba(0,200,150,0.35)';
    return 'rgba(0,200,150,0.15)';
  };

  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const mo = week[0].date.getMonth();
      if (mo !== lastMonth) {
        labels.push({ index: wi, label: SHORT_MONTHS[mo] });
        lastMonth = mo;
      }
    });
    return labels;
  }, [weeks]);

  const totalWidth = weeks.length * (CELL + GAP) - GAP;

  // type label map
  const typeLabel = { application: 'Applied', interview: 'Interview', followup: 'Follow-up', rejected: 'Rejected' };
  const typeColor = { application: '#e8a820', interview: '#f87171', followup: '#00c896', rejected: '#5a5a72' };

  return (
    <div style={{ overflowX: 'auto', position: 'relative' }}>
      {/* ── styled tooltip — rendered via portal so overflow/clip can't hide it ── */}
      {tooltip && createPortal(
        <div style={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y - 8,
          zIndex: 99999,
          pointerEvents: 'none',
          transform: 'translate(-50%, -100%)',
          background: '#1e1f2e',
          border: '1px solid rgba(0,200,150,0.3)',
          borderRadius: 10,
          padding: '9px 13px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
          minWidth: 150,
          maxWidth: 230,
        }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--t1)', marginBottom: tooltip.count > 0 ? 7 : 0 }}>
            {tooltip.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
          {tooltip.count === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--t3)' }}>No activity</div>
          ) : (
            <>
              {Object.entries(
                tooltip.evs.reduce((acc, e) => { acc[e.type] = (acc[e.type] || 0) + 1; return acc; }, {})
              ).map(([type, cnt]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: typeColor[type] || '#00c896', flexShrink: 0, boxShadow: `0 0 5px ${typeColor[type] || '#00c896'}` }} />
                  <span style={{ fontSize: 11.5, color: 'var(--t2)', fontWeight: 500 }}>
                    {cnt} {typeLabel[type] || type}{cnt > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 5, paddingTop: 5 }}>
                {tooltip.evs.slice(0, 2).map((e, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.app.company}{e.app.position ? ` · ${e.app.position}` : ''}
                  </div>
                ))}
                {tooltip.evs.length > 2 && (
                  <div style={{ fontSize: 10.5, color: 'var(--t3)' }}>+{tooltip.evs.length - 2} more</div>
                )}
              </div>
            </>
          )}
          <div style={{
            position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%) rotate(45deg)',
            width: 8, height: 8, background: '#1e1f2e',
            borderRight: '1px solid rgba(0,200,150,0.3)',
            borderBottom: '1px solid rgba(0,200,150,0.3)',
          }} />
        </div>,
        document.body
      )}

      <div style={{ minWidth: totalWidth + 22, display: 'inline-block' }}>
        {/* month labels */}
        <div style={{ position: 'relative', height: 16, marginLeft: 22, marginBottom: 4 }}>
          {monthLabels.map(({ index, label }) => (
            <span key={label + index} style={{
              position: 'absolute', left: index * (CELL + GAP),
              fontSize: 10, fontWeight: 700, color: 'var(--t3)',
              textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
            }}>{label}</span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: GAP }}>
          {/* day-of-week labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, width: 16, flexShrink: 0 }}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} style={{
                height: CELL, fontSize: 9, lineHeight: `${CELL}px`, textAlign: 'right',
                color: i % 2 === 1 ? 'var(--t3)' : 'transparent', userSelect: 'none',
              }}>{d}</div>
            ))}
          </div>

          {/* week columns */}
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
              {week.map(({ date, count, evs, future }, di) => (
                <div key={di}
                  style={{
                    width: CELL, height: CELL, borderRadius: 3,
                    background: getColor(count, future),
                    border: count > 0 && !future ? '1px solid rgba(0,200,150,0.25)' : '1px solid rgba(255,255,255,0.04)',
                    cursor: !future ? 'pointer' : 'default',
                    transition: 'transform 0.1s, opacity 0.1s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    if (!future) {
                      e.currentTarget.style.transform = 'scale(1.3)';
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({ x: rect.left + rect.width / 2, y: rect.top, date, count, evs });
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1)';
                    setTooltip(null);
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════ */
const CalendarPage = () => {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const today           = useMemo(() => new Date(), []);
  const autoOpenRef     = useRef(false);

  const [apps,        setApps]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [curYear,     setCurYear]     = useState(today.getFullYear());
  const [curMonth,    setCurMonth]    = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [eventFilter, setEventFilter] = useState('all');

  /* ── read ?date= param on mount ── */
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const d = toDate(dateParam);
      if (d && !isNaN(d)) {
        setCurYear(d.getFullYear());
        setCurMonth(d.getMonth());
        autoOpenRef.current = dateParam; // will open modal after data loads
      }
    }
  }, []);

  /* ── load apps ── */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res  = await applicationApi.getAllApplications({ limit:500 });
        const list = (() => { for (const c of [res?.applications, res?.data?.applications, res?.data, res]) { if (Array.isArray(c)) return c; } return []; })();
        setApps(list.map(norm));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  /* ── auto-open modal after data loads if deep-link ── */
  useEffect(() => {
    if (!loading && autoOpenRef.current && apps.length >= 0) {
      const d = toDate(autoOpenRef.current);
      if (d) setSelectedDay(d);
      autoOpenRef.current = false;
    }
  }, [loading, apps]);

  /* ── event maps ── */
  const allEventMap = useMemo(() => buildEvents(apps), [apps]);
  const eventMap    = useMemo(() => {
    if (eventFilter === 'all') return allEventMap;
    const f = {};
    Object.entries(allEventMap).forEach(([k, evs]) => {
      const filtered = evs.filter(e => e.type === eventFilter);
      if (filtered.length) f[k] = filtered;
    });
    return f;
  }, [allEventMap, eventFilter]);

  /* ── calendar grid ── */
  const days = useMemo(() => {
    const first = new Date(curYear, curMonth, 1);
    const last  = new Date(curYear, curMonth + 1, 0);
    const arr   = [];
    for (let i = first.getDay() - 1; i >= 0; i--) arr.push({ date: new Date(curYear, curMonth, -i),     current:false });
    for (let i = 1; i <= last.getDate(); i++)       arr.push({ date: new Date(curYear, curMonth, i),      current:true  });
    const rem = 42 - arr.length;
    for (let i = 1; i <= rem; i++)                  arr.push({ date: new Date(curYear, curMonth+1, i),   current:false });
    return arr;
  }, [curYear, curMonth]);

  /* ── navigation ── */
  const prevMonth = () => { if (curMonth===0) { setCurMonth(11); setCurYear(y=>y-1); } else setCurMonth(m=>m-1); setSelectedDay(null); };
  const nextMonth = () => { if (curMonth===11){ setCurMonth(0);  setCurYear(y=>y+1); } else setCurMonth(m=>m+1); setSelectedDay(null); };
  const goToday   = () => { setCurMonth(today.getMonth()); setCurYear(today.getFullYear()); setSelectedDay(null); };

  /* ── upcoming 7 days ── */
  const upcoming = useMemo(() => {
    const result = [];
    for (let i = 0; i < 8; i++) {
      const d   = new Date(today);
      d.setDate(today.getDate() + i);
      const key = toKey(d);
      const evs = (allEventMap[key] || []).filter(e => eventFilter==='all' || e.type===eventFilter);
      if (evs.length) result.push({ date:d, events:evs, isToday:i===0 });
    }
    return result;
  }, [allEventMap, today, eventFilter]);

  /* ── month stats ── */
  const monthStats = useMemo(() => {
    const stats = { total:0, application:0, followup:0, interview:0 };
    days.filter(d => d.current).forEach(({ date }) => {
      const evs = eventMap[toKey(date)] || [];
      stats.total += evs.length;
      evs.forEach(e => { if (stats[e.type] !== undefined) stats[e.type]++; });
    });
    return stats;
  }, [days, eventMap]);

  /* ── busiest day this month ── */
  const busiestDay = useMemo(() => {
    let best = null, bestCount = 0;
    days.filter(d => d.current).forEach(({ date }) => {
      const count = (eventMap[toKey(date)] || []).length;
      if (count > bestCount) { bestCount = count; best = date; }
    });
    return best && bestCount > 0 ? { date:best, count:bestCount } : null;
  }, [days, eventMap]);

  /* ── streak: consecutive days with at least 1 application ──
     Logic: count backward from today. If today has no application yet,
     we don't penalise — we start counting from yesterday so the streak
     isn't broken just because you haven't applied yet today.
     A streak only resets when there's a full day gap with zero applications.
  ── */
  const streak = useMemo(() => {
    const hasAppOnDay = (d) => (allEventMap[toKey(d)] || []).some(e => e.type==='application');
    const d = new Date(today);
    d.setHours(0,0,0,0);

    // If today has an application, count forward from today
    if (hasAppOnDay(d)) {
      let count = 0;
      const cur = new Date(d);
      while (hasAppOnDay(cur)) {
        count++;
        cur.setDate(cur.getDate() - 1);
      }
      return count;
    }

    // Today has no application yet — don't break streak, start counting from yesterday
    d.setDate(d.getDate() - 1);
    if (!hasAppOnDay(d)) return 0; // yesterday also empty = streak really is 0
    let count = 0;
    const cur = new Date(d);
    while (hasAppOnDay(cur)) {
      count++;
      cur.setDate(cur.getDate() - 1);
    }
    return count;
  }, [allEventMap, today]);

  /* ── selected day events ── */
  const selectedEvents = useMemo(() => {
    if (!selectedDay) return [];
    return eventMap[toKey(selectedDay)] || [];
  }, [selectedDay, eventMap]);

  const relativeDay = (d) => {
    if (isSameDay(d, today)) return 'Today';
    const tmr = new Date(today); tmr.setDate(today.getDate()+1);
    if (isSameDay(d, tmr)) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
  };

  const isCurrentMonth = curMonth===today.getMonth() && curYear===today.getFullYear();

  const filterTabs = [
    { key:'all',         label:'All'          },
    { key:'application', label:'Applied'      },
    { key:'followup',    label:'Follow-ups'   },
    { key:'interview',   label:'Interviews'   },
  ];

  return (
    <MainLayout title="Calendar">
      {selectedDay && selectedEvents.length > 0 && (
        <DayModal date={selectedDay} events={selectedEvents} onClose={() => setSelectedDay(null)} navigate={navigate}/>
      )}

      <div style={{ maxWidth:1140 }}>

        {/* ── HEADER ── */}
        <div className="au" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div>
            <h2 style={{ fontSize:21, fontWeight:800, color:'var(--t1)', letterSpacing:'-0.5px', marginBottom:2 }}>
              {MONTHS[curMonth]}{' '}
              <span style={{ color:'var(--accent)', fontFamily:'var(--mono)' }}>{curYear}</span>
            </h2>
            <p style={{ fontSize:12.5, color:'var(--t3)' }}>
              {loading ? 'Loading events…' : `${monthStats.total} event${monthStats.total!==1?'s':''} this month`}
            </p>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            {/* filter */}
            <div style={{ display:'flex', alignItems:'center', gap:2, background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', borderRadius:10, padding:3 }}>
              {filterTabs.map(({ key, label }) => (
                <button key={key} onClick={() => setEventFilter(key)} style={{
                  padding:'5px 11px', borderRadius:7, border:'none', cursor:'pointer',
                  fontSize:12, fontWeight: eventFilter===key ? 600 : 400,
                  color: eventFilter===key ? 'var(--accent)' : 'var(--t2)',
                  background: eventFilter===key ? 'rgba(0,200,150,0.1)' : 'transparent',
                  transition:'all 0.15s',
                }}
                  onMouseEnter={e => { if(eventFilter!==key){ e.currentTarget.style.color='var(--t1)'; e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}}
                  onMouseLeave={e => { if(eventFilter!==key){ e.currentTarget.style.color='var(--t2)'; e.currentTarget.style.background='transparent'; }}}
                >{label}</button>
              ))}
            </div>

            <div style={{ width:1, height:28, background:'var(--border)' }}/>

            {!isCurrentMonth && (
              <button onClick={goToday} style={{ padding:'6px 12px', borderRadius:8, border:'1px solid var(--border)', background:'rgba(255,255,255,0.04)', color:'var(--t2)', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.15s' }}
                onMouseEnter={e=>{ e.currentTarget.style.color='var(--t1)'; e.currentTarget.style.borderColor='var(--border-up)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.color='var(--t2)'; e.currentTarget.style.borderColor='var(--border)'; }}>
                Today
              </button>
            )}

            <div style={{ display:'flex', gap:4 }}>
              {[{fn:prevMonth,icon:ChevronLeft},{fn:nextMonth,icon:ChevronRight}].map(({fn,icon:Icon},i)=>(
                <button key={i} onClick={fn} style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'rgba(255,255,255,0.04)', color:'var(--t2)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.15s' }}
                  onMouseEnter={e=>{ e.currentTarget.style.color='var(--t1)'; e.currentTarget.style.borderColor='var(--border-up)'; e.currentTarget.style.background='rgba(255,255,255,0.07)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.color='var(--t2)'; e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}>
                  <Icon size={15}/>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── STAT STRIP ── */}
        <div className="au d1" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
          {[
            { label:'This Month', value:monthStats.total,       sub:'total events',       color:'var(--t1)', icon:Calendar   },
            { label:'Applied',    value:monthStats.application, sub:'applications',       color:'#5aabf0',   icon:FileText   },
            { label:'Follow-ups', value:monthStats.followup,    sub:'due this month',     color:'#00c896',   icon:Clock      },
            { label:'Streak',     value:streak,                 sub:'day application run',color:'#c084fc',   icon:TrendingUp },
          ].map(({ label, value, sub, color, icon:Icon }, i) => (
            <div key={label} className="card" style={{ padding:'13px 16px', animationDelay:`${i*40}ms` }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.09em' }}>{label}</span>
                <div style={{ width:26, height:26, borderRadius:7, background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={12} style={{ color }}/>
                </div>
              </div>
              <div style={{ fontSize:26, fontWeight:800, color, fontFamily:'var(--mono)', letterSpacing:'-0.8px', lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:10.5, color:'var(--t3)', marginTop:4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── LEGEND ── */}
        <div className="au d2" style={{ display:'flex', alignItems:'center', gap:16, marginBottom:14 }}>
          {Object.entries(EVENT_TYPES).map(([key, cfg]) => (
            <div key={key} style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:cfg.color }}/>
              <span style={{ fontSize:11.5, color:'var(--t3)', fontWeight:500 }}>{cfg.label}</span>
            </div>
          ))}
          {busiestDay && (
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, padding:'4px 10px', background:'rgba(0,200,150,0.06)', border:'1px solid rgba(0,200,150,0.15)', borderRadius:8 }}>
              <Target size={11} style={{ color:'var(--accent)' }}/>
              <span style={{ fontSize:11.5, color:'var(--t2)' }}>
                Busiest: <strong style={{ color:'var(--t1)' }}>{busiestDay.date.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</strong>
                <span style={{ color:'var(--t3)' }}> ({busiestDay.count} events)</span>
              </span>
            </div>
          )}
        </div>

        {/* ── MAIN GRID ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 272px', gap:14, alignItems:'start' }}>

          {/* ── CALENDAR ── */}
          <div className="card au d3" style={{ overflow:'hidden' }}>
            {/* weekday headers */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid var(--border)' }}>
              {DAYS.map(d => (
                <div key={d} style={{ padding:'10px 0', textAlign:'center', fontSize:10.5, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.09em' }}>{d}</div>
              ))}
            </div>

            {loading ? (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
                {Array.from({length:42}).map((_,i) => (
                  <div key={i} style={{ minHeight:80, padding:'10px 8px', borderRight:(i+1)%7!==0?'1px solid var(--border)':'none', borderBottom:i<35?'1px solid var(--border)':'none' }}>
                    <div className="skel" style={{ width:24, height:14, borderRadius:4, margin:'0 auto 8px' }}/>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
                {days.map(({ date, current }, i) => {
                  const key       = toKey(date);
                  const dayEvs    = eventMap[key] || [];
                  const isToday   = isSameDay(date, today);
                  const isSel     = selectedDay && isSameDay(date, selectedDay);
                  const hasEvents = dayEvs.length > 0;
                  const isWeekend = date.getDay()===0 || date.getDay()===6;
                  const typeCounts = dayEvs.reduce((a,e)=>{ a[e.type]=(a[e.type]||0)+1; return a; }, {});

                  return (
                    <div key={i}
                      onClick={() => { if (hasEvents) setSelectedDay(date); else if (current) setSelectedDay(null); }}
                      style={{
                        minHeight:80, padding:'8px 8px 6px',
                        borderRight:(i+1)%7!==0?'1px solid var(--border)':'none',
                        borderBottom:i<35?'1px solid var(--border)':'none',
                        cursor:hasEvents?'pointer':'default',
                        background:isSel
                          ? 'rgba(0,200,150,0.08)'
                          : isToday
                            ? 'rgba(0,200,150,0.035)'
                            : 'transparent',
                        transition:'background 0.15s',
                        position:'relative',
                      }}
                      onMouseEnter={e => { if(hasEvents && !isSel) e.currentTarget.style.background='rgba(255,255,255,0.025)'; }}
                      onMouseLeave={e => {
                        if (!isSel && !isToday) e.currentTarget.style.background='transparent';
                        else if (isToday && !isSel) e.currentTarget.style.background='rgba(0,200,150,0.035)';
                      }}
                    >
                      {/* today indicator line */}
                      {isToday && <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'var(--accent)', borderRadius:'0 0 2px 2px' }}/>}

                      {/* date number */}
                      <div style={{ display:'flex', justifyContent:'center', marginBottom:4 }}>
                        <span style={{
                          width:27, height:27, display:'flex', alignItems:'center', justifyContent:'center',
                          borderRadius:'50%', fontSize:12.5,
                          fontWeight:isToday?800:current?500:400,
                          color:isToday?'#051410':current?(isWeekend?'var(--t2)':'var(--t1)'):'var(--t3)',
                          background:isToday?'var(--accent)':'transparent',
                          fontFamily:'var(--mono)',
                        }}>{date.getDate()}</span>
                      </div>

                      {/* event pills */}
                      {hasEvents && (
                        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                          {Object.entries(typeCounts).slice(0,3).map(([type, count]) => {
                            const cfg = getEventType(type);
                            return (
                              <div key={type} style={{ display:'flex', alignItems:'center', gap:3, padding:'1.5px 5px', borderRadius:4, background:cfg.bg, border:`1px solid ${cfg.border}` }}>
                                <span style={{ width:4, height:4, borderRadius:'50%', background:cfg.color, flexShrink:0 }}/>
                                <span style={{ fontSize:9.5, fontWeight:600, color:cfg.color, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:52, lineHeight:1.2 }}>
                                  {count>1?`${count}x `:''}{cfg.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── SIDEBAR ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

            {/* month breakdown */}
            <div className="card au d3" style={{ overflow:'hidden' }}>
              <div style={{ padding:'12px 14px 10px', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:10.5, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Month Breakdown</span>
              </div>
              <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                {Object.entries(EVENT_TYPES).map(([key, cfg]) => {
                  const count = monthStats[key] || 0;
                  const pct   = monthStats.total > 0 ? (count / monthStats.total) * 100 : 0;
                  return (
                    <div key={key} style={{ cursor:'pointer' }} onClick={() => setEventFilter(eventFilter===key?'all':key)}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ width:7, height:7, borderRadius:'50%', background:cfg.color }}/>
                          <span style={{ fontSize:12, fontWeight:500, color: eventFilter===key?cfg.color:'var(--t2)' }}>{cfg.label}</span>
                        </div>
                        <span style={{ fontSize:12, fontWeight:700, color:cfg.color, fontFamily:'var(--mono)' }}>{count}</span>
                      </div>
                      <div style={{ height:3, borderRadius:99, background:'rgba(255,255,255,0.06)', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:cfg.color, borderRadius:99, transition:'width 0.4s cubic-bezier(0.22,1,0.36,1)', opacity: eventFilter!=='all'&&eventFilter!==key ? 0.3 : 1 }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* upcoming */}
            <div className="card au d4" style={{ overflow:'hidden' }}>
              <div style={{ padding:'12px 14px 10px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:10.5, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Upcoming</span>
                <span style={{ fontSize:10, color:'var(--t3)' }}>7 days</span>
              </div>

              {loading ? (
                <div style={{ padding:14 }}>
                  {[80,60,70].map((w,i) => <div key={i} className="skel" style={{ height:11, width:`${w}%`, borderRadius:4, marginBottom:10 }}/>)}
                </div>
              ) : upcoming.length === 0 ? (
                <div style={{ padding:'22px 16px', textAlign:'center' }}>
                  <Activity size={20} style={{ color:'var(--t3)', margin:'0 auto 8px', display:'block' }}/>
                  <div style={{ fontSize:12, color:'var(--t3)', fontWeight:500 }}>Nothing this week</div>
                </div>
              ) : (
                <div style={{ padding:'4px 0' }}>
                  {upcoming.map(({ date, events, isToday:isTd }, gi) => (
                    <div key={gi}>
                      <div style={{ padding:'8px 14px 3px', display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:10, fontWeight:700, color:isTd?'var(--accent)':'var(--t3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{relativeDay(date)}</span>
                        {isTd && <span style={{ width:4, height:4, borderRadius:'50%', background:'var(--accent)' }}/>}
                      </div>
                      {events.map((ev, ei) => {
                        const c = getEventType(ev.type);
                        const Icon = c.icon;
                        return (
                          <div key={ei} onClick={() => navigate(`/applications/${ev.app.id}`)}
                            style={{ display:'flex', alignItems:'center', gap:9, padding:'6px 14px', cursor:'pointer', transition:'background 0.12s' }}
                            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                            onMouseLeave={e => e.currentTarget.style.background='transparent'}
                          >
                            <div style={{ width:22, height:22, borderRadius:6, background:c.bg, border:`1px solid ${c.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                              <Icon size={10} style={{ color:c.color }}/>
                            </div>
                            <div style={{ minWidth:0, flex:1 }}>
                              <div style={{ fontSize:12, fontWeight:600, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.app.company}</div>
                              <div style={{ fontSize:10.5, color:'var(--t3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.app.position}</div>
                            </div>
                            <span style={{ width:6, height:6, borderRadius:'50%', background:c.color, flexShrink:0 }}/>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* tip panel */}
            <div className="card au d5" style={{ padding:'13px 14px', border:'1px solid rgba(0,200,150,0.15)', background:'rgba(0,200,150,0.04)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
                <Lightbulb size={13} style={{ color:'var(--accent)' }}/>
                <span style={{ fontSize:10.5, fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Tip</span>
              </div>
              <div style={{ fontSize:11.5, color:'var(--t2)', lineHeight:1.6 }}>
                Click any date with events to see details. Add <strong style={{ color:'var(--t1)' }}>follow-up dates</strong> on the application page — they appear here automatically.
              </div>
              <button onClick={() => navigate('/applications')} style={{ marginTop:10, display:'inline-flex', alignItems:'center', gap:5, fontSize:11.5, fontWeight:600, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', padding:0, transition:'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity='0.7'}
                onMouseLeave={e => e.currentTarget.style.opacity='1'}>
                Go to Applications <ArrowRight size={11}/>
              </button>
            </div>
          </div>
        </div>

        {/* ── ACTIVITY HEATMAP ── */}
        {!loading && apps.length > 0 && (
          <div className="card au" style={{ padding:'18px 20px', marginTop:14 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2 }}>Activity Heatmap</div>
                <div style={{ fontSize:12, color:'var(--t3)' }}>Last 26 weeks of application activity</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:10.5, color:'var(--t3)' }}>Less</span>
                {['rgba(255,255,255,0.04)','rgba(0,200,150,0.14)','rgba(0,200,150,0.3)','rgba(0,200,150,0.55)','rgba(0,200,150,0.85)'].map((bg,i) => (
                  <span key={i} style={{ width:11, height:11, borderRadius:3, background:bg, border:'1px solid rgba(255,255,255,0.06)' }}/>
                ))}
                <span style={{ fontSize:10.5, color:'var(--t3)' }}>More</span>
              </div>
            </div>
            <ActivityHeatmap eventMap={allEventMap}/>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!loading && apps.length === 0 && (
          <div className="card au" style={{ padding:'60px 20px', textAlign:'center', marginTop:14 }}>
            <div style={{ width:50, height:50, borderRadius:14, background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
              <Calendar size={22} style={{ color:'var(--t3)' }}/>
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--t1)', marginBottom:6 }}>No applications yet</div>
            <div style={{ fontSize:13, color:'var(--t2)', marginBottom:20 }}>Add applications to see their dates on the calendar.</div>
            <button onClick={() => navigate('/applications/new')} style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 20px', fontSize:13, fontWeight:600, color:'var(--accent)', background:'rgba(0,200,150,0.08)', border:'1px solid rgba(0,200,150,0.25)', borderRadius:10, cursor:'pointer', transition:'all 0.18s' }}
              onMouseEnter={e=>{ e.currentTarget.style.background='rgba(0,200,150,0.15)'; e.currentTarget.style.borderColor='rgba(0,200,150,0.5)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.background='rgba(0,200,150,0.08)'; e.currentTarget.style.borderColor='rgba(0,200,150,0.25)'; }}>
              <FileText size={14}/> Add First Application
            </button>
          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default CalendarPage;