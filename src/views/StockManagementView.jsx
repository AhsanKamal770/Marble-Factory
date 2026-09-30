import React, { useState, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Plus, Search, AlertTriangle, Check, X, MoreVertical,
  Layers, Gem, Flower2, Ruler, Grid3X3, Wrench, ChevronRight,
  PackagePlus, ChevronDown, Package, MapPin, Tag,
  ArrowUpDown, Edit2, Trash2, SlidersHorizontal,
} from "lucide-react";
import { db, adjustItemStock, logStockMovement } from "../db/index";
import Modal from "../shared/components/Modal";
import SutarBadge from "../components/SutarBadge";

// ─────────────────────────────────────────────────────────────────────────────
// CONCEPT: Domain-Driven Category Configuration
// Each product family has different: stock unit, size quick-picks, Sutar
// applicability. Centralising this avoids scattered conditionals in JSX.
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "ALL",                label: "All Items",          icon: Layers,       hasSutar: false, defaultUnit: "Sq. Ft." },
  { key: "Marble Slabs",       label: "Marble Slabs",       icon: Gem,          hasSutar: true,  defaultUnit: "Sq. Ft.",      defaultSizes: ["Random Slabs (3-6 ft)", "Random Slabs (4-8 ft)", "Jumbo Slabs (6-10 ft)"] },
  { key: "Marble Tiles",       label: "Marble Tiles",       icon: Grid3X3,      hasSutar: true,  defaultUnit: "Sq. Ft.",      defaultSizes: ["12x12 in", "12x24 in", "6x12 in", "6x24 in", "18x18 in", "24x24 in"] },
  { key: "Flower Medallions",  label: "Flower Medallions",  icon: Flower2,      hasSutar: false, defaultUnit: "Pieces",       defaultSizes: ["12x12 in (1 Sq Ft)", "24x24 in (4 Sq Ft)", "3x3 ft (9 Sq Ft)"] },
  { key: "Borders & Patti",    label: "Borders & Patti",    icon: Ruler,        hasSutar: false, defaultUnit: "Running Feet", defaultSizes: ["2 inch wide", "3 inch wide", "6 inch wide"] },
  { key: "Porcelain & Panels", label: "Porcelain & Panels", icon: Grid3X3,      hasSutar: false, defaultUnit: "Boxes",        defaultSizes: ["12x24 in", "16x16 in", "24x24 in", "24x48 in", "3D Wall Panels"] },
  { key: "Accessories",        label: "Accessories",        icon: Wrench,       hasSutar: false, defaultUnit: "Pieces",       defaultSizes: ["Bond Adhesive (Bag)", "Filling / Grout (Bag)", "Spacers (Pack)", "Golla / Chamfer (Pcs)"] },
  { key: "Granite",            label: "Granite",            icon: Gem,          hasSutar: false, defaultUnit: "Sq. Ft.",      defaultSizes: ["Random Slabs", "Jumbo Slabs (8x3 ft)", "Cut-to-Size"] },
  { key: "Steps & Risers",     label: "Steps & Risers",     icon: ChevronRight, hasSutar: true,  defaultUnit: "Pieces",       defaultSizes: ["4ft Step + Riser Set", "3ft Step + Riser Set", "Custom Size"] },
];

// CONCEPT: Unit-Aware Stock — each product family tracks stock in a different
// primary unit. Routing display to the correct field prevents semantic errors.
function getStockDisplay(item) {
  const unit = item.unit || "Sq. Ft.";
  switch (unit) {
    case "Running Feet": return { qty: Number(item.stockSqFt || 0), unit: "Rft",   sub: item.stockPieces > 0 ? `${item.stockPieces} pcs` : null };
    case "Pieces":       return { qty: Number(item.stockPieces || 0), unit: "Pcs", sub: item.stockBoxes > 0 ? `${item.stockBoxes} boxes` : null };
    case "Boxes":        return { qty: Number(item.stockBoxes || 0), unit: "Boxes", sub: item.stockSqFt > 0 ? `${Number(item.stockSqFt).toLocaleString()} sq.ft` : null };
    default:             return { qty: Number(item.stockSqFt || 0), unit: "Sq.Ft", sub: item.stockBoxes > 0 ? `${item.stockBoxes} boxes` : null };
  }
}

