import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText, Upload, Trash2, ExternalLink, Download, Sparkles, CheckSquare, Square,
  Plus, X, Edit2, Check, Award, Briefcase, Users,
  Calendar, Mail, Phone, Link2, ChevronRight,
  Shield, AlertCircle, Star,
} from 'lucide-react';
import { documentsApi } from '../../api/documentsApi';
import { ResumeAnalysisModal } from '../ai/AIModals';
import MainLayout from '../../components/layout/MainLayout';

/* ─── helpers ─────────────────────────────────────────── */
const fmtDate  = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }); } catch { return '—'; } };
const fmtSize  = (b) => { if (!b) return ''; if (b < 1024) return `${b} B`; if (b < 1048576) return `${(b/1024).toFixed(1)} KB`; return `${(b/1048576).toFixed(1)} MB`; };
const isExpired  = (d) => d && new Date(d) < new Date();
const expiresIn  = (d) => { if (!d) return null; const diff = new Date(d) - new Date(); const days = Math.ceil(diff / 86400000); return days; };

const extractList = (res, key) => {
  if (Array.isArray(res?.[key]))       return res[key];
  if (Array.isArray(res?.data?.[key])) return res.data[key];
  if (Array.isArray(res?.data))        return res.data;
  if (Array.isArray(res))              return res;
  return [];
};

