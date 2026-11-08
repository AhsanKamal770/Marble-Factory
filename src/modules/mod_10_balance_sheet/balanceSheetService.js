// ─────────────────────────────────────────────────────────────────────────────
// MOD-10: Balance Sheet & Factory Net Worth Service (بیلنس شیٹ و خالص مالیاتی توازن)
//
// Client's Proprietary Balance Sheet Formula:
//   Net Balance (خالص فیکٹری توازن) =
//       (+) Total Stock Value at Sale Rate (اسٹاک کی کل سیل ویلیو)
//     + (+) Cash in Hand / Drawer (کیش دراز میں رقم)
//     + (+) Customer Receivables / Udhaar (گاہکوں نے جو ادھار دینے ہیں)
//     - (-) Customer Advances / Pending Delivery (گاہک سے ایڈوانس لیا لیکن مال ڈیلیور نہیں کیا)
//     - (-) Supplier Payables (پیسے جو سپلائر کو ادا کرنے ہیں)
// ─────────────────────────────────────────────────────────────────────────────

import { db, getLiveCashInDrawer } from '../../db/index.js';

/**
 * Returns date range boundaries for a selected time horizon
 * @param {string} horizon - 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly' | 'Custom'
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
    prevStart.setDate(start.getDate() - 1);
    prevStart.setHours(0, 0, 0, 0);
    prevEnd.setDate(start.getDate() - 1);
    prevEnd.setHours(23, 59, 59, 999);
    label = 'Today (آج)';
  } else if (horizon === 'Weekly' || horizon === 'This Week') {
    const day = now.getDay(); // 0 is Sunday, 1 is Monday
    const diff = now.getDate() - (day === 0 ? 6 : day - 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    prevStart = new Date(start);
    prevStart.setDate(start.getDate() - 7);
    prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);
    label = 'This Week (اس ہفتے)';
  } else if (horizon === 'Monthly' || horizon === 'This Month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setFullYear(now.getFullYear(), now.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    label = 'This Month (اس ماہ)';
  } else if (horizon === 'Quarterly' || horizon === 'This Quarter') {
    const qMonth = Math.floor(now.getMonth() / 3) * 3;
    start.setFullYear(now.getFullYear(), qMonth, 1);
    start.setHours(0, 0, 0, 0);
    end.setFullYear(now.getFullYear(), qMonth + 3, 0);
    end.setHours(23, 59, 59, 999);
    prevStart = new Date(now.getFullYear(), qMonth - 3, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear(), qMonth, 0, 23, 59, 59, 999);
    label = 'This Quarter (سہ ماہی)';
  } else if (horizon === 'Half-Yearly' || horizon === 'Half Yearly' || horizon === 'This Half') {
    const hMonth = now.getMonth() < 6 ? 0 : 6;
    start.setFullYear(now.getFullYear(), hMonth, 1);
    start.setHours(0, 0, 0, 0);
    end.setFullYear(now.getFullYear(), hMonth + 6, 0);
    end.setHours(23, 59, 59, 999);
    prevStart = new Date(now.getFullYear(), hMonth - 6, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear(), hMonth, 0, 23, 59, 59, 999);
    label = 'Half-Yearly (شش ماہی)';
  } else if (horizon === 'Yearly' || horizon === 'This Year') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setFullYear(now.getFullYear(), 11, 31);
    end.setHours(23, 59, 59, 999);
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
 * Normalizes date object or string into a reliable Date instance at local noon
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
 * Standardizes item category
 */
