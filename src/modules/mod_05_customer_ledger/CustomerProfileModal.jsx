import React, { useState, useEffect } from "react";
import { User, Phone, MapPin, CreditCard, Building2, Check } from "lucide-react";
import Modal from "../../shared/components/Modal";

export default function CustomerProfileModal({ customer, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    cnic: "",
    city: "Faisalabad / Jhumra",
    address: "",
    customerType: "Retail", // Retail, Builder, Contractor, Architect
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
    <Modal
      isOpen={true}
      onClose={onClose}
      title={customer ? "Edit Customer Khata Profile" : "Register New Customer Khata"}
      icon={User}
      size="md"
      footerActions={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const form = document.getElementById("customer-profile-form");
              if (form && form.reportValidity()) {
                if (!formData.name.trim()) return;
                onSave(formData);
              }
            }}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Check size={16} /> Save Customer
          </button>
        </>
      }
    >
      <form id="customer-profile-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
                style={{ width: "100%" }}
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
                  placeholder="Jhumra / Faisalabad"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "5px" }}>
                  Customer Category
                </label>
                <select
                  value={formData.customerType}
                  onChange={e => setFormData(p => ({ ...p, customerType: e.target.value }))}
                  className="form-control"
                  style={{ padding: "10px 12px", fontSize: "0.88rem" }}
                >
                  <option value="Retail">Retail (عام خریدار)</option>
                  <option value="Builder">Builder (بلڈر کھاتہ)</option>
                  <option value="Contractor">Contractor (ٹھیکیدار)</option>
                  <option value="Architect">Architect (آرکیٹیکٹ)</option>
                </select>
              </div>
            </div>

            {/* Address */}
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
          
        </form>
    </Modal>
  );
}
