# 🧠 Project Memory & Implementation Tracker
## Rana Shahab Marble Factory ERP + POS System

**Last Updated:** 2026-09-27  
**SRS Reference:** [requirements.md](file:///d:/Uni%20Data/Semester%205/SPM/Marble-Factory/requirements.md)  
**Detailed Architecture Plan:** [docs/frontend-modules-plan.md](file:///d:/Uni%20Data/Semester%205/SPM/Marble-Factory/docs/frontend-modules-plan.md)  

---

## 📌 Module Implementation Status

| Module ID | Module Name | Urdu / Roman Urdu Title | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **MOD-01** | **Executive Dashboard** | فیکٹری ڈیش بورڈ / Digital Khata & Dashboard | 🟢 Completed | Revamped with B2B SaaS aesthetics, 4-card KPI strip, action button launchpad (+ Rozana Kharch, + Khata Wasooli, Draz Hisab Roznamcha, + Naya Bill), clickable KPI card triggers, operational needs attention section, clean Recent Bills table, and centered floating pop-up modals for expenses, wasooli, and drawer reconciliation. |
| **MOD-02** | **Factory Bill Book / POS** | فیکٹری بل بک و کاؤنٹر سیل / Bill Book & POS | 🟢 Completed | Redesigned into a quiet, 2-column POS workspace: unnumbered natural sections (Customer, Items, Additional Charges), zero visible keyboard noise, compact line-item cards, focused popups for complexity (Item entry, Delivery, Charges, Discount, Review), and a sticky right settlement panel with live cash drawer impact. |
| **MOD-03** | **Product & Stone Master** | مصنوعات و ماربل اسٹاک / Marble & Tiles Stock | 🟡 Up Next | 4 Sutar categories (4, 6, 9, 14 sutar), standard cut sizes, flower medallions, borders/patti (RFT), accessories, inventory valuation & reorder triggers. |
| **MOD-04** | **Rickshaw Gate Pass** | رکشہ گیٹ پاس / Rickshaw Gate Out Pass | ⚪ Planned | Transport slips, driver & vehicle info, manifest, 3-party signatures. |
| **MOD-05** | **Customer Ledger & History** | گاہک ریکارڈ و کھاتہ / Digital Khata | ⚪ Planned | 360° timeline, Udhar tracking, payment recovery vouchers. |
| **MOD-06** | **Daily Expenses & Cash Flow** | روزانہ اخراجات / Rozana Kharch & Roznamcha | ⚪ Planned | Food/mess, petrol, customer udhar advance, day-end reconciliation. |
| **MOD-07** | **Sales Reports & Analytics** | سیلز رپورٹس / Sales & Munafa Reports | 🟢 Completed | Offline-first Dexie.js 4 backend service (`salesReportsService.js`) with 5 time horizons (Daily, Weekly, Monthly, Yearly, Custom), COGS calculation, Gross & Net Profit (Munafa) margins, Sutar thickness (4, 6, 9, 14 sutar) breakdown, top customer Khata ranking, SVG trend charts, and UTF-8 BOM CSV / JSON exports. |
| **MOD-08** | **Employees & Payroll** | ملازمین و تنخواہ / Workers & 10% Increment | ⚪ Planned | Salary advances, automated 10% annual anniversary wage raises. |
| **MOD-09** | **Monthly Zakat Management** | ماہانہ زکوٰۃ فنڈ / Mahana Zakat Fund | ⚪ Planned | Fixed distribution for 3-4 deserving families with audit log. |
| **MOD-10** | **Multilingual & Urdu Engine** | اردو و انگریزی سپورٹ / Roman Urdu & Nastaleeq | 🟢 Foundation Live | Navbar language toggle [ EN (Roman Urdu) \| اردو ] active across all views; Nastaleeq RTL typography enabled. |
| **MOD-11** | **Returns & Wastage** | واپسی مال و نقصان / Returns & Factory Wastage | 🟢 Completed | Dexie.js 4 atomic backend service (`returnsWastageService.js`) supporting customer sales returns (Khata reversal / cash drawer refund), supplier purchase returns, bridge-cutter / gangsaw / polish breakage logs, live yard stock reconciliation, and safe rollback transactions. |
| **MOD-12** | **Settings & Local Backup** | سیٹنگز و بیک اپ / Factory Settings & Backup | ⚪ Planned | Rana Shahab factory profile, receipt options, 1-click JSON backup/restore. |

---

## 🎨 UI/UX Guidelines & Conventions
1. **Roman Urdu & Urdu Integration:**
   - English mode uses intuitive Pakistani Roman Urdu terminology familiar to counter operators and low-literacy trade staff:
     - *Customer Due* $\rightarrow$ **Customer Udhaar Due**
     - *Received / Cash Collected* $\rightarrow$ **Cash / Bank Wasooli**
     - *Total Sales* $\rightarrow$ **Total Sales (Kul Sales)**
     - *Customer Ledger* $\rightarrow$ **Digital Khata**
     - *New Invoice* $\rightarrow$ **Naya Bill (POS)**
     - *Daily Expenses* $\rightarrow$ **Rozana Kharch**
     - *Cash Drawer / Day Reconciliation* $\rightarrow$ **Draz Cash (Roznamcha)**
     - *Factory Yard Stock* $\rightarrow$ **Yard Stock (Maal)**
     - *Gate Pass* $\rightarrow$ **Rickshaw Gate Pass**
     - *Low Stock* $\rightarrow$ **Khatam Honay Wala Maal (Reorder)**
   - Urdu mode provides full Nastaleeq RTL typography.
2. **Ergonomics & Fitts's Law:**
   - Primary action buttons (Naya Bill, Kharch, Wasooli) have large touch targets (min height 44px, generous padding).
   - High visual contrast and direct spatial positioning.
   - Elimination of wordy filler text in favor of scannable metrics.
3. **Offline Reliability:**
   - Dexie IndexedDB with atomic multi-table transactions.

---

## 📋 Session Log
- **2026-09-27:**
  - Reviewed SRS v2.0 in `requirements.md`.
  - Created `docs/frontend-modules-plan.md` covering all 12 modules.
  - Created `memory.md` to track implementation milestones.
  - Completed **MOD-01 (Executive Dashboard)** + foundational **MOD-10 (Navbar Urdu/English Toggle with Roman Urdu terms)**.
  - Streamlined UI/UX with progressive disclosure pop-ups:
    - **Roznamcha Drawer Pop-up**: Detailed daily cash flow breakdown & today's expense list.
    - **Quick Wasooli Pop-up**: Direct customer payment collection from the dashboard.
    - **Quick Expense Pop-up**: Instant cash drawer expense recording with centered viewport modal.
    - **Invoice Quick Preview Pop-up**: Row-click full invoice preview with 80mm print.
    - **Quick Restock Pop-up**: Row-click stock addition on low stock alert items.
    - Fixed header wrapping, table cell line-breaks, and 4-card grid alignment.
  - Completed **MOD-02 (Factory Bill Book & POS Engine)**:
    - Built authentic Rana Shahab factory bill book branding & slogans (*"نام ہی کافی ہے"*).
    - Integrated customer Khata selection and carrier dispatch tracking (*"درج ذیل مال بدست - مثلاً رکشہ"*).
    - Added stone Sutar thickness system (4, 6, 9, 14 sutar) with dedicated Kitchen / Stairs badges.
    - Added settlement split for carriage, labour loading, edge cutting/polish, and special discounts.
    - Created `BillPrintModal.jsx` supporting authentic A4 Bill Book replica print, 80mm thermal receipts, and 1-click WhatsApp copy.
    - Executed atomic multi-table Dexie transactions updating stock, invoices, customer balances, and payment vouchers.
  - Completed **Executive Dashboard Lower Area BI & Operational Context**:
    - **Row 1 Left (Sales & Collection Trend)**: Pure lightweight SVG dual-polyline chart (Sales `#2563eb` vs Wasooli `#059669`) with 3-way horizon filter (`Today`, `This Week`, `This Month`) and real database metrics.
    - **Row 1 Right (Customer Dues Panel)**: Top overdue customer Khata list with red balance highlights, total overdue tally, and 1-click Quick Wasooli modal pre-fill.
    - **Row 2 Left (Yard Stock Position)**: Stone category breakdown (Marble Slabs 51%, Tiles 45%, Steps/Granite/Borders 4%) with horizontal percentage progress bars and factory reorder level triggers.
    - **Row 2 Right (Recent Factory Activity Feed)**: Real-time operational audit timeline compiled from Dexie invoices, customer payment vouchers, and daily factory expenses.
  - Implemented **Homogeneous Action Button System (`ActionButton.jsx` & `ActionGroup`)**:
    - Standardized 48px fixed height, 10px uniform border radius, 0 18px horizontal padding, 18px icon dimension, and 8px icon-to-text gap across all 4 top actions.
    - Clearly defined, high-contrast `#D8E0EA` border on crisp white `#ffffff` background for secondary actions (`+ Rozana Kharch`, `+ Khata Wasooli`, `Draz Hisab (Roznamcha)`).
    - Preserved visual priority for primary `+ Naya Bill (POS)` in royal blue `#2563eb` with identical physical dimensions.
    - Fixed "+ + Naya Bill (POS)" double plus bug.
    - Built responsive `<ActionGroup>` with clean desktop flex row and mobile `<680px` popover fallback (`More actions ▾`).
- **2026-09-30:**
  - Upgraded **Dexie 4 Database Schema (`db.version(4)`)**: Added specialized indexed keys for `returns` and `wastage_logs`.
  - Built **MOD-07 Backend Service (`salesReportsService.js`)**:
    - Multi-horizon time window engine (Daily, Weekly, Monthly, Yearly, Custom range) with previous period comparison.
    - Cost of Goods Sold (COGS) stone catalog integration with Gross Profit and True Net Profit (Munafa) calculation after deducting factory daily expenses.
    - Cash vs Credit (Udhar) ratio and Wasooli collection tracking.
    - Stone category and 4-tier Sutar thickness (4, 6, 9, 14 sutar) performance analysis.
    - Customer Khata ranking and top selling stone products tables.
    - Time-series SVG trend trajectory generator and Excel UTF-8 BOM CSV / JSON exports.
  - Built **MOD-11 Backend Service (`returnsWastageService.js`)**:
    - Atomic multi-table Dexie transactions across `returns`, `wastage_logs`, `items`, `customers`, `suppliers`, `stock_movements`, and `daily_expenses`.
    - Customer Sales Returns with Khata balance reversal or Cash Drawer refund and yard stock restocking.
    - Supplier Purchase Returns with accounts payable reductions.
    - Factory cutting & breakage logging (Bridge-Cutter trimming, Gangsaw sawing, Polish, Yard Transit) deducting damaged stock without touching customer accounts.
    - Safe document rollback mechanism restoring physical inventory and Khata balances.
    - Instant invoice linking helper for 1-click return populating.
  - Created authentic Rana Shahab sample seed data for returns and bridge-cutter wastage in `seedData.js`.
- **2026-10-08:**
  - Designed and implemented **Admin Bill Profit Report & PDF System (`BillProfitPrintModal.jsx`)**:
    - Dual format: Authentic A4 replica and 80mm thermal slip with emerald confidential theme (`CONFIDENTIAL ADMIN PROFIT AUDIT`).
    - Category-wise stone and accessories profit breakdown with item-level cost (COGS), sale revenue, net profit in PKR, and margin percentage.
    - Category subtotal summaries and executive net profit ribbon with collection/udhar reconciliation.
    - 1-click **Save PDF** via Electron desktop API / web print engine, plus thermal slip and WhatsApp summary.
  - Upgraded **New Bill (POS) Module (`BillingView.jsx`)**:
    - Added aligned, high-contrast action button: `Bill Profit Report (Admin PDF)` in emerald green `#059669` alongside `Save & Print Bill`.
    - Integrated real-time item cost tracking and live profit preview in review modal.
  - Upgraded **Invoices Register (`InvoicesView.jsx`)**:
    - Added dedicated `TrendingUp` Admin Profit action button to view and save PDF profit audits for any past invoice.
  - Verified clean production build with Vite (`npm run build`).