function normalizeCategory(item) {
  if (!item) return 'General Marble';
  const cat = (item.category || '').toLowerCase();
  const sub = (item.subCategory || '').toLowerCase();
  const name = (item.name || '').toLowerCase();

  if (cat.includes('tile accessories') || sub.includes('tile accessories') || name.includes('gola') || name.includes('spacer') || name.includes('filling') || name.includes('bond')) return 'Tile Accessories';
  if (cat.includes('marble accessories') || sub.includes('marble accessories')) return 'Marble Accessories';
  if (cat.includes('other accessories') || sub.includes('other accessories')) return 'Other Accessories';
  if (cat.includes('kakri') || sub.includes('kakri') || name.includes('kakri')) return 'Kakri';
  if (cat.includes('kalm') || sub.includes('kalm') || name.includes('kalm')) return 'Kalm';
  if (name.includes('sink') || name.includes('basin') || name.includes('seat') || name.includes('combod') || name.includes('commode')) return 'Other Accessories';
  if (cat.includes('tile') || sub.includes('tile') || name.includes('tile')) return 'Tiles';
  if (cat.includes('granite') || sub.includes('granite') || name.includes('granite')) return 'Granite';
  if (cat.includes('accessories') || sub.includes('accessories')) return 'Other Accessories';
  if (cat.includes('border') || sub.includes('border') || name.includes('patti')) return 'Borders & Patti';
  if (cat.includes('flower') || name.includes('flower')) return 'Flowers & Medallions';
  return 'Marble Slabs (ماربل تھان)';
}

/**
 * Core Balance Sheet Analytics Generator
 * Compiles:
 * 1. Stock Valuation at Sale Rate (and Cost Rate)
 * 2. Cash in Hand / Drawer
 * 3. Customer Receivables (Udhaar jo lenay hain)
 * 4. Customer Advances (jo advance liya lekin maal deliver nahi kiya)
 * 5. Supplier Payables (jo supplier ko pay krny hain)
 * 6. Net Factory Balance
 */
