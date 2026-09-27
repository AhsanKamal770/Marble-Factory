import { db, logStockMovement } from './index';

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
  openingCashBalance: 35000
};

export const sampleItems = [
  {
    code: "MB-ZW-01",
    name: "Ziarat White Super Slab",
    category: "Marble Slabs",
    subCategory: "Ziarat Marble",
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
    code: "MB-BG-03",
    name: "Badal Grey Polished Slabs",
    category: "Marble Slabs",
    subCategory: "Badal",
    finish: "Polished",
    grade: "Grade A",
    thicknessMm: 16,
    standardSize: "Random Slabs",
    unit: "Sq. Ft.",
    ratePerSqFt: 210,
    costPerSqFt: 155,
    stockSqFt: 3800,
    stockBoxes: 0,
    stockPieces: 140,
    minStockAlert: 600,
    lotNo: "LOT-2026-BG",
    location: "Shed 2 - Bay C",
    notes: "Smoky cloud pattern, high gloss finish"
  },
  {
    code: "MB-VR-04",
    name: "Verona Beige Marble Tile (12x12)",
    category: "Marble Tiles",
    subCategory: "Verona",
    finish: "Polished",
    grade: "Grade A",
    thicknessMm: 12,
    standardSize: "12 x 12 Inches (1 Sq Ft)",
    unit: "Sq. Ft.",
    ratePerSqFt: 160,
    costPerSqFt: 110,
    stockSqFt: 2400,
    stockBoxes: 240,
    stockPieces: 2400,
    minStockAlert: 500,
    lotNo: "LOT-2026-VR",
    location: "Warehouse A - Rack 3",
    notes: "Pre-cut 12x12 tiles packed 10 pcs per box"
  },
  {
    code: "GR-JB-05",
    name: "Jet Black Granite Slab",
    category: "Granite",
    subCategory: "Black Granite",
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
    finish: "Nano Polished Glazed",
    grade: "AAA Master Grade",
    thicknessMm: 9.5,
    standardSize: "60 x 60 cm (24x24 in)",
    unit: "Boxes",
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
  },
  {
    code: "TL-PL-07",
    name: "Statuario Gold Porcelain Slabs (60x120)",
    category: "Porcelain Tiles",
    subCategory: "Large Format Slabs",
    finish: "High Gloss Glazed",
    grade: "AAA Premium",
    thicknessMm: 10,
    standardSize: "60 x 120 cm (24x48 in)",
    unit: "Boxes",
    ratePerSqFt: 260,
    ratePerBox: 4004,
    costPerSqFt: 190,
    stockSqFt: 3696,
    stockBoxes: 240,
    stockPieces: 480,
    minStockAlert: 50,
    lotNo: "LOT-TL-60120-SG",
    location: "Tile Showroom Bay 2",
    notes: "15.4 Sq Ft per box (2 pcs/box)"
  },
  {
    code: "TL-WC-08",
    name: "Classic Beige Ceramic Wall Tile (30x60)",
    category: "Ceramic Tiles",
    subCategory: "Wall Tiles",
    finish: "Glossy Water-Resistant",
    grade: "Grade A",
    thicknessMm: 8,
    standardSize: "30 x 60 cm (12x24 in)",
    unit: "Boxes",
    ratePerSqFt: 140,
    ratePerBox: 1612.8,
    costPerSqFt: 95,
    stockSqFt: 3225.6,
    stockBoxes: 280,
    stockPieces: 1680,
    minStockAlert: 60,
    lotNo: "LOT-WC-3060",
    location: "Warehouse B",
    notes: "11.52 Sq Ft per box (6 pcs/box) for bathroom and kitchen walls"
  },
  {
    code: "MB-BP-09",
    name: "Golden Crema Marble Patti / Border (3x12)",
    category: "Borders & Patti",
    subCategory: "Decorative",
    finish: "Polished Beveled",
    grade: "Handcrafted",
    thicknessMm: 12,
    standardSize: "3 x 12 Inches (0.25 Sq Ft)",
    unit: "Pieces",
    ratePerSqFt: 300,
    ratePerPiece: 75,
    costPerSqFt: 40,
    stockSqFt: 450,
    stockBoxes: 45,
    stockPieces: 1800,
    minStockAlert: 200,
    lotNo: "LOT-PATTI-01",
    location: "Rack 5 - Box Zone",
    notes: "Floral engraved borderline marble patti"
  },
  {
    code: "MB-ST-10",
    name: "Tavera Marble Step & Riser Set (4ft)",
    category: "Steps & Risers",
    subCategory: "Staircase",
    finish: "Bullnose Edge Polished",
    grade: "Standard Heavy",
    thicknessMm: 20,
    standardSize: "Step 4ft x 1ft + Riser 4ft x 0.5ft (6 Sq Ft/Set)",
    unit: "Pieces",
    ratePerSqFt: 240,
    ratePerPiece: 1440,
    costPerSqFt: 160,
    stockSqFt: 720,
    stockBoxes: 0,
    stockPieces: 120,
    minStockAlert: 25,
    lotNo: "LOT-STEPS-04",
    location: "Shed 1 - Edge",
    notes: "Complete stair step with round bullnose edge"
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
    totalBilled: 385000,
    totalPaid: 260000,
    balanceDue: 125000,
    notes: "Regular builder for 300 sq. yard bungalows in Scheme 33"
  },
  {
    name: "Engr. Salman Raza (Contractor)",
    phone: "0321-4567890",
    email: "salman.raza.contracting@example.com",
    cnic: "42201-1234567-5",
    address: "DHA Phase 6, Khayaban-e-Shahbaz",
    city: "Karachi",
    customerType: "Contractor",
    creditLimit: 1000000,
    totalBilled: 840000,
    totalPaid: 840000,
    balanceDue: 0,
    notes: "Pays via online bank transfer within 15 days of delivery"
  },
  {
    name: "Haji Abdul Ghaffar",
    phone: "0333-2198745",
    email: "abdul.ghaffar@example.com",
    cnic: "42301-7654321-9",
    address: "North Nazimabad Block H",
    city: "Karachi",
    customerType: "Retail",
    creditLimit: 100000,
    totalBilled: 145000,
    totalPaid: 100000,
    balanceDue: 45000,
    notes: "House renovation flooring work"
  },
  {
    name: "Architect Zeeshan & Associates",
    phone: "0345-3322110",
    email: "design@zeeshanarch.com",
    cnic: "42101-5544332-7",
    address: "Clifton Block 4",
    city: "Karachi",
    customerType: "Architect",
    creditLimit: 800000,
    totalBilled: 520000,
    totalPaid: 450000,
    balanceDue: 70000,
    notes: "Specifies premium Ziarat White & Onyx slabs"
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
    totalPurchased: 1450000,
    totalPaid: 1100000,
    balancePayable: 350000,
    notes: "Main supplier for Ziarat White and Badal blocks"
  },
  {
    name: "KPK Granite & Marble Traders",
    contactPerson: "Haji Gul Rehman",
    phone: "0313-9988776",
    email: "gul.granite@example.com",
    company: "KPK Minerals Swat",
    address: "Industrial Estate Hayatabad",
    city: "Peshawar",
    totalPurchased: 890000,
    totalPaid: 890000,
    balancePayable: 0,
    notes: "Supplier of Jet Black Granite and Sunny Grey raw blocks"
  },
  {
    name: "Master Ceramic & Porcelain Distributors",
    contactPerson: "Mr. Farhan Sheikh",
    phone: "0322-6655443",
    email: "orders@mastertilesdist.com",
    company: "Master Ceramics Hub",
    address: "GT Road Gujranwala / Karachi Depot",
    city: "Gujranwala",
    totalPurchased: 2100000,
    totalPaid: 1750000,
    balancePayable: 350000,
    notes: "Authorized importer and dealer of glazed porcelain tiles"
  }
];

