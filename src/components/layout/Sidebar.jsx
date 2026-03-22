import { Link, useLocation } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { LayoutDashboard, Briefcase, BarChart3, FileText, Settings, LogOut, Calendar } from 'lucide-react';
import { useMutation }   from '@tanstack/react-query';
import { useNavigate }   from 'react-router-dom';
import { toast }         from 'react-hot-toast';
import useAuthStore      from '../../store/authStore';
import { authApi }       from '../../api/authApi';

const NAV = [
  { path: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'    },
  { path: '/applications', icon: Briefcase,        label: 'Applications' },
  { path: '/calendar',     icon: Calendar,         label: 'Calendar'     },
  { path: '/analytics',    icon: BarChart3,         label: 'Analytics'    },
  { path: '/documents',    icon: FileText,          label: 'Documents'    },
  { path: '/settings',     icon: Settings,          label: 'Settings'     },
];

const Sidebar = ({ isOpen, onClose, collapsed }) => {
  const location = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuthStore();

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => { logout(); toast.success('Logged out'); navigate('/login'); },
    onError:   () => { logout(); navigate('/login'); },
  });

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const initials = (user?.name || 'U')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const W = collapsed ? 64 : 220;

  return (
    <>
      {/* mobile overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
          }}
          className="lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 flex flex-col lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          width: W,
          background: 'var(--sidebar)',
          borderRight: '1px solid var(--border)',
          transition: 'width 0.28s cubic-bezier(0.22,1,0.36,1), transform 0.28s cubic-bezier(0.22,1,0.36,1)',
          overflow: 'hidden',
        }}
      >
        {/* ── logo ── */}
        <div style={{ padding: collapsed ? '18px 0 10px' : '18px 14px 10px', transition: 'padding 0.28s' }}>

          {/* logo row */}
          <div style={{
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 10,
            marginBottom: 22,
            justifyContent: collapsed ? 'center' : 'flex-start',
            overflow: 'hidden',
          }}>
            {/* collapsed: show just the icon portion of the logo */}
            {collapsed ? (
              <div style={{
                width: 33, height: 33, flexShrink: 0,
                background: 'var(--accent)',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 18px rgba(0,200,150,0.4)',
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1"  y="9"  width="3.5" height="6"  rx="1" fill="#051410" opacity="0.45"/>
                  <rect x="6"  y="5"  width="3.5" height="10" rx="1" fill="#051410" opacity="0.72"/>
                  <rect x="11" y="1"  width="3.5" height="14" rx="1" fill="#051410"/>
                </svg>
              </div>
            ) : (
              <img
                src={logo}
                alt="CareerTrack"
                style={{
                  width: '100%',
                  maxWidth: 168,
                  height: 'auto',
                  objectFit: 'contain',
                  flexShrink: 0,
                  transition: 'opacity 0.2s',
                  filter: 'brightness(1.1)',
                }}
              />
            )}

            {/* spacer div to keep layout — text is now in the image */}
            <div style={{
              overflow: 'hidden',
              opacity: collapsed ? 0 : 0,
              width: 0,
              transition: 'opacity 0.2s, width 0.28s',
              whiteSpace: 'nowrap',
            }}>
            </div>
          </div>

          {/* nav label — hidden when collapsed */}
          {!collapsed && (
            <p style={{
              fontSize: 10, fontWeight: 700, color: 'var(--t3)',
              textTransform: 'uppercase', letterSpacing: '0.11em',
              marginBottom: 4, paddingLeft: 10,
            }}>
              Menu
            </p>
          )}

          {/* nav items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV.map(({ path, icon: Icon, label }) => {
              const active = isActive(path);
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={onClose}
                  title={collapsed ? label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: collapsed ? 0 : 9,
                    padding: collapsed ? '10px 0' : '8px 10px',
                    borderRadius: 9,
                    fontSize: 13.5,
                    fontWeight: active ? 600 : 500,
                    color: active ? 'var(--accent)' : 'var(--t2)',
                    background: active ? 'var(--accent-dim)' : 'transparent',
                    textDecoration: 'none',
                    transition: 'color 0.15s, background 0.15s, padding 0.28s',
                    position: 'relative',
                    border: active ? '1px solid rgba(0,200,150,0.12)' : '1px solid transparent',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.color       = 'var(--t1)';
                      e.currentTarget.style.background  = 'rgba(255,255,255,0.04)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.color       = 'var(--t2)';
                      e.currentTarget.style.background  = 'transparent';
                      e.currentTarget.style.borderColor = 'transparent';
                    }
                  }}
                >
                  <Icon
                    size={collapsed ? 18 : 15}
                    strokeWidth={active ? 2.2 : 1.8}
                    style={{ color: active ? 'var(--accent)' : 'var(--t3)', flexShrink: 0, transition: 'all 0.2s' }}
                  />

                  {/* label — slides out when collapsed */}
                  <span style={{
                    flex: 1,
                    overflow: 'hidden',
                    opacity: collapsed ? 0 : 1,
                    maxWidth: collapsed ? 0 : 200,
                    transition: 'opacity 0.18s, max-width 0.28s',
                    whiteSpace: 'nowrap',
                  }}>
                    {label}
                  </span>

                  {/* active dot — hidden when collapsed (icon color is enough) */}
                  {active && !collapsed && (
                    <span style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: 'var(--accent)',
                      boxShadow: '0 0 8px var(--accent)',
                      flexShrink: 0,
                    }} />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div style={{ flex: 1 }} />

        {/* ── user card ── */}
        <div style={{
          padding: collapsed ? '10px 0 14px' : '10px 12px 14px',
          borderTop: '1px solid var(--border)',
          transition: 'padding 0.28s',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : 9,
            padding: collapsed ? '8px 0' : '9px 10px',
            borderRadius: 11,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid var(--border)',
            transition: 'border-color 0.15s, background 0.15s, padding 0.28s',
            overflow: 'hidden',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-up)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)';    e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
          >
            {/* avatar */}
            <div style={{
              width: 36, height: 36, borderRadius: 11, flexShrink: 0,
              background: 'rgba(0,200,150,0.08)',
              border: '1.5px solid rgba(0,200,150,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: initials.length > 1 ? 12 : 14,
              fontWeight: 800, color: '#00c896',
              letterSpacing: '-0.3px', fontFamily: 'var(--mono)',
            }}
              title={collapsed ? (user?.name || 'User') : undefined}
            >
              {initials}
            </div>

            {/* name + plan — hidden when collapsed */}
            <div style={{
              flex: 1, minWidth: 0,
              opacity: collapsed ? 0 : 1,
              maxWidth: collapsed ? 0 : 200,
              overflow: 'hidden',
              transition: 'opacity 0.18s, max-width 0.28s',
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name || 'User'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, boxShadow: '0 0 5px rgba(0,200,150,0.6)' }} />
                <span style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 500 }}>Free Plan</span>
              </div>
            </div>

            {/* logout — hidden when collapsed */}
            {!collapsed && (
              <button
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                title="Logout"
                style={{
                  width: 26, height: 26, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 7, border: 'none',
                  background: 'transparent',
                  cursor: 'pointer', color: 'var(--t3)',
                  transition: 'color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <LogOut size={13} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;