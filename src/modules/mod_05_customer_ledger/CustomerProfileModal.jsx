import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";

export default function CustomerProfileModal({ customer, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    city: "",
    customerType: "Retail", // Retail, Wholesale, Builder
    balanceDue: 0,
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        ...customer,
      });
    }
  }, [customer]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1000 }}>
      <div className="modal-card" style={{ maxWidth: "500px", width: "100%", background: "var(--bg-card)", borderRadius: "12px", boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {customer ? "Edit Customer Profile" : "Add New Customer"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>Customer Name *</label>
              <input required type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-primary)", outline: "none", color: "var(--text-primary)" }} placeholder="e.g. Ali Ahmed" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>Phone Number</label>
                <input type="text" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-primary)", outline: "none", color: "var(--text-primary)", fontFamily: "monospace" }} placeholder="0300-1234567" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>City</label>
                <input type="text" value={formData.city} onChange={e => setFormData(p => ({ ...p, city: e.target.value }))} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-primary)", outline: "none", color: "var(--text-primary)" }} placeholder="e.g. Faisalabad" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>Customer Type</label>
                <select value={formData.customerType} onChange={e => setFormData(p => ({ ...p, customerType: e.target.value }))} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-primary)", outline: "none", color: "var(--text-primary)" }}>
                  <option>Retail</option>
                  <option>Wholesale</option>
                  <option>Builder</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>Opening Balance</label>
                <input type="number" disabled={!!customer} value={formData.balanceDue} onChange={e => setFormData(p => ({ ...p, balanceDue: Number(e.target.value) }))} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", background: !!customer ? "var(--bg-hover)" : "var(--bg-primary)", outline: "none", color: "var(--text-primary)" }} placeholder="0" />
                {!!customer && <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>Balance cannot be changed directly after creation.</div>}
              </div>
            </div>
          </div>
          
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: "10px", background: "var(--bg-primary)", borderRadius: "0 0 12px 12px" }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 16px", borderRadius: "6px", background: "none", border: "1px solid var(--border-color)", cursor: "pointer", color: "var(--text-secondary)", fontWeight: 600 }}>Cancel</button>
            <button type="submit" style={{ padding: "8px 20px", borderRadius: "6px", background: "var(--accent-blue)", border: "none", cursor: "pointer", color: "#fff", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}><Save size={16} /> Save Profile</button>
          </div>
        </form>
      </div>
    </div>
  );
}
