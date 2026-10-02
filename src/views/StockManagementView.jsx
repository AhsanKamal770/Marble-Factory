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
        sizes: ["Stairs & Kitchen Slabs", "3ft Step + Riser", "4ft Step + Riser", "Kitchen Countertop (Custom)"],
        desc: "Only 6 Sutar is specially used for Kitchen & Stairs"
      },
      {
        sutar: "9 Sutar",
        sizes: ["Heavy Flooring Slabs", "Cut-to-Size Slabs"],
        desc: "Heavy duty flooring marble"
      },
      {
        sutar: "14 Sutar",
        sizes: ["Industrial / Thick Slabs", "Foundation Slabs"],
        desc: "Extra thick structural marble"
      }
    ]
  },
  tiles: {
    label: "Tiles",
    icon: Grid3X3,
    sizes: ["12 × 24", "24 × 24", "24 × 48", "16 × 16"],
    accessories: [
      { name: "Border", unit: "Running Feet" },
      { name: "Filling / Grout", unit: "Bags" },
      { name: "Spacer", unit: "Pieces" },
      { name: "Gola / Chamfer", unit: "Running Feet" }
    ],
    panels: [
      { name: "Mashallah / Islamic Calligraphy Panels", note: "Rate is higher than simple tiles" }
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
            <button
              type="button"
              onClick={() => selectFilter({ type: "Panels" })}
              onMouseEnter={() => { setActiveL1(null); setActiveL2(null); }}
              style={{
                width: "100%",
                padding: "8px 14px",
                border: "none",
                background: filter?.type === "Panels" ? "#eff6ff" : "none",
                color: filter?.type === "Panels" ? "#2563eb" : "var(--text-primary)",
                fontWeight: 500,
                fontSize: "0.83rem",
                textAlign: "left",
                cursor: "pointer"
              }}
            >
              Panels
            </button>
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
                minWidth: "125px",
                overflow: "hidden"
              }}
            >
              {ITEM_TAXONOMY.marble.sutars[0].sizes.map((sz) => (
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
                    fontWeight: 500
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
                  fontWeight: 700
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
              {ITEM_TAXONOMY.tiles.sizes.map((sz) => (
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
              {ITEM_TAXONOMY.tiles.accessories.map((acc) => (
                <button
                  key={acc.name}
                  type="button"
                  onClick={() => selectFilter({ type: "Tiles", sub: acc.name })}
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
                  {acc.name}
                </button>
              ))}

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
              {ITEM_TAXONOMY.flowers.sizes.map((sz) => (
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
              {ITEM_TAXONOMY.borders.standard.map((sz) => (
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
              {ITEM_TAXONOMY.borders.blackBorder.map((sz) => (
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

      // 2. Status filter
      if (statusFilter === "IN_STOCK" && (isOutOfStock(item) || isLowStock(item))) return false;
      if (statusFilter === "LOW_STOCK" && !isLowStock(item)) return false;
      if (statusFilter === "OUT_STOCK" && !isOutOfStock(item)) return false;

      // 3. Cascading Item Type Filter
      if (itemTypeFilter && itemTypeFilter.type !== "ALL") {
        const cat = (item.category || "").toLowerCase();
        const sub = (item.subCategory || "").toLowerCase();
        const sz = (item.standardSize || "").toLowerCase();
        const sutar = String(item.sutarThickness || "");

        if (itemTypeFilter.type === "Marble") {
          const isMarble = cat.includes("marble") || sub.includes("marble") || cat.includes("slab");
          if (!isMarble) return false;
          if (itemTypeFilter.sutar) {
            const targetSutar = itemTypeFilter.sutar.split(" ")[0]; // "4", "6", "9", "14"
            if (sutar !== targetSutar) return false;
          }
          if (itemTypeFilter.size) {
            const cleanSz = itemTypeFilter.size.replace(/\s+/g, "").toLowerCase();
            const cleanItemSz = (sz + " " + sub).replace(/\s+/g, "").toLowerCase();
            if (!cleanItemSz.includes(cleanSz) && !cleanItemSz.includes(cleanSz.replace("×", "x"))) return false;
          }
        } else if (itemTypeFilter.type === "Tiles") {
          const isTile = cat.includes("tile") || cat.includes("porcelain") || sub.includes("tile");
          if (!isTile) return false;
          if (itemTypeFilter.size) {
            const cleanSz = itemTypeFilter.size.replace(/\s+/g, "").toLowerCase();
            const cleanItemSz = (sz + " " + sub).replace(/\s+/g, "").toLowerCase();
            if (!cleanItemSz.includes(cleanSz) && !cleanItemSz.includes(cleanSz.replace("×", "x"))) return false;
          }
          if (itemTypeFilter.sub) {
            if (!sub.toLowerCase().includes(itemTypeFilter.sub.toLowerCase()) && !cat.toLowerCase().includes(itemTypeFilter.sub.toLowerCase())) return false;
          }
        } else if (itemTypeFilter.type === "Flowers") {
          const isFlower = cat.includes("flower") || sub.includes("flower") || (item.name || "").toLowerCase().includes("flower");
          if (!isFlower) return false;
          if (itemTypeFilter.size) {
            const cleanSz = itemTypeFilter.size.replace(/\s+/g, "").toLowerCase();
            const cleanItemSz = (sz + " " + sub + " " + item.name).replace(/\s+/g, "").toLowerCase();
            if (!cleanItemSz.includes(cleanSz) && !cleanItemSz.includes(cleanSz.replace("×", "x"))) return false;
          }
        } else if (itemTypeFilter.type === "Borders") {
          const isBorder = cat.includes("border") || sub.includes("border") || sub.includes("patti") || (item.name || "").toLowerCase().includes("border") || (item.name || "").toLowerCase().includes("patti");
          if (!isBorder) return false;
          if (itemTypeFilter.sub) {
            if (itemTypeFilter.sub.includes("Kali Patti") && !sub.includes("kali patti") && !(item.name || "").toLowerCase().includes("kali patti")) return false;
          }
        } else if (itemTypeFilter.type === "Panels") {
          const isPanel = cat.includes("panel") || sub.includes("panel") || (item.name || "").toLowerCase().includes("panel") || (item.name || "").toLowerCase().includes("mashallah");
          if (!isPanel) return false;
        }
      }

      return true;
    });
  }, [items, searchTerm, statusFilter, itemTypeFilter]);

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

          {/* Date Range Dropdown */}
          <div style={{ position: "relative" }}>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
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
            </select>
            <Calendar size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }} />
          </div>

          {/* Cascading "Filter by Item Type" Multi-Level Dropdown */}
          <CascadingTypeFilter
            filter={itemTypeFilter}
            onChange={(newFilter) => { setItemTypeFilter(newFilter); setCurrentPage(1); }}
          />

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
          {(searchTerm || itemTypeFilter.type !== "ALL" || statusFilter !== "ALL" || dateRange !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setItemTypeFilter({ type: "ALL" });
                setStatusFilter("ALL");
                setDateRange("ALL");
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
                        {item.lotNo && (
                          <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{item.lotNo}</div>
                        )}
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
                          <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>{item.subCategory}</div>
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
        <div className="modal-overlay" style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          backgroundColor: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px"
        }}>
          <div className="modal-card" style={{
            maxWidth: "600px", width: "100%", background: "var(--bg-card)",
            borderRadius: "16px", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border-color)",
            overflow: "hidden", display: "flex", flexDirection: "column"
          }}>
            {/* Modal Header */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Boxes size={20} style={{ color: "var(--accent-blue)" }} />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  {editingItem ? "Edit Stock Item" : "Register New Stock Entry"}
                </h3>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveItem}>
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px", maxHeight: "72vh", overflowY: "auto" }}>
                
                {/* Product Name & Code */}
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                      Product / Variety Name *
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      className="form-control"
                      placeholder="e.g. Ziarat White / Tavera / Mashallah Panel"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                      Item Code *
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.code}
                      onChange={e => setFormData(p => ({ ...p, code: e.target.value }))}
                      className="form-control font-mono"
                      placeholder="MB-001"
                    />
                  </div>
                </div>

                {/* Main Category Selector */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                      Category Type *
                    </label>
                    <select
                      value={formData.category}
                      onChange={e => {
                        const newCat = e.target.value;
                        let defaultUnit = "Sq. Ft.";
                        if (newCat === "Flowers" || newCat === "Flower Medallions" || newCat === "Panels") defaultUnit = "Pieces";
                        if (newCat === "Borders" || newCat === "Borders & Patti") defaultUnit = "Running Feet";
                        if (newCat === "Porcelain & Panels") defaultUnit = "Boxes";
                        setFormData(p => ({ ...p, category: newCat, unit: defaultUnit }));
                      }}
                      className="form-control"
                    >
                      <option value="Marble">Marble Slabs & Tiles</option>
                      <option value="Porcelain & Panels">Tiles (Porcelain / Ceramic)</option>
                      <option value="Flower Medallions">Flowers (Flower Medallions)</option>
                      <option value="Borders & Patti">Borders & Patti</option>
                      <option value="Panels">Panels (Mashallah / 3D)</option>
                      <option value="Granite">Granite</option>
                      <option value="Accessories">Accessories (Gola, Spacer, Filling)</option>
                    </select>
                  </div>

                  {/* Sutar Thickness (if Marble) */}
                  {formData.category.includes("Marble") ? (
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                        Sutar Thickness
                      </label>
                      <select
                        value={formData.sutarThickness}
                        onChange={e => setFormData(p => ({ ...p, sutarThickness: e.target.value }))}
                        className="form-control"
                      >
                        <option value="4">4 Sutar (12x12, 12x24, 6x12, 6x24)</option>
                        <option value="6">6 Sutar (Kitchen & Stairs Only)</option>
                        <option value="9">9 Sutar (Heavy Flooring)</option>
                        <option value="14">14 Sutar (Thick Industrial)</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                        Sub-Category / Variety Spec
                      </label>
                      <input
                        type="text"
                        value={formData.subCategory}
                        onChange={e => setFormData(p => ({ ...p, subCategory: e.target.value }))}
                        className="form-control"
                        placeholder="e.g. Kali Patti / Mashallah / Spacer"
                      />
                    </div>
                  )}
                </div>

                {/* Standard Sizes Quick Pick */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                      Dimensions / Standard Size
                    </label>
                    <input
                      type="text"
                      value={formData.standardSize}
                      onChange={e => setFormData(p => ({ ...p, standardSize: e.target.value }))}
                      className="form-control"
                      placeholder="e.g. 12 × 12, 24 × 24, 3 inch, 6 inch"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                      Stock Unit
                    </label>
                    <select
                      value={formData.unit}
                      onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))}
                      className="form-control"
                    >
                      <option value="Sq. Ft.">Sq. Ft.</option>
                      <option value="Boxes">Boxes</option>
                      <option value="Pieces">Pieces</option>
                      <option value="Running Feet">Running Feet</option>
                    </select>
                  </div>
                </div>

                {/* Pricing & Stock Qty */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                      Selling Rate (Rs)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.ratePerSqFt}
                      onChange={e => setFormData(p => ({ ...p, ratePerSqFt: e.target.value }))}
                      className="form-control font-mono"
                      placeholder="380"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                      Cost Rate (Rs)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.costPerSqFt}
                      onChange={e => setFormData(p => ({ ...p, costPerSqFt: e.target.value }))}
                      className="form-control font-mono"
                      placeholder="290"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                      Stock Quantity
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.stockSqFt}
                      onChange={e => setFormData(p => ({ ...p, stockSqFt: e.target.value, stockPieces: e.target.value }))}
                      className="form-control font-mono"
                      placeholder="4500"
                    />
                  </div>
                </div>

                {/* Location & Min Stock Alert */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                      Yard Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
                      className="form-control"
                      placeholder="Yard Shed 1 - Bay A"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                      Low Stock Alert Threshold
                    </label>
                    <input
                      type="number"
                      value={formData.minStockAlert}
                      onChange={e => setFormData(p => ({ ...p, minStockAlert: e.target.value }))}
                      className="form-control font-mono"
                      placeholder="200"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                    Remarks / Notes
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    className="form-control"
                    placeholder="Specific marble details, polish finish, usage instructions..."
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: "#2563eb" }}>
                  {editingItem ? "Save Changes" : "Create Item"}
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
