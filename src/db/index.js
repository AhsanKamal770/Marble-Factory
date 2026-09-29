import Dexie from 'dexie';

export const db = new Dexie('MarbleFactoryDB');

db.version(1).stores({
  items: '++id, code, name, category, finish, grade, stockSqFt, minStockAlert',
  customers: '++id, name, phone, city, customerType, balanceDue',
  suppliers: '++id, name, phone, company, balancePayable',
  invoices: '++id, invoiceNo, date, customerId, customerName, paymentStatus, balanceDue',
  customer_payments: '++id, paymentNo, invoiceId, customerId, date',
  supplier_purchases: '++id, purchaseNo, challanNo, date, supplierId, paymentStatus, balanceDue',
  supplier_payments: '++id, paymentNo, purchaseId, supplierId, date',
  returns: '++id, returnNo, type, refDocNo, partyName, date',
  stock_movements: '++id, date, itemId, movementType, refDocNo',
  settings: '++id, companyName'
});

db.version(2).stores({
  items: '++id, code, name, category, finish, grade, sutarThickness, stockSqFt, minStockAlert',
  customers: '++id, name, phone, city, customerType, balanceDue',
  suppliers: '++id, name, phone, company, balancePayable',
  invoices: '++id, invoiceNo, date, customerId, customerName, paymentStatus, balanceDue, createdAt',
  customer_payments: '++id, paymentNo, invoiceId, customerId, date',
  supplier_purchases: '++id, purchaseNo, challanNo, date, supplierId, paymentStatus, balanceDue',
  supplier_payments: '++id, paymentNo, purchaseId, supplierId, date',
  returns: '++id, returnNo, type, refDocNo, partyName, date',
  stock_movements: '++id, date, itemId, movementType, refDocNo',
  settings: '++id, companyName',
  gate_passes: '++id, gatePassNo, invoiceId, customerName, vehicleNo, driverName, date, status',
  daily_expenses: '++id, date, category, amount, paidTo, remarks, createdAt',
  employees: '++id, name, role, basicSalary, advanceDrawn, joiningDate',
  employee_advances: '++id, employeeId, employeeName, amount, date, notes',
  zakat_records: '++id, beneficiaryId, beneficiaryName, amount, monthYear, status, date',
  wastage_logs: '++id, date, itemId, itemName, sqFt, pieces, reason'
});

db.version(3).stores({
  zakat_beneficiaries: '++id, name, monthlyAmount',
  zakat_records: '++id, beneficiaryId, beneficiaryName, amount, monthYear, monthKey, status, date',
  payroll_records: '++id, employeeId, employeeName, monthKey, monthYear, status, date'
});

// Helper: Calculate live cash drawer / Roznamcha
export async function getLiveCashInDrawer(customDate = null) {
  try {
    const targetDate = customDate || new Date().toISOString().slice(0, 10);
    const settingsList = await db.settings.toArray();
    const openingCash = Number(settingsList[0]?.openingCashBalance || 25000);

    const allInvoices = await db.invoices.toArray();
    let cashSalesToday = 0;
    allInvoices.forEach(inv => {
      const invDate = (inv.createdAt || inv.date || '').slice(0, 10);
      if (invDate === targetDate) {
        cashSalesToday += Number(inv.paidAmount || 0);
      }
    });

    const allPayments = await db.customer_payments.toArray();
    let wasooliToday = 0;
    allPayments.forEach(pay => {
      const payDate = (pay.date || '').slice(0, 10);
      if (payDate === targetDate) {
        wasooliToday += Number(pay.amount || 0);
      }
    });

    const allExpenses = await db.daily_expenses.toArray();
    let expensesToday = 0;
    allExpenses.forEach(exp => {
      const expDate = (exp.date || exp.createdAt || '').slice(0, 10);
      if (expDate === targetDate) {
        expensesToday += Number(exp.amount || 0);
      }
    });

    const liveCash = openingCash + cashSalesToday + wasooliToday - expensesToday;

    return {
      openingCash,
      cashSalesToday,
      wasooliToday,
      expensesToday,
      liveCash
    };
  } catch (err) {
    console.error('Error computing live cash in drawer:', err);
    return { openingCash: 25000, cashSalesToday: 0, wasooliToday: 0, expensesToday: 0, liveCash: 25000 };
  }
}

// Helper functions for common transactions & stock updates
export async function logStockMovement({ itemId, itemName, category, movementType, changeSqFt, changeBoxes = 0, changePieces = 0, previousSqFt, newSqFt, refDocNo, note = '' }) {
  return await db.stock_movements.add({
    date: new Date().toISOString(),
    itemId,
    itemName,
    category,
    movementType,
    changeSqFt,
    changeBoxes,
    changePieces,
    previousSqFt,
    newSqFt,
    refDocNo,
    note,
    createdAt: new Date().toISOString()
  });
}

// Update item stock atomically
export async function adjustItemStock(itemId, deltaSqFt, deltaBoxes = 0, deltaPieces = 0, movementType = 'Adjustment', refDocNo = '', note = '') {
  return await db.transaction('rw', db.items, db.stock_movements, async () => {
    const item = await db.items.get(itemId);
    if (!item) throw new Error(`Item with id ${itemId} not found`);

    const prevSqFt = Number(item.stockSqFt) || 0;
    const newSqFt = Math.max(0, Math.round((prevSqFt + deltaSqFt) * 100) / 100);
    const newBoxes = Math.max(0, (Number(item.stockBoxes) || 0) + deltaBoxes);
    const newPieces = Math.max(0, (Number(item.stockPieces) || 0) + deltaPieces);

    await db.items.update(itemId, {
      stockSqFt: newSqFt,
      stockBoxes: newBoxes,
      stockPieces: newPieces,
      updatedAt: new Date().toISOString()
    });

    await logStockMovement({
      itemId,
      itemName: item.name,
      category: item.category,
      movementType,
      changeSqFt: deltaSqFt,
      changeBoxes: deltaBoxes,
      changePieces: deltaPieces,
      previousSqFt: prevSqFt,
      newSqFt,
      refDocNo,
      note
    });

    return { prevSqFt, newSqFt };
  });
}
