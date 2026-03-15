import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Sparkles, CheckCircle, AlertTriangle, ArrowRight,
  MessageSquare, Target, Zap, BookOpen, Star, TrendingUp,
  ChevronDown, ChevronUp, Copy, Check, Edit2,
} from 'lucide-react';
import { aiApi } from '../../api/aiApi';

/* ─── shared modal shell ──────────────────────────────── */
const ModalShell = ({ onClose, children, maxWidth = 720 }) => createPortal(
  <div onClick={onClose}
    style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(12px)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:10000, padding:20, overflowY:'auto' }}>
    <div onClick={e => e.stopPropagation()}
      style={{ width:'100%', maxWidth, background:'#1a1b25', border:'1px solid var(--border-up)',
        borderRadius:20, boxShadow:'0 40px 120px rgba(0,0,0,0.9)', maxHeight:'90vh',
        display:'flex', flexDirection:'column', overflowY:'auto' }}>
      {children}
    </div>
  </div>,
  document.body
);

/* ─── modal header ────────────────────────────────────── */
const ModalHeader = ({ icon:Icon, title, subtitle, color, onClose }) => (
  <div style={{ padding:'22px 24px 18px', borderBottom:'1px solid var(--border)',
    background:'#161720', flexShrink:0, borderRadius:'20px 20px 0 0', position:'sticky', top:0, zIndex:1 }}>
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:40, height:40, borderRadius:11, background:`${color}18`,
          border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon size={18} style={{ color }}/>
        </div>
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:'var(--t1)', letterSpacing:'-0.2px' }}>{title}</div>
          {subtitle && <div style={{ fontSize:12, color:'var(--t3)', marginTop:2 }}>{subtitle}</div>}
        </div>
      </div>
      <button onClick={onClose}
        style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border)',
          background:'rgba(255,255,255,0.04)', color:'var(--t2)', display:'flex',
          alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
        <X size={14}/>
      </button>
    </div>
  </div>
);

/* ─── mini robot for modal loading state ─────────────── */
const SplineRobot = () => (
  <div style={{ width:'100%', height:200, display:'flex', alignItems:'center',
    justifyContent:'center', position:'relative',
    background:'radial-gradient(ellipse at 50% 60%, rgba(0,200,150,0.06) 0%, transparent 70%)' }}>
    <RobotPlaceholder/>
  </div>
);

