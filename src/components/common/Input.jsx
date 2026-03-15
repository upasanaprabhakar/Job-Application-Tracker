import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const Input = ({ label, error, type = 'text', icon: Icon, hideLabel, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused]           = useState(false);

  const isPassword = type === 'password';
  const inputType  = isPassword && showPassword ? 'text' : type;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && !hideLabel && (
        <label style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: error ? '#f87171' : focused ? 'var(--t1)' : 'var(--t2)',
          transition: 'color 0.15s',
          fontFamily: 'var(--font)',
        }}>
          {label}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        {/* left icon */}
        {Icon && (
          <div style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)',
            color: focused ? 'var(--accent)' : 'var(--t3)',
            display: 'flex', alignItems: 'center',
            transition: 'color 0.15s',
            pointerEvents: 'none',
          }}>
            <Icon size={16} strokeWidth={2} />
          </div>
        )}

        <input
          type={inputType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
          style={{
            width: '100%',
            padding: `10px ${isPassword ? '40px' : '14px'} 10px ${Icon ? '40px' : '14px'}`,
            background: focused
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(255,255,255,0.035)',
            border: `1px solid ${
              error   ? 'rgba(248,113,113,0.45)'  :
              focused ? 'rgba(0,200,150,0.45)'    :
                        'var(--border)'
            }`,
            borderRadius: 'var(--rs)',
            color: 'var(--t1)',
            fontFamily: 'var(--font)',
            fontSize: 14,
            outline: 'none',
            transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
            boxShadow: error
              ? '0 0 0 3px rgba(248,113,113,0.08)'
              : focused
                ? '0 0 0 3px rgba(0,200,150,0.09)'
                : 'none',
            ...(props.style || {}),
          }}
        />

        {/* show/hide password */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            tabIndex={-1}
            style={{
              position: 'absolute', right: 12, top: '50%',
              transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--t3)', display: 'flex', alignItems: 'center',
              padding: 0,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--t2)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--t3)'}
          >
            {showPassword
              ? <EyeOff size={16} strokeWidth={2} />
              : <Eye    size={16} strokeWidth={2} />
            }
          </button>
        )}
      </div>

      {/* error message */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11.5, color: '#f87171', fontWeight: 500,
          animation: 'inp-shake 0.28s ease',
        }}>
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}>
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          {error}
        </div>
      )}

      <style>{`
        @keyframes inp-shake {
          0%, 100% { transform: translateX(0); }
          25%       { transform: translateX(-4px); }
          75%       { transform: translateX(4px); }
        }
        input::placeholder { color: var(--t3); }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.35); cursor: pointer; }
      `}</style>
    </div>
  );
};

export default Input;