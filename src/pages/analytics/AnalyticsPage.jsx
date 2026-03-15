import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Minus, Users, Target,
  Award, Clock, ChevronRight, ArrowUpRight, ArrowDownRight,
  BarChart2, RefreshCw,
} from 'lucide-react';
import { applicationApi } from '../../api/applicationApi';
import MainLayout from '../../components/layout/MainLayout';

/* ─── palette ─────────────────────────────────────────── */
const STATUS_CFG = {
  applied:      { label:'Applied',      color:'#e8a820', bg:'rgba(232,168,32,0.12)',  border:'rgba(232,168,32,0.25)'  },
  screening:    { label:'Screening',    color:'#5aabf0', bg:'rgba(90,171,240,0.12)',  border:'rgba(90,171,240,0.25)'  },
  interviewing: { label:'Interviewing', color:'#00c896', bg:'rgba(0,200,150,0.12)',   border:'rgba(0,200,150,0.25)'   },
  offer:        { label:'Offer',        color:'#c084fc', bg:'rgba(192,132,252,0.12)', border:'rgba(192,132,252,0.25)' },
  accepted:     { label:'Accepted',     color:'#60a5fa', bg:'rgba(96,165,250,0.12)',  border:'rgba(96,165,250,0.25)'  },
  rejected:     { label:'Rejected',     color:'#f87171', bg:'rgba(248,113,113,0.12)', border:'rgba(248,113,113,0.25)' },
  withdrawn:    { label:'Withdrawn',    color:'#5a5a72', bg:'rgba(90,90,114,0.12)',   border:'rgba(90,90,114,0.25)'   },
};

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ─── helpers ─────────────────────────────────────────── */
const toDate   = (v) => { if (!v) return null; try { const d=new Date(v); return isNaN(d)?null:d; } catch { return null; } };
const pct      = (n, total) => total > 0 ? Math.round((n/total)*100) : 0;
const fmtNum   = (n) => n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n);

/* ─── extract list from any api response shape ─────────── */
const extractList = (res) => {
  for (const c of [res?.applications, res?.data?.applications, res?.data?.data, res?.data, res]) {
    if (Array.isArray(c)) return c;
  }
  return [];
};

const extractStats = (res) => res?.data || res || {};

/* ─── normalize ───────────────────────────────────────── */
const norm = (a) => ({
  id:              a._id || a.id,
  company:         a.companyName || a.company  || 'Unknown',
  position:        a.jobTitle    || a.position || a.title || '',
  status:          (a.status || 'applied').toLowerCase(),
  applicationDate: toDate(a.applicationDate || a.appliedDate || a.createdAt),
  salaryRange:     a.salaryRange || '',
  location:        a.location    || '',
});

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════ */

/* ─── Animated Counter ────────────────────────────────── */
const Counter = ({ value, suffix = '', duration = 900 }) => {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const start = performance.now();
    const from  = 0;
    const to    = parseFloat(value) || 0;
    const tick  = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * ease));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);
  return <>{display}{suffix}</>;
};

