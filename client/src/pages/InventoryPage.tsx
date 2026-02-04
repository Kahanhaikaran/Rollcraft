import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, isDemoMode } from '../lib/api';

export function InventoryPage() {
  const qc = useQueryClient();
  const kitchensQ = useQuery({ queryKey: ['kitchens'], queryFn: api.kitchens });
  const [kitchenId, setKitchenId] = useState<string>('');
  const [consumeItemId, setConsumeItemId] = useState('');
  const [consumeQty, setConsumeQty] = useState('');

  const effectiveKitchenId = useMemo(() => {
    if (kitchenId) return kitchenId;
    const first = kitchensQ.data?.kitchens?.[0];
    return first?.id ?? '';
  }, [kitchenId, kitchensQ.data]);

  const stockQ = useQuery({
    queryKey: ['stock', effectiveKitchenId],
    queryFn: () => api.stock(effectiveKitchenId),
    enabled: !!effectiveKitchenId,
  });

  const recordConsumption = useMutation({
    mutationFn: () =>
      api.recordConsumption({
        kitchenId: effectiveKitchenId,
        lines: [{ itemId: consumeItemId, qty: Number(consumeQty) }],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock', effectiveKitchenId] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setConsumeItemId('');
      setConsumeQty('');
    },
  });

  const stockItems = (stockQ.data?.stock ?? []) as Array<{
    itemId: string;
    item: { name: string; uom: string };
    onHandQty: number;
    avgCost: number;
  }>;

  return (
    <div className="page-grid">
      <header className="page-header page-header-row">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Stock by kitchen</p>
        </div>
        <select
          className="select-compact"
          value={effectiveKitchenId}
          onChange={(e) => setKitchenId(e.target.value)}
        >
          {(kitchensQ.data?.kitchens ?? []).map((k: { id: string; name: string }) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
      </header>

      {!isDemoMode() && stockItems.length > 0 ? (
        <section className="card">
          <div className="card-header">Record consumption</div>
          <div className="card-body">
            <div className="form-row form-row-transfer" style={{ gridTemplateColumns: '1fr 100px auto' }}>
              <select
                value={consumeItemId}
                onChange={(e) => setConsumeItemId(e.target.value)}
                className="select-compact"
              >
                <option value="">Select item</option>
                {stockItems.map((row) => (
                  <option key={row.itemId} value={row.itemId}>
                    {row.item.name} ({row.onHandQty} {row.item.uom})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={consumeQty}
                onChange={(e) => setConsumeQty(e.target.value)}
                placeholder="Qty"
                className="input-num"
              />
              <button
                className="btn-primary"
                disabled={!consumeItemId || !consumeQty || Number(consumeQty) <= 0 || recordConsumption.isPending}
                onClick={() => recordConsumption.mutate()}
              >
                {recordConsumption.isPending ? 'Recording...' : 'Record'}
              </button>
            </div>
            {recordConsumption.isError ? (
              <p className="error-text" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                Failed to record (needs STOREKEEPER role).
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="card card-table-wrap">
        <div className="table-responsive">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Item</th>
                <th className="num">On hand</th>
                <th className="num">Avg cost</th>
              </tr>
            </thead>
            <tbody>
              {stockQ.isLoading ? (
                <tr>
                  <td colSpan={3} className="loading-cell">
                    Loading...
                  </td>
                </tr>
              ) : (stockQ.data?.stock ?? []).length === 0 ? (
                <tr>
                  <td colSpan={3} className="empty-cell">
                    No stock yet. Create items and receive purchases or transfers.
                  </td>
                </tr>
              ) : (
                stockItems.map((row: {
                  itemId: string;
                  item: { name: string; uom: string };
                  onHandQty: number;
                  avgCost: number;
                }) => (
                  <tr key={row.itemId}>
                    <td>
                      <span className="cell-item">{row.item.name}</span>
                      <span className="muted"> ({row.item.uom})</span>
                    </td>
                    <td className="num">{row.onHandQty}</td>
                    <td className="num">{row.avgCost?.toFixed?.(2) ?? row.avgCost}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
