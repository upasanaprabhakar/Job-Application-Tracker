import { useState } from 'react';
import Sidebar from './Sidebar';
import Header  from './Header';

const MainLayout = ({ children, title = 'Dashboard' }) => {
  const [sidebarOpen,      setSidebarOpen]      = useState(false);   // mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);   // desktop

  const toggleCollapse = () => setSidebarCollapsed(v => !v);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          marginLeft: sidebarCollapsed ? 64 : 220,
          transition: 'margin-left 0.28s cubic-bezier(0.22,1,0.36,1)',
          minWidth: 0,
        }}
        className="max-lg:ml-0"
      >
        <Header
          onMenuClick={() => setSidebarOpen(v => !v)}
          onCollapseClick={toggleCollapse}
          collapsed={sidebarCollapsed}
          title={title}
        />
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 28px',
            background: 'var(--bg)',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;