/* ─── CSS Robot (fallback + placeholder while Spline loads) ── */
const RobotPlaceholder = () => (
  <div style={{ position:'relative', width:100, height:120 }}>
    {/* head */}
    <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
      width:52, height:42, borderRadius:12, background:'linear-gradient(135deg, #1e2035, #252840)',
      border:'1.5px solid rgba(0,200,150,0.35)', boxShadow:'0 0 20px rgba(0,200,150,0.15)',
      animation:'robotFloat 3s ease-in-out infinite' }}>
      {/* eyes */}
      <div style={{ position:'absolute', top:13, left:10, width:10, height:10, borderRadius:'50%',
        background:'#00c896', boxShadow:'0 0 10px #00c896', animation:'eyeBlink 3s ease-in-out infinite' }}/>
      <div style={{ position:'absolute', top:13, right:10, width:10, height:10, borderRadius:'50%',
        background:'#00c896', boxShadow:'0 0 10px #00c896', animation:'eyeBlink 3s ease-in-out infinite 0.1s' }}/>
      {/* mouth */}
      <div style={{ position:'absolute', bottom:9, left:'50%', transform:'translateX(-50%)',
        width:20, height:3, borderRadius:99, background:'rgba(0,200,150,0.5)' }}/>
      {/* antenna */}
      <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)',
        width:2, height:14, background:'rgba(0,200,150,0.4)', borderRadius:99 }}>
        <div style={{ position:'absolute', top:-5, left:'50%', transform:'translateX(-50%)',
          width:7, height:7, borderRadius:'50%', background:'#00c896',
          boxShadow:'0 0 12px #00c896', animation:'antennaPulse 1.5s ease-in-out infinite' }}/>
      </div>
    </div>
    {/* neck */}
    <div style={{ position:'absolute', top:42, left:'50%', transform:'translateX(-50%)',
      width:14, height:10, background:'rgba(0,200,150,0.15)', border:'1px solid rgba(0,200,150,0.2)',
      animation:'robotFloat 3s ease-in-out infinite' }}/>
    {/* body */}
    <div style={{ position:'absolute', top:52, left:'50%', transform:'translateX(-50%)',
      width:62, height:48, borderRadius:10, background:'linear-gradient(135deg, #1e2035, #252840)',
      border:'1.5px solid rgba(0,200,150,0.25)', boxShadow:'0 0 20px rgba(0,200,150,0.1)',
      animation:'robotFloat 3s ease-in-out infinite' }}>
      {/* chest light */}
      <div style={{ position:'absolute', top:10, left:'50%', transform:'translateX(-50%)',
        width:18, height:18, borderRadius:6, background:'rgba(0,200,150,0.1)',
        border:'1px solid rgba(0,200,150,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#00c896',
          boxShadow:'0 0 10px #00c896', animation:'antennaPulse 1.5s ease-in-out infinite 0.5s' }}/>
      </div>
      {/* body lines */}
      <div style={{ position:'absolute', bottom:10, left:10, right:10, height:1,
        background:'rgba(0,200,150,0.15)' }}/>
    </div>
    {/* left arm */}
    <div style={{ position:'absolute', top:55, left:2, width:10, height:34, borderRadius:5,
      background:'linear-gradient(135deg, #1e2035, #252840)', border:'1px solid rgba(0,200,150,0.2)',
      animation:'armSwing 3s ease-in-out infinite' }}/>
    {/* right arm */}
    <div style={{ position:'absolute', top:55, right:2, width:10, height:34, borderRadius:5,
      background:'linear-gradient(135deg, #1e2035, #252840)', border:'1px solid rgba(0,200,150,0.2)',
      animation:'armSwing 3s ease-in-out infinite reverse' }}/>
  </div>
);

/* ─── loading state ───────────────────────────────────── */
const AILoading = ({ label, color }) => (
  <div style={{ padding:'24px 24px 32px', textAlign:'center' }}>
    <SplineRobot/>
    <div style={{ marginTop:20 }}>
      {/* animated dots */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16, marginBottom:14 }}>
        <div style={{ height:1, flex:1, background:`linear-gradient(to right, transparent, ${color}40)` }}/>
        <div style={{ display:'flex', gap:5 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:color,
              animation:'aiPulse 1.2s ease-in-out infinite',
              animationDelay:`${i * 0.2}s`,
              boxShadow:`0 0 8px ${color}` }}/>
          ))}
        </div>
        <div style={{ height:1, flex:1, background:`linear-gradient(to left, transparent, ${color}40)` }}/>
      </div>
      <div style={{ fontSize:15, fontWeight:700, color:'var(--t1)', marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:12.5, color:'var(--t3)' }}>This may take 10–30 seconds…</div>
    </div>
  </div>
);

