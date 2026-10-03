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
  // ── MARBLE 4 SUTAR CATEGORIES ──
  {
    code: "MB-4S-1212",
    name: "Badal Grey Marble 4-Sutar (12×12)",
    category: "Marble",
    subCategory: "4 Sutar (12×12)",
    sutarThickness: 4,
    finish: "Polished",
    grade: "Grade A",
    thicknessMm: 12,
    standardSize: "12 × 12 in",
    unit: "Sq. Ft.",
    ratePerSqFt: 160,
    costPerSqFt: 115,
    stockSqFt: 3800,
    stockBoxes: 0,
    stockPieces: 3800,
    minStockAlert: 500,
    lotNo: "LOT-4S-1212",
    location: "Shed 1 - Bay A",
    notes: "4 Sutar 12×12 cut-to-size floor tiles"
  },
  {
    code: "MB-4S-1224",
    name: "Sunny White Marble 4-Sutar (12×24)",
    category: "Marble",
    subCategory: "4 Sutar (12×24)",
    sutarThickness: 4,
    finish: "Polished",
    grade: "Grade A",
    thicknessMm: 12,
    standardSize: "12 × 24 in",
    unit: "Sq. Ft.",
    ratePerSqFt: 190,
    costPerSqFt: 140,
    stockSqFt: 4200,
    stockBoxes: 0,
    stockPieces: 2100,
    minStockAlert: 600,
    lotNo: "LOT-4S-1224",
    location: "Shed 1 - Bay B",
    notes: "4 Sutar 12×24 standard cut marble"
  },
  {
    code: "MB-4S-612",
    name: "Ziarat White Marble 4-Sutar (6×12)",
    category: "Marble",
    subCategory: "4 Sutar (6×12)",
    sutarThickness: 4,
    finish: "Polished",
    grade: "Super Grade",
    thicknessMm: 12,
    standardSize: "6 × 12 in",
    unit: "Sq. Ft.",
    ratePerSqFt: 210,
    costPerSqFt: 155,
    stockSqFt: 2900,
    stockBoxes: 0,
    stockPieces: 5800,
    minStockAlert: 400,
    lotNo: "LOT-4S-612",
    location: "Shed 1 - Bay C",
    notes: "4 Sutar 6×12 border/stair skirt tile"
  },
  {
    code: "MB-4S-624",
    name: "Boticina Fancy Marble 4-Sutar (6×24)",
    category: "Marble",
    subCategory: "4 Sutar (6×24)",
    sutarThickness: 4,
    finish: "Polished",
    grade: "Premium",
    thicknessMm: 12,
    standardSize: "6 × 24 in",
    unit: "Sq. Ft.",
    ratePerSqFt: 240,
    costPerSqFt: 175,
    stockSqFt: 2500,
    stockBoxes: 0,
    stockPieces: 2500,
    minStockAlert: 350,
    lotNo: "LOT-4S-624",
    location: "Shed 1 - Bay D",
    notes: "4 Sutar 6×24 long strip tiles"
  },

  // ── MARBLE 6 SUTAR (ONLY USED FOR KITCHEN & STAIRS) ──
  {
    code: "MB-6S-KIT",
    name: "Ziarat White 6-Sutar Kitchen Slab",
    category: "Marble",
    subCategory: "6 Sutar (Kitchen & Stairs)",
    sutarThickness: 6,
    finish: "Super Mirror Polish",
    grade: "Grade A (Super)",
    thicknessMm: 18,
    standardSize: "6 Sutar (Kitchen & Stairs)",
    unit: "Sq. Ft.",
    ratePerSqFt: 420,
    costPerSqFt: 310,
    stockSqFt: 3600,
    stockBoxes: 0,
    stockPieces: 140,
    minStockAlert: 500,
    lotNo: "LOT-6S-ZW-KIT",
    location: "Shed 2 - Bay A",
    notes: "6 Sutar strictly used for kitchen counters & heavy stair treads"
  },
  {
    code: "MB-6S-STR",
    name: "Tavera 6-Sutar Stairs Slab",
    category: "Marble",
    subCategory: "6 Sutar (Kitchen & Stairs)",
    sutarThickness: 6,
    finish: "Polished Edge",
    grade: "Commercial Heavy",
    thicknessMm: 18,
    standardSize: "6 Sutar (Kitchen & Stairs)",
    unit: "Sq. Ft.",
    ratePerSqFt: 280,
    costPerSqFt: 210,
    stockSqFt: 2900,
    stockBoxes: 0,
    stockPieces: 125,
    minStockAlert: 400,
    lotNo: "LOT-6S-TAV",
    location: "Shed 2 - Bay B",
    notes: "6 Sutar stair treads with bullnose readiness"
  },

  // ── MARBLE 9 SUTAR & 14 SUTAR ──
  {
    code: "MB-9S-STP",
    name: "Verona 9-Sutar Heavy Steps",
    category: "Marble",
    subCategory: "9 Sutar (Heavy Steps)",
    sutarThickness: 9,
    finish: "Polished",
    grade: "Heavy Duty",
    thicknessMm: 28,
    standardSize: "9 Sutar (Heavy Steps)",
    unit: "Sq. Ft.",
    ratePerSqFt: 520,
    costPerSqFt: 390,
    stockSqFt: 1800,
    stockBoxes: 0,
    stockPieces: 70,
    minStockAlert: 200,
    lotNo: "LOT-9S-VERONA",
    location: "Shed 3 - Bay A",
    notes: "9 Sutar heavy duty marble for main grand stairs and risers"
  },
  {
    code: "MB-14S-BAS",
    name: "Granite Grey 14-Sutar Heavy Base",
    category: "Marble",
    subCategory: "14 Sutar (Heavy Base)",
    sutarThickness: 14,
    finish: "Honed / Polished",
    grade: "Industrial Grade",
    thicknessMm: 44,
    standardSize: "14 Sutar (Heavy Base)",
    unit: "Sq. Ft.",
    ratePerSqFt: 780,
    costPerSqFt: 590,
    stockSqFt: 1200,
    stockBoxes: 0,
    stockPieces: 45,
    minStockAlert: 150,
    lotNo: "LOT-14S-BASE",
    location: "Shed 3 - Bay B",
    notes: "14 Sutar extra thick structural foundation and base marble"
  },

  // ── TYPES OF FLOWER (12×12, 24×24, 3×3) ──
  {
    code: "FL-1212",
    name: "Mosaic Rose Flower (12 × 12)",
    category: "Flower",
    subCategory: "Flower 12×12",
    sutarThickness: 4,
    finish: "Handcrafted Polish",
    grade: "Super Fine",
    thicknessMm: 12,
    standardSize: "12 × 12 in",
    unit: "Pieces",
    ratePerSqFt: 1100,
    costPerSqFt: 750,
    stockSqFt: 45,
    stockBoxes: 5,
    stockPieces: 45,
    minStockAlert: 10,
    lotNo: "LOT-FL-12",
    location: "Flower Section Rack 1",
    notes: "Handcrafted 12x12 center flower medallion"
  },
  {
    code: "FL-2424",
    name: "Royal Star Medallion Flower (24 × 24)",
    category: "Flower",
    subCategory: "Flower 24×24",
    sutarThickness: 4,
    finish: "Premium Polish",
    grade: "Super Fine",
    thicknessMm: 12,
    standardSize: "24 × 24 in",
    unit: "Pieces",
    ratePerSqFt: 2800,
    costPerSqFt: 1950,
    stockSqFt: 60,
    stockBoxes: 15,
    stockPieces: 15,
    minStockAlert: 5,
    lotNo: "LOT-FL-24",
    location: "Flower Section Rack 2",
    notes: "24x24 large floor entrance flower medallion"
  },
  {
    code: "FL-33",
    name: "Grand Imperial Center Flower (3 × 3)",
    category: "Flower",
    subCategory: "Flower 3×3",
    sutarThickness: 4,
    finish: "Master Craft Polish",
    grade: "Super Fine",
    thicknessMm: 12,
    standardSize: "3 × 3 ft",
    unit: "Pieces",
    ratePerSqFt: 5500,
    costPerSqFt: 3800,
    stockSqFt: 90,
    stockBoxes: 10,
    stockPieces: 10,
    minStockAlert: 3,
    lotNo: "LOT-FL-33",
    location: "Flower Section Rack 3",
    notes: "3ft × 3ft grand drawing room flower"
  },

  // ── TYPES OF BORDER (3 INCH, 6 INCH) ──
  {
    code: "BR-03IN",
    name: "Standard Border Patti (3 inch)",
    category: "Border",
    subCategory: "Border 3 inch",
    sutarThickness: 4,
    finish: "Polished Edge",
    grade: "Grade A",
    thicknessMm: 12,
    standardSize: "3 inch",
    unit: "Running Feet",
    ratePerSqFt: 35,
    costPerSqFt: 22,
    stockSqFt: 450,
    stockBoxes: 0,
    stockPieces: 450,
    minStockAlert: 80,
    lotNo: "LOT-BR-3IN",
    location: "Border Bay 1",
    notes: "3-inch decorative border patti"
  },
  {
    code: "BR-06IN",
    name: "Standard Border Patti (6 inch)",
    category: "Border",
    subCategory: "Border 6 inch",
    sutarThickness: 4,
    finish: "Polished Edge",
    grade: "Grade A",
    thicknessMm: 12,
    standardSize: "6 inch",
    unit: "Running Feet",
    ratePerSqFt: 65,
    costPerSqFt: 42,
    stockSqFt: 380,
    stockBoxes: 0,
    stockPieces: 380,
    minStockAlert: 60,
    lotNo: "LOT-BR-6IN",
    location: "Border Bay 2",
    notes: "6-inch wide boundary border patti"
  },

  // ── TYPES OF BLACK BORDER (KALI PATTI: 2 INCH, 3 INCH) ──
  {
    code: "KP-02IN",
    name: "Kali Patti Black Border (2 inch)",
    category: "Kali Patti",
    subCategory: "Kali Patti 2 inch",
    sutarThickness: 4,
    finish: "Polished Edge",
    grade: "Pure Jet Black",
    thicknessMm: 12,
    standardSize: "2 inch",
    unit: "Running Feet",
    ratePerSqFt: 25,
    costPerSqFt: 15,
    stockSqFt: 600,
    stockBoxes: 0,
    stockPieces: 600,
    minStockAlert: 100,
    lotNo: "LOT-KP-2IN",
    location: "Border Bay 3",
    notes: "2-inch Kali Patti (Black Border) for room borders"
  },
  {
    code: "KP-03IN",
    name: "Kali Patti Black Border (3 inch)",
    category: "Kali Patti",
    subCategory: "Kali Patti 3 inch",
    sutarThickness: 4,
    finish: "Polished Edge",
    grade: "Pure Jet Black",
    thicknessMm: 12,
    standardSize: "3 inch",
    unit: "Running Feet",
    ratePerSqFt: 38,
    costPerSqFt: 24,
    stockSqFt: 520,
    stockBoxes: 0,
    stockPieces: 520,
    minStockAlert: 90,
    lotNo: "LOT-KP-3IN",
    location: "Border Bay 4",
    notes: "3-inch Kali Patti for wide borders"
  },

  // ── TYPES OF TILES (12×24, 24×24, 24×48, 16×16) ──
  {
    code: "TL-1224",
    name: "Royal Carrara Gloss Tile (12 × 24)",
    category: "Tiles",
    subCategory: "Tiles 12×24",
    sutarThickness: 4,
    finish: "Glazed Porcelain",
    grade: "AAA Grade",
    thicknessMm: 9,
    standardSize: "12 × 24 in",
    unit: "Boxes",
    sqFtPerBox: 16,
    ratePerSqFt: 165,
    costPerSqFt: 120,
    stockSqFt: 4800,
    stockBoxes: 300,
    stockPieces: 2400,
    minStockAlert: 80,
    lotNo: "LOT-TL-1224",
    location: "Tile Bay A",
    notes: "12×24 wall & floor tiles"
  },
  {
    code: "TL-2424",
    name: "Onyx Super Polished Tile (24 × 24)",
    category: "Tiles",
    subCategory: "Tiles 24×24",
    sutarThickness: 4,
    finish: "Nano Polished",
    grade: "AAA Master Grade",
    thicknessMm: 9.5,
    standardSize: "24 × 24 in",
    unit: "Boxes",
    sqFtPerBox: 14.4,
    ratePerSqFt: 195,
    costPerSqFt: 140,
    stockSqFt: 5184,
    stockBoxes: 360,
    stockPieces: 1440,
    minStockAlert: 80,
    lotNo: "LOT-TL-2424",
    location: "Tile Bay B",
    notes: "24×24 large floor porcelain tiles (4 pcs/box)"
  },
  {
    code: "TL-2448",
    name: "Grande Luxury Porcelain Tile (24 × 48)",
    category: "Tiles",
    subCategory: "Tiles 24×48",
    sutarThickness: 4,
    finish: "Glazed Polished",
    grade: "AAA Master Grade",
    thicknessMm: 10,
    standardSize: "24 × 48 in",
    unit: "Boxes",
    sqFtPerBox: 16,
    ratePerSqFt: 240,
    costPerSqFt: 180,
    stockSqFt: 3840,
    stockBoxes: 240,
    stockPieces: 480,
    minStockAlert: 60,
    lotNo: "LOT-TL-2448",
    location: "Tile Bay C",
    notes: "24×48 jumbo porcelain tiles (2 pcs/box)"
  },
  {
    code: "TL-1616",
    name: "Classic Ceramic Glazed Tile (16 × 16)",
    category: "Tiles",
    subCategory: "Tiles 16×16",
    sutarThickness: 4,
    finish: "Matt / Anti-Slip",
    grade: "Standard Grade",
    thicknessMm: 8.5,
    standardSize: "16 × 16 in",
    unit: "Boxes",
    sqFtPerBox: 14.2,
    ratePerSqFt: 145,
    costPerSqFt: 105,
    stockSqFt: 3550,
    stockBoxes: 250,
    stockPieces: 2000,
    minStockAlert: 70,
    lotNo: "LOT-TL-1616",
    location: "Tile Bay D",
    notes: "16×16 floor ceramic tiles"
  },

  // ── OTHER ITEMS ONLY WITH TILES (BORDER, FILLING, SPACER, GOLA) ──
  {
    code: "ACC-BR-01",
    name: "Tile Border Patti",
    category: "Tile Accessories",
    subCategory: "Tile Accessories - Border",
    sutarThickness: 0,
    finish: "Glazed Ceramic",
    grade: "Standard",
    thicknessMm: 8,
    standardSize: "3 × 12 in",
    unit: "Running Feet",
    ratePerSqFt: 45,
    costPerSqFt: 28,
    stockSqFt: 350,
    stockBoxes: 0,
    stockPieces: 350,
    minStockAlert: 50,
    lotNo: "LOT-ACC-TBR",
    location: "Accessories Shelf 1",
    notes: "Tile border decorative patti"
  },
  {
    code: "ACC-FL-01",
    name: "Tile Joint Filling / Bond Grout",
    category: "Tile Accessories",
    subCategory: "Tile Accessories - Filling",
    sutarThickness: 0,
    finish: "Powder / Polymer",
    grade: "Super Bond",
    thicknessMm: 0,
    standardSize: "20kg Bag",
    unit: "Pieces",
    ratePerSqFt: 480,
    costPerSqFt: 340,
    stockSqFt: 150,
    stockBoxes: 0,
    stockPieces: 150,
    minStockAlert: 30,
    lotNo: "LOT-ACC-FL",
    location: "Accessories Warehouse",
    notes: "Joint filling grout & tile adhesive bond"
  },
  {
    code: "ACC-SP-01",
    name: "Tile Cross Spacers (3mm)",
    category: "Tile Accessories",
    subCategory: "Tile Accessories - Spacer",
    sutarThickness: 0,
    finish: "Plastic",
    grade: "Standard",
    thicknessMm: 3,
    standardSize: "3mm Cross (Pack of 100)",
    unit: "Pieces",
    ratePerSqFt: 120,
    costPerSqFt: 75,
    stockSqFt: 500,
    stockBoxes: 50,
    stockPieces: 500,
    minStockAlert: 100,
    lotNo: "LOT-ACC-SP",
    location: "Accessories Shelf 2",
    notes: "Tile spacer pack for uniform joint lines"
  },
  {
    code: "ACC-GL-01",
    name: "Chamfer Corner Gola Patti (8ft)",
    category: "Tile Accessories",
    subCategory: "Tile Accessories - Gola",
    sutarThickness: 0,
    finish: "Glazed / PVC",
    grade: "Standard",
    thicknessMm: 10,
    standardSize: "8 Feet Length",
    unit: "Running Feet",
    ratePerSqFt: 85,
    costPerSqFt: 55,
    stockSqFt: 450,
    stockBoxes: 0,
    stockPieces: 150,
    minStockAlert: 80,
    lotNo: "LOT-ACC-GL",
    location: "Accessories Shelf 3",
    notes: "Tile edge chamfer gola for corner protection"
  },

  // ── PANELS (INCLUDED IN TILES CATEGORY, HIGHER RATE) ──
  {
    code: "TL-PN-MSH",
    name: "Mashallah Calligraphy Tile Panel (24 × 48)",
    category: "Panels",
    subCategory: "Mashallah Panels (Higher Rate)",
    sutarThickness: 4,
    finish: "Gold Foil Embossed",
    grade: "Exclusive Luxury",
    thicknessMm: 10,
    standardSize: "24 × 48 in",
    unit: "Pieces",
    ratePerSqFt: 4500,
    costPerSqFt: 3200,
    stockSqFt: 30,
    stockBoxes: 15,
    stockPieces: 30,
    minStockAlert: 5,
    lotNo: "LOT-MSH-PANEL",
    location: "Panel Showroom Display",
    notes: "Higher rate decorative Mashallah wall panel for front elevation / entrance"
  },
  {
    code: "TL-PN-AYT",
    name: "Ayat-ul-Kursi Entrance Panel (24 × 48)",
    category: "Panels",
    subCategory: "Mashallah / Islamic Panels (Higher Rate)",
    sutarThickness: 4,
    finish: "3D Laser Embossed",
    grade: "Exclusive Luxury",
    thicknessMm: 10,
    standardSize: "24 × 48 in",
    unit: "Pieces",
    ratePerSqFt: 4800,
    costPerSqFt: 3400,
    stockSqFt: 25,
    stockBoxes: 10,
    stockPieces: 25,
    minStockAlert: 4,
    lotNo: "LOT-AYT-PANEL",
    location: "Panel Showroom Display",
    notes: "Higher rate decorative Islamic panel"
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
    creditLimit: 500000,
    totalBilled: 0,
    totalPaid: 0,
    balanceDue: 0,
    notes: "Regular customer for 300 sq. yard bungalows"
  },
  {
    name: "Engr. Salman Raza (Contractor)",
    phone: "0321-4567890",
    email: "salman.raza.contracting@example.com",
    cnic: "42201-1234567-5",
    address: "DHA Phase 6",
    city: "Karachi",
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
