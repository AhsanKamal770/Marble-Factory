import React from "react";
import { FileText, Download, CheckCircle, ArrowRight } from "lucide-react";

export default function CustomerTimelineView({ customer, timeline }) {
  if (!customer) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: "0.95rem" }}>
        Select a customer to view their ledger and timeline.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-primary)" }}>
      {/* Profile Header */}
      <div style={{ padding: "24px 32px", background: "var(--bg-card)", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>{customer.name}</h1>
            <span style={{ fontSize: "0.75rem", padding: "4px 8px", background: "rgba(37,99,235,0.1)", color: "var(--accent-blue)", borderRadius: "4px", fontWeight: 600 }}>
              {customer.customerType || "Retail"}
            </span>
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "6px", display: "flex", gap: "16px" }}>
            {customer.phone && <span>Phone: {customer.phone}</span>}
            {customer.city && <span>City: {customer.city}</span>}
          </div>
        </div>
        
        <div style={{ textAlign: "right", padding: "12px 20px", background: customer.balanceDue > 0 ? "rgba(239, 68, 68, 0.05)" : "rgba(16, 185, 129, 0.05)", borderRadius: "8px", border: `1px solid ${customer.balanceDue > 0 ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)"}` }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: customer.balanceDue > 0 ? "#ef4444" : "#10b981", marginBottom: "4px" }}>
            {customer.balanceDue > 0 ? "Outstanding Balance (Udhar)" : "Settled (Clear)"}
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: customer.balanceDue > 0 ? "#ef4444" : "#10b981", fontFamily: "monospace" }}>
            Rs. {Number(customer.balanceDue).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Timeline List */}
      <div style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "20px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Transaction Timeline
        </h3>
        
        {timeline.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", background: "var(--bg-card)", borderRadius: "8px", border: "1px dashed var(--border-color)", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            No transactions found for this customer.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {timeline.map((item, idx) => {
              const isInvoice = item.type === "INVOICE";
              const dateStr = new Date(item.sortDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
              
              return (
                <div key={idx} style={{ display: "flex", gap: "16px" }}>
                  
                  {/* Timeline Line & Icon */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: isInvoice ? "rgba(37,99,235,0.1)" : "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: isInvoice ? "var(--accent-blue)" : "#10b981", flexShrink: 0, zIndex: 2 }}>
                      {isInvoice ? <FileText size={16} /> : <CheckCircle size={16} />}
                    </div>
                    {idx !== timeline.length - 1 && (
                      <div style={{ width: "2px", flex: 1, background: "var(--border-color)", margin: "4px 0" }} />
                    )}
                  </div>

                  {/* Content Card */}
                  <div style={{ flex: 1, background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border-color)", padding: "16px", marginBottom: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                          {isInvoice ? "Invoice Created" : "Payment Received"}
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500, fontFamily: "monospace", padding: "2px 6px", background: "var(--bg-primary)", borderRadius: "4px" }}>
                            {isInvoice ? item.invoiceNo : item.paymentNo}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                          {dateStr}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: isInvoice ? "#ef4444" : "#10b981", fontFamily: "monospace" }}>
                          {isInvoice ? "+" : "-"} Rs. {Number(isInvoice ? item.balanceDue : item.amount).toLocaleString()}
                        </div>
                        {isInvoice && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                            Total: Rs. {Number(item.totalAmount || 0).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {!isInvoice && item.notes && (
                      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", background: "var(--bg-primary)", padding: "8px 12px", borderRadius: "6px", marginTop: "12px", borderLeft: "3px solid var(--border-color)" }}>
                        {item.notes}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
