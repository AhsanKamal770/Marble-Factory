import React, { useState, useEffect } from "react";
import {
  Boxes, Plus, Search, Edit2, Trash2, AlertTriangle,
  ArrowUpDown, PackagePlus, Check, X,
  Layers, Gem, Flower2, Ruler, Grid3X3, Wrench, ChevronRight,
} from "lucide-react";
import { db, adjustItemStock, logStockMovement } from "../db/index";
import Badge from "../components/Badge";
import SutarBadge from "../components/SutarBadge";

// CONCEPT: Domain-Driven Category System
// The SRS defines 9 distinct product families. Each has its own:
//   - Primary stock tracking unit (Sq.Ft, Running Feet, Pieces, Boxes)
//   - Standard size quick-picks
//   - Whether Sutar thickness classification applies
// Encoding this in CATEGORIES prevents semantic mismatches in the UI.

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

// CONCEPT: Unit-Aware Stock Display
// Each product family tracks stock in a different primary unit.
// Accessories in Pieces, Borders in Running Feet, Porcelain in Boxes.
// Showing "0 Sq.Ft" for all of them would confuse the warehouse team.
function getStockDisplay(item) {
  const unit = item.unit || "Sq. Ft.";
  switch (unit) {
    case "Running Feet": return { primary: `${Number(item.stockSqFt || 0).toLocaleString()}`,   label: "Rft",   secondary: item.stockPieces > 0 ? `${item.stockPieces} pcs` : null };
    case "Pieces":       return { primary: `${Number(item.stockPieces || 0).toLocaleString()}`, label: "Pcs",   secondary: item.stockBoxes > 0 ? `${item.stockBoxes} boxes` : null };
    case "Boxes":        return { primary: `${Number(item.stockBoxes || 0).toLocaleString()}`,  label: "Boxes", secondary: item.stockSqFt > 0 ? `${Number(item.stockSqFt).toLocaleString()} sq.ft` : null };
    default:             return { primary: `${Number(item.stockSqFt || 0).toLocaleString()}`,   label: "Sq.Ft", secondary: item.stockBoxes > 0 ? `${item.stockBoxes} boxes` : null };
  }
}

function isLowStock(item) {
  const unit = item.unit || "Sq. Ft.";
  const threshold = Number(item.minStockAlert) || 0;
  if (threshold === 0) return false;
  switch (unit) {
    case "Running Feet": return Number(item.stockSqFt || 0)   <= threshold;
    case "Pieces":       return Number(item.stockPieces || 0)  <= threshold;
    case "Boxes":        return Number(item.stockBoxes || 0)   <= threshold;
    default:             return Number(item.stockSqFt || 0)   <= threshold;
  }
}

// CONCEPT: Sutar Classification — Domain Vocabulary
// Pakistani marble industry uses "Sutar" for slab thickness.
// 6 Sutar is the standard for kitchens and stairs.
// Using industry-standard terminology in the UI makes it natural for workers.
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

