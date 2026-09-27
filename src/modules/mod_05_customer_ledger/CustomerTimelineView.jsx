import React, { useState } from "react";
import { Check, MoreVertical, Edit2, FileText } from "lucide-react";

export default function CustomerTimelineView({ customer, timeline, onOpenEditProfile, onOpenReceivePayment }) {
  const [showMenu, setShowMenu] = useState(false);

  if (!customer) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", background: "var(--bg-card)", color: "var(--text-muted)", padding: "40px", textAlign: "center" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px 0" }}>Select a customer</h3>
        <p style={{ fontSize: "0.9rem", maxWidth: "300px", lineHeight: 1.5, margin: 0 }}>
          Choose a customer from the list to view their ledger, outstanding balance, and transaction history.
        </p>
      </div>
    );
  }

  // Calculate running balance going backwards from current balance
  let runningBal = Number(customer.balanceDue) || 0;
  const ledgerRows = timeline.map(item => {
    const isInvoice = item.type === "INVOICE";
    const debit = isInvoice ? Number(item.balanceDue || item.totalAmount || 0) : 0;
    const credit = !isInvoice ? Number(item.amount || 0) : 0;
    
    const rowObj = {
      ...item,
      debit,
      credit,
      balance: runningBal
    };

    if (isInvoice) {
      runningBal -= debit;
    } else {
      runningBal += credit;
    }
    
    return rowObj;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-card)" }}>
      {/* ── SELECTED CUSTOMER HEADER ── */}
      <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border-divider)", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: "24px" }}>
        
        {/* Left: Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
            <h1 style={{ 
              fontSize: "1.6rem", fontWeight: 800, margin: 0, color: "var(--text-primary)", 
              lineHeight: 1.15, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word"
            }} title={customer.name}>
              {customer.name}
            </h1>
            {customer.customerType && (
              <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                [{customer.customerType}]
              </span>
            )}
          </div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", display: "flex", gap: "8px", fontWeight: 500, flexWrap: "wrap" }}>
            {customer.phone && <span>{customer.phone}</span>}
            {customer.phone && customer.city && <span>·</span>}
            {customer.city && <span>{customer.city}</span>}
          </div>
        </div>
        
        {/* Right: Actions & Balance */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button 
              onClick={onOpenReceivePayment}
              style={{ 
                background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", 
                padding: "8px 14px", fontSize: "0.85rem", fontWeight: 700, 
                display: "flex", alignItems: "center", gap: "6px", cursor: "pointer"
              }}
            >
              <Check size={14} strokeWidth={3} /> Receive Payment
            </button>
            
            <div style={{ position: "relative" }}>
              <button 
                onClick={() => setShowMenu(!showMenu)}
                style={{ 
                  background: "transparent", border: "1px solid var(--border-divider)", borderRadius: "6px", 
                  width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "var(--text-secondary)"
                }}
              >
                <MoreVertical size={16} />
              </button>
              
              {showMenu && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 10 }} onClick={() => setShowMenu(false)} />
                  <div style={{ 
                    position: "absolute", right: 0, top: "40px", width: "160px", background: "var(--bg-card)",
                    border: "1px solid var(--border-color)", borderRadius: "8px", boxShadow: "var(--shadow-md)",
                    padding: "6px", zIndex: 20
                  }}>
                    <button 
                      onClick={() => { setShowMenu(false); onOpenEditProfile(); }}
                      style={{ 
                        width: "100%", textAlign: "left", background: "transparent", border: "none",
                        padding: "8px 12px", fontSize: "0.85rem", color: "var(--text-primary)",
                        cursor: "pointer", borderRadius: "4px", display: "flex", alignItems: "center", gap: "8px"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <Edit2 size={14} /> Edit Profile
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "2px" }}>
              {customer.balanceDue > 0 ? "Outstanding" : "Settled"}
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: customer.balanceDue > 0 ? "#ef4444" : "#10b981", fontFamily: "monospace", letterSpacing: "-0.02em" }}>
              Rs. {Number(customer.balanceDue).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* ── TRANSACTION HISTORY (LEDGER) ── */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "24px 32px 16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Transaction History
          </h3>
        </div>
        
        {ledgerRows.length === 0 ? (
          <div style={{ padding: "10px 32px 32px 32px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "0.9rem", fontWeight: 500, display: "flex", alignItems: "center", gap: "8px" }}>
              <FileText size={16} /> No transactions yet
            </div>
            <p style={{ margin: "4px 0 0 24px", fontSize: "0.85rem" }}>Transactions and payments for this customer will appear here.</p>
          </div>
        ) : (
          <div style={{ padding: "0 32px 32px 32px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "12px 16px", borderBottom: "1px solid var(--border-divider)", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase" }}>Date</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", borderBottom: "1px solid var(--border-divider)", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase" }}>Description</th>
                  <th style={{ textAlign: "right", padding: "12px 16px", borderBottom: "1px solid var(--border-divider)", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase" }}>Debit</th>
                  <th style={{ textAlign: "right", padding: "12px 16px", borderBottom: "1px solid var(--border-divider)", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase" }}>Credit</th>
                  <th style={{ textAlign: "right", padding: "12px 16px", borderBottom: "1px solid var(--border-divider)", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase" }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows.map((item, idx) => {
                  const dateStr = new Date(item.sortDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
                  const isInvoice = item.type === "INVOICE";
                  
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-divider)", background: "var(--bg-card)" }}>
                      <td style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 500, whiteSpace: "nowrap" }}>
                        {dateStr}
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--text-primary)", fontWeight: 600 }}>
                        {isInvoice ? (
                          <>Invoice <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>#{item.invoiceNo}</span></>
                        ) : (
                          <>Payment Received <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>({item.paymentNo})</span></>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", color: "#ef4444", fontWeight: 600, fontFamily: "monospace" }}>
                        {item.debit > 0 ? Number(item.debit).toLocaleString() : ""}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", color: "#10b981", fontWeight: 600, fontFamily: "monospace" }}>
                        {item.credit > 0 ? Number(item.credit).toLocaleString() : ""}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", color: "var(--text-primary)", fontWeight: 700, fontFamily: "monospace" }}>
                        {Number(item.balance).toLocaleString()}
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
