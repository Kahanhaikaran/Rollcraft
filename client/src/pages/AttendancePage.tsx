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
  const effectiveKitchenId = useMemo(() => kitchenId || kitchensQ.data?.kitchens?.[0]?.id || '', [kitchenId, kitchensQ.data]);

  const checkMut = useMutation({
    mutationFn: async (type: 'IN' | 'OUT') => {
      const { lat, lng } = await getPosition();
      return api.attendanceCheck({ kitchenId: effectiveKitchenId, lat, lng, type });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance-me'] }),
  });

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2 style={{ marginBottom: 6 }}>Attendance</h2>
        <div style={{ opacity: 0.75 }}>Geo-fenced check-in/out</div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select value={effectiveKitchenId} onChange={(e) => setKitchenId(e.target.value)}>
          {(kitchensQ.data?.kitchens ?? []).map((k: any) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
        <button disabled={!effectiveKitchenId || checkMut.isPending} onClick={() => checkMut.mutate('IN')}>
          Check in
        </button>
        <button disabled={!effectiveKitchenId || checkMut.isPending} onClick={() => checkMut.mutate('OUT')}>
          Check out
        </button>
        {checkMut.data ? (
          <span style={{ fontSize: 13, opacity: 0.8 }}>
            {checkMut.data.within ? 'Within geofence' : 'Override used'} • {Math.round(checkMut.data.distanceMeters)}m
          </span>
        ) : null}
      </div>

      <section style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Recent events</div>
        {meQ.isLoading ? 'Loading...' : null}
        <div style={{ display: 'grid', gap: 6 }}>
          {(meQ.data?.events ?? []).map((e: any) => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>
                <b>{e.type}</b> <span style={{ opacity: 0.7 }}>{e.method}</span>
              </span>
              <span style={{ opacity: 0.7 }}>{new Date(e.createdAt).toLocaleString()}</span>
            </div>
          ))}
          {!meQ.isLoading && (meQ.data?.events ?? []).length === 0 ? <div style={{ opacity: 0.7 }}>No events yet.</div> : null}
        </div>
      </section>
    </div>
  );
}

