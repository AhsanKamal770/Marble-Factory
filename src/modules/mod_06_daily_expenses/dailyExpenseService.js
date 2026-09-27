import { db, getLiveCashInDrawer } from "../../db";

export async function addExpense(expenseData) {
  return await db.daily_expenses.add({
    ...expenseData,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString()
  });
}

export async function deleteExpense(id) {
  return await db.daily_expenses.delete(id);
}

export async function getTodayExpenses(customDate = null) {
  const targetDate = customDate || new Date().toISOString().slice(0, 10);
  const allExpenses = await db.daily_expenses.orderBy('date').reverse().toArray();
  return allExpenses.filter(e => (e.date || e.createdAt || '').slice(0, 10) === targetDate);
}

export { getLiveCashInDrawer };
