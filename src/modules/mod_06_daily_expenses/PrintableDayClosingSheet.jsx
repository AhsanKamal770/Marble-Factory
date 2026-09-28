import React from "react";

export default function PrintableDayClosingSheet({ cashData, expenses, factorySettings }) {
  if (!cashData) return null;

  const { openingCash, cashSalesToday, wasooliToday, expensesToday, liveCash } = cashData;
  const dateStr = new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="print-only-container" style={{ display: "none" }}>
      <style>
        {`
          @media print {
            .print-only-container {
              display: block !important;
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #000;
              width: 100%;
            }
            .no-print { display: none !important; }
            body { margin: 0; padding: 20px; background: white; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 14px; }
            th { background-color: #f0f0f0; }
          }
        `}
      </style>

      <div style={{ textAlign: "center", marginBottom: "30px", borderBottom: "2px solid #000", paddingBottom: "10px" }}>
        <h1 style={{ fontSize: "24px", margin: "0 0 5px 0" }}>{factorySettings?.companyName || "RANA SHAHAB MARBLE FACTORY"}</h1>
        <h2 style={{ fontSize: "18px", margin: "0 0 10px 0", fontWeight: "normal" }}>Daily Cash Closing Report (Roznamcha)</h2>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
          <span><strong>Date:</strong> {dateStr}</span>
          <span><strong>Time:</strong> {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
        <div style={{ width: "45%" }}>
          <h3 style={{ fontSize: "16px", borderBottom: "1px solid #000", paddingBottom: "5px", marginBottom: "10px" }}>Cash Inflow (+)</h3>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
            <span>Opening Balance:</span>
            <strong>Rs. {Number(openingCash).toLocaleString()}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
            <span>Cash Sales (Today):</span>
            <strong>Rs. {Number(cashSalesToday).toLocaleString()}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
            <span>Udhar Recoveries:</span>
            <strong>Rs. {Number(wasooliToday).toLocaleString()}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", borderTop: "1px dashed #000", paddingTop: "5px" }}>
            <span><strong>Total Inflow:</strong></span>
            <strong>Rs. {Number(openingCash + cashSalesToday + wasooliToday).toLocaleString()}</strong>
          </div>
        </div>

        <div style={{ width: "45%" }}>
          <h3 style={{ fontSize: "16px", borderBottom: "1px solid #000", paddingBottom: "5px", marginBottom: "10px" }}>Cash Outflow (-)</h3>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
            <span>Total Expenses:</span>
            <strong>Rs. {Number(expensesToday).toLocaleString()}</strong>
          </div>
        </div>
      </div>

      <div style={{ border: "2px solid #000", padding: "15px", marginBottom: "30px", background: "#f9f9f9" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "20px" }}>Expected Closing Cash in Drawer:</h2>
          <h2 style={{ margin: 0, fontSize: "24px" }}>Rs. {Number(liveCash).toLocaleString()}</h2>
        </div>
      </div>

      <h3 style={{ fontSize: "16px", marginBottom: "10px" }}>Detailed Expense Breakdown:</h3>
      {expenses && expenses.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Category</th>
              <th>Paid To</th>
              <th>Remarks</th>
              <th style={{ textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp, idx) => (
              <tr key={idx}>
                <td>{new Date(exp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td>{exp.category}</td>
                <td>{exp.paidTo || "-"}</td>
                <td>{exp.remarks || "-"}</td>
                <td style={{ textAlign: "right" }}>Rs. {Number(exp.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan="4" style={{ textAlign: "right" }}>Total Expenses:</th>
              <th style={{ textAlign: "right" }}>Rs. {Number(expensesToday).toLocaleString()}</th>
            </tr>
          </tfoot>
        </table>
      ) : (
        <p>No expenses recorded today.</p>
      )}

      <div style={{ marginTop: "60px", display: "flex", justifyContent: "space-around" }}>
        <div style={{ borderTop: "1px solid #000", width: "200px", textAlign: "center", paddingTop: "5px" }}>Cashier Signature</div>
        <div style={{ borderTop: "1px solid #000", width: "200px", textAlign: "center", paddingTop: "5px" }}>Manager / Owner Signature</div>
      </div>
    </div>
  );
}
