import Dexie from 'dexie';

export const db = new Dexie('MarbleFactoryDB');

// Database Schema Definitions: Keeping only the latest 2 versions (Version 6 and Version 7)
db.version(6).stores({
  users: '++id, username, role, fullName, isActive, createdAt',
  items: '++id, code, name, category, subCategory, finish, grade, sutarThickness, stockSqFt, minStockAlert, updatedAt, createdAt',
  stock_movements: '++id, date, itemId, itemName, category, movementType, refDocNo, createdAt',
  customers: '++id, name, phone, city, balanceDue, totalBilled, totalPaid, createdAt',
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
  payroll_records: '++id, employeeId, employeeName, monthKey, monthYear, status, date',
  payrolls: '++id, employeeId, employeeName, month, date, createdAt'
});

// Version 7: Latest Schema with zakat_welfare and clean indices
db.version(7).stores({
  users: '++id, username, role, fullName, isActive, createdAt',
  items: '++id, code, name, category, subCategory, finish, grade, sutarThickness, stockSqFt, minStockAlert, updatedAt, createdAt',
  stock_movements: '++id, date, itemId, itemName, category, movementType, refDocNo, createdAt',
  customers: '++id, name, phone, city, balanceDue, totalBilled, totalPaid, createdAt',
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
  payroll_records: '++id, employeeId, employeeName, monthKey, monthYear, status, date',
  payrolls: '++id, employeeId, employeeName, month, date, createdAt',
  zakat_welfare: '++id, recipientName, category, amount, paymentMode, date, createdAt'
});

// Version 8: Schema with day_closings for robust daily cash rollover & audit persistence
db.version(8).stores({
  users: '++id, username, role, fullName, isActive, createdAt',
  items: '++id, code, name, category, subCategory, finish, grade, sutarThickness, stockSqFt, minStockAlert, updatedAt, createdAt',
  stock_movements: '++id, date, itemId, itemName, category, movementType, refDocNo, createdAt',
  customers: '++id, name, phone, city, balanceDue, totalBilled, totalPaid, createdAt',
  invoices: '++id, invoiceNo, date, customerId, customerName, paymentStatus, balanceDue, grandTotal, paidAmount, createdAt',
  customer_payments: '++id, paymentNo, invoiceId, customerId, customerName, date, paymentMethod, createdAt',
  suppliers: '++id, name, phone, company, balancePayable, totalPurchased, totalPaid, createdAt',
  supplier_purchases: '++id, purchaseNo, challanNo, date, supplierId, supplierName, paymentStatus, balanceDue, grandTotal, createdAt',
  supplier_payments: '++id, paymentNo, purchaseId, supplierId, date, paymentMethod, createdAt',
  gate_passes: '++id, gatePassNo, invoiceId, customerName, vehicleNo, driverName, date, status, dispatchTime, createdAt',
  daily_expenses: '++id, date, category, amount, paidTo, remarks, paymentMethod, createdAt',
  wastage_logs: '++id, logNo, docNo, date, type, itemId, itemName, sqFt, pieces, reason, source, createdAt',
  employees: '++id, name, role, basicSalary, advanceDrawn, joiningDate, isActive',
  employee_advances: '++id, employeeId, employeeName, amount, date, notes',
  zakat_records: '++id, beneficiaryId, beneficiaryName, amount, monthYear, monthKey, status, date',
  returns: '++id, returnNo, type, refDocNo, partyId, partyName, date, createdAt, status',
  settings: '++id, companyName',
  zakat_beneficiaries: '++id, name, monthlyAmount',
  payroll_records: '++id, employeeId, employeeName, monthKey, monthYear, status, date',
  payrolls: '++id, employeeId, employeeName, month, date, createdAt',
  zakat_welfare: '++id, recipientName, category, amount, paymentMode, date, createdAt',
  day_closings: '++id, date, openingCash, cashInflow, cashOutflow, expectedCash, actualCash, difference, noteDenominations, status, createdAt'
});

