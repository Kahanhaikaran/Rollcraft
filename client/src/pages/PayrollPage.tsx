import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function PayrollPage() {
  const unpaidQ = useQuery({ queryKey: ['payroll-unpaid'], queryFn: api.unpaidPayroll });

  return (
    <div className="page-grid">
      <header className="page-header">
        <h1 className="page-title">Payroll</h1>
        <p className="page-subtitle">Unpaid entries and reminders</p>
      </header>

      <section className="card">
        <div className="card-header">Unpaid entries</div>
        <div className="card-body">
          {unpaidQ.isLoading ? (
            <div className="loading-state">Loading...</div>
          ) : !unpaidQ.data ? (
            <p className="muted">Requires HR role to view unpaid payroll.</p>
          ) : unpaidQ.data.entries.length === 0 ? (
            <p className="empty-state">No unpaid entries.</p>
          ) : (
            <div className="payroll-list">
              {unpaidQ.data.entries.map((e: {
                id: string;
                employee?: { employeeProfile?: { fullName: string } };
                employeeUserId: string;
                period?: { month: string };
                netPay: number;
                computedSalary: number;
                overtimePay: number;
                deductions: number;
              }) => (
                <div key={e.id} className="payroll-card">
                  <div className="payroll-card-top">
                    <div>
                      <strong>{e.employee?.employeeProfile?.fullName ?? e.employeeUserId}</strong>
                      {e.period?.month ? (
                        <span className="muted payroll-period"> {e.period.month}</span>
                      ) : null}
                    </div>
                    <span className="payroll-amount">₹{e.netPay}</span>
                  </div>
                  <div className="payroll-details muted">
                    Salary {e.computedSalary} · OT {e.overtimePay} · Deductions {e.deductions}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
