import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function DashboardPage() {
  const kitchens = useQuery({ queryKey: ['kitchens'], queryFn: api.kitchens });
  const unpaid = useQuery({ queryKey: ['payroll-unpaid'], queryFn: api.unpaidPayroll });

  return (
    <div className="page-grid">
      <header className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Quick overview of your kitchens and payroll</p>
      </header>

      <section className="card">
        <div className="card-header">Kitchens</div>
        <div className="card-body">
          {kitchens.isLoading ? (
            <div className="loading-state">Loading...</div>
          ) : kitchens.data?.kitchens?.length ? (
            <ul className="list-modern">
              {kitchens.data.kitchens.map((k: { id: string; name: string; type: string }) => (
                <li key={k.id} className="list-item-with-meta">
                  <span className="list-item-icon">🏠</span>
                  <span><strong>{k.name}</strong> <span className="muted">({k.type})</span></span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No kitchens yet.</p>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-header">Payroll reminders</div>
        <div className="card-body">
          {unpaid.isLoading ? (
            <div className="loading-state">Loading...</div>
          ) : unpaid.data ? (
            <div className="stat-block">
              <span className="stat-value">{unpaid.data.entries.length}</span>
              <span className="stat-label">Unpaid entries</span>
            </div>
          ) : (
            <p className="muted">Requires HR role to view unpaid payroll.</p>
          )}
        </div>
      </section>
    </div>
  );
}
