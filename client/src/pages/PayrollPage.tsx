import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function PayrollPage() {
  const unpaidQ = useQuery({ queryKey: ['payroll-unpaid'], queryFn: api.unpaidPayroll });

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div>
        <h2 style={{ marginBottom: 6 }}>Payroll</h2>
        <div style={{ opacity: 0.75 }}>Unpaid entries (reminders)</div>
      </div>

      <section style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
        {unpaidQ.isLoading ? 'Loading...' : null}
        {unpaidQ.data ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {unpaidQ.data.entries.map((e: any) => (
              <div key={e.id} style={{ border: '1px solid #f0f0f0', borderRadius: 10, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <b>{e.employee?.employeeProfile?.fullName ?? e.employeeUserId}</b>
                    <span style={{ marginLeft: 8, opacity: 0.7, fontSize: 12 }}>{e.period?.month}</span>
                  </div>
                  <div style={{ fontWeight: 600 }}>₹{e.netPay}</div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Salary {e.computedSalary} • OT {e.overtimePay} • Deductions {e.deductions}
                </div>
              </div>
            ))}
            {unpaidQ.data.entries.length === 0 ? <div style={{ opacity: 0.7 }}>No unpaid entries.</div> : null}
          </div>
        ) : (
          <div style={{ opacity: 0.7 }}>Requires HR role.</div>
        )}
      </section>
    </div>
  );
}

