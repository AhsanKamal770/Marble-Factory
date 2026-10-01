import React, { useState } from "react";
import { PlusCircle, DollarSign, User, FileText, Calendar, Check, Tag, Wallet, Building2 } from "lucide-react";
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

  return (
    <div style={{
      background: "var(--bg-card)",
      padding: "22px",
      borderRadius: "16px",
      border: "1px solid var(--border-color)",
      boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)"
    }}>
      {/* Form Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "18px",
        paddingBottom: "14px",
        borderBottom: "1px solid var(--border-divider)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "rgba(239, 68, 68, 0.1)",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <PlusCircle size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.02rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
              {language === 'ur' ? "نیا روزانہ خرچ درج کریں" : "Record Daily Expense"}
            </h3>
            <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
              {language === 'ur' ? "دراز سے نکالی گئی رقم کا فوری اندراج" : "Log factory expense & deduct from drawer"}
            </p>
          </div>
        </div>

        <span style={{
          fontSize: "0.70rem",
          fontWeight: 800,
          padding: "4px 8px",
          borderRadius: "6px",
          background: "rgba(239, 68, 68, 0.1)",
          color: "#ef4444",
          border: "1px solid rgba(239, 68, 68, 0.2)"
        }}>
          Cash Out (-)
        </span>
      </div>

      {successMsg && (
        <div style={{
          background: "rgba(16, 185, 129, 0.1)",
          border: "1px solid #10b981",
          color: "#059669",
          padding: "10px 14px",
          borderRadius: "10px",
          fontSize: "0.82rem",
          fontWeight: 700,
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
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.80rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
            <Tag size={13} style={{ color: "var(--accent-primary, #2563eb)" }} />
            <span>{language === 'ur' ? "خرچے کی کیٹیگری (شعبہ) *" : "Expense Category *"}</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: "10px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.85rem",
              fontWeight: 600,
              outline: "none",
              cursor: "pointer"
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
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.80rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
            <DollarSign size={13} style={{ color: "#ef4444" }} />
            <span>{language === 'ur' ? "رقم (روپے) *" : "Expense Amount (Rs.) *"}</span>
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
                padding: "10px 12px 10px 46px",
                borderRadius: "10px",
                border: "1.5px solid rgba(239, 68, 68, 0.3)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "1.1rem",
                fontWeight: 800,
                outline: "none"
              }}
            />
          </div>

          {/* Quick Preset Buttons */}
          <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
            {quickAmounts.map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(val.toString())}
                style={{
                  background: amount === val.toString() ? "#ef4444" : "var(--bg-primary)",
                  color: amount === val.toString() ? "#ffffff" : "var(--text-secondary)",
                  border: `1px solid ${amount === val.toString() ? "#ef4444" : "var(--border-color)"}`,
                  borderRadius: "7px",
                  padding: "4px 9px",
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

        {/* Paid To & Date in 2 Columns */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
              <User size={13} style={{ color: "var(--text-secondary)" }} />
              <span>{language === 'ur' ? "کس کو ادا کیا" : "Paid To"}</span>
            </label>
            <input
              type="text"
              value={paidTo}
              onChange={e => setPaidTo(e.target.value)}
              placeholder={language === 'ur' ? "مثلاً علی ڈرائیور" : "e.g. Ali Driver"}
              style={{
                width: "100%",
                padding: "8px 11px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "0.82rem",
                outline: "none"
              }}
            />
          </div>

          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
              <Calendar size={13} style={{ color: "var(--text-secondary)" }} />
              <span>{language === 'ur' ? "تاریخ خرچ" : "Date"}</span>
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
                fontSize: "0.82rem",
                fontWeight: 600,
                outline: "none"
              }}
            />
          </div>
        </div>

        {/* Remarks */}
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
            <FileText size={13} style={{ color: "var(--text-secondary)" }} />
            <span>{language === 'ur' ? "تفصیل / وجہ (اختیاری)" : "Remarks / Details"}</span>
          </label>
          <input
            type="text"
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder={language === 'ur' ? "مثلاً جنریٹر ڈیزل 20 لٹر" : "e.g. 20L Diesel for Generator"}
            style={{
              width: "100%",
              padding: "8px 11px",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.82rem",
              outline: "none"
            }}
          />
        </div>

        {/* Payment Method Segmented Buttons */}
        <div>
          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
            {language === 'ur' ? "ادائیگی کا طریقہ:" : "Payment Source:"}
          </label>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px"
          }}>
            <button
              type="button"
              onClick={() => setPaymentMethod("Cash")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px 10px",
                borderRadius: "8px",
                border: `1.5px solid ${paymentMethod === "Cash" ? "#10b981" : "var(--border-color)"}`,
                background: paymentMethod === "Cash" ? "rgba(16, 185, 129, 0.08)" : "var(--bg-primary)",
                color: paymentMethod === "Cash" ? "#059669" : "var(--text-secondary)",
                fontWeight: 700,
                fontSize: "0.78rem",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <Wallet size={14} />
              <span>{language === 'ur' ? "دراز کیش (Cash)" : "Cash Drawer"}</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("Bank")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px 10px",
                borderRadius: "8px",
                border: `1.5px solid ${paymentMethod === "Bank" ? "var(--accent-primary, #2563eb)" : "var(--border-color)"}`,
                background: paymentMethod === "Bank" ? "rgba(37, 99, 235, 0.08)" : "var(--bg-primary)",
                color: paymentMethod === "Bank" ? "var(--accent-primary, #2563eb)" : "var(--text-secondary)",
                fontWeight: 700,
                fontSize: "0.78rem",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <Building2 size={14} />
              <span>{language === 'ur' ? "بینک آن لائن" : "Bank Transfer"}</span>
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            marginTop: "6px",
            width: "100%",
            padding: "11px",
            borderRadius: "10px",
            border: "none",
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            color: "#ffffff",
            fontWeight: 800,
            fontSize: "0.90rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            boxShadow: "0 4px 12px rgba(239, 68, 68, 0.25)",
            transition: "all 0.15s ease"
          }}
          onMouseOver={(e) => {
            if (!isSubmitting) e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseOut={(e) => {
            if (!isSubmitting) e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <PlusCircle size={16} />
          <span>
            {isSubmitting
              ? (language === 'ur' ? "محفوظ ہو رہا ہے..." : "Saving...")
              : (language === 'ur' ? "خرچ دراز میں درج کریں" : "Record Expense (Cash Out)")}
          </span>
        </button>

      </form>
    </div>
  );
}
