import { db } from './index.js';
import { defaultSettings, initializeDatabaseWithSeedData, wipeAllData, populateSampleTestData } from './seedData.js';

export async function exportDatabaseToJson() {
  const data = {
    version: 4,
    exportedAt: new Date().toISOString(),
    system: "Rana Shahab Marble Factory ERP",
    settings: await db.settings.toArray(),
    users: await db.users.toArray(),
    items: await db.items.toArray(),
    customers: await db.customers.toArray(),
    suppliers: await db.suppliers.toArray(),
    invoices: await db.invoices.toArray(),
    customer_payments: await db.customer_payments.toArray(),
    supplier_purchases: await db.supplier_purchases.toArray(),
    supplier_payments: await db.supplier_payments.toArray(),
    returns: await db.returns.toArray(),
    stock_movements: await db.stock_movements.toArray(),
    gate_passes: await db.gate_passes.toArray(),
    daily_expenses: await db.daily_expenses.toArray(),
    wastage_logs: await db.wastage_logs.toArray(),
    employees: await db.employees.toArray(),
    employee_advances: await db.employee_advances.toArray(),
    zakat_records: await db.zakat_records.toArray(),
    zakat_beneficiaries: await db.zakat_beneficiaries.toArray(),
    payroll_records: await db.payroll_records.toArray()
  };

  const jsonString = JSON.stringify(data, null, 2);

  // If in Electron, use native dialog, otherwise trigger browser download
  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.exportData) {
    const defaultName = `RSMF_Factory_Backup_${new Date().toISOString().slice(0,10)}.json`;
    return await window.electronAPI.exportData(jsonString, defaultName);
  } else if (typeof document !== 'undefined') {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RSMF_Factory_Backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { success: true, jsonData: jsonString };
  } else {
    return { success: true, jsonData: jsonString };
  }
}

export async function importDatabaseFromJson(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data.settings) {
      throw new Error("Invalid backup file structure: missing settings.");
    }

    await db.transaction('rw', [
      db.settings,
      db.users,
      db.items,
      db.customers,
      db.suppliers,
      db.invoices,
      db.customer_payments,
      db.supplier_purchases,
      db.supplier_payments,
      db.returns,
      db.stock_movements,
      db.gate_passes,
      db.daily_expenses,
      db.wastage_logs,
      db.employees,
      db.employee_advances,
      db.zakat_records,
      db.zakat_beneficiaries,
      db.payroll_records
    ], async () => {
      await db.settings.clear();
      await db.users.clear();
      await db.items.clear();
      await db.customers.clear();
      await db.suppliers.clear();
      await db.invoices.clear();
      await db.customer_payments.clear();
      await db.supplier_purchases.clear();
      await db.supplier_payments.clear();
      await db.returns.clear();
      await db.stock_movements.clear();
      await db.gate_passes.clear();
      await db.daily_expenses.clear();
      await db.wastage_logs.clear();
      await db.employees.clear();
      await db.employee_advances.clear();
      await db.zakat_records.clear();
      await db.zakat_beneficiaries.clear();
      await db.payroll_records.clear();

      if (data.settings?.length) await db.settings.bulkAdd(data.settings);
      if (data.users?.length) await db.users.bulkAdd(data.users);
      if (data.items?.length) await db.items.bulkAdd(data.items);
      if (data.customers?.length) await db.customers.bulkAdd(data.customers);
      if (data.suppliers?.length) await db.suppliers.bulkAdd(data.suppliers);
      if (data.invoices?.length) await db.invoices.bulkAdd(data.invoices);
      if (data.customer_payments?.length) await db.customer_payments.bulkAdd(data.customer_payments);
      if (data.supplier_purchases?.length) await db.supplier_purchases.bulkAdd(data.supplier_purchases);
      if (data.supplier_payments?.length) await db.supplier_payments.bulkAdd(data.supplier_payments);
      if (data.returns?.length) await db.returns.bulkAdd(data.returns);
      if (data.stock_movements?.length) await db.stock_movements.bulkAdd(data.stock_movements);
      if (data.gate_passes?.length) await db.gate_passes.bulkAdd(data.gate_passes);
      if (data.daily_expenses?.length) await db.daily_expenses.bulkAdd(data.daily_expenses);
      if (data.wastage_logs?.length) await db.wastage_logs.bulkAdd(data.wastage_logs);
      if (data.employees?.length) await db.employees.bulkAdd(data.employees);
      if (data.employee_advances?.length) await db.employee_advances.bulkAdd(data.employee_advances);
      if (data.zakat_records?.length) await db.zakat_records.bulkAdd(data.zakat_records);
      if (data.zakat_beneficiaries?.length) await db.zakat_beneficiaries.bulkAdd(data.zakat_beneficiaries);
      if (data.payroll_records?.length) await db.payroll_records.bulkAdd(data.payroll_records);
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Reset database to a completely clean, empty state with only default settings & admin user
 */
export async function resetDatabaseToClean() {
  await wipeAllData();
  await initializeDatabaseWithSeedData();
  return { success: true };
}

/**
 * Reset and populate optional sample test data (for testing & demo purposes)
 */
export async function resetDatabaseWithSampleData() {
  await populateSampleTestData();
  await initializeDatabaseWithSeedData();
  return { success: true };
}

export const loadTestingData = resetDatabaseWithSampleData;
export const resetDatabaseToDefault = resetDatabaseWithSampleData;


