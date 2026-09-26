import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  CreditCard,
  AlertCircle,
  Boxes,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  Users,
  Sparkles
} from 'lucide-react';
import { db } from '../db/index';
import Badge from '../components/Badge';
import ThermalReceiptModal from '../components/ThermalReceiptModal';

export default function DashboardView({ setActiveView, settings }) {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalReceived: 0,
    totalDue: 0,
    totalStockSqFt: 0,
    totalStockValue: 0,
    invoicesCount: 0,
    customersCount: 0
  });

  const [recentInvoices, setRecentInvoices] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isThermalOpen, setIsThermalOpen] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const invoices = await db.invoices.toArray();
      const items = await db.items.toArray();
      const customers = await db.customers.toArray();

      let totalSales = 0;
      let totalReceived = 0;
      let totalDue = 0;

      invoices.forEach((inv) => {
        totalSales += Number(inv.grandTotal || 0);
        totalReceived += Number(inv.paidAmount || 0);
        totalDue += Number(inv.balanceDue || 0);
      });

      let totalStockSqFt = 0;
      let totalStockValue = 0;
      const lowStock = [];

      items.forEach((it) => {
        const sqft = Number(it.stockSqFt || 0);
        const rate = Number(it.costPerSqFt || it.ratePerSqFt || 0);
        totalStockSqFt += sqft;
        totalStockValue += sqft * rate;

        if (sqft <= Number(it.minStockAlert || 50)) {
          lowStock.push(it);
        }
      });

      setStats({
        totalSales,
        totalReceived,
        totalDue,
        totalStockSqFt,
        totalStockValue,
        invoicesCount: invoices.length,
        customersCount: customers.length
      });

      // Recent 5 invoices
      const sortedInvoices = [...invoices].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      ).slice(0, 6);
      setRecentInvoices(sortedInvoices);

      setLowStockItems(lowStock.slice(0, 5));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  const handleOpenReceipt = (invoice) => {
    setSelectedInvoice(invoice);
    setIsThermalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner with Quick Actions */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #0f172a 100%)',
        border: '1px solid #3b82f6',
        borderRadius: '14px',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '0.8rem',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              padding: '3px 10px',
              borderRadius: '6px',
              fontWeight: 700,
              letterSpacing: '0.04em'
            }}>
              FACTORY DASHBOARD
            </span>
            <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{settings?.companyName}</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginTop: '6px' }}>
            Marble, Granite & Tile Factory Operations
          </h2>
          <p style={{ color: '#e2e8f0', fontSize: '0.88rem', maxWidth: '650px' }}>
            Monitor real-time yard inventory, daily billing, customer khata receivables and supplier orders.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setActiveView('billing')}>
            <PlusCircle size={16} /> New Sale Invoice
          </button>
          <button className="btn btn-secondary" style={{ background: '#ffffff', color: '#0f172a', border: 'none' }} onClick={() => setActiveView('stock')}>
            <Boxes size={16} /> Add Marble Stock
          </button>
          <button className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }} onClick={() => setActiveView('customers')}>
            <Users size={16} /> Customer Khata
          </button>
        </div>
      </div>

      {/* 4 Primary Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
        {/* Total Billed */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Total Factory Sales
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }} className="font-mono">
                Rs. {stats.totalSales.toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '10px', background: 'rgba(37, 99, 235, 0.12)', borderRadius: '10px', color: 'var(--accent-blue)' }}>
              <TrendingUp size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '0.8rem', color: '#059669' }}>
            <ArrowUpRight size={14} />
            <span>Cumulative Invoiced Sales</span>
          </div>
        </div>

        {/* Total Cash Collected */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Cash / Bank Wasooli
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', marginTop: '6px' }} className="font-mono">
                Rs. {stats.totalReceived.toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.12)', borderRadius: '10px', color: '#059669' }}>
              <CreditCard size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>Received Amount across all bills</span>
          </div>
        </div>

        {/* Outstanding Receivables (Udhaar) */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Customer Udhaar (Due)
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stats.totalDue > 0 ? '#e11d48' : '#059669', marginTop: '6px' }} className="font-mono">
                Rs. {stats.totalDue.toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '10px', background: 'rgba(225, 29, 72, 0.12)', borderRadius: '10px', color: '#e11d48' }}>
              <AlertCircle size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '0.8rem', color: '#e11d48' }}>
            <ArrowDownRight size={14} />
            <span>Pending Receivables / Khata</span>
          </div>
        </div>

        {/* Total Stock in Yard */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Stock in Factory Yard
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '6px' }} className="font-mono">
                {stats.totalStockSqFt.toLocaleString()} <span style={{ fontSize: '0.9rem' }}>Sq.Ft</span>
              </div>
            </div>
            <div style={{ padding: '10px', background: 'rgba(37, 99, 235, 0.12)', borderRadius: '10px', color: 'var(--accent-blue)' }}>
              <Boxes size={22} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>Est. Valuation: Rs. {stats.totalStockValue.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Invoices & Low Stock Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Recent Invoices */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Sparkles size={18} className="text-accent" /> Recent Sales Invoices
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveView('invoices')}>
              View All Invoices
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Total Amount</th>
                  <th>Paid</th>
                  <th>Balance Due</th>
                  <th>Status</th>
                  <th>Print</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      No invoices recorded yet. Click "New Sale Invoice" to start.
                    </td>
                  </tr>
                ) : (
                  recentInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="font-mono text-accent" style={{ fontWeight: 700 }}>{inv.invoiceNo}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{inv.customerName}</div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{inv.customerPhone}</div>
                      </td>
                      <td className="font-mono" style={{ fontWeight: 700 }}>
                        Rs. {Number(inv.grandTotal || 0).toLocaleString()}
                      </td>
                      <td className="font-mono text-emerald" style={{ fontWeight: 600 }}>
                        Rs. {Number(inv.paidAmount || 0).toLocaleString()}
                      </td>
                      <td className="font-mono text-rose" style={{ fontWeight: 700 }}>
                        Rs. {Number(inv.balanceDue || 0).toLocaleString()}
                      </td>
                      <td>
                        <Badge status={inv.paymentStatus} />
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenReceipt(inv)}
                          title="View & Print 80mm Thermal Receipt"
                        >
                          <Printer size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <AlertCircle size={18} className="text-rose" /> Low Stock Alerts
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveView('stock')}>
              Stock List
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {lowStockItems.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                All marble & tile inventory levels are healthy!
              </div>
            ) : (
              lowStockItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.category} • {item.grade}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#e11d48' }} className="font-mono">
                      {item.stockSqFt} Sq.Ft
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Min Alert: {item.minStockAlert}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Thermal Receipt Modal */}
      {isThermalOpen && selectedInvoice && (
        <ThermalReceiptModal
          isOpen={isThermalOpen}
          onClose={() => setIsThermalOpen(false)}
          invoice={selectedInvoice}
          settings={settings}
        />
      )}
    </div>
  );
}
