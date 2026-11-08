// ─────────────────────────────────────────────────────────────────────────────
// MOD-07: Sales Reports & P&L Analytics Service (سیلز رپورٹس و منافع تجزیہ)
//
// Full Dexie.js 4 backend service providing offline-first business intelligence,
// sales aggregation, Cost of Goods Sold (COGS) tracking, Gross & Net Profit
// (Munafa) calculation, Sutar thickness distribution, customer Khata rankings,
// and comprehensive factory daily expenses tracking.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '../../db/index.js';

/**
 * Returns date range boundaries for a selected time horizon
 * @param {string} horizon - 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'Custom'
 * @param {{ from?: string, to?: string }} custom - optional custom ISO date strings (YYYY-MM-DD)
 * @returns {{ start: Date, end: Date, prevStart: Date, prevEnd: Date, label: string }}
 */
export function getHorizonDateRange(horizon = 'Monthly', custom = null) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let prevStart = new Date(now);
  let prevEnd = new Date(now);
  let label = horizon;

  if (horizon === 'Daily' || horizon === 'Today') {
    start.setHours(0, 0, 0, 0);
    // Previous period: yesterday
    prevStart.setDate(start.getDate() - 1);
    prevStart.setHours(0, 0, 0, 0);
    prevEnd.setDate(start.getDate() - 1);
    prevEnd.setHours(23, 59, 59, 999);
    label = 'Today (آج)';
  } else if (horizon === 'Weekly' || horizon === 'This Week') {
    // Current week starting from Monday
    const day = now.getDay(); // 0 is Sunday, 1 is Monday
    const diff = now.getDate() - (day === 0 ? 6 : day - 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    // Previous period: last week
    prevStart = new Date(start);
    prevStart.setDate(start.getDate() - 7);
    prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);
    label = 'This Week (اس ہفتے)';
  } else if (horizon === 'Monthly' || horizon === 'This Month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    // Cover full current calendar month
    end.setFullYear(now.getFullYear(), now.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    // Previous period: last month
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    label = 'This Month (اس ماہ)';
  } else if (horizon === 'Yearly' || horizon === 'This Year') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    // Cover full current year
    end.setFullYear(now.getFullYear(), 11, 31);
    end.setHours(23, 59, 59, 999);
    // Previous period: last year
    prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    label = 'This Year (اس سال)';
  } else {
    // Custom Range
    const fromStr = custom?.from ? custom.from : null;
    const toStr = custom?.to ? custom.to : null;
    let customStart = new Date(0);
    let customEnd = new Date(end);

    if (fromStr && /^\d{4}-\d{2}-\d{2}$/.test(fromStr)) {
      const [fy, fm, fd] = fromStr.split('-').map(Number);
      customStart = new Date(fy, fm - 1, fd, 0, 0, 0, 0);
    }
    if (toStr && /^\d{4}-\d{2}-\d{2}$/.test(toStr)) {
      const [ty, tm, td] = toStr.split('-').map(Number);
      customEnd = new Date(ty, tm - 1, td, 23, 59, 59, 999);
    }

    // Auto-swap if start > end
    if (customStart > customEnd) {
      const temp = new Date(customStart);
      customStart = new Date(customEnd);
      customEnd = temp;
    }

    const diffMs = customEnd.getTime() - customStart.getTime();
    prevEnd = new Date(customStart.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - diffMs);

    return {
      start: customStart,
      end: customEnd,
      prevStart,
      prevEnd,
      label: `Custom (${custom?.from || 'Start'} to ${custom?.to || 'Today'})`
    };
  }

  return { start, end, prevStart, prevEnd, label };
}

/**
 * Normalizes date object or string into a reliable Date instance.
 * Handles "YYYY-MM-DD" local midnight at noon to prevent UTC timezone shift bugs.
 */
export function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split('-').map(Number);
      return new Date(y, m - 1, d, 12, 0, 0, 0);
    }
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Fetches all invoices falling within a specified Date range
 */
export async function fetchInvoicesInRange(start, end) {
  const all = await db.invoices.toArray();
  return all.filter((inv) => {
    const d = parseDate(inv.date || inv.createdAt);
    return d && d >= start && d <= end;
  });
}

/**
 * Fetches all customer payments (wasooli) within range
 */
export async function fetchCustomerPaymentsInRange(start, end) {
  const all = await db.customer_payments.toArray();
  return all.filter((pay) => {
    if (
      pay.isAdvanceAdjustment === true ||
      pay.paymentMethod === 'Advance Adjustment' ||
      (typeof pay.paymentNo === 'string' && pay.paymentNo.startsWith('ADV-ADJ')) ||
      (typeof pay.notes === 'string' && pay.notes.includes('Advance applied against Bill'))
    ) {
      return false;
    }
    const d = parseDate(pay.date || pay.createdAt);
    return d && d >= start && d <= end;
  });
}

