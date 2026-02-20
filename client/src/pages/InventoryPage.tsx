import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, isDemoMode } from '../lib/api';

const CATEGORY_LABELS: Record<string, string> = {
  BASE_CORE: 'Base / Core',
  VEG_FILLINGS: 'Veg Fillings',
  NON_VEG: 'Non-Veg',
  MOMOS_SPECIFIC: 'Momos',
  ROLLS_WRAPS: 'Rolls / Wraps',
  SPICES_MASALA: 'Spices & Masala',
  SAUCES: 'Sauces',
  OILS_FATS: 'Oils & Fats',
  PACKAGING: 'Packaging',
  MISC: 'Misc',
  UNCATEGORIZED: 'Other',
};

type StockRow = {
  itemId: string;
  item: { name: string; uom: string; category?: string | null };
  onHandQty: number;
  avgCost: number;
};

export function InventoryPage() {
  const qc = useQueryClient();
  const kitchensQ = useQuery({ queryKey: ['kitchens'], queryFn: api.kitchens });
  const categoriesQ = useQuery({ queryKey: ['item-categories'], queryFn: api.itemCategories });
  const [kitchenId, setKitchenId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [consumeItemId, setConsumeItemId] = useState('');
  const [consumeQty, setConsumeQty] = useState('');

  const effectiveKitchenId = useMemo(() => {
    if (kitchenId) return kitchenId;
    const first = kitchensQ.data?.kitchens?.[0];
    return first?.id ?? '';
  }, [kitchenId, kitchensQ.data]);

  const stockQ = useQuery({
    queryKey: ['stock', effectiveKitchenId, search, categoryFilter, groupByCategory],
    queryFn: () =>
      api.stock(effectiveKitchenId, {
        q: search || undefined,
        category: categoryFilter || undefined,
        groupBy: groupByCategory,
      }),
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

  const stockData = stockQ.data;
  const stockItems = (stockData?.stock ?? []) as StockRow[];
  const grouped = stockData?.grouped as Record<string, StockRow[]> | undefined;
  const categories = (categoriesQ.data?.categories ?? []) as string[];

  const renderStockRow = (row: StockRow) => (
    <tr key={row.itemId}>
      <td>
        <span className="cell-item">{row.item.name}</span>
        <span className="muted"> ({row.item.uom})</span>
      </td>
      <td className="num">{row.onHandQty}</td>
      <td className="num">{row.avgCost?.toFixed?.(2) ?? row.avgCost}</td>
    </tr>
  );

  return (
    <div className="page-grid">
      <header className="page-header page-header-row">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Stock by kitchen · rolls & momos SKUs</p>
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

      <section className="card">
        <div className="card-header">Filters & search</div>
        <div className="card-body">
          <div className="form-row inventory-filters">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="input-search"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="select-compact"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c] ?? c}
                </option>
              ))}
            </select>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={groupByCategory}
                onChange={(e) => setGroupByCategory(e.target.checked)}
              />
              Group by category
            </label>
          </div>
        </div>
      </section>

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
                {(recordConsumption.error as { message?: string })?.message ?? 'Failed to record (needs STOREKEEPER role).'}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="card card-table-wrap">
        <div className="card-header">
          Stock ({stockItems.length} items)
        </div>
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
              ) : stockItems.length === 0 ? (
                <tr>
                  <td colSpan={3} className="empty-cell">
                    No stock yet. Create items and receive purchases or transfers.
                  </td>
                </tr>
              ) : groupByCategory && grouped ? (
                Object.entries(grouped).map(([cat, rows]) => (
                  <React.Fragment key={cat}>
                    <tr className="category-header-row">
                      <td colSpan={3}>
                        <strong>{CATEGORY_LABELS[cat] ?? cat}</strong>
                        <span className="muted"> ({rows.length} items)</span>
                      </td>
                    </tr>
                    {rows.map(renderStockRow)}
                  </React.Fragment>
                ))
              ) : (
                stockItems.map(renderStockRow)
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
