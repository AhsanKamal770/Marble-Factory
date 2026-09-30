import React, { useState } from "react";
import { Trash2, Search, Filter, AlertCircle, Check, X, Tag, Clock, Receipt, User, ArrowDown } from "lucide-react";
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
      borderRadius: "16px",
      border: "1px solid var(--border-color)",
      boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Search & Filter Header Bar */}
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid var(--border-divider)",
        background: "var(--bg-card)",
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        {/* Search Input */}
        <div style={{ position: "relative", flex: "1 1 200px", maxWidth: "340px" }}>
          <Search size={14} style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={language === 'ur' ? "تلاش: نام، تفصیل یا رقم..." : "Search paid to, remarks, amount..."}
            style={{
              width: "100%",
              padding: "7px 10px 7px 32px",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.80rem",
              outline: "none"
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)"
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Category Filter & Count Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Filter size={13} style={{ color: "var(--text-muted)" }} />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "0.80rem",
                fontWeight: 600,
                outline: "none",
                cursor: "pointer"
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

          <span style={{
            fontSize: "0.72rem",
            fontWeight: 800,
            padding: "4px 8px",
            borderRadius: "6px",
            background: "var(--bg-primary)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-color)"
          }}>
            {filteredExpenses.length} {language === 'ur' ? "اندراجات" : "items"}
          </span>
        </div>
      </div>

      {/* Table Content */}
      {filteredExpenses.length === 0 ? (
        <div style={{ padding: "50px 20px", textAlign: "center" }}>
          <div style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            background: "var(--bg-primary)",
            color: "var(--text-muted)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "12px"
          }}>
            <Receipt size={26} />
          </div>
          <h4 style={{ margin: 0, fontWeight: 800, color: "var(--text-primary)", fontSize: "0.95rem" }}>
            {language === 'ur' ? "اس تاریخ کے لیے کوئی خرچ ریکارڈ نہیں ہوا۔" : "No expenses recorded for this date"}
          </h4>
          <p style={{ margin: "5px 0 0 0", color: "var(--text-muted)", fontSize: "0.78rem" }}>
            {language === 'ur' ? "بائیں طرف موجود فارم سے نیا خرچ درج کریں۔" : "Use the form on the left to record daily factory cash expenses."}
          </p>
        </div>
      ) : (
        <div style={{ maxHeight: "430px", overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
            <thead>
              <tr style={{
                background: "var(--bg-primary)",
                position: "sticky",
                top: 0,
                zIndex: 5,
                borderBottom: "1px solid var(--border-divider)"
              }}>
                <th style={{ padding: "10px 14px", color: "var(--text-secondary)", fontWeight: 700, width: "11%", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {language === 'ur' ? "وقت" : "Time"}
                </th>
                <th style={{ padding: "10px 14px", color: "var(--text-secondary)", fontWeight: 700, width: "23%", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {language === 'ur' ? "کیٹیگری" : "Category"}
                </th>
                <th style={{ padding: "10px 14px", color: "var(--text-secondary)", fontWeight: 700, width: "20%", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {language === 'ur' ? "وصول کنندہ" : "Paid To"}
                </th>
                <th style={{ padding: "10px 14px", color: "var(--text-secondary)", fontWeight: 700, width: "24%", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {language === 'ur' ? "تفصیل" : "Remarks"}
                </th>
                <th style={{ padding: "10px 14px", color: "var(--text-secondary)", fontWeight: 700, width: "14%", textAlign: "right", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {language === 'ur' ? "رقم" : "Amount"}
                </th>
                <th style={{ padding: "10px 14px", color: "var(--text-secondary)", fontWeight: 700, width: "8%", textAlign: "center", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {language === 'ur' ? "عمل" : "Action"}
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
                    onMouseOver={(e) => {
                      if (!isConfirming) e.currentTarget.style.background = "var(--bg-primary)";
                    }}
                    onMouseOut={(e) => {
                      if (!isConfirming) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {/* Time */}
                    <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={11} style={{ opacity: 0.6 }} />
                        <span>{timeStr}</span>
                      </div>
                    </td>

                    {/* Category Pill */}
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: `${meta.color}15`,
                        color: meta.color,
                        fontWeight: 700,
                        fontSize: "0.74rem",
                        border: `1px solid ${meta.color}33`
                      }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: meta.color }}></span>
                        {language === 'ur' ? meta.ur : meta.en}
                      </span>
                    </td>

                    {/* Paid To */}
                    <td style={{ padding: "10px 14px", color: "var(--text-primary)", fontWeight: 600 }}>
                      {exp.paidTo ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <User size={12} style={{ color: "var(--text-muted)" }} />
                          <span>{exp.paidTo}</span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>-</span>
                      )}
                    </td>

                    {/* Remarks */}
                    <td style={{ padding: "10px 14px", color: "var(--text-secondary)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {exp.remarks || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>-</span>}
                    </td>

                    {/* Amount */}
                    <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800, color: "#ef4444", fontSize: "0.86rem", whiteSpace: "nowrap" }}>
                      - Rs. {Number(exp.amount || 0).toLocaleString()}
                    </td>

                    {/* Action */}
                    <td style={{ padding: "10px 14px", textAlign: "center" }}>
                      {isConfirming ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteExpense(exp.id);
                              setConfirmId(null);
                            }}
                            title="Confirm Delete"
                            style={{
                              border: "none",
                              background: "#ef4444",
                              color: "#fff",
                              borderRadius: "4px",
                              padding: "3px 6px",
                              cursor: "pointer",
                              fontSize: "0.70rem",
                              fontWeight: 700
                            }}
                          >
                            <Check size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmId(null)}
                            title="Cancel"
                            style={{
                              border: "1px solid var(--border-color)",
                              background: "var(--bg-card)",
                              color: "var(--text-secondary)",
                              borderRadius: "4px",
                              padding: "3px 6px",
                              cursor: "pointer",
                              fontSize: "0.70rem"
                            }}
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmId(exp.id)}
                          title={language === 'ur' ? "حذف کریں" : "Delete Expense"}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            padding: "4px",
                            borderRadius: "6px",
                            transition: "all 0.15s ease"
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.color = "#ef4444";
                            e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.color = "var(--text-muted)";
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <Trash2 size={14} />
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

      {/* Summary Footer */}
      {filteredExpenses.length > 0 && (
        <div style={{
          padding: "12px 18px",
          borderTop: "1px solid var(--border-divider)",
          background: "var(--bg-primary)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.82rem"
        }}>
          <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
            {language === 'ur' ? `کل اخراجات (${filteredExpenses.length} اندراجات):` : `Total Filtered (${filteredExpenses.length} entries):`}
          </span>
          <span style={{ fontWeight: 900, color: "#ef4444", fontSize: "1.02rem" }}>
            Rs. {totalFilteredAmount.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
