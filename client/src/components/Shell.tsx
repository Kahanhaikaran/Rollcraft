import { NavLink, Outlet } from 'react-router-dom';
import { isDemoMode } from '../lib/api';

const navItems = [
  { to: '/', end: true, label: 'Dashboard', icon: '📊' },
  { to: '/inventory', end: false, label: 'Inventory', icon: '📦' },
  { to: '/transfers', end: false, label: 'Transfers', icon: '🔄' },
  { to: '/attendance', end: false, label: 'Attendance', icon: '📍' },
  { to: '/payroll', end: false, label: 'Payroll', icon: '💰' },
  { to: '/settings', end: false, label: 'Settings', icon: '⚙️' },
];

export function Shell() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-logo">🍞</span>
          <span className="sidebar-title">RollCraft</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, end, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
            >
              <span className="sidebar-link-icon">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="sidebar-footer-text">Kitchen ops · v1</span>
        </div>
      </aside>
      <main className="main">
        {isDemoMode() ? (
          <div className="demo-banner">
            <span>You’re viewing the app in demo mode with sample data. No backend required.</span>
          </div>
        ) : null}
        <Outlet />
      </main>
    </div>
  );
}
