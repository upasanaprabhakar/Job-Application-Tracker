import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, X, AlertTriangle, ExternalLink } from 'lucide-react';
import { applicationApi } from '../../api/applicationApi';
import MainLayout from '../../components/layout/MainLayout';

const STATUSES = [
  { key: 'applied',      label: 'Applied',      color: '#e8a820' },
  { key: 'screening',    label: 'Screening',    color: '#5aabf0' },
  { key: 'interviewing', label: 'Interviewing', color: '#00c896' },
  { key: 'offer',        label: 'Offer',        color: '#c084fc' },
  { key: 'accepted',     label: 'Accepted',     color: '#00c896' },
  { key: 'rejected',     label: 'Rejected',     color: '#f87171' },
  { key: 'withdrawn',    label: 'Withdrawn',    color: '#5a5a72' },
];

const EMPTY = {
  companyName: '', jobTitle: '', jobUrl: '', jobDescription: '',
  location: '', salaryRange: '', status: 'applied',
  applicationDate: new Date().toISOString().split('T')[0],
  followUpDate: '', notes: '',
};

/* robust extractor */
const extractApp = (res) => {
  if (!res) return null;
  for (const c of [res?.data?.application, res?.application, res?.data?.data, res?.data, res]) {
    if (c && typeof c === 'object' && (c._id || c.id || c.companyName || c.jobTitle)) return c;
  }
  return null;
};

const toDateStr = (val) => {
  if (!val) return '';
  try { return new Date(val).toISOString().split('T')[0]; } catch { return ''; }
};

/* sub-components */
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

const Field = ({ label, error, required, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: 12.5, fontWeight: 600, color: error ? '#f87171' : 'var(--t2)' }}>
      {label}{required && <span style={{ color: 'var(--accent)', marginLeft: 2 }}>*</span>}
    </label>
    {children}
    {error && <span style={{ fontSize: 11.5, color: '#f87171' }}>{error}</span>}
  </div>
);

const Section = ({ title, children, delay = 0 }) => (
  <div className="card au" style={{ padding: '20px 22px', animationDelay: `${delay}ms` }}>
    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t1)', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>{title}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
  </div>
);

