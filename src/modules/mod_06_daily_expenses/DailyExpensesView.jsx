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
  Layers,
  Plus
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
  const tr = (en, ur) => (language === "ur" ? ur : en);

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
    <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "1440px", margin: "0 auto", paddingBottom: "30px" }}>
      
      {/* ── 1. SEAMLESS HERO HEADER (Matching Dashboard Template) ── */}
      <div
        className="no-print"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 4px 10px 4px",
          minHeight: "84px",
          overflow: "hidden"
        }}
      >
        {/* Left: Overview Breadcrumb + Title + Subtitle */}
        <div style={{ position: "relative", zIndex: 2 }}>
          <div
            style={{
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#2563eb",
              marginBottom: "4px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>{language === "ur" ? "روزانہ اخراجات و روزنامچہ" : "Cash Flow & Daily Expenses"}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "13px",
                background: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
                flexShrink: 0
              }}
            >
              <Wallet size={24} />
            </div>

            <div>
              <h1
                style={{
                  fontSize: "1.7rem",
                  fontWeight: 800,
                  color: "var(--text-primary, #0f172a)",
                  margin: 0,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2
                }}
              >
                {language === "ur" ? "روزانہ اخراجات و روزنامچہ" : "Daily Expenses & Cash Drawer"}{" "}
                <span
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "var(--text-secondary, #64748b)",
                    fontFamily: "var(--font-urdu, inherit)"
                  }}
                >
                  {language === "ur" ? "" : "(روزنامچہ کیش)"}
                </span>
              </h1>
              <p
                style={{
                  fontSize: "0.86rem",
                  color: "var(--text-secondary, #64748b)",
                  margin: "2px 0 0 0",
                  fontWeight: 500
                }}
              >
                {language === "ur"
                  ? "فیکٹری کے روزمرہ اخراجات، نقد وصولیاں اور دراز کیش کا مکمل انتظام"
                  : "Manage factory petty expenses, cash recoveries, and live drawer reconciliation"}
              </p>
            </div>
          </div>
        </div>

        {/* Seamless Background Image on Header Right using general_background.jpg */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "-15px",
            bottom: "-15px",
            width: "50%",
            maxWidth: "520px",
            backgroundImage: `url('./general_background.jpg'), url('/general_background.jpg'), url('./daily_background.png'), url('/daily_background.png')`,
            backgroundSize: "cover",
            backgroundPosition: "right center",
            maskImage: "linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)",
            WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)",
            pointerEvents: "none",
            opacity: 0.95,
            borderRadius: "14px"
          }}
        />
      </div>

      {/* ── 2. TOP 4 KPI CARDS (Dashboard .kpi-card-grid & .kpi-metric-card) ── */}
      <div className="kpi-card-grid no-print">
        {/* KPI 1: Opening Cash */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon blue">
            <Wallet size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Opening Cash</span>
              <span className="kpi-metric-label-ur">(ابتدائی کیش)</span>
            </div>
            <div className="kpi-metric-value font-mono">
              Rs. {Number(cashData?.openingCash || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* KPI 2: Total Cash Inflow */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon green">
            <ArrowUpRight size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Total Inflow (+)</span>
              <span className="kpi-metric-label-ur">(کل وصولی)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ color: "#059669" }}>
              + Rs. {Number((cashData?.totalCashInflow || 0) - (cashData?.openingCash || 0)).toLocaleString()}
            </div>
          </div>
        </div>

        {/* KPI 3: Total Expenses Today */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon red">
            <TrendingDown size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Daily Expenses (-)</span>
              <span className="kpi-metric-label-ur">(فیکٹری اخراجات)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ color: "#dc2626" }}>
              - Rs. {Number(cashData?.expensesToday || totalExpenseAmount || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* KPI 4: Net Live Drawer Cash */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon purple">
            <DollarSign size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Live Cash in Drawer</span>
              <span className="kpi-metric-label-ur">(دراز کیش)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ color: "#059669" }}>
              Rs. {Number(cashData?.liveCash || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2.5 DATE CONTROLS & PRINT REPORT ACTION CARD ── */}
      <div
        className="no-print"
        style={{
          background: "var(--bg-card, #ffffff)",
          border: "1px solid var(--border-color, #e2e8f0)",
          borderRadius: "14px",
          padding: "12px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}
      >
        {/* Left: Quick Date Switcher & Calendar Picker */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Today / Yesterday Toggle */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-primary, #f1f5f9)",
              border: "1px solid var(--border-color, #e2e8f0)",
              borderRadius: "9px",
              padding: "3px"
            }}
          >
            <button
              type="button"
              onClick={() => setQuickDate("today")}
              style={{
                border: "none",
                background: selectedDate === todayStr ? "#2563eb" : "transparent",
                color: selectedDate === todayStr ? "#ffffff" : "var(--text-secondary, #64748b)",
                padding: "6px 14px",
                borderRadius: "7px",
                fontSize: "0.82rem",
                fontWeight: selectedDate === todayStr ? 800 : 600,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {tr("Today", "آج")}
            </button>
            <button
              type="button"
              onClick={() => setQuickDate("yesterday")}
              style={{
                border: "none",
                background: selectedDate !== todayStr ? "#2563eb" : "transparent",
                color: selectedDate !== todayStr ? "#ffffff" : "var(--text-secondary, #64748b)",
                padding: "6px 14px",
                borderRadius: "7px",
                fontSize: "0.82rem",
                fontWeight: selectedDate !== todayStr ? 800 : 600,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {tr("Yesterday", "گزشتہ کل")}
            </button>
          </div>

          {/* Date Picker Input */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "var(--bg-card, #ffffff)",
              border: "1px solid var(--border-color, #cbd5e1)",
              borderRadius: "9px",
              padding: "6px 12px",
              height: "38px",
              boxSizing: "border-box"
            }}
          >
            <Calendar size={15} style={{ color: "#2563eb" }} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--text-primary, #0f172a)",
                fontSize: "0.84rem",
                fontWeight: 700,
                outline: "none",
                cursor: "pointer"
              }}
            />
          </div>
        </div>

        {/* Right: Print Report Action Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenPrintModal("a4")}
            style={{
              background: "#2563eb",
              borderColor: "#2563eb",
              fontWeight: 700,
              fontSize: "0.84rem",
              padding: "8px 16px",
              borderRadius: "9px",
              display: "flex",
              alignItems: "center",
              gap: "7px",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
              color: "#ffffff",
              cursor: "pointer"
            }}
          >
            <Printer size={15} />
            <span>{tr("Print Report", "پرنٹ رپورٹ")}</span>
          </button>
        </div>
      </div>

      {/* ── 3. CATEGORY SPENDING BREAKDOWN STRIP ── */}
      {Object.keys(categoryStats).length > 0 && (
        <div
          className="no-print"
          style={{
            background: "var(--bg-card)",
            padding: "12px 18px",
            borderRadius: "12px",
            border: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", fontWeight: 800, color: "var(--text-secondary)", marginRight: "6px" }}>
            <Layers size={15} style={{ color: "var(--accent-blue)" }} />
            {tr("Category Breakdown:", "شعبہ جات تقسیم:")}
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
                  padding: "4px 10px",
                  borderRadius: "8px",
                  border: `1px solid ${meta.color}33`,
                  fontSize: "0.78rem"
                }}
              >
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: meta.color }}></span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {language === "ur" ? meta.ur : meta.en}:
                </span>
                <span style={{ fontWeight: 800, color: "#ef4444", fontFamily: "var(--font-mono)" }}>
                  Rs. {Number(amt).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 4. MAIN WORKSPACE: FORM (LEFT) + TABLE (RIGHT) ── */}
      <div
        className="no-print daily-expenses-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(330px, 370px) 1fr",
          gap: "20px",
          alignItems: "stretch"
        }}
      >
        {/* Left Side: Record Expense Form */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <ExpenseEntryForm
            onAddExpense={handleAddExpense}
            selectedDate={selectedDate}
          />
        </div>

        {/* Right Side: Expense List Table */}
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", height: "100%" }}>
          <DailyExpenseTable
            expenses={expenses}
            onDeleteExpense={handleDeleteExpense}
          />
        </div>
      </div>

      {/* ── 5. DAY-END RECONCILIATION & CASH DRAWER AUDIT ── */}
      <div className="no-print">
        <DayEndReconciliationCard
          cashData={cashData}
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
