import React, { useState } from "react";
import { Printer, CheckCircle2, AlertTriangle, Calculator, FileText, ArrowDownRight, ArrowUpRight, DollarSign, Coins, ChevronDown, ChevronUp } from "lucide-react";
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
      padding: "24px",
      borderRadius: "16px",
      border: "1px solid var(--border-color)",
      boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)"
    }}>
      {/* Header with Title and Print Actions */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "14px",
        marginBottom: "22px",
        paddingBottom: "16px",
        borderBottom: "1px solid var(--border-divider)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            background: "rgba(37, 99, 235, 0.1)",
            color: "var(--accent-primary, #2563eb)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <Calculator size={20} />
          </div>
          <div>
            <h3 style={{
              fontSize: "1.08rem",
              fontWeight: 800,
              margin: 0,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em"
            }}>
              {language === 'ur' ? "روزنامچہ و کیش دراز آڈٹ (Day-End Reconciliation)" : "DAY-END ROZNAMCHA & CASH DRAWER RECONCILIATION"}
            </h3>
            <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
              {language === 'ur' ? "اوپننگ کیش، نقد سیلز، ریکوری اور اخراجات کا جامع موازنہ" : "Compare system expected cash with actual physical cash in the drawer."}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={onPrintThermal}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <Printer size={14} style={{ color: "var(--accent-primary, #2563eb)" }} />
            <span>{language === 'ur' ? "تھرمل پرچی" : "Thermal Slip"}</span>
          </button>

          <button
            type="button"
            onClick={onPrintA4}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "8px",
              border: "none",
              background: "var(--accent-primary, #2563eb)",
              color: "#ffffff",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(37, 99, 235, 0.2)",
              transition: "all 0.15s ease"
            }}
          >
            <FileText size={14} />
            <span>{language === 'ur' ? "A4 روزنامچہ رپورٹ" : "A4 Closing Sheet"}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Math Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "20px",
        marginBottom: "24px"
      }}>
        {/* Left Column: Cash Inflow (+) */}
        <div style={{
          background: "var(--bg-primary)",
          padding: "18px",
          borderRadius: "14px",
          border: "1px solid var(--border-color)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", color: "#10b981", fontWeight: 800, fontSize: "0.90rem" }}>
            <ArrowUpRight size={17} />
            <span>{language === 'ur' ? "کل کیش آمد / وصولیاں (+)" : "Total Cash Inflow (+)"}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.82rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>
                {language === 'ur' ? "صبح کا اوپننگ کیش (Opening):" : "Opening Cash Balance:"}
              </span>
              <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                Rs. {Number(openingCash).toLocaleString()}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>
                {language === 'ur' ? `آج کی نقد بل سیلز (${todayInvoicesCount}):` : `Cash Sales Today (${todayInvoicesCount}):`}
              </span>
              <span style={{ fontWeight: 700, color: "#10b981" }}>
                + Rs. {Number(cashSalesToday).toLocaleString()}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>
                {language === 'ur' ? `گاہک کھاتہ وصولی / Wasooli (${todayPaymentsCount}):` : `Customer Udhar Recoveries (${todayPaymentsCount}):`}
              </span>
              <span style={{ fontWeight: 700, color: "#10b981" }}>
                + Rs. {Number(wasooliToday).toLocaleString()}
              </span>
            </div>

            <div style={{
              borderTop: "1px dashed var(--border-divider)",
              paddingTop: "8px",
              marginTop: "2px",
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 800
            }}>
              <span style={{ color: "var(--text-primary)" }}>
                {language === 'ur' ? "کل آمد (Total Inflow):" : "Total Cash Inflow:"}
              </span>
              <span style={{ color: "#10b981", fontSize: "0.92rem" }}>
                Rs. {Number(totalCashInflow).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Cash Outflow (-) */}
        <div style={{
          background: "var(--bg-primary)",
          padding: "18px",
          borderRadius: "14px",
          border: "1px solid var(--border-color)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", color: "#ef4444", fontWeight: 800, fontSize: "0.90rem" }}>
            <ArrowDownRight size={17} />
            <span>{language === 'ur' ? "کل کیش نکاسی / اخراجات (-)" : "Total Cash Outflow (-)"}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.82rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>
                {language === 'ur' ? `روزانہ فیکٹری اخراجات (${todayExpensesCount}):` : `Daily Factory Expenses (${todayExpensesCount}):`}
              </span>
              <span style={{ fontWeight: 700, color: "#ef4444" }}>
                - Rs. {Number(expensesToday).toLocaleString()}
              </span>
            </div>

            {supplierCashToday > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>
                  {language === 'ur' ? "سپلائر نقد ادائیگی:" : "Supplier Cash Payments:"}
                </span>
                <span style={{ fontWeight: 700, color: "#ef4444" }}>
                  - Rs. {Number(supplierCashToday).toLocaleString()}
                </span>
              </div>
            )}

            {employeeAdvancesToday > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>
                  {language === 'ur' ? "ملازمین ایڈوانس تنخواہ:" : "Worker Cash Advances:"}
                </span>
                <span style={{ fontWeight: 700, color: "#ef4444" }}>
                  - Rs. {Number(employeeAdvancesToday).toLocaleString()}
                </span>
              </div>
            )}

            <div style={{
              borderTop: "1px dashed var(--border-divider)",
              paddingTop: "8px",
              marginTop: "2px",
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 800
            }}>
              <span style={{ color: "var(--text-primary)" }}>
                {language === 'ur' ? "کل نکاسی (Total Outflow):" : "Total Cash Outflow:"}
              </span>
              <span style={{ color: "#ef4444", fontSize: "0.92rem" }}>
                - Rs. {Number(totalCashOutflow).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Reconciliation Section: Expected vs Actual */}
      <div style={{
        background: "var(--bg-primary)",
        padding: "18px",
        borderRadius: "14px",
        border: "1px solid var(--border-color)",
        marginBottom: "16px"
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          alignItems: "center"
        }}>
          {/* Expected Live Drawer Cash */}
          <div>
            <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              {language === 'ur' ? "سسٹم کے مطابق لائیو کیش (متوقع):" : "System Expected Live Cash:"}
            </span>
            <div style={{
              fontSize: "1.45rem",
              fontWeight: 900,
              color: "#059669",
              marginTop: "4px"
            }}>
              Rs. {Number(liveCash).toLocaleString()}
            </div>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Inflow (Rs. {totalCashInflow.toLocaleString()}) - Outflow (Rs. {totalCashOutflow.toLocaleString()})
            </p>
          </div>

          {/* Actual Counted Physical Cash Input */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                {language === 'ur' ? "دراز میں موجود اصل نقد کیش (گنتی):" : "Actual Physical Cash in Drawer:"}
              </span>
              <button
                type="button"
                onClick={() => setShowDenominations(!showDenominations)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  border: "none",
                  background: "transparent",
                  color: "var(--accent-primary, #2563eb)",
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                <Coins size={12} />
                <span>{showDenominations ? (language === 'ur' ? "کاؤنٹر بند کریں" : "Hide Counter") : (language === 'ur' ? "نوٹ کاؤنٹر کھولیں" : "Note Counter")}</span>
                {showDenominations ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                fontWeight: 800,
                color: "var(--text-secondary)",
                fontSize: "0.88rem"
              }}>
                Rs.
              </span>
              <input
                type="number"
                min="0"
                value={actualPhysicalCash}
                onChange={e => setActualPhysicalCash(e.target.value)}
                placeholder="Enter physical cash counted..."
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 42px",
                  borderRadius: "10px",
                  border: "1.5px solid var(--border-color)",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontSize: "1.05rem",
                  fontWeight: 800,
                  outline: "none"
                }}
              />
            </div>
          </div>
        </div>

        {/* Currency Denominations Collapsible Grid */}
        {showDenominations && (
          <div style={{
            marginTop: "16px",
            paddingTop: "14px",
            borderTop: "1px dashed var(--border-divider)"
          }}>
            <span style={{ display: "block", fontSize: "0.76rem", fontWeight: 800, color: "var(--text-secondary)", marginBottom: "10px" }}>
              {language === 'ur' ? "پاکستانی کرنسی نوٹ کاؤنٹر (تعداد درج کریں):" : "Pakistani Currency Denominations Counter (Enter Quantities):"}
            </span>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "8px"
            }}>
              {[5000, 1000, 500, 100, 50, 20, 10].map(denom => {
                const count = Number(notes[denom]) || 0;
                const noteTotal = denom * count;

                return (
                  <div
                    key={denom}
                    style={{
                      background: "var(--bg-card)",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--text-primary)" }}>
                        Rs. {denom}
                      </span>
                      <span style={{ fontSize: "0.70rem", color: "var(--text-muted)", fontWeight: 700 }}>
                        {noteTotal > 0 ? `Rs. ${noteTotal.toLocaleString()}` : ''}
                      </span>
                    </div>

                    <input
                      type="number"
                      min="0"
                      value={notes[denom]}
                      onChange={e => handleNoteChange(denom, e.target.value)}
                      placeholder="0 pcs"
                      style={{
                        width: "100%",
                        padding: "5px 8px",
                        borderRadius: "6px",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-primary)",
                        color: "var(--text-primary)",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        outline: "none"
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Reconciliation Outcome Status Banner */}
      {countedNum !== null && (
        <div style={{
          padding: "14px 18px",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          background: difference === 0
            ? "rgba(16, 185, 129, 0.1)"
            : difference > 0
              ? "rgba(37, 99, 235, 0.1)"
              : "rgba(239, 68, 68, 0.1)",
          border: `1.5px solid ${
            difference === 0 ? "#10b981" : difference > 0 ? "var(--accent-primary, #2563eb)" : "#ef4444"
          }`
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {difference === 0 ? (
              <CheckCircle2 size={22} style={{ color: "#10b981" }} />
            ) : difference > 0 ? (
              <DollarSign size={22} style={{ color: "var(--accent-primary, #2563eb)" }} />
            ) : (
              <AlertTriangle size={22} style={{ color: "#ef4444" }} />
            )}

            <div>
              <div style={{
                fontWeight: 800,
                fontSize: "0.88rem",
                color: difference === 0 ? "#059669" : difference > 0 ? "var(--accent-primary, #2563eb)" : "#ef4444"
              }}>
                {difference === 0
                  ? (language === 'ur' ? "دراز کیش بالکل برابر و درست ہے (Perfect Match)" : "Drawer is Perfectly Balanced (Zero Variance)")
                  : difference > 0
                    ? (language === 'ur' ? "دراز میں اضافی کیش موجود ہے (Cash Surplus / بیشی)" : "Cash Surplus in Drawer (More than expected)")
                    : (language === 'ur' ? "دراز میں کیش کی کمی ہے (Cash Shortage / شارٹ)" : "Cash Shortage in Drawer (Deficit)")}
              </div>
              <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                {difference === 0
                  ? (language === 'ur' ? "سسٹم اور دراز کے نوٹ بالکل ایک جتنے ہیں۔" : "System record exactly matches physical cash count.")
                  : difference > 0
                    ? (language === 'ur' ? `دراز میں سسٹم سے زیادہ رقم موجود ہے۔` : `Counted amount is greater than recorded receipts.`)
                    : (language === 'ur' ? `دراز میں سسٹم سے کم رقم ہے۔ فوری چیک کریں۔` : `Physical cash is lower than expected. Please verify unrecorded expenses.`)}
              </div>
            </div>
          </div>

          <div style={{
            fontSize: "1.25rem",
            fontWeight: 900,
            color: difference === 0 ? "#059669" : difference > 0 ? "var(--accent-primary, #2563eb)" : "#ef4444"
          }}>
            {difference === 0 ? "Rs. 0" : (difference > 0 ? `+ Rs. ${difference.toLocaleString()}` : `- Rs. ${Math.abs(difference).toLocaleString()}`)}
          </div>
        </div>
      )}
    </div>
  );
}
