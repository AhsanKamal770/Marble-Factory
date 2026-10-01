import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Wallet,
  ArrowUpRight,
  Calendar,
  Printer,
  DollarSign,
  TrendingDown,
  Layers,
  Sparkles,
  Clock,
  Coins
} from "lucide-react";
import ExpenseEntryForm from "./ExpenseEntryForm";
import DailyExpenseTable from "./DailyExpenseTable";
import DayEndReconciliationCard from "./DayEndReconciliationCard";
import PrintableDayClosingSheet from "./PrintableDayClosingSheet";
import {
  addExpense,
  deleteExpense,
  getLiveCashInDrawer,
  EXPENSE_CATEGORIES
} from "./dailyExpenseService";
import { db } from "../../db";
import { useLanguage } from "../../context/LanguageContext";

export default function DailyExpensesView() {
  const { language } = useLanguage();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printFormat, setPrintFormat] = useState("a4");

  // Live Query: Fetch factory settings
  const settings = useLiveQuery(async () => {
    const list = await db.settings.toArray();
    return list[0] || { companyName: "Rana Shahab Marble Factory", openingCashBalance: 0 };
  }, []);

  // Live Query: Fetch expenses for selected date
  const expenses = useLiveQuery(
    async () => {
      const allExp = await db.daily_expenses.toArray();
      return allExp
        .filter(e => (e.date || e.createdAt || '').slice(0, 10) === selectedDate)
        .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
    },
    [selectedDate]
  ) || [];

  // Live Query: Compute live cash drawer / Roznamcha metrics for selected date
  const cashData = useLiveQuery(
    async () => {
      return await getLiveCashInDrawer(selectedDate);
    },
    [selectedDate]
  );

  const handleAddExpense = async (data) => {
    try {
      await addExpense(data);
    } catch (err) {
      alert("Failed to record expense: " + err.message);
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await deleteExpense(id);
    } catch (err) {
      alert("Failed to delete expense: " + err.message);
    }
  };

  const handleOpenPrintModal = (format = "a4") => {
    setPrintFormat(format);
    setIsPrintModalOpen(true);
  };

  // Helper for quick date jumps
  const setQuickDate = (type) => {
    const d = new Date();
    if (type === "yesterday") {
      d.setDate(d.getDate() - 1);
    }
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const categoryStats = cashData?.categoryTotals || {};

  const openingCash = Number(cashData?.openingCash || 0);
  const cashSalesToday = Number(cashData?.cashSalesToday || 0);
  const wasooliToday = Number(cashData?.wasooliToday || 0);
  const netInflowToday = (Number(cashData?.totalCashInflow || 0) - openingCash);
  const liveCash = Number(cashData?.liveCash || 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", paddingBottom: "60px" }}>
      
      {/* ── TOP HEADER WITH CONTROLS (DASHBOARD-STYLE HERO BAR) ── */}
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          paddingBottom: "18px",
          borderBottom: "1px solid var(--border-divider)"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <h1 style={{
              fontSize: "1.45rem",
              fontWeight: 900,
              color: "var(--text-primary)",
              margin: 0,
              letterSpacing: "-0.02em"
            }}>
              {language === 'ur' ? "روزانہ اخراجات و دراز کیش (روزنامچہ)" : "Daily Expenses & Cash Drawer (Roznamcha)"}
            </h1>
            <span style={{
              background: "rgba(37, 99, 235, 0.1)",
              color: "var(--accent-primary, #2563eb)",
              fontSize: "0.72rem",
              fontWeight: 800,
              padding: "4px 10px",
              borderRadius: "20px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              border: "1px solid rgba(37, 99, 235, 0.2)"
            }}>
              <Sparkles size={12} />
              {language === 'ur' ? "لائیو روزنامچہ" : "Live Roznamcha"}
            </span>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
            {language === 'ur'
              ? "فیکٹری کے روزمرہ اخراجات، نقد سیلز اور دراز کے لائیو کیش کا مکمل انتظام"
              : "Manage daily factory petty expenses, cash recoveries, and live drawer reconciliation."}
          </p>
        </div>

        {/* Date Selector & Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          
          {/* Segmented Quick Date Pills */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "10px",
            padding: "3px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
          }}>
            <button
              type="button"
              onClick={() => setQuickDate("today")}
              style={{
                border: "none",
                background: selectedDate === todayStr ? "var(--accent-primary, #2563eb)" : "transparent",
                color: selectedDate === todayStr ? "#ffffff" : "var(--text-secondary)",
                padding: "6px 14px",
                borderRadius: "7px",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {language === 'ur' ? "آج" : "Today"}
            </button>
            <button
              type="button"
              onClick={() => setQuickDate("yesterday")}
              style={{
                border: "none",
                background: selectedDate !== todayStr ? "var(--accent-primary, #2563eb)" : "transparent",
                color: selectedDate !== todayStr ? "#ffffff" : "var(--text-secondary)",
                padding: "6px 14px",
                borderRadius: "7px",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {language === 'ur' ? "گزشتہ کل" : "Yesterday"}
            </button>
          </div>

          {/* Date Picker Input */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "10px",
            padding: "6px 12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
          }}>
            <Calendar size={15} style={{ color: "var(--text-secondary)" }} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--text-primary)",
                fontSize: "0.82rem",
                fontWeight: 700,
                outline: "none",
                cursor: "pointer",
                fontFamily: "inherit"
              }}
            />
          </div>

          {/* Print Roznamcha Button */}
          <button
            type="button"
            onClick={() => handleOpenPrintModal("a4")}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              padding: "7px 14px",
              borderRadius: "10px",
              fontSize: "0.82rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              transition: "all 0.18s ease"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-primary, #2563eb)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = "var(--border-color)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <Printer size={15} style={{ color: "var(--accent-primary, #2563eb)" }} />
            <span>{language === 'ur' ? "روزنامچہ پرنٹ" : "Print Report"}</span>
          </button>
        </div>
      </div>

      {/* ── 4 KEY KPI STAT CARDS (UNIFIED DASHBOARD METRIC CARDS) ── */}
      <div className="no-print kpi-cards-grid">
        
        {/* KPI 1: Opening Cash */}
        <div className="kpi-stat-card">
          <div style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            background: "#2563eb",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)"
          }}>
            <Wallet size={18} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600, lineHeight: 1.2 }}>
              {language === 'ur' ? "صبح کا اوپننگ کیش" : "OPENING CASH"}
            </span>
            <span style={{
              fontSize: "1.20rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
              margin: "2px 0",
              lineHeight: 1.2,
              letterSpacing: "-0.02em"
            }}>
              Rs. {openingCash.toLocaleString()}
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {language === 'ur' ? "فیکٹری دراز کی بنیاد" : "Base drawer start"}
            </span>
          </div>
        </div>

        {/* KPI 2: Cash Inflow */}
        <div className="kpi-stat-card">
          <div style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            background: "#10b981",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)"
          }}>
            <ArrowUpRight size={18} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600, lineHeight: 1.2 }}>
              {language === 'ur' ? "کل کیش آمد (+)" : "CASH INFLOW (+)"}
            </span>
            <span style={{
              fontSize: "1.20rem",
              fontWeight: 800,
              color: "#10b981",
              whiteSpace: "nowrap",
              margin: "2px 0",
              lineHeight: 1.2,
              letterSpacing: "-0.02em"
            }}>
              + Rs. {netInflowToday.toLocaleString()}
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Sales: {cashSalesToday.toLocaleString()} | Wasooli: {wasooliToday.toLocaleString()}
            </span>
          </div>
        </div>

        {/* KPI 3: Daily Expenses */}
        <div className="kpi-stat-card">
          <div style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            background: "#ef4444",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(239, 68, 68, 0.25)"
          }}>
            <TrendingDown size={18} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600, lineHeight: 1.2 }}>
              {language === 'ur' ? "آج کے کل اخراجات (-)" : "DAILY EXPENSES (-)"}
            </span>
            <span style={{
              fontSize: "1.20rem",
              fontWeight: 800,
              color: "#ef4444",
              whiteSpace: "nowrap",
              margin: "2px 0",
              lineHeight: 1.2,
              letterSpacing: "-0.02em"
            }}>
              - Rs. {totalExpenseAmount.toLocaleString()}
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {expenses.length} {language === 'ur' ? "مدات میں خرچ" : "recorded entries"}
            </span>
          </div>
        </div>

        {/* KPI 4: Live Cash in Drawer */}
        <div className="kpi-stat-card" style={{
          border: "1.5px solid rgba(16, 185, 129, 0.4)",
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, var(--bg-card) 100%)"
        }}>
          <div style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            background: "#059669",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)"
          }}>
            <Coins size={18} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: "0.78rem", color: "#065f46", fontWeight: 700, lineHeight: 1.2 }}>
              {language === 'ur' ? "دراز میں موجودہ کیش" : "NET LIVE DRAWER CASH"}
            </span>
            <span style={{
              fontSize: "1.25rem",
              fontWeight: 900,
              color: "#059669",
              whiteSpace: "nowrap",
              margin: "2px 0",
              lineHeight: 1.2,
              letterSpacing: "-0.02em"
            }}>
              Rs. {liveCash.toLocaleString()}
            </span>
            <span style={{ fontSize: "0.72rem", color: "#047857", fontWeight: 600 }}>
              {language === 'ur' ? "فوری نقد دراز کیش" : "Expected in hand right now"}
            </span>
          </div>
        </div>

      </div>

      {/* ── CATEGORY SPENDING BREAKDOWN STRIP ── */}
      {Object.keys(categoryStats).length > 0 && (
        <div
          className="no-print"
          style={{
            background: "var(--bg-card)",
            padding: "12px 16px",
            borderRadius: "14px",
            border: "1px solid var(--border-color)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap"
          }}
        >
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.78rem",
            fontWeight: 800,
            color: "var(--text-secondary)",
            marginRight: "4px"
          }}>
            <Layers size={15} style={{ color: "var(--accent-primary, #2563eb)" }} />
            <span>{language === 'ur' ? "شعبہ جات تقسیم:" : "Category Breakdown:"}</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {Object.entries(categoryStats).map(([catName, amt]) => {
              const meta = EXPENSE_CATEGORIES.find(c => c.id === catName) || { color: "#64748b", ur: catName, en: catName };
              return (
                <div
                  key={catName}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "var(--bg-primary)",
                    padding: "4px 10px",
                    borderRadius: "8px",
                    border: `1px solid ${meta.color}33`,
                    fontSize: "0.76rem"
                  }}
                >
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: meta.color, flexShrink: 0 }}></span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {language === 'ur' ? meta.ur : meta.en}:
                  </span>
                  <span style={{ fontWeight: 800, color: "#ef4444" }}>
                    Rs. {Number(amt).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MAIN WORKSPACE: FORM (LEFT) + TABLE (RIGHT) ── */}
      <div
        className="no-print"
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1.9fr",
          gap: "20px",
          alignItems: "start"
        }}
      >
        {/* Left Column: Record Expense Form */}
        <div>
          <ExpenseEntryForm
            onAddExpense={handleAddExpense}
            selectedDate={selectedDate}
          />
        </div>

        {/* Right Column: Daily Expense Table */}
        <div>
          <DailyExpenseTable
            expenses={expenses}
            onDeleteExpense={handleDeleteExpense}
          />
        </div>
      </div>

      {/* ── DAY-END RECONCILIATION & CASH DRAWER AUDIT ── */}
      <div className="no-print">
        <DayEndReconciliationCard
          cashData={cashData}
          onPrintThermal={() => handleOpenPrintModal("thermal")}
          onPrintA4={() => handleOpenPrintModal("a4")}
        />
      </div>

      {/* ── PRINT MODAL (A4 & 80mm Thermal Replica) ── */}
      <PrintableDayClosingSheet
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        cashData={cashData}
        expenses={expenses}
        factorySettings={settings}
        defaultFormat={printFormat}
      />

    </div>
  );
}
