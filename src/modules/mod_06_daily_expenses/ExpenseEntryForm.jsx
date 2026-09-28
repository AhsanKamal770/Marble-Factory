import React, { useState } from "react";
import { PlusCircle, DollarSign, User, FileText, Calendar, Check, Tag } from "lucide-react";
import { EXPENSE_CATEGORIES } from "./dailyExpenseService";
import { useLanguage } from "../../context/LanguageContext";

export default function ExpenseEntryForm({ onAddExpense, selectedDate }) {
  const { language } = useLanguage();
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
      alert(language === 'ur' ? "براہ کرم درست رقم درج کریں۔" : "Please enter a valid expense amount.");
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

      setSuccessMsg(language === 'ur' ? "خرچ کامیابی سے محفوظ ہو گیا!" : "Expense recorded successfully!");
      setAmount("");
      setPaidTo("");
      setRemarks("");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      alert("Error saving expense: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCatObj = EXPENSE_CATEGORIES.find(c => c.id === category) || EXPENSE_CATEGORIES[0];

  return (
    <div style={{
      background: "var(--bg-card)",
      padding: "24px",
      borderRadius: "14px",
      border: "1px solid var(--border-color)",
      boxShadow: "0 4px 16px rgba(0,0,0,0.04)"
    }}>
      {/* Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
        <div>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
            {language === 'ur' ? "نیا روزانہ خرچ درج کریں" : "Record Daily Expense"}
          </h3>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
            {language === 'ur' ? "دراز سے نکالی گئی رقم کا فوری اندراج" : "Log factory expense & deduct from drawer"}
          </p>
        </div>
        <span style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          padding: "4px 8px",
          borderRadius: "6px",
          background: "rgba(239, 68, 68, 0.1)",
          color: "#ef4444"
        }}>
          Cash Out (-)
        </span>
      </div>

      {successMsg && (
        <div style={{
          background: "rgba(16, 185, 129, 0.12)",
          border: "1px solid #10b981",
          color: "#059669",
          padding: "10px 14px",
          borderRadius: "8px",
          fontSize: "0.85rem",
          fontWeight: 600,
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <Check size={16} /> {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        
        {/* Expense Category */}
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
            <Tag size={14} /> {language === 'ur' ? "خرچے کی کیٹیگری (شعبہ) *" : "Expense Category *"}
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.88rem",
              fontWeight: 600,
              outline: "none"
            }}
          >
            {EXPENSE_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>
                {language === 'ur' ? `${cat.ur} (${cat.id})` : `${cat.en}`}
              </option>
            ))}
          </select>
        </div>

        {/* Amount with Quick Presets */}
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
            <DollarSign size={14} /> {language === 'ur' ? "رقم (روپے) *" : "Expense Amount (Rs.) *"}
          </label>
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              fontWeight: 800,
              color: "#ef4444",
              fontSize: "0.95rem"
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
                padding: "10px 12px 10px 42px",
                borderRadius: "8px",
                border: "2px solid #ef444433",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "1.1rem",
                fontWeight: 800,
                outline: "none"
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
                  background: amount === val.toString() ? "var(--accent-primary)" : "var(--bg-primary)",
                  color: amount === val.toString() ? "#fff" : "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  fontSize: "0.75rem",
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
              <User size={13} /> {language === 'ur' ? "کس کو ادا کیا (نام)" : "Paid To"}
            </label>
            <input
              type="text"
              value={paidTo}
              onChange={e => setPaidTo(e.target.value)}
              placeholder={language === 'ur' ? "مثلاً علی ڈرائیور / استاد اسلم" : "e.g. Ali Driver"}
              style={{
                width: "100%",
                padding: "9px 11px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                outline: "none"
              }}
            />
          </div>

          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
              <Calendar size={13} /> {language === 'ur' ? "تاریخ (تاریخ خرچ)" : "Expense Date"}
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={e => setExpenseDate(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                outline: "none"
              }}
            />
          </div>
        </div>

        {/* Remarks */}
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
            <FileText size={13} /> {language === 'ur' ? "تفصیل / وجہ (اختیاری)" : "Remarks / Details"}
          </label>
          <input
            type="text"
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder={language === 'ur' ? "مثلاً جنریٹر ڈیزل 20 لٹر یا ٹریکٹر ٹرالی ان لوڈنگ" : "e.g. 20L Diesel for Generator"}
            style={{
              width: "100%",
              padding: "9px 11px",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.85rem",
              outline: "none"
            }}
          />
        </div>

        {/* Payment Method Selector */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "2px" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)" }}>
            {language === 'ur' ? "ادائیگی کا طریقہ:" : "Payment:"}
          </span>
          {["Cash", "Bank"].map(method => (
            <label key={method} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>
              <input
                type="radio"
                name="paymentMethod"
                value={method}
                checked={paymentMethod === method}
                onChange={() => setPaymentMethod(method)}
              />
              {method === "Cash" ? (language === 'ur' ? "دراز کیش (Cash)" : "Cash Drawer") : (language === 'ur' ? "بینک آن لائن" : "Bank Transfer")}
            </label>
          ))}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            marginTop: "10px",
            width: "100%",
            padding: "12px",
            borderRadius: "9px",
            border: "none",
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            color: "#fff",
            fontWeight: 800,
            fontSize: "0.95rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            boxShadow: "0 4px 12px rgba(239, 68, 68, 0.25)",
            transition: "all 0.15s ease"
          }}
        >
          <PlusCircle size={18} />
          {isSubmitting ? (language === 'ur' ? "محفوظ ہو رہا ہے..." : "Saving...") : (language === 'ur' ? "خرچ دراز میں درج کریں" : "Record Expense (Cash Out)")}
        </button>

      </form>
    </div>
  );
}