/**
 * Fetches all factory daily expenses within range
 */
export async function fetchDailyExpensesInRange(start, end) {
  const all = await db.daily_expenses.toArray();
  return all.filter((exp) => {
    const d = parseDate(exp.date || exp.createdAt);
    return d && d >= start && d <= end;
  });
}

/**
 * Fetches sales returns within range
 */
export async function fetchSalesReturnsInRange(start, end) {
  const all = await db.returns.toArray();
  return all.filter((ret) => {
    if (ret.type !== 'Sales Return' && ret.type !== 'sales_return') return false;
    const d = parseDate(ret.date || ret.createdAt);
    return d && d >= start && d <= end;
  });
}

/**
 * Builds fast Maps of itemId/name -> item stone details for accurate COGS
 */
export async function fetchItemCostMap() {
  const items = await db.items.toArray();
  const mapById = new Map();
  const mapByName = new Map();

  items.forEach((item) => {
    const itemInfo = {
      id: item.id,
      code: item.code,
      name: item.name,
      category: item.category,
      subCategory: item.subCategory,
      ratePerSqFt: Number(item.ratePerSqFt) || 0,
      costPerSqFt: Number(item.costPerSqFt) || Math.round((Number(item.ratePerSqFt) || 0) * 0.72), // Default 72% cost heuristic if unspecified
      sutarThickness: item.sutarThickness || item.thicknessMm || 'Standard',
      stockSqFt: Number(item.stockSqFt) || 0,
      unit: item.unit || 'Sq.Ft'
    };

    if (item.id) mapById.set(item.id, itemInfo);
    if (item.name) mapByName.set(item.name.trim().toLowerCase(), itemInfo);
  });

  return { mapById, mapByName };
}

/**
 * Core P&L and Sales Analytics Generator
 * Aggregates all transactions, line items, customer accounts, expenses,
 * and stone inventory costs using Dexie.js 4 queries.
 *
 * @param {{ horizon?: string, custom?: { from: string, to: string } }} options
 */
