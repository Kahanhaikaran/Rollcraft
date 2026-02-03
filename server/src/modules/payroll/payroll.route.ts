import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../lib/http.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireRoleAtLeast, Role } from '../auth/rbac.js';
import { auditLog } from '../audit/audit.js';

export const payrollRouter = Router();

function monthKeyFromDate(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function toMonthRange(month: string) {
  // month: YYYY-MM
  const [yStr, mStr] = month.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  if (!y || !m || m < 1 || m > 12) throw new HttpError(400, 'ValidationError', 'Invalid month');
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { start, end };
}

// Generate payroll period + entries from EmployeeProfile and ShiftDaySummary.
payrollRouter.post('/payroll/periods/generate', requireAuth, requireRoleAtLeast(Role.HR), async (req, res, next) => {
  try {
    const month = typeof req.query.month === 'string' ? req.query.month : monthKeyFromDate(new Date());
    const { start, end } = toMonthRange(month);

    const existing = await prisma.payrollPeriod.findUnique({ where: { month } });
    if (existing) return res.json({ ok: true, period: existing, alreadyExisted: true });

    const employees = await prisma.user.findMany({
      where: { isActive: true, employeeProfile: { isNot: null } },
      include: { employeeProfile: true },
    });

    const period = await prisma.$transaction(async (tx) => {
      const created = await tx.payrollPeriod.create({ data: { month, status: 'DRAFT' } });

      for (const emp of employees) {
        const profile = emp.employeeProfile!;
        const summaries = await tx.shiftDaySummary.findMany({
          where: { employeeUserId: emp.id, date: { gte: start, lt: end } },
        });

        const totalLateMinutes = summaries.reduce((a, s) => a + s.minutesLate, 0);
        const totalOvertimeMinutes = summaries.reduce((a, s) => a + s.overtimeMinutes, 0);

        const overtimePay = Math.round((totalOvertimeMinutes / 60) * profile.overtimeRatePerHour);
        const deductions = totalLateMinutes * profile.latePenaltyPerMinute;
        const computedSalary = profile.baseSalaryMonthly;
        const netPay = computedSalary + overtimePay - deductions;

        await tx.payrollEntry.create({
          data: {
            periodId: created.id,
            employeeUserId: emp.id,
            computedSalary,
            overtimePay,
            deductions,
            netPay,
          },
        });
      }

      return created;
    });

    await auditLog({ actorUserId: req.user?.id, action: 'PAYROLL_GENERATE', entityType: 'PayrollPeriod', entityId: period.id, meta: { month } });
    res.json({ ok: true, period, alreadyExisted: false });
  } catch (err) {
    next(err);
  }
});

payrollRouter.get('/payroll/periods/:id', requireAuth, requireRoleAtLeast(Role.HR), async (req, res, next) => {
  try {
    const period = await prisma.payrollPeriod.findUnique({
      where: { id: req.params.id },
      include: { entries: { include: { employee: { include: { employeeProfile: true } } } } },
    });
    if (!period) throw new HttpError(404, 'PayrollPeriodNotFound');
    res.json({ ok: true, period });
  } catch (err) {
    next(err);
  }
});

payrollRouter.post('/payroll/periods/:id/finalize', requireAuth, requireRoleAtLeast(Role.HR), async (req, res, next) => {
  try {
    const id = req.params.id;
    const period = await prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) throw new HttpError(404, 'PayrollPeriodNotFound');
    if (period.status !== 'DRAFT') throw new HttpError(400, 'InvalidPayrollStatus');

    const updated = await prisma.payrollPeriod.update({ where: { id }, data: { status: 'FINAL' } });
    await auditLog({ actorUserId: req.user?.id, action: 'PAYROLL_FINALIZE', entityType: 'PayrollPeriod', entityId: id, meta: {} });
    res.json({ ok: true, period: updated });
  } catch (err) {
    next(err);
  }
});

payrollRouter.post('/payroll/entries/:id/mark-paid', requireAuth, requireRoleAtLeast(Role.HR), async (req, res, next) => {
  try {
    const id = req.params.id;
    const entry = await prisma.payrollEntry.findUnique({ where: { id }, include: { period: true } });
    if (!entry) throw new HttpError(404, 'PayrollEntryNotFound');
    if (entry.paidAt) throw new HttpError(400, 'AlreadyPaid');

    const updated = await prisma.payrollEntry.update({ where: { id }, data: { paidAt: new Date() } });

    // Create a reminder record as done (audit trail), optional.
    await prisma.reminder.create({
      data: {
        type: 'PAYROLL_DUE',
        dueAt: new Date(),
        status: 'DONE',
        payload: { payrollEntryId: id, month: entry.period.month },
        createdByUserId: req.user?.id ?? null,
        doneAt: new Date(),
      },
    });

    await auditLog({ actorUserId: req.user?.id, action: 'PAYROLL_MARK_PAID', entityType: 'PayrollEntry', entityId: id, meta: {} });
    res.json({ ok: true, entry: updated });
  } catch (err) {
    next(err);
  }
});

// List unpaid entries (acts as payroll reminders)
payrollRouter.get('/payroll/unpaid', requireAuth, requireRoleAtLeast(Role.HR), async (req, res) => {
  const entries = await prisma.payrollEntry.findMany({
    where: { paidAt: null },
    include: { period: true, employee: { include: { employeeProfile: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ ok: true, entries });
});

