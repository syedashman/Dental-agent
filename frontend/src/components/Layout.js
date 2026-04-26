import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, UserCheck, Settings,
  LogOut, Menu, X, Stethoscope, MessageCircle, Bell
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/appointments', label: 'Appointments', icon: Calendar },
  { to: '/dentists', label: 'Dentists', icon: Stethoscope },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 'var(--sidebar-width)' : '72px',
        background: 'var(--bg-sidebar)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 100,
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minHeight: 72,
        }}>
          <div style={{
            width: 40, height: 40,
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 20 }}>🦷</span>
          </div>
          {sidebarOpen && (
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>DentalAgent</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>AI Booking System</div>
            </div>
          )}
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '16px 8px', overflowY: 'auto' }}>
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 10,
                marginBottom: 4,
                color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
                background: isActive ? 'rgba(14,165,233,0.2)' : 'transparent',
                transition: 'all 0.2s',
                fontWeight: isActive ? 600 : 400,
                fontSize: 14,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              })}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div style={{
          padding: '12px 8px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          {sidebarOpen && (
            <div style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.05)',
              marginBottom: 8,
            }}>
              <div style={{ color: 'white', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{user?.role}</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', padding: '10px 12px', borderRadius: 10,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)', fontSize: 14,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >
            <LogOut size={18} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{
        marginLeft: sidebarOpen ? 'var(--sidebar-width)' : '72px',
        flex: 1,
        transition: 'margin-left 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>
        {/* Top header */}
        <header style={{
          height: 'var(--header-height)',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: 16,
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 13 }}>
            <MessageCircle size={16} style={{ color: 'var(--success)' }} />
            <span>WhatsApp Agent Active</span>
          </div>

          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', position: 'relative' }}>
            <Bell size={20} />
          </button>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: 24 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