export const sampleInvoices = [
  {
    invoiceNo: "INV-2026-001",
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    customerId: 1,
    customerName: "Chaudhry Tariq (Builder)",
    customerPhone: "0300-8456123",
    items: [
      {
        itemId: 1,
        code: "MB-ZW-01",
        name: "Ziarat White Super Slab",
        category: "Marble Slabs",
        dimensions: "5.5ft x 3.0ft (40 Pcs)",
        length: 5.5,
        width: 3.0,
        pieces: 40,
        totalSqFt: 660,
        ratePerSqFt: 380,
        amount: 250800
      },
      {
        itemId: 2,
        code: "MB-SG-02",
        name: "Sunny Grey Classic Slab",
        category: "Marble Slabs",
        dimensions: "4.0ft x 2.5ft (50 Pcs)",
        length: 4.0,
        width: 2.5,
        pieces: 50,
        totalSqFt: 500,
        ratePerSqFt: 180,
        amount: 90000
      }
    ],
    subtotal: 340800,
    discountPercent: 0,
    discountAmount: 5800,
    carriageCharges: 6000,
    labourCharges: 4000,
    polishCharges: 0,
    taxAmount: 0,
    grandTotal: 345000,
    paidAmount: 220000,
    balanceDue: 125000,
    paymentStatus: "Half Paid",
    paymentMethod: "Bank Transfer",
    notes: "Delivered to Scheme 33 Site. Vehicle # JU-4581.",
    thermalPrinted: true,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    invoiceNo: "INV-2026-002",
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    customerId: 3,
    customerName: "Haji Abdul Ghaffar",
    customerPhone: "0333-2198745",
    items: [
      {
        itemId: 6,
        code: "TL-PF-06",
        name: "Royal Onyx White Porcelain Tile (60x60)",
        category: "Porcelain Tiles",
        dimensions: "50 Boxes (14.4 Sq Ft/Box)",
        boxes: 50,
        sqFtPerBox: 14.4,
        totalSqFt: 720,
        ratePerSqFt: 195,
        amount: 140400
      },
      {
        itemId: 9,
        code: "MB-BP-09",
        name: "Golden Crema Marble Patti / Border (3x12)",
        category: "Borders & Patti",
        dimensions: "60 Pieces",
        pieces: 60,
        ratePerPiece: 75,
        totalSqFt: 15,
        amount: 4500
      }
    ],
    subtotal: 144900,
    discountPercent: 0,
    discountAmount: 1900,
    carriageCharges: 2000,
    labourCharges: 0,
    polishCharges: 0,
    taxAmount: 0,
    grandTotal: 145000,
    paidAmount: 100000,
    balanceDue: 45000,
    paymentStatus: "Half Paid",
    paymentMethod: "Cash",
    notes: "Self pickup by customer via Suzuki pickup.",
    thermalPrinted: true,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const samplePurchases = [
  {
    purchaseNo: "PUR-2026-001",
    challanNo: "CH-8842",
    vehicleNo: "TK-9022 (Bedford Truck)",
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    supplierId: 1,
    supplierName: "Balochistan Mining & Quarries Ltd",
    items: [
      {
        itemId: 1,
        name: "Ziarat White Raw Slabs Unpolished",
        totalSqFt: 2500,
        ratePerSqFt: 270,
        amount: 675000
      },
      {
        itemId: 3,
        name: "Badal Grey Slabs",
        totalSqFt: 3000,
        ratePerSqFt: 145,
        amount: 435000
      }
    ],
    subtotal: 1110000,
    freightCharges: 40000,
    grandTotal: 1150000,
    paidAmount: 800000,
    balanceDue: 350000,
    paymentStatus: "Half Paid",
    paymentMethod: "Bank Transfer",
    notes: "Direct quarry dispatch from Khuzdar mine site.",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export async function initializeDatabaseWithSeedData() {
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add(defaultSettings);
  }

  const itemsCount = await db.items.count();
  if (itemsCount === 0) {
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
  }

  const customersCount = await db.customers.count();
  if (customersCount === 0) {
    for (const customer of sampleCustomers) {
      await db.customers.add({
        ...customer,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  const suppliersCount = await db.suppliers.count();
  if (suppliersCount === 0) {
    for (const supplier of sampleSuppliers) {
      await db.suppliers.add({
        ...supplier,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  const invoicesCount = await db.invoices.count();
  if (invoicesCount === 0) {
    for (const inv of sampleInvoices) {
      await db.invoices.add(inv);
    }
  }

  const purchasesCount = await db.supplier_purchases.count();
  if (purchasesCount === 0) {
    for (const pur of samplePurchases) {
      await db.supplier_purchases.add(pur);
    }
  }

  const expensesCount = await db.daily_expenses.count();
  if (expensesCount === 0) {
    const today = new Date().toISOString().slice(0, 10);
    await db.daily_expenses.bulkAdd([
      {
        date: today,
        category: "Food / Mess (کھانا چائے)",
        amount: 1450,
        paidTo: "Bismillah Hotel & Tea Stall",
        remarks: "Factory cutter & polish staff lunch + tea",
        createdAt: new Date().toISOString()
      },
      {
        date: today,
        category: "Petrol / Fuel (پٹرول ڈیزل)",
        amount: 3800,
        paidTo: "PSO Petrol Pump Faisalabad Road",
        remarks: "15 Litres diesel for factory power generator",
        createdAt: new Date().toISOString()
      },
      {
        date: today,
        category: "Customer Udhar / Cash Advance (گاہک ادھار)",
        amount: 2500,
        paidTo: "Tariq Mehmood Contractor",
        remarks: "Emergency loader rickshaw carriage cash advance",
        createdAt: new Date().toISOString()
      }
    ]);
  }
}
