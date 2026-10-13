import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ClipboardList,
  Search,
  ArrowUpDown,
  Printer,
  Boxes,
  Layers,
  DollarSign,
  FileText,
  Calendar,
  Tag,
  ChevronDown,
  ChevronRight,
  Plus,
  Eye,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  Ruler,
  PackagePlus,
  MapPin,
  Package,
  HelpCircle,
  Filter
} from 'lucide-react';
import { db, adjustItemStock, logStockMovement } from '../db/index';
import { useLanguage } from '../context/LanguageContext';
import GlobalPagination from '../components/GlobalPagination';
import UniversalReportPrintModal from '../components/UniversalReportPrintModal';
import { StockCategoryDropdownTrigger, StockCategoryFilterCard } from '../components/StockCategoryFilterCard';

// ─────────────────────────────────────────────────────────────────────────────
// Stock Display & Helper Calculations
// ─────────────────────────────────────────────────────────────────────────────
function getStockDisplay(item) {
  const unit = item.unit || (item.category === "Tiles" ? "Meters" : "Sq. Ft.");
  const isTiles = item.category === "Tiles" || unit === "Meters" || unit === "Meter";

  if (isTiles) {
    const meters = Number(item.stockSqFt || 0);
    return {
      qty: meters,
      unit: "Meters",
      sub: null
    };
  }

  const qty = Number(item.stockSqFt || item.stockPieces || item.stockBoxes || 0);
  switch (unit) {
    case "Running Feet":
      return { qty: Number(item.stockSqFt || 0), unit: "R.Ft.", sub: "Length: 1 ft" };
    case "Pieces":
      return { qty: Number(item.stockPieces || item.stockSqFt || 0), unit: "Pcs", sub: item.stockBoxes > 0 ? `${item.stockBoxes} boxes` : null };
    case "Boxes":
      return { qty: Number(item.stockBoxes || 0), unit: "Boxes", sub: item.stockSqFt > 0 ? `${Number(item.stockSqFt).toLocaleString()} Sq.Ft` : null };
    default:
      return { qty: Number(item.stockSqFt || 0), unit: "Sq.Ft", sub: item.stockBoxes > 0 ? `${item.stockBoxes} boxes` : null };
  }
}

export function getItemDimensionAndSpec(item) {
  const cat = (item.category || "").toLowerCase();
  const isMarble = cat.includes("marble") || (!cat.includes("tile") && !cat.includes("border") && !cat.includes("patti") && !cat.includes("flower") && !cat.includes("panel") && !cat.includes("access"));

  if (isMarble) {
    const sutar = item.sutarThickness ? `${item.sutarThickness} Sutar` : "";
    const sz = item.standardSize ? item.standardSize : (item.length && item.width ? `${item.length} × ${item.width}` : "");
    return {
      main: sutar ? (sz ? `${sutar} (${sz})` : sutar) : (sz || "Standard"),
      sub: item.finish || "Polished"
    };
  }

  // NON-MARBLE (Tiles, Borders, Kali Patti, Flowers, Panels, Accessories):
  // Strictly NO "Sutar" or "4 Sutar"!!
  let dim = item.standardSize || "";
  if (!dim || dim === "Standard") {
    if (cat.includes("border") || cat.includes("patti")) {
      dim = item.width ? `${Math.round(item.width * 12)}" × 1 ft` : "1 ft (R.Ft.)";
    } else if (item.length && item.width) {
      dim = `${item.length} × ${item.width}`;
    } else {
      dim = item.category || "Standard";
    }
  }

  let sub = item.finish || "";
  if (cat.includes("tile")) {
    sub = "Per Meter";
  } else if (cat.includes("border") || cat.includes("patti")) {
    sub = "Length: 1 ft";
  } else if (cat.includes("panel")) {
    sub = "12 × 24 Piece";
  } else if (cat.includes("flower")) {
    sub = "Per Piece";
  } else if (cat.includes("access")) {
    sub = "Per Piece";
  }

  return {
    main: dim,
    sub: sub
  };
}

function isLowStock(item) {
  const t = Number(item.minStockAlert) || 0;
  if (t === 0) return false;
  const current = Number(item.stockSqFt || item.stockPieces || item.stockBoxes || 0);
  return current > 0 && current <= t;
}

function isOutOfStock(item) {
  const current = Number(item.stockSqFt || item.stockPieces || item.stockBoxes || 0);
  return current === 0;
}

