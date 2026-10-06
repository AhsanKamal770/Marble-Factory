import React, { useState } from 'react';
import { CreditCard, Check, X, AlertCircle } from 'lucide-react';
import { db } from '../db/index';

export default function PaymentCollectionModal({ isOpen, onClose, customer, onSuccess }) {
  if (!isOpen || !customer) return null;

  const [amount, setAmount] = useState(customer.balanceDue ? customer.balanceDue.toString() : '');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentBalance = Number(customer.balanceDue || 0);

  const handleQuickAmount = (val) => {
    setAmount(val.toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await db.transaction('rw', [db.customers, db.customer_payments, db.invoices], async () => {
        // Record payment
        const paymentNo = `PAY-${Date.now().toString().slice(-6)}`;
        await db.customer_payments.add({
          paymentNo,
          customerId: customer.id || null,
          customerName: customer.name || 'Walk-in Customer',
          date: new Date().toISOString(),
          amount: payAmount,
          paymentMethod,
          referenceNo: referenceNo || '',
          notes: notes || '',
          invoiceId: customer.invoiceId || null,
          createdAt: new Date().toISOString()
        });

        // 1. If customer exists in db.customers
        if (customer.id) {
          const cust = await db.customers.get(customer.id);
          if (cust) {
            const newTotalPaid = (Number(cust.totalPaid) || 0) + payAmount;
            const newBalance = Math.max(0, (Number(cust.balanceDue) || 0) - payAmount);

            await db.customers.update(customer.id, {
              totalPaid: newTotalPaid,
              balanceDue: newBalance,
              updatedAt: new Date().toISOString()
            });
          }

          if (customer.invoiceId) {
            // Specific targeted invoice
            const targetInv = await db.invoices.get(Number(customer.invoiceId));
            let remaining = payAmount;
            if (targetInv) {
              const invDue = Number(targetInv.balanceDue || 0);
              const alloc = Math.min(invDue, remaining);
              const newInvPaid = (Number(targetInv.paidAmount) || 0) + alloc;
              const newInvDue = Math.max(0, invDue - alloc);
              const newStatus = newInvDue <= 0 ? 'Paid' : (newInvPaid > 0 ? 'Half Paid' : 'Pending');

              await db.invoices.update(targetInv.id, {
                paidAmount: newInvPaid,
                balanceDue: newInvDue,
                paymentStatus: newStatus
              });

              remaining -= alloc;
            }

            // If there's excess amount left over, cascade it across other unpaid invoices (FIFO)
            if (remaining > 0 && customer.id) {
              const allInvoices = await db.invoices.toArray();
              const otherInvoices = allInvoices
                .filter((inv) => String(inv.customerId) === String(customer.id) && inv.id !== Number(customer.invoiceId))
                .sort((a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0));

              for (const inv of otherInvoices) {
                if (remaining <= 0) break;
                const invDue = Number(inv.balanceDue || 0);
                if (invDue > 0) {
                  const alloc = Math.min(invDue, remaining);
                  const newInvPaid = (Number(inv.paidAmount) || 0) + alloc;
                  const newInvDue = Math.max(0, invDue - alloc);
                  const newStatus = newInvDue <= 0 ? 'Paid' : (newInvPaid > 0 ? 'Half Paid' : 'Pending');

                  await db.invoices.update(inv.id, {
                    paidAmount: newInvPaid,
                    balanceDue: newInvDue,
                    paymentStatus: newStatus
                  });

                  remaining -= alloc;
                }
              }
            }
          } else {
            // FIFO Waterfall: Allocate across all customer's invoices (oldest first)
            const allInvoices = await db.invoices.toArray();
            const customerInvoices = allInvoices
              .filter((inv) => String(inv.customerId) === String(customer.id))
              .sort((a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0));

            let remainingToAllocate = payAmount;
            for (const inv of customerInvoices) {
              if (remainingToAllocate <= 0) break;
              const invDue = Number(inv.balanceDue || 0);
              if (invDue > 0) {
                const alloc = Math.min(invDue, remainingToAllocate);
                const newInvPaid = (Number(inv.paidAmount) || 0) + alloc;
                const newInvDue = Math.max(0, invDue - alloc);
                const newStatus = newInvDue <= 0 ? 'Paid' : (newInvPaid > 0 ? 'Half Paid' : 'Pending');

                await db.invoices.update(inv.id, {
                  paidAmount: newInvPaid,
                  balanceDue: newInvDue,
                  paymentStatus: newStatus
                });

                remainingToAllocate -= alloc;
              }
            }
          }
        } else if (customer.invoiceId) {
          // 2. If it is a walk-in invoice
          const targetInv = await db.invoices.get(Number(customer.invoiceId));
          if (targetInv) {
            const invDue = Number(targetInv.balanceDue || 0);
            const alloc = Math.min(invDue, payAmount);
            const newInvPaid = (Number(targetInv.paidAmount) || 0) + alloc;
            const newInvDue = Math.max(0, invDue - alloc);
            const newStatus = newInvDue <= 0 ? 'Paid' : (newInvPaid > 0 ? 'Half Paid' : 'Pending');

            await db.invoices.update(targetInv.id, {
              paidAmount: newInvPaid,
              balanceDue: newInvDue,
              paymentStatus: newStatus
            });
          }
        }
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Payment collection error:', err);
      setError(err?.message || 'Error processing payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{
          maxWidth: '500px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '8px', color: '#10b981' }}>
              <CreditCard size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-primary)' }}>Receive Customer Payment (Wasooli)</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{customer.name || 'Walk-in Customer'}</p>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden',
            minHeight: 0
          }}
        >
          <div
            className="modal-body"
            style={{
              overflowY: 'auto',
              flex: 1,
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px', color: '#fb7185', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem' }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* Current Balance Card */}
            <div style={{ padding: '14px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Current Balance Due (Udhaar)</div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: currentBalance > 0 ? '#e11d48' : '#059669', marginTop: '2px' }} className="font-mono">
                  Rs. {currentBalance.toLocaleString()}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <div>Total Billed: <span className="font-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Rs. {Number(customer.totalBilled || 0).toLocaleString()}</span></div>
                <div>Total Paid: <span className="font-mono" style={{ fontWeight: 600, color: '#059669' }}>Rs. {Number(customer.totalPaid || 0).toLocaleString()}</span></div>
              </div>
            </div>

            {/* Amount input */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Amount Received (Rs.) *</label>
              <input
                type="number"
                step="any"
                min="1"
                required
                className="form-control font-mono"
                style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-blue)' }}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount..."
                autoFocus
              />
            </div>

            {/* Quick Amount Buttons */}
            {currentBalance > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.78rem' }}
                  onClick={() => handleQuickAmount(currentBalance)}
                >
                  Full Balance (Rs. {currentBalance.toLocaleString()})
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.78rem' }}
                  onClick={() => handleQuickAmount(Math.round(currentBalance / 2))}
                >
                  50% (Rs. {Math.round(currentBalance / 2).toLocaleString()})
                </button>
              </div>
            )}

            {/* Payment Method */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Payment Mode</label>
              <select
                className="form-control"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="Cash">Cash (Naqad)</option>
                <option value="Bank Transfer">Bank Transfer (Online / IBFT)</option>
                <option value="Cheque">Cheque</option>
                <option value="JazzCash / EasyPaisa">JazzCash / EasyPaisa</option>
              </select>
            </div>

            {/* Reference No */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Transaction / Cheque / Slip # (Optional)</label>
              <input
                type="text"
                className="form-control"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. TR-894125 or Cheque # 4589"
              />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Payment Note</label>
              <input
                type="text"
                className="form-control"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Received by Kashif for Bungalow project"
              />
            </div>
          </div>

          <div className="modal-footer" style={{ flexShrink: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-emerald" disabled={loading}>
              <Check size={16} /> {loading ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
