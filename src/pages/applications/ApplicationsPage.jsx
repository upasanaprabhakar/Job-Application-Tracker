import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, X, MoreHorizontal, Edit2, Trash2, Copy,
  ExternalLink, ChevronLeft, ChevronRight, Grid3x3, List,
  SlidersHorizontal, Briefcase, CheckSquare, Square, ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { applicationApi } from '../../api/applicationApi';
import MainLayout from '../../components/layout/MainLayout';

/* ─── constants ───────────────────────────────────────── */
const STATUS_FILTERS = [
  { key: 'all',          label: 'All' },
  { key: 'applied',      label: 'Applied' },
  { key: 'screening',    label: 'Screening' },
  { key: 'interviewing', label: 'Interviewing' },
  { key: 'offer',        label: 'Offer' },
  { key: 'accepted',     label: 'Accepted' },
  { key: 'rejected',     label: 'Rejected' },
  { key: 'withdrawn',    label: 'Withdrawn' },
];

const BULK_STATUSES = [
  { key: 'applied',      label: 'Applied',      color: '#e8a820' },
  { key: 'screening',    label: 'Screening',    color: '#5aabf0' },
  { key: 'interviewing', label: 'Interviewing', color: '#00c896' },
  { key: 'offer',        label: 'Offer',        color: '#c084fc' },
  { key: 'rejected',     label: 'Rejected',     color: '#f87171' },
  { key: 'withdrawn',    label: 'Withdrawn',    color: '#5a5a72' },
];

/* ─── helpers ──────────────────────────────────────────── */
const badgeClass  = (s) => ({ applied:'b-applied', screening:'b-screening', interviewing:'b-interviewing', offer:'b-offer', accepted:'b-accepted', rejected:'b-rejected', withdrawn:'b-withdrawn' })[s?.toLowerCase()] || 'b-withdrawn';
const statusLabel = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : 'Applied';
const fmtDate     = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }); } catch { return '—'; } };

/* ─── extractors ──────────────────────────────────────── */
const extractList  = (res) => { if (!res) return []; for (const c of [res?.data?.applications, res?.applications, res?.data?.data, res?.data, res]) { if (Array.isArray(c)) return c; } return []; };
const extractMeta  = (res) => ({ totalPages: res?.data?.totalPages || res?.totalPages || 1, total: res?.data?.total || res?.total || 0 });
const extractStats = (res) => res?.data || res || {};

/* ─── Checkbox ────────────────────────────────────────── */
const Cb = ({ checked, indeterminate, onChange, style = {} }) => {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate || false; }, [indeterminate]);
  return (
    <div
      onClick={e => { e.stopPropagation(); onChange(); }}
      style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
        border: checked || indeterminate ? '2px solid var(--accent)' : '2px solid var(--t3)',
        background: checked || indeterminate ? 'var(--accent)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.14s',
        ...style,
      }}
    >
      {checked && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="#051410" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      {!checked && indeterminate && <div style={{ width: 8, height: 2, background: '#051410', borderRadius: 1 }}/>}
    </div>
  );
};

