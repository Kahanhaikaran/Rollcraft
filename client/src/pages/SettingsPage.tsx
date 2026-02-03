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
    <div className="page-grid">
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Kitchens and geofence</p>
      </header>

      <section className="card">
        <div className="card-header">Create kitchen</div>
        <div className="card-body">
          <div className="form-row form-row-settings">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kitchen name"
            />
            <select value={type} onChange={(e) => setType(e.target.value as 'KING' | 'BRANCH')}>
              <option value="KING">KING</option>
              <option value="BRANCH">BRANCH</option>
            </select>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address (optional)"
            />
            <button
              className="btn-primary"
              disabled={!name || createKitchen.isPending}
              onClick={() => createKitchen.mutate()}
            >
              {createKitchen.isPending ? 'Saving...' : 'Create'}
            </button>
          </div>
          {createKitchen.isError ? (
            <p className="error-text settings-error">Failed to create (needs ADMIN).</p>
          ) : null}
        </div>
      </section>

      <section className="card">
        <div className="card-header">Kitchens</div>
        <div className="card-body">
          {kitchensQ.isLoading ? (
            <div className="loading-state">Loading...</div>
          ) : (kitchensQ.data?.kitchens ?? []).length === 0 ? (
            <p className="empty-state">No kitchens yet.</p>
          ) : (
            <ul className="list-modern">
              {(kitchensQ.data?.kitchens ?? []).map((k: {
                id: string;
                name: string;
                type: string;
                geofenceRadiusMeters?: number;
              }) => (
                <li key={k.id} className="list-item-with-meta">
                  <span className="list-item-icon">🏠</span>
                  <span>
                    <strong>{k.name}</strong> <span className="muted">({k.type})</span>
                    {k.geofenceRadiusMeters != null ? (
                      <span className="muted"> · radius {k.geofenceRadiusMeters}m</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
