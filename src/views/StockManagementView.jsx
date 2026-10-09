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
    accessories: [
      { name: "Border", desc: "Patti Strip" },
      { name: "Filling", desc: "20kg Grout Bag" },
      { name: "Spacer", desc: "3mm Cross Pack" },
      { name: "Gola", desc: "8ft Chamfer Gola" }
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
    unit: "Running Feet",
    desc: "Standard borders & Kali Patti (Black Border)"
  },
  panels: {
    label: "Panels",
    icon: Layers,
    types: ["Mashallah Islamic Panels", "3D Wall Panels", "Front Elevation Panels"],
    unit: "Pieces",
    desc: "Decorative high-value entrance and wall panels"
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Stock Display & Helper Calculations
// ─────────────────────────────────────────────────────────────────────────────
function getStockDisplay(item) {
  const unit = item.unit || "Sq. Ft.";
  const qty = Number(item.stockSqFt || item.stockPieces || item.stockBoxes || 0);
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
              {(ITEM_TAXONOMY.panels?.types || []).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => selectFilter({ type: "Panels", sub: p })}
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div style={{ background: "var(--bg-primary, #f8fafc)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-color, #e2e8f0)" }}>
              <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700 }}>Selling Rate</div>
              <div style={{ fontSize: "1rem", fontWeight: 800, color: "#2563eb", fontFamily: "var(--font-mono)" }}>
                Rs. {Number(item.ratePerSqFt || 0).toLocaleString()}
              </div>
            </div>
            <div style={{ background: "var(--bg-primary, #f8fafc)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-color, #e2e8f0)" }}>
              <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700 }}>Total Value</div>
              <div style={{ fontSize: "1rem", fontWeight: 800, color: "#059669", fontFamily: "var(--font-mono)" }}>
                Rs. {(sd.qty * Number(item.ratePerSqFt || 0)).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.84rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
              <span style={{ color: "#64748b" }}>Sutar Thickness:</span>
              <span style={{ fontWeight: 700 }}>{item.sutarThickness ? `${item.sutarThickness} Sutar` : "—"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
              <span style={{ color: "#64748b" }}>Standard Size:</span>
              <span style={{ fontWeight: 700 }}>{item.standardSize || "—"}</span>
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
            const matchesSutar = sutar === targetSutar ||
              name.includes(`${targetSutar} sutar`) ||
              name.includes(`${targetSutar}-sutar`) ||
              sub.includes(`${targetSutar} sutar`) ||
              sub.includes(`${targetSutar}-sutar`) ||
              (targetSutar === "6" && (name.includes("kitchen") || sub.includes("kitchen") || name.includes("stairs")));
            if (!matchesSutar) return false;
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
        } else if (itemTypeFilter.type === "Borders") {
          const isBorder = cat.includes("border") || sub.includes("border") || sub.includes("patti") || name.includes("border") || name.includes("patti");
          if (!isBorder) return false;

          if (itemTypeFilter.sub) {
            if (itemTypeFilter.sub.includes("Kali Patti") || itemTypeFilter.sub.includes("Black")) {
              if (!sub.includes("kali") && !name.includes("kali") && !name.includes("black")) return false;
            }
            if (itemTypeFilter.sub.includes("3 inch") && !sz.includes("3") && !name.includes("3") && !sub.includes("3")) return false;
            if (itemTypeFilter.sub.includes("6 inch") && !sz.includes("6") && !name.includes("6") && !sub.includes("6")) return false;
            if (itemTypeFilter.sub.includes("2 inch") && !sz.includes("2") && !name.includes("2") && !sub.includes("2")) return false;
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

  // ───────────────────────────────────────────────────────────────────────────
  // KPI Calculations
  // ───────────────────────────────────────────────────────────────────────────
  const totalVarieties = items.length;
  const totalStockSqFt = items.reduce((acc, i) => acc + Number(i.stockSqFt || 0), 0);
  const totalStockValuation = items.reduce((acc, i) => {
    const qty = Number(i.stockSqFt || i.stockPieces || i.stockBoxes || 0);
    return acc + qty * Number(i.ratePerSqFt || 0);
  }, 0);
  const lowStockItemsCount = items.filter(i => isLowStock(i) || isOutOfStock(i)).length;

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
    setFormData({
      ...INITIAL_FORM,
      category: cat,
      sutarThickness: cat === 'Marble' ? '4' : '',
      standardSize: cat === 'Marble' ? '12 × 12' : (cat === 'Tiles' ? '12 × 24' : (cat === 'Borders' ? '3 inch' : (cat === 'Kali Patti' ? '2 inch' : (cat === 'Panels' ? '24 × 48' : '12 × 12')))),
      length: cat === 'Tiles' ? 2 : (cat === 'Borders' || cat === 'Kali Patti' ? 10 : (cat === 'Panels' ? 4 : 1)),
      width: cat === 'Tiles' ? 1 : (cat === 'Borders' ? 0.25 : (cat === 'Kali Patti' ? 0.166 : (cat === 'Panels' ? 2 : 1))),
      unit: cat === 'Flowers' || cat === 'Panels' ? 'Pieces' : (cat === 'Borders' || cat === 'Kali Patti' ? 'Running Feet' : (cat === 'Tiles' ? 'Boxes' : 'Sq. Ft.')),
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
      defaultUnit = "Boxes";
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
      defaultLen = 10;
      defaultWid = 0.25;
      defaultCodePrefix = "BR";
    } else if (newCat === "Kali Patti") {
      defaultUnit = "Running Feet";
      defaultSutar = "";
      defaultSize = "2 inch";
      defaultLen = 10;
      defaultWid = 0.166;
      defaultCodePrefix = "KP";
    } else if (newCat === "Panels") {
      defaultUnit = "Pieces";
      defaultSutar = "";
      defaultSize = "24 × 48";
      defaultLen = 4;
      defaultWid = 2;
      defaultCodePrefix = "PN";
    } else if (newCat === "Accessories") {
      defaultUnit = "Pieces";
      defaultSutar = "";
      defaultSize = "Border";
      defaultLen = 10;
      defaultWid = 0.25;
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
    setFormData({ ...INITIAL_FORM, ...item });
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        length: parseFloat(formData.length) || 1,
        width: parseFloat(formData.width) || 1,
        ratePerSqFt: parseFloat(formData.ratePerSqFt) || 0,
        costPerSqFt: parseFloat(formData.costPerSqFt) || 0,
        stockSqFt: parseFloat(formData.stockSqFt) || 0,
        stockBoxes: parseInt(formData.stockBoxes) || 0,
        stockPieces: parseInt(formData.stockPieces) || 0,
        minStockAlert: parseFloat(formData.minStockAlert) || 0,
        thicknessMm: parseFloat(formData.thicknessMm) || 0,
        updatedAt: new Date().toISOString(),
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
    const unit = adjustingItem.unit || "Sq. Ft.";
    const deltaSqFt = (unit === "Sq. Ft." || unit === "Running Feet") ? delta : 0;
    const deltaBoxes = unit === "Boxes" ? delta : 0;
    const deltaPieces = unit === "Pieces" ? delta : 0;
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

        {/* Right: New Stock Entry Action Button */}
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

        {/* Right: Background Marble Image extending seamlessly across the header */}
        <div style={{
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
        }} />
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 2. TOP 4 KPI CARDS (Global Unified Metric Cards)                           */}
      {/* ------------------------------------------------------------------------- */}
      <div className="kpi-card-grid">
        {/* Card 1: Total Varieties */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon blue">
            <Layers size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Total Varieties</span>
              <span className="kpi-metric-label-ur">(کل ورائٹیز)</span>
            </div>
            <div className="kpi-metric-value font-mono">
              {totalVarieties} <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>Items</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Stock Sq.Ft */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon green">
            <Boxes size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Total Stock Sq.Ft</span>
              <span className="kpi-metric-label-ur">(کل اسکوائر فٹ)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ color: '#059669' }}>
              {Math.round(totalStockSqFt).toLocaleString()} <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Sq.Ft</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Stock Valuation */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon indigo">
            <DollarSign size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Stock Valuation</span>
              <span className="kpi-metric-label-ur">(کل مالیت)</span>
            </div>
            <div className="kpi-metric-value font-mono">
              Rs. {Math.round(totalStockValuation).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card 4: Low Stock Alert */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon amber">
            <AlertTriangle size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Low Stock Alert</span>
              <span className="kpi-metric-label-ur">(کم اسٹاک)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ color: lowStockItemsCount > 0 ? '#d97706' : '#16a34a' }}>
              {lowStockItemsCount} <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>/ {totalVarieties}</span>
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
                <th style={{ width: "110px", padding: "10px 6px" }}>CATEGORY</th>
                <th style={{ width: "115px", padding: "10px 6px" }}>SPECS / SUTAR</th>
                <th style={{ width: "95px", textAlign: "right", padding: "10px 6px" }}>STOCK</th>
                <th style={{ width: "80px", textAlign: "right", padding: "10px 6px" }}>RATE</th>
                <th style={{ width: "95px", textAlign: "right", padding: "10px 6px" }}>VALUE</th>
                <th style={{ width: "75px", textAlign: "center", padding: "10px 4px" }}>STATUS</th>
                <th style={{ width: "80px", textAlign: "center", padding: "10px 4px" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "45px 20px", color: "#94a3b8" }}>
                    <div style={{ fontSize: "0.92rem", fontWeight: 700 }}>No stock items match your filter criteria.</div>
                    <div style={{ fontSize: "0.78rem", marginTop: "4px" }}>Click "+ New Stock Entry" to add new inventory.</div>
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
                          {item.sutarThickness ? `${item.sutarThickness} Sutar` : item.standardSize || "Standard"}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                          {item.finish || "Polished"}
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

                      {/* Unit Rate */}
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.8rem", padding: "8px 6px", whiteSpace: "nowrap" }}>
                        Rs. {Number(item.ratePerSqFt || 0).toLocaleString()}
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
                        <option value="Marble">Marble (Slabs & Tiles)</option>
                        <option value="Tiles">Tiles (Porcelain & Ceramic)</option>
                        <option value="Flowers">Flowers (Medallions)</option>
                        <option value="Borders">Borders (Patti / Strips)</option>
                        <option value="Kali Patti">Kali Patti (Black Border)</option>
                        <option value="Panels">Panels (Mashallah / 3D)</option>
                        <option value="Granite">Granite (Slabs & Tops)</option>
                        <option value="Accessories">Accessories (Gola, Spacer, Filling)</option>
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

                {/* 3. DYNAMIC CATEGORY CLASSIFICATION CARDS (Identical to BillingView) */}
                {formData.category === "Marble" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {/* Marble Sutar Thickness Cards */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <label className="app-form-label" style={{ margin: 0, fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                          <Ruler size={14} style={{ color: "#2563eb" }} />
                          Sutar Thickness (سوتر موٹائی) <span className="app-form-label-required">*</span>
                        </label>
                        {formData.sutarThickness === "6" && (
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#d97706", background: "rgba(217, 119, 6, 0.1)", padding: "2px 8px", borderRadius: "4px" }}>
                            ⚡ صرف کچن اور سیڑھیوں کے لیے (Kitchen & Stairs Only)
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
                          Standard Sizes for {formData.sutarThickness || 4} Sutar (معیاری سائز)
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
                        Types of Tiles (ٹائلز کے معیاری سائز)
                      </label>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        Click to apply format
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
                              width: opt.width
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
                          ? "Types of Flower (پھول کے سائز)"
                          : formData.category === "Borders"
                            ? "Types of Border (بارڈر پٹی کے سائز)"
                            : formData.category === "Kali Patti"
                              ? "Types of Black Border / Kali Patti (کالی پٹی کے سائز)"
                              : formData.category === "Panels"
                                ? "Panel Types - Higher Rate (وال پینل)"
                                : `${String(formData.category || '')} Standard Sizes`}
                      </label>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        Click to apply dimensions
                      </span>
                    </div>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: (formData.category === "Flowers" || formData.category === "Panels" || formData.category === "Granite") ? "repeat(3, 1fr)" : (formData.category === "Borders" || formData.category === "Kali Patti") ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
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
                            { label: "3 inch", sub: '3" width (10 R.Ft)', length: 10, width: 0.25 },
                            { label: "6 inch", sub: '6" width (10 R.Ft)', length: 10, width: 0.5 }
                          ]
                          : formData.category === "Kali Patti"
                            ? [
                              { label: "2 inch", sub: '2" Kali Patti (10 R.Ft)', length: 10, width: 0.166 },
                              { label: "3 inch", sub: '3" Kali Patti (10 R.Ft)', length: 10, width: 0.25 }
                            ]
                            : formData.category === "Panels"
                              ? [
                                { label: "24 × 48", sub: "Mashallah (2ft × 4ft)", length: 4, width: 2 },
                                { label: "3 × 3", sub: "Calligraphy (3ft × 3ft)", length: 3, width: 3 },
                                { label: "3 × 5", sub: "Elevation (3ft × 5ft)", length: 5, width: 3 }
                              ]
                              : formData.category === "Granite"
                                ? [
                                  { label: "Kitchen Slab", sub: "8ft × 2ft (16 Sq.Ft)", length: 8, width: 2 },
                                  { label: "Flooring Slab", sub: "6ft × 2ft (12 Sq.Ft)", length: 6, width: 2 },
                                  { label: "Stair Step", sub: "4ft × 1ft (4 Sq.Ft)", length: 4, width: 1 }
                                ]
                                : [
                                  { label: "Border", sub: "Tile Patti Strip", length: 10, width: 0.25 },
                                  { label: "Filling", sub: "Joint Filling / Bond", length: 1, width: 1 },
                                  { label: "Spacer", sub: "3mm Cross Spacers", length: 1, width: 1 },
                                  { label: "Gola", sub: "8ft Chamfer Gola", length: 8, width: 1 }
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

                {/* 4. Dimensions Box & Unit Configuration */}
                <div style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "14px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#1e293b" }}>
                      Dimensions & Unit Configuration (پیمائش اور یونٹ کی ترتیب)
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.1fr", gap: "10px" }}>
                    {/* Length (ft) */}
                    <div className="app-form-group">
                      <label className="app-form-label" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                        Length (ft) / لمبائی
                      </label>
                      <div className="app-input-wrapper">
                        <input
                          type="number"
                          step="any"
                          value={formData.length !== undefined ? formData.length : ""}
                          onChange={e => {
                            const val = e.target.value;
                            setFormData(p => {
                              const nextLen = val;
                              const w = p.width;
                              let newSize = p.standardSize;
                              if (nextLen && w) {
                                newSize = `${nextLen} × ${w}`;
                              } else if (nextLen) {
                                newSize = `${nextLen} ft`;
                              }
                              return { ...p, length: nextLen, standardSize: newSize };
                            });
                          }}
                          placeholder="ft (e.g. 1, 2, 4)"
                          className="app-form-input has-icon font-mono"
                        />
                      </div>
                    </div>

                    {/* Width (ft) */}
                    <div className="app-form-group">
                      <label className="app-form-label" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                        Width (ft) / چوڑائی
                      </label>
                      <div className="app-input-wrapper">
                        <input
                          type="number"
                          step="any"
                          value={formData.width !== undefined ? formData.width : ""}
                          onChange={e => {
                            const val = e.target.value;
                            setFormData(p => {
                              const l = p.length;
                              const nextWidth = val;
                              let newSize = p.standardSize;
                              if (l && nextWidth) {
                                newSize = `${l} × ${nextWidth}`;
                              } else if (nextWidth) {
                                newSize = `${nextWidth} ft`;
                              }
                              return { ...p, width: nextWidth, standardSize: newSize };
                            });
                          }}
                          placeholder="ft (e.g. 1, 2, 0.5)"
                          className="app-form-input has-icon font-mono"
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
                          <option value="Boxes">Boxes</option>
                          <option value="Pieces">Pieces</option>
                          <option value="Running Feet">Running Feet</option>
                        </select>
                        <ChevronDown size={14} className="app-input-chevron" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Pricing Rates (2-Column Grid) */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      Selling Rate (Rs / {formData.unit || "Unit"}) <span className="app-form-label-required">*</span>
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
                      Cost Rate (Rs / {formData.unit || "Unit"}) <span className="app-form-label-required">*</span>
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

                {/* 6. Stock Quantity & Low Stock Alert (2-Column Grid) */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      Initial Stock ({formData.unit || "Sq. Ft."}) <span className="app-form-label-required">*</span>
                    </label>
                    <div className="app-input-wrapper">
                      <Boxes size={16} className="app-input-icon" />
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.stockSqFt}
                        onChange={e => setFormData(p => ({ ...p, stockSqFt: e.target.value, stockPieces: e.target.value, stockBoxes: e.target.value }))}
                        className="app-form-input has-icon font-mono"
                        placeholder="0"
                        style={{ fontWeight: 700 }}
                      />
                    </div>
                  </div>

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

    </div>
  );
}
