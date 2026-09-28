import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Search,
  Printer,
  Trash2,
  DollarSign,
  FileText,
  Truck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { db, adjustItemStock } from '../db/index';
import Badge from '../components/Badge';
import BillPrintModal from '../components/BillPrintModal';
import PaymentCollectionModal from '../components/PaymentCollectionModal';
import { useLanguage } from '../context/LanguageContext';

export default function InvoicesView({ settings }) {
  const { language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Live Query from Dexie DB
  const invoices = useLiveQuery(async () => {
    const all = await db.invoices.toArray();
    return all.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  }, []) || [];

  const handlePrint = (inv) => {
    setSelectedInvoice(inv);
    setIsPrintModalOpen(true);
  };

  const handleCollectPayment = async (inv) => {
    if (inv.customerId) {
      const cust = await db.customers.get(inv.customerId);
      if (cust) {
        setSelectedCustomerForPayment(cust);
        setIsPaymentOpen(true);
        return;
      }
    }
    // For walk-in customer
    setSelectedCustomerForPayment({
      id: null,
      name: inv.customerName,
      balanceDue: inv.balanceDue,
      totalBilled: inv.grandTotal,
      totalPaid: inv.paidAmount,
      customerType: 'Retail'
    });
    setIsPaymentOpen(true);
  };

  const handleDeleteInvoice = async (inv) => {
    if (!window.confirm(language === 'ur' ? `کیا آپ واقعی بل نمبر #${inv.invoiceNo} منسوخ کرنا چاہتے ہیں؟ اس سے تمام آئٹمز کا اسٹاک واپس ہو جائے گا۔` : `Are you sure you want to void invoice #${inv.invoiceNo}? This will return all ${inv.items?.length || 0} items back to inventory stock.`)) {
      return;
    }

    try {
      await db.transaction('rw', [db.invoices, db.items, db.customers, db.stock_movements], async () => {
        // Return stock
        for (const item of inv.items || []) {
          if (item.itemId) {
            await adjustItemStock(
              item.itemId,
              Number(item.totalSqFt || item.sqFt || 0),
              Number(item.boxes || 0),
              Number(item.pieces || 0),
              'Adjustment',
              inv.invoiceNo,
              `Voided Invoice #${inv.invoiceNo} - Stock Restored`
            );
          }
        }

        // Adjust customer ledger if registered
        if (inv.customerId) {
          const cust = await db.customers.get(inv.customerId);
          if (cust) {
            await db.customers.update(inv.customerId, {
              totalBilled: Math.max(0, (Number(cust.totalBilled) || 0) - Number(inv.grandTotal || 0)),
              totalPaid: Math.max(0, (Number(cust.totalPaid) || 0) - Number(inv.paidAmount || 0)),
              balanceDue: Math.max(0, (Number(cust.balanceDue) || 0) - Number(inv.balanceDue || 0))
            });
          }
        }

        await db.invoices.delete(inv.id);
      });
    } catch (err) {
      alert('Error deleting invoice: ' + err.message);
    }
  };

  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerPhone?.includes(searchTerm);

    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    return inv.paymentStatus?.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Filter & Search Bar */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              className="input-search"
              style={{ paddingLeft: '36px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === 'ur' ? "تلاش: بل نمبر، گاہک کا نام یا فون..." : "Search by Invoice #, Customer Name, or Phone..."}
            />
          </div>

          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {['ALL', 'Paid', 'Half Paid', 'Udhar'].map((status) => (
              <button
                key={status}
                type="button"
                className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter(status)}
              >
                {status === 'ALL' ? (language === 'ur' ? 'تمام بلز (All)' : 'All Invoices') : status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <FileText size={18} className="text-gold" /> {language === 'ur' ? `سیلز انوائس رجسٹر (${filtered.length})` : `Sales Invoices Register (${filtered.length})`}
          </h3>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{language === 'ur' ? 'بل نمبر' : 'Invoice #'}</th>
                <th>{language === 'ur' ? 'تاریخ و وقت' : 'Date & Time'}</th>
                <th>{language === 'ur' ? 'خریدار / کھاتہ' : 'Customer / Account'}</th>
                <th>{language === 'ur' ? 'آئٹمز' : 'Items'}</th>
                <th>{language === 'ur' ? 'کل بل رقم' : 'Grand Total'}</th>
                <th>{language === 'ur' ? 'نقد وصولی' : 'Paid Amount'}</th>
                <th>{language === 'ur' ? 'بقایا ادھار' : 'Balance Due'}</th>
                <th>{language === 'ur' ? 'اسٹیٹس' : 'Status'}</th>
                <th style={{ textAlign: 'center' }}>{language === 'ur' ? 'ایکشن' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    {language === 'ur' ? 'کوئی انوائس ریکارڈ نہیں ملا۔' : 'No invoices match your filter criteria.'}
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id}>
                    <td className="font-mono text-accent" style={{ fontWeight: 700 }}>
                      {inv.invoiceNo}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {new Date(inv.date || inv.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{inv.customerName}</div>
                      {inv.customerPhone && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.customerPhone}</div>}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {inv.items?.length || 0} items
                    </td>
                    <td className="font-mono" style={{ fontWeight: 800 }}>
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
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handlePrint(inv)}
                          title="Print A4 / 80mm Bill"
                        >
                          <Printer size={14} className="text-accent" />
                        </button>
                        {Number(inv.balanceDue || 0) > 0 && (
                          <button
                            className="btn btn-emerald btn-sm"
                            onClick={() => handleCollectPayment(inv)}
                            title="Collect Pending Payment"
                          >
                            <DollarSign size={14} />
                          </button>
                        )}
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#fb7185' }}
                          onClick={() => handleDeleteInvoice(inv)}
                          title="Void Invoice & Return Stock"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* A4 Bill Book & 80mm Thermal Receipt Modal */}
      {isPrintModalOpen && selectedInvoice && (
        <BillPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          invoice={selectedInvoice}
          settings={settings}
        />
      )}

      {/* Payment Recovery Modal */}
      {isPaymentOpen && selectedCustomerForPayment && (
        <PaymentCollectionModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          customer={selectedCustomerForPayment}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