export default function StockManagementView() {
  const [items, setItems] = useState([]);
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

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    const all = await db.items.orderBy("name").toArray();
    setItems(all);
  };

  // CONCEPT: Derived State from Category Selection
  // When category changes, derive unit and size options automatically.
  // This prevents the bug of a "Borders & Patti" item saved with unit "Sq. Ft."
  const activeCatConfig = CATEGORIES.find(c => c.key === formData.category) || CATEGORIES[0];

  const handleCategoryChange = (newCategory) => {
    const catConfig = CATEGORIES.find(c => c.key === newCategory) || CATEGORIES[1];
    setFormData(prev => ({
      ...prev,
      category: newCategory,
      unit: catConfig.defaultUnit,
      standardSize: catConfig.defaultSizes?.[0] || "",
      sutarThickness: catConfig.hasSutar ? prev.sutarThickness : "",
    }));
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      ...INITIAL_FORM,
      code: `MB-${Date.now().toString().slice(-5)}`,
      lotNo: `LOT-${new Date().getFullYear()}`,
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
        ratePerSqFt:  parseFloat(formData.ratePerSqFt)  || 0,
        costPerSqFt:  parseFloat(formData.costPerSqFt)  || 0,
        stockSqFt:    parseFloat(formData.stockSqFt)    || 0,
        stockBoxes:   parseInt(formData.stockBoxes)     || 0,
        stockPieces:  parseInt(formData.stockPieces)    || 0,
        minStockAlert:parseFloat(formData.minStockAlert) || 0,
        thicknessMm:  parseFloat(formData.thicknessMm)  || 0,
        updatedAt: new Date().toISOString(),
      };
      if (editingItem) {
        await db.items.update(editingItem.id, payload);
      } else {
        const addedId = await db.items.add({ ...payload, createdAt: new Date().toISOString() });
        await logStockMovement({
          itemId: addedId, itemName: formData.name, category: formData.category,
          movementType: "Initial", changeSqFt: payload.stockSqFt,
          changeBoxes: payload.stockBoxes, changePieces: payload.stockPieces,
          previousSqFt: 0, newSqFt: payload.stockSqFt,
          refDocNo: "MANUAL-ENTRY", note: "New item added to catalog",
        });
      }
      setIsModalOpen(false);
      loadItems();
    } catch (err) { alert("Error saving item: " + err.message); }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    await db.items.delete(item.id);
    loadItems();
  };

  const handleOpenAdjust = (item) => {
    setAdjustingItem(item); setAdjustQty(""); setAdjustNote(""); setAdjustType("Adjustment");
    setIsAdjustModalOpen(true);
  };

  // CONCEPT: Unit-Aware Adjustment Routing
  // Different item units map to different DB fields (stockSqFt, stockBoxes, stockPieces).
  // Routing the delta to the correct field prevents applying a Box delta to Sq.Ft.
  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustingItem || !adjustQty) return;
    const delta = parseFloat(adjustQty);
    const unit = adjustingItem.unit || "Sq. Ft.";
    const deltaSqFt   = (unit === "Sq. Ft." || unit === "Running Feet") ? delta : 0;
    const deltaBoxes  = unit === "Boxes"  ? delta : 0;
    const deltaPieces = unit === "Pieces" ? delta : 0;
    try {
      await adjustItemStock(adjustingItem.id, deltaSqFt, deltaBoxes, deltaPieces, adjustType, "MANUAL-ADJUST", adjustNote || "Manual stock correction");
      setIsAdjustModalOpen(false);
      loadItems();
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
  const categoryCount = selectedCategory === "ALL" ? items.length : filteredItems.length;

  const tabBase = { display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s ease", flexShrink: 0 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* TOP BAR */}
      <div className="card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
            <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input type="text" className="input-search" style={{ paddingLeft: "36px" }} value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search marble variety, item code, lot #, shed location..." />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {lowStockCount > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "20px", background: "rgba(251,113,133,0.12)", border: "1px solid rgba(251,113,133,0.3)", color: "#fb7185", fontSize: "0.76rem", fontWeight: 700 }}>
                <AlertTriangle size={12} /> {lowStockCount} Low Stock
              </span>
            )}
            <button className="btn btn-primary" onClick={handleOpenAddModal} id="add-catalog-item-btn">
              <Plus size={16} /> Add New Variety
            </button>
          </div>
        </div>

        {/* CATEGORY TABS — each tab icon provides a second visual cue */}
        <div style={{ display: "flex", gap: "6px", overflowX: "auto", marginTop: "14px", paddingBottom: "4px" }}>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.key;
            const count = cat.key === "ALL" ? items.length : items.filter(i => i.category === cat.key).length;
            return (
              <button key={cat.key} type="button" onClick={() => setSelectedCategory(cat.key)}
                style={{ ...tabBase, border: `1px solid ${isActive ? "var(--accent-blue)" : "var(--border-color)"}`, background: isActive ? "var(--accent-blue)" : "transparent", color: isActive ? "#fff" : "var(--text-secondary)" }}>
                <Icon size={13} />
                {cat.label}
                {count > 0 && (
                  <span style={{ background: isActive ? "rgba(255,255,255,0.25)" : "var(--bg-hover)", color: isActive ? "#fff" : "var(--text-muted)", borderRadius: "10px", padding: "0 5px", fontSize: "0.68rem", fontWeight: 700, minWidth: "16px", textAlign: "center" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* INVENTORY TABLE */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Boxes size={18} className="text-gold" />
            {selectedCategory === "ALL" ? "Full Catalog" : selectedCategory}
            <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.85rem", marginLeft: "6px" }}>
              ({categoryCount} {categoryCount === 1 ? "item" : "items"})
            </span>
          </h3>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code &amp; Variety</th>
                <th>Category</th>
                <th>Sutar / Thickness</th>
                <th>Size &amp; Finish</th>
                <th>Rate</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Location / Lot</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
                    <PackagePlus size={32} style={{ opacity: 0.3, display: "block", margin: "0 auto 12px" }} />
                    {searchTerm ? `No items match "${searchTerm}"` : `No ${selectedCategory === "ALL" ? "" : selectedCategory + " "}items in catalog yet.`}
                    <div style={{ marginTop: "8px", fontSize: "0.8rem" }}>Click <strong>Add New Variety</strong> to get started.</div>
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const low = isLowStock(item);
                  const sd = getStockDisplay(item);
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="font-mono" style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent-blue)", marginBottom: "2px" }}>{item.code}</div>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.3 }}>{item.name}</div>
                        {item.subCategory && <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1px" }}>{item.subCategory}</div>}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: "0.83rem" }}>{item.category}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>{item.unit || "Sq. Ft."}</div>
                      </td>
                      <td>
                        {item.sutarThickness
                          ? <SutarBadge sutar={item.sutarThickness} />
                          : item.thicknessMm
                            ? <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{item.thicknessMm} mm</span>
                            : <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>-</span>
                        }
                        {item.grade && <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "3px" }}>{item.grade}</div>}
                      </td>
                      <td style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                        <div>{item.standardSize || "-"}</div>
                        {item.finish && <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>{item.finish}</div>}
                      </td>
                      <td>
                        <div className="font-mono" style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--accent-blue)" }}>
                          Rs. {Number(item.ratePerSqFt || 0).toLocaleString()}
                        </div>
                        {item.costPerSqFt > 0 && <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>Cost: Rs. {Number(item.costPerSqFt).toLocaleString()}</div>}
                      </td>
                      <td>
                        <div className="font-mono" style={{ fontSize: "1rem", fontWeight: 800, color: low ? "#fb7185" : "#34d399" }}>
                          {sd.primary} <span style={{ fontSize: "0.7rem", fontWeight: 600 }}>{sd.label}</span>
                        </div>
                        {sd.secondary && <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>{sd.secondary}</div>}
                      </td>
                      <td>
                        <Badge status={low ? "Low Stock" : "good"} text={low ? "Low Stock" : "In Stock"} />
                      </td>
                      <td style={{ fontSize: "0.78rem" }}>
                        <div style={{ color: "var(--text-secondary)" }}>{item.location || "Yard"}</div>
                        <div className="font-mono" style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>{item.lotNo}</div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleOpenAdjust(item)} title="Stock Adjustment"><ArrowUpDown size={13} className="text-emerald" /></button>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEditModal(item)} title="Edit"><Edit2 size={13} className="text-gold" /></button>
                          <button className="btn btn-ghost btn-sm" style={{ color: "#fb7185" }} onClick={() => handleDeleteItem(item)} title="Delete"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "720px", width: "95vw" }}>
            <div className="modal-header">
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff" }}>
                {editingItem ? `Edit: ${editingItem.name}` : "Add New Catalog Item"}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveItem}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

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
                    <label className="form-label" style={{ marginBottom: "8px", display: "block" }}>Sutar Thickness Classification</label>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {SUTAR_OPTIONS.map(opt => {
                        const isSel = formData.sutarThickness === opt.value;
                        return (
                          <button key={opt.value} type="button"
                            onClick={() => setFormData({ ...formData, sutarThickness: opt.value })}
                            style={{ padding: "8px 16px", borderRadius: "8px", border: `2px solid ${isSel ? "var(--accent-blue)" : "var(--border-color)"}`, background: isSel ? "rgba(37,99,235,0.1)" : "transparent", color: isSel ? "var(--accent-blue)" : "var(--text-secondary)", cursor: "pointer", textAlign: "left", transition: "all 0.12s ease" }}>
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
                    <label className="form-label">Grade / Quality</label>
                    <input type="text" className="form-control" value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })} placeholder="e.g. Grade A (Super)" />
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
                  <label className="form-label" style={{ marginBottom: "8px", display: "block" }}>Opening Stock &amp; Min-Alert Threshold</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.72rem" }}>Sq.Ft / RFT</label>
                      <input type="number" step="0.1" className="form-control font-mono" style={{ color: "#34d399", fontWeight: 700 }} value={formData.stockSqFt} onChange={e => setFormData({ ...formData, stockSqFt: e.target.value })} />
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
                      <label className="form-label" style={{ fontSize: "0.72rem" }}>Min Alert</label>
                      <input type="number" className="form-control" value={formData.minStockAlert} onChange={e => setFormData({ ...formData, minStockAlert: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Yard / Shed Location</label>
                    <input type="text" className="form-control" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. Shed 1 - Bay A" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Lot / Batch Number</label>
                    <input type="text" className="form-control font-mono" value={formData.lotNo} onChange={e => setFormData({ ...formData, lotNo: e.target.value })} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Notes</label>
                  <input type="text" className="form-control" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes about this variety..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  <Check size={15} /> {editingItem ? "Save Changes" : "Add to Catalog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {isAdjustModalOpen && adjustingItem && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "440px" }}>
            <div className="modal-header">
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff" }}>Stock Adjustment</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsAdjustModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveAdjustment}>
              <div className="modal-body">
                <div style={{ padding: "12px 14px", background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "8px", marginBottom: "16px" }}>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.9rem" }}>{adjustingItem.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                    {adjustingItem.sutarThickness && <SutarBadge sutar={adjustingItem.sutarThickness} />}
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{adjustingItem.category}</span>
                  </div>
                  <div style={{ marginTop: "8px" }}>
                    {(() => {
                      const d = getStockDisplay(adjustingItem);
                      return (
                        <span style={{ fontSize: "0.82rem" }}>
                          Current: <strong className="font-mono" style={{ color: "#34d399" }}>{d.primary} {d.label}</strong>
                          {d.secondary && <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>{d.secondary}</span>}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Adjustment Quantity ({adjustingItem.unit || "Sq. Ft."}) *</label>
                  <input type="number" step="0.1" required autoFocus className="form-control font-mono" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="e.g. +200 to add, -50 to reduce" />
                  <span style={{ fontSize: "0.73rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>Positive = add | Negative = reduce</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason</label>
                  <select className="form-control" value={adjustType} onChange={e => setAdjustType(e.target.value)}>
                    <option value="Adjustment">Yard Physical Audit Count</option>
                    <option value="Initial">Additional Loading / Purchase Received</option>
                    <option value="Damaged/Wastage">Damaged / Broken Scrap</option>
                    <option value="Return">Customer Return - Restocked</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Reference Note</label>
                  <input type="text" className="form-control" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="e.g. Monthly yard count - Sep 2026" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAdjustModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Check size={15} /> Apply Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
