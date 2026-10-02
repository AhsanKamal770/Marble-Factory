// ─────────────────────────────────────────────────────────────────────────────
// MOD-11: Returns, Damage & Factory Wastage Service (واپسی مال و کٹائی نقصان)
//
// Full Dexie.js 4 backend service handling:
// 1. Customer Sales Returns (reversing khata dues / cash refund & restocking yard)
// 2. Supplier Purchase Returns (deducting stock & reducing payable balance)
// 3. Factory Breakage & Cutting Wastage Logging (Bridge-Cutter, Gangsaw, Polish)
// 4. Atomic stock reconciliation and rollback capabilities.
// ─────────────────────────────────────────────────────────────────────────────

import { db, adjustItemStock } from '../../db/index';

/**
 * Sequential document number generator for Returns & Wastage
 * @param {'RET' | 'WST' | 'PRT'} prefix
 * @returns {Promise<string>} e.g. RET-2026-0001 or WST-2026-0001
 */
export async function generateReturnDocNo(prefix = 'RET') {
  const year = new Date().getFullYear();
  try {
    let count = 0;
    if (prefix === 'WST') {
      count = await db.wastage_logs.count();
    } else {
      const allReturns = await db.returns.toArray();
      count = allReturns.filter((r) => r.returnNo?.startsWith(prefix)).length;
    }
    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}-${year}-${seq}`;
  } catch (err) {
    // Fallback if count fails
    return `${prefix}-${Date.now().toString().slice(-6)}`;
  }
}

/**
 * 1. RECORD CUSTOMER SALES RETURN (گاہک واپسی مال)
 *
 * Handles return of leftover or damaged marble from customer flooring/countertops.
 * Updates physical yard stock (if good condition) and reverses customer Khata due
 * or records cash drawer refund.
 *
 * @param {Object} data
 * @param {string} [data.refDocNo] - Linked Invoice # (e.g. 'INV-2026-001')
 * @param {number|null} [data.partyId] - Customer ID
 * @param {string} [data.partyName] - Customer Name
 * @param {Array<{ itemId: number, name: string, category: string, sqft: number, rate: number, amount?: number, condition: string }>} data.items
 * @param {'Deduct from Khata Due Balance' | 'Cash Refund'} data.refundMethod
 * @param {string} data.reason
 * @param {string} [data.notes]
 */
export async function recordSalesReturn({
  refDocNo = 'N/A',
  partyId = null,
  partyName = 'Walk-in Customer',
  items = [],
  refundMethod = 'Deduct from Khata Due Balance',
  reason = 'Leftover tiles/slabs after project completion',
  notes = ''
}) {
  if (!items || items.length === 0) {
    throw new Error('Please specify at least one item to return.');
  }

  const returnNo = await generateReturnDocNo('RET');
  const now = new Date().toISOString();

  // Calculate totals
  let totalAmount = 0;
  const processedItems = items.map((it) => {
    const sqft = Number(it.sqft) || 0;
    const rate = Number(it.rate) || 0;
    const amount = Number(it.amount) || sqft * rate;
    totalAmount += amount;
    return {
      itemId: Number(it.itemId),
      name: it.name || 'Marble Item',
      category: it.category || 'General Marble',
      sqft,
      rate,
      amount,
      condition: it.condition || 'Good - Return to Yard Stock'
    };
  });

  return await db.transaction(
    'rw',
    [db.returns, db.items, db.customers, db.stock_movements, db.daily_expenses],
    async () => {
      // 1. Insert Return Record
      const returnRecord = {
        returnNo,
        type: 'Sales Return',
        refDocNo: refDocNo || 'N/A',
        partyId: partyId ? Number(partyId) : null,
        partyName,
        date: now,
        items: processedItems,
        totalAmount,
        refundAmount: totalAmount,
        refundMethod,
        reason,
        notes,
        status: 'Completed',
        createdAt: now
      };

      const recordId = await db.returns.add(returnRecord);

      // 2. Restock items if condition is Good
      for (const it of processedItems) {
        if (it.condition.includes('Good')) {
          await adjustItemStock(
            it.itemId,
            it.sqft,
            0,
            0,
            'Sales Return',
            returnNo,
            `Returned from ${partyName} (${reason})`
          );
        }
      }

      // 3. Customer Ledger Adjustment
      if (partyId) {
        const customer = await db.customers.get(Number(partyId));
        if (customer) {
          const newTotalBilled = Math.max(0, (Number(customer.totalBilled) || 0) - totalAmount);
          let newBalanceDue = Number(customer.balanceDue) || 0;

          if (refundMethod === 'Deduct from Khata Due Balance') {
            newBalanceDue = Math.max(0, newBalanceDue - totalAmount);
          }

          await db.customers.update(Number(partyId), {
            totalBilled: newTotalBilled,
            balanceDue: newBalanceDue,
            updatedAt: now
          });
        }
      }

      // 4. Cash Drawer Reconciliation if Cash Refund
      if (refundMethod === 'Cash Refund') {
        await db.daily_expenses.add({
          date: now.slice(0, 10),
          category: 'Sales Cash Refund (واپسی مال نقد رقم)',
          amount: totalAmount,
          paidTo: partyName,
          remarks: `Refund for return ${returnNo} (${reason})`,
          createdAt: now
        });
      }

      return { id: recordId, returnNo, totalAmount, returnRecord };
    }
  );
}

/**
 * 2. RECORD SUPPLIER PURCHASE RETURN (سپلائر واپسی مال)
 *
 * Return defective stone blocks or slabs back to quarry/supplier.
 * Deducts yard inventory and reduces accounts payable.
 *
 * @param {Object} data
 * @param {number} data.partyId - Supplier ID
 * @param {string} [data.refDocNo] - Purchase Challan or Bill No
 * @param {Array<{ itemId: number, name: string, category: string, sqft: number, rate: number, amount?: number }>} data.items
 * @param {string} data.reason
 */
export async function recordPurchaseReturn({
  partyId,
  refDocNo = 'N/A',
  items = [],
  reason = 'Defective cracked stone from quarry batch'
}) {
  if (!partyId) throw new Error('Supplier is required for purchase returns.');
  if (!items || items.length === 0) throw new Error('Items must be specified.');

  const returnNo = await generateReturnDocNo('PRT');
  const now = new Date().toISOString();

  const supplier = await db.suppliers.get(Number(partyId));
  const partyName = supplier ? supplier.company || supplier.name : 'Supplier';

  let totalAmount = 0;
  const processedItems = items.map((it) => {
    const sqft = Number(it.sqft) || 0;
    const rate = Number(it.rate) || 0;
    const amount = Number(it.amount) || sqft * rate;
    totalAmount += amount;
    return {
      itemId: Number(it.itemId),
      name: it.name || 'Stone Item',
      category: it.category || 'Raw Slabs',
      sqft,
      rate,
      amount,
      condition: 'Returned to Supplier'
    };
  });

  return await db.transaction(
    'rw',
    [db.returns, db.items, db.suppliers, db.stock_movements],
    async () => {
      // 1. Insert Return Record
      const returnRecord = {
        returnNo,
        type: 'Purchase Return',
        refDocNo: refDocNo || 'N/A',
        partyId: Number(partyId),
        partyName,
        date: now,
        items: processedItems,
        totalAmount,
        refundAmount: totalAmount,
        refundMethod: 'Deduct from Supplier Payable',
        reason,
        status: 'Completed',
        createdAt: now
      };

      const recordId = await db.returns.add(returnRecord);

      // 2. Deduct inventory (returning to supplier)
      for (const it of processedItems) {
        await adjustItemStock(
          it.itemId,
          -it.sqft,
          0,
          0,
          'Purchase Return',
          returnNo,
          `Returned to supplier ${partyName} (${reason})`
        );
      }

      // 3. Update supplier balance payable
      if (supplier) {
        const newPayable = Math.max(0, (Number(supplier.balancePayable) || 0) - totalAmount);
        const newPurchased = Math.max(0, (Number(supplier.totalPurchased) || 0) - totalAmount);

        await db.suppliers.update(Number(partyId), {
          balancePayable: newPayable,
          totalPurchased: newPurchased,
          updatedAt: now
        });
      }

      return { id: recordId, returnNo, totalAmount, returnRecord };
    }
  );
}

/**
 * 3. RECORD FACTORY BREAKAGE & CUTTING WASTAGE (فیکٹری کٹائی نقصان و ٹوٹ پھوٹ)
 *
 * Dedicated logging for machine cutting losses, gangsaw blade cracking, edge chipping,
 * and yard loading damage. Deducts physical inventory without touching customer ledgers.
 * Writes to both db.wastage_logs and db.returns for comprehensive auditing.
 *
 * @param {Object} data
 * @param {number} data.itemId - Stone item ID
 * @param {number} data.sqFt - Damaged square feet
 * @param {number} [data.pieces] - Damaged pieces (optional)
 * @param {number} [data.boxes] - Damaged boxes (optional)
 * @param {string} data.source - e.g. 'Bridge-Cutter Cutting Loss', 'Gangsaw Slab Sawing', etc.
 * @param {string} data.reason - Specific flaw explanation
 * @param {string} [data.operatorName] - Cutter master or staff member name
 */
export async function recordFactoryWastage({
  itemId,
  sqFt,
  pieces = 0,
  boxes = 0,
  source = 'Bridge-Cutter Cutting Loss',
  reason = 'Blade chipped corner on 18mm slab trimming',
  operatorName = 'Master Aslam (Cutter Master)'
}) {
  const sqftNum = parseFloat(sqFt);
  if (isNaN(sqftNum) || sqftNum <= 0) {
    throw new Error('Please enter a valid positive Sq. Ft. value.');
  }

  const item = await db.items.get(Number(itemId));
  if (!item) throw new Error(`Item ID #${itemId} not found in inventory.`);

  const logNo = await generateReturnDocNo('WST');
  const now = new Date().toISOString();

  // Unit rate and financial loss calculation
  const unitCost = Number(item.costPerSqFt) || Number(item.ratePerSqFt) || 180;
  const financialLoss = Math.round(sqftNum * unitCost);

  return await db.transaction(
    'rw',
    [db.returns, db.wastage_logs, db.items, db.stock_movements],
    async () => {
      // 1. Insert into dedicated wastage_logs table
      const wastageEntry = {
        logNo,
        date: now,
        itemId: item.id,
        itemName: item.name,
        itemCode: item.code,
        category: item.category,
        sutarThickness: item.sutarThickness || 'Standard',
        sqFt: sqftNum,
        pieces: Number(pieces) || 0,
        boxes: Number(boxes) || 0,
        unitCost,
        financialLoss,
        source,
        reason,
        operatorName,
        createdAt: now
      };

      const wastageId = await db.wastage_logs.add(wastageEntry);

      // 2. Also record in db.returns for unified returns view
      await db.returns.add({
        returnNo: logNo,
        type: 'Factory Wastage',
        refDocNo: 'N/A - Internal',
        partyId: null,
        partyName: `Factory Loss (${source.split(' ')[0]})`,
        date: now,
        items: [
          {
            itemId: item.id,
            name: item.name,
            category: item.category,
            sqft: sqftNum,
            pieces: Number(pieces) || 0,
            rate: unitCost,
            amount: financialLoss,
            condition: 'Damaged - Scrap'
          }
        ],
        totalAmount: financialLoss,
        refundAmount: 0,
        refundMethod: 'N/A - Factory Loss',
        reason: `${source}: ${reason}`,
        operatorName,
        status: 'Completed',
        createdAt: now
      });

      // 3. Deduct from Physical Inventory
      await adjustItemStock(
        item.id,
        -sqftNum,
        -Number(boxes) || 0,
        -Number(pieces) || 0,
        'Factory Wastage',
        logNo,
        `${source}: ${reason}`
      );

      return {
        id: wastageId,
        logNo,
        sqFt: sqftNum,
        financialLoss,
        item: item.name,
        wastageEntry
      };
    }
  );
}

