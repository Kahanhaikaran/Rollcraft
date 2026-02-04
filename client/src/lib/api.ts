export const DEMO_TOKEN = 'demo';

export type ApiOk<T> = { ok: true } & T;
export type ApiErr = { ok: false; error: string; message?: string; details?: unknown };

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function isDemoMode() {
  return accessToken === DEMO_TOKEN;
}

/* ---------- Demo mock data ---------- */
const demoKitchens = [
  { id: 'k1', name: 'Main Kitchen', type: 'KING', geofenceRadiusMeters: 200 },
  { id: 'k2', name: 'Branch North', type: 'BRANCH', geofenceRadiusMeters: 150 },
  { id: 'k3', name: 'Branch South', type: 'BRANCH', geofenceRadiusMeters: 150 },
];

const demoItems = [
  { id: 'i1', name: 'Flour', uom: 'kg' },
  { id: 'i2', name: 'Sugar', uom: 'kg' },
  { id: 'i3', name: 'Butter', uom: 'kg' },
  { id: 'i4', name: 'Yeast', uom: 'g' },
  { id: 'i5', name: 'Oil', uom: 'L' },
];

const demoStock = (kitchenId: string) =>
  demoItems.map((item, i) => ({
    itemId: item.id,
    item,
    onHandQty: [120, 45, 28, 500, 15][i],
    avgCost: [48, 52, 380, 2.5, 180][i],
  }));

const demoTransfersBase = [
  {
    id: 't1',
    fromKitchen: { name: 'Main Kitchen' },
    toKitchen: { name: 'Branch North' },
    status: 'RECEIVED',
    lines: [{ item: { name: 'Flour' }, qty: 25 }, { item: { name: 'Sugar' }, qty: 10 }],
  },
  {
    id: 't2',
    fromKitchen: { name: 'Main Kitchen' },
    toKitchen: { name: 'Branch South' },
    status: 'DISPATCHED',
    lines: [{ item: { name: 'Butter' }, qty: 5 }],
  },
  {
    id: 't3',
    fromKitchen: { name: 'Branch North' },
    toKitchen: { name: 'Main Kitchen' },
    status: 'PENDING',
    lines: [{ item: { name: 'Yeast' }, qty: 100 }],
  },
];
const demoTransfersList = [...demoTransfersBase];

