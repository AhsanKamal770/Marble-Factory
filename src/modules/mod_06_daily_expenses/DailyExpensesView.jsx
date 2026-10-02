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
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", paddingBottom: "50px" }}>
      
      {/* ── 1. TOP HEADER (Open layout, Card Border Removed, Image smoothly merged into background) ── */}
      <div
        className="no-print"
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          minHeight: "85px",
          padding: "10px 4px 10px 4px",
          overflow: "hidden"
        }}
      >
        {/* Top Right daily_background.png image smoothly merged into page background */}
        <div
          style={{
            position: "absolute",
            right: "-20px",
            top: "-10px",
            bottom: "-10px",
            width: "520px",
            backgroundImage: "url('./daily_background.png')",
            backgroundSize: "cover",
            backgroundPosition: "center right",
            opacity: 0.85,
            maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.2) 20%, rgba(0,0,0,0.8) 60%, black 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.2) 20%, rgba(0,0,0,0.8) 60%, black 100%)",
            pointerEvents: "none",
            zIndex: 1
          }}
        />

        {/* Left: Blue Icon Box + Title + Subtitle */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", zIndex: 2, position: "relative" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
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
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
              {tr("Daily Expenses & Cash Drawer", "روزانہ اخراجات و دراز کیش (روزنامچہ)")}
            </h1>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
              {tr("Manage factory petty expenses, cash recoveries, and live drawer reconciliation.", "فیکٹری کے روزمرہ اخراجات، نقد وصولیاں اور دراز کیش کا مکمل انتظام")}
            </p>
          </div>
        </div>

        {/* Right: Date Picker Controls & Print Action */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", zIndex: 2, position: "relative" }}>
          {/* Today / Yesterday Quick Toggle */}
          <div style={{ display: "flex", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "3px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <button
              type="button"
              onClick={() => setQuickDate("today")}
              style={{
                border: "none",
                background: selectedDate === todayStr ? "#2563eb" : "transparent",
                color: selectedDate === todayStr ? "#fff" : "var(--text-secondary)",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 700,
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
                color: selectedDate !== todayStr ? "#fff" : "var(--text-secondary)",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {tr("Yesterday", "گزشتہ کل")}
            </button>
          </div>

          {/* Date Picker Input */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "6px 12px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
            <Calendar size={15} style={{ color: "var(--accent-blue)" }} />
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
                outline: "none",
                cursor: "pointer"
              }}
            />
          </div>

          {/* Print Roznamcha Button */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleOpenPrintModal("a4")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 700,
              background: "var(--bg-card)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
            }}
          >
            <Printer size={15} style={{ color: "var(--accent-blue)" }} />
            {tr("Print Report", "پرنٹ رپورٹ")}
          </button>
        </div>
      </div>

      {/* ── 2. 4 METRIC KPI CARDS (Clean English-Only Labels, Perfectly Aligned) ── */}
      <div
        className="no-print"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px"
        }}
      >
        {/* KPI 1: Opening Cash */}
        <div
          style={{
            background: "var(--bg-card)",
            padding: "16px 20px",
            borderRadius: "12px",
            border: "1px solid var(--border-color)",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            height: "86px",
            boxSizing: "border-box"
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              minWidth: "46px",
              borderRadius: "12px",
              background: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              flexShrink: 0
            }}
          >
            <Wallet size={22} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
              Opening Cash
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)", marginTop: "2px", lineHeight: 1.2 }}>
              Rs. {Number(cashData?.openingCash || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* KPI 2: Total Cash Inflow */}
        <div
          style={{
            background: "var(--bg-card)",
            padding: "16px 20px",
            borderRadius: "12px",
            border: "1px solid var(--border-color)",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            height: "86px",
            boxSizing: "border-box"
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              minWidth: "46px",
              borderRadius: "12px",
              background: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              flexShrink: 0
            }}
          >
            <ArrowUpRight size={22} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
              Total Inflow (+)
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#10b981", fontFamily: "var(--font-mono)", marginTop: "2px", lineHeight: 1.2 }}>
              + Rs. {Number((cashData?.totalCashInflow || 0) - (cashData?.openingCash || 0)).toLocaleString()}
            </div>
          </div>
        </div>

        {/* KPI 3: Total Expenses Today */}
        <div
          style={{
            background: "var(--bg-card)",
            padding: "16px 20px",
            borderRadius: "12px",
            border: "1px solid var(--border-color)",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            height: "86px",
            boxSizing: "border-box"
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              minWidth: "46px",
              borderRadius: "12px",
              background: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              flexShrink: 0
            }}
          >
            <TrendingDown size={22} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
              Total Expenses (-)
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#ef4444", fontFamily: "var(--font-mono)", marginTop: "2px", lineHeight: 1.2 }}>
              - Rs. {Number(totalExpenseAmount).toLocaleString()}
            </div>
          </div>
        </div>

        {/* KPI 4: Net Live Drawer Cash */}
        <div
          style={{
            background: "var(--bg-card)",
            padding: "16px 20px",
            borderRadius: "12px",
            border: "1px solid var(--border-color)",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            height: "86px",
            boxSizing: "border-box"
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              minWidth: "46px",
              borderRadius: "12px",
              background: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              flexShrink: 0
            }}
          >
            <DollarSign size={22} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
              Net Drawer Cash
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#059669", fontFamily: "var(--font-mono)", marginTop: "2px", lineHeight: 1.2 }}>
              Rs. {Number(cashData?.liveCash || 0).toLocaleString()}
            </div>
          </div>
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
