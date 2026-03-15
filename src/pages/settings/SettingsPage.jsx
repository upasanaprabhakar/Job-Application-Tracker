import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Lock, Bell, BellOff, Database,
  Check, X, Eye, EyeOff, ChevronRight,
  Download, Trash2, AlertTriangle, Shield,
  MapPin, Phone, Mail, Camera, Save,
  ToggleLeft, ToggleRight, LogOut,
} from 'lucide-react';
import { settingsApi } from '../../api/settingsApi';
import useAuthStore from '../../store/authStore';
import MainLayout from '../../components/layout/MainLayout';

/* ═══════════════════════════════════════════════════════
   SMALL SHARED COMPONENTS
═══════════════════════════════════════════════════════ */

/* ── Toast ── */
const Toast = ({ toast }) => {
  if (!toast) return null;
  const isErr = toast.type === 'error';
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 18px', borderRadius: 12,
      background: isErr ? 'rgba(248,113,113,0.12)' : 'rgba(0,200,150,0.12)',
      border: `1px solid ${isErr ? 'rgba(248,113,113,0.3)' : 'rgba(0,200,150,0.3)'}`,
      backdropFilter: 'blur(12px)',
      boxShadow: `0 8px 32px ${isErr ? 'rgba(248,113,113,0.15)' : 'rgba(0,200,150,0.15)'}`,
      animation: 'slideUp 0.3s cubic-bezier(0.22,1,0.36,1)',
      maxWidth: 340,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
        background: isErr ? '#f87171' : '#00c896',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isErr ? <X size={12} color="#fff" /> : <Check size={12} color="#051410" />}
      </div>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>{toast.msg}</span>
    </div>
  );
};

/* ── Section Card ── */
const Section = ({ title, subtitle, children, accent }) => (
  <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
    <div style={{
      padding: '16px 22px 14px',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      {accent && (
        <div style={{
          width: 3, height: 38, borderRadius: 99,
          background: accent, flexShrink: 0, marginTop: 2,
        }} />
      )}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.2px' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{subtitle}</div>}
      </div>
    </div>
    <div style={{ padding: '20px 22px' }}>{children}</div>
  </div>
);

/* ── Field Row ── */
const Field = ({ label, icon: Icon, children, required }) => (
  <div style={{ marginBottom: 18 }}>
    <label style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 11.5, fontWeight: 600, color: 'var(--t2)',
      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7,
    }}>
      {Icon && <Icon size={11} style={{ color: 'var(--t3)' }} />}
      {label}
      {required && <span style={{ color: '#f87171' }}>*</span>}
    </label>
    {children}
  </div>
);

/* ── Toggle Switch ── */
const Toggle = ({ checked, onChange, disabled }) => {
  const on = checked;
  return (
    <button
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: 44, height: 24, borderRadius: 99, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        background: on ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: on ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: on ? '#051410' : 'rgba(255,255,255,0.5)',
        transition: 'left 0.2s cubic-bezier(0.22,1,0.36,1)',
      }} />
    </button>
  );
};

/* ── Password Input ── */
const PasswordInput = ({ value, onChange, placeholder, name }) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="inp"
        style={{ paddingRight: 40, width: '100%', boxSizing: 'border-box' }}
      />
      <button
        onClick={() => setShow(s => !s)}
        style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)',
          padding: 0, display: 'flex', alignItems: 'center',
        }}
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
};