/**
 * 4. FETCH ALL RETURNS WITH FILTERS
 *
 * @param {Object} filters
 * @param {'ALL' | 'Sales Return' | 'Purchase Return' | 'Factory Wastage'} [filters.type]
 * @param {string} [filters.searchTerm]
 * @param {Date|null} [filters.startDate]
 * @param {Date|null} [filters.endDate]
 */
export async function getAllReturns({
  type = 'ALL',
  searchTerm = '',
  startDate = null,
  endDate = null
} = {}) {
  const allReturns = await db.returns.toArray();

  const term = searchTerm.trim().toLowerCase();

  return allReturns
    .filter((r) => {
      // Type filter
      if (type !== 'ALL' && r.type !== type) return false;

      // Date range filter
      if (startDate || endDate) {
        const d = new Date(r.date || r.createdAt);
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
      }

      // Search term filter
      if (term) {
        const matchNo = r.returnNo?.toLowerCase().includes(term);
        const matchParty = r.partyName?.toLowerCase().includes(term);
        const matchRef = r.refDocNo?.toLowerCase().includes(term);
        const matchReason = r.reason?.toLowerCase().includes(term);
        const matchItems = (r.items || []).some(
          (it) => it.name?.toLowerCase().includes(term) || it.category?.toLowerCase().includes(term)
        );
        return matchNo || matchParty || matchRef || matchReason || matchItems;
      }

      return true;
    })
    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
}

