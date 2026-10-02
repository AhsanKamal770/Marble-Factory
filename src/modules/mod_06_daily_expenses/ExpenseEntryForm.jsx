import React, { useState } from "react";
import { PlusCircle, DollarSign, User, FileText, Calendar, Check, Tag } from "lucide-react";
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
      background: "var(--bg-card)",
      padding: "16px 18px",
      borderRadius: "14px",
      border: "1px solid var(--border-color)",
      boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
      height: "100%",
      minHeight: "440px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      boxSizing: "border-box"
    }}>
      {/* Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div>
          <h3 style={{ fontSize: "0.98rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
            {tr("Record Daily Expense", "نیا روزانہ خرچ درج کریں")}
          </h3>
          <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
            {tr("Log expense to deduct from live drawer cash", "فیکٹری کا روزمرہ خرچ درج کریں")}
          </p>
        </div>
      </div>

      {successMsg && (
        <div style={{
          background: "rgba(16, 185, 129, 0.12)",
          border: "1px solid #10b981",
          color: "#059669",
          padding: "6px 10px",
          borderRadius: "6px",
          fontSize: "0.8rem",
          fontWeight: 600,
          marginBottom: "10px",
          display: "flex",
          alignItems: "center",
          gap: "6px"
        }}>
          <Check size={14} /> {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1, justifyContent: "space-between" }}>
        
        {/* Expense Category */}
        <div>
          <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px" }}>
            {tr("Expense Category *", "خرچے کی کیٹیگری *")}
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              width: "100%",
              height: "34px",
              padding: "0 10px",
              borderRadius: "7px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.82rem",
              fontWeight: 600,
              outline: "none",
              boxSizing: "border-box"
            }}
          >
            {EXPENSE_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>
                {language === "ur" ? cat.ur : cat.en}
              </option>
            ))}
          </select>
        </div>

        {/* Amount with Quick Presets */}
        <div>
          <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px" }}>
            {tr("Expense Amount (Rs.) *", "رقم (روپے) *")}
          </label>
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              fontWeight: 800,
              color: "#ef4444",
              fontSize: "0.85rem",
              fontFamily: "var(--font-mono)"
            }}>
              Rs.
            </span>
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              required
              style={{
                width: "100%",
                height: "34px",
                padding: "0 10px 0 38px",
                borderRadius: "7px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "0.95rem",
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Quick Click Preset Buttons */}
          <div style={{ display: "flex", gap: "5px", marginTop: "6px", flexWrap: "wrap" }}>
            {quickAmounts.map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(val.toString())}
                style={{
                  background: amount === val.toString() ? "#2563eb" : "var(--bg-primary)",
                  color: amount === val.toString() ? "#fff" : "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "5px",
                  padding: "3px 6px",
                  fontSize: "0.72rem",
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
          <div>
            <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px" }}>
              {tr("Paid To / Person", "وصول کنندہ")}
            </label>
            <input
              type="text"
              value={paidTo}
              onChange={e => setPaidTo(e.target.value)}
              placeholder="e.g. Driver"
              style={{
                width: "100%",
                height: "34px",
                padding: "0 10px",
                borderRadius: "7px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "0.82rem",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px" }}>
              {tr("Expense Date", "تاریخ")}
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={e => setExpenseDate(e.target.value)}
              style={{
                width: "100%",
                height: "34px",
                padding: "0 8px",
                borderRadius: "7px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "0.82rem",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>
        </div>

        {/* Remarks */}
        <div>
          <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px" }}>
            {tr("Remarks / Details", "تفصیل")}
          </label>
          <input
            type="text"
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="e.g. Generator Diesel"
            style={{
              width: "100%",
              height: "34px",
              padding: "0 10px",
              borderRadius: "7px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.82rem",
              outline: "none",
              boxSizing: "border-box"
            }}
          />
        </div>

        {/* Payment Method Selector */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text-secondary)" }}>
            طریقہ:
          </span>
          {["Cash", "Bank"].map(method => (
            <label key={method} style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-primary)" }}>
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

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary"
          style={{
            marginTop: "4px",
            width: "100%",
            padding: "9px",
            borderRadius: "7px",
            fontWeight: 800,
            fontSize: "0.88rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            cursor: isSubmitting ? "not-allowed" : "pointer"
          }}
        >
          <PlusCircle size={15} />
          {isSubmitting ? tr("Saving...", "محفوظ ہو رہا ہے...") : tr("Record Expense", "خرچ درج کریں")}
        </button>

      </form>
    </div>
  );
}

