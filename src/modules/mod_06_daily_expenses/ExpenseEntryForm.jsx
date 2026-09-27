import React, { useState } from "react";
import { Plus } from "lucide-react";

export default function ExpenseEntryForm({ onAddExpense }) {
  const [category, setCategory] = useState("Food/Mess");
  const [amount, setAmount] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [remarks, setRemarks] = useState("");

  const categories = ["Food/Mess", "Petrol/Fuel", "Customer Udhar Advance", "Factory Overhead", "Other"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const expenseData = {
      category,
      amount: Number(amount),
      paidTo,
      remarks
    };

    await onAddExpense(expenseData);

    // reset form
    setAmount("");
    setPaidTo("");
    setRemarks("");
  };

  return (
    <div style={{ background: "var(--bg-card)", padding: "20px", borderRadius: "12px", border: "1px solid var(--border-color)", boxShadow: "var(--shadow-sm)" }}>
      <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 16px 0", color: "var(--text-primary)" }}>
        Add Expense
      </h3>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Category *</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-field"
            style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: "16px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Amount (Rs.) *</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 500"
              required
              className="input-field"
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Paid To</label>
            <input
              type="text"
              value={paidTo}
              onChange={e => setPaidTo(e.target.value)}
              placeholder="e.g. Ali (Driver)"
              className="input-field"
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Remarks</label>
          <input
            type="text"
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Optional details..."
            className="input-field"
            style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: "8px", width: "100%", padding: "10px", justifyContent: "center", fontWeight: 700 }}>
          <Plus size={16} style={{ marginRight: "6px" }} /> Record Expense
        </button>

      </form>
    </div>
  );
}
