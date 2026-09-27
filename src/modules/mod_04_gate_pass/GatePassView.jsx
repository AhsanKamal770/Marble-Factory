// ─────────────────────────────────────────────────────────────────────────────
// MOD-04: Gate Pass Management View — Rickshaw Dispatch Logistics
//
// WHAT THIS MODULE DOES:
//   Tracks every delivery that leaves the factory yard. Each gate pass records:
//   - Which invoice is being fulfilled
//   - Which vehicle and driver are carrying it
//   - The delivery destination
//   - A manifest of items going out
//   - Status: Dispatched → In Transit → Delivered
//   - Produces a printable half-page gate slip with 3 signature blocks
//
// INFORMATION ARCHITECTURE:
//   Top: Page header + controls bar (search + status filter + new pass button)
//   Middle: Table of recent gate passes (click row = detail drawer)
//   Drawer: Complete gate pass detail + print trigger
//   Modals: New gate pass entry form
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from "react";
import {
  Plus, Search, Truck, X, Check, MoreVertical, Printer,
  ChevronDown, SlidersHorizontal, PackageOpen, MapPin, User,
  Phone, FileText, ClipboardCheck, Circle,
} from "lucide-react";
import {
  createGatePass,
  getAllGatePasses,
  updateGatePassStatus,
  deleteGatePass,
  getInvoicesForLinking,
} from "./gatePassService";
import PrintableGateSlip from "./PrintableGateSlip";

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  "Dispatched":  { color: "#2563eb", bg: "rgba(37,99,235,0.08)",  dot: "#2563eb"  },
  "In Transit":  { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", dot: "#f59e0b"  },
  "Delivered":   { color: "#10b981", bg: "rgba(16,185,129,0.08)", dot: "#10b981"  },
  "Cancelled":   { color: "#6b7280", bg: "rgba(107,114,128,0.08)",dot: "#6b7280"  },
};
const ALL_STATUSES = ["All", "Dispatched", "In Transit", "Delivered", "Cancelled"];

const VEHICLE_TYPES = [
  "Qingqi Rickshaw",
  "Loader Rickshaw",
  "Pickup Truck",
  "Mazda / Truck",
  "Carry / Dala",
  "Other",
];

const INITIAL_FORM = {
  invoiceId: "", invoiceNo: "", customerName: "", destination: "",
  vehicleType: "Qingqi Rickshaw", vehicleRegNo: "", driverName: "",
  driverPhone: "", notes: "",
  // Manifest: array of { name, size, pieces, sqFt }
  manifestItems: [{ name: "", size: "", pieces: "", sqFt: "" }],
};

// ── Tiny Status Indicator ─────────────────────────────────────────────────
function StatusDot({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Dispatched"];
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      <span style={{ fontSize: "0.78rem", color: cfg.color, fontWeight: 600 }}>{status}</span>
    </div>
  );
}