/* ─── error state ─────────────────────────────────────── */
const AIError = ({ msg, onRetry }) => (
  <div style={{ padding:'48px 24px', textAlign:'center' }}>
    <div style={{ width:48, height:48, borderRadius:14, background:'rgba(248,113,113,0.1)',
      border:'1px solid rgba(248,113,113,0.2)', display:'flex', alignItems:'center',
      justifyContent:'center', margin:'0 auto 14px' }}>
      <AlertTriangle size={20} style={{ color:'#f87171' }}/>
    </div>
    <div style={{ fontSize:14, fontWeight:700, color:'var(--t1)', marginBottom:6 }}>AI request failed</div>
    <div style={{ fontSize:12.5, color:'var(--t3)', marginBottom:20, maxWidth:340, margin:'0 auto 20px' }}>{msg}</div>
    <button onClick={onRetry}
      style={{ padding:'8px 20px', borderRadius:9, border:'1px solid rgba(0,200,150,0.3)',
        background:'rgba(0,200,150,0.1)', color:'var(--accent)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
      Try again
    </button>
  </div>
);

/* ─── score ring ──────────────────────────────────────── */
const ScoreRing = ({ score, max = 10 }) => {
  const pct  = score / max;
  const r    = 36;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  const color = pct >= 0.8 ? '#34d399' : pct >= 0.6 ? '#00c896' : pct >= 0.4 ? '#e8a820' : '#f87171';
  return (
    <div style={{ position:'relative', width:90, height:90, flexShrink:0 }}>
      <svg width={90} height={90} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={45} cy={45} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={7}/>
        <circle cx={45} cy={45} r={r} fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition:'stroke-dasharray 1s cubic-bezier(0.22,1,0.36,1)', filter:`drop-shadow(0 0 6px ${color}80)` }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:22, fontWeight:900, color, fontFamily:'var(--mono)', lineHeight:1 }}>{score}</span>
        <span style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)' }}>/{max}</span>
      </div>
    </div>
  );
};

/* ─── collapsible section ─────────────────────────────── */
const Section = ({ icon:Icon, title, color, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderRadius:12, border:`1px solid ${color}18`, overflow:'hidden', marginBottom:10 }}>
      <button onClick={() => setOpen(o=>!o)}
        style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'12px 16px', background:`${color}08`, border:'none', cursor:'pointer' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Icon size={13} style={{ color }}/>
          <span style={{ fontSize:12.5, fontWeight:700, color:'var(--t1)', letterSpacing:'-0.1px' }}>{title}</span>
        </div>
        {open ? <ChevronUp size={13} style={{ color:'var(--t3)' }}/> : <ChevronDown size={13} style={{ color:'var(--t3)' }}/>}
      </button>
      {open && <div style={{ padding:'14px 16px', background:'rgba(255,255,255,0.01)' }}>{children}</div>}
    </div>
  );
};

/* ─── bullet list ─────────────────────────────────────── */
const BulletList = ({ items, color }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
    {(Array.isArray(items) ? items : [items]).map((item, i) => (
      <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
        <div style={{ width:6, height:6, borderRadius:'50%', background:color,
          flexShrink:0, marginTop:6, boxShadow:`0 0 6px ${color}60` }}/>
        <span style={{ fontSize:13, color:'var(--t2)', lineHeight:1.6 }}>{item}</span>
      </div>
    ))}
  </div>
);

/* ─── keyword pill ────────────────────────────────────── */
const Pill = ({ label, color }) => (
  <span style={{ display:'inline-flex', alignItems:'center', padding:'4px 10px', borderRadius:99,
    background:`${color}12`, border:`1px solid ${color}30`, color,
    fontSize:12, fontWeight:600, margin:'3px 4px 3px 0' }}>
    {label}
  </span>
);

/* ─── copy button ─────────────────────────────────────── */
const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (
    <button onClick={copy}
      style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 9px', borderRadius:7,
        border:'1px solid var(--border)', background:'rgba(255,255,255,0.04)',
        color: copied ? '#34d399' : 'var(--t3)', fontSize:11, fontWeight:600, cursor:'pointer', transition:'all 0.15s' }}>
      {copied ? <Check size={11}/> : <Copy size={11}/>}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
};

