import Dexie from 'dexie';

export const db = new Dexie('MarbleFactoryDB');

// Database Schema Definitions with Versioning
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

// Production Schema Version 3: Comprehensive Indices for High Performance
db.version(3).stores({
  users: '++id, username, role, fullName, isActive, createdAt',
  items: '++id, code, name, category, subCategory, finish, grade, sutarThickness, stockSqFt, minStockAlert, updatedAt, createdAt',
  stock_movements: '++id, date, itemId, itemName, category, movementType, refDocNo, createdAt',
  customers: '++id, name, phone, city, customerType, balanceDue, totalBilled, totalPaid, createdAt',
  invoices: '++id, invoiceNo, date, customerId, customerName, paymentStatus, balanceDue, grandTotal, paidAmount, createdAt',
  customer_payments: '++id, paymentNo, invoiceId, customerId, customerName, date, paymentMethod, createdAt',
  suppliers: '++id, name, phone, company, balancePayable, totalPurchased, totalPaid, createdAt',
  supplier_purchases: '++id, purchaseNo, challanNo, date, supplierId, supplierName, paymentStatus, balanceDue, grandTotal, createdAt',
  supplier_payments: '++id, paymentNo, purchaseId, supplierId, date, paymentMethod, createdAt',
  gate_passes: '++id, gatePassNo, invoiceId, customerName, vehicleNo, driverName, date, status, dispatchTime, createdAt',
  daily_expenses: '++id, date, category, amount, paidTo, remarks, createdAt',
  wastage_logs: '++id, docNo, date, type, itemId, itemName, createdAt',
  employees: '++id, name, role, basicSalary, advanceDrawn, joiningDate, isActive',
  employee_advances: '++id, employeeId, employeeName, amount, date, notes',
  zakat_records: '++id, beneficiaryId, beneficiaryName, amount, monthYear, status, date',
  returns: '++id, returnNo, type, refDocNo, partyName, date, createdAt',
  settings: '++id, companyName'
});

// Version 4: Merging HEAD changes with Production Schema
db.version(4).stores({
  users: '++id, username, role, fullName, isActive, createdAt',
  items: '++id, code, name, category, subCategory, finish, grade, sutarThickness, stockSqFt, minStockAlert, updatedAt, createdAt',
  stock_movements: '++id, date, itemId, itemName, category, movementType, refDocNo, createdAt',
  customers: '++id, name, phone, city, customerType, balanceDue, totalBilled, totalPaid, createdAt',
  invoices: '++id, invoiceNo, date, customerId, customerName, paymentStatus, balanceDue, grandTotal, paidAmount, createdAt',
  customer_payments: '++id, paymentNo, invoiceId, customerId, customerName, date, paymentMethod, createdAt',
  suppliers: '++id, name, phone, company, balancePayable, totalPurchased, totalPaid, createdAt',
  supplier_purchases: '++id, purchaseNo, challanNo, date, supplierId, supplierName, paymentStatus, balanceDue, grandTotal, createdAt',
  supplier_payments: '++id, paymentNo, purchaseId, supplierId, date, paymentMethod, createdAt',
  gate_passes: '++id, gatePassNo, invoiceId, customerName, vehicleNo, driverName, date, status, dispatchTime, createdAt',
  daily_expenses: '++id, date, category, amount, paidTo, remarks, createdAt',
  wastage_logs: '++id, logNo, docNo, date, type, itemId, itemName, sqFt, pieces, reason, source, createdAt',
  employees: '++id, name, role, basicSalary, advanceDrawn, joiningDate, isActive',
  employee_advances: '++id, employeeId, employeeName, amount, date, notes',
  zakat_records: '++id, beneficiaryId, beneficiaryName, amount, monthYear, monthKey, status, date',
  returns: '++id, returnNo, type, refDocNo, partyId, partyName, date, createdAt, status',
  settings: '++id, companyName',
  zakat_beneficiaries: '++id, name, monthlyAmount',
  payroll_records: '++id, employeeId, employeeName, monthKey, monthYear, status, date'
});

