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
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2 style={{ marginBottom: 6 }}>Transfers</h2>
        <div style={{ opacity: 0.75 }}>King kitchen to branches and back</div>
      </div>

      <section style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Create transfer request</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 120px 120px', gap: 8 }}>
          <select value={fromKitchenId} onChange={(e) => setFromKitchenId(e.target.value)}>
            <option value="">From kitchen</option>
            {(kitchensQ.data?.kitchens ?? []).map((k: any) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
          <select value={toKitchenId} onChange={(e) => setToKitchenId(e.target.value)}>
            <option value="">To kitchen</option>
            {(kitchensQ.data?.kitchens ?? []).map((k: any) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
          <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">Item</option>
            {(itemsQ.data?.items ?? []).map((i: any) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.uom})
              </option>
            ))}
          </select>
          <input type="number" min={0.01} step="0.01" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
          <button
            onClick={() => createMut.mutate()}
            disabled={!fromKitchenId || !toKitchenId || !itemId || qty <= 0 || createMut.isPending}
          >
            {createMut.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </section>

      <section style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Recent transfers</div>
        {transfersQ.isLoading ? 'Loading...' : null}
        <div style={{ display: 'grid', gap: 8 }}>
          {(transfersQ.data?.transfers ?? []).slice(0, 20).map((t: any) => (
            <div key={t.id} style={{ border: '1px solid #f0f0f0', borderRadius: 10, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <b>{t.fromKitchen?.name}</b> → <b>{t.toKitchen?.name}</b>
                </div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{t.status}</div>
              </div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>
                {(t.lines ?? []).map((l: any) => `${l.item?.name ?? l.itemId}: ${l.qty}`).join(', ')}
              </div>
            </div>
          ))}
          {!transfersQ.isLoading && (transfersQ.data?.transfers ?? []).length === 0 ? (
            <div style={{ opacity: 0.7 }}>No transfers yet.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

