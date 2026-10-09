import { db } from "../../db/index.js";

export const EXPENSE_CATEGORIES = [
  { id: "Food / Mess", en: "Food / Mess (Tea/Ration)", ur: "کھانا / چائے / راشن", color: "#f59e0b", icon: "Utensils" },
  { id: "Fuel / Transport", en: "Fuel / Transport / Generator", ur: "ڈیزل / پٹرول / کرایہ", color: "#3b82f6", icon: "Fuel" },
  { id: "Labour / Loading", en: "Labour & Loading / Unloading", ur: "مزدوری / لوڈنگ و ان لوڈنگ", color: "#8b5cf6", icon: "Users" },
  { id: "Factory Maintenance", en: "Factory Maintenance & Tools", ur: "کارخانہ مرمت / بلیڈ / اوزار", color: "#ef4444", icon: "Wrench" },
  { id: "Electricity / Bills", en: "Electricity & Utility Bills", ur: "بجلی کا بل / یوٹیلیٹی", color: "#06b6d4", icon: "Zap" },
  { id: "Customer Udhar Advance", en: "Customer Return / Advance", ur: "گاہک ادھار / ایڈوانس واپسی", color: "#ec4899", icon: "Undo" },
  { id: "Employee Advance", en: "Worker Kharcha / Advance", ur: "ملازم ایڈوانس / خرچہ", color: "#10b981", icon: "UserCheck" },
  { id: "Zakat / Charity", en: "Zakat / Charity / Sadqah", ur: "زکوٰۃ / خیرات / صدقہ", color: "#059669", icon: "HeartHandshake" },
  { id: "Miscellaneous", en: "Miscellaneous / Other", ur: "متفرق اخراجات", color: "#64748b", icon: "MoreHorizontal" }
];

/**
 * Add a new daily expense to Dexie DB and auto-sync Zakat records to Zakat module
 */
export async function addExpense(expenseData) {
  const expenseDate = expenseData.date ? expenseData.date.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const now = new Date();
  const category = expenseData.category || "Miscellaneous";
  const amount = Number(expenseData.amount) || 0;
  const paidTo = expenseData.paidTo ? expenseData.paidTo.trim() : "";
  const remarks = expenseData.remarks ? expenseData.remarks.trim() : "";
  const paymentMethod = expenseData.paymentMethod || "Cash";

  const expenseId = await db.daily_expenses.add({
    category,
    amount,
    paidTo,
    remarks,
    paymentMethod,
    date: expenseDate,
    createdAt: expenseData.createdAt || now.toISOString()
  });

  // Auto-sync to zakat_welfare store if this expense is Zakat or Charity
  const isZakat = category.toLowerCase().includes("zakat") || category.includes("زکوٰۃ");
  if (isZakat && db.zakat_welfare) {
    try {
      await db.zakat_welfare.add({
        recipientName: paidTo || "General Zakat Recipient (عام مستحق)",
        category: "Zakat",
        amount,
        paymentMode: paymentMethod,
        reason: remarks || "Daily Expense Zakat / Charity Entry (روزانہ خرچ زکوٰۃ)",
        date: expenseDate,
        createdAt: expenseData.createdAt || now.toISOString(),
        source: "daily_expenses",
        expenseId: expenseId
      });
    } catch (e) {
      console.error("Error auto-syncing Zakat record:", e);
    }
  }

  return expenseId;
}

/**
 * Delete an expense by ID and remove linked Zakat record if synced
 */
export async function deleteExpense(id) {
  const numId = Number(id);
  if (db.zakat_welfare) {
    try {
      const allZakat = await db.zakat_welfare.toArray();
      const match = allZakat.filter(z => z.expenseId === numId);
      for (const z of match) {
        await db.zakat_welfare.delete(z.id);
      }
    } catch (e) {
      console.warn("Could not remove synced zakat record:", e);
    }
  }
  return await db.daily_expenses.delete(numId);
}

/**
 * Update an existing expense and update linked Zakat record
 */
export async function updateExpense(id, updatedData) {
  const numId = Number(id);
  const category = updatedData.category;
  const amount = Number(updatedData.amount) || 0;
  const paidTo = updatedData.paidTo ? updatedData.paidTo.trim() : "";
  const remarks = updatedData.remarks ? updatedData.remarks.trim() : "";
  const paymentMethod = updatedData.paymentMethod || "Cash";
  const dateStr = updatedData.date ? updatedData.date.slice(0, 10) : new Date().toISOString().slice(0, 10);

  const res = await db.daily_expenses.update(numId, {
    ...updatedData,
    amount,
    updatedAt: new Date().toISOString()
  });

  if (db.zakat_welfare) {
    try {
      const isZakat = (category || "").toLowerCase().includes("zakat") || (category || "").includes("زکوٰۃ");
      const allZakat = await db.zakat_welfare.toArray();
      const matches = allZakat.filter(z => z.expenseId === numId);

      if (isZakat) {
        if (matches.length > 0) {
          for (const m of matches) {
            await db.zakat_welfare.update(m.id, {
              recipientName: paidTo || m.recipientName,
              amount,
              paymentMode: paymentMethod,
              reason: remarks || m.reason,
              date: dateStr,
              updatedAt: new Date().toISOString()
            });
          }
        } else {
          await db.zakat_welfare.add({
            recipientName: paidTo || "General Zakat Recipient (عام مستحق)",
            category: "Zakat",
            amount,
            paymentMode: paymentMethod,
            reason: remarks || "Daily Expense Zakat / Charity Entry (روزانہ خرچ زکوٰۃ)",
            date: dateStr,
            createdAt: new Date().toISOString(),
            source: "daily_expenses",
            expenseId: numId
          });
        }
      } else {
        for (const m of matches) {
          await db.zakat_welfare.delete(m.id);
        }
      }
    } catch (e) {
      console.warn("Could not sync updated zakat record:", e);
    }
  }

  return res;
}

