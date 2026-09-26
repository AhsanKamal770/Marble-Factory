import React, { useState } from 'react';
import { CreditCard, Check, X, DollarSign, Receipt, AlertCircle } from 'lucide-react';
import { db } from '../db/index';

export default function PaymentCollectionModal({ isOpen, onClose, customer, onSuccess }) {
  if (!isOpen || !customer) return null;

  const [amount, setAmount] = useState('');
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
          customerId: customer.id,
          customerName: customer.name,
          date: new Date().toISOString(),
          amount: payAmount,
          paymentMethod,
          referenceNo,
          notes,
          createdAt: new Date().toISOString()
        });

        // Update customer balance
        const newTotalPaid = (Number(customer.totalPaid) || 0) + payAmount;
        const newBalance = Math.max(0, (Number(customer.balanceDue) || 0) - payAmount);

        await db.customers.update(customer.id, {
          totalPaid: newTotalPaid,
          balanceDue: newBalance,
          updatedAt: new Date().toISOString()
        });

        // Also update any pending invoices for this customer chronologically if desired
        const pendingInvoices = await db.invoices
          .where('customerId')
          .equals(customer.id)
          .toArray();

        let remainingToAllocate = payAmount;
        for (const inv of pendingInvoices) {
          if (remainingToAllocate <= 0) break;
          const invDue = Number(inv.balanceDue || 0);
          if (invDue > 0) {
            const alloc = Math.min(invDue, remainingToAllocate);
            const newInvPaid = (Number(inv.paidAmount) || 0) + alloc;
            const newInvDue = invDue - alloc;
            const newStatus = newInvDue === 0 ? 'Paid' : (newInvPaid > 0 ? 'Half Paid' : 'Pending');

            await db.invoices.update(inv.id, {
              paidAmount: newInvPaid,
              balanceDue: newInvDue,
              paymentStatus: newStatus
            });

            remainingToAllocate -= alloc;
          }
        }
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Error processing payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '8px', color: '#34d399' }}>
              <CreditCard size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>Receive Customer Payment (Wasooli)</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{customer.name} ({customer.customerType || 'Customer'})</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px', color: '#fb7185', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* Current Balance Card */}
            <div style={{ padding: '16px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '10px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Current Balance Due (Udhaar)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: currentBalance > 0 ? '#e11d48' : '#059669' }} className="font-mono">
                  Rs. {currentBalance.toLocaleString()}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <div>Total Billed: Rs. {Number(customer.totalBilled || 0).toLocaleString()}</div>
                <div>Total Paid: Rs. {Number(customer.totalPaid || 0).toLocaleString()}</div>
              </div>
            </div>

            {/* Amount input */}
            <div className="form-group">
              <label className="form-label">Amount Received (Rs.) *</label>
              <input
                type="number"
                step="1"
                min="1"
                required
                className="form-control font-mono"
                style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-blue)' }}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount..."
                autoFocus
              />
            </div>

            {/* Quick Amount Buttons */}
            {currentBalance > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleQuickAmount(currentBalance)}
                >
                  Full Balance (Rs. {currentBalance.toLocaleString()})
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleQuickAmount(Math.round(currentBalance / 2))}
                >
                  50% (Rs. {Math.round(currentBalance / 2).toLocaleString()})
                </button>
              </div>
            )}

            {/* Payment Method */}
            <div className="form-group">
              <label className="form-label">Payment Mode</label>
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
              <label className="form-label">Transaction / Cheque / Slip # (Optional)</label>
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
              <label className="form-label">Payment Note</label>
              <input
                type="text"
                className="form-control"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Received by Kashif for Bungalow project"
              />
            </div>
          </div>

          <div className="modal-footer">
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
