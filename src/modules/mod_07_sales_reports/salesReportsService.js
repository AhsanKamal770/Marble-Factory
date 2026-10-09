// ─────────────────────────────────────────────────────────────────────────────
// MOD-07: Sales Reports & P&L Analytics Service (سیلز رپورٹس و منافع تجزیہ)
//
// Full Dexie.js 4 backend service providing offline-first business intelligence,
// sales aggregation, Cost of Goods Sold (COGS) tracking, Gross & Net Profit
// (Munafa) calculation, Sutar thickness distribution, and customer Khata rankings.
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
    const day = now.getDay(); // 0 is Sunday
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
    // Previous period: last week
    prevStart.setDate(start.getDate() - 7);
    prevStart.setHours(0, 0, 0, 0);
    prevEnd.setDate(start.getDate() - 1);
    prevEnd.setHours(23, 59, 59, 999);
    label = 'This Week (اس ہفتے)';
  } else if (horizon === 'Monthly' || horizon === 'This Month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    // Previous period: last month
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    label = 'This Month (اس ماہ)';
  } else if (horizon === 'Yearly' || horizon === 'This Year') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    // Previous period: last year
    prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    label = 'This Year (اس سال)';
  } else {
    // Custom Range
    const fromStr = custom?.from ? `${custom.from}T00:00:00` : null;
    const toStr = custom?.to ? `${custom.to}T23:59:59.999` : null;
    const customStart = fromStr ? new Date(fromStr) : new Date(0);
    const customEnd = toStr ? new Date(toStr) : end;

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
 * Normalizes date object or string into a reliable Date instance
 */
function parseDate(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Fetches all invoices falling within a specified Date range
 */
export async function fetchInvoicesInRange(start, end) {
  const all = await db.invoices.toArray();
  return all.filter((inv) => {
    const d = parseDate(inv.createdAt || inv.date);
    return d && d >= start && d <= end;
  });
}

/**
 * Fetches all customer payments (wasooli) within range
 */
export async function fetchCustomerPaymentsInRange(start, end) {
  const all = await db.customer_payments.toArray();
  return all.filter((pay) => {
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
    if (ret.type !== 'Sales Return') return false;
    const d = parseDate(ret.date || ret.createdAt);
    return d && d >= start && d <= end;
  });
}

/**
 * Builds a fast Map of itemId -> item stone details for accurate COGS
 */
export async function fetchItemCostMap() {
  const items = await db.items.toArray();
  const map = new Map();
  items.forEach((item) => {
    map.set(item.id, {
      id: item.id,
      code: item.code,
      name: item.name,
      category: item.category,
      subCategory: item.subCategory,
      ratePerSqFt: Number(item.ratePerSqFt) || 0,
      costPerSqFt: Number(item.costPerSqFt) || Math.round((Number(item.ratePerSqFt) || 0) * 0.72), // Default 72% cost heuristic if unspecified
      sutarThickness: item.sutarThickness || item.thicknessMm || 'Standard',
      stockSqFt: Number(item.stockSqFt) || 0
    });
  });
  return map;
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
    itemCostMap
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

    // Cash vs Credit breakdown
    const isCredit = (inv.paymentMethod || '').toLowerCase() === 'credit' || due > 0;
    if (isCredit) {
      cashSalesDirect += paid;
      creditSalesDirect += due;
    } else {
      cashSalesDirect += billTotal;
    }

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
        lastDate: inv.createdAt || inv.date
      };
    }
    customerAggregate[custKey].revenue += billTotal;
    customerAggregate[custKey].billsCount += 1;

    // Process line items for COGS, categories, sutars, and items
    (inv.items || []).forEach((line) => {
      const lineSqFt = Number(line.totalSqFt) || (Number(line.sqft) || 0);
      const lineAmount = Number(line.amount) || 0;
      totalSqFtSold += lineSqFt;
      customerAggregate[custKey].sqFt += lineSqFt;

      // Item & COGS lookup
      const catalogItem = line.itemId ? itemCostMap.get(line.itemId) : null;
      const unitCost = catalogItem ? catalogItem.costPerSqFt : Math.round((Number(line.ratePerSqFt) || 150) * 0.72);
      const lineCost = lineSqFt > 0 ? (lineSqFt * unitCost) : Math.round(lineAmount * 0.72);
      totalCOGS += lineCost;

      // ── Category Aggregation
      const cat = line.category || (catalogItem ? catalogItem.category : 'General Marble');
      if (!categoryStats[cat]) {
        categoryStats[cat] = {
          name: cat,
          revenue: 0,
          sqFt: 0,
          cogs: 0,
          profit: 0,
          itemsCount: 0
        };
      }
      categoryStats[cat].revenue += lineAmount;
      categoryStats[cat].sqFt += lineSqFt;
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
          sqFt: 0,
          revenue: 0,
          cogs: 0,
          profit: 0
        };
      }
      itemAggregate[itemKey].sqFt += lineSqFt;
      itemAggregate[itemKey].revenue += lineAmount;
      itemAggregate[itemKey].cogs += lineCost;
      itemAggregate[itemKey].profit += (lineAmount - lineCost);
    });
  });

  // Calculate Sales Returns Impact
  const salesReturnsAmount = returns.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
  const netSales = Math.max(0, grossSales - salesReturnsAmount);

  // Wasooli & Factory Expenses
  const wasooliCollections = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const factoryExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Profit & Loss (Munafa) Engine
  const grossProfit = Math.round(netSales - totalCOGS);
  const grossMarginPct = netSales > 0 ? Math.round((grossProfit / netSales) * 100) : 0;
  const netProfit = Math.round(grossProfit - factoryExpenses);
  const netMarginPct = netSales > 0 ? Math.round((netProfit / netSales) * 100) : 0;

  // Cash Flow Ratios
  const cashRatio = grossSales > 0 ? Math.round((cashSalesDirect / grossSales) * 100) : 0;
  const creditRatio = 100 - cashRatio;
  const totalCashInflow = cashSalesDirect + wasooliCollections;
  const netCashFlow = totalCashInflow - factoryExpenses;

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
    .slice(0, 15);

  // ── 5. Top Selling Products ──────────────────────────────────────────────
  const topProducts = Object.values(itemAggregate)
    .map((p) => ({
      ...p,
      marginPct: p.revenue > 0 ? Math.round((p.profit / p.revenue) * 100) : 0
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15);

  // ── 6. Timeline Series for Charts ────────────────────────────────────────
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
      prevGrossSales
    },
    categoryBreakdown,
    sutarBreakdown,
    topCustomers,
    topProducts,
    paymentMethodStats,
    timelineSeries,
    rawInvoicesCount: invoices.length
  };
}

