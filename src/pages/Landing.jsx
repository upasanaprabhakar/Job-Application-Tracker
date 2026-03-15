import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';

/* ─────────────────────────────────────────────
   DottedSurface  –  exact port of the original
   TypeScript component, adapted to plain JSX.
   Canvas is position:fixed so it covers the
   whole viewport behind every page section.
   ───────────────────────────────────────────── */
const DottedSurface = () => {
  const containerRef = useRef(null);
  const animIdRef    = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const SEPARATION = 150, AMOUNTX = 40, AMOUNTY = 60;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xffffff, 2000, 10000);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(0, 355, 1220);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xffffff, 0);
    container.appendChild(renderer.domElement);

    const positions = [], colors = [];
    for (let ix = 0; ix < AMOUNTX; ix++)
      for (let iy = 0; iy < AMOUNTY; iy++) {
        positions.push(ix * SEPARATION - (AMOUNTX * SEPARATION) / 2, 0, iy * SEPARATION - (AMOUNTY * SEPARATION) / 2);
        colors.push(0.95, 0.95, 0.95);
      }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color',    new THREE.Float32BufferAttribute(colors,    3));
    const material = new THREE.PointsMaterial({ size: 8, vertexColors: true, transparent: true, opacity: 0.8, sizeAttenuation: true });
    scene.add(new THREE.Points(geometry, material));

    let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
    const halfW = window.innerWidth / 2, halfH = window.innerHeight / 2;
    const handleMouse = e => { mouseX = (e.clientX - halfW) / halfW; mouseY = (e.clientY - halfH) / halfH; };
    window.addEventListener('mousemove', handleMouse);

    let count = 0;
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      targetX += (mouseX - targetX) * 0.04;
      targetY += (mouseY - targetY) * 0.04;
      camera.position.x = targetX * 120;
      camera.position.y = 355 + targetY * -60;
      camera.lookAt(scene.position);
      const pos = geometry.attributes.position.array;
      let i = 0;
      for (let ix = 0; ix < AMOUNTX; ix++)
        for (let iy = 0; iy < AMOUNTY; iy++) {
          pos[i * 3 + 1] = Math.sin((ix + count) * 0.3) * 50 + Math.sin((iy + count) * 0.5) * 50;
          i++;
        }
      geometry.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
      count += 0.04;
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      try { container.removeChild(renderer.domElement); } catch {}
    };
  }, []);

  return <div ref={containerRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
};

/* ── small SVG helpers ── */
const Logo = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1"  y="9"  width="3.5" height="6"  rx="1" fill="#041410" opacity="0.5"/>
    <rect x="6"  y="5"  width="3.5" height="10" rx="1" fill="#041410" opacity="0.75"/>
    <rect x="11" y="1"  width="3.5" height="14" rx="1" fill="#041410"/>
  </svg>
);
const Arrow = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const Check = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M2 6.5l3.2 3.2L11 3" stroke="#00c896" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ── data ── */
const FEATURES = [
  { title: 'Pipeline tracking',   desc: 'Move applications through Applied, Screening, Interview, and Offer. See exactly where every opportunity stands at a glance.' },
  { title: 'Follow-up dates',     desc: 'Set a follow-up date on any application. Never let a promising lead go cold because you forgot to check back in.' },
  { title: 'Response analytics',  desc: 'Track your response rate and interview conversion over time. Know what is working and where to focus your energy.' },
  { title: 'Detailed notes',      desc: 'Log interview notes, salary info, recruiter contacts, and job descriptions — all attached to the right application.' },
  { title: 'Status timeline',     desc: 'Every status change is logged automatically. See the full progression of any application from first click to final answer.' },
  { title: 'Clone and reapply',   desc: 'Found a similar role at another company? Clone any application in one click and update only what changed.' },
];
const STEPS = [
  { n: '01', title: 'Create an account', desc: 'Sign up in seconds. No credit card, no onboarding form. You are tracking in under a minute.' },
  { n: '02', title: 'Add applications',  desc: 'Enter company, role, and any details you have. Paste the job description to reference later.' },
  { n: '03', title: 'Track as you go',   desc: 'Update statuses after each interaction. Your dashboard and analytics stay current automatically.' },
];

/* ── scroll-reveal helper ── */
function RevealObserver() {
  useEffect(() => {
    const io = new IntersectionObserver(
      es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); }),
      { threshold: 0.1 },
    );
    document.querySelectorAll('.rev').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}