/* ═══════════════════════════════════════════════════════
   MODAL 1 — RESUME ANALYSIS
═══════════════════════════════════════════════════════ */
export const ResumeAnalysisModal = ({ resume, onClose }) => {
  const [state,  setState]  = useState('loading'); // loading | result | error
  const [data,   setData]   = useState(null);
  const [errMsg, setErrMsg] = useState('');
  const color = '#5aabf0';

  const run = async () => {
    setState('loading'); setErrMsg('');
    try {
      const res  = await aiApi.analyzeResume(resume.id);
      const a    = res?.analysis || res;
      setData(a);
      setState('result');
    } catch(e) {
      setErrMsg(e?.response?.data?.error || e.message || 'Unknown error');
      setState('error');
    }
  };

  useEffect(() => { run(); }, []);

  return (
    <ModalShell onClose={onClose} maxWidth={700}>
      <ModalHeader icon={Sparkles} title="Resume Analysis"
        subtitle={resume.title} color={color} onClose={onClose}/>

      {state === 'loading' && <AILoading label="Analysing your resume…" color={color}/>}
      {state === 'error'   && <AIError msg={errMsg} onRetry={run}/>}
      {state === 'result'  && data && (
        <div style={{ padding:'20px 24px 28px' }}>

          {/* score + summary */}
          <div style={{ display:'flex', alignItems:'center', gap:20, padding:'18px 20px',
            background:'rgba(255,255,255,0.02)', borderRadius:14, border:'1px solid var(--border)', marginBottom:16 }}>
            <ScoreRing score={data.score ?? data.overallScore ?? 0}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)', marginBottom:6 }}>Overall Score</div>
              <div style={{ fontSize:13, color:'var(--t2)', lineHeight:1.6 }}>
                {data.summary || data.overallFeedback || 'Analysis complete.'}
              </div>
            </div>
          </div>

          {/* strengths */}
          {data.strengths?.length > 0 && (
            <Section icon={CheckCircle} title="Strengths" color="#34d399">
              <BulletList items={data.strengths} color="#34d399"/>
            </Section>
          )}

          {/* weaknesses */}
          {data.weaknesses?.length > 0 && (
            <Section icon={AlertTriangle} title="Areas to Improve" color="#e8a820">
              <BulletList items={data.weaknesses} color="#e8a820"/>
            </Section>
          )}

          {/* improvements */}
          {(data.improvements || data.suggestions)?.length > 0 && (
            <Section icon={TrendingUp} title="Actionable Improvements" color={color}>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {(data.improvements || data.suggestions).map((tip, i) => (
                  <div key={i} style={{ display:'flex', gap:12, padding:'10px 12px',
                    background:'rgba(90,171,240,0.05)', borderRadius:9, border:'1px solid rgba(90,171,240,0.12)' }}>
                    <div style={{ width:20, height:20, borderRadius:6, background:`${color}20`,
                      border:`1px solid ${color}30`, display:'flex', alignItems:'center',
                      justifyContent:'center', flexShrink:0, fontSize:10, fontWeight:800,
                      color, fontFamily:'var(--mono)' }}>{i+1}</div>
                    <span style={{ fontSize:13, color:'var(--t2)', lineHeight:1.6 }}>{tip}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* keywords */}
          {data.keywords?.length > 0 && (
            <Section icon={Target} title="Keywords Found" color="#c084fc" defaultOpen={false}>
              <div>{data.keywords.map((k,i) => <Pill key={i} label={k} color="#c084fc"/>)}</div>
            </Section>
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform:rotate(360deg); } } @keyframes aiPulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} } @keyframes robotFloat { 0%,100%{transform:translate(-50%,0)} 50%{transform:translate(-50%,-8px)} } @keyframes eyeBlink { 0%,90%,100%{transform:scaleY(1)} 95%{transform:scaleY(0.1)} } @keyframes antennaPulse { 0%,100%{opacity:0.5;transform:translateX(-50%) scale(0.8)} 50%{opacity:1;transform:translateX(-50%) scale(1.2)} } @keyframes armSwing { 0%,100%{transform:rotate(-8deg)} 50%{transform:rotate(8deg)} }`}</style>
    </ModalShell>
  );
};

/* ═══════════════════════════════════════════════════════
   MODAL 2 — RESUME OPTIMIZATION
═══════════════════════════════════════════════════════ */
export const ResumeOptimizeModal = ({ application, resumes, onClose }) => {
  const [state,     setState]     = useState('pick'); // pick | loading | result | error
  const [resumeId,  setResumeId]  = useState(resumes?.[0]?.id || '');
  const [data,      setData]      = useState(null);
  const [errMsg,    setErrMsg]    = useState('');
  const color = '#00c896';

  const run = async () => {
    if (!resumeId) return;
    setState('loading'); setErrMsg('');
    try {
      const res = await aiApi.optimizeResume(resumeId, application.jobDescription);
      const o   = res?.optimization || res;
      setData(o);
      setState('result');
    } catch(e) {
      setErrMsg(e?.response?.data?.error || e.message || 'Unknown error');
      setState('error');
    }
  };

  return (
    <ModalShell onClose={onClose} maxWidth={740}>
      <ModalHeader icon={Target} title="Optimize Resume for This Job"
        subtitle={`${application.companyName} — ${application.jobTitle}`} color={color} onClose={onClose}/>

      {/* resume picker */}
      {state === 'pick' && (
        <div style={{ padding:'24px' }}>
          {!application.jobDescription ? (
            <div style={{ padding:'32px 20px', textAlign:'center' }}>
              <AlertTriangle size={28} style={{ color:'#e8a820', marginBottom:12, display:'block', margin:'0 auto 12px' }}/>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--t1)', marginBottom:6 }}>No job description found</div>
              <div style={{ fontSize:13, color:'var(--t3)', marginBottom:12 }}>
                Go to this application → Edit → paste the job description → save. Then come back here.
              </div>

            </div>
          ) : resumes?.length === 0 ? (
            <div style={{ padding:'32px 20px', textAlign:'center' }}>
              <AlertTriangle size={28} style={{ color:'#e8a820', marginBottom:12, display:'block', margin:'0 auto 12px' }}/>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--t1)', marginBottom:6 }}>No resumes uploaded</div>
              <div style={{ fontSize:13, color:'var(--t3)' }}>Upload a resume in the Documents page first.</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize:13, color:'var(--t2)', marginBottom:16, lineHeight:1.6 }}>
                Choose which resume to compare against the job description for
                <strong style={{ color:'var(--t1)' }}> {application.companyName}</strong>.
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
                {resumes.map(r => (
                  <div key={r.id} onClick={() => setResumeId(r.id)}
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:11,
                      cursor:'pointer',
                      border:`1px solid ${resumeId===r.id ? color+'50' : 'var(--border)'}`,
                      background: resumeId===r.id ? `${color}0d` : 'rgba(255,255,255,0.02)',
                      transition:'all 0.15s' }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', flexShrink:0,
                      border:`2px solid ${resumeId===r.id ? color : 'var(--t3)'}`,
                      background: resumeId===r.id ? color : 'transparent', transition:'all 0.15s' }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)' }}>{r.title}</div>
                      <div style={{ fontSize:11.5, color:'var(--t3)', marginTop:2 }}>
                        {r._count?.applications || 0} application{r._count?.applications !== 1 ? 's' : ''}
                      </div>
                    </div>
                    {resumeId===r.id && <CheckCircle size={15} style={{ color, flexShrink:0 }}/>}
                  </div>
                ))}
              </div>
              <button onClick={run} disabled={!resumeId}
                style={{ width:'100%', padding:'12px 0', borderRadius:11, border:`1px solid ${color}40`,
                  background:`${color}15`, color, fontSize:14, fontWeight:700, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all 0.18s' }}
                onMouseEnter={e=>e.currentTarget.style.background=`${color}22`}
                onMouseLeave={e=>e.currentTarget.style.background=`${color}15`}>
                <Sparkles size={15}/> Optimise Resume
              </button>
            </>
          )}
        </div>
      )}

      {state === 'loading' && <AILoading label="Comparing resume to job description…" color={color}/>}
      {state === 'error'   && <AIError msg={errMsg} onRetry={run}/>}

      {state === 'result' && data && (
        <div style={{ padding:'20px 24px 28px' }}>

          {/* match score */}
          {(data.matchScore !== undefined || data.compatibilityScore !== undefined) && (
            <div style={{ display:'flex', alignItems:'center', gap:20, padding:'18px 20px',
              background:'rgba(255,255,255,0.02)', borderRadius:14, border:'1px solid var(--border)', marginBottom:16 }}>
              <ScoreRing score={data.matchScore ?? data.compatibilityScore ?? 0} max={100}/>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)', marginBottom:4 }}>Match Score</div>
                <div style={{ fontSize:13, color:'var(--t2)', lineHeight:1.6 }}>
                  {data.summary || data.overallAssessment || ''}
                </div>
              </div>
            </div>
          )}

          {/* missing keywords */}
          {(data.missingKeywords || data.keywords)?.length > 0 && (
            <Section icon={Target} title="Missing Keywords — Add These" color="#f87171">
              <div style={{ marginBottom:4 }}>
                {(data.missingKeywords || data.keywords).map((k,i) => <Pill key={i} label={k} color="#f87171"/>)}
              </div>
            </Section>
          )}

          {/* sections to modify */}
          {(data.sectionsToModify || data.improvements)?.length > 0 && (
            <Section icon={Edit2} title="Sections to Modify" color="#e8a820">
              <BulletList items={data.sectionsToModify || data.improvements} color="#e8a820"/>
            </Section>
          )}

          {/* tailored bullets */}
          {data.tailoredBullets?.length > 0 && (
            <Section icon={ArrowRight} title="Suggested Bullet Points" color={color}>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {data.tailoredBullets.map((b,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
                    gap:10, padding:'10px 12px', background:`${color}06`, borderRadius:9, border:`1px solid ${color}15` }}>
                    <span style={{ fontSize:13, color:'var(--t2)', lineHeight:1.6, flex:1 }}>{b}</span>
                    <CopyBtn text={b}/>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* skills to emphasize */}
          {data.skillsToEmphasize?.length > 0 && (
            <Section icon={Star} title="Skills to Emphasize" color="#c084fc" defaultOpen={false}>
              <div>{data.skillsToEmphasize.map((s,i) => <Pill key={i} label={s} color="#c084fc"/>)}</div>
            </Section>
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform:rotate(360deg); } } @keyframes aiPulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} } @keyframes robotFloat { 0%,100%{transform:translate(-50%,0)} 50%{transform:translate(-50%,-8px)} } @keyframes eyeBlink { 0%,90%,100%{transform:scaleY(1)} 95%{transform:scaleY(0.1)} } @keyframes antennaPulse { 0%,100%{opacity:0.5;transform:translateX(-50%) scale(0.8)} 50%{opacity:1;transform:translateX(-50%) scale(1.2)} } @keyframes armSwing { 0%,100%{transform:rotate(-8deg)} 50%{transform:rotate(8deg)} }`}</style>
    </ModalShell>
  );
};

/* ═══════════════════════════════════════════════════════
   MODAL 3 — INTERVIEW PREP
═══════════════════════════════════════════════════════ */
export const InterviewPrepModal = ({ application, resumes, onClose }) => {
  const [state,    setState]    = useState('loading');
  const [data,     setData]     = useState(null);
  const [errMsg,   setErrMsg]   = useState('');
  const color = '#c084fc';

  const run = async () => {
    setState('loading'); setErrMsg('');
    try {
      // optionally pass first available resume
      const resumeId = resumes?.[0]?.id || null;
      const res  = await aiApi.getInterviewTips(application.id, resumeId);
      const tips = res?.tips || res;
      setData(tips);
      setState('result');
    } catch(e) {
      setErrMsg(e?.response?.data?.error || e.message || 'Unknown error');
      setState('error');
    }
  };

  useEffect(() => { run(); }, []);

  return (
    <ModalShell onClose={onClose} maxWidth={740}>
      <ModalHeader icon={MessageSquare} title="Interview Prep"
        subtitle={`${application.companyName} — ${application.jobTitle}`} color={color} onClose={onClose}/>

      {state === 'loading' && <AILoading label="Generating interview prep…" color={color}/>}
      {state === 'error'   && <AIError msg={errMsg} onRetry={run}/>}

      {state === 'result' && data && (
        <div style={{ padding:'20px 24px 28px' }}>

          {/* likely questions */}
          {(data.questions || data.likelyQuestions)?.length > 0 && (
            <Section icon={MessageSquare} title="Likely Interview Questions" color={color}>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {(data.questions || data.likelyQuestions).map((q, i) => (
                  <div key={i} style={{ borderRadius:10, border:`1px solid ${color}18`, overflow:'hidden' }}>
                    <div style={{ padding:'10px 14px', background:`${color}08`,
                      display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
                      <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                        <span style={{ fontSize:11, fontWeight:800, color, fontFamily:'var(--mono)',
                          background:`${color}20`, border:`1px solid ${color}30`, padding:'2px 7px',
                          borderRadius:99, flexShrink:0, marginTop:1 }}>Q{i+1}</span>
                        <span style={{ fontSize:13, fontWeight:600, color:'var(--t1)', lineHeight:1.5 }}>
                          {typeof q === 'string' ? q : q.question}
                        </span>
                      </div>
                      <CopyBtn text={typeof q === 'string' ? q : q.question}/>
                    </div>
                    {typeof q === 'object' && q.suggestedAnswer && (
                      <div style={{ padding:'10px 14px', fontSize:13, color:'var(--t2)', lineHeight:1.6,
                        borderTop:`1px solid ${color}12` }}>
                        <span style={{ fontSize:11, fontWeight:700, color:'var(--t3)',
                          textTransform:'uppercase', letterSpacing:'0.08em', marginRight:8 }}>Suggested:</span>
                        {q.suggestedAnswer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* key talking points */}
          {(data.keyTalkingPoints || data.talkingPoints)?.length > 0 && (
            <Section icon={Zap} title="Key Talking Points" color="#00c896">
              <BulletList items={data.keyTalkingPoints || data.talkingPoints} color="#00c896"/>
            </Section>
          )}

          {/* company research */}
          {(data.companyResearchTips || data.researchTips)?.length > 0 && (
            <Section icon={BookOpen} title="Company Research Tips" color="#e8a820" defaultOpen={false}>
              <BulletList items={data.companyResearchTips || data.researchTips} color="#e8a820"/>
            </Section>
          )}

          {/* skills to highlight */}
          {data.skillsToHighlight?.length > 0 && (
            <Section icon={Star} title="Skills to Highlight" color="#5aabf0" defaultOpen={false}>
              <div>{data.skillsToHighlight.map((s,i) => <Pill key={i} label={s} color="#5aabf0"/>)}</div>
            </Section>
          )}

          {/* general tips */}
          {(data.generalTips || data.tips)?.length > 0 && (
            <Section icon={TrendingUp} title="General Interview Tips" color={color} defaultOpen={false}>
              <BulletList items={data.generalTips || data.tips} color={color}/>
            </Section>
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform:rotate(360deg); } } @keyframes aiPulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} } @keyframes robotFloat { 0%,100%{transform:translate(-50%,0)} 50%{transform:translate(-50%,-8px)} } @keyframes eyeBlink { 0%,90%,100%{transform:scaleY(1)} 95%{transform:scaleY(0.1)} } @keyframes antennaPulse { 0%,100%{opacity:0.5;transform:translateX(-50%) scale(0.8)} 50%{opacity:1;transform:translateX(-50%) scale(1.2)} } @keyframes armSwing { 0%,100%{transform:rotate(-8deg)} 50%{transform:rotate(8deg)} }`}</style>
    </ModalShell>
  );
};