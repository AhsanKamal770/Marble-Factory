import { db, logStockMovement } from './index.js';

// 1. Default Official Factory Settings
export const defaultSettings = {
  companyName: "Rana Shahab Marble Factory",
  tagline: "نام ہی کافی ہے - دوسرے شہروں سے مناسب ریٹ اور اعلیٰ معیار کی گارنٹی",
  phone: "0321-6606645",
  phoneSecondary: "0300-6664187",
  proprietor1: "Rana Haji Ghulam Akbar (0300-6664187)",
  proprietor2: "Rana Ghulam Abbas (0300-7995171)",
  email: "ranashahab.marble@gmail.com",
  address: "Faisalabad Road near PSO Petrol Pump, Jhumra City",
  city: "Jhumra",
  ntnNo: "NTN-33102-RSMF",
  currency: "PKR",
  receiptHeader: "RANA SHAHAB MARBLE GRANITE & TILES",
  receiptFooter: "مال موقع پر چیک کریں۔ بعد میں کٹوتی یا شکایت قابل قبول نہ ہوگی۔",
  thermalWidthMm: 80,
  defaultTaxPercent: 0,
  openingCashBalance: 0
};

// 2. Default System Users
export const defaultUsers = [
  {
    username: "admin",
    passwordHash: "admin",
    fullName: "Master Administrator",
    role: "Admin",
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

/**
 * Clean Production Database Initializer:
 * Only creates factory settings and admin user if they don't exist.
 * Leaves all transaction and inventory tables 100% clean and empty for real factory operations.
 */
export async function initializeDatabaseWithSeedData() {
  const settingsList = await db.settings.toArray();
  if (settingsList.length === 0) {
    await db.settings.add(defaultSettings);
  } else if (settingsList[0].openingCashBalance === 35000 || settingsList[0].openingCashBalance === 25000) {
    await db.settings.update(settingsList[0].id, { openingCashBalance: 0 });
  }

  // Initialize admin user if missing
  const usersCount = await db.users.count();
  if (usersCount === 0) {
    for (const u of defaultUsers) {
      await db.users.add(u);
    }
  }
}

/**
 * Wipe all transaction and inventory data for a completely clean slate
 */
export async function wipeAllData() {
  await db.transaction('rw', [
    db.items,
    db.customers,
    db.suppliers,
    db.invoices,
    db.customer_payments,
    db.supplier_purchases,
    db.supplier_payments,
    db.returns,
    db.stock_movements,
    db.gate_passes,
    db.daily_expenses,
    db.wastage_logs,
    db.employees,
    db.employee_advances,
    db.zakat_records,
    db.zakat_beneficiaries,
    db.payroll_records
  ], async () => {
    await db.items.clear();
    await db.customers.clear();
    await db.suppliers.clear();
    await db.invoices.clear();
    await db.customer_payments.clear();
    await db.supplier_purchases.clear();
    await db.supplier_payments.clear();
    await db.returns.clear();
    await db.stock_movements.clear();
    await db.gate_passes.clear();
    await db.daily_expenses.clear();
    await db.wastage_logs.clear();
    await db.employees.clear();
    await db.employee_advances.clear();
    await db.zakat_records.clear();
    await db.zakat_beneficiaries.clear();
    await db.payroll_records.clear();
  });
}

// ==========================================
// Optional Sample Test Data (For Demo Only)
// ==========================================

export const sampleItems = [
  {
    code: "MB-ZW-01",
    name: "Ziarat White Super Slab",
    category: "Marble Slabs",
    subCategory: "Ziarat Marble",
    sutarThickness: 6,
    finish: "Polished",
    grade: "Grade A (Super)",
    thicknessMm: 18,
    standardSize: "Random Slabs (4ft - 8ft)",
    unit: "Sq. Ft.",
    ratePerSqFt: 380,
    costPerSqFt: 290,
    stockSqFt: 4500,
    stockBoxes: 0,
    stockPieces: 180,
    minStockAlert: 800,
    lotNo: "LOT-2026-ZW",
    location: "Shed 1 - Bay A",
    notes: "Pure white fine grain with subtle crystalline glow"
  },
  {
    code: "MB-SG-02",
    name: "Sunny Grey Classic Slab",
    category: "Marble Slabs",
    subCategory: "Sunny Grey",
    sutarThickness: 4,
    finish: "Polished",
    grade: "Commercial Standard",
    thicknessMm: 16,
    standardSize: "Random Slabs (3ft - 6ft)",
    unit: "Sq. Ft.",
    ratePerSqFt: 180,
    costPerSqFt: 130,
    stockSqFt: 6200,
    stockBoxes: 0,
    stockPieces: 260,
    minStockAlert: 1200,
    lotNo: "LOT-2026-SG",
    location: "Shed 2 - Bay B",
    notes: "Durable grey marble, ideal for stairs and flooring"
  },
  {
    code: "GR-JB-05",
    name: "Jet Black Granite Slab",
    category: "Granite",
    subCategory: "Black Granite",
    sutarThickness: 6,
    finish: "Mirror Polish",
    grade: "Premium Export",
    thicknessMm: 20,
    standardSize: "Jumbo Slabs (8ft x 3ft)",
    unit: "Sq. Ft.",
    ratePerSqFt: 650,
    costPerSqFt: 480,
    stockSqFt: 1850,
    stockBoxes: 0,
    stockPieces: 75,
    minStockAlert: 300,
    lotNo: "LOT-2026-GR-JB",
    location: "Granite Yard - Rack 1",
    notes: "Heavy density granite for kitchen countertops and vanity tops"
  },
  {
    code: "TL-PF-06",
    name: "Royal Onyx White Porcelain Tile (60x60)",
    category: "Porcelain Tiles",
    subCategory: "Floor Tiles",
    sutarThickness: 4,
    finish: "Nano Polished Glazed",
    grade: "AAA Master Grade",
    thicknessMm: 9.5,
    standardSize: "60 x 60 cm (24x24 in)",
    unit: "Boxes",
    sqFtPerBox: 14.4,
    ratePerSqFt: 195,
    ratePerBox: 2808,
    costPerSqFt: 140,
    stockSqFt: 5184,
    stockBoxes: 360,
    stockPieces: 1440,
    minStockAlert: 80,
    lotNo: "LOT-TL-6060-A",
    location: "Tile Showroom Stock Room",
    notes: "14.4 Sq Ft per box (4 pcs/box)"
  }
];

export const sampleCustomers = [
  {
    name: "Chaudhry Tariq (Builder)",
    phone: "0300-8456123",
    email: "tariq.builders@example.com",
    cnic: "42101-9876543-1",
    address: "Gulshan-e-Iqbal Block 13-D",
    city: "Karachi",
    customerType: "Builder",
    creditLimit: 500000,
    totalBilled: 0,
    totalPaid: 0,
    balanceDue: 0,
    notes: "Regular builder for 300 sq. yard bungalows"
  },
  {
    name: "Engr. Salman Raza (Contractor)",
    phone: "0321-4567890",
    email: "salman.raza.contracting@example.com",
    cnic: "42201-1234567-5",
    address: "DHA Phase 6",
    city: "Karachi",
    customerType: "Contractor",
    creditLimit: 1000000,
    totalBilled: 0,
    totalPaid: 0,
    balanceDue: 0,
    notes: "Pays via online bank transfer"
  }
];

export const sampleSuppliers = [
  {
    name: "Balochistan Mining & Quarries Ltd",
    contactPerson: "Nawabzada Mir Khan",
    phone: "0301-7788990",
    email: "sales@bmq-mines.com",
    company: "BMQ Balochistan",
    address: "Hub Industrial Estate / Khuzdar Quarry",
    city: "Hub / Khuzdar",
    totalPurchased: 0,
    totalPaid: 0,
    balancePayable: 0,
    notes: "Main supplier for Ziarat White and Badal blocks"
  }
];

/**
 * Optional: Populate sample demo data for training or testing
 */
export async function populateSampleTestData() {
  await wipeAllData();

  for (const item of sampleItems) {
    const addedId = await db.items.add({
      ...item,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await logStockMovement({
      itemId: addedId,
      itemName: item.name,
      category: item.category,
      movementType: "Initial",
      changeSqFt: item.stockSqFt,
      changeBoxes: item.stockBoxes,
      changePieces: item.stockPieces,
      previousSqFt: 0,
      newSqFt: item.stockSqFt,
      refDocNo: "INITIAL-STOCK",
      note: "Initial opening stock recorded"
    });
  }

  for (const customer of sampleCustomers) {
    await db.customers.add({
      ...customer,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  for (const supplier of sampleSuppliers) {
    await db.suppliers.add({
      ...supplier,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  const returnsCount = await db.returns.count();
  if (returnsCount === 0) {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

    await db.returns.bulkAdd([
      {
        returnNo: "RET-2026-0001",
        type: "Sales Return",
        refDocNo: "INV-2026-001",
        partyId: 1,
        partyName: "Tariq Mehmood Contractor",
        date: twoDaysAgo,
        items: [
          {
            itemId: 2,
            name: "Sunny Grey Classic Slab",
            category: "Marble Slabs",
            sqft: 40,
            rate: 180,
            amount: 7200,
            condition: "Good - Return to Yard Stock"
          }
        ],
        totalAmount: 7200,
        refundAmount: 7200,
        refundMethod: "Deduct from Khata Due Balance",
        reason: "Leftover 40 sq ft after ground floor completion",
        status: "Completed",
        createdAt: twoDaysAgo
      },
      {
        returnNo: "WST-2026-0001",
        type: "Factory Wastage",
        refDocNo: "N/A - Internal",
        partyId: null,
        partyName: "Factory Loss (Bridge-Cutter)",
        date: oneDayAgo,
        items: [
          {
            itemId: 1,
            name: "Ziarat White Super Slab",
            category: "Marble Slabs",
            sqft: 25,
            rate: 290,
            amount: 7250,
            condition: "Damaged - Scrap"
          }
        ],
        totalAmount: 7250,
        refundAmount: 0,
        refundMethod: "N/A - Factory Loss",
        reason: "Bridge-Cutter Cutting Loss: Edge cracked during diagonal 45-degree angle cutting",
        operatorName: "Master Aslam (Cutter Master)",
        status: "Completed",
        createdAt: oneDayAgo
      }
    ]);
  }

  const wastageCount = await db.wastage_logs.count();
  if (wastageCount === 0) {
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    await db.wastage_logs.add({
      logNo: "WST-2026-0001",
      date: oneDayAgo,
      itemId: 1,
      itemName: "Ziarat White Super Slab",
      itemCode: "MB-ZW-01",
      category: "Marble Slabs",
      sutarThickness: "6 Sutar (18mm)",
      sqFt: 25,
      pieces: 2,
      boxes: 0,
      unitCost: 290,
      financialLoss: 7250,
      source: "Bridge-Cutter Cutting Loss",
      reason: "Edge cracked during diagonal 45-degree angle cutting",
      operatorName: "Master Aslam (Cutter Master)",
      createdAt: oneDayAgo
    });
  }
}
