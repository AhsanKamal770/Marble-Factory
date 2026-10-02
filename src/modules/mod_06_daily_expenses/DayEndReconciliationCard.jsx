import React, { useState } from "react";
import { Printer, CheckCircle2, AlertTriangle, Calculator, FileText, ArrowDownRight, ArrowUpRight, DollarSign } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function DayEndReconciliationCard({ cashData, onPrintThermal, onPrintA4 }) {
  const { language } = useLanguage();
  const tr = (en, ur) => (language === "ur" ? ur : en);

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
      padding: "24px",
      borderRadius: "14px",
      border: "1px solid var(--border-color)",
      boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)"
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <h3 style={{
          fontSize: "1.15rem",
          fontWeight: 800,
          margin: 0,
          color: "var(--text-primary)",
          letterSpacing: "-0.01em"
        }}>
          {tr("Day-End Roznamcha & Reconciliation", "روزنامچہ و کیش دراز آڈٹ")}
        </h3>
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "3px" }}>
          {tr("Compare system expected cash with actual physical cash in the drawer", "اوپننگ کیش، نقد سیلز، ریکوری اور اخراجات کا جامع موازنہ")}
        </p>
      </div>

      {/* Main 2-Column Math Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "20px",
        marginBottom: "20px"
      }}>
        {/* Left Column: Cash Inflow (+) */}
        <div style={{
          background: "var(--bg-primary)",
          padding: "18px",
          borderRadius: "12px",
          border: "1px solid var(--border-color)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", color: "#10b981", fontWeight: 800, fontSize: "0.92rem" }}>
            <ArrowUpRight size={17} />
            {tr("Total Cash Inflow (+)", "کل کیش آمد / وصولیاں (+)")}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.84rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>
                {tr("Opening Cash Balance:", "صبح کا اوپننگ کیش:")}
              </span>
              <span style={{ fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                Rs. {Number(openingCash).toLocaleString()}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>
                {tr(`Cash Sales Today (${todayInvoicesCount}):`, `آج کی نقد بل سیلز (${todayInvoicesCount}):`)}
              </span>
              <span style={{ fontWeight: 700, color: "#10b981", fontFamily: "var(--font-mono)" }}>
                + Rs. {Number(cashSalesToday).toLocaleString()}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>
                {tr(`Customer Udhar Recoveries (${todayPaymentsCount}):`, `گاہک کھاتہ وصولی (${todayPaymentsCount}):`)}
              </span>
              <span style={{ fontWeight: 700, color: "#10b981", fontFamily: "var(--font-mono)" }}>
                + Rs. {Number(wasooliToday).toLocaleString()}
              </span>
            </div>

            <div style={{ borderTop: "1px dashed var(--border-divider)", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
              <span style={{ color: "var(--text-primary)" }}>
                {tr("Total Cash Inflow:", "کل آمد:")}
              </span>
              <span style={{ color: "#10b981", fontFamily: "var(--font-mono)", fontSize: "0.95rem" }}>
                Rs. {Number(totalCashInflow).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Cash Outflow (-) */}
        <div style={{
          background: "var(--bg-primary)",
          padding: "18px",
          borderRadius: "12px",
          border: "1px solid var(--border-color)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", color: "#ef4444", fontWeight: 800, fontSize: "0.92rem" }}>
            <ArrowDownRight size={17} />
            {tr("Total Cash Outflow (-)", "کل کیش نکاسی / اخراجات (-)")}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.84rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>
                {tr(`Daily Factory Expenses (${todayExpensesCount}):`, `روزانہ فیکٹری اخراجات (${todayExpensesCount}):`)}
              </span>
              <span style={{ fontWeight: 700, color: "#ef4444", fontFamily: "var(--font-mono)" }}>
                - Rs. {Number(expensesToday).toLocaleString()}
              </span>
            </div>

            {supplierCashToday > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>
                  {tr("Supplier Cash Payments:", "سپلائر نقد ادائیگیاں:")}
                </span>
                <span style={{ fontWeight: 700, color: "#ef4444", fontFamily: "var(--font-mono)" }}>
                  - Rs. {Number(supplierCashToday).toLocaleString()}
                </span>
              </div>
            )}

            {employeeAdvancesToday > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>
                  {tr("Worker Cash Advances:", "ملازمین کیش ایڈوانس:")}
                </span>
                <span style={{ fontWeight: 700, color: "#ef4444", fontFamily: "var(--font-mono)" }}>
                  - Rs. {Number(employeeAdvancesToday).toLocaleString()}
                </span>
              </div>
            )}

            <div style={{ borderTop: "1px dashed var(--border-divider)", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
              <span style={{ color: "var(--text-primary)" }}>
                {tr("Total Cash Outflow:", "کل خرچ:")}
              </span>
              <span style={{ color: "#ef4444", fontFamily: "var(--font-mono)", fontSize: "0.95rem" }}>
                - Rs. {Number(totalCashOutflow).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center Net Expected Balance Box */}
      <div style={{
        background: liveCash >= 0 ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
        border: `1px solid ${liveCash >= 0 ? "#10b981" : "#ef4444"}`,
        padding: "16px 20px",
        borderRadius: "12px",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "14px",
        marginBottom: "20px"
      }}>
        <div>
          <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--text-secondary)" }}>
            EXPECTED LIVE CASH IN DRAWER
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
            (Opening + Inflow - Outflow)
          </div>
        </div>

        <div style={{
          fontSize: "1.65rem",
          fontWeight: 900,
          color: liveCash >= 0 ? "#10b981" : "#ef4444",
          fontFamily: "var(--font-mono)"
        }}>
          Rs. {Number(liveCash).toLocaleString()}
        </div>
      </div>

      {/* Physical Cash Verification & Denomination Calculator */}
      <div style={{
        background: "var(--bg-primary)",
        padding: "18px",
        borderRadius: "12px",
        border: "1px solid var(--border-color)",
        marginBottom: "20px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
          <div>
            <h4 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {tr("Physical Drawer Cash Audit", "دراز میں فزیکل گنتی شدہ کیش")}
            </h4>
            <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
              {tr("Count real notes in drawer to verify balance", "دراز گن کر رقم درج کریں")}
            </span>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowDenominations(!showDenominations)}
            style={{
              padding: "5px 10px",
              fontSize: "0.75rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Calculator size={13} />
            {showDenominations ? tr("Hide Calculator", "گنتی چھپائیں") : tr("Note Denominations", "نوٹ گنتی کیلکولیٹر")}
          </button>
        </div>

        {/* Denominations Grid (if toggled) */}
        {showDenominations && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "8px",
            background: "var(--bg-card)",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            marginBottom: "14px"
          }}>
            {[5000, 1000, 500, 100, 50, 20, 10].map(denom => (
              <div key={denom}>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "3px" }}>
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
                    padding: "5px 7px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)"
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Actual Cash Input and Difference Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 200px", maxWidth: "260px" }}>
            <input
              type="number"
              placeholder={tr("Actual Counted Cash...", "گنتی شدہ رقم...")}
              value={actualPhysicalCash}
              onChange={e => setActualPhysicalCash(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                fontSize: "1rem",
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                outline: "none"
              }}
            />
          </div>

          {countedNum !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", fontWeight: 700 }}>
              {difference === 0 ? (
                <span style={{ color: "#10b981", display: "flex", alignItems: "center", gap: "6px" }}>
                  <CheckCircle2 size={18} />
                  {tr("Drawer Cash is 100% Balanced!", "کیش بالکل برابر ہے!")}
                </span>
              ) : difference > 0 ? (
                <span style={{ color: "#2563eb", display: "flex", alignItems: "center", gap: "6px" }}>
                  <ArrowUpRight size={18} />
                  {tr(`Surplus Cash: +Rs. ${difference.toLocaleString()}`, `زائد کیش: +Rs. ${difference.toLocaleString()}`)}
                </span>
              ) : (
                <span style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertTriangle size={18} />
                  {tr(`Cash Shortage: Rs. ${difference.toLocaleString()}`, `کیش کمی: Rs. ${difference.toLocaleString()}`)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Print Action Buttons */}
      <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onPrintA4}
          style={{
            padding: "10px 24px",
            borderRadius: "8px",
            fontWeight: 800,
            fontSize: "0.88rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)"
          }}
        >
          <FileText size={16} />
          {tr("Print Full Roznamcha (A4)", "مکمل روزنامچہ پرنٹ کریں (A4)")}
        </button>
      </div>
    </div>
  );
}

