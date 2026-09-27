# Software Requirements Specification (SRS)
## Project: Rana Shahab Marble Factory & Tiles Management System (ERP & POS)
**Document Version:** 2.0 (Updated Industry Requirements)  
**Project Category:** Software Project Management (SPM) / Industrial Enterprise System  
**Target Audience:** Development Team, Factory Stakeholders, Project Evaluators, Quality Assurance  
**Factory Reference:** Rana Shahab Marble Factory (رانا شہاب ماربل فیکٹری), Faisalabad Road near PSO Petrol Pump, Jhumra City

---

## 1. Executive Summary & Project Purpose

The **Rana Shahab Marble Factory & Tiles Management System** is a dedicated, offline-first Desktop Enterprise Resource Planning (ERP) and Point of Sale (POS) application. It is engineered specifically to streamline marble manufacturing, slab cutting, tile retail, rickshaw dispatch logistics, daily cash-flow expenses, workforce management, and customer credit ledgers for stone processing plants.

### 1.1. Core Business Context & Specialized Industry Needs
Unlike standard retail POS systems, a marble factory environment operates under distinct industrial dynamics:
- **Regional Measurement Units**: Marble thickness is measured in traditional **Sutar** ($1 \text{ Inch} = 8 \text{ Sutar}$, e.g., $4\text{ sutar} = 1/2''$, $6\text{ sutar} = 3/4''$, $9\text{ sutar} = 1\frac{1}{8}''$, $14\text{ sutar} = 1\frac{3}{4}''$), while surface area is calculated in **Square Feet (Sq. Ft.)** from inches or feet.
- **Application-Specific Sizing**: Specialized stone applications (e.g., $6\text{ Sutar}$ for kitchen countertops, stair steps/risers *[سیدھی / Sidhi]*, and lift cladding).
- **Diverse Catalog**: Finished marble tiles ($12\times12, 12\times24, 6\times12, 6\times24$), decorative flower medallions / inlays ($12\times12, 24\times24, 3\times3\text{ ft}$), stone borders & patti ($2'', 3'', 6''$), accessory chemicals & materials (*Bond, Filling, Spacers, Golla / Chamfer*), and porcelain tiles & decorative wall panels ($12\times24, 16\times16, 24\times24, 24\times48, \text{Panels}$).
- **Bilingual & Urdu Support**: Complete interface and print support in **English**, **Urdu (اردو)**, and **Dual / Bilingual Mode**, including a built-in Urdu phonetic keyboard.
- **Logistics & Rickshaw Gate Pass**: Structured dispatch system generating printed Gate Out / Delivery Challans for rickshaws and transport vehicles.
- **Daily Financials & Cash Flow**: Real-time tracking of daily factory expenses (*Food/Mess, Petrol/Fuel, Customer Udhar/Credit advances*) and end-of-day cash reconciliation.
- **Workforce & Social Welfare**: Comprehensive employee ledger tracking advance salary draws, automated $10\%$ annual wage increments, and a dedicated monthly **Zakat / Charity** disbursement system for fixed beneficiaries ($3\text{--}4\text{ persons}$).

---

## 2. User Roles & Personas

| Role | Urdu Title | Key Responsibilities |
| :--- | :--- | :--- |
| **Factory Owner / Proprietor** | فیکٹری اونر / مالک | Overall business oversight, approving credit/udhar, reviewing sales & daily expense summaries, managing employee raises, and overseeing monthly Zakat distribution. |
| **Sales & Billing Cashier** | سیلز و کیشئر | Operating the POS billing engine, applying dimensional calculations (Length × Width × Sutar), selecting marble/tiles/accessories, accepting payments, and issuing printed bill books. |
| **Gate & Dispatch Incharge** | گیٹ انچارج / لوڈنگ سپروائزر | Creating and verifying Rickshaw Gate Passes / Out slips, checking vehicle and driver details, counting physical marble pieces/boxes, and obtaining driver/receiver signatures. |
| **Yard & Stock Incharge** | یارڈ و اسٹاک انچارج | Logging incoming raw stone blocks/slabs, updating warehouse yard inventory, recording factory cutting breakage, and maintaining min-stock thresholds. |
| **Accounts & HR Officer** | اکاؤنٹس و لیبر انچارج | Managing customer ledgers, supplier purchase challans, logging daily petty cash & fuel/mess expenses, managing employee salary advances, and running monthly payroll. |

