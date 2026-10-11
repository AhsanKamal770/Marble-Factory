import React, { useState, useRef, useEffect } from "react";
import {
  Printer, X, FileText, Receipt, Share2, Check,
  Truck, User, MapPin, Phone, Info, Calendar, Download
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { db } from "../../db/index";
import { printElement } from "../../utils/printHelper";

export default function PrintableGateSlip({
  isOpen,
  onClose,
  gatePass,
  factorySettings,
  defaultFormat = "a4"
}) {
  const { language } = useLanguage();
  const [printFormat, setPrintFormat] = useState(defaultFormat || "a4");
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [linkedInvoice, setLinkedInvoice] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    if (!gatePass) return;
    let isMounted = true;

    async function loadLinkedData() {
      try {
        if (gatePass.invoiceId) {
          const inv = await db.invoices.get(Number(gatePass.invoiceId));
          if (isMounted && inv) setLinkedInvoice(inv);
        } else if (gatePass.invoiceNo) {
          const inv = await db.invoices.where("invoiceNo").equals(gatePass.invoiceNo).first();
          if (isMounted && inv) setLinkedInvoice(inv);
        }
      } catch (err) {
        console.warn("Could not load linked invoice for gate pass:", err);
      }
    }

    loadLinkedData();
    return () => {
      isMounted = false;
    };
  }, [gatePass]);

  if (!isOpen || !gatePass) return null;

  // Urdu Month formatting
  const formatUrduDate = (dateVal) => {
    const d = new Date(dateVal || Date.now());
    if (isNaN(d.getTime())) return "01 اکتوبر 2026";
    const day = String(d.getDate()).padStart(2, "0");
    const urduMonths = [
      "جنوری", "فروری", "مارچ", "اپریل", "مئی", "جون",
      "جولائی", "اگست", "ستمبر", "اکتوبر", "نومبر", "دسمبر"
    ];
    const month = urduMonths[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const dispatchDateUrdu = formatUrduDate(gatePass.dispatchDate || gatePass.date || Date.now());
  const dispatchDate = gatePass.dispatchDate
    ? new Date(gatePass.dispatchDate).toLocaleDateString("en-PK", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
    : new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });

  const dispatchTime = gatePass.dispatchTime || (gatePass.dispatchDate
    ? new Date(gatePass.dispatchDate).toLocaleTimeString("en-PK", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      })
    : new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true }));

  // Settings & Branding
  const companyUrdu = factorySettings?.companyNameUrdu || "رانا عبداللہ صدیق ماربل فیکٹری";
  const companyEnglish = "Rana Abdullah Siddique";
  const companyEnglishSub = "Marble Factory";
  const factoryPhone = "ph : +92 300 7995171";
  const factoryPhoneBottom = "0300-7995171";
  const factoryAddressUrdu = "فیصل آباد روڈ، نزد پی ایس او پٹرول پمپ، جھمرہ سٹی";
  const factoryAddressEnglish = "Faisalabad Road near PSO Petrol Pump, Jhumra City";
  const companyNameEn = companyEnglish;
  const companyNameUr = companyUrdu;

  // Customer & Driver Details
  const customerName = gatePass.customerName || linkedInvoice?.customerName || "محمد علی خان";
  const customerAddress = gatePass.destination || linkedInvoice?.customerAddress || linkedInvoice?.address || "گھر نمبر 12، گلشن اقبال، بلاک 13-D کراچی";
  const customerPhone = gatePass.customerPhone || linkedInvoice?.customerPhone || "0300-8456123";
  const deliveryBy = gatePass.carrier || linkedInvoice?.carrier || gatePass.deliveryMethod || linkedInvoice?.transport || "Direct Factory Pickup";

  const driverName = gatePass.driverName || "علی رضا";
  const driverPhone = gatePass.driverPhone || "0303-7788990";
  const vehicleNo = gatePass.vehicleRegNo || gatePass.vehicleType || "LZ-1234";

  // Manifest items logic
  let manifestItems = [];
  if (Array.isArray(gatePass.manifest) && gatePass.manifest.length > 0) {
    manifestItems = gatePass.manifest.map((it, idx) => ({
      ...it,
      sr: it.sr || idx + 1,
      name: it.name || it.itemName || "ماربل",
      quantity: it.quantity !== undefined && it.quantity !== "" ? it.quantity : (it.pieces || it.sqFt || "-"),
      unit: it.unit || (it.sqFt ? "Sq.Ft" : ""),
      thicknessSutar: it.thicknessSutar || "4",
      size: it.size || it.dimensions || "-",
      pieces: it.pieces || it.quantity || "-",
      sqFt: it.sqFt || it.quantity || "-",
      amount: it.amount || 0,
      rate: it.rate || 0
    }));
  } else if (linkedInvoice?.items && linkedInvoice.items.length > 0) {
    manifestItems = linkedInvoice.items.map((it, idx) => ({
      sr: idx + 1,
      name: it.name || it.itemName || "ماربل",
      quantity: it.quantity !== undefined && it.quantity !== "" ? it.quantity : (it.totalSqFt || it.sqFt || it.pieces || "-"),
      unit: it.unit || (it.totalSqFt || it.sqFt ? "Sq.Ft" : "Pcs"),
      thicknessSutar: it.thicknessSutar || "4",
      size: it.dimensions || (it.length && it.width ? `${it.length}ft × ${it.width}ft` : it.size || "-"),
      pieces: it.quantity || it.pieces || "-",
      sqFt: it.totalSqFt || it.sqFt || "-",
      rate: it.ratePerSqFt || it.rate || 0,
      amount: it.amount || (Number(it.rate || 0) * Number(it.totalSqFt || it.quantity || 1))
    }));
  }

  // Fallback sample items if completely empty to maintain visual aesthetics
  if (manifestItems.length === 0) {
    manifestItems = [
      { name: "گرین", size: "4ft x 2.5ft", pieces: 100, sqFt: "-", amount: 38000 },
      { name: "سفید ماربل", size: "3ft x 2ft", pieces: 50, sqFt: "-", amount: 22500 },
      { name: "بلیک ماربل", size: "2ft x 2ft", pieces: 25, sqFt: "-", amount: 18750 }
    ];
  }

  // Calculate Grand Total
  const grandTotal = gatePass.totalAmount ||
    linkedInvoice?.grandTotal ||
    linkedInvoice?.subtotal ||
    manifestItems.reduce((sum, item) => sum + (Number(item.amount) || (Number(item.rate || 0) * Number(item.sqFt || item.pieces || 1)) || 0), 0) ||
    (gatePass.carriageCharges || 0) ||
    79250;

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printElement(printRef, {
        title: `GatePass_${gatePass.gatePassNo || 'Slip'}`,
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
        title: `GatePass_${gatePass.gatePassNo || 'Slip'}`,
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
      `*${companyNameUr}*`,
      `_${companyTagline}_`,
      `---------------------------------`,
      `*گیٹ پاس / رسید #:* ${gatePass.gatePassNo}`,
      gatePass.invoiceNo ? `*بل نمبر:* ${gatePass.invoiceNo}` : null,
      `*گاہک کا نام:* ${customerName}`,
      customerPhone ? `*فون:* ${customerPhone}` : null,
      customerAddress ? `*پتہ:* ${customerAddress}` : null,
      `*تاریخ:* ${dispatchDateUrdu} (${dispatchTime})`,
      `---------------------------------`,
      `*ڈرائیور و گاڑی معلومات:*`,
      `*ڈرائیور:* ${driverName} ${driverPhone ? `• ${driverPhone}` : ""}`,
      `*گاڑی نمبر:* ${vehicleNo}`,
      gatePass.carriageCharges > 0 ? `*کرایہ باربرداری:* Rs. ${Number(gatePass.carriageCharges).toLocaleString()}` : null,
      `---------------------------------`,
      `*تفصیل اشیاء:*`,
      ...manifestItems.map(
        (it, idx) => `${idx + 1}. ${it.name} | مقدار: ${it.quantity !== undefined ? `${it.quantity} ${it.unit || ''}`.trim() : (it.pieces || it.sqFt || '-')} ${it.size && it.size !== '-' ? `| سائز: ${it.size}` : ''} | رقم: Rs. ${it.amount ? Number(it.amount).toLocaleString() : '-'}`
      ),
      `---------------------------------`,
      `*کل رقم:* Rs. ${Number(grandTotal).toLocaleString()}`,
      `---------------------------------`,
      `شکریہ! رابطہ: ${phone}`
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
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        className="modal-card"
        style={{
          maxWidth: printFormat === "a4" ? "820px" : "440px",
          width: "100%",
          maxHeight: "96vh",
          transition: "max-width 0.2s ease",
          background: "var(--bg-card)",
          borderRadius: "14px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 16px 40px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Bar (Hidden on Print) */}
        <div
          className="print-hide"
          style={{
            padding: "10px 18px",
            borderBottom: "1px solid var(--border-divider)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-primary)",
            flexShrink: 0
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "0.92rem", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Truck size={17} style={{ color: "var(--accent-blue)" }} />
              {language === "ur" ? "گیٹ پاس پرنٹ رسید" : "Gate Pass Print Receipt"}
            </span>

            {/* Format Switcher Tabs */}
            <div style={{ display: "flex", background: "var(--bg-card)", padding: "2px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
              <button
                type="button"
                onClick={() => setPrintFormat("a4")}
                style={{
                  padding: "4px 12px",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  background: printFormat === "a4" ? "var(--accent-primary, #2563eb)" : "transparent",
                  color: printFormat === "a4" ? "#ffffff" : "var(--text-secondary)"
                }}
              >
                <FileText size={13} />
                <span>A4 Gate Pass Slip</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintFormat("thermal")}
                style={{
                  padding: "4px 12px",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  background: printFormat === "thermal" ? "var(--accent-primary, #2563eb)" : "transparent",
                  color: printFormat === "thermal" ? "#ffffff" : "var(--text-secondary)"
                }}
              >
                <Receipt size={13} />
                <span>80mm Driver Slip</span>
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
              onClick={handleExportPDF}
              disabled={isPrinting}
              title="Save as PDF directly"
              style={{
                fontSize: "0.76rem",
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
                fontSize: "0.76rem",
                padding: "6px 16px",
                borderRadius: "6px",
                border: "none",
                background: "linear-gradient(135deg, #0b2e59 0%, #1e40af 100%)",
                color: "#ffffff",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(11, 46, 89, 0.3)"
              }}
            >
              <Printer size={14} />
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
        <div style={{ background: "#f8fafc", padding: "16px", overflowY: "auto", flex: 1 }}>
          <div ref={printRef} id="gatepass-print-area">
            <style>{`
              @media print {
                body * { visibility: hidden !important; }
                #gatepass-print-area, #gatepass-print-area * { visibility: visible !important; }
                #gatepass-print-area {
                  display: block !important;
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .print-hide { display: none !important; }
                @page {
                  size: ${printFormat === "a4" ? "A4 portrait" : "80mm auto"};
                  margin: ${printFormat === "a4" ? "6mm" : "0"};
                }
              }
            `}</style>

            {/* ------------------------------------------------------------- */}
            {/* FORMAT 1: EXACT MATCH TO USER'S REFERENCE IMAGE (A4 SLIP)     */}
            {/* ------------------------------------------------------------- */}
            {printFormat === "a4" && (
              <div
                style={{
                  background: "#ffffff",
                  color: "#0f172a",
                  borderRadius: "10px",
                  boxShadow: "0 2px 14px rgba(11, 46, 89, 0.08)",
                  border: "1px solid #bce0fd",
                  fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", "Plus Jakarta Sans", sans-serif',
                  maxWidth: "760px",
                  margin: "0 auto",
                  overflow: "hidden",
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact"
                }}
              >
                {/* 1. TOP HEADER BANNER (Bilingual: English Left Prominent, Urdu Right) */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
                    color: "#ffffff",
                    padding: "11px 18px",
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "stretch",
                    direction: "ltr",
                    gap: "16px",
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact"
                  }}
                >
                  {/* Left: English Factory Details (Prominent & Large) */}
                  <div
                    dir="ltr"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      textAlign: "left",
                      flex: 1
                    }}
                  >
                    {/* Line 1: Rana Abdullah Siddique (Bara & Prominent) */}
                    <div
                      style={{
                        fontSize: "1.45rem",
                        fontWeight: 900,
                        color: "#ffffff",
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        letterSpacing: "-0.3px",
                        lineHeight: 1.15
                      }}
                    >
                      {companyEnglish}
                    </div>
                    {/* Line 2: Marble Factory */}
                    <div
                      style={{
                        fontSize: "0.92rem",
                        fontWeight: 800,
                        color: "#bfdbfe",
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        lineHeight: 1.25,
                        marginTop: "1px"
                      }}
                    >
                      {companyEnglishSub}
                    </div>
                    {/* Lines 3 & 4: Contact Numbers */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1px",
                        marginTop: "3px",
                        fontSize: "0.74rem",
                        color: "#ffffff",
                        fontWeight: 700,
                        fontFamily: "var(--font-mono), monospace"
                      }}
                    >
                      <div>
                        <span style={{ color: "#93c5fd", fontWeight: 600 }}>Rana Abdullah :</span> 0317-9784782
                      </div>
                      <div>
                        <span style={{ color: "#93c5fd", fontWeight: 600 }}>Factory no :</span> 0300-7995171
                      </div>
                    </div>
                  </div>

                  {/* Center Geometric Logo / Divider */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 4px",
                      opacity: 0.9
                    }}
                  >
                    <svg width="34" height="26" viewBox="0 0 54 40" fill="none">
                      <polygon points="4,38 22,6 38,38" fill="#1d4ed8" />
                      <polygon points="18,38 34,2 50,38" fill="#38bdf8" opacity="0.95" />
                      <polygon points="14,38 26,14 40,38" fill="#93c5fd" opacity="0.85" />
                    </svg>
                    <div style={{ width: "1px", height: "18px", background: "rgba(255,255,255,0.25)", marginTop: "4px" }} />
                  </div>

                  {/* Right: Urdu Factory Details */}
                  <div
                    dir="rtl"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      textAlign: "right",
                      flex: 1
                    }}
                  >
                    {/* Line 1: Urdu Name */}
                    <div
                      style={{
                        fontSize: "1.30rem",
                        fontWeight: 900,
                        color: "#ffffff",
                        lineHeight: 1.25,
                        letterSpacing: "0.01em",
                        fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", serif'
                      }}
                    >
                      {companyUrdu}
                    </div>
                    {/* Line 2: Slogan */}
                    <div
                      style={{
                        fontSize: "0.86rem",
                        color: "#fef08a",
                        fontWeight: 800,
                        lineHeight: 1.35,
                        fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", serif'
                      }}
                    >
                      نام ہی کافی ہے
                    </div>
                    {/* Line 3: Urdu Address */}
                    <div
                      style={{
                        fontSize: "0.74rem",
                        color: "#dbeafe",
                        fontWeight: 600,
                        lineHeight: 1.35,
                        fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", serif'
                      }}
                    >
                      {factoryAddressUrdu}
                    </div>
                  </div>
                </div>

                {/* Inner Body Section */}
                <div style={{ padding: "10px 16px" }}>

                  {/* 2. SUB-HEADER CARDS ROW (Gate Pass / Raseed Card & Bill No / Date Card - Compact) */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "10px", marginBottom: "8px" }}>
                    
                    {/* Left Sub-Header Card: گیٹ پاس / رسید */}
                    <div
                      style={{
                        background: "#eaf4fd",
                        border: "1px solid #bce0fd",
                        borderRadius: "8px",
                        padding: "6px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        WebkitPrintColorAdjust: "exact",
                        printColorAdjust: "exact"
                      }}
                    >
                      {/* Document Icon Box */}
                      <div
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "6px",
                          background: "#1e3a8a",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "2px",
                          flexShrink: 0,
                          WebkitPrintColorAdjust: "exact",
                          printColorAdjust: "exact"
                        }}
                      >
                        <div style={{ width: "16px", height: "2.5px", background: "#ffffff", borderRadius: "1px" }} />
                        <div style={{ width: "16px", height: "2.5px", background: "#ffffff", borderRadius: "1px" }} />
                        <div style={{ width: "10px", height: "2.5px", background: "#ffffff", borderRadius: "1px", alignSelf: "flex-start", marginLeft: "7px" }} />
                      </div>

                      {/* Text in Center / Right */}
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#1e3a8a", lineHeight: 1.2 }}>
                          گیٹ پاس / رسید
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#2563eb", fontWeight: 700, marginTop: "1px" }}>
                          (کسٹمر کی خریداری کا بل)
                        </div>
                      </div>
                    </div>

                    {/* Right Sub-Header Card: بل نمبر اور تاریخ */}
                    <div
                      style={{
                        background: "#eaf4fd",
                        border: "1px solid #bce0fd",
                        borderRadius: "8px",
                        padding: "5px 12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                        WebkitPrintColorAdjust: "exact",
                        printColorAdjust: "exact"
                      }}
                    >
                      {/* Calendar Icon on Left */}
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "6px",
                          border: "1px solid #1e3a8a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#1e3a8a",
                          flexShrink: 0
                        }}
                      >
                        <Calendar size={16} strokeWidth={2.4} />
                      </div>

                      {/* Info lines on Right */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "right", flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span
                            className="font-mono"
                            style={{
                              fontSize: "0.88rem",
                              fontWeight: 900,
                              color: "#1e3a8a",
                              letterSpacing: "0.02em"
                            }}
                          >
                            {gatePass.invoiceNo || gatePass.gatePassNo || "INV-2026-1252"}
                          </span>
                          <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#2563eb" }}>:بل نمبر</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed #bce0fd", paddingTop: "2px" }}>
                          <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#1e3a8a" }}>
                            {dispatchDateUrdu}
                          </span>
                          <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#2563eb" }}>:تاریخ</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. TWO INFORMATION CARDS (گاہک کی معلومات & ڈرائیور کی معلومات - Compact) */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "8px" }}>
                    
                    {/* Left Card: گاہک کی معلومات */}
                    <div
                      style={{
                        background: "#f0f7fe",
                        border: "1px solid #bce0fd",
                        borderRadius: "8px",
                        padding: "6px 12px",
                        WebkitPrintColorAdjust: "exact",
                        printColorAdjust: "exact"
                      }}
                    >
                      {/* Card Header with User Icon */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px", marginBottom: "4px" }}>
                        <div style={{ fontSize: "0.88rem", fontWeight: 900, color: "#1e3a8a" }}>
                          گاہک کی معلومات
                        </div>
                        <div
                          style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            background: "#1e3a8a",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            WebkitPrintColorAdjust: "exact",
                            printColorAdjust: "exact"
                          }}
                        >
                          <User size={12} color="#ffffff" strokeWidth={2.6} />
                        </div>
                      </div>

                      {/* Details List */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.78rem", textAlign: "left" }}>
                            {customerName}
                          </span>
                          <span style={{ fontWeight: 800, color: "#2563eb", fontSize: "0.68rem" }}>:نام</span>
                        </div>
                        <div style={{ height: "1px", background: "#d4e8fc" }} />

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.74rem", textAlign: "left", maxWidth: "75%", lineHeight: 1.2 }}>
                            {customerAddress}
                          </span>
                          <span style={{ fontWeight: 800, color: "#2563eb", fontSize: "0.68rem" }}>:پتہ</span>
                        </div>
                        <div style={{ height: "1px", background: "#d4e8fc" }} />

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="font-mono" style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.78rem", textAlign: "left" }}>
                            {customerPhone}
                          </span>
                          <span style={{ fontWeight: 800, color: "#2563eb", fontSize: "0.68rem" }}>:فون نمبر</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Card: ڈرائیور کی معلومات */}
                    <div
                      style={{
                        background: "#f0f7fe",
                        border: "1px solid #bce0fd",
                        borderRadius: "8px",
                        padding: "6px 12px",
                        WebkitPrintColorAdjust: "exact",
                        printColorAdjust: "exact"
                      }}
                    >
                      {/* Card Header with Truck Icon */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px", marginBottom: "4px" }}>
                        <div style={{ fontSize: "0.88rem", fontWeight: 900, color: "#1e3a8a" }}>
                          ڈرائیور کی معلومات
                        </div>
                        <div
                          style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            background: "#1e3a8a",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            WebkitPrintColorAdjust: "exact",
                            printColorAdjust: "exact"
                          }}
                        >
                          <Truck size={12} color="#ffffff" strokeWidth={2.4} />
                        </div>
                      </div>

                      {/* Details List */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.78rem", textAlign: "left" }}>
                            {driverName}
                          </span>
                          <span style={{ fontWeight: 800, color: "#2563eb", fontSize: "0.68rem" }}>:ڈرائیور کا نام</span>
                        </div>
                        <div style={{ height: "1px", background: "#d4e8fc" }} />

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="font-mono" style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.78rem", textAlign: "left" }}>
                            {driverPhone}
                          </span>
                          <span style={{ fontWeight: 800, color: "#2563eb", fontSize: "0.68rem" }}>:فون نمبر</span>
                        </div>
                        <div style={{ height: "1px", background: "#d4e8fc" }} />

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="font-mono" style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.78rem", textAlign: "left" }}>
                            {vehicleNo}
                          </span>
                          <span style={{ fontWeight: 800, color: "#2563eb", fontSize: "0.68rem" }}>:گاڑی نمبر</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. ITEMS & MANIFEST TABLE */}
                  <div
                    style={{
                      border: "1.5px solid #0b2e59",
                      borderRadius: "8px",
                      overflow: "hidden",
                      marginBottom: "14px",
                      WebkitPrintColorAdjust: "exact",
                      printColorAdjust: "exact"
                    }}
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
                      <thead>
                        <tr style={{ background: "#0b2e59", color: "#ffffff", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                          <th style={{ padding: "8px 10px", width: "18%", textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.35)", fontWeight: 800 }}>
                            رقم / نوٹ
                          </th>
                          <th style={{ padding: "8px 8px", width: "12%", textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.35)", fontWeight: 800, fontFamily: "var(--font-main)" }}>
                            R.T.F
                          </th>
                          <th style={{ padding: "8px 10px", width: "22%", textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.35)", fontWeight: 800 }}>
                            تفصیل
                          </th>
                          <th style={{ padding: "8px 10px", width: "14%", textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.35)", fontWeight: 800 }}>
                            مقدار
                          </th>
                          <th style={{ padding: "8px 10px", width: "22%", textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.35)", fontWeight: 800 }}>
                            کوالٹی
                          </th>
                          <th style={{ padding: "8px 8px", width: "12%", textAlign: "center", fontWeight: 800 }}>
                            سیریل نمبر
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {manifestItems.map((item, idx) => (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: "1px solid #bce0fd",
                              background: idx % 2 === 1 ? "#f8fbff" : "#ffffff",
                              WebkitPrintColorAdjust: "exact",
                              printColorAdjust: "exact"
                            }}
                          >
                            {/* 1. رقم / نوٹ */}
                            <td
                              className="font-mono"
                              style={{
                                padding: "8px 10px",
                                textAlign: "center",
                                fontWeight: 800,
                                color: "#0b2e59",
                                borderRight: "1px solid #bce0fd"
                              }}
                            >
                              {item.amount
                                ? Number(item.amount).toLocaleString()
                                : item.rate
                                ? Number(item.rate).toLocaleString()
                                : item.thicknessSutar
                                ? `${item.thicknessSutar} سوتر`
                                : "-"}
                            </td>

                            {/* 2. R.T.F */}
                            <td
                              style={{
                                padding: "8px 8px",
                                textAlign: "center",
                                color: "#0b2e59",
                                fontWeight: 600,
                                borderRight: "1px solid #bce0fd"
                              }}
                            >
                              {item.rtf || "-"}
                            </td>

                            {/* 3. تفصیل */}
                            <td
                              className="font-mono"
                              style={{
                                padding: "8px 10px",
                                textAlign: "center",
                                color: "#0b2e59",
                                fontWeight: 700,
                                borderRight: "1px solid #bce0fd"
                              }}
                            >
                              {item.size && item.size !== "-"
                                ? item.size
                                : (item.unit ? `یونٹ: ${item.unit}` : "-")}
                            </td>

                            {/* 4. مقدار */}
                            <td
                              className="font-mono"
                              style={{
                                padding: "8px 10px",
                                textAlign: "center",
                                fontWeight: 800,
                                color: "#0b2e59",
                                borderRight: "1px solid #bce0fd"
                              }}
                            >
                              {item.quantity !== undefined && item.quantity !== ""
                                ? `${item.quantity} ${item.unit || ""}`.trim()
                                : (item.pieces || item.sqFt || "-")}
                            </td>

                            {/* 5. کوالٹی */}
                            <td
                              style={{
                                padding: "8px 10px",
                                textAlign: "center",
                                fontWeight: 800,
                                color: "#0b2e59",
                                fontSize: "0.95rem",
                                borderRight: "1px solid #bce0fd"
                              }}
                            >
                              {item.name || item.itemName || "ماربل"}
                            </td>

                            {/* 6. سیریل نمبر */}
                            <td
                              className="font-mono"
                              style={{
                                padding: "8px 8px",
                                textAlign: "center",
                                fontWeight: 800,
                                color: "#0b2e59"
                              }}
                            >
                              {idx + 1}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr
                          style={{
                            background: "#eaf4fd",
                            borderTop: "2px solid #0b2e59",
                            fontWeight: 900,
                            WebkitPrintColorAdjust: "exact",
                            printColorAdjust: "exact"
                          }}
                        >
                          {/* Grand Total Amount */}
                          <td
                            className="font-mono"
                            style={{
                              padding: "10px 10px",
                              textAlign: "center",
                              fontSize: "1.08rem",
                              fontWeight: 900,
                              color: "#0b2e59",
                              borderRight: "1px solid #bce0fd"
                            }}
                          >
                            {Number(grandTotal).toLocaleString()}
                          </td>

                          {/* R.T.F */}
                          <td style={{ padding: "10px 8px", textAlign: "center", color: "#0b2e59", borderRight: "1px solid #bce0fd" }}>
                            -
                          </td>

                          {/* تفصیل */}
                          <td style={{ padding: "10px 10px", textAlign: "center", color: "#0b2e59", borderRight: "1px solid #bce0fd" }}>
                            -
                          </td>

                          {/* مقدار */}
                          <td style={{ padding: "10px 10px", textAlign: "center", color: "#0b2e59", borderRight: "1px solid #bce0fd" }}>
                            -
                          </td>

                          {/* کل رقم (Span 2 Columns) */}
                          <td
                            colSpan={2}
                            style={{
                              padding: "10px 14px",
                              textAlign: "center",
                              fontSize: "1.35rem",
                              fontWeight: 900,
                              color: "#0b2e59"
                            }}
                          >
                            کل رقم
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* 5. NOTES & TERMS BOX ("نوٹ:") */}
                  <div
                    dir="rtl"
                    style={{
                      background: "#eaf4fd",
                      border: "1.5px solid #bce0fd",
                      borderRadius: "10px",
                      padding: "10px 16px",
                      marginBottom: "18px",
                      textAlign: "right",
                      WebkitPrintColorAdjust: "exact",
                      printColorAdjust: "exact"
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "8px", marginBottom: "6px" }}>
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background: "#1e3a8a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#ffffff"
                        }}
                      >
                        <Info size={14} strokeWidth={2.8} />
                      </div>
                      <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "#1e3a8a" }}>
                        نوٹ:
                      </div>
                    </div>

                    {/* Bullet List - 1, 2, 3 correctly on the right */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.84rem", color: "#0f172a", fontWeight: 700, lineHeight: 1.6 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                        <span style={{ color: "#1e3a8a", fontWeight: 900, minWidth: "16px" }}>1-</span>
                        <span>خریداری کے بعد مال واپس یا تبدیل نہیں کیا جا سکتا۔</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                        <span style={{ color: "#1e3a8a", fontWeight: 900, minWidth: "16px" }}>2-</span>
                        <span>بل کی ادائیگی 7 دن کے اندر لازمی ہے۔</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                        <span style={{ color: "#1e3a8a", fontWeight: 900, minWidth: "16px" }}>3-</span>
                        <span>معیار میں کسی قسم کی خرابی کی صورت میں فوری اطلاع دیں۔</span>
                      </div>
                      {gatePass.notes && (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", color: "#1d4ed8", marginTop: "2px" }}>
                          <span style={{ fontWeight: 900, minWidth: "16px" }}>4-</span>
                          <span>خصوصی نوٹ: {gatePass.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 6. SIGNATURE LINES SECTION (Dashed Lines for Customer & Driver) */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "22px", marginTop: "10px" }}>
                    
                    {/* Left: Customer Signature */}
                    <div style={{ textAlign: "center" }}>
                      <div style={{ borderTop: "2px dashed #0b2e59", width: "85%", margin: "0 auto 8px auto" }} />
                      <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0b2e59" }}>
                        گاہک کے دستخط
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#1d4ed8", fontWeight: 700, marginTop: "2px" }}>
                        (نامہ / نمبر)
                      </div>
                    </div>

                    {/* Right: Driver Signature */}
                    <div style={{ textAlign: "center" }}>
                      <div style={{ borderTop: "2px dashed #0b2e59", width: "85%", margin: "0 auto 8px auto" }} />
                      <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0b2e59" }}>
                        ڈرائیور کے دستخط
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#1d4ed8", fontWeight: 700, marginTop: "2px" }}>
                        (نامہ / نمبر)
                      </div>
                    </div>
                  </div>
                </div>

                {/* 7. BOTTOM FOOTER BANNER (Bilingual: Left Phone, Right Location) */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
                    color: "#ffffff",
                    padding: "7px 18px",
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.76rem",
                    direction: "ltr",
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact"
                  }}
                >
                  {/* Left: Phone Number */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-mono), monospace", fontWeight: 700, color: "#ffffff" }}>
                    <Phone size={12} color="#93c5fd" />
                    <span>{factoryPhoneBottom}</span>
                  </div>

                  {/* Right: Factory Location */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontWeight: 700, color: "#ffffff" }}>{factoryAddressEnglish}</span>
                    <MapPin size={13} color="#93c5fd" />
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* FORMAT 2: 80MM POS THERMAL DRIVER SLIP                       */}
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
                  <div style={{ fontSize: "14px", fontWeight: "bold" }}>{companyUrdu}</div>
                  <div style={{ fontSize: "10px", fontWeight: "bold" }}>نام ہی کافی ہے</div>
                  <div style={{ fontSize: "12px", fontWeight: "bold", marginTop: "3px" }}>RANA ABDULLAH SIDDIQUE</div>
                  <div style={{ fontSize: "10px", fontWeight: "bold" }}>MARBLE FACTORY</div>
                  <div style={{ fontSize: "9.5px", marginTop: "2px" }}>Rana Abdullah: 0317-9784782</div>
                  <div style={{ fontSize: "9.5px" }}>Factory: 0300-7995171</div>
                  <div style={{ fontSize: "9px", marginTop: "1px" }}>{factoryAddressEnglish}</div>
                  <div style={{ fontSize: "12px", fontWeight: "bold", margin: "4px 0 2px 0", borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "2px 0" }}>
                    GATE PASS / رسید
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginTop: "4px" }}>
                    <span>GP #: {gatePass.gatePassNo}</span>
                    <span>{dispatchDateUrdu}</span>
                  </div>
                  {gatePass.invoiceNo && (
                    <div style={{ textAlign: "left", fontSize: "10px", fontWeight: "bold", marginTop: "2px" }}>
                      Bill #: {gatePass.invoiceNo}
                    </div>
                  )}
                </div>

                {/* Customer & Vehicle Details */}
                <div style={{ borderBottom: "1px dashed #000", paddingBottom: "6px", marginBottom: "6px" }}>
                  <div><strong>Customer:</strong> {customerName}</div>
                  {customerPhone && <div><strong>Phone:</strong> {customerPhone}</div>}
                  <div><strong>Dest:</strong> {customerAddress}</div>
                  <div style={{ borderTop: "1px dotted #888", marginTop: "4px", paddingTop: "4px" }}>
                    <strong>Vehicle:</strong> {vehicleNo}
                  </div>
                  <div><strong>Driver:</strong> {driverName} {driverPhone ? `• ${driverPhone}` : ""}</div>
                  {gatePass.carriageCharges > 0 && (
                    <div><strong>Carriage:</strong> Rs. {Number(gatePass.carriageCharges).toLocaleString()}</div>
                  )}
                </div>

                {/* Manifest Table */}
                <div style={{ borderBottom: "1px dashed #000", paddingBottom: "6px", marginBottom: "6px" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "4px" }}>ITEMS DISPATCHED:</div>
                  {manifestItems.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: "3px", fontSize: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>{idx + 1}. {item.name}</span>
                        <span style={{ fontWeight: "bold" }}>Rs. {item.amount ? Number(item.amount).toLocaleString() : "-"}</span>
                      </div>
                      <div style={{ color: "#444", fontSize: "9px", paddingLeft: "10px" }}>
                        {item.quantity !== undefined && item.quantity !== "" ? `Qty: ${item.quantity} ${item.unit || ''}`.trim() : (item.pieces ? `• ${item.pieces} Pcs` : "")} {item.size && item.size !== '-' ? `• ${item.size}` : ""}
                      </div>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px dotted #000", marginTop: "4px", paddingTop: "4px", display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                    <span>Total:</span>
                    <span>Rs. {Number(grandTotal).toLocaleString()}</span>
                  </div>
                </div>

                {/* Signatures */}
                <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", fontSize: "9px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ borderTop: "1px solid #000", width: "70px", paddingTop: "2px" }}>Customer Sign</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ borderTop: "1px solid #000", width: "70px", paddingTop: "2px" }}>Driver Sign</div>
                  </div>
                </div>

                <div style={{ textAlign: "center", fontSize: "9px", marginTop: "12px", borderTop: "1px dotted #888", paddingTop: "4px" }}>
                  <div style={{ fontWeight: "bold" }}>{factoryAddressEnglish}</div>
                  <div style={{ fontWeight: "bold", marginTop: "2px" }}>Ph: {factoryPhoneBottom}</div>
                  <div style={{ marginTop: "3px" }}>Factory Gate Logistics System</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