function isLowStock(item) {
  const unit = item.unit || "Sq. Ft.";
  const t = Number(item.minStockAlert) || 0;
  if (t === 0) return false;
  switch (unit) {
    case "Running Feet": return Number(item.stockSqFt || 0) <= t;
    case "Pieces":       return Number(item.stockPieces || 0) <= t;
    case "Boxes":        return Number(item.stockBoxes || 0) <= t;
    default:             return Number(item.stockSqFt || 0) <= t;
  }
}

function isOutOfStock(item) {
  const unit = item.unit || "Sq. Ft.";
  switch (unit) {
    case "Running Feet": return Number(item.stockSqFt || 0) === 0;
    case "Pieces":       return Number(item.stockPieces || 0) === 0;
    case "Boxes":        return Number(item.stockBoxes || 0) === 0;
    default:             return Number(item.stockSqFt || 0) === 0;
  }
}

const SUTAR_OPTIONS = [
  { value: "4",  label: "4 Sutar",  desc: "~12 mm  Decorative / Light" },
  { value: "6",  label: "6 Sutar",  desc: "~18 mm  Kitchen / Stairs / Lift" },
  { value: "9",  label: "9 Sutar",  desc: "~28 mm  Heavy Flooring" },
  { value: "14", label: "14 Sutar", desc: "~44 mm  Industrial / Steps" },
];

const INITIAL_FORM = {
  code: "", name: "", category: "Marble Slabs", subCategory: "",
  finish: "Polished", grade: "Grade A", sutarThickness: "6", thicknessMm: 18,
  standardSize: "", unit: "Sq. Ft.", ratePerSqFt: 0, costPerSqFt: 0,
  stockSqFt: 0, stockBoxes: 0, stockPieces: 0, minStockAlert: 200,
  lotNo: "", location: "Yard Shed 1", notes: "",
};