export async function getComprehensiveBalanceSheet({ horizon = 'Monthly', custom = null } = {}) {
  const { start, end, prevStart, prevEnd, label } = getHorizonDateRange(horizon, custom);

  // Parallel Dexie fetch for maximum speed
  const [
    items,
    customers,
    suppliers,
    invoices,
    customerPayments,
    supplierPayments,
    expenses,
    settingsList
  ] = await Promise.all([
    db.items.toArray(),
    db.customers.toArray(),
    db.suppliers.toArray(),
    db.invoices.toArray(),
    db.customer_payments.toArray(),
    db.supplier_payments ? db.supplier_payments.toArray() : [],
    db.daily_expenses.toArray(),
    db.settings.toArray()
  ]);

  const settings = settingsList[0] || {};

  // ── 1. Stock Valuation (اسٹاک ویلیویشن) ───────────────────────────────────
  let totalStockSaleValue = 0;
  let totalStockCostValue = 0;
  let totalStockSqFt = 0;
  let totalStockPieces = 0;
  let totalStockMeters = 0;

  const stockCategoryStats = {};
  const stockItemsList = items.map((item) => {
    const isPiece = item.unit === 'Piece' || item.unit === 'Pieces' || item.unit === 'Pcs';
    const isMeter = item.unit === 'Meter' || item.unit === 'Meters';
    const isRunning = item.unit === 'Running Feet' || item.unit === 'R.Ft.';

    let qty = Number(item.stockSqFt || 0);
    if (isPiece) {
      qty = Number(item.stockPieces ?? item.stockQuantity ?? item.stockSqFt ?? 0);
      totalStockPieces += qty;
    } else if (isMeter) {
      qty = Number(item.stockMeters ?? item.stockSqFt ?? 0);
      totalStockMeters += qty;
    } else {
      totalStockSqFt += qty;
    }

    const saleRate = Number(item.ratePerSqFt || item.saleRate || item.rate || 0);
    const costRate = Number(item.costPerSqFt || Math.round(saleRate * 0.72));

    const itemSaleValue = Math.round(qty * saleRate);
    const itemCostValue = Math.round(qty * costRate);
    const itemMargin = itemSaleValue - itemCostValue;

    totalStockSaleValue += itemSaleValue;
    totalStockCostValue += itemCostValue;

    const catKey = normalizeCategory(item);
    if (!stockCategoryStats[catKey]) {
      stockCategoryStats[catKey] = {
        category: catKey,
        itemsCount: 0,
        totalQty: 0,
        saleValue: 0,
        costValue: 0,
        unrealizedProfit: 0
      };
    }
    stockCategoryStats[catKey].itemsCount += 1;
    stockCategoryStats[catKey].totalQty += qty;
    stockCategoryStats[catKey].saleValue += itemSaleValue;
    stockCategoryStats[catKey].costValue += itemCostValue;
    stockCategoryStats[catKey].unrealizedProfit += itemMargin;

    return {
      id: item.id,
      code: item.code || `MB-${item.id}`,
      name: item.name || 'Stone Item',
      category: catKey,
      unit: item.unit || 'Sq.Ft',
      quantity: qty,
      saleRate,
      costRate,
      saleValue: itemSaleValue,
      costValue: itemCostValue,
      unrealizedProfit: itemMargin,
      sutarThickness: item.sutarThickness || item.thicknessMm || 'Standard'
    };
  }).sort((a, b) => b.saleValue - a.saleValue);

  const stockCategoryBreakdown = Object.values(stockCategoryStats).map((c) => ({
    ...c,
    sharePct: totalStockSaleValue > 0 ? Math.round((c.saleValue / totalStockSaleValue) * 100) : 0,
    marginPct: c.saleValue > 0 ? Math.round((c.unrealizedProfit / c.saleValue) * 100) : 0
  })).sort((a, b) => b.saleValue - a.saleValue);

  // ── 2. Cash in Hand / Drawer (کیش ان ہینڈ) ─────────────────────────────────
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const endDateStr = end.toISOString().slice(0, 10);
  const targetDateStr = endDateStr > todayDateStr ? todayDateStr : endDateStr;
  let liveCashData = { liveCash: 0, openingCash: 0, cashSalesToday: 0, wasooliToday: 0, expensesToday: 0 };
  try {
    liveCashData = await getLiveCashInDrawer(targetDateStr);
  } catch (err) {
    console.error('Error fetching live cash in drawer:', err);
  }

  const cashInHand = Math.round(Number(liveCashData?.liveCash ?? liveCashData?.expectedCash ?? 0));

  // ── 3. Customer Receivables (گاہک واجب الوصول ادھار کھاتہ) ──────────────────
  let totalReceivables = 0;
  const debtorCustomers = [];
  const advanceCustomers = [];

  customers.forEach((cust) => {
    const due = Number(cust.balanceDue || 0);
    const adv = Number(cust.advanceBalance || 0);
    if (due > 0) {
      totalReceivables += due;
      debtorCustomers.push({
        id: cust.id,
        name: cust.name || 'Customer Account',
        phone: cust.phone || '-',
        city: cust.city || 'Faisalabad',
        totalBilled: Number(cust.totalBilled || 0),
        totalPaid: Number(cust.totalPaid || 0),
        balanceDue: due
      });
    }
    if (adv > 0) {
      advanceCustomers.push({
        id: cust.id,
        name: cust.name || 'Customer Account',
        phone: cust.phone || '-',
        city: cust.city || 'Faisalabad',
        totalBilled: Number(cust.totalBilled || 0),
        totalPaid: Number(cust.totalPaid || 0),
        advanceAmount: adv,
        notes: cust.notes || 'Customer Advance Balance (پیشگی رقم)'
      });
    }
  });

  debtorCustomers.sort((a, b) => b.balanceDue - a.balanceDue);
  advanceCustomers.sort((a, b) => b.advanceAmount - a.advanceAmount);

  // ── 4. Customer Advances (گاہک پیشگی رقم - واجب الادا ذمہ داری) ───────────
  // Customer Advances reflect strictly the unapplied advance balance
  let totalCustomerAdvances = advanceCustomers.reduce((s, c) => s + c.advanceAmount, 0);

  // ── 5. Supplier Payables (سپلائر واجب الادا رقم) ───────────────────────────
  let totalSupplierPayables = 0;
  const supplierPayablesList = suppliers.map((sup) => {
    const payable = Number(sup.balancePayable || sup.balanceDue || 0);
    if (payable > 0) {
      totalSupplierPayables += payable;
    }
    return {
      id: sup.id,
      name: sup.name || 'Stone Supplier',
      company: sup.company || sup.quarryLocation || 'Quarry Supplier',
      phone: sup.phone || '-',
      totalPurchased: Number(sup.totalPurchased || 0),
      totalPaid: Number(sup.totalPaid || 0),
      balancePayable: payable
    };
  }).filter((s) => s.balancePayable > 0).sort((a, b) => b.balancePayable - a.balancePayable);

  // ── 6. Client Balance Sheet Net Balance Formula ───────────────────────────
  // Total Assets = Stock Value at Sale Rate + Cash in Hand + Customer Receivables
  const totalAssetsSaleBasis = totalStockSaleValue + cashInHand + totalReceivables;
  const totalAssetsCostBasis = totalStockCostValue + cashInHand + totalReceivables;

  // Total Liabilities & Deductions = Customer Advances (Delivery Pending) + Supplier Payables
  const totalLiabilities = totalCustomerAdvances + totalSupplierPayables;

  // NET BALANCE (Client Formula):
  // Net Balance = Stock (Sale Rate) + Cash in Hand + Customer Udhaar - Customer Advances - Supplier Payables
  const netFactoryBalance = totalAssetsSaleBasis - totalLiabilities;
  const netFactoryBalanceCostBasis = totalAssetsCostBasis - totalLiabilities;

  // Financial Health Indicators
  const solvencyRatio = totalLiabilities > 0
    ? (totalAssetsSaleBasis / totalLiabilities).toFixed(2)
    : '100.00';
  const quickLiquidityRatio = totalLiabilities > 0
    ? ((cashInHand + totalReceivables) / totalLiabilities).toFixed(2)
    : '100.00';

  return {
    horizon,
    label,
    dateRange: {
      start: start.toISOString(),
      end: end.toISOString()
    },
    summary: {
      // 1. Stock
      totalStockSaleValue,
      totalStockCostValue,
      unrealizedInventoryProfit: totalStockSaleValue - totalStockCostValue,
      totalStockItemsCount: items.length,
      totalStockSqFt: Math.round(totalStockSqFt * 10) / 10,
      totalStockPieces,
      totalStockMeters,

      // 2. Cash in Drawer
      cashInHand,
      openingCash: liveCashData?.openingCash || 0,
      cashSalesToday: liveCashData?.cashSalesToday || 0,
      wasooliToday: liveCashData?.wasooliToday || 0,
      expensesToday: liveCashData?.expensesToday || 0,

      // 3. Customer Receivables
      totalReceivables,
      debtorCustomersCount: debtorCustomers.length,

      // 4. Customer Advances
      totalCustomerAdvances,
      advanceCustomersCount: advanceCustomers.length,

      // 5. Supplier Payables
      totalSupplierPayables,
      supplierPayablesCount: supplierPayablesList.length,

      // 6. Net Totals (Client Formula)
      totalAssetsSaleBasis,
      totalAssetsCostBasis,
      totalLiabilities,
      netFactoryBalance,
      netFactoryBalanceCostBasis,
      solvencyRatio,
      quickLiquidityRatio
    },
    stockItemsList,
    stockCategoryBreakdown,
    debtorCustomers,
    advanceCustomers,
    supplierPayablesList
  };
}

