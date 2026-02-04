import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

function formatTimeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export function DashboardPage() {
  const kitchens = useQuery({ queryKey: ['kitchens'], queryFn: api.kitchens });
  const unpaid = useQuery({ queryKey: ['payroll-unpaid'], queryFn: api.unpaidPayroll });
  const [kitchenFilter, setKitchenFilter] = useState<string>('');

  const effectiveKitchenId = useMemo(() => {
    if (kitchenFilter) return kitchenFilter;
    const first = kitchens.data?.kitchens?.[0];
    return first?.id ?? '';
  }, [kitchenFilter, kitchens.data]);

  const stats = useQuery({
    queryKey: ['dashboard-stats', effectiveKitchenId],
    queryFn: () => api.dashboardStats(effectiveKitchenId || undefined),
  });

  const s = stats.data?.stats;

  return (
    <div className="page-grid">
      <header className="page-header page-header-row">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Inventory, depletion & payroll overview</p>
        </div>
        {kitchens.data?.kitchens?.length ? (
          <select
            className="select-compact"
            value={effectiveKitchenId}
            onChange={(e) => setKitchenFilter(e.target.value)}
          >
            <option value="">All kitchens</option>
            {(kitchens.data.kitchens as { id: string; name: string }[]).map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        ) : null}
      </header>

      <section className="dashboard-stats-grid">
        <div className="stat-card stat-card-primary">
          <span className="stat-card-value">{s?.kitchensCount ?? '-'}</span>
          <span className="stat-card-label">Kitchens</span>
        </div>
        <div className="stat-card stat-card-warning">
          <span className="stat-card-value">{s?.lowStockCount ?? '-'}</span>
          <span className="stat-card-label">Low stock items</span>
        </div>
        <div className="stat-card stat-card-info">
          <span className="stat-card-value">{s?.depletionLast24Hours ?? '-'}</span>
          <span className="stat-card-label">Depletion (24h)</span>
        </div>
        <div className="stat-card stat-card-success">
          <span className="stat-card-value">{s?.depletionLast7Days ?? '-'}</span>
          <span className="stat-card-label">Depletion (7 days)</span>
        </div>
      </section>

      <div className="dashboard-cols">
        <section className="card">
          <div className="card-header">Low stock alerts</div>
          <div className="card-body">
            {stats.isLoading ? (
              <div className="loading-state">Loading...</div>
            ) : (s?.lowStockItems ?? []).length === 0 ? (
              <p className="empty-state">No low stock items. All good!</p>
            ) : (
              <ul className="list-modern">
                {(s?.lowStockItems ?? []).map((item: { itemId: string; itemName: string; uom: string; onHandQty: number; reorderPoint: number }) => (
                  <li key={item.itemId} className="list-item-with-meta low-stock-item">
                    <span className="list-item-icon">⚠️</span>
                    <span>
                      <strong>{item.itemName}</strong>
                      <span className="muted"> {item.onHandQty} {item.uom} / reorder at {item.reorderPoint}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-header">Inventory depletion (last 7 days)</div>
          <div className="card-body">
            {stats.isLoading ? (
              <div className="loading-state">Loading...</div>
            ) : (
              <div className="depletion-breakdown">
                {s?.depletionByType && Object.keys(s.depletionByType).length > 0 ? (
                  Object.entries(s.depletionByType).map(([type, data]: [string, { totalQty: number; count: number }]) => (
                    <div key={type} className="depletion-row">
                      <span className="depletion-type">{type.replace('_', ' ')}</span>
                      <span className="depletion-qty">{data.totalQty.toFixed(1)} units</span>
                      <span className="muted">({data.count} entries)</span>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">No depletion data yet.</p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-header">Recent ledger activity</div>
        <div className="card-body">
          {stats.isLoading ? (
            <div className="loading-state">Loading...</div>
          ) : (s?.recentLedger ?? []).length === 0 ? (
            <p className="empty-state">No recent activity.</p>
          ) : (
            <ul className="event-list">
              {(s?.recentLedger ?? []).slice(0, 10).map((entry: { id: string; type: string; qtyDelta: number; itemName: string; uom: string; createdAt: string }) => (
                <li key={entry.id} className="event-item">
                  <span>
                    <span className={`ledger-type ledger-type-${entry.type.toLowerCase()}`}>{entry.type}</span>
                    {' '}
                    {entry.itemName} {entry.qtyDelta > 0 ? '+' : ''}{entry.qtyDelta} {entry.uom}
                  </span>
                  <span className="muted">{formatTimeAgo(entry.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="dashboard-cols">
        <section className="card">
          <div className="card-header">Kitchens</div>
          <div className="card-body">
            {kitchens.isLoading ? (
              <div className="loading-state">Loading...</div>
            ) : kitchens.data?.kitchens?.length ? (
              <ul className="list-modern">
                {(kitchens.data.kitchens as { id: string; name: string; type: string }[]).map((k) => (
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
                <span className="stat-value">{(unpaid.data as { entries: unknown[] }).entries.length}</span>
                <span className="stat-label">Unpaid entries</span>
              </div>
            ) : (
              <p className="muted">Requires HR role to view unpaid payroll.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
