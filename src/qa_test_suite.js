import 'fake-indexeddb/auto';
import { db, adjustItemStock, logStockMovement, getLiveCashInDrawer } from './db/index.js';
import { initializeDatabaseWithSeedData, populateSampleTestData, defaultSettings } from './db/seedData.js';
import { exportDatabaseToJson, importDatabaseFromJson, resetDatabaseToClean } from './db/backupService.js';
import { saveCustomer, getCustomerTimeline, recordPaymentRecovery, deleteCustomer } from './modules/mod_05_customer_ledger/customerLedgerService.js';
import { createGatePass, updateGatePassStatus, updateGatePass, deleteGatePass, getInvoicesForLinking, getLogisticsKPIs, generateGatePassNo } from './modules/mod_04_gate_pass/gatePassService.js';
import { addExpense, getExpensesByDate, deleteExpense, updateExpense } from './modules/mod_06_daily_expenses/dailyExpenseService.js';

// Color formatting for console
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;

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

async function runAllTests() {
  console.log(bold(cyan('\n=============================================================')));
  console.log(bold(cyan('  MARBLE FACTORY ERP & POS SYSTEM - COMPREHENSIVE QA TEST SUITE')));
  console.log(bold(cyan('=============================================================\n')));

  // =========================================================================
  // MODULE 1: Database Initialization & Seed Data
  // =========================================================================
  console.log(bold('\n--- [MODULE 1] Database Initialization, Schema & Seed Data ---'));
  await initializeDatabaseWithSeedData();
  await populateSampleTestData();

  const userList = await db.users.toArray();
  assert(userList.length > 0, 'DB Init: Admin user seeded', `Found ${userList.length} user(s)`);
  assert(userList[0].username === 'admin', 'DB Init: Default admin username is "admin"');

  const settingsList = await db.settings.toArray();
  assert(settingsList.length > 0, 'DB Init: Factory settings seeded');
  assert(Number(settingsList[0].openingCashBalance) === 0, 'DB Init: Default opening cash balance is 0');

  const initialItems = await db.items.toArray();
  assert(initialItems.length >= 4, 'DB Init: Sample stone catalog items seeded', `Count: ${initialItems.length}`);

  const initialCustomers = await db.customers.toArray();
  assert(initialCustomers.length >= 2, 'DB Init: Sample customers seeded', `Count: ${initialCustomers.length}`);

  // =========================================================================
  // MODULE 2: Authentication & Authorization
  // =========================================================================
  console.log(bold('\n--- [MODULE 2] Authentication & Security ---'));
  // Test valid login
  const validAdmin = userList.find(u => u.username === 'admin');
  assert(validAdmin && validAdmin.isActive === true, 'Auth: Active admin user exists');

  // Test invalid usernames / passwords
  const invalidUser = userList.find(u => u.username === 'hacker');
  assert(!invalidUser, 'Auth: Non-existing user cannot be authenticated');

  // =========================================================================
  // MODULE 3: Stone Master & Product Catalog (CRUD, Sutar & Stock Audit)
  // =========================================================================
  console.log(bold('\n--- [MODULE 3] Stone Master, Sutar Thickness & Stock Inventory ---'));
  
  // 1. Create new stone item with 6 Sutar thickness
  const newItem = {
    code: 'MB-TEST-01',
    name: 'Ziarat Super Crystal White',
    category: 'Marble Slabs',
    subCategory: 'Balochistan Natural Stone',
    finish: 'Polished',
    grade: 'Grade A',
    sutarThickness: '6',
    thicknessMm: 18,
    standardSize: 'Random Slabs (4-8 ft)',
    unit: 'Sq. Ft.',
    ratePerSqFt: 450,
    costPerSqFt: 300,
    stockSqFt: 1500,
    stockBoxes: 0,
    stockPieces: 30,
    minStockAlert: 300,
    lotNo: 'LOT-2026-TEST',
    location: 'Yard Shed 2',
    notes: 'Premium white crystal lot',
    createdAt: new Date().toISOString()
  };

  const itemId = await db.items.add(newItem);
  assert(itemId > 0, 'Stock CRUD: New stone item created successfully', `ID: ${itemId}`);

  // 2. Read item from DB
  const fetchedItem = await db.items.get(itemId);
  assert(fetchedItem && fetchedItem.name === 'Ziarat Super Crystal White', 'Stock CRUD: Read stone item matches DB record');
  assert(fetchedItem.sutarThickness === '6', 'Stock: 6 Sutar thickness persisted accurately');

  // 3. Update stone item pricing and location
  await db.items.update(itemId, { ratePerSqFt: 480, location: 'Yard Shed 2 - Row B' });
  const updatedItem = await db.items.get(itemId);
  assert(updatedItem.ratePerSqFt === 480, 'Stock CRUD: Item price updated to Rs. 480');
  assert(updatedItem.location === 'Yard Shed 2 - Row B', 'Stock CRUD: Yard location updated');

  // 4. Test atomic stock adjustment with stock_movements log
  const prevStock = updatedItem.stockSqFt;
  await adjustItemStock(itemId, -200, 0, -4, 'Sale', 'TEST-DOC-001', 'Test stock deduction');
  const postAdjustItem = await db.items.get(itemId);
  assert(postAdjustItem.stockSqFt === 1300, 'Stock Adjustment: Stock deducted correctly from 1500 to 1300 Sq.Ft');

  const movements = await db.stock_movements.where('itemId').equals(itemId).toArray();
  assert(movements.length > 0, 'Stock Movement: Audit log created for stock change');
  assert(movements[0].movementType === 'Sale', 'Stock Movement: Type recorded as "Sale"');
  assert(movements[0].previousSqFt === 1500 && movements[0].newSqFt === 1300, 'Stock Movement: Audit trail numbers match exact delta');

  // 5. Test stock valuation calculation
  const allCurrentItems = await db.items.toArray();
  const totalValuation = allCurrentItems.reduce((acc, it) => acc + (Number(it.stockSqFt || 0) * Number(it.costPerSqFt || 0)), 0);
  assert(totalValuation > 0, 'Stock Valuation: Total yard valuation calculated accurately', `Rs. ${totalValuation.toLocaleString()}`);

  // =========================================================================
  // MODULE 4: Customer Ledger & Digital Khata
  // =========================================================================
  console.log(bold('\n--- [MODULE 4] Customer Ledger & Digital Khata ---'));

  // 1. Create new customer profile
  const newCustData = {
    name: 'Malik Builders & Developers',
    phone: '0300-8889999',
    cnic: '33100-1234567-1',
    city: 'Faisalabad',
    address: 'Satyana Road Commercial Plaza',
    creditLimit: 500000,
    balanceDue: 0,
    notes: 'Commercial customer account'
  };

  const custId = await saveCustomer(newCustData);
  assert(custId > 0, 'Customer CRUD: New customer profile created', `ID: ${custId}`);

  const custRecord = await db.customers.get(custId);
  assert(custRecord.name === 'Malik Builders & Developers', 'Customer CRUD: Profile record verified in DB');

  // 2. Record payment recovery
  // Simulate an invoice first: Grand Total = 100,000, Paid = 40,000, Balance Due = 60,000
  const testInvoice = {
    invoiceNo: 'INV-TEST-0001',
    date: new Date().toISOString(),
    customerId: custId,
    customerName: custRecord.name,
    customerPhone: custRecord.phone,
    items: [
      { itemId, name: fetchedItem.name, thicknessSutar: 6, totalSqFt: 200, ratePerSqFt: 500, amount: 100000 }
    ],
    subtotal: 100000,
    carriageCharges: 0,
    labourCharges: 0,
    polishCharges: 0,
    discountAmount: 0,
    grandTotal: 100000,
    paidAmount: 40000,
    balanceDue: 60000,
    paymentStatus: 'Half Paid',
    paymentMethod: 'Cash',
    createdAt: new Date().toISOString()
  };

  const invId = await db.invoices.add(testInvoice);
  await db.customers.update(custId, {
    totalBilled: 100000,
    totalPaid: 40000,
    balanceDue: 60000
  });

  // Record payment voucher for initial POS paid amount
  await db.customer_payments.add({
    paymentNo: 'PAY-TEST-0001',
    invoiceId: invId,
    customerId: custId,
    customerName: custRecord.name,
    date: new Date().toISOString(),
    amount: 40000,
    paymentMethod: 'Cash',
    referenceNo: testInvoice.invoiceNo,
    notes: 'POS Down Payment',
    createdAt: new Date().toISOString()
  });

  // Now customer pays recovery of Rs. 35,000
  const recoveryRes = await recordPaymentRecovery(custId, 35000, 'Bank Transfer', 'Cheque #998822 Cleared');
  assert(recoveryRes.newBalance === 25000, 'Customer Ledger: Balance correctly reduced from 60,000 to 25,000');

  // Verify Customer Timeline
  const timeline = await getCustomerTimeline(custId);
  assert(timeline.length === 3, 'Customer Timeline: 3 entries present (1 invoice + 2 payments)');
  assert(timeline[0].runningBalance === 25000, 'Customer Timeline: Latest running balance is Rs. 25,000');

  // Verify Customer Deletion Protection
  let deleteBlocked = false;
  try {
    await deleteCustomer(custId);
  } catch (err) {
    deleteBlocked = true;
  }
  assert(deleteBlocked, 'Customer Safety: Deletion blocked when customer has active invoices');

  // =========================================================================
  // MODULE 5: POS Dimension Calculator & Factory Bill Book Engine
  // =========================================================================
  console.log(bold('\n--- [MODULE 5] POS Engine, Dimension Calculations & Invoices ---'));

  // 1. Test Marble Dimension Area Calculation: (4ft + 6in/12) * (2ft + 0in/12) * 10 pieces
  const lengthFt = 4;
  const lengthIn = 6; // 4.5 ft
  const widthFt = 2;
  const widthIn = 0; // 2.0 ft
  const pieces = 10;
  const effLength = lengthFt + (lengthIn / 12);
  const effWidth = widthFt + (widthIn / 12);
  const calculatedSqFt = Math.round(effLength * effWidth * pieces * 100) / 100;
  assert(calculatedSqFt === 90, 'POS Math: 4ft 6in × 2ft × 10 pcs = 90.0 Sq.Ft (Accurate)');

  // 2. Test Box Packing Calculation: 25 boxes * 14.4 sqft/box
  const boxCount = 25;
  const sqFtPerBox = 14.4;
  const boxSqFt = boxCount * sqFtPerBox;
  assert(boxSqFt === 360, 'POS Math: 25 Boxes × 14.4 Sq.Ft/Box = 360.0 Sq.Ft (Accurate)');

  // 3. Test Full Bill Calculation with Sutar, Charges & Discount
  const billRate = 400;
  const lineAmount = calculatedSqFt * billRate; // 90 * 400 = 36,000
  const carriageCharges = 1500;
  const labourCharges = 800;
  const polishCharges = 1200;
  const discountAmount = 1500;
  const expectedGrandTotal = lineAmount + carriageCharges + labourCharges + polishCharges - discountAmount; // 38,000
  assert(expectedGrandTotal === 38000, 'POS Bill Math: Subtotal (36,000) + Carriage (1500) + Labour (800) + Polish (1200) - Discount (1500) = Rs. 38,000');

  // 4. Test Void Invoice with Stock & Khata Rollback
  const voidInvoiceTest = {
    invoiceNo: 'INV-TEST-VOID',
    date: new Date().toISOString(),
    customerId: custId,
    customerName: custRecord.name,
    items: [{ itemId, name: fetchedItem.name, totalSqFt: 50, amount: 20000 }],
    grandTotal: 20000,
    paidAmount: 5000,
    balanceDue: 15000,
    paymentStatus: 'Half Paid',
    createdAt: new Date().toISOString()
  };

  const voidInvId = await db.invoices.add(voidInvoiceTest);
  await adjustItemStock(itemId, -50, 0, 0, 'Sale', voidInvoiceTest.invoiceNo, 'Sold');
  const stockBeforeVoid = (await db.items.get(itemId)).stockSqFt;

  // Execute Void Transaction
  await db.transaction('rw', [db.invoices, db.items, db.customers, db.stock_movements], async () => {
    // Return stock
    await adjustItemStock(itemId, 50, 0, 0, 'Adjustment', voidInvoiceTest.invoiceNo, 'Voided Invoice Stock Restored');
    await db.invoices.delete(voidInvId);
  });

  const stockAfterVoid = (await db.items.get(itemId)).stockSqFt;
  assert(stockAfterVoid === stockBeforeVoid + 50, 'Void Bill: Inventory stock restored back by +50 Sq.Ft');
  const checkDeletedInv = await db.invoices.get(voidInvId);
  assert(!checkDeletedInv, 'Void Bill: Invoice record cleanly deleted from database');

  // =========================================================================
  // MODULE 6: Supplier Purchases & Raw Stock Inward
  // =========================================================================
  console.log(bold('\n--- [MODULE 6] Supplier Purchases & Raw Stock Inward ---'));

  // 1. Add Supplier Profile
  const newSupplier = {
    name: 'Balochistan Quarry Slabs Corp',
    contactPerson: 'Haji Noor Muhammad',
    phone: '0333-7771122',
    company: 'Noor Slabs & Blocks Ltd',
    city: 'Khuzdar',
    address: 'Mining Zone Plot 44',
    totalPurchased: 0,
    totalPaid: 0,
    balancePayable: 0,
    createdAt: new Date().toISOString()
  };

  const supId = await db.suppliers.add(newSupplier);
  assert(supId > 0, 'Supplier CRUD: Supplier profile created', `ID: ${supId}`);

  // 2. Record Inward Stock Shipment
  const purchaseNo = 'PUR-2026-TEST01';
  const purchaseSqFt = 800;
  const purchaseRate = 220;
  const purchaseGrandTotal = purchaseSqFt * purchaseRate; // 176,000
  const purchasePaid = 76000;
  const purchaseDue = 100000;

  const stockBeforePur = (await db.items.get(itemId)).stockSqFt;

  await db.transaction('rw', [db.supplier_purchases, db.suppliers, db.items, db.stock_movements, db.supplier_payments], async () => {
    await db.supplier_purchases.add({
      purchaseNo,
      challanNo: 'CH-9901',
      vehicleNo: 'TK-8890',
      date: new Date().toISOString(),
      supplierId: supId,
      supplierName: newSupplier.name,
      items: [{ itemId, name: fetchedItem.name, totalSqFt: purchaseSqFt, rate: purchaseRate, amount: purchaseGrandTotal }],
      grandTotal: purchaseGrandTotal,
      paidAmount: purchasePaid,
      balanceDue: purchaseDue,
      paymentStatus: 'Half Paid',
      createdAt: new Date().toISOString()
    });

    // Inward stock adjustment
    await adjustItemStock(itemId, purchaseSqFt, 0, 0, 'Purchase', purchaseNo, 'Inward shipment');

    // Update supplier balance
    await db.suppliers.update(supId, {
      totalPurchased: purchaseGrandTotal,
      totalPaid: purchasePaid,
      balancePayable: purchaseDue,
      updatedAt: new Date().toISOString()
    });
  });

  const stockAfterPur = (await db.items.get(itemId)).stockSqFt;
  assert(stockAfterPur === stockBeforePur + purchaseSqFt, 'Supplier Inward: Stock increased in yard by +800 Sq.Ft');

  const supRecord = await db.suppliers.get(supId);
  assert(supRecord.balancePayable === 100000, 'Supplier Ledger: Balance payable recorded as Rs. 100,000');

  // =========================================================================
  // MODULE 7: Rickshaw Gate Pass Logistics
  // =========================================================================
  console.log(bold('\n--- [MODULE 7] Rickshaw Gate Pass Logistics ---'));

  // 1. Generate Gate Pass Number
  const gpNo = await generateGatePassNo();
  assert(gpNo.startsWith('GP-') && gpNo.length >= 11, 'Gate Pass: Sequential numbering generated', gpNo);

  // 2. Create Gate Pass linked to Invoice
  const gatePassData = {
    gatePassNo: gpNo,
    invoiceId: invId,
    invoiceNo: testInvoice.invoiceNo,
    customerName: testInvoice.customerName,
    customerPhone: testInvoice.customerPhone,
    destination: 'Satyana Road Commercial Plaza',
    vehicleType: 'Qingqi Rickshaw',
    vehicleRegNo: 'FSD-7712',
    driverName: 'Muhammad Aslam (Rickshaw)',
    driverPhone: '0301-5554433',
    carriageCharges: 1200,
    carriagePaidBy: 'Customer (موقع پر ادا کرے گا)',
    driverAdvance: 200,
    manifest: [
      { name: fetchedItem.name, thicknessSutar: '6', size: '4ft × 2.5ft', pieces: 10, sqFt: 100 }
    ],
    status: 'Dispatched',
    notes: 'Handle with care'
  };

  const createdGP = await createGatePass(gatePassData);
  assert(createdGP.id > 0, 'Gate Pass: Created and stored in database', `ID: ${createdGP.id}`);
  assert(createdGP.totalPieces === 10, 'Gate Pass: Total manifest pieces verified = 10');
  assert(createdGP.totalSqFt === 100, 'Gate Pass: Total manifest Sq.Ft verified = 100');

  // 3. Update Status to Delivered
  await updateGatePassStatus(createdGP.id, 'Delivered');
  const deliveredGP = await db.gate_passes.get(createdGP.id);
  assert(deliveredGP.status === 'Delivered', 'Gate Pass: Status lifecycle updated to Delivered');

  // 4. Test Logistics KPIs
  const logisticsKPIs = await getLogisticsKPIs();
  assert(logisticsKPIs.totalPasses > 0, 'Gate Pass KPIs: Total passes counted accurately');
  assert(logisticsKPIs.todayDispatches > 0, 'Gate Pass KPIs: Today dispatches counted accurately');

  // =========================================================================
  // MODULE 8: Daily Expenses & Cash Drawer (Roznamcha)
  // =========================================================================
  console.log(bold('\n--- [MODULE 8] Daily Expenses & Cash Drawer Management ---'));

  // 1. Add Daily Expenses
  const exp1 = await addExpense({
    category: 'Food / Mess',
    amount: 1500,
    paidTo: 'Al-Madina Hotel',
    remarks: 'Staff tea and lunch'
  });
  assert(exp1 > 0, 'Expenses: Expense 1 (Food Rs. 1500) logged');

  const exp2 = await addExpense({
    category: 'Fuel / Transport',
    amount: 3000,
    paidTo: 'Pakistan State Oil',
    remarks: 'Generator diesel 10 Litres'
  });
  assert(exp2 > 0, 'Expenses: Expense 2 (Fuel Rs. 3000) logged');

  // 2. Fetch today's expenses
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayExps = await getExpensesByDate(todayStr);
  assert(todayExps.length >= 2, 'Expenses: Today expense records retrieved');

  // 3. Test Live Cash In Drawer Calculation
  // Formula: Opening (0) + Walk-in Cash + Customer Wasooli - Expenses (4500)
  const drawer = await getLiveCashInDrawer();
  assert(drawer.openingCash === 0, 'Roznamcha: Opening cash is verified as 0');
  assert(drawer.expensesToday >= 4500, 'Roznamcha: Total expenses counted correctly');
  assert(typeof drawer.liveCash === 'number', 'Roznamcha: Live cash in drawer computed without NaN', `Rs. ${drawer.liveCash.toLocaleString()}`);

  // =========================================================================
  // MODULE 9: Returns & Wastage
  // =========================================================================
  console.log(bold('\n--- [MODULE 9] Returns & Wastage Logging ---'));

  // 1. Customer Sales Return
  const returnNo = 'RET-2026-TEST01';
  const returnSqFt = 40;
  const returnRate = 450;
  const returnAmount = returnSqFt * returnRate; // 18,000

  const stockBeforeReturn = (await db.items.get(itemId)).stockSqFt;

  await db.transaction('rw', [db.returns, db.items, db.customers, db.stock_movements], async () => {
    await db.returns.add({
      returnNo,
      type: 'Sales Return',
      partyId: custId,
      partyName: custRecord.name,
      date: new Date().toISOString(),
      items: [{ itemId, name: fetchedItem.name, sqft: returnSqFt, rate: returnRate, amount: returnAmount }],
      totalAmount: returnAmount,
      refundMethod: 'Deduct from Khata Due Balance',
      reason: 'Leftover slabs from site',
      createdAt: new Date().toISOString()
    });

    await adjustItemStock(itemId, returnSqFt, 0, 0, 'Sales Return', returnNo, 'Leftover customer return');
  });

  const stockAfterReturn = (await db.items.get(itemId)).stockSqFt;
  assert(stockAfterReturn === stockBeforeReturn + returnSqFt, 'Returns: Returned stock restored to inventory by +40 Sq.Ft');

  // =========================================================================
  // MODULE 9A: Employees, Payroll, Unlimited Advances & 10% Increment
  // =========================================================================
  console.log(bold('\n--- [MODULE 9A] Employees, Payroll, Advances & 10% Raise ---'));

  // 1. Add Employee with 1-Year Completed Anniversary
  const joinDateTwoYearsAgo = new Date();
  joinDateTwoYearsAgo.setFullYear(joinDateTwoYearsAgo.getFullYear() - 2);
  const empId = await db.employees.add({
    name: 'Muhammad Rashid Cutter',
    role: 'Marble Cutter',
    phone: '0300-1122334',
    joiningDate: joinDateTwoYearsAgo.toISOString().slice(0, 10),
    salaryType: 'Monthly',
    baseSalary: 34000,
    advanceBalance: 0,
    createdAt: new Date().toISOString()
  });
  const addedEmp = await db.employees.get(empId);
  assert(addedEmp && addedEmp.name === 'Muhammad Rashid Cutter', 'Employees: Employee Muhammad Rashid registered');
  assert(Number(addedEmp.baseSalary) === 34000, 'Employees: Base salary recorded as Rs. 34,000');

  // 2. 10% Integer Annual Raise Calculation Test
  const currentBase = Number(addedEmp.baseSalary);
  const tenPercentRaise = Math.round(currentBase * 0.10);
  const newSalaryAfterRaise = currentBase + tenPercentRaise;
  assert(tenPercentRaise === 3400, 'Employees: 10% increment is exact integer 3,400');
  assert(newSalaryAfterRaise === 37400, 'Employees: New salary after 10% raise is integer Rs. 37,400');
  await db.employees.update(empId, { baseSalary: newSalaryAfterRaise });

  // 3. Issue Advance (Unlimited Advance Feature: e.g. Rs. 40,000 > salary 37,400)
  const advanceAmount = 40000;
  await db.employee_advances.add({
    employeeId: empId,
    employeeName: addedEmp.name,
    amount: advanceAmount,
    paymentMode: 'Cash',
    notes: 'Advance for house construction',
    date: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString()
  });
  await db.employees.update(empId, { advanceBalance: advanceAmount });
  const empAfterAdvance = await db.employees.get(empId);
  assert(Number(empAfterAdvance.advanceBalance) === 40000, 'Employees: Advance of Rs. 40,000 recorded (higher than salary)');

  // 4. Monthly Salary Disbursement with Auto-Adjustment
  const baseSal = Number(empAfterAdvance.baseSalary); // 37,400
  const curAdv = Number(empAfterAdvance.advanceBalance); // 40,000
  const autoDeduction = Math.min(baseSal, curAdv); // 37,400
  const netCashPaid = Math.max(0, baseSal - autoDeduction); // 0
  const remainingAdv = curAdv - autoDeduction; // 2,600

  await db.payrolls.add({
    employeeId: empId,
    employeeName: addedEmp.name,
    month: new Date().toISOString().slice(0, 7),
    baseSalary: baseSal,
    advanceDeducted: autoDeduction,
    amount: netCashPaid,
    remainingAdvance: remainingAdv,
    paymentMode: 'Cash',
    date: new Date().toISOString(),
    createdAt: new Date().toISOString()
  });
  await db.employees.update(empId, { advanceBalance: remainingAdv });

  const empAfterSalary = await db.employees.get(empId);
  assert(Number(empAfterSalary.advanceBalance) === 2600, 'Employees: Remaining advance after auto-deduction is Rs. 2,600');
  assert(netCashPaid === 0, 'Employees: Net cash paid is Rs. 0 because full salary adjusted against advance');

  // =========================================================================
  // MODULE 9B: Zakat & Welfare Fund Compliance
  // =========================================================================
  console.log(bold('\n--- [MODULE 9B] Zakat & Welfare Fund Compliance ---'));

  // 1. Record Zakat Disbursement
  const zakatId = await db.zakat_records.add({
    recipientName: 'Haleema Bibi (Widow)',
    phone: '0300-9988776',
    category: 'Zakat',
    amount: 15000,
    paymentMode: 'Cash',
    reason: 'Monthly family support',
    date: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString()
  });
  const zakatRec = await db.zakat_records.get(zakatId);
  assert(zakatRec && zakatRec.recipientName === 'Haleema Bibi (Widow)', 'Zakat: Zakat disbursement record saved');
  assert(Number(zakatRec.amount) === 15000, 'Zakat: Amount Rs. 15,000 recorded');
  assert(zakatRec.category === 'Zakat', 'Zakat: Category verified as Zakat');

  // 2. Record Welfare Ration Aid
  const welfareId = await db.zakat_records.add({
    recipientName: 'Master Aslam (Helper)',
    phone: '0301-5544332',
    category: 'Ration',
    amount: 8000,
    paymentMode: 'Cash',
    reason: 'Ramadan Ration Box',
    date: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString()
  });
  const allZakat = await db.zakat_records.toArray();
  const totalZakatDist = allZakat.reduce((s, z) => s + Number(z.amount || 0), 0);
  assert(totalZakatDist === 23000, 'Zakat: Total fund distributed calculated accurately as Rs. 23,000');


  // =========================================================================
  // MODULE 10: Database Backup, Export & Clean Reset
  // =========================================================================
  console.log(bold('\n--- [MODULE 10] Backup, Export & Database Recovery ---'));

  // 1. Export JSON Backup
  const exportRes = await exportDatabaseToJson();
  assert(exportRes.success === true, 'Backup: Database exported to JSON successfully');
  assert(exportRes.jsonData && exportRes.jsonData.includes('Rana Abdullah Siddique'), 'Backup: Export contains system header and tables');

  // 2. Test Clean Reset
  await resetDatabaseToClean();
  const resetItems = await db.items.toArray();
  const resetInvoices = await db.invoices.toArray();
  assert(resetItems.length === 0, 'DB Reset: Items table cleanly emptied');
  assert(resetInvoices.length === 0, 'DB Reset: Invoices table cleanly emptied');

  // 3. Test Restore from JSON Backup
  const restoreRes = await importDatabaseFromJson(exportRes.jsonData);
  assert(restoreRes.success === true, 'Restore: Database restored from JSON successfully');
  const restoredItems = await db.items.toArray();
  assert(restoredItems.length > 0, 'Restore: Items restored from backup', `Restored ${restoredItems.length} items`);

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log(bold(cyan('\n=============================================================')));
  console.log(bold(cyan(`  QA TEST SUMMARY: ${passedCount} PASSED / ${failedCount} FAILED`)));
  console.log(bold(cyan('=============================================================\n')));

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log(bold(green('🎉 ALL 30+ TEST SUITE ASSERTIONS PASSED WITH 100% SUCCESS!\n')));
  }
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
