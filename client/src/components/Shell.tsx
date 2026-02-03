import { NavLink, Outlet } from 'react-router-dom';

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  display: 'block',
  padding: '10px 12px',
  borderRadius: 8,
  textDecoration: 'none',
  color: isActive ? '#111' : '#333',
  background: isActive ? '#eef2ff' : 'transparent',
});

export function Shell() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100vh' }}>
      <aside style={{ padding: 16, borderRight: '1px solid #eee' }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>RollCraft</div>
        <nav style={{ display: 'grid', gap: 6 }}>
          <NavLink to="/" end style={linkStyle}>
            Dashboard
          </NavLink>
          <NavLink to="/inventory" style={linkStyle}>
            Inventory
          </NavLink>
          <NavLink to="/transfers" style={linkStyle}>
            Transfers
          </NavLink>
          <NavLink to="/attendance" style={linkStyle}>
            Attendance
          </NavLink>
          <NavLink to="/payroll" style={linkStyle}>
            Payroll
          </NavLink>
          <NavLink to="/settings" style={linkStyle}>
            Settings
          </NavLink>
        </nav>
      </aside>
      <main style={{ padding: 20 }}>
        <Outlet />
      </main>
    </div>
  );
}

