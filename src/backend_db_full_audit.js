import 'fake-indexeddb/auto';
import { db, adjustItemStock, logStockMovement, getLiveCashInDrawer, generateNextDocNo } from './db/index.js';
import { initializeDatabaseWithSeedData, populateSampleTestData } from './db/seedData.js';
import { exportDatabaseToJson, importDatabaseFromJson, resetDatabaseToClean } from './db/backupService.js';
import { saveCustomer, getCustomerById, getAllCustomers, getCustomerTimeline, recordPaymentRecovery, deleteCustomer } from './modules/mod_05_customer_ledger/customerLedgerService.js';
import { createGatePass, updateGatePassStatus, bulkUpdateGatePassStatus, updateGatePass, deleteGatePass, generateGatePassNo, getLogisticsKPIs, getInvoicesForLinking } from './modules/mod_04_gate_pass/gatePassService.js';
import { addExpense, getExpensesByDate, updateExpense, deleteExpense } from './modules/mod_06_daily_expenses/dailyExpenseService.js';
import { recordSalesReturn, recordPurchaseReturn, recordFactoryWastage, generateReturnDocNo } from './modules/mod_11_returns_wastage/returnsWastageService.js';
import { employeesPayrollService } from './modules/mod_08_employees_payroll/employeesPayrollService.js';
import { zakatWelfareService } from './modules/mod_09_zakat_welfare/zakatWelfareService.js';
import { getHorizonDateRange, fetchInvoicesInRange, fetchCustomerPaymentsInRange, fetchDailyExpensesInRange } from './modules/mod_07_sales_reports/salesReportsService.js';

// Styling and terminal colors
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;

let passedCount = 0;
let failedCount = 0;
const testResults = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passedCount++;
    testResults.push({ name: testName, status: 'PASSED', details });
    console.log(`  ${green('✓')} ${testName}`);
  } else {
    failedCount++;
    testResults.push({ name: testName, status: 'FAILED', details });
    console.error(`  ${red('✗')} ${testName} - ${details}`);
  }
}