/* ─── PDF helpers ─────────────────────────────────────── */
// Cloudinary raw uploads don't support transformation flags (fl_inline → 400).
// Use the URL as-is; Google Docs viewer is the fallback for inline rendering.
/* ─── PDF Viewer Modal ────────────────────────────────── */
// Strategy: route the PDF through our own backend proxy (/api/proxy/pdf?url=...).
// The backend fetches from Cloudinary server-side (no CORS/auth issues) and
// streams it back with Content-Disposition: inline so the iframe can render it.
const PDFModal = ({ url, title, onClose }) => {
  const [blobUrl,  setBlobUrl]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [errMsg,   setErrMsg]   = useState('');

  useEffect(() => {
    let objectUrl = null;
    setLoading(true);
    setErrMsg('');

    const BASE     = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const proxyUrl = `${BASE}/proxy/pdf?url=${encodeURIComponent(url)}`;

    fetch(proxyUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        setBlobUrl(objectUrl);
      })
      .catch(err => {
        console.error('PDF fetch error:', err);
        setErrMsg(err.message);
      })
      .finally(() => setLoading(false));

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url]);

  return createPortal(
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', backdropFilter:'blur(12px)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        zIndex:10000, padding:20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width:'100%', maxWidth:900, height:'92vh', display:'flex', flexDirection:'column',
          background:'#1a1b25', border:'1px solid var(--border-up)', borderRadius:20,
          overflow:'hidden', boxShadow:'0 40px 120px rgba(0,0,0,0.9)' }}>

        {/* header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'14px 20px', borderBottom:'1px solid var(--border)',
          background:'#161720', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'rgba(0,200,150,0.12)',
              border:'1px solid rgba(0,200,150,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <FileText size={14} style={{ color:'var(--accent)' }}/>
            </div>
            <span style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:500 }}>
              {title}
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            {blobUrl && (
              <a href={blobUrl} download={title + '.pdf'}
                style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 11px',
                  borderRadius:8, border:'1px solid var(--border)', background:'rgba(255,255,255,0.04)',
                  color:'var(--t2)', fontSize:11.5, fontWeight:600, textDecoration:'none',
                  transition:'all 0.15s', cursor:'pointer' }}
                onMouseEnter={e=>{ e.currentTarget.style.color='var(--t1)'; e.currentTarget.style.borderColor='var(--border-up)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.color='var(--t2)'; e.currentTarget.style.borderColor='var(--border)'; }}>
                <Download size={11}/> Download
              </a>
            )}
            <a href={url} target="_blank" rel="noreferrer"
              style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 11px',
                borderRadius:8, border:'1px solid var(--border)', background:'rgba(255,255,255,0.04)',
                color:'var(--t2)', fontSize:11.5, fontWeight:600, textDecoration:'none',
                transition:'all 0.15s', cursor:'pointer' }}
              onMouseEnter={e=>{ e.currentTarget.style.color='var(--t1)'; e.currentTarget.style.borderColor='var(--border-up)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.color='var(--t2)'; e.currentTarget.style.borderColor='var(--border)'; }}>
              <ExternalLink size={11}/> Open tab
            </a>
            <button onClick={onClose}
              style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)',
                background:'rgba(255,255,255,0.04)', color:'var(--t2)', display:'flex',
                alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.15s' }}
              onMouseEnter={e=>{ e.currentTarget.style.color='var(--t1)'; e.currentTarget.style.background='rgba(255,255,255,0.08)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.color='var(--t2)'; e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}>
              <X size={14}/>
            </button>
          </div>
        </div>

        {/* viewer body */}
        <div style={{ flex:1, background:'#0e0e14', position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {loading && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:'50%',
                border:'3px solid rgba(0,200,150,0.15)', borderTop:'3px solid var(--accent)',
                animation:'spin 0.8s linear infinite' }}/>
              <span style={{ fontSize:13, color:'var(--t3)' }}>Loading PDF…</span>
            </div>
          )}

          {!loading && errMsg && (
            <div style={{ textAlign:'center', padding:32 }}>
              <div style={{ width:48, height:48, borderRadius:14, background:'rgba(248,113,113,0.1)',
                border:'1px solid rgba(248,113,113,0.2)', display:'flex', alignItems:'center',
                justifyContent:'center', margin:'0 auto 14px' }}>
                <AlertCircle size={20} style={{ color:'#f87171' }}/>
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--t1)', marginBottom:6 }}>
                Could not load PDF
              </div>
              <div style={{ fontSize:12.5, color:'var(--t3)', marginBottom:20 }}>
                {errMsg} — try opening it in a new tab instead
              </div>
              <a href={url} target="_blank" rel="noreferrer"
                style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 20px',
                  borderRadius:10, border:'1px solid rgba(0,200,150,0.3)', background:'rgba(0,200,150,0.1)',
                  color:'var(--accent)', fontSize:13, fontWeight:600, textDecoration:'none' }}>
                <ExternalLink size={13}/> Open in new tab
              </a>
            </div>
          )}

          {!loading && blobUrl && (
            <iframe
              src={blobUrl}
              style={{ width:'100%', height:'100%', border:'none', display:'block' }}
              title={title}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ─── Tab config ──────────────────────────────────────── */
const TABS = [
  { key:'resumes',      label:'Resumes',      icon: FileText, color:'#5aabf0' },
  { key:'coverLetters', label:'Cover Letters', icon: FileText, color:'#00c896' },
  { key:'certs',        label:'Certifications',icon: Award,    color:'#c084fc' },
  { key:'portfolio',    label:'Portfolio',     icon: Briefcase,color:'#e8a820' },
  { key:'references',   label:'References',    icon: Users,    color:'#f87171' },
];



/* ─── Confirm Delete Modal ────────────────────────────── */
/* ─── bulk select hook ───────────────────────────────── */
const useBulkSelect = (items) => {
  const [selected, setSelected] = useState(new Set());
  const toggle    = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(s => s.size === items.length ? new Set() : new Set(items.map(i => i.id)));
  const clear     = () => setSelected(new Set());
  const allSelected  = items.length > 0 && selected.size === items.length;
  const someSelected = selected.size > 0 && selected.size < items.length;
  return { selected, toggle, toggleAll, clear, allSelected, someSelected };
};

/* ─── bulk action bar ─────────────────────────────────── */
const BulkBar = ({ count, onDelete, onClear, color }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'10px 14px', borderRadius:10, marginBottom:10,
    background:`${color}10`, border:`1px solid ${color}30`,
    animation:'fadeIn 0.18s ease' }}>
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <CheckSquare size={14} style={{ color }}/>
      <span style={{ fontSize:13, fontWeight:600, color:'var(--t1)' }}>
        {count} selected
      </span>
    </div>
    <div style={{ display:'flex', gap:8 }}>
      <button onClick={onClear}
        style={{ padding:'5px 12px', borderRadius:7, border:'1px solid var(--border)',
          background:'transparent', color:'var(--t2)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
        Cancel
      </button>
      <button onClick={onDelete}
        style={{ padding:'5px 12px', borderRadius:7, border:'1px solid rgba(248,113,113,0.35)',
          background:'rgba(248,113,113,0.12)', color:'#f87171',
          fontSize:12, fontWeight:600, cursor:'pointer',
          display:'flex', alignItems:'center', gap:5 }}>
        <Trash2 size={12}/> Delete {count}
      </button>
    </div>
  </div>
);

/* ─── select checkbox ─────────────────────────────────── */
const SelectBox = ({ checked, indeterminate, onChange, color }) => (
  <button onClick={e => { e.stopPropagation(); onChange(); }}
    style={{ width:18, height:18, borderRadius:4, flexShrink:0, cursor:'pointer',
      border:`1.5px solid ${checked || indeterminate ? color : 'rgba(255,255,255,0.15)'}`,
      background: checked ? color : 'transparent',
      display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
    {checked     && <Check size={10} style={{ color:'#0a0a0f' }}/>}
    {indeterminate && !checked && <div style={{ width:8, height:2, borderRadius:1, background:color }}/>}
  </button>
);

const DeleteModal = ({ item, onConfirm, onCancel }) => createPortal(
  <div onClick={onCancel}
    style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:20 }}>
    <div onClick={e => e.stopPropagation()} className="ap"
      style={{ width:'100%', maxWidth:380, background:'#1a1b25', border:'1px solid rgba(248,113,113,0.2)', borderRadius:18, padding:'28px 28px 24px', boxShadow:'0 32px 80px rgba(0,0,0,0.7)' }}>
      <div style={{ width:44, height:44, borderRadius:12, background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.2)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
        <Trash2 size={18} style={{ color:'#f87171' }}/>
      </div>
      <div style={{ fontSize:16, fontWeight:700, color:'var(--t1)', marginBottom:6 }}>Delete {item}?</div>
      <div style={{ fontSize:13, color:'var(--t2)', marginBottom:24, lineHeight:1.6 }}>This action cannot be undone.</div>
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={onCancel} style={{ flex:1, padding:'9px 0', borderRadius:9, border:'1px solid var(--border)', background:'rgba(255,255,255,0.04)', color:'var(--t2)', fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.15s' }}
          onMouseEnter={e=>{ e.currentTarget.style.color='var(--t1)'; e.currentTarget.style.borderColor='var(--border-up)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.color='var(--t2)'; e.currentTarget.style.borderColor='var(--border)'; }}>
          Cancel
        </button>
        <button onClick={onConfirm} style={{ flex:1, padding:'9px 0', borderRadius:9, border:'1px solid rgba(248,113,113,0.3)', background:'rgba(248,113,113,0.1)', color:'#f87171', fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.15s' }}
          onMouseEnter={e=>{ e.currentTarget.style.background='rgba(248,113,113,0.18)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.background='rgba(248,113,113,0.1)'; }}>
          Delete
        </button>
      </div>
    </div>
  </div>,
  document.body
);

/* ─── Slide-in Drawer ─────────────────────────────────── */
const Drawer = ({ title, onClose, children }) => createPortal(
  <div onClick={onClose}
    style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(6px)', zIndex:9998, display:'flex', justifyContent:'flex-end' }}>
    <div onClick={e => e.stopPropagation()} className="au"
      style={{ width:'100%', maxWidth:480, height:'100%', background:'#161720', borderLeft:'1px solid var(--border)', display:'flex', flexDirection:'column', overflowY:'auto' }}>
      {/* header */}
      <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, background:'#161720', zIndex:1 }}>
        <span style={{ fontSize:15, fontWeight:700, color:'var(--t1)' }}>{title}</span>
        <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)', background:'rgba(255,255,255,0.04)', color:'var(--t2)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.15s' }}
          onMouseEnter={e=>{ e.currentTarget.style.color='var(--t1)'; e.currentTarget.style.background='rgba(255,255,255,0.08)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.color='var(--t2)'; e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}>
          <X size={14}/>
        </button>
      </div>
      <div style={{ padding:'24px', flex:1 }}>{children}</div>
    </div>
  </div>,
  document.body
);

/* ─── Field ───────────────────────────────────────────── */
const Field = ({ label, required, children }) => (
  <div style={{ marginBottom:18 }}>
    <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.09em', marginBottom:7 }}>
      {label}{required && <span style={{ color:'#f87171', marginLeft:3 }}>*</span>}
    </label>
    {children}
  </div>
);

const Inp = (props) => (
  <input className="inp" {...props} style={{ fontSize:13.5, ...props.style }}/>
);

/* ─── Ghost action button ─────────────────────────────── */
const GhostBtn = ({ icon:Icon, label, color='var(--accent)', onClick, danger }) => {
  const c = danger ? '#f87171' : color;
  return (
    <button onClick={onClick}
      style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:7, border:`1px solid ${c}25`, background:`${c}0d`, color:c, fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.15s' }}
      onMouseEnter={e=>{ e.currentTarget.style.background=`${c}1a`; e.currentTarget.style.borderColor=`${c}50`; e.currentTarget.style.transform='translateY(-1px)'; }}
      onMouseLeave={e=>{ e.currentTarget.style.background=`${c}0d`; e.currentTarget.style.borderColor=`${c}25`; e.currentTarget.style.transform='none'; }}>
      {Icon && <Icon size={11}/>}{label}
    </button>
  );
};

/* ─── Empty State ─────────────────────────────────────── */
const EmptyState = ({ icon:Icon, title, sub, color, onAdd }) => (
  <div style={{ padding:'60px 24px', textAlign:'center' }}>
    <div style={{ position:'relative', width:64, height:64, margin:'0 auto 18px' }}>
      <div style={{ width:64, height:64, borderRadius:18, background:`${color}10`, border:`1px solid ${color}22`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={26} style={{ color }}/>
      </div>
      <div style={{ position:'absolute', bottom:-4, right:-4, width:20, height:20, borderRadius:'50%', background:'var(--bg-raised)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Plus size={10} style={{ color:'var(--t3)' }}/>
      </div>
    </div>
    <div style={{ fontSize:16, fontWeight:700, color:'var(--t1)', marginBottom:6 }}>{title}</div>
    <div style={{ fontSize:13, color:'var(--t2)', marginBottom:22, maxWidth:280, margin:'0 auto 22px', lineHeight:1.65 }}>{sub}</div>
    <button onClick={onAdd}
      style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 22px', borderRadius:10, border:`1px solid ${color}35`, background:`${color}10`, color, fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.18s' }}
      onMouseEnter={e=>{ e.currentTarget.style.background=`${color}1e`; e.currentTarget.style.borderColor=`${color}60`; }}
      onMouseLeave={e=>{ e.currentTarget.style.background=`${color}10`; e.currentTarget.style.borderColor=`${color}35`; }}>
      <Plus size={14}/> Add First
    </button>
  </div>
);

/* ─── Loading skeletons ───────────────────────────────── */
const Skeletons = () => (
  <div style={{ display:'flex', flexDirection:'column', gap:10, padding:'4px 0' }}>
    {[1,2,3].map(i => (
      <div key={i} className="skel" style={{ height:76, borderRadius:12 }}/>
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════
   SECTION: RESUMES
═══════════════════════════════════════════════════════ */
const ResumesSection = () => {
  const [resumes,  setResumes]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [drawer,   setDrawer]   = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [form,     setForm]     = useState({ title:'' });
  const [file,     setFile]     = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [pdfView,  setPdfView]  = useState(null);
  const [aiResume, setAiResume] = useState(null);
  const [bulkDel,  setBulkDel]  = useState(false);
  const fileRef = useRef(null);
  const bulk = useBulkSelect(resumes);

  const load = useCallback(async () => {
    try { setLoading(true); const r = await documentsApi.getAllResumes(); setResumes(extractList(r,'resumes')); }
    catch(e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!file)               { setError('Please select a file'); return; }
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('resume', file);
      await documentsApi.uploadResume(fd);
      setDrawer(false); setForm({ title:'' }); setFile(null);
      load();
    } catch(e) { setError(e?.response?.data?.error || 'Upload failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await documentsApi.deleteResume(deleting.id); setDeleting(null); load(); }
    catch(e) { console.error(e); }
  };

  const handleBulkDelete = async () => {
    try { await Promise.all([...bulk.selected].map(id => documentsApi.deleteResume(id))); bulk.clear(); setBulkDel(false); load(); }
    catch(e) { console.error(e); }
  };

  const color = '#5aabf0';

  return (
    <>
      {pdfView  && <PDFModal url={pdfView.url} title={pdfView.title} onClose={() => setPdfView(null)}/>}
      {aiResume && <ResumeAnalysisModal resume={aiResume} onClose={() => setAiResume(null)}/>}
      {deleting && <DeleteModal item={deleting.title} onConfirm={handleDelete} onCancel={() => setDeleting(null)}/>}
      {drawer && (
        <Drawer title="Upload Resume" onClose={() => { setDrawer(false); setError(''); setFile(null); setForm({ title:'' }); }}>
          <Field label="Resume Title" required>
            <Inp placeholder="e.g. Software Engineer Resume" value={form.title} onChange={e => setForm(f=>({...f, title:e.target.value}))}/>
          </Field>
          <Field label="PDF File" required>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ border:`2px dashed ${file ? color+'60' : 'var(--border)'}`, borderRadius:12, padding:'28px 20px', textAlign:'center', cursor:'pointer', transition:'all 0.2s', background: file ? `${color}08` : 'transparent' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=color+'50'}
              onMouseLeave={e=>e.currentTarget.style.borderColor=file?color+'60':'var(--border)'}
            >
              <input ref={fileRef} type="file" accept=".pdf" style={{ display:'none' }} onChange={e => setFile(e.target.files[0])}/>
              {file ? (
                <div>
                  <FileText size={24} style={{ color, margin:'0 auto 8px', display:'block' }}/>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--t1)', marginBottom:3 }}>{file.name}</div>
                  <div style={{ fontSize:11, color:'var(--t3)' }}>{fmtSize(file.size)}</div>
                </div>
              ) : (
                <div>
                  <Upload size={24} style={{ color:'var(--t3)', margin:'0 auto 8px', display:'block' }}/>
                  <div style={{ fontSize:13, color:'var(--t2)', marginBottom:3 }}>Click to upload PDF</div>
                  <div style={{ fontSize:11, color:'var(--t3)' }}>Max 10MB</div>
                </div>
              )}
            </div>
          </Field>
          {error && <div style={{ fontSize:12.5, color:'#f87171', marginBottom:16, padding:'8px 12px', background:'rgba(248,113,113,0.08)', borderRadius:8, border:'1px solid rgba(248,113,113,0.2)' }}>{error}</div>}
          <button onClick={handleUpload} disabled={saving}
            style={{ width:'100%', padding:'11px 0', borderRadius:10, border:`1px solid ${color}40`, background:`${color}15`, color, fontSize:14, fontWeight:700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, transition:'all 0.15s' }}>
            {saving ? 'Uploading…' : 'Upload Resume'}
          </button>
        </Drawer>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {resumes.length > 0 && <SelectBox checked={bulk.allSelected} indeterminate={bulk.someSelected} onChange={bulk.toggleAll} color={color}/>}
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>My Resumes</div>
            <div style={{ fontSize:11.5, color:'var(--t3)', marginTop:2 }}>{resumes.length} version{resumes.length!==1?'s':''}</div>
          </div>
        </div>
        <GhostBtn icon={Plus} label="Upload" color={color} onClick={() => setDrawer(true)}/>
      </div>
      {bulk.selected.size > 0 && <BulkBar count={bulk.selected.size} color={color} onClear={bulk.clear} onDelete={() => setBulkDel(true)}/>}
      {bulkDel && <DeleteModal item={`${bulk.selected.size} resume${bulk.selected.size>1?'s':''}`} onConfirm={handleBulkDelete} onCancel={() => setBulkDel(false)}/>}

      {loading ? <Skeletons/> : resumes.length === 0 ? (
        <EmptyState icon={FileText} title="No resumes yet" sub="Upload your resume to track which applications use it" color={color} onAdd={() => setDrawer(true)}/>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {resumes.map((r, i) => (
            <div key={r.id} className="card au lift" style={{ padding:'14px 16px', animationDelay:`${i*40}ms`, borderColor: bulk.selected.has(r.id) ? `${color}50` : `${color}15`, background: bulk.selected.has(r.id) ? `${color}06` : '', transition:'all 0.15s' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                <SelectBox checked={bulk.selected.has(r.id)} onChange={() => bulk.toggle(r.id)} color={color}/>
                <div style={{ width:38, height:38, borderRadius:10, background:`${color}15`, border:`1px solid ${color}25`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <FileText size={16} style={{ color }}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11.5, color:'var(--t3)' }}>
                      <Calendar size={10} style={{ marginRight:4, verticalAlign:'middle' }}/>
                      {fmtDate(r.createdAt)}
                    </span>
                    {r.fileSize && <span style={{ fontSize:11.5, color:'var(--t3)' }}>{fmtSize(r.fileSize)}</span>}
                    {r._count?.applications > 0 && (
                      <span style={{ fontSize:11, fontWeight:600, color, padding:'2px 8px', background:`${color}12`, borderRadius:99, border:`1px solid ${color}25` }}>
                        {r._count.applications} app{r._count.applications!==1?'s':''}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
                  <GhostBtn icon={ExternalLink} label="View"    color={color}     onClick={() => setPdfView({ url:r.fileUrl, title:r.title })}/>
                  <GhostBtn icon={Sparkles}     label="Analyse" color="#c084fc"   onClick={() => setAiResume(r)}/>
                  <GhostBtn icon={Trash2}       label="Delete"  danger            onClick={() => setDeleting(r)}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

/* ═══════════════════════════════════════════════════════
   SECTION: COVER LETTERS
═══════════════════════════════════════════════════════ */
const CoverLettersSection = () => {
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [drawer,   setDrawer]   = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [form,     setForm]     = useState({ title:'', fileUrl:'' });
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [pdfView,  setPdfView]  = useState(null);
  const [bulkDel,  setBulkDel]  = useState(false);
  const bulk = useBulkSelect(items);

  const handleBulkDelete = async () => {
    try { await Promise.all([...bulk.selected].map(id => documentsApi.deleteCoverLetter(id))); bulk.clear(); setBulkDel(false); load(); }
    catch(e) { console.error(e); }
  };

    const color = '#00c896';

  const load = useCallback(async () => {
    try { setLoading(true); const r = await documentsApi.getAllCoverLetters(); setItems(extractList(r,'coverLetters')); }
    catch(e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.fileUrl.trim()) { setError('File URL is required'); return; }
    setSaving(true); setError('');
    try {
      await documentsApi.createCoverLetter({ title: form.title.trim(), fileUrl: form.fileUrl.trim() });
      setDrawer(false); setForm({ title:'', fileUrl:'' }); load();
    } catch(e) { setError(e?.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await documentsApi.deleteCoverLetter(deleting.id); setDeleting(null); load(); }
    catch(e) { console.error(e); }
  };

  return (
    <>
      {pdfView  && <PDFModal url={pdfView.url} title={pdfView.title} onClose={() => setPdfView(null)}/>}
      {deleting && <DeleteModal item={deleting.title} onConfirm={handleDelete} onCancel={() => setDeleting(null)}/>}
      {drawer && (
        <Drawer title="Add Cover Letter" onClose={() => { setDrawer(false); setError(''); setForm({ title:'', fileUrl:'' }); }}>
          <Field label="Title" required><Inp placeholder="e.g. Google Cover Letter" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))}/></Field>
          <Field label="File URL" required><Inp placeholder="https://..." value={form.fileUrl} onChange={e => setForm(f=>({...f,fileUrl:e.target.value}))}/></Field>
          {error && <div style={{ fontSize:12.5, color:'#f87171', marginBottom:16, padding:'8px 12px', background:'rgba(248,113,113,0.08)', borderRadius:8, border:'1px solid rgba(248,113,113,0.2)' }}>{error}</div>}
          <button onClick={handleCreate} disabled={saving}
            style={{ width:'100%', padding:'11px 0', borderRadius:10, border:`1px solid ${color}40`, background:`${color}15`, color, fontSize:14, fontWeight:700, cursor: saving?'not-allowed':'pointer', opacity:saving?0.6:1, transition:'all 0.15s' }}>
            {saving ? 'Saving…' : 'Save Cover Letter'}
          </button>
        </Drawer>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {items.length > 0 && <SelectBox checked={bulk.allSelected} indeterminate={bulk.someSelected} onChange={bulk.toggleAll} color={color}/>}
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>Cover Letters</div>
            <div style={{ fontSize:11.5, color:'var(--t3)', marginTop:2 }}>{items.length} letter{items.length!==1?'s':''}</div>
          </div>
        </div>
        <GhostBtn icon={Plus} label="Add" color={color} onClick={() => setDrawer(true)}/>
      </div>
      {bulk.selected.size > 0 && <BulkBar count={bulk.selected.size} color={color} onClear={bulk.clear} onDelete={() => setBulkDel(true)}/>}
      {bulkDel && <DeleteModal item={`${bulk.selected.size} cover letter${bulk.selected.size>1?'s':''}`} onConfirm={handleBulkDelete} onCancel={() => setBulkDel(false)}/>}

      {loading ? <Skeletons/> : items.length === 0 ? (
        <EmptyState icon={FileText} title="No cover letters" sub="Store cover letters to track which applications use them" color={color} onAdd={() => setDrawer(true)}/>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {items.map((cl, i) => (
            <div key={cl.id} className="card au lift" style={{ padding:'14px 16px', animationDelay:`${i*40}ms`, borderColor: bulk.selected.has(cl.id) ? `${color}50` : `${color}15`, background: bulk.selected.has(cl.id) ? `${color}06` : '', transition:'all 0.15s' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <SelectBox checked={bulk.selected.has(cl.id)} onChange={() => bulk.toggle(cl.id)} color={color}/>
                <div style={{ width:38, height:38, borderRadius:10, background:`${color}15`, border:`1px solid ${color}25`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <FileText size={16} style={{ color }}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)', marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cl.title}</div>
                  <div style={{ fontSize:11.5, color:'var(--t3)' }}>
                    <Calendar size={10} style={{ marginRight:4, verticalAlign:'middle' }}/>
                    {fmtDate(cl.createdAt)}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                  <GhostBtn icon={ExternalLink} label="View" color={color} onClick={() => setPdfView({ url:cl.fileUrl, title:cl.title })}/>
                  <GhostBtn icon={Trash2} label="Delete" danger onClick={() => setDeleting(cl)}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

/* ═══════════════════════════════════════════════════════
   SECTION: CERTIFICATIONS
═══════════════════════════════════════════════════════ */
const CertsSection = () => {
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [drawer,   setDrawer]   = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form,     setForm]     = useState({ title:'', issuer:'', issuedDate:'', expiryDate:'', fileUrl:'' });
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [pdfView,  setPdfView]  = useState(null);
  const [bulkDel,  setBulkDel]  = useState(false);
  const bulk = useBulkSelect(items);

  const handleBulkDelete = async () => {
    try { await Promise.all([...bulk.selected].map(id => documentsApi.deleteCertification(id))); bulk.clear(); setBulkDel(false); load(); }
    catch(e) { console.error(e); }
  };

    const color = '#c084fc';

  const load = useCallback(async () => {
    try { setLoading(true); const r = await documentsApi.getAllCertifications(); setItems(extractList(r,'certifications')); }
    catch(e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (c) => {
    setEditing(c);
    setForm({ title:c.title, issuer:c.issuer, issuedDate:c.issuedDate?.slice(0,10)||'', expiryDate:c.expiryDate?.slice(0,10)||'', fileUrl:c.fileUrl||'' });
    setDrawer(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()||!form.issuer.trim()||!form.issuedDate||!form.fileUrl.trim()) { setError('Title, issuer, issued date and file URL are required'); return; }
    setSaving(true); setError('');
    try {
      const payload = { title:form.title.trim(), issuer:form.issuer.trim(), issuedDate:form.issuedDate, expiryDate:form.expiryDate||null, fileUrl:form.fileUrl.trim() };
      if (editing) await documentsApi.updateCertification(editing.id, payload);
      else         await documentsApi.createCertification(payload);
      setDrawer(false); setEditing(null); setForm({ title:'', issuer:'', issuedDate:'', expiryDate:'', fileUrl:'' }); load();
    } catch(e) { setError(e?.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await documentsApi.deleteCertification(deleting.id); setDeleting(null); load(); }
    catch(e) { console.error(e); }
  };

  return (
    <>
      {pdfView  && <PDFModal url={pdfView.url} title={pdfView.title} onClose={() => setPdfView(null)}/>}
      {deleting && <DeleteModal item={deleting.title} onConfirm={handleDelete} onCancel={() => setDeleting(null)}/>}
      {drawer && (
        <Drawer title={editing ? 'Edit Certification' : 'Add Certification'} onClose={() => { setDrawer(false); setEditing(null); setError(''); setForm({ title:'', issuer:'', issuedDate:'', expiryDate:'', fileUrl:'' }); }}>
          <Field label="Certification Title" required><Inp placeholder="e.g. AWS Certified Developer" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></Field>
          <Field label="Issuing Organization" required><Inp placeholder="e.g. Amazon Web Services" value={form.issuer} onChange={e=>setForm(f=>({...f,issuer:e.target.value}))}/></Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Issued Date" required><Inp type="date" value={form.issuedDate} onChange={e=>setForm(f=>({...f,issuedDate:e.target.value}))}/></Field>
            <Field label="Expiry Date"><Inp type="date" value={form.expiryDate} onChange={e=>setForm(f=>({...f,expiryDate:e.target.value}))}/></Field>
          </div>
          <Field label="Certificate URL" required><Inp placeholder="https://..." value={form.fileUrl} onChange={e=>setForm(f=>({...f,fileUrl:e.target.value}))}/></Field>
          {error && <div style={{ fontSize:12.5, color:'#f87171', marginBottom:16, padding:'8px 12px', background:'rgba(248,113,113,0.08)', borderRadius:8, border:'1px solid rgba(248,113,113,0.2)' }}>{error}</div>}
          <button onClick={handleSave} disabled={saving}
            style={{ width:'100%', padding:'11px 0', borderRadius:10, border:`1px solid ${color}40`, background:`${color}15`, color, fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', opacity:saving?0.6:1, transition:'all 0.15s' }}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Certification'}
          </button>
        </Drawer>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {items.length > 0 && <SelectBox checked={bulk.allSelected} indeterminate={bulk.someSelected} onChange={bulk.toggleAll} color={color}/>}
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>Certifications</div>
            <div style={{ fontSize:11.5, color:'var(--t3)', marginTop:2 }}>{items.length} certification{items.length!==1?'s':''}</div>
          </div>
        </div>
        <GhostBtn icon={Plus} label="Add" color={color} onClick={() => { setEditing(null); setForm({ title:'', issuer:'', issuedDate:'', expiryDate:'', fileUrl:'' }); setDrawer(true); }}/>
      </div>
      {bulk.selected.size > 0 && <BulkBar count={bulk.selected.size} color={color} onClear={bulk.clear} onDelete={() => setBulkDel(true)}/>}
      {bulkDel && <DeleteModal item={`${bulk.selected.size} certification${bulk.selected.size>1?'s':''}`} onConfirm={handleBulkDelete} onCancel={() => setBulkDel(false)}/>}

      {loading ? <Skeletons/> : items.length === 0 ? (
        <EmptyState icon={Award} title="No certifications" sub="Track your certifications and their expiry dates" color={color} onAdd={() => setDrawer(true)}/>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {items.map((c, i) => {
            const daysLeft  = expiresIn(c.expiryDate);
            const expired   = isExpired(c.expiryDate);
            const expiringSoon = daysLeft !== null && daysLeft <= 60 && !expired;
            return (
              <div key={c.id} className="card au lift" style={{ padding:'14px 16px', animationDelay:`${i*40}ms`, borderColor: bulk.selected.has(c.id) ? `${color}50` : expired ? 'rgba(248,113,113,0.25)' : expiringSoon ? 'rgba(232,168,32,0.25)' : `${color}15`, background: bulk.selected.has(c.id) ? `${color}06` : '', transition:'all 0.15s' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <SelectBox checked={bulk.selected.has(c.id)} onChange={() => bulk.toggle(c.id)} color={color}/>
                  <div style={{ width:38, height:38, borderRadius:10, background:`${color}15`, border:`1px solid ${color}25`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative' }}>
                    <Award size={16} style={{ color }}/>
                    {(expired||expiringSoon) && (
                      <div style={{ position:'absolute', top:-4, right:-4, width:14, height:14, borderRadius:'50%', background: expired?'#f87171':'#e8a820', border:'2px solid var(--card)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <AlertCircle size={8} style={{ color:'#fff' }}/>
                      </div>
                    )}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)', marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.title}</div>
                    <div style={{ fontSize:12, color:'var(--t2)', marginBottom:5 }}>{c.issuer}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                      <span style={{ fontSize:11, color:'var(--t3)' }}>Issued {fmtDate(c.issuedDate)}</span>
                      {c.expiryDate && (
                        <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99,
                          color: expired ? '#f87171' : expiringSoon ? '#e8a820' : 'var(--t3)',
                          background: expired ? 'rgba(248,113,113,0.1)' : expiringSoon ? 'rgba(232,168,32,0.1)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${expired?'rgba(248,113,113,0.25)':expiringSoon?'rgba(232,168,32,0.25)':'var(--border)'}`,
                        }}>
                          {expired ? 'Expired' : expiringSoon ? `Expires in ${daysLeft}d` : `Expires ${fmtDate(c.expiryDate)}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                    <GhostBtn icon={ExternalLink} label="View" color={color} onClick={() => setPdfView({ url:c.fileUrl, title:c.title })}/>
                    <GhostBtn icon={Edit2} label="Edit" color={color} onClick={() => openEdit(c)}/>
                    <GhostBtn icon={Trash2} label="" danger onClick={() => setDeleting(c)}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

/* ═══════════════════════════════════════════════════════
   SECTION: PORTFOLIO
═══════════════════════════════════════════════════════ */
const PortfolioSection = () => {
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [drawer,   setDrawer]   = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form,     setForm]     = useState({ title:'', description:'', type:'link', url:'', fileUrl:'' });
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [pdfView,  setPdfView]  = useState(null);
  const [bulkDel,  setBulkDel]  = useState(false);
  const bulk = useBulkSelect(items);

  const handleBulkDelete = async () => {
    try { await Promise.all([...bulk.selected].map(id => documentsApi.deletePortfolio(id))); bulk.clear(); setBulkDel(false); load(); }
    catch(e) { console.error(e); }
  };

    const color = '#e8a820';

  const load = useCallback(async () => {
    try { setLoading(true); const r = await documentsApi.getAllPortfolios(); setItems(extractList(r,'portfolios')); }
    catch(e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (p) => { setEditing(p); setForm({ title:p.title, description:p.description||'', type:p.type, url:p.url||'', fileUrl:p.fileUrl||'' }); setDrawer(true); };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (form.type==='link' && !form.url.trim()) { setError('URL is required for link type'); return; }
    if (form.type==='file' && !form.fileUrl.trim()) { setError('File URL is required for file type'); return; }
    setSaving(true); setError('');
    try {
      const payload = { title:form.title.trim(), description:form.description.trim(), type:form.type, url:form.url.trim()||undefined, fileUrl:form.fileUrl.trim()||undefined };
      if (editing) await documentsApi.updatePortfolio(editing.id, payload);
      else         await documentsApi.createPortfolio(payload);
      setDrawer(false); setEditing(null); setForm({ title:'', description:'', type:'link', url:'', fileUrl:'' }); load();
    } catch(e) { setError(e?.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await documentsApi.deletePortfolio(deleting.id); setDeleting(null); load(); }
    catch(e) { console.error(e); }
  };

  const typeLabel = { link:'Link', file:'File', github:'GitHub', other:'Other' };

  return (
    <>
      {pdfView  && <PDFModal url={pdfView.url} title={pdfView.title} onClose={() => setPdfView(null)}/>}
      {deleting && <DeleteModal item={deleting.title} onConfirm={handleDelete} onCancel={() => setDeleting(null)}/>}
      {drawer && (
        <Drawer title={editing ? 'Edit Portfolio Item' : 'Add Portfolio Item'} onClose={() => { setDrawer(false); setEditing(null); setError(''); setForm({ title:'', description:'', type:'link', url:'', fileUrl:'' }); }}>
          <Field label="Title" required><Inp placeholder="e.g. E-commerce Project" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></Field>
          <Field label="Description"><Inp placeholder="Brief description (optional)" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></Field>
          <Field label="Type" required>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
              {['link','file','github','other'].map(t => (
                <button key={t} onClick={() => setForm(f=>({...f,type:t}))} style={{
                  padding:'7px 0', borderRadius:8, border:`1px solid ${form.type===t?color+'50':'var(--border)'}`,
                  background: form.type===t ? `${color}15` : 'rgba(255,255,255,0.03)',
                  color: form.type===t ? color : 'var(--t2)', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.15s', textTransform:'capitalize',
                }}>{t}</button>
              ))}
            </div>
          </Field>
          {(form.type==='link'||form.type==='github') && <Field label="URL" required><Inp placeholder="https://..." value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))}/></Field>}
          {form.type==='file' && <Field label="File URL" required><Inp placeholder="https://..." value={form.fileUrl} onChange={e=>setForm(f=>({...f,fileUrl:e.target.value}))}/></Field>}
          {error && <div style={{ fontSize:12.5, color:'#f87171', marginBottom:16, padding:'8px 12px', background:'rgba(248,113,113,0.08)', borderRadius:8, border:'1px solid rgba(248,113,113,0.2)' }}>{error}</div>}
          <button onClick={handleSave} disabled={saving}
            style={{ width:'100%', padding:'11px 0', borderRadius:10, border:`1px solid ${color}40`, background:`${color}15`, color, fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', opacity:saving?0.6:1, transition:'all 0.15s' }}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Item'}
          </button>
        </Drawer>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {items.length > 0 && <SelectBox checked={bulk.allSelected} indeterminate={bulk.someSelected} onChange={bulk.toggleAll} color={color}/>}
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>Portfolio</div>
            <div style={{ fontSize:11.5, color:'var(--t3)', marginTop:2 }}>{items.length} item{items.length!==1?'s':''}</div>
          </div>
        </div>
        <GhostBtn icon={Plus} label="Add" color={color} onClick={() => { setEditing(null); setForm({ title:'', description:'', type:'link', url:'', fileUrl:'' }); setDrawer(true); }}/>
      </div>
      {bulk.selected.size > 0 && <BulkBar count={bulk.selected.size} color={color} onClear={bulk.clear} onDelete={() => setBulkDel(true)}/>}
      {bulkDel && <DeleteModal item={`${bulk.selected.size} portfolio item${bulk.selected.size>1?'s':''}`} onConfirm={handleBulkDelete} onCancel={() => setBulkDel(false)}/>}

      {loading ? <Skeletons/> : items.length === 0 ? (
        <EmptyState icon={Briefcase} title="No portfolio items" sub="Add links to your projects, GitHub repos, or portfolio files" color={color} onAdd={() => setDrawer(true)}/>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {items.map((p, i) => (
            <div key={p.id} className="card au lift" style={{ padding:'14px 16px', animationDelay:`${i*40}ms`, borderColor: bulk.selected.has(p.id) ? `${color}50` : `${color}15`, background: bulk.selected.has(p.id) ? `${color}06` : '', transition:'all 0.15s' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8, gap:8 }}>
                <SelectBox checked={bulk.selected.has(p.id)} onChange={() => bulk.toggle(p.id)} color={color}/>
                <div style={{ width:34, height:34, borderRadius:9, background:`${color}15`, border:`1px solid ${color}25`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Briefcase size={14} style={{ color }}/>
                </div>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:`${color}15`, border:`1px solid ${color}25`, color }}>{typeLabel[p.type]||p.type}</span>
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)', marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.title}</div>
              {p.description && <div style={{ fontSize:12, color:'var(--t3)', marginBottom:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.description}</div>}
              <div style={{ display:'flex', gap:6, marginTop:8 }}>
                {(p.url||p.fileUrl) && <GhostBtn icon={ExternalLink} label="Visit" color={color} onClick={() => { const target = p.url||p.fileUrl; if(p.type==='file'&&target.endsWith('.pdf')) setPdfView({url:target,title:p.title}); else window.open(target,'_blank'); }}/>}
                <GhostBtn icon={Edit2} label="Edit" color={color} onClick={() => openEdit(p)}/>
                <GhostBtn icon={Trash2} label="" danger onClick={() => setDeleting(p)}/>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

/* ═══════════════════════════════════════════════════════
   SECTION: REFERENCES
═══════════════════════════════════════════════════════ */
const ReferencesSection = () => {
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [drawer,   setDrawer]   = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [copied,   setCopied]   = useState(null);
  const [form,     setForm]     = useState({ name:'', title:'', company:'', email:'', phone:'', relationship:'', notes:'' });
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [bulkDel,  setBulkDel]  = useState(false);
  const bulk = useBulkSelect(items);

  const handleBulkDelete = async () => {
    try { await Promise.all([...bulk.selected].map(id => documentsApi.deleteReference(id))); bulk.clear(); setBulkDel(false); load(); }
    catch(e) { console.error(e); }
  };

    const color = '#f87171';

  const load = useCallback(async () => {
    try { setLoading(true); const r = await documentsApi.getAllReferences(); setItems(extractList(r,'references')); }
    catch(e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (ref) => { setEditing(ref); setForm({ name:ref.name, title:ref.title, company:ref.company, email:ref.email, phone:ref.phone||'', relationship:ref.relationship, notes:ref.notes||'' }); setDrawer(true); };

  const handleSave = async () => {
    if (!form.name.trim()||!form.title.trim()||!form.company.trim()||!form.email.trim()||!form.relationship.trim()) { setError('Name, title, company, email and relationship are required'); return; }
    setSaving(true); setError('');
    try {
      if (editing) await documentsApi.updateReference(editing.id, form);
      else         await documentsApi.createReference(form);
      setDrawer(false); setEditing(null); setForm({ name:'', title:'', company:'', email:'', phone:'', relationship:'', notes:'' }); load();
    } catch(e) { setError(e?.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await documentsApi.deleteReference(deleting.id); setDeleting(null); load(); }
    catch(e) { console.error(e); }
  };

  const copyEmail = (ref) => { navigator.clipboard.writeText(ref.email); setCopied(ref.id); setTimeout(() => setCopied(null), 2000); };

  const relColors = { 'Former Manager':'#00c896', 'Colleague':'#5aabf0', 'Professor':'#c084fc', 'Mentor':'#e8a820', 'Friend':'#f87171' };

  return (
    <>
      {deleting && <DeleteModal item={deleting.name} onConfirm={handleDelete} onCancel={() => setDeleting(null)}/>}
      {drawer && (
        <Drawer title={editing ? 'Edit Reference' : 'Add Reference'} onClose={() => { setDrawer(false); setEditing(null); setError(''); setForm({ name:'', title:'', company:'', email:'', phone:'', relationship:'', notes:'' }); }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Full Name" required><Inp placeholder="John Smith" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></Field>
            <Field label="Relationship" required><Inp placeholder="Former Manager" value={form.relationship} onChange={e=>setForm(f=>({...f,relationship:e.target.value}))}/></Field>
          </div>
          <Field label="Job Title" required><Inp placeholder="Senior Engineer" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></Field>
          <Field label="Company" required><Inp placeholder="Google" value={form.company} onChange={e=>setForm(f=>({...f,company:e.target.value}))}/></Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Email" required><Inp type="email" placeholder="john@example.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></Field>
            <Field label="Phone"><Inp placeholder="(555) 123-4567" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/></Field>
          </div>
          <Field label="Notes">
            <textarea className="inp" placeholder="Any additional notes…" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={{ resize:'vertical', minHeight:80, fontSize:13.5 }}/>
          </Field>
          {error && <div style={{ fontSize:12.5, color:'#f87171', marginBottom:16, padding:'8px 12px', background:'rgba(248,113,113,0.08)', borderRadius:8, border:'1px solid rgba(248,113,113,0.2)' }}>{error}</div>}
          <button onClick={handleSave} disabled={saving}
            style={{ width:'100%', padding:'11px 0', borderRadius:10, border:`1px solid ${color}40`, background:`${color}15`, color, fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', opacity:saving?0.6:1, transition:'all 0.15s' }}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Reference'}
          </button>
        </Drawer>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {items.length > 0 && <SelectBox checked={bulk.allSelected} indeterminate={bulk.someSelected} onChange={bulk.toggleAll} color={color}/>}
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>References</div>
            <div style={{ fontSize:11.5, color:'var(--t3)', marginTop:2 }}>{items.length} reference{items.length!==1?'s':''}</div>
          </div>
        </div>
        <GhostBtn icon={Plus} label="Add" color={color} onClick={() => { setEditing(null); setForm({ name:'', title:'', company:'', email:'', phone:'', relationship:'', notes:'' }); setDrawer(true); }}/>
      </div>
      {bulk.selected.size > 0 && <BulkBar count={bulk.selected.size} color={color} onClear={bulk.clear} onDelete={() => setBulkDel(true)}/>}
      {bulkDel && <DeleteModal item={`${bulk.selected.size} reference${bulk.selected.size>1?'s':''}`} onConfirm={handleBulkDelete} onCancel={() => setBulkDel(false)}/>}

      {loading ? <Skeletons/> : items.length === 0 ? (
        <EmptyState icon={Users} title="No references" sub="Store reference contacts to quickly copy details when applying" color={color} onAdd={() => setDrawer(true)}/>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {items.map((ref, i) => {
            const rc = relColors[ref.relationship] || '#5a5a72';
            const initials = ref.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
            return (
              <div key={ref.id} className="card au lift" style={{ padding:'16px 18px', animationDelay:`${i*40}ms`, borderColor: bulk.selected.has(ref.id) ? `${color}50` : `${color}15`, background: bulk.selected.has(ref.id) ? `${color}06` : '', transition:'all 0.15s' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <SelectBox checked={bulk.selected.has(ref.id)} onChange={() => bulk.toggle(ref.id)} color={color}/>
                  {/* avatar */}
                  <div style={{ width:42, height:42, borderRadius:12, background:`${rc}20`, border:`1px solid ${rc}35`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:14, fontWeight:800, color:rc, fontFamily:'var(--mono)' }}>{initials}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                      <span style={{ fontSize:14, fontWeight:700, color:'var(--t1)' }}>{ref.name}</span>
                      <span style={{ fontSize:10.5, fontWeight:600, padding:'2px 7px', borderRadius:99, background:`${rc}15`, border:`1px solid ${rc}30`, color:rc }}>{ref.relationship}</span>
                    </div>
                    <div style={{ fontSize:12.5, color:'var(--t2)', marginBottom:6 }}>{ref.title} @ {ref.company}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--t3)' }}>
                        <Mail size={11}/>
                        <span>{ref.email}</span>
                      </div>
                      {ref.phone && (
                        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--t3)' }}>
                          <Phone size={11}/>
                          <span>{ref.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                    <GhostBtn icon={copied===ref.id ? Check : Mail} label={copied===ref.id ? 'Copied' : 'Copy Email'} color={copied===ref.id ? '#34d399' : color} onClick={() => copyEmail(ref)}/>
                    <GhostBtn icon={Edit2} label="Edit" color={color} onClick={() => openEdit(ref)}/>
                    <GhostBtn icon={Trash2} label="" danger onClick={() => setDeleting(ref)}/>
                  </div>
                </div>
                {ref.notes && (
                  <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--border)', fontSize:12, color:'var(--t3)', fontStyle:'italic', lineHeight:1.5 }}>{ref.notes}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
/* spin keyframe injected once */
const spinStyle = document.getElementById('pdf-spin-style');
if (!spinStyle) {
  const s = document.createElement('style');
  s.id = 'pdf-spin-style';
  s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(s);
}

const DocumentsPage = () => {
  const [activeTab, setActiveTab] = useState('resumes');
  const active = TABS.find(t => t.key === activeTab);

  const sections = {
    resumes:      <ResumesSection/>,
    coverLetters: <CoverLettersSection/>,
    certs:        <CertsSection/>,
    portfolio:    <PortfolioSection/>,
    references:   <ReferencesSection/>,
  };

  return (
    <MainLayout title="Documents">
      <div style={{ maxWidth:900 }}>

        {/* ── Header ── */}
        <div className="au" style={{ marginBottom:24 }}>
          <h2 style={{ fontSize:21, fontWeight:800, color:'var(--t1)', letterSpacing:'-0.5px', marginBottom:3 }}>Documents</h2>
          <p style={{ fontSize:12.5, color:'var(--t3)' }}>Manage your career documents in one place</p>
        </div>

        {/* ── Tab bar ── */}
        <div className="au d1" style={{ display:'flex', gap:6, marginBottom:20, background:'rgba(255,255,255,0.03)', border:'1px solid var(--border)', borderRadius:14, padding:5 }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                padding:'9px 8px', borderRadius:10, border:`1px solid ${isActive ? tab.color+'30' : 'transparent'}`,
                background: isActive ? `${tab.color}12` : 'transparent',
                color: isActive ? tab.color : 'var(--t2)',
                fontSize:12.5, fontWeight: isActive ? 700 : 500,
                cursor:'pointer', transition:'all 0.18s',
              }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color='var(--t1)'; e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color='var(--t2)'; e.currentTarget.style.background='transparent'; }}}
              >
                <Icon size={13}/>
                <span style={{ whiteSpace:'nowrap' }}>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Content card ── */}
        <div className="card au d2" style={{ padding:'22px 24px', minHeight:300 }}>
          {sections[activeTab]}
        </div>

      </div>
    </MainLayout>
  );
};

export default DocumentsPage;