/* ── Avatar ── */
const Avatar = ({ name, size = 80 }) => {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const colors = [
    ['#0d2218', '#00c896'], ['#0d1824', '#5aabf0'],
    ['#1a0d24', '#c084fc'], ['#241a0d', '#e8a820'],
  ];
  const [bg, fg] = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: bg, border: `2px solid ${fg}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: size * 0.36, fontWeight: 800, color: fg, fontFamily: 'var(--mono)' }}>
        {initials}
      </span>
    </div>
  );
};

/* ── Danger Button ── */
const DangerBtn = ({ onClick, loading, children, icon: Icon }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={loading}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '9px 18px', borderRadius: 10, border: '1px solid',
        borderColor: hov ? 'rgba(248,113,113,0.5)' : 'rgba(248,113,113,0.2)',
        background: hov ? 'rgba(248,113,113,0.1)' : 'rgba(248,113,113,0.05)',
        color: '#f87171', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s', opacity: loading ? 0.6 : 1,
      }}
    >
      {Icon && <Icon size={14} />}
      {loading ? 'Please wait…' : children}
    </button>
  );
};

/* ── Save Button ── */
const SaveBtn = ({ onClick, loading, children }) => (
  <button
    className="btn-p"
    onClick={onClick}
    disabled={loading}
    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 22px', fontSize: 13 }}
  >
    {loading ? (
      <div style={{ width: 14, height: 14, border: '2px solid rgba(5,20,16,0.3)', borderTopColor: '#051410', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    ) : (
      <Save size={13} />
    )}
    {loading ? 'Saving…' : (children || 'Save Changes')}
  </button>
);

/* ── Notification Row ── */
const NotifRow = ({ label, sub, checked, onChange, disabled }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 0', borderBottom: '1px solid var(--border)',
  }}>
    <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: disabled ? 'var(--t3)' : 'var(--t1)', marginBottom: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--t3)' }}>{sub}</div>}
    </div>
    <Toggle checked={checked} onChange={onChange} disabled={disabled} />
  </div>
);

/* ═══════════════════════════════════════════════════════
   TAB DEFINITIONS
═══════════════════════════════════════════════════════ */
const TABS = [
  { id: 'profile',       label: 'Profile',       icon: User,     color: '#00c896' },
  { id: 'security',      label: 'Security',      icon: Lock,     color: '#5aabf0' },
  { id: 'notifications', label: 'Notifications', icon: Bell,     color: '#c084fc' },
  { id: 'data',          label: 'Data & Privacy', icon: Database, color: '#e8a820' },
];

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
const SettingsPage = () => {
  const navigate               = useNavigate();
  const { user, updateUser, logout } = useAuthStore();
  const [activeTab, setActiveTab]   = useState('profile');
  const [toast, setToast]           = useState(null);
  const toastTimer                  = useRef(null);

  const showToast = (msg, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  /* ────────────── PROFILE STATE ────────────── */
  const [profile, setProfile]       = useState({ name: user?.name || '', phone: '', location: '' });
  const [profLoading, setProfLoad]  = useState(false);
  const [profFetched, setProfFetch] = useState(false);

  useEffect(() => {
    if (activeTab === 'profile' && !profFetched) {
      settingsApi.getProfile().then(res => {
        const u = res.user || res;
        setProfile({ name: u.name || '', phone: u.phone || '', location: u.location || '' });
        setProfFetch(true);
      }).catch(() => {});
    }
  }, [activeTab, profFetched]);

  const saveProfile = async () => {
    if (!profile.name.trim()) return showToast('Name cannot be empty', 'error');
    setProfLoad(true);
    try {
      const res = await settingsApi.updateProfile(profile);
      updateUser({ name: (res.user || res).name });
      showToast('Profile updated successfully');
    } catch (e) {
      showToast(e?.response?.data?.message || 'Failed to update profile', 'error');
    } finally { setProfLoad(false); }
  };

  /* ────────────── SECURITY STATE ────────────── */
  const [pwd, setPwd] = useState({ current: '', newPwd: '', confirm: '' });
  const [pwdLoading, setPwdLoad] = useState(false);

  const savePassword = async () => {
    if (!pwd.current || !pwd.newPwd || !pwd.confirm)
      return showToast('All password fields are required', 'error');
    if (pwd.newPwd !== pwd.confirm)
      return showToast('New passwords do not match', 'error');
    if (pwd.newPwd.length < 6)
      return showToast('Password must be at least 6 characters', 'error');
    setPwdLoad(true);
    try {
      await settingsApi.changePassword(pwd.current, pwd.newPwd);
      setPwd({ current: '', newPwd: '', confirm: '' });
      showToast('Password updated successfully');
    } catch (e) {
      showToast(e?.response?.data?.message || 'Failed to update password', 'error');
    } finally { setPwdLoad(false); }
  };

  /* ────────────── NOTIFICATIONS STATE ────────────── */
  const [notifs, setNotifs]         = useState({
    masterEnabled: true, statusChanges: true,
    followUpReminders: true, interviewReminders: true, weeklyDigest: false,
  });
  const [notifLoading, setNotifLoad]  = useState(false);
  const [notifFetched, setNotifFetch] = useState(false);

  useEffect(() => {
    if (activeTab === 'notifications' && !notifFetched) {
      settingsApi.getNotifications().then(res => {
        setNotifs(prev => ({ ...prev, ...(res.prefs || res) }));
        setNotifFetch(true);
      }).catch(() => {});
    }
  }, [activeTab, notifFetched]);

  const saveNotifs = async () => {
    setNotifLoad(true);
    try {
      await settingsApi.updateNotifications(notifs);
      showToast('Notification preferences saved');
    } catch (e) {
      showToast('Failed to save preferences', 'error');
    } finally { setNotifLoad(false); }
  };

  /* ────────────── DATA STATE ────────────── */
  const [exporting, setExporting]         = useState(false);
  const [deleteModal, setDeleteModal]     = useState(false);
  const [deletePass, setDeletePass]       = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const handleExport = async () => {
    setExporting(true);
    try {
      await settingsApi.exportData();
      showToast('Data exported successfully');
    } catch {
      showToast('Export failed', 'error');
    } finally { setExporting(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return showToast('Type DELETE to confirm', 'error');
    if (!deletePass) return showToast('Password is required', 'error');
    setDeleteLoading(true);
    try {
      await settingsApi.deleteAccount(deletePass);
      logout();
      navigate('/login');
    } catch (e) {
      showToast(e?.response?.data?.message || 'Failed to delete account', 'error');
    } finally { setDeleteLoading(false); }
  };

  /* ────────────── RENDER TABS ────────────── */
  const renderProfile = () => (
    <div className="au">
      <Section title="Your Identity" subtitle="How you appear across the app" accent="#00c896">
        {/* Avatar row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24, padding: '14px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <Avatar name={profile.name || user?.name} size={64} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', marginBottom: 3 }}>{profile.name || user?.name || 'Your Name'}</div>
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>{user?.email}</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>Avatar generated from your initials</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          <Field label="Full Name" icon={User} required>
            <input className="inp" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
              placeholder="Your full name" style={{ width: '100%', boxSizing: 'border-box' }} />
          </Field>

          <Field label="Email Address" icon={Mail}>
            <input className="inp" value={user?.email || ''} disabled
              style={{ width: '100%', boxSizing: 'border-box', opacity: 0.5, cursor: 'not-allowed' }} />
          </Field>

          <Field label="Phone" icon={Phone}>
            <input className="inp" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
              placeholder="+1 (555) 000-0000" style={{ width: '100%', boxSizing: 'border-box' }} />
          </Field>

          <Field label="Location" icon={MapPin}>
            <input className="inp" value={profile.location} onChange={e => setProfile(p => ({ ...p, location: e.target.value }))}
              placeholder="City, Country" style={{ width: '100%', boxSizing: 'border-box' }} />
          </Field>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
          <SaveBtn onClick={saveProfile} loading={profLoading} />
        </div>
      </Section>
    </div>
  );

  const renderSecurity = () => (
    <div className="au">
      <Section title="Change Password" subtitle="Use a strong password you don't use elsewhere" accent="#5aabf0">
        <div style={{ maxWidth: 420 }}>
          <Field label="Current Password" icon={Lock}>
            <PasswordInput name="current" value={pwd.current}
              onChange={e => setPwd(p => ({ ...p, current: e.target.value }))}
              placeholder="Enter current password" />
          </Field>
          <Field label="New Password" icon={Shield}>
            <PasswordInput name="newPwd" value={pwd.newPwd}
              onChange={e => setPwd(p => ({ ...p, newPwd: e.target.value }))}
              placeholder="Min. 6 characters" />
          </Field>
          <Field label="Confirm New Password" icon={Shield}>
            <PasswordInput name="confirm" value={pwd.confirm}
              onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))}
              placeholder="Repeat new password" />
          </Field>

          {/* strength indicator */}
          {pwd.newPwd.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                {[1, 2, 3, 4].map(i => {
                  const strength = pwd.newPwd.length >= 12 ? 4 : pwd.newPwd.length >= 8 ? 3 : pwd.newPwd.length >= 6 ? 2 : 1;
                  const colors = ['#f87171', '#e8a820', '#5aabf0', '#00c896'];
                  return (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 99,
                      background: i <= strength ? colors[strength - 1] : 'rgba(255,255,255,0.08)',
                      transition: 'background 0.2s',
                    }} />
                  );
                })}
              </div>
              <span style={{ fontSize: 11, color: 'var(--t3)' }}>
                {pwd.newPwd.length < 6 ? 'Too short' : pwd.newPwd.length < 8 ? 'Weak' : pwd.newPwd.length < 12 ? 'Good' : 'Strong'}
              </span>
            </div>
          )}

          <SaveBtn onClick={savePassword} loading={pwdLoading}>Update Password</SaveBtn>
        </div>
      </Section>

      <Section title="Active Session" subtitle="You are currently logged in" accent="#5aabf0">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(90,171,240,0.05)', border: '1px solid rgba(90,171,240,0.15)', borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(90,171,240,0.1)', border: '1px solid rgba(90,171,240,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={15} style={{ color: '#5aabf0' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>This browser</div>
              <div style={{ fontSize: 11.5, color: 'var(--t3)' }}>Active now · {user?.email}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#00c896', fontWeight: 600 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00c896' }} />
            Current
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 9, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)', color: 'var(--t2)', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--t1)'; e.currentTarget.style.borderColor = 'var(--border-up)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--t2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            <LogOut size={13} /> Sign out of this session
          </button>
        </div>
      </Section>
    </div>
  );

  const renderNotifications = () => {
    const master = notifs.masterEnabled;
    return (
      <div className="au">
        <Section title="Email Notifications" subtitle="Choose what you get notified about" accent="#c084fc">

          {/* Master toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: master ? 'rgba(0,200,150,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${master ? 'rgba(0,200,150,0.2)' : 'var(--border)'}`, borderRadius: 12, marginBottom: 20, transition: 'all 0.2s' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 2 }}>
                <span style={{ display:'flex', alignItems:'center', gap:7 }}>
                  {master
                    ? <Bell size={15} style={{ color:'var(--accent)' }} />
                    : <BellOff size={15} style={{ color:'var(--t3)' }} />}
                  {master ? 'Notifications enabled' : 'All notifications paused'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--t3)' }}>
                {master ? 'You will receive emails based on your preferences below' : 'Turn this on to receive email notifications'}
              </div>
            </div>
            <Toggle checked={master} onChange={v => setNotifs(p => ({ ...p, masterEnabled: v }))} />
          </div>

          {/* Per-type toggles */}
          <div style={{ opacity: master ? 1 : 0.45, transition: 'opacity 0.2s', pointerEvents: master ? 'auto' : 'none' }}>
            <NotifRow
              label="Status Changes"
              sub="When an application status is updated"
              checked={notifs.statusChanges}
              onChange={v => setNotifs(p => ({ ...p, statusChanges: v }))}
              disabled={!master}
            />
            <NotifRow
              label="Follow-up Reminders"
              sub="When a follow-up date is due"
              checked={notifs.followUpReminders}
              onChange={v => setNotifs(p => ({ ...p, followUpReminders: v }))}
              disabled={!master}
            />
            <NotifRow
              label="Interview Reminders"
              sub="Day before an upcoming interview"
              checked={notifs.interviewReminders}
              onChange={v => setNotifs(p => ({ ...p, interviewReminders: v }))}
              disabled={!master}
            />
            <div style={{ paddingTop: 4 }}>
              <NotifRow
                label="Weekly Digest"
                sub="Summary of your week every Monday"
                checked={notifs.weeklyDigest}
                onChange={v => setNotifs(p => ({ ...p, weeklyDigest: v }))}
                disabled={!master}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border)', marginTop: 4 }}>
            <SaveBtn onClick={saveNotifs} loading={notifLoading}>Save Preferences</SaveBtn>
          </div>
        </Section>
      </div>
    );
  };

  const renderData = () => (
    <div className="au">
      {/* Export */}
      <Section title="Export Your Data" subtitle="Download everything in JSON format" accent="#e8a820">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: 13, color: 'var(--t2)', margin: '0 0 4px', lineHeight: 1.6 }}>
              Export all your applications, notes, and profile data as a JSON file. Use it for backups or to migrate data.
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(232,168,32,0.3)', background: 'rgba(232,168,32,0.07)', color: '#e8a820', fontSize: 13, fontWeight: 600, cursor: exporting ? 'not-allowed' : 'pointer', transition: 'all 0.15s', opacity: exporting ? 0.6 : 1, flexShrink: 0 }}
            onMouseEnter={e => { if (!exporting) { e.currentTarget.style.background = 'rgba(232,168,32,0.13)'; e.currentTarget.style.borderColor = 'rgba(232,168,32,0.5)'; } }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(232,168,32,0.07)'; e.currentTarget.style.borderColor = 'rgba(232,168,32,0.3)'; }}
          >
            {exporting
              ? <div style={{ width: 13, height: 13, border: '2px solid rgba(232,168,32,0.3)', borderTopColor: '#e8a820', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              : <Download size={14} />}
            {exporting ? 'Exporting…' : 'Export All Data'}
          </button>
        </div>
      </Section>

      {/* Delete Account */}
      <Section title="Delete Account" subtitle="Permanently remove your account and all data" accent="#f87171">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 12, marginBottom: 16 }}>
          <AlertTriangle size={16} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: 'var(--t2)', margin: 0, lineHeight: 1.65 }}>
            This action is <strong style={{ color: '#f87171' }}>permanent and irreversible</strong>. All your applications, documents, and account data will be deleted immediately. There is no undo.
          </p>
        </div>
        {!deleteModal ? (
          <DangerBtn onClick={() => setDeleteModal(true)} icon={Trash2}>
            Delete My Account
          </DangerBtn>
        ) : (
          <div style={{ background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 14, padding: '20px 20px 16px', animation: 'slideUp 0.25s cubic-bezier(0.22,1,0.36,1)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f87171', marginBottom: 14 }}>
              Confirm account deletion
            </div>

            <Field label="Type DELETE to confirm">
              <input
                className="inp"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                style={{ width: '100%', maxWidth: 300, boxSizing: 'border-box', borderColor: deleteConfirm === 'DELETE' ? 'rgba(248,113,113,0.4)' : undefined }}
              />
            </Field>

            <Field label="Your Password">
              <PasswordInput
                value={deletePass}
                onChange={e => setDeletePass(e.target.value)}
                placeholder="Enter your password"
                name="deletePass"
              />
            </Field>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <DangerBtn
                onClick={handleDeleteAccount}
                loading={deleteLoading}
                icon={Trash2}
              >
                Permanently Delete
              </DangerBtn>
              <button
                onClick={() => { setDeleteModal(false); setDeletePass(''); setDeleteConfirm(''); }}
                style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)', color: 'var(--t2)', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--t1)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--t2)'; }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Section>
    </div>
  );

  const tabContent = {
    profile:       renderProfile(),
    security:      renderSecurity(),
    notifications: renderNotifications(),
    data:          renderData(),
  };

  /* ────────────── LAYOUT ────────────── */
  return (
    <MainLayout title="Settings">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Toast toast={toast} />

      <div style={{ maxWidth: 820 }}>

        {/* ── Page header ── */}
        <div className="au" style={{ marginBottom: 22 }}>
          <p style={{ fontSize: 12.5, color: 'var(--t3)', margin: 0 }}>
            Manage your account, security, and preferences
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '196px 1fr', gap: 18, alignItems: 'start' }}>

          {/* ── Sidebar tabs ── */}
          <div className="card au" style={{ padding: 6, position: 'sticky', top: 20 }}>
            {/* User pill at top */}
            <div style={{ padding: '10px 12px 12px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={user?.name} size={36} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name || 'User'}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.email}
                  </div>
                </div>
              </div>
            </div>

            {TABS.map(({ id, label, icon: Icon, color }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    background: active ? `${color}12` : 'transparent',
                    color: active ? color : 'var(--t2)',
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    transition: 'all 0.15s', textAlign: 'left',
                    marginBottom: 2,
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--t1)'; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t2)'; } }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                    background: active ? `${color}18` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${active ? color + '30' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    <Icon size={13} style={{ color: active ? color : 'var(--t3)' }} />
                  </div>
                  <span style={{ flex: 1 }}>{label}</span>
                  {active && <ChevronRight size={13} style={{ color, opacity: 0.6, flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>

          {/* ── Tab content ── */}
          <div style={{ minWidth: 0 }}>
            {tabContent[activeTab]}
          </div>

        </div>
      </div>
    </MainLayout>
  );
};

export default SettingsPage;