// ── Category Dropdown ──────────────────────────────────────────────────────
function CategoryDropdown({ value, onChange, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const currentCat = CATEGORIES.find(c => c.key === value) || CATEGORIES[0];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          padding: "0 14px", height: "38px",
          background: "var(--bg-card)", border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)", color: "var(--text-primary)",
          fontSize: "0.85rem", fontWeight: 500, cursor: "pointer",
          whiteSpace: "nowrap", transition: "border-color 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-blue)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-color)"}
      >
        <SlidersHorizontal size={13} style={{ color: "var(--text-muted)" }} />
        <span>{currentCat.label}</span>
        <ChevronDown size={13} style={{ color: "var(--text-muted)", marginLeft: "2px" }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", left: 0, top: "calc(100% + 6px)", zIndex: 300,
          background: "var(--bg-card)", border: "1px solid var(--border-color)",
          borderRadius: "10px", boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
          minWidth: "210px", overflow: "hidden", padding: "4px 0",
        }}>
          {CATEGORIES.map(cat => {
            const count = cat.key === "ALL" ? items.length : items.filter(i => i.category === cat.key).length;
            const isActive = value === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => { onChange(cat.key); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "8px 14px",
                  background: isActive ? "rgba(37,99,235,0.07)" : "none",
                  border: "none", textAlign: "left", cursor: "pointer",
                  color: isActive ? "var(--accent-blue)" : "var(--text-primary)",
                  fontSize: "0.83rem", fontWeight: isActive ? 600 : 400,
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "none"; }}
              >
                <span>{cat.label}</span>
                {count > 0 && (
                  <span style={{
                    fontSize: "0.72rem", color: "var(--text-muted)",
                    background: "var(--bg-primary)", padding: "1px 7px",
                    borderRadius: "10px", fontWeight: 600,
                  }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Row overflow menu component ────────────────────────────────────────────
function RowMenu({ item, onView, onAdjust, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const menuItem = (label, onClick, danger) => (
    <button
      key={label}
      onClick={(e) => { e.stopPropagation(); setOpen(false); onClick(); }}
      style={{
        display: "block", width: "100%", padding: "8px 14px",
        background: "none", border: "none", textAlign: "left",
        fontSize: "0.8rem", cursor: "pointer",
        color: danger ? "#ef4444" : "var(--text-primary)",
        fontWeight: 500,
      }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
      onMouseLeave={e => e.currentTarget.style.background = "none"}
    >
      {label}
    </button>
  );

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        style={{
          background: "none", border: "none", cursor: "pointer",
          padding: "4px 8px", borderRadius: "6px",
          color: "var(--text-muted)", display: "flex", alignItems: "center",
          transition: "background 0.12s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
        onMouseLeave={e => e.currentTarget.style.background = "none"}
        title="Actions"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 200,
          background: "var(--bg-card)", border: "1px solid var(--border-color)",
          borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          minWidth: "160px", overflow: "hidden", padding: "4px 0",
        }}>
          {menuItem("View Details", () => onView(item))}
          {menuItem("Edit", () => onEdit(item))}
          {menuItem("Adjust Stock", () => onAdjust(item))}
          {menuItem("Delete", () => onDelete(item), true)}
        </div>
      )}
    </div>
  );
}

// ── Item Details Drawer ────────────────────────────────────────────────────
// CONCEPT: Progressive Disclosure
// The drawer pattern lets the main table stay focused on scanning essentials
// while the drawer surfaces complete item details on demand. This avoids the
// "database dump" feel of trying to show everything in every row.
function ItemDetailsDrawer({ item, onClose, onEdit, onAdjust }) {
  const sd = getStockDisplay(item);
  const low = isLowStock(item);
  const out = isOutOfStock(item);
  const stockStatus = out ? "Out of stock" : low ? "Low stock" : "In stock";
  const stockColor = out ? "#ef4444" : low ? "#f59e0b" : "#10b981";

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const Row = ({ label, value, mono }) => (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      padding: "10px 0", borderBottom: "1px solid var(--border-divider, rgba(0,0,0,0.05))",
    }}>
      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
      <span style={{
        fontSize: "0.83rem", color: "var(--text-primary)", fontWeight: 500,
        fontFamily: mono ? "monospace" : "inherit", textAlign: "right", maxWidth: "60%",
      }}>{value || "—"}</span>
    </div>
  );

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 400,
          background: "rgba(0,0,0,0.25)",
          animation: "fadeIn 0.18s ease",
        }}
      />
      {/* Drawer Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 401,
        width: "min(420px, 95vw)",
        background: "var(--bg-card)",
        borderLeft: "1px solid var(--border-color)",
        boxShadow: "-16px 0 48px rgba(0,0,0,0.12)",
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.22s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* Drawer Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--border-color)",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px",
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>
              {item.name}
            </div>
            {item.subCategory && (
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "3px" }}>{item.subCategory}</div>
            )}
            <div style={{ fontSize: "0.72rem", color: "var(--accent-blue)", fontFamily: "monospace", marginTop: "6px", letterSpacing: "0.04em" }}>
              {item.code}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "4px", color: "var(--text-muted)", borderRadius: "6px",
              display: "flex", alignItems: "center", flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px" }}>

          {/* Stock Summary — most important info first */}
          <div style={{
            margin: "20px 0 4px",
            padding: "16px 18px",
            background: "var(--bg-primary)",
            borderRadius: "10px",
            border: "1px solid var(--border-color)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
                  Current Stock
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "monospace", lineHeight: 1 }}>
                  {sd.qty.toLocaleString()}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px" }}>{sd.unit}</div>
                {sd.sub && (
                  <div style={{ fontSize: "0.73rem", color: "var(--text-muted)", marginTop: "2px" }}>{sd.sub}</div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px", justifyContent: "flex-end" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: stockColor, flexShrink: 0 }} />
                  <span style={{ fontSize: "0.78rem", color: stockColor, fontWeight: 600 }}>{stockStatus}</span>
                </div>
                {item.minStockAlert > 0 && (
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    Alert at {Number(item.minStockAlert).toLocaleString()} {sd.unit}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div style={{ margin: "16px 0 4px" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "2px" }}>
              Pricing
            </div>
            <Row label="Selling Rate" value={`Rs. ${Number(item.ratePerSqFt || 0).toLocaleString()} / ${item.unit || "Sq. Ft."}`} />
            {item.costPerSqFt > 0 && <Row label="Cost Price" value={`Rs. ${Number(item.costPerSqFt).toLocaleString()} / ${item.unit || "Sq. Ft."}`} />}
          </div>

          {/* Product Details */}
          <div style={{ margin: "16px 0 4px" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "2px" }}>
              Product Details
            </div>
            <Row label="Category" value={item.category} />
            <Row label="Stock Unit" value={item.unit || "Sq. Ft."} />
            {item.sutarThickness && <Row label="Sutar Thickness" value={`${item.sutarThickness} Sutar`} />}
            {item.thicknessMm > 0 && <Row label="Thickness" value={`${item.thicknessMm} mm`} />}
            {item.grade && <Row label="Grade / Quality" value={item.grade} />}
            {item.standardSize && <Row label="Standard Size" value={item.standardSize} />}
            {item.finish && <Row label="Finish" value={item.finish} />}
          </div>

          {/* Storage */}
          <div style={{ margin: "16px 0 4px" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "2px" }}>
              Storage
            </div>
            <Row label="Location" value={item.location || "Yard"} />
            {item.lotNo && <Row label="Lot / Batch" value={item.lotNo} mono />}
          </div>

          {/* Notes */}
          {item.notes && (
            <div style={{ margin: "16px 0 20px" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "8px" }}>
                Notes
              </div>
              <div style={{ fontSize: "0.83rem", color: "var(--text-secondary)", lineHeight: 1.5, padding: "10px 14px", background: "var(--bg-primary)", borderRadius: "8px" }}>
                {item.notes}
              </div>
            </div>
          )}
          <div style={{ height: "24px" }} />
        </div>

        {/* Drawer Footer — primary actions */}
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid var(--border-color)",
          display: "flex", gap: "10px",
        }}>
          <button
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: "0.83rem" }}
            onClick={() => { onClose(); onAdjust(item); }}
          >
            Adjust Stock
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1, fontSize: "0.83rem" }}
            onClick={() => { onClose(); onEdit(item); }}
          >
            <Edit2 size={13} /> Edit Item
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideInRight { from { transform:translateX(100%) } to { transform:translateX(0) } }
      `}</style>
    </>
  );
}

// ── Main view ──────────────────────────────────────────────────────────────
export default function StockManagementView() {
  const items = useLiveQuery(() => db.items.orderBy("name").toArray(), []) || [];
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustType, setAdjustType] = useState("Adjustment");
  const [adjustNote, setAdjustNote] = useState("");
  // CONCEPT: Progressive Disclosure — drawer state
  const [drawerItem, setDrawerItem] = useState(null);

  const activeCatConfig = CATEGORIES.find(c => c.key === formData.category) || CATEGORIES[0];

  const handleCategoryChange = (newCategory) => {
    const catConfig = CATEGORIES.find(c => c.key === newCategory) || CATEGORIES[1];
    setFormData(prev => ({
      ...prev, category: newCategory, unit: catConfig.defaultUnit,
      standardSize: catConfig.defaultSizes?.[0] || "",
      sutarThickness: catConfig.hasSutar ? prev.sutarThickness : "",
    }));
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({ ...INITIAL_FORM, code: `MB-${Date.now().toString().slice(-5)}`, lotNo: `LOT-${new Date().getFullYear()}` });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => { setEditingItem(item); setFormData({ ...INITIAL_FORM, ...item }); setIsModalOpen(true); };

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
        await logStockMovement({ itemId: addedId, itemName: formData.name, category: formData.category, movementType: "Initial", changeSqFt: payload.stockSqFt, changeBoxes: payload.stockBoxes, changePieces: payload.stockPieces, previousSqFt: 0, newSqFt: payload.stockSqFt, refDocNo: "MANUAL-ENTRY", note: "New item added to catalog" });
      }
      setIsModalOpen(false);
    } catch (err) { alert("Error saving item: " + err.message); }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    await db.items.delete(item.id);
    if (drawerItem?.id === item.id) setDrawerItem(null);
  };

  const handleOpenAdjust = (item) => { setAdjustingItem(item); setAdjustQty(""); setAdjustNote(""); setAdjustType("Adjustment"); setIsAdjustModalOpen(true); };

  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustingItem || !adjustQty) return;
    const delta = parseFloat(adjustQty);
    const unit = adjustingItem.unit || "Sq. Ft.";
    const deltaSqFt   = (unit === "Sq. Ft." || unit === "Running Feet") ? delta : 0;
    const deltaBoxes  = unit === "Boxes" ? delta : 0;
    const deltaPieces = unit === "Pieces" ? delta : 0;
    try {
      await adjustItemStock(adjustingItem.id, deltaSqFt, deltaBoxes, deltaPieces, adjustType, "MANUAL-ADJUST", adjustNote || "Manual stock correction");
      setIsAdjustModalOpen(false);
    } catch (err) { alert("Error adjusting stock: " + err.message); }
  };

  const filteredItems = items.filter(item => {
    const q = searchTerm.toLowerCase();
    const m = item.name?.toLowerCase().includes(q) || item.code?.toLowerCase().includes(q) || item.lotNo?.toLowerCase().includes(q) || item.location?.toLowerCase().includes(q) || item.subCategory?.toLowerCase().includes(q);
    if (!m) return false;
    if (selectedCategory === "ALL") return true;
    return item.category === selectedCategory;
  });

  const lowStockCount = items.filter(isLowStock).length;

  // ── CSS-in-JS tokens ──────────────────────────────────────────────────────
  const TH = {
    padding: "11px 20px", fontSize: "0.7rem", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.06em",
    color: "var(--text-muted)", background: "var(--bg-primary)",
    borderBottom: "1px solid var(--border-color)", whiteSpace: "nowrap",
    textAlign: "left",
  };
  const TD = {
    padding: "18px 20px", verticalAlign: "top",
    borderBottom: "1px solid var(--border-divider, rgba(0,0,0,0.05))",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>

      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      {/* CONCEPT: Page Identity — a clear header gives the screen a name,
          purpose, and context. Without it the interface feels like a raw tool
          rather than an intentional product screen.                          */}
      <div style={{ paddingBottom: "22px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{
              fontSize: "1.45rem", fontWeight: 800, color: "var(--text-primary)",
              letterSpacing: "-0.02em", lineHeight: 1, margin: 0,
            }}>
              Inventory
            </h1>
            <p style={{
              fontSize: "0.83rem", color: "var(--text-muted)", marginTop: "5px",
              fontWeight: 400, lineHeight: 1,
            }}>
              Manage marble, tiles, slabs and other materials
              {items.length > 0 && (
                <span style={{ marginLeft: "10px", color: "var(--text-muted)", opacity: 0.6 }}>
                  · {items.length} items
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── TOP CONTROLS ────────────────────────────────────────────────── */}
      {/* CONCEPT: Control Bar Design — one horizontal bar with:
          [Search dominant] [Category filter secondary] [CTA right-anchored]
          This is the ERP/SaaS pattern: search first, filter second, create last.
          No card container — whitespace and alignment do the separation work.  */}
      <div style={{
        display: "flex", gap: "10px", alignItems: "center",
        marginBottom: "18px", flexWrap: "wrap",
      }}>
        {/* Search — visually dominant, takes remaining space */}
        <div style={{ position: "relative", flex: "1 1 280px", minWidth: "200px" }}>
          <Search size={14} style={{
            position: "absolute", left: "13px", top: "50%",
            transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none",
          }} />
          <input
            type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search inventory, item code, lot, location..."
            style={{
              width: "100%", padding: "9px 14px 9px 38px", fontSize: "0.88rem",
              background: "var(--bg-card)", border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none",
              boxSizing: "border-box", height: "38px",
              transition: "border-color 0.15s",
            }}
            onFocus={e => e.target.style.borderColor = "var(--accent-blue)"}
            onBlur={e => e.target.style.borderColor = "var(--border-color)"}
          />
        </div>

        {/* Category filter dropdown — compact secondary control */}
        <CategoryDropdown
          value={selectedCategory}
          onChange={setSelectedCategory}
          items={items}
        />

        {/* Low-stock warning — situational, shown only when relevant */}
        {lowStockCount > 0 && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            padding: "0 11px", height: "38px", borderRadius: "var(--radius-md)",
            background: "rgba(239,68,68,0.07)", color: "#ef4444",
            fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap",
            border: "1px solid rgba(239,68,68,0.18)",
          }}>
            <AlertTriangle size={12} /> {lowStockCount} low stock
          </span>
        )}

        {/* Primary CTA — right-anchored, always visible */}
        <button
          className="btn btn-primary"
          onClick={handleOpenAddModal}
          id="add-catalog-item-btn"
          style={{ whiteSpace: "nowrap", flexShrink: 0, height: "38px" }}
        >
          <Plus size={14} /> Add New Variety
        </button>
      </div>

      {/* ── TABLE ───────────────────────────────────────────────────────── */}
      {/* CONCEPT: "The table IS the content" — no wrapping card with its own
          header. The table surface is the interface. Subtle separators, no
          vertical borders, comfortable row height, strong alignment.          */}
      <div style={{
        background: "var(--bg-card)", borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-color)", overflow: "hidden",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: "900px", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...TH, minWidth: "240px" }}>Product</th>
                <th style={{ ...TH, minWidth: "130px" }}>Category</th>
                <th style={{ ...TH, minWidth: "110px" }}>Thickness</th>
                <th style={{ ...TH, minWidth: "140px" }}>Size & Finish</th>
                <th style={{ ...TH, minWidth: "110px", textAlign: "right" }}>Rate</th>
                <th style={{ ...TH, minWidth: "130px" }}>Stock</th>
                <th style={{ ...TH, minWidth: "160px" }}>Location</th>
                <th style={{ ...TH, width: "44px", textAlign: "center" }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "72px 20px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    <PackagePlus size={28} style={{ opacity: 0.2, display: "block", margin: "0 auto 12px" }} />
                    {searchTerm
                      ? <>No items match <strong>"{searchTerm}"</strong></>
                      : "No items in this category yet. Click Add New Variety to get started."
                    }
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const low = isLowStock(item);
                  const out = isOutOfStock(item);
                  const sd = getStockDisplay(item);
                  const isLast = idx === filteredItems.length - 1;
                  const rowTD = { ...TD, borderBottom: isLast ? "none" : TD.borderBottom };
                  const stockStatus = out ? "Out of stock" : low ? "Low stock" : "In stock";
                  const stockColor = out ? "#ef4444" : low ? "#f59e0b" : "#10b981";

                  return (
                    // CONCEPT: Row Interaction — the entire row is clickable to open
                    // the details drawer. This signals the row is a navigation target,
                    // not just a data display. The hover state confirms the affordance.
                    <tr
                      key={item.id}
                      onClick={() => setDrawerItem(item)}
                      style={{ transition: "background 0.1s", cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-primary)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {/* ── Product ─────────────────────────────────────── */}
                      {/* CONCEPT: Visual Hierarchy — product name is the anchor.
                          Variety is secondary. Item code is tertiary/monospace.   */}
                      <td style={rowTD}>
                        <div style={{
                          fontWeight: 700, fontSize: "0.92rem",
                          color: "var(--text-primary)", lineHeight: 1.35,
                        }}>
                          {item.name}
                        </div>
                        {item.subCategory && (
                          <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            {item.subCategory}
                          </div>
                        )}
                        <div style={{
                          fontSize: "0.7rem", fontWeight: 600,
                          color: "var(--accent-blue)", fontFamily: "monospace",
                          marginTop: "4px", letterSpacing: "0.03em",
                        }}>
                          {item.code}
                        </div>
                      </td>

                      {/* ── Category ────────────────────────────────────── */}
                      <td style={rowTD}>
                        <div style={{ fontSize: "0.84rem", color: "var(--text-primary)", fontWeight: 500 }}>
                          {item.category}
                        </div>
                        <div style={{ fontSize: "0.73rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          {item.unit || "Sq. Ft."}
                        </div>
                      </td>

                      {/* ── Thickness ───────────────────────────────────── */}
                      <td style={rowTD}>
                        {item.sutarThickness ? (
                          <>
                            <div style={{ marginBottom: "2px" }}>
                              <SutarBadge sutar={item.sutarThickness} size="sm" />
                            </div>
                            {item.thicknessMm > 0 && (
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1px" }}>
                                {item.thicknessMm} mm
                              </div>
                            )}
                          </>
                        ) : item.thicknessMm > 0 ? (
                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                            {item.thicknessMm} mm
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>—</span>
                        )}
                        {item.grade && (
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            {item.grade}
                          </div>
                        )}
                      </td>

                      {/* ── Size & Finish ────────────────────────────────── */}
                      <td style={rowTD}>
                        <div style={{
                          fontSize: "0.83rem", color: "var(--text-primary)",
                          maxWidth: "140px", overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {item.standardSize || "—"}
                        </div>
                        {item.finish && (
                          <div style={{ fontSize: "0.73rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            {item.finish}
                          </div>
                        )}
                      </td>

                      {/* ── Rate ────────────────────────────────────────── */}
                      {/* Selling price is the primary business metric.       */}
                      <td style={{ ...rowTD, textAlign: "right" }}>
                        <div style={{
                          fontSize: "0.95rem", fontWeight: 700,
                          color: "var(--text-primary)", fontFamily: "monospace",
                        }}>
                          {Number(item.ratePerSqFt || 0).toLocaleString()}
                        </div>
                        {item.costPerSqFt > 0 && (
                          <div style={{
                            fontSize: "0.71rem", color: "var(--text-muted)",
                            marginTop: "2px", fontFamily: "monospace",
                          }}>
                            Cost {Number(item.costPerSqFt).toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* ── Stock ───────────────────────────────────────── */}
                      {/* CONCEPT: "Stock is DATA not a button."
                          Quantity dominant. Unit muted. Status = tiny dot.     */}
                      <td style={rowTD}>
                        <div style={{
                          fontSize: "1.05rem", fontWeight: 800,
                          color: out ? "#ef4444" : low ? "#f59e0b" : "var(--text-primary)",
                          fontFamily: "monospace", lineHeight: 1,
                        }}>
                          {sd.qty.toLocaleString()}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          {sd.unit}
                        </div>
                        {sd.sub && (
                          <div style={{ fontSize: "0.69rem", color: "var(--text-muted)", marginTop: "1px" }}>
                            {sd.sub}
                          </div>
                        )}
                        {/* Tiny status indicator — NOT a pill, NOT a badge */}
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "5px" }}>
                          <span style={{
                            width: "5px", height: "5px", borderRadius: "50%",
                            background: stockColor, flexShrink: 0,
                          }} />
                          <span style={{ fontSize: "0.68rem", color: stockColor, fontWeight: 600 }}>
                            {stockStatus}
                          </span>
                        </div>
                      </td>

                      {/* ── Location ────────────────────────────────────── */}
                      <td style={rowTD}>
                        <div style={{ fontSize: "0.84rem", color: "var(--text-primary)" }}>
                          {item.location || "Yard"}
                        </div>
                        {item.lotNo && (
                          <div style={{
                            fontSize: "0.7rem", color: "var(--text-muted)",
                            fontFamily: "monospace", marginTop: "2px",
                          }}>
                            {item.lotNo}
                          </div>
                        )}
                      </td>

                      {/* ── Actions: single ⋮ overflow menu ─────────────── */}
                      <td style={{ ...rowTD, textAlign: "center", padding: "18px 8px" }}>
                        <RowMenu
                          item={item}
                          onView={setDrawerItem}
                          onAdjust={handleOpenAdjust}
                          onEdit={handleOpenEditModal}
                          onDelete={handleDeleteItem}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer — subtle count, not a card */}
        {filteredItems.length > 0 && (
          <div style={{
            padding: "11px 20px", borderTop: "1px solid var(--border-color)",
            fontSize: "0.73rem", color: "var(--text-muted)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span>
              {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}
              {selectedCategory !== "ALL" && ` in ${selectedCategory}`}
            </span>
            {lowStockCount > 0 && (
              <span style={{ color: "#ef4444", fontWeight: 600 }}>
                {lowStockCount} low stock
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Item Details Drawer ──────────────────────────────────────────── */}
      {drawerItem && (
        <ItemDetailsDrawer
          item={drawerItem}
          onClose={() => setDrawerItem(null)}
          onEdit={handleOpenEditModal}
          onAdjust={handleOpenAdjust}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ADD / EDIT MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingItem ? `Edit: ${editingItem.name}` : "Add New Catalog Item"}
          icon={PackagePlus}
          size="lg"
          footerActions={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSaveItem}>
                <Check size={16} /> {editingItem ? "Save Changes" : "Add to Catalog"}
              </button>
            </>
          }
        >
            <form id="catalog-form" onSubmit={handleSaveItem}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "12px" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Item Code *</label>
                    <input type="text" required className="form-control font-mono" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Variety / Product Name *</label>
                    <input type="text" required className="form-control" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Ziarat White Super Slab" />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 140px", gap: "12px" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Category *</label>
                    <select className="form-control" value={formData.category} onChange={e => handleCategoryChange(e.target.value)}>
                      {CATEGORIES.filter(c => c.key !== "ALL").map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Sub-Category</label>
                    <input type="text" className="form-control" value={formData.subCategory} onChange={e => setFormData({ ...formData, subCategory: e.target.value })} placeholder="e.g. Ziarat Marble" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Stock Unit</label>
                    <select className="form-control" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                      <option>Sq. Ft.</option><option>Running Feet</option><option>Pieces</option><option>Boxes</option>
                    </select>
                  </div>
                </div>

                {activeCatConfig.hasSutar && (
                  <div>
                    <label className="form-label" style={{ marginBottom: "8px", display: "block" }}>Sutar Thickness</label>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {SUTAR_OPTIONS.map(opt => {
                        const isSel = formData.sutarThickness === opt.value;
                        return (
                          <button key={opt.value} type="button"
                            onClick={() => setFormData({ ...formData, sutarThickness: opt.value })}
                            style={{ padding: "8px 16px", borderRadius: "8px", border: `2px solid ${isSel ? "var(--accent-blue)" : "var(--border-color)"}`, background: isSel ? "rgba(37,99,235,0.08)" : "transparent", color: isSel ? "var(--accent-blue)" : "var(--text-secondary)", cursor: "pointer", textAlign: "left", transition: "all 0.12s ease" }}>
                            <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>{opt.label}</div>
                            <div style={{ fontSize: "0.68rem", opacity: 0.75, marginTop: "1px" }}>{opt.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Standard Size</label>
                    {activeCatConfig.defaultSizes ? (
                      <select className="form-control" value={formData.standardSize} onChange={e => setFormData({ ...formData, standardSize: e.target.value })}>
                        <option value="">- Select -</option>
                        {activeCatConfig.defaultSizes.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <input type="text" className="form-control" value={formData.standardSize} onChange={e => setFormData({ ...formData, standardSize: e.target.value })} placeholder="e.g. 12x24 in" />
                    )}
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Finish</label>
                    <input type="text" className="form-control" value={formData.finish} onChange={e => setFormData({ ...formData, finish: e.target.value })} placeholder="e.g. Mirror Polished" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Grade</label>
                    <input type="text" className="form-control" value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })} placeholder="e.g. Grade A" />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Sale Rate / Sq.Ft (Rs.) *</label>
                    <input type="number" required className="form-control font-mono" value={formData.ratePerSqFt} onChange={e => setFormData({ ...formData, ratePerSqFt: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Cost / Sq.Ft (Rs.)</label>
                    <input type="number" className="form-control font-mono" value={formData.costPerSqFt} onChange={e => setFormData({ ...formData, costPerSqFt: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ marginBottom: "8px", display: "block" }}>Stock & Alerts</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.72rem" }}>Sq.Ft/RFT</label>
                      <input type="number" step="0.1" className="form-control font-mono" style={{ color: "#10b981", fontWeight: 700 }} value={formData.stockSqFt} onChange={e => setFormData({ ...formData, stockSqFt: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.72rem" }}>Boxes</label>
                      <input type="number" className="form-control" value={formData.stockBoxes} onChange={e => setFormData({ ...formData, stockBoxes: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.72rem" }}>Pieces</label>
                      <input type="number" className="form-control" value={formData.stockPieces} onChange={e => setFormData({ ...formData, stockPieces: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.72rem" }}>Alert Qty</label>
                      <input type="number" className="form-control" value={formData.minStockAlert} onChange={e => setFormData({ ...formData, minStockAlert: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Location</label>
                    <input type="text" className="form-control" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. Shed 1" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Lot No.</label>
                    <input type="text" className="form-control font-mono" value={formData.lotNo} onChange={e => setFormData({ ...formData, lotNo: e.target.value })} />
                  </div>
                </div>
              </div>
            </form>
        </Modal>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          STOCK ADJUSTMENT MODAL — unit-aware label
      ══════════════════════════════════════════════════════════════════ */}
      {isAdjustModalOpen && adjustingItem && (
        <Modal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          title="Stock Adjustment"
          icon={ArrowUpDown}
          size="sm"
          footerActions={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setIsAdjustModalOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSaveAdjustment}>
                <Check size={16} /> Apply Adjustment
              </button>
            </>
          }
        >
            <form id="adjust-form" onSubmit={handleSaveAdjustment}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ padding: "12px 14px", background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.9rem" }}>{adjustingItem.name}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>{adjustingItem.category}</div>
                  <div style={{ marginTop: "8px" }}>
                    {(() => {
                      const d = getStockDisplay(adjustingItem);
                      return <span style={{ fontSize: "0.82rem" }}>Current: <strong style={{ color: "#10b981", fontFamily: "monospace" }}>{d.qty.toLocaleString()} {d.unit}</strong></span>;
                    })()}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Qty ({adjustingItem.unit || "Sq. Ft."}) *</label>
                  <input type="number" step="0.1" required autoFocus className="form-control font-mono" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="e.g. +200 to add, -50 to reduce" />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Reason</label>
                  <select className="form-control" value={adjustType} onChange={e => setAdjustType(e.target.value)}>
                    <option value="Adjustment">Yard Physical Audit Count</option>
                    <option value="Initial">Additional Loading / Purchase</option>
                    <option value="Damaged/Wastage">Damaged / Broken Scrap</option>
                    <option value="Return">Customer Return</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Reference Note</label>
                  <input type="text" className="form-control" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="e.g. Monthly yard count" />
                </div>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
}
