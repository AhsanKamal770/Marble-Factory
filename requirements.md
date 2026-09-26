# Software Requirements Specification (SRS)
## Project: Marble Factory & Tiles ERP Management System
**Document Version:** 1.0  
**Project Category:** Software Project Management (SPM) / Industrial Enterprise System  
**Target Audience:** Development Team, Project Stakeholders, Quality Assurance

---

## 1. Executive Summary & Project Purpose

The **Marble Factory & Tiles Management System** is a desktop/offline-first Enterprise Resource Planning (ERP) and Point of Sale (POS) solution tailored specifically for marble processing factories, stone yards, and ceramic/granite wholesalers. 

Unlike generic POS systems, marble manufacturing and trading involves distinct industry complexities:
- Multi-dimensional measurements (Length × Width in inches or feet converted into Square Footage).
- Dual inventory tracking across **Square Feet**, **Pieces**, and **Standard Packaging Boxes**.
- Stone grading (Grade A, Commercial, Premium) and finishes (Polished, Honed, Flamed, Antique).
- Additional manufacturing/service charges (Labour/Loading, Carriage/Freight, Edge Polishing/Patti).
- Flexible credit management and ledgers for contractors, builders, and suppliers.

This document outlines the **Functional Requirements (FR)**, business logic, workflows, and calculation rules necessary for the complete system lifecycle.

---

## 2. User Roles & Personas

| Role | Description | Key Responsibilities |
| :--- | :--- | :--- |
| **Factory Owner / Admin** | Complete visibility over all financial and stock operations. | Monitors business KPIs, profit margins, approves ledgers, manages system settings and backups. |
| **Sales & Billing Cashier** | Front-desk operator handling customer visits and orders. | Generates invoices, applies dimension calculations, collects payments, issues receipts (A4/Thermal). |
| **Yard & Stock Incharge** | Manages physical inventory in the factory sheds and yards. | Records raw block/slab inward, updates stock, performs physical audits, logs wastage/breakage. |
| **Accounts & Purchase Officer** | Manages vendor relationships and customer credit. | Records supplier purchases/challans, manages payment receipts, tracks accounts receivable & payable. |

---

## 3. System Architecture & Workflow Overview

```
                   ┌──────────────────────────────────────────────┐
                   │               Factory Dashboard              │
                   └──────────────────────┬───────────────────────┘
                                          │
    ┌───────────────────┬─────────────────┼─────────────────┬───────────────────┐
    ▼                   ▼                 ▼                 ▼                   ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────────────┐
│   Product    │ │   Billing    │ │   Customer   │ │   Supplier   │ │  Returns, Waste │
│  & Inventory │ │    & POS     │ │   Ledgers    │ │  Purchases   │ │  & Stock Audit  │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └───────────────────┘
```

---

## 4. Detailed Functional Requirements

### 4.1. Dashboard & Business Intelligence (FR-DB)

- **FR-DB-01: Executive KPI Metrics**
  - The system must display real-time key performance indicators:
    - **Total Revenue**: Cumulative sales value.
    - **Cash Collected**: Total cash received in hand/bank.
    - **Accounts Receivable (Receivables)**: Total balance due from all customers.
    - **Accounts Payable (Payables)**: Total outstanding balance owed to suppliers.
    - **Low Stock Alerts Count**: Number of products below their defined safety threshold.
    - **Total Inventory Valuation**: Total estimated market/cost value of stock currently in yards.

- **FR-DB-02: Quick Action Triggers**
  - Provide one-click shortcuts to initiate a **New Invoice**, **Add Stock Item**, **Collect Customer Payment**, and **Record Supplier Purchase**.

- **FR-DB-03: Recent Transaction Log**
  - Display the latest 10 sales invoices and stock movements with instant status badges (*Paid*, *Partial*, *Unpaid*).

---

### 4.2. Product & Inventory Management (FR-INV)

- **FR-INV-01: Stone & Tile Classification**
  - The system must support categorizing inventory into:
    - *Marble Slabs* (Ziarat White, Badal, Sunny Grey, etc.)
    - *Marble Tiles / Cut Sizes*
    - *Granite* (Black Galaxy, Tropic Brown, etc.)
    - *Porcelain & Ceramic Tiles*
    - *Borders & Patti*
    - *Steps & Risers*

