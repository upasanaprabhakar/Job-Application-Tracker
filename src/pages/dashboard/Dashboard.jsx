import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, ArrowRight, Sparkles, Calendar, BarChart3,
  Upload, Briefcase, Clock, Target, Zap,
  ArrowUpRight, ChevronRight,
} from 'lucide-react';
import { applicationApi } from '../../api/applicationApi';
import useAuthStore from '../../store/authStore';
import MainLayout from '../../components/layout/MainLayout';

/* ─── helpers ─────────────────────────────────────────── */
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};
const timeAgo = (d) => {
  if (!d) return '';
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

/* ─── CompanyLogo ─────────────────────────────────────── */
const CompanyLogo = ({ name, size = 36 }) => {
  const [src, setSrc]     = useState('');
  const [stage, setStage] = useState('clearbit');
  const domain = useCallback((n) => {
    if (!n) return '';
    return n.toLowerCase().trim()
      .replace(/\s+(inc|llc|ltd|corp|co|group|technologies|technology|solutions|services)\.?$/i, '')
      .replace(/[^a-z0-9]/g, '') + '.com';
  }, []);
  useEffect(() => {
    if (!name) { setStage('letter'); return; }
    setSrc(`https://logo.clearbit.com/${domain(name)}`);
    setStage('clearbit');
  }, [name, domain]);
  const onErr = () => {
    if (stage === 'clearbit') { setSrc(`https://www.google.com/s2/favicons?domain=${domain(name)}&sz=128`); setStage('fav'); }
    else setStage('letter');
  };
  const bg = ['#1a2e20','#1a1e2e','#2a1e2e','#2e241a','#1e2a2a'];
  const tc = ['#00c896','#5aabf0','#c084fc','#e8a820','#00d4bb'];
  const idx = (name?.charCodeAt(0) ?? 0) % bg.length;
  const s = { width: size, height: size, minWidth: size, flexShrink: 0 };
  if (!name || stage === 'letter' || !src)
    return <div style={{ ...s, borderRadius: 9, background: bg[idx], display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: size * 0.38, fontWeight: 700, color: tc[idx] }}>{name?.[0]?.toUpperCase() ?? '?'}</span></div>;
  return <img key={src} src={src} alt={name} style={{ ...s, borderRadius: 9, objectFit: 'contain', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }} onError={onErr} />;
};

/* ─── AnimatedNumber ──────────────────────────────────── */
const AnimatedNumber = ({ value, suffix = '' }) => {
  const [n, setN] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const start = performance.now();
    const to = typeof value === 'number' ? value : parseInt(value) || 0;
    const tick = (now) => {
      const p = Math.min((now - start) / 800, 1);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);
  return <>{n}{suffix}</>;
};

/* ─── Sparkline ───────────────────────────────────────── */
const Sparkline = ({ data = [], color = '#00c896', h = 34, w = 80 }) => {
  if (!data || data.length < 2) return <div style={{ height: h, width: w }} />;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - min) / range) * (h - 4)).toFixed(1)}`);
  const gid = `sp${color.replace('#','')}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.14" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill={`url(#${gid})`} />
      <polyline points={pts.join(' ')} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ─── DonutRing ───────────────────────────────────────── */
const DonutRing = ({ pct = 0, size = 44, stroke = 4, color = '#00c896' }) => {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r, dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease' }} />
    </svg>
  );
};

