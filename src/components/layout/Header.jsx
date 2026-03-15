import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, User, Settings, LogOut, ChevronDown, X, CheckCheck } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import useAuthStore        from '../../store/authStore';
import { authApi }         from '../../api/authApi';
import useNotifications, { NOTIF_CONFIG } from '../../hooks/useNotifications';

const Header = ({ onMenuClick, onCollapseClick, collapsed, title }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [open, setOpen]   = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { notifs, unreadCount, loading: nLoading, markRead, markAllRead, deleteNotif, timeAgo } = useNotifications();
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

  const initials = (user?.name || 'U')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

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

      {/* one button — collapses sidebar on desktop, opens drawer on mobile */}
      <button
        onClick={onCollapseClick || onMenuClick}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          width: 32, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, border: '1px solid transparent',
          background: 'transparent', color: 'var(--t2)', cursor: 'pointer',
          transition: 'color 0.15s, background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--t1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--t2)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
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
            position: 'relative', width: 34, height: 34, borderRadius: 9,
            border: '1px solid var(--border)',
            background: notifOpen ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
            color: notifOpen ? 'var(--t1)' : 'var(--t2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'color 0.15s, border-color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color='var(--t1)'; e.currentTarget.style.borderColor='var(--border-up)'; e.currentTarget.style.background='rgba(255,255,255,0.06)'; }}
          onMouseLeave={e => { if (!notifOpen) { e.currentTarget.style.color='var(--t2)'; e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='rgba(255,255,255,0.03)'; } }}
        >
          <Bell size={14} strokeWidth={1.9} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              minWidth: 16, height: 16, borderRadius: 99,
              background: '#f87171', color: '#fff',
              fontSize: 9, fontWeight: 800, fontFamily: 'var(--mono)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px', border: '2px solid var(--bg)',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="ap" style={{
            position: 'absolute', right: 0, top: 'calc(100% + 8px)',
            width: 320, background: '#1c1d28',
            border: '1px solid var(--border-up)', borderRadius: 14,
            boxShadow: '0 24px 70px rgba(0,0,0,0.6)',
            overflow: 'hidden', zIndex: 100,
          }}>
            {/* header */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>Notifications</span>
                {unreadCount > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#f87171', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.2)', padding: '1px 7px', borderRadius: 99 }}>
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.8, transition: 'opacity 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
                >
                  <CheckCheck size={11}/> Mark all read
                </button>
              )}
            </div>

            {/* list */}
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {nLoading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>Loading…</div>
              ) : notifs.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <Bell size={22} style={{ color: 'var(--t3)', marginBottom: 8 }}/>
                  <div style={{ fontSize: 13, color: 'var(--t2)', fontWeight: 600, marginBottom: 4 }}>All caught up</div>
                  <div style={{ fontSize: 12, color: 'var(--t3)' }}>No notifications yet</div>
                </div>
              ) : notifs.map(n => {
                const cfg = NOTIF_CONFIG[n.type] || NOTIF_CONFIG.new_application;
                return (
                  <div key={n.id}
                    onClick={() => { if (!n.read) markRead(n.id); if (n.meta?.applicationId) { navigate(`/applications/${n.meta.applicationId}`); setNotifOpen(false); } }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '10px 14px',
                      background: n.read ? 'transparent' : 'rgba(255,255,255,0.02)',
                      borderBottom: '1px solid var(--border)',
                      cursor: n.meta?.applicationId ? 'pointer' : 'default',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(255,255,255,0.02)'}
                  >
                    {/* type dot */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: `${cfg.color}15`, border: `1px solid ${cfg.color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11,
                    }}>
                      {cfg.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: n.read ? 400 : 600, color: n.read ? 'var(--t2)' : 'var(--t1)', marginBottom: 2, lineHeight: 1.4 }}>{n.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--t3)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>{timeAgo(n.createdAt)}</div>
                    </div>
                    {/* unread dot + delete */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {!n.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 5px rgba(0,200,150,0.5)' }}/>}
                      <button onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 2, display: 'flex', alignItems: 'center', opacity: 0, transition: 'opacity 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.color='#f87171'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity='0'; e.currentTarget.style.color='var(--t3)'; }}
                      ><X size={11}/></button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* footer */}
            {notifs.length > 0 && (
              <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                <button onClick={() => { navigate('/settings'); setNotifOpen(false); }}
                  style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--t1)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--t3)'}
                >
                  Manage notification settings
                </button>
              </div>
            )}
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
            width: 30, height: 30, borderRadius: 9,
            background: 'rgba(0,200,150,0.08)',
            border: '1.5px solid rgba(0,200,150,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: initials.length > 1 ? 10.5 : 12.5,
            fontWeight: 800, color: '#00c896',
            letterSpacing: '-0.3px',
            fontFamily: 'var(--mono)',
            flexShrink: 0,
          }}>
            {initials}
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
                  width: 34, height: 34, borderRadius: 10,
                  background: 'rgba(0,200,150,0.08)',
                  border: '1.5px solid rgba(0,200,150,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: initials.length > 1 ? 11 : 13,
                  fontWeight: 800, color: '#00c896', flexShrink: 0,
                  letterSpacing: '-0.3px',
                  fontFamily: 'var(--mono)',
                }}>
                  {initials}
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


    </header>
  );
};

export default Header;