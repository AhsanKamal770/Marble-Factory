import React, { useState, useRef } from "react";
import { Printer, X, FileText, Receipt, Share2, Check, Download } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { printElement } from "../../utils/printHelper";

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
  const [isPrinting, setIsPrinting] = useState(false);
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

  const companyName = factorySettings?.companyNameUrdu || "رانا عبداللہ صدیق ماربل فیکٹری";
  const companyNameEn = factorySettings?.companyNameEnglish || factorySettings?.companyName || "Rana Abdullah Siddique Marble Factory";
  const phone = factorySettings?.phone || "0321-6606645 / 0300-6664187";
  const address = factorySettings?.address || "جھمرہ روڈ، بالمقابل پی ایس او پمپ، فیصل آباد";

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printElement(printRef, {
        title: `DayClosing_${dateFormatted}`,
        format: printFormat,
        isExportPDF: false,
        dir: 'rtl'
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsPrinting(true);
    try {
      await printElement(printRef, {
        title: `DayClosing_${dateFormatted}`,
        format: printFormat,
        isExportPDF: true,
        dir: 'rtl'
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleCopyWhatsApp = () => {
    const lines = [
      `*${companyName}*`,
      `_${companyNameEn}_`,
      `_روزنامہ روزنامچہ و کیش کلوزنگ رپورٹ_`,
      `---------------------------------`,
      `*تاریخ:* ${dateFormatted} (${timeFormatted})`,
      `*صبح کا اوپننگ کیش:* Rs. ${Number(openingCash).toLocaleString()}`,
      `*نقد بل سیلز (${todayInvoicesCount}):* +Rs. ${Number(cashSalesToday).toLocaleString()}`,
      `*کھاتہ وصولی (${todayPaymentsCount}):* +Rs. ${Number(wasooliToday).toLocaleString()}`,
      `*کل آمد:* Rs. ${Number(totalCashInflow).toLocaleString()}`,
      `---------------------------------`,
      `*روزانہ اخراجات (${todayExpensesCount}):* -Rs. ${Number(expensesToday).toLocaleString()}`,
      supplierCashToday > 0 ? `*سپلائر ادائیگیاں:* -Rs. ${Number(supplierCashToday).toLocaleString()}` : null,
      employeeAdvancesToday > 0 ? `*ملازمین ایڈوانس:* -Rs. ${Number(employeeAdvancesToday).toLocaleString()}` : null,
      `*کل اخراجات:* -Rs. ${Number(totalCashOutflow).toLocaleString()}`,
      `---------------------------------`,
      `*دراز میں موجود نیٹ کیش:* Rs. ${Number(liveCash).toLocaleString()}`,
      `---------------------------------`,
      `*تفصیل اخراجات:*`,
      ...expenses.map((e, idx) => `${idx + 1}. ${e.category} - Rs.${Number(e.amount).toLocaleString()} (${e.paidTo || 'خود خرچ'})`),
      `---------------------------------`,
      `رپورٹ برائے ریکارڈ و آڈٹ | رابطہ: ${phone}`
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
          maxWidth: printFormat === "a4" ? "880px" : "420px",
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
              {language === "ur" ? "روزنامچہ پرنٹ و ریکارڈ" : "Print Roznamcha Closing Report"}
            </span>

            {/* Format Switcher Tabs */}
            <div style={{ display: "flex", background: "var(--bg-card)", padding: "2px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
              <button
                type="button"
                onClick={() => setPrintFormat("a4")}
                style={{
                  padding: "5px 12px",
                  fontSize: "0.78rem",
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
                <span>A4 Sheet</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintFormat("thermal")}
                style={{
                  padding: "5px 12px",
                  fontSize: "0.78rem",
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
                <span>80mm Slip</span>
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              title="Copy WhatsApp Summary"
              style={{
                fontSize: "0.78rem",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                fontWeight: 600,
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
              onClick={handleExportPDF}
              disabled={isPrinting}
              title="Save as PDF directly"
              style={{
                fontSize: "0.78rem",
                padding: "6px 14px",
                borderRadius: "6px",
                border: "1px solid #10b981",
                background: "rgba(16, 185, 129, 0.08)",
                color: "#059669",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "5px",
                cursor: "pointer"
              }}
            >
              <Download size={13} />
              <span>Save PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              style={{
                fontSize: "0.78rem",
                padding: "6px 16px",
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
              <span>Print</span>
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
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: ${printFormat === 'thermal' ? '78mm' : '100%'} !important;
                  max-width: ${printFormat === 'thermal' ? '78mm' : '210mm'} !important;
                  margin: 0 auto !important;
                  padding: ${printFormat === 'thermal' ? '3mm 2mm' : '15mm'} !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  box-sizing: border-box !important;
                }
                .print-hide { display: none !important; }
                @page {
                  size: ${printFormat === 'thermal' ? '80mm auto' : 'A4 portrait'} !important;
                  margin: ${printFormat === 'thermal' ? '0mm' : '8mm'} !important;
                }
              }
            `}</style>

            {/* ------------------------------------------------------------- */}
            {/* FORMAT 1: AUTHENTIC A4 CLEAN URDU ROZNAMCHA SHEET             */}
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
                  lineHeight: 1.35,
                  direction: "rtl"
                }}
              >
                {/* Traditional Bill Book Top Header (Bilingual Factory Name) */}
                <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: "12px", marginBottom: "14px" }}>
                  <div style={{ textAlign: "center", fontSize: "0.85rem", color: "#64748b", fontWeight: 700, marginBottom: "4px" }}>
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                    {/* Urdu Factory Title & Slogan */}
                    <div style={{ flex: 1, textAlign: "right" }}>
                      <h1
                        style={{
                          fontSize: "1.40rem",
                          fontWeight: 900,
                          color: "#1e3a8a",
                          margin: "2px 0 0 0",
                          fontFamily: "var(--font-urdu)"
                        }}
                      >
                        {companyName}
                      </h1>
                      <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#059669", fontFamily: "var(--font-urdu)", marginTop: "2px" }}>
                        معیاری ماربل، گرینائٹ اور ٹائلز کا بااعتماد مرکز
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "#475569", marginTop: "3px" }}>
                        {address} | فون: {phone}
                      </div>
                    </div>

                    {/* Left: English Factory Name */}
                    <div dir="ltr" style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "#1e3a8a", fontFamily: "system-ui, sans-serif" }}>
                        {companyNameEn}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "#475569", marginTop: "2px", fontFamily: "system-ui, sans-serif" }}>
                        Faisalabad Road, Jhumra City
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "#475569", fontFamily: "system-ui, sans-serif" }}>
                        Ph: {phone}
                      </div>
                    </div>

                    {/* Report Meta Stamp */}
                    <div
                      style={{
                        textAlign: "center",
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        padding: "8px 14px",
                        borderRadius: "6px",
                        minWidth: "165px"
                      }}
                    >
                      <div style={{ fontSize: "0.78rem", color: "#1e3a8a", fontWeight: 800, fontFamily: "var(--font-urdu)" }}>
                        روزنامچہ و کیش کلوزنگ
                      </div>
                      <div className="font-mono" style={{ fontSize: "0.92rem", fontWeight: 900, color: "#0f172a", marginTop: "2px", direction: "ltr" }}>
                        ROZ-{targetDate?.replace(/-/g, '') || 'REPORT'}
                      </div>
                      <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#334155", marginTop: "3px" }}>
                        تاریخ: {dateFormatted}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>
                        وقت: {timeFormatted}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cash Inflow & Outflow Dual Summary Box (Pure Clean Urdu) */}
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
                    fontSize: "0.82rem"
                  }}
                >
                  {/* Right Column (in RTL): نقد آمد (+) */}
                  <div>
                    <div style={{ fontWeight: 800, color: "#059669", fontSize: "0.88rem", borderBottom: "1.5px solid #059669", paddingBottom: "4px", marginBottom: "8px", fontFamily: "var(--font-urdu)" }}>
                      ۱. کل نقد آمد (+)
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ color: "#475569" }}>صبح کا اوپننگ کیش:</span>
                      <strong className="font-mono" style={{ direction: "ltr" }}>Rs. {Number(openingCash).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ color: "#475569" }}>نقد بل سیلز ({todayInvoicesCount} بل):</span>
                      <strong className="font-mono" style={{ color: "#059669", direction: "ltr" }}>+ Rs. {Number(cashSalesToday).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ color: "#475569" }}>کھاتہ وصولی و ریکوری ({todayPaymentsCount} واؤچر):</span>
                      <strong className="font-mono" style={{ color: "#059669", direction: "ltr" }}>+ Rs. {Number(wasooliToday).toLocaleString()}</strong>
                    </div>
                    <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "5px", marginTop: "5px", display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                      <span style={{ color: "#059669" }}>میزان کل آمد:</span>
                      <span className="font-mono" style={{ color: "#059669", direction: "ltr" }}>Rs. {Number(totalCashInflow).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Left Column (in RTL): نقد اخراجات (-) */}
                  <div>
                    <div style={{ fontWeight: 800, color: "#dc2626", fontSize: "0.88rem", borderBottom: "1.5px solid #dc2626", paddingBottom: "4px", marginBottom: "8px", fontFamily: "var(--font-urdu)" }}>
                      ۲. کل نقد اخراجات (-)
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ color: "#475569" }}>روزانہ فیکٹری اخراجات ({todayExpensesCount} مدات):</span>
                      <strong className="font-mono" style={{ color: "#dc2626", direction: "ltr" }}>- Rs. {Number(expensesToday).toLocaleString()}</strong>
                    </div>
                    {supplierCashToday > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ color: "#475569" }}>سپلائر نقد ادائیگیاں:</span>
                        <strong className="font-mono" style={{ color: "#dc2626", direction: "ltr" }}>- Rs. {Number(supplierCashToday).toLocaleString()}</strong>
                      </div>
                    )}
                    {employeeAdvancesToday > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ color: "#475569" }}>ملازمین کیش ایڈوانس:</span>
                        <strong className="font-mono" style={{ color: "#dc2626", direction: "ltr" }}>- Rs. {Number(employeeAdvancesToday).toLocaleString()}</strong>
                      </div>
                    )}
                    <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "5px", marginTop: "5px", display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                      <span style={{ color: "#dc2626" }}>میزان کل اخراجات:</span>
                      <span className="font-mono" style={{ color: "#dc2626", direction: "ltr" }}>- Rs. {Number(totalCashOutflow).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Net Live Cash in Drawer Banner (Clean Urdu) */}
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
                    <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#065f46", fontFamily: "var(--font-urdu)" }}>
                      دراز میں موجود متوقع کل نقد رقم
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "#047857", marginTop: "2px" }}>
                      اوپننگ بیلنس (Rs. {Number(openingCash).toLocaleString()}) + کل آمد (Rs. {Number(totalCashInflow).toLocaleString()}) - کل اخراجات (Rs. {Number(totalCashOutflow).toLocaleString()})
                    </div>
                  </div>
                  <div className="font-mono" style={{ fontSize: "1.45rem", fontWeight: 900, color: "#065f46", direction: "ltr" }}>
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
                      gap: "12px",
                      flexWrap: "wrap",
                      fontSize: "0.76rem"
                    }}
                  >
                    <span style={{ fontWeight: 800, color: "#334155" }}>خلاصہ اخراجات:</span>
                    {Object.entries(categoryTotals).map(([cat, amt]) => (
                      <span key={cat} style={{ color: "#475569" }}>
                        {cat}: <strong className="font-mono" style={{ color: "#0f172a", direction: "ltr" }}>Rs.{Number(amt).toLocaleString()}</strong> |
                      </span>
                    ))}
                  </div>
                )}

                {/* Line Items Table (Clean Urdu Headers) */}
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.8rem",
                    marginBottom: "14px",
                    direction: "rtl"
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f1f5f9", borderTop: "2px solid #0f172a", borderBottom: "2px solid #0f172a" }}>
                      <th style={{ padding: "7px 8px", textAlign: "center", width: "36px", borderLeft: "1px solid #cbd5e1" }}>نمبر</th>
                      <th style={{ padding: "7px 8px", textAlign: "center", width: "70px", borderLeft: "1px solid #cbd5e1" }}>وقت</th>
                      <th style={{ padding: "7px 8px", textAlign: "right", width: "130px", borderLeft: "1px solid #cbd5e1" }}>شعبہ / مد خرچ</th>
                      <th style={{ padding: "7px 8px", textAlign: "right", width: "120px", borderLeft: "1px solid #cbd5e1" }}>کس کو ادا کیا</th>
                      <th style={{ padding: "7px 8px", textAlign: "right", borderLeft: "1px solid #cbd5e1" }}>تفصیل / وجہ خرچ</th>
                      <th style={{ padding: "7px 8px", textAlign: "center", width: "65px", borderLeft: "1px solid #cbd5e1" }}>طریقہ</th>
                      <th style={{ padding: "7px 8px", textAlign: "left", width: "105px" }}>رقم (روپے)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses && expenses.length > 0 ? (
                      expenses.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "6px 8px", textAlign: "center", borderLeft: "1px solid #cbd5e1" }}>{idx + 1}</td>
                          <td className="font-mono" style={{ padding: "6px 8px", textAlign: "center", borderLeft: "1px solid #cbd5e1", fontSize: "0.74rem", color: "#64748b", direction: "ltr" }}>
                            {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td style={{ padding: "6px 8px", fontWeight: 700, borderLeft: "1px solid #cbd5e1", color: "#1e3a8a" }}>
                            {item.category}
                          </td>
                          <td style={{ padding: "6px 8px", fontWeight: 600, borderLeft: "1px solid #cbd5e1", color: "#0f172a" }}>
                            {item.paidTo || "-"}
                          </td>
                          <td style={{ padding: "6px 8px", borderLeft: "1px solid #cbd5e1", color: "#475569", fontSize: "0.78rem" }}>
                            {item.remarks || "-"}
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "center", borderLeft: "1px solid #cbd5e1", fontSize: "0.74rem", color: "#475569" }}>
                            {item.paymentMethod === "Cash" ? "نقد" : (item.paymentMethod || "نقد")}
                          </td>
                          <td className="font-mono" style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, color: "#dc2626", direction: "ltr" }}>
                            Rs. {Number(item.amount || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ padding: "16px", textAlign: "center", color: "#64748b" }}>
                          اس تاریخ کے لیے کوئی خرچ ریکارڈ نہیں کیا گیا۔
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f8fafc", borderTop: "2px solid #0f172a", borderBottom: "2px solid #0f172a", fontWeight: 800 }}>
                      <td colSpan="6" style={{ padding: "8px", textAlign: "left", borderLeft: "1px solid #cbd5e1" }}>
                        میزان کل فیکٹری اخراجات:
                      </td>
                      <td className="font-mono" style={{ padding: "8px", textAlign: "left", color: "#dc2626", fontSize: "0.92rem", direction: "ltr" }}>
                        Rs. {Number(expensesToday).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Rules & Quick Settlement (Pure Urdu) */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "14px", alignItems: "start", marginBottom: "16px" }}>
                  <div
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      background: "#f8fafc",
                      fontSize: "0.74rem",
                      color: "#475569",
                      fontFamily: "var(--font-urdu)",
                      lineHeight: 1.7
                    }}
                  >
                    <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: "2px" }}>قواعد و شرائط روزنامچہ:</div>
                    <div>1. تمام اخراجات مجاز اتھارٹی کی پیشگی منظوری سے ادا کیے گئے ہیں۔</div>
                    <div>2. دراز میں موجود فزیکل کیش اور روزنامچہ رپورٹ کا یومیہ موازنہ لازمی ہے۔</div>
                    <div>3. بغیر تصدیق کے کوئی رقم دراز سے خارج تصور نہ ہوگی۔</div>
                  </div>

                  {/* Quick Audit Settlement Box */}
                  <div
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      background: "#ffffff",
                      fontSize: "0.8rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                      <span>اوپننگ بیلنس:</span>
                      <span className="font-mono" style={{ direction: "ltr" }}>Rs. {Number(openingCash).toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#059669" }}>
                      <span>کل آمد:</span>
                      <span className="font-mono" style={{ direction: "ltr" }}>+ Rs. {Number(totalCashInflow).toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#dc2626" }}>
                      <span>کل اخراجات:</span>
                      <span className="font-mono" style={{ direction: "ltr" }}>- Rs. {Number(totalCashOutflow).toLocaleString()}</span>
                    </div>
                    <div style={{ borderTop: "1px solid #0f172a", paddingTop: "5px", marginTop: "2px", display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "0.88rem", color: "#065f46" }}>
                      <span>نیٹ کیش دراز:</span>
                      <span className="font-mono" style={{ direction: "ltr" }}>Rs. {Number(liveCash).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Signatures Row */}
                <div style={{ marginTop: "34px", display: "flex", justifyContent: "space-between", fontSize: "0.78rem", padding: "0 20px" }}>
                  <div style={{ textAlign: "center", width: "160px" }}>
                    <div style={{ borderTop: "1.5px solid #0f172a", paddingTop: "5px", fontWeight: 800, color: "#0f172a", fontFamily: "var(--font-urdu)" }}>
                      دستخط منشی / کیشیئر
                    </div>
                  </div>

                  <div style={{ textAlign: "center", width: "160px" }}>
                    <div style={{ borderTop: "1.5px solid #0f172a", paddingTop: "5px", fontWeight: 800, color: "#0f172a", fontFamily: "var(--font-urdu)" }}>
                      دستخط مالک کارخانہ
                    </div>
                  </div>
                </div>

                {/* Footer Brand Line */}
                <div style={{ textAlign: "center", marginTop: "18px", borderTop: "1px solid #e2e8f0", paddingTop: "6px", fontSize: "0.7rem", color: "#94a3b8" }}>
                  {companyName} — ای آر پی سسٹم • جھمرہ سٹی
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
                  padding: "12px 10px",
                  borderRadius: "6px",
                  border: "1px dashed #cbd5e1",
                  fontFamily: "monospace",
                  fontSize: "11px",
                  width: "100%",
                  maxWidth: "340px",
                  margin: "0 auto",
                  lineHeight: 1.35,
                  boxSizing: "border-box"
                }}
              >
                {/* Thermal Header */}
                <div style={{ textAlign: "center", borderBottom: "1px dashed #000", paddingBottom: "6px", marginBottom: "6px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "bold", fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", serif' }}>{companyName}</div>
                  <div style={{ fontSize: "10px", fontWeight: "bold" }}>{companyNameEn}</div>
                  <div style={{ fontSize: "9px" }}>{address}</div>
                  <div style={{ fontSize: "9.5px" }}>Ph: {phone}</div>
                  <div style={{ fontSize: "11px", fontWeight: "bold", margin: "4px 0 2px 0", borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "2px 0" }}>
                    روزنامچہ کلوزنگ رپورٹ (80mm)
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginTop: "4px" }}>
                    <span>تاریخ: {dateFormatted}</span>
                    <span>وقت: {timeFormatted}</span>
                  </div>
                </div>

                {/* Thermal Inflow / Outflow Summary */}
                <div style={{ borderBottom: "1px dashed #000", paddingBottom: "6px", marginBottom: "6px" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "3px" }}>=== نقد آمد (+) ===</div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>اوپننگ کیش:</span>
                    <span>Rs. {Number(openingCash).toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>نقد بل سیلز ({todayInvoicesCount}):</span>
                    <span>+ Rs. {Number(cashSalesToday).toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>کھاتہ وصولی ({todayPaymentsCount}):</span>
                    <span>+ Rs. {Number(wasooliToday).toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", borderTop: "1px dotted #000", marginTop: "3px", paddingTop: "2px" }}>
                    <span>میزان کل آمد:</span>
                    <span>Rs. {Number(totalCashInflow).toLocaleString()}</span>
                  </div>
                </div>

                <div style={{ borderBottom: "1px dashed #000", paddingBottom: "6px", marginBottom: "6px" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "3px" }}>=== نقد اخراجات (-) ===</div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>روزانہ اخراجات ({todayExpensesCount}):</span>
                    <span>- Rs. {Number(expensesToday).toLocaleString()}</span>
                  </div>
                  {supplierCashToday > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>سپلائر ادائیگیاں:</span>
                      <span>- Rs. {Number(supplierCashToday).toLocaleString()}</span>
                    </div>
                  )}
                  {employeeAdvancesToday > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>ملازمین ایڈوانس:</span>
                      <span>- Rs. {Number(employeeAdvancesToday).toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", borderTop: "1px dotted #000", marginTop: "3px", paddingTop: "2px" }}>
                    <span>میزان کل اخراجات:</span>
                    <span>- Rs. {Number(totalCashOutflow).toLocaleString()}</span>
                  </div>
                </div>

                {/* Expected Net Drawer Cash */}
                <div style={{ border: "1px solid #000", padding: "6px", textAlign: "center", marginBottom: "8px", background: "#f8f8f8" }}>
                  <div style={{ fontSize: "10px", fontWeight: "bold" }}>دراز میں متوقع کل نقد رقم</div>
                  <div style={{ fontSize: "15px", fontWeight: "bold", marginTop: "2px" }}>
                    Rs. {Number(liveCash).toLocaleString()}
                  </div>
                </div>

                {/* Itemized Expenses List */}
                {expenses && expenses.length > 0 && (
                  <div style={{ borderBottom: "1px dashed #000", paddingBottom: "6px", marginBottom: "8px" }}>
                    <div style={{ fontWeight: "bold", marginBottom: "4px" }}>تفصیل اخراجات:</div>
                    {expenses.map((exp, idx) => (
                      <div key={idx} style={{ marginBottom: "3px", fontSize: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>{idx + 1}. {exp.category}</span>
                          <span style={{ fontWeight: "bold" }}>Rs. {Number(exp.amount).toLocaleString()}</span>
                        </div>
                        {(exp.paidTo || exp.remarks) && (
                          <div style={{ color: "#444", fontSize: "9px", paddingLeft: "8px" }}>
                            {exp.paidTo ? `بنام: ${exp.paidTo}` : ''} {exp.remarks ? `(${exp.remarks})` : ''}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Signatures */}
                <div style={{ marginTop: "18px", display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ borderTop: "1px solid #000", width: "80px", paddingTop: "2px" }}>دستخط منشی</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ borderTop: "1px solid #000", width: "80px", paddingTop: "2px" }}>دستخط مالک</div>
                  </div>
                </div>

                <div style={{ textAlign: "center", fontSize: "9px", marginTop: "10px", borderTop: "1px dotted #888", paddingTop: "4px" }}>
                  ماربل فیکٹری سسٹم • جھمرہ سٹی
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