/* ─── StatCard ────────────────────────────────────────── */
const StatCard = ({ label, value, suffix='', meta, metaGreen, icon: Icon, delay=0, children }) => (
  <div className="card au" style={{ padding:'20px 20px 16px', animationDelay:`${delay}ms`, transition:'border-color 0.18s, transform 0.18s, box-shadow 0.18s' }}
    onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.11)'; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(0,0,0,0.25)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; }}
  >
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
      <span style={{ fontSize:10.5, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.09em' }}>{label}</span>
      {Icon && (
        <div style={{ width:28, height:28, borderRadius:7, background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={13} style={{ color:'var(--t2)' }} strokeWidth={1.8} />
        </div>
      )}
    </div>
    <div style={{ fontSize:38, fontWeight:800, color:'var(--t1)', letterSpacing:'-1.8px', lineHeight:1, marginBottom:5 }}>
      <AnimatedNumber value={typeof value==='number'?value:parseInt(value)||0} suffix={suffix} />
    </div>
    {meta && <div style={{ fontSize:11.5, fontWeight:500, color: metaGreen ? 'var(--accent)' : 'var(--t3)', marginBottom:10 }}>{meta}</div>}
    {children}
  </div>
);

/* ─── FunnelRow ───────────────────────────────────────── */
const FunnelRow = ({ label, count, max, color }) => {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div style={{ marginBottom:13 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:color, flexShrink:0 }} />
          <span style={{ fontSize:12.5, color:'var(--t2)', fontWeight:500 }}>{label}</span>
        </div>
        <span style={{ fontSize:12.5, fontWeight:700, color:'var(--t1)', fontFamily:'var(--mono)' }}>{count}</span>
      </div>
      <div style={{ height:4, background:'rgba(255,255,255,0.05)', borderRadius:99, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, borderRadius:99, background:color, transition:'width 0.7s cubic-bezier(0.22,1,0.36,1)' }} />
      </div>
    </div>
  );
};

/* ─── status helpers ──────────────────────────────────── */
const sClass = (s) => ({ applied:'b-applied', screening:'b-screening', interviewing:'b-interviewing', offer:'b-offer', accepted:'b-accepted', rejected:'b-rejected', withdrawn:'b-withdrawn' })[s?.toLowerCase()] || 'b-withdrawn';
const sLabel = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : 'Applied';

/* ═══════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════ */
const Dashboard = () => {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats:   { total:0, inProgress:0, offers:0, responseRate:0 },
    recent:  [],
    funnel:  [
      { label:'Applied',    count:0, color:'#e8a820' },
      { label:'Screening',  count:0, color:'#5aabf0' },
      { label:'Interviews', count:0, color:'#00c896' },
      { label:'Offers',     count:0, color:'#c084fc' },
    ],
    weekAct: Array(7).fill(false),
    insight: { type:'tip', text:'Start tracking your applications to see personalized insights.' },
    sparkApps: [1,1,2,2,3,3,4,4,5,6,7,8],
    sparkProg: [0,0,1,1,1,2,2,2,3,3,4,5],
  });

  const firstName = (user?.name || 'there').split(' ')[0];

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // Fetch recent apps (for display) + all apps (for accurate counts) in parallel
        const [sRes, aRes, allRes] = await Promise.all([
          applicationApi.getStatistics(),
          applicationApi.getAllApplications({ limit:6, sort:'-createdAt' }),
          applicationApi.getAllApplications({ limit:500 }),
        ]);

        // recent 6 for the feed
        const apps    = aRes?.data?.applications || aRes?.applications || aRes?.data || [];
        // full list for counts, weekAct, response rate
        const allApps = allRes?.data?.applications || allRes?.applications || allRes?.data || apps;

        // Count statuses directly from full app list (always accurate, never stale)
        let screening=0, inProgress=0, offers=0, accepted=0, rejected=0;
        let rateResponded = 0;
        // dedupe by id in case API returns overlapping pages
        const seen = new Set();
        const allArr = (Array.isArray(allApps) ? allApps : []).filter(a => {
          const id = a._id || a.id;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        allArr.forEach(a => {
          const s = (a.status || 'applied').toLowerCase();
          if (s === 'screening')         { screening++;  rateResponded++; }
          else if (s === 'interviewing') { inProgress++; rateResponded++; }
          else if (s === 'offer')        { offers++;     rateResponded++; }
          else if (s === 'accepted')     { accepted++;   rateResponded++; }
          else if (s === 'rejected')     {               rateResponded++; }
        });
        // exclude withdrawn from total so rate matches AnalyticsPage
        const total    = allArr.filter(a => (a.status||'').toLowerCase() !== 'withdrawn').length;
        const rateNum  = total > 0 ? Math.round((rateResponded / total) * 100) : 0;

        // This Week tracker — Mon–Sun, using full app list
        const today     = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (today.getDay()===0?6:today.getDay()-1));
        weekStart.setHours(0,0,0,0);
        const weekAct = Array.from({ length:7 }, (_,i) => {
          const d = new Date(weekStart);
          d.setDate(weekStart.getDate() + i);
          const dStr = d.toDateString();
          return allArr.some(a => new Date(a.applicationDate||a.createdAt).toDateString() === dStr);
        });

        const normalize = (a) => ({
          id:       a._id||a.id,
          company:  a.companyName||a.company||'',
          position: a.jobTitle||a.position||a.title||'',
          status:   a.status||'applied',
          date:     a.applicationDate||a.createdAt,
        });

        const totalAll = allArr.length;

        // ── Build a prioritised list of insights, pick the most relevant ──
        const insights = [];

        // 0 apps
        if (totalAll === 0) {
          insights.push({ type:'tip', text: 'Add your first application to start tracking your job search.' });
        }

        // Offer/accepted — celebrate
        if (accepted > 0) {
          insights.push({ type:'win', text: `You have ${accepted} accepted offer${accepted>1?'s':''}. Congratulations on landing the role!` });
        }
        if (offers > 0 && accepted === 0) {
          insights.push({ type:'win', text: `You have ${offers} offer${offers>1?'s':''} in hand — a great position to negotiate from.` });
        }

        // Active interviews
        if (inProgress >= 3) {
          insights.push({ type:'hot', text: `${inProgress} active interviews running in parallel. Stay organised and keep your notes updated.` });
        }

        // Response rate
        if (rateNum > 25) {
          insights.push({ type:'win', text: `${rateNum}% response rate — more than double the 12% industry average. Your applications are clearly resonating.` });
        } else if (rateNum > 12) {
          insights.push({ type:'win', text: `${rateNum}% response rate, above the 12% industry average. Keep up the momentum.` });
        } else if (rateNum > 0 && rateNum <= 8 && totalAll >= 5) {
          insights.push({ type:'tip', text: `${rateNum}% response rate across ${totalAll} applications. Try tailoring your resume more closely to each job description.` });
        }

        // No follow-up dates set
        const noFollowUp = allArr.filter(a => !a.followUpDate && ['applied','screening'].includes((a.status||'').toLowerCase())).length;
        if (noFollowUp >= 3) {
          insights.push({ type:'action', text: `${noFollowUp} applications have no follow-up date. Set reminders so nothing slips through the cracks.` });
        }

        // Stale applications (>14 days, still applied)
        const stale = allArr.filter(a => {
          const days = (Date.now() - new Date(a.applicationDate||a.createdAt)) / 86400000;
          return days > 14 && (a.status||'').toLowerCase() === 'applied';
        }).length;
        if (stale >= 2) {
          insights.push({ type:'action', text: `${stale} applications haven't moved in over 14 days. Consider following up or marking them as withdrawn.` });
        }

        // Rejection rate high
        const rejRate = total > 0 ? Math.round((rejected / total) * 100) : 0;
        if (rejRate > 50 && total >= 5) {
          insights.push({ type:'tip', text: `${rejRate}% rejection rate across ${total} applications. Fewer, better-targeted applications tend to outperform high-volume spraying.` });
        }

        // Only applying, no screening movement
        if (totalAll >= 8 && screening === 0 && inProgress === 0) {
          insights.push({ type:'tip', text: `${totalAll} applications tracked but no screenings yet. Try reaching out directly to hiring managers on LinkedIn after applying.` });
        }

        // Good velocity this week
        const weekCount = weekAct.filter(Boolean).length;
        if (weekCount >= 4 && totalAll > 0) {
          insights.push({ type:'hot', text: `Applied on ${weekCount} days this week — strong consistency. Applicants who apply daily are twice as likely to land interviews.` });
        }

        // Fallback
        if (insights.length === 0) {
          insights.push({ type:'tip', text: 'Keep applying consistently. Most responses arrive within 1–2 weeks of submitting.' });
        }

        // Pick highest priority: win > hot > action > tip
        const priority = { win:0, hot:1, action:2, tip:3 };
        const insight = insights.sort((a,b) => priority[a.type] - priority[b.type])[0];

        setData({
          stats: { total: allArr.length, inProgress, offers: offers + accepted, responseRate:rateNum },
          recent: Array.isArray(apps) ? apps.slice(0,6).map(normalize) : [],
          funnel: [
            { label:'Applied',    count:allArr.length, color:'#e8a820' },
            { label:'Screening',  count:screening,     color:'#5aabf0' },
            { label:'Interviews', count:inProgress,    color:'#00c896' },
            { label:'Offers',     count:offers,        color:'#c084fc' },
          ],
          weekAct, insight: insight,
          sparkApps: Array.from({length:12},(_,i) => Math.max(1, Math.round(total*(i+1)/12))),
          sparkProg: Array.from({length:12},(_,i) => Math.max(0, Math.round(inProgress*(i+1)/12))),
        });
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const funnelMax = Math.max(...data.funnel.map(f => f.count), 1);
  const days      = ['M','T','W','T','F','S','S'];
  const todayIdx  = new Date().getDay()===0 ? 6 : new Date().getDay()-1;
  const rateUp    = data.stats.responseRate >= 12;
  const rateLabel = data.stats.responseRate >= 20 ? 'Excellent' : data.stats.responseRate >= 12 ? 'Above average' : 'Below average';

  /* skeleton */
  if (loading) return (
    <MainLayout title="Dashboard">
      <div style={{ maxWidth:1160 }}>
        <div style={{ marginBottom:24 }}>
          <div className="skel" style={{ width:200, height:24, borderRadius:6, marginBottom:10 }} />
          <div className="skel" style={{ width:170, height:18, borderRadius:99 }} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:12 }}>
          {[0,1,2,3].map(i => (
            <div key={i} className="card" style={{ padding:'20px 20px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                <div className="skel" style={{ width:'50%', height:10, borderRadius:4 }} />
                <div className="skel" style={{ width:28, height:28, borderRadius:7 }} />
              </div>
              <div className="skel" style={{ width:'38%', height:36, borderRadius:5, marginBottom:6 }} />
              <div className="skel" style={{ width:'55%', height:10, borderRadius:4, marginBottom:10 }} />
              <div className="skel" style={{ width:'100%', height:34, borderRadius:4 }} />
            </div>
          ))}
        </div>
        <div className="skel" style={{ height:44, borderRadius:10, marginBottom:12 }} />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:18 }}>
          {[0,1,2,3].map(i => <div key={i} className="skel" style={{ height:44, borderRadius:10 }} />)}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:12 }}>
          <div className="card" style={{ overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)' }}>
              <div className="skel" style={{ width:160, height:14, borderRadius:4 }} />
            </div>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{ display:'flex', gap:12, alignItems:'center', padding:'12px 20px', borderBottom: i<4?'1px solid var(--border)':'none' }}>
                <div className="skel" style={{ width:36, height:36, borderRadius:9, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div className="skel" style={{ width:'42%', height:13, borderRadius:4, marginBottom:6 }} />
                  <div className="skel" style={{ width:'26%', height:11, borderRadius:4 }} />
                </div>
                <div className="skel" style={{ width:74, height:20, borderRadius:99 }} />
              </div>
            ))}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div className="card" style={{ padding:'16px 18px' }}>
              <div className="skel" style={{ width:80, height:14, borderRadius:4, marginBottom:18 }} />
              {[0,1,2,3].map(i => (
                <div key={i} style={{ marginBottom:13 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <div className="skel" style={{ width:'36%', height:12, borderRadius:4 }} />
                    <div className="skel" style={{ width:'10%', height:12, borderRadius:4 }} />
                  </div>
                  <div className="skel" style={{ width:'100%', height:4, borderRadius:99 }} />
                </div>
              ))}
            </div>
            <div className="card" style={{ padding:'16px 18px', flex:1 }}>
              <div className="skel" style={{ width:90, height:14, borderRadius:4, marginBottom:16 }} />
              <div style={{ display:'flex', alignItems:'flex-end', gap:5 }}>
                {[0,1,2,3,4,5,6].map(i => <div key={i} className="skel" style={{ flex:1, height:12, borderRadius:5 }} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout title="Dashboard">
      <div style={{ maxWidth:1160 }}>

        {/* GREETING */}
        <div className="au" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:24 }}>
          <div>
            <h1 style={{ margin: 0, marginBottom: 10, lineHeight: 1.1 }}>
              <span style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'var(--font)',
                color: 'var(--accent)',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                marginBottom: 6,
                opacity: 0.85,
              }}>
                {getGreeting()}
              </span>
              <span style={{
                display: 'block',
                fontSize: 42,
                fontWeight: 700,
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic',
                background: 'linear-gradient(95deg, #ffffff 0%, #00c896 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.5px',
                lineHeight: 1,
              }}>
                {firstName}<span style={{ WebkitTextFillColor: 'var(--accent)', color: 'var(--accent)' }}>.</span>
              </span>
            </h1>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px', background:'var(--card)', border:'1px solid var(--border)', borderRadius:99 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', flexShrink:0 }} />
              <span style={{ fontSize:12.5, color:'var(--t2)' }}>
                <strong style={{ color:'var(--t1)', fontWeight:600 }}>{data.stats.inProgress}</strong> active interviews
                <span style={{ color:'var(--t3)', margin:'0 5px' }}>·</span>
                <strong style={{ color:'var(--t1)', fontWeight:600 }}>{data.stats.total}</strong> total tracked
              </span>
            </div>
          </div>
          <button
            className="au d1"
            onClick={() => navigate('/applications/new')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '9px 20px',
              fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font)',
              color: 'var(--accent)',
              background: 'rgba(0,200,150,0.08)',
              border: '1px solid rgba(0,200,150,0.25)',
              borderRadius: 'var(--rs)',
              cursor: 'pointer', flexShrink: 0,
              transition: 'background 0.18s, border-color 0.18s, transform 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background  = 'rgba(0,200,150,0.14)';
              e.currentTarget.style.borderColor = 'rgba(0,200,150,0.5)';
              e.currentTarget.style.transform   = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background  = 'rgba(0,200,150,0.08)';
              e.currentTarget.style.borderColor = 'rgba(0,200,150,0.25)';
              e.currentTarget.style.transform   = 'translateY(0)';
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Track New Job
          </button>
        </div>

        {/* STAT CARDS */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:12 }}>

          <StatCard label="Total Applications" value={data.stats.total} icon={Briefcase} delay={0}
            meta={data.stats.total > 0 ? `${data.stats.total} tracked overall` : 'None yet'}>
            <Sparkline data={data.sparkApps} color="var(--accent)" />
          </StatCard>

          <StatCard label="Response Rate" value={data.stats.responseRate} suffix="%" icon={Target} delay={50}
            meta={rateLabel} metaGreen={rateUp}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:2 }}>
              <DonutRing pct={data.stats.responseRate} color={rateUp ? 'var(--accent)' : '#f87171'} />
              <div>
                <div style={{ fontSize:10, color:'var(--t3)', marginBottom:2 }}>Industry avg</div>
                <div style={{ fontSize:12.5, fontWeight:700, color:'var(--t2)' }}>12%</div>
              </div>
            </div>
          </StatCard>

          <StatCard label="Active Interviews" value={data.stats.inProgress} icon={Clock} delay={100}
            meta={data.stats.inProgress > 0 ? 'Currently in progress' : 'None in progress'}>
            <Sparkline data={data.sparkProg} color="#e8a820" />
          </StatCard>

          <StatCard label="Offers Received" value={data.stats.offers} icon={Zap} delay={150}
            meta={data.stats.offers > 0 ? 'Offers in hand' : 'Keep applying'}>
            <div style={{ display:'flex', gap:4, marginTop:6 }}>
              {Array.from({length:5}).map((_,i) => (
                <div key={i} style={{ flex:1, height:3, borderRadius:99, background: i < data.stats.offers ? '#c084fc' : 'rgba(255,255,255,0.07)', transition:'background 0.3s' }} />
              ))}
            </div>
            <div style={{ fontSize:10.5, color:'var(--t3)', marginTop:5 }}>Target: 5 offers</div>
          </StatCard>

        </div>

        {/* INSIGHT */}
        {(() => {
          const ins = data.insight;
          if (!ins) return null;
          const cfg = {
            win:    { color:'#00c896', bg:'rgba(0,200,150,0.06)',   border:'rgba(0,200,150,0.2)',   label:'WIN'      },
            hot:    { color:'#e8a820', bg:'rgba(232,168,32,0.06)',  border:'rgba(232,168,32,0.2)',  label:'TRENDING' },
            action: { color:'#5aabf0', bg:'rgba(90,171,240,0.06)', border:'rgba(90,171,240,0.2)',  label:'ACTION'   },
            tip:    { color:'#c084fc', bg:'rgba(192,132,252,0.06)',border:'rgba(192,132,252,0.2)', label:'TIP'      },
          };
          const { color, bg, border, label } = cfg[ins.type] || cfg.tip;
          return (
            <div className="au d2" style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:bg, border:`1px solid ${border}`, borderRadius:10, marginBottom:12 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:color, boxShadow:`0 0 8px ${color}`, flexShrink:0 }} />
              <span style={{ fontSize:10, fontWeight:800, color, textTransform:'uppercase', letterSpacing:'0.12em', flexShrink:0, fontFamily:'var(--mono)' }}>{label}</span>
              <span style={{ width:1, height:14, background:border, flexShrink:0 }} />
              <span style={{ fontSize:13, color:'var(--t1)', lineHeight:1.5 }}>{ins.text}</span>
            </div>
          );
        })()}

        {/* QUICK ACTIONS */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:18 }}>
          {[
            { icon:Plus,      label:'Add Application',   path:'/applications/new' },
            { icon:Calendar,  label:'Schedule Interview', path:'/calendar' },
            { icon:Upload,    label:'Upload Resume',      path:'/documents' },
            { icon:BarChart3, label:'View Analytics',     path:'/analytics' },
          ].map(({ icon:Icon, label, path }, i) => (
            <button key={label} className="au" onClick={() => navigate(path)}
              style={{ animationDelay:`${80+i*30}ms`, display:'flex', alignItems:'center', gap:8, padding:'9px 14px', background:'var(--card)', border:'1px solid var(--border)', borderRadius:9, color:'var(--t2)', fontSize:13, fontWeight:500, cursor:'pointer', transition:'color 0.15s, border-color 0.15s, background 0.15s', textAlign:'left' }}
              onMouseEnter={e => { e.currentTarget.style.color='var(--t1)'; e.currentTarget.style.borderColor='var(--border-up)'; e.currentTarget.style.background='var(--card-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.color='var(--t2)'; e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--card)'; }}
            >
              <Icon size={13} style={{ color:'var(--accent)', flexShrink:0 }} strokeWidth={2} />
              <span style={{ flex:1 }}>{label}</span>
              <ArrowUpRight size={11} style={{ color:'var(--t3)', flexShrink:0 }} />
            </button>
          ))}
        </div>

        {/* MAIN GRID */}
        <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:12 }}>

          {/* recent applications */}
          <div className="card au d3" style={{ overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)' }}>Recent Applications</span>
                {data.recent.length > 0 && (
                  <span style={{ fontSize:11, fontWeight:600, color:'var(--t3)', background:'rgba(255,255,255,0.05)', border:'1px solid var(--border)', padding:'1px 7px', borderRadius:99 }}>
                    {data.recent.length}
                  </span>
                )}
              </div>
              <button onClick={() => navigate('/applications')}
                style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:600, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', transition:'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity='0.7'}
                onMouseLeave={e => e.currentTarget.style.opacity='1'}>
                View all <ArrowRight size={12} />
              </button>
            </div>

            {data.recent.length > 0 ? data.recent.map((app, i) => (
              <div key={app.id||i} className="au" onClick={() => navigate(`/applications/${app.id}`)}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom: i<data.recent.length-1?'1px solid var(--border)':'none', cursor:'pointer', transition:'background 0.13s', animationDelay:`${i*40+160}ms` }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.022)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}
              >
                <CompanyLogo name={app.company} size={36} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{app.position}</div>
                  <div style={{ fontSize:12, color:'var(--t2)', marginTop:2 }}>{app.company}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:9, flexShrink:0 }}>
                  <span style={{ fontSize:11, color:'var(--t3)' }}>{timeAgo(app.date)}</span>
                  <span className={`badge ${sClass(app.status)}`}>{sLabel(app.status)}</span>
                  <ChevronRight size={12} style={{ color:'var(--t3)' }} />
                </div>
              </div>
            )) : (
              <div style={{ padding:'48px 20px', textAlign:'center' }}>
                <div style={{ width:46, height:46, borderRadius:11, background:'var(--bg-raised)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                  <Briefcase size={19} style={{ color:'var(--t3)' }} />
                </div>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--t1)', marginBottom:5 }}>No applications yet</div>
                <div style={{ fontSize:13, color:'var(--t2)', marginBottom:18 }}>Start tracking your job search today</div>
                <button className="btn-p" onClick={() => navigate('/applications/new')} style={{ fontSize:13, padding:'8px 16px' }}>
                  <Plus size={13} /> Add first application
                </button>
              </div>
            )}
          </div>

          {/* right column */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

            {/* pipeline */}
            <div className="card au d4" style={{ padding:'16px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <span style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)' }}>Pipeline</span>
                <button onClick={() => navigate('/analytics')}
                  style={{ fontSize:11.5, fontWeight:600, color:'var(--t3)', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:3, transition:'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color='var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.color='var(--t3)'}>
                  Analytics <ArrowUpRight size={11} />
                </button>
              </div>
              {data.funnel.map(item => <FunnelRow key={item.label} {...item} max={funnelMax} />)}
              <div style={{ paddingTop:10, borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:11, color:'var(--t3)' }}>Offer conversion</span>
                <span style={{ fontSize:12, fontWeight:700, color:'var(--t1)', fontFamily:'var(--mono)' }}>
                  {data.stats.total > 0 ? Math.round((data.stats.offers/data.stats.total)*100) : 0}%
                </span>
              </div>
            </div>

            {/* this week */}
            <div className="card au d5" style={{ padding:'16px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <span style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)' }}>This Week</span>
                <span style={{ fontSize:11.5, color:'var(--t3)' }}>{data.weekAct.filter(Boolean).length} active days</span>
              </div>
              <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:4 }}>
                {days.map((d,i) => (
                  <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, flex:1 }}>
                    <div style={{
                      width:'100%', maxWidth:28,
                      height: data.weekAct[i] ? 28 : 11,
                      borderRadius:5,
                      background: data.weekAct[i] ? 'var(--accent)' : i===todayIdx ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.04)',
                      border: i===todayIdx && !data.weekAct[i] ? '1px solid rgba(255,255,255,0.09)' : '1px solid transparent',
                      transition:'height 0.35s cubic-bezier(0.22,1,0.36,1)',
                    }} />
                    <span style={{ fontSize:10, fontWeight: i===todayIdx?700:500, color: i===todayIdx?'var(--t1)':'var(--t3)' }}>{d}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:11, color:'var(--t3)' }}>Applications this week</span>
                <span style={{ fontSize:12, fontWeight:700, color:'var(--t1)', fontFamily:'var(--mono)' }}>{data.weekAct.filter(Boolean).length}</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default Dashboard;