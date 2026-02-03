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
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Inventory</h2>
          <div style={{ opacity: 0.75 }}>Stock by kitchen</div>
        </div>
        <select value={effectiveKitchenId} onChange={(e) => setKitchenId(e.target.value)}>
          {(kitchensQ.data?.kitchens ?? []).map((k: any) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ border: '1px solid #eee', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }}>Item</th>
              <th style={{ textAlign: 'right', padding: 10, borderBottom: '1px solid #eee' }}>On hand</th>
              <th style={{ textAlign: 'right', padding: 10, borderBottom: '1px solid #eee' }}>Avg cost</th>
            </tr>
          </thead>
          <tbody>
            {stockQ.isLoading ? (
              <tr>
                <td style={{ padding: 10 }} colSpan={3}>
                  Loading...
                </td>
              </tr>
            ) : null}
            {(stockQ.data?.stock ?? []).map((row: any) => (
              <tr key={row.itemId}>
                <td style={{ padding: 10, borderBottom: '1px solid #f2f2f2' }}>
                  {row.item.name} <span style={{ opacity: 0.65 }}>({row.item.uom})</span>
                </td>
                <td style={{ padding: 10, textAlign: 'right', borderBottom: '1px solid #f2f2f2' }}>{row.onHandQty}</td>
                <td style={{ padding: 10, textAlign: 'right', borderBottom: '1px solid #f2f2f2' }}>{row.avgCost.toFixed?.(2) ?? row.avgCost}</td>
              </tr>
            ))}
            {!stockQ.isLoading && (stockQ.data?.stock ?? []).length === 0 ? (
              <tr>
                <td style={{ padding: 10, opacity: 0.7 }} colSpan={3}>
                  No stock rows yet. Create items and receive purchases/transfers.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

