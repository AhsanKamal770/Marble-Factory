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
  SlidersHorizontal
} from 'lucide-react';
import { db, adjustItemStock, logStockMovement } from '../db/index';
import { useLanguage } from '../context/LanguageContext';
import GlobalPagination from '../components/GlobalPagination';

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN TAXONOMY for Cascading Filter & Form
// ─────────────────────────────────────────────────────────────────────────────
const TAXONOMY = {
  marble: {
    label: "Marble",
    sutars: [
      { sutar: "4 Sutar", sizes: ["12 × 12", "12 × 24", "6 × 12", "6 × 24"] },
      { sutar: "6 Sutar", sizes: ["Stairs & Kitchen Slabs", "3ft Step + Riser", "4ft Step + Riser", "Kitchen Countertop (Custom)"] },
      { sutar: "9 Sutar", sizes: ["Heavy Flooring Slabs", "Cut-to-Size Slabs"] },
      { sutar: "14 Sutar", sizes: ["Industrial / Thick Slabs", "Foundation Slabs"] }
    ]
  },
  tiles: {
    label: "Tiles",
    sizes: ["12 × 24", "24 × 24", "24 × 48", "16 × 16"],
    accessories: ["Border", "Filling / Grout", "Spacer", "Gola / Chamfer"],
    panels: ["Mashallah / Islamic Calligraphy Panels"]
  },
  flowers: {
    label: "Flowers",
    sizes: ["12 × 12", "24 × 24", "3 × 3"]
  },
  borders: {
    label: "Borders",
    standard: ["3 inch", "6 inch"],
    blackBorder: ["2 inch", "3 inch"]
  },
  panels: {
    label: "Panels",
    types: ["Mashallah Islamic Panels", "3D Wall Panels", "Front Elevation Panels"]
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Stock Display & Helper Calculations
// ─────────────────────────────────────────────────────────────────────────────
function getStockDisplay(item) {
  const unit = item.unit || "Sq. Ft.";
  switch (unit) {
    case "Running Feet":
      return { qty: Number(item.stockSqFt || 0), unit: "Feet", sub: item.stockPieces > 0 ? `${item.stockPieces} pcs` : null };
    case "Pieces":
      return { qty: Number(item.stockPieces || item.stockSqFt || 0), unit: "Pcs", sub: item.stockBoxes > 0 ? `${item.stockBoxes} boxes` : null };
    case "Boxes":
      return { qty: Number(item.stockBoxes || 0), unit: "Boxes", sub: item.stockSqFt > 0 ? `${Number(item.stockSqFt).toLocaleString()} Sq.Ft` : null };
    default:
      return { qty: Number(item.stockSqFt || 0), unit: "Sq.Ft", sub: item.stockBoxes > 0 ? `${item.stockBoxes} boxes` : null };
  }
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
// Cascading "Filter by Item Type" Multi-Level Dropdown
// ─────────────────────────────────────────────────────────────────────────────
function CascadingTypeFilter({ filter, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeL1, setActiveL1] = useState(null);
  const [activeL2, setActiveL2] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
        setActiveL1(null);
        setActiveL2(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const displayLabel = useMemo(() => {
    if (!filter || filter.type === "ALL") return "All Categories";
    let text = filter.type;
    if (filter.sutar) text += ` > ${filter.sutar}`;
    if (filter.size) text += ` > ${filter.size}`;
    if (filter.sub) text += ` > ${filter.sub}`;
    return text;
  }, [filter]);

  const selectFilter = (newFilter) => {
    onChange(newFilter);
    setIsOpen(false);
    setActiveL1(null);
    setActiveL2(null);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "6px 14px",
          minHeight: "44px",
          minWidth: "170px",
          background: "var(--bg-primary, #f8fafc)",
          border: "1px solid var(--border-color, #cbd5e1)",
          borderRadius: "10px",
          color: "var(--text-primary, #0f172a)",
          cursor: "pointer",
          outline: "none",
          textAlign: "left"
        }}
      >
        <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Filter by Item Type
        </span>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "6px" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary, #0f172a)", whiteSpace: "nowrap" }}>
            {filter?.type === "ALL" ? "All Types" : displayLabel}
          </span>
          <ChevronDown size={14} style={{ color: "#64748b" }} />
        </div>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 999,
            display: "flex",
            alignItems: "flex-start",
            gap: "2px"
          }}
        >
          {/* Level 1: Categories */}
          <div
            style={{
              background: "var(--bg-card, #ffffff)",
              border: "1px solid var(--border-color, #cbd5e1)",
              borderRadius: "10px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
              padding: "4px 0",
              minWidth: "150px",
              overflow: "hidden"
            }}
          >
            <button
              type="button"
              onClick={() => selectFilter({ type: "ALL" })}
              style={{
                width: "100%",
                padding: "8px 14px",
                border: "none",
                background: filter?.type === "ALL" ? "#eff6ff" : "none",
                color: filter?.type === "ALL" ? "#2563eb" : "var(--text-primary)",
                fontWeight: filter?.type === "ALL" ? 700 : 500,
                fontSize: "0.83rem",
                textAlign: "left",
                cursor: "pointer"
              }}
              onMouseEnter={() => { setActiveL1(null); setActiveL2(null); }}
            >
              All Types
            </button>

            {["Marble", "Tiles", "Flowers", "Borders", "Panels"].map((cat) => (
              <div
                key={cat}
                onMouseEnter={() => { setActiveL1(cat); setActiveL2(null); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 14px",
                  background: activeL1 === cat ? "#eff6ff" : "none",
                  color: activeL1 === cat ? "#2563eb" : "var(--text-primary)",
                  cursor: "pointer",
                  fontSize: "0.83rem",
                  fontWeight: activeL1 === cat ? 700 : 500
                }}
                onClick={() => selectFilter({ type: cat })}
              >
                <span>{cat}</span>
                <ChevronRight size={13} style={{ color: activeL1 === cat ? "#2563eb" : "#94a3b8" }} />
              </div>
            ))}
          </div>

          {/* Level 2 Sub-menu */}
          {activeL1 === "Marble" && (
            <div
              style={{
                background: "var(--bg-card, #ffffff)",
                border: "1px solid var(--border-color, #cbd5e1)",
                borderRadius: "10px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                padding: "4px 0",
                minWidth: "140px"
              }}
            >
              <button
                type="button"
                onClick={() => selectFilter({ type: "Marble" })}
                style={{ width: "100%", padding: "7px 12px", border: "none", background: "none", textAlign: "left", fontSize: "0.8rem", fontWeight: 700, color: "#2563eb", cursor: "pointer" }}
                onMouseEnter={() => setActiveL2(null)}
              >
                All Marble
              </button>
              {TAXONOMY.marble.sutars.map((s) => (
                <div
                  key={s.sutar}
                  onMouseEnter={() => setActiveL2(s.sutar)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "7px 12px",
                    background: activeL2 === s.sutar ? "#eff6ff" : "none",
                    color: activeL2 === s.sutar ? "#2563eb" : "var(--text-primary)",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: activeL2 === s.sutar ? 700 : 500
                  }}
                  onClick={() => selectFilter({ type: "Marble", sutar: s.sutar })}
                >
                  <span>{s.sutar}</span>
                  {s.sizes?.length > 0 && <ChevronRight size={12} />}
                </div>
              ))}
            </div>
          )}

          {/* Level 3 Sizes for Marble Sutar */}
          {activeL1 === "Marble" && activeL2 && (
            <div
              style={{
                background: "var(--bg-card, #ffffff)",
                border: "1px solid var(--border-color, #cbd5e1)",
                borderRadius: "10px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                padding: "4px 0",
                minWidth: "130px"
              }}
            >
              {TAXONOMY.marble.sutars.find(s => s.sutar === activeL2)?.sizes.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => selectFilter({ type: "Marble", sutar: activeL2, size: sz })}
                  style={{ width: "100%", padding: "7px 12px", border: "none", background: "none", textAlign: "left", fontSize: "0.8rem", cursor: "pointer", color: "var(--text-primary)" }}
                >
                  {sz}
                </button>
              ))}
            </div>
          )}

          {/* Level 2 for Tiles */}
          {activeL1 === "Tiles" && (
            <div
              style={{
                background: "var(--bg-card, #ffffff)",
                border: "1px solid var(--border-color, #cbd5e1)",
                borderRadius: "10px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                padding: "4px 0",
                minWidth: "160px"
              }}
            >
              <button
                type="button"
                onClick={() => selectFilter({ type: "Tiles" })}
                style={{ width: "100%", padding: "7px 12px", border: "none", background: "none", textAlign: "left", fontSize: "0.8rem", fontWeight: 700, color: "#2563eb", cursor: "pointer" }}
              >
                All Tiles
              </button>
              <div style={{ padding: "4px 12px", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Standard Sizes</div>
              {TAXONOMY.tiles.sizes.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => selectFilter({ type: "Tiles", size: sz })}
                  style={{ width: "100%", padding: "6px 12px", border: "none", background: "none", textAlign: "left", fontSize: "0.8rem", cursor: "pointer", color: "var(--text-primary)" }}
                >
                  {sz}
                </button>
              ))}
              <div style={{ padding: "4px 12px", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", borderTop: "1px solid #f1f5f9", marginTop: "4px" }}>Tile Accessories</div>
              {TAXONOMY.tiles.accessories.map((acc) => (
                <button
                  key={acc}
                  type="button"
                  onClick={() => selectFilter({ type: "Tiles", sub: acc })}
                  style={{ width: "100%", padding: "6px 12px", border: "none", background: "none", textAlign: "left", fontSize: "0.8rem", cursor: "pointer", color: "var(--text-primary)" }}
                >
                  {acc}
                </button>
              ))}
            </div>
          )}

          {/* Level 2 for Flowers */}
          {activeL1 === "Flowers" && (
            <div
              style={{
                background: "var(--bg-card, #ffffff)",
                border: "1px solid var(--border-color, #cbd5e1)",
                borderRadius: "10px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                padding: "4px 0",
                minWidth: "130px"
              }}
            >
              <button
                type="button"
                onClick={() => selectFilter({ type: "Flowers" })}
                style={{ width: "100%", padding: "7px 12px", border: "none", background: "none", textAlign: "left", fontSize: "0.8rem", fontWeight: 700, color: "#2563eb", cursor: "pointer" }}
              >
                All Flowers
              </button>
              {TAXONOMY.flowers.sizes.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => selectFilter({ type: "Flowers", size: sz })}
                  style={{ width: "100%", padding: "7px 12px", border: "none", background: "none", textAlign: "left", fontSize: "0.8rem", cursor: "pointer", color: "var(--text-primary)" }}
                >
                  {sz}
                </button>
              ))}
            </div>
          )}

          {/* Level 2 for Borders */}
          {activeL1 === "Borders" && (
            <div
              style={{
                background: "var(--bg-card, #ffffff)",
                border: "1px solid var(--border-color, #cbd5e1)",
                borderRadius: "10px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                padding: "4px 0",
                minWidth: "150px"
              }}
            >
              <button
                type="button"
                onClick={() => selectFilter({ type: "Borders" })}
                style={{ width: "100%", padding: "7px 12px", border: "none", background: "none", textAlign: "left", fontSize: "0.8rem", fontWeight: 700, color: "#2563eb", cursor: "pointer" }}
              >
                All Borders
              </button>
              <div style={{ padding: "4px 12px", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Standard Borders</div>
              {TAXONOMY.borders.standard.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => selectFilter({ type: "Borders", sub: `Standard ${b}` })}
                  style={{ width: "100%", padding: "6px 12px", border: "none", background: "none", textAlign: "left", fontSize: "0.8rem", cursor: "pointer", color: "var(--text-primary)" }}
                >
                  {b} Border
                </button>
              ))}
              <div style={{ padding: "4px 12px", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", borderTop: "1px solid #f1f5f9", marginTop: "4px" }}>Kali Patti</div>
              {TAXONOMY.borders.blackBorder.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => selectFilter({ type: "Borders", sub: `Kali Patti ${b}` })}
                  style={{ width: "100%", padding: "6px 12px", border: "none", background: "none", textAlign: "left", fontSize: "0.8rem", cursor: "pointer", color: "var(--text-primary)" }}
                >
                  Kali Patti {b}
                </button>
              ))}
            </div>
          )}

          {/* Level 2 for Panels */}
          {activeL1 === "Panels" && (
            <div
              style={{
                background: "var(--bg-card, #ffffff)",
                border: "1px solid var(--border-color, #cbd5e1)",
                borderRadius: "10px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                padding: "4px 0",
                minWidth: "170px"
              }}
            >
              <button
                type="button"
                onClick={() => selectFilter({ type: "Panels" })}
                style={{ width: "100%", padding: "7px 12px", border: "none", background: "none", textAlign: "left", fontSize: "0.8rem", fontWeight: 700, color: "#2563eb", cursor: "pointer" }}
              >
                All Panels
              </button>
              {TAXONOMY.panels.types.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => selectFilter({ type: "Panels", sub: p })}
                  style={{ width: "100%", padding: "6px 12px", border: "none", background: "none", textAlign: "left", fontSize: "0.8rem", cursor: "pointer", color: "var(--text-primary)" }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [selectedMovementType, setSelectedMovementType] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [movementPage, setMovementPage] = useState(1);

  // Selection & Modals
  const [selectedIds, setSelectedIds] = useState([]);
  const [drawerItem, setDrawerItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);

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

      // Status
      if (statusFilter === "IN_STOCK" && (isLowStock(item) || isOutOfStock(item))) return false;
      if (statusFilter === "LOW_STOCK" && !isLowStock(item)) return false;
      if (statusFilter === "OUT_STOCK" && !isOutOfStock(item)) return false;

      // Type Filter
      if (itemTypeFilter && itemTypeFilter.type !== "ALL") {
        const cat = (item.category || "").toLowerCase();
        const sub = (item.subCategory || "").toLowerCase();
        const name = (item.name || "").toLowerCase();
        const sz = (item.standardSize || "").toLowerCase();
        const sutar = (item.sutarThickness || "").toString();

        if (itemTypeFilter.type === "Marble") {
          const isMarble = cat.includes("marble") || cat.includes("granite") || sub.includes("marble") || name.includes("marble") || name.includes("granite") || name.includes("slab");
          if (!isMarble) return false;
          if (itemTypeFilter.sutar) {
            const target = itemTypeFilter.sutar.split(" ")[0];
            if (sutar !== target && !sub.includes(target) && !name.includes(target)) return false;
          }
          if (itemTypeFilter.size) {
            const cleanSz = itemTypeFilter.size.replace(/\s+/g, "").toLowerCase();
            const cleanItemSz = (sz + " " + sub + " " + name).replace(/\s+/g, "").toLowerCase();
            if (!cleanItemSz.includes(cleanSz) && !cleanItemSz.includes(cleanSz.replace("×", "x"))) return false;
          }
        } else if (itemTypeFilter.type === "Tiles") {
          const isTile = cat.includes("tile") || cat.includes("porcelain") || sub.includes("tile") || name.includes("tile");
          if (!isTile) return false;
          if (itemTypeFilter.size) {
            const cleanSz = itemTypeFilter.size.replace(/\s+/g, "").toLowerCase();
            const cleanItemSz = (sz + " " + sub + " " + name).replace(/\s+/g, "").toLowerCase();
            if (!cleanItemSz.includes(cleanSz) && !cleanItemSz.includes(cleanSz.replace("×", "x"))) return false;
          }
          if (itemTypeFilter.sub) {
            const cleanSub = itemTypeFilter.sub.toLowerCase();
            if (!sub.includes(cleanSub) && !name.includes(cleanSub) && !cat.includes(cleanSub)) return false;
          }
        } else if (itemTypeFilter.type === "Flowers") {
          const isFlower = cat.includes("flower") || sub.includes("flower") || name.includes("flower");
          if (!isFlower) return false;
          if (itemTypeFilter.size) {
            const cleanSz = itemTypeFilter.size.replace(/\s+/g, "").toLowerCase();
            const cleanItemSz = (sz + " " + sub + " " + name).replace(/\s+/g, "").toLowerCase();
            if (!cleanItemSz.includes(cleanSz) && !cleanItemSz.includes(cleanSz.replace("×", "x"))) return false;
          }
        } else if (itemTypeFilter.type === "Borders") {
          const isBorder = cat.includes("border") || sub.includes("border") || sub.includes("patti") || name.includes("border") || name.includes("patti");
          if (!isBorder) return false;
          if (itemTypeFilter.sub) {
            const cleanSub = itemTypeFilter.sub.toLowerCase();
            if (!sub.includes(cleanSub) && !name.includes(cleanSub)) return false;
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
  }, [items, searchTerm, statusFilter, itemTypeFilter]);

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
      if (selectedMovementType === 'ALL') return true;
      return (m.movementType || "").toLowerCase() === selectedMovementType.toLowerCase();
    });
  }, [movements, searchTerm, selectedMovementType]);

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

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      ...INITIAL_FORM,
      code: `MB-${Date.now().toString().slice(-4)}`,
      lotNo: `LOT-${new Date().getFullYear()}`
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({ ...INITIAL_FORM, ...item });
    setIsModalOpen(true);
  };

  const handleDeleteItem = async (item) => {
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
      const payload = {
        ...formData,
        ratePerSqFt: parseFloat(formData.ratePerSqFt) || 0,
        costPerSqFt: parseFloat(formData.costPerSqFt) || 0,
        stockSqFt: parseFloat(formData.stockSqFt) || 0,
        stockBoxes: parseInt(formData.stockBoxes) || 0,
        stockPieces: parseInt(formData.stockPieces) || 0,
        minStockAlert: parseFloat(formData.minStockAlert) || 0,
        thicknessMm: parseFloat(formData.thicknessMm) || 0,
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '1440px', margin: '0 auto', paddingBottom: '30px' }}>

      {/* ------------------------------------------------------------------------- */}
      {/* 1. SEAMLESS HERO HEADER (With Background Image matching other views)       */}
      {/* ------------------------------------------------------------------------- */}
      <div
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
            onClick={handleOpenAddModal}
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
            backgroundImage: `url('./stock_background.jpg'), url('/stock_background.jpg'), url('./invoice_background.jpg'), url('/invoice_background.jpg')`,
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
            </select>
            <Calendar size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
          </div>

          {/* Cascading "Filter by Item Type" Multi-Level Dropdown */}
          <CascadingTypeFilter
            filter={itemTypeFilter}
            onChange={(newFilter) => { setItemTypeFilter(newFilter); setCurrentPage(1); }}
          />

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
          {(searchTerm || itemTypeFilter.type !== 'ALL' || statusFilter !== 'ALL' || dateRange !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setItemTypeFilter({ type: 'ALL' });
                setStatusFilter('ALL');
                setDateRange('ALL');
                setCurrentPage(1);
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
                gap: '4px',
                fontWeight: 600
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

      {/* ------------------------------------------------------------------------- */}
      {/* 4. MAIN DATA TABLE (Zero Horizontal Scroll + Proportional Columns)         */}
      {/* ------------------------------------------------------------------------- */}
      {activeTab === 'sheet' && (
        <div className="global-table-container">
          <div className="global-table-scroll">
            <table className="global-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '36px', textAlign: 'center', padding: '10px 4px' }}>
                    <input
                      type="checkbox"
                      checked={paginatedItems.length > 0 && paginatedItems.every((i) => selectedIds.includes(i.id))}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ width: '85px', padding: '10px 6px' }}>CODE ↑</th>
                  <th style={{ padding: '10px 8px' }}>PRODUCT NAME</th>
                  <th style={{ width: '125px', padding: '10px 6px' }}>CATEGORY</th>
                  <th style={{ width: '140px', padding: '10px 6px' }}>DIMENSIONS / SPECS</th>
                  <th style={{ width: '95px', textAlign: 'right', padding: '10px 6px' }}>STOCK</th>
                  <th style={{ width: '85px', textAlign: 'right', padding: '10px 6px' }}>RATE</th>
                  <th style={{ width: '105px', textAlign: 'right', padding: '10px 6px' }}>TOTAL VALUE</th>
                  <th style={{ width: '85px', textAlign: 'center', padding: '10px 4px' }}>STATUS</th>
                  <th style={{ width: '85px', textAlign: 'center', padding: '10px 4px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '45px 20px', color: '#94a3b8' }}>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>No stock items match your filter criteria.</div>
                      <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Click "+ New Stock Entry" to add new inventory.</div>
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    const sd = getStockDisplay(item);
                    const low = isLowStock(item);
                    const out = isOutOfStock(item);
                    const totalValue = sd.qty * Number(item.ratePerSqFt || 0);

                    return (
                      <tr
                        key={item.id}
                        className={isSelected ? 'active-row' : ''}
                      >
                        {/* Checkbox */}
                        <td style={{ textAlign: 'center', padding: '8px 4px' }}>
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
                          {item.lotNo && (
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.lotNo}</div>
                          )}
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
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>{item.subCategory}</div>
                          )}
                        </td>

                        {/* Dimensions / Specs */}
                        <td style={{ padding: '8px 6px' }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-primary, #0f172a)', fontWeight: 600 }}>
                            {item.sutarThickness ? `${item.sutarThickness} Sutar` : item.standardSize || 'Standard'}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {item.finish || 'Polished'} {item.grade ? `• ${item.grade}` : ''}
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

                        {/* Unit Rate */}
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.82rem', padding: '8px 6px', whiteSpace: 'nowrap' }}>
                          Rs. {Number(item.ratePerSqFt || 0).toLocaleString()}
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
                        <td style={{ textAlign: 'center', padding: '8px 4px' }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{ background: "var(--bg-primary, #f8fafc)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-color, #e2e8f0)" }}>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Current Stock</div>
                  <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }} className="font-mono">
                    {drawerItem.stockSqFt || drawerItem.stockPieces || drawerItem.stockBoxes || 0} <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{drawerItem.unit}</span>
                  </div>
                </div>

                <div style={{ background: "var(--bg-primary, #f8fafc)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-color, #e2e8f0)" }}>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Unit Rate</div>
                  <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#2563eb", marginTop: "2px" }} className="font-mono">
                    Rs. {Number(drawerItem.ratePerSqFt || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Specs List */}
              <div style={{ background: "var(--bg-primary, #f8fafc)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border-color, #e2e8f0)", display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.82rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Sutar / Thickness:</span>
                  <span style={{ fontWeight: 700 }}>{drawerItem.sutarThickness ? `${drawerItem.sutarThickness} Sutar` : `${drawerItem.thicknessMm || 0} mm`}</span>
                </div>
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
            style={{ maxWidth: "620px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="app-modal-header">
              <div className="app-modal-header-left">
                <div className="app-modal-icon-badge">
                  <Boxes size={22} strokeWidth={2.4} />
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
                <X size={17} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveItem} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="app-modal-body">
                {/* Product / Variety Name */}
                <div className="app-form-group">
                  <label className="app-form-label">
                    Product / Variety Name <span className="app-form-label-required">*</span>
                  </label>
                  <div className="app-input-wrapper">
                    <span className="app-input-icon">
                      <Search size={16} />
                    </span>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                      placeholder="Search product, variety..."
                      className="app-form-input has-icon"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Item Code */}
                <div className="app-form-group">
                  <label className="app-form-label">
                    Item Code <span className="app-form-label-required">*</span>
                  </label>
                  <div className="app-input-wrapper">
                    <span className="app-input-icon font-mono" style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                      #
                    </span>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData(p => ({ ...p, code: e.target.value }))}
                      className="app-form-input has-icon font-mono"
                      placeholder="e.g. MB-8084"
                    />
                  </div>
                </div>

                {/* Category & Sutar Thickness */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      Category Type <span className="app-form-label-required">*</span>
                    </label>
                    <div className="app-input-wrapper">
                      <span className="app-input-icon">
                        <Layers size={16} />
                      </span>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                        className="app-form-select has-icon has-chevron"
                      >
                        <option value="Marble">Marble Slabs & Tiles</option>
                        <option value="Granite">Granite</option>
                        <option value="Porcelain Tiles">Porcelain Tiles</option>
                        <option value="Ceramic Tiles">Ceramic Tiles</option>
                        <option value="Flowers">Flowers (Medallions)</option>
                        <option value="Borders">Borders / Patti</option>
                        <option value="Panels">Panels (Mashallah / 3D)</option>
                      </select>
                      <span className="app-input-chevron">
                        <ChevronDown size={15} />
                      </span>
                    </div>
                  </div>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      Sutar Thickness
                    </label>
                    <div className="app-input-wrapper">
                      <span className="app-input-icon font-mono" style={{ fontSize: "0.85rem" }}>
                        ✎
                      </span>
                      <select
                        value={formData.sutarThickness}
                        onChange={(e) => setFormData(p => ({ ...p, sutarThickness: e.target.value }))}
                        className="app-form-select has-icon has-chevron"
                      >
                        <option value="4">4 Sutar (12×12, 12×24, 6×12, 6×2)</option>
                        <option value="6">6 Sutar (Kitchen & Stairs 3/4")</option>
                        <option value="9">9 Sutar (Heavy Flooring 1.1")</option>
                        <option value="14">14 Sutar (Industrial/Thick)</option>
                        <option value="">Other / Custom</option>
                      </select>
                      <span className="app-input-chevron">
                        <ChevronDown size={15} />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dimensions / Standard Size */}
                <div className="app-form-group">
                  <label className="app-form-label">
                    Dimensions / Standard Size
                  </label>
                  <div className="app-input-wrapper">
                    <span className="app-input-icon font-mono" style={{ fontSize: "0.85rem" }}>
                      ⤢
                    </span>
                    <input
                      type="text"
                      value={formData.standardSize}
                      onChange={(e) => setFormData(p => ({ ...p, standardSize: e.target.value }))}
                      placeholder="e.g. 12 × 12, 12 × 24, 24 × 24"
                      className="app-form-input has-icon"
                    />
                  </div>
                </div>

                {/* Stock Unit & Selling Rate */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      Stock Unit <span className="app-form-label-required">*</span>
                    </label>
                    <div className="app-input-wrapper">
                      <span className="app-input-icon">
                        <Boxes size={16} />
                      </span>
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData(p => ({ ...p, unit: e.target.value }))}
                        className="app-form-select has-icon has-chevron"
                      >
                        <option value="Sq. Ft.">Sq. Ft.</option>
                        <option value="Boxes">Boxes</option>
                        <option value="Pieces">Pieces</option>
                        <option value="Running Feet">Running Feet</option>
                      </select>
                      <span className="app-input-chevron">
                        <ChevronDown size={15} />
                      </span>
                    </div>
                  </div>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      Selling Rate (Rs) <span className="app-form-label-required">*</span>
                    </label>
                    <div className="app-input-wrapper">
                      <span className="app-input-icon font-mono" style={{ fontSize: "0.85rem" }}>
                        ₨
                      </span>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.ratePerSqFt}
                        onChange={(e) => setFormData(p => ({ ...p, ratePerSqFt: e.target.value }))}
                        className="app-form-input has-icon font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Cost Rate & Stock Quantity */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      Cost Rate (Rs) <span className="app-form-label-required">*</span>
                    </label>
                    <div className="app-input-wrapper">
                      <span className="app-input-icon font-mono" style={{ fontSize: "0.85rem" }}>
                        ₨
                      </span>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.costPerSqFt}
                        onChange={(e) => setFormData(p => ({ ...p, costPerSqFt: e.target.value }))}
                        className="app-form-input has-icon font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      Stock Quantity <span className="app-form-label-required">*</span>
                    </label>
                    <div className="app-input-wrapper">
                      <span className="app-input-icon font-mono" style={{ fontSize: "0.85rem" }}>
                        ⛁
                      </span>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.unit === "Boxes" ? formData.stockBoxes : formData.unit === "Pieces" ? formData.stockPieces : formData.stockSqFt}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (formData.unit === "Boxes") setFormData(p => ({ ...p, stockBoxes: val }));
                          else if (formData.unit === "Pieces") setFormData(p => ({ ...p, stockPieces: val }));
                          else setFormData(p => ({ ...p, stockSqFt: val }));
                        }}
                        className="app-form-input has-icon font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Lot / Location & Min Stock Alert */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="app-form-group">
                    <label className="app-form-label">Yard Location / Lot #</label>
                    <div className="app-input-wrapper">
                      <span className="app-input-icon font-mono" style={{ fontSize: "0.85rem" }}>
                        📍
                      </span>
                      <input
                        type="text"
                        value={formData.lotNo}
                        onChange={(e) => setFormData(p => ({ ...p, lotNo: e.target.value }))}
                        placeholder="e.g. Yard Shed 1"
                        className="app-form-input has-icon"
                      />
                    </div>
                  </div>
                  <div className="app-form-group">
                    <label className="app-form-label">Low Stock Alert Threshold</label>
                    <div className="app-input-wrapper">
                      <span className="app-input-icon font-mono" style={{ fontSize: "0.85rem" }}>
                        🔔
                      </span>
                      <input
                        type="number"
                        value={formData.minStockAlert}
                        onChange={(e) => setFormData(p => ({ ...p, minStockAlert: e.target.value }))}
                        className="app-form-input has-icon font-mono"
                        placeholder="100"
                      />
                    </div>
                  </div>
                </div>

                {/* Notice */}
                <div className="app-form-notice">
                  <span style={{ fontSize: "14px" }}>ℹ</span>
                  <span>All fields marked with * are required.</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="app-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="app-btn-cancel"
                >
                  <X size={15} />
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  className="app-btn-submit"
                >
                  <span>{editingItem ? "Update Item" : "Create Item"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
