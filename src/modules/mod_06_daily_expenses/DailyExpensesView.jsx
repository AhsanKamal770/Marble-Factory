import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Printer,
  DollarSign,
  TrendingDown,
  FileSpreadsheet,
  PieChart,
  Layers
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

  // Category breakdown
  const categoryStats = cashData?.categoryTotals || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", paddingBottom: "50px" }}>
      
      {/* ── TOP HEADER WITH DATE PICKER & ACTIONS ── */}
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          paddingBottom: "20px",
          borderBottom: "1px solid var(--border-divider)",
          marginBottom: "24px"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
              {language === 'ur' ? "روزانہ اخراجات و دراز کیش (روزنامچہ)" : "Daily Expenses & Cash Drawer (Roznamcha)"}
            </h1>
            <span style={{
              background: "rgba(239, 68, 68, 0.12)",
              color: "#ef4444",
              fontSize: "0.75rem",
              fontWeight: 800,
              padding: "4px 8px",
              borderRadius: "6px"
            }}>
              Live Roznamcha
            </span>
          </div>
          <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
            {language === 'ur'
              ? "فیکٹری کے روزمرہ اخراجات، نقد سیلز اور دراز کے لائیو کیش کا مکمل انتظام"
              : "Manage daily factory petty expenses, cash recoveries, and live drawer reconciliation."}
          </p>
        </div>

        {/* Date Selector & Quick Toggles */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "3px" }}>
            <button
              onClick={() => setQuickDate("today")}
              style={{
                border: "none",
                background: selectedDate === todayStr ? "var(--accent-primary)" : "transparent",
                color: selectedDate === todayStr ? "#fff" : "var(--text-secondary)",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {language === 'ur' ? "آج (Today)" : "Today"}
            </button>
            <button
              onClick={() => setQuickDate("yesterday")}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--text-secondary)",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              {language === 'ur' ? "گزشتہ کل (Yesterday)" : "Yesterday"}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "6px 10px" }}>
            <Calendar size={15} style={{ color: "var(--text-muted)" }} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                fontWeight: 700,
                outline: "none"
              }}
            />
          </div>

          <button
            onClick={() => handleOpenPrintModal("a4")}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer"
            }}
          >
            <Printer size={16} />
            {language === 'ur' ? "روزنامچہ پرنٹ" : "Print Report"}
          </button>
        </div>
      </div>

      {/* ── 4 PRIMARY KPI METRIC CARDS ── */}
      <div
        className="no-print"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px"
        }}
      >
        {/* KPI 1: Opening Cash */}
        <div style={{
          background: "var(--bg-card)",
          padding: "16px 20px",
          borderRadius: "12px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 700 }}>
            <span>{language === 'ur' ? "صبح کا اوپننگ کیش" : "Opening Cash Balance"}</span>
            <Wallet size={16} style={{ color: "var(--text-secondary)" }} />
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "6px", fontFamily: "monospace" }}>
            Rs. {Number(cashData?.openingCash || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
            {language === 'ur' ? "فیکٹری ترتیبات سے مقرر" : "Base drawer start"}
          </div>
        </div>

        {/* KPI 2: Total Cash Inflow */}
        <div style={{
          background: "var(--bg-card)",
          padding: "16px 20px",
          borderRadius: "12px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#10b981", fontSize: "0.8rem", fontWeight: 700 }}>
            <span>{language === 'ur' ? "آج کی کل کیش آمد (+)" : "Cash Inflow (+)"}</span>
            <ArrowUpRight size={16} />
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#10b981", marginTop: "6px", fontFamily: "monospace" }}>
            + Rs. {Number(cashData?.totalCashInflow - (cashData?.openingCash || 0) || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Sales: Rs. {Number(cashData?.cashSalesToday || 0).toLocaleString()} | Wasooli: Rs. {Number(cashData?.wasooliToday || 0).toLocaleString()}
          </div>
        </div>

        {/* KPI 3: Total Expenses Today */}
        <div style={{
          background: "var(--bg-card)",
          padding: "16px 20px",
          borderRadius: "12px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#ef4444", fontSize: "0.8rem", fontWeight: 700 }}>
            <span>{language === 'ur' ? "آج کے کل اخراجات (-)" : "Daily Expenses (-)"}</span>
            <TrendingDown size={16} />
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#ef4444", marginTop: "6px", fontFamily: "monospace" }}>
            - Rs. {Number(totalExpenseAmount).toLocaleString()}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
            {expenses.length} {language === 'ur' ? "مدات میں خرچ" : "recorded expense entries"}
          </div>
        </div>

        {/* KPI 4: Live Cash in Drawer */}
        <div style={{
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.05) 100%)",
          padding: "16px 20px",
          borderRadius: "12px",
          border: "2px solid #10b981",
          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.1)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#065f46", fontSize: "0.8rem", fontWeight: 800 }}>
            <span>{language === 'ur' ? "دراز میں موجودہ لائیو کیش" : "NET LIVE DRAWER CASH"}</span>
            <Wallet size={16} style={{ color: "#10b981" }} />
          </div>
          <div style={{ fontSize: "1.55rem", fontWeight: 900, color: "#059669", marginTop: "6px", fontFamily: "monospace" }}>
            Rs. {Number(cashData?.liveCash || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#065f46", marginTop: "4px", fontWeight: 600 }}>
            {language === 'ur' ? "فوری نقد دراز کیش" : "Expected in hand right now"}
          </div>
        </div>
      </div>

      {/* ── CATEGORY SPENDING BREAKDOWN STRIP ── */}
      {Object.keys(categoryStats).length > 0 && (
        <div
          className="no-print"
          style={{
            background: "var(--bg-card)",
            padding: "14px 18px",
            borderRadius: "12px",
            border: "1px solid var(--border-color)",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", fontWeight: 800, color: "var(--text-secondary)", marginRight: "6px" }}>
            <Layers size={15} />
            {language === 'ur' ? "شعبہ جات تقسیم:" : "Category Breakdown:"}
          </div>
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
                  padding: "5px 10px",
                  borderRadius: "8px",
                  border: `1px solid ${meta.color}33`,
                  fontSize: "0.78rem"
                }}
              >
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: meta.color }}></span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {language === 'ur' ? meta.ur : meta.en}:
                </span>
                <span style={{ fontWeight: 800, color: "#ef4444", fontFamily: "monospace" }}>
                  Rs. {Number(amt).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MAIN WORKSPACE: FORM (LEFT) + TABLE (RIGHT) ── */}
      <div
        className="no-print"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "24px",
          alignItems: "start",
          marginBottom: "32px"
        }}
      >
        {/* Left Side: Record Expense Form */}
        <div style={{ flex: "1 1 340px" }}>
          <ExpenseEntryForm
            onAddExpense={handleAddExpense}
            selectedDate={selectedDate}
          />
        </div>

        {/* Right Side: Expense List Table */}
        <div style={{ flex: "2 1 500px" }}>
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