export async function getComprehensiveSalesReport({ horizon = 'Monthly', custom = null } = {}) {
  const { start, end, prevStart, prevEnd, label } = getHorizonDateRange(horizon, custom);

  // Parallel Dexie fetch for maximum speed
  const [
    invoices,
    prevInvoices,
    payments,
    expenses,
    returns,
    customers,
    { mapById: itemCostMap, mapByName: itemCostNameMap }
  ] = await Promise.all([
    fetchInvoicesInRange(start, end),
    fetchInvoicesInRange(prevStart, prevEnd),
    fetchCustomerPaymentsInRange(start, end),
    fetchDailyExpensesInRange(start, end),
    fetchSalesReturnsInRange(start, end),
    db.customers.toArray(),
    fetchItemCostMap()
  ]);

  // Customer fast lookup map
  const customerMap = new Map();
  customers.forEach((c) => customerMap.set(c.id, c));

  // ── 1. Summary Metrics ───────────────────────────────────────────────────
  let grossSales = 0;
  let totalDiscount = 0;
  let totalCarriage = 0;
  let totalLabour = 0;
  let totalPolish = 0;
  let totalTax = 0;
  let cashSalesDirect = 0;
  let creditSalesDirect = 0;
  let advanceAdjustedDirect = 0;
  let totalSqFtSold = 0;
  let totalCOGS = 0;

  // Tracking structures
  const categoryStats = {};
  const sutarStats = {
    '4 Sutar (1/2" - 12mm)': { revenue: 0, sqFt: 0, count: 0, cogs: 0 },
    '6 Sutar (3/4" - 18mm)': { revenue: 0, sqFt: 0, count: 0, cogs: 0 },
    '9 Sutar (1" - 25mm)': { revenue: 0, sqFt: 0, count: 0, cogs: 0 },
    '14 Sutar (1.5" - 38mm)': { revenue: 0, sqFt: 0, count: 0, cogs: 0 },
    'Other / Tiles / Patti': { revenue: 0, sqFt: 0, count: 0, cogs: 0 }
  };
  const customerAggregate = {};
  const itemAggregate = {};
  const paymentMethodStats = {};

  // Process Invoices
  invoices.forEach((inv) => {
    const billTotal = Number(inv.grandTotal) || 0;
    const discount = Number(inv.discountAmount) || 0;
    const paid = Number(inv.paidAmount) || 0;
    const due = Number(inv.balanceDue) || 0;

    grossSales += billTotal;
    totalDiscount += discount;
    totalCarriage += Number(inv.carriageCharges) || 0;
    totalLabour += Number(inv.labourCharges) || 0;
    totalPolish += Number(inv.polishCharges) || 0;
    totalTax += Number(inv.taxAmount) || 0;

    // Invoicing breakdown (Accrual basis)
    creditSalesDirect += due;
    const appliedAdv = Number(inv.appliedAdvance) || 0;
    advanceAdjustedDirect += appliedAdv;

    // Spot cash billed directly on this invoice
    let invoiceSpotCash = 0;
    if (inv.customerId) {
      invoiceSpotCash = paid;
    } else {
      const isCash = !inv.paymentMethod || !inv.paymentMethod.toLowerCase().includes('credit');
      invoiceSpotCash = isCash ? (paid || billTotal) : paid;
    }
    cashSalesDirect += invoiceSpotCash;

    // Payment method distribution
    const method = inv.paymentMethod || (isCredit ? 'Credit (ادھار کھاتہ)' : 'Cash (نقد)');
    paymentMethodStats[method] = (paymentMethodStats[method] || 0) + billTotal;

    // Customer aggregation
    const custKey = inv.customerId ? `ID_${inv.customerId}` : (inv.customerName || 'Walk-in Cash Sale');
    if (!customerAggregate[custKey]) {
      const liveCustomer = inv.customerId ? customerMap.get(inv.customerId) : null;
      customerAggregate[custKey] = {
        customerId: inv.customerId || null,
        name: inv.customerName || (liveCustomer ? liveCustomer.name : 'Walk-in Cash Sale'),
        phone: inv.customerPhone || (liveCustomer ? liveCustomer.phone : 'N/A'),
        city: liveCustomer ? liveCustomer.city : 'Jhumra / Faisalabad',
        revenue: 0,
        billsCount: 0,
        sqFt: 0,
        balanceDue: liveCustomer ? Number(liveCustomer.balanceDue) || 0 : due,
        lastDate: inv.date || inv.createdAt
      };
    }
    customerAggregate[custKey].revenue += billTotal;
    customerAggregate[custKey].billsCount += 1;

    // Process line items for COGS, categories, sutars, and items
    (inv.items || []).forEach((line) => {
      const lineSqFt = Number(line.totalSqFt) || (Number(line.sqft) || 0);
      const lineQty = Number(line.quantity !== undefined && line.quantity !== "" ? line.quantity : (line.totalSqFt || line.sqft || line.pieces || line.meters || line.runningFeet || 0));
      const lineAmount = Number(line.amount) || 0;
      totalSqFtSold += lineSqFt;
      customerAggregate[custKey].sqFt += lineSqFt;
      customerAggregate[custKey].totalUnits = (customerAggregate[custKey].totalUnits || 0) + lineQty;

      // Item & COGS lookup
      const catalogItem = (line.itemId ? itemCostMap.get(line.itemId) : null) ||
                          (line.name ? itemCostNameMap.get(line.name.trim().toLowerCase()) : null);
      const unitCost = catalogItem ? catalogItem.costPerSqFt : Math.round((Number(line.ratePerSqFt) || 150) * 0.72);
      const lineCost = lineSqFt > 0 ? (lineSqFt * unitCost) : Math.round(lineAmount * 0.72);
      totalCOGS += lineCost;

      // ── Category Aggregation
      const cat = line.category || (catalogItem ? catalogItem.category : 'General Marble');
      const detUnit = line.unit || catalogItem?.unit || (cat === 'Tiles' ? 'Meters' : (['Flowers', 'Panels', 'Tile Accessories', 'Other Accessories', 'Kakri', 'Kalm'].includes(cat) ? 'Pieces' : (['Borders', 'Kali Patti'].includes(cat) ? 'R.Ft' : 'Sq.Ft')));
      if (!categoryStats[cat]) {
        categoryStats[cat] = {
          name: cat,
          revenue: 0,
          sqFt: 0,
          quantity: 0,
          unit: detUnit,
          cogs: 0,
          profit: 0,
          itemsCount: 0
        };
      }
      categoryStats[cat].revenue += lineAmount;
      categoryStats[cat].sqFt += lineSqFt;
      categoryStats[cat].quantity = (categoryStats[cat].quantity || 0) + lineQty;
      if (!categoryStats[cat].unit && detUnit) categoryStats[cat].unit = detUnit;
      categoryStats[cat].cogs += lineCost;
      categoryStats[cat].profit += (lineAmount - lineCost);
      categoryStats[cat].itemsCount += 1;

      // ── Sutar Thickness Aggregation
      const rawSutar = Number(line.thicknessSutar || catalogItem?.sutarThickness);
      let sutarBucket = 'Other / Tiles / Patti';
      if (rawSutar === 4) sutarBucket = '4 Sutar (1/2" - 12mm)';
      else if (rawSutar === 6) sutarBucket = '6 Sutar (3/4" - 18mm)';
      else if (rawSutar === 9) sutarBucket = '9 Sutar (1" - 25mm)';
      else if (rawSutar === 14) sutarBucket = '14 Sutar (1.5" - 38mm)';

      sutarStats[sutarBucket].revenue += lineAmount;
      sutarStats[sutarBucket].sqFt += lineSqFt;
      sutarStats[sutarBucket].cogs += lineCost;
      sutarStats[sutarBucket].count += 1;

      // ── Product Master Performance Aggregation
      const itemKey = line.itemId ? `ITM_${line.itemId}` : (line.name || 'Custom Cut Marble');
      if (!itemAggregate[itemKey]) {
        itemAggregate[itemKey] = {
          id: line.itemId || null,
          code: line.code || catalogItem?.code || 'MB-GEN',
          name: line.name || 'Marble Slab',
          category: cat,
          unit: detUnit,
          sqFt: 0,
          quantity: 0,
          revenue: 0,
          cogs: 0,
          profit: 0
        };
      }
      itemAggregate[itemKey].sqFt += lineSqFt;
      itemAggregate[itemKey].quantity = (itemAggregate[itemKey].quantity || 0) + lineQty;
      if (!itemAggregate[itemKey].unit && detUnit) itemAggregate[itemKey].unit = detUnit;
      itemAggregate[itemKey].revenue += lineAmount;
      itemAggregate[itemKey].cogs += lineCost;
      itemAggregate[itemKey].profit += (lineAmount - lineCost);
    });
  });

  // ── Calculate Sales Returns Impact & Restock Cost Reversal ──
  const salesReturnsAmount = returns.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
  const netSales = Math.max(0, grossSales - salesReturnsAmount);

  // Reconcile Cost of Goods Sold (COGS) for restocked goods
  let returnedCOGS = 0;
  let returnedSqFt = 0;

  returns.forEach((ret) => {
    (ret.items || []).forEach((rItem) => {
      const isRestocked = !rItem.condition || rItem.condition.toLowerCase().includes('good');
      const rSqFt = Number(rItem.sqft) || 0;
      const rAmt = Number(rItem.amount) || (rSqFt * (Number(rItem.rate) || 0));
      returnedSqFt += rSqFt;

      if (isRestocked) {
        const catalogItem = (rItem.itemId ? itemCostMap.get(rItem.itemId) : null) ||
                            (rItem.name ? itemCostNameMap.get(rItem.name.trim().toLowerCase()) : null);
        const unitCost = catalogItem ? catalogItem.costPerSqFt : Math.round((Number(rItem.rate) || 150) * 0.72);
        const itemReturnedCost = rSqFt > 0 ? (rSqFt * unitCost) : Math.round(rAmt * 0.72);
        returnedCOGS += itemReturnedCost;

        // Reconcile category breakdown
        const cat = rItem.category || (catalogItem ? catalogItem.category : 'General Marble');
        if (categoryStats[cat]) {
          categoryStats[cat].revenue = Math.max(0, categoryStats[cat].revenue - rAmt);
          categoryStats[cat].sqFt = Math.max(0, categoryStats[cat].sqFt - rSqFt);
          categoryStats[cat].cogs = Math.max(0, categoryStats[cat].cogs - itemReturnedCost);
          categoryStats[cat].profit = Math.round(categoryStats[cat].revenue - categoryStats[cat].cogs);
        }

        // Reconcile stone items aggregate
        const itemKey = rItem.itemId ? `ITM_${rItem.itemId}` : (rItem.name || 'Custom Cut Marble');
        if (itemAggregate[itemKey]) {
          itemAggregate[itemKey].revenue = Math.max(0, itemAggregate[itemKey].revenue - rAmt);
          itemAggregate[itemKey].sqFt = Math.max(0, itemAggregate[itemKey].sqFt - rSqFt);
          itemAggregate[itemKey].cogs = Math.max(0, itemAggregate[itemKey].cogs - itemReturnedCost);
          itemAggregate[itemKey].profit = Math.round(itemAggregate[itemKey].revenue - itemAggregate[itemKey].cogs);
        }
      }
    });
  });

  totalCOGS = Math.max(0, totalCOGS - returnedCOGS);
  totalSqFtSold = Math.max(0, totalSqFtSold - returnedSqFt);

  // Wasooli & Factory Daily Expenses (Actual cash/bank receipts only; advance adjustments excluded)
  const isAdjustment = (p) =>
    p.isAdvanceAdjustment === true ||
    p.paymentMethod === 'Advance Adjustment' ||
    (typeof p.paymentNo === 'string' && p.paymentNo.startsWith('ADV-ADJ')) ||
    (typeof p.notes === 'string' && p.notes.includes('Advance applied against Bill'));

  // 1. Actual Customer Receipts from vouchers (Advance deposits, khata recoveries, spot payments in customer_payments)
  const actualReceipts = payments.filter((p) => !isAdjustment(p));
  const wasooliCollections = actualReceipts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Operational Expenses for Net Profit (P&L):
  // Filter out customer return cash refunds to avoid double deducting them (they are already deducted in netSales)
  const isSalesRefundExpense = (e) => {
    const cat = (e.category || '').toLowerCase();
    const rem = (e.remarks || '').toLowerCase();
    return (
      cat.includes('sales cash refund') ||
      cat.includes('واپسی مال نقد') ||
      cat.includes('customer return') ||
      cat.includes('گاہک ادھار / ایڈوانس واپسی') ||
      rem.includes('refund for return')
    );
  };

  const factoryOperatingExpenses = expenses
    .filter((e) => !isSalesRefundExpense(e))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const physicalExpensesTotal = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const factoryExpenses = factoryOperatingExpenses;

  // 2. Direct Walk-in Cash Sales (Invoices without customerId, which do not create customer_payments vouchers)
  // Plus safeguard for unlinked invoices to preserve historical data
  const paidInvoiceIds = new Set(actualReceipts.filter((p) => p.invoiceId).map((p) => p.invoiceId));
  const paidInvoiceNos = new Set(actualReceipts.filter((p) => p.referenceNo).map((p) => p.referenceNo));

  let walkinDirectCashReceipts = 0;
  invoices.forEach((inv) => {
    const isLinkedToPayment =
      (inv.id && paidInvoiceIds.has(inv.id)) ||
      (inv.invoiceNo && paidInvoiceNos.has(inv.invoiceNo));

    if (!isLinkedToPayment) {
      if (!inv.customerId) {
        const isCash = !inv.paymentMethod || !inv.paymentMethod.toLowerCase().includes('credit');
        walkinDirectCashReceipts += isCash ? (Number(inv.paidAmount) || Number(inv.grandTotal) || 0) : Number(inv.paidAmount || 0);
      } else {
        const amt = Number(inv.paidAmount) || 0;
        if (amt > 0 && inv.paymentMethod !== 'Advance Adjustment') {
          walkinDirectCashReceipts += amt;
        }
      }
    }
  });

  // Profit & Loss (Munafa) Engine
  const grossProfit = Math.round(netSales - totalCOGS);
  const grossMarginPct = netSales > 0 ? Math.round((grossProfit / netSales) * 100) : 0;
  const netProfit = Math.round(grossProfit - factoryExpenses);
  const netMarginPct = netSales > 0 ? Math.round((netProfit / netSales) * 100) : 0;

  // Total Cash Inflow = Actual Receipts from Vouchers + Direct Walk-in / Unlinked Cash Sales (100% Cashbook Synchronized)
  const totalCashInflow = wasooliCollections + walkinDirectCashReceipts;
  const netCashFlow = totalCashInflow - physicalExpensesTotal;

  // Cash Ratio: Portion of gross sales covered by spot cash & applied advance vs credit
  const cashRatio = grossSales > 0 ? Math.round(((cashSalesDirect + advanceAdjustedDirect) / grossSales) * 100) : 0;
  const creditRatio = Math.max(0, 100 - cashRatio);

  // Previous Period Comparison for Growth %
  const prevGrossSales = prevInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
  const salesGrowthPct = prevGrossSales > 0
    ? Math.round(((grossSales - prevGrossSales) / prevGrossSales) * 100)
    : (grossSales > 0 ? 100 : 0);

  // ── 2. Category Breakdown Array ──────────────────────────────────────────
  const categoryBreakdown = Object.values(categoryStats)
    .map((cat) => ({
      ...cat,
      profit: Math.round(cat.profit),
      marginPct: cat.revenue > 0 ? Math.round((cat.profit / cat.revenue) * 100) : 0,
      sharePct: grossSales > 0 ? Math.round((cat.revenue / grossSales) * 100) : 0,
      avgRatePerSqFt: cat.sqFt > 0 ? Math.round(cat.revenue / cat.sqFt) : 0
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // ── 3. Sutar Breakdown Array ────────────────────────────────────────────
  const sutarBreakdown = Object.entries(sutarStats).map(([sutarName, data]) => ({
    name: sutarName,
    ...data,
    profit: Math.round(data.revenue - data.cogs),
    marginPct: data.revenue > 0 ? Math.round(((data.revenue - data.cogs) / data.revenue) * 100) : 0,
    sharePct: grossSales > 0 ? Math.round((data.revenue / grossSales) * 100) : 0
  }));

  // ── 4. Top Customers Ranked ──────────────────────────────────────────────
  const topCustomers = Object.values(customerAggregate)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20);

  // ── 5. Top Selling Products ──────────────────────────────────────────────
  const topProducts = Object.values(itemAggregate)
    .map((p) => ({
      ...p,
      marginPct: p.revenue > 0 ? Math.round((p.profit / p.revenue) * 100) : 0
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20);

  // ── 6. Expenses Aggregation & Itemized List ──────────────────────────────
  const expenseCategoryStats = {};
  const expensesList = expenses.map((exp) => {
    const amt = Number(exp.amount) || 0;
    const cat = exp.category || 'Miscellaneous';
    if (!expenseCategoryStats[cat]) {
      expenseCategoryStats[cat] = {
        category: cat,
        totalAmount: 0,
        count: 0
      };
    }
    expenseCategoryStats[cat].totalAmount += amt;
    expenseCategoryStats[cat].count += 1;

    return {
      id: exp.id,
      date: exp.date || (exp.createdAt ? exp.createdAt.slice(0, 10) : ''),
      category: cat,
      paidTo: exp.paidTo || '-',
      remarks: exp.remarks || '-',
      paymentMethod: exp.paymentMethod || 'Cash',
      amount: amt,
      createdAt: exp.createdAt
    };
  }).sort((a, b) => {
    const dateA = a.date || a.createdAt || '';
    const dateB = b.date || b.createdAt || '';
    return dateB.localeCompare(dateA);
  });

  const expensesByCategory = Object.values(expenseCategoryStats).map((c) => ({
    ...c,
    sharePct: factoryExpenses > 0 ? Math.round((c.totalAmount / factoryExpenses) * 100) : 0
  })).sort((a, b) => b.totalAmount - a.totalAmount);

  // ── 7. Invoices Itemized List ────────────────────────────────────────────
  const invoicesList = invoices.map((inv) => {
    const totalSqFt = (inv.items || []).reduce((s, it) => s + (Number(it.totalSqFt) || Number(it.sqft) || 0), 0);
    return {
      id: inv.id,
      invoiceNo: inv.invoiceNo || (inv.id ? `INV-${inv.id}` : 'INV-Direct'),
      date: inv.date || (inv.createdAt ? inv.createdAt.slice(0, 10) : ''),
      customerName: inv.customerName || 'Walk-in Cash Sale',
      customerPhone: inv.customerPhone || '-',
      itemsCount: (inv.items || []).length,
      totalSqFt: Math.round(totalSqFt * 10) / 10,
      grandTotal: Number(inv.grandTotal) || 0,
      paidAmount: Number(inv.paidAmount) || 0,
      balanceDue: Number(inv.balanceDue) || 0,
      paymentMethod: inv.paymentMethod || 'Cash',
      paymentStatus: inv.paymentStatus || (Number(inv.balanceDue) > 0 ? 'Partial/Credit' : 'Paid'),
      createdAt: inv.createdAt
    };
  }).sort((a, b) => {
    const dateA = a.date || a.createdAt || '';
    const dateB = b.date || b.createdAt || '';
    return dateB.localeCompare(dateA);
  });

  // ── 8. Timeline Series for Charts ────────────────────────────────────────
  const timelineSeries = generateTimelineSeries(start, end, horizon, invoices, payments, expenses);

  return {
    horizon,
    label,
    dateRange: {
      start: start.toISOString(),
      end: end.toISOString()
    },
    summary: {
      grossSales,
      invoicesCount: invoices.length,
      totalSqFtSold: Math.round(totalSqFtSold * 10) / 10,
      totalDiscount,
      totalCarriage,
      totalLabour,
      totalPolish,
      totalTax,
      salesReturnsAmount,
      netSales,
      cashSalesDirect,
      creditSalesDirect,
      advanceAdjustedDirect,
      walkinDirectCashReceipts,
      cashRatio,
      creditRatio,
      wasooliCollections,
      factoryExpenses,
      totalCashInflow,
      netCashFlow,
      totalCOGS: Math.round(totalCOGS),
      grossProfit,
      grossMarginPct,
      netProfit,
      netMarginPct,
      salesGrowthPct,
      prevGrossSales,
      // UniversalReportPrintModal & legacy component compatibility:
      totalExpenses: factoryExpenses,
      netOperatingProfit: netProfit,
      cashCollected: totalCashInflow,
      unpaidReceivables: creditSalesDirect,
      invoiceCount: invoices.length
    },
    categoryBreakdown,
    sutarBreakdown,
    topCustomers,
    topProducts,
    expensesByCategory,
    expensesList,
    invoicesList,
    paymentMethodStats,
    timelineSeries,
    rawInvoicesCount: invoices.length
  };
}

/**
 * Builds time series intervals for chart rendering
 */
function generateTimelineSeries(start, end, horizon, invoices, payments, expenses) {
  const map = new Map();

  // Create date buckets based on horizon
  const isYearly = horizon === 'Yearly' || horizon === 'This Year';
  const cur = new Date(start);

  while (cur <= end) {
    const key = isYearly
      ? cur.toISOString().slice(0, 7) // YYYY-MM
      : cur.toISOString().slice(0, 10); // YYYY-MM-DD

    if (!map.has(key)) {
      map.set(key, {
        key,
        dayNumber: cur.getDate(),
        monthName: cur.toLocaleString('default', { month: 'short' }),
        fullMonthName: cur.toLocaleString('default', { month: 'long', year: 'numeric' }),
        label: isYearly
          ? cur.toLocaleString('default', { month: 'short', year: 'numeric' })
          : `${cur.getDate()}`,
        fullLabel: isYearly
          ? cur.toLocaleString('default', { month: 'short', year: 'numeric' })
          : cur.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
        sales: 0,
        wasooli: 0,
        expenses: 0,
        profit: 0
      });
    }

    if (isYearly) {
      cur.setMonth(cur.getMonth() + 1);
    } else {
      cur.setDate(cur.getDate() + 1);
    }
  }

  // Populate Invoices
  invoices.forEach((inv) => {
    const dStr = (inv.date || inv.createdAt || '').slice(0, 10);
    const key = isYearly ? dStr.slice(0, 7) : dStr;
    const bucket = map.get(key);
    if (bucket) {
      bucket.sales += Number(inv.grandTotal) || 0;
      bucket.profit += Math.round((Number(inv.grandTotal) || 0) * 0.28);
    }
  });

  // Populate Payments (Wasooli - excluding advance adjustments)
  const isAdjustmentVoucher = (pay) =>
    pay.isAdvanceAdjustment === true ||
    pay.paymentMethod === 'Advance Adjustment' ||
    (typeof pay.paymentNo === 'string' && pay.paymentNo.startsWith('ADV-ADJ')) ||
    (typeof pay.notes === 'string' && pay.notes.includes('Advance applied against Bill'));

  payments.filter((pay) => !isAdjustmentVoucher(pay)).forEach((pay) => {
    const dStr = (pay.date || pay.createdAt || '').slice(0, 10);
    const key = isYearly ? dStr.slice(0, 7) : dStr;
    const bucket = map.get(key);
    if (bucket) {
      bucket.wasooli += Number(pay.amount) || 0;
    }
  });

  // Also include walk-in cash sales into timeline inflow
  invoices.forEach((inv) => {
    if (!inv.customerId) {
      const isCash = !inv.paymentMethod || !inv.paymentMethod.toLowerCase().includes('credit');
      const amt = isCash ? (Number(inv.paidAmount) || Number(inv.grandTotal) || 0) : Number(inv.paidAmount || 0);
      if (amt > 0) {
        const dStr = (inv.date || inv.createdAt || '').slice(0, 10);
        const key = isYearly ? dStr.slice(0, 7) : dStr;
        const bucket = map.get(key);
        if (bucket) {
          bucket.wasooli += amt;
        }
      }
    }
  });

  // Populate Expenses
  expenses.forEach((exp) => {
    const dStr = (exp.date || exp.createdAt || '').slice(0, 10);
    const key = isYearly ? dStr.slice(0, 7) : dStr;
    const bucket = map.get(key);
    if (bucket) {
      bucket.expenses += Number(exp.amount) || 0;
      bucket.profit -= Number(exp.amount) || 0;
    }
  });

  return Array.from(map.values());
}

/**
 * Generates an Excel-ready CSV string from report data
 */
export function exportSalesReportToCSV(report) {
  if (!report) return '';
  const lines = [];

  // Metadata Header
  lines.push(`"Rana Abdullah Siddique Marble Factory - Sales & P&L Analytics Report"`);
  lines.push(`"Horizon: ${report.label}"`);
  lines.push(`"Generated At: ${new Date().toLocaleString()}"`);
  lines.push('');

  // 1. KPI Summary Block
  lines.push('"--- FINANCIAL KPI SUMMARY (خلاصہ منافع و سیلز) ---"');
  lines.push('"Metric","Amount (PKR)","Notes"');
  lines.push(`"Total Gross Sales",${report.summary.grossSales},"All Invoices Billed"`);
  lines.push(`"Total Discount Awarded",${report.summary.totalDiscount},"Direct Line / Bill Discounts"`);
  lines.push(`"Sales Returns Total",${report.summary.salesReturnsAmount},"Returned Marble Stock"`);
  lines.push(`"Net Realized Sales",${report.summary.netSales},"Gross Sales minus Returns"`);
  lines.push(`"Cost of Goods Sold (COGS)",${report.summary.totalCOGS},"Estimated Stone Purchase/Quarry Cost"`);
  lines.push(`"Gross Profit (خام منافع)",${report.summary.grossProfit},"${report.summary.grossMarginPct}% Margin"`);
  lines.push(`"Factory Daily Expenses",${report.summary.factoryExpenses},"Mess, Fuel, Staff, Utilities"`);
  lines.push(`"Net Profit (خالص منافع)",${report.summary.netProfit},"${report.summary.netMarginPct}% Net Margin"`);
  lines.push(`"Cash Sales Collected",${report.summary.cashSalesDirect},"${report.summary.cashRatio}% of total sales"`);
  lines.push(`"Credit (Udhar) Billed",${report.summary.creditSalesDirect},"${report.summary.creditRatio}% of total sales"`);
  lines.push(`"Recovery Wasooli Collected",${report.summary.wasooliCollections},"Khata Payments Received"`);
  lines.push('');

  // 2. Category Breakdown
  lines.push('"--- CATEGORY PERFORMANCE (اقسام ماربل و ٹائلز) ---"');
  lines.push('"Category","Revenue (PKR)","Sq. Ft.","COGS (PKR)","Profit (PKR)","Margin %","Share %"');
  (report.categoryBreakdown || []).forEach((c) => {
    lines.push(`"${c.name}",${c.revenue},${c.sqFt},${c.cogs},${c.profit},"${c.marginPct}%","${c.sharePct}%"`);
  });
  lines.push('');

  // 3. Sutar Thickness Breakdown
  lines.push('"--- SUTAR THICKNESS PERFORMANCE (موٹائی سوتر) ---"');
  lines.push('"Thickness Category","Revenue (PKR)","Sq. Ft.","Margin %","Share %"');
  (report.sutarBreakdown || []).forEach((s) => {
    lines.push(`"${s.name}",${s.revenue},${s.sqFt},"${s.marginPct}%","${s.sharePct}%"`);
  });
  lines.push('');

  // 4. Top Customers
  lines.push('"--- TOP REVENUE CUSTOMERS (نمبر ون گاہک کھاتہ) ---"');
  lines.push('"Customer Name","Phone","City","Total Billed (PKR)","Bills Count","Total Sq. Ft.","Balance Due (PKR)"');
  (report.topCustomers || []).forEach((cust) => {
    lines.push(`"${cust.name}","${cust.phone}","${cust.city}",${cust.revenue},${cust.billsCount},${cust.sqFt},${cust.balanceDue}`);
  });
  lines.push('');

  // 5. Top Products
  lines.push('"--- TOP SELLING STONE ITEMS (نمبر ون پتھر و مصنوعات) ---"');
  lines.push('"Code","Stone Name","Category","Revenue (PKR)","Sq. Ft.","COGS (PKR)","Profit (PKR)","Margin %"');
  (report.topProducts || []).forEach((p) => {
    lines.push(`"${p.code}","${p.name}","${p.category}",${p.revenue},${p.sqFt},${p.cogs},${p.profit},"${p.marginPct}%"`);
  });
  lines.push('');

  // 6. Factory Daily Expenses
  lines.push('"--- FACTORY DAILY EXPENSES (روزانہ فیکٹری اخراجات) ---"');
  lines.push('"Expense Category","Total Amount (PKR)","Entries Count","Share %"');
  (report.expensesByCategory || []).forEach((e) => {
    lines.push(`"${e.category}",${e.totalAmount},${e.count},"${e.sharePct}%"`);
  });
  lines.push('');
  lines.push('"Date","Category","Paid To / Worker","Remarks / Reason","Method","Amount (PKR)"');
  (report.expensesList || []).forEach((e) => {
    lines.push(`"${e.date}","${e.category}","${e.paidTo}","${(e.remarks || '').replace(/"/g, '""')}","${e.paymentMethod}",${e.amount}`);
  });
  lines.push('');

  // 7. Sales Invoices
  lines.push('"--- SALES INVOICES AUDIT (سیلز بلز تفصیل) ---"');
  lines.push('"Invoice No","Date","Customer Name","Items","Sq. Ft.","Method","Total Bill (PKR)","Paid (PKR)","Balance Due (PKR)"');
  (report.invoicesList || []).forEach((inv) => {
    lines.push(`"${inv.invoiceNo}","${inv.date}","${inv.customerName}",${inv.itemsCount},${inv.totalSqFt},"${inv.paymentMethod}",${inv.grandTotal},${inv.paidAmount},${inv.balanceDue}`);
  });

  return '\uFEFF' + lines.join('\n'); // Prepend UTF-8 BOM for Microsoft Excel Urdu/English compatibility
}

/**
 * Generates JSON formatted string
 */
export function exportSalesReportToJSON(report) {
  return JSON.stringify(report, null, 2);
}

/**
 * Fast Dashboard KPI Summary Fetcher
 */
export async function getQuickSalesKPIs() {
  const todayRange = getHorizonDateRange('Daily');
  const monthRange = getHorizonDateRange('Monthly');

  const [todayInvoices, monthInvoices, customers] = await Promise.all([
    fetchInvoicesInRange(todayRange.start, todayRange.end),
    fetchInvoicesInRange(monthRange.start, monthRange.end),
    db.customers.toArray()
  ]);

  const todaySales = todayInvoices.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
  const monthSales = monthInvoices.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
  const totalReceivables = customers.reduce((s, c) => s + (Number(c.balanceDue) || 0), 0);

  return {
    todaySales,
    monthSales,
    totalReceivables,
    todayBillsCount: todayInvoices.length,
    monthBillsCount: monthInvoices.length
  };
}