/**
 * Get all expenses for a specific date (YYYY-MM-DD)
 */
export async function getExpensesByDate(dateStr) {
  const targetDate = dateStr || new Date().toISOString().slice(0, 10);
  const allExpenses = await db.daily_expenses.toArray();
  return allExpenses
    .filter(e => (e.date || e.createdAt || '').slice(0, 10) === targetDate)
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
}

/**
 * Calculate full Roznamcha metrics for a specific date
 */
export async function getLiveCashInDrawer(customDate = null) {
  try {
    const targetDate = customDate || new Date().toISOString().slice(0, 10);
    const settingsList = await db.settings.toArray();
    const settings = settingsList[0] || {};
    const openingCash = Number(settings.openingCashBalance || 0);

    // 1. Spot Cash Sales for date
    const allInvoices = await db.invoices.toArray();
    let cashSalesToday = 0;
    const todayInvoices = [];
    allInvoices.forEach(inv => {
      const invDate = (inv.createdAt || inv.date || '').slice(0, 10);
      if (invDate === targetDate) {
        const paid = Number(inv.paidAmount || 0);
        if (paid > 0) {
          todayInvoices.push(inv);
        }
        if (!inv.customerId) {
          cashSalesToday += paid;
        }
      }
    });

    // 2. Customer Wasooli (Khata Recoveries) for date
    const allPayments = await db.customer_payments.toArray();
    let wasooliToday = 0;
    const todayPayments = [];
    allPayments.forEach(pay => {
      const payDate = (pay.date || '').slice(0, 10);
      if (payDate === targetDate) {
        const amt = Number(pay.amount || 0);
        wasooliToday += amt;
        todayPayments.push(pay);
      }
    });

    // 3. Daily Expenses for date
    const allExpenses = await db.daily_expenses.toArray();
    let expensesToday = 0;
    const todayExpenses = [];
    const categoryTotals = {};

    allExpenses.forEach(exp => {
      const expDate = (exp.date || exp.createdAt || '').slice(0, 10);
      if (expDate === targetDate) {
        const amt = Number(exp.amount || 0);
        expensesToday += amt;
        todayExpenses.push(exp);

        const cat = exp.category || "Miscellaneous";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
      }
    });

    // Sort today's expenses latest first
    todayExpenses.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

    // 4. Supplier Cash Outflows (if any)
    let supplierCashToday = 0;
    if (db.supplier_payments) {
      const allSupPayments = await db.supplier_payments.toArray();
      allSupPayments.forEach(sp => {
        const spDate = (sp.date || sp.createdAt || '').slice(0, 10);
        if (spDate === targetDate && (sp.paymentMethod === 'Cash' || !sp.paymentMethod)) {
          supplierCashToday += Number(sp.amount || 0);
        }
      });
    }

    // 5. Employee Advances in Cash (if any)
    let employeeAdvancesToday = 0;
    if (db.employee_advances) {
      const allEmpAdv = await db.employee_advances.toArray();
      allEmpAdv.forEach(ea => {
        const eaDate = (ea.date || '').slice(0, 10);
        if (eaDate === targetDate) {
          employeeAdvancesToday += Number(ea.amount || 0);
        }
      });
    }

    const totalCashInflow = openingCash + cashSalesToday + wasooliToday;
    const totalCashOutflow = expensesToday + supplierCashToday + employeeAdvancesToday;
    const liveCash = totalCashInflow - totalCashOutflow;

    return {
      targetDate,
      openingCash,
      cashSalesToday,
      todayInvoicesCount: todayInvoices.length,
      wasooliToday,
      todayPaymentsCount: todayPayments.length,
      expensesToday,
      todayExpensesCount: todayExpenses.length,
      supplierCashToday,
      employeeAdvancesToday,
      totalCashInflow,
      totalCashOutflow,
      liveCash,
      categoryTotals,
      todayExpenses,
      settings
    };
  } catch (err) {
    console.error('Error computing live Roznamcha:', err);
    return {
      targetDate: customDate || new Date().toISOString().slice(0, 10),
      openingCash: 0,
      cashSalesToday: 0,
      todayInvoicesCount: 0,
      wasooliToday: 0,
      todayPaymentsCount: 0,
      expensesToday: 0,
      todayExpensesCount: 0,
      supplierCashToday: 0,
      employeeAdvancesToday: 0,
      totalCashInflow: 0,
      totalCashOutflow: 0,
      liveCash: 0,
      categoryTotals: {},
      todayExpenses: [],
      settings: {}
    };
  }
}
