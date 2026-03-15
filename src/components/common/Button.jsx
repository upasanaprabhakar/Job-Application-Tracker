import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { authApi } from '../../api/authApi';

const Header = ({ onMenuClick, title }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [open, setOpen]   = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropRef   = useRef(null);
  const notifRef  = useRef(null);

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => { logout(); toast.success('Logged out'); navigate('/login'); },
    onError:   () => { logout(); navigate('/login'); },
  });

  useEffect(() => {
    const h = (e) => {
      if (dropRef.current  && !dropRef.current.contains(e.target))  setOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const initial = user?.name?.charAt(0).toUpperCase() || 'U';

  return (
    <header style={{
      height: 56,
      background: 'rgba(21,22,31,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 20px', gap: 12,
      position: 'sticky', top: 0, zIndex: 30,
      flexShrink: 0,
    }}>

      {/* mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden"
        style={{
          width: 32, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, border: 'none',
          background: 'transparent', color: 'var(--t2)', cursor: 'pointer',
          transition: 'color 0.15s, background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--t1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--t2)'; e.currentTarget.style.background = 'transparent'; }}
      >
        <Menu size={17} />
      </button>

      {/* page title */}
      <h1 style={{
        fontSize: 14.5, fontWeight: 600,
        color: 'var(--t1)', letterSpacing: '-0.2px',
      }}>
        {title}
      </h1>

      <div style={{ flex: 1 }} />

      {/* ── notification bell ── */}
      <div ref={notifRef} style={{ position: 'relative' }}>
        <button
          onClick={() => { setNotifOpen(v => !v); setOpen(false); }}
          style={{
            position: 'relative',
            width: 34, height: 34, borderRadius: 9,
            border: '1px solid var(--border)',
            background: notifOpen ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
            color: 'var(--t2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'color 0.15s, border-color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color        = 'var(--t1)';
            e.currentTarget.style.borderColor  = 'var(--border-up)';
            e.currentTarget.style.background   = 'rgba(255,255,255,0.06)';
          }}
          onMouseLeave={e => {
            if (!notifOpen) {
              e.currentTarget.style.color       = 'var(--t2)';
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background  = 'rgba(255,255,255,0.03)';
            }
          }}
        >
          <Bell size={14} strokeWidth={1.9} />
          {/* notification dot */}
          <span style={{
            position: 'absolute', top: 7, right: 7,
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 6px rgba(0,200,150,0.8)',
            animation: 'glow-pulse 2.4s ease-in-out infinite',
          }} />
        </button>

        {/* notif dropdown */}
        {notifOpen && (
          <div className="ap" style={{
            position: 'absolute', right: 0, top: 'calc(100% + 8px)',
            width: 280,
            background: '#1c1d28',
            border: '1px solid var(--border-up)',
            borderRadius: 14,
            boxShadow: '0 24px 70px rgba(0,0,0,0.6)',
            overflow: 'hidden',
            zIndex: 100,
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>Notifications</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.2)', padding: '1px 7px', borderRadius: 99 }}>1 new</span>
            </div>
            <div style={{ padding: '8px 0' }}>
              <div style={{ padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 4, boxShadow: '0 0 6px rgba(0,200,150,0.6)' }} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--t1)', marginBottom: 2 }}>Follow up on your applications</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>3 applications haven't had activity in 7+ days</div>
                </div>
              </div>
            </div>
            <div style={{ padding: '8px 16px 12px', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setNotifOpen(false)}
                style={{ width: '100%', padding: '7px 0', fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', transition: 'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                View all
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── user menu ── */}
      <div ref={dropRef} style={{ position: 'relative' }}>
        <button
          onClick={() => { setOpen(v => !v); setNotifOpen(false); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '4px 10px 4px 5px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: open ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.025)',
            cursor: 'pointer',
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--border-up)';
            e.currentTarget.style.background  = 'rgba(255,255,255,0.06)';
          }}
          onMouseLeave={e => {
            if (!open) {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background  = 'rgba(255,255,255,0.025)';
            }
          }}
        >
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: 'linear-gradient(135deg, #00c896 0%, #009e78 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#051410',
            boxShadow: '0 0 8px rgba(0,200,150,0.25)',
          }}>
            {initial}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name || 'User'}
          </span>
          <ChevronDown
            size={12}
            style={{
              color: 'var(--t3)',
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
              flexShrink: 0,
            }}
          />
        </button>

        {open && (
          <div className="ap" style={{
            position: 'absolute', right: 0, top: 'calc(100% + 8px)',
            width: 200,
            background: '#1c1d28',
            border: '1px solid var(--border-up)',
            borderRadius: 13,
            boxShadow: '0 24px 70px rgba(0,0,0,0.6)',
            overflow: 'hidden',
            zIndex: 100,
          }}>
            {/* user info */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'linear-gradient(135deg, #00c896 0%, #009e78 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#051410', flexShrink: 0,
                }}>
                  {initial}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name || 'User'}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.email || ''}
                  </div>
                </div>
              </div>
              {/* plan badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 8px',
                background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.15)',
                borderRadius: 99,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--accent)' }}>Free Plan</span>
              </div>
            </div>

            {/* menu items */}
            <div style={{ padding: '4px 0' }}>
              {[
                { icon: User,     label: 'Profile',  path: '/profile'  },
                { icon: Settings, label: 'Settings', path: '/settings' },
              ].map(({ icon: Icon, label, path }) => (
                <button
                  key={label}
                  onClick={() => { setOpen(false); navigate(path); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                    padding: '9px 14px', border: 'none', background: 'transparent',
                    color: 'var(--t2)', fontSize: 13, cursor: 'pointer',
                    transition: 'color 0.15s, background 0.15s', textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--t1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--t2)'; e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon size={13} style={{ flexShrink: 0 }} />
                  {label}
                </button>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border)' }} />

            <div style={{ padding: '4px 0 4px' }}>
              <button
                onClick={() => { setOpen(false); logoutMutation.mutate(); }}
                disabled={logoutMutation.isPending}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                  padding: '9px 14px', border: 'none', background: 'transparent',
                  color: '#f87171', fontSize: 13, cursor: 'pointer',
                  transition: 'background 0.15s', textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={13} style={{ flexShrink: 0 }} />
                {logoutMutation.isPending ? 'Logging out…' : 'Logout'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 5px rgba(0,200,150,0.5); }
          50%       { box-shadow: 0 0 12px rgba(0,200,150,0.9); }
        }
      `}</style>
    </header>
  );
};

export default Header;