// Version 5: Bump version to force update for users who were on HEAD's v4 (which dropped tables)
db.version(5).stores({
  users: '++id, username, role, fullName, isActive, createdAt',
  items: '++id, code, name, category, subCategory, finish, grade, sutarThickness, stockSqFt, minStockAlert, updatedAt, createdAt',
  stock_movements: '++id, date, itemId, itemName, category, movementType, refDocNo, createdAt',
  customers: '++id, name, phone, city, customerType, balanceDue, totalBilled, totalPaid, createdAt',
  invoices: '++id, invoiceNo, date, customerId, customerName, paymentStatus, balanceDue, grandTotal, paidAmount, createdAt',
  customer_payments: '++id, paymentNo, invoiceId, customerId, customerName, date, paymentMethod, createdAt',
  suppliers: '++id, name, phone, company, balancePayable, totalPurchased, totalPaid, createdAt',
  supplier_purchases: '++id, purchaseNo, challanNo, date, supplierId, supplierName, paymentStatus, balanceDue, grandTotal, createdAt',
  supplier_payments: '++id, paymentNo, purchaseId, supplierId, date, paymentMethod, createdAt',
  gate_passes: '++id, gatePassNo, invoiceId, customerName, vehicleNo, driverName, date, status, dispatchTime, createdAt',
  daily_expenses: '++id, date, category, amount, paidTo, remarks, createdAt',
  wastage_logs: '++id, logNo, docNo, date, type, itemId, itemName, sqFt, pieces, reason, source, createdAt',
  employees: '++id, name, role, basicSalary, advanceDrawn, joiningDate, isActive',
  employee_advances: '++id, employeeId, employeeName, amount, date, notes',
  zakat_records: '++id, beneficiaryId, beneficiaryName, amount, monthYear, monthKey, status, date',
  returns: '++id, returnNo, type, refDocNo, partyId, partyName, date, createdAt, status',
  settings: '++id, companyName',
  zakat_beneficiaries: '++id, name, monthlyAmount',
  payroll_records: '++id, employeeId, employeeName, monthKey, monthYear, status, date'
});

// Helper: Calculate live cash drawer / Roznamcha for any date
export async function getLiveCashInDrawer(customDate = null) {
  try {
    const targetDate = customDate || new Date().toISOString().slice(0, 10);
    const settingsList = await db.settings.toArray();
    const openingCash = Number(settingsList[0]?.openingCashBalance || 0);

    const allInvoices = await db.invoices.toArray();
    let cashSalesToday = 0;
    allInvoices.forEach(inv => {
      const invDate = (inv.createdAt || inv.date || '').slice(0, 10);
      if (invDate === targetDate) {
        if (!inv.customerId) {
          cashSalesToday += Number(inv.paidAmount || 0);
        }
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
    return { openingCash: 0, cashSalesToday: 0, wasooliToday: 0, expensesToday: 0, liveCash: 0 };
  }
}

// Helper functions for stock movement audit trail
export async function logStockMovement({
  itemId,
  itemName,
  category,
  movementType,
  changeSqFt,
  changeBoxes = 0,
  changePieces = 0,
  previousSqFt,
  newSqFt,
  refDocNo,
  note = ''
}) {
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

// Atomic stock adjustment transaction
export async function adjustItemStock(
  itemId,
  deltaSqFt,
  deltaBoxes = 0,
  deltaPieces = 0,
  movementType = 'Adjustment',
  refDocNo = '',
  note = ''
) {
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

// Generate sequential document numbers (e.g. INV-2026-001, GP-2026-001)
export async function generateNextDocNo(prefix, tableName, fieldName = 'invoiceNo') {
  try {
    const currentYear = new Date().getFullYear();
    const count = await db[tableName].count();
    const nextSeq = count + 1;
    return `${prefix}-${currentYear}-${String(nextSeq).padStart(3, '0')}`;
  } catch (err) {
    const random = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${new Date().getFullYear()}-${random}`;
  }
}
