import React, { useState, useRef } from "react";
import { Printer, X, FileText, Receipt, Share2, Check, Download } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function PrintableDayClosingSheet({
  isOpen,
  onClose,
  cashData,
  expenses = [],
  factorySettings,
  defaultFormat = "a4"
}) {
  const { language } = useLanguage();
  const [printFormat, setPrintFormat] = useState(defaultFormat || "a4");
  const [copied, setCopied] = useState(false);
  const printRef = useRef(null);

  if (!isOpen || !cashData) return null;

  const {
    targetDate,
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
    liveCash = 0,
    categoryTotals = {}
  } = cashData;

  const dateObj = targetDate ? new Date(targetDate) : new Date();
  const dateFormatted = dateObj.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
  const timeFormatted = new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true });

  const companyName = factorySettings?.companyName || "رانا شہاب ماربل فیکٹری اینڈ ٹائلز";
  const tagline = factorySettings?.tagline || "نام ہی کافی ہے - دوسرے شہروں سے مناسب ریٹ اور اعلیٰ معیار کی گارنٹی";
  const phone = factorySettings?.phone || "0300-7708899 / 0321-6606645";
  const address = factorySettings?.address || "جھمرہ سٹی، بالمقابل ریلوے پھاٹک، فیصل آباد روڈ";

  const handlePrint = () => {
    window.print();
  };

  const handleCopyWhatsApp = () => {
    const lines = [
      `*${companyName}*`,
      `_روزنامہ روزنامچہ و کیش دراز رپورٹ_`,
      `---------------------------------`,
      `*Date:* ${dateFormatted} (${timeFormatted})`,
      `*Opening Cash:* Rs. ${Number(openingCash).toLocaleString()}`,
      `*Cash Sales (${todayInvoicesCount}):* +Rs. ${Number(cashSalesToday).toLocaleString()}`,
      `*Khata Wasooli (${todayPaymentsCount}):* +Rs. ${Number(wasooliToday).toLocaleString()}`,
      `*Total Inflow:* Rs. ${Number(totalCashInflow).toLocaleString()}`,
      `---------------------------------`,
      `*Daily Expenses (${todayExpensesCount}):* -Rs. ${Number(expensesToday).toLocaleString()}`,
      supplierCashToday > 0 ? `*Supplier Cash:* -Rs. ${Number(supplierCashToday).toLocaleString()}` : null,
      employeeAdvancesToday > 0 ? `*Worker Advances:* -Rs. ${Number(employeeAdvancesToday).toLocaleString()}` : null,
      `*Total Outflow:* -Rs. ${Number(totalCashOutflow).toLocaleString()}`,
      `---------------------------------`,
      `*NET DRAWER CASH:* Rs. ${Number(liveCash).toLocaleString()}`,
      `---------------------------------`,
      `*EXPENSES SUMMARY:*`,
      ...expenses.map((e, idx) => `${idx + 1}. ${e.category} - Rs.${Number(e.amount).toLocaleString()} (${e.paidTo || 'Self'})`),
      `---------------------------------`,
      `رپورٹ برائے مالک کارخانہ | جھمرہ روڈ`
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px"
      }}
      onClick={onClose}
    >
      <div
        className="modal-card"
        style={{
          maxWidth: printFormat === "a4" ? "880px" : "480px",
          width: "95%",
          maxHeight: "94vh",
          transition: "max-width 0.2s ease",
          background: "var(--bg-card)",
          borderRadius: "14px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar (Hidden on Print) */}
        <div
          className="print-hide"
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid var(--border-divider)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-primary)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ fontSize: "0.98rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {language === "ur" ? "روزنامچہ رپورٹ پرنٹ و ریکارڈ" : "Print Roznamcha Closing Report"}
            </span>

            {/* Format Switcher Tabs */}
            <div style={{ display: "flex", background: "var(--bg-card)", padding: "2px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
              <button
                type="button"
                onClick={() => setPrintFormat("a4")}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  background: printFormat === "a4" ? "var(--accent-primary)" : "transparent",
                  color: printFormat === "a4" ? "#ffffff" : "var(--text-secondary)"
                }}
              >
                <FileText size={13} />
                <span>A4 Bill Book Format</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintFormat("thermal")}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  background: printFormat === "thermal" ? "var(--accent-primary)" : "transparent",
                  color: printFormat === "thermal" ? "#ffffff" : "var(--text-secondary)"
                }}
              >
                <Receipt size={13} />
                <span>80mm Thermal Slip</span>
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              title="Copy WhatsApp Summary"
              style={{
                fontSize: "0.75rem",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "5px",
                cursor: "pointer"
              }}
            >
              {copied ? <Check size={13} style={{ color: "#059669" }} /> : <Share2 size={13} />}
              <span>{copied ? "Copied!" : "WhatsApp"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                fontSize: "0.75rem",
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                background: "linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)",
                color: "#ffffff",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: "5px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(30, 64, 175, 0.25)"
              }}
            >
              <Printer size={13} />
              <span>Print Now</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "4px 8px"
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Body Scroll Area */}
        <div style={{ background: "#f1f5f9", padding: "20px", overflowY: "auto", flex: 1 }}>
          <div ref={printRef} id="roznamcha-print-area">
            <style>{`
              @media print {
                body * { visibility: hidden !important; }
                #roznamcha-print-area, #roznamcha-print-area * { visibility: visible !important; }
                #roznamcha-print-area {
                  display: block !important;
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: ${printFormat === 'a4' ? '100%' : '78mm'};
                  margin: 0;
                  padding: ${printFormat === 'a4' ? '20px' : '4mm 2mm'};
                  background: #ffffff !important;
                  color: #000000 !important;
                }
                .print-hide { display: none !important; }
                @page {
                  size: ${printFormat === 'a4' ? 'A4 portrait' : '80mm auto'};
                  margin: ${printFormat === 'a4' ? '10mm' : '0'};
                }
              }
            `}</style>

            {/* ------------------------------------------------------------- */}
            {/* FORMAT 1: AUTHENTIC A4 BILL BOOK REPLICA ROZNAMCHA SHEET      */}
            {/* ------------------------------------------------------------- */}
            {printFormat === "a4" && (
              <div
                style={{
                  background: "#ffffff",
                  color: "#0f172a",
                  padding: "24px 28px",
                  borderRadius: "6px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
                  border: "2px solid #0f172a",
                  fontFamily: "var(--font-main)",
                  maxWidth: "800px",
                  margin: "0 auto",
                  lineHeight: 1.3
                }}
              >
                {/* Traditional Bill Book Top Header */}
                <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: "12px", marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    {/* Urdu Factory Title & Slogan */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
                      <h1
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: 900,
                          color: "#1e3a8a",
                          margin: "2px 0 0 0",
                          letterSpacing: "-0.02em"
                        }}
                      >
                        {companyName}
                      </h1>
                      <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", fontFamily: "var(--font-urdu)", marginTop: "2px" }}>
                        نام ہی کافی ہے — رانا شہاب
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "#475569", marginTop: "3px" }}>
                        {address} | فون: {phone}
                      </div>
                    </div>

                    {/* Report Meta Stamp */}
                    <div
                      style={{
                        textAlign: "right",
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        minWidth: "185px"
                      }}
                    >
                      <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700 }}>DAILY ROZNAMCHA / روزنامچہ</div>
                      <div className="font-mono" style={{ fontSize: "0.95rem", fontWeight: 900, color: "#1e3a8a" }}>
                        ROZ-{targetDate?.replace(/-/g, '') || 'REPORT'}
                      </div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#334155", marginTop: "3px" }}>
                        تاریخ: {dateFormatted}
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "2px" }}>
                        وقت کلوزنگ: {timeFormatted}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cash Inflow & Outflow Dual Summary Box (Bill Book Style) */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "14px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    padding: "12px 14px",
                    borderRadius: "6px",
                    marginBottom: "14px",
                    fontSize: "0.8rem"
                  }}
                >
                  {/* Left Column: Cash Inflow (+) */}
                  <div>
                    <div style={{ fontWeight: 800, color: "#059669", fontSize: "0.85rem", borderBottom: "1px solid #cbd5e1", paddingBottom: "4px", marginBottom: "6px" }}>
                      1. نقد آمد / CASH INFLOW (+)
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span style={{ color: "#475569" }}>صبح کا اوپننگ کیش (Opening):</span>
                      <strong className="font-mono">Rs. {Number(openingCash).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span style={{ color: "#475569" }}>نقد بل سیلز ({todayInvoicesCount} بل):</span>
                      <strong className="font-mono" style={{ color: "#059669" }}>+ Rs. {Number(cashSalesToday).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span style={{ color: "#475569" }}>کھاتہ وصولی / Wasooli ({todayPaymentsCount} واؤچر):</span>
                      <strong className="font-mono" style={{ color: "#059669" }}>+ Rs. {Number(wasooliToday).toLocaleString()}</strong>
                    </div>
                    <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "4px", marginTop: "4px", display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                      <span>کل کیش آمد (Total Inflow):</span>
                      <span className="font-mono" style={{ color: "#059669" }}>Rs. {Number(totalCashInflow).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Right Column: Cash Outflow (-) */}
                  <div>
                    <div style={{ fontWeight: 800, color: "#dc2626", fontSize: "0.85rem", borderBottom: "1px solid #cbd5e1", paddingBottom: "4px", marginBottom: "6px" }}>
                      2. نقد اخراجات / CASH OUTFLOW (-)
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span style={{ color: "#475569" }}>روزانہ فیکٹری اخراجات ({todayExpensesCount} مدات):</span>
                      <strong className="font-mono" style={{ color: "#dc2626" }}>- Rs. {Number(expensesToday).toLocaleString()}</strong>
                    </div>
                    {supplierCashToday > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                        <span style={{ color: "#475569" }}>سپلائر نقد ادائیگیاں:</span>
                        <strong className="font-mono" style={{ color: "#dc2626" }}>- Rs. {Number(supplierCashToday).toLocaleString()}</strong>
                      </div>
                    )}
                    {employeeAdvancesToday > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                        <span style={{ color: "#475569" }}>ملازمین کیش ایڈوانس:</span>
                        <strong className="font-mono" style={{ color: "#dc2626" }}>- Rs. {Number(employeeAdvancesToday).toLocaleString()}</strong>
                      </div>
                    )}
                    <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "4px", marginTop: "4px", display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                      <span>کل اخراجات (Total Outflow):</span>
                      <span className="font-mono" style={{ color: "#dc2626" }}>- Rs. {Number(totalCashOutflow).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Net Expected Live Cash in Drawer Banner */}
                <div
                  style={{
                    border: "2px solid #0f172a",
                    background: "#f0fdf4",
                    padding: "10px 16px",
                    borderRadius: "6px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "14px"
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "#065f46" }}>
                      دراز میں متوقع کل نقد رقم (EXPECTED LIVE CASH IN DRAWER)
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#047857" }}>
                      حساب: اوپننگ کیش (Rs. {Number(openingCash).toLocaleString()}) + کل آمد (Rs. {Number(totalCashInflow).toLocaleString()}) - کل اخراجات (Rs. {Number(totalCashOutflow).toLocaleString()})
                    </div>
                  </div>
                  <div className="font-mono" style={{ fontSize: "1.4rem", fontWeight: 900, color: "#065f46" }}>
                    Rs. {Number(liveCash).toLocaleString()}
                  </div>
                </div>

                {/* Category Summary Strip */}
                {Object.keys(categoryTotals).length > 0 && (
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      marginBottom: "14px",
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                      fontSize: "0.74rem"
                    }}
                  >
                    <span style={{ fontWeight: 800, color: "#334155" }}>خلاصہ اخراجات:</span>
                    {Object.entries(categoryTotals).map(([cat, amt]) => (
                      <span key={cat} style={{ color: "#475569" }}>
                        {cat}: <strong className="font-mono" style={{ color: "#0f172a" }}>Rs.{Number(amt).toLocaleString()}</strong> |
                      </span>
                    ))}
                  </div>
                )}

                {/* Line Items Table (A4 Bill Book Style) */}
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.78rem",
                    marginBottom: "14px"
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f1f5f9", borderTop: "2px solid #0f172a", borderBottom: "2px solid #0f172a" }}>
                      <th style={{ padding: "6px 8px", textAlign: "center", width: "36px", borderRight: "1px solid #cbd5e1" }}>#</th>
                      <th style={{ padding: "6px 8px", textAlign: "center", width: "70px", borderRight: "1px solid #cbd5e1" }}>وقت</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", width: "130px", borderRight: "1px solid #cbd5e1" }}>کیٹیگری / شعبہ</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", width: "120px", borderRight: "1px solid #cbd5e1" }}>کس کو ادا کیا</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", borderRight: "1px solid #cbd5e1" }}>تفصیل / وجہ خرچ (Remarks)</th>
                      <th style={{ padding: "6px 8px", textAlign: "center", width: "65px", borderRight: "1px solid #cbd5e1" }}>طریقہ</th>
                      <th style={{ padding: "6px 8px", textAlign: "right", width: "95px" }}>میزان رقم (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses && expenses.length > 0 ? (
                      expenses.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "6px 8px", textAlign: "center", borderRight: "1px solid #cbd5e1" }}>{idx + 1}</td>
                          <td className="font-mono" style={{ padding: "6px 8px", textAlign: "center", borderRight: "1px solid #cbd5e1", fontSize: "0.72rem", color: "#64748b" }}>
                            {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td style={{ padding: "6px 8px", fontWeight: 700, borderRight: "1px solid #cbd5e1", color: "#1e3a8a" }}>
                            {item.category}
                          </td>
                          <td style={{ padding: "6px 8px", fontWeight: 600, borderRight: "1px solid #cbd5e1", color: "#0f172a" }}>
                            {item.paidTo || "-"}
                          </td>
                          <td style={{ padding: "6px 8px", borderRight: "1px solid #cbd5e1", color: "#475569", fontSize: "0.75rem" }}>
                            {item.remarks || "-"}
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "center", borderRight: "1px solid #cbd5e1", fontSize: "0.72rem", color: "#475569" }}>
                            {item.paymentMethod || "Cash"}
                          </td>
                          <td className="font-mono" style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: "#dc2626" }}>
                            {Number(item.amount || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ padding: "14px", textAlign: "center", color: "#64748b" }}>
                          اس تاریخ کے لیے کوئی خرچ ریکارڈ نہیں کیا گیا۔
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f8fafc", borderTop: "2px solid #0f172a", borderBottom: "2px solid #0f172a", fontWeight: 800 }}>
                      <td colSpan="6" style={{ padding: "8px", textAlign: "right", borderRight: "1px solid #cbd5e1" }}>
                        کل فیکٹری اخراجات (Total Expenses):
                      </td>
                      <td className="font-mono" style={{ padding: "8px", textAlign: "right", color: "#dc2626", fontSize: "0.9rem" }}>
                        Rs. {Number(expensesToday).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Terms & Disclaimers in Urdu (Bill Book Style) */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "14px", alignItems: "start", marginBottom: "16px" }}>
                  <div
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      background: "#f8fafc",
                      fontSize: "0.7rem",
                      color: "#475569",
                      fontFamily: "var(--font-urdu)",
                      lineHeight: 1.6
                    }}
                  >
                    <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: "2px" }}>شرائط و قواعد روزنامچہ:</div>
                    <div>1. تمام اخراجات فیکٹری مجاز شخص کی اجازت سے ادا کیے گئے ہیں۔</div>
                    <div>2. دراز میں موجود فزیکل کیش اور روزنامچہ رپورٹ کا روزانہ اختتام پر موازنہ لازمی ہے۔</div>
                    <div>3. بغیر رسید یا تصدیق کے کوئی رقم دراز سے خارج تصور نہ ہوگی۔</div>
                  </div>

                  {/* Quick Audit Settlement Box */}
                  <div
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      background: "#ffffff",
                      fontSize: "0.78rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                      <span>اوپننگ بیلنس:</span>
                      <span className="font-mono">Rs. {Number(openingCash).toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#059669" }}>
                      <span>کل آمد (Inflow):</span>
                      <span className="font-mono">+ Rs. {Number(totalCashInflow).toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#dc2626" }}>
                      <span>کل خرچ (Outflow):</span>
                      <span className="font-mono">- Rs. {Number(totalCashOutflow).toLocaleString()}</span>
                    </div>
                    <div style={{ borderTop: "1px solid #0f172a", paddingTop: "4px", marginTop: "2px", display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "0.85rem", color: "#065f46" }}>
                      <span>نیٹ کیش دراز:</span>
                      <span className="font-mono">Rs. {Number(liveCash).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Signatures Row */}
                <div style={{ marginTop: "32px", display: "flex", justifyContent: "space-between", fontSize: "0.75rem", padding: "0 15px" }}>
                  <div style={{ textAlign: "center", width: "160px" }}>
                    <div style={{ borderTop: "1.5px solid #0f172a", paddingTop: "4px", fontWeight: 800, color: "#0f172a" }}>
                      دستخط منشی / کیشیئر
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Cashier / Munshi Signature</div>
                  </div>

                  <div style={{ textAlign: "center", width: "160px" }}>
                    <div style={{ borderTop: "1.5px solid #0f172a", paddingTop: "4px", fontWeight: 800, color: "#0f172a" }}>
                      دستخط مالک کارخانہ
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Proprietor Signature</div>
                  </div>
                </div>

                {/* Footer Brand Line */}
                <div style={{ textAlign: "center", marginTop: "18px", borderTop: "1px solid #e2e8f0", paddingTop: "6px", fontSize: "0.68rem", color: "#94a3b8" }}>
                  {companyName} — ERP System • جھمرہ سٹی
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* FORMAT 2: 80MM POS THERMAL RECEIPT SLIP                      */}
            {/* ------------------------------------------------------------- */}
            {printFormat === "thermal" && (
              <div
                style={{
                  background: "#ffffff",
                  color: "#000000",
                  padding: "16px 14px",
                  borderRadius: "8px",
                  border: "1px dashed #cbd5e1",
                  fontFamily: "monospace",
                  fontSize: "11px",
                  maxWidth: "380px",
                  margin: "0 auto",
                  lineHeight: 1.35
                }}
              >
                {/* Thermal Header */}
                <div style={{ textAlign: "center", borderBottom: "1px dashed #000", paddingBottom: "6px", marginBottom: "6px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "bold" }}>{companyName}</div>
                  <div style={{ fontSize: "10px" }}>{address}</div>
                  <div style={{ fontSize: "10px" }}>Tel: {phone}</div>
                  <div style={{ fontSize: "12px", fontWeight: "bold", margin: "4px 0 2px 0", borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "2px 0" }}>
                    DAILY ROZNAMCHA / CASH CLOSING
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginTop: "4px" }}>
                    <span>Date: {dateFormatted}</span>
                    <span>Time: {timeFormatted}</span>
                  </div>
                </div>

                {/* Thermal Inflow / Outflow Summary */}
                <div style={{ borderBottom: "1px dashed #000", paddingBottom: "6px", marginBottom: "6px" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "3px" }}>=== CASH INFLOW (+) ===</div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Opening Cash:</span>
                    <span>Rs. {Number(openingCash).toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Cash Sales ({todayInvoicesCount}):</span>
                    <span>Rs. {Number(cashSalesToday).toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Khata Wasooli ({todayPaymentsCount}):</span>
                    <span>Rs. {Number(wasooliToday).toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", borderTop: "1px dotted #000", marginTop: "2px", paddingTop: "2px" }}>
                    <span>Total Inflow:</span>
                    <span>Rs. {Number(totalCashInflow).toLocaleString()}</span>
                  </div>
                </div>

                <div style={{ borderBottom: "1px dashed #000", paddingBottom: "6px", marginBottom: "6px" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "3px" }}>=== CASH OUTFLOW (-) ===</div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Daily Expenses ({todayExpensesCount}):</span>
                    <span>Rs. {Number(expensesToday).toLocaleString()}</span>
                  </div>
                  {supplierCashToday > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Supplier Cash:</span>
                      <span>Rs. {Number(supplierCashToday).toLocaleString()}</span>
                    </div>
                  )}
                  {employeeAdvancesToday > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Worker Advances:</span>
                      <span>Rs. {Number(employeeAdvancesToday).toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", borderTop: "1px dotted #000", marginTop: "2px", paddingTop: "2px" }}>
                    <span>Total Outflow:</span>
                    <span>Rs. {Number(totalCashOutflow).toLocaleString()}</span>
                  </div>
                </div>

                {/* Expected Net Drawer Cash */}
                <div style={{ border: "1px solid #000", padding: "6px", textAlign: "center", marginBottom: "8px", background: "#f8f8f8" }}>
                  <div style={{ fontSize: "10px", fontWeight: "bold" }}>EXPECTED DRAWER CASH</div>
                  <div style={{ fontSize: "15px", fontWeight: "bold", marginTop: "2px" }}>
                    Rs. {Number(liveCash).toLocaleString()}
                  </div>
                </div>

                {/* Itemized Expenses List */}
                {expenses && expenses.length > 0 && (
                  <div style={{ borderBottom: "1px dashed #000", paddingBottom: "6px", marginBottom: "8px" }}>
                    <div style={{ fontWeight: "bold", marginBottom: "4px" }}>EXPENSES DETAILS:</div>
                    {expenses.map((exp, idx) => (
                      <div key={idx} style={{ marginBottom: "3px", fontSize: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>{idx + 1}. {exp.category}</span>
                          <span style={{ fontWeight: "bold" }}>Rs. {Number(exp.amount).toLocaleString()}</span>
                        </div>
                        {(exp.paidTo || exp.remarks) && (
                          <div style={{ color: "#444", fontSize: "9px", paddingLeft: "10px" }}>
                            {exp.paidTo ? `Paid to: ${exp.paidTo}` : ''} {exp.remarks ? `(${exp.remarks})` : ''}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Signatures */}
                <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ borderTop: "1px solid #000", width: "90px", paddingTop: "2px" }}>Munshi Sign</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ borderTop: "1px solid #000", width: "90px", paddingTop: "2px" }}>Owner Sign</div>
                  </div>
                </div>

                <div style={{ textAlign: "center", fontSize: "9px", marginTop: "12px", borderTop: "1px dotted #888", paddingTop: "4px" }}>
                  Marble Factory ERP System
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