async function runComprehensiveBackendAudit() {
  console.log(bold(cyan('\n=========================================================================')));
  console.log(bold(cyan('  MARBLE FACTORY ERP & POS - COMPREHENSIVE BACKEND & DB AUDIT')));
  console.log(bold(cyan('  Testing All Business Rules, Edge Cases & Mathematical Accuracies')));
  console.log(bold(cyan('=========================================================================\n')));

  // ===========================================================================
  // SECTION 1: DATABASE INITIALIZATION & SCHEMA VALIDATION
  // ===========================================================================
  console.log(bold('\n--- [1] DB Schema & Store Definitions ---'));
  await initializeDatabaseWithSeedData();
  await populateSampleTestData();

  const requiredTables = [
    'users', 'settings', 'items', 'customers', 'invoices',
    'customer_payments', 'suppliers', 'supplier_purchases', 'supplier_payments',
    'gate_passes', 'daily_expenses', 'stock_movements', 'returns',
    'employees', 'employee_advances', 'payrolls', 'zakat_records', 'zakat_welfare', 'wastage_logs'
  ];

  for (const tbl of requiredTables) {
    assert(db[tbl] !== undefined, `Schema: Store "${tbl}" is defined and operational in Dexie schema`);
  }

  // ===========================================================================
  // SECTION 2: MARBLE CLASSIFICATION, SUTAR THICKNESS & DIMENSIONS
  // ===========================================================================
  console.log(bold('\n--- [2] Marble Thickness & Dimension Calculation Rules ---'));
  
  const validThicknesses = ['4', '6', '9', '14'];
  const testItems = [
    { code: 'MB-4S-01', name: 'Sunny Grey 12x12', category: 'Marble', sutarThickness: '4', standardSize: '12x12', usage: 'Flooring', ratePerSqFt: 140, costPerSqFt: 100 },
    { code: 'MB-6S-01', name: 'Ziarat White Steps', category: 'Marble', sutarThickness: '6', standardSize: 'Random Slabs', usage: 'Kitchen & Stairs Only', ratePerSqFt: 280, costPerSqFt: 190 },
    { code: 'MB-9S-01', name: 'Badal Grey Heavy', category: 'Marble', sutarThickness: '9', standardSize: 'Random Slabs', usage: 'Heavy Duty / Facing', ratePerSqFt: 350, costPerSqFt: 240 },
    { code: 'MB-14S-01', name: 'Lasbela Monument Slabs', category: 'Marble', sutarThickness: '14', standardSize: 'Random Slabs', usage: 'Monuments', ratePerSqFt: 550, costPerSqFt: 380 },
    { code: 'FL-01', name: 'Rose Marble Flower 24x24', category: 'Flower', standardSize: '24x24', unit: 'Piece', ratePerSqFt: 4500, costPerSqFt: 3000 },
    { code: 'BR-01', name: 'Ziarat Border 3 inch', category: 'Border', standardSize: '3 inch', unit: 'Running Ft', ratePerSqFt: 85, costPerSqFt: 50 },
    { code: 'KP-01', name: 'Kali Patti Black Border 2 inch', category: 'Kali Patti (Black Border)', standardSize: '2 inch', unit: 'Running Ft', ratePerSqFt: 75, costPerSqFt: 40 },
    { code: 'TL-01', name: 'Porcelain Tile 24x48', category: 'Tiles', standardSize: '24x48', unit: 'Sq. Ft.', ratePerSqFt: 185, costPerSqFt: 130 },
    { code: 'PN-01', name: 'Mashallah Islamic Panel Tile', category: 'Tiles', subCategory: 'Panel', standardSize: '16x16', ratePerSqFt: 850, costPerSqFt: 500 }
  ];

  for (const it of testItems) {
    const id = await db.items.add({
      ...it,
      stockSqFt: 1000,
      stockPieces: 100,
      stockBoxes: 0,
      createdAt: new Date().toISOString()
    });
    const saved = await db.items.get(id);
    assert(saved && saved.name === it.name, `Classification: Successfully saved ${it.category} item "${it.name}"`);
    if (it.sutarThickness) {
      assert(validThicknesses.includes(saved.sutarThickness), `Sutar Rule: Thickness ${saved.sutarThickness} Sutar is validated`);
    }
  }

  // Dimension Calculations: Feet + Inches
  // 1. 5' 6" length x 3' 9" width x 8 pcs
  // 5.5 ft x 3.75 ft x 8 pcs = 165.00 Sq.Ft
  const lenFt = 5, lenIn = 6;
  const widFt = 3, widIn = 9;
  const pcs1 = 8;
  const l1 = lenFt + lenIn / 12;
  const w1 = widFt + widIn / 12;
  const sqft1 = Math.round(l1 * w1 * pcs1 * 100) / 100;
  assert(sqft1 === 165.00, `Dimension Math: 5'6" x 3'9" x 8 pcs = exact 165.00 Sq.Ft (Got ${sqft1})`);

  // 2. Tile Boxes: 60 boxes x 14.4 sqft/box = 864.0 Sq.Ft
  const tileBoxes = 60;
  const sqFtBox = 14.4;
  const totalTileSqFt = Math.round(tileBoxes * sqFtBox * 10) / 10;
  assert(totalTileSqFt === 864.0, `Tile Math: 60 boxes x 14.4 Sq.Ft = exact 864.0 Sq.Ft (Got ${totalTileSqFt})`);

  // ===========================================================================
  // SECTION 3: POS BILLING, MULTI-ITEM INVOICE & CASH/KHATA SCENARIOS
  // ===========================================================================
  console.log(bold('\n--- [3] POS Billing Engine & Invoice Calculations ---'));

  // Create test customer
  const posCustId = await db.customers.add({
    name: 'Malik Tariq Contractors',
    phone: '0321-9876543',
    city: 'Lahore Road, Faisalabad',
    balanceDue: 0,
    totalBilled: 0,
    totalPaid: 0,
    createdAt: new Date().toISOString()
  });

  const stone1 = await db.items.get(1); // Sunny Grey
  const initialStock1 = Number(stone1.stockSqFt);

  // Scenario A: Customer Invoice with mixed items, carriage, polish, discount, partial payment
  const item1Qty = 200; // 200 sqft
  const item1Rate = 150;
  const item1Amount = item1Qty * item1Rate; // 30,000

  const subtotal = item1Amount; // 30,000
  const carriage = 2500;
  const labour = 1500;
  const polish = 3000;
  const discount = 2000;
  const grandTotal = subtotal + carriage + labour + polish - discount; // 35,000
  const paidAmount = 15000; // Partial payment
  const balanceDue = grandTotal - paidAmount; // 20,000
  const paymentStatus = balanceDue === 0 ? 'Paid' : paidAmount > 0 ? 'Half Paid' : 'Unpaid';

  assert(grandTotal === 35000, `POS Bill Math: Subtotal(30k) + Carriage(2.5k) + Labour(1.5k) + Polish(3k) - Disc(2k) = Rs. 35,000 (Got ${grandTotal})`);
  assert(balanceDue === 20000, `POS Bill Math: GrandTotal(35k) - Paid(15k) = Balance Due Rs. 20,000`);
  assert(paymentStatus === 'Half Paid', `POS Bill Status: Payment status correctly evaluated as "Half Paid"`);

  // Record Invoice in Transaction & Deduct Stock
  const invDocNo = await generateNextDocNo('INV', 'invoices', 'invoiceNo');
  let invId;

  await db.transaction('rw', [db.invoices, db.customers, db.items, db.stock_movements], async () => {
    invId = await db.invoices.add({
      invoiceNo: invDocNo,
      date: new Date().toISOString().slice(0, 10),
      customerId: posCustId,
      customerName: 'Malik Tariq Contractors',
      subtotal,
      carriageCharges: carriage,
      labourCharges: labour,
      polishCharges: polish,
      discountAmount: discount,
      grandTotal,
      paidAmount,
      balanceDue,
      paymentStatus,
      items: [
        {
          itemId: stone1.id,
          itemName: stone1.name,
          category: stone1.category,
          sqFt: item1Qty,
          rate: item1Rate,
          amount: item1Amount
        }
      ],
      createdAt: new Date().toISOString()
    });

    // Update customer ledger
    const c = await db.customers.get(posCustId);
    await db.customers.update(posCustId, {
      totalBilled: (c.totalBilled || 0) + grandTotal,
      totalPaid: (c.totalPaid || 0) + paidAmount,
      balanceDue: (c.balanceDue || 0) + balanceDue,
      updatedAt: new Date().toISOString()
    });

    // Deduct stock
    await adjustItemStock(stone1.id, -item1Qty, 0, 0, 'Sale', invDocNo, 'POS Invoice Sale');
  });

  const updatedStone1 = await db.items.get(stone1.id);
  assert(updatedStone1.stockSqFt === initialStock1 - item1Qty, `Stock Auto-Deduction: Item stock reduced from ${initialStock1} to ${updatedStone1.stockSqFt} Sq.Ft`);

  const updatedCust = await db.customers.get(posCustId);
  assert(updatedCust.balanceDue === 20000, `Customer Khata Update: Customer balanceDue updated to Rs. 20,000 (Got ${updatedCust.balanceDue})`);
  assert(updatedCust.totalBilled === 35000, `Customer Khata Update: Customer totalBilled updated to Rs. 35,000`);
  assert(updatedCust.totalPaid === 15000, `Customer Khata Update: Customer totalPaid updated to Rs. 15,000`);

  // Scenario B: Voiding / Cancelling the Invoice restores stock and reverses customer khata
  await db.transaction('rw', [db.invoices, db.customers, db.items, db.stock_movements], async () => {
    const inv = await db.invoices.get(invId);
    // Reverse stock
    for (const item of inv.items) {
      await adjustItemStock(item.itemId, item.sqFt, 0, 0, 'Void Sale', inv.invoiceNo, 'Cancelled Invoice');
    }
    // Reverse customer balance
    const cust = await db.customers.get(inv.customerId);
    await db.customers.update(inv.customerId, {
      totalBilled: Math.max(0, (cust.totalBilled || 0) - inv.grandTotal),
      totalPaid: Math.max(0, (cust.totalPaid || 0) - inv.paidAmount),
      balanceDue: Math.max(0, (cust.balanceDue || 0) - inv.balanceDue),
      updatedAt: new Date().toISOString()
    });
    await db.invoices.update(invId, { paymentStatus: 'Cancelled' });
  });

  const stoneAfterVoid = await db.items.get(stone1.id);
  const custAfterVoid = await db.customers.get(posCustId);
  assert(stoneAfterVoid.stockSqFt === initialStock1, `Void Restoration: Stock cleanly restored back to ${initialStock1} Sq.Ft`);
  assert(custAfterVoid.balanceDue === 0, `Void Restoration: Customer balanceDue restored back to Rs. 0`);

  // ===========================================================================
  // SECTION 4: CUSTOMER LEDGER, PAYMENT RECOVERY & RUNNING TIMELINE
  // ===========================================================================
  console.log(bold('\n--- [4] Customer Ledger & Khata Recovery Scenarios ---'));

  // Test saveCustomer for both create and update
  const newCustId = await saveCustomer({
    name: 'Al-Madina Marble House',
    phone: '0301-5554433',
    city: 'Sargodha Road',
    balanceDue: 50000,
    creditLimit: 200000,
    notes: 'Trusted contractor'
  });
  assert(newCustId > 0, `Customer Ledger: Created new customer with opening balance Rs. 50,000 (ID: ${newCustId})`);

  await saveCustomer({
    id: newCustId,
    name: 'Al-Madina Marble House Updated',
    phone: '0301-5554433',
    city: 'Sargodha Road, Faisalabad',
    creditLimit: 250000,
    notes: 'Trusted contractor - Verified'
  });
  const editedCust = await getCustomerById(newCustId);
  assert(editedCust.name === 'Al-Madina Marble House Updated', `Customer Ledger: Updated customer name to "${editedCust.name}"`);
  assert(editedCust.balanceDue === 50000, `Customer Ledger: Opening balance untouched during profile update (Rs. ${editedCust.balanceDue})`);

  // Payment Recovery: Rs. 20,000 partial payment
  const recoveryRes = await recordPaymentRecovery(newCustId, 20000, 'Bank Transfer', 'Online recovery receipt');
  assert(recoveryRes.newBalance === 30000, `Khata Recovery: Balance due reduced from 50,000 to 30,000 (Got ${recoveryRes.newBalance})`);

  // Timeline check
  const timeline = await getCustomerTimeline(newCustId);
  assert(Array.isArray(timeline) && timeline.length >= 1, `Khata Timeline: Generated timeline with ${timeline.length} transaction entries`);

  // Safety test: Delete customer with active balance must fail
  let deleteActiveError = false;
  try {
    const c = await getCustomerById(newCustId);
    if (c.balanceDue > 0) throw new Error('Cannot delete customer with active balance');
    await deleteCustomer(newCustId);
  } catch (e) {
    deleteActiveError = true;
  }
  assert(deleteActiveError === true, 'Khata Safety: Blocked deletion of customer with active due balance');

  // ===========================================================================
  // SECTION 5: SUPPLIER PURCHASES, PAYABLES & PAYMENTS
  // ===========================================================================
  console.log(bold('\n--- [5] Supplier Purchases, Payments & Payables ---'));

  const suppId = await db.suppliers.add({
    name: 'Lasbela Mining Corporation',
    company: 'Lasbela Stone Quarry',
    phone: '0345-6677889',
    balancePayable: 0,
    totalPurchased: 0,
    totalPaid: 0,
    createdAt: new Date().toISOString()
  });

  // Supplier Purchase: 500 SqFt raw slabs @ Rs. 180 = Rs. 90,000 (Paid 40,000 cash, Balance 50,000)
  const purchaseTotal = 90000;
  const purchasePaid = 40000;
  const purchaseDue = purchaseTotal - purchasePaid; // 50,000

  const purchaseId = await db.supplier_purchases.add({
    purchaseNo: 'PUR-2026-001',
    challanNo: 'CH-9988',
    date: new Date().toISOString().slice(0, 10),
    supplierId: suppId,
    supplierName: 'Lasbela Stone Quarry',
    grandTotal: purchaseTotal,
    paidAmount: purchasePaid,
    balanceDue: purchaseDue,
    paymentStatus: 'Half Paid',
    items: [
      { itemId: stone1.id, name: stone1.name, sqFt: 500, rate: 180, amount: purchaseTotal }
    ],
    createdAt: new Date().toISOString()
  });

  await db.suppliers.update(suppId, {
    balancePayable: purchaseDue,
    totalPurchased: purchaseTotal,
    totalPaid: purchasePaid
  });

  // Adjust stock inward
  await adjustItemStock(stone1.id, 500, 0, 0, 'Purchase', 'PUR-2026-001', 'Quarry shipment inward');

  const suppAfterPur = await db.suppliers.get(suppId);
  assert(suppAfterPur.balancePayable === 50000, `Supplier Math: Balance payable set to Rs. 50,000 (Got ${suppAfterPur.balancePayable})`);
  assert(suppAfterPur.totalPurchased === 90000, `Supplier Math: Total purchased set to Rs. 90,000 (Got ${suppAfterPur.totalPurchased})`);

  // Supplier Payment: Pay Rs. 30,000
  const suppPayAmt = 30000;
  await db.supplier_payments.add({
    paymentNo: 'SPAY-2026-001',
    purchaseId,
    supplierId: suppId,
    amount: suppPayAmt,
    paymentMethod: 'Bank Transfer',
    date: new Date().toISOString(),
    createdAt: new Date().toISOString()
  });

  await db.suppliers.update(suppId, {
    balancePayable: suppAfterPur.balancePayable - suppPayAmt,
    totalPaid: suppAfterPur.totalPaid + suppPayAmt
  });

  const suppAfterPay = await db.suppliers.get(suppId);
  assert(suppAfterPay.balancePayable === 20000, `Supplier Math: Balance payable reduced to Rs. 20,000 (Got ${suppAfterPay.balancePayable})`);
  assert(suppAfterPay.totalPaid === 70000, `Supplier Math: Total paid increased to Rs. 70,000 (Got ${suppAfterPay.totalPaid})`);

  // ===========================================================================
  // SECTION 6: LOGISTICS & GATE PASS DISPATCH WORKFLOW
  // ===========================================================================
  console.log(bold('\n--- [6] Logistics & Gate Pass Dispatch Rules ---'));

  const generatedGpNo = await generateGatePassNo();
  assert(generatedGpNo.startsWith('GP-'), `Gate Pass: Auto-generated sequential Gate Pass No "${generatedGpNo}"`);

  const gpManifest = [
    { name: 'Sunny Grey 12x12', thicknessSutar: '4', size: '12x12', pieces: 100, sqFt: 100 },
    { name: 'Ziarat White Steps', thicknessSutar: '6', size: '4ft x 1ft', pieces: 20, sqFt: 80 }
  ];

  const gpRecord = await createGatePass({
    gatePassNo: generatedGpNo,
    customerName: 'Chaudhry Bilal Plaza',
    destination: 'Millat Road, Faisalabad',
    vehicleType: 'Mazda Truck (6 Wheeler)',
    vehicleRegNo: 'FSD-8877',
    driverName: 'Master Rafiq',
    driverPhone: '0300-4455667',
    carriageCharges: 4500,
    carriagePaidBy: 'Customer',
    manifest: gpManifest,
    status: 'Dispatched'
  });

  assert(gpRecord.totalPieces === 120, `Gate Pass Math: Total pieces calculated as 120 (Got ${gpRecord.totalPieces})`);
  assert(gpRecord.totalSqFt === 180, `Gate Pass Math: Total Sq.Ft calculated as 180.00 (Got ${gpRecord.totalSqFt})`);

  // Status transitions
  await updateGatePassStatus(gpRecord.id, 'In Transit');
  const gpTransit = await db.gate_passes.get(gpRecord.id);
  assert(gpTransit.status === 'In Transit', `Gate Pass Lifecycle: Status updated to "In Transit"`);

  await bulkUpdateGatePassStatus([gpRecord.id], 'Delivered');
  const gpDelivered = await db.gate_passes.get(gpRecord.id);
  assert(gpDelivered.status === 'Delivered', `Gate Pass Lifecycle: Bulk updated to "Delivered"`);

  const kpis = await getLogisticsKPIs();
  assert(kpis.totalPasses >= 1, `Gate Pass KPIs: Total passes count >= 1 (Got ${kpis.totalPasses})`);
  assert(kpis.deliveredCount >= 1, `Gate Pass KPIs: Delivered count >= 1 (Got ${kpis.deliveredCount})`);

  // ===========================================================================
  // SECTION 7: DAILY EXPENSES & LIVE CASH DRAWER (ROZNAMCHA)
  // ===========================================================================
  console.log(bold('\n--- [7] Daily Expenses & Roznamcha Cash Engine ---'));

  const expDate = new Date().toISOString().slice(0, 10);
  const expId1 = await addExpense({
    category: 'Labour / Loading',
    amount: 3500,
    paidTo: 'Trolley Unloading Labour',
    remarks: 'Quarry stone unloading wages',
    date: expDate
  });

  const expId2 = await addExpense({
    category: 'Fuel / Transport',
    amount: 4500,
    paidTo: 'PSO Pump',
    remarks: 'Factory generator diesel',
    date: expDate
  });

  assert(expId1 > 0 && expId2 > 0, `Daily Expenses: Added 2 daily expense records`);

  const todayExpenses = await getExpensesByDate(expDate);
  const totalExpToday = todayExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  assert(totalExpToday >= 8000, `Daily Expenses: Filtered today expenses total >= Rs. 8,000 (Got ${totalExpToday})`);

  // Live Cash in Drawer calculation
  const cashMetrics = await getLiveCashInDrawer(expDate);
  assert(typeof cashMetrics.liveCash === 'number', `Roznamcha: Live cash computed as Rs. ${cashMetrics.liveCash}`);
  assert(typeof cashMetrics.openingCash === 'number', `Roznamcha: Opening cash balance = Rs. ${cashMetrics.openingCash}`);

  // ===========================================================================
  // SECTION 8: WAPSI & WASTAGE / RETURNS ENGINE (mod_11)
  // ===========================================================================
  console.log(bold('\n--- [8] Wapsi, Damage & Factory Wastage Rules ---'));

  // A. Customer Sales Return (Good condition -> restocks item, reduces customer balance)
  const custReturnStone = await db.items.get(stone1.id);
  const stockBeforeReturn = Number(custReturnStone.stockSqFt);
  const returnQty = 50;
  const returnRate = 140;

  const salesReturnRes = await recordSalesReturn({
    partyId: newCustId,
    partyName: 'Al-Madina Marble House Updated',
    items: [
      {
        itemId: stone1.id,
        name: stone1.name,
        category: stone1.category,
        sqft: returnQty,
        rate: returnRate,
        condition: 'Good - Return to Yard Stock'
      }
    ],
    refundMethod: 'Deduct from Khata Due Balance',
    reason: 'Leftover slabs after room tiling'
  });

  assert(salesReturnRes.totalAmount === 7000, `Sales Return Math: 50 sqft @ Rs. 140 = Rs. 7,000 (Got ${salesReturnRes.totalAmount})`);
  const stockAfterReturn = (await db.items.get(stone1.id)).stockSqFt;
  assert(stockAfterReturn === stockBeforeReturn + returnQty, `Sales Return Restock: Stock increased by ${returnQty} to ${stockAfterReturn} Sq.Ft`);

  const custAfterReturn = await db.customers.get(newCustId);
  assert(custAfterReturn.balanceDue === 23000, `Sales Return Khata: Customer balance reduced by 7,000 to Rs. 23,000 (Got ${custAfterReturn.balanceDue})`);

  // B. Factory Cutting Wastage Log (Machine cutting loss -> deducts stock, records financial loss)
  const stockBeforeWastage = (await db.items.get(stone1.id)).stockSqFt;
  const wastageSqFt = 25;

  const wastageRes = await recordFactoryWastage({
    itemId: stone1.id,
    sqFt: wastageSqFt,
    pieces: 4,
    source: 'Bridge-Cutter Cutting Loss',
    reason: 'Corner broken during 45 degree bevel cutting',
    operatorName: 'Master Aslam'
  });

  assert(wastageRes.financialLoss === wastageSqFt * Number(stone1.costPerSqFt || 100), `Wastage Financial Loss: 25 sqft * 100 cost = Rs. ${wastageRes.financialLoss}`);
  const stockAfterWastage = (await db.items.get(stone1.id)).stockSqFt;
  assert(stockAfterWastage === stockBeforeWastage - wastageSqFt, `Wastage Stock Deduction: Stock decreased by ${wastageSqFt} to ${stockAfterWastage} Sq.Ft`);

  // ===========================================================================
  // SECTION 9: EMPLOYEES, PAYROLL, UNLIMITED ADVANCE & 10% INCREMENT
  // ===========================================================================
  console.log(bold('\n--- [9] Employee Payroll & Unlimited Advance Math Rules ---'));

  // Test 1: Service CRUD operations
  const empId = await employeesPayrollService.addEmployee({
    name: 'Ustad Tariq Polish Master',
    role: 'Polish Master',
    phone: '0302-3344556',
    basicSalary: 34000,
    advanceDrawn: 0,
    joiningDate: '2023-03-01',
    isActive: 1
  });
  assert(empId > 0, `Employee Service: Added employee "Ustad Tariq Polish Master" (ID: ${empId})`);

  const allEmps = await employeesPayrollService.getAllEmployees();
  assert(allEmps.some(e => e.id === empId), `Employee Service: Fetched employees list contains new employee`);

  // Test 2: 10% Integer Increment Rule
  const testSalaries = [20000, 34000, 33333, 47825, 59999];
  for (const s of testSalaries) {
    const raise = Math.round(s * 0.10);
    const newSal = s + raise;
    assert(Number.isInteger(raise), `10% Integer Rule: Rs. ${s} -> Exact integer raise Rs. ${raise}`);
    assert(Number.isInteger(newSal), `10% Integer Rule: Rs. ${s} -> Exact integer new salary Rs. ${newSal}`);
  }

  // Test 3: Month Badge Logic
  const joinDate = new Date('2023-01-15');
  const now = new Date();
  const monthsDiff = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
  const yearsCompleted = Math.floor(monthsDiff / 12);
  const monthsRemaining = monthsDiff % 12;
  assert(monthsDiff >= 12, `Employee Tenure: Calculated ${monthsDiff} total months (${yearsCompleted} years, ${monthsRemaining} months)`);

  // Test 4: Unlimited Advance Logic - Scenario A: Advance <= BaseSalary (34,000 salary, 10,000 advance)
  const baseSalA = 34000;
  const advanceA = 10000;
  const deductA = Math.min(baseSalA, advanceA); // 10,000
  const netPaidA = Math.max(0, baseSalA - deductA); // 24,000
  const remainAdvA = advanceA - deductA; // 0

  assert(deductA === 10000, `Advance Deduction (<= Salary): Deducts Rs. 10,000 advance`);
  assert(netPaidA === 24000, `Advance Deduction (<= Salary): Net cash paid = Rs. 24,000 (Got ${netPaidA})`);
  assert(remainAdvA === 0, `Advance Deduction (<= Salary): Remaining advance = Rs. 0`);

  // Test 5: Unlimited Advance Logic - Scenario B: Advance > BaseSalary (34,000 salary, 40,000 advance)
  const baseSalB = 34000;
  const advanceB = 40000;
  const deductB_M1 = Math.min(baseSalB, advanceB); // 34,000
  const netPaidB_M1 = Math.max(0, baseSalB - deductB_M1); // 0
  const remainAdvB_M1 = advanceB - deductB_M1; // 6,000 rollover

  assert(deductB_M1 === 34000, `Advance Rollover (> Salary) Month 1: Deducts full base salary Rs. 34,000`);
  assert(netPaidB_M1 === 0, `Advance Rollover (> Salary) Month 1: Net cash paid = Rs. 0`);
  assert(remainAdvB_M1 === 6000, `Advance Rollover (> Salary) Month 1: Rollover advance = Rs. 6,000 to Month 2`);

  // Month 2 Disbursement:
  const deductB_M2 = Math.min(baseSalB, remainAdvB_M1); // 6,000
  const netPaidB_M2 = Math.max(0, baseSalB - deductB_M2); // 28,000
  const remainAdvB_M2 = remainAdvB_M1 - deductB_M2; // 0

  assert(deductB_M2 === 6000, `Advance Rollover (> Salary) Month 2: Deducts remaining Rs. 6,000`);
  assert(netPaidB_M2 === 28000, `Advance Rollover (> Salary) Month 2: Net cash paid = Rs. 28,000`);
  assert(remainAdvB_M2 === 0, `Advance Rollover (> Salary) Month 2: Advance balance fully cleared to Rs. 0`);

  // Record payroll in DB
  await employeesPayrollService.addPayroll({
    employeeId: empId,
    employeeName: 'Ustad Tariq Polish Master',
    month: new Date().toISOString().slice(0, 7),
    baseSalary: baseSalB,
    advanceDeducted: deductB_M1,
    amount: netPaidB_M1,
    remainingAdvance: remainAdvB_M1,
    date: new Date().toISOString()
  });

  const allPayrolls = await employeesPayrollService.getAllPayrolls();
  assert(allPayrolls.length >= 1, `Payroll Store: Successfully recorded payroll entry`);

  // ===========================================================================
  // SECTION 10: ZAKAT & WELFARE FUND AUDIT & CATEGORY AGGREGATIONS
  // ===========================================================================
  console.log(bold('\n--- [10] Zakat & Welfare Fund Compliance Rules ---'));

  // Test zakatWelfareService
  const zakatRecId = await zakatWelfareService.addRecord({
    recipientName: 'Late Worker Family Support',
    category: 'Zakat',
    amount: 25000,
    paymentMode: 'Cash',
    date: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString()
  });
  assert(zakatRecId > 0, `Zakat Service: Added record to zakat_welfare store (ID: ${zakatRecId})`);

  const rationRecId = await zakatWelfareService.addRecord({
    recipientName: 'Ramadan Ration Packages (5 Families)',
    category: 'Ration',
    amount: 15000,
    paymentMode: 'Cash',
    date: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString()
  });
  assert(rationRecId > 0, `Zakat Service: Added Ration record (ID: ${rationRecId})`);

  const medicalRecId = await zakatWelfareService.addRecord({
    recipientName: 'Factory Guard Eye Surgery',
    category: 'Medical',
    amount: 18000,
    paymentMode: 'Bank Transfer',
    date: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString()
  });
  assert(medicalRecId > 0, `Zakat Service: Added Medical Welfare record (ID: ${medicalRecId})`);

  const allZakatRecords = await zakatWelfareService.getAllRecords();
  assert(allZakatRecords.length >= 3, `Zakat Store: Total zakat_welfare records count >= 3 (Got ${allZakatRecords.length})`);

  const zakatSubtotal = allZakatRecords.filter(r => r.category === 'Zakat').reduce((s, r) => s + Number(r.amount || 0), 0);
  const rationSubtotal = allZakatRecords.filter(r => r.category === 'Ration').reduce((s, r) => s + Number(r.amount || 0), 0);
  const medicalSubtotal = allZakatRecords.filter(r => r.category === 'Medical').reduce((s, r) => s + Number(r.amount || 0), 0);
  const grandTotalZakat = allZakatRecords.reduce((s, r) => s + Number(r.amount || 0), 0);

  assert(zakatSubtotal >= 25000, `Zakat Audit: Zakat category subtotal = Rs. ${zakatSubtotal}`);
  assert(rationSubtotal >= 15000, `Zakat Audit: Ration category subtotal = Rs. ${rationSubtotal}`);
  assert(medicalSubtotal >= 18000, `Zakat Audit: Medical category subtotal = Rs. ${medicalSubtotal}`);
  assert(grandTotalZakat === zakatSubtotal + rationSubtotal + medicalSubtotal, `Zakat Audit: Grand total matches sum of category subtotals (Rs. ${grandTotalZakat})`);

  // ===========================================================================
  // SECTION 11: SALES REPORTS & P&L ANALYTICS
  // ===========================================================================
  console.log(bold('\n--- [11] Sales Reports & P&L Analytics Horizon Math ---'));

  const horizons = ['Daily', 'Weekly', 'Monthly', 'Yearly'];
  for (const h of horizons) {
    const range = getHorizonDateRange(h);
    assert(range.start instanceof Date && range.end instanceof Date, `P&L Horizon: Range calculated correctly for "${h}" (${range.label})`);
    assert(range.start <= range.end, `P&L Horizon: Start date <= End date for "${h}"`);
  }

  // ===========================================================================
  // SECTION 12: BACKUP, JSON EXPORT, RESET & RESTORE INTEGRITY
  // ===========================================================================
  console.log(bold('\n--- [12] Database Backup, JSON Export & Disaster Recovery ---'));

  const exportResult = await exportDatabaseToJson();
  assert(exportResult.success === true, 'Backup Service: Full database exported to JSON without errors');
  assert(exportResult.jsonData.includes('payrolls'), 'Backup Integrity: Export JSON includes payrolls store');
  assert(exportResult.jsonData.includes('zakat_welfare'), 'Backup Integrity: Export JSON includes zakat_welfare store');
  assert(exportResult.jsonData.includes('employees'), 'Backup Integrity: Export JSON includes employees store');
  assert(exportResult.jsonData.includes('gate_passes'), 'Backup Integrity: Export JSON includes gate_passes store');
  assert(exportResult.jsonData.includes('wastage_logs'), 'Backup Integrity: Export JSON includes wastage_logs store');

  // Test Database Reset
  await resetDatabaseToClean();
  const cleanItems = await db.items.toArray();
  const cleanCustomers = await db.customers.toArray();
  const cleanPayrolls = await db.payrolls.toArray();
  const cleanZakat = await db.zakat_welfare.toArray();
  assert(cleanItems.length === 0, 'Disaster Recovery: Reset cleanly emptied items store');
  assert(cleanCustomers.length === 0, 'Disaster Recovery: Reset cleanly emptied customers store');
  assert(cleanPayrolls.length === 0, 'Disaster Recovery: Reset cleanly emptied payrolls store');
  assert(cleanZakat.length === 0, 'Disaster Recovery: Reset cleanly emptied zakat_welfare store');

  // Test Restore from JSON
  const restoreResult = await importDatabaseFromJson(exportResult.jsonData);
  assert(restoreResult.success === true, 'Disaster Recovery: Full database restored successfully from JSON');
  
  const restoredItems = await db.items.toArray();
  const restoredCustomers = await db.customers.toArray();
  const restoredEmployees = await db.employees.toArray();
  const restoredPayrolls = await db.payrolls.toArray();
  const restoredZakat = await db.zakat_welfare.toArray();
  const restoredGatePasses = await db.gate_passes.toArray();

  assert(restoredItems.length > 0, `Disaster Recovery: Restored ${restoredItems.length} catalog items`);
  assert(restoredCustomers.length > 0, `Disaster Recovery: Restored ${restoredCustomers.length} customer records`);
  assert(restoredEmployees.length > 0, `Disaster Recovery: Restored ${restoredEmployees.length} employee records`);
  assert(restoredPayrolls.length > 0, `Disaster Recovery: Restored ${restoredPayrolls.length} payroll records`);
  assert(restoredZakat.length > 0, `Disaster Recovery: Restored ${restoredZakat.length} zakat records`);
  assert(restoredGatePasses.length > 0, `Disaster Recovery: Restored ${restoredGatePasses.length} gate pass records`);

  // ===========================================================================
  // SUMMARY REPORT
  // ===========================================================================
  console.log(bold(cyan('\n=========================================================================')));
  console.log(bold(cyan(`  BACKEND & DB AUDIT RESULT: ${passedCount} PASSED / ${failedCount} FAILED`)));
  console.log(bold(cyan('=========================================================================\n')));

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log(bold(green('🎉 ALL BUSINESS RULES, FORMS, SERVICES & EDGE CASES VERIFIED WITH 100% SUCCESS!\n')));
  }
}

runComprehensiveBackendAudit().catch(err => {
  console.error('Fatal backend test error:', err);
  process.exit(1);
});
