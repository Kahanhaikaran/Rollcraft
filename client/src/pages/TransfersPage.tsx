import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function TransfersPage() {
  const qc = useQueryClient();
  const kitchensQ = useQuery({ queryKey: ['kitchens'], queryFn: api.kitchens });
  const itemsQ = useQuery({ queryKey: ['items'], queryFn: api.items });
  const transfersQ = useQuery({ queryKey: ['transfers'], queryFn: api.transfers });

  const [fromKitchenId, setFromKitchenId] = useState('');
  const [toKitchenId, setToKitchenId] = useState('');
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState(1);

  const createMut = useMutation({
    mutationFn: () => api.createTransfer({ fromKitchenId, toKitchenId, lines: [{ itemId, qty }] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transfers'] }),
  });

  return (
    <div className="page-grid">
      <header className="page-header">
        <h1 className="page-title">Transfers</h1>
        <p className="page-subtitle">Move stock between kitchens</p>
      </header>

      <section className="card">
        <div className="card-header">Create transfer request</div>
        <div className="card-body">
          <div className="form-row form-row-transfer">
            <select value={fromKitchenId} onChange={(e) => setFromKitchenId(e.target.value)}>
              <option value="">From kitchen</option>
              {(kitchensQ.data?.kitchens ?? []).map((k: { id: string; name: string }) => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
            <select value={toKitchenId} onChange={(e) => setToKitchenId(e.target.value)}>
              <option value="">To kitchen</option>
              {(kitchensQ.data?.kitchens ?? []).map((k: { id: string; name: string }) => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
            <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">Item</option>
              {(itemsQ.data?.items ?? []).map((i: { id: string; name: string; uom: string }) => (
                <option key={i.id} value={i.id}>{i.name} ({i.uom})</option>
              ))}
            </select>
            <input
              type="number"
              min={0.01}
              step="0.01"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="input-num"
            />
            <button
              className="btn-primary"
              onClick={() => createMut.mutate()}
              disabled={!fromKitchenId || !toKitchenId || !itemId || qty <= 0 || createMut.isPending}
            >
              {createMut.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">Recent transfers</div>
        <div className="card-body">
          {transfersQ.isLoading ? (
            <div className="loading-state">Loading...</div>
          ) : (transfersQ.data?.transfers ?? []).length === 0 ? (
            <p className="empty-state">No transfers yet.</p>
          ) : (
            <div className="transfer-list">
              {(transfersQ.data?.transfers ?? []).slice(0, 20).map((t: {
                id: string;
                fromKitchen?: { name: string };
                toKitchen?: { name: string };
                status: string;
                lines?: Array< { item?: { name: string }; itemId?: string; qty: number }>;
              }) => (
                <div key={t.id} className="transfer-card">
                  <div className="transfer-card-top">
                    <span className="transfer-route">
                      <strong>{t.fromKitchen?.name}</strong> → <strong>{t.toKitchen?.name}</strong>
                    </span>
                    <span className="transfer-status">{t.status}</span>
                  </div>
                  <div className="transfer-lines">
                    {(t.lines ?? []).map((l, i) => (
                      <span key={i}>{l.item?.name ?? l.itemId}: {l.qty}</span>
                    ))}
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
