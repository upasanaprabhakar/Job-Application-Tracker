import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Edit2, Trash2, Copy, ExternalLink,
  MapPin, DollarSign, Calendar, Clock, FileText,
  Link2, StickyNote, CheckCircle2, Circle, ChevronDown, X, Building2,
  Sparkles, MessageSquare, Send, Plus as PlusIcon,
} from 'lucide-react';
import { applicationApi } from '../../api/applicationApi';
import { documentsApi } from '../../api/documentsApi';
import { ResumeOptimizeModal, InterviewPrepModal } from '../ai/AIModals';
import MainLayout from '../../components/layout/MainLayout';

/* ─── status config ───────────────────────────────────── */
const STATUS_CONFIG = {
  applied:      { label: 'Applied',      badgeCls: 'b-applied',      color: '#e8a820' },
  screening:    { label: 'Screening',    badgeCls: 'b-screening',    color: '#5aabf0' },
  interviewing: { label: 'Interviewing', badgeCls: 'b-interviewing', color: '#00c896' },
  offer:        { label: 'Offer',        badgeCls: 'b-offer',        color: '#c084fc' },
  accepted:     { label: 'Accepted',     badgeCls: 'b-accepted',     color: '#00c896' },
  rejected:     { label: 'Rejected',     badgeCls: 'b-rejected',     color: '#f87171' },
  withdrawn:    { label: 'Withdrawn',    badgeCls: 'b-withdrawn',    color: '#5a5a72' },
};
const PIPELINE = ['applied', 'screening', 'interviewing', 'offer'];
const getCfg   = (s) => STATUS_CONFIG[s?.toLowerCase()] || STATUS_CONFIG.applied;

/* ─── robust response extractors ─────────────────────── */
// Backend can wrap in many shapes:
//   { data: { companyName, ... } }
//   { application: { ... } }
//   { data: { application: { ... } } }
//   { success, data: { ... } }
//   flat object with companyName directly
const extractApp = (res) => {
  if (!res) return null;
  const candidates = [
    res?.data?.application,
    res?.application,
    res?.data?.data,
    res?.data,
    res,
  ];
  for (const c of candidates) {
    if (c && typeof c === 'object' && (c._id || c.id || c.companyName || c.jobTitle)) {
      return c;
    }
  }
  return null;
};

const extractList = (res, keys = ['timeline','applications','data']) => {
  if (!res) return [];
  for (const key of keys) {
    const val = res?.data?.[key] ?? res?.[key];
    if (Array.isArray(val)) return val;
  }
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res))       return res;
  return [];
};

/* ─── helpers ──────────────────────────────────────────── */
const fmtDate = (d) => {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return null; }
};

const toCalendarPath = (dateVal) => {
  if (!dateVal) return null;
  try {
    const d = new Date(dateVal);
    if (isNaN(d)) return null;
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `/calendar?date=${y}-${m}-${day}`;
  } catch { return null; }
};

/* ─── CompanyLogo ─────────────────────────────────────── */
const CompanyLogo = ({ name, size = 58 }) => {
  const [src, setSrc]     = useState('');
  const [stage, setStage] = useState('clearbit');

  const domain = (n) => n?.toLowerCase().trim()
    .replace(/\s+(inc|llc|ltd|corp|co|group|technologies|technology|solutions|services)\.?$/i, '')
    .replace(/[^a-z0-9]/g, '') + '.com';

  useEffect(() => {
    if (!name) { setStage('letter'); return; }
    setSrc(`https://logo.clearbit.com/${domain(name)}`);
    setStage('clearbit');
  }, [name]);

  const onErr = () => {
    if (stage === 'clearbit') { setSrc(`https://www.google.com/s2/favicons?domain=${domain(name)}&sz=128`); setStage('fav'); }
    else setStage('letter');
  };

  const bg  = ['#1a2e20','#1a1e2e','#2a1e2e','#2e241a','#1e2a2a'];
  const tc  = ['#00c896','#5aabf0','#c084fc','#e8a820','#00d4bb'];
  const idx = (name?.charCodeAt(0) ?? 0) % bg.length;
  const sty = { width: size, height: size, minWidth: size, flexShrink: 0, borderRadius: 14 };

  if (!name || stage === 'letter' || !src)
    return (
      <div style={{ ...sty, background: bg[idx], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.38, fontWeight: 700, color: tc[idx] }}>{name?.[0]?.toUpperCase() ?? '?'}</span>
      </div>
    );
  return <img key={src} src={src} alt={name} style={{ ...sty, objectFit: 'contain', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }} onError={onErr} />;
};