/* ─── Stat Card ──────────────────────────────────────── */
const StatCard = ({ label, value, suffix='', sub, icon:Icon, color, trend, delay=0 }) => {
  const trendUp = trend > 0, trendFlat = trend === 0;
  const TrendIcon = trendFlat ? Minus : trendUp ? ArrowUpRight : ArrowDownRight;
  const trendColor = trendFlat ? 'var(--t3)' : trendUp ? '#34d399' : '#f87171';
  return (
    <div className="card au lift" style={{ padding:'20px 22px', animationDelay:`${delay}ms`, position:'relative', overflow:'hidden' }}>
      {/* faint bg glow */}
      <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%', background:color, opacity:0.06, filter:'blur(20px)', pointerEvents:'none' }}/>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
        <span style={{ fontSize:10.5, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.1em' }}>{label}</span>
        <div style={{ width:30, height:30, borderRadius:8, background:`${color}18`, border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={13} style={{ color }}/>
        </div>
      </div>
      <div style={{ fontSize:32, fontWeight:800, color:'var(--t1)', fontFamily:'var(--mono)', letterSpacing:'-1px', lineHeight:1, marginBottom:8 }}>
        <Counter value={value} suffix={suffix}/>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        {trend !== undefined && (
          <div style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'2px 7px', borderRadius:99, background:`${trendColor}15`, border:`1px solid ${trendColor}30` }}>
            <TrendIcon size={10} style={{ color:trendColor }}/>
            <span style={{ fontSize:10.5, fontWeight:600, color:trendColor }}>{Math.abs(trend)}%</span>
          </div>
        )}
        {sub && <span style={{ fontSize:11.5, color:'var(--t3)' }}>{sub}</span>}
      </div>
    </div>
  );
};

/* ─── Donut Chart ─────────────────────────────────────── */
const DonutChart = ({ data, total, onHover, hovered }) => {
  const R = 68, stroke = 16, cx = 92, cy = 92;
  const GAP_DEG = 3; // gap between segments in degrees
  const circumference = 2 * Math.PI * R;
  const gapArc = (GAP_DEG / 360) * circumference;

  const segments = useMemo(() => {
    const totalGap = gapArc * data.length;
    const available = circumference - totalGap;
    let offset = -circumference / 4;
    return data.map((d) => {
      const dash = (d.value / total) * available;
      const seg  = { ...d, dash, offset };
      offset += dash + gapArc;
      return seg;
    });
  }, [data, total, circumference, gapArc]);

  // which segment is hovered — show its label/pct in center
  const activeSegment = hovered ? data.find(d => d.key === hovered) : null;
  const activePct = activeSegment ? Math.round((activeSegment.value / total) * 100) : null;

  return (
    <svg width={184} height={184} style={{ overflow:'visible', display:'block' }}>
      <defs>
        {data.map((d) => (
          <filter key={`glow-${d.key}`} id={`glow-${d.key}`}>
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        ))}
        <filter id="donut-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="6" floodOpacity="0.4"/>
        </filter>
      </defs>

      {/* track ring */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke + 2}/>

      {segments.map((s, i) => {
        const isHov = hovered === s.key;
        const isDim = hovered && !isHov;
        return (
          <g key={i}>
            {/* glow layer when hovered */}
            {isHov && (
              <circle cx={cx} cy={cy} r={R} fill="none"
                stroke={s.color} strokeWidth={stroke + 8}
                strokeDasharray={`${s.dash} ${circumference - s.dash}`}
                strokeDashoffset={-s.offset}
                strokeLinecap="round"
                style={{ opacity:0.15, pointerEvents:'none' }}
              />
            )}
            {/* main segment */}
            <circle cx={cx} cy={cy} r={R} fill="none"
              stroke={s.color}
              strokeWidth={isHov ? stroke + 3 : stroke}
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              strokeDashoffset={-s.offset}
              strokeLinecap="round"
              style={{
                cursor:'pointer',
                transition:'stroke-width 0.25s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease',
                opacity: isDim ? 0.2 : 1,
                filter: isHov ? `drop-shadow(0 0 6px ${s.color}80)` : 'none',
              }}
              onMouseEnter={() => onHover(s.key)}
              onMouseLeave={() => onHover(null)}
            />
          </g>
        );
      })}

      {/* center: animate between total and hovered segment info */}
      {activeSegment ? (
        <>
          <text x={cx} y={cy - 10} textAnchor="middle" fill={activeSegment.color}
            fontSize="26" fontWeight="800" fontFamily="var(--mono)" style={{ transition:'all 0.2s' }}>
            {activePct}%
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill={activeSegment.color}
            fontSize="10" fontWeight="600" opacity="0.8">
            {activeSegment.label}
          </text>
          <text x={cx} y={cy + 26} textAnchor="middle" fill="var(--t3)" fontSize="9.5">
            {activeSegment.value} apps
          </text>
        </>
      ) : (
        <>
          <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--t1)"
            fontSize="30" fontWeight="800" fontFamily="var(--mono)" letterSpacing="-1">
            {total}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--t3)"
            fontSize="9.5" fontWeight="700" letterSpacing="1.5">
            TOTAL
          </text>
        </>
      )}
    </svg>
  );
};