const ProgressRing = ({ pct }) => {
  const r = 18, circ = 2 * Math.PI * r, dash = (pct / 100) * circ;
  return (
    <div style={{ position: 'relative', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="48" height="48" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--accent)" strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.4s ease' }} />
      </svg>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{pct}%</span>
    </div>
  );
};

/* MAIN */
const ApplicationForm = () => {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = Boolean(id);

  const [form,    setForm]    = useState(EMPTY);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState(null);
  const [dup,     setDup]     = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* load for edit */
  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await applicationApi.getApplicationById(id);
        const d   = extractApp(res);
        if (!d) throw new Error('No data');

        setForm({
          companyName:     d.companyName    || d.company  || '',
          jobTitle:        d.jobTitle       || d.position || d.title || '',
          jobUrl:          d.jobUrl         || '',
          jobDescription:  d.jobDescription || '',
          location:        d.location       || '',
          salaryRange:     d.salaryRange    || '',
          status:          d.status         || 'applied',
          applicationDate: toDateStr(d.applicationDate || d.appliedDate || d.createdAt),
          followUpDate:    toDateStr(d.followUpDate),
          notes:           d.notes          || '',
        });
      } catch (e) {
        console.error('Form load error:', e);
        showToast('Failed to load application data', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit]);

  /* dup check */
  useEffect(() => {
    if (!form.companyName || !form.jobTitle || isEdit) return;
    const t = setTimeout(async () => {
      try {
        const res = await applicationApi.checkDuplicates(form.companyName, form.jobTitle);
        setDup(res?.data?.isDuplicate || res?.isDuplicate || false);
      } catch { setDup(false); }
    }, 600);
    return () => clearTimeout(t);
  }, [form.companyName, form.jobTitle, isEdit]);

  const set      = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const filled   = ['companyName','jobTitle','status','applicationDate'].filter(k => form[k]?.toString().trim()).length;
  const progress = Math.round((filled / 4) * 100);

  const validate = () => {
    const e = {};
    if (!form.companyName.trim()) e.companyName = 'Company name is required';
    if (!form.jobTitle.trim())    e.jobTitle    = 'Job title is required';
    if (!form.applicationDate)    e.applicationDate = 'Application date is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      if (isEdit) {
        await applicationApi.updateApplication(id, form);
        showToast('Application updated');
        setTimeout(() => navigate(`/applications/${id}`), 800);
      } else {
        const res  = await applicationApi.createApplication(form);
        const newId = res?.data?._id || res?.data?.id || res?.data?.data?._id || res?._id || res?.id;
        showToast('Application added');
        setTimeout(() => navigate(newId ? `/applications/${newId}` : '/applications'), 800);
      }
    } catch (e) {
      console.error('Form submit error:', e);
      showToast(isEdit ? 'Failed to update' : 'Failed to create', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <MainLayout title={isEdit ? 'Edit Application' : 'New Application'}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
      </div>
    </MainLayout>
  );

  return (
    <MainLayout title={isEdit ? 'Edit Application' : 'Track New Job'}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ maxWidth: 720 }}>

        {/* header */}
        <div className="au" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate(isEdit ? `/applications/${id}` : '/applications')}
              style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 500, color: 'var(--t2)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--t1)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--t2)'}
            ><ArrowLeft size={15} /> Back</button>
            <span style={{ color: 'var(--t3)' }}>/</span>
            <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)' }}>{isEdit ? 'Edit Application' : 'Track New Job'}</h1>
          </div>
          <ProgressRing pct={progress} />
        </div>

        {dup && (
          <div className="au" style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 16px', marginBottom:16, borderRadius:12, background:'rgba(232,168,32,0.07)', border:'1px solid rgba(232,168,32,0.25)' }}>
            <AlertTriangle size={16} style={{ color:'#e8a820', flexShrink:0, marginTop:1 }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#e8a820', marginBottom:2 }}>Possible duplicate detected</div>
              <div style={{ fontSize:12, color:'rgba(232,168,32,0.75)', lineHeight:1.5 }}>
                You may have already applied to <strong>{form.companyName}</strong> for a similar role. Check your applications before continuing.
              </div>
            </div>
            <button onClick={() => setDup(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(232,168,32,0.5)', padding:2, flexShrink:0 }} onMouseEnter={e=>e.currentTarget.style.color='#e8a820'} onMouseLeave={e=>e.currentTarget.style.color='rgba(232,168,32,0.5)'}>
              <X size={14}/>
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <Section title="Company Details" delay={0}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Company Name" required error={errors.companyName}>
                <input className={`inp${errors.companyName ? ' err' : ''}`} placeholder="e.g. Google" value={form.companyName} onChange={e => set('companyName', e.target.value)} />
              </Field>
              <Field label="Job Title" required error={errors.jobTitle}>
                <input className={`inp${errors.jobTitle ? ' err' : ''}`} placeholder="e.g. Software Engineer" value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title="Job Details" delay={60}>
            <Field label="Job Posting URL">
              <input className="inp" placeholder="https://..." value={form.jobUrl} onChange={e => set('jobUrl', e.target.value)} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Location">
                <input className="inp" placeholder="City, State or Remote" value={form.location} onChange={e => set('location', e.target.value)} />
              </Field>
              <Field label="Salary Range">
                <input className="inp" placeholder="e.g. $120k–$160k" value={form.salaryRange} onChange={e => set('salaryRange', e.target.value)} />
              </Field>
            </div>
            <Field label="Job Description">
              <textarea className="inp" placeholder="Paste the job description..." rows={4} style={{ resize: 'vertical' }} value={form.jobDescription} onChange={e => set('jobDescription', e.target.value)} />
            </Field>
          </Section>

          <Section title="Tracking" delay={120}>
            <Field label="Status">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {STATUSES.map(({ key, label: lbl, color }) => {
                  const active = form.status === key;
                  return (
                    <button key={key} onClick={() => set('status', key)} style={{
                      padding: '7px 8px', borderRadius: 9, cursor: 'pointer',
                      border: active ? `1px solid ${color}55` : '1px solid var(--border)',
                      background: active ? `${color}18` : 'rgba(255,255,255,0.03)',
                      color: active ? color : 'var(--t2)',
                      fontSize: 12, fontWeight: active ? 600 : 500, transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, opacity: active ? 1 : 0.45 }} />
                      {lbl}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Date Applied" required error={errors.applicationDate}>
                <input type="date" className={`inp${errors.applicationDate ? ' err' : ''}`} value={form.applicationDate} onChange={e => set('applicationDate', e.target.value)} />
              </Field>
              <Field label="Follow-up Date">
                <input type="date" className="inp" value={form.followUpDate} onChange={e => set('followUpDate', e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title="Notes" delay={180}>
            <Field label="Personal Notes">
              <textarea className="inp" placeholder="Interview prep, contacts, impressions..." rows={4} style={{ resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} />
            </Field>
          </Section>

        </div>

        <div className="au" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18, paddingBottom: 40 }}>
          <button onClick={() => navigate(isEdit ? `/applications/${id}` : '/applications')} className="btn-s" style={{ padding: '10px 22px' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding:'10px 26px', minWidth:140, justifyContent:'center', fontSize:14, display:'inline-flex', alignItems:'center', gap:7, fontWeight:600, fontFamily:'var(--font)', color:'var(--accent)', background:'rgba(0,200,150,0.08)', border:'1px solid rgba(0,200,150,0.25)', borderRadius:'var(--rs)', cursor:'pointer', transition:'background 0.18s, border-color 0.18s, transform 0.15s' }} onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,200,150,0.14)';e.currentTarget.style.borderColor='rgba(0,200,150,0.5)';e.currentTarget.style.transform='translateY(-1px)'}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,200,150,0.08)';e.currentTarget.style.borderColor='rgba(0,200,150,0.25)';e.currentTarget.style.transform='translateY(0)'}}>
            {saving ? 'Saving...' : <><CheckCircle2 size={14} />{isEdit ? 'Save Changes' : 'Add Application'}</>}
          </button>
        </div>

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </MainLayout>
  );
};

export default ApplicationForm;