/* ─── Toast ───────────────────────────────────────────── */
const Toast = ({ message, type, onClose }) => (
  <div className="ap" style={{
    position: 'fixed', top: 20, right: 20, zIndex: 100,
    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px',
    background: type === 'success' ? '#0d1e18' : '#1e0c0c',
    border: `1px solid ${type === 'success' ? 'rgba(0,200,150,0.3)' : 'rgba(248,113,113,0.3)'}`,
    borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
    fontSize: 13, fontWeight: 500, color: type === 'success' ? '#00c896' : '#f87171',
  }}>
    {message}
    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6 }}><X size={13} /></button>
  </div>
);

/* ─── DeleteModal ─────────────────────────────────────── */
const DeleteModal = ({ onConfirm, onCancel }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
    <div className="card ap" style={{ padding: 28, maxWidth: 340, width: '90%', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <Trash2 size={16} style={{ color: '#f87171' }} />
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', textAlign: 'center', marginBottom: 6 }}>Delete Application</h3>
      <p style={{ fontSize: 13, color: 'var(--t2)', textAlign: 'center', marginBottom: 20 }}>This action cannot be undone.</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} className="btn-s" style={{ flex: 1, justifyContent: 'center', padding: '9px 0' }}>Cancel</button>
        <button onClick={onConfirm}
          style={{ flex: 1, padding: '9px 0', background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, color: '#f87171', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(248,113,113,0.15)'}>Delete</button>
      </div>
    </div>
  </div>
);

/* ─── StatusDropdown ──────────────────────────────────── */
const StatusDropdown = ({ current, onChange }) => {
  const [open, setOpen]   = useState(false);
  const [rect, setRect]   = useState(null);
  const triggerRef        = useRef(null);
  const cfg               = getCfg(current);

  const handleOpen = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const zoom = window.devicePixelRatio / (window.outerWidth / window.innerWidth) || 1;
      // account for CSS zoom on html element
      const htmlZoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
      setRect({
        top:    r.top    / htmlZoom,
        bottom: r.bottom / htmlZoom,
        left:   r.left   / htmlZoom,
        right:  r.right  / htmlZoom,
        width:  r.width  / htmlZoom,
        height: r.height / htmlZoom,
      });
    }
    setOpen(v => !v);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      setOpen(false);
    };
    // Use timeout so this doesn't fire on the same click that opened the menu
    const t = setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', h); };
  }, [open]);

  // Close on scroll
  useEffect(() => {
    if (!open) return;
    const h = () => setOpen(false);
    window.addEventListener('scroll', h, true);
    return () => window.removeEventListener('scroll', h, true);
  }, [open]);

  const menuHeight = Object.keys(STATUS_CONFIG).length * 42;
  const spaceBelow = rect ? window.innerHeight - rect.bottom : 0;
  const openUpward = rect && spaceBelow < menuHeight + 10;

  const menu = open && rect ? createPortal(
    <div
      style={{
        position: 'fixed',
        top:      openUpward ? rect.top - menuHeight - 6 : rect.bottom + 6,
        left:     rect.left,
        width:    rect.width,
        maxWidth: '100vw',
        zIndex:   99999,
        background: '#1e1f2c',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 11,
        boxShadow: '0 16px 50px rgba(0,0,0,0.7)',
        overflow: 'hidden',
      }}
    >
      {Object.entries(STATUS_CONFIG).map(([key, c]) => {
        const active = current?.toLowerCase() === key;
        return (
          <button
            key={key}
            onMouseDown={(e) => {
              e.preventDefault(); // prevent outside-click handler firing before onClick
              onChange(key);
              setOpen(false);
            }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
              fontSize: 13, fontWeight: active ? 600 : 400,
              color: active ? 'var(--t1)' : 'var(--t2)',
              background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--t1)'; } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t2)'; } }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{c.label}</span>
            {active && <CheckCircle2 size={13} style={{ color: 'var(--accent)' }} />}
          </button>
        );
      })}
    </div>,
    document.body
  ) : null;

  return (
    <div ref={triggerRef} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-up)',
          borderRadius: 10, cursor: 'pointer', width: '100%', justifyContent: 'space-between',
          transition: 'border-color 0.15s, background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,200,150,0.3)'; e.currentTarget.style.background = 'rgba(0,200,150,0.04)'; }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.borderColor = 'var(--border-up)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color }} />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--t1)' }}>{cfg.label}</span>
        </div>
        <ChevronDown size={14} style={{ color: 'var(--t2)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {menu}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════ */
const ApplicationDetail = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [app,           setApp]           = useState(null);
  const appRef = useRef(null); // always holds latest app for use inside async handlers
  const [timeline,      setTimeline]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [showDelete,    setShowDelete]    = useState(false);
  const [toast,         setToast]         = useState(null);
  const [notes,         setNotes]         = useState('');
  const [notesList,     setNotesList]     = useState([]);
  const [newNote,       setNewNote]       = useState('');
  const [addingNote,    setAddingNote]    = useState(false);
  const noteInputRef                       = useRef(null);
  const [resumes,       setResumes]       = useState([]);
  const [aiOptimize,    setAiOptimize]    = useState(false);
  const [aiInterview,   setAiInterview]   = useState(false);
  const [editingNotes,  setEditingNotes]  = useState(false);
  const [savingNotes,   setSavingNotes]   = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Keep appRef current
  useEffect(() => { appRef.current = app; }, [app]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [aRes, tlRes] = await Promise.all([
          applicationApi.getApplicationById(id),
          applicationApi.getApplicationTimeline(id).catch(() => null),
        ]);

        const d = extractApp(aRes);
        if (!d) throw new Error('Could not parse application data from response');

        const mapped = {
          id:              d._id             || d.id              || id,
          company:         d.companyName     || d.company         || '',
          position:        d.jobTitle        || d.position        || d.title || '',
          status:          d.status          || 'applied',
          applicationDate: d.applicationDate || d.appliedDate     || d.createdAt || null,
          followUpDate:    d.followUpDate    || null,
          location:        d.location        || '',
          salaryRange:     d.salaryRange     || '',
          jobUrl:          d.jobUrl          || '',
          jobDescription:  d.jobDescription  || '',
          notes:           d.notes           || '',
          createdAt:       d.createdAt       || null,
          updatedAt:       d.updatedAt       || null,
        };

        setApp(mapped);
        setNotes(mapped.notes);
        // Parse notes as timeline entries (pipe-separated: timestamp|text)
        const raw = mapped.notes || '';
        const parsed = raw.split('|||').filter(Boolean).map(entry => {
          const [ts, ...rest] = entry.split('::');
          return { ts: ts?.trim(), text: rest.join('::').trim() };
        }).filter(e => e.text);
        setNotesList(parsed.length ? parsed : (raw ? [{ ts: new Date(mapped.updatedAt || Date.now()).toISOString(), text: raw }] : []));
        setTimeline(extractList(tlRes, ['timeline', 'data', 'items']));
      } catch (e) {
        console.error('ApplicationDetail error:', e);
        setError('Failed to load application details.');
      } finally {
        setLoading(false);
    // load resumes for AI (non-blocking)
    try { const r = await documentsApi.getAllResumes(); setResumes(r?.resumes || r?.data?.resumes || []); } catch {}
      }
    };
    load();
  }, [id]);

  const handleDelete = async () => {
    try { await applicationApi.deleteApplication(id); navigate('/applications'); }
    catch { showToast('Failed to delete', 'error'); setShowDelete(false); }
  };

  const handleClone = async () => {
    try { await applicationApi.cloneApplication(id); showToast('Application cloned'); }
    catch { showToast('Failed to clone', 'error'); }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const a = appRef.current || app;
      // Only send fields the backend needs — avoid sending empty strings for date fields
      const payload = {
        companyName:    a.company,
        jobTitle:       a.position,
        status:         newStatus,
        location:       a.location       || '',
        salaryRange:    a.salaryRange    || '',
        jobUrl:         a.jobUrl         || '',
        jobDescription: a.jobDescription || '',
        notes:          a.notes          || '',
        ...(a.applicationDate ? { applicationDate: a.applicationDate } : {}),
        ...(a.followUpDate    ? { followUpDate:    a.followUpDate    } : {}),
      };
      await applicationApi.updateApplication(id, payload);
      setApp(prev => ({ ...prev, status: newStatus }));
      setTimeline(prev => [{ status: newStatus, date: new Date().toISOString() }, ...prev]);
      showToast(`Status updated to ${getCfg(newStatus).label}`);
    } catch (e) {
      console.error('Status update error:', e?.response?.data || e);
      showToast('Failed to update status', 'error');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const entry = { ts: new Date().toISOString(), text: newNote.trim() };
    const updated = [...notesList, entry];
    const serialized = updated.map(e => `${e.ts}::${e.text}`).join('|||');
    setNotesList(updated);
    setNewNote('');
    setAddingNote(false);
    try {
      setSavingNotes(true);
      const a1 = appRef.current || app;
      await applicationApi.updateApplication(id, {
        companyName: a1.company, jobTitle: a1.position,
        status: a1.status, location: a1.location || '',
        salaryRange: a1.salaryRange || '', jobUrl: a1.jobUrl || '',
        jobDescription: a1.jobDescription || '', notes: serialized,
        ...(a1.applicationDate ? { applicationDate: a1.applicationDate } : {}),
        ...(a1.followUpDate    ? { followUpDate:    a1.followUpDate    } : {}),
      });
      setNotes(serialized);
      setApp(prev => ({ ...prev, notes: serialized }));
      showToast('Note added');
    } catch { showToast('Failed to save note', 'error'); }
    finally { setSavingNotes(false); }
  };

  const handleDeleteNote = async (idx) => {
    const updated = notesList.filter((_, i) => i !== idx);
    const serialized = updated.map(e => `${e.ts}::${e.text}`).join('|||');
    setNotesList(updated);
    try {
      const a2 = appRef.current || app;
      await applicationApi.updateApplication(id, {
        companyName: a2.company, jobTitle: a2.position,
        status: a2.status, location: a2.location || '',
        salaryRange: a2.salaryRange || '', jobUrl: a2.jobUrl || '',
        jobDescription: a2.jobDescription || '', notes: serialized,
        ...(a2.applicationDate ? { applicationDate: a2.applicationDate } : {}),
        ...(a2.followUpDate    ? { followUpDate:    a2.followUpDate    } : {}),
      });
      setNotes(serialized);
      setApp(prev => ({ ...prev, notes: serialized }));
    } catch { showToast('Failed to delete note', 'error'); }
  };

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      // Send full payload — use appRef to avoid stale closure
      const a = appRef.current || app;
      const payload = {
        companyName:     a.company,
        jobTitle:        a.position,
        status:          a.status,
        location:        a.location        || '',
        salaryRange:     a.salaryRange      || '',
        jobUrl:          a.jobUrl           || '',
        jobDescription:  a.jobDescription   || '',
        applicationDate: a.applicationDate  || '',
        followUpDate:    a.followUpDate     || '',
        notes,
      };
      await applicationApi.updateApplication(id, payload);
      setApp(prev => ({ ...prev, notes }));
      setEditingNotes(false);
      showToast('Notes saved');
    } catch (e) {
      console.error('Save notes error:', e?.response?.data || e);
      showToast('Failed to save notes', 'error');
    }
    finally { setSavingNotes(false); }
  };

  /* ── loading ── */
  if (loading) return (
    <MainLayout title="Application">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
      </div>
    </MainLayout>
  );

  /* ── error ── */
  if (error || !app) return (
    <MainLayout title="Application">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Building2 size={20} style={{ color: '#f87171' }} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>Application not found</div>
        <div style={{ fontSize: 13, color: 'var(--t2)' }}>{error}</div>
        <button className="btn-s" onClick={() => navigate('/applications')} style={{ padding: '8px 16px', marginTop: 4 }}>
          <ArrowLeft size={13} /> Back to Applications
        </button>
      </div>
    </MainLayout>
  );

  const cfg        = getCfg(app.status);
  const currentIdx = PIPELINE.indexOf(app.status?.toLowerCase());
  const isTerminal = ['rejected', 'withdrawn', 'accepted'].includes(app.status?.toLowerCase());
  const displayTl  = timeline.length > 0 ? timeline : [{ status: app.status, date: app.applicationDate }];

  return (
    <MainLayout title={app.position || 'Application'}>
      {toast      && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {showDelete && <DeleteModal onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />}

      <div style={{ maxWidth: 1100 }}>

        {/* ── TOPBAR ── */}
        <div className="au" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <nav style={{ display:'flex', alignItems:'center', gap:6 }}>
            <button onClick={() => navigate('/applications')}
              style={{ display:'flex', alignItems:'center', gap:5, fontSize:12.5, fontWeight:500, color:'var(--t3)', background:'none', border:'none', cursor:'pointer', transition:'color 0.15s', padding:0 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--t1)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--t3)'}
            >
              <ArrowLeft size={13}/> Applications
            </button>
            <span style={{ color:'var(--t3)', fontSize:12 }}>/</span>
            <span style={{ fontSize:12.5, fontWeight:500, color:'var(--t2)', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {app.company}
            </span>
            <span style={{ color:'var(--t3)', fontSize:12 }}>/</span>
            <span style={{ fontSize:12.5, fontWeight:600, color:'var(--t1)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {app.position}
            </span>
          </nav>
          <div style={{ display: 'flex', gap: 8 }}>
            {app.jobUrl && (
              <a href={app.jobUrl} target="_blank" rel="noreferrer" className="btn-s"
                style={{ textDecoration: 'none', fontSize: 13, padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ExternalLink size={13} /> Posting
              </a>
            )}
            <button onClick={handleClone} className="btn-s" style={{ padding: '7px 14px', fontSize: 13 }}><Copy size={13} /> Clone</button>
            <button onClick={() => navigate(`/applications/${id}/edit`)} style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'7px 16px', fontSize:13, fontWeight:600, fontFamily:'var(--font)', color:'var(--accent)', background:'rgba(0,200,150,0.08)', border:'1px solid rgba(0,200,150,0.25)', borderRadius:'var(--rs)', cursor:'pointer', transition:'background 0.18s, border-color 0.18s, transform 0.15s' }} onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,200,150,0.14)';e.currentTarget.style.borderColor='rgba(0,200,150,0.5)';e.currentTarget.style.transform='translateY(-1px)'}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,200,150,0.08)';e.currentTarget.style.borderColor='rgba(0,200,150,0.25)';e.currentTarget.style.transform='translateY(0)'}}><Edit2 size={13} /> Edit</button>
            <button onClick={() => setShowDelete(true)}
              style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.08)', cursor: 'pointer', color: '#f87171', transition: 'background 0.15s', flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(248,113,113,0.08)'}
            ><Trash2 size={14} /></button>
          </div>
        </div>

        {/* ── HERO CARD ── */}
        <div className="card au d1" style={{ padding: '22px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            <CompanyLogo name={app.company} size={58} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                <div style={{ minWidth: 0 }}>
                  <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.4px', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {app.position}
                  </h1>
                  <p style={{ fontSize: 14, color: 'var(--t2)', fontWeight: 500 }}>{app.company}</p>
                </div>
                <span className={`badge ${cfg.badgeCls}`} style={{ fontSize: 12, padding: '4px 12px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />{cfg.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 10, flexWrap: 'wrap' }}>
                {app.location    && <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--t2)' }}><MapPin size={12} style={{ color: 'var(--t3)' }} />{app.location}</span>}
                {app.salaryRange && <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--accent)', fontWeight: 600 }}><DollarSign size={12} />{app.salaryRange}</span>}
                {app.applicationDate && <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--t2)' }}><Calendar size={12} style={{ color: 'var(--t3)' }} />Applied {fmtDate(app.applicationDate)}</span>}
                {app.followUpDate    && <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#e8a820' }}><Clock size={12} />Follow-up {fmtDate(app.followUpDate)}</span>}
              </div>
            </div>
          </div>

          {/* pipeline */}
          {!isTerminal && (
            <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Pipeline</p>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {PIPELINE.map((stage, i) => {
                  const done    = i <= currentIdx;
                  const current = i === currentIdx;
                  const sc      = getCfg(stage);
                  return (
                    <div key={stage} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <button onClick={() => handleStatusChange(stage)} style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
                        border: current ? 'none' : done ? '1px solid rgba(0,200,150,0.2)' : '1px solid var(--border)',
                        background: current ? 'var(--accent)' : done ? 'rgba(0,200,150,0.08)' : 'rgba(255,255,255,0.03)',
                        color: current ? '#051410' : done ? 'var(--accent)' : 'var(--t3)',
                        fontSize: 12, fontWeight: current ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                      }}>
                        {done ? <CheckCircle2 size={13} /> : <Circle size={13} />}{sc.label}
                      </button>
                      {i < PIPELINE.length - 1 && (
                        <div style={{ flex: 1, height: 1, background: i < currentIdx ? 'rgba(0,200,150,0.3)' : 'var(--border)', margin: '0 4px' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isTerminal && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className={`badge ${cfg.badgeCls}`}>Application {cfg.label}</span>
              <button onClick={() => handleStatusChange('applied')}
                style={{ fontSize: 12, color: 'var(--t2)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--t2)'}
              >Reopen</button>
            </div>
          )}
        </div>

        {/* ── MAIN GRID ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>

          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {app.jobDescription && (
              <div className="card au d2" style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,200,150,0.07)', border: '1px solid rgba(0,200,150,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={13} style={{ color: 'var(--accent)' }} />
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t1)' }}>Job Description</span>
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--t2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{app.jobDescription}</p>
              </div>
            )}

            <div className="card au d3" style={{ padding:0, overflow:'hidden' }}>

              {/* ── header bar ── */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <StickyNote size={14} style={{ color:'var(--accent)' }}/>
                  <span style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)' }}>Notes</span>
                  {notesList.length > 0 && (
                    <span style={{ fontSize:10.5, fontWeight:700, color:'var(--accent)', background:'rgba(0,200,150,0.1)', border:'1px solid rgba(0,200,150,0.18)', padding:'1px 8px', borderRadius:99, letterSpacing:'0.02em' }}>
                      {notesList.length}
                    </span>
                  )}
                </div>
                {!addingNote && (
                  <button
                    onClick={() => { setAddingNote(true); setTimeout(()=>noteInputRef.current?.focus(), 50); }}
                    style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600, color:'var(--accent)', background:'rgba(0,200,150,0.07)', border:'1px solid rgba(0,200,150,0.2)', borderRadius:7, padding:'5px 12px', cursor:'pointer', transition:'all 0.15s' }}
                    onMouseEnter={e=>{ e.currentTarget.style.background='rgba(0,200,150,0.14)'; e.currentTarget.style.borderColor='rgba(0,200,150,0.4)'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background='rgba(0,200,150,0.07)'; e.currentTarget.style.borderColor='rgba(0,200,150,0.2)'; }}
                  >
                    <PlusIcon size={11}/> Add Note
                  </button>
                )}
              </div>

              {/* ── compose box ── */}
              {addingNote && (
                <div style={{ padding:'14px 18px', borderBottom: notesList.length > 0 ? '1px solid var(--border)' : 'none', background:'rgba(0,200,150,0.025)' }}>
                  <textarea
                    ref={noteInputRef}
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote();
                      if (e.key === 'Escape') { setAddingNote(false); setNewNote(''); }
                    }}
                    placeholder="Write a note... (Ctrl+Enter to save)"
                    rows={3}
                    className="inp"
                    style={{ resize:'none', fontSize:13, marginBottom:10, lineHeight:1.6, width:'100%', boxSizing:'border-box' }}
                  />
                  <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                    <button
                      onClick={() => { setAddingNote(false); setNewNote(''); }}
                      style={{ padding:'6px 14px', fontSize:12, fontWeight:500, color:'var(--t2)', background:'transparent', border:'1px solid var(--border)', borderRadius:7, cursor:'pointer', transition:'all 0.15s' }}
                      onMouseEnter={e=>{ e.currentTarget.style.color='var(--t1)'; e.currentTarget.style.borderColor='var(--border-up)'; }}
                      onMouseLeave={e=>{ e.currentTarget.style.color='var(--t2)'; e.currentTarget.style.borderColor='var(--border)'; }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddNote}
                      disabled={savingNotes || !newNote.trim()}
                      style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 16px', fontSize:12, fontWeight:600, color: !newNote.trim() ? 'var(--t3)' : 'var(--accent)', background: !newNote.trim() ? 'rgba(255,255,255,0.03)' : 'rgba(0,200,150,0.08)', border:`1px solid ${!newNote.trim() ? 'var(--border)' : 'rgba(0,200,150,0.3)'}`, borderRadius:7, cursor: !newNote.trim() ? 'not-allowed' : 'pointer', transition:'all 0.15s' }}
                      onMouseEnter={e=>{ if(newNote.trim()) e.currentTarget.style.background='rgba(0,200,150,0.16)'; }}
                      onMouseLeave={e=>{ if(newNote.trim()) e.currentTarget.style.background='rgba(0,200,150,0.08)'; }}
                    >
                      <Send size={11}/> {savingNotes ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── empty state ── */}
              {notesList.length === 0 && !addingNote && (
                <div style={{ padding:'32px 18px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
                  <div style={{ width:40, height:40, borderRadius:12, background:'rgba(255,255,255,0.03)', border:'1px dashed rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <StickyNote size={18} style={{ color:'var(--t3)' }}/>
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--t2)', marginBottom:4 }}>No notes yet</div>
                    <div style={{ fontSize:12, color:'var(--t3)', lineHeight:1.6 }}>Jot down interview impressions,<br/>contacts, or anything worth remembering.</div>
                  </div>
                  <button
                    onClick={() => { setAddingNote(true); setTimeout(()=>noteInputRef.current?.focus(), 50); }}
                    style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 16px', fontSize:12, fontWeight:600, color:'var(--accent)', background:'rgba(0,200,150,0.07)', border:'1px solid rgba(0,200,150,0.2)', borderRadius:8, cursor:'pointer', transition:'all 0.15s', marginTop:2 }}
                    onMouseEnter={e=>{ e.currentTarget.style.background='rgba(0,200,150,0.13)'; e.currentTarget.style.borderColor='rgba(0,200,150,0.4)'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background='rgba(0,200,150,0.07)'; e.currentTarget.style.borderColor='rgba(0,200,150,0.2)'; }}
                  >
                    <PlusIcon size={11}/> Add your first note
                  </button>
                </div>
              )}

              {/* ── notes list ── */}
              {notesList.length > 0 && (
                <div style={{ padding:'4px 0' }}>
                  {notesList.map((entry, idx) => {
                    const d       = new Date(entry.ts);
                    const dateStr = d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
                    const timeStr = d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
                    const isLast  = idx === notesList.length - 1;
                    return (
                      <div
                        key={idx}
                        style={{ display:'flex', gap:14, padding:'12px 18px', borderBottom: isLast ? 'none' : '1px solid var(--border)', position:'relative' }}
                        onMouseEnter={e => { const btn = e.currentTarget.querySelector('.del-btn'); if(btn) btn.style.opacity='1'; }}
                        onMouseLeave={e => { const btn = e.currentTarget.querySelector('.del-btn'); if(btn) btn.style.opacity='0'; }}
                      >
                        {/* left accent line */}
                        <div style={{ width:2, borderRadius:99, background:'rgba(0,200,150,0.35)', flexShrink:0, alignSelf:'stretch', minHeight:40 }}/>

                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                            <span style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)' }}>{dateStr} · {timeStr}</span>
                            <button
                              className="del-btn"
                              onClick={() => handleDeleteNote(idx)}
                              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--t3)', padding:'2px 4px', opacity:0, transition:'opacity 0.15s, color 0.15s', borderRadius:4, display:'flex', alignItems:'center' }}
                              onMouseEnter={e=>{ e.currentTarget.style.color='#f87171'; }}
                              onMouseLeave={e=>{ e.currentTarget.style.color='var(--t3)'; }}
                            >
                              <X size={12}/>
                            </button>
                          </div>
                          <p style={{ fontSize:13.5, color:'var(--t1)', lineHeight:1.7, margin:0, whiteSpace:'pre-wrap' }}>{entry.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {app.jobUrl && (
              <div className="card au d4" style={{ padding: '16px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,200,150,0.07)', border: '1px solid rgba(0,200,150,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Link2 size={13} style={{ color: 'var(--accent)' }} />
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t1)' }}>Job Posting</span>
                </div>
                <a href={app.jobUrl} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--accent)', textDecoration: 'none', wordBreak: 'break-all' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                ><ExternalLink size={13} style={{ flexShrink: 0 }} />{app.jobUrl}</a>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div className="card au d2" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Update Status</div>
              <StatusDropdown current={app.status} onChange={handleStatusChange} />
            </div>

            {/* ── AI Assistant card ── */}
            <div className="card au" style={{ padding:'16px 18px',
              background:'linear-gradient(135deg, rgba(0,200,150,0.04) 0%, rgba(192,132,252,0.04) 100%)',
              border:'1px solid rgba(255,255,255,0.07)' }}>

              {/* header */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <div style={{ position:'relative', width:28, height:28, borderRadius:8,
                  background:'linear-gradient(135deg, rgba(0,200,150,0.15), rgba(192,132,252,0.15))',
                  border:'1px solid rgba(255,255,255,0.08)',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Sparkles size={13} style={{ color:'#00c896' }}/>
                  {/* pulse ring */}
                  <div style={{ position:'absolute', inset:-3, borderRadius:11,
                    border:'1px solid rgba(0,200,150,0.3)',
                    animation:'aiRing 2.5s ease-in-out infinite' }}/>
                </div>
                <div>
                  <div style={{ fontSize:12.5, fontWeight:700, color:'var(--t1)' }}>AI Assistant</div>
                  
                </div>
              </div>

              {/* divider */}
              <div style={{ height:1, background:'linear-gradient(90deg, rgba(0,200,150,0.2), rgba(192,132,252,0.2), transparent)', marginBottom:12 }}/>

              {/* buttons */}
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>

                <button onClick={() => setAiOptimize(true)}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                    borderRadius:9, border:'1px solid rgba(0,200,150,0.2)',
                    background:'rgba(0,200,150,0.06)', cursor:'pointer', textAlign:'left',
                    transition:'all 0.16s' }}
                  onMouseEnter={e=>{ e.currentTarget.style.background='rgba(0,200,150,0.12)'; e.currentTarget.style.borderColor='rgba(0,200,150,0.4)'; e.currentTarget.style.transform='translateX(2px)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background='rgba(0,200,150,0.06)'; e.currentTarget.style.borderColor='rgba(0,200,150,0.2)'; e.currentTarget.style.transform='none'; }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:'#00c896',
                    boxShadow:'0 0 8px #00c896', flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12.5, fontWeight:600, color:'var(--t1)' }}>Optimise Resume</div>
                    <div style={{ fontSize:11, color:'var(--t3)' }}>Match keywords to this job</div>
                  </div>
                  <ArrowRight size={13} style={{ color:'var(--t3)', flexShrink:0 }}/>
                </button>

                <button onClick={() => setAiInterview(true)}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                    borderRadius:9, border:'1px solid rgba(192,132,252,0.2)',
                    background:'rgba(192,132,252,0.06)', cursor:'pointer', textAlign:'left',
                    transition:'all 0.16s' }}
                  onMouseEnter={e=>{ e.currentTarget.style.background='rgba(192,132,252,0.12)'; e.currentTarget.style.borderColor='rgba(192,132,252,0.4)'; e.currentTarget.style.transform='translateX(2px)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background='rgba(192,132,252,0.06)'; e.currentTarget.style.borderColor='rgba(192,132,252,0.2)'; e.currentTarget.style.transform='none'; }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:'#c084fc',
                    boxShadow:'0 0 8px #c084fc', flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12.5, fontWeight:600, color:'var(--t1)' }}>Interview Prep</div>
                    <div style={{ fontSize:11, color:'var(--t3)' }}>Questions & talking points</div>
                  </div>
                  <ArrowRight size={13} style={{ color:'var(--t3)', flexShrink:0 }}/>
                </button>

              </div>
            </div>

            {/* ── AI Robot Card ── */}



            <div className="card au d3" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Key Dates</div>
              {[
                { label: 'Applied',      date: app.applicationDate, icon: Calendar, color: 'var(--accent)',  linkable: true  },
                { label: 'Follow-up',    date: app.followUpDate,    icon: Clock,    color: '#e8a820',        linkable: true  },
                { label: 'Last updated', date: app.updatedAt,       icon: Calendar, color: 'var(--t3)',      linkable: false },
              ].map(({ label: l, date, icon: Icon, color, linkable }) => {
                const calPath = linkable ? toCalendarPath(date) : null;
                return (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Icon size={12} style={{ color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--t2)' }}>{l}</span>
                    </div>
                    {calPath ? (
                      <button
                        onClick={() => navigate(calPath)}
                        title="View on calendar"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 11.5, fontFamily: 'var(--mono)', fontWeight: 500,
                          color: 'var(--t1)', background: 'none', border: 'none',
                          cursor: 'pointer', padding: '2px 6px', borderRadius: 6,
                          transition: 'background 0.14s, color 0.14s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,200,150,0.1)'; e.currentTarget.style.color = 'var(--accent)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t1)'; }}
                      >
                        {fmtDate(date)}
                        <Calendar size={10} style={{ opacity: 0.6 }} />
                      </button>
                    ) : (
                      <span style={{ fontSize: 11.5, color: date ? 'var(--t1)' : 'var(--t3)', fontFamily: 'var(--mono)', fontWeight: 500 }}>
                        {date ? fmtDate(date) : '—'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="card au d4" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Activity Timeline</div>
              {displayTl.slice(0, 6).map((entry, i) => {
                const ec    = getCfg(entry.status || entry.type);
                const first = i === 0;
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                    {i < Math.min(displayTl.length, 6) - 1 && (
                      <div style={{ position: 'absolute', left: 6, top: 18, bottom: 0, width: 1, background: 'var(--border)' }} />
                    )}
                    <div style={{ position: 'relative', zIndex: 1, flexShrink: 0, paddingTop: 3 }}>
                      <div style={{ width: 13, height: 13, borderRadius: '50%', background: first ? ec.color : 'var(--bg-raised)', border: `2px solid ${first ? ec.color : 'var(--border)'}` }} />
                    </div>
                    <div style={{ paddingBottom: 14, flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: first ? 'var(--t1)' : 'var(--t2)' }}>{ec.label}</div>
                      {(entry.date || entry.createdAt) && (
                        <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)', marginTop: 2 }}>{fmtDate(entry.date || entry.createdAt)}</div>
                      )}
                      {entry.note && <div style={{ fontSize: 11.5, color: 'var(--t2)', marginTop: 3 }}>{entry.note}</div>}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
      {aiOptimize  && <ResumeOptimizeModal
          application={{ ...app, companyName: app.company, jobTitle: app.position }}
          resumes={resumes} onClose={() => setAiOptimize(false)}/>}
      {aiInterview && <InterviewPrepModal
          application={{ ...app, companyName: app.company, jobTitle: app.position }}
          resumes={resumes} onClose={() => setAiInterview(false)}/>}
      <style>{`
  @keyframes spin   { to { transform: rotate(360deg); } }
  @keyframes aiRing { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0;transform:scale(1.5)} }
`}</style>
    </MainLayout>
  );
};

export default ApplicationDetail;