/* ─── smooth cubic bezier path helper ────────────────── */
const smoothPath = (pts, getX, getY) => {
  if (pts.length < 2) return pts.map((v,i) => `${i===0?'M':'L'} ${getX(i)} ${getY(v)}`).join(' ');
  let d = `M ${getX(0)} ${getY(pts[0])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const x0 = getX(i),   y0 = getY(pts[i]);
    const x1 = getX(i+1), y1 = getY(pts[i+1]);
    const cpx = (x0 + x1) / 2;
    d += ` C ${cpx} ${y0}, ${cpx} ${y1}, ${x1} ${y1}`;
  }
  return d;
};

/* ─── Line Chart ──────────────────────────────────────── */
const LineChart = ({ data, height = 180 }) => {
  const [tooltip,  setTooltip]  = useState(null);
  const [mousePos, setMousePos] = useState(null);
  const svgRef = useRef(null);
  const padding = { top:24, right:20, bottom:36, left:40 };

  const { points, maxVal } = useMemo(() => {
    if (!data.length) return { points:[], maxVal:1 };
    const vals = data.map(d => d.value);
    return { points: vals, maxVal: Math.max(...vals, 1) };
  }, [data]);

  const svgW = 600, svgH = height;
  const chartW = svgW - padding.left - padding.right;
  const chartH = svgH - padding.top  - padding.bottom;

  const getX = (i)   => padding.left + (points.length < 2 ? chartW/2 : (i / (points.length - 1)) * chartW);
  const getY = (val) => padding.top  + chartH - (val / maxVal) * chartH;

  const linePath = smoothPath(points, getX, getY);
  const areaPath = points.length
    ? `${linePath} L ${getX(points.length-1)} ${padding.top+chartH} L ${getX(0)} ${padding.top+chartH} Z`
    : '';

  // nice y ticks — max 4
  const yTicks = useMemo(() => {
    const step = Math.ceil(maxVal / 4) || 1;
    const ticks = [];
    for (let v = 0; v <= maxVal; v += step) ticks.push(v);
    if (ticks[ticks.length-1] < maxVal) ticks.push(maxVal);
    return ticks.slice(0,5);
  }, [maxVal]);

  // find nearest point on mouse move
  const handleMouseMove = (e) => {
    const svg = svgRef.current;
    if (!svg || !points.length) return;
    const rect = svg.getBoundingClientRect();
    const mx   = ((e.clientX - rect.left) / rect.width) * svgW;
    let nearest = 0, nearestDist = Infinity;
    points.forEach((_, i) => {
      const d = Math.abs(getX(i) - mx);
      if (d < nearestDist) { nearestDist = d; nearest = i; }
    });
    if (nearestDist < 40) {
      setTooltip({ i:nearest, x:getX(nearest), y:getY(points[nearest]), val:points[nearest], label:data[nearest]?.label });
    } else {
      setTooltip(null);
    }
  };

  const peak = points.indexOf(Math.max(...points));

  return (
    <div style={{ position:'relative', width:'100%' }}>
      <svg ref={svgRef} viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ width:'100%', height, overflow:'visible', cursor:'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="lg-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#00c896" stopOpacity="0.22"/>
            <stop offset="60%"  stopColor="#00c896" stopOpacity="0.06"/>
            <stop offset="100%" stopColor="#00c896" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="lg-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#009e78"/>
            <stop offset="50%"  stopColor="#00c896"/>
            <stop offset="100%" stopColor="#00d4aa"/>
          </linearGradient>
          <filter id="line-glow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <clipPath id="chart-clip">
            <rect x={padding.left} y={padding.top} width={chartW} height={chartH}/>
          </clipPath>
        </defs>

        {/* horizontal grid */}
        {yTicks.map((val) => {
          const y = getY(val);
          return (
            <g key={val}>
              <line x1={padding.left} y1={y} x2={padding.left+chartW} y2={y}
                stroke={val===0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}
                strokeWidth="1" strokeDasharray={val===0?'none':'4 6'}/>
              <text x={padding.left - 8} y={y + 4} textAnchor="end"
                fill="var(--t3)" fontSize="9.5" fontFamily="var(--mono)" fontWeight="500">{val}</text>
            </g>
          );
        })}

        {/* x-axis labels */}
        {data.map((d, i) => (
          <text key={i} x={getX(i)} y={svgH - 8} textAnchor="middle"
            fill={tooltip?.i===i ? 'var(--accent)' : 'var(--t3)'}
            fontSize="10" fontFamily="var(--mono)" fontWeight="500"
            style={{ transition:'fill 0.15s' }}>
            {d.label}
          </text>
        ))}

        {/* area */}
        {areaPath && (
          <path d={areaPath} fill="url(#lg-area)" clipPath="url(#chart-clip)"/>
        )}

        {/* line glow (thicker, blurred duplicate) */}
        {linePath && (
          <path d={linePath} fill="none" stroke="#00c896" strokeWidth="6"
            strokeLinejoin="round" strokeLinecap="round"
            style={{ opacity:0.15 }} clipPath="url(#chart-clip)"/>
        )}

        {/* main line */}
        {linePath && (
          <path d={linePath} fill="none" stroke="url(#lg-line)" strokeWidth="2.5"
            strokeLinejoin="round" strokeLinecap="round" clipPath="url(#chart-clip)"/>
        )}

        {/* peak marker */}
        {points.length > 0 && points[peak] > 0 && (
          <g>
            <circle cx={getX(peak)} cy={getY(points[peak])} r={14} fill="transparent"/>
            <circle cx={getX(peak)} cy={getY(points[peak])} r={5}
              fill="#00c896" stroke="#1a1b25" strokeWidth="2.5"
              style={{ filter:'drop-shadow(0 0 6px #00c89680)' }}/>
          </g>
        )}

        {/* dots */}
        {points.map((v, i) => {
          const isHov = tooltip?.i === i;
          if (v === 0 && !isHov) return null;
          return (
            <g key={i}>
              {isHov && (
                <circle cx={getX(i)} cy={getY(v)} r={10}
                  fill="rgba(0,200,150,0.12)" stroke="none"/>
              )}
              <circle cx={getX(i)} cy={getY(v)}
                r={isHov ? 5.5 : 3.5}
                fill={isHov ? '#00c896' : '#1e1f2c'}
                stroke={isHov ? '#1a1b25' : '#00c896'}
                strokeWidth={isHov ? 2.5 : 1.5}
                style={{ transition:'r 0.2s cubic-bezier(0.22,1,0.36,1)', pointerEvents:'none' }}
              />
            </g>
          );
        })}

        {/* crosshair + tooltip */}
        {tooltip && (
          <g style={{ pointerEvents:'none' }}>
            <line x1={tooltip.x} y1={padding.top} x2={tooltip.x} y2={padding.top+chartH}
              stroke="rgba(0,200,150,0.25)" strokeWidth="1" strokeDasharray="4 3"/>
            {/* tooltip bubble */}
            <rect x={tooltip.x - 34} y={tooltip.y - 42} width={68} height={30}
              rx={8} fill="#1e1f2c" stroke="rgba(0,200,150,0.35)" strokeWidth="1"
              style={{ filter:'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}/>
            {/* arrow */}
            <polygon
              points={`${tooltip.x-5},${tooltip.y-12} ${tooltip.x+5},${tooltip.y-12} ${tooltip.x},${tooltip.y-6}`}
              fill="#1e1f2c" stroke="rgba(0,200,150,0.35)" strokeWidth="1"
            />
            <text x={tooltip.x} y={tooltip.y - 30} textAnchor="middle"
              fill="var(--t3)" fontSize="9" fontFamily="var(--mono)">{tooltip.label}</text>
            <text x={tooltip.x} y={tooltip.y - 17} textAnchor="middle"
              fill="#00c896" fontSize="13" fontWeight="800" fontFamily="var(--mono)">{tooltip.val}</text>
          </g>
        )}
      </svg>
    </div>
  );
};

/* ─── Funnel Bar ──────────────────────────────────────── */
const FunnelBar = ({ label, value, total, color, pctOfPrev, delay, isFirst }) => {
  const [animated, setAnimated] = useState(false);
  const [hov, setHov]           = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) setAnimated(true); }, { threshold:0.2 });
    if (ref.current) ob.observe(ref.current);
    return () => ob.disconnect();
  }, []);

  const width   = total > 0 ? (value / total) * 100 : 0;
  const valPct  = total > 0 ? Math.round((value/total)*100) : 0;

  return (
    <div ref={ref} className="au"
      style={{ animationDelay:`${delay}ms`, padding:'7px 10px', borderRadius:8,
        background: hov ? `${color}08` : 'transparent',
        border: `1px solid ${hov ? color + '30' : 'transparent'}`,
        transition:'background 0.2s, border-color 0.2s',
      }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
    >
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:0 }}>
        {/* rank dot */}
        <div style={{ width:22, height:22, borderRadius:6, background:`${color}18`, border:`1px solid ${color}30`,
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:color }}/>
        </div>
        <span style={{ fontSize:13, fontWeight:600, color: hov ? 'var(--t1)' : 'var(--t1)', flex:1 }}>{label}</span>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {pctOfPrev !== null && !isFirst && (
            <div style={{ padding:'2px 7px', borderRadius:99,
              background: pctOfPrev >= 50 ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
              border: `1px solid ${pctOfPrev >= 50 ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`,
            }}>
              <span style={{ fontSize:10.5, fontWeight:700, fontFamily:'var(--mono)',
                color: pctOfPrev >= 50 ? '#34d399' : '#f87171' }}>
                {pctOfPrev}%
              </span>
            </div>
          )}
          <span style={{ fontSize:15, fontWeight:800, color, fontFamily:'var(--mono)', minWidth:24, textAlign:'right' }}>{value}</span>
        </div>
      </div>
      {/* track + bar */}
      <div style={{ position:'relative', height:5, borderRadius:99, background:'rgba(255,255,255,0.05)', overflow:'hidden', marginLeft:32, marginTop:6 }}>
        <div style={{
          position:'absolute', inset:0, height:'100%', borderRadius:99,
          background:`linear-gradient(90deg, ${color}cc, ${color})`,
          width: animated ? `${width}%` : '0%',
          transition:'width 0.9s cubic-bezier(0.22,1,0.36,1)',
          transitionDelay:`${delay}ms`,
          boxShadow:`0 0 10px ${color}50`,
        }}/>
        {/* shimmer sweep */}
        {animated && (
          <div style={{
            position:'absolute', top:0, left:'-100%', width:'60%', height:'100%',
            background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
            animation:'shimmer 2s ease-in-out',
            animationDelay:`${delay + 900}ms`,
            animationFillMode:'forwards',
          }}/>
        )}
      </div>

    </div>
  );
};

/* ─── Horizontal Bar (Companies) ─────────────────────── */
const HBar = ({ label, value, max, rank, onClick, delay }) => {
  const [animated, setAnimated] = useState(false);
  const [hov, setHov]           = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) setAnimated(true); }, { threshold:0.15 });
    if (ref.current) ob.observe(ref.current);
    return () => ob.disconnect();
  }, []);

  const w          = max > 0 ? (value / max) * 100 : 0;
  const rankColors = ['#00c896','#5aabf0','#c084fc','#e8a820','#f87171','#34d399','#00d4bb','#a78bfa'];
  const rc         = rankColors[(rank-1) % rankColors.length];

  return (
    <div ref={ref} onClick={onClick} className="au"
      style={{
        animationDelay:`${delay}ms`, cursor:'pointer',
        padding:'10px 12px', borderRadius:10, marginBottom:3,
        background: hov ? `${rc}0d` : `${rc}06`,
        border: `1px solid ${hov ? rc+'40' : rc+'18'}`,
        transition:'all 0.18s',
      }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
    >
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>

        {/* rank badge — always colored */}
        <div style={{
          width:26, height:26, borderRadius:8, flexShrink:0,
          background: `${rc}20`,
          border: `1px solid ${rc}40`,
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all 0.18s',
          boxShadow: hov ? `0 0 10px ${rc}30` : 'none',
        }}>
          <span style={{ fontSize:11, fontWeight:800, color: rc, fontFamily:'var(--mono)' }}>
            {rank}
          </span>
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{
              fontSize:13, fontWeight:600,
              color: hov ? 'var(--t1)' : 'var(--t1)',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:180,
            }}>
              {label}
            </span>
            <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0, marginLeft:8 }}>
              <span style={{
                fontSize:13, fontWeight:800, color: rc,
                fontFamily:'var(--mono)',
              }}>{value}</span>
              <span style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)' }}>
                app{value!==1?'s':''}
              </span>
            </div>
          </div>

          {/* bar — always colored at base opacity, brightens on hover */}
          <div style={{ height:5, borderRadius:99, background:`${rc}15`, overflow:'hidden', position:'relative' }}>
            <div style={{
              height:'100%', borderRadius:99,
              background: `linear-gradient(90deg, ${rc}cc, ${rc})`,
              width: animated ? `${w}%` : '0%',
              transition:'width 0.8s cubic-bezier(0.22,1,0.36,1), opacity 0.2s',
              transitionDelay:`${delay}ms`,
              opacity: hov ? 1 : 0.55,
              boxShadow: hov ? `0 0 10px ${rc}70` : `0 0 4px ${rc}30`,
            }}/>
          </div>
        </div>

        <ChevronRight size={12} style={{
          color: hov ? rc : `${rc}60`,
          transition:'color 0.15s, transform 0.18s',
          transform: hov ? 'translateX(3px)' : 'none',
          flexShrink:0,
        }}/>
      </div>
    </div>
  );
};

/* ─── Section Header ──────────────────────────────────── */
const SectionHeader = ({ title, sub, action }) => (
  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
    <div>
      <h3 style={{ fontSize:14.5, fontWeight:700, color:'var(--t1)', letterSpacing:'-0.2px', marginBottom:3 }}>{title}</h3>
      {sub && <p style={{ fontSize:12, color:'var(--t3)' }}>{sub}</p>}
    </div>
    {action}
  </div>
);

/* ─── Time Range Tabs ─────────────────────────────────── */
const RangeTabs = ({ value, onChange }) => (
  <div style={{ display:'flex', gap:2, background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', borderRadius:9, padding:3 }}>
    {['3M','6M','1Y','All'].map(r => (
      <button key={r} onClick={() => onChange(r)} style={{
        padding:'4px 10px', borderRadius:6, border:'none', cursor:'pointer', fontSize:11.5, fontWeight: value===r ? 600 : 400,
        color: value===r ? 'var(--accent)' : 'var(--t2)',
        background: value===r ? 'rgba(0,200,150,0.1)' : 'transparent',
        transition:'all 0.15s',
      }}
        onMouseEnter={e => { if(value!==r){ e.currentTarget.style.color='var(--t1)'; }}}
        onMouseLeave={e => { if(value!==r){ e.currentTarget.style.color='var(--t2)'; }}}
      >{r}</button>
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
const AnalyticsPage = () => {
  const navigate = useNavigate();

  const [apps,     setApps]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [range,    setRange]    = useState('All');
  const [hovSeg,   setHovSeg]   = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  /* ── load ── */
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res  = await applicationApi.getAllApplications({ limit:500 });
      const list = extractList(res);
      setApps(list.map(norm));
      setLastRefresh(new Date());
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── filter by range ── */
  const filtered = useMemo(() => {
    if (range === 'All') return apps;
    const now     = new Date();
    const months  = range === '3M' ? 3 : range === '6M' ? 6 : 12;
    const cutoff  = new Date(now);
    cutoff.setMonth(now.getMonth() - months);
    return apps.filter(a => a.applicationDate && a.applicationDate >= cutoff);
  }, [apps, range]);

  /* ── status counts ── */
  const statusCounts = useMemo(() => {
    const counts = {};
    filtered.forEach(a => { counts[a.status] = (counts[a.status]||0) + 1; });
    return counts;
  }, [filtered]);

  // total excludes withdrawn (same as Dashboard) so rates are consistent across pages
  const total       = filtered.filter(a => a.status !== 'withdrawn').length;
  const responded   = (statusCounts.screening||0) + (statusCounts.interviewing||0) + (statusCounts.offer||0) + (statusCounts.accepted||0) + (statusCounts.rejected||0);
  const interviewed = (statusCounts.interviewing||0) + (statusCounts.offer||0) + (statusCounts.accepted||0);
  const offers      = (statusCounts.offer||0) + (statusCounts.accepted||0);
  const responseRate   = pct(responded,   total);
  const interviewRate  = pct(interviewed, total);
  const successRate    = pct(offers,      total);

  /* ── avg response time (days between applicationDate and first status change — approximated) ── */
  const avgResponseDays = useMemo(() => {
    const responded = filtered.filter(a => a.status !== 'applied' && a.status !== 'withdrawn' && a.applicationDate);
    if (!responded.length) return 0;
    // We don't have response date, so we approximate using updatedAt from raw data
    // Fall back to showing 0 if not available
    return 0;
  }, [filtered]);

  /* ── donut data ── */
  const donutData = useMemo(() => {
    return Object.entries(STATUS_CFG)
      .map(([key, cfg]) => ({ key, ...cfg, value: statusCounts[key]||0 }))
      .filter(d => d.value > 0);
  }, [statusCounts]);

  /* ── timeline data ── */
  const timelineData = useMemo(() => {
    const now = new Date();
    const months = range==='3M' ? 3 : range==='6M' ? 6 : range==='1Y' ? 12 : 12;
    const result = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mo = d.getMonth(), yr = d.getFullYear();
      const count = filtered.filter(a => {
        if (!a.applicationDate) return false;
        return a.applicationDate.getMonth()===mo && a.applicationDate.getFullYear()===yr;
      }).length;
      result.push({ label: MONTHS_SHORT[mo], value: count, month: mo, year: yr });
    }
    return result;
  }, [filtered, range]);

  /* ── compare current vs prev month ── */
  const monthTrend = useMemo(() => {
    if (timelineData.length < 2) return 0;
    const cur  = timelineData[timelineData.length - 1].value;
    const prev = timelineData[timelineData.length - 2].value;
    if (!prev) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  }, [timelineData]);

  /* ── top companies ── */
  const topCompanies = useMemo(() => {
    const map = {};
    filtered.forEach(a => { if (a.company) map[a.company] = (map[a.company]||0) + 1; });
    return Object.entries(map)
      .sort((a,b) => b[1]-a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [filtered]);

  /* ── funnel stages ── */
  const funnelStages = useMemo(() => {
    const stages = ['applied','screening','interviewing','offer','accepted'];
    return stages.map((key, i) => {
      const val  = stages.slice(i).reduce((s,k) => s+(statusCounts[k]||0), 0);
      const prev = i > 0 ? stages.slice(i-1).reduce((s,k) => s+(statusCounts[k]||0), 0) : null;
      return {
        key, val,
        pctOfPrev: prev ? pct(val, prev) : null,
        ...STATUS_CFG[key],
      };
    });
  }, [statusCounts]);

  /* ── ghost rate (still "applied" with no movement) ── */
  const ghostRate = useMemo(() => pct(statusCounts.applied||0, total), [statusCounts, total]);

  /* ── loading skeleton ── */
  if (loading) return (
    <MainLayout title="Analytics">
      <div style={{ maxWidth:1100 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          {Array.from({length:4}).map((_,i) => (
            <div key={i} className="card" style={{ padding:'20px 22px', height:110 }}>
              <div className="skel" style={{ width:80, height:10, borderRadius:4, marginBottom:12 }}/>
              <div className="skel" style={{ width:60, height:32, borderRadius:6, marginBottom:10 }}/>
              <div className="skel" style={{ width:100, height:9, borderRadius:4 }}/>
            </div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
          {[200,200].map((h,i) => <div key={i} className="card skel" style={{ height:h }}/>)}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {[260,260].map((h,i) => <div key={i} className="card skel" style={{ height:h }}/>)}
        </div>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout title="Analytics">
      <div style={{ maxWidth:1100 }}>

        {/* ── PAGE HEADER ── */}
        <div className="au" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <p style={{ fontSize:12.5, color:'var(--t3)' }}>
              {total} application{total!==1?'s':''} tracked
              {range !== 'All' && ` · last ${range}`}
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <RangeTabs value={range} onChange={setRange}/>
            <button onClick={load} title="Refresh"
              style={{ width:34, height:34, borderRadius:9, border:'1px solid var(--border)', background:'rgba(255,255,255,0.04)', color:'var(--t2)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.15s' }}
              onMouseEnter={e=>{ e.currentTarget.style.color='var(--t1)'; e.currentTarget.style.borderColor='var(--border-up)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.color='var(--t2)'; e.currentTarget.style.borderColor='var(--border)'; }}>
              <RefreshCw size={14}/>
            </button>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          <StatCard label="Total Applications" value={total}         suffix=""  icon={BarChart2}  color="#5aabf0" trend={monthTrend} sub="vs last month" delay={0}/>
          <StatCard label="Response Rate"      value={responseRate}  suffix="%" icon={Users}      color="#00c896" sub={`${responded} responded`}          delay={60}/>
          <StatCard label="Interview Rate"     value={interviewRate} suffix="%" icon={Target}     color="#c084fc" sub={`${interviewed} interviews`}        delay={120}/>
          <StatCard label="Success Rate"       value={successRate}   suffix="%" icon={Award}      color="#34d399" sub={`${offers} offer${offers!==1?'s':''}`} delay={180}/>
        </div>

        {/* ── ROW 2: Donut + Timeline ── */}
        <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:14, marginBottom:14 }}>

          {/* Donut */}
          <div className="card au d2" style={{ padding:'22px 24px', display:'flex', flexDirection:'column' }}>
            <SectionHeader title="Status Breakdown" sub="Current distribution"/>
            {total === 0 ? (
              <div style={{ textAlign:'center', padding:'30px 0', color:'var(--t3)', fontSize:13 }}>No data yet</div>
            ) : (
              <>
                {/* donut centered */}
                <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
                  <DonutChart data={donutData} total={total} onHover={setHovSeg} hovered={hovSeg}/>
                </div>
                {/* legend grid — 2 columns so it stays compact */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 8px' }}>
                  {donutData.map(d => (
                    <div key={d.key}
                      onMouseEnter={() => setHovSeg(d.key)}
                      onMouseLeave={() => setHovSeg(null)}
                      style={{
                        display:'flex', alignItems:'center', justifyContent:'space-between',
                        padding:'6px 8px', borderRadius:8, cursor:'pointer',
                        transition:'background 0.15s',
                        background: hovSeg===d.key ? `${d.color}10` : 'transparent',
                        border: `1px solid ${hovSeg===d.key ? d.color+'25' : 'transparent'}`,
                      }}
                    >
                      <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
                        <span style={{ width:7, height:7, borderRadius:'50%', background:d.color, flexShrink:0 }}/>
                        <span style={{ fontSize:11.5, fontWeight:500,
                          color: hovSeg===d.key ? 'var(--t1)' : 'var(--t2)',
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                        }}>{d.label}</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0, marginLeft:4 }}>
                        <span style={{ fontSize:11, color: hovSeg===d.key ? d.color : 'var(--t3)', fontFamily:'var(--mono)', fontWeight:600 }}>
                          {pct(d.value,total)}%
                        </span>
                        <span style={{ fontSize:12, fontWeight:700, color:d.color, fontFamily:'var(--mono)', minWidth:16, textAlign:'right' }}>
                          {d.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Timeline */}
          <div className="card au d3" style={{ padding:'22px 24px' }}>
            <SectionHeader
              title="Applications Over Time"
              sub="Monthly application volume"
              action={
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  {monthTrend !== 0 && (
                    <div style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:99,
                      background: monthTrend > 0 ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                      border: `1px solid ${monthTrend>0?'rgba(52,211,153,0.25)':'rgba(248,113,113,0.25)'}`,
                    }}>
                      {monthTrend > 0 ? <TrendingUp size={11} style={{ color:'#34d399' }}/> : <TrendingDown size={11} style={{ color:'#f87171' }}/>}
                      <span style={{ fontSize:11, fontWeight:600, color: monthTrend>0?'#34d399':'#f87171' }}>{Math.abs(monthTrend)}% vs last month</span>
                    </div>
                  )}
                </div>
              }
            />
            {timelineData.every(d => d.value === 0) ? (
              <div style={{ textAlign:'center', padding:'40px 0', color:'var(--t3)', fontSize:13 }}>No applications in this period</div>
            ) : (
              <LineChart data={timelineData} height={170}/>
            )}
          </div>
        </div>

        {/* ── ROW 3: Funnel + Companies ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

          {/* Funnel */}
          <div className="card au d4" style={{ padding:'22px 24px' }}>
            <SectionHeader title="Application Funnel" sub="Conversion at each stage"/>
            {total === 0 ? (
              <div style={{ textAlign:'center', padding:'30px 0', color:'var(--t3)', fontSize:13 }}>No data yet</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {funnelStages.map((s, i) => (
                  <FunnelBar
                    key={s.key}
                    label={s.label}
                    value={s.val}
                    total={funnelStages[0].val || 1}
                    color={s.color}
                    pctOfPrev={s.pctOfPrev}
                    isFirst={i === 0}
                    delay={i * 80}
                  />
                ))}

                {/* ghost rate callout */}
                <div style={{ marginTop:4, padding:'10px 14px', borderRadius:10, background:'rgba(248,113,113,0.06)', border:'1px solid rgba(248,113,113,0.15)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <Clock size={13} style={{ color:'#f87171' }}/>
                    <span style={{ fontSize:12.5, color:'var(--t2)' }}>Still awaiting response</span>
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color:'#f87171', fontFamily:'var(--mono)' }}>{ghostRate}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Top Companies */}
          <div className="card au d5" style={{ padding:'22px 24px' }}>
            <SectionHeader
              title="Top Companies"
              sub="Most applied to"
              action={
                <button onClick={() => navigate('/applications')}
                  style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600, color:'var(--accent)', background:'rgba(0,200,150,0.08)', border:'1px solid rgba(0,200,150,0.2)', borderRadius:7, padding:'5px 10px', cursor:'pointer', transition:'all 0.15s' }}
                  onMouseEnter={e=>{ e.currentTarget.style.background='rgba(0,200,150,0.16)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background='rgba(0,200,150,0.08)'; }}>
                  View all <ArrowUpRight size={11}/>
                </button>
              }
            />
            {topCompanies.length === 0 ? (
              <div style={{ textAlign:'center', padding:'30px 0', color:'var(--t3)', fontSize:13 }}>No data yet</div>
            ) : (
              <div>
                {topCompanies.map(({ name, count }, i) => (
                  <HBar
                    key={name}
                    label={name}
                    value={count}
                    max={topCompanies[0].count}
                    color="#5aabf0"
                    rank={i+1}
                    delay={i * 60}
                    onClick={() => navigate(`/applications?search=${encodeURIComponent(name)}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── EXTRA INSIGHT ROW ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginTop:14 }}>
          {[
            {
              label:'Most Active Month',
              value: (() => {
                if (!timelineData.length) return '—';
                const best = timelineData.reduce((a,b) => b.value > a.value ? b : a, timelineData[0]);
                return best.value > 0 ? `${best.label} (${best.value})` : '—';
              })(),
              sub:'Highest application volume',
              color:'#c084fc',
            },
            {
              label:'Rejection Rate',
              value: `${pct(statusCounts.rejected||0, total)}%`,
              sub:`${statusCounts.rejected||0} rejected applications`,
              color:'#f87171',
            },
            {
              label:'Active Pipeline',
              value: (statusCounts.screening||0) + (statusCounts.interviewing||0),
              sub:'Screening + Interviewing now',
              color:'#00c896',
            },
          ].map(({ label, value, sub, color }, i) => (
            <div key={label} className="card au" style={{ padding:'16px 18px', animationDelay:`${600+i*60}ms`, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', bottom:-16, right:-16, width:64, height:64, borderRadius:'50%', background:color, opacity:0.07, filter:'blur(16px)' }}/>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.09em', marginBottom:8 }}>{label}</div>
              <div style={{ fontSize:24, fontWeight:800, color, fontFamily:'var(--mono)', letterSpacing:'-0.5px', marginBottom:4 }}>{value}</div>
              <div style={{ fontSize:11.5, color:'var(--t3)' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── EMPTY STATE ── */}
        {!loading && total === 0 && (
          <div className="card au" style={{ padding:'72px 24px', textAlign:'center', marginTop:20 }}>
            <div style={{ position:'relative', width:72, height:72, margin:'0 auto 20px' }}>
              <div style={{ width:72, height:72, borderRadius:20, background:'rgba(0,200,150,0.07)', border:'1px solid rgba(0,200,150,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <BarChart2 size={28} style={{ color:'var(--accent)' }}/>
              </div>
              <div style={{ position:'absolute', top:-4, right:-4, width:20, height:20, borderRadius:'50%', background:'rgba(232,168,32,0.12)', border:'1px solid rgba(232,168,32,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontSize:10 }}>?</span>
              </div>
            </div>
            <div style={{ fontSize:18, fontWeight:700, color:'var(--t1)', marginBottom:8 }}>Nothing to analyze yet</div>
            <div style={{ fontSize:13, color:'var(--t2)', marginBottom:8, maxWidth:340, margin:'0 auto 8px', lineHeight:1.7 }}>
              Your analytics will come alive once you start tracking applications — response rates, pipeline stages, weekly trends and more.
            </div>
            <div style={{ fontSize:12, color:'var(--t3)', marginBottom:24 }}>Tip: add at least 5 applications to see meaningful trends</div>
            <button onClick={() => navigate('/applications/new')} className="btn-p"
              style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 24px', fontSize:13 }}>
              Track Your First Job
            </button>
          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default AnalyticsPage;