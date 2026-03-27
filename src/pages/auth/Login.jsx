import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Shield } from 'lucide-react';
import * as THREE from 'three';
import { authApi } from '../../api/authApi';
import { setAccessToken } from '../../api/axios';
import useAuthStore from '../../store/authStore';

/* ── identical DottedSurface from Landing ── */
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
      geometry.dispose(); material.dispose(); renderer.dispose();
      try { container.removeChild(renderer.domElement); } catch {}
    };
  }, []);

  return <div ref={containerRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
};

/* ── inline dark input ── */
const Field = ({ label, type = 'text', name, value, onChange, error, placeholder, extra }) => {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === 'password';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#9999b0' }}>{label}</label>
          {extra}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <input
          type={isPassword && showPw ? 'text' : type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            padding: isPassword ? '11px 44px 11px 14px' : '11px 14px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : focused ? 'rgba(0,200,150,0.5)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 10,
            color: '#eeeef2',
            fontSize: 14,
            fontFamily: "'Outfit', system-ui, sans-serif",
            outline: 'none',
            boxShadow: focused ? `0 0 0 3px ${error ? 'rgba(239,68,68,0.12)' : 'rgba(0,200,150,0.12)'}` : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPw(p => !p)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#555566', padding: 0, fontSize: 12, fontFamily: 'inherit' }}
          >
            {showPw ? 'hide' : 'show'}
          </button>
        )}
      </div>
      {error && <span style={{ fontSize: 12, color: '#f87171' }}>{error}</span>}
    </div>
  );
};

const Logo = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="9"  width="3.5" height="6"  rx="1" fill="#041410" opacity="0.5"/>
    <rect x="6" y="5"  width="3.5" height="10" rx="1" fill="#041410" opacity="0.75"/>
    <rect x="11" y="1" width="3.5" height="14" rx="1" fill="#041410"/>
  </svg>
);

import logoDark from '../../assets/logo-dark.png';

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors]     = useState({});
  const [remember, setRemember] = useState(false);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      setUser(data.user);
      toast.success('Welcome back!');
      navigate('/dashboard');
    },
    onError: (error) => {
      const status = error.response?.status;
      const msg =
        status === 401 ? 'Invalid email or password. Please try again.' :
        status === 400 ? 'Please enter your email and password.' :
        status === 429 ? 'Too many attempts. Please wait a moment.' :
        'Something went wrong. Please try again.';
      toast.error(msg);
    },
  });

  const validate = () => {
    const e = {};
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Email is invalid';
    if (!formData.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (ev) => {
    const { name, value } = ev.target;
    setFormData(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) loginMutation.mutate(formData);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080809', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Outfit', system-ui, sans-serif", color: '#eeeef2', position: 'relative' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1&family=Outfit:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes cardUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:none; } }
        @keyframes dotPulse { 0%,100% { box-shadow:0 0 5px rgba(0,200,150,.6); } 50% { box-shadow:0 0 14px rgba(0,200,150,1); } }
        .card-anim { animation: cardUp .55s cubic-bezier(.22,1,.36,1) .1s both; }
        input::placeholder { color: #333344; }
      `}</style>

      <DottedSurface />

      {/* back to home */}
      <Link to="/" style={{ position: 'fixed', top: 20, left: 24, zIndex: 100, display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9999b0', fontSize: 13, textDecoration: 'none', transition: 'color .15s, border-color .15s' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#eeeef2'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#9999b0'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Home
      </Link>

      <div className="card-anim" style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 10 }}>

        {/* logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <img src={logoDark} alt="CareerTrack" style={{ width: 220, height: 'auto', objectFit: 'contain', marginBottom: 8 }} />
        </div>

        {/* card */}
        <div style={{ background: 'rgba(18,19,26,0.92)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '36px 36px 32px', backdropFilter: 'blur(20px)', boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,200,150,0.05)' }}>

          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 30, fontStyle: 'italic', color: '#eeeef2', lineHeight: 1.1, marginBottom: 8, letterSpacing: '-0.5px' }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 14, color: '#9999b0', lineHeight: 1.5 }}>Sign in to continue to your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Field
              label="Email address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="you@example.com"
            />

            <Field
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              placeholder="••••••••"
              extra={
                <Link to="/forgot-password" style={{ fontSize: 12, fontWeight: 600, color: '#00c896', textDecoration: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Forgot password?
                </Link>
              }
            />

            {/* remember me */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', userSelect: 'none' }}>
              <div
                onClick={() => setRemember(p => !p)}
                style={{ width: 16, height: 16, borderRadius: 5, border: `1.5px solid ${remember ? '#00c896' : 'rgba(255,255,255,0.15)'}`, background: remember ? '#00c896' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s', cursor: 'pointer' }}
              >
                {remember && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5L8.5 2" stroke="#041410" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span style={{ fontSize: 13, color: '#9999b0' }}>Remember me</span>
            </label>

            {/* submit */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              style={{ width: '100%', padding: '13px', background: loginMutation.isPending ? 'rgba(0,200,150,0.5)' : '#00c896', color: '#041410', border: 'none', borderRadius: 11, fontSize: 15, fontWeight: 700, fontFamily: "'Outfit', system-ui, sans-serif", cursor: loginMutation.isPending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 0 28px rgba(0,200,150,0.25)', transition: 'opacity .15s, box-shadow .2s, transform .1s', marginTop: 4 }}
              onMouseEnter={e => { if (!loginMutation.isPending) { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.boxShadow = '0 0 44px rgba(0,200,150,0.45)'; }}}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.boxShadow = '0 0 28px rgba(0,200,150,0.25)'; }}
            >
              {loginMutation.isPending ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                    <circle cx="8" cy="8" r="6" stroke="rgba(4,20,16,0.3)" strokeWidth="2.5"/>
                    <path d="M8 2a6 6 0 016 6" stroke="#041410" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                  Signing in…
                </>
              ) : 'Sign in'}
            </button>
          </form>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>

        {/* bottom links */}
        <div style={{ textAlign: 'center', marginTop: 22 }}>
          <p style={{ fontSize: 14, color: '#555566' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#00c896', fontWeight: 600, textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Create account
            </Link>
          </p>
        </div>

        {/* trust badges */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#333344' }}>
            <Shield size={13} style={{ color: '#00c896' }} />
            Secure & Encrypted
          </div>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#2a2a36', display: 'block' }} />
          <span style={{ fontSize: 12, color: '#333344' }}>Your data is private</span>
        </div>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <p style={{ fontSize: 11, color: '#2a2a36' }}>
            By signing in you agree to our{' '}
            <Link to="/terms"   style={{ color: '#444455', textDecoration: 'none' }}>Terms</Link>
            {' '}and{' '}
            <Link to="/privacy" style={{ color: '#444455', textDecoration: 'none' }}>Privacy Policy</Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;