import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function InventoryPage() {
  const kitchensQ = useQuery({ queryKey: ['kitchens'], queryFn: api.kitchens });
  const [kitchenId, setKitchenId] = useState<string>('');

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
                (stockQ.data?.stock ?? []).map((row: {
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
