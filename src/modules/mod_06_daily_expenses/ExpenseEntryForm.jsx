import React, { useState } from "react";
import { PlusCircle, DollarSign, User, FileText, Calendar, Check, Tag, ChevronDown, Info, Save, Wallet } from "lucide-react";
import { EXPENSE_CATEGORIES } from "./dailyExpenseService";
import { useLanguage } from "../../context/LanguageContext";

export default function ExpenseEntryForm({ onAddExpense, selectedDate }) {
  const { language } = useLanguage();
  const tr = (en, ur) => (language === "ur" ? ur : en);

  const [category, setCategory] = useState("Food / Mess");
  const [amount, setAmount] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [expenseDate, setExpenseDate] = useState(selectedDate || new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const quickAmounts = [200, 500, 1000, 2000, 5000];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmt = Number(amount);
    if (!amount || numAmt <= 0) {
      alert(tr("Please enter a valid expense amount.", "براہ کرم درست رقم درج کریں۔"));
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddExpense({
        category,
        amount: numAmt,
        paidTo: paidTo.trim(),
        remarks: remarks.trim(),
        paymentMethod,
        date: expenseDate
      });

      setSuccessMsg(tr("Expense recorded successfully!", "خرچ محفوظ ہو گیا!"));
      setAmount("");
      setPaidTo("");
      setRemarks("");
      setTimeout(() => setSuccessMsg(""), 2500);
    } catch (err) {
      alert("Error saving expense: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      background: "#ffffff",
      padding: "20px 22px",
      borderRadius: "16px",
      border: "1px solid #e2e8f0",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      boxSizing: "border-box"
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid #f1f5f9" }}>
        <div className="app-modal-icon-badge" style={{ background: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)", boxShadow: "0 4px 12px rgba(239, 68, 68, 0.25)", flexShrink: 0 }}>
          <Wallet size={22} color="#ffffff" />
        </div>
        <div>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
            {tr("Record Daily Expense", "نیا روزانہ خرچ درج کریں")}
          </h3>
          <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "2px 0 0 0" }}>
            {tr("Log petty expense to deduct from cash drawer", "فیکٹری کا روزمرہ خرچ درج کریں")}
          </p>
        </div>
      </div>

      {successMsg && (
        <div style={{
          background: "rgba(16, 185, 129, 0.12)",
          border: "1px solid #10b981",
          color: "#059669",
          padding: "8px 12px",
          borderRadius: "8px",
          fontSize: "0.82rem",
          fontWeight: 700,
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <Check size={16} /> {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1, justifyContent: "space-between" }}>
        
        {/* Expense Category */}
        <div className="app-form-group">
          <label className="app-form-label">
            {tr("Expense Category", "خرچے کی کیٹیگری")} <span className="app-form-label-required">*</span>
          </label>
          <div className="app-input-wrapper">
            <Tag size={16} className="app-input-icon" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="app-form-select"
            >
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {language === "ur" ? cat.ur : cat.en}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="app-input-chevron" />
          </div>
        </div>

        {/* Amount with Quick Presets */}
        <div className="app-form-group">
          <label className="app-form-label">
            {tr("Expense Amount (Rs.)", "رقم (روپے)")} <span className="app-form-label-required">*</span>
          </label>
          <div className="app-input-wrapper">
            <DollarSign size={16} className="app-input-icon" />
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              required
              className="app-form-input font-mono"
              style={{
                fontSize: "1.1rem",
                fontWeight: 800,
                color: "#ef4444"
              }}
            />
          </div>

          {/* Quick Click Preset Buttons */}
          <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
            {quickAmounts.map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(val.toString())}
                style={{
                  background: amount === val.toString() ? "#2563eb" : "#f1f5f9",
                  color: amount === val.toString() ? "#ffffff" : "#475569",
                  border: "1px solid",
                  borderColor: amount === val.toString() ? "#2563eb" : "#e2e8f0",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                Rs. {val.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Paid To & Date Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div className="app-form-group">
            <label className="app-form-label">
              {tr("Paid To / Person", "وصول کنندہ")}
            </label>
            <div className="app-input-wrapper">
              <User size={15} className="app-input-icon" />
              <input
                type="text"
                value={paidTo}
                onChange={e => setPaidTo(e.target.value)}
                placeholder="e.g. Driver"
                className="app-form-input"
              />
            </div>
          </div>

          <div className="app-form-group">
            <label className="app-form-label">
              {tr("Expense Date", "تاریخ")}
            </label>
            <div className="app-input-wrapper">
              <Calendar size={15} className="app-input-icon" />
              <input
                type="date"
                value={expenseDate}
                onChange={e => setExpenseDate(e.target.value)}
                className="app-form-input"
              />
            </div>
          </div>
        </div>

        {/* Remarks */}
        <div className="app-form-group">
          <label className="app-form-label">
            {tr("Remarks / Details", "تفصیل")}
          </label>
          <div className="app-input-wrapper">
            <FileText size={15} className="app-input-icon" />
            <input
              type="text"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="e.g. Generator Diesel"
              className="app-form-input"
            />
          </div>
        </div>

        {/* Payment Method Selector */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>
            Payment Mode:
          </span>
          {["Cash", "Bank"].map(method => (
            <label key={method} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, color: "#1e293b" }}>
              <input
                type="radio"
                name="paymentMethod"
                value={method}
                checked={paymentMethod === method}
                onChange={() => setPaymentMethod(method)}
              />
              {method === "Cash" ? "Cash Drawer" : "Bank Transfer"}
            </label>
          ))}
        </div>

        {/* Notice banner */}
        <div className="app-form-notice" style={{ margin: "2px 0 4px 0" }}>
          <Info size={15} color="#2563eb" style={{ flexShrink: 0 }} />
          <span>All fields marked with <b style={{ color: '#ef4444' }}>*</b> are required.</span>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="app-btn-submit"
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "11px",
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            boxShadow: "0 4px 12px rgba(239, 68, 68, 0.25)"
          }}
        >
          <Save size={16} />
          {isSubmitting ? tr("Saving...", "محفوظ ہو رہا ہے...") : tr("Record Expense", "خرچ درج کریں")}
        </button>

      </form>
    </div>
  );
}

