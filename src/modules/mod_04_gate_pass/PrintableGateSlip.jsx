// ─────────────────────────────────────────────────────────────────────────────
// MOD-04: Printable Rickshaw Gate Out Slip
//
// CONCEPT: Print Layout Isolation (Decision 4 from the architecture plan)
// This component exists ONLY for printing. It is never shown during normal
// app use. The @media print CSS makes the rest of the app invisible when
// window.print() is called, and this component fills the page.
//
// WHY THIS PATTERN:
//   If we tried to print the regular UI (with buttons, sidebar, etc.) we'd
//   get a messy printout. By building a dedicated print-only HTML structure,
//   we get a clean, factory-ready gate slip every time.
//
// DATA FLOW:
//   GatePassView → [user clicks Print] → PrintableGateSlip renders in DOM
//   → window.print() → OS print dialog → physical paper
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";

export default function PrintableGateSlip({ gatePass }) {
  if (!gatePass) return null;

  const manifestItems = gatePass.manifest || [];
  const dispatchDate = gatePass.dispatchDate
    ? new Date(gatePass.dispatchDate).toLocaleDateString("en-PK", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : "—";
  const dispatchTime = gatePass.dispatchDate
    ? new Date(gatePass.dispatchDate).toLocaleTimeString("en-PK", {
        hour: "2-digit", minute: "2-digit", hour12: true,
      })
    : "—";

  return (
    <>
      {/* ── Print-only CSS ─────────────────────────────────────────────────
          CONCEPT: @media print rules
          - .no-print hides the rest of the app (sidebar, header, buttons).
          - .print-only shows this component (hidden on screen by default).
          - page-break rules ensure the slip fits on half an A4 page.      */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-gate-slip, .print-gate-slip * { visibility: visible !important; }
          .print-gate-slip {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 100% !important; height: auto !important;
            padding: 12mm 14mm !important;
            background: white !important;
            font-family: 'Arial', sans-serif !important;
          }
        }
      `}</style>

      <div className="print-gate-slip" style={{
        display: "none", // hidden on screen — only visible during print
        background: "white", color: "#000",
        fontFamily: "Arial, sans-serif", fontSize: "11px",
        padding: "12mm 14mm", width: "100%",
      }}>

        {/* ── Factory Header ──────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "8px", marginBottom: "8px" }}>
          <div style={{ fontSize: "16px", fontWeight: 900, letterSpacing: "0.05em" }}>
            RANA SHAHAB MARBLE &amp; TILES FACTORY
          </div>
          <div style={{ fontSize: "10px", marginTop: "2px", color: "#333" }}>
            Factory: Satyana Road, Faisalabad &nbsp;|&nbsp; Tel: 0321-6606645 &nbsp;|&nbsp; 0300-6664187
          </div>
          <div style={{ fontSize: "14px", fontWeight: 800, marginTop: "6px", letterSpacing: "0.1em", textDecoration: "underline" }}>
            GATE OUT PASS — DELIVERY SLIP
          </div>
        </div>

        {/* ── Pass Details ────────────────────────────────────────────────── */}
        <table style={{ width: "100%", marginBottom: "10px", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ width: "50%", paddingBottom: "4px" }}>
                <strong>Gate Pass No:</strong> {gatePass.gatePassNo}
              </td>
              <td style={{ width: "50%", paddingBottom: "4px", textAlign: "right" }}>
                <strong>Date:</strong> {dispatchDate} &nbsp; <strong>Time:</strong> {dispatchTime}
              </td>
            </tr>
            <tr>
              <td style={{ paddingBottom: "4px" }}>
                <strong>Invoice No:</strong> {gatePass.invoiceNo || "—"}
              </td>
              <td style={{ paddingBottom: "4px", textAlign: "right" }}>
                <strong>Status:</strong> {gatePass.status}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Customer & Destination ─────────────────────────────────────── */}
        <div style={{ border: "1px solid #000", padding: "6px 8px", marginBottom: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
          <div><strong>Customer / Consignee:</strong><br />{gatePass.customerName || "—"}</div>
          <div><strong>Delivery Destination:</strong><br />{gatePass.destination || "—"}</div>
        </div>

        {/* ── Vehicle & Driver ───────────────────────────────────────────── */}
        <div style={{ border: "1px solid #000", padding: "6px 8px", marginBottom: "10px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px" }}>
          <div><strong>Vehicle Type:</strong><br />{gatePass.vehicleType || "—"}</div>
          <div><strong>Vehicle Reg #:</strong><br />{gatePass.vehicleRegNo || "—"}</div>
          <div><strong>Driver Name:</strong><br />{gatePass.driverName || "—"}</div>
        </div>
        {gatePass.driverPhone && (
          <div style={{ marginBottom: "10px", fontSize: "10px" }}>
            <strong>Driver Mobile:</strong> {gatePass.driverPhone}
          </div>
        )}

        {/* ── Manifest Table ─────────────────────────────────────────────── */}
        {manifestItems.length > 0 && (
          <div style={{ marginBottom: "10px" }}>
            <div style={{ fontWeight: 700, marginBottom: "4px", textDecoration: "underline" }}>
              DISPATCH MANIFEST (Items Being Delivered)
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
              <thead>
                <tr style={{ background: "#eee" }}>
                  <th style={{ border: "1px solid #000", padding: "3px 6px", textAlign: "left" }}>#</th>
                  <th style={{ border: "1px solid #000", padding: "3px 6px", textAlign: "left" }}>Item / Variety</th>
                  <th style={{ border: "1px solid #000", padding: "3px 6px", textAlign: "center" }}>Size</th>
                  <th style={{ border: "1px solid #000", padding: "3px 6px", textAlign: "center" }}>Pcs</th>
                  <th style={{ border: "1px solid #000", padding: "3px 6px", textAlign: "center" }}>Sq.Ft</th>
                </tr>
              </thead>
              <tbody>
                {manifestItems.map((row, i) => (
                  <tr key={i}>
                    <td style={{ border: "1px solid #000", padding: "3px 6px" }}>{i + 1}</td>
                    <td style={{ border: "1px solid #000", padding: "3px 6px" }}>{row.name}</td>
                    <td style={{ border: "1px solid #000", padding: "3px 6px", textAlign: "center" }}>{row.size || "—"}</td>
                    <td style={{ border: "1px solid #000", padding: "3px 6px", textAlign: "center" }}>{row.pieces || "—"}</td>
                    <td style={{ border: "1px solid #000", padding: "3px 6px", textAlign: "center" }}>{row.sqFt ? Number(row.sqFt).toFixed(2) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {gatePass.notes && (
          <div style={{ marginBottom: "10px", fontSize: "10px" }}>
            <strong>Notes / Remarks:</strong> {gatePass.notes}
          </div>
        )}

        {/* ── 3 Signature Blocks ────────────────────────────────────────────
            CONCEPT: Tri-Party Accountability
            Physical gate passes in Pakistani factories require three sign-offs:
            1. Gate Incharge (confirms what left the yard)
            2. Driver (confirms what they received)
            3. Customer/Receiver (confirms what arrived)
            This mirrors the physical factory book exactly.                   */}
        <div style={{ borderTop: "1px dashed #000", marginTop: "16px", paddingTop: "12px" }}>
          <div style={{ fontWeight: 700, marginBottom: "16px", textAlign: "center", fontSize: "10px" }}>
            — VERIFICATION SIGNATURES —
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
            {[
              { title: "Gate Incharge", subtitle: "Factory Supervisor" },
              { title: "Rickshaw Driver", subtitle: `${gatePass.driverName || "Driver"}` },
              { title: "Customer / Receiver", subtitle: `${gatePass.customerName || "Receiver"}` },
            ].map((sig, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ borderBottom: "1px solid #000", marginBottom: "4px", height: "28px" }} />
                <div style={{ fontWeight: 700, fontSize: "10px" }}>{sig.title}</div>
                <div style={{ fontSize: "9px", color: "#555" }}>{sig.subtitle}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: "12px", fontSize: "9px", color: "#555", borderTop: "1px solid #ccc", paddingTop: "6px" }}>
          This gate pass is a legal dispatch document. Retain for records.
          &nbsp;|&nbsp; Rana Shahab Marble &amp; Tiles Factory, Satyana Road, Faisalabad.
        </div>

      </div>
    </>
  );
}
