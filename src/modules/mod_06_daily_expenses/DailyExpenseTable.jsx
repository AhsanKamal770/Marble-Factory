import React, { useState } from "react";
import { Trash2, X, Check } from "lucide-react";

export default function DailyExpenseTable({ expenses, onDeleteExpense }) {
  const [confirmId, setConfirmId] = useState(null);
  if (expenses.length === 0) {
    return (
      <div style={{ background: "var(--bg-card)", padding: "40px 20px", borderRadius: "12px", border: "1px solid var(--border-color)", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
        No expenses recorded for today.
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border-divider)", maxHeight: "480px", overflowY: "auto" }}>
      <style>{`
        .expense-row .action-btn { opacity: 0; transition: opacity 0.15s ease; }
        .expense-row:hover .action-btn, .expense-row.confirming .action-btn { opacity: 1; }
        @media (hover: none) {
          .expense-row .action-btn { opacity: 1; }
        }
        .sticky-th {
          position: sticky;
          top: 0;
          z-index: 10;
          background: var(--bg-primary);
          box-shadow: 0 1px 0 var(--border-divider);
        }
      `}</style>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th className="sticky-th" style={{ width: "12%", padding: "12px 16px", borderBottom: "none", color: "var(--text-secondary)", fontWeight: 600 }}>Time</th>
            <th className="sticky-th" style={{ width: "22%", padding: "12px 16px", borderBottom: "none", color: "var(--text-secondary)", fontWeight: 600 }}>Category</th>
            <th className="sticky-th" style={{ width: "22%", padding: "12px 16px", borderBottom: "none", color: "var(--text-secondary)", fontWeight: 600 }}>Paid To</th>
            <th className="sticky-th" style={{ width: "24%", padding: "12px 16px", borderBottom: "none", color: "var(--text-secondary)", fontWeight: 600 }}>Remarks</th>
            <th className="sticky-th" style={{ width: "12%", padding: "12px 16px", borderBottom: "none", color: "var(--text-secondary)", fontWeight: 600, textAlign: "right" }}>Amount</th>
            <th className="sticky-th" style={{ width: "8%", padding: "12px 16px", borderBottom: "none", color: "var(--text-secondary)", fontWeight: 600, textAlign: "center" }}></th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp) => {
            const isConfirming = confirmId === exp.id;
            return (
              <tr key={exp.id} className={`expense-row ${isConfirming ? 'confirming' : ''}`} style={{ borderBottom: "1px solid var(--border-divider)", background: isConfirming ? "var(--bg-primary)" : "transparent" }}>
                <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                  {new Date(exp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                
                {isConfirming ? (
                  <td colSpan="4" style={{ padding: "12px 16px", color: "var(--text-primary)", fontWeight: 600 }}>
                    <span style={{ color: "#ef4444", marginRight: "8px" }}>Delete this expense?</span> 
                    <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>Rs. {Number(exp.amount).toLocaleString()} · {exp.category}</span>
                  </td>
                ) : (
                  <>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={exp.category}>
                      {exp.category}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={exp.paidTo}>
                      {exp.paidTo || "-"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={exp.remarks}>
                      {exp.remarks || "-"}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: "#ef4444", textAlign: "right" }}>
                      Rs. {Number(exp.amount).toLocaleString()}
                    </td>
                  </>
                )}

                <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                  {isConfirming ? (
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", alignItems: "center" }}>
                      <button onClick={() => setConfirmId(null)} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>
                        Cancel
                      </button>
                      <button onClick={() => { onDeleteExpense(exp.id); setConfirmId(null); }} style={{ background: "#ef4444", border: "none", color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, padding: "4px 10px", borderRadius: "4px" }}>
                        Delete
                      </button>
                    </div>
                  ) : (
                    <button
                      className="action-btn"
                      onClick={() => setConfirmId(exp.id)}
                      style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
                      title="Delete expense"
                      onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                    >
                      <Trash2 size={16} strokeWidth={2.5} />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