/**
 * 5. FETCH ALL WASTAGE LOGS
 */
export async function getAllWastageLogs() {
  const logs = await db.wastage_logs.toArray();
  return logs.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
}

/**
 * 6. WASTAGE SUMMARY & FINANCIAL LOSS ANALYTICS
 */
export async function getWastageSummaryStats(horizonStart = null, horizonEnd = null) {
  const [allReturns, allWastageLogs] = await Promise.all([
    db.returns.where('type').equals('Factory Wastage').toArray(),
    db.wastage_logs.toArray()
  ]);

  // Use wastage_logs if populated, otherwise fallback to returns where type = 'Factory Wastage'
  const records = allWastageLogs.length > 0 ? allWastageLogs : allReturns;

  let totalSqFt = 0;
  let totalFinancialLoss = 0;
  const sourceMap = {};
  const categoryMap = {};

  records.forEach((rec) => {
    // Date filter if provided
    if (horizonStart || horizonEnd) {
      const d = new Date(rec.date || rec.createdAt);
      if (horizonStart && d < horizonStart) return;
      if (horizonEnd && d > horizonEnd) return;
    }

    const sqft = Number(rec.sqFt) || rec.items?.reduce((s, it) => s + (Number(it.sqft) || 0), 0) || 0;
    const loss = Number(rec.financialLoss) || Number(rec.totalAmount) || 0;

    totalSqFt += sqft;
    totalFinancialLoss += loss;

    // Source breakdown
    const src = rec.source || (rec.reason ? rec.reason.split(':')[0] : 'Bridge Cutter Loss');
    sourceMap[src] = (sourceMap[src] || 0) + sqft;

    // Category breakdown
    const cat = rec.category || (rec.items?.[0]?.category) || 'Marble Slabs';
    categoryMap[cat] = (categoryMap[cat] || 0) + sqft;
  });

  return {
    totalSqFt: Math.round(totalSqFt * 10) / 10,
    totalFinancialLoss: Math.round(totalFinancialLoss),
    count: records.length,
    sourceBreakdown: Object.entries(sourceMap).map(([name, sqft]) => ({ name, sqft })),
    categoryBreakdown: Object.entries(categoryMap).map(([name, sqft]) => ({ name, sqft }))
  };
}

