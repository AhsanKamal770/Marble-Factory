import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Plus, Search, AlertTriangle, Check, X, MoreVertical,
  Layers, Gem, Flower2, Ruler, Grid3X3, Wrench, ChevronRight, ChevronLeft,
  PackagePlus, ChevronDown, Package, MapPin, Tag,
  ArrowUpDown, Edit2, Trash2, SlidersHorizontal, Calendar,
  Eye, CheckCircle2, DollarSign, Boxes, Filter, HelpCircle
} from "lucide-react";
import { db, adjustItemStock, logStockMovement } from "../db/index";
import { useLanguage } from "../context/LanguageContext";
import GlobalPagination from "../components/GlobalPagination";
import { StockCategoryDropdownTrigger, StockCategoryFilterCard } from "../components/StockCategoryFilterCard";
import CategoryManagementModal from "../components/CategoryManagementModal";
import SutarDimensionSelector from "../components/SutarDimensionSelector";
import { getEffectiveCategoryConfig } from "../services/categoryService.js";

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN CONFIGURATION: Hierarchical Marble & Tiles Taxonomy
// ─────────────────────────────────────────────────────────────────────────────
export const ITEM_TAXONOMY = {
  marble: {
    label: "Marble",
    icon: Gem,
    sutars: [
      {
        sutar: "4 Sutar",
        sizes: ["12 × 12", "12 × 24", "6 × 12", "6 × 24"],
        desc: "Standard 4 Sutar cut-to-size tiles"
      },
      {
        sutar: "6 Sutar",
        sizes: ["12 × 12"],
        desc: "6 Sutar (Kitchen & Stairs)"
      },
      {
        sutar: "9 Sutar",
        sizes: ["12 × 12"],
        desc: "9 Sutar standard size"
      },
      {
        sutar: "14 Sutar",
        sizes: ["12 × 12"],
        desc: "14 Sutar standard size"
      }
    ]
  },
  tiles: {
    label: "Tiles",
    icon: Grid3X3,
    sizes: ["12 × 24", "24 × 24", "24 × 48", "16 × 16"],
    unit: "Meters",
    desc: "Per Meter (Rate per Meter)",
    accessories: [
      { name: "Border", desc: "Patti Strip" },
      { name: "Filling", desc: "20kg Grout Bag" },
      { name: "Spacer", desc: "3mm Cross Pack" },
      { name: "Gola", desc: "Per Piece Gola" }
    ]
  },
  flowers: {
    label: "Flowers",
    icon: Flower2,
    sizes: ["12 × 12", "24 × 24", "3 × 3"],
    unit: "Pieces",
    desc: "Mosaic & Handcrafted center flower medallions"
  },
  borders: {
    label: "Borders",
    icon: Ruler,
    standard: ["3 inch", "6 inch"],
    blackBorder: ["2 inch", "3 inch"],
    length: "1 ft",
    unit: "Running Feet",
    desc: "Standard borders & Kali Patti (Length: 1 ft)"
  },
  panels: {
    label: "Panels",
    icon: Layers,
    types: [],
    sizes: ["12 × 24"],
    unit: "Pieces",
    desc: "Decorative entrance and wall panels (12 × 24)"
  },
  tukri: {
    label: "Tukri",
    icon: Gem,
    sizes: ["2 × 2", "3 × 3", "6 × 6"],
    unit: "Sq. Ft.",
    desc: "Decorative cut marble tukri (Sq. Ft. / Pieces)"
  },
  kalm: {
    label: "Kalm",
    icon: Ruler,
    sizes: ["1 inch", "2 inch", "3 inch"],
    unit: "Sq. Ft.",
    desc: "Polished edge marble kalm strip (Sq. Ft. / Pieces)"
  },
  tileAccessories: {
    label: "Tile Accessories",
    icon: Boxes,
    items: ["Gola", "Spacer", "Filling", "Bond"],
    unit: "Pieces",
    desc: "Tile accessories"
  },
  otherAccessories: {
    label: "Other Accessories",
    icon: Boxes,
    items: ["Combod", "Seat", "Bason", "Sink"],
    unit: "Pieces",
    desc: "Other accessories (Pieces)"
  },
  accessories: {
    label: "Accessories",
    icon: Boxes,
    items: ["Gola", "Spacer", "Filling", "Bond", "Tukri", "Kalm", "Combod", "Seat", "Bason", "Sink"],
    unit: "Pieces",
    desc: "Accessories"
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Stock Display & Helper Calculations
// ─────────────────────────────────────────────────────────────────────────────
function getStockDisplay(item) {
  const cat = (item.category || "").toLowerCase();
  const name = (item.name || "").toLowerCase();
  const subCat = (item.subCategory || "").toLowerCase();
  const rawUnit = (item.unit || "").trim();
  const unitLower = rawUnit.toLowerCase();

  if (unitLower === "meters" || unitLower === "meter" || cat === "tiles") {
    return { qty: Number(item.stockSqFt || 0), unit: "Meters", sub: null };
  }
  if (unitLower === "running feet" || unitLower === "r.ft." || unitLower === "r.ft") {
    return { qty: Number(item.stockSqFt || item.stockPieces || 0), unit: "R.Ft.", sub: null };
  }
  if (unitLower === "sq. ft." || unitLower === "sq.ft" || unitLower === "sqft") {
    return { qty: Number(item.stockSqFt || 0), unit: "Sq.Ft", sub: null };
  }

  const isPiece = unitLower === "pieces" || unitLower === "piece" || unitLower === "pcs" ||
    unitLower === "bags" || unitLower === "boxes" ||
    cat.includes("accessories") || subCat.includes("accessories") ||
    cat === "flowers" || cat === "flower" || cat === "panels" ||
    cat === "tukri" || cat === "kalm" ||
    name.includes("gola") || name.includes("spacer") || name.includes("filling") || name.includes("bond") ||
    name.includes("sink") || name.includes("basin") || name.includes("bason") || name.includes("seat") || name.includes("combod");

  if (isPiece) {
    const qty = Number(item.stockPieces !== undefined && item.stockPieces !== null ? item.stockPieces : item.stockSqFt) || 0;
    const displayUnit = unitLower === "bags" ? "Bags" : (unitLower === "boxes" ? "Boxes" : "Pcs");
    return { qty, unit: displayUnit, sub: null };
  }

  return { qty: Number(item.stockSqFt || 0), unit: "Sq.Ft", sub: null };
}

export function getItemDimensionAndSpec(item) {
  const cat = (item.category || "").toLowerCase();
  const name = (item.name || "").toLowerCase();
  const subCat = (item.subCategory || "").toLowerCase();

  if (cat.includes("tukri") || subCat.includes("tukri") || name.includes("tukri")) {
    return {
      main: item.standardSize || "2 × 2",
      sub: ""
    };
  }

  if (cat.includes("kalm") || subCat.includes("kalm") || name.includes("kalm")) {
    return {
      main: item.standardSize || "1 inch",
      sub: ""
    };
  }

  if (cat.includes("other accessories") || subCat.includes("other accessories") ||
      cat.includes("tile accessories") || subCat.includes("tile accessories") ||
      name.includes("sink") || name.includes("basin") || name.includes("bason") ||
      name.includes("seat") || name.includes("combod") || name.includes("commode") ||
      name.includes("gola") || name.includes("spacer") || name.includes("filling") || name.includes("bond") ||
      name.includes("سنک") || name.includes("بیسن") || name.includes("سیٹ") || name.includes("کموڈ") ||
      name.includes("گولہ") || name.includes("اسپیسر") || name.includes("فلنگ") || name.includes("بانڈ")) {
    const cleanSpec = (name.includes("gola") ? "Gola" : (name.includes("spacer") ? "Spacer" : (name.includes("filling") ? "Filling" : (name.includes("bond") ? "Bond" : (name.includes("sink") ? "Sink" : (name.includes("basin") || name.includes("bason") ? "Basin" : (name.includes("combod") || name.includes("commode") ? "Combod" : (name.includes("seat") ? "Seat" : item.standardSize))))))));
    return {
      main: cleanSpec || item.standardSize || "Piece",
      sub: ""
    };
  }

  const isMarble = cat.includes("marble") || (!cat.includes("tile") && !cat.includes("border") && !cat.includes("patti") && !cat.includes("flower") && !cat.includes("panel") && !cat.includes("access"));

  if (isMarble) {
    const sutar = item.sutarThickness ? `${item.sutarThickness} Sutar` : "";
    const sz = item.standardSize ? item.standardSize : (item.length && item.width ? `${item.length} × ${item.width}` : "");
    return {
      main: sutar ? (sz ? `${sutar} (${sz})` : sutar) : (sz || "Standard"),
      sub: item.finish || ""
    };
  }

  // NON-MARBLE (Tiles, Borders, Kali Patti, Flowers, Panels, Accessories):
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

  return {
    main: dim,
    sub: ""
  };
}

function isLowStock(item) {
  const unit = item.unit || "Sq. Ft.";
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
  notes: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Level Cascading "Filter by Item Type" Component (Matching Screenshot)
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
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
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

      {/* Cascading Popover Menus */}
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
          {/* Level 1 Menu: Types */}
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
            {/* All */}
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

            {/* Marble */}
            <div
              onMouseEnter={() => { setActiveL1("Marble"); setActiveL2(null); }}
              onClick={() => { setActiveL1("Marble"); }}
              style={{
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                background: activeL1 === "Marble" ? "#eff6ff" : "transparent",
                color: activeL1 === "Marble" ? "#2563eb" : "var(--text-primary)",
                fontSize: "0.83rem",
                fontWeight: activeL1 === "Marble" ? 700 : 500
              }}
            >
              <span>Marble</span>
              <ChevronRight size={13} style={{ color: "#64748b" }} />
            </div>

            {/* Tiles */}
            <div
              onMouseEnter={() => { setActiveL1("Tiles"); setActiveL2(null); }}
              onClick={() => { setActiveL1("Tiles"); }}
              style={{
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                background: activeL1 === "Tiles" ? "#eff6ff" : "transparent",
                color: activeL1 === "Tiles" ? "#2563eb" : "var(--text-primary)",
                fontSize: "0.83rem",
                fontWeight: activeL1 === "Tiles" ? 700 : 500
              }}
            >
              <span>Tiles</span>
              <ChevronRight size={13} style={{ color: "#64748b" }} />
            </div>

            {/* Flowers */}
            <div
              onMouseEnter={() => { setActiveL1("Flowers"); setActiveL2(null); }}
              onClick={() => { setActiveL1("Flowers"); }}
              style={{
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                background: activeL1 === "Flowers" ? "#eff6ff" : "transparent",
                color: activeL1 === "Flowers" ? "#2563eb" : "var(--text-primary)",
                fontSize: "0.83rem",
                fontWeight: activeL1 === "Flowers" ? 700 : 500
              }}
            >
              <span>Flowers</span>
              <ChevronRight size={13} style={{ color: "#64748b" }} />
            </div>

            {/* Borders */}
            <div
              onMouseEnter={() => { setActiveL1("Borders"); setActiveL2(null); }}
              onClick={() => { setActiveL1("Borders"); }}
              style={{
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                background: activeL1 === "Borders" ? "#eff6ff" : "transparent",
                color: activeL1 === "Borders" ? "#2563eb" : "var(--text-primary)",
                fontSize: "0.83rem",
                fontWeight: activeL1 === "Borders" ? 700 : 500
              }}
            >
              <span>Borders</span>
              <ChevronRight size={13} style={{ color: "#64748b" }} />
            </div>

            {/* Panels */}
            <div
              onMouseEnter={() => { setActiveL1("Panels"); setActiveL2(null); }}
              onClick={() => { setActiveL1("Panels"); }}
              style={{
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                background: activeL1 === "Panels" ? "#eff6ff" : "transparent",
                color: activeL1 === "Panels" ? "#2563eb" : "var(--text-primary)",
                fontSize: "0.83rem",
                fontWeight: activeL1 === "Panels" ? 700 : 500
              }}
            >
              <span>Panels</span>
              <ChevronRight size={13} style={{ color: activeL1 === "Panels" ? "#2563eb" : "#64748b" }} />
            </div>
          </div>

          {/* Level 2 Submenu */}
          {activeL1 === "Marble" && (
            <div
              style={{
                background: "var(--bg-card, #ffffff)",
                border: "1px solid var(--border-color, #cbd5e1)",
                borderRadius: "10px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                padding: "4px 0",
                minWidth: "145px",
                overflow: "hidden"
              }}
            >
              {/* 4 Sutar with Level 3 sizes */}
              <div
                onMouseEnter={() => setActiveL2("4 Sutar")}
                style={{
                  padding: "8px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  background: activeL2 === "4 Sutar" ? "#eff6ff" : "transparent",
                  color: activeL2 === "4 Sutar" ? "#2563eb" : "var(--text-primary)",
                  fontSize: "0.83rem",
                  fontWeight: 600
                }}
              >
                <span>4 Sutar</span>
                <ChevronRight size={13} style={{ color: "#64748b" }} />
              </div>

              {/* 6 Sutar (Kitchen & Stairs) */}
              <button
                type="button"
                onClick={() => selectFilter({ type: "Marble", sutar: "6 Sutar" })}
                onMouseEnter={() => setActiveL2(null)}
                style={{
                  width: "100%",
                  padding: "8px 14px",
                  border: "none",
                  background: "none",
                  textAlign: "left",
                  fontSize: "0.83rem",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontWeight: 500
                }}
              >
                6 Sutar <span style={{ fontSize: "0.72rem", color: "#64748b" }}>(Stairs/Kitchen)</span>
              </button>

              {/* 9 Sutar */}
              <button
                type="button"
                onClick={() => selectFilter({ type: "Marble", sutar: "9 Sutar" })}
                onMouseEnter={() => setActiveL2(null)}
                style={{
                  width: "100%",
                  padding: "8px 14px",
                  border: "none",
                  background: "none",
                  textAlign: "left",
                  fontSize: "0.83rem",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontWeight: 500
                }}
              >
                9 Sutar
              </button>

              {/* 14 Sutar */}
              <button
                type="button"
                onClick={() => selectFilter({ type: "Marble", sutar: "14 Sutar" })}
                onMouseEnter={() => setActiveL2(null)}
                style={{
                  width: "100%",
                  padding: "8px 14px",
                  border: "none",
                  background: "none",
                  textAlign: "left",
                  fontSize: "0.83rem",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontWeight: 500
                }}
              >
                14 Sutar
              </button>

              {/* All Marble */}
              <button
                type="button"
                onClick={() => selectFilter({ type: "Marble" })}
                onMouseEnter={() => setActiveL2(null)}
                style={{
                  width: "100%",
                  padding: "8px 14px",
                  borderTop: "1px solid #f1f5f9",
                  background: "none",
                  textAlign: "left",
                  fontSize: "0.8rem",
                  color: "#2563eb",
                  cursor: "pointer",
                  fontWeight: 700
                }}
              >
                All Marble
              </button>
            </div>
          )}

          {/* Level 3 Submenu for Marble 4 Sutar */}
          {activeL1 === "Marble" && activeL2 === "4 Sutar" && (
            <div
              style={{
                background: "var(--bg-card, #ffffff)",
                border: "1px solid var(--border-color, #cbd5e1)",
                borderRadius: "10px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                padding: "4px 0",
                minWidth: "140px",
                overflow: "hidden"
              }}
            >
              {(ITEM_TAXONOMY.marble?.sutars?.[0]?.sizes || []).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => selectFilter({ type: "Marble", sutar: "4 Sutar", size: sz })}
                  style={{
                    width: "100%",
                    padding: "8px 14px",
                    border: "none",
                    background: "none",
                    textAlign: "left",
                    fontSize: "0.83rem",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    fontWeight: 500,
                    whiteSpace: "nowrap"
                  }}
                >
                  {sz}
                </button>
              ))}
              <button
                type="button"
                onClick={() => selectFilter({ type: "Marble", sutar: "4 Sutar" })}
                style={{
                  width: "100%",
                  padding: "8px 14px",
                  borderTop: "1px solid #f1f5f9",
                  background: "none",
                  textAlign: "left",
                  fontSize: "0.78rem",
                  color: "#2563eb",
                  cursor: "pointer",
                  fontWeight: 700,
                  whiteSpace: "nowrap"
                }}
              >
                All 4 Sutar
              </button>
            </div>
          )}

          {/* Level 2 Submenu for Tiles */}
          {activeL1 === "Tiles" && (
            <div
              style={{
                background: "var(--bg-card, #ffffff)",
                border: "1px solid var(--border-color, #cbd5e1)",
                borderRadius: "10px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                padding: "4px 0",
                minWidth: "160px",
                overflow: "hidden"
              }}
            >
              <div style={{ padding: "4px 12px", fontSize: "0.68rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Tile Sizes</div>
              {(ITEM_TAXONOMY.tiles?.sizes || []).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => selectFilter({ type: "Tiles", size: sz })}
                  style={{
                    width: "100%",
                    padding: "6px 14px",
                    border: "none",
                    background: "none",
                    textAlign: "left",
                    fontSize: "0.83rem",
                    color: "var(--text-primary)",
                    cursor: "pointer"
                  }}
                >
                  {sz}
                </button>
              ))}

              <div style={{ borderTop: "1px solid #f1f5f9", margin: "4px 0" }} />
              <div style={{ padding: "4px 12px", fontSize: "0.68rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Other Tile Items</div>
              {(ITEM_TAXONOMY.tiles?.accessories || []).map((acc) => {
                const name = typeof acc === 'string' ? acc : acc.name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => selectFilter({ type: "Tiles", sub: name })}
                    style={{
                      width: "100%",
                      padding: "6px 14px",
                      border: "none",
                      background: "none",
                      textAlign: "left",
                      fontSize: "0.83rem",
                      color: "var(--text-primary)",
                      cursor: "pointer"
                    }}
                  >
                    {name}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => selectFilter({ type: "Tiles", sub: "Mashallah / Islamic Panels" })}
                style={{
                  width: "100%",
                  padding: "6px 14px",
                  border: "none",
                  background: "none",
                  textAlign: "left",
                  fontSize: "0.83rem",
                  color: "#d97706",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Mashallah Panels
              </button>

              <button
                type="button"
                onClick={() => selectFilter({ type: "Tiles" })}
                style={{
                  width: "100%",
                  padding: "8px 14px",
                  borderTop: "1px solid #f1f5f9",
                  background: "none",
                  textAlign: "left",
                  fontSize: "0.78rem",
                  color: "#2563eb",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                All Tiles
              </button>
            </div>
          )}

          {/* Level 2 Submenu for Flowers */}
          {activeL1 === "Flowers" && (
            <div
              style={{
                background: "var(--bg-card, #ffffff)",
                border: "1px solid var(--border-color, #cbd5e1)",
                borderRadius: "10px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                padding: "4px 0",
                minWidth: "125px",
                overflow: "hidden"
              }}
            >
              {(ITEM_TAXONOMY.flowers?.sizes || []).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => selectFilter({ type: "Flowers", size: sz })}
                  style={{
                    width: "100%",
                    padding: "8px 14px",
                    border: "none",
                    background: "none",
                    textAlign: "left",
                    fontSize: "0.83rem",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    fontWeight: 500
                  }}
                >
                  {sz}
                </button>
              ))}
              <button
                type="button"
                onClick={() => selectFilter({ type: "Flowers" })}
                style={{
                  width: "100%",
                  padding: "8px 14px",
                  borderTop: "1px solid #f1f5f9",
                  background: "none",
                  textAlign: "left",
                  fontSize: "0.78rem",
                  color: "#2563eb",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                All Flowers
              </button>
            </div>
          )}

          {/* Level 2 Submenu for Borders */}
          {activeL1 === "Borders" && (
            <div
              style={{
                background: "var(--bg-card, #ffffff)",
                border: "1px solid var(--border-color, #cbd5e1)",
                borderRadius: "10px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                padding: "4px 0",
                minWidth: "160px",
                overflow: "hidden"
              }}
            >
              <div style={{ padding: "4px 12px", fontSize: "0.68rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Standard Border</div>
              {(ITEM_TAXONOMY.borders?.standard || []).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => selectFilter({ type: "Borders", sub: `Standard ${sz}` })}
                  style={{
                    width: "100%",
                    padding: "6px 14px",
                    border: "none",
                    background: "none",
                    textAlign: "left",
                    fontSize: "0.83rem",
                    color: "var(--text-primary)",
                    cursor: "pointer"
                  }}
                >
                  {sz}
                </button>
              ))}

              <div style={{ borderTop: "1px solid #f1f5f9", margin: "4px 0" }} />
              <div style={{ padding: "4px 12px", fontSize: "0.68rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Black Border (Kali Patti)</div>
              {(ITEM_TAXONOMY.borders?.blackBorder || []).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => selectFilter({ type: "Borders", sub: `Kali Patti ${sz}` })}
                  style={{
                    width: "100%",
                    padding: "6px 14px",
                    border: "none",
                    background: "none",
                    textAlign: "left",
                    fontSize: "0.83rem",
                    color: "var(--text-primary)",
                    cursor: "pointer"
                  }}
                >
                  {sz}
                </button>
              ))}

              <button
                type="button"
                onClick={() => selectFilter({ type: "Borders" })}
                style={{
                  width: "100%",
                  padding: "8px 14px",
                  borderTop: "1px solid #f1f5f9",
                  background: "none",
                  textAlign: "left",
                  fontSize: "0.78rem",
                  color: "#2563eb",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                All Borders
              </button>
            </div>
          )}

          {/* Level 2 Submenu for Panels */}
          {activeL1 === "Panels" && (
            <div
              style={{
                background: "var(--bg-card, #ffffff)",
                border: "1px solid var(--border-color, #cbd5e1)",
                borderRadius: "10px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                padding: "4px 0",
                minWidth: "175px",
                overflow: "hidden"
              }}
            >
              <button
                type="button"
                onClick={() => selectFilter({ type: "Panels" })}
                style={{
                  width: "100%",
                  padding: "7px 12px",
                  border: "none",
                  background: "none",
                  textAlign: "left",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "#2563eb",
                  cursor: "pointer"
                }}
              >
                All Panels
              </button>
              <button
                type="button"
                onClick={() => selectFilter({ type: "Panels", size: "12 × 24" })}
                style={{
                  width: "100%",
                  padding: "6px 14px",
                  border: "none",
                  background: "none",
                  textAlign: "left",
                  fontSize: "0.83rem",
                  cursor: "pointer",
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap"
                }}
              >
                12 × 24
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Item Details Drawer (View Item on Eye click)
// ─────────────────────────────────────────────────────────────────────────────
function ItemDetailsDrawer({ item, onClose, onEdit, onAdjust }) {
  if (!item) return null;
  const sd = getStockDisplay(item);
  const low = isLowStock(item);
  const out = isOutOfStock(item);
  const stockStatus = out ? "Out of Stock" : low ? "Low Stock" : "In Stock";
  const stockColor = out ? "#ef4444" : low ? "#f59e0b" : "#10b981";

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 998,
          background: "rgba(15, 23, 42, 0.5)",
          backdropFilter: "blur(4px)"
        }}
      />
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 999,
          width: "min(420px, 95vw)",
          background: "var(--bg-card, #ffffff)",
          borderLeft: "1px solid var(--border-color, #cbd5e1)",
          boxShadow: "-16px 0 48px rgba(0,0,0,0.15)",
          display: "flex", flexDirection: "column"
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color, #e2e8f0)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span style={{ fontSize: "0.72rem", color: "#2563eb", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
              {item.code}
            </span>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary, #0f172a)", margin: "4px 0 0 0" }}>
              {item.name}
            </h2>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "2px" }}>
              {item.category} • {item.subCategory || item.standardSize || "Standard"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Stock Card */}
          <div style={{ background: "var(--bg-primary, #f8fafc)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color, #e2e8f0)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Current Stock</div>
                <div style={{ fontSize: "1.7rem", fontWeight: 900, color: "var(--text-primary, #0f172a)", fontFamily: "var(--font-mono)" }}>
                  {sd.qty.toLocaleString()} <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#64748b" }}>{sd.unit}</span>
                </div>
                {sd.sub && <div style={{ fontSize: "0.76rem", color: "#64748b" }}>{sd.sub}</div>}
              </div>
              <span className={`status-pill-badge ${out ? "due" : low ? "partial" : "cleared"}`}>
                {stockStatus}
              </span>
            </div>
          </div>

          {/* Pricing & Value */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            <div style={{ background: "var(--bg-primary, #f8fafc)", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color, #e2e8f0)" }}>
              <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700 }}>Cost Rate</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#475569", fontFamily: "var(--font-mono)" }}>
                Rs. {Number(item.costPerSqFt || 0).toLocaleString()}
              </div>
            </div>
            <div style={{ background: "var(--bg-primary, #f8fafc)", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color, #e2e8f0)" }}>
              <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700 }}>Sale Rate</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#2563eb", fontFamily: "var(--font-mono)" }}>
                Rs. {Number(item.ratePerSqFt || 0).toLocaleString()}
              </div>
            </div>
            <div style={{ background: "var(--bg-primary, #f8fafc)", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-color, #e2e8f0)" }}>
              <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700 }}>Total Value</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#059669", fontFamily: "var(--font-mono)" }}>
                Rs. {(sd.qty * Number(item.ratePerSqFt || 0)).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.84rem" }}>
            {item.category === "Marble" ? (
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                <span style={{ color: "#64748b" }}>Sutar Thickness:</span>
                <span style={{ fontWeight: 700 }}>{item.sutarThickness ? `${item.sutarThickness} Sutar` : "—"}</span>
              </div>
            ) : null}
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
              <span style={{ color: "#64748b" }}>Standard Size / Dimension:</span>
              <span style={{ fontWeight: 700 }}>{item.standardSize || (item.length && item.width ? `${item.length} × ${item.width}` : "—")}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
              <span style={{ color: "#64748b" }}>Finish / Grade:</span>
              <span style={{ fontWeight: 700 }}>{item.finish || "Polished"} • {item.grade || "Grade A"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
              <span style={{ color: "#64748b" }}>Storage Location:</span>
              <span style={{ fontWeight: 700 }}>{item.location || "Yard"}</span>
            </div>
          </div>

          {item.notes && (
            <div style={{ background: "#eff6ff", padding: "10px 14px", borderRadius: "8px", fontSize: "0.8rem", color: "#1e40af" }}>
              {item.notes}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-color, #e2e8f0)", display: "flex", gap: "8px" }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: "0.84rem" }}
            onClick={() => { onClose(); onAdjust(item); }}
          >
            Adjust Stock
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1, fontSize: "0.84rem", background: "#2563eb" }}
            onClick={() => { onClose(); onEdit(item); }}
          >
            Edit Item
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main StockManagementView Component
// ─────────────────────────────────────────────────────────────────────────────
export default function StockManagementView() {
  const { language } = useLanguage();
  const rawItems = useLiveQuery(() => db.items.toArray(), []) || [];

  // Sort items by code/name
  const items = useMemo(() => {
    return [...rawItems].sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  }, [rawItems]);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("ALL");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState({ type: "ALL" });
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | IN_STOCK | LOW_STOCK | OUT_STOCK

  // Selection & Pagination
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals & Drawer
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustType, setAdjustType] = useState("Adjustment");
  const [adjustNote, setAdjustNote] = useState("");
  const [drawerItem, setDrawerItem] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const customCategories = useLiveQuery(() => {
    if (!db.categories) return [];
    return db.categories.toArray();
  }, []) || [];

  const allCategories = useMemo(() => {
    const defaultCats = [
      "Marble",
      "Tiles",
      "Tile Accessories",
      "Tukri",
      "Kalm",
      "Other Accessories",
      "Flowers",
      "Borders",
      "Kali Patti",
      "Panels"
    ];
    const activeCustom = customCategories
      .filter(c => c.isActive !== false)
      .map(c => c.name);
    const fromItems = items.map(i => i.category).filter(c => c && c !== "Tukri" && c !== "Kalm" && c !== "Accessories" && c !== "Marble Accessories");
    return Array.from(new Set([...defaultCats, ...activeCustom, ...fromItems]));
  }, [items, customCategories]);

  // ───────────────────────────────────────────────────────────────────────────
  // Filter Logic
  // ───────────────────────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const m = (item.name || "").toLowerCase().includes(q) ||
          (item.code || "").toLowerCase().includes(q) ||
          (item.category || "").toLowerCase().includes(q) ||
          (item.subCategory || "").toLowerCase().includes(q) ||
          (item.standardSize || "").toLowerCase().includes(q);
        if (!m) return false;
      }

      // 2. Date Range Filter
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

      // 3. Status filter
      if (statusFilter === "IN_STOCK" && (isOutOfStock(item) || isLowStock(item))) return false;
      if (statusFilter === "LOW_STOCK" && !isLowStock(item)) return false;
      if (statusFilter === "OUT_STOCK" && !isOutOfStock(item)) return false;

      // 4. Enhanced Cascading Item Type Filter (Marble -> Sutar -> Size)
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
            if (!sub.includes(cleanSub) && !cat.includes(cleanSub) && !name.includes(cleanSub)) return false;
          }
        } else if (itemTypeFilter.type === "Flowers") {
          const isFlower = cat.includes("flower") || sub.includes("flower") || name.includes("flower") || name.includes("phool") || name.includes("medallion");
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

          if (itemTypeFilter.size) {
            const cleanSz = itemTypeFilter.size.replace(/\s+/g, "").toLowerCase().replace(/×/g, "x");
            const cleanItemSz = (sz + " " + sub + " " + name).replace(/\s+/g, "").toLowerCase().replace(/×/g, "x");
            if (!cleanItemSz.includes(cleanSz)) return false;
          }
          if (itemTypeFilter.sub) {
            const cleanSub = itemTypeFilter.sub.toLowerCase();
            if (!sub.includes(cleanSub) && !name.includes(cleanSub)) return false;
          }
        } else if (itemTypeFilter.type === "Tile Accessories") {
          const isTileAcc = cat.includes("tile accessories") || sub.includes("tile accessories") ||
            ((cat.includes("tile") || cat.includes("accessories")) && (name.includes("gola") || name.includes("spacer") || name.includes("filling") || name.includes("bond"))) ||
            name.includes("gola") || name.includes("spacer") || name.includes("filling") || name.includes("bond") ||
            sub.includes("gola") || sub.includes("spacer") || sub.includes("filling") || sub.includes("bond");
          if (!isTileAcc) return false;

          if (itemTypeFilter.sub) {
            const cleanSub = itemTypeFilter.sub.toLowerCase();
            if (!name.includes(cleanSub) && !sub.includes(cleanSub)) return false;
          }
        } else if (itemTypeFilter.type === "Other Accessories") {
          const isOtherAcc = cat.includes("other accessories") || sub.includes("other accessories") ||
            name.includes("combod") || name.includes("commode") || sub.includes("combod") || sub.includes("commode") ||
            name.includes("seat") || sub.includes("seat") ||
            name.includes("bason") || name.includes("basin") || sub.includes("bason") || sub.includes("basin") ||
            name.includes("sink") || sub.includes("sink");
          if (!isOtherAcc) return false;

          if (itemTypeFilter.sub) {
            const cleanSub = itemTypeFilter.sub.toLowerCase();
            if (!name.includes(cleanSub) && !sub.includes(cleanSub)) return false;
          }
        } else if (itemTypeFilter.type === "Tukri") {
          const isTukri = name.includes("tukri") || cat.includes("tukri") || sub.includes("tukri") || name.includes("tk-");
          if (!isTukri) return false;

          if (itemTypeFilter.size) {
            const cleanSz = itemTypeFilter.size.replace(/\s+/g, "").toLowerCase().replace(/×/g, "x");
            const cleanItemSz = (sz + " " + sub + " " + name).replace(/\s+/g, "").toLowerCase().replace(/×/g, "x");
            if (!cleanItemSz.includes(cleanSz)) return false;
          }
        } else if (itemTypeFilter.type === "Kalm") {
          const isKalm = name.includes("kalm") || cat.includes("kalm") || sub.includes("kalm") || name.includes("kl-");
          if (!isKalm) return false;

          if (itemTypeFilter.size) {
            const cleanSz = itemTypeFilter.size.replace(/\s+/g, "").toLowerCase();
            const cleanItemSz = (sz + " " + sub + " " + name).replace(/\s+/g, "").toLowerCase();
            if (!cleanItemSz.includes(cleanSz)) return false;
          }
        } else if (itemTypeFilter.type === "Accessories") {
          const isAcc = cat.includes("accessories") || sub.includes("accessories") ||
            name.includes("spacer") || name.includes("filling") || name.includes("gola") || name.includes("bond") ||
            name.includes("sink") || name.includes("basin") || name.includes("bason") || name.includes("seat") || name.includes("combod") || name.includes("commode") ||
            name.includes("tukri") || name.includes("kalm");
          if (!isAcc) return false;
        } else if (itemTypeFilter.type && itemTypeFilter.type !== "ALL") {
          if (cat !== itemTypeFilter.type.toLowerCase()) return false;
        }
      }

      return true;
    });
  }, [items, searchTerm, dateRange, customStartDate, customEndDate, statusFilter, itemTypeFilter]);

  // ───────────────────────────────────────────────────────────────────────────
  // KPI Calculations (Live Multi-Unit Breakdown)
  // ───────────────────────────────────────────────────────────────────────────
  const stockSummary = useMemo(() => {
    let marbleSqFt = 0;
    let tilesMeters = 0;
    let runningFeet = 0;
    let accessoriesPieces = 0;
    let totalValuation = 0;
    let lowStockCount = 0;

    items.forEach(item => {
      const cat = (item.category || '').toLowerCase();
      const sub = (item.subCategory || '').toLowerCase();
      const name = (item.name || '').toLowerCase();
      const unit = (item.unit || '').trim().toLowerCase();

      const isTiles = unit === 'meters' || unit === 'meter' || (!unit && cat.includes('tile') && !cat.includes('accessories') && !name.includes('gola') && !name.includes('spacer') && !name.includes('filling') && !name.includes('bond'));
      const isRFt = unit.includes('r.ft') || unit.includes('running') || (!unit && (cat.includes('border') || cat.includes('kali patti') || name.includes('border') || name.includes('patti')) && !cat.includes('tile') && !name.includes('tile'));
      const isSqFtExplicit = unit === 'sq. ft.' || unit === 'sq.ft' || unit === 'sqft';
      const isAccessory = !isSqFtExplicit && !isTiles && !isRFt && (
        unit === 'piece' || unit === 'pieces' || unit === 'pcs' || unit === 'bags' || unit === 'boxes' ||
        cat.includes('accessories') || sub.includes('accessories') ||
        cat.includes('flower') || cat.includes('panel') || cat.includes('tukri') || cat.includes('kalm') ||
        name.includes('gola') || name.includes('spacer') || name.includes('filling') || name.includes('bond') ||
        name.includes('sink') || name.includes('basin') || name.includes('seat') || name.includes('combod')
      );

      const rate = Number(item.ratePerSqFt || 0);

      if (isTiles) {
        const meters = Number(item.stockSqFt || 0);
        tilesMeters += meters;
        totalValuation += meters * rate;
      } else if (isRFt) {
        const rft = Number(item.stockSqFt || item.stockPieces || 0);
        runningFeet += rft;
        totalValuation += rft * rate;
      } else if (isAccessory) {
        const pcs = Number(item.stockPieces !== undefined && item.stockPieces !== null ? item.stockPieces : item.stockSqFt) || 0;
        accessoriesPieces += pcs;
        totalValuation += pcs * rate;
      } else {
        const sqft = Number(item.stockSqFt || 0);
        marbleSqFt += sqft;
        totalValuation += sqft * rate;
      }

      if (isLowStock(item) || isOutOfStock(item)) {
        lowStockCount++;
      }
    });

    return {
      marbleSqFt: Math.round(marbleSqFt * 10) / 10,
      runningFeet: Math.round(runningFeet * 10) / 10,
      tilesMeters: Math.round(tilesMeters * 10) / 10,
      accessoriesPieces: Math.round(accessoriesPieces),
      totalValuation: Math.round(totalValuation),
      lowStockCount,
      totalVarieties: items.length
    };
  }, [items]);

  // Pagination
  const totalRecords = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedItems = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, activePage, pageSize]);

  // Selection
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

  // Action Handlers
  const handleOpenAddModal = (categoryArg = 'Marble') => {
    const cat = (typeof categoryArg === 'string' && categoryArg) ? categoryArg : 'Marble';
    setEditingItem(null);
    const eff = getEffectiveCategoryConfig(cat, customCategories);

    let defaultUnit = eff.normUnit;
    let defaultSutar = eff.hasSutar ? "4" : "";
    let defaultSize = "Standard";
    let defaultLen = 1;
    let defaultWid = 1;
    let defaultCodePrefix = eff.codePrefix || cat.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || "IT";

    if (cat === "Marble") {
      defaultUnit = "Sq. Ft.";
      defaultSutar = "4";
      defaultSize = "12 × 12";
      defaultLen = 1;
      defaultWid = 1;
      defaultCodePrefix = "MB";
    } else if (cat === "Tiles") {
      defaultUnit = "Meters";
      defaultSutar = "";
      defaultSize = "12 × 24";
      defaultLen = 2;
      defaultWid = 1;
      defaultCodePrefix = "TL";
    } else if (cat === "Flowers") {
      defaultUnit = "Pieces";
      defaultSutar = "";
      defaultSize = "12 × 12";
      defaultLen = 1;
      defaultWid = 1;
      defaultCodePrefix = "FL";
    } else if (cat === "Borders") {
      defaultUnit = "Running Feet";
      defaultSutar = "";
      defaultSize = "3 inch";
      defaultLen = 1;
      defaultWid = 0.25;
      defaultCodePrefix = "BR";
    } else if (cat === "Kali Patti") {
      defaultUnit = "Running Feet";
      defaultSutar = "";
      defaultSize = "2 inch";
      defaultLen = 1;
      defaultWid = 0.1667;
      defaultCodePrefix = "KP";
    } else if (cat === "Panels") {
      defaultUnit = "Pieces";
      defaultSutar = "";
      defaultSize = "12 × 24";
      defaultLen = 2;
      defaultWid = 1;
      defaultCodePrefix = "PN";
    } else if (cat === "Tukri") {
      defaultUnit = "Pieces";
      defaultSutar = "";
      defaultSize = "2 × 2";
      defaultLen = 1;
      defaultWid = 1;
      defaultCodePrefix = "TK";
    } else if (cat === "Kalm") {
      defaultUnit = "Pieces";
      defaultSutar = "";
      defaultSize = "1 inch";
      defaultLen = 1;
      defaultWid = 1;
      defaultCodePrefix = "KL";
    } else if (cat === "Tile Accessories") {
      defaultUnit = "Pieces";
      defaultSutar = "";
      defaultSize = "Gola";
      defaultLen = 1;
      defaultWid = 1;
      defaultCodePrefix = "TA";
    } else if (cat === "Other Accessories" || cat === "Accessories") {
      defaultUnit = "Pieces";
      defaultSutar = "";
      defaultSize = "Combod";
      defaultLen = 1;
      defaultWid = 1;
      defaultCodePrefix = "OA";
    } else if (cat === "Granite") {
      defaultUnit = "Sq. Ft.";
      defaultSutar = "4";
      defaultSize = "Kitchen Slab (8×2)";
      defaultLen = 8;
      defaultWid = 2;
      defaultCodePrefix = "GR";
    } else {
      if (eff.method === 'Length Only' || defaultUnit === 'Running Feet') {
        defaultLen = 1;
        defaultWid = 0.25;
        defaultSize = 'Standard';
      } else if (eff.method === 'Fixed Quantity' || ['Pieces', 'Bags', 'Boxes'].includes(defaultUnit)) {
        defaultLen = 0;
        defaultWid = 0;
        defaultSize = 'Standard';
      } else {
        defaultLen = 1;
        defaultWid = 1;
        defaultSize = 'Standard';
      }
    }

    setFormData({
      ...INITIAL_FORM,
      category: cat,
      sutarThickness: defaultSutar,
      standardSize: defaultSize,
      length: defaultLen,
      width: defaultWid,
      unit: defaultUnit,
      code: `${defaultCodePrefix}-${Date.now().toString().slice(-4)}`,
      lotNo: `LOT-${new Date().getFullYear()}`
    });
    setIsModalOpen(true);
  };

  const handleCategoryChange = (catArg) => {
    const newCat = (typeof catArg === 'string' && catArg) ? catArg : 'Marble';
    const eff = getEffectiveCategoryConfig(newCat, customCategories);

    let defaultUnit = eff.normUnit;
    let defaultSutar = eff.hasSutar ? "4" : "";
    let defaultSize = "Standard";
    let defaultLen = 1;
    let defaultWid = 1;
    let defaultCodePrefix = eff.codePrefix || newCat.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || "IT";

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
    } else if (newCat === "Tukri") {
      defaultUnit = "Pieces";
      defaultSutar = "";
      defaultSize = "2 × 2";
      defaultLen = 1;
      defaultWid = 1;
      defaultCodePrefix = "TK";
    } else if (newCat === "Kalm") {
      defaultUnit = "Pieces";
      defaultSutar = "";
      defaultSize = "1 inch";
      defaultLen = 1;
      defaultWid = 1;
      defaultCodePrefix = "KL";
    } else if (newCat === "Tile Accessories") {
      defaultUnit = "Pieces";
      defaultSutar = "";
      defaultSize = "Gola";
      defaultLen = 1;
      defaultWid = 1;
      defaultCodePrefix = "TA";
    } else if (newCat === "Other Accessories" || newCat === "Accessories") {
      defaultUnit = "Pieces";
      defaultSutar = "";
      defaultSize = "Combod";
      defaultLen = 1;
      defaultWid = 1;
      defaultCodePrefix = "OA";
    } else if (newCat === "Granite") {
      defaultUnit = "Sq. Ft.";
      defaultSutar = "4";
      defaultSize = "Kitchen Slab (8×2)";
      defaultLen = 8;
      defaultWid = 2;
      defaultCodePrefix = "GR";
    } else {
      if (eff.method === 'Length Only' || defaultUnit === 'Running Feet') {
        defaultLen = 1;
        defaultWid = 0.25;
        defaultSize = 'Standard';
      } else if (eff.method === 'Fixed Quantity' || ['Pieces', 'Bags', 'Boxes'].includes(defaultUnit)) {
        defaultLen = 0;
        defaultWid = 0;
        defaultSize = 'Standard';
      } else {
        defaultLen = 1;
        defaultWid = 1;
        defaultSize = 'Standard';
      }
    }

    setFormData(prev => ({
      ...prev,
      category: newCat,
      sutarThickness: defaultSutar,
      standardSize: defaultSize,
      length: defaultLen,
      width: defaultWid,
      unit: defaultUnit,
      stockSqFt: 0,
      stockPieces: 0,
      stockBoxes: 0,
      code: `${defaultCodePrefix}-${Date.now().toString().slice(-4)}`
    }));
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    const isMarble = item.category === 'Marble' || item.category === 'Granite';
    const sutar = item.sutarThickness || (isMarble ? '4' : '');
    const isCustom = Boolean(sutar && !['4', '6', '9', '14'].includes(String(sutar)));
    setFormData({
      ...INITIAL_FORM,
      ...item,
      sutarThickness: sutar,
      isCustomSutar: isCustom,
      unit: item.unit || (item.category === 'Tiles' ? 'Meters' : (item.category === 'Borders' || item.category === 'Kali Patti' ? 'Running Feet' : 'Sq. Ft.'))
    });
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      const eff = getEffectiveCategoryConfig(formData.category, customCategories);
      const isTiles = formData.category === "Tiles" || formData.unit === "Meters";
      const hasSutar = eff.hasSutar;
      const isFixedQty = eff.method === "Fixed Quantity" || ['Pieces', 'Bags', 'Boxes'].includes(formData.unit) || ["Tile Accessories", "Other Accessories", "Flowers", "Panels", "Accessories"].includes(formData.category);
      const isLengthOnly = eff.method === "Length Only" || formData.unit === "Running Feet" || formData.category === "Borders" || formData.category === "Kali Patti";

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
      const stockPieces = isFixedQty ? (parseFloat(formData.stockPieces) || parseFloat(formData.stockSqFt) || 0) : (parseInt(formData.stockPieces) || 0);
      const stockSqFt = isFixedQty ? stockPieces : (parseFloat(formData.stockSqFt) || 0);
      const stockBoxes = isFixedQty && formData.unit === 'Boxes' ? stockPieces : (parseInt(formData.stockBoxes) || 0);

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
        sutarThickness: hasSutar ? (formData.sutarThickness || "4") : "",
        length: isFixedQty ? 0 : (parseFloat(formData.length) || (isLengthOnly ? 1 : 1)),
        width: isFixedQty ? 0 : (parseFloat(formData.width) || (isLengthOnly ? 0.25 : 1)),
        ratePerSqFt,
        costPerSqFt,
        stockSqFt,
        stockBoxes,
        stockPieces,
        unit: formData.unit || eff.normUnit || "Sq. Ft.",
        minStockAlert: parseFloat(formData.minStockAlert) || 0,
        thicknessMm: hasSutar ? (parseFloat(formData.thicknessMm) || 12) : 0,
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

  const handleOpenAdjust = (item) => {
    setAdjustingItem(item);
    setAdjustQty("");
    setAdjustNote("");
    setAdjustType("Adjustment");
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustingItem || !adjustQty) return;
    const delta = parseFloat(adjustQty);
    const unit = adjustingItem.unit || (adjustingItem.category === "Tiles" ? "Meters" : "Sq. Ft.");
    const isTiles = adjustingItem.category === "Tiles" || unit === "Meters" || unit === "Meter";
    const deltaSqFt = (unit === "Sq. Ft." || unit === "Running Feet" || isTiles) ? delta : 0;
    const deltaBoxes = (unit === "Boxes" || unit === "Box") ? delta : 0;
    const deltaPieces = (unit === "Pieces" || unit === "Piece" || unit === "Pcs") ? delta : 0;
    try {
      await adjustItemStock(
        adjustingItem.id,
        deltaSqFt,
        deltaBoxes,
        deltaPieces,
        adjustType,
        "MANUAL-ADJUST",
        adjustNote || "Manual stock update"
      );
      setIsAdjustModalOpen(false);
    } catch (err) {
      alert("Error updating stock: " + err.message);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "1440px", margin: "0 auto", paddingBottom: "30px" }}>

      {/* ------------------------------------------------------------------------- */}
      {/* 1. SEAMLESS HERO HEADER (Consistent with Dashboard & Invoices)            */}
      {/* ------------------------------------------------------------------------- */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 4px 10px 4px',
        minHeight: '84px',
        overflow: 'hidden'
      }}>
        {/* Left: Category Breadcrumb + Title + Subtitle */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#2563eb',
            marginBottom: '4px',
            display: 'inline-block'
          }}>
            {language === 'ur' ? 'اسٹاک اور انوینٹری' : 'Inventory & Yard Stock'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
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
            }}>
              <Boxes size={24} />
            </div>

            <div>
              <h1 style={{
                fontSize: '1.7rem',
                fontWeight: 800,
                color: 'var(--text-primary, #0f172a)',
                margin: 0,
                letterSpacing: '-0.02em',
                lineHeight: 1.2
              }}>
                Marble & Tiles Stock <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-secondary, #64748b)', fontFamily: 'var(--font-urdu)' }}>(ماربل اور ٹائلز اسٹاک)</span>
              </h1>
              <p style={{
                fontSize: '0.86rem',
                color: 'var(--text-secondary, #64748b)',
                margin: '2px 0 0 0',
                fontWeight: 500
              }}>
                {language === 'ur' ? 'ماربل سوتار سائز، ٹائلز، فلاور میڈیلینز اور پٹی کا مکمل انوینٹری ریکارڈ' : 'Manage real-time yard inventory, Sutar sizes, flower medallions, borders & tiles'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsCategoryModalOpen(true)}
            style={{
              background: '#f8fafc',
              borderColor: '#cbd5e1',
              fontWeight: 700,
              fontSize: '0.86rem',
              padding: '10px 16px',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#1e293b',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)'
            }}
          >
            <Layers size={16} color="#2563eb" />
            <span>+ New Category</span>
          </button>

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

        {/* Right: Background Marble Image extending seamlessly across the header */}
        <div style={{
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
        }} />
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 2. TOP 4 KPI CARDS (Real-Time Live Multi-Unit Metric Cards)                */}
      {/* ------------------------------------------------------------------------- */}
      <div className="kpi-card-grid">
        {/* Card 1: Marble Stock */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon blue">
            <Gem size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Marble Stock</span>
              <span className="kpi-metric-label-ur">(ماربل اسٹاک)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ color: '#2563eb' }}>
              {stockSummary.marbleSqFt.toLocaleString()} <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Sq.Ft</span>
              {stockSummary.runningFeet > 0 && (
                <div style={{ fontSize: "0.70rem", fontWeight: 700, color: "#d97706", marginTop: "2px" }}>
                  • {stockSummary.runningFeet.toLocaleString()} R.ft. Borders
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Tiles Stock */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon green">
            <Grid3X3 size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Tiles Stock</span>
              <span className="kpi-metric-label-ur">(ٹائلز اسٹاک)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ color: '#059669' }}>
              {stockSummary.tilesMeters.toLocaleString()} <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Meters</span>
            </div>
          </div>
        </div>

        {/* Card 3: Accessories & Pieces */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon orange" style={{ background: '#ea580c' }}>
            <Boxes size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Accessories</span>
              <span className="kpi-metric-label-ur">(ایکسیسریز و دیگر)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ color: '#ea580c' }}>
              {stockSummary.accessoriesPieces.toLocaleString()} <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Pieces</span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Stock Valuation */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon indigo">
            <DollarSign size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Stock Valuation</span>
              <span className="kpi-metric-label-ur">(کل اسٹاک مالیت)</span>
            </div>
            <div className="kpi-metric-value font-mono">
              Rs. {stockSummary.totalValuation.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 3. FILTER & CONTROL BAR (Matches User Screenshot)                          */}
      {/* ------------------------------------------------------------------------- */}
      <div
        style={{
          background: "var(--bg-card, #ffffff)",
          borderRadius: "14px",
          padding: "12px 16px",
          border: "1px solid var(--border-color, #e2e8f0)",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        {/* Left Side: Search + Date Range + Cascading Category Filter + Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1 }}>
          {/* Search Input */}
          <div style={{ position: "relative", minWidth: "260px", flex: "1 1 260px" }}>
            <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search stock items, codes..."
              style={{
                width: "100%",
                padding: "10px 14px 10px 38px",
                borderRadius: "10px",
                border: "1px solid var(--border-color, #cbd5e1)",
                fontSize: "0.84rem",
                outline: "none",
                background: "var(--bg-primary, #f8fafc)",
                color: "var(--text-primary, #0f172a)",
                height: "44px",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Category Dropdown Trigger */}
          <StockCategoryDropdownTrigger
            filter={itemTypeFilter}
            onChange={(newFilter) => { setItemTypeFilter(newFilter); setCurrentPage(1); }}
          />

          {/* Date Range Dropdown */}
          <div style={{ position: "relative" }}>
            <select
              value={dateRange}
              onChange={(e) => { setDateRange(e.target.value); setCurrentPage(1); }}
              style={{
                padding: "0 14px 0 34px",
                height: "44px",
                borderRadius: "10px",
                border: "1px solid var(--border-color, #cbd5e1)",
                background: "var(--bg-primary, #f8fafc)",
                color: "var(--text-primary, #0f172a)",
                fontSize: "0.84rem",
                fontWeight: 600,
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="ALL">Date Range</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">This Week</option>
              <option value="MONTH">This Month</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
            <Calendar size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }} />
          </div>

          {/* Custom Date Pickers when CUSTOM is active */}
          {dateRange === "CUSTOM" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => { setCustomStartDate(e.target.value); setCurrentPage(1); }}
                style={{
                  padding: "6px 8px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color, #cbd5e1)",
                  fontSize: "0.8rem",
                  color: "var(--text-primary)",
                  background: "var(--bg-card, #ffffff)",
                  outline: "none",
                  height: "44px"
                }}
                title="From Date"
              />
              <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => { setCustomEndDate(e.target.value); setCurrentPage(1); }}
                style={{
                  padding: "6px 8px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color, #cbd5e1)",
                  fontSize: "0.8rem",
                  color: "var(--text-primary)",
                  background: "var(--bg-card, #ffffff)",
                  outline: "none",
                  height: "44px"
                }}
                title="To Date"
              />
            </div>
          )}

          {/* Status Dropdown */}
          <div style={{ position: "relative" }}>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              style={{
                padding: "0 14px 0 34px",
                height: "44px",
                borderRadius: "10px",
                border: "1px solid var(--border-color, #cbd5e1)",
                background: "var(--bg-primary, #f8fafc)",
                color: "var(--text-primary, #0f172a)",
                fontSize: "0.84rem",
                fontWeight: 600,
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="ALL">Status: All</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_STOCK">Out of Stock</option>
            </select>
            <Tag size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }} />
          </div>

          {/* Reset Filters */}
          {(searchTerm || itemTypeFilter.type !== "ALL" || statusFilter !== "ALL" || dateRange !== "ALL" || customStartDate || customEndDate) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setItemTypeFilter({ type: "ALL", sutar: null, size: null, sub: null });
                setStatusFilter("ALL");
                setDateRange("ALL");
                setCustomStartDate("");
                setCustomEndDate("");
                setCurrentPage(1);
              }}
              className="btn btn-ghost btn-sm"
              style={{ height: "44px", padding: "0 10px", color: "#ef4444", fontSize: "0.78rem" }}
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Drill-Down Card for Sutar & Sizes (No Flyout Dropdowns) */}
      <StockCategoryFilterCard
        filter={itemTypeFilter}
        onChange={(newFilter) => { setItemTypeFilter(newFilter); setCurrentPage(1); }}
        totalMatches={filteredItems.length}
      />

      {/* ------------------------------------------------------------------------- */}
      {/* 4. STOCK DATA TABLE (Consistent with Bills & Invoices Table Styling)       */}
      {/* ------------------------------------------------------------------------- */}
      <div className="global-table-container">

        {/* Table Header Strip with Total Counter & Page Size */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-color, #f1f5f9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)" }}>
            <Boxes size={18} style={{ color: "#2563eb" }} />
            <span>Inventory Catalog ({filteredItems.length} records)</span>
          </div>

          {/* Page size selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#64748b" }}>
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              style={{
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid var(--border-color, #cbd5e1)",
                background: "var(--bg-card, #ffffff)",
                color: "var(--text-primary)",
                fontSize: "0.8rem",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>

        {/* Global Table (100% Fit, No Horizontal Scrolling) */}
        <div className="global-table-scroll">
          <table className="global-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "36px", textAlign: "center", padding: "10px 4px" }}>
                  <input
                    type="checkbox"
                    checked={paginatedItems.length > 0 && paginatedItems.every(i => selectedIds.includes(i.id))}
                    onChange={handleSelectAll}
                    style={{ cursor: "pointer" }}
                  />
                </th>
                <th style={{ width: "75px", padding: "10px 6px" }}>CODE</th>
                <th style={{ padding: "10px 8px" }}>PRODUCT NAME</th>
                <th style={{ width: "105px", padding: "10px 6px" }}>CATEGORY</th>
                <th style={{ width: "115px", padding: "10px 6px" }}>SPECS / DIMENSIONS</th>
                <th style={{ width: "95px", textAlign: "right", padding: "10px 6px" }}>STOCK</th>
                <th style={{ width: "85px", textAlign: "right", padding: "10px 6px" }}>COST RATE</th>
                <th style={{ width: "85px", textAlign: "right", padding: "10px 6px" }}>SALE RATE</th>
                <th style={{ width: "90px", textAlign: "right", padding: "10px 6px" }}>VALUE</th>
                <th style={{ width: "70px", textAlign: "center", padding: "10px 4px" }}>STATUS</th>
                <th style={{ width: "75px", textAlign: "center", padding: "10px 4px" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", padding: "45px 20px", color: "#94a3b8" }}>
                    <div style={{ fontSize: "0.92rem", fontWeight: 700 }}>No stock items match your filter criteria.</div>
                    <div style={{ fontSize: "0.78rem", marginTop: "4px" }}>Click "+ New Stock Entry" to add new inventory.</div>
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
                      className={isSelected ? "active-row" : ""}
                    >
                      {/* Checkbox */}
                      <td style={{ textAlign: "center", padding: "8px 4px" }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(item.id)}
                          style={{ cursor: "pointer" }}
                        />
                      </td>

                      {/* Code */}
                      <td style={{ padding: "8px 6px" }}>
                        <span style={{ fontWeight: 800, color: "#2563eb", fontFamily: "var(--font-mono)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                          {item.code || "—"}
                        </span>
                      </td>

                      {/* Product Name */}
                      <td style={{ padding: "8px 8px" }}>
                        <div style={{ fontWeight: 700, color: "var(--text-primary, #0f172a)", fontSize: "0.83rem", lineHeight: 1.2 }}>
                          {item.name}
                        </div>
                      </td>

                      {/* Category */}
                      <td style={{ padding: "8px 6px" }}>
                        <span style={{
                          background: "var(--bg-primary, #f1f5f9)",
                          padding: "2px 6px",
                          borderRadius: "5px",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: "#475569",
                          display: "inline-block",
                          lineHeight: 1.2
                        }}>
                          {item.category}
                        </span>
                        {item.subCategory && (
                          <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>
                            {item.subCategory.replace(new RegExp(`^${item.category}\\s*-\\s*`, 'i'), '').trim()}
                          </div>
                        )}
                      </td>

                      {/* Dimensions / Specs */}
                      <td style={{ padding: "8px 6px" }}>
                        <div style={{ fontSize: "0.76rem", color: "var(--text-primary, #0f172a)", fontWeight: 600 }}>
                          {specInfo.main}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                          {specInfo.sub}
                        </div>
                      </td>

                      {/* Stock Qty */}
                      <td style={{ textAlign: "right", padding: "8px 6px" }}>
                        <div style={{ fontWeight: 800, fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: out ? "#ef4444" : low ? "#d97706" : "var(--text-primary)" }}>
                          {sd.qty.toLocaleString()} <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b" }}>{sd.unit}</span>
                        </div>
                        {sd.sub && (
                          <div style={{ fontSize: "0.68rem", color: "#64748b" }}>{sd.sub}</div>
                        )}
                      </td>

                      {/* Cost Rate */}
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600, color: "#64748b", fontSize: "0.8rem", padding: "8px 6px", whiteSpace: "nowrap" }}>
                        Rs. {Number(item.costPerSqFt || 0).toLocaleString()}{isTiles ? ' / m' : ''}
                      </td>

                      {/* Sale Rate */}
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.8rem", padding: "8px 6px", whiteSpace: "nowrap" }}>
                        Rs. {Number(item.ratePerSqFt || 0).toLocaleString()}{isTiles ? ' / m' : ''}
                      </td>

                      {/* Total Value */}
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 800, color: "#059669", fontSize: "0.8rem", padding: "8px 6px", whiteSpace: "nowrap" }}>
                        Rs. {Math.round(totalValue).toLocaleString()}
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: "center", padding: "8px 4px" }}>
                        {out ? (
                          <span className="status-pill-badge due" style={{ fontSize: "0.68rem", padding: "1px 6px" }}>Out</span>
                        ) : low ? (
                          <span className="status-pill-badge partial" style={{ fontSize: "0.68rem", padding: "1px 6px" }}>Low</span>
                        ) : (
                          <span className="status-pill-badge cleared" style={{ fontSize: "0.68rem", padding: "1px 6px" }}>In Stock</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "center", padding: "8px 4px" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          {/* View Drawer */}
                          <button
                            type="button"
                            onClick={() => setDrawerItem(item)}
                            style={{
                              width: "25px",
                              height: "25px",
                              borderRadius: "6px",
                              border: "1px solid #bfdbfe",
                              background: "#eff6ff",
                              color: "#2563eb",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer"
                            }}
                            title="View Details"
                          >
                            <Eye size={12} />
                          </button>

                          {/* Edit Item */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            style={{
                              width: "25px",
                              height: "25px",
                              borderRadius: "6px",
                              border: "1px solid #bbf7d0",
                              background: "#f0fdf4",
                              color: "#16a34a",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer"
                            }}
                            title="Edit Item"
                          >
                            <Edit2 size={12} />
                          </button>

                          {/* Delete Item */}
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            style={{
                              width: "25px",
                              height: "25px",
                              borderRadius: "6px",
                              border: "1px solid #fecdd3",
                              background: "#fff1f2",
                              color: "#e11d48",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer"
                            }}
                            title="Delete Item"
                          >
                            <Trash2 size={12} />
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

        {/* Global Pagination Component (Matches Screenshot) */}
        <GlobalPagination
          currentPage={activePage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          language={language}
        />
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 5. ITEM DETAILS DRAWER (Progressive Disclosure)                            */}
      {/* ------------------------------------------------------------------------- */}
      {drawerItem && (
        <ItemDetailsDrawer
          item={drawerItem}
          onClose={() => setDrawerItem(null)}
          onEdit={(i) => { setDrawerItem(null); handleOpenEditModal(i); }}
          onAdjust={(i) => { setDrawerItem(null); handleOpenAdjust(i); }}
        />
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 6. ADD / EDIT STOCK ITEM MODAL                                            */}
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
                  <Layers size={24} color="#ffffff" />
                </div>
                <div>
                  <h3 className="app-modal-title">
                    {editingItem ? "Edit Stock Item" : "Register New Stock Entry"}
                  </h3>
                  <p className="app-modal-subtitle">
                    {editingItem ? "Update item specifications, prices and thresholds" : "Filter category, select dimensions & configure stock specifications"}
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

            {/* Form */}
            <form onSubmit={handleSaveItem} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="app-modal-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                {/* 1. Category Dropdown & Item Code (2-Column Grid) */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
                  <div className="app-form-group">
                    <label className="app-form-label" style={{ marginBottom: "4px" }}>
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
                        {allCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
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

                {/* 3. DYNAMIC CATEGORY CLASSIFICATION CARDS */}
                {(() => {
                  const eff = getEffectiveCategoryConfig(formData.category, customCategories);
                  if (eff.hasSutar) {
                    return (
                      <SutarDimensionSelector
                        sutarThickness={formData.sutarThickness}
                        isCustomSutar={formData.isCustomSutar}
                        onSutarChange={(newSutar, isCustom, thickObj) => {
                          setFormData(p => ({
                            ...p,
                            isCustomSutar: isCustom,
                            sutarThickness: newSutar,
                            standardSize: thickObj ? thickObj.defSize : p.standardSize,
                            length: thickObj ? thickObj.length : p.length,
                            width: thickObj ? thickObj.width : p.width
                          }));
                        }}
                        standardSize={formData.standardSize}
                        onSizePresetSelect={(opt) => {
                          setFormData(p => ({
                            ...p,
                            standardSize: opt.label,
                            length: opt.length !== undefined ? opt.length : p.length,
                            width: opt.width !== undefined ? opt.width : p.width
                          }));
                        }}
                        isUrdu={language === 'ur'}
                      />
                    );
                  }
                  if (formData.category === "Tiles" || eff.normUnit === "Meters") {
                    return (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <label className="app-form-label" style={{ margin: 0, fontWeight: 700 }}>
                            {formData.category} Sizes
                          </label>
                          <span style={{ fontSize: "0.72rem", color: "#2563eb", fontWeight: 700 }}>
                            1 Meter = 5 Pieces
                          </span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))", gap: "8px" }}>
                          {[
                            { label: "12 × 24", sub: '12" × 24" (2 Sq.Ft)', length: 2, width: 1 },
                            { label: "24 × 24", sub: '24" × 24" (4 Sq.Ft)', length: 2, width: 2 },
                            { label: "24 × 48", sub: '24" × 48" (8 Sq.Ft)', length: 4, width: 2 },
                            { label: "16 × 16", sub: '16" × 16" (1.77 Sq.Ft)', length: 1.33, width: 1.33 },
                            { label: "Custom", sub: "User Defined", isCustom: true, length: 1, width: 1 }
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
                    );
                  }

                  // Predefined cards or dynamically derived cards for ALL categories (built-in and custom)
                  let sizeOptions = [];
                  if (formData.category === "Flowers") {
                    sizeOptions = [
                      { label: "12 × 12", sub: "1 ft × 1 ft (1 Sq.Ft)", length: 1, width: 1, unit: "Pieces" },
                      { label: "24 × 24", sub: "2 ft × 2 ft (4 Sq.Ft)", length: 2, width: 2, unit: "Pieces" },
                      { label: "3 × 3", sub: "3 ft × 3 ft (9 Sq.Ft)", length: 3, width: 3, unit: "Pieces" },
                      { label: "Custom", sub: "User Defined", isCustom: true, length: 1, width: 1, unit: "Pieces" }
                    ];
                  } else if (formData.category === "Tile Accessories") {
                    sizeOptions = [
                      { label: "Gola", sub: "Corner Gola (8ft)", length: 1, width: 1, unit: "Pieces" },
                      { label: "Spacer", sub: "Tile Cross Spacer", length: 1, width: 1, unit: "Pieces" },
                      { label: "Filling", sub: "Joint Filling (20kg)", length: 1, width: 1, unit: "Pieces" },
                      { label: "Bond", sub: "Tile Bond (20kg)", length: 1, width: 1, unit: "Pieces" },
                      { label: "Custom", sub: "User Defined", isCustom: true, length: 1, width: 1, unit: "Pieces" }
                    ];
                  } else if (formData.category === "Other Accessories") {
                    sizeOptions = [
                      { label: "Combod", sub: "Commode (Piece)", length: 1, width: 1, unit: "Pieces" },
                      { label: "Seat", sub: "Toilet Seat (Piece)", length: 1, width: 1, unit: "Pieces" },
                      { label: "Bason", sub: "Vanity Basin (Piece)", length: 1, width: 1, unit: "Pieces" },
                      { label: "Sink", sub: "Marble Sink (Piece)", length: 1, width: 1, unit: "Pieces" },
                      { label: "Custom", sub: "User Defined", isCustom: true, length: 1, width: 1, unit: "Pieces" }
                    ];
                  } else if (formData.category === "Tukri") {
                    sizeOptions = [
                      { label: "2 × 2", sub: '2" × 2" (Piece)', length: 2/12, width: 2/12, unit: "Pieces" },
                      { label: "3 × 3", sub: '3" × 3" (Piece)', length: 3/12, width: 3/12, unit: "Pieces" },
                      { label: "6 × 6", sub: '6" × 6" (Piece)', length: 6/12, width: 6/12, unit: "Pieces" },
                      { label: "Custom", sub: "User Defined", isCustom: true, length: 1, width: 1, unit: "Pieces" }
                    ];
                  } else if (formData.category === "Kalm") {
                    sizeOptions = [
                      { label: "1 inch", sub: '1" Strip (Piece)', length: 1, width: 1/12, unit: "Pieces" },
                      { label: "2 inch", sub: '2" Strip (Piece)', length: 1, width: 2/12, unit: "Pieces" },
                      { label: "3 inch", sub: '3" Strip (Piece)', length: 1, width: 3/12, unit: "Pieces" },
                      { label: "Custom", sub: "User Defined", isCustom: true, length: 1, width: 1, unit: "Pieces" }
                    ];
                  } else if (formData.category === "Borders" || (eff.method === "Length Only" && eff.normUnit === "Running Feet")) {
                    sizeOptions = [
                      { label: "1 inch", sub: '1" Strip × 1 ft', length: 1, width: 1/12, unit: "Running Feet" },
                      { label: "2 inch", sub: '2" Strip × 1 ft', length: 1, width: 2/12, unit: "Running Feet" },
                      { label: "3 inch", sub: '3" Strip × 1 ft', length: 1, width: 0.25, unit: "Running Feet" },
                      { label: "6 inch", sub: '6" Strip × 1 ft', length: 1, width: 0.5, unit: "Running Feet" },
                      { label: "Custom", sub: "User Defined", isCustom: true, length: 1, width: 0.25, unit: "Running Feet" }
                    ];
                  } else if (formData.category === "Kali Patti") {
                    sizeOptions = [
                      { label: "2 inch", sub: '2" Strip × 1 ft', length: 1, width: 0.1667, unit: "Running Feet" },
                      { label: "3 inch", sub: '3" Strip × 1 ft', length: 1, width: 0.25, unit: "Running Feet" },
                      { label: "Custom", sub: "User Defined", isCustom: true, length: 1, width: 0.2, unit: "Running Feet" }
                    ];
                  } else if (formData.category === "Panels") {
                    sizeOptions = [
                      { label: "12 × 24", sub: "1ft × 2ft (Per Piece)", length: 2, width: 1, unit: "Pieces" },
                      { label: "Custom", sub: "User Defined", isCustom: true, length: 1, width: 1, unit: "Pieces" }
                    ];
                  } else if (eff.method === "Fixed Quantity" || ['Pieces', 'Bags', 'Boxes'].includes(eff.normUnit)) {
                    sizeOptions = [
                      { label: "Standard", sub: `Standard (${eff.normUnit})`, length: 1, width: 1, unit: eff.normUnit },
                      { label: "Small", sub: `Small (${eff.normUnit})`, length: 1, width: 1, unit: eff.normUnit },
                      { label: "Large", sub: `Large (${eff.normUnit})`, length: 1, width: 1, unit: eff.normUnit },
                      { label: "Custom", sub: "User Defined", isCustom: true, length: 1, width: 1, unit: eff.normUnit }
                    ];
                  } else {
                    sizeOptions = [
                      { label: "12 × 12", sub: '12" × 12" (1 Sq.Ft)', length: 1, width: 1, unit: eff.normUnit || "Sq. Ft." },
                      { label: "12 × 24", sub: '12" × 24" (2 Sq.Ft)', length: 2, width: 1, unit: eff.normUnit || "Sq. Ft." },
                      { label: "24 × 24", sub: '24" × 24" (4 Sq.Ft)', length: 2, width: 2, unit: eff.normUnit || "Sq. Ft." },
                      { label: "Custom", sub: "User Defined", isCustom: true, length: 1, width: 1, unit: eff.normUnit || "Sq. Ft." }
                    ];
                  }

                  return (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <label className="app-form-label" style={{ margin: 0, fontWeight: 700 }}>
                          {`${String(formData.category || '')} Standard Sizes`}
                        </label>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          Click to apply dimensions
                        </span>
                      </div>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
                        gap: "8px"
                      }}>
                        {sizeOptions.map(opt => {
                          const isSelected = formData.standardSize === opt.label;
                          return (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => setFormData(p => ({
                                ...p,
                                standardSize: opt.label,
                                length: opt.length !== undefined ? opt.length : p.length,
                                width: opt.width !== undefined ? opt.width : p.width,
                                unit: opt.unit || eff.normUnit || p.unit
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
                  );
                })()}

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

                  {(() => {
                    const eff = getEffectiveCategoryConfig(formData.category, customCategories);
                    const isTilesMeter = formData.category === "Tiles" || formData.unit === "Meters";
                    const isLengthOnly = eff.method === "Length Only" || formData.unit === "Running Feet" || formData.category === "Borders" || formData.category === "Kali Patti";
                    const isFixedQty = eff.method === "Fixed Quantity" || ['Pieces', 'Bags', 'Boxes'].includes(formData.unit) || ["Tile Accessories", "Other Accessories", "Flowers", "Panels", "Accessories"].includes(formData.category);
                    const isManual = eff.method === "Manual Measurement";

                    if (isTilesMeter) {
                      return (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
                                required
                              />
                            </div>
                          </div>

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
                      );
                    }

                    if (isLengthOnly) {
                      return (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
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

                          <div className="app-form-group">
                            <label className="app-form-label" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                              Stock ({formData.unit === "Running Feet" ? "R.ft." : (formData.unit || "R.ft.")}) <span className="app-form-label-required">*</span>
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
                                required
                              />
                            </div>
                          </div>

                          <div className="app-form-group">
                            <label className="app-form-label" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                              Unit
                            </label>
                            <div className="app-input-wrapper">
                              <input
                                type="text"
                                value={formData.unit === "Running Feet" ? "R.ft." : (formData.unit || "R.ft.")}
                                readOnly
                                className="app-form-input"
                                style={{ background: "#f1f5f9", fontWeight: 700 }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (isFixedQty) {
                      return (
                        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
                          <div className="app-form-group">
                            <label className="app-form-label" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                              Quantity ({formData.unit || "Pieces"}) <span className="app-form-label-required">*</span>
                            </label>
                            <div className="app-input-wrapper">
                              <input
                                type="number"
                                step="any"
                                value={formData.stockPieces || ""}
                                onChange={e => {
                                  const val = e.target.value;
                                  const num = parseFloat(val) || 0;
                                  setFormData(p => ({
                                    ...p,
                                    stockPieces: val,
                                    stockSqFt: num,
                                    stockBoxes: p.unit === "Boxes" ? num : 0
                                  }));
                                }}
                                placeholder="e.g. 100"
                                className="app-form-input font-mono"
                                style={{ fontWeight: 700 }}
                                required
                              />
                            </div>
                          </div>

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
                                <option value="Pieces">Pieces</option>
                                <option value="Bags">Bags</option>
                                <option value="Boxes">Boxes</option>
                                <option value="Other">Other</option>
                                {!['Pieces', 'Bags', 'Boxes', 'Other'].includes(formData.unit) && (
                                  <option value={formData.unit}>{formData.unit}</option>
                                )}
                              </select>
                              <ChevronDown size={14} className="app-input-chevron" />
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (isManual) {
                      return (
                        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
                          <div className="app-form-group">
                            <label className="app-form-label" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                              Total Stock ({formData.unit || "Unit"}) <span className="app-form-label-required">*</span>
                            </label>
                            <div className="app-input-wrapper">
                              <input
                                type="number"
                                step="any"
                                value={formData.stockSqFt || ""}
                                onChange={e => {
                                  const val = e.target.value;
                                  setFormData(p => ({
                                    ...p,
                                    stockSqFt: val,
                                    stockPieces: parseFloat(val) || 0
                                  }));
                                }}
                                placeholder="e.g. 150"
                                className="app-form-input font-mono"
                                style={{ fontWeight: 700 }}
                                required
                              />
                            </div>
                          </div>

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
                                <option value="Pieces">Pieces</option>
                                <option value="Running Feet">Running Feet</option>
                                <option value="Bags">Bags</option>
                                <option value="Boxes">Boxes</option>
                                <option value="Other">Other</option>
                                {!['Sq. Ft.', 'Meters', 'Pieces', 'Running Feet', 'Bags', 'Boxes', 'Other'].includes(formData.unit) && (
                                  <option value={formData.unit}>{formData.unit}</option>
                                )}
                              </select>
                              <ChevronDown size={14} className="app-input-chevron" />
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
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
                                  return { ...p, stockPieces: val, stockBoxes: 0, stockSqFt: sqft };
                                });
                              }}
                              placeholder="e.g. 100"
                              className="app-form-input font-mono"
                            />
                          </div>
                        </div>

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
                              <option value="Bags">Bags</option>
                              <option value="Other">Other</option>
                              {!['Sq. Ft.', 'Meters', 'Boxes', 'Pieces', 'Running Feet', 'Bags', 'Other'].includes(formData.unit) && (
                                <option value={formData.unit}>{formData.unit}</option>
                              )}
                            </select>
                            <ChevronDown size={14} className="app-input-chevron" />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '10px',
                    paddingTop: '10px',
                    borderTop: '1px solid #e2e8f0',
                    fontSize: '0.82rem'
                  }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Total Stock:</span>
                    <span className="font-mono" style={{ fontWeight: 800, color: '#2563eb', fontSize: '1rem' }}>
                      {formData.unit === 'Pieces' || ['Tile Accessories', 'Other Accessories', 'Flowers', 'Panels', 'Accessories'].includes(formData.category) ? (
                        <span>{formData.stockPieces || 0} Pieces</span>
                      ) : ['Bags', 'Boxes'].includes(formData.unit) ? (
                        <span>{formData.stockPieces || formData.stockSqFt || 0} {formData.unit}</span>
                      ) : formData.unit === 'Meters' || formData.category === 'Tiles' ? (
                        <span>{formData.stockSqFt || 0} Meters</span>
                      ) : formData.unit === 'Running Feet' || formData.category === 'Borders' || formData.category === 'Kali Patti' ? (
                        <span>{formData.stockSqFt || 0} R.ft.</span>
                      ) : (
                        <span>{formData.stockSqFt || 0} {formData.unit || 'Sq.Ft'}</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* 5. Pricing Rates (2-Column Grid) */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      Selling Rate (Rs / {formData.unit === "Running Feet" ? "R.ft." : (formData.unit || "Unit")}) <span className="app-form-label-required">*</span>
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
                      Cost Rate (Rs / {formData.category === "Tiles" ? "Meter" : (formData.category === "Tile Accessories" || formData.category === "Other Accessories" || formData.unit === "Pieces" ? "Piece" : (formData.unit || "Unit"))}) <span className="app-form-label-required">*</span>
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
                        value={formData.location}
                        onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
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
                        value={formData.notes}
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

      {/* ------------------------------------------------------------------------- */}
      {/* 7. QUICK STOCK ADJUSTMENT MODAL                                           */}
      {/* ------------------------------------------------------------------------- */}
      {isAdjustModalOpen && adjustingItem && (
        <div className="modal-overlay" style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          backgroundColor: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px"
        }}>
          <div className="modal-card" style={{
            maxWidth: "460px", width: "100%", background: "var(--bg-card)",
            borderRadius: "16px", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border-color)",
            overflow: "hidden", display: "flex", flexDirection: "column"
          }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>Adjust Stock: {adjustingItem.name}</h3>
              <button type="button" onClick={() => setIsAdjustModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveAdjustment}>
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "4px" }}>
                    Adjustment Qty (+ to add, - to subtract)
                  </label>
                  <input
                    required
                    type="number"
                    step="any"
                    value={adjustQty}
                    onChange={e => setAdjustQty(e.target.value)}
                    className="form-control font-mono"
                    placeholder="e.g. +500 or -200"
                    autoFocus
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "4px" }}>
                    Reason / Type
                  </label>
                  <select
                    value={adjustType}
                    onChange={e => setAdjustType(e.target.value)}
                    className="form-control"
                  >
                    <option value="Adjustment">Yard Recount Adjustment</option>
                    <option value="Intake">New Stock Intake</option>
                    <option value="Damage">Broken / Wastage</option>
                    <option value="Return">Return Restock</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "4px" }}>
                    Audit Notes
                  </label>
                  <input
                    type="text"
                    value={adjustNote}
                    onChange={e => setAdjustNote(e.target.value)}
                    className="form-control"
                    placeholder="Remarks..."
                  />
                </div>
              </div>
              <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: "#2563eb" }}>Apply Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}

          {/* Category Management Modal */}
      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoryCreated={(newCat) => {
          handleOpenAddModal(newCat.name);
        }}
      />
</div>
  );
}
