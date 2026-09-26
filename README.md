# 🏛️ Marble & Tiles Factory Management System (ERP & POS)

A specialized, offline-first Desktop Enterprise Resource Planning (ERP) and Point of Sale (POS) system designed for marble processing factories, stone yards, and ceramic/granite wholesalers.

---

## 🛠️ Tech Stack

### **Frontend & UI**
- **[React 19](https://react.dev/)**: Modern UI library for building dynamic component-driven user interfaces.
- **[Vite 6](https://vite.dev/)**: Fast, next-generation build tool and local development server.
- **[Lucide React](https://lucide.dev/)**: Clean and consistent icon library.
- **[Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)**: Interactive celebration animations for checkout and milestones.
- **Vanilla CSS**: Custom, responsive design system with dark/light themes and modern glassmorphism styling.

### **Desktop Runtime**
- **[Electron 34](https://www.electronjs.org/)**: Cross-platform desktop application framework.

### **Database & Storage**
- **[Dexie.js 4](https://dexie.org/)**: Fast, offline-first IndexedDB wrapper for local database storage, client-side querying, and persistence.

---

## ✨ Key Features

- 📊 **Executive Dashboard**: Real-time sales KPIs, revenue tracking, receivables, and low-stock alerts.
- 📐 **Marble & Tile Calculations**: Dual inventory tracking with automatic conversion between *Length × Width (Inches/Feet)*, *Square Feet (Sq. Ft.)*, *Pieces*, and *Standard Boxes*.
- 🛒 **POS & Billing**: Quick checkout, customer discount handling, carriage/labour charges, and instant invoice printing (A4 & Thermal).
- 📒 **Customer & Supplier Ledgers**: Complete credit history, balance tracking, and transaction records.
- 📦 **Inventory & Stock Management**: Tracking stone grades (Grade A, Commercial, Premium) and finishes (Polished, Honed, Flamed).
- 💾 **100% Offline-First**: Works locally without internet connection using Dexie/IndexedDB.

---

## 📋 Prerequisites

Before running the project, make sure you have the following installed on your machine:

- **[Node.js](https://nodejs.org/)** (v18.0.0 or higher recommended)
- **npm** (comes bundled with Node.js)

---

## 🚀 How to Start the Project

### 1. Navigate to the Project Directory
Open your terminal / command prompt and navigate to the `Project` folder:

```bash
cd "d:/Semesters/5/SPM/Project"
```

### 2. Install Dependencies
Install all required packages:

```bash
npm install
```

### 3. Run the Application

You can start the project in either **Desktop Application Mode** or **Web Browser Mode**:

#### 🖥️ Option A: Run as Desktop Application (Electron) — *Recommended*
Run the desktop app with Electron:
```bash
npm run electron:dev
```
> **Windows Shortcut:** You can also simply double-click the **`Marble Factory.bat`** file in the `Project` folder to launch the desktop application directly!

---

#### 🌐 Option B: Run in Web Browser (Vite Dev Server)
Run the fast local web development server:
```bash
npm run dev
# or
npm start
```
Once started, open your browser and visit: **`http://localhost:5173`**

---

### 4. Build for Production

To create an optimized production build:
```bash
npm run build
```

To preview the built production bundle:
```bash
npm run preview
```

---

## 📁 Project Structure

```text
Project/
├── electron/              # Electron main process configuration
│   └── main.cjs           # Desktop window management & lifecycle
├── src/
│   ├── components/        # Reusable UI components (Modals, Cards, Nav, Tables)
│   ├── views/             # Main application views (Dashboard, POS, Inventory, Ledgers)
│   ├── db/                # Dexie.js database schema & initial seed data
│   ├── App.jsx            # Main React application shell
│   ├── index.css          # Design system, theme tokens & styling
│   └── main.jsx           # React DOM root entry point
├── Marble Factory.bat     # Windows one-click desktop app launcher
├── index.html             # HTML entry point
├── package.json           # Project dependencies & scripts
├── vite.config.js         # Vite bundler configuration
└── requirements.md        # Software Requirements Specification (SRS)
```

---

## 📜 Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` / `npm start` | Starts the Vite development server in browser mode |
| `npm run electron:dev` | Compiles the frontend and starts the Electron desktop app |
| `npm run build` | Builds optimized production bundle in `dist/` |
| `npm run preview` | Previews the production build locally |
