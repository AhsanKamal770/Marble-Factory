import { db, getLiveCashInDrawer } from "../../db/index.js";

export { getLiveCashInDrawer };

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
 * Save day closing reconciliation record to db.day_closings
 */
export async function saveDayClosing(closingData) {
  const date = closingData.date || new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  
  if (db.day_closings) {
    const existing = await db.day_closings.where('date').equals(date).first();
    let resId;
    if (existing) {
      await db.day_closings.update(existing.id, {
        ...closingData,
        date,
        updatedAt: now,
        status: 'Closed'
      });
      resId = existing.id;
    } else {
      resId = await db.day_closings.add({
        ...closingData,
        date,
        createdAt: now,
        status: 'Closed'
      });
    }

    // Auto-sync closed cash to settings so next day's opening cash immediately receives this balance
    try {
      const settingsList = await db.settings.toArray();
      const closedCash = Number(
        closingData.actualCash !== undefined && closingData.actualCash !== null
          ? closingData.actualCash
          : (closingData.expectedCash || 0)
      );
      if (settingsList.length > 0) {
        const initialCash = settingsList[0].initialOpeningCash !== undefined
          ? settingsList[0].initialOpeningCash
          : (settingsList[0].openingCashBalance || 0);

        await db.settings.update(settingsList[0].id, {
          initialOpeningCash: initialCash,
          openingCashBalance: closedCash,
          lastClosedDate: date,
          lastClosedCash: closedCash
        });
      }
    } catch (e) {
      console.warn("Could not sync settings openingCashBalance:", e);
    }

    return resId;
  }
  return null;
}

/**
 * Get saved day closing record for a specific date
 */
export async function getDayClosing(dateStr) {
  const targetDate = dateStr || new Date().toISOString().slice(0, 10);
  if (db.day_closings) {
    return await db.day_closings.where('date').equals(targetDate).first();
  }
  return null;
}