/**
 * 7. SAFE ROLLBACK / DELETE OF A RETURN OR WASTAGE ENTRY
 * Reverses the inventory delta and customer/supplier balance if applicable.
 *
 * @param {number} returnId
 */
export async function deleteReturnRecord(returnId) {
  const record = await db.returns.get(Number(returnId));
  if (!record) throw new Error('Return record not found.');

  return await db.transaction(
    'rw',
    [db.returns, db.wastage_logs, db.items, db.customers, db.suppliers, db.stock_movements],
    async () => {
      // 1. Revert Stock Adjustments
      for (const it of record.items || []) {
        const sqft = Number(it.sqft) || 0;
        if (record.type === 'Sales Return' && it.condition?.includes('Good')) {
          // Re-deduct returned stock since we are cancelling the return
          await adjustItemStock(
            it.itemId,
            -sqft,
            0,
            0,
            'Return Rollback',
            `REV-${record.returnNo}`,
            `Rollback return ${record.returnNo}`
          );
        } else if (record.type === 'Purchase Return' || record.type === 'Factory Wastage') {
          // Re-add stock that was deducted
          await adjustItemStock(
            it.itemId,
            sqft,
            0,
            0,
            'Wastage Rollback',
            `REV-${record.returnNo}`,
            `Rollback wastage ${record.returnNo}`
          );
        }
      }

      // 2. Revert Customer Balance
      if (record.type === 'Sales Return' && record.partyId) {
        const customer = await db.customers.get(record.partyId);
        if (customer) {
          const newTotalBilled = (Number(customer.totalBilled) || 0) + Number(record.totalAmount || 0);
          let newBalanceDue = Number(customer.balanceDue) || 0;
          if (record.refundMethod === 'Deduct from Khata Due Balance') {
            newBalanceDue += Number(record.totalAmount || 0);
          }
          await db.customers.update(customer.id, {
            totalBilled: newTotalBilled,
            balanceDue: newBalanceDue,
            updatedAt: new Date().toISOString()
          });
        }
      }

      // 3. Revert Supplier Balance
      if (record.type === 'Purchase Return' && record.partyId) {
        const supplier = await db.suppliers.get(record.partyId);
        if (supplier) {
          await db.suppliers.update(supplier.id, {
            balancePayable: (Number(supplier.balancePayable) || 0) + Number(record.totalAmount || 0),
            totalPurchased: (Number(supplier.totalPurchased) || 0) + Number(record.totalAmount || 0),
            updatedAt: new Date().toISOString()
          });
        }
      }

      // 4. Delete corresponding wastage_logs if matched
      if (record.type === 'Factory Wastage') {
        const matchedLog = await db.wastage_logs.where('logNo').equals(record.returnNo).first();
        if (matchedLog) {
          await db.wastage_logs.delete(matchedLog.id);
        }
      }

      // 5. Delete from db.returns
      await db.returns.delete(record.id);

      return { success: true, rolledBack: record.returnNo };
    }
  );
}