const INITIAL_FORM = {
  code: "",
  name: "",
  category: "Marble",
  subCategory: "",
  sutarThickness: "4",
  standardSize: "12 × 12",
  length: 1,
  width: 1,
  finish: "Polished",
  grade: "Grade A",
  thicknessMm: 12,
  unit: "Sq. Ft.",
  ratePerSqFt: 0,
  costPerSqFt: 0,
  stockSqFt: 0,
  stockBoxes: 0,
  stockPieces: 0,
  minStockAlert: 100,
  lotNo: "",
  location: "Yard Shed 1",
  notes: ""
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT: StockSheetView
// ─────────────────────────────────────────────────────────────────────────────
export default function StockSheetView({ settings }) {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('sheet'); // 'sheet' | 'movements'
  const [searchTerm, setSearchTerm] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState({ type: 'ALL' });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedMovementType, setSelectedMovementType] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [movementPage, setMovementPage] = useState(1);

  // Selection & Modals
  const [selectedIds, setSelectedIds] = useState([]);
  const [drawerItem, setDrawerItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  // Live Queries
  const items = useLiveQuery(() => db.items.orderBy('name').toArray(), []) || [];
  const movements = useLiveQuery(async () => {
    const all = await db.stock_movements.toArray();
    return all.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  }, []) || [];

  // Summary Metrics
  const totalSqFt = items.reduce((acc, it) => acc + (Number(it.stockSqFt) || 0), 0);
  const totalValuation = items.reduce((acc, it) => {
    const qty = Number(it.stockSqFt || it.stockPieces || it.stockBoxes || 0);
    const rate = Number(it.costPerSqFt || it.ratePerSqFt || 0);
    return acc + qty * rate;
  }, 0);
  const totalBoxes = items.reduce((acc, it) => acc + (Number(it.stockBoxes) || 0), 0);
  const totalPieces = items.reduce((acc, it) => acc + (Number(it.stockPieces) || 0), 0);

  // Filter Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const matches =
          (item.name || "").toLowerCase().includes(s) ||
          (item.code || "").toLowerCase().includes(s) ||
          (item.category || "").toLowerCase().includes(s) ||
          (item.subCategory || "").toLowerCase().includes(s) ||
          (item.lotNo || "").toLowerCase().includes(s);
        if (!matches) return false;
      }

      // Date Range Filter
      if (dateRange !== "ALL") {
        const rawDate = item.createdAt || item.date || item.updatedAt || "";
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const thisMonthStr = now.toISOString().slice(0, 7);
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const itemDateObj = new Date(rawDate);

        if (dateRange === "TODAY") {
          if (!rawDate.startsWith(todayStr)) return false;
        } else if (dateRange === "WEEK") {
          if (itemDateObj < oneWeekAgo) return false;
        } else if (dateRange === "MONTH") {
          if (!rawDate.startsWith(thisMonthStr)) return false;
        } else if (dateRange === "CUSTOM") {
          const itemDateStr = rawDate.slice(0, 10);
          if (customStartDate && itemDateStr < customStartDate) return false;
          if (customEndDate && itemDateStr > customEndDate) return false;
        }
      }

      // Status
      if (statusFilter === "IN_STOCK" && (isLowStock(item) || isOutOfStock(item))) return false;
      if (statusFilter === "LOW_STOCK" && !isLowStock(item)) return false;
      if (statusFilter === "OUT_STOCK" && !isOutOfStock(item)) return false;

      // Enhanced Cascading Item Type Filter (Marble -> Sutar -> Size)
      if (itemTypeFilter && itemTypeFilter.type !== "ALL") {
        const cat = (item.category || "").toLowerCase();
        const sub = (item.subCategory || "").toLowerCase();
        const sz = (item.standardSize || "").toLowerCase();
        const name = (item.name || "").toLowerCase();
        const sutar = String(item.sutarThickness || "");

        if (itemTypeFilter.type === "Marble") {
          const isMarble = cat.includes("marble") || sub.includes("marble") || cat.includes("slab") || name.includes("marble") || name.includes("slab") || name.includes("sutar");
          const isNotOther = !cat.includes("tile") && !cat.includes("flower") && !cat.includes("border") && !cat.includes("panel") && !name.includes("flower");
          if (!isMarble || !isNotOther) return false;

          if (itemTypeFilter.sutar) {
            const targetSutar = itemTypeFilter.sutar.split(" ")[0]; // "4", "6", "9", "14"
            const itemSutar = String(item.sutarThickness || "").trim();

            if (itemSutar) {
              // Exact match required when item has explicit sutarThickness
              if (itemSutar !== targetSutar) return false;
            } else {
              // If no explicit sutarThickness, test name and subCategory with strict regex
              const sutarRegex = new RegExp(`(^|\\D)${targetSutar}[ -]?sutar(\\D|$)`, 'i');
              const matchesName = sutarRegex.test(name) || sutarRegex.test(sub);
              const matchesSpecial6 = targetSutar === "6" && (name.includes("kitchen") || sub.includes("kitchen") || name.includes("stairs"));
              if (!matchesName && !matchesSpecial6) return false;
            }
          }

          if (itemTypeFilter.size) {
            const cleanSz = itemTypeFilter.size.replace(/\s+/g, "").toLowerCase().replace("×", "x");
            const cleanItemSz = (sz + " " + sub + " " + name).replace(/\s+/g, "").toLowerCase().replace("×", "x");
            if (!cleanItemSz.includes(cleanSz)) return false;
          }
        } else if (itemTypeFilter.type === "Tiles") {
          const isTile = cat.includes("tile") || cat.includes("porcelain") || sub.includes("tile") || name.includes("tile");
          if (!isTile) return false;
          if (itemTypeFilter.size) {
            const cleanSz = itemTypeFilter.size.replace(/\s+/g, "").toLowerCase().replace("×", "x");
            const cleanItemSz = (sz + " " + sub + " " + name).replace(/\s+/g, "").toLowerCase().replace("×", "x");
            if (!cleanItemSz.includes(cleanSz)) return false;
          }
          if (itemTypeFilter.sub) {
            const cleanSub = itemTypeFilter.sub.toLowerCase();
            if (!sub.includes(cleanSub) && !name.includes(cleanSub) && !cat.includes(cleanSub)) return false;
          }
        } else if (itemTypeFilter.type === "Flowers") {
          const isFlower = cat.includes("flower") || sub.includes("flower") || name.includes("flower");
          if (!isFlower) return false;
          if (itemTypeFilter.size) {
            const cleanSz = itemTypeFilter.size.replace(/\s+/g, "").toLowerCase().replace("×", "x");
            const cleanItemSz = (sz + " " + sub + " " + name).replace(/\s+/g, "").toLowerCase().replace("×", "x");
            if (!cleanItemSz.includes(cleanSz)) return false;
          }
        } else if (itemTypeFilter.type === "Borders" || itemTypeFilter.type === "Border") {
          const isBorder = cat.includes("border") || sub.includes("border") || (cat.includes("patti") && !cat.includes("kali")) || (name.includes("border") && !name.includes("kali"));
          const isKali = cat.includes("kali") || sub.includes("kali") || name.includes("kali") || name.includes("black border");
          if (!isBorder || isKali) return false;

          const targetSize = itemTypeFilter.size || itemTypeFilter.sub;
          if (targetSize) {
            if (targetSize.includes("3") && !sz.includes("3") && !name.includes("3") && !sub.includes("3")) return false;
            if (targetSize.includes("6") && !sz.includes("6") && !name.includes("6") && !sub.includes("6")) return false;
          }
        } else if (itemTypeFilter.type === "Kali Patti") {
          const isKali = cat.includes("kali") || sub.includes("kali") || name.includes("kali") || name.includes("black border") || sub.includes("black border");
          if (!isKali) return false;

          const targetSize = itemTypeFilter.size || itemTypeFilter.sub;
          if (targetSize) {
            if (targetSize.includes("2") && !sz.includes("2") && !name.includes("2") && !sub.includes("2")) return false;
            if (targetSize.includes("3") && !sz.includes("3") && !name.includes("3") && !sub.includes("3")) return false;
          }
        } else if (itemTypeFilter.type === "Panels") {
          const isPanel = cat.includes("panel") || sub.includes("panel") || name.includes("panel") || name.includes("mashallah");
          if (!isPanel) return false;
          if (itemTypeFilter.sub) {
            const cleanSub = itemTypeFilter.sub.toLowerCase();
            if (!sub.includes(cleanSub) && !name.includes(cleanSub)) return false;
          }
        }
      }

      return true;
    });
  }, [items, searchTerm, dateRange, customStartDate, customEndDate, statusFilter, itemTypeFilter]);

  // Paginated Items
  const totalRecords = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedItems = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, activePage, pageSize]);

  // Filter Movements
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const s = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        (m.itemName || "").toLowerCase().includes(s) ||
        (m.refDocNo || "").toLowerCase().includes(s) ||
        (m.movementType || "").toLowerCase().includes(s) ||
        (m.note || "").toLowerCase().includes(s);

      if (!matchesSearch) return false;

      // Date Range Filter on Movements
      if (dateRange !== "ALL") {
        const rawDate = m.date || m.createdAt || "";
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const thisMonthStr = now.toISOString().slice(0, 7);
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const movDateObj = new Date(rawDate);

        if (dateRange === "TODAY") {
          if (!rawDate.startsWith(todayStr)) return false;
        } else if (dateRange === "WEEK") {
          if (movDateObj < oneWeekAgo) return false;
        } else if (dateRange === "MONTH") {
          if (!rawDate.startsWith(thisMonthStr)) return false;
        } else if (dateRange === "CUSTOM") {
          const movDateStr = rawDate.slice(0, 10);
          if (customStartDate && movDateStr < customStartDate) return false;
          if (customEndDate && movDateStr > customEndDate) return false;
        }
      }

      if (selectedMovementType === 'ALL') return true;
      return (m.movementType || "").toLowerCase() === selectedMovementType.toLowerCase();
    });
  }, [movements, searchTerm, dateRange, customStartDate, customEndDate, selectedMovementType]);

  const movementTotalPages = Math.max(1, Math.ceil(filteredMovements.length / pageSize));
  const activeMovementPage = Math.min(Math.max(1, movementPage), movementTotalPages);
  const paginatedMovements = useMemo(() => {
    const start = (activeMovementPage - 1) * pageSize;
    return filteredMovements.slice(start, start + pageSize);
  }, [filteredMovements, activeMovementPage, pageSize]);

  // Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedItems.map(i => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleOpenAddModal = (categoryArg = 'Marble') => {
    const cat = (typeof categoryArg === 'string' && categoryArg) ? categoryArg : 'Marble';
    setEditingItem(null);
    setFormData({
      ...INITIAL_FORM,
      category: cat,
      sutarThickness: cat === 'Marble' ? '4' : '',
      standardSize: cat === 'Marble' ? '12 × 12' : (cat === 'Tiles' ? '12 × 24' : (cat === 'Borders' ? '3 inch' : (cat === 'Kali Patti' ? '2 inch' : (cat === 'Panels' ? '12 × 24' : '12 × 12')))),
      length: cat === 'Tiles' ? 2 : (cat === 'Borders' || cat === 'Kali Patti' ? 1 : (cat === 'Panels' ? 2 : 1)),
      width: cat === 'Tiles' ? 1 : (cat === 'Borders' ? 0.25 : (cat === 'Kali Patti' ? 0.1667 : (cat === 'Panels' ? 1 : 1))),
      unit: cat === 'Flowers' || cat === 'Panels' || cat === 'Accessories' ? 'Pieces' : (cat === 'Borders' || cat === 'Kali Patti' ? 'Running Feet' : (cat === 'Tiles' ? 'Meters' : 'Sq. Ft.')),
      code: `${cat === 'Tiles' ? 'TL' : cat === 'Flowers' ? 'FL' : cat === 'Borders' ? 'BR' : cat === 'Kali Patti' ? 'KP' : cat === 'Panels' ? 'PN' : cat === 'Accessories' ? 'AC' : cat === 'Granite' ? 'GR' : 'MB'}-${Date.now().toString().slice(-4)}`,
      lotNo: `LOT-${new Date().getFullYear()}`
    });
    setIsModalOpen(true);
  };

  const handleCategoryChange = (catArg) => {
    const newCat = (typeof catArg === 'string' && catArg) ? catArg : 'Marble';
    let defaultUnit = "Sq. Ft.";
    let defaultSutar = "";
    let defaultSize = "12 × 12";
    let defaultLen = 1;
    let defaultWid = 1;
    let defaultCodePrefix = "MB";

    if (newCat === "Marble") {
      defaultUnit = "Sq. Ft.";
      defaultSutar = "4";
      defaultSize = "12 × 12";
      defaultLen = 1;
      defaultWid = 1;
      defaultCodePrefix = "MB";
    } else if (newCat === "Tiles") {
      defaultUnit = "Meters";
      defaultSutar = "";
      defaultSize = "12 × 24";
      defaultLen = 2;
      defaultWid = 1;
      defaultCodePrefix = "TL";
    } else if (newCat === "Flowers") {
      defaultUnit = "Pieces";
      defaultSutar = "";
      defaultSize = "12 × 12";
      defaultLen = 1;
      defaultWid = 1;
      defaultCodePrefix = "FL";
    } else if (newCat === "Borders") {
      defaultUnit = "Running Feet";
      defaultSutar = "";
      defaultSize = "3 inch";
      defaultLen = 1;
      defaultWid = 0.25;
      defaultCodePrefix = "BR";
    } else if (newCat === "Kali Patti") {
      defaultUnit = "Running Feet";
      defaultSutar = "";
      defaultSize = "2 inch";
      defaultLen = 1;
      defaultWid = 0.1667;
      defaultCodePrefix = "KP";
    } else if (newCat === "Panels") {
      defaultUnit = "Pieces";
      defaultSutar = "";
      defaultSize = "12 × 24";
      defaultLen = 2;
      defaultWid = 1;
      defaultCodePrefix = "PN";
    } else if (newCat === "Accessories") {
      defaultUnit = "Pieces";
      defaultSutar = "";
      defaultSize = "Gola";
      defaultLen = 1;
      defaultWid = 1;
      defaultCodePrefix = "AC";
    } else if (newCat === "Granite") {
      defaultUnit = "Sq. Ft.";
      defaultSutar = "";
      defaultSize = "Kitchen Slab (8×2)";
      defaultLen = 8;
      defaultWid = 2;
      defaultCodePrefix = "GR";
    }

    setFormData(prev => ({
      ...prev,
      category: newCat,
      sutarThickness: defaultSutar,
      standardSize: defaultSize,
      length: defaultLen,
      width: defaultWid,
      unit: defaultUnit,
      code: prev.code?.startsWith('MB-') || prev.code?.startsWith('TL-') || prev.code?.startsWith('FL-') || prev.code?.startsWith('BR-') || prev.code?.startsWith('KP-') || prev.code?.startsWith('PN-') || prev.code?.startsWith('AC-') || prev.code?.startsWith('GR-')
        ? `${defaultCodePrefix}-${Date.now().toString().slice(-4)}`
        : prev.code
    }));
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    const isMarble = item.category === 'Marble';
    setFormData({
      ...INITIAL_FORM,
      ...item,
      sutarThickness: isMarble ? (item.sutarThickness || '4') : '',
      unit: item.unit || (item.category === 'Tiles' ? 'Meters' : (item.category === 'Borders' || item.category === 'Kali Patti' ? 'Running Feet' : 'Sq. Ft.'))
    });
    setIsModalOpen(true);
  };

  const handleDeleteItem = async (item) => {
    // Integrity Check: Block deletion if item has been billed in historical invoices
    const allInvoices = await db.invoices.toArray();
    const isUsed = allInvoices.some(inv => (inv.items || []).some(it => String(it.itemId) === String(item.id) || String(it.id) === String(item.id)));
    if (isUsed) {
      alert(`Cannot delete "${item.name}"! This item is linked to existing invoices. To maintain audit and tax integrity, historical items cannot be deleted.`);
      return;
    }

    if (!window.confirm(`Delete "${item.name}" from inventory?`)) return;
    try {
      await db.items.delete(item.id);
      if (drawerItem?.id === item.id) setDrawerItem(null);
    } catch (err) {
      alert("Failed to delete item: " + err.message);
    }
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      const isTiles = formData.category === "Tiles";
      const isMarble = formData.category === "Marble";

      const nameTrimmed = (formData.name || '').trim();
      const codeTrimmed = (formData.code || '').trim();

      if (!nameTrimmed) {
        alert("Item Name is required!");
        return;
      }
      if (!codeTrimmed) {
        alert("Item Code is required!");
        return;
      }

      // Check unique item code
      const existingWithCode = await db.items.where('code').equalsIgnoreCase(codeTrimmed).first();
      if (existingWithCode && (!editingItem || existingWithCode.id !== editingItem.id)) {
        alert(`Item Code "${codeTrimmed}" already exists! Please use a unique item code.`);
        return;
      }

      const ratePerSqFt = parseFloat(formData.ratePerSqFt) || 0;
      const costPerSqFt = parseFloat(formData.costPerSqFt) || 0;
      const stockSqFt = parseFloat(formData.stockSqFt) || 0;
      const stockBoxes = parseInt(formData.stockBoxes) || 0;
      const stockPieces = isTiles ? 0 : (parseInt(formData.stockPieces) || 0);

      if (ratePerSqFt < 0 || costPerSqFt < 0) {
        alert("Rates and Cost prices cannot be negative!");
        return;
      }
      if (stockSqFt < 0 || stockBoxes < 0 || stockPieces < 0) {
        alert("Stock quantities cannot be negative!");
        return;
      }

      // Cost vs Sale Price Warning
      if (costPerSqFt > ratePerSqFt && ratePerSqFt > 0) {
        const proceed = window.confirm(
          `Warning: Cost price (Rs. ${costPerSqFt}) is higher than sale price (Rs. ${ratePerSqFt})! Selling at a loss. Do you still want to proceed?`
        );
        if (!proceed) return;
      }

      const payload = {
        ...formData,
        name: nameTrimmed,
        code: codeTrimmed,
        sutarThickness: isMarble ? (formData.sutarThickness || "4") : "",
        length: parseFloat(formData.length) || 1,
        width: parseFloat(formData.width) || 1,
        ratePerSqFt,
        costPerSqFt,
        stockSqFt,
        stockBoxes,
        stockPieces,
        unit: formData.unit || (isTiles ? "Meters" : (formData.category === "Borders" || formData.category === "Kali Patti" ? "Running Feet" : "Sq. Ft.")),
        minStockAlert: parseFloat(formData.minStockAlert) || 0,
        thicknessMm: isMarble ? (parseFloat(formData.thicknessMm) || 12) : 0,
        updatedAt: new Date().toISOString()
      };

      if (editingItem) {
        await db.items.update(editingItem.id, payload);
      } else {
        const addedId = await db.items.add({ ...payload, createdAt: new Date().toISOString() });
        await logStockMovement({
          itemId: addedId,
          itemName: formData.name,
          category: formData.category,
          movementType: "Initial",
          changeSqFt: payload.stockSqFt,
          changeBoxes: payload.stockBoxes,
          changePieces: payload.stockPieces,
          previousSqFt: 0,
          newSqFt: payload.stockSqFt,
          refDocNo: "INITIAL-ENTRY",
          note: "New catalog item added"
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      alert("Error saving stock item: " + err.message);
    }
  };

  return (
    <div
      className="stock-sheet-printable-area"
      style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '1440px', margin: '0 auto', paddingBottom: '30px' }}
    >
      {/* ── Dynamic Print Styles ─────────────────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .stock-sheet-printable-area, .stock-sheet-printable-area * { visibility: visible !important; }
          .stock-sheet-printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 15px !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print { display: none !important; }
          h1, h2, h3, p, span, td, th, div {
            color: #000000 !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          table { border: 1px solid #cbd5e1 !important; width: 100% !important; border-collapse: collapse !important; }
          th, td { border-bottom: 1px solid #e2e8f0 !important; padding: 6px 8px !important; }
          .print-header-banner { display: block !important; margin-bottom: 14px !important; border-bottom: 2px solid #0f172a !important; padding-bottom: 8px !important; }
        }
        .print-header-banner { display: none; }
      `}</style>

      {/* Print-Only Header */}
      <div className="print-header-banner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>Marble & Granite Factory</h1>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2563eb', marginTop: '2px' }}>
              {activeTab === 'sheet' ? 'Live Yard Stock Sheet & Valuation Report' : 'Stock In/Out Movement Audit Log'}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
            <div><strong>Printed On:</strong> {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            <div><strong>Total Varieties:</strong> {items.length} items</div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 1. SEAMLESS HERO HEADER (With Background Image matching other views)       */}
      {/* ------------------------------------------------------------------------- */}
      <div
        className="no-print"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 4px 10px 4px',
          minHeight: '84px',
          overflow: 'hidden'
        }}
      >
        {/* Left Title & Breadcrumb */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#2563eb',
              marginBottom: '4px',
              display: 'inline-block'
            }}
          >
            Stock Sheet & Audit
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '13px',
                background: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                flexShrink: 0
              }}
            >
              <ClipboardList size={24} style={{ color: '#ffffff' }} />
            </div>

            <div>
              <h1
                style={{
                  fontSize: '1.7rem',
                  fontWeight: 800,
                  color: 'var(--text-primary, #0f172a)',
                  margin: 0,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2
                }}
              >
                Stock Sheet & Audit <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-secondary, #64748b)', fontFamily: 'var(--font-urdu)' }}>(اسٹاک شیٹ اور آڈٹ)</span>
              </h1>
              <p
                style={{
                  fontSize: '0.86rem',
                  color: 'var(--text-secondary, #64748b)',
                  margin: '2px 0 0 0',
                  fontWeight: 500
                }}
              >
                {language === 'ur'
                  ? 'ماربل اور ٹائلز کا مکمل شیٹ جائزہ، قیمت تخمینہ اور ان/آؤٹ آڈٹ لاگ'
                  : 'Comprehensive yard stock sheet, live valuation calculations & movement audit log'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: + New Stock Entry Action Button (Matching Customer Ledger Header) */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenAddModal('Marble')}
            style={{
              background: '#2563eb',
              borderColor: '#2563eb',
              fontWeight: 700,
              fontSize: '0.86rem',
              padding: '10px 18px',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              color: '#ffffff'
            }}
          >
            <Plus size={16} />
            <span>New Stock Entry</span>
          </button>
        </div>

        {/* Background Marble Image extending seamlessly across the header */}
        <div
          style={{
            position: 'absolute',
            right: '0',
            top: '-15px',
            bottom: '-15px',
            width: '50%',
            maxWidth: '520px',
            backgroundImage: `url('./stock_background.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'right center',
            maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
            pointerEvents: 'none',
            opacity: 0.95,
            borderRadius: '14px'
          }}
        />
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 2. TOP 4 KPI CARDS (Matching Screenshot)                                   */}
      {/* ------------------------------------------------------------------------- */}
      <div className="kpi-card-grid">
        {/* Card 1: Total Stock Quantity */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon blue">
            <Layers size={22} />
          </div>
          <div className="kpi-metric-body" style={{ flex: 1, minWidth: 0 }}>
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Total Stock</span>
              <span className="kpi-metric-label-ur" style={{ fontFamily: 'var(--font-urdu)' }}>(کل اسٹاک کی مقدار)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {Math.round(totalSqFt).toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Sq.Ft.</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Stock Valuation */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon green" style={{ background: '#10b981' }}>
            <DollarSign size={22} />
          </div>
          <div className="kpi-metric-body" style={{ flex: 1, minWidth: 0 }}>
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Total Value</span>
              <span className="kpi-metric-label-ur" style={{ fontFamily: 'var(--font-urdu)' }}>(کل اسٹاک کی قیمت)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Rs. {Math.round(totalValuation).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card 3: Tile Boxes */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon orange" style={{ background: '#ea580c' }}>
            <Boxes size={22} />
          </div>
          <div className="kpi-metric-body" style={{ flex: 1, minWidth: 0 }}>
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Tile Boxes</span>
              <span className="kpi-metric-label-ur" style={{ fontFamily: 'var(--font-urdu)' }}>(ٹائلوں کے ڈبے)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {totalBoxes.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Boxes</span>
            </div>
          </div>
        </div>

        {/* Card 4: Slabs / Pieces Count */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon amber" style={{ background: '#f59e0b' }}>
            <Layers size={22} />
          </div>
          <div className="kpi-metric-body" style={{ flex: 1, minWidth: 0 }}>
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Slabs & Pieces</span>
              <span className="kpi-metric-label-ur" style={{ fontFamily: 'var(--font-urdu)' }}>(سلیبوں اور ٹکڑوں کی گنتی)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {totalPieces.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Pcs</span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 3. TABS & FILTER CONTROL PANEL (Same filters as Marble & Tiles Stock)       */}
      {/* ------------------------------------------------------------------------- */}
      <div
        className="no-print"
        style={{
          background: 'var(--bg-card, #ffffff)',
          borderRadius: '16px',
          padding: '16px 18px',
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        {/* Top: 2 Segment Tabs Switcher + Print Report */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('sheet')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'sheet' ? '#2563eb' : '#f1f5f9',
              color: activeTab === 'sheet' ? '#ffffff' : 'var(--text-secondary, #475569)',
              fontWeight: 700,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: activeTab === 'sheet' ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <ClipboardList size={15} />
            <span>Live Stock Valuation Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('movements')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'movements' ? '#2563eb' : '#f1f5f9',
              color: activeTab === 'movements' ? '#ffffff' : 'var(--text-secondary, #475569)',
              fontWeight: 700,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: activeTab === 'movements' ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <ArrowUpDown size={15} />
            <span>In/Out Movement Audit Log</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              marginLeft: 'auto',
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--bg-primary, #f8fafc)',
              color: 'var(--text-secondary, #475569)',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Printer size={14} />
            <span>Print Report</span>
          </button>
        </div>

        {/* Bottom: Filter Controls Bar (Same as Marble & Tiles Stock) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); setMovementPage(1); }}
              placeholder="Search stock items, codes..."
              style={{
                width: '100%',
                padding: '10px 14px 10px 38px',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #cbd5e1)',
                fontSize: '0.84rem',
                outline: 'none',
                background: 'var(--bg-primary, #f8fafc)',
                color: 'var(--text-primary, #0f172a)',
                height: '44px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Category Dropdown Trigger */}
          <StockCategoryDropdownTrigger
            filter={itemTypeFilter}
            onChange={(newFilter) => { setItemTypeFilter(newFilter); setCurrentPage(1); setMovementPage(1); }}
          />

          {/* Date Range Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={dateRange}
              onChange={(e) => { setDateRange(e.target.value); setCurrentPage(1); setMovementPage(1); }}
              style={{
                padding: '0 14px 0 34px',
                height: '44px',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: 'var(--bg-primary, #f8fafc)',
                color: 'var(--text-primary, #0f172a)',
                fontSize: '0.84rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">Date Range</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">This Week</option>
              <option value="MONTH">This Month</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
            <Calendar size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
          </div>

          {/* Custom Date Pickers when CUSTOM is active */}
          {dateRange === 'CUSTOM' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => { setCustomStartDate(e.target.value); setCurrentPage(1); setMovementPage(1); }}
                style={{
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '0.8rem',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-card, #ffffff)',
                  outline: 'none',
                  height: '44px'
                }}
                title="From Date"
              />
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => { setCustomEndDate(e.target.value); setCurrentPage(1); setMovementPage(1); }}
                style={{
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '0.8rem',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-card, #ffffff)',
                  outline: 'none',
                  height: '44px'
                }}
                title="To Date"
              />
            </div>
          )}

          {/* Status Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              style={{
                padding: '0 14px 0 34px',
                height: '44px',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: 'var(--bg-primary, #f8fafc)',
                color: 'var(--text-primary, #0f172a)',
                fontSize: '0.84rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">Status: All</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_STOCK">Out of Stock</option>
            </select>
            <Tag size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
          </div>

          {/* Reset Filters */}
          {(searchTerm || itemTypeFilter.type !== 'ALL' || statusFilter !== 'ALL' || dateRange !== 'ALL' || customStartDate || customEndDate) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setItemTypeFilter({ type: 'ALL', sutar: null, size: null, sub: null });
                setStatusFilter('ALL');
                setDateRange('ALL');
                setCustomStartDate('');
                setCustomEndDate('');
                setCurrentPage(1);
                setMovementPage(1);
              }}
              style={{
                height: '44px',
                padding: '0 10px',
                color: '#ef4444',
                fontSize: '0.78rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>

        {/* If Movement Tab is Active: Filter Movement Types */}
        {activeTab === 'movements' && (
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
            {['ALL', 'Sale', 'Purchase', 'Sales Return', 'Purchase Return', 'Adjustment', 'Initial'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setSelectedMovementType(t); setMovementPage(1); }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '7px',
                  border: '1px solid',
                  borderColor: selectedMovementType === t ? '#2563eb' : '#cbd5e1',
                  background: selectedMovementType === t ? '#eff6ff' : '#ffffff',
                  color: selectedMovementType === t ? '#2563eb' : '#475569',
                  fontSize: '0.78rem',
                  fontWeight: selectedMovementType === t ? 700 : 500,
                  cursor: 'pointer'
                }}
              >
                {t === 'ALL' ? 'All Movements' : t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dynamic Drill-Down Card for Sutar & Sizes (No Flyout Dropdowns) */}
      <StockCategoryFilterCard
        filter={itemTypeFilter}
        onChange={(newFilter) => { setItemTypeFilter(newFilter); setCurrentPage(1); setMovementPage(1); }}
        totalMatches={filteredItems.length}
      />

      {/* ------------------------------------------------------------------------- */}
      {/* 4. MAIN DATA TABLE (Zero Horizontal Scroll + Proportional Columns)         */}
      {/* ------------------------------------------------------------------------- */}
      {activeTab === 'sheet' && (
        <div className="global-table-container">
          <div className="global-table-scroll">
            <table className="global-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th className="no-print" style={{ width: '36px', textAlign: 'center', padding: '10px 4px' }}>
                    <input
                      type="checkbox"
                      checked={paginatedItems.length > 0 && paginatedItems.every((i) => selectedIds.includes(i.id))}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ width: '85px', padding: '10px 6px' }}>CODE ↑</th>
                  <th style={{ padding: '10px 8px' }}>PRODUCT NAME</th>
                  <th style={{ width: '115px', padding: '10px 6px' }}>CATEGORY</th>
                  <th style={{ width: '125px', padding: '10px 6px' }}>DIMENSIONS / SPECS</th>
                  <th style={{ width: '90px', textAlign: 'right', padding: '10px 6px' }}>STOCK</th>
                  <th style={{ width: '85px', textAlign: 'right', padding: '10px 6px' }}>COST RATE</th>
                  <th style={{ width: '85px', textAlign: 'right', padding: '10px 6px' }}>SALE RATE</th>
                  <th style={{ width: '100px', textAlign: 'right', padding: '10px 6px' }}>TOTAL VALUE</th>
                  <th style={{ width: '80px', textAlign: 'center', padding: '10px 4px' }}>STATUS</th>
                  <th className="no-print" style={{ width: '80px', textAlign: 'center', padding: '10px 4px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '45px 20px', color: '#94a3b8' }}>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>No stock items match your filter criteria.</div>
                      <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Click "+ New Stock Entry" to add new inventory.</div>
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    const sd = getStockDisplay(item);
                    const specInfo = getItemDimensionAndSpec(item);
                    const isTiles = item.category === "Tiles" || item.unit === "Meters" || item.unit === "Meter";
                    const low = isLowStock(item);
                    const out = isOutOfStock(item);
                    const totalValue = sd.qty * Number(item.ratePerSqFt || 0);

                    return (
                      <tr
                        key={item.id}
                        className={isSelected ? 'active-row' : ''}
                      >
                        {/* Checkbox */}
                        <td className="no-print" style={{ textAlign: 'center', padding: '8px 4px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectOne(item.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>

                        {/* Code */}
                        <td style={{ padding: '8px 6px' }}>
                          <span style={{ fontWeight: 800, color: '#2563eb', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                            {item.code || '—'}
                          </span>
                        </td>

                        {/* Product Name */}
                        <td style={{ padding: '8px 8px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary, #0f172a)', fontSize: '0.84rem', lineHeight: 1.25 }}>
                            {item.name}
                          </div>
                        </td>

                        {/* Category */}
                        <td style={{ padding: '8px 6px' }}>
                          <span style={{
                            background: 'var(--bg-primary, #f1f5f9)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            color: '#475569',
                            display: 'inline-block',
                            lineHeight: 1.2
                          }}>
                            {item.category}
                          </span>
                          {item.subCategory && (
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                              {item.subCategory.replace(new RegExp(`^${item.category}\\s*-\\s*`, 'i'), '').trim()}
                            </div>
                          )}
                        </td>

                        {/* Dimensions / Specs */}
                        <td style={{ padding: '8px 6px' }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-primary, #0f172a)', fontWeight: 600 }}>
                            {specInfo.main}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {specInfo.sub}
                          </div>
                        </td>

                        {/* Stock Qty */}
                        <td style={{ textAlign: 'right', padding: '8px 6px' }}>
                          <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: out ? '#ef4444' : low ? '#d97706' : 'var(--text-primary)' }}>
                            {sd.qty.toLocaleString()} <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>{sd.unit}</span>
                          </div>
                          {sd.sub && (
                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{sd.sub}</div>
                          )}
                        </td>

                        {/* Cost Rate */}
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#64748b', fontSize: '0.82rem', padding: '8px 6px', whiteSpace: 'nowrap' }}>
                          Rs. {Number(item.costPerSqFt || 0).toLocaleString()}{isTiles ? ' / m' : ''}
                        </td>

                        {/* Sale Rate */}
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.82rem', padding: '8px 6px', whiteSpace: 'nowrap' }}>
                          Rs. {Number(item.ratePerSqFt || 0).toLocaleString()}{isTiles ? ' / m' : ''}
                        </td>

                        {/* Total Value */}
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#059669', fontSize: '0.82rem', padding: '8px 6px', whiteSpace: 'nowrap' }}>
                          Rs. {Math.round(totalValue).toLocaleString()}
                        </td>

                        {/* Status */}
                        <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                          {out ? (
                            <span style={{
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: '#dc2626',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              padding: '2px 8px',
                              borderRadius: '20px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              display: 'inline-block'
                            }}>
                              Out of Stock
                            </span>
                          ) : low ? (
                            <span style={{
                              background: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                              padding: '2px 8px',
                              borderRadius: '20px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              display: 'inline-block'
                            }}>
                              Low Stock
                            </span>
                          ) : (
                            <span style={{
                              background: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              padding: '2px 8px',
                              borderRadius: '20px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              display: 'inline-block'
                            }}>
                              In Stock
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="no-print" style={{ textAlign: 'center', padding: '8px 4px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <button
                              type="button"
                              onClick={() => setDrawerItem(item)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                border: 'none',
                                background: '#eff6ff',
                                color: '#2563eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'transform 0.1s ease'
                              }}
                              title="View Details"
                            >
                              <Eye size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                border: 'none',
                                background: '#f0fdf4',
                                color: '#16a34a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'transform 0.1s ease'
                              }}
                              title="Edit Item"
                            >
                              <Edit2 size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                border: 'none',
                                background: '#fff1f2',
                                color: '#e11d48',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'transform 0.1s ease'
                              }}
                              title="Delete Item"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Global Pagination */}
          <GlobalPagination
            currentPage={activePage}
            totalPages={totalPages}
            totalRecords={totalRecords}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            language={language}
          />
        </div>
      )}

      {/* Tab 2: In/Out Movement Audit Log Table */}
      {activeTab === 'movements' && (
        <div className="global-table-container">
          <div className="global-table-scroll">
            <table className="global-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '110px', padding: '10px 8px' }}>TIMESTAMP</th>
                  <th style={{ padding: '10px 8px' }}>MARBLE / TILE ITEM</th>
                  <th style={{ width: '100px', textAlign: 'center', padding: '10px 6px' }}>TYPE</th>
                  <th style={{ width: '90px', padding: '10px 6px' }}>REF DOC #</th>
                  <th style={{ width: '95px', textAlign: 'right', padding: '10px 6px' }}>CHANGE</th>
                  <th style={{ width: '90px', textAlign: 'right', padding: '10px 6px' }}>PREV SQFT</th>
                  <th style={{ width: '95px', textAlign: 'right', padding: '10px 6px' }}>NEW SQFT</th>
                  <th style={{ padding: '10px 8px' }}>NOTES / REMARKS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMovements.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '45px 20px', color: '#94a3b8' }}>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>No stock movement records found.</div>
                      <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Stock in/out records appear automatically upon Billing or Stock Adjustments.</div>
                    </td>
                  </tr>
                ) : (
                  paginatedMovements.map((mov) => {
                    const isPositive = Number(mov.changeSqFt) > 0;
                    return (
                      <tr key={mov.id}>
                        <td style={{ fontSize: '0.78rem', color: '#64748b', padding: '8px 8px', whiteSpace: 'nowrap' }}>
                          {new Date(mov.date || mov.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.82rem', padding: '8px 8px' }}>
                          {mov.itemName}
                        </td>
                        <td style={{ textAlign: 'center', padding: '8px 6px' }}>
                          <span style={{
                            padding: '2px 7px',
                            borderRadius: '5px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: mov.movementType === 'Sale' ? 'rgba(225, 29, 72, 0.12)' :
                              mov.movementType === 'Purchase' ? 'rgba(5, 150, 105, 0.12)' :
                                mov.movementType === 'Sales Return' ? 'rgba(37, 99, 235, 0.12)' : 'rgba(2, 132, 199, 0.12)',
                            color: mov.movementType === 'Sale' ? '#e11d48' :
                              mov.movementType === 'Purchase' ? '#059669' :
                                mov.movementType === 'Sales Return' ? '#2563eb' : '#0284c7'
                          }}>
                            {mov.movementType}
                          </span>
                        </td>
                        <td className="font-mono" style={{ fontSize: '0.8rem', fontWeight: 600, padding: '8px 6px' }}>
                          {mov.refDocNo || '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, padding: '8px 6px' }} className={`font-mono ${isPositive ? 'text-emerald' : 'text-rose'}`}>
                          {isPositive ? `+${mov.changeSqFt}` : mov.changeSqFt}
                        </td>
                        <td style={{ textAlign: 'right', color: '#94a3b8', padding: '8px 6px' }} className="font-mono">
                          {mov.previousSqFt}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb', padding: '8px 6px' }} className="font-mono">
                          {mov.newSqFt}
                        </td>
                        <td style={{ fontSize: '0.78rem', color: '#64748b', padding: '8px 8px' }}>
                          {mov.note || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Global Pagination for Movements */}
          <GlobalPagination
            currentPage={activeMovementPage}
            totalPages={movementTotalPages}
            totalRecords={filteredMovements.length}
            pageSize={pageSize}
            onPageChange={(page) => setMovementPage(page)}
            language={language}
          />
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 5. ITEM DETAILS DRAWER (Progressive Disclosure)                            */}
      {/* ------------------------------------------------------------------------- */}
      {drawerItem && (
        <div className="modal-backdrop" onClick={() => setDrawerItem(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              right: 0,
              top: 0,
              bottom: 0,
              width: "420px",
              maxWidth: "92vw",
              height: "100vh",
              borderRadius: 0,
              display: "flex",
              flexDirection: "column",
              background: "var(--bg-secondary, #ffffff)",
              borderLeft: "1px solid var(--border-color)",
              boxShadow: "-10px 0 30px rgba(0,0,0,0.15)",
              animation: "slideInRight 0.2s ease"
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.72rem", color: "#2563eb", fontWeight: 700, textTransform: "uppercase" }}>
                  {drawerItem.category} • {drawerItem.code}
                </div>
                <h3 style={{ margin: "2px 0 0 0", fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  {drawerItem.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDrawerItem(null)}
                className="btn btn-ghost btn-sm"
                style={{ padding: "4px", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ padding: "20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Key Metric Strip */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                <div style={{ background: "var(--bg-primary, #f8fafc)", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color, #e2e8f0)" }}>
                  <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600 }}>Current Stock</div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }} className="font-mono">
                    {drawerItem.stockSqFt || drawerItem.stockPieces || drawerItem.stockBoxes || 0} <span style={{ fontSize: "0.7rem", color: "#64748b" }}>{drawerItem.unit}</span>
                  </div>
                </div>

                <div style={{ background: "var(--bg-primary, #f8fafc)", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color, #e2e8f0)" }}>
                  <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600 }}>Cost Rate</div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#475569", marginTop: "2px" }} className="font-mono">
                    Rs. {Number(drawerItem.costPerSqFt || 0).toLocaleString()}
                  </div>
                </div>

                <div style={{ background: "var(--bg-primary, #f8fafc)", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color, #e2e8f0)" }}>
                  <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600 }}>Sale Rate</div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#2563eb", marginTop: "2px" }} className="font-mono">
                    Rs. {Number(drawerItem.ratePerSqFt || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Specs List */}
              <div style={{ background: "var(--bg-primary, #f8fafc)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border-color, #e2e8f0)", display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.82rem" }}>
                {drawerItem.category === "Marble" ? (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Sutar / Thickness:</span>
                    <span style={{ fontWeight: 700 }}>{drawerItem.sutarThickness ? `${drawerItem.sutarThickness} Sutar` : `${drawerItem.thicknessMm || 0} mm`}</span>
                  </div>
                ) : null}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Standard Size:</span>
                  <span style={{ fontWeight: 700 }}>{drawerItem.standardSize || "-"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Finish:</span>
                  <span style={{ fontWeight: 700 }}>{drawerItem.finish || "Polished"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Grade:</span>
                  <span style={{ fontWeight: 700 }}>{drawerItem.grade || "Grade A"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Yard Location:</span>
                  <span style={{ fontWeight: 700 }}>{drawerItem.location || "Yard Shed 1"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Lot / Block #:</span>
                  <span style={{ fontWeight: 700 }}>{drawerItem.lotNo || "—"}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "10px", marginTop: "auto" }}>
                <button
                  type="button"
                  onClick={() => { setDrawerItem(null); handleOpenEditModal(drawerItem); }}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: "10px", fontSize: "0.84rem" }}
                >
                  <Edit2 size={14} /> Edit Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 6. ADD / EDIT STOCK ITEM MODAL                                             */}
      {/* ------------------------------------------------------------------------- */}
      {isModalOpen && (
        <div className="app-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="app-modal-card"
            style={{ maxWidth: "620px", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="app-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div className="app-modal-icon-badge">
                  <Boxes size={24} color="#ffffff" />
                </div>
                <div>
                  <h3 className="app-modal-title">
                    {editingItem ? "Edit Stock Item" : "Register New Stock Entry"}
                  </h3>
                  <p className="app-modal-subtitle">
                    {editingItem ? "Update item specifications, prices and thresholds" : "Add new stock entry to your inventory"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="app-modal-close-btn"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveItem} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="app-modal-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                {/* 1. Category Dropdown & Item Code (2-Column Grid) */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      <Filter size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                      Select Category <span className="app-form-label-required">*</span>
                    </label>
                    <div className="app-input-wrapper">
                      <Layers size={16} className="app-input-icon" />
                      <select
                        value={formData.category}
                        onChange={e => handleCategoryChange(e.target.value)}
                        className="app-form-select has-icon has-chevron"
                        style={{ fontWeight: 700 }}
                      >
                        <option value="Marble">Marble</option>
                        <option value="Tiles">Tiles</option>
                        <option value="Flowers">Flowers</option>
                        <option value="Borders">Borders</option>
                        <option value="Kali Patti">Kali Patti</option>
                        <option value="Panels">Panels</option>
                        <option value="Granite">Granite</option>
                        <option value="Accessories">Accessories</option>
                      </select>
                      <ChevronDown size={14} className="app-input-chevron" />
                    </div>
                  </div>

                  <div className="app-form-group">
                    <label className="app-form-label">
                      Item Code <span className="app-form-label-required">*</span>
                    </label>
                    <div className="app-input-wrapper">
                      <span className="app-input-icon font-mono" style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                        #
                      </span>
                      <input
                        required
                        type="text"
                        value={formData.code}
                        onChange={e => setFormData(p => ({ ...p, code: e.target.value }))}
                        className="app-form-input has-icon font-mono"
                        placeholder="e.g. MB-8084"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Product / Variety Name */}
                <div className="app-form-group">
                  <label className="app-form-label">
                    Product / Variety Name <span className="app-form-label-required">*</span>
                  </label>
                  <div className="app-input-wrapper">
                    <Search size={16} className="app-input-icon" />
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      className="app-form-input has-icon"
                      placeholder="e.g. Sunny Grey, Badal Grey, Ziarat White, Master Tile..."
                      autoFocus
                    />
                  </div>
                </div>

                {/* 3. DYNAMIC CATEGORY CLASSIFICATION CARDS (Identical to BillingView & StockManagementView) */}
                {formData.category === "Marble" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {/* Marble Sutar Thickness Cards */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <label className="app-form-label" style={{ margin: 0, fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                          <Ruler size={14} style={{ color: "#2563eb" }} />
                          Sutar Thickness <span className="app-form-label-required">*</span>
                        </label>
                        {formData.sutarThickness === "6" && (
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#d97706", background: "rgba(217, 119, 6, 0.1)", padding: "2px 8px", borderRadius: "4px" }}>
                            ⚡ Kitchen & Stairs Only
                          </span>
                        )}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                        {[
                          { sutar: "4", label: "4 Sutar", mm: "12mm (Floor)", defSize: "12 × 12", length: 1, width: 1 },
                          { sutar: "6", label: "6 Sutar", mm: "18mm", isKitchen: true, defSize: "12 × 12", length: 1, width: 1 },
                          { sutar: "9", label: "9 Sutar", mm: "28mm (Steps)", defSize: "12 × 12", length: 1, width: 1 },
                          { sutar: "14", label: "14 Sutar", mm: "42mm (Base)", defSize: "12 × 12", length: 1, width: 1 }
                        ].map(thick => {
                          const isSelected = String(formData.sutarThickness) === String(thick.sutar);
                          return (
                            <button
                              key={thick.sutar}
                              type="button"
                              onClick={() => setFormData(p => ({
                                ...p,
                                sutarThickness: thick.sutar,
                                standardSize: thick.defSize,
                                length: thick.length,
                                width: thick.width
                              }))}
                              style={{
                                padding: "8px 4px",
                                borderRadius: "10px",
                                border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                                background: isSelected ? "#eff6ff" : "#ffffff",
                                color: isSelected ? "#2563eb" : "#334155",
                                textAlign: "center",
                                cursor: "pointer",
                                transition: "all 0.15s ease"
                              }}
                            >
                              <div style={{ fontWeight: 800, fontSize: "0.82rem" }}>{thick.label}</div>
                              <div style={{ fontSize: "0.66rem", color: thick.isKitchen ? "#d97706" : (isSelected ? "#2563eb" : "#64748b"), fontWeight: thick.isKitchen ? 700 : 500 }}>
                                {thick.isKitchen ? "Kitchen/Stairs" : thick.mm}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Marble Sutar Size Cards */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <label className="app-form-label" style={{ margin: 0, fontSize: "0.74rem", color: "#64748b" }}>
                          Standard Sizes for {formData.sutarThickness || 4} Sutar
                        </label>
                        <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                          Click to apply dimensions
                        </span>
                      </div>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: "8px"
                      }}>
                        {(["6", "9", "14"].includes(String(formData.sutarThickness))
                          ? [
                            { label: "12 × 12", sub: "1 ft × 1 ft (1 Sq.Ft)", length: 1, width: 1 }
                          ]
                          : [
                            { label: "12 × 12", sub: "1 ft × 1 ft (1 Sq.Ft)", length: 1, width: 1 },
                            { label: "12 × 24", sub: "2 ft × 1 ft (2 Sq.Ft)", length: 2, width: 1 },
                            { label: "6 × 12", sub: "0.5 ft × 1 ft (0.5 Sq.Ft)", length: 1, width: 0.5 },
                            { label: "6 × 24", sub: "0.5 ft × 2 ft (1 Sq.Ft)", length: 2, width: 0.5 }
                          ]
                        ).map(opt => {
                          const isSelected = formData.standardSize === opt.label;
                          return (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => setFormData(p => ({
                                ...p,
                                standardSize: opt.label,
                                length: opt.length !== undefined ? opt.length : p.length,
                                width: opt.width !== undefined ? opt.width : p.width
                              }))}
                              style={{
                                padding: "8px 4px",
                                borderRadius: "10px",
                                border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                                background: isSelected ? "#eff6ff" : "#ffffff",
                                color: isSelected ? "#2563eb" : "#334155",
                                textAlign: "center",
                                cursor: "pointer",
                                transition: "all 0.15s ease"
                              }}
                            >
                              <div style={{ fontWeight: 800, fontSize: "0.82rem" }}>{opt.label}</div>
                              <div style={{ fontSize: "0.66rem", color: isSelected ? "#2563eb" : "#64748b", fontWeight: 600 }}>
                                {opt.sub}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : formData.category === "Tiles" ? (
                  /* Types of Tiles Only */
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label className="app-form-label" style={{ margin: 0, fontWeight: 700 }}>
                        Tile Sizes
                      </label>
                      <span style={{ fontSize: "0.72rem", color: "#2563eb", fontWeight: 700 }}>
                        1 Meter = 5 Pieces
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                      {[
                        { label: "12 × 24", sub: '12" × 24" (2 Sq.Ft)', length: 2, width: 1 },
                        { label: "24 × 24", sub: '24" × 24" (4 Sq.Ft)', length: 2, width: 2 },
                        { label: "24 × 48", sub: '24" × 48" (8 Sq.Ft)', length: 4, width: 2 },
                        { label: "16 × 16", sub: '16" × 16" (1.77 Sq.Ft)', length: 1.33, width: 1.33 }
                      ].map(opt => {
                        const isSelected = formData.standardSize === opt.label;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => setFormData(p => ({
                              ...p,
                              standardSize: opt.label,
                              length: opt.length,
                              width: opt.width,
                              unit: "Meters"
                            }))}
                            style={{
                              padding: "8px 4px",
                              borderRadius: "10px",
                              border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                              background: isSelected ? "#eff6ff" : "#ffffff",
                              color: isSelected ? "#2563eb" : "#334155",
                              textAlign: "center",
                              cursor: "pointer",
                              transition: "all 0.15s ease"
                            }}
                          >
                            <div style={{ fontWeight: 800, fontSize: "0.82rem" }}>{opt.label}</div>
                            <div style={{ fontSize: "0.66rem", color: isSelected ? "#2563eb" : "#64748b", fontWeight: 600 }}>
                              {opt.sub}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Other Non-Marble Categories (Flowers, Borders, Kali Patti, Panels, Granite, Accessories) */
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label className="app-form-label" style={{ margin: 0, fontWeight: 700 }}>
                        {formData.category === "Flowers"
                          ? "Flower Sizes"
                          : formData.category === "Borders"
                            ? "Border Sizes (Length: 1 ft)"
                            : formData.category === "Kali Patti"
                              ? "Kali Patti Sizes (Length: 1 ft)"
                              : formData.category === "Panels"
                                ? "Panel Types (12 × 24)"
                                : `${String(formData.category || '')} Standard Sizes`}
                      </label>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        Click to apply dimensions
                      </span>
                    </div>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: (formData.category === "Flowers" || formData.category === "Granite") ? "repeat(3, 1fr)" : (formData.category === "Borders" || formData.category === "Kali Patti") ? "repeat(2, 1fr)" : formData.category === "Panels" ? "repeat(1, 1fr)" : "repeat(4, 1fr)",
                      gap: "8px"
                    }}>
                      {(formData.category === "Flowers"
                        ? [
                          { label: "12 × 12", sub: "1 ft × 1 ft (1 Sq.Ft)", length: 1, width: 1 },
                          { label: "24 × 24", sub: "2 ft × 2 ft (4 Sq.Ft)", length: 2, width: 2 },
                          { label: "3 × 3", sub: "3 ft × 3 ft (9 Sq.Ft)", length: 3, width: 3 }
                        ]
                        : formData.category === "Borders"
                          ? [
                            { label: "3 inch", sub: '3" Width × 1 ft Length', length: 1, width: 0.25 },
                            { label: "6 inch", sub: '6" Width × 1 ft Length', length: 1, width: 0.5 }
                          ]
                          : formData.category === "Kali Patti"
                            ? [
                              { label: "2 inch", sub: '2" Width × 1 ft Length', length: 1, width: 0.1667 },
                              { label: "3 inch", sub: '3" Width × 1 ft Length', length: 1, width: 0.25 }
                            ]
                            : formData.category === "Panels"
                              ? [
                                { label: "12 × 24", sub: "1ft × 2ft (Per Piece)", length: 2, width: 1 }
                              ]
                              : formData.category === "Granite"
                                ? [
                                  { label: "Kitchen Slab", sub: "8ft × 2ft (16 Sq.Ft)", length: 8, width: 2 },
                                  { label: "Flooring Slab", sub: "6ft × 2ft (12 Sq.Ft)", length: 6, width: 2 },
                                  { label: "Stair Step", sub: "4ft × 1ft (4 Sq.Ft)", length: 4, width: 1 }
                                ]
                                : [
                                  { label: "Gola", sub: "Corner Gola (Per Piece)", length: 1, width: 1 },
                                  { label: "Border Strip", sub: "Tile Patti Strip", length: 1, width: 0.25 },
                                  { label: "Filling", sub: "Joint Filling / Bond", length: 1, width: 1 },
                                  { label: "Spacer", sub: "3mm Cross Spacers", length: 1, width: 1 }
                                ]
                      ).map(opt => {
                        const isSelected = formData.standardSize === opt.label;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => setFormData(p => ({
                              ...p,
                              standardSize: opt.label,
                              length: opt.length !== undefined ? opt.length : p.length,
                              width: opt.width !== undefined ? opt.width : p.width
                            }))}
                            style={{
                              padding: "8px 4px",
                              borderRadius: "10px",
                              border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                              background: isSelected ? "#eff6ff" : "#ffffff",
                              color: isSelected ? "#2563eb" : "#334155",
                              textAlign: "center",
                              cursor: "pointer",
                              transition: "all 0.15s ease"
                            }}
                          >
                            <div style={{ fontWeight: 800, fontSize: "0.82rem" }}>{opt.label}</div>
                            <div style={{ fontSize: "0.66rem", color: isSelected ? "#2563eb" : "#64748b", fontWeight: 600 }}>
                              {opt.sub}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Custom Size / Dimensions Direct Text Box */}
                <div style={{
                  background: "#ffffff",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "10px",
                  padding: "10px 12px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label className="app-form-label" style={{ margin: 0, fontSize: "0.74rem", fontWeight: 700, color: "#1e293b" }}>
                      Custom Size / Dimensions (Optional)
                    </label>
                    <span style={{ fontSize: "0.72rem", color: "#2563eb", fontWeight: 700 }}>
                      Current: {formData.standardSize || "Standard"}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={formData.standardSize || ""}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData(p => {
                        let nextL = p.length;
                        let nextW = p.width;
                        const match = val.match(/(\d+(?:\.\d+)?)\s*[x×X*]\s*(\d+(?:\.\d+)?)/);
                        if (match) {
                          const n1 = parseFloat(match[1]);
                          const n2 = parseFloat(match[2]);
                          if (n1 <= 12 && n2 > 12) {
                            nextW = parseFloat((n1 / 12).toFixed(4));
                            nextL = parseFloat((n2 / 12).toFixed(4));
                          } else if (n2 <= 12 && n1 > 12) {
                            nextL = parseFloat((n1 / 12).toFixed(4));
                            nextW = parseFloat((n2 / 12).toFixed(4));
                          } else {
                            nextL = n1;
                            nextW = n2;
                          }
                        }
                        const pcs = parseFloat(p.stockPieces) || 1;
                        const sqft = Math.round(nextL * nextW * pcs * 100) / 100;
                        return {
                          ...p,
                          standardSize: val,
                          length: nextL,
                          width: nextW,
                          stockSqFt: p.category === 'Tiles' ? p.stockSqFt : sqft
                        };
                      });
                    }}
                    placeholder="e.g. 12 × 12, 12 × 24, 4 × 24, 3 inch, or custom size..."
                    className="app-form-input font-mono"
                    style={{ fontSize: "0.85rem", height: "38px" }}
                  />
                </div>

                {/* 4. Dimensions Box & Unit Configuration */}
                <div style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "14px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#1e293b" }}>
                      Dimensions, Quantity & Unit ({formData.category === "Tiles" ? "1 Meter = 5 Pieces" : "Dimensions & Stock"})
                    </span>
                  </div>

                  {formData.category === "Tiles" ? (
                    /* TILES SPECIFIC DIMENSIONS: BILLED & STORED STRICTLY PER METER */
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      {/* Stock in Meters */}
                      <div className="app-form-group">
                        <label className="app-form-label" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                          Stock in Meters <span className="app-form-label-required">*</span>
                        </label>
                        <div className="app-input-wrapper">
                          <input
                            type="number"
                            step="any"
                            value={formData.stockSqFt || ""}
                            onChange={e => {
                              setFormData(p => ({
                                ...p,
                                stockSqFt: e.target.value,
                                stockPieces: 0,
                                unit: "Meters"
                              }));
                            }}
                            placeholder="e.g. 100"
                            className="app-form-input font-mono"
                            style={{ fontWeight: 700 }}
                          />
                        </div>
                      </div>

                      {/* Stock Unit */}
                      <div className="app-form-group">
                        <label className="app-form-label" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                          Stock Unit
                        </label>
                        <div className="app-input-wrapper">
                          <Boxes size={16} className="app-input-icon" />
                          <input
                            type="text"
                            disabled
                            value="Meters"
                            className="app-form-input font-mono"
                            style={{ background: "#f1f5f9", fontWeight: 700, paddingLeft: "32px" }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : formData.category === "Borders" || formData.category === "Kali Patti" ? (
                    /* BORDERS & KALI PATTI: LENGTH IS STRICTLY 1 FT, BILLED IN RUNNING FEET */
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
                      {/* Width (inches / ft) */}
                      <div className="app-form-group">
                        <label className="app-form-label" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                          Width (Inches)
                        </label>
                        <div className="app-input-wrapper">
                          <input
                            type="text"
                            value={formData.width ? `${Math.round(formData.width * 12)}"` : (formData.category === "Kali Patti" ? '2"' : '3"')}
                            readOnly
                            className="app-form-input font-mono"
                            style={{ background: "#f1f5f9", fontWeight: 700 }}
                          />
                        </div>
                      </div>

                      {/* Length (ft) - STRICTLY 1 FT */}
                      <div className="app-form-group">
                        <label className="app-form-label" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                          Length
                        </label>
                        <div className="app-input-wrapper">
                          <input
                            type="text"
                            value="1 ft"
                            readOnly
                            className="app-form-input font-mono"
                            style={{ background: "#f1f5f9", fontWeight: 700 }}
                          />
                        </div>
                      </div>

                      {/* Running Feet Qty */}
                      <div className="app-form-group">
                        <label className="app-form-label" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                          Stock (Running Feet / R.Ft.)
                        </label>
                        <div className="app-input-wrapper">
                          <input
                            type="number"
                            step="any"
                            value={formData.stockSqFt || ""}
                            onChange={e => setFormData(p => ({ ...p, stockSqFt: e.target.value, stockPieces: 0 }))}
                            placeholder="e.g. 50"
                            className="app-form-input font-mono"
                            style={{ fontWeight: 700 }}
                          />
                        </div>
                      </div>

                      {/* Unit */}
                      <div className="app-form-group">
                        <label className="app-form-label" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                          Unit
                        </label>
                        <div className="app-input-wrapper">
                          <input
                            type="text"
                            value="Running Feet"
                            readOnly
                            className="app-form-input"
                            style={{ background: "#f1f5f9", fontWeight: 700 }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* STANDARD MARBLE & OTHER CATEGORIES */
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
                      {/* Length (ft) */}
                      <div className="app-form-group">
                        <label className="app-form-label" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                          Length (ft)
                        </label>
                        <div className="app-input-wrapper">
                          <input
                            type="number"
                            step="any"
                            value={formData.length !== undefined ? formData.length : ""}
                            onChange={e => {
                              const val = e.target.value;
                              setFormData(p => {
                                const nextLen = parseFloat(val) || 0;
                                const w = parseFloat(p.width) || 0;
                                const pcs = parseFloat(p.stockPieces) || 1;
                                const sqft = Math.round(nextLen * w * pcs * 100) / 100;
                                let newSize = p.standardSize;
                                if (val && p.width) newSize = `${val} × ${p.width}`;
                                else if (val) newSize = `${val} ft`;
                                return { ...p, length: nextLen || val, stockSqFt: sqft, standardSize: newSize };
                              });
                            }}
                            placeholder="e.g. 1, 2"
                            className="app-form-input font-mono"
                          />
                        </div>
                      </div>

                      {/* Width (ft) */}
                      <div className="app-form-group">
                        <label className="app-form-label" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                          Width (ft)
                        </label>
                        <div className="app-input-wrapper">
                          <input
                            type="number"
                            step="any"
                            value={formData.width !== undefined ? formData.width : ""}
                            onChange={e => {
                              const val = e.target.value;
                              setFormData(p => {
                                const l = parseFloat(p.length) || 0;
                                const nextWidth = parseFloat(val) || 0;
                                const pcs = parseFloat(p.stockPieces) || 1;
                                const sqft = Math.round(l * nextWidth * pcs * 100) / 100;
                                let newSize = p.standardSize;
                                if (p.length && val) newSize = `${p.length} × ${val}`;
                                else if (val) newSize = `${val} ft`;
                                return { ...p, width: nextWidth || val, stockSqFt: sqft, standardSize: newSize };
                              });
                            }}
                            placeholder="e.g. 1, 0.5"
                            className="app-form-input font-mono"
                          />
                        </div>
                      </div>
                      
                      {/* Pieces */}
                      <div className="app-form-group">
                        <label className="app-form-label" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                          Quantity (Pieces)
                        </label>
                        <div className="app-input-wrapper">
                          <input
                            type="number"
                            step="any"
                            value={formData.stockPieces || ""}
                            onChange={e => {
                              const val = e.target.value;
                              setFormData(p => {
                                const l = parseFloat(p.length) || 0;
                                const w = parseFloat(p.width) || 0;
                                const pcs = parseFloat(val) || 0;
                                const sqft = Math.round(l * w * pcs * 100) / 100;
                                return { ...p, stockPieces: val, stockBoxes: val, stockSqFt: sqft };
                              });
                            }}
                            placeholder="e.g. 100"
                            className="app-form-input font-mono"
                          />
                        </div>
                      </div>

                      {/* Stock Unit */}
                      <div className="app-form-group">
                        <label className="app-form-label" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                          Stock Unit <span className="app-form-label-required">*</span>
                        </label>
                        <div className="app-input-wrapper">
                          <Boxes size={16} className="app-input-icon" />
                          <select
                            value={formData.unit}
                            onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))}
                            className="app-form-select has-icon has-chevron"
                            style={{ fontWeight: 600 }}
                          >
                            <option value="Sq. Ft.">Sq. Ft.</option>
                            <option value="Meters">Meters</option>
                            <option value="Boxes">Boxes</option>
                            <option value="Pieces">Pieces</option>
                            <option value="Running Feet">Running Feet</option>
                          </select>
                          <ChevronDown size={14} className="app-input-chevron" />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '10px',
                    paddingTop: '10px',
                    borderTop: '1px solid #e2e8f0',
                    fontSize: '0.82rem'
                  }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Total Calculated Stock ({formData.category === 'Tiles' ? 'Meters' : formData.unit || 'Sq.Ft'}):</span>
                    <span className="font-mono" style={{ fontWeight: 800, color: '#2563eb', fontSize: '1rem' }}>
                      <input
                        type="number"
                        step="any"
                        value={formData.stockSqFt}
                        onChange={e => setFormData(p => ({ ...p, stockSqFt: e.target.value }))}
                        style={{ background: 'transparent', border: 'none', color: 'inherit', fontWeight: 'inherit', width: '80px', textAlign: 'right', borderBottom: '1px dashed #2563eb', outline: 'none' }}
                      />
                    </span>
                  </div>
                </div>

                {/* 5. Pricing Rates (2-Column Grid) */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      Selling Rate (Rs / {formData.category === "Tiles" ? "Meter" : (formData.unit || "Unit")}) <span className="app-form-label-required">*</span>
                    </label>
                    <div className="app-input-wrapper">
                      <DollarSign size={16} className="app-input-icon" />
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.ratePerSqFt}
                        onChange={e => setFormData(p => ({ ...p, ratePerSqFt: e.target.value }))}
                        className="app-form-input has-icon font-mono"
                        placeholder="0"
                        style={{ fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  <div className="app-form-group">
                    <label className="app-form-label">
                      Cost Rate (Rs / {formData.category === "Tiles" ? "Meter" : (formData.unit || "Unit")}) <span className="app-form-label-required">*</span>
                    </label>
                    <div className="app-input-wrapper">
                      <DollarSign size={16} className="app-input-icon" />
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.costPerSqFt}
                        onChange={e => setFormData(p => ({ ...p, costPerSqFt: e.target.value }))}
                        className="app-form-input has-icon font-mono"
                        placeholder="0"
                        style={{ fontWeight: 700 }}
                      />
                    </div>
                  </div>
                </div>

                {/* 6. Low Stock Alert */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      Low Stock Alert Threshold
                    </label>
                    <div className="app-input-wrapper">
                      <AlertTriangle size={16} className="app-input-icon" />
                      <input
                        type="number"
                        value={formData.minStockAlert}
                        onChange={e => setFormData(p => ({ ...p, minStockAlert: e.target.value }))}
                        className="app-form-input has-icon font-mono"
                        placeholder="100"
                      />
                    </div>
                  </div>
                </div>

                {/* 7. Yard Storage Location & Remarks */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      Yard Storage Location
                    </label>
                    <div className="app-input-wrapper">
                      <MapPin size={16} className="app-input-icon" />
                      <input
                        type="text"
                        value={formData.lotNo}
                        onChange={e => setFormData(p => ({ ...p, lotNo: e.target.value }))}
                        className="app-form-input has-icon"
                        placeholder="e.g. Yard Shed 1, Row B"
                      />
                    </div>
                  </div>

                  <div className="app-form-group">
                    <label className="app-form-label">
                      Remarks / Finish Notes
                    </label>
                    <div className="app-input-wrapper">
                      <Tag size={16} className="app-input-icon" />
                      <input
                        type="text"
                        value={formData.notes || ''}
                        onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                        className="app-form-input has-icon"
                        placeholder="e.g. Polished, Honed, Premium Lot"
                      />
                    </div>
                  </div>
                </div>

                {/* Notice banner */}
                <div className="app-form-notice">
                  <HelpCircle size={16} style={{ flexShrink: 0 }} />
                  <span>All fields marked with <b style={{ color: "#ef4444" }}>*</b> are required.</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="app-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="app-btn-cancel"
                >
                  <X size={16} />
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  className="app-btn-submit"
                >
                  <PackagePlus size={16} />
                  <span>{editingItem ? "Update Item" : "Add Stock Item"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Universal Report Print Modal for Stock Sheet & Movements */}
      <UniversalReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={activeTab === 'sheet' ? "Stock Inventory Valuation Report" : "Stock Movement Audit Log"}
        titleUrdu={activeTab === 'sheet' ? "اسٹاک انوینٹری ویلیوایشن آڈٹ رپورٹ" : "اسٹاک موومنٹ آڈٹ لاگ"}
        subtitle={`Filter: ${itemTypeFilter.type || 'All'} | Records: ${activeTab === 'sheet' ? filteredItems.length : filteredMovements.length}`}
        factorySettings={settings}
        kpis={
          activeTab === 'sheet'
            ? [
              { label: 'Total Items', labelUrdu: 'کل اقسام', value: filteredItems.length, color: '#2563eb' },
              { label: 'Total Stock Sq.Ft', labelUrdu: 'کل مربع فٹ', value: `${filteredItems.reduce((acc, it) => acc + (Number(it.stockSqFt) || 0), 0).toLocaleString()} Sq.Ft`, color: '#059669' },
              { label: 'Total Boxes', labelUrdu: 'کل پیٹیاں', value: `${filteredItems.reduce((acc, it) => acc + (Number(it.stockBoxes) || 0), 0).toLocaleString()}`, color: '#d97706' },
              { label: 'Total Valuation', labelUrdu: 'کل مالیت', value: `Rs. ${filteredItems.reduce((acc, it) => acc + ((Number(it.stockSqFt) || Number(it.stockPieces) || 0) * (Number(it.costPerSqFt) || Number(it.ratePerSqFt) || 0)), 0).toLocaleString()}`, color: '#7c3aed' }
            ]
            : [
              { label: 'Total Movements', labelUrdu: 'کل اندراجات', value: filteredMovements.length, color: '#2563eb' },
              { label: 'Inward Logs', labelUrdu: 'آمد اسٹاک', value: filteredMovements.filter(m => m.type === 'IN' || m.type === 'PURCHASE').length, color: '#059669' },
              { label: 'Outward Logs', labelUrdu: 'اخراج اسٹاک', value: filteredMovements.filter(m => m.type === 'OUT' || m.type === 'SALE').length, color: '#dc2626' },
              { label: 'Adjustments', labelUrdu: 'تبدیلی ریکارڈ', value: filteredMovements.filter(m => m.type === 'ADJUSTMENT' || m.type === 'WASTAGE').length, color: '#d97706' }
            ]
        }
        columns={
          activeTab === 'sheet'
            ? [
              { key: 'code', label: 'Item Code', labelUrdu: 'کوڈ', width: '90px' },
              { key: 'name', label: 'Item Description', labelUrdu: 'نام و تفصیل', bold: true },
              { key: 'category', label: 'Category', labelUrdu: 'کیٹیگری', render: (r) => `${r.category || ''} ${r.subCategory ? '- ' + r.subCategory : ''}` },
              { key: 'dimension', label: 'Dimensions / Size', labelUrdu: 'پیمائش / سائز', render: (r) => getItemDimensionAndSpec(r).main },
              { key: 'stockSqFt', label: 'Stock (Sq.Ft)', labelUrdu: 'اسٹاک', align: 'right', render: (r) => `${Number(r.stockSqFt || 0).toLocaleString()} sq.ft` },
              { key: 'costPerSqFt', label: 'Cost Rate (Rs.)', labelUrdu: 'لاگت ریٹ', align: 'right', render: (r) => `Rs.${Number(r.costPerSqFt || 0).toLocaleString()}` },
              { key: 'ratePerSqFt', label: 'Sale Rate (Rs.)', labelUrdu: 'سیل ریٹ', align: 'right', render: (r) => `Rs.${Number(r.ratePerSqFt || 0).toLocaleString()}` },
              { key: 'valuation', label: 'Valuation (Rs.)', labelUrdu: 'کل مالیت', align: 'right', bold: true, render: (r) => `Rs.${Number((Number(r.stockSqFt || 0) * (Number(r.costPerSqFt) || Number(r.ratePerSqFt) || 0))).toLocaleString()}` },
              { key: 'status', label: 'Status', labelUrdu: 'حیثیت', align: 'center', render: (r) => isOutOfStock(r) ? 'ختم اسٹاک' : isLowStock(r) ? 'کم اسٹاک' : 'موجود اسٹاک' }
            ]
            : [
              { key: 'date', label: 'Date', labelUrdu: 'تاریخ', render: (r) => new Date(r.date || r.createdAt || Date.now()).toLocaleDateString('en-PK') },
              { key: 'itemName', label: 'Item Name', labelUrdu: 'آئٹم', bold: true },
              { key: 'type', label: 'Movement', labelUrdu: 'قسم', align: 'center', render: (r) => r.type === 'IN' || r.type === 'PURCHASE' ? 'آمد' : r.type === 'OUT' || r.type === 'SALE' ? 'اخراج' : r.type === 'WASTAGE' ? 'ضیاع' : 'تبدیلی' },
              { key: 'quantity', label: 'Quantity / Sq.Ft', labelUrdu: 'مقدار', align: 'right', render: (r) => `${Number(r.quantity || r.qtySqFt || 0).toLocaleString()} ${r.unit || 'sqft'}` },
              { key: 'reason', label: 'Reason / Notes', labelUrdu: 'وجہ / تفصیل' },
              { key: 'user', label: 'Authorized By', labelUrdu: 'مجاز شخص', render: (r) => r.createdBy || r.user || 'Admin' }
            ]
        }
        data={activeTab === 'sheet' ? filteredItems : filteredMovements}
        summaryRows={
          activeTab === 'sheet'
            ? [
              { label: 'Total Valuation', labelUrdu: 'کل اسٹاک مالیت', value: `Rs. ${filteredItems.reduce((acc, it) => acc + ((Number(it.stockSqFt) || Number(it.stockPieces) || 0) * (Number(it.costPerSqFt) || Number(it.ratePerSqFt) || 0)), 0).toLocaleString()}` },
              { label: 'Total Sq.Ft', labelUrdu: 'کل رقبہ (مربع فٹ)', value: `${filteredItems.reduce((acc, it) => acc + (Number(it.stockSqFt) || 0), 0).toLocaleString()} Sq.Ft` }
            ]
            : [
              { label: 'Total Log Count', labelUrdu: 'کل موومنٹ اندراجات', value: `${filteredMovements.length}` }
            ]
        }
      />

    </div>
  );
}
