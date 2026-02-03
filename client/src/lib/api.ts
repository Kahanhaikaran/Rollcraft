export type ApiOk<T> = { ok: true } & T;
export type ApiErr = { ok: false; error: string; message?: string; details?: unknown };

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  const json = (await res.json()) as any;
  if (!res.ok || json?.ok === false) {
    const err: ApiErr = json?.ok === false ? json : { ok: false, error: 'HttpError', message: res.statusText };
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

  kitchens: () => request<ApiOk<{ kitchens: any[] }>>('/kitchens'),
  items: () => request<ApiOk<{ items: any[] }>>('/items'),
  stock: (kitchenId: string) => request<ApiOk<{ kitchenId: string; stock: any[] }>>(`/stock?kitchenId=${encodeURIComponent(kitchenId)}`),
  adjustStock: (input: { kitchenId: string; itemId: string; qtyDelta: number; type?: 'ADJUSTMENT' | 'WASTAGE'; reason?: string }) =>
    request<ApiOk<{ ledger: any; nextStock: any }>>('/stock/adjustments', { method: 'POST', body: JSON.stringify(input) }),

  transfers: () => request<ApiOk<{ transfers: any[] }>>('/transfers'),
  createTransfer: (input: { fromKitchenId: string; toKitchenId: string; lines: { itemId: string; qty: number }[] }) =>
    request<ApiOk<{ transfer: any }>>('/transfers', { method: 'POST', body: JSON.stringify(input) }),
  approveTransfer: (id: string) => request<ApiOk<{ transfer: any }>>(`/transfers/${id}/approve`, { method: 'POST' }),
  dispatchTransfer: (id: string) => request<ApiOk<{ transfer: any }>>(`/transfers/${id}/dispatch`, { method: 'POST' }),
  receiveTransfer: (id: string) => request<ApiOk<{ transfer: any }>>(`/transfers/${id}/receive`, { method: 'POST' }),

  attendanceMe: () => request<ApiOk<{ events: any[] }>>('/attendance/me'),
  attendanceCheck: (input: { kitchenId: string; lat: number; lng: number; type: 'IN' | 'OUT' }) =>
    request<ApiOk<{ event: any; within: boolean; distanceMeters: number; geofenceRadiusMeters: number }>>('/attendance/check', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  unpaidPayroll: () => request<ApiOk<{ entries: any[] }>>('/payroll/unpaid'),
};