/* ═══════════════════════════════════════════
   LANDING PAGE
   Every section has position:relative + zIndex≥10
   so it floats above the fixed canvas (zIndex:0).
   ═══════════════════════════════════════════ */
export default function Landing() {
  return (
    <div style={{ background: '#080809', color: '#eeeef2', fontFamily: "'Outfit', system-ui, sans-serif", overflowX: 'hidden' }}>

      {/* ─── global styles ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 99px; }

        @keyframes fadeUp   { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:none; } }
        @keyframes dotPulse { 0%,100% { box-shadow:0 0 5px rgba(0,200,150,.6); } 50% { box-shadow:0 0 14px rgba(0,200,150,1); } }

        .anim-0 { animation: fadeUp .55s cubic-bezier(.22,1,.36,1) .05s both; }
        .anim-1 { animation: fadeUp .6s  cubic-bezier(.22,1,.36,1) .15s both; }
        .anim-2 { animation: fadeUp .6s  cubic-bezier(.22,1,.36,1) .25s both; }
        .anim-3 { animation: fadeUp .6s  cubic-bezier(.22,1,.36,1) .35s both; }
        .anim-4 { animation: fadeUp .5s  cubic-bezier(.22,1,.36,1) .46s both; }

        .rev { opacity:0; transform:translateY(20px); transition: opacity .55s cubic-bezier(.22,1,.36,1), transform .55s cubic-bezier(.22,1,.36,1); }
        .rev.vis { opacity:1; transform:none; }
        .rd1{transition-delay:.06s} .rd2{transition-delay:.12s} .rd3{transition-delay:.18s}
        .rd4{transition-delay:.24s} .rd5{transition-delay:.30s} .rd6{transition-delay:.36s}

        .fc { background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.07); border-radius:16px; padding:26px 24px; transition: border-color .2s, transform .2s, box-shadow .2s; }
        .fc:hover { border-color:rgba(255,255,255,.14); transform:translateY(-3px); box-shadow:0 20px 55px rgba(0,0,0,.5); }

        .btn-p { display:inline-flex; align-items:center; gap:8px; padding:13px 28px; background:#00c896; color:#041410; font-size:15px; font-weight:700; font-family:'Outfit',system-ui,sans-serif; border:none; border-radius:11px; cursor:pointer; text-decoration:none; transition:opacity .15s,box-shadow .2s,transform .1s; box-shadow:0 0 28px rgba(0,200,150,.3); }
        .btn-p:hover { opacity:.88; box-shadow:0 0 44px rgba(0,200,150,.5); transform:translateY(-1px); }

        .btn-g { display:inline-flex; align-items:center; gap:8px; padding:13px 28px; border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.04); color:#eeeef2; font-size:15px; font-weight:600; font-family:'Outfit',system-ui,sans-serif; border-radius:11px; cursor:pointer; text-decoration:none; transition:border-color .15s,background .15s,transform .1s; }
        .btn-g:hover { border-color:rgba(255,255,255,.2); background:rgba(255,255,255,.07); transform:translateY(-1px); }

        .nav-a { padding:6px 14px; border-radius:8px; font-size:13.5px; font-weight:500; color:#666677; text-decoration:none; transition:color .15s,background .15s; }
        .nav-a:hover { color:#eeeef2; background:rgba(255,255,255,.05); }

        .foot-a { font-size:12px; color:#333344; text-decoration:none; transition:color .15s; }
        .foot-a:hover { color:#eeeef2; }
      `}</style>

      {/* ─── 3-D canvas – fixed behind everything ─── */}
      <DottedSurface />

      {/* ─── NAV ─── */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 48px', height:60, background:'rgba(8,8,9,0.88)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:'#00c896', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 14px rgba(0,200,150,.4)', flexShrink:0 }}>
            <Logo />
          </div>
          <span style={{ fontSize:15, fontWeight:600, letterSpacing:'-0.3px' }}>CareerTrack</span>
        </div>
        <div style={{ display:'flex', gap:2 }}>
          <a href="#features" className="nav-a">Features</a>
          <a href="#how"      className="nav-a">How it works</a>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <Link to="/login"    style={{ padding:'7px 16px', borderRadius:8, border:'1px solid rgba(255,255,255,.1)', background:'transparent', color:'#888899', fontSize:13.5, fontWeight:500, textDecoration:'none' }}>Sign in</Link>
          <Link to="/register" style={{ padding:'7px 18px', borderRadius:8, background:'#00c896', color:'#041410', fontSize:13.5, fontWeight:600, textDecoration:'none', boxShadow:'0 0 16px rgba(0,200,150,.28)' }}>Get started</Link>
        </div>
      </nav>

      {/* ─── HERO ─── 
          position:relative + zIndex so it sits above the fixed canvas.
          The radial-gradient overlay mimics the original demo's glow. */}
      <section style={{ position:'relative', zIndex:10, minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'120px 24px 80px' }}>

        {/* radial glow behind hero text  (matches original demo) */}
        <div aria-hidden="true" style={{ position:'absolute', top:'-40px', left:'50%', transform:'translateX(-50%)', width:'100%', height:'100%', background:'radial-gradient(ellipse at center, rgba(238,238,242,0.07) 0%, transparent 55%)', filter:'blur(30px)', pointerEvents:'none', zIndex:0 }} />

        <div className="anim-0" style={{ position:'relative', zIndex:1, display:'inline-flex', alignItems:'center', gap:8, padding:'5px 14px', borderRadius:99, background:'rgba(0,200,150,0.08)', border:'1px solid rgba(0,200,150,0.2)', fontSize:11, fontWeight:600, color:'#00c896', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:30 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#00c896', flexShrink:0, animation:'dotPulse 2s ease-in-out infinite' }} />
          Built for serious job seekers
        </div>

        <h1 className="anim-1" style={{ position:'relative', zIndex:1, fontFamily:"'Instrument Serif', Georgia, serif", fontSize:'clamp(50px, 7.5vw, 92px)', lineHeight:1.03, letterSpacing:'-2px', color:'#eeeef2', maxWidth:840 }}>
          Your job search,<br />
          <em style={{ fontStyle:'italic', color:'#00c896', textShadow:'0 0 60px rgba(0,200,150,0.22)' }}>finally organised</em>
        </h1>

        <p className="anim-2" style={{ position:'relative', zIndex:1, fontSize:'clamp(15px,1.8vw,18px)', color:'#9999b0', maxWidth:480, lineHeight:1.7, margin:'22px auto 38px', fontWeight:400 }}>
          Track every application, follow-up, and interview in one focused workspace. Stop losing opportunities across scattered tabs.
        </p>

        <div className="anim-3" style={{ position:'relative', zIndex:1, display:'flex', gap:14, flexWrap:'wrap', justifyContent:'center' }}>
          <Link to="/register" className="btn-p">Start tracking free <Arrow /></Link>
          <Link to="/login"    className="btn-g">Sign in</Link>
        </div>

        <p className="anim-4" style={{ position:'relative', zIndex:1, marginTop:18, fontSize:12, color:'#2e2e3a' }}>No credit card required</p>
      </section>

      {/* ─── DASHBOARD MOCKUP ─── */}
      <div style={{ position:'relative', zIndex:10, padding:'0 24px 100px', display:'flex', justifyContent:'center' }}>
        <div style={{ width:'100%', maxWidth:920, background:'rgba(18,19,26,0.92)', border:'1px solid rgba(255,255,255,.08)', borderRadius:20, overflow:'hidden', backdropFilter:'blur(12px)', boxShadow:'0 40px 130px rgba(0,0,0,.8), 0 0 0 1px rgba(0,200,150,.06)' }}>
          {/* title bar */}
          <div style={{ display:'flex', alignItems:'center', gap:7, padding:'13px 20px', background:'rgba(0,0,0,.5)', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
            {['#ff5f57','#ffbd2e','#28c941'].map(c => <div key={c} style={{ width:10, height:10, borderRadius:'50%', background:c }} />)}
            <span style={{ marginLeft:10, fontSize:11, color:'#2e2e3a', fontFamily:"'Geist Mono', monospace" }}>careertrack.app / dashboard</span>
          </div>

          <div style={{ padding:22, display:'flex', gap:18 }}>
            {/* sidebar */}
            <div style={{ width:148, flexShrink:0, display:'flex', flexDirection:'column', gap:2 }}>
              {['Dashboard','Applications','Calendar','Analytics','Documents'].map((item, i) => (
                <div key={item} style={{ padding:'7px 10px', borderRadius:8, fontSize:11.5, fontWeight:i===0?600:500, color:i===0?'#00c896':'#2e2e3a', background:i===0?'rgba(0,200,150,.1)':'transparent', display:'flex', alignItems:'center', gap:7 }}>
                  <span style={{ width:4, height:4, borderRadius:'50%', background:'currentColor', opacity:i===0?1:0.5 }} />
                  {item}
                </div>
              ))}
            </div>
            {/* main */}
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12 }}>
              {/* stat cards */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                {['Total','Response Rate','Offers','Active'].map(label => (
                  <div key={label} style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ fontSize:9, fontWeight:600, color:'#2e2e3a', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{label}</div>
                    <div style={{ fontSize:19, fontWeight:700, color:'#444455', fontFamily:"'Geist Mono', monospace" }}>—</div>
                  </div>
                ))}
              </div>
              {/* table + funnel */}
              <div style={{ display:'flex', gap:10 }}>
                <div style={{ flex:1.5, background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.05)', borderRadius:10, padding:14 }}>
                  <div style={{ fontSize:9, fontWeight:600, color:'#2e2e3a', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>Recent Applications</div>
                  {[
                    { co:'G', name:'Google', role:'Software Engineer', badge:'Interviewing', bg:'#081e16', tc:'#00c896', bc:'#0c2e20' },
                    { co:'A', name:'Airbnb',  role:'Backend Engineer',  badge:'Screening',    bg:'#0d1824', tc:'#5aabf0', bc:'#142030' },
                    { co:'S', name:'Stripe',  role:'Full Stack',        badge:'Applied',      bg:'#221e0e', tc:'#e8a820', bc:'#332e14' },
                  ].map(({ co, name, role, badge, bg, tc, bc }) => (
                    <div key={name} style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                      <div style={{ width:24, height:24, borderRadius:6, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:tc, flexShrink:0 }}>{co}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11, fontWeight:600, color:'#eeeef2' }}>{role}</div>
                        <div style={{ fontSize:10, color:'#333344' }}>{name}</div>
                      </div>
                      <div style={{ padding:'2px 8px', borderRadius:99, fontSize:9, fontWeight:600, background:bg, color:tc, border:`1px solid ${bc}`, whiteSpace:'nowrap' }}>{badge}</div>
                    </div>
                  ))}
                </div>
                <div style={{ flex:1, background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.05)', borderRadius:10, padding:14 }}>
                  <div style={{ fontSize:9, fontWeight:600, color:'#2e2e3a', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>Application Funnel</div>
                  {[
                    { label:'Applied',    w:'100%', c:'#00c896' },
                    { label:'Screening',  w:'60%',  c:'#5aabf0' },
                    { label:'Interviews', w:'32%',  c:'#c084fc' },
                    { label:'Offers',     w:'12%',  c:'#e8a820' },
                  ].map(({ label, w, c }) => (
                    <div key={label} style={{ marginBottom:9 }}>
                      <div style={{ fontSize:10, color:'#333344', marginBottom:4 }}>{label}</div>
                      <div style={{ height:3, background:'rgba(255,255,255,.04)', borderRadius:99, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:w, background:c, borderRadius:99 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── FEATURES ─── */}
      <section id="features" style={{ position:'relative', zIndex:10, padding:'80px 24px', maxWidth:1100, margin:'0 auto' }}>
        <p className="rev" style={{ fontSize:10.5, fontWeight:600, color:'#00c896', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:14 }}>Features</p>
        <h2 className="rev rd1" style={{ fontFamily:"'Instrument Serif', Georgia, serif", fontSize:'clamp(30px,4vw,50px)', lineHeight:1.1, letterSpacing:'-0.8px', color:'#eeeef2', maxWidth:500, marginBottom:14 }}>
          Everything your<br /><em style={{ fontStyle:'italic', color:'#00c896' }}>job hunt needs</em>
        </h2>
        <p className="rev rd2" style={{ fontSize:15.5, color:'#9999b0', maxWidth:420, lineHeight:1.65, marginBottom:50 }}>
          One focused workspace. No spreadsheets, no scattered tabs, no missed follow-ups.
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {FEATURES.map(({ title, desc }, i) => (
            <div key={title} className={`fc rev rd${(i%3)+1}`}>
              <div style={{ width:34, height:34, borderRadius:8, background:'rgba(0,200,150,.07)', border:'1px solid rgba(0,200,150,.15)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:15 }}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5l3.2 3.2L12.5 3" stroke="#00c896" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div style={{ fontSize:14.5, fontWeight:700, color:'#eeeef2', marginBottom:8, letterSpacing:'-0.2px' }}>{title}</div>
              <div style={{ fontSize:13, color:'#9999b0', lineHeight:1.65 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how" style={{ position:'relative', zIndex:10, padding:'60px 24px 90px', maxWidth:1100, margin:'0 auto' }}>
        <p className="rev" style={{ fontSize:10.5, fontWeight:600, color:'#00c896', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:14 }}>How it works</p>
        <h2 className="rev rd1" style={{ fontFamily:"'Instrument Serif', Georgia, serif", fontSize:'clamp(30px,4vw,50px)', lineHeight:1.1, letterSpacing:'-0.8px', color:'#eeeef2', maxWidth:460, marginBottom:14 }}>
          Up and running<br /><em style={{ fontStyle:'italic', color:'#00c896' }}>in minutes</em>
        </h2>
        <p className="rev rd2" style={{ fontSize:15.5, color:'#9999b0', maxWidth:380, lineHeight:1.65, marginBottom:54 }}>
          No configuration, no imports. Sign up and start tracking immediately.
        </p>
        {/* steps – centred in the full section width */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0, maxWidth:760, margin:'0 auto', position:'relative' }}>
          <div style={{ position:'absolute', top:21, left:'17%', right:'17%', height:1, background:'linear-gradient(90deg, transparent, rgba(0,200,150,0.2), transparent)' }} />
          {STEPS.map(({ n, title, desc }, i) => (
            <div key={n} className={`rev rd${i*2+1}`} style={{ textAlign:'center', padding:'0 22px' }}>
              <div style={{ width:42, height:42, borderRadius:'50%', background:'rgba(0,200,150,.07)', border:'1px solid rgba(0,200,150,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#00c896', fontFamily:"'Geist Mono',monospace", margin:'0 auto 16px', boxShadow:'0 0 16px rgba(0,200,150,.1)' }}>{n}</div>
              <div style={{ fontSize:14.5, fontWeight:700, color:'#eeeef2', marginBottom:8 }}>{title}</div>
              <div style={{ fontSize:13, color:'#9999b0', lineHeight:1.65 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section style={{ position:'relative', zIndex:10, padding:'110px 24px 120px', textAlign:'center', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:700, height:340, background:'radial-gradient(ellipse at center, rgba(0,200,150,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />
        <p className="rev" style={{ fontSize:10.5, fontWeight:600, color:'#00c896', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:14 }}>Free to use</p>
        <h2 className="rev rd1" style={{ fontFamily:"'Instrument Serif', Georgia, serif", fontSize:'clamp(34px,5vw,60px)', lineHeight:1.08, letterSpacing:'-1px', color:'#eeeef2', maxWidth:540, margin:'0 auto 18px' }}>
          Stop losing track.<br /><em style={{ fontStyle:'italic', color:'#00c896' }}>Start landing offers.</em>
        </h2>
        <p className="rev rd2" style={{ fontSize:15.5, color:'#9999b0', marginBottom:36 }}>Free to use. No credit card. No limits on applications.</p>
        <div className="rev rd3" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:18 }}>
          <Link to="/register" className="btn-p" style={{ fontSize:15, padding:'13px 32px' }}>Create your free account <Arrow /></Link>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {['No credit card required','No setup or onboarding','Unlimited applications'].map(item => (
              <div key={item} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#9999b0' }}><Check /> {item}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ position:'relative', zIndex:10, background:'rgba(8,8,9,0.95)', borderTop:'1px solid rgba(255,255,255,.06)', padding:'26px 48px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:24, height:24, borderRadius:6, background:'#00c896', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 10px rgba(0,200,150,.3)' }}><Logo /></div>
          <span style={{ fontSize:13.5, fontWeight:600 }}>CareerTrack</span>
        </div>
        <span style={{ fontSize:12, color:'#2e2e3a' }}>Built to help you land the job.</span>
        <div style={{ display:'flex', gap:20 }}>
          {['Privacy','Terms','Contact'].map(l => <a key={l} href="#" className="foot-a">{l}</a>)}
        </div>
      </footer>

      <RevealObserver />
    </div>
  );
}