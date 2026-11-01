import React, { useState, useMemo } from "react";
import { Trash2, Search, Filter, AlertCircle, Check, X, Tag, Edit3, Save } from "lucide-react";
import { EXPENSE_CATEGORIES } from "./dailyExpenseService";
import { useLanguage } from "../../context/LanguageContext";

export default function DailyExpenseTable({ expenses = [], onDeleteExpense, onUpdateExpense }) {
  const { language } = useLanguage();
  const tr = (en, ur) => (language === "ur" ? ur : en);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [confirmId, setConfirmId] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Pagination state
  const [pageSize, setPageSize] = useState(7);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter(exp => {
      const matchesCat = categoryFilter === "ALL" || exp.category === categoryFilter;
      const s = searchTerm.toLowerCase().trim();
      const matchesSearch = !searchTerm || 
        (exp.paidTo && exp.paidTo.toLowerCase().includes(s)) ||
        (exp.remarks && exp.remarks.toLowerCase().includes(s)) ||
        (exp.category && exp.category.toLowerCase().includes(s)) ||
        (exp.amount && exp.amount.toString().includes(s));
      return matchesCat && matchesSearch;
    });
  }, [expenses, categoryFilter, searchTerm]);

  // Reset current page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, pageSize]);

  const totalFilteredAmount = filteredExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredExpenses.length / pageSize) || 1;
  const startIdx = (currentPage - 1) * pageSize;
  const paginatedExpenses = useMemo(() => {
    return filteredExpenses.slice(startIdx, startIdx + pageSize);
  }, [filteredExpenses, startIdx, pageSize]);

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
      boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      minHeight: "380px",
      boxSizing: "border-box"
    }}>
      {/* Search & Filter Header Bar */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--border-color)",
        background: "var(--bg-card)",
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        {/* Search Input */}
        <div style={{ position: "relative", flex: "1 1 180px", maxWidth: "250px" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={tr("Search name, details or amount...", "تلاش: نام، تفصیل یا رقم...")}
            style={{
              width: "100%",
              height: "34px",
              padding: "0 10px 0 30px",
              borderRadius: "7px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.82rem",
              outline: "none",
              boxSizing: "border-box"
            }}
          />
        </div>

        {/* Right Controls: Category Filter & Page Size Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* Category Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <Filter size={13} style={{ color: "var(--text-muted)" }} />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              style={{
                height: "34px",
                padding: "0 8px",
                borderRadius: "7px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "0.8rem",
                fontWeight: 600,
                outline: "none",
                cursor: "pointer",
                boxSizing: "border-box"
              }}
            >
              <option value="ALL">{tr("All Categories", "تمام کیٹیگریز")}</option>
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>
                  {language === "ur" ? c.ur : c.en}
                </option>
              ))}
            </select>
          </div>

          {/* Page Size Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 600 }}>
              {tr("Show:", "تعداد:")}
            </span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              style={{
                height: "34px",
                padding: "0 6px",
                borderRadius: "7px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "0.78rem",
                fontWeight: 600,
                outline: "none",
                cursor: "pointer",
                boxSizing: "border-box"
              }}
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: "260px" }}>
        {filteredExpenses.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <p style={{ margin: 0, fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.92rem" }}>
              {tr("No expenses recorded for this selection.", "کوئی خرچ ریکارڈ نہیں ملا۔")}
            </p>
            <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)", fontSize: "0.8rem" }}>
              {tr("Add a new expense using the form on the left.", "بائیں طرف موجود فارم سے نیا خرچ درج کریں۔")}
            </p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border-color)", position: "sticky", top: 0, zIndex: 2 }}>
                <th style={{ padding: "9px 12px", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", width: "12%" }}>
                  {tr("Time", "وقت")}
                </th>
                <th style={{ padding: "9px 12px", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", width: "22%" }}>
                  {tr("Category", "کیٹیگری")}
                </th>
                <th style={{ padding: "9px 12px", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", width: "20%" }}>
                  {tr("Paid To", "وصول کنندہ")}
                </th>
                <th style={{ padding: "9px 12px", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", width: "24%" }}>
                  {tr("Remarks", "تفصیل")}
                </th>
                <th style={{ padding: "9px 12px", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", width: "14%", textAlign: "right" }}>
                  {tr("Amount", "رقم")}
                </th>
                <th style={{ padding: "9px 12px", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", width: "8%", textAlign: "center" }}>
                  {tr("Action", "ایکشن")}
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedExpenses.map(exp => {
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
                    <td style={{ padding: "9px 12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                      {timeStr}
                    </td>

                    {/* Category Badge */}
                    <td style={{ padding: "9px 12px" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "2px 7px",
                        borderRadius: "5px",
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        background: `${meta.color}18`,
                        color: meta.color,
                        border: `1px solid ${meta.color}33`,
                        whiteSpace: "nowrap"
                      }}>
                        {language === "ur" ? meta.ur : meta.en}
                      </span>
                    </td>

                    {/* Paid To */}
                    <td style={{ padding: "9px 12px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {exp.paidTo || "-"}
                    </td>

                    {/* Remarks */}
                    <td style={{ padding: "9px 12px", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                      {exp.remarks || "-"}
                    </td>

                    {/* Amount */}
                    <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 800, color: "#ef4444", fontSize: "0.88rem", fontFamily: "var(--font-mono)" }}>
                      Rs. {Number(exp.amount || 0).toLocaleString()}
                    </td>

                    {/* Action */}
                    <td style={{ padding: "9px 12px", textAlign: "center" }}>
                      {isConfirming ? (
                        <div style={{ display: "flex", gap: "5px", justifyContent: "center" }}>
                          <button
                            onClick={() => { onDeleteExpense(exp.id); setConfirmId(null); }}
                            title="Confirm Delete"
                            style={{
                              background: "#ef4444",
                              border: "none",
                              color: "#fff",
                              borderRadius: "4px",
                              padding: "3px 6px",
                              cursor: "pointer",
                              fontSize: "0.7rem",
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
                              padding: "3px 5px",
                              cursor: "pointer",
                              fontSize: "0.7rem"
                            }}
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button
                            onClick={() => setEditingExpense({ ...exp })}
                            title={tr("Edit Expense", "خرچ تبدیل کریں")}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--text-muted)",
                              cursor: "pointer",
                              padding: "3px 5px",
                              borderRadius: "4px",
                              transition: "all 0.15s ease"
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = "#2563eb"}
                            onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmId(exp.id)}
                            title={tr("Delete Expense", "خرچ حذف کریں")}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--text-muted)",
                              cursor: "pointer",
                              padding: "3px 5px",
                              borderRadius: "4px",
                              transition: "all 0.15s ease"
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                            onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Table Footer with Total & Pagination Controls (Always Visible) */}
      <div style={{
        padding: "12px 18px",
        background: "var(--bg-primary)",
        borderTop: "1px solid var(--border-color)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "10px"
      }}>
        {/* Left: Record Count / Showing Info */}
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>
          {filteredExpenses.length === 0
            ? tr("Showing 0 records", "کوئی ریکارڈ نہیں")
            : tr(
                `Showing ${startIdx + 1} to ${Math.min(startIdx + pageSize, filteredExpenses.length)} of ${filteredExpenses.length} records`,
                `${filteredExpenses.length} میں سے ${startIdx + 1} تا ${Math.min(startIdx + pageSize, filteredExpenses.length)} ریکارڈ`
              )}
        </div>

        {/* Center/Right: Total Amount & Pagination Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Total Badge */}
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)" }}>
            {tr("Total:", "کل رقم:")}{" "}
            <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#ef4444", fontFamily: "var(--font-mono)" }}>
              Rs. {totalFilteredAmount.toLocaleString()}
            </span>
          </div>

          {/* Pagination Navigation Buttons (Always visible matching Bills & Invoices) */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-card)",
                color: currentPage === 1 ? "var(--text-muted)" : "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                opacity: currentPage === 1 ? 0.45 : 1,
                fontSize: "0.85rem",
                fontWeight: 600
              }}
            >
              &lt;
            </button>

            {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).map(p => {
              const isActive = currentPage === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "6px",
                    border: isActive ? "1px solid #2563eb" : "1px solid var(--border-color)",
                    background: isActive ? "#2563eb" : "var(--bg-card)",
                    color: isActive ? "#ffffff" : "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    fontWeight: isActive ? 700 : 500
                  }}
                >
                  {p}
                </button>
              );
            })}

            <button
              type="button"
              disabled={currentPage === totalPages || totalPages <= 1}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-card)",
                color: (currentPage === totalPages || totalPages <= 1) ? "var(--text-muted)" : "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: (currentPage === totalPages || totalPages <= 1) ? "not-allowed" : "pointer",
                opacity: (currentPage === totalPages || totalPages <= 1) ? 0.45 : 1,
                fontSize: "0.85rem",
                fontWeight: 600
              }}
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }} onClick={() => setEditingExpense(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-card, #ffffff)", borderRadius: "14px", border: "1px solid var(--border-color, #e2e8f0)", width: "90%", maxWidth: "440px", padding: "20px", boxShadow: "0 12px 30px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid var(--border-color, #f1f5f9)", paddingBottom: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "var(--text-primary, #0f172a)" }}>
                {tr("Edit Expense Entry", "خرچ میں ترمیم کریں")}
              </h3>
              <button type="button" onClick={() => setEditingExpense(null)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem", padding: "2px 6px" }}>✕</button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (onUpdateExpense && editingExpense) {
                setIsSavingEdit(true);
                try {
                  await onUpdateExpense(editingExpense.id, editingExpense);
                  setEditingExpense(null);
                } catch (err) {
                  alert("Error updating expense: " + err.message);
                } finally {
                  setIsSavingEdit(false);
                }
              }
            }} style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.82rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "3px" }}>
                  {tr("Category", "کیٹیگری")}
                </label>
                <select
                  value={editingExpense.category}
                  onChange={e => setEditingExpense({ ...editingExpense, category: e.target.value })}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--border-color, #cbd5e1)", background: "var(--bg-primary, #f8fafc)", color: "var(--text-primary)" }}
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{language === "ur" ? cat.ur : cat.en}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "3px" }}>
                  {tr("Amount (Rs.)", "رقم (روپے)")}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editingExpense.amount}
                  onChange={e => setEditingExpense({ ...editingExpense, amount: Number(e.target.value) })}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--border-color, #cbd5e1)", background: "var(--bg-primary, #f8fafc)", color: "#ef4444", fontWeight: 800, fontFamily: "var(--font-mono)" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "3px" }}>
                  {tr("Paid To", "وصول کنندہ")}
                </label>
                <input
                  type="text"
                  value={editingExpense.paidTo || ""}
                  onChange={e => setEditingExpense({ ...editingExpense, paidTo: e.target.value })}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--border-color, #cbd5e1)", background: "var(--bg-primary, #f8fafc)", color: "var(--text-primary)" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "3px" }}>
                  {tr("Remarks / Details", "تفصیل")}
                </label>
                <input
                  type="text"
                  value={editingExpense.remarks || ""}
                  onChange={e => setEditingExpense({ ...editingExpense, remarks: e.target.value })}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--border-color, #cbd5e1)", background: "var(--bg-primary, #f8fafc)", color: "var(--text-primary)" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "3px" }}>
                  {tr("Payment Mode", "طریقہ ادائیگی")}
                </label>
                <select
                  value={editingExpense.paymentMethod || "Cash"}
                  onChange={e => setEditingExpense({ ...editingExpense, paymentMethod: e.target.value })}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--border-color, #cbd5e1)", background: "var(--bg-primary, #f8fafc)", color: "var(--text-primary)" }}
                >
                  <option value="Cash">Cash (کیش دراز)</option>
                  <option value="Bank">Bank (بینک ٹرانسفر)</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px", borderTop: "1px solid var(--border-color, #f1f5f9)", paddingTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid var(--border-color, #cbd5e1)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 600 }}
                >
                  {tr("Cancel", "منسوخ")}
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  style={{ padding: "6px 16px", borderRadius: "6px", border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Save size={14} />
                  {isSavingEdit ? tr("Saving...", "محفوظ...") : tr("Save Changes", "تبدیلی محفوظ کریں")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


