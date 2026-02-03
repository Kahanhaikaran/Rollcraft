import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function SettingsPage() {
  const qc = useQueryClient();
  const kitchensQ = useQuery({ queryKey: ['kitchens'], queryFn: api.kitchens });
  const [name, setName] = useState('');
  const [type, setType] = useState<'KING' | 'BRANCH'>('BRANCH');
  const [address, setAddress] = useState('');

  const createKitchen = useMutation({
    mutationFn: async () => {
      // Note: backend kitchen create requires ADMIN.
      const res = await fetch(`${import.meta.env.VITE_API_BASE ?? 'http://localhost:4000'}/kitchens`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('rollcraft_access_token') ?? ''}`,
        },
        body: JSON.stringify({ name, type, address: address || undefined }),
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw json;
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kitchens'] }),
  });

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2 style={{ marginBottom: 6 }}>Settings</h2>
        <div style={{ opacity: 0.75 }}>Kitchens + geofence</div>
      </div>

      <section style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Create kitchen</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 1fr 120px', gap: 8 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kitchen name" />
          <select value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="KING">KING</option>
            <option value="BRANCH">BRANCH</option>
          </select>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address (optional)" />
          <button disabled={!name || createKitchen.isPending} onClick={() => createKitchen.mutate()}>
            {createKitchen.isPending ? 'Saving...' : 'Create'}
          </button>
        </div>
        {createKitchen.isError ? <div style={{ color: '#b00020', marginTop: 8 }}>Failed to create (needs ADMIN).</div> : null}
      </section>

      <section style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Kitchens</div>
        {kitchensQ.isLoading ? 'Loading...' : null}
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {(kitchensQ.data?.kitchens ?? []).map((k: any) => (
            <li key={k.id}>
              {k.name} ({k.type}) <span style={{ opacity: 0.65 }}>radius {k.geofenceRadiusMeters}m</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

