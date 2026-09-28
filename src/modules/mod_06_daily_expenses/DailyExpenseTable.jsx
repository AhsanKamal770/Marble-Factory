import React, { useState } from "react";
import { Trash2, Search, Filter, AlertCircle, Check, X, Tag } from "lucide-react";
import { EXPENSE_CATEGORIES } from "./dailyExpenseService";
import { useLanguage } from "../../context/LanguageContext";

export default function DailyExpenseTable({ expenses, onDeleteExpense }) {
  const { language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [confirmId, setConfirmId] = useState(null);

  // Filter expenses
  const filteredExpenses = (expenses || []).filter(exp => {
    const matchesCat = categoryFilter === "ALL" || exp.category === categoryFilter;
    const s = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      (exp.paidTo && exp.paidTo.toLowerCase().includes(s)) ||
      (exp.remarks && exp.remarks.toLowerCase().includes(s)) ||
      (exp.category && exp.category.toLowerCase().includes(s)) ||
      (exp.amount && exp.amount.toString().includes(s));
    return matchesCat && matchesSearch;
  });

  const totalFilteredAmount = filteredExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const getCategoryMeta = (catId) => {
    return EXPENSE_CATEGORIES.find(c => c.id === catId) || {
      color: "#64748b",
      ur: catId,
      en: catId
    };
  };

  return (
    <div style={{
      background: "var(--bg-card)",
      borderRadius: "14px",
      border: "1px solid var(--border-color)",
      boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Search & Filter Header Bar */}
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid var(--border-divider)",
        background: "var(--bg-primary)",
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        {/* Search Input */}
        <div style={{ position: "relative", flex: "1 1 200px", maxWidth: "320px" }}>
          <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={language === 'ur' ? "تلاش: نام، تفصیل یا رقم..." : "Search paid to, remarks, amount..."}
            style={{
              width: "100%",
              padding: "7px 10px 7px 32px",
              borderRadius: "7px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              fontSize: "0.82rem",
              outline: "none"
            }}
          />
        </div>

        {/* Category Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Filter size={14} style={{ color: "var(--text-muted)" }} />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{
              padding: "7px 10px",
              borderRadius: "7px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              fontSize: "0.82rem",
              fontWeight: 600,
              outline: "none"
            }}
          >
            <option value="ALL">{language === 'ur' ? "تمام کیٹیگریز (All)" : "All Categories"}</option>
            {EXPENSE_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>
                {language === 'ur' ? c.ur : c.en}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Content */}
      {filteredExpenses.length === 0 ? (
        <div style={{ padding: "48px 20px", textAlign: "center" }}>
          <Tag size={36} style={{ color: "var(--text-muted)", opacity: 0.5, marginBottom: "12px" }} />
          <p style={{ margin: 0, fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            {language === 'ur' ? "اس تاریخ کے لیے کوئی خرچ ریکارڈ نہیں ہوا۔" : "No expenses recorded for this selection."}
          </p>
          <p style={{ margin: "6px 0 0 0", color: "var(--text-muted)", fontSize: "0.82rem" }}>
            {language === 'ur' ? "بائیں طرف موجود فارم سے نیا خرچ درج کریں۔" : "Add a new expense using the form on the left."}
          </p>
        </div>
      ) : (
        <div style={{ maxHeight: "460px", overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--bg-primary)", position: "sticky", top: 0, zIndex: 5, borderBottom: "1px solid var(--border-divider)" }}>
                <th style={{ padding: "10px 16px", color: "var(--text-secondary)", fontWeight: 700, width: "10%" }}>
                  {language === 'ur' ? "وقت" : "Time"}
                </th>
                <th style={{ padding: "10px 16px", color: "var(--text-secondary)", fontWeight: 700, width: "24%" }}>
                  {language === 'ur' ? "کیٹیگری" : "Category"}
                </th>
                <th style={{ padding: "10px 16px", color: "var(--text-secondary)", fontWeight: 700, width: "20%" }}>
                  {language === 'ur' ? "وصول کنندہ" : "Paid To"}
                </th>
                <th style={{ padding: "10px 16px", color: "var(--text-secondary)", fontWeight: 700, width: "24%" }}>
                  {language === 'ur' ? "تفصیل / وجہ" : "Remarks"}
                </th>
                <th style={{ padding: "10px 16px", color: "var(--text-secondary)", fontWeight: 700, width: "14%", textAlign: "right" }}>
                  {language === 'ur' ? "رقم" : "Amount"}
                </th>
                <th style={{ padding: "10px 16px", color: "var(--text-secondary)", fontWeight: 700, width: "8%", textAlign: "center" }}>
                  {language === 'ur' ? "ایکشن" : "Action"}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map(exp => {
                const isConfirming = confirmId === exp.id;
                const meta = getCategoryMeta(exp.category);
                const timeStr = exp.createdAt ? new Date(exp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';

                return (
                  <tr
                    key={exp.id}
                    style={{
                      borderBottom: "1px solid var(--border-divider)",
                      background: isConfirming ? "rgba(239, 68, 68, 0.08)" : "transparent",
                      transition: "background 0.15s ease"
                    }}
                  >
                    {/* Time */}
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontFamily: "monospace", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                      {timeStr}
                    </td>

                    {/* Category Badge */}
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "3px 9px",
                        borderRadius: "6px",
                        fontSize: "0.76rem",
                        fontWeight: 700,
                        background: `${meta.color}18`,
                        color: meta.color,
                        border: `1px solid ${meta.color}33`,
                        whiteSpace: "nowrap"
                      }}>
                        {language === 'ur' ? meta.ur : meta.en}
                      </span>
                    </td>

                    {/* Paid To */}
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {exp.paidTo || "-"}
                    </td>

                    {/* Remarks */}
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      {exp.remarks || "-"}
                    </td>

                    {/* Amount */}
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800, color: "#ef4444", fontSize: "0.92rem", fontFamily: "monospace" }}>
                      Rs. {Number(exp.amount || 0).toLocaleString()}
                    </td>

                    {/* Action */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      {isConfirming ? (
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button
                            onClick={() => { onDeleteExpense(exp.id); setConfirmId(null); }}
                            title="Confirm Delete"
                            style={{
                              background: "#ef4444",
                              border: "none",
                              color: "#fff",
                              borderRadius: "4px",
                              padding: "4px 8px",
                              cursor: "pointer",
                              fontSize: "0.72rem",
                              fontWeight: 700
                            }}
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            title="Cancel"
                            style={{
                              background: "transparent",
                              border: "1px solid var(--border-color)",
                              color: "var(--text-secondary)",
                              borderRadius: "4px",
                              padding: "4px 6px",
                              cursor: "pointer",
                              fontSize: "0.72rem"
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(exp.id)}
                          title={language === 'ur' ? "خرچ حذف کریں" : "Delete Expense"}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            padding: "4px 6px",
                            borderRadius: "4px",
                            transition: "all 0.15s ease"
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                          onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Total Bar */}
      <div style={{
        padding: "12px 20px",
        background: "var(--bg-primary)",
        borderTop: "2px solid var(--border-divider)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>
          {language === 'ur' ? `کل اندراج شدہ اخراجات (${filteredExpenses.length}):` : `Total Recorded Expenses (${filteredExpenses.length}):`}
        </span>
        <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "#ef4444", fontFamily: "monospace" }}>
          Rs. {totalFilteredAmount.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