/* ─── CompanyLogo ─────────────────────────────────────── */
const CompanyLogo = ({ name, size = 36 }) => {
  const [src, setSrc]     = useState('');
  const [stage, setStage] = useState('clearbit');
  const domain = useCallback((n) => n?.toLowerCase().trim().replace(/\s+(inc|llc|ltd|corp|co|group|technologies|technology|solutions|services)\.?$/i,'').replace(/[^a-z0-9]/g,'') + '.com', []);
  useEffect(() => { if (!name) { setStage('letter'); return; } setSrc(`https://logo.clearbit.com/${domain(name)}`); setStage('clearbit'); }, [name, domain]);
  const onErr = () => { if (stage === 'clearbit') { setSrc(`https://www.google.com/s2/favicons?domain=${domain(name)}&sz=128`); setStage('fav'); } else setStage('letter'); };
  const bg = ['#1a2e20','#1a1e2e','#2a1e2e','#2e241a','#1e2a2a'], tc = ['#00c896','#5aabf0','#c084fc','#e8a820','#00d4bb'];
  const idx = (name?.charCodeAt(0) ?? 0) % bg.length, sty = { width:size, height:size, minWidth:size, flexShrink:0 };
  if (!name || stage === 'letter' || !src) return <div style={{ ...sty, borderRadius:9, background:bg[idx], display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ fontSize:size*0.38, fontWeight:700, color:tc[idx] }}>{name?.[0]?.toUpperCase() ?? '?'}</span></div>;
  return <img key={src} src={src} alt={name} style={{ ...sty, borderRadius:9, objectFit:'contain', background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)' }} onError={onErr}/>;
};

/* ─── DeleteModal ─────────────────────────────────────── */
const DeleteModal = ({ count, label, onConfirm, onCancel }) => (
  <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.72)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }}>
    <div className="card ap" style={{ padding:28, maxWidth:380, width:'90%', boxShadow:'0 24px 80px rgba(0,0,0,0.6)' }}>
      <div style={{ width:42, height:42, borderRadius:11, background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
        <AlertTriangle size={18} style={{ color:'#f87171' }}/>
      </div>
      <h3 style={{ fontSize:15, fontWeight:700, color:'var(--t1)', textAlign:'center', marginBottom:6 }}>
        {count > 1 ? `Delete ${count} Applications` : 'Delete Application'}
      </h3>
      <p style={{ fontSize:13, color:'var(--t2)', textAlign:'center', marginBottom:20, lineHeight:1.55 }}>
        {count > 1
          ? <>Remove <strong style={{ color:'var(--t1)' }}>{count} applications</strong>? This cannot be undone.</>
          : <>Remove <strong style={{ color:'var(--t1)' }}>{label}</strong>? This cannot be undone.</>
        }
      </p>
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={onCancel} className="btn-s" style={{ flex:1, justifyContent:'center', padding:'9px 0' }}>Cancel</button>
        <button onClick={onConfirm}
          style={{ flex:1, padding:'9px 0', background:'rgba(248,113,113,0.15)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:10, color:'#f87171', fontSize:13, fontWeight:600, cursor:'pointer', transition:'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(248,113,113,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(248,113,113,0.15)'}>
          {count > 1 ? `Delete ${count}` : 'Delete'}
        </button>
      </div>
    </div>
  </div>
);

/* ─── ActionMenu ──────────────────────────────────────── */
const ActionMenu = ({ app, onEdit, onDelete, onClone, onClose, triggerRect }) => {
  if (!triggerRect) return null;

  const menuWidth  = 168;
  const menuHeight = 160;
  const htmlZoom   = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
  const spaceBelow = (window.innerHeight / htmlZoom) - (triggerRect.bottom / htmlZoom);
  const top        = spaceBelow < menuHeight
    ? (triggerRect.top    / htmlZoom) - menuHeight - 4
    : (triggerRect.bottom / htmlZoom) + 4;
  const left = Math.min(
    (triggerRect.right / htmlZoom) - menuWidth,
    (window.innerWidth / htmlZoom) - menuWidth - 8
  );

  return createPortal(
    <>
      {/* invisible backdrop to catch outside clicks */}
      <div
        style={{ position:'fixed', inset:0, zIndex:99998 }}
        onMouseDown={onClose}
      />
      <div className="ap"
        style={{ position:'fixed', top, left, width:menuWidth, background:'#1e1f2c', border:'1px solid rgba(255,255,255,0.1)', borderRadius:11, boxShadow:'0 16px 50px rgba(0,0,0,0.55)', zIndex:99999, overflow:'hidden' }}
        onMouseDown={e => e.stopPropagation()}
      >
        {[
          { icon:Edit2, label:'Edit', action:onEdit },
          { icon:Copy,  label:'Clone', action:onClone },
          ...(app.jobUrl ? [{ icon:ExternalLink, label:'Open Posting', action:() => { window.open(app.jobUrl,'_blank'); onClose(); } }] : []),
        ].map(({ icon:Icon, label:l, action }) => (
          <button key={l} onClick={() => { action(); onClose(); }}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'9px 14px', border:'none', background:'transparent', color:'var(--t2)', fontSize:13, cursor:'pointer', transition:'color 0.15s, background 0.15s', textAlign:'left' }}
            onMouseEnter={e => { e.currentTarget.style.color='var(--t1)'; e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.color='var(--t2)'; e.currentTarget.style.background='transparent'; }}>
            <Icon size={13}/>{l}
          </button>
        ))}
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}/>
        <button onClick={() => { onDelete(); onClose(); }}
          style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'9px 14px', border:'none', background:'transparent', color:'#f87171', fontSize:13, cursor:'pointer', transition:'background 0.15s', textAlign:'left' }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(248,113,113,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
          <Trash2 size={13}/>Delete
        </button>
      </div>
    </>,
    document.body
  );
};

