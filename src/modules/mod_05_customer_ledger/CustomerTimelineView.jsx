import React, { useState } from "react";
import {
  Check,
  Printer,
  Edit2,
  Trash2,
  FileText,
  User,
  Phone,
  MapPin,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft
} from "lucide-react";

export default function CustomerTimelineView({
  customer,
  timeline = [],
  onOpenEditProfile,
  onOpenReceivePayment,
  onOpenPrintKhata,
  onDeleteCustomer
}) {
  if (!customer) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        background: "var(--bg-card)",
        color: "var(--text-muted)",
        padding: "40px",
        textAlign: "center"
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: 'rgba(37, 99, 235, 0.08)',
          color: 'var(--accent-blue)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '14px'
        }}>
          <User size={32} />
        </div>
        <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 6px 0" }}>
          Select a Customer Khata
        </h3>
        <p style={{ fontSize: "0.85rem", maxWidth: "340px", lineHeight: 1.5, margin: 0, color: "var(--text-secondary)" }}>
          Choose a customer from the left list to view their live running ledger, sales bills history, and outstanding balance.
        </p>
      </div>
    );
  }

  const hasDue = Number(customer.balanceDue || 0) > 0;
  const totalBilled = Number(customer.totalBilled || 0);
  const totalPaid = Number(customer.totalPaid || 0);
  const balanceDue = Number(customer.balanceDue || 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-card)" }}>
      {/* ── SELECTED CUSTOMER HEADER ── */}
      <div style={{
        padding: "20px 26px",
        borderBottom: "1px solid var(--border-divider)",
        display: "flex",
        flexDirection: "column",
        gap: "14px"
      }}>
        {/* Row 1: Name, Type & Quick Action Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h1 style={{
                fontSize: "1.45rem",
                fontWeight: 900,
                margin: 0,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em"
              }}>
                {customer.name}
              </h1>
              {customer.customerType && (
                <span style={{
                  fontSize: "0.74rem",
                  background: "rgba(37, 99, 235, 0.1)",
                  color: "var(--accent-blue)",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  fontWeight: 800,
                  textTransform: "uppercase"
                }}>
                  {customer.customerType}
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px", fontSize: "0.82rem", color: "var(--text-secondary)", flexWrap: "wrap" }}>
              {customer.phone && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Phone size={13} style={{ color: "var(--text-muted)" }} />
                  <span className="font-mono">{customer.phone}</span>
                </span>
              )}
              {customer.city && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <MapPin size={13} style={{ color: "var(--text-muted)" }} />
                  <span>{customer.city}</span>
                </span>
              )}
              {customer.address && (
                <span style={{ color: "var(--text-muted)" }}>• {customer.address}</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onOpenReceivePayment}
              className="btn btn-primary btn-sm"
              style={{
                background: "#059669",
                borderColor: "#059669",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "5px"
              }}
            >
              <Check size={15} strokeWidth={2.5} />
              <span>Receive Payment</span>
            </button>

            {onOpenPrintKhata && (
              <button
                type="button"
                onClick={onOpenPrintKhata}
                className="btn btn-secondary btn-sm"
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
                title="Print 80mm Khata Statement Slip"
              >
                <Printer size={15} />
                <span>Print Slip</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenEditProfile}
              className="btn btn-ghost btn-sm"
              style={{ padding: "6px 8px" }}
              title="Edit Profile"
            >
              <Edit2 size={15} />
            </button>

            {onDeleteCustomer && (
              <button
                type="button"
                onClick={() => onDeleteCustomer(customer.id)}
                className="btn btn-ghost btn-sm"
                style={{ padding: "6px 8px", color: "#fb7185" }}
                title="Delete Customer"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Customer Account Metric Strip */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "10px",
          background: "var(--bg-primary)",
          padding: "10px 14px",
          borderRadius: "10px",
          border: "1px solid var(--border-divider)"
        }}>
          <div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              Total Purchases
            </div>
            <div className="font-mono" style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>
              Rs. {totalBilled.toLocaleString()}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              Total Received
            </div>
            <div className="font-mono" style={{ fontSize: "0.95rem", fontWeight: 800, color: "#059669" }}>
              Rs. {totalPaid.toLocaleString()}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
              Balance Due
            </div>
            <div className="font-mono" style={{ fontSize: "1.05rem", fontWeight: 900, color: hasDue ? "#dc2626" : "#059669" }}>
              Rs. {balanceDue.toLocaleString()}
            </div>
          </div>

          {customer.creditLimit > 0 && (
            <div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                Credit Limit
              </div>
              <div className="font-mono" style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                Rs. {Number(customer.creditLimit).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── TRANSACTION HISTORY (RUNNING LEDGER) ── */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 26px 10px 26px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "0.92rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
            <FileText size={15} style={{ color: "var(--accent-blue)" }} />
            <span>Khata Ledger & Transaction History</span>
          </h3>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {timeline.length} transactions recorded
          </span>
        </div>
        
        {timeline.length === 0 ? (
          <div style={{ padding: "36px", textAlign: "center", color: "var(--text-muted)" }}>
            <FileText size={28} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
            <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>No transaction records found</div>
            <p style={{ margin: "4px 0 0", fontSize: "0.78rem" }}>
              Invoices created in POS Billing and payments recorded will automatically appear here.
            </p>
          </div>
        ) : (
          <div style={{ padding: "0 26px 26px 26px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
              <thead>
                <tr style={{ background: "var(--bg-primary)" }}>
                  <th style={{ textAlign: "left", padding: "10px 14px", borderBottom: "1px solid var(--border-divider)", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase" }}>Date</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", borderBottom: "1px solid var(--border-divider)", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase" }}>Document / Description</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", borderBottom: "1px solid var(--border-divider)", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase" }}>Debit (+)</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", borderBottom: "1px solid var(--border-divider)", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase" }}>Credit (-)</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", borderBottom: "1px solid var(--border-divider)", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase" }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((item, idx) => {
                  const dateStr = new Date(item.sortDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
                  const isInvoice = item.type === "INVOICE";
                  
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-divider)" }}>
                      <td style={{ padding: "12px 14px", color: "var(--text-secondary)", fontWeight: 500, whiteSpace: "nowrap" }}>
                        {dateStr}
                      </td>

                      <td style={{ padding: "12px 14px", color: "var(--text-primary)" }}>
                        <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                          {isInvoice ? (
                            <>
                              <ArrowDownLeft size={13} style={{ color: "#dc2626" }} />
                              <span>Bill #{item.invoiceNo}</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight size={13} style={{ color: "#059669" }} />
                              <span style={{ color: "#059669" }}>Payment Received</span>
                              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>({item.paymentNo})</span>
                            </>
                          )}
                        </div>

                        {isInvoice && item.items && item.items.length > 0 && (
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            {item.items.map(i => `${i.name} (${i.totalSqFt} Sq.Ft)`).join(', ')}
                          </div>
                        )}

                        {!isInvoice && item.notes && (
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            {item.notes} • Method: {item.paymentMethod || 'Cash'}
                          </div>
                        )}
                      </td>

                      {/* Debit (Invoice Grand Total) */}
                      <td style={{ padding: "12px 14px", textAlign: "right", color: "#dc2626", fontWeight: 700, fontFamily: "monospace" }}>
                        {isInvoice ? `Rs. ${Number(item.debit || item.amount).toLocaleString()}` : ""}
                      </td>

                      {/* Credit (Payment Received) */}
                      <td style={{ padding: "12px 14px", textAlign: "right", color: "#059669", fontWeight: 700, fontFamily: "monospace" }}>
                        {!isInvoice ? `Rs. ${Number(item.credit || item.amount).toLocaleString()}` : ""}
                      </td>

                      {/* Running Balance */}
                      <td style={{ padding: "12px 14px", textAlign: "right", color: "var(--text-primary)", fontWeight: 800, fontFamily: "monospace" }}>
                        Rs. {Number(item.runningBalance !== undefined ? item.runningBalance : customer.balanceDue).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
