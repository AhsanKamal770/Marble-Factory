import React, { useState } from "react";
import { X, CheckCircle, Wallet, CreditCard, FileText } from "lucide-react";

export default function PaymentRecoveryModal({ customer, onClose, onSave }) {
  const [formData, setFormData] = useState({
    amount: customer ? (customer.balanceDue > 0 ? customer.balanceDue.toString() : '') : '',
    paymentMethod: "Cash",
    notes: ""
  });

  if (!customer) return null;

  const currentBalance = Number(customer.balanceDue || 0);
  const payAmount = Number(formData.amount || 0);
  const remainingBalance = Math.max(0, currentBalance - payAmount);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!payAmount || payAmount <= 0) return;
    onSave(formData);
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div className="modal-card" style={{
        maxWidth: "460px",
        width: "100%",
        background: "var(--bg-card)",
        borderRadius: "16px",
        boxShadow: "var(--shadow-lg)",
        border: "1px solid var(--border-color)",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 22px",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet size={18} style={{ color: '#059669' }} />
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)" }}>
              Receive Customer Payment (ادھار وصولی)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ padding: "4px", color: "var(--text-muted)" }}
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
            
            {/* Customer Info Pill */}
            <div style={{
              padding: "14px",
              background: "var(--bg-primary)",
              borderRadius: "10px",
              border: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                  Customer Khata
                </div>
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  {customer.name}
                </div>
                {customer.phone && (
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {customer.phone}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                  Outstanding Balance
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: currentBalance > 0 ? "#dc2626" : "#059669" }} className="font-mono">
                  Rs. {currentBalance.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Amount Received */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
                Amount Received (وصول شدہ رقم) *
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontWeight: 700 }}>
                  Rs.
                </span>
                <input
                  required
                  type="number"
                  min="1"
                  autoFocus
                  value={formData.amount}
                  onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
                  className="form-control font-mono"
                  style={{
                    width: "100%",
                    padding: "12px 14px 12px 42px",
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    borderRadius: "8px",
                    border: "1.5px solid var(--border-color)",
                    color: "var(--text-primary)"
                  }}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
                Payment Method (طریقہ ادائیگی)
              </label>
              <select
                value={formData.paymentMethod}
                onChange={e => setFormData(p => ({ ...p, paymentMethod: e.target.value }))}
                className="form-control"
                style={{ padding: "10px 12px", fontSize: "0.9rem" }}
              >
                <option value="Cash">Cash in Drawer (نقد دراز کیش)</option>
                <option value="Bank Transfer">Bank Transfer (بینک آن لائن)</option>
                <option value="Cheque">Cheque (بینک چیک)</option>
                <option value="EasyPaisa / JazzCash">EasyPaisa / JazzCash</option>
              </select>
            </div>

            {/* Remarks / Notes */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
                Bank Slip # / Cheque # / Remarks
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                className="form-control"
                style={{ padding: "10px 12px", fontSize: "0.88rem" }}
                placeholder="e.g. HBL Online Slip #9921, Cheque #5582"
              />
            </div>

            {/* Live Remaining Balance Calculation Preview */}
            <div style={{
              background: "rgba(5, 150, 105, 0.08)",
              border: "1px dashed rgba(5, 150, 105, 0.3)",
              borderRadius: "8px",
              padding: "10px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.82rem"
            }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
                Remaining Balance after recovery:
              </span>
              <strong className="font-mono" style={{ color: remainingBalance > 0 ? "#dc2626" : "#059669", fontSize: "0.95rem" }}>
                Rs. {remainingBalance.toLocaleString()}
              </strong>
            </div>

          </div>
          
          {/* Footer */}
          <div style={{
            padding: "14px 22px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-primary)",
            borderRadius: "0 0 16px 16px"
          }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              style={{
                background: "#059669",
                borderColor: "#059669",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <CheckCircle size={16} />
              <span>Confirm Wasooli</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