const demoAttendanceEvents = [
  { id: 'e1', type: 'IN', method: 'GEO', createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
  { id: 'e2', type: 'OUT', method: 'GEO', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: 'e3', type: 'IN', method: 'GEO', createdAt: new Date().toISOString() },
];

const demoPayrollEntries = [
  {
    id: 'p1',
    employee: { employeeProfile: { fullName: 'Rahul Sharma' } },
    employeeUserId: 'u1',
    period: { month: 'Jan 2025' },
    netPay: 28500,
    computedSalary: 25000,
    overtimePay: 3500,
    deductions: 0,
  },
  {
    id: 'p2',
    employee: { employeeProfile: { fullName: 'Priya Singh' } },
    employeeUserId: 'u2',
    period: { month: 'Jan 2025' },
    netPay: 24200,
    computedSalary: 22000,
    overtimePay: 2200,
    deductions: 0,
  },
];

function getDemoResponse(path: string, method: string, body?: string): unknown {
  if (method === 'GET') {
    if (path.includes('/kitchens')) return { ok: true as const, kitchens: demoKitchens };
    if (path.includes('/items')) return { ok: true as const, items: demoItems };
    if (path.includes('/stock')) {
      const match = path.match(/kitchenId=([^&]+)/);
      const kid = match ? decodeURIComponent(match[1]) : 'k1';
      return { ok: true as const, kitchenId: kid, stock: demoStock(kid) };
    }
    if (path.includes('/transfers') && !path.includes('/approve') && !path.includes('/dispatch') && !path.includes('/receive')) return { ok: true as const, transfers: demoTransfersList };
    if (path.includes('/attendance/me')) return { ok: true as const, events: demoAttendanceEvents };
    if (path.includes('/payroll/unpaid')) return { ok: true as const, entries: demoPayrollEntries };
    if (path.includes('/dashboard/stats')) {
      return {
        ok: true as const,
        stats: {
          kitchensCount: 3,
          lowStockCount: 2,
          lowStockItems: [
            { itemId: 'i4', itemName: 'Yeast', uom: 'g', onHandQty: 450, reorderPoint: 500 },
            { itemId: 'i5', itemName: 'Oil', uom: 'L', onHandQty: 12, reorderPoint: 15 },
          ],
          depletionLast7Days: 85,
          depletionLast24Hours: 12,
          depletionByType: { CONSUMPTION: { totalQty: 85, count: 14 }, TRANSFER_OUT: { totalQty: 35, count: 2 } },
          recentLedger: [
            { id: 'l1', type: 'CONSUMPTION', qtyDelta: -5, itemName: 'Flour', uom: 'kg', createdAt: new Date().toISOString() },
            { id: 'l2', type: 'PURCHASE', qtyDelta: 50, itemName: 'Rice', uom: 'kg', createdAt: new Date(Date.now() - 3600000).toISOString() },
          ],
        },
      };
    }
  }
  if (method === 'POST') {
    if (path.includes('/auth/logout')) return { ok: true as const };
    if (path.includes('/transfers') && !path.includes('/approve') && !path.includes('/dispatch') && !path.includes('/receive')) {
      const payload = body ? (JSON.parse(body) as { fromKitchenId?: string; toKitchenId?: string; lines?: Array<{ itemId: string; qty: number }> }) : {};
      const fromK = demoKitchens.find((k) => k.id === payload.fromKitchenId) ?? { name: 'From' };
      const toK = demoKitchens.find((k) => k.id === payload.toKitchenId) ?? { name: 'To' };
      const lines = (payload.lines ?? []).map((l) => {
        const item = demoItems.find((i) => i.id === l.itemId);
        return { item: item ?? { name: 'Item', uom: '' }, itemId: l.itemId, qty: l.qty };
      });
      const transfer = {
        id: 'demo-' + Date.now(),
        fromKitchen: fromK,
        toKitchen: toK,
        status: 'PENDING',
        lines,
      };
      demoTransfersList.unshift(transfer);
      return { ok: true as const, transfer };
    }
    if (path.includes('/attendance/check')) {
      return { ok: true as const, event: { id: 'e-demo' }, within: true, distanceMeters: 45, geofenceRadiusMeters: 200 };
    }
    if (path.includes('/stock/consumption')) {
      return { ok: true as const, recorded: 1 };
    }
  }
  return { ok: true as const };
}

async function request<T>(path: string, init?: RequestInit, skipRetry = false): Promise<T> {
  if (accessToken === DEMO_TOKEN) {
    const mock = getDemoResponse(path, init?.method ?? 'GET', init?.body as string | undefined);
    return new Promise((res) => setTimeout(() => res(mock as T), 400));
  }

  const headers = new Headers(init?.headers ?? {});
  headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok || json?.ok === false) {
    if (res.status === 401 && !skipRetry && !path.includes('/auth/')) {
      try {
        const refreshRes = await request<ApiOk<{ accessToken: string }>>('/auth/refresh', { method: 'POST' }, true);
        setAccessToken(refreshRes.accessToken);
        if (typeof localStorage !== 'undefined') localStorage.setItem('rollcraft_access_token', refreshRes.accessToken);
        return request<T>(path, init, true);
      } catch {
        setAccessToken(null);
        if (typeof localStorage !== 'undefined') localStorage.removeItem('rollcraft_access_token');
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }
    const err: ApiErr = json?.ok === false ? (json as ApiErr) : { ok: false, error: 'HttpError', message: res.statusText };
    throw err;
  }
  return json as T;
}

export const api = {
  login: (identifier: string, password: string) =>
    request<ApiOk<{ accessToken: string; user: { id: string; role: string; email?: string; phone?: string; kitchenId?: string | null } }>>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ identifier, password }) },
    ),
  refresh: () => request<ApiOk<{ accessToken: string }>>('/auth/refresh', { method: 'POST' }),
  logout: () =>
    request<ApiOk<Record<string, never>>>('/auth/logout', { method: 'POST' }),

  kitchens: () => request<ApiOk<{ kitchens: unknown[] }>>('/kitchens'),
  items: () => request<ApiOk<{ items: unknown[] }>>('/items'),
  stock: (kitchenId: string) =>
    request<ApiOk<{ kitchenId: string; stock: unknown[] }>>(`/stock?kitchenId=${encodeURIComponent(kitchenId)}`),
  adjustStock: (input: { kitchenId: string; itemId: string; qtyDelta: number; type?: 'ADJUSTMENT' | 'WASTAGE'; reason?: string }) =>
    request<ApiOk<{ ledger: unknown; nextStock: unknown }>>('/stock/adjustments', { method: 'POST', body: JSON.stringify(input) }),

  transfers: () => request<ApiOk<{ transfers: unknown[] }>>('/transfers'),
  createTransfer: (input: { fromKitchenId: string; toKitchenId: string; lines: { itemId: string; qty: number }[] }) =>
    request<ApiOk<{ transfer: unknown }>>('/transfers', { method: 'POST', body: JSON.stringify(input) }),
  approveTransfer: (id: string) => request<ApiOk<{ transfer: unknown }>>(`/transfers/${id}/approve`, { method: 'POST' }),
  dispatchTransfer: (id: string) => request<ApiOk<{ transfer: unknown }>>(`/transfers/${id}/dispatch`, { method: 'POST' }),
  receiveTransfer: (id: string) => request<ApiOk<{ transfer: unknown }>>(`/transfers/${id}/receive`, { method: 'POST' }),

  attendanceMe: () => request<ApiOk<{ events: unknown[] }>>('/attendance/me'),
  attendanceCheck: (input: { kitchenId: string; lat: number; lng: number; type: 'IN' | 'OUT' }) =>
    request<ApiOk<{ event: unknown; within: boolean; distanceMeters: number; geofenceRadiusMeters: number }>>('/attendance/check', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  unpaidPayroll: () => request<ApiOk<{ entries: unknown[] }>>('/payroll/unpaid'),

  dashboardStats: (kitchenId?: string) =>
    request<ApiOk<{
      stats: {
        kitchensCount: number;
        lowStockCount: number;
        lowStockItems: Array<{ itemId: string; itemName: string; uom: string; onHandQty: number; reorderPoint: number }>;
        depletionLast7Days: number;
        depletionLast24Hours: number;
        depletionByType: Record<string, { totalQty: number; count: number }>;
        recentLedger: Array<{ id: string; type: string; qtyDelta: number; itemName: string; uom: string; createdAt: string }>;
      };
    }>>(`/dashboard/stats${kitchenId ? `?kitchenId=${encodeURIComponent(kitchenId)}` : ''}`),

  recordConsumption: (input: { kitchenId: string; lines: { itemId: string; qty: number }[]; reason?: string }) =>
    request<ApiOk<{ recorded: number }>>('/stock/consumption', { method: 'POST', body: JSON.stringify(input) }),
};
