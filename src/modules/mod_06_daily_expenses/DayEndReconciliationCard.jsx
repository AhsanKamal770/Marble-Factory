import React, { useState } from "react";
import { Printer, CheckCircle2, AlertTriangle, Calculator, FileText, ArrowDownRight, ArrowUpRight, DollarSign } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function DayEndReconciliationCard({ cashData, onPrintThermal, onPrintA4 }) {
  const { language } = useLanguage();
  const [actualPhysicalCash, setActualPhysicalCash] = useState("");
  const [showDenominations, setShowDenominations] = useState(false);
  const [notes, setNotes] = useState({
    5000: "",
    1000: "",
    500: "",
    100: "",
    50: "",
    20: "",
    10: ""
  });

  if (!cashData) return null;

  const {
    openingCash = 0,
    cashSalesToday = 0,
    todayInvoicesCount = 0,
    wasooliToday = 0,
    todayPaymentsCount = 0,
    expensesToday = 0,
    todayExpensesCount = 0,
    supplierCashToday = 0,
    employeeAdvancesToday = 0,
    totalCashInflow = 0,
    totalCashOutflow = 0,
    liveCash = 0
  } = cashData;

  // Handle note quantity change
  const handleNoteChange = (denom, count) => {
    const updated = { ...notes, [denom]: count };
    setNotes(updated);
    
    // Auto-sum
    let sum = 0;
    Object.keys(updated).forEach(d => {
      const c = Number(updated[d]) || 0;
      sum += Number(d) * c;
    });
    setActualPhysicalCash(sum > 0 ? sum.toString() : "");
  };

  const countedNum = actualPhysicalCash !== "" ? Number(actualPhysicalCash) : null;
  const difference = countedNum !== null ? (countedNum - liveCash) : null;

  return (
    <div style={{
      background: "var(--bg-card)",
      padding: "28px",
      borderRadius: "16px",
      border: "1px solid var(--border-color)",
      boxShadow: "0 6px 20px rgba(0,0,0,0.05)"
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <h3 style={{
          fontSize: "1.25rem",
          fontWeight: 800,
          margin: 0,
          color: "var(--text-primary)",
          letterSpacing: "-0.01em"
        }}>
          {language === 'ur' ? "روزنامچہ و کیش دراز آڈٹ (Day-End Cash Reconciliation)" : "DAY-END ROZNAMCHA & CASH DRAWER RECONCILIATION"}
        </h3>
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "4px" }}>
          {language === 'ur' ? "اوپننگ کیش، نقد سیلز، ریکوری اور اخراجات کا جامع موازنہ" : "Compare system expected cash with actual physical cash in the drawer."}
        </p>
      </div>

      {/* Main 2-Column Math Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "24px",
        marginBottom: "28px"
      }}>
        {/* Left Column: Cash Inflow (+) */}
        <div style={{
          background: "var(--bg-primary)",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid var(--border-divider)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: "#10b981", fontWeight: 800, fontSize: "0.95rem" }}>
            <ArrowUpRight size={18} />
            {language === 'ur' ? "کل کیش آمد / وصولیاں (+)" : "Total Cash Inflow (+)"}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>
                {language === 'ur' ? "صبح کا اوپننگ کیش (Opening):" : "Opening Cash Balance:"}
              </span>
              <span style={{ fontWeight: 700, color: "var(--text-primary)", fontFamily: "monospace" }}>
                Rs. {Number(openingCash).toLocaleString()}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>
                {language === 'ur' ? `آج کی نقد بل سیلز (${todayInvoicesCount}):` : `Cash Sales Today (${todayInvoicesCount}):`}
              </span>
              <span style={{ fontWeight: 700, color: "#10b981", fontFamily: "monospace" }}>
                + Rs. {Number(cashSalesToday).toLocaleString()}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>
                {language === 'ur' ? `گاہک کھاتہ وصولی / Wasooli (${todayPaymentsCount}):` : `Customer Udhar Recoveries (${todayPaymentsCount}):`}
              </span>
              <span style={{ fontWeight: 700, color: "#10b981", fontFamily: "monospace" }}>
                + Rs. {Number(wasooliToday).toLocaleString()}
              </span>
            </div>

            <div style={{ borderTop: "1px dashed var(--border-divider)", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
              <span style={{ color: "var(--text-primary)" }}>
                {language === 'ur' ? "کل آمد (Total Inflow):" : "Total Cash Inflow:"}
              </span>
              <span style={{ color: "#10b981", fontFamily: "monospace", fontSize: "0.95rem" }}>
                Rs. {Number(totalCashInflow).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Cash Outflow (-) */}
        <div style={{
          background: "var(--bg-primary)",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid var(--border-divider)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: "#ef4444", fontWeight: 800, fontSize: "0.95rem" }}>
            <ArrowDownRight size={18} />
            {language === 'ur' ? "کل کیش نکاسی / اخراجات (-)" : "Total Cash Outflow (-)"}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>
                {language === 'ur' ? `روزانہ فیکٹری اخراجات (${todayExpensesCount}):` : `Daily Factory Expenses (${todayExpensesCount}):`}
              </span>
              <span style={{ fontWeight: 700, color: "#ef4444", fontFamily: "monospace" }}>
                - Rs. {Number(expensesToday).toLocaleString()}
              </span>
            </div>

            {supplierCashToday > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>
                  {language === 'ur' ? "سپلائر نقد ادائیگیاں:" : "Supplier Cash Payments:"}
                </span>
                <span style={{ fontWeight: 700, color: "#ef4444", fontFamily: "monospace" }}>
                  - Rs. {Number(supplierCashToday).toLocaleString()}
                </span>
              </div>
            )}

            {employeeAdvancesToday > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>
                  {language === 'ur' ? "ملازمین کیش ایڈوانس / خرچہ:" : "Worker Cash Advances:"}
                </span>
                <span style={{ fontWeight: 700, color: "#ef4444", fontFamily: "monospace" }}>
                  - Rs. {Number(employeeAdvancesToday).toLocaleString()}
                </span>
              </div>
            )}

            <div style={{ borderTop: "1px dashed var(--border-divider)", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
              <span style={{ color: "var(--text-primary)" }}>
                {language === 'ur' ? "کل خرچ (Total Outflow):" : "Total Cash Outflow:"}
              </span>
              <span style={{ color: "#ef4444", fontFamily: "monospace", fontSize: "0.95rem" }}>
                - Rs. {Number(totalCashOutflow).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center Net Expected Balance Box */}
      <div style={{
        background: liveCash >= 0 ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
        border: `2px solid ${liveCash >= 0 ? "#10b981" : "#ef4444"}`,
        padding: "20px 24px",
        borderRadius: "14px",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "16px",
        marginBottom: "24px"
      }}>
        <div>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>
            {language === 'ur' ? "دراز میں متوقع کل کیش بیلنس (Expected Drawer Balance)" : "EXPECTED LIVE CASH IN DRAWER"}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
            (Opening + Inflow - Outflow)
          </div>
        </div>

        <div style={{
          fontSize: "1.85rem",
          fontWeight: 900,
          color: liveCash >= 0 ? "#10b981" : "#ef4444",
          fontFamily: "monospace"
        }}>
          Rs. {Number(liveCash).toLocaleString()}
        </div>
      </div>

      {/* Physical Cash Verification & Denomination Calculator */}
      <div style={{
        background: "var(--bg-primary)",
        padding: "20px",
        borderRadius: "12px",
        border: "1px solid var(--border-divider)",
        marginBottom: "24px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
          <div>
            <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {language === 'ur' ? "دراز میں فزیکل گنتی شدہ کیش درج کریں" : "Physical Drawer Cash Audit"}
            </h4>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {language === 'ur' ? "دراز گن کر رقم درج کریں تاکہ کمی یا بیشی کا پتہ چل سکے" : "Count real notes in drawer to verify balance"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowDenominations(!showDenominations)}
            style={{
              background: "transparent",
              border: "1px solid var(--border-color)",
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Calculator size={14} />
            {showDenominations ? (language === 'ur' ? "گنتی چھپائیں" : "Hide Note Calculator") : (language === 'ur' ? "نوٹ گنتی کیلکولیٹر" : "Note Denominations")}
          </button>
        </div>

        {/* Denominations Grid (if toggled) */}
        {showDenominations && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "10px",
            background: "var(--bg-card)",
            padding: "14px",
            borderRadius: "10px",
            border: "1px solid var(--border-color)",
            marginBottom: "16px"
          }}>
            {[5000, 1000, 500, 100, 50, 20, 10].map(denom => (
              <div key={denom}>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                  Rs. {denom} x
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={notes[denom]}
                  onChange={e => handleNoteChange(denom, e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    fontSize: "0.82rem",
                    fontWeight: 700
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Actual Cash Input and Difference Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 200px", maxWidth: "260px" }}>
            <input
              type="number"
              placeholder={language === 'ur' ? "گنتی شدہ رقم..." : "Actual Counted Cash..."}
              value={actualPhysicalCash}
              onChange={e => setActualPhysicalCash(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "2px solid var(--border-color)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                fontSize: "1.05rem",
                fontWeight: 800,
                outline: "none"
              }}
            />
          </div>

          {countedNum !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem", fontWeight: 700 }}>
              {difference === 0 ? (
                <span style={{ color: "#10b981", display: "flex", alignItems: "center", gap: "6px" }}>
                  <CheckCircle2 size={20} />
                  {language === 'ur' ? "کیش بالکل برابر ہے (Matched!)" : "Drawer Cash is 100% Balanced!"}
                </span>
              ) : difference > 0 ? (
                <span style={{ color: "#3b82f6", display: "flex", alignItems: "center", gap: "6px" }}>
                  <ArrowUpRight size={20} />
                  {language === 'ur' ? `زائد کیش (Surplus): +Rs. ${difference.toLocaleString()}` : `Surplus Cash: +Rs. ${difference.toLocaleString()}`}
                </span>
              ) : (
                <span style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertTriangle size={20} />
                  {language === 'ur' ? `کیش کمی (Shortage): Rs. ${difference.toLocaleString()}` : `Cash Shortage: Rs. ${difference.toLocaleString()}`}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Print Action Buttons */}
      <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onPrintThermal}
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            color: "var(--text-primary)",
            padding: "12px 22px",
            borderRadius: "10px",
            fontWeight: 700,
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          <Printer size={18} />
          {language === 'ur' ? "80mm تھرمل پرچی پرنٹ کریں" : "Print 80mm Slip"}
        </button>

        <button
          type="button"
          onClick={onPrintA4}
          style={{
            background: "linear-gradient(135deg, var(--accent-primary) 0%, #1e40af 100%)",
            border: "none",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: "10px",
            fontWeight: 800,
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.25)",
            transition: "all 0.15s ease"
          }}
        >
          <FileText size={18} />
          {language === 'ur' ? "مکمل ڈے کلوزنگ رپورٹ (A4 Roznamcha)" : "Print Full Roznamcha (A4)"}
        </button>
      </div>
    </div>
  );
}
