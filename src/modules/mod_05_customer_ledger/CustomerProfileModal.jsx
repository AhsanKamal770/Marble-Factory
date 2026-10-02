import React, { useState, useEffect } from "react";
import { X, Save, User, Phone, MapPin, CreditCard } from "lucide-react";

export default function CustomerProfileModal({ customer, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    cnic: "",
    city: "Karachi",
    address: "",
    creditLimit: 0,
    balanceDue: 0,
    notes: ""
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        ...customer,
        creditLimit: Number(customer.creditLimit || 0),
        balanceDue: Number(customer.balanceDue || 0)
      });
    }
  }, [customer]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
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
        maxWidth: "520px",
        width: "100%",
        background: "var(--bg-card)",
        borderRadius: "16px",
        boxShadow: "var(--shadow-lg)",
        border: "1px solid var(--border-color)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 24px",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} style={{ color: 'var(--accent-blue)' }} />
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {customer ? "Edit Customer Khata Profile" : "Register New Customer Khata"}
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
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px", maxHeight: '72vh', overflowY: 'auto' }}>
            {/* Customer Name */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "5px" }}>
                Customer / Party Name *
              </label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                className="form-control"
                style={{ padding: "10px 12px", fontSize: "0.9rem" }}
                placeholder="e.g. Chaudhry Tariq (Builder)"
                autoFocus
              />
            </div>

            {/* Phone & CNIC */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "5px" }}>
                  Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                  className="form-control font-mono"
                  style={{ padding: "10px 12px", fontSize: "0.88rem" }}
                  placeholder="0300-8456123"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "5px" }}>
                  CNIC No (Optional)
                </label>
                <input
                  type="text"
                  value={formData.cnic}
                  onChange={e => setFormData(p => ({ ...p, cnic: e.target.value }))}
                  className="form-control font-mono"
                  style={{ padding: "10px 12px", fontSize: "0.88rem" }}
                  placeholder="33102-1234567-1"
                />
              </div>
            </div>

            {/* City & Address */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "5px" }}>
                  City / Location
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={e => setFormData(p => ({ ...p, city: e.target.value }))}
                  className="form-control"
                  style={{ padding: "10px 12px", fontSize: "0.88rem" }}
                  placeholder="Karachi / Faisalabad"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "5px" }}>
                  Site / Delivery Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                  className="form-control"
                  style={{ padding: "10px 12px", fontSize: "0.88rem" }}
                  placeholder="Plot #, Street, Area"
                />
              </div>
            </div>

            {/* Credit Limit & Opening Balance */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "5px" }}>
                  Credit Limit (Rs.)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.creditLimit}
                  onChange={e => setFormData(p => ({ ...p, creditLimit: Number(e.target.value) }))}
                  className="form-control font-mono"
                  style={{ padding: "10px 12px", fontSize: "0.88rem" }}
                  placeholder="500000"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "5px" }}>
                  Opening Balance (Rs.)
                </label>
                <input
                  type="number"
                  min="0"
                  disabled={!!customer}
                  value={formData.balanceDue}
                  onChange={e => setFormData(p => ({ ...p, balanceDue: Number(e.target.value) }))}
                  className="form-control font-mono"
                  style={{ padding: "10px 12px", fontSize: "0.88rem", background: !!customer ? "var(--bg-primary)" : "var(--bg-card)" }}
                  placeholder="0"
                />
                {!!customer && (
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "3px" }}>
                    Khata balance updates via Bills & Receipts.
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "5px" }}>
                Khata Remarks / Special Terms
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                className="form-control"
                style={{ padding: "10px 12px", fontSize: "0.88rem" }}
                placeholder="Payment terms, bank details, etc."
              />
            </div>
          </div>
          
          {/* Footer */}
          <div style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
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
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Save size={15} />
              <span>Save Customer Khata</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