- **FR-INV-02: Comprehensive Item Profiling**
  - Each item record must capture:
    - Unique Item Code / SKU (e.g., `MB-1001`)
    - Item Name & Commercial Description
    - Category & Sub-category
    - Surface Finish (*Polished, Honed, Flamed, Bush Hammered, Raw/Rough*)
    - Quality Grade (*Premium, Grade A, Commercial, Standard*)
    - Thickness (in mm, e.g., 16mm, 18mm, 20mm, 30mm)
    - Standard Size description (e.g., `12" x 12"`, `24" x 24"`, `Random Slabs`)
    - Yard / Shed Storage Location (e.g., `Yard Shed 1`, `Block Yard B`)
    - Lot / Bundle Number
    - Pricing: Unit Cost Price (per Sq. Ft) and Selling Rate (per Sq. Ft)
    - Current Stock: Square Footage (`Sq. Ft.`), Total Boxes, Total Pieces
    - Minimum Stock Alert Threshold

- **FR-INV-03: Multi-Unit Measurement Support**
  - The system must accurately maintain and convert stock balances across:
    - **Square Feet (Sq. Ft.)** (Primary metric for billing and valuation)
    - **Pieces (Pcs)** (Physical unit count)
    - **Boxes** (Standard packaging unit for tiles)

- **FR-INV-04: Stock Adjustment & Manual Corrections**
  - Authorized users must be able to perform stock adjustments (Quantity increase or decrease) with mandatory reason logging (*Damage, Breakage during cutting, Physical audit variance, Factory usage*).

- **FR-INV-05: Low Stock Warning Engine**
  - Automated visual flags and notifications when an item's available Sq. Ft. drops below `minStockAlert`.

