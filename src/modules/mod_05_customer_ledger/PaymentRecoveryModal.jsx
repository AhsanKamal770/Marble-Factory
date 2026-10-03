import React, { useState } from "react";
import { X, CheckCircle, Wallet, CreditCard, FileText, DollarSign, Info, ChevronDown } from "lucide-react";

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
    <div className="app-modal-overlay" onClick={onClose}>
      <div
        className="app-modal-card"
        style={{ maxWidth: "500px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="app-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div className="app-modal-icon-badge" style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)", boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)" }}>
              <Wallet size={24} color="#ffffff" />
            </div>
            <div>
              <h3 className="app-modal-title">
                Receive Customer Payment
              </h3>
              <p className="app-modal-subtitle">
                ادھار وصولی — Record payment against customer ledger
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="app-modal-close-btn"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div className="app-modal-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            
            {/* Customer Info Card */}
            <div style={{
              padding: "14px 16px",
              background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Customer Khata
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                  {customer.name}
                </div>
                {customer.phone && (
                  <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "2px" }}>
                    {customer.phone}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Current Balance
                </div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: currentBalance > 0 ? "#dc2626" : "#059669", marginTop: "2px" }} className="font-mono">
                  Rs. {currentBalance.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Amount Received */}
            <div className="app-form-group">
              <label className="app-form-label">
                Amount Received (وصول شدہ رقم) <span className="app-form-label-required">*</span>
              </label>
              <div className="app-input-wrapper">
                <DollarSign size={16} className="app-input-icon" />
                <input
                  required
                  type="number"
                  min="1"
                  autoFocus
                  value={formData.amount}
                  onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
                  className="app-form-input font-mono"
                  style={{
                    fontSize: "1.15rem",
                    fontWeight: 800,
                    color: "#059669"
                  }}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="app-form-group">
              <label className="app-form-label">
                Payment Method (طریقہ ادائیگی) <span className="app-form-label-required">*</span>
              </label>
              <div className="app-input-wrapper">
                <CreditCard size={16} className="app-input-icon" />
                <select
                  value={formData.paymentMethod}
                  onChange={e => setFormData(p => ({ ...p, paymentMethod: e.target.value }))}
                  className="app-form-select"
                >
                  <option value="Cash">Cash in Drawer (نقد دراز کیش)</option>
                  <option value="Bank Transfer">Bank Transfer / IBFT (بینک آن لائن)</option>
                  <option value="Cheque">Cheque (بینک چیک)</option>
                  <option value="EasyPaisa / JazzCash">EasyPaisa / JazzCash</option>
                </select>
                <ChevronDown size={14} className="app-input-chevron" />
              </div>
            </div>

            {/* Remarks / Notes */}
            <div className="app-form-group">
              <label className="app-form-label">
                Bank Slip # / Cheque # / Remarks
              </label>
              <div className="app-input-wrapper">
                <FileText size={16} className="app-input-icon" />
                <input
                  type="text"
                  value={formData.notes}
                  onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                  className="app-form-input"
                  placeholder="e.g. HBL Online Slip #9921, Cheque #5582"
                />
              </div>
            </div>

            {/* Live Remaining Balance Calculation Preview */}
            <div style={{
              background: "rgba(5, 150, 105, 0.08)",
              border: "1px dashed rgba(5, 150, 105, 0.35)",
              borderRadius: "10px",
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.85rem"
            }}>
              <span style={{ color: "#334155", fontWeight: 600 }}>
                Remaining Balance after wasooli:
              </span>
              <strong className="font-mono" style={{ color: remainingBalance > 0 ? "#dc2626" : "#059669", fontSize: "1.05rem" }}>
                Rs. {remainingBalance.toLocaleString()}
              </strong>
            </div>

            {/* Notice banner */}
            <div className="app-form-notice">
              <Info size={16} color="#2563eb" style={{ flexShrink: 0 }} />
              <span>All fields marked with <b style={{ color: '#ef4444' }}>*</b> are required.</span>
            </div>

          </div>
          
          {/* Footer */}
          <div className="app-modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="app-btn-cancel"
            >
              <X size={16} />
              Cancel
            </button>
            <button
              type="submit"
              className="app-btn-submit"
              style={{
                background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)"
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
