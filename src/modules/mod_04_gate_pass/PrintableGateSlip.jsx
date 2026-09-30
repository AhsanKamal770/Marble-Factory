import React, { useState, useRef } from "react";
import { Printer, X, FileText, Receipt, Share2, Check, Truck, User, MapPin, Phone } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

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
  const printRef = useRef(null);

  if (!isOpen || !gatePass) return null;

  const manifestItems = Array.isArray(gatePass.manifest) ? gatePass.manifest : [];
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
      `_🚛 مال ڈسپیچ و رکشہ گیٹ پاس پرچی_`,
      `---------------------------------`,
      `*Gate Pass #:* ${gatePass.gatePassNo}`,
      gatePass.invoiceNo ? `*Invoice #:* ${gatePass.invoiceNo}` : null,
      `*Customer:* ${gatePass.customerName}`,
      gatePass.destination ? `*Destination:* ${gatePass.destination}` : null,
      `*Date:* ${dispatchDate} (${dispatchTime})`,
      `---------------------------------`,
      `*VEHICLE & DRIVER:*`,
      `*Vehicle:* ${gatePass.vehicleType} ${gatePass.vehicleRegNo ? `(${gatePass.vehicleRegNo})` : ''}`,
      `*Driver:* ${gatePass.driverName || 'N/A'} ${gatePass.driverPhone ? `• ${gatePass.driverPhone}` : ''}`,
      gatePass.carriageCharges > 0 ? `*Carriage:* Rs. ${Number(gatePass.carriageCharges).toLocaleString()} (${gatePass.carriagePaidBy || 'Paid'})` : null,
      `---------------------------------`,
      `*DISPATCH MANIFEST (مال تفصیل):*`,
      ...manifestItems.map(
        (it, idx) => `${idx + 1}. ${it.name} [${it.thicknessSutar ? it.thicknessSutar + ' Sutar' : '4 Sutar'}] ${it.size ? `(${it.size})` : ''} - ${it.pieces ? it.pieces + ' Pcs' : ''} • ${it.sqFt ? it.sqFt + ' Sq.Ft' : ''}`
      ),
      `---------------------------------`,
      `*TOTAL PIECES:* ${gatePass.totalPieces || manifestItems.reduce((s, i) => s + (Number(i.pieces) || 0), 0)} Pcs`,
      `*TOTAL SQ.FT:* ${gatePass.totalSqFt || manifestItems.reduce((s, i) => s + (Number(i.sqFt) || 0), 0)} Sq.Ft`,
      `---------------------------------`,
      `شکریہ! رابطہ فیکٹری: ${phone}`
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
        {/* Modal Header Bar (Hidden on Print) */}
        <div
          className="print-hide"
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid var(--border-divider)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-primary)",
            flexWrap: "wrap",
            gap: "12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", flex: 1 }}>
            <span style={{ fontSize: "0.98rem", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
              <Truck size={18} style={{ color: "var(--accent-blue)", flexShrink: 0 }} />
              {language === "ur" ? "رکشہ گیٹ پاس پرچی پرنٹ" : "Print Gate Out Pass"}
            </span>

            {/* Format Switcher Tabs */}
            <div style={{ display: "flex", background: "var(--bg-card)", padding: "2px", borderRadius: "6px", border: "1px solid var(--border-color)", whiteSpace: "nowrap" }}>
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
                <FileText size={13} style={{ flexShrink: 0 }} />
                <span>A4 / A5 Gate Slip</span>
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
                <Receipt size={13} style={{ flexShrink: 0 }} />
                <span>80mm Driver Slip</span>
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", flexShrink: 0 }}>
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
          <div ref={printRef} id="gatepass-print-area">
            <style>{`
              @media print {
                body * { visibility: hidden !important; }
                #gatepass-print-area, #gatepass-print-area * { visibility: visible !important; }
                #gatepass-print-area {
                  display: block !important;
                  position: absolute;
                  right: 0;
                  top: 0;
                  width: ${printFormat === 'a4' ? '100%' : '78mm'};
                  margin: 0;
                  padding: ${printFormat === 'a4' ? '15px' : '4mm 2mm'};
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
            {/* FORMAT 1: AUTHENTIC A4 / A5 FACTORY GATE OUT SLIP             */}
            {/* ------------------------------------------------------------- */}
            {printFormat === "a4" && (
              <div
                dir="rtl"
                style={{
                  background: "#ffffff",
                  color: "#0f172a",
                  padding: "24px 28px",
                  borderRadius: "6px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
                  border: "2px solid #0f172a",
                  fontFamily: "var(--font-urdu)",
                  maxWidth: "800px",
                  margin: "0 auto",
                  lineHeight: 1.5
                }}
              >
                {/* Traditional Bill Book Top Header */}
                <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: "12px", marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    {/* Factory Title & Slogan */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
                      <h1
                        style={{
                          fontSize: "1.7rem",
                          fontWeight: 900,
                          color: "#1e3a8a",
                          margin: "2px 0 0 0",
                          letterSpacing: "0.02em"
                        }}
                      >
                        {companyName}
                      </h1>
                      <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                        {tagline}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#475569", marginTop: "3px" }}>
                        {address} | فون: <span style={{ direction: "ltr", display: "inline-block" }}>{phone}</span>
                      </div>
                    </div>

                    {/* Gate Pass Meta Stamp */}
                    <div
                      style={{
                        textAlign: "left",
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        minWidth: "185px"
                      }}
                    >
                      <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 700 }}>گیٹ پاس پرچی</div>
                      <div className="font-mono" style={{ fontSize: "1.1rem", fontWeight: 900, color: "#1e3a8a", direction: "ltr" }}>
                        {gatePass.gatePassNo}
                      </div>
                      {gatePass.invoiceNo && (
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0284c7", marginTop: "2px" }}>
                          بل حوالہ: {gatePass.invoiceNo}
                        </div>
                      )}
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginTop: "3px" }}>
                        تاریخ: {dispatchDate}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "1px" }}>
                        وقت روانگی: {dispatchTime}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer & Carrier Dual Info Cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    padding: "10px 14px",
                    borderRadius: "6px",
                    marginBottom: "14px",
                    fontSize: "0.9rem"
                  }}
                >
                  {/* Right (In RTL, first is Right): Customer & Destination */}
                  <div>
                    <div style={{ fontWeight: 800, color: "#1e3a8a", fontSize: "0.95rem", borderBottom: "1px solid #cbd5e1", paddingBottom: "3px", marginBottom: "5px" }}>
                      تفصیل خریدار و ترسیل مقام
                    </div>
                    <div style={{ marginBottom: "3px" }}>
                      <span style={{ color: "#64748b" }}>خریدار / پارٹی: </span>
                      <strong style={{ color: "#0f172a" }}>{gatePass.customerName}</strong>
                    </div>
                    {gatePass.customerPhone && (
                      <div style={{ marginBottom: "3px" }}>
                        <span style={{ color: "#64748b" }}>موبائل نمبر: </span>
                        <span className="font-mono" style={{ direction: "ltr", display: "inline-block" }}>{gatePass.customerPhone}</span>
                      </div>
                    )}
                    <div>
                      <span style={{ color: "#64748b" }}>منزل / پتہ: </span>
                      <strong>{gatePass.destination || "فیکٹری سائیڈ ڈلیوری"}</strong>
                    </div>
                  </div>

                  {/* Left (In RTL, second is Left): Vehicle & Driver */}
                  <div>
                    <div style={{ fontWeight: 800, color: "#1e3a8a", fontSize: "0.95rem", borderBottom: "1px solid #cbd5e1", paddingBottom: "3px", marginBottom: "5px" }}>
                      تفصیل گاڑی و ڈرائیور
                    </div>
                    <div style={{ marginBottom: "3px" }}>
                      <span style={{ color: "#64748b" }}>گاڑی / رکشہ: </span>
                      <strong>{gatePass.vehicleType === "Qingqi Rickshaw" ? "چنگ چی رکشہ" : gatePass.vehicleType}</strong> {gatePass.vehicleRegNo ? <span className="font-mono" style={{ direction: "ltr", display: "inline-block" }}>({gatePass.vehicleRegNo})</span> : ''}
                    </div>
                    <div style={{ marginBottom: "3px" }}>
                      <span style={{ color: "#64748b" }}>ڈرائیور نام: </span>
                      <strong>{gatePass.driverName || "—"}</strong> {gatePass.driverPhone ? <span className="font-mono" style={{ direction: "ltr", display: "inline-block" }}>({gatePass.driverPhone})</span> : ''}
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>کرایہ باربرداری: </span>
                      <strong className="font-mono" style={{ direction: "ltr", display: "inline-block" }}>Rs. {Number(gatePass.carriageCharges || 0).toLocaleString()}</strong>
                      <span style={{ color: "#475569", fontSize: "0.8rem", marginRight: "6px" }}>({gatePass.carriagePaidBy === "Customer (موقع پر ادا کرے گا)" ? "موقع پر وصولی" : gatePass.carriagePaidBy})</span>
                    </div>
                  </div>
                </div>

                {/* Dispatch Manifest Table */}
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
                      <th style={{ padding: "6px 8px", textAlign: "center", width: "36px", borderLeft: "1px solid #cbd5e1" }}>#</th>
                      <th style={{ padding: "6px 8px", textAlign: "right", borderLeft: "1px solid #cbd5e1" }}>تفصیل پتھر و ماربل / قسم</th>
                      <th style={{ padding: "6px 8px", textAlign: "center", width: "85px", borderLeft: "1px solid #cbd5e1" }}>سوتر موٹائی</th>
                      <th style={{ padding: "6px 8px", textAlign: "right", width: "130px", borderLeft: "1px solid #cbd5e1" }}>پیمائش (سائز)</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", width: "85px", borderLeft: "1px solid #cbd5e1" }}>تھان / پیس</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", width: "95px" }}>اسکوائر فٹ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manifestItems && manifestItems.length > 0 ? (
                      manifestItems.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "6px 8px", textAlign: "center", borderLeft: "1px solid #cbd5e1" }}>{idx + 1}</td>
                          <td style={{ padding: "6px 8px", fontWeight: 700, borderLeft: "1px solid #cbd5e1", color: "#0f172a" }}>
                            {item.name}
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "center", borderLeft: "1px solid #cbd5e1", fontSize: "0.85rem", fontWeight: 700, color: "#1e3a8a" }}>
                            {item.thicknessSutar ? `${item.thicknessSutar} سوتر` : "4 سوتر"}
                          </td>
                          <td style={{ padding: "6px 8px", borderLeft: "1px solid #cbd5e1", color: "#475569" }}>
                            {item.size || "—"}
                          </td>
                          <td className="font-mono" style={{ padding: "6px 8px", textAlign: "left", borderLeft: "1px solid #cbd5e1", fontWeight: 700, direction: "ltr" }}>
                            {item.pieces || "—"}
                          </td>
                          <td className="font-mono" style={{ padding: "6px 8px", textAlign: "left", fontWeight: 800, color: "#0f172a", direction: "ltr" }}>
                            {item.sqFt ? Number(item.sqFt).toFixed(2) : "—"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ padding: "14px", textAlign: "center", color: "#64748b" }}>
                          کوئی آئٹم درج نہیں کیا گیا۔
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f8fafc", borderTop: "2px solid #0f172a", borderBottom: "2px solid #0f172a", fontWeight: 900 }}>
                      <td colSpan="4" style={{ padding: "8px", textAlign: "left", borderLeft: "1px solid #cbd5e1", fontSize: "0.95rem" }}>
                        میزان روانگی کل مال:
                      </td>
                      <td className="font-mono" style={{ padding: "8px", textAlign: "left", borderLeft: "1px solid #cbd5e1", fontSize: "0.95rem", direction: "ltr" }}>
                        {gatePass.totalPieces || manifestItems.reduce((s, i) => s + (Number(i.pieces) || 0), 0)} Pcs
                      </td>
                      <td className="font-mono" style={{ padding: "8px", textAlign: "left", fontSize: "0.95rem", color: "#1e3a8a", direction: "ltr" }}>
                        {gatePass.totalSqFt || manifestItems.reduce((s, i) => s + (Number(i.sqFt) || 0), 0)} Sq.Ft
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Notes & Security Terms in Urdu */}
                <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "12px", alignItems: "start", marginBottom: "16px" }}>
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
                    <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: "2px" }}>شرائط و قواعد گیٹ پاس:</div>
                    <div>1. گیٹ پاس کے بغیر فیکٹری سے کوئی مال باہر لے جانا سخت منع ہے۔</div>
                    <div>2. ڈرائیور مال کی بحفاظت ترسیل اور صحیح سلامت پہنچانے کا مکمل ذمہ دار ہے۔</div>
                    <div>3. خریدار مال موصول ہونے پر تسلی کر کے رسید پر دستخط کرے۔</div>
                  </div>

                  {gatePass.notes && (
                    <div
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        padding: "8px 12px",
                        background: "#ffffff",
                        fontSize: "0.75rem",
                        color: "#334155"
                      }}
                    >
                      <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: "2px" }}>خصوصی ہدایات / ریمارکس:</div>
                      <div>{gatePass.notes}</div>
                    </div>
                  )}
                </div>

                {/* 3 Signature Blocks */}
                <div style={{ marginTop: "36px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", fontSize: "0.85rem", padding: "0 10px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ borderTop: "1.5px solid #0f172a", paddingTop: "4px", fontWeight: 800, color: "#0f172a" }}>
                      دستخط خریدار / وصول کنندہ
                    </div>
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <div style={{ borderTop: "1.5px solid #0f172a", paddingTop: "4px", fontWeight: 800, color: "#0f172a" }}>
                      دستخط ڈرائیور / کیریئر
                    </div>
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <div style={{ borderTop: "1.5px solid #0f172a", paddingTop: "4px", fontWeight: 800, color: "#0f172a" }}>
                      دستخط گیٹ کیپر / منشی
                    </div>
                  </div>
                </div>

                {/* Footer Brand Line */}
                <div style={{ textAlign: "center", marginTop: "18px", borderTop: "1px solid #e2e8f0", paddingTop: "6px", fontSize: "0.75rem", color: "#94a3b8" }}>
                  {companyName} — ڈسپیچ و لاجسٹکس سسٹم • جھمرہ سٹی
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* FORMAT 2: 80MM POS THERMAL DRIVER SLIP                       */}
            {/* ------------------------------------------------------------- */}
            {printFormat === "thermal" && (
              <div
                dir="rtl"
                style={{
                  background: "#ffffff",
                  color: "#000000",
                  padding: "16px 14px",
                  borderRadius: "8px",
                  border: "1px dashed #cbd5e1",
                  fontFamily: "var(--font-urdu)",
                  fontSize: "12px",
                  maxWidth: "380px",
                  margin: "0 auto",
                  lineHeight: 1.45
                }}
              >
                {/* Thermal Header */}
                <div style={{ textAlign: "center", borderBottom: "1px dashed #000", paddingBottom: "6px", marginBottom: "6px" }}>
                  <div style={{ fontSize: "16px", fontWeight: "bold" }}>{companyName}</div>
                  <div style={{ fontSize: "11px" }}>{address}</div>
                  <div style={{ fontSize: "11px" }}>فون: <span style={{ direction: "ltr", display: "inline-block" }}>{phone}</span></div>
                  <div style={{ fontSize: "13px", fontWeight: "bold", margin: "4px 0 2px 0", borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "4px 0" }}>
                    رکشہ گیٹ پاس پرچی
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginTop: "4px" }}>
                    <span>گیٹ پاس #: {gatePass.gatePassNo}</span>
                    <span>{dispatchDate}</span>
                  </div>
                  {gatePass.invoiceNo && (
                    <div style={{ textAlign: "right", fontSize: "11px", fontWeight: "bold", marginTop: "2px" }}>
                      بل حوالہ: {gatePass.invoiceNo}
                    </div>
                  )}
                </div>

                {/* Customer & Vehicle Details */}
                <div style={{ borderBottom: "1px dashed #000", paddingBottom: "6px", marginBottom: "6px" }}>
                  <div><strong>خریدار:</strong> {gatePass.customerName}</div>
                  {gatePass.customerPhone && <div><strong>فون:</strong> <span style={{ direction: "ltr", display: "inline-block" }}>{gatePass.customerPhone}</span></div>}
                  <div><strong>پتہ:</strong> {gatePass.destination || "فیکٹری سائیڈ ڈلیوری"}</div>
                  <div style={{ borderTop: "1px dotted #888", marginTop: "4px", paddingTop: "4px" }}>
                    <strong>رکشہ/گاڑی:</strong> {gatePass.vehicleType === "Qingqi Rickshaw" ? "چنگ چی رکشہ" : gatePass.vehicleType} {gatePass.vehicleRegNo ? `(${gatePass.vehicleRegNo})` : ''}
                  </div>
                  <div><strong>ڈرائیور:</strong> {gatePass.driverName || '-'} {gatePass.driverPhone ? <><span style={{ margin: "0 4px" }}>•</span><span style={{ direction: "ltr", display: "inline-block" }}>{gatePass.driverPhone}</span></> : ''}</div>
                  {gatePass.carriageCharges > 0 && (
                    <div><strong>کرایہ:</strong> <span style={{ direction: "ltr", display: "inline-block" }}>Rs. {Number(gatePass.carriageCharges).toLocaleString()}</span> ({gatePass.carriagePaidBy === "Customer (موقع پر ادا کرے گا)" ? "موقع پر وصولی" : gatePass.carriagePaidBy})</div>
                  )}
                </div>

                {/* Manifest Table */}
                <div style={{ borderBottom: "1px dashed #000", paddingBottom: "6px", marginBottom: "6px" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "4px" }}>تفصیل مال:</div>
                  {manifestItems.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: "3px", fontSize: "11px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>{idx + 1}. {item.name}</span>
                        <span style={{ fontWeight: "bold", direction: "ltr" }}>{item.sqFt ? `${item.sqFt} SqFt` : ''}</span>
                      </div>
                      <div style={{ color: "#444", fontSize: "10px", paddingRight: "10px" }}>
                        {item.thicknessSutar ? `${item.thicknessSutar} سوتر` : ''} {item.size ? `• ${item.size}` : ''} {item.pieces ? `• ${item.pieces} Pcs` : ''}
                      </div>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px dotted #000", marginTop: "4px", paddingTop: "4px", display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                    <span>میزان کل مال:</span>
                    <span style={{ direction: "ltr" }}>{gatePass.totalPieces || 0} Pcs • {gatePass.totalSqFt || 0} SqFt</span>
                  </div>
                </div>

                {/* Signatures */}
                <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "bold" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ borderTop: "1px solid #000", width: "70px", paddingTop: "2px" }}>خریدار</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ borderTop: "1px solid #000", width: "70px", paddingTop: "2px" }}>ڈرائیور</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ borderTop: "1px solid #000", width: "70px", paddingTop: "2px" }}>منشی</div>
                  </div>
                </div>

                <div style={{ textAlign: "center", fontSize: "10px", marginTop: "12px", borderTop: "1px dotted #888", paddingTop: "4px" }}>
                  فیکٹری گیٹ لاجسٹکس سسٹم
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
