import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ClipboardList,
  Search,
  ArrowUpDown,
  Printer,
  Boxes
} from 'lucide-react';
import { db } from '../db/index';

export default function StockSheetView({ settings }) {
  const [activeTab, setActiveTab] = useState('sheet'); // 'sheet' | 'movements'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');

  const items = useLiveQuery(() => db.items.orderBy('name').toArray(), []) || [];
  const movements = useLiveQuery(async () => {
    const all = await db.stock_movements.toArray();
    return all.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  }, []) || [];

  // Calculations for stock sheet summary
  const totalSqFt = items.reduce((acc, it) => acc + (Number(it.stockSqFt) || 0), 0);
  const totalValuation = items.reduce((acc, it) => acc + ((Number(it.stockSqFt) || 0) * (Number(it.costPerSqFt || it.ratePerSqFt) || 0)), 0);
  const totalPieces = items.reduce((acc, it) => acc + (Number(it.stockPieces) || 0), 0);
  const totalBoxes = items.reduce((acc, it) => acc + (Number(it.stockBoxes) || 0), 0);

  const filteredItems = items.filter((it) =>
    it.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    it.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    it.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMovements = movements.filter((m) => {
    const matchesSearch =
      m.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.refDocNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.movementType?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedTypeFilter === 'ALL') return true;
    return m.movementType?.toLowerCase() === selectedTypeFilter.toLowerCase();
  });

  const handlePrintStockSheet = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 4 Summary Stat Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card">
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
            Total Stock Quantity
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '4px' }} className="font-mono">
            {Math.round(totalSqFt).toLocaleString()} <span style={{ fontSize: '0.85rem' }}>Sq.Ft</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Across {items.length} marble & tile varieties
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
            Total Stock Valuation
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', marginTop: '4px' }} className="font-mono">
            Rs. {Math.round(totalValuation).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Based on purchase / cost rates
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
            Tile Boxes in Stock
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0284c7', marginTop: '4px' }} className="font-mono">
            {totalBoxes.toLocaleString()} <span style={{ fontSize: '0.85rem' }}>Boxes</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Ceramic & porcelain boxed stock
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
            Slabs / Pieces Count
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#7c3aed', marginTop: '4px' }} className="font-mono">
            {totalPieces.toLocaleString()} <span style={{ fontSize: '0.85rem' }}>Pcs</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Counted slabs, steps & borders
          </div>
        </div>
      </div>

      {/* Tabs & Search Controls */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          {/* Tab Switcher */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`btn ${activeTab === 'sheet' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('sheet')}
            >
              <ClipboardList size={16} /> Live Stock Valuation Sheet
            </button>
            <button
              type="button"
              className={`btn ${activeTab === 'movements' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('movements')}
            >
              <ArrowUpDown size={16} /> In/Out Movement Audit Log
            </button>
          </div>

          {/* Search */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input-search"
                style={{ paddingLeft: '34px', fontSize: '0.88rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter items or movements..."
              />
            </div>

            <button type="button" className="btn btn-secondary btn-sm" onClick={handlePrintStockSheet}>
              <Printer size={15} /> Print Report
            </button>
          </div>
        </div>

        {activeTab === 'movements' && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', overflowX: 'auto' }}>
            {['ALL', 'Sale', 'Purchase', 'Sales Return', 'Purchase Return', 'Adjustment', 'Initial'].map((t) => (
              <button
                key={t}
                type="button"
                className={`btn btn-sm ${selectedTypeFilter === t ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedTypeFilter(t)}
              >
                {t === 'ALL' ? 'All Movements' : t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab 1: Live Stock Sheet */}
      {activeTab === 'sheet' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Boxes size={18} className="text-accent" /> Marble & Tile Stock Valuation Sheet
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Generated: {new Date().toLocaleDateString()}
            </span>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Marble Variety</th>
                  <th>Category</th>
                  <th>Finish / Grade</th>
                  <th style={{ textAlign: 'right' }}>Stock (Sq.Ft)</th>
                  <th style={{ textAlign: 'right' }}>Cost / Sq.Ft</th>
                  <th style={{ textAlign: 'right' }}>Sale Rate / Sq.Ft</th>
                  <th style={{ textAlign: 'right' }}>Total Valuation (Cost)</th>
                  <th style={{ textAlign: 'right' }}>Est. Sale Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const sqft = Number(item.stockSqFt || 0);
                  const cost = Number(item.costPerSqFt || item.ratePerSqFt || 0);
                  const saleRate = Number(item.ratePerSqFt || 0);
                  const costVal = sqft * cost;
                  const saleVal = sqft * saleRate;

                  return (
                    <tr key={item.id}>
                      <td className="font-mono text-accent" style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        {item.code}
                      </td>
                      <td style={{ fontWeight: 700 }}>{item.name}</td>
                      <td>{item.category}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{item.finish} • {item.grade}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.95rem' }} className="font-mono">
                        {sqft.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-mono text-muted">
                        Rs. {cost.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }} className="font-mono text-accent">
                        Rs. {saleRate.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }} className="font-mono text-emerald">
                        Rs. {Math.round(costVal).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800 }} className="font-mono">
                        Rs. {Math.round(saleVal).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg-card-header)', fontWeight: 800, borderTop: '2px solid var(--border-color)' }}>
                  <td colSpan={4} style={{ padding: '14px 16px', textTransform: 'uppercase' }}>
                    Total Yard Valuation:
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--accent-blue)', fontSize: '1.05rem' }} className="font-mono">
                    {Math.round(totalSqFt).toLocaleString()} Sq.Ft
                  </td>
                  <td colSpan={2}></td>
                  <td style={{ textAlign: 'right', color: '#059669', fontSize: '1.1rem' }} className="font-mono">
                    Rs. {Math.round(totalValuation).toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text-primary)', fontSize: '1.1rem' }} className="font-mono">
                    Rs. {Math.round(items.reduce((acc, it) => acc + ((Number(it.stockSqFt) || 0) * (Number(it.ratePerSqFt) || 0)), 0)).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: In/Out Movement Audit Log */}
      {activeTab === 'movements' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <ClipboardList size={18} className="text-accent" /> Stock Movement History ({filteredMovements.length})
            </h3>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Marble Variety</th>
                  <th>Movement Type</th>
                  <th>Reference #</th>
                  <th style={{ textAlign: 'right' }}>Change (Sq.Ft)</th>
                  <th style={{ textAlign: 'right' }}>Previous Sq.Ft</th>
                  <th style={{ textAlign: 'right' }}>New Balance (Sq.Ft)</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No stock movement entries found.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((mov) => {
                    const isPositive = Number(mov.changeSqFt) > 0;
                    return (
                      <tr key={mov.id}>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(mov.date || mov.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{mov.itemName}</td>
                        <td>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: mov.movementType === 'Sale' ? 'rgba(225, 29, 72, 0.12)' :
                                       mov.movementType === 'Purchase' ? 'rgba(5, 150, 105, 0.12)' :
                                       mov.movementType === 'Sales Return' ? 'rgba(37, 99, 235, 0.12)' : 'rgba(2, 132, 199, 0.12)',
                            color: mov.movementType === 'Sale' ? '#e11d48' :
                                   mov.movementType === 'Purchase' ? '#059669' :
                                   mov.movementType === 'Sales Return' ? '#2563eb' : '#0284c7'
                          }}>
                            {mov.movementType}
                          </span>
                        </td>
                        <td className="font-mono" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                          {mov.refDocNo || '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }} className={`font-mono ${isPositive ? 'text-emerald' : 'text-rose'}`}>
                          {isPositive ? `+${mov.changeSqFt}` : mov.changeSqFt}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }} className="font-mono">
                          {mov.previousSqFt}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-blue)' }} className="font-mono">
                          {mov.newSqFt}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {mov.note || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
