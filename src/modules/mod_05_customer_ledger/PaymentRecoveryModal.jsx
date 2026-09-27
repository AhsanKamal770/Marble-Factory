import React, { useState } from "react";
import { X, CheckCircle, FileText } from "lucide-react";

export default function PaymentRecoveryModal({ customer, onClose, onSave }) {
  const [formData, setFormData] = useState({
    amount: "",
    paymentMethod: "Cash",
    notes: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!customer) return null;

  return (
    <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1000 }}>
      <div className="modal-card" style={{ maxWidth: "450px", width: "100%", background: "var(--bg-card)", borderRadius: "12px", boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Receive Payment (Wasooli)
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            
            <div style={{ padding: "16px", background: "var(--bg-primary)", borderRadius: "8px", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Customer</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>{customer.name}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Outstanding Balance</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: customer.balanceDue > 0 ? "#ef4444" : "#10b981" }}>
                  Rs. {Number(customer.balanceDue).toLocaleString()}
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>Amount Received *</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontWeight: 600 }}>Rs.</span>
                <input required type="number" min="1" max={customer.balanceDue > 0 ? customer.balanceDue : undefined} value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} style={{ width: "100%", padding: "12px 14px 12px 42px", fontSize: "1.1rem", fontWeight: 700, borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-card)", outline: "none", color: "var(--text-primary)" }} placeholder="0" />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>Payment Method</label>
              <select value={formData.paymentMethod} onChange={e => setFormData(p => ({ ...p, paymentMethod: e.target.value }))} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-card)", outline: "none", color: "var(--text-primary)" }}>
                <option>Cash</option>
                <option>Bank Transfer</option>
                <option>Cheque</option>
                <option>EasyPaisa / JazzCash</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>Remarks / Notes (Optional)</label>
              <input type="text" value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-card)", outline: "none", color: "var(--text-primary)" }} placeholder="E.g. Bank slip #123456" />
            </div>

          </div>
          
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-primary)", borderRadius: "0 0 12px 12px" }}>
             <button type="button" onClick={onClose} style={{ padding: "8px 16px", borderRadius: "6px", background: "none", border: "1px solid var(--border-color)", cursor: "pointer", color: "var(--text-secondary)", fontWeight: 600 }}>Cancel</button>
            <button type="submit" style={{ padding: "10px 24px", borderRadius: "6px", background: "#10b981", border: "none", cursor: "pointer", color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", fontSize: "0.95rem" }}><CheckCircle size={18} /> Confirm Recovery</button>
          </div>
        </form>
      </div>
    </div>
  );
}