- **FR-INV-06: Stock Movement & Audit Trail**
  - The system must log every stock change event with:
    - Date & Timestamp
    - Transaction Type (*Sale, Purchase, Customer Return, Supplier Return, Adjustment, Wastage*)
    - Quantity delta (Sq. Ft, Boxes, Pieces)
    - Pre-movement and Post-movement stock balance
    - Reference Document Number (Invoice #, Purchase #, Return #)

---

### 4.3. Dimension Calculator & Marble Billing (FR-BIL)

- **FR-BIL-01: Built-in Dimensional Calculator**
  - Provide an interactive dimensional calculator supporting:
    - **Imperial Dimension Entry**: Length (Feet + Inches) × Width (Feet + Inches) × Number of Pieces.
    - **Tile Box Conversion**: Box Count × Sq. Ft per Box.
    - **Wastage Margin**: Option to add a percentage cutting allowance (e.g., 5% or 10%).
    - **Formula applied**:
      $$\text{Sq. Ft} = \left( \frac{\text{Length (inches)} \times \text{Width (inches)}}{144} \right) \times \text{Pieces}$$
    - One-click transfer of calculated Sq. Ft directly to the invoice line item.

- **FR-BIL-02: Flexible Line Item Billing**
  - For each line item in an invoice, the user can configure:
    - Item Selection (with instant stock availability check)
    - Sizing & Dimensions (Length, Width, Pieces, Boxes)
    - Total Calculated Sq. Ft.
    - Rate per Sq. Ft. (editable with user permissions)
    - Line item Subtotal (`Sq. Ft × Rate/Sq. Ft`)

- **FR-BIL-03: Factory & Value-Added Services Charges**
  - The billing engine must calculate and add dedicated industry charges:
    - **Carriage / Transport / Freight Charges**
    - **Loading & Unloading Labour Charges**
    - **Edge Polishing / Cutting / Chamfering Charges**

- **FR-BIL-04: Discounts and Net Calculation**
  - Support overall invoice discounts (Fixed amount).
  - Compute total payable:
    $$\text{Grand Total} = \text{Items Subtotal} + \text{Carriage} + \text{Labour} + \text{Polishing} - \text{Discount}$$

- **FR-BIL-05: Customer Selection & Instant Account Lookup**
  - Select existing customer with real-time display of current outstanding balance.
  - Option to create a new customer inline without leaving the billing screen.
  - Support Walk-in / Cash customers.

- **FR-BIL-06: Payment Splitting & Credit Invoicing**
  - Record upfront payment: Full payment, Partial payment, or Zero payment (Pure credit sale).
  - Payment modes: *Cash, Bank Transfer, Cheque, Online Transfer*.
  - Calculation of Remaining Balance Due:
    $$\text{Balance Due} = \text{Grand Total} - \text{Paid Amount}$$
  - Dynamic invoice status tag:
    - `Paid`: Paid Amount $\ge$ Grand Total
    - `Partial`: $0 <$ Paid Amount $<$ Grand Total
    - `Unpaid`: Paid Amount $= 0$

- **FR-BIL-07: Dual Print Formats (A4 Invoice & Thermal POS)**
  - **Standard A4 Document**: Detailed invoice containing company header, NTN/STRN, item dimensions, rates, labour/carriage breakdown, customer balance history, and terms of delivery.
  - **80mm / 58mm Thermal Slip**: Compact receipt for yard delivery/gate pass and retail customer receipts.

- **FR-BIL-08: Atomic Stock Deduction**
  - Upon invoice finalization, the system must immediately and atomically deduct billed quantities from the database inventory and create corresponding stock movement records.

---

### 4.4. Invoice History & Management (FR-INV-HIST)

- **FR-INV-HIST-01: Search & Filter Invoices**
  - Search invoices by Invoice Number, Customer Name, Phone Number, or Date Range.
  - Filter by payment status (*All, Paid, Partial, Unpaid*).

- **FR-INV-HIST-02: Invoice Actions**
  - View full invoice breakdown.
  - Reprint A4 Invoice or Thermal Receipt anytime.
  - View linked customer payments.

---

### 4.5. Customer Management & Financial Ledgers (FR-CUST)

- **FR-CUST-01: Customer Profile Directory**
  - Maintain customer records including Name, Phone, Alternative Contact, CNIC, City, Physical Address, Customer Type (*Retail, Builder, Contractor, Wholesaler*), Credit Limit, and Special Notes.

- **FR-CUST-02: Real-Time Balance Tracking**
  - Maintain an up-to-date running balance (`balanceDue`) for every customer.

- **FR-CUST-03: Double-Entry Customer Statement / Ledger**
  - Provide a ledger detailing all customer transactions:
    - **Debit Entries (+)**: Sales invoices issued to customer.
    - **Credit Entries (-)**: Payments received from customer, sales return credits.
    - **Running Net Balance** after each entry.

- **FR-CUST-04: Payment Collection Module**
  - Allow recording lump-sum or invoice-specific customer payments:
    - Payment Number & Date
    - Amount Paid
    - Payment Mode (*Cash, Cheque, Online Bank*)
    - Reference / Cheque Number
    - Automatic reduction of the customer's overall `balanceDue`.
    - Automatic status update of pending invoices from `Unpaid`/`Partial` to `Paid`.

- **FR-CUST-05: Printable Customer Statement**
  - Generate clean, printable customer ledger reports for sharing via print or PDF.

---

### 4.6. Supplier & Raw Material Purchase Management (FR-SUPP)

- **FR-SUPP-01: Supplier Directory**
  - Manage suppliers (Quarry miners, slab importers, tile suppliers, abrasive/chemical vendors) with Contact Person, Phone, Company Name, NTN, Address, and Opening Balance.

- **FR-SUPP-02: Purchase Entry (Inward Stock Receiving)**
  - Record purchase transactions with:
    - Purchase Order Number & Inward Challan / Gate Pass Number
    - Supplier Selection
    - Date of receipt
    - Vehicle / Truck Number and Driver Details
    - Purchased Items with Dimensions, Quantity (Sq. Ft / Blocks / Pieces), and Purchase Rate
    - Total Purchase Cost
    - Advance / Amount Paid at delivery
    - Remaining Balance Payable

- **FR-SUPP-03: Automatic Inventory Increment**
  - Saving a purchase inward must automatically increase warehouse stock for the specified items and log inward stock movements.

- **FR-SUPP-04: Supplier Ledger & Payment Recording**
  - Track supplier ledger accounts (Payables):
    - **Credit (+)**: Goods received from supplier.
    - **Debit (-)**: Payments made to supplier, goods returned.
    - Record payment vouchers against supplier accounts.

---

### 4.7. Returns & Damage Management (FR-RET)

- **FR-RET-01: Customer Sales Returns**
  - Allow processing returns from customers for excess or damaged tiles/slabs:
    - Reference original Invoice Number.
    - Select item, returned dimensions, and returned Sq. Ft.
    - Specify return condition (*Restockable into Yard* vs *Damaged / Broken*).
    - If restockable: Automatically increase inventory.
    - Automatically reduce the customer's outstanding balance or record refund.

- **FR-RET-02: Supplier Purchase Returns**
  - Allow returning defective stone/slabs to suppliers:
    - Reference purchase challan.
    - Deduct returned quantities from factory inventory.
    - Automatically deduct returned value from the supplier's payable balance.

- **FR-RET-03: Factory Breakage & Cutting Wastage Logging**
  - Dedicated log for stone broken during bridge-cutting, polishing, or handling.

---

### 4.8. Inventory Stock Sheet & Valuation Reporting (FR-REP)

- **FR-REP-01: Categorized Stock Sheet**
  - Real-time stock sheet grouping items by Category, Finish, Grade, and Yard Location.

- **FR-REP-02: Financial Valuation Report**
  - Compute total inventory valuation:
    - Total Cost Valuation = $\sum (\text{Stock Sq. Ft} \times \text{Cost per Sq. Ft})$
    - Total Retail Valuation = $\sum (\text{Stock Sq. Ft} \times \text{Selling Rate per Sq. Ft})$
    - Potential Gross Margin calculation.

- **FR-REP-03: Printable Yard Verification Sheet**
  - Printable stock sheet formatted for stock supervisors to perform physical audits and mark discrepancies.

---

### 4.9. System Settings, Backup & Data Security (FR-SYS)

- **FR-SYS-01: Company Profile Configuration**
  - Setup factory identity: Company Name, Tagline, Address, Phone Numbers, Email, NTN / STRN numbers, and Custom Invoice Terms & Conditions (e.g., *"Goods once sold will not be returned without original receipt"*).

- **FR-SYS-02: Local Backup & Export (Offline Integrity)**
  - Capability to export the entire system database (all tables: stock, invoices, ledgers, suppliers, returns) into an encrypted/portable JSON backup file.

- **FR-SYS-03: Restore System Database**
  - Capability to restore database state from a previously exported backup file in case of system hardware migration or recovery.

- **FR-SYS-04: Factory Reset / Seed Demo Data**
  - Provision to reinitialize initial sample data for training new staff or clear demo records before going live.

---

## 5. Summary Matrix: Functional Modules & Traceability

| Module ID | Module Name | Key Functional Capabilities | Output / Artifacts |
| :--- | :--- | :--- | :--- |
| **MOD-01** | **Dashboard** | KPI aggregations, revenue stats, receivables, payables, stock warnings. | Visual Analytics & Action shortcuts |
| **MOD-02** | **Stock / Inventory** | Item classification, dimensional tracking (Sq.Ft, Pcs, Box), stock alerts. | Inventory Master, Stock Movement Logs |
| **MOD-03** | **Billing & POS** | Dimension calculator, Sq.Ft calculations, carriage/labour charges, split payments. | A4 Tax Invoice, Thermal POS Slips |
| **MOD-04** | **Invoices Manager** | Invoice filtering, status monitoring, reprinting, audit lookups. | Invoice History Registry |
| **MOD-05** | **Customer Ledger** | Profiles, balance tracking, double-entry statement, payment collection. | Customer Statements, Payment Vouchers |
| **MOD-06** | **Supplier Manager** | Supplier registry, raw material inward, challan tracking, payables ledger. | Inward Challans, Supplier Ledgers |
| **MOD-07** | **Returns & Waste** | Sales returns, supplier returns, breakage logging, automated balance reversals. | Return Vouchers, Wastage Reports |
| **MOD-08** | **Stock Sheet** | Yard valuation, location filters, physical audit sheets. | Printable Yard Sheets, Valuation Sheet |
| **MOD-09** | **Settings & Backup** | Factory details, tax info, offline database backup & restore. | JSON Backup archives, Business Profile |

---

## 6. Business Rules & Calculation Formulas

1. **Dimensional Square Feet Formula (Inches Input):**
   $$\text{Sq. Ft} = \frac{\text{Length (in)} \times \text{Width (in)}}{144} \times \text{Pieces}$$

2. **Dimensional Square Feet Formula (Feet Input):**
   $$\text{Sq. Ft} = \text{Length (ft)} \times \text{Width (ft)} \times \text{Pieces}$$

3. **Line Item Total Calculation:**
   $$\text{Line Item Amount} = \text{Total Sq. Ft} \times \text{Rate per Sq. Ft}$$

4. **Invoice Grand Total Calculation:**
   $$\text{Grand Total} = \sum (\text{Line Item Amounts}) + \text{Carriage} + \text{Labour} + \text{Polishing} - \text{Discount}$$

5. **Customer Outstanding Balance Update:**
   $$\text{New Balance Due} = \text{Old Balance} + (\text{Grand Total} - \text{Paid Amount}) - \text{Returns Value}$$

6. **Supplier Outstanding Balance Update:**
   $$\text{New Payable Balance} = \text{Old Payable} + (\text{Purchase Bill} - \text{Advance Paid}) - \text{Returned Stock Value}$$

---

## 7. Acceptance Criteria for Group Project Submission

1. **Transaction Atomicity**: Creating an invoice must update both the customer balance and the inventory stock in a single atomic transaction without inconsistency.
2. **Dimension Accuracy**: Dimension calculations must produce accurate square footage rounded to 2 decimal places.
3. **Receipt Printing**: The system must successfully trigger browser print dialogs for both standard A4 invoices and 80mm thermal receipt formats.
4. **Ledger Integrity**: Debits and credits in customer and supplier ledgers must reconcile with all invoices and payment vouchers.
5. **Zero Data Loss**: System must support local JSON database backup export and seamless restoration.
