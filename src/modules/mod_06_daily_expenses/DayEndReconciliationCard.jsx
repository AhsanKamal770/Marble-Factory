import React from "react";
import { Printer } from "lucide-react";

export default function DayEndReconciliationCard({ cashData, onPrint }) {
  if (!cashData) return null;

  const { openingCash, cashSalesToday, wasooliToday, expensesToday, liveCash } = cashData;

  const RowItem = ({ label, amount, isNegative, isTotal }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", fontSize: isTotal ? "1.1rem" : "0.95rem" }}>
      <div style={{ fontWeight: isTotal ? 700 : 500, color: isTotal ? "var(--text-primary)" : "var(--text-secondary)" }}>
        {label}
      </div>
      <div style={{ fontWeight: isTotal ? 800 : 600, color: isTotal ? (liveCash >= 0 ? "#10b981" : "#ef4444") : (isNegative ? "#ef4444" : "var(--text-primary)"), fontFamily: "monospace" }}>
        {isTotal ? "" : (isNegative ? "- " : "+ ")}Rs. {Number(amount).toLocaleString()}
      </div>
    </div>
  );

  return (
    <div style={{ background: "var(--bg-card)", padding: "32px", borderRadius: "12px", border: "1px solid var(--border-color)", boxShadow: "var(--shadow-sm)", maxWidth: "800px", margin: "0 auto" }}>
      <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 24px 0", color: "var(--text-primary)", letterSpacing: "-0.01em", textAlign: "center" }}>
        DAY-END RECONCILIATION (ROZNAMCHA)
      </h3>

      <div style={{ maxWidth: "400px", margin: "0 auto 24px auto" }}>
        <RowItem label="Opening Balance" amount={openingCash} />
        <RowItem label="Cash Sales (Today)" amount={cashSalesToday} />
        <RowItem label="Udhar Recoveries" amount={wasooliToday} />
        <RowItem label="Total Expenses" amount={expensesToday} isNegative={true} />
        <div style={{ borderTop: "2px solid var(--border-divider)", margin: "12px 0" }}></div>
        <RowItem label="Expected Closing Balance" amount={liveCash} isTotal={true} />
      </div>

      <div style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "24px" }}>
        Expected cash should match the physical drawer count.
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <button className="btn btn-secondary" onClick={onPrint} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px", fontSize: "0.95rem", fontWeight: 700 }}>
          <Printer size={18} /> Print Day Closing
        </button>
      </div>
    </div>
  );
}
