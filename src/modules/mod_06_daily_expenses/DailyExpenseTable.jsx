import React from "react";
import { Trash2 } from "lucide-react";

export default function DailyExpenseTable({ expenses, onDeleteExpense }) {
  if (expenses.length === 0) {
    return (
      <div style={{ background: "var(--bg-card)", padding: "40px 20px", borderRadius: "12px", border: "1px solid var(--border-color)", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
        No expenses recorded for today.
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ background: "var(--bg-primary)" }}>
            <th style={{ width: "12%", padding: "12px 16px", borderBottom: "1px solid var(--border-divider)", color: "var(--text-secondary)", fontWeight: 600 }}>Time</th>
            <th style={{ width: "22%", padding: "12px 16px", borderBottom: "1px solid var(--border-divider)", color: "var(--text-secondary)", fontWeight: 600 }}>Category</th>
            <th style={{ width: "22%", padding: "12px 16px", borderBottom: "1px solid var(--border-divider)", color: "var(--text-secondary)", fontWeight: 600 }}>Paid To</th>
            <th style={{ width: "24%", padding: "12px 16px", borderBottom: "1px solid var(--border-divider)", color: "var(--text-secondary)", fontWeight: 600 }}>Remarks</th>
            <th style={{ width: "15%", padding: "12px 16px", borderBottom: "1px solid var(--border-divider)", color: "var(--text-secondary)", fontWeight: 600, textAlign: "right" }}>Amount</th>
            <th style={{ width: "5%", padding: "12px 16px", borderBottom: "1px solid var(--border-divider)", color: "var(--text-secondary)", fontWeight: 600, textAlign: "center" }}></th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp) => (
            <tr key={exp.id} style={{ borderBottom: "1px solid var(--border-divider)" }}>
              <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                {new Date(exp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </td>
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
              <td style={{ padding: "12px 16px", textAlign: "center" }}>
                <button
                  onClick={() => onDeleteExpense(exp.id)}
                  style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
                  title="Delete Expense"
                  onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                >
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