/**
 * Builds time series intervals for chart rendering
 */
function generateTimelineSeries(start, end, horizon, invoices, payments, expenses) {
  const points = [];
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
        label: isYearly
          ? cur.toLocaleString('default', { month: 'short', year: 'numeric' })
          : cur.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
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
    const dStr = (inv.createdAt || inv.date || '').slice(0, 10);
    const key = isYearly ? dStr.slice(0, 7) : dStr;
    const bucket = map.get(key);
    if (bucket) {
      bucket.sales += Number(inv.grandTotal) || 0;
      // Estimate 28% gross margin contribution on spot
      bucket.profit += Math.round((Number(inv.grandTotal) || 0) * 0.28);
    }
  });

  // Populate Payments (Wasooli)
  payments.forEach((pay) => {
    const dStr = (pay.date || pay.createdAt || '').slice(0, 10);
    const key = isYearly ? dStr.slice(0, 7) : dStr;
    const bucket = map.get(key);
    if (bucket) {
      bucket.wasooli += Number(pay.amount) || 0;
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
  report.categoryBreakdown.forEach((c) => {
    lines.push(`"${c.name}",${c.revenue},${c.sqFt},${c.cogs},${c.profit},"${c.marginPct}%","${c.sharePct}%"`);
  });
  lines.push('');

  // 3. Sutar Thickness Breakdown
  lines.push('"--- SUTAR THICKNESS PERFORMANCE (موٹائی سوتر) ---"');
  lines.push('"Thickness Category","Revenue (PKR)","Sq. Ft.","Margin %","Share %"');
  report.sutarBreakdown.forEach((s) => {
    lines.push(`"${s.name}",${s.revenue},${s.sqFt},"${s.marginPct}%","${s.sharePct}%"`);
  });
  lines.push('');

  // 4. Top Customers
  lines.push('"--- TOP REVENUE CUSTOMERS (نمبر ون گاہک کھاتہ) ---"');
  lines.push('"Customer Name","Phone","City","Total Billed (PKR)","Bills Count","Total Sq. Ft.","Balance Due (PKR)"');
  report.topCustomers.forEach((cust) => {
    lines.push(`"${cust.name}","${cust.phone}","${cust.city}",${cust.revenue},${cust.billsCount},${cust.sqFt},${cust.balanceDue}`);
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
