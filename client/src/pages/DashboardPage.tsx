import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function DashboardPage() {
  const kitchens = useQuery({ queryKey: ['kitchens'], queryFn: api.kitchens });
  const unpaid = useQuery({ queryKey: ['payroll-unpaid'], queryFn: api.unpaidPayroll });

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2 style={{ marginBottom: 6 }}>Dashboard</h2>
        <div style={{ opacity: 0.75 }}>Quick overview</div>
      </div>

      <section style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Kitchens</div>
        {kitchens.isLoading ? 'Loading...' : null}
        {kitchens.data ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {kitchens.data.kitchens.map((k: any) => (
              <li key={k.id}>
                {k.name} ({k.type})
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Payroll reminders (unpaid)</div>
        {unpaid.isLoading ? 'Loading...' : null}
        {unpaid.data ? (
          <div style={{ opacity: 0.85 }}>{unpaid.data.entries.length} unpaid entries</div>
        ) : (
          <div style={{ opacity: 0.65 }}>Requires HR role</div>
        )}
      </section>
    </div>
  );
}