// ── Status Dropdown Filter ─────────────────────────────────────────────────
function StatusDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

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
        <span>{value === "All" ? "All Status" : value}</span>
        <ChevronDown size={13} style={{ color: "var(--text-muted)" }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", left: 0, top: "calc(100% + 6px)", zIndex: 300,
          background: "var(--bg-card)", border: "1px solid var(--border-color)",
          borderRadius: "10px", boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
          minWidth: "170px", overflow: "hidden", padding: "4px 0",
        }}>
          {ALL_STATUSES.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => { onChange(s); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                width: "100%", padding: "8px 14px",
                background: value === s ? "rgba(37,99,235,0.07)" : "none",
                border: "none", textAlign: "left", cursor: "pointer",
                color: value === s ? "var(--accent-blue)" : "var(--text-primary)",
                fontSize: "0.83rem", fontWeight: value === s ? 600 : 400,
              }}
              onMouseEnter={e => { if (value !== s) e.currentTarget.style.background = "var(--bg-hover)"; }}
              onMouseLeave={e => { if (value !== s) e.currentTarget.style.background = "none"; }}
            >
              {s !== "All" && <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: STATUS_CONFIG[s]?.dot || "#888", flexShrink: 0 }} />}
              {s === "All" ? "All Status" : s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Row Menu ──────────────────────────────────────────────────────────────
function RowMenu({ gp, onView, onStatusChange, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const item = (label, onClick, danger) => (
    <button
      key={label}
      onClick={(e) => { e.stopPropagation(); setOpen(false); onClick(); }}
      style={{
        display: "block", width: "100%", padding: "8px 14px",
        background: "none", border: "none", textAlign: "left",
        fontSize: "0.8rem", cursor: "pointer",
        color: danger ? "#ef4444" : "var(--text-primary)", fontWeight: 500,
      }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
      onMouseLeave={e => e.currentTarget.style.background = "none"}
    >
      {label}
    </button>
  );

  const nextStatuses = ["Dispatched", "In Transit", "Delivered", "Cancelled"].filter(s => s !== gp.status);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        style={{
          background: "none", border: "none", cursor: "pointer",
          padding: "4px 8px", borderRadius: "6px",
          color: "var(--text-muted)", display: "flex", alignItems: "center",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
        onMouseLeave={e => e.currentTarget.style.background = "none"}
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 200,
          background: "var(--bg-card)", border: "1px solid var(--border-color)",
          borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          minWidth: "175px", overflow: "hidden", padding: "4px 0",
        }}>
          {item("View Details", () => onView(gp))}
          {nextStatuses.length > 0 && (
            <div style={{ padding: "4px 14px 2px", fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Mark as
            </div>
          )}
          {nextStatuses.map(s => item(`→ ${s}`, () => onStatusChange(gp.id, s)))}
          {item("Delete", () => onDelete(gp.id), true)}
        </div>
      )}
    </div>
  );
}

// ── Gate Pass Detail Drawer ────────────────────────────────────────────────
function GatePassDrawer({ gp, onClose, onPrint, onStatusChange }) {
  const cfg = STATUS_CONFIG[gp.status] || STATUS_CONFIG["Dispatched"];
  const dispatchDate = gp.dispatchDate
    ? new Date(gp.dispatchDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
  const dispatchTime = gp.dispatchDate
    ? new Date(gp.dispatchDate).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true })
    : "—";

  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);

  const Row = ({ label, value, mono }) => (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      padding: "10px 0", borderBottom: "1px solid var(--border-divider, rgba(0,0,0,0.05))",
    }}>
      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
      <span style={{
        fontSize: "0.83rem", color: "var(--text-primary)", fontWeight: 500,
        fontFamily: mono ? "monospace" : "inherit", textAlign: "right",
      }}>{value || "—"}</span>
    </div>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.25)", animation: "fadeIn 0.18s ease" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 401,
        width: "min(440px, 95vw)", background: "var(--bg-card)",
        borderLeft: "1px solid var(--border-color)",
        boxShadow: "-16px 0 48px rgba(0,0,0,0.12)",
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.22s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>
              {gp.gatePassNo}
            </div>
            <div style={{ marginTop: "5px" }}>
              <StatusDot status={gp.status} />
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--text-muted)", borderRadius: "6px", display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px" }}>

          {/* Dispatch Info Card */}
          <div style={{ margin: "20px 0 4px", padding: "14px 16px", background: "var(--bg-primary)", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Date</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>{dispatchDate}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{dispatchTime}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Invoice</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--accent-blue)", marginTop: "2px", fontFamily: "monospace" }}>{gp.invoiceNo || "—"}</div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div style={{ margin: "16px 0 4px" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "2px" }}>Customer & Delivery</div>
            <Row label="Customer / Consignee" value={gp.customerName} />
            <Row label="Destination" value={gp.destination} />
          </div>

          <div style={{ margin: "16px 0 4px" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "2px" }}>Vehicle & Driver</div>
            <Row label="Vehicle Type" value={gp.vehicleType} />
            <Row label="Registration #" value={gp.vehicleRegNo} mono />
            <Row label="Driver Name" value={gp.driverName} />
            <Row label="Driver Mobile" value={gp.driverPhone} mono />
          </div>

          {/* Manifest */}
          {(gp.manifest || []).length > 0 && (
            <div style={{ margin: "16px 0 4px" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "8px" }}>Dispatch Manifest</div>
              <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-primary)" }}>
                      <th style={{ padding: "7px 10px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>Item</th>
                      <th style={{ padding: "7px 10px", textAlign: "center", color: "var(--text-muted)", fontWeight: 600 }}>Size</th>
                      <th style={{ padding: "7px 10px", textAlign: "center", color: "var(--text-muted)", fontWeight: 600 }}>Pcs</th>
                      <th style={{ padding: "7px 10px", textAlign: "right", color: "var(--text-muted)", fontWeight: 600 }}>Sq.Ft</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(gp.manifest || []).map((row, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--border-divider, rgba(0,0,0,0.05))" }}>
                        <td style={{ padding: "7px 10px", color: "var(--text-primary)" }}>{row.name}</td>
                        <td style={{ padding: "7px 10px", textAlign: "center", color: "var(--text-muted)" }}>{row.size || "—"}</td>
                        <td style={{ padding: "7px 10px", textAlign: "center", color: "var(--text-muted)" }}>{row.pieces || "—"}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right", color: "var(--text-primary)", fontFamily: "monospace" }}>{row.sqFt ? Number(row.sqFt).toFixed(2) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {gp.notes && (
            <div style={{ margin: "16px 0 20px" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "8px" }}>Notes</div>
              <div style={{ fontSize: "0.83rem", color: "var(--text-secondary)", padding: "10px 14px", background: "var(--bg-primary)", borderRadius: "8px" }}>{gp.notes}</div>
            </div>
          )}

          <div style={{ height: "24px" }} />
        </div>

        {/* Footer actions */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-color)", display: "flex", gap: "10px" }}>
          <button className="btn btn-secondary" style={{ flex: 1, fontSize: "0.83rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }} onClick={onPrint}>
            <Printer size={14} /> Print Slip
          </button>
          {gp.status === "Dispatched" && (
            <button className="btn btn-primary" style={{ flex: 1, fontSize: "0.83rem" }} onClick={() => { onStatusChange(gp.id, "Delivered"); onClose(); }}>
              <Check size={14} /> Mark Delivered
            </button>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideInRight { from { transform:translateX(100%) } to { transform:translateX(0) } }
      `}</style>
    </>
  );
}

// ── Manifest Row (inside form) ─────────────────────────────────────────────
function ManifestRow({ row, index, onChange, onRemove, canRemove }) {
  return (
    <tr style={{ borderBottom: "1px solid var(--border-divider)" }}>
      <td style={{ padding: "4px 8px 4px 14px" }}>
        <input
          className="gp-modal-input manifest-input"
          placeholder="Item / Variety name"
          value={row.name}
          onChange={e => onChange(index, "name", e.target.value)}
        />
      </td>
      <td style={{ padding: "4px 8px" }}>
        <input
          className="gp-modal-input manifest-input"
          placeholder="Size"
          value={row.size}
          onChange={e => onChange(index, "size", e.target.value)}
        />
      </td>
      <td style={{ padding: "4px 8px" }}>
        <input
          className="gp-modal-input manifest-input"
          type="number" placeholder="Pcs"
          value={row.pieces}
          onChange={e => onChange(index, "pieces", e.target.value)}
        />
      </td>
      <td style={{ padding: "4px 8px" }}>
        <input
          className="gp-modal-input manifest-input"
          type="number" step="0.01" placeholder="Sq.Ft"
          value={row.sqFt}
          onChange={e => onChange(index, "sqFt", e.target.value)}
        />
      </td>
      <td style={{ padding: "4px 14px 4px 8px", textAlign: "right" }}>
        <button
          type="button"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          style={{
            background: "none", border: "none", cursor: canRemove ? "pointer" : "default",
            color: canRemove ? "#ef4444" : "var(--text-muted)", padding: "4px 8px", fontSize: "1.2rem",
            opacity: canRemove ? 0.7 : 0.3, transition: "opacity 0.2s"
          }}
          onMouseEnter={e => { if(canRemove) e.currentTarget.style.opacity = 1; }}
          onMouseLeave={e => { if(canRemove) e.currentTarget.style.opacity = 0.7; }}
        >
          ×
        </button>
      </td>
    </tr>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────
export default function GatePassView() {
  const [passes, setPasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [invoices, setInvoices] = useState([]);
  const [drawerPass, setDrawerPass] = useState(null);
  const [printingPass, setPrintingPass] = useState(null);
  const printRef = useRef(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [gps, invs] = await Promise.all([getAllGatePasses(), getInvoicesForLinking()]);
    setPasses(gps);
    setInvoices(invs);
  };

  const handleOpenModal = () => {
    setFormData(INITIAL_FORM);
    setIsModalOpen(true);
  };

  // CONCEPT: Invoice Auto-fill
  // When a user picks an invoice from the dropdown, we auto-populate
  // the customer name and manifest from the invoice's line items.
  // This reduces manual re-entry and ties the gate pass to billing data.
  const handleInvoiceSelect = (invoiceId) => {
    const inv = invoices.find(i => String(i.id) === String(invoiceId));
    if (!inv) { setFormData(prev => ({ ...prev, invoiceId: "", invoiceNo: "", customerName: "", manifestItems: [{ name: "", size: "", pieces: "", sqFt: "" }] })); return; }

    const manifestItems = (inv.items || []).map(line => ({
      name: line.itemName || line.name || "",
      size: line.size || line.standardSize || "",
      pieces: line.pieces || "",
      sqFt: line.sqFt || line.totalSqFt || "",
    }));

    setFormData(prev => ({
      ...prev,
      invoiceId: inv.id,
      invoiceNo: inv.invoiceNo,
      customerName: inv.customerName,
      manifestItems: manifestItems.length > 0 ? manifestItems : [{ name: "", size: "", pieces: "", sqFt: "" }],
    }));
  };

  const handleManifestChange = (index, field, value) => {
    setFormData(prev => {
      const items = [...prev.manifestItems];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, manifestItems: items };
    });
  };

  const handleAddManifestRow = () => {
    setFormData(prev => ({ ...prev, manifestItems: [...prev.manifestItems, { name: "", size: "", pieces: "", sqFt: "" }] }));
  };

  const handleRemoveManifestRow = (index) => {
    setFormData(prev => ({ ...prev, manifestItems: prev.manifestItems.filter((_, i) => i !== index) }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const manifest = formData.manifestItems.filter(r => r.name.trim());
      await createGatePass({ ...formData, manifest });
      setIsModalOpen(false);
      load();
    } catch (err) { alert("Error creating gate pass: " + err.message); }
  };

  const handleStatusChange = async (id, status) => {
    await updateGatePassStatus(id, status);
    // Update drawer if it's showing this pass
    setDrawerPass(prev => prev && prev.id === id ? { ...prev, status } : prev);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this gate pass? This cannot be undone.")) return;
    await deleteGatePass(id);
    if (drawerPass?.id === id) setDrawerPass(null);
    load();
  };

  // CONCEPT: Print Trigger
  // We set the pass we want to print into state, which renders the
  // PrintableGateSlip component (normally display:none). Then we call
  // window.print(). The @media print CSS makes only the slip visible.
  const handlePrint = (gp) => {
    setPrintingPass(gp);
    // Small timeout so React can render the print component first
    setTimeout(() => { window.print(); }, 120);
  };

  const filtered = passes.filter(gp => {
    const q = searchTerm.toLowerCase();
    const matches = !q || gp.gatePassNo?.toLowerCase().includes(q)
      || gp.customerName?.toLowerCase().includes(q)
      || gp.invoiceNo?.toLowerCase().includes(q)
      || gp.vehicleRegNo?.toLowerCase().includes(q)
      || gp.driverName?.toLowerCase().includes(q)
      || gp.destination?.toLowerCase().includes(q);
    if (!matches) return false;
    if (statusFilter !== "All" && gp.status !== statusFilter) return false;
    return true;
  });

  // ── CSS tokens ────────────────────────────────────────────────────────────
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
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      <div style={{ paddingBottom: "22px" }}>
        <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", lineHeight: 1, margin: 0 }}>
          Gate Passes
        </h1>
        <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", marginTop: "5px", fontWeight: 400, lineHeight: 1 }}>
          Rickshaw &amp; vehicle dispatch logistics — track deliveries leaving the yard
          {passes.length > 0 && <span style={{ marginLeft: "10px", opacity: 0.6 }}>· {passes.length} passes</span>}
        </p>
      </div>

      {/* ── CONTROLS BAR ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "18px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 260px", minWidth: "200px" }}>
          <Search size={14} style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
          <input
            type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by gate pass #, customer, invoice, driver..."
            style={{
              width: "100%", padding: "9px 14px 9px 38px", fontSize: "0.88rem",
              background: "var(--bg-card)", border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none",
              boxSizing: "border-box", height: "38px", transition: "border-color 0.15s",
            }}
            onFocus={e => e.target.style.borderColor = "var(--accent-blue)"}
            onBlur={e => e.target.style.borderColor = "var(--border-color)"}
          />
        </div>
        <StatusDropdown value={statusFilter} onChange={setStatusFilter} />
        <button className="btn btn-primary" onClick={handleOpenModal} id="add-gate-pass-btn" style={{ whiteSpace: "nowrap", flexShrink: 0, height: "38px" }}>
          <Plus size={14} /> New Gate Pass
        </button>
      </div>

      {/* ── TABLE ───────────────────────────────────────────────────────── */}
      <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: "820px", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...TH, minWidth: "140px" }}>Gate Pass</th>
                <th style={{ ...TH, minWidth: "190px" }}>Customer & Destination</th>
                <th style={{ ...TH, minWidth: "160px" }}>Vehicle & Driver</th>
                <th style={{ ...TH, minWidth: "120px" }}>Date</th>
                <th style={{ ...TH, minWidth: "120px" }}>Status</th>
                <th style={{ ...TH, width: "44px" }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "72px 20px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    <Truck size={28} style={{ opacity: 0.2, display: "block", margin: "0 auto 12px" }} />
                    {searchTerm || statusFilter !== "All"
                      ? "No gate passes match your filter."
                      : "No gate passes yet. Click New Gate Pass to dispatch a delivery."
                    }
                  </td>
                </tr>
              ) : (
                filtered.map((gp, idx) => {
                  const isLast = idx === filtered.length - 1;
                  const rowTD = { ...TD, borderBottom: isLast ? "none" : TD.borderBottom };
                  const dispatchDate = gp.dispatchDate
                    ? new Date(gp.dispatchDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })
                    : "—";
                  return (
                    <tr
                      key={gp.id}
                      onClick={() => setDrawerPass(gp)}
                      style={{ transition: "background 0.1s", cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-primary)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {/* Gate Pass No */}
                      <td style={rowTD}>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)", fontFamily: "monospace" }}>{gp.gatePassNo}</div>
                        {gp.invoiceNo && (
                          <div style={{ fontSize: "0.71rem", color: "var(--accent-blue)", fontFamily: "monospace", marginTop: "3px" }}>{gp.invoiceNo}</div>
                        )}
                      </td>

                      {/* Customer & Destination */}
                      <td style={rowTD}>
                        <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>{gp.customerName || "—"}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <MapPin size={10} style={{ flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>{gp.destination || "—"}</span>
                        </div>
                      </td>

                      {/* Vehicle & Driver */}
                      <td style={rowTD}>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 500 }}>{gp.vehicleType}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px", fontFamily: "monospace" }}>{gp.vehicleRegNo || "—"}</div>
                        {gp.driverName && (
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>{gp.driverName}</div>
                        )}
                      </td>

                      {/* Date */}
                      <td style={rowTD}>
                        <div style={{ fontSize: "0.84rem", color: "var(--text-primary)" }}>{dispatchDate}</div>
                      </td>

                      {/* Status */}
                      <td style={rowTD}>
                        <StatusDot status={gp.status} />
                      </td>

                      {/* Actions */}
                      <td style={{ ...rowTD, textAlign: "center", padding: "18px 8px" }}>
                        <RowMenu gp={gp} onView={setDrawerPass} onStatusChange={handleStatusChange} onDelete={handleDelete} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div style={{ padding: "11px 20px", borderTop: "1px solid var(--border-color)", fontSize: "0.73rem", color: "var(--text-muted)" }}>
            {filtered.length} {filtered.length === 1 ? "pass" : "passes"}
            {statusFilter !== "All" && ` — ${statusFilter}`}
          </div>
        )}
      </div>

      {/* ── Detail Drawer ────────────────────────────────────────────────── */}
      {drawerPass && (
        <GatePassDrawer
          gp={drawerPass}
          onClose={() => setDrawerPass(null)}
          onPrint={() => handlePrint(drawerPass)}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* ── Printable Slip (hidden, activated on print) ──────────────────── */}
      <PrintableGateSlip gatePass={printingPass} />

      <style>{`
        .gp-modal-input {
          width: 100%;
          padding: 10px 14px;
          font-size: 0.9rem;
          font-weight: 500;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          background: var(--bg-card);
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .gp-modal-input::placeholder {
          color: var(--text-muted);
          font-weight: 400;
          opacity: 0.6;
        }
        .gp-modal-input:focus {
          border-color: var(--accent-blue);
        }
        .gp-modal-input:disabled {
          background: var(--bg-primary);
          color: var(--text-secondary);
          cursor: not-allowed;
        }
        .gp-modal-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 6px;
        }
        .gp-modal-label .req {
          color: var(--text-muted);
          font-weight: 400;
          margin-left: 2px;
        }
        .gp-section-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin: 0 0 16px 0;
          border-bottom: 1px solid var(--border-divider);
          padding-bottom: 8px;
        }
        .manifest-input {
          padding: 8px 12px;
          font-size: 0.85rem;
          border: 1px solid transparent;
          background: transparent;
        }
        .manifest-input:focus {
          background: var(--bg-card);
          border-color: var(--accent-blue);
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════════
          NEW GATE PASS MODAL
      ═════════════════════════════════════════════════════════════════= */}
      {isModalOpen && (
        <div className="modal-overlay" style={{ padding: "20px", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ 
            background: "var(--bg-card)", 
            borderRadius: "12px", 
            width: "100%", 
            maxWidth: "960px", 
            maxHeight: "90vh", 
            display: "flex", 
            flexDirection: "column", 
            boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
            overflow: "hidden" 
          }}>
            
            {/* Header */}
            <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px 0", letterSpacing: "-0.01em" }}>Create Gate Pass</h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>Record the delivery leaving the premises.</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "6px", borderRadius: "6px", display: "flex" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1 }}>
              <div style={{ padding: "32px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "36px" }}>
                
                {/* Link to Invoice */}
                <div>
                  {formData.invoiceId ? (
                    <div style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Invoice Reference</div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
                          <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-blue)", fontFamily: "monospace" }}>{formData.invoiceNo}</span>
                          <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 500 }}>{formData.customerName}</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => handleInvoiceSelect("")} style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "8px 14px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", color: "var(--text-secondary)" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                        Change Invoice
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="gp-modal-label">Invoice Reference</label>
                      <select className="gp-modal-input" value={formData.invoiceId} onChange={e => handleInvoiceSelect(e.target.value)}>
                        <option value="">Select Invoice ▼ (or enter manually below)</option>
                        {invoices.map(inv => (
                          <option key={inv.id} value={inv.id}>
                            {inv.invoiceNo} — {inv.customerName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* DELIVERY DETAILS */}
                <section>
                  <h3 className="gp-section-title">Delivery Details</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                    <div>
                      <label className="gp-modal-label">Customer / Consignee <span className="req">*</span></label>
                      <input required type="text" className="gp-modal-input" value={formData.customerName} onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))} placeholder="e.g. Muhammad Imran" disabled={!!formData.invoiceId} />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label className="gp-modal-label">Delivery Destination <span className="req">*</span></label>
                      <input required type="text" className="gp-modal-input" value={formData.destination} onChange={e => setFormData(p => ({ ...p, destination: e.target.value }))} placeholder="e.g. Satyana Road, Near Fish Farm, Faisalabad" />
                    </div>
                  </div>
                </section>

                {/* VEHICLE & DRIVER */}
                <section>
                  <h3 className="gp-section-title">Vehicle & Driver</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                    <div>
                      <label className="gp-modal-label">Vehicle Type <span className="req">*</span></label>
                      <select required className="gp-modal-input" value={formData.vehicleType} onChange={e => setFormData(p => ({ ...p, vehicleType: e.target.value }))}>
                        {VEHICLE_TYPES.map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="gp-modal-label">Vehicle Reg. #</label>
                      <input type="text" className="gp-modal-input" style={{ fontFamily: "monospace" }} value={formData.vehicleRegNo} onChange={e => setFormData(p => ({ ...p, vehicleRegNo: e.target.value }))} placeholder="e.g. FD-4821" />
                    </div>
                    <div>
                      <label className="gp-modal-label">Driver Name</label>
                      <input type="text" className="gp-modal-input" value={formData.driverName} onChange={e => setFormData(p => ({ ...p, driverName: e.target.value }))} placeholder="e.g. Karamat Ali" />
                    </div>
                    <div>
                      <label className="gp-modal-label">Driver Mobile</label>
                      <input type="text" className="gp-modal-input" style={{ fontFamily: "monospace" }} value={formData.driverPhone} onChange={e => setFormData(p => ({ ...p, driverPhone: e.target.value }))} placeholder="e.g. 0301-7654321" />
                    </div>
                  </div>
                </section>

                {/* DISPATCH MANIFEST */}
                <section>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px", borderBottom: "1px solid var(--border-divider)", paddingBottom: "8px" }}>
                    <h3 className="gp-section-title" style={{ borderBottom: "none", paddingBottom: 0, margin: 0 }}>Dispatch Manifest</h3>
                    <button type="button" onClick={handleAddManifestRow} style={{ background: "none", border: "none", color: "var(--accent-blue)", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }} onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"} onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}><Plus size={14} /> Add Item</button>
                  </div>
                  
                  <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "var(--bg-primary)" }}>
                          <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", borderBottom: "1px solid var(--border-color)" }}>Item / Variety</th>
                          <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", borderBottom: "1px solid var(--border-color)", width: "15%" }}>Size</th>
                          <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", borderBottom: "1px solid var(--border-color)", width: "15%" }}>Pcs</th>
                          <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", borderBottom: "1px solid var(--border-color)", width: "20%" }}>Sq.Ft.</th>
                          <th style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-color)", width: "40px" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.manifestItems.map((row, i) => (
                          <ManifestRow
                            key={i} row={row} index={i}
                            onChange={handleManifestChange}
                            onRemove={handleRemoveManifestRow}
                            canRemove={formData.manifestItems.length > 1}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* NOTES / REMARKS */}
                <section>
                  <h3 className="gp-section-title">Notes / Remarks</h3>
                  <div>
                    <textarea className="gp-modal-input" style={{ resize: "vertical", minHeight: "70px", fontFamily: "inherit" }} value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Any special delivery instructions..." />
                  </div>
                </section>
                
              </div>

              {/* Footer */}
              <div style={{ padding: "16px 32px", borderTop: "1px solid var(--border-color)", background: "var(--bg-card)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", padding: "10px 20px", fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer", borderRadius: "6px" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={e => e.currentTarget.style.background = "none"}>Cancel</button>
                <button type="submit" style={{ background: "var(--accent-blue)", color: "#fff", border: "none", padding: "10px 24px", fontSize: "0.9rem", fontWeight: 600, borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 2px 4px rgba(37,99,235,0.2)", transition: "opacity 0.2s" }} onMouseEnter={e => e.currentTarget.style.opacity = 0.9} onMouseLeave={e => e.currentTarget.style.opacity = 1}><Check size={16} /> Create Gate Pass</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
