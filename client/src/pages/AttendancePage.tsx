import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

function getPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

export function AttendancePage() {
  const qc = useQueryClient();
  const kitchensQ = useQuery({ queryKey: ['kitchens'], queryFn: api.kitchens });
  const meQ = useQuery({ queryKey: ['attendance-me'], queryFn: api.attendanceMe });
  const [kitchenId, setKitchenId] = useState('');
  const effectiveKitchenId = useMemo(
    () => kitchenId || kitchensQ.data?.kitchens?.[0]?.id || '',
    [kitchenId, kitchensQ.data],
  );

  const checkMut = useMutation({
    mutationFn: async (type: 'IN' | 'OUT') => {
      const { lat, lng } = await getPosition();
      return api.attendanceCheck({ kitchenId: effectiveKitchenId, lat, lng, type });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance-me'] }),
  });

  return (
    <div className="page-grid">
      <header className="page-header">
        <h1 className="page-title">Attendance</h1>
        <p className="page-subtitle">Geo-fenced check-in and check-out</p>
      </header>

      <section className="card">
        <div className="card-header">Check in / out</div>
        <div className="card-body">
          <div className="attendance-actions">
            <select
              value={effectiveKitchenId}
              onChange={(e) => setKitchenId(e.target.value)}
              className="select-compact"
            >
              {(kitchensQ.data?.kitchens ?? []).map((k: { id: string; name: string }) => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
            <button
              className="btn-primary"
              disabled={!effectiveKitchenId || checkMut.isPending}
              onClick={() => checkMut.mutate('IN')}
            >
              Check in
            </button>
            <button
              className="btn-secondary"
              disabled={!effectiveKitchenId || checkMut.isPending}
              onClick={() => checkMut.mutate('OUT')}
            >
              Check out
            </button>
            {checkMut.data ? (
              <span className="attendance-feedback muted">
                {checkMut.data.within ? 'Within geofence' : 'Override used'} · {Math.round(checkMut.data.distanceMeters)}m
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">Recent events</div>
        <div className="card-body">
          {meQ.isLoading ? (
            <div className="loading-state">Loading...</div>
          ) : (meQ.data?.events ?? []).length === 0 ? (
            <p className="empty-state">No events yet.</p>
          ) : (
            <ul className="event-list">
              {(meQ.data?.events ?? []).map((e: { id: string; type: string; method: string; createdAt: string }) => (
                <li key={e.id} className="event-item">
                  <span>
                    <strong>{e.type}</strong> <span className="muted">{e.method}</span>
                  </span>
                  <span className="muted">{new Date(e.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
