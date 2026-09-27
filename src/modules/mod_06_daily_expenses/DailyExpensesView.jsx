import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Printer } from "lucide-react";
import ExpenseEntryForm from "./ExpenseEntryForm";
import DailyExpenseTable from "./DailyExpenseTable";
import DayEndReconciliationCard from "./DayEndReconciliationCard";
import PrintableDayClosingSheet from "./PrintableDayClosingSheet";
import { addExpense, deleteExpense, getLiveCashInDrawer } from "./dailyExpenseService";
import { db } from "../../db";

export default function DailyExpensesView() {
  const [cashData, setCashData] = useState(null);

  // Use dexie-react-hooks to automatically reload expenses when db changes
  const expenses = useLiveQuery(
    async () => {
      const targetDate = new Date().toISOString().slice(0, 10);
      const allExp = await db.daily_expenses.orderBy('date').reverse().toArray();
      return allExp.filter(e => (e.date || e.createdAt || '').slice(0, 10) === targetDate);
    },
    []
  );

  // We also want live updates for cash drawer when invoices, payments or expenses change
  const liveDrawerDependencies = useLiveQuery(() => db.invoices.count() + db.customer_payments.count() + db.daily_expenses.count(), []);

  useEffect(() => {
    loadCashData();
  }, [liveDrawerDependencies]);

  const loadCashData = async () => {
    const data = await getLiveCashInDrawer();
    setCashData(data);
  };

  const handleAddExpense = async (data) => {
    try {
      await addExpense(data);
      // dexie-react-hooks will automatically reload the lists
    } catch (err) {
      alert("Failed to add expense: " + err.message);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      try {
        await deleteExpense(id);
      } catch (err) {
        alert("Failed to delete expense: " + err.message);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", paddingBottom: "40px" }}>
      {/* ── PAGE HEADER ── */}
      <div style={{ paddingBottom: "24px" }} className="no-print">
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", lineHeight: 1, margin: 0 }}>
          Daily Expenses & Cash Drawer
        </h1>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "8px", fontWeight: 500, lineHeight: 1 }}>
          Manage factory expenses and reconcile the Roznamcha.
        </p>
      </div>

      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", marginBottom: "32px", flexWrap: "wrap" }} className="no-print">

        {/* Left Column: Form */}
        <div style={{ flex: "1 1 320px", maxWidth: "35%", minWidth: "300px" }}>
          <ExpenseEntryForm onAddExpense={handleAddExpense} />
        </div>

        {/* Right Column: Today's Expense List */}
        <div style={{ flex: "1 1 500px", minWidth: "0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              Today's Expenses
            </h3>
            {expenses && expenses.length > 0 && (
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>
                {expenses.length} expenses · Rs. {expenses.reduce((acc, curr) => acc + Number(curr.amount), 0).toLocaleString()}
              </span>
            )}
          </div>
          <DailyExpenseTable expenses={expenses || []} onDeleteExpense={handleDeleteExpense} />
        </div>
      </div>

      {/* ── DAY-END RECONCILIATION ── */}
      <div className="no-print">
        <DayEndReconciliationCard cashData={cashData} onPrint={handlePrint} />
      </div>

      {/* Hidden Print Container */}
      <PrintableDayClosingSheet
        cashData={cashData}
        expenses={expenses || []}
        factorySettings={{ companyName: "Rana Shahab Marble Factory" }}
      />
    </div>
  );
}
