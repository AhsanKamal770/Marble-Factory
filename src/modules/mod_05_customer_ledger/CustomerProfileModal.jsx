import React, { useState, useEffect } from "react";
import {
  X, Save, User, Phone, MapPin, CreditCard,
  Building, DollarSign, FileText, Info, Coins, Database
} from "lucide-react";

export default function CustomerProfileModal({ customer, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    cnic: "",
    city: "Karachi",
    address: "",
    creditLimit: 50000,
    balanceDue: 0,
    notes: ""
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        ...customer,
        creditLimit: customer.creditLimit !== undefined && customer.creditLimit !== null ? Number(customer.creditLimit) : 50000,
        balanceDue: Number(customer.balanceDue || 0)
      });
    }
  }, [customer]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    const rawLimit = formData.creditLimit === "" || formData.creditLimit === null || formData.creditLimit === undefined
      ? 50000
      : Number(formData.creditLimit);
    const finalCreditLimit = isNaN(rawLimit) || rawLimit <= 0 ? 50000 : rawLimit;
    onSave({ ...formData, creditLimit: finalCreditLimit });
  };

  return (
    <div className="app-modal-overlay" onClick={onClose}>
      <div
        className="app-modal-card"
        style={{ maxWidth: "560px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="app-modal-header">
          <div className="app-modal-header-left">
            <div className="app-modal-icon-badge">
              <User size={22} strokeWidth={2.4} />
            </div>
            <div>
              <h3 className="app-modal-title">
                {customer ? "Edit Customer Khata Profile" : "Register New Customer"}
              </h3>
              <p className="app-modal-subtitle">
                Add customer profile to ledger, billing and accounts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="app-modal-close-btn"
            title="Close"
          >
            <X size={17} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div className="app-modal-body">
            {/* Customer Name */}
            <div className="app-form-group">
              <label className="app-form-label">
                Customer / Party Name <span className="app-form-label-required">*</span>
              </label>
              <div className="app-input-wrapper">
                <span className="app-input-icon">
                  <User size={16} />
                </span>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="app-form-input has-icon"
                  placeholder="e.g. Chaudhry Tariq (Builder)"
                  autoFocus
                />
              </div>
            </div>

            {/* Phone & CNIC */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="app-form-group">
                <label className="app-form-label">Phone Number</label>
                <div className="app-input-wrapper">
                  <span className="app-input-icon">
                    <Phone size={16} />
                  </span>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                    className="app-form-input has-icon font-mono"
                    placeholder="0300-8456123"
                  />
                </div>
              </div>
              <div className="app-form-group">
                <label className="app-form-label">CNIC No (Optional)</label>
                <div className="app-input-wrapper">
                  <span className="app-input-icon">
                    <CreditCard size={16} />
                  </span>
                  <input
                    type="text"
                    value={formData.cnic}
                    onChange={(e) => setFormData((p) => ({ ...p, cnic: e.target.value }))}
                    className="app-form-input has-icon font-mono"
                    placeholder="33102-1234567-1"
                  />
                </div>
              </div>
            </div>

            {/* City & Address */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="app-form-group">
                <label className="app-form-label">City / Location</label>
                <div className="app-input-wrapper">
                  <span className="app-input-icon">
                    <MapPin size={16} />
                  </span>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                    className="app-form-input has-icon"
                    placeholder="Karachi / Faisalabad"
                  />
                </div>
              </div>
              <div className="app-form-group">
                <label className="app-form-label">Site / Delivery Address</label>
                <div className="app-input-wrapper">
                  <span className="app-input-icon">
                    <Building size={16} />
                  </span>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                    className="app-form-input has-icon"
                    placeholder="Plot #, Street, Area"
                  />
                </div>
              </div>
            </div>

            {/* Credit Limit & Opening Balance */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="app-form-group">
                <label className="app-form-label">Credit Limit (Rs)</label>
                <div className="app-input-wrapper">
                  <span className="app-input-icon">
                    <DollarSign size={16} />
                  </span>
                  <input
                    type="number"
                    min="50000"
                    max="500000"
                    value={formData.creditLimit === "" ? "" : formData.creditLimit}
                    onChange={(e) => {
                      const val = e.target.value === "" ? "" : Number(e.target.value);
                      setFormData((p) => ({ ...p, creditLimit: val }));
                    }}
                    className="app-form-input has-icon font-mono"
                    placeholder="50000"
                  />
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "3px" }}>
                  Min: Rs. 50,000 | Max: Rs. 500,000 (ڈیفالٹ: 50,000)
                </div>
              </div>
              <div className="app-form-group">
                <label className="app-form-label">Opening Balance (Rs)</label>
                <div className="app-input-wrapper">
                  <span className="app-input-icon">
                    <Coins size={16} />
                  </span>
                  <input
                    type="number"
                    min="0"
                    disabled={!!customer}
                    value={formData.balanceDue}
                    onChange={(e) => setFormData((p) => ({ ...p, balanceDue: Number(e.target.value) }))}
                    className="app-form-input has-icon font-mono"
                    style={{ background: !!customer ? "var(--bg-primary)" : "var(--bg-card)" }}
                    placeholder="0"
                  />
                </div>
                {!!customer && (
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "3px" }}>
                    Khata balance updates via Bills & Receipts.
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="app-form-group">
              <label className="app-form-label">Khata Remarks / Notes</label>
              <div className="app-input-wrapper">
                <span className="app-input-icon" style={{ top: "18px" }}>
                  <FileText size={16} />
                </span>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  className="app-form-textarea has-icon"
                  placeholder="Write any special payment terms, bank details, or delivery notes..."
                />
              </div>
            </div>

            {/* Notice */}
            <div className="app-form-notice">
              <Info size={16} style={{ flexShrink: 0 }} />
              <span>All fields marked with * are required.</span>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="app-modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="app-btn-cancel"
            >
              <X size={15} />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              className="app-btn-submit"
            >
              <Save size={16} />
              <span>{customer ? "Save Changes" : "Create Customer"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