/**
 * Generates an Excel-ready CSV string from balance sheet data with UTF-8 BOM
 */
export function exportBalanceSheetToCSV(report) {
  if (!report) return '';
  const lines = [];

  // Metadata Header
  lines.push(`"Rana Abdullah Siddique Marble Factory - Balance Sheet & Net Worth Audit"`);
  lines.push(`"Reporting Horizon: ${report.label}"`);
  lines.push(`"Generated At: ${new Date().toLocaleString()}"`);
  lines.push('');

  // 1. Executive Formula Block
  lines.push('"--- CLIENT BALANCE SHEET FORMULA SUMMARY (مالیاتی توازن فارمولا) ---"');
  lines.push('"Component","Effect","Amount (PKR)","Notes"');
  lines.push(`"Stock Value at Sale Rate","(+) ADD",${report.summary.totalStockSaleValue},"Full Market Selling Price of all Yard Stock"`);
  lines.push(`"Cash in Hand / Drawer","(+) ADD",${report.summary.cashInHand},"Live Liquid Cash in Factory Drawer"`);
  lines.push(`"Customer Receivables (Udhaar)","(+) ADD",${report.summary.totalReceivables},"Outstanding Khata Balance Due from Customers"`);
  lines.push(`"Customer Advances (Pending Delivery)","(-) DEDUCT",${report.summary.totalCustomerAdvances},"Advance Cash Taken for Undelivered Marble"`);
  lines.push(`"Supplier Payables (Khata Dues)","(-) DEDUCT",${report.summary.totalSupplierPayables},"Outstanding Money Owed to Stone Quarries"`);
  lines.push(`"NET FACTORY BUSINESS BALANCE","(=) NET WORTH",${report.summary.netFactoryBalance},"Clear Net Financial Worth (Sale Price Basis)"`);
  lines.push(`"Net Balance (Conservative Cost Basis)","(=) COST WORTH",${report.summary.netFactoryBalanceCostBasis},"Calculated using purchase quarry cost"`);
  lines.push('');

  // 2. Stock Category Breakdown
  lines.push('"--- STOCK VALUATION BY CATEGORY (قسم وار اسٹاک ویلیویشن) ---"');
  lines.push('"Category","Items Count","Total Quantity","Sale Value (PKR)","Cost Value (PKR)","Unrealized Profit (PKR)","Share %"');
  (report.stockCategoryBreakdown || []).forEach((c) => {
    lines.push(`"${c.category}",${c.itemsCount},${c.totalQty},${c.saleValue},${c.costValue},${c.unrealizedProfit},"${c.sharePct}%"`);
  });
  lines.push('');

  // 3. Customer Receivables
  lines.push('"--- CUSTOMER RECEIVABLES / UDHAAR (گاہک واجب الوصول کھاتہ) ---"');
  lines.push('"Customer Name","Phone","City","Total Billed (PKR)","Total Paid (PKR)","Balance Due (PKR)"');
  (report.debtorCustomers || []).forEach((c) => {
    lines.push(`"${c.name}","${c.phone}","${c.city}",${c.totalBilled},${c.totalPaid},${c.balanceDue}`);
  });
  lines.push('');

  // 4. Customer Advances
  lines.push('"--- CUSTOMER ADVANCES PENDING DELIVERY (گاہک ایڈوانس / مال ڈیلیور ہونا باقی) ---"');
  lines.push('"Customer Name","Phone","City","Advance Amount (PKR)","Delivery Note"');
  (report.advanceCustomers || []).forEach((c) => {
    lines.push(`"${c.name}","${c.phone}","${c.city}",${c.advanceAmount},"${(c.notes || '').replace(/"/g, '""')}"`);
  });
  lines.push('');

  // 5. Supplier Payables
  lines.push('"--- SUPPLIER PAYABLES (سپلائر واجب الادا رقم) ---"');
  lines.push('"Supplier Name","Company / Quarry","Phone","Total Purchased (PKR)","Total Paid (PKR)","Balance Payable (PKR)"');
  (report.supplierPayablesList || []).forEach((s) => {
    lines.push(`"${s.name}","${s.company}","${s.phone}",${s.totalPurchased},${s.totalPaid},${s.balancePayable}`);
  });

  return '\uFEFF' + lines.join('\n'); // Prepend UTF-8 BOM for Microsoft Excel Urdu/English compatibility
}

/**
 * Generates JSON formatted string
 */
export function exportBalanceSheetToJSON(report) {
  return JSON.stringify(report, null, 2);
}