---

## 3. System Architecture & High-Level Workflow

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                   Rana Shahab Marble Factory ERP & POS Central Engine                     │
└────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                             │
      ┌──────────────────┬───────────────────┼───────────────────┬──────────────────┐
      ▼                  ▼                   ▼                   ▼                  ▼
┌──────────────┐   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   ┌──────────────┐
│ POS Billing  │   │ Inventory &  │    │ Dispatch &   │    │ Customers &  │   │ Daily Cash & │
│ & Bill Books │   │ Stone Master │    │ Gate Passes  │    │ Ledgers      │   │ Expenses     │
│ (A4/Thermal) │   │ (Sutar/Sq.Ft)│    │ (Rickshaw)   │    │ (Udhar/Hist) │   │ (Food/Fuel)  │
└──────┬───────┘   └──────────────┘    └──────────────┘    └──────────────┘   └──────┬───────┘
       │                                                                             │
       ├─────────────────────────────────────┬───────────────────────────────────────┤
       ▼                                     ▼                                       ▼
┌──────────────┐                       ┌──────────────┐                        ┌──────────────┐
│  Employees   │                       │ Sales & P&L  │                        │ Multilingual │
│ & 10% Raises │                       │  Analytics   │                        │ & Urdu Board │
│   + Zakat    │                       │ (D/W/M/Y/C)  │                        │ (EN/UR/Dual) │
└──────────────┘                       └──────────────┘                        └──────────────┘
```

---

## 4. Detailed Functional Requirements

### 4.1. Factory Branding & Bill Book Invoicing (FR-BIL)

- **FR-BIL-01: Official Bill Book Header & Branding**
  - All invoices and printed bill books must display the authentic factory details:
    - **Factory Title**: *Rana Shahab Marble Granite Ceramics & Tile Select* (رانا شہاب ماربل فیکٹری)
    - **Slogans**: *"نام ہی کافی ہے"* (Name is Enough) & *"دوسرے شہروں سے مناسب ریٹ اور اعلیٰ معیار کی گارنٹی"*
    - **Factory Address**: Faisalabad Road near PSO Petrol Pump, Jhumra City (فیصل آباد روڈ نزد PSO پٹرول پمپ، جھمرہ سٹی)
    - **Factory Landline/Office**: `0321-6606645`
    - **Proprietors Contact**: Rana Haji Ghulam Akbar (`0300-6664187`), Rana Ghulam Abbas (`0300-7995171`)
    - **Invoice Serial Number (سیریل نمبر)** and **Date (تاریخ)**

- **FR-BIL-02: Mandatory Customer Information Header**
  - Every invoice and printed bill must capture and print:
    - **Customer Full Name** (*جناب / نام گاہک*)
    - **Contact Phone Number** (*فون نمبر*)
    - **Delivery / Site Address** (*پتہ / ترسیل کی جگہ*)
    - **Delivered Via / Carrier** (*درج ذیل مال بدست - مثلاً رکشہ، لوڈر*)

- **FR-BIL-03: Bill Book Grid & Line Items**
  - Line items must capture industrial marble parameters:
    - **Quality / Item Description** (*کوالٹی / تفصیل* e.g., Sunny Grey, Badal, Ziarat White, Gobra)
    - **Thickness in Sutar / Inches** (*موٹائی سوتر / انچ* e.g., 4 Sutar, 6 Sutar, 9 Sutar, 14 Sutar)
    - **Dimensions / Size** (*تفصیل / سائز* e.g., $12''\times12'', 12''\times24'', 6''\times12'', 6''\times24''$ or Custom $L \times W$)
    - **Running Total Feet / Pieces / Boxes** (*R.T.F / تعداد*)
    - **Square Footage Quantity** (*تعداد مربع فٹ - Sq. Ft.*)
    - **Unit Rate per Sq. Ft. / Unit Price** (*ریٹ فی مربع فٹ / فی عدد*)
    - **Line Total Amount** (*روپے / رقم*)

- **FR-BIL-04: Invoice Summary & Net Totals**
  - Compute and present:
    - **Gross Subtotal** (*ٹوٹل رقم*)
    - **Value Added Services**: Loading/Labour (*مزدوری*), Carriage/Transport (*کرایہ*), Edge Polishing/Patti (*پالش/گولا کٹائی*)
    - **Discount Allowed** (*رعایت*)
    - **Net Payable Grand Total** (*کل واجب الادا رقم*)
    - **Advance Cash Paid** (*ایڈوانس وصولی*)
    - **Remaining Balance Due / Udhar** (*بقایا رقم*)
    - **Dual Signature Blocks**: Receiver Signature (*دستخط وصول کنندہ*) & Proprietor Signature (*دستخط پروپرائیٹر*)
    - **Terms & Conditions (شرائط و ضوابط)**: E&OE (*بھول چوک لین دین*), natural marble shade variations notice, and yard measurement terms.

- **FR-BIL-05: Multi-Format Printing Engine**
  - **Bill Book A4 / Half-Page Invoice**: Faithful replica of the physical factory receipt book layout.
  - **80mm Thermal Receipt**: Fast POS slip for cash customers.
  - **Rickshaw Gate Out Slip**: Condensed transport slip for gate verification.

---

### 4.2. Marble, Tiles, Flowers & Accessories Catalog (FR-CAT)

- **FR-CAT-01: Marble Varieties & Categories**
  - Support full cataloging of marble varieties: **Sunny Grey (سنی گرے)**, **Badal (بادل)**, **Ziarat White (زیارت وائٹ)**, **Gobra (گوبرا)**, **Tavera**, **Botticino**, **Boticina Cream**, etc.

- **FR-CAT-02: Sutar Thickness Classification (سوتر کی درجہ بندی)**
  - Each marble item must specify its calibrated thickness in **Sutar**:
    1. **4 Sutar ($4/8'' = 0.5''$)**: Standard residential floor & wall tile applications.
    2. **6 Sutar ($6/8'' = 0.75''$)**: Special heavy-duty grade designated for:
       - **Kitchen Countertops / Slabs** (*باورچی خانہ سلیب*)
       - **Stairs / Steps & Risers** (*سیدھی / Sidhi*)
       - **Lift Entrances & Cladding** (*لفٹ فریم و پٹیاں*)
    3. **9 Sutar ($9/8'' = 1.125''$)**: Heavy commercial steps, vanity bases, and door thresholds.
    4. **14 Sutar ($14/8'' = 1.75''$)**: Structural blocks, monument slabs, and custom heavy curbs.

- **FR-CAT-03: Standard Marble Cut Sizes**
  - System must provide instant quick-select buttons and inventory tracking for standard factory cut sizes:
    - `12" × 12"` (1.00 Sq. Ft. per piece)
    - `12" × 24"` (2.00 Sq. Ft. per piece)
    - `6" × 12"` (0.50 Sq. Ft. per piece)
    - `6" × 24"` (1.00 Sq. Ft. per piece)
    - `Custom Slabs` ($L \text{ in} \times W \text{ in}$ converted to Sq. Ft.)

- **FR-CAT-04: Flower Inlay Medallions (پھول ڈیزائن)**
  - Dedicated classification for artistic marble flower centerpieces and inlays:
    - `12" × 12"` Decorative Flower Medallion
    - `24" × 24"` Centerpiece Inlay Flower
    - `3' × 3'` ($36'' \times 36''$) Grand Hall Medallion
    - Priced per piece/set with image previews.

- **FR-CAT-05: Border & Patti Profiles (بارڈر و پٹی)**
  - Stone perimeter border and skirting inventory:
    - `2 Inch Border / Patti` (2" width)
    - `3 Inch Border / Patti` (3" width)
    - `6 Inch Border / Patti` (6" width)
    - Tracked by Running Feet (RFT) or linear piece counts.

- **FR-CAT-06: Accessory Materials & Chemicals (متفرق سامان)**
  - Item master for installation materials:
    - **Bond (بانڈ)**: Marble & Porcelain Tile Adhesive Bags (e.g., 20kg bags).
    - **Filling (فلنگ)**: Tile Grout / Joint Filling powder (Standard & Waterproof colors).
    - **Spacers (اسپیسر)**: Tile alignment cross & T-spacers (2mm, 3mm, 5mm packets).
    - **Golla / Chamfer / Molding (گولا)**: Quarter-round, bullnose, and beveled marble edge moldings.

- **FR-CAT-07: Ceramic & Porcelain Tiles + Panels Catalog**
  - Sizing profiles for imported and local porcelain tiles:
    - `12" × 24"` Tile
    - `16" × 16"` Tile
    - `24" × 24"` Tile
    - `24" × 48"` Large Format Slab Tile
    - **Panels (پینل)**: 3D decorative wall cladding panels and feature wall relief tiles.
    - Dual tracking: Box count and total Sq. Ft. per box.

---

### 4.3. Dimension & Sq. Ft. Calculation Engine (FR-CALC)

- **FR-CALC-01: Imperial Dimension Conversion**
  - Automatic calculation of square footage based on length and width:
    $$\text{Sq. Ft} = \left( \frac{\text{Length (Inches)} \times \text{Width (Inches)}}{144} \right) \times \text{Pieces}$$
    $$\text{Sq. Ft} = \text{Length (Feet)} \times \text{Width (Feet)} \times \text{Pieces}$$

- **FR-CALC-02: Running Total Feet (R.T.F) & Sutar Conversions**
  - Calculate linear running feet for border patti and stairs:
    $$\text{R.T.F} = \left( \frac{\text{Length (Inches)}}{12} \right) \times \text{Pieces}$$
  - Sutar notation helper ($1\text{ Sutar} = 0.125\text{ inch} = 3.175\text{ mm}$).

- **FR-CALC-03: Tile Box Conversion Utility**
  - Convert box quantities to square feet:
    $$\text{Total Sq. Ft} = \text{Box Count} \times \text{Sq. Ft per Box}$$
  - Calculate pieces per box and remaining single pieces.

---

### 4.4. Logistics & Rickshaw Gate Pass System (FR-GATE)

- **FR-GATE-01: Gate Out / Dispatch Entry**
  - Dedicated module to generate official delivery gate passes prior to vehicle exit.
  - Linked to one or multiple finalized Invoices.

- **FR-GATE-02: Transport & Driver Details**
  - Mandatory capture of:
    - **Vehicle Type**: Qingqi Rickshaw / Loader / Truck / Carry Daba
    - **Rickshaw / Vehicle Registration Number** (e.g., `FD-1234`)
    - **Driver Name & Driver Mobile Number**
    - **Customer Delivery Destination & Contact Person**
    - **Gate Exit Timestamp**

- **FR-GATE-03: Item Verification Summary**
  - Gate pass itemized manifest listing:
    - Item Name & Quality
    - Thickness (Sutar) & Sizes
    - Total Quantity in Pieces / Boxes / Sq. Ft.
    - Special Handling instructions (e.g., *Fragile Polished Slabs*).

- **FR-GATE-04: Printable Rickshaw Gate Pass**
  - Generate a dedicated half-page/slip Gate Pass containing:
    - Factory Header & Gate Pass Serial Number
    - Vehicle & Driver information
    - Delivery Address & Customer Contact
    - Item Manifest
    - Tri-part signature section: **Prepared by (Gate Officer)**, **Carrier (Rickshaw Driver)**, and **Received by (Customer Signature)**.

---

### 4.5. Multilingual Support & Urdu Virtual Keyboard (FR-LANG)

- **FR-LANG-01: Tri-Lingual Interface Modes**
  - System-wide language switcher with instant UI toggle:
    1. **English (انگریزی)**: Standard international terminology.
    2. **Urdu (اردو)**: Full Urdu RTL (Right-to-Left) typography (Jameel Noori Nastaleeq / Noto Nastaliq Urdu font rendering).
    3. **Dual / Bilingual Mode (دونوں زبانیں)**: Parallel English + Urdu labels on forms, tables, and invoice prints.

- **FR-LANG-02: Integrated Urdu Phonetic Keyboard**
  - Built-in on-screen and physical phonetic typing assistant for typing customer names, item descriptions, and expense remarks in Urdu (e.g., typing 'k' maps to 'ک', 'g' maps to 'گ', 'm' maps to 'م') without requiring OS-level language pack installations.

---

### 4.6. Customer Profiles, Credit (Udhar) & History (FR-CUST)

- **FR-CUST-01: Comprehensive Customer Profile**
  - Directory records:
    - Full Name (*نام گاہک*)
    - Primary & Secondary Phone Numbers (*فون نمبر*)
    - Physical Delivery Address (*مکمل پتہ*)
    - Customer Type (*Retail Customer, Builder, Contractor, Wholesaler*)
    - Opening Balance & Credit Limit (*ادھار کی حد*)

- **FR-CUST-02: Complete Customer History & Ledger Trail**
  - 360-degree timeline view for every customer:
    - All past Invoices (Date, Invoice #, Items, Total, Paid, Balance Due)
    - All Gate Passes / Rickshaw deliveries dispatched
    - All Payment Receipts (Cash, Bank Transfer, Cheque)
    - Sales Return & Damaged Material Credits
    - Live calculation of Net Outstanding Credit (*کل بقایا ادھار*).

- **FR-CUST-03: Payment Collection & Ledger Settlement**
  - Record customer recovery payments with auto-allocation to oldest unpaid invoices and live balance update.

---

### 4.7. Comprehensive Sales Reporting Engine (FR-REP-SALE)

- **FR-REP-SALE-01: Temporal Sales Aggregations**
  - Generate filtered sales performance reports across 5 time horizons:
    1. **Daily Sales Report (روزانہ سیل رپورٹ)**: Hourly sales velocity, cash in drawer vs credit sales.
    2. **Weekly Sales Report (ہفتہ وار سیل رپورٹ)**: Week-on-week revenue trends.
    3. **Monthly Sales Report (ماہانہ سیل رپورٹ)**: Monthly revenue, top customers, margin analysis.
    4. **Yearly Sales Report (سالانہ سیل رپورٹ)**: Annual turnover, seasonal trend breakdown.
    5. **Custom Date Range Filter (مخصوص تاریخ)**: Start Date to End Date custom analytics.

- **FR-REP-SALE-02: Analytical Breakdowns & Visualizations**
  - Breakdown by **Marble Type** (Sunny Grey vs Badal vs Ziarat White), **Thickness/Sutar** (4 Sutar vs 6 Sutar vs 9 Sutar), **Tile Sizes**, and **Accessories**.
  - Exportable to PDF and printable summary sheets.

---

### 4.8. Daily Expenses & Cash Drawer Management (FR-EXP)

- **FR-EXP-01: Daily Expense Logging**
  - Quick-entry module for tracking daily factory operational cash outflows with mandatory categories:
    1. **Food / Mess Expenses (کھانا / چائے خرچ)**: Staff lunches, tea, refreshments for labourers and visiting clients.
    2. **Petrol / Fuel Expenses (پٹرول / ڈیزل خرچ)**: Generator diesel, transport fuel, factory machinery lubricants.
    3. **Customer Udhar / Cash Advance (گاہک ادھار / کیش ادھار)**: Cash advances or credit disbursed directly from daily cash.
    4. **Factory Maintenance & General Overhead (مرمت و دیگر اخراجات)**: Blade cutting wheels, polishing abrasives, electricity bills, minor repairs.

- **FR-EXP-02: Daily Cash Reconciliation & Day-End Report**
  - End-of-day summary computing net cash position:
    $$\text{Net Closing Cash} = \text{Opening Cash} + \text{Today's Cash Sales} + \text{Customer Recoveries} - \text{Total Daily Expenses}$$
  - Printable daily closing sheet for the Factory Owner.

---

### 4.9. Employee Management, Payroll, Increments & Zakat Fund (FR-EMP)

- **FR-EMP-01: Employee Master Roster**
  - Profile tracking for factory staff: Name, Role (*Cutter Master, Polish Master, Yard Labourer, Driver, Cashier, Gate Supervisor*), Contact Number, CNIC, Joining Date, Basic Monthly Salary.

- **FR-EMP-02: Employee Advance Payment System (ایڈوانس تنخواہ)**
  - Allow recording mid-month salary advances taken by workers.
  - Automatic deduction of total advance drawn during monthly payroll generation.
  - Advance payment history ledger per employee.

- **FR-EMP-03: Annual 10% Promotion & Increment Engine (سالانہ ترقی / اضافہ)**
  - Automated annual review calculator applying a **$10\%$ yearly salary increase**:
    $$\text{New Base Salary} = \text{Current Base Salary} \times 1.10$$
  - Visual anniversary notifications alerting the owner when an employee completes a full year of service.

- **FR-EMP-04: Fixed Monthly Zakat & Welfare Distribution (ماہانہ زکوٰۃ فنڈ)**
  - Dedicated module for tracking the factory owner's fixed monthly Zakat disbursements:
    - Maintained for **$3\text{--}4$ fixed registered deserving beneficiaries / families**.
    - Record Beneficiary Name, CNIC, Monthly Fixed Zakat Amount, Date Disbursed, and Payment Method (*Cash / EasyPaisa / Bank*).
    - Monthly Zakat distribution log and annual Zakat audit report.

---

### 4.10. Returns, Damage & Wastage Management (FR-RET)

- **FR-RET-01: Customer Sales Returns**
  - Return unused or damaged tiles/marble with invoice reference, restockable flag, and customer balance reversal.

- **FR-RET-02: Factory Breakage & Cutting Wastage Logging**
  - Track marble cracked or broken during gangsaw/bridge-cutter processing or yard handling.

---

### 4.11. System Security, Backup & Local Storage (FR-SYS)

- **FR-SYS-01: Offline-First Dexie.js / IndexedDB Storage**
  - 100% offline operational capability with zero dependency on external cloud connectivity.

- **FR-SYS-02: Full Database JSON Backup & Restore**
  - One-click export of complete system data (catalog, invoices, gate passes, expenses, employees, ledgers) to a secure `.json` archive and instant restore mechanism.

---

## 5. Traceability Matrix: Functional Modules

| Module ID | Module Name | Urdu Name | Core Capabilities |
| :--- | :--- | :--- | :--- |
| **MOD-01** | **Dashboard** | ڈیش بورڈ | Revenue KPIs, receivables, daily cash in hand, low stock alerts, quick shortcuts. |
| **MOD-02** | **Factory Bill Book / POS** | بل بک و سیلز | Complete branded bill book, customer info, Sutar/Sq.Ft billing, A4 & Thermal prints. |
| **MOD-03** | **Product & Stone Master** | مصنوعات و ماربل اسٹاک | 4 Sutar categories (4, 6, 9, 14 sutar), cut sizes, flowers, borders, tiles & accessories. |
| **MOD-04** | **Rickshaw Gate Pass** | رکشہ گیٹ پاس | Delivery out slips, vehicle & driver tracking, item manifest, receiver signatures. |
| **MOD-05** | **Customer Ledger & History** | گاہک ریکارڈ و ہسٹری | Profiles, historical invoices, complete Udhar credit ledger, payment vouchers. |
| **MOD-06** | **Daily Expenses & Cash Flow** | روزانہ اخراجات | Food/mess, petrol, customer udhar, petty cash, day-end cash reconciliation. |
| **MOD-07** | **Sales Reports & Analytics** | سیلز رپورٹس | Daily, Weekly, Monthly, Yearly, and Custom date range reporting with P&L. |
| **MOD-08** | **Employees & Payroll** | ملازمین و تنخواہ | Staff profiles, advance salary deductions, 10% yearly promotion increments. |
| **MOD-09** | **Monthly Zakat Management** | ماہانہ زکوٰۃ فنڈ | Fixed monthly distribution to 3-4 beneficiaries with history logs. |
| **MOD-10** | **Multilingual & Urdu Engine** | اردو و انگریزی سپورٹ | English, Urdu (Nastaleeq), Dual bilingual mode, integrated Urdu phonetic keyboard. |
| **MOD-11** | **Returns & Wastage** | واپسی و نقصان | Customer returns, bridge-cutting breakage logs, stock adjustments. |
| **MOD-12** | **Settings & Local Backup** | سیٹنگز و بیک اپ | Factory profile details, tax info, local JSON database export & restore. |

---

## 6. Entity Relationship & Data Model (ERD)

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    Customers    │       │    Invoices     │       │  GatePasses     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │1     *│ id (PK)         │1     1│ id (PK)         │
│ name (EN/UR)    ├───────┤ customerId (FK) ├───────┤ invoiceId (FK)  │
│ phone, address  │       │ invoiceNo       │       │ vehicleNo       │
│ creditBalance   │       │ totalAmount     │       │ driverName/Phone│
│ customerType    │       │ paidAmount      │       │ dispatchTime    │
└─────────────────┘       │ balanceDue      │       │ receiverSign    │
                          │ status          │       └─────────────────┘
                          └────────┬────────┘
                                   │1
                                   │*
                          ┌────────┴────────┐
                          │  InvoiceItems   │
                          ├─────────────────┤
                          │ id (PK)         │
                          │ invoiceId (FK)  │
                          │ productId (FK)  │
                          │ sutarThickness  │
                          │ dimensions      │
                          │ sqFt, rate, sub │
                          └─────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  DailyExpenses  │       │    Employees    │       │   ZakatRecords  │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │1     *│ id (PK)         │
│ date            │       │ name, role      ├───────┤ beneficiaryName │
│ category        │       │ basicSalary     │       │ cnic, phone     │
│ (Food/Petrol/   │       │ advanceDrawn    │       │ fixedAmount     │
│  Udhar/General) │       │ lastIncrement   │       │ monthYear       │
│ amount, remarks │       │ annualRate (10%)│       │ status, date    │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## 7. Business Rules & Calculation Formulas

1. **Dimensional Square Feet Calculation (Inches):**
   $$\text{Sq. Ft} = \frac{\text{Length (in)} \times \text{Width (in)}}{144} \times \text{Pieces}$$

2. **Dimensional Square Feet Calculation (Feet):**
   $$\text{Sq. Ft} = \text{Length (ft)} \times \text{Width (ft)} \times \text{Pieces}$$

3. **Running Total Feet (R.T.F) for Borders & Patti:**
   $$\text{R.T.F} = \frac{\text{Length (in)}}{12} \times \text{Pieces}$$

4. **Line Item Subtotal:**
   $$\text{Subtotal} = \text{Calculated Sq. Ft} \times \text{Rate per Sq. Ft}$$

5. **Invoice Grand Total:**
   $$\text{Grand Total} = \sum (\text{Line Items}) + \text{Carriage} + \text{Labour} + \text{Polishing} - \text{Discount}$$

6. **Invoice Balance Due:**
   $$\text{Balance Due} = \text{Grand Total} - \text{Paid Amount}$$

7. **Customer Outstanding Credit (Udhar) Update:**
   $$\text{New Customer Balance} = \text{Previous Balance} + \text{Invoice Balance Due} - \text{Payments Received}$$

8. **Daily Cash Drawer Net Balance:**
   $$\text{Drawer Cash} = \text{Opening Cash} + \text{Cash Sales Today} + \text{Debt Recoveries} - \sum (\text{Daily Expenses})$$

9. **Employee Net Monthly Payout:**
   $$\text{Net Salary Payable} = \text{Base Salary} - \text{Salary Advances Taken}$$

10. **Employee 10% Annual Increment:**
    $$\text{Incremented Salary} = \text{Current Base Salary} + (\text{Current Base Salary} \times 0.10)$$

---

## 8. Acceptance Criteria for System Verification

1. **Branded Bill Book Output**: The bill book print must match Rana Shahab Marble Factory's authentic header, containing complete factory contact numbers and mandatory customer information (Name, Phone, Address).
2. **Sutar & Application Specifics**: The inventory and billing engine must support all 4 Sutar categories ($4, 6, 9, 14\text{ sutar}$) with dedicated tags highlighting $6\text{ Sutar}$ for Kitchen and Sidhi/Stairs.
3. **Product Catalog Coverage**: 4 standard cut sizes ($12\times12, 12\times24, 6\times12, 6\times24$), 3 flower medallion sizes ($12\times12, 24\times24, 3\times3\text{ ft}$), 3 border widths ($2'', 3'', 6''$), accessory items (*Bond, Filling, Spacer, Golla*), and porcelain tiles & panels ($12\times24, 16\times16, 24\times24, 24\times48, \text{Panels}$) must be available and fully functional.
4. **Rickshaw Gate Pass**: System must generate and print delivery gate passes with vehicle/rickshaw number, driver info, and signature blocks.
5. **Multilingual & Keyboard**: UI and printable documents must seamlessly switch between English, Urdu, and Dual modes, with working Urdu input.
6. **Sales & Expenses Reporting**: Accurate generation of Daily, Weekly, Monthly, Yearly, and Custom date range reports; daily expenses must categorize Food, Petrol, and Customer Udhar.
7. **Employee & Zakat Management**: Correct calculation of employee advance deductions, automated $10\%$ annual wage promotions, and monthly Zakat tracking for $3\text{--}4$ beneficiaries.