// Helper: Calculate live cash drawer / Roznamcha for any date
export async function getLiveCashInDrawer(customDate = null) {
  try {
    const targetDate = customDate || new Date().toISOString().slice(0, 10);
    const settingsList = await db.settings.toArray();
    const settings = settingsList[0] || {};

    // 0. Opening Cash: Check if a previous day closing exists in day_closings (Daily Cash Rollover)
    let openingCash = 0;
    let hasPreviousClosing = false;
    if (db.day_closings) {
      const allClosings = await db.day_closings.toArray();
      const priorClosings = allClosings
        .filter(dc => dc.date < targetDate && dc.status === 'Closed')
        .sort((a, b) => b.date.localeCompare(a.date));
      if (priorClosings.length > 0) {
        openingCash = Number(priorClosings[0].actualCash ?? priorClosings[0].expectedCash ?? 0);
        hasPreviousClosing = true;
      }
    }
    if (!hasPreviousClosing) {
      openingCash = Number(settings.openingCashBalance || 0);
    }

    // 1. Cash Inflows: Cash Sales from Invoices (Walk-in or spot cash on targetDate)
    const allInvoices = await db.invoices.toArray();
    let cashSalesToday = 0;
    const todayInvoices = [];
    allInvoices.forEach(inv => {
      const invDate = (inv.createdAt || inv.date || '').slice(0, 10);
      if (invDate === targetDate) {
        todayInvoices.push(inv);
        if (!inv.customerId) {
          const paid = Number(inv.paidAmount || 0);
          const isCash = !inv.paymentMethod || inv.paymentMethod.toLowerCase().includes('cash');
          if (isCash) {
            cashSalesToday += paid;
          }
        }
      }
    });

    // 2. Cash Inflows: Customer Khata Wasooli (Payments Received)
    const allPayments = await db.customer_payments.toArray();
    let wasooliToday = 0;
    const todayPayments = [];
    allPayments.forEach(pay => {
      const payDate = (pay.date || pay.createdAt || '').slice(0, 10);
      const isCash = !pay.paymentMethod || pay.paymentMethod.toLowerCase().includes('cash');
      if (payDate === targetDate && isCash) {
        wasooliToday += Number(pay.amount || 0);
        todayPayments.push(pay);
      }
    });

    // 3. Cash Outflows: Daily Expenses (Separating return cash refunds to avoid double deduction)
    const allExpenses = await db.daily_expenses.toArray();
    let expensesToday = 0;
    const todayExpenses = [];
    const categoryTotals = {};
    allExpenses.forEach(exp => {
      const expDate = (exp.date || exp.createdAt || '').slice(0, 10);
      if (expDate === targetDate) {
        const isReturnRefund = exp.category?.includes('Sales Cash Refund') || (exp.expenseNo && exp.expenseNo.startsWith('EXP-RET'));
        if (!isReturnRefund) {
          const amt = Number(exp.amount || 0);
          todayExpenses.push(exp);
          const cat = exp.category || 'Miscellaneous';
          categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;

          const isCash = !exp.paymentMethod || exp.paymentMethod.toLowerCase().includes('cash');
          if (isCash) {
            expensesToday += amt;
          }
        }
      }
    });
    todayExpenses.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

    // 4. Cash Outflows: Supplier Cash Payments
    let supplierPaymentsToday = 0;
    if (db.supplier_payments) {
      const allSupplierPayments = await db.supplier_payments.toArray();
      allSupplierPayments.forEach(sp => {
        const spDate = (sp.date || sp.createdAt || '').slice(0, 10);
        const isCash = !sp.paymentMethod || sp.paymentMethod.toLowerCase().includes('cash');
        if (spDate === targetDate && isCash) {
          supplierPaymentsToday += Number(sp.amount || 0);
        }
      });
    }

    // 5. Cash Outflows: Payroll Cash Salaries Disbursed
    let salariesPaidToday = 0;
    if (db.payrolls) {
      const allPayrolls = await db.payrolls.toArray();
      allPayrolls.forEach(pr => {
        const prDate = (pr.date || pr.createdAt || '').slice(0, 10);
        const isCash = !pr.paymentMode || pr.paymentMode.toLowerCase().includes('cash') || pr.paymentMethod?.toLowerCase().includes('cash');
        if (prDate === targetDate && isCash) {
          salariesPaidToday += Number(pr.amount || 0);
        }
      });
    }

    // 6. Cash Outflows: Employee Cash Advances
    let advancesPaidToday = 0;
    if (db.employee_advances) {
      const allAdvances = await db.employee_advances.toArray();
      allAdvances.forEach(adv => {
        const advDate = (adv.date || adv.createdAt || '').slice(0, 10);
        const isCash = !adv.paymentMode || adv.paymentMode.toLowerCase().includes('cash');
        if (advDate === targetDate && isCash) {
          advancesPaidToday += Number(adv.amount || 0);
        }
      });
    }

    // 7. Cash Outflows: Zakat & Welfare Cash Payments (CRITICAL: Skip if synced from daily_expenses to avoid double counting)
    let zakatPaidToday = 0;
    if (db.zakat_welfare) {
      const allZakatWelfare = await db.zakat_welfare.toArray();
      allZakatWelfare.forEach(zw => {
        if (zw.source === 'daily_expenses' || zw.expenseId) return; // Prevent double counting!
        const zwDate = (zw.date || zw.createdAt || '').slice(0, 10);
        const isCash = !zw.paymentMode || zw.paymentMode.toLowerCase().includes('cash');
        if (zwDate === targetDate && isCash) {
          zakatPaidToday += Number(zw.amount || 0);
        }
      });
    }

    // 8. Cash Outflows: Sales Returns Immediate Cash Refunds
    let cashRefundsToday = 0;
    if (db.returns) {
      const allReturns = await db.returns.toArray();
      allReturns.forEach(ret => {
        const retDate = (ret.date || ret.createdAt || '').slice(0, 10);
        const isCashRefund = ret.refundMethod === 'Cash' || ret.refundMethod === 'Cash Refund' || (ret.refundMethod && ret.refundMethod.toLowerCase().includes('cash'));
        if (retDate === targetDate && isCashRefund) {
          cashRefundsToday += Number(ret.refundAmount || ret.totalAmount || 0);
        }
      });
    }

    // Total Cash Flow
    const totalCashInflow = openingCash + cashSalesToday + wasooliToday;
    const totalCashOutflow = expensesToday + supplierPaymentsToday + salariesPaidToday + advancesPaidToday + zakatPaidToday + cashRefundsToday;
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
      supplierPaymentsToday,
      supplierCashToday: supplierPaymentsToday,
      salariesPaidToday,
      advancesPaidToday,
      employeeAdvancesToday: advancesPaidToday,
      zakatPaidToday,
      cashRefundsToday,
      totalCashInflow,
      totalCashOutflow,
      liveCash,
      categoryTotals,
      todayExpenses,
      settings
    };
  } catch (err) {
    console.error('Error computing live cash in drawer:', err);
    return {
      targetDate: customDate || new Date().toISOString().slice(0, 10),
      openingCash: 0,
      cashSalesToday: 0,
      todayInvoicesCount: 0,
      wasooliToday: 0,
      todayPaymentsCount: 0,
      expensesToday: 0,
      todayExpensesCount: 0,
      supplierPaymentsToday: 0,
      supplierCashToday: 0,
      salariesPaidToday: 0,
      advancesPaidToday: 0,
      employeeAdvancesToday: 0,
      zakatPaidToday: 0,
      cashRefundsToday: 0,
      totalCashInflow: 0,
      totalCashOutflow: 0,
      liveCash: 0,
      categoryTotals: {},
      todayExpenses: [],
      settings: {}
    };
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
    let item = await db.items.get(itemId);
    if (!item && !isNaN(Number(itemId))) {
      item = await db.items.get(Number(itemId));
    }
    if (!item && typeof itemId === 'number') {
      item = await db.items.get(String(itemId));
    }
    if (!item) {
      // Fallback search in items table
      const allItems = await db.items.toArray();
      item = allItems.find(i => String(i.id) === String(itemId));
    }
    if (!item) throw new Error(`Item with id ${itemId} not found`);

    const realItemId = item.id;
    const prevSqFt = Number(item.stockSqFt) || 0;
    // Accurate stock tracking: calculate exact delta to prevent phantom stock inflation on void/cancellation
    const newSqFt = Math.round((prevSqFt + deltaSqFt) * 100) / 100;
    const newBoxes = (Number(item.stockBoxes) || 0) + deltaBoxes;
    const newPieces = (Number(item.stockPieces) || 0) + deltaPieces;

    await db.items.update(realItemId, {
      stockSqFt: newSqFt,
      stockBoxes: newBoxes,
      stockPieces: newPieces,
      updatedAt: new Date().toISOString()
    });

    await logStockMovement({
      itemId: realItemId,
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

// Generate sequential document numbers with max sequence to prevent duplicates on deletion
export async function generateNextDocNo(prefix, tableName, fieldName = 'invoiceNo') {
  try {
    const currentYear = new Date().getFullYear();
    const items = await db[tableName].toArray();
    let maxSeq = 0;
    const regex = new RegExp(`^${prefix}-${currentYear}-(\\d+)`, 'i');
    for (const item of items) {
      const val = item[fieldName] || item.docNo || item.invoiceNo || item.purchaseNo || item.returnNo || item.gatePassNo || '';
      const match = String(val).match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
    const nextSeq = maxSeq + 1;
    return `${prefix}-${currentYear}-${String(nextSeq).padStart(3, '0')}`;
  } catch (err) {
    const random = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${new Date().getFullYear()}-${random}`;
  }
}
