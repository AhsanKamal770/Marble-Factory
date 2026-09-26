import { db } from './index';
import { sampleItems, sampleCustomers, sampleSuppliers, defaultSettings, initializeDatabaseWithSeedData } from './seedData';

export async function exportDatabaseToJson() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: await db.settings.toArray(),
    items: await db.items.toArray(),
    customers: await db.customers.toArray(),
    suppliers: await db.suppliers.toArray(),
    invoices: await db.invoices.toArray(),
    customer_payments: await db.customer_payments.toArray(),
    supplier_purchases: await db.supplier_purchases.toArray(),
    supplier_payments: await db.supplier_payments.toArray(),
    returns: await db.returns.toArray(),
    stock_movements: await db.stock_movements.toArray()
  };

  const jsonString = JSON.stringify(data, null, 2);

  // If in Electron, use native dialog, otherwise trigger browser download
  if (window.electronAPI && window.electronAPI.exportData) {
    const defaultName = `MarbleFactory_Backup_${new Date().toISOString().slice(0,10)}.json`;
    return await window.electronAPI.exportData(jsonString, defaultName);
  } else {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MarbleFactory_Backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { success: true };
  }
}

export async function importDatabaseFromJson(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data.items || !data.customers || !data.settings) {
      throw new Error("Invalid backup file structure.");
    }

    await db.transaction('rw', [
      db.settings,
      db.items,
      db.customers,
      db.suppliers,
      db.invoices,
      db.customer_payments,
      db.supplier_purchases,
      db.supplier_payments,
      db.returns,
      db.stock_movements
    ], async () => {
      await db.settings.clear();
      await db.items.clear();
      await db.customers.clear();
      await db.suppliers.clear();
      await db.invoices.clear();
      await db.customer_payments.clear();
      await db.supplier_purchases.clear();
      await db.supplier_payments.clear();
      await db.returns.clear();
      await db.stock_movements.clear();

      if (data.settings?.length) await db.settings.bulkAdd(data.settings);
      if (data.items?.length) await db.items.bulkAdd(data.items);
      if (data.customers?.length) await db.customers.bulkAdd(data.customers);
      if (data.suppliers?.length) await db.suppliers.bulkAdd(data.suppliers);
      if (data.invoices?.length) await db.invoices.bulkAdd(data.invoices);
      if (data.customer_payments?.length) await db.customer_payments.bulkAdd(data.customer_payments);
      if (data.supplier_purchases?.length) await db.supplier_purchases.bulkAdd(data.supplier_purchases);
      if (data.supplier_payments?.length) await db.supplier_payments.bulkAdd(data.supplier_payments);
      if (data.returns?.length) await db.returns.bulkAdd(data.returns);
      if (data.stock_movements?.length) await db.stock_movements.bulkAdd(data.stock_movements);
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function resetDatabaseToDefault() {
  await db.transaction('rw', [
    db.settings,
    db.items,
    db.customers,
    db.suppliers,
    db.invoices,
    db.customer_payments,
    db.supplier_purchases,
    db.supplier_payments,
    db.returns,
    db.stock_movements
  ], async () => {
    await db.settings.clear();
    await db.items.clear();
    await db.customers.clear();
    await db.suppliers.clear();
    await db.invoices.clear();
    await db.customer_payments.clear();
    await db.supplier_purchases.clear();
    await db.supplier_payments.clear();
    await db.returns.clear();
    await db.stock_movements.clear();
  });

  await initializeDatabaseWithSeedData();
  return { success: true };
}