/**
 * 8. INVOICE PICKER HELPER
 * Finds an invoice by invoiceNo to auto-fill items and rates for return.
 *
 * @param {string} invoiceNo
 */
export async function getInvoiceDetailsForReturn(invoiceNo) {
  if (!invoiceNo) return null;
  const inv = await db.invoices.where('invoiceNo').equals(invoiceNo.trim()).first();
  if (!inv) return null;

  return {
    id: inv.id,
    invoiceNo: inv.invoiceNo,
    customerId: inv.customerId,
    customerName: inv.customerName,
    date: (inv.createdAt || inv.date || '').slice(0, 10),
    grandTotal: inv.grandTotal,
    balanceDue: inv.balanceDue,
    items: (inv.items || []).map((it) => ({
      itemId: it.itemId,
      name: it.name,
      category: it.category,
      sqft: it.totalSqFt || it.sqft || 0,
      rate: it.ratePerSqFt || it.rate || 0,
      amount: it.amount || 0
    }))
  };
}

/**
 * 9. GET RECENT INVOICES LIST FOR QUICK RETURN LINKING
 */
export async function getRecentInvoicesForLinking() {
  const allInvoices = await db.invoices.orderBy('id').reverse().limit(40).toArray();
  return allInvoices.map((i) => ({
    id: i.id,
    invoiceNo: i.invoiceNo,
    customerName: i.customerName,
    date: (i.createdAt || i.date || '').slice(0, 10),
    grandTotal: i.grandTotal
  }));
}

/**
 * 10. UPDATE RETURN / WASTAGE RECORD (REMARKS / REASON / OPERATOR)
 */
export async function updateReturnRecord(id, updates = {}) {
  const record = await db.returns.get(Number(id));
  if (!record) throw new Error('Return record not found.');

  const now = new Date().toISOString();
  await db.returns.update(Number(id), {
    ...updates,
    updatedAt: now
  });

  if (record.type === 'Factory Wastage') {
    const matchedLog = await db.wastage_logs.where('logNo').equals(record.returnNo).first();
    if (matchedLog) {
      await db.wastage_logs.update(matchedLog.id, {
        reason: updates.reason || matchedLog.reason,
        operatorName: updates.operatorName || matchedLog.operatorName,
        updatedAt: now
      });
    }
  }

  return { success: true };
}