/* ─── BulkStatusDropdown ──────────────────────────────── */
const BulkStatusDropdown = ({ onSelect }) => {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const triggerRef      = useRef(null);

  const handleOpen = () => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (triggerRef.current && triggerRef.current.contains(e.target)) return; setOpen(false); };
    const t = setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', h); };
  }, [open]);

  const menu = open && rect ? createPortal(
    <div style={{
      position:'fixed', top: rect.bottom + 4, left: rect.left, minWidth: 160,
      background:'#1e1f2c', border:'1px solid rgba(255,255,255,0.12)',
      borderRadius:11, boxShadow:'0 16px 50px rgba(0,0,0,0.7)',
      overflow:'hidden', zIndex:99999,
    }}>
      <div style={{ padding:'8px 12px 6px', fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.09em' }}>
        Set status to…
      </div>
      {BULK_STATUSES.map(({ key, label, color }) => (
        <button key={key}
          onMouseDown={e => { e.preventDefault(); onSelect(key); setOpen(false); }}
          style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'8px 14px', border:'none', background:'transparent', color:'var(--t2)', fontSize:13, cursor:'pointer', textAlign:'left', transition:'background 0.12s' }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='var(--t1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--t2)'; }}
        >
          <span style={{ width:7, height:7, borderRadius:'50%', background:color, flexShrink:0 }}/>
          {label}
        </button>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div ref={triggerRef} style={{ position:'relative' }}>
      <button onClick={handleOpen} style={{
        display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px',
        fontSize:12.5, fontWeight:600, color:'var(--accent)',
        background:'rgba(0,200,150,0.08)', border:'1px solid rgba(0,200,150,0.25)',
        borderRadius:8, cursor:'pointer', transition:'all 0.15s',
      }}
        onMouseEnter={e => { e.currentTarget.style.background='rgba(0,200,150,0.14)'; e.currentTarget.style.borderColor='rgba(0,200,150,0.5)'; }}
        onMouseLeave={e => { e.currentTarget.style.background='rgba(0,200,150,0.08)'; e.currentTarget.style.borderColor='rgba(0,200,150,0.25)'; }}
      >
        Update Status <ChevronDown size={12}/>
      </button>
      {menu}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
const ApplicationsPage = () => {
  const navigate = useNavigate();
  const [apps,         setApps]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [filter,       setFilter]       = useState('all');
  const [view,         setView]         = useState('list');
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [menuOpen,     setMenuOpen]     = useState(null);
  const [menuRect,     setMenuRect]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { ids: [], label: '' }
  const [stats,        setStats]        = useState({ total:0, thisWeek:0, responseRate:0, interviews:0 });

  // bulk
  const [selected,     setSelected]     = useState(new Set());
  const [bulkLoading,  setBulkLoading]  = useState(false);

  const LIMIT = 10;

  const normalize = (a) => ({
    id:       a._id || a.id,
    company:  a.companyName || a.company  || '',
    position: a.jobTitle    || a.position || a.title || '',
    status:   a.status      || 'applied',
    date:     a.applicationDate || a.createdAt,
    location: a.location    || '',
    jobUrl:   a.jobUrl      || '',
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setSelected(new Set()); // clear selection on reload
      const params = { page, limit:LIMIT, sort:'-createdAt' };
      if (filter !== 'all') params.status = filter;
      if (search.trim())    params.search  = search.trim();

      const [aRes, sRes] = await Promise.all([
        applicationApi.getAllApplications(params),
        applicationApi.getStatistics().catch(() => null),
      ]);

      const list = extractList(aRes);
      const meta = extractMeta(aRes);
      setApps(list.map(normalize));
      setTotalPages(meta.totalPages);

      // Fetch full app list for accurate counts (list above may be paginated)
      try {
        const allRes  = await applicationApi.getAllApplications({ limit: 500 });
        const allList = extractList(allRes);
        let screening=0, interviews=0, offerCount=0, accepted=0, rejected=0;
        allList.forEach(a => {
          const s = (a.status || 'applied').toLowerCase();
          if (s === 'screening')    screening++;
          else if (s === 'interviewing') interviews++;
          else if (s === 'offer')   offerCount++;
          else if (s === 'accepted') accepted++;
          else if (s === 'rejected') rejected++;
        });
        const total     = allList.filter(a => (a.status||'').toLowerCase() !== 'withdrawn').length;
        const responded = screening + interviews + offerCount + accepted + rejected;
        const rr        = total > 0 ? Math.round((responded / total) * 100) : 0;
        const now       = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (now.getDay()===0?6:now.getDay()-1));
        weekStart.setHours(0,0,0,0);
        const thisWeek  = allList.filter(a => new Date(a.applicationDate || a.createdAt) >= weekStart).length;
        setStats({ total: allList.length, thisWeek, responseRate:rr, interviews });
      } catch(e) { console.error('stats error', e); }
    } catch (e) {
      console.error('ApplicationsPage load error:', e);
    } finally {
      setLoading(false);
    }
  }, [page, filter, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setTimeout(() => setPage(1), 350); return () => clearTimeout(t); }, [search]);
  // menu closes via backdrop click in ActionMenu portal

  /* ── single delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.ids.length === 1) {
        await applicationApi.deleteApplication(deleteTarget.ids[0]);
      } else {
        await applicationApi.bulkDelete(deleteTarget.ids);
      }
      setDeleteTarget(null);
      setSelected(new Set());
      load();
    } catch (e) { console.error(e); }
  };

  const handleClone = async (id) => {
    try { await applicationApi.cloneApplication(id); load(); }
    catch (e) { console.error(e); }
  };

  /* ── bulk selection helpers ── */
  const allSelected     = apps.length > 0 && apps.every(a => selected.has(a.id));
  const someSelected    = apps.some(a => selected.has(a.id)) && !allSelected;
  const selectedCount   = selected.size;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(apps.map(a => a.id)));
    }
  };

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ── bulk status update ── */
  const handleBulkStatus = async (newStatus) => {
    if (!selected.size) return;
    try {
      setBulkLoading(true);
      await applicationApi.bulkUpdateStatus([...selected], newStatus);
      setSelected(new Set());
      load();
    } catch (e) {
      console.error('Bulk status error:', e?.response?.data || e);
    } finally {
      setBulkLoading(false);
    }
  };

  /* ── bulk delete trigger ── */
  const handleBulkDeleteTrigger = () => {
    if (!selected.size) return;
    setDeleteTarget({ ids: [...selected], label: '' });
  };

  const miniStats = [
    { label:'Total',         value: stats.total },
    { label:'This Week',     value: stats.thisWeek },
    { label:'Response Rate', value: `${stats.responseRate}%` },
    { label:'Interviews',    value: stats.interviews },
  ];

  /* ghost btn style */
  const ghostBtn = {
    display:'inline-flex', alignItems:'center', gap:7, fontWeight:600,
    fontFamily:'var(--font)', color:'var(--accent)',
    background:'rgba(0,200,150,0.08)', border:'1px solid rgba(0,200,150,0.25)',
    borderRadius:'var(--rs)', cursor:'pointer',
    transition:'background 0.18s, border-color 0.18s, transform 0.15s',
  };
  const ghostHover   = e => { e.currentTarget.style.background='rgba(0,200,150,0.14)'; e.currentTarget.style.borderColor='rgba(0,200,150,0.5)'; e.currentTarget.style.transform='translateY(-1px)'; };
  const ghostUnhover = e => { e.currentTarget.style.background='rgba(0,200,150,0.08)'; e.currentTarget.style.borderColor='rgba(0,200,150,0.25)'; e.currentTarget.style.transform='translateY(0)'; };

  return (
    <MainLayout title="Applications">
      {deleteTarget && (
        <DeleteModal
          count={deleteTarget.ids.length}
          label={deleteTarget.label}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div style={{ maxWidth:1100 }}>

        {/* ── STAT STRIP ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          {miniStats.map(({ label:l, value }, i) => (
            <div key={l} className="card au" style={{ padding:'14px 18px', animationDelay:`${i*40}ms` }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.09em', marginBottom:6 }}>{l}</div>
              <div style={{ fontSize:26, fontWeight:800, color:'var(--t1)', letterSpacing:'-0.8px', fontFamily:'var(--mono)' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* ── TOOLBAR ── */}
        <div className="card au d2" style={{ padding:'10px 14px', marginBottom:16 }}>
          {/* row 1: search + view toggle + add */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <div style={{ position:'relative', flex:1, minWidth:0 }}>
              <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--t3)', pointerEvents:'none' }}/>
              <input className="inp" style={{ paddingLeft:34, paddingRight:search ? 32 : 12 }}
                placeholder="Search by company or role…" value={search} onChange={e => setSearch(e.target.value)}/>
              {search && (
                <button onClick={() => setSearch('')} style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--t3)', display:'flex', padding:2 }}>
                  <X size={12}/>
                </button>
              )}
            </div>
            {/* view toggle */}
            <div style={{ display:'flex', gap:3, background:'rgba(255,255,255,0.04)', padding:'3px', borderRadius:9, border:'1px solid var(--border)', flexShrink:0 }}>
              {[{ icon:List, v:'list' }, { icon:Grid3x3, v:'grid' }].map(({ icon:Icon, v }) => (
                <button key={v} onClick={() => setView(v)} style={{ width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer', borderRadius:7, background: view===v ? 'var(--card-hover)' : 'transparent', color: view===v ? 'var(--t1)' : 'var(--t3)', transition:'all 0.15s' }}>
                  <Icon size={14}/>
                </button>
              ))}
            </div>
            <button onClick={() => navigate('/applications/new')} className="btn-p" style={{ padding:'7px 16px', whiteSpace:'nowrap', fontSize:12.5, flexShrink:0 }}>
              <Plus size={13}/> Add
            </button>
          </div>
          {/* row 2: status filters — scrollable */}
          <div style={{ display:'flex', alignItems:'center', gap:3, overflowX:'auto', paddingBottom:2 }}
            className="hide-scrollbar">
            {STATUS_FILTERS.map(({ key, label:lbl }) => (
              <button key={key} onClick={() => { setFilter(key); setPage(1); }}
                style={{
                  padding:'4px 11px', borderRadius:7, border:'1px solid transparent',
                  cursor:'pointer', fontSize:12, fontWeight: filter===key ? 600 : 500,
                  color: filter===key ? 'var(--accent)' : 'var(--t2)',
                  background: filter===key ? 'rgba(0,200,150,0.08)' : 'transparent',
                  borderColor: filter===key ? 'rgba(0,200,150,0.2)' : 'transparent',
                  transition:'all 0.15s', whiteSpace:'nowrap', flexShrink:0,
                }}
                onMouseEnter={e => { if (filter!==key) { e.currentTarget.style.color='var(--t1)'; e.currentTarget.style.background='rgba(255,255,255,0.04)'; } }}
                onMouseLeave={e => { if (filter!==key) { e.currentTarget.style.color='var(--t2)'; e.currentTarget.style.background='transparent'; } }}
              >{lbl}</button>
            ))}
          </div>
        </div>

        {/* ── BULK ACTION BAR ── */}
        {selectedCount > 0 && (
          <div className="au" style={{
            display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
            marginBottom:12,
            background:'rgba(0,200,150,0.06)',
            border:'1px solid rgba(0,200,150,0.2)',
            borderRadius:12,
          }}>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--accent)' }}>
              {selectedCount} selected
            </span>
            <div style={{ width:1, height:20, background:'rgba(0,200,150,0.2)' }}/>

            {/* bulk status */}
            <BulkStatusDropdown onSelect={handleBulkStatus}/>

            {/* bulk delete */}
            <button
              onClick={handleBulkDeleteTrigger}
              disabled={bulkLoading}
              style={{
                display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px',
                fontSize:12.5, fontWeight:600, color:'#f87171',
                background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)',
                borderRadius:8, cursor:'pointer', transition:'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(248,113,113,0.16)'; e.currentTarget.style.borderColor='rgba(248,113,113,0.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(248,113,113,0.08)'; e.currentTarget.style.borderColor='rgba(248,113,113,0.25)'; }}
            >
              <Trash2 size={13}/> Delete {selectedCount}
            </button>

            <div style={{ flex:1 }}/>

            {/* clear */}
            <button onClick={() => setSelected(new Set())}
              style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, color:'var(--t3)', background:'none', border:'none', cursor:'pointer', transition:'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color='var(--t1)'}
              onMouseLeave={e => e.currentTarget.style.color='var(--t3)'}
            >
              <X size={12}/> Clear
            </button>
          </div>
        )}

        {/* ── CONTENT ── */}
        {loading ? (
          <div className="card" style={{ overflow:'hidden' }}>
            <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', display:'grid', gridTemplateColumns:'24px 2fr 1.4fr 1fr 1.2fr 40px', gap:12 }}>
              {['','Company & Role','Status','Location','Date',''].map((h,i) => (
                <div key={i} style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.09em' }}>{h}</div>
              ))}
            </div>
            {Array.from({ length:6 }).map((_,i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'24px 2fr 1.4fr 1fr 1.2fr 40px', gap:12, alignItems:'center', padding:'12px 16px', borderBottom: i<5 ? '1px solid var(--border)' : 'none' }}>
                <div className="skel" style={{ width:16, height:16, borderRadius:4 }}/>
                <div style={{ display:'flex', gap:11, alignItems:'center' }}>
                  <div className="skel" style={{ width:34, height:34, borderRadius:9 }}/>
                  <div><div className="skel" style={{ width:130, height:12, borderRadius:4, marginBottom:6 }}/><div className="skel" style={{ width:80, height:10, borderRadius:4 }}/></div>
                </div>
                <div className="skel" style={{ width:80, height:22, borderRadius:99 }}/>
                <div className="skel" style={{ width:70, height:12, borderRadius:4 }}/>
                <div className="skel" style={{ width:90, height:12, borderRadius:4 }}/>
                <div className="skel" style={{ width:28, height:28, borderRadius:7 }}/>
              </div>
            ))}
          </div>

        ) : apps.length === 0 ? (
          <div className="card" style={{ padding:'64px 24px', textAlign:'center' }}>
            {search || filter !== 'all' ? (
              <>
                <div style={{ width:56, height:56, borderRadius:16, background:'rgba(232,168,32,0.07)', border:'1px solid rgba(232,168,32,0.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                  <SlidersHorizontal size={22} style={{ color:'#e8a820' }}/>
                </div>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--t1)', marginBottom:8 }}>No results found</div>
                <div style={{ fontSize:13, color:'var(--t2)', marginBottom:20, maxWidth:320, margin:'0 auto 20px' }}>
                  No applications match <strong style={{ color:'var(--t1)' }}>"{search || filter}"</strong>. Try a different search or clear your filters.
                </div>
                <button onClick={() => { setSearch(''); setFilter('all'); }}
                  style={{ ...ghostBtn, padding:'8px 20px', fontSize:13 }} onMouseEnter={ghostHover} onMouseLeave={ghostUnhover}>
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <div style={{ width:64, height:64, borderRadius:18, background:'rgba(0,200,150,0.07)', border:'1px solid rgba(0,200,150,0.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}>
                  <Briefcase size={26} style={{ color:'var(--accent)' }}/>
                </div>
                <div style={{ fontSize:17, fontWeight:700, color:'var(--t1)', marginBottom:8 }}>No applications yet</div>
                <div style={{ fontSize:13, color:'var(--t2)', marginBottom:22, maxWidth:300, margin:'0 auto 22px', lineHeight:1.6 }}>
                  Start tracking your job search. Add your first application to see it here.
                </div>
                <button onClick={() => navigate('/applications/new')} className="btn-p"
                  style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'9px 22px', fontSize:13 }}>
                  <Plus size={14}/> Track First Job
                </button>
              </>
            )}
          </div>

        ) : view === 'list' ? (
          /* ── LIST VIEW ── */
          <div className="card au d3" style={{ overflow:'hidden' }}>
            {/* header row */}
            <div style={{ display:'grid', gridTemplateColumns:'36px 2fr 1.3fr 1fr 1.2fr 44px', alignItems:'center', padding:'9px 16px', borderBottom:'1px solid var(--border)', gap:12 }}>
              <Cb checked={allSelected} indeterminate={someSelected} onChange={toggleAll}/>
              {['Company & Role','Status','Location','Date Applied',''].map(h => (
                <div key={h} style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.09em' }}>{h}</div>
              ))}
            </div>

            {apps.map((app, i) => {
              const isSelected = selected.has(app.id);
              return (
                <div key={app.id}
                  className="au"
                  onClick={() => navigate(`/applications/${app.id}`)}
                  style={{
                    display:'grid', gridTemplateColumns:'36px 2fr 1.3fr 1fr 1.2fr 44px',
                    alignItems:'center', padding:'11px 16px', gap:12,
                    borderBottom: i < apps.length-1 ? '1px solid var(--border)' : 'none',
                    cursor:'pointer', transition:'background 0.14s',
                    background: isSelected ? 'rgba(0,200,150,0.04)' : 'transparent',
                    animationDelay:`${i*30}ms`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = isSelected ? 'rgba(0,200,150,0.07)' : 'rgba(255,255,255,0.025)'}
                  onMouseLeave={e => e.currentTarget.style.background = isSelected ? 'rgba(0,200,150,0.04)' : 'transparent'}
                >
                  {/* checkbox */}
                  <div onClick={e => e.stopPropagation()}>
                    <Cb checked={isSelected} onChange={() => toggleOne(app.id)}/>
                  </div>

                  {/* company + role */}
                  <div style={{ display:'flex', alignItems:'center', gap:11, minWidth:0 }}>
                    <CompanyLogo name={app.company} size={34}/>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>{app.position}</div>
                      <div style={{ fontSize:12, color:'var(--t2)', marginTop:2 }}>{app.company}</div>
                    </div>
                  </div>

                  {/* status */}
                  <div><span className={`badge ${badgeClass(app.status)}`}>{statusLabel(app.status)}</span></div>

                  {/* location */}
                  <div style={{ fontSize:12.5, color:'var(--t2)' }}>{app.location || '—'}</div>

                  {/* date */}
                  <div style={{ fontSize:12, color:'var(--t3)', fontFamily:'var(--mono)' }}>{fmtDate(app.date)}</div>

                  {/* menu */}
                  <div onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === app.id ? null : app.id); setMenuRect(e.currentTarget.getBoundingClientRect()); }}
                      style={{ width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:7, border:'1px solid transparent', background:'transparent', cursor:'pointer', color:'var(--t3)', transition:'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--t1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='transparent'; e.currentTarget.style.color='var(--t3)'; }}
                    >
                      <MoreHorizontal size={15}/>
                    </button>
                    {menuOpen === app.id && (
                      <ActionMenu
                        app={app}
                        triggerRect={menuRect}
                        onEdit={() => { setMenuOpen(null); navigate(`/applications/${app.id}/edit`); }}
                        onDelete={() => { setMenuOpen(null); setDeleteTarget({ ids:[app.id], label:`${app.position} at ${app.company}` }); }}
                        onClone={() => { setMenuOpen(null); handleClone(app.id); }}
                        onClose={() => setMenuOpen(null)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        ) : (
          /* ── GRID VIEW ── */
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
            {apps.map((app, i) => {
              const isSelected = selected.has(app.id);
              return (
                <div key={app.id}
                  className="card au"
                  onClick={() => navigate(`/applications/${app.id}`)}
                  style={{
                    padding:18, cursor:'pointer', animationDelay:`${i*40}ms`,
                    transition:'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
                    border: isSelected ? '1px solid rgba(0,200,150,0.4)' : '1px solid var(--border)',
                    background: isSelected ? 'rgba(0,200,150,0.04)' : 'var(--card)',
                    position:'relative',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; }}
                >
                  {/* grid card checkbox */}
                  <div onClick={e => e.stopPropagation()} style={{ position:'absolute', top:14, right:14 }}>
                    <Cb checked={isSelected} onChange={() => toggleOne(app.id)}/>
                  </div>
                  <div style={{ display:'flex', alignItems:'flex-start', marginBottom:12 }}>
                    <CompanyLogo name={app.company} size={40}/>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'75%' }}>{app.position}</div>
                  </div>
                  <div style={{ fontSize:12.5, color:'var(--t2)', marginBottom:10 }}>{app.company}</div>
                  <span className={`badge ${badgeClass(app.status)}`} style={{ marginBottom:12, display:'inline-flex' }}>{statusLabel(app.status)}</span>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:12, borderTop:'1px solid var(--border)' }}>
                    <span style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)' }}>{fmtDate(app.date)}</span>
                    {app.location && <span style={{ fontSize:11, color:'var(--t3)' }}>{app.location}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── PAGINATION ── */}
        {totalPages > 1 && (
          <div className="au" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:20 }}>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
              className="btn-s" style={{ padding:'7px 14px', opacity: page===1 ? 0.4 : 1 }}>
              <ChevronLeft size={14}/> Prev
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              {Array.from({ length:Math.min(totalPages, 5) }, (_,i) => {
                const p = totalPages <= 5 ? i+1 : page <= 3 ? i+1 : page >= totalPages-2 ? totalPages-4+i : page-2+i;
                return (
                  <button key={p} onClick={() => setPage(p)} style={{
                    width:32, height:32, borderRadius:8, border:'none', cursor:'pointer',
                    fontSize:13, fontWeight: p===page ? 700 : 400,
                    background: p===page ? 'rgba(0,200,150,0.12)' : 'transparent',
                    color: p===page ? 'var(--accent)' : 'var(--t2)', transition:'all 0.15s',
                  }}
                    onMouseEnter={e => { if (p!==page) { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='var(--t1)'; } }}
                    onMouseLeave={e => { if (p!==page) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--t2)'; } }}
                  >{p}</button>
                );
              })}
            </div>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
              className="btn-s" style={{ padding:'7px 14px', opacity: page===totalPages ? 0.4 : 1 }}>
              Next <ChevronRight size={14}/>
            </button>
          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default ApplicationsPage;