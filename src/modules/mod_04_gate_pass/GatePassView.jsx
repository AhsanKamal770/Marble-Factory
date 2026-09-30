import React, { useState, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Plus, Search, Truck, X, Check, MoreVertical, Printer,
  ChevronDown, SlidersHorizontal, PackageOpen, MapPin, User,
  Phone, FileText, ClipboardCheck, ArrowUpRight, TrendingUp,
  Layers, DollarSign, Calendar, RefreshCw
} from "lucide-react";
import {
  createGatePass,
  updateGatePassStatus,
  deleteGatePass,
  getInvoicesForLinking
} from "./gatePassService";
import PrintableGateSlip from "./PrintableGateSlip";
import { db } from "../../db/index";
import { useLanguage } from "../../context/LanguageContext";

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  "Dispatched":  { color: "#2563eb", bg: "rgba(37,99,235,0.08)",  dot: "#2563eb", ur: "روانہ شدہ (Dispatched)"  },
  "In Transit":  { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", dot: "#f59e0b", ur: "راستے میں (In Transit)"  },
  "Delivered":   { color: "#10b981", bg: "rgba(16,185,129,0.08)", dot: "#10b981", ur: "پہنچ گیا (Delivered)"   },
  "Cancelled":   { color: "#6b7280", bg: "rgba(107,114,128,0.08)",dot: "#6b7280", ur: "منسوخ (Cancelled)"   },
};
const ALL_STATUSES = ["All", "Dispatched", "In Transit", "Delivered", "Cancelled"];

const VEHICLE_TYPES = [
  "Qingqi Rickshaw",
  "Loader Rickshaw",
  "Pickup Truck",
  "Mazda / Truck",
  "Tractor Trolley",
  "Carry / Dala",
  "Other"
];

const CARRIAGE_PAID_OPTIONS = [
  "Customer (موقع پر ادا کرے گا)",
  "Factory (فیکٹری نے ادا کیا)",
  "Already in Bill (بل میں شامل ہے)"
];

const SUTAR_OPTIONS = ["2", "3", "4", "5", "6", "8"];

const INITIAL_FORM = {
  invoiceId: "",
  invoiceNo: "",
  customerName: "",
  customerPhone: "",
  destination: "",
  vehicleType: "Qingqi Rickshaw",
  vehicleRegNo: "",
  driverName: "",
  driverPhone: "",
  carriageCharges: "",
  carriagePaidBy: "Customer (موقع پر ادا کرے گا)",
  driverAdvance: "",
  notes: "",
  manifestItems: [{ name: "", thicknessSutar: "4", size: "", pieces: "", sqFt: "" }]
};

// ── Status Dot Component ──────────────────────────────────────────────────
function StatusDot({ status, language }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Dispatched"];
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      background: cfg.bg,
      padding: "3px 8px",
      borderRadius: "6px",
      border: `1px solid ${cfg.color}33`
    }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      <span style={{ fontSize: "0.76rem", color: cfg.color, fontWeight: 700 }}>
        {language === "ur" ? cfg.ur : status}
      </span>
    </div>
  );
}

// ── Gate Pass Detail Drawer ────────────────────────────────────────────────
function GatePassDrawer({ gp, onClose, onPrint, onStatusChange, language }) {
  if (!gp) return null;

  const dispatchDate = gp.dispatchDate
    ? new Date(gp.dispatchDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
  const dispatchTime = gp.dispatchTime || (gp.dispatchDate
    ? new Date(gp.dispatchDate).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true })
    : "—");

  const Row = ({ label, value, mono, highlight }) => (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      padding: "9px 0", borderBottom: "1px solid var(--border-divider)"
    }}>
      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
      <span style={{
        fontSize: "0.85rem", color: highlight ? "var(--accent-blue)" : "var(--text-primary)", fontWeight: 600,
        fontFamily: mono ? "monospace" : "inherit", textAlign: "right"
      }}>{value || "—"}</span>
    </div>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 401,
        width: "min(480px, 95vw)", background: "var(--bg-card)",
        borderLeft: "1px solid var(--border-color)",
        boxShadow: "-16px 0 48px rgba(0,0,0,0.2)",
        display: "flex", flexDirection: "column"
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", background: "var(--bg-primary)" }}>
          <div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "monospace" }}>
              {gp.gatePassNo}
            </div>
            <div style={{ marginTop: "6px" }}>
              <StatusDot status={gp.status} language={language} />
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--text-muted)" }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          
          {/* Dispatch Info Card */}
          <div style={{ padding: "14px 16px", background: "var(--bg-primary)", borderRadius: "10px", border: "1px solid var(--border-color)", marginBottom: "18px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Date & Time</div>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>{dispatchDate}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{dispatchTime}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Bill / Invoice #</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--accent-blue)", marginTop: "2px", fontFamily: "monospace" }}>
                  {gp.invoiceNo || "Manual Dispatch"}
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Delivery */}
          <div style={{ marginBottom: "18px" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>Customer & Destination</div>
            <Row label="Customer Name" value={gp.customerName} />
            {gp.customerPhone && <Row label="Customer Mobile" value={gp.customerPhone} mono />}
            <Row label="Delivery Destination" value={gp.destination} />
          </div>

          {/* Vehicle & Driver */}
          <div style={{ marginBottom: "18px" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>Vehicle & Driver</div>
            <Row label="Vehicle Type" value={gp.vehicleType} />
            <Row label="Registration #" value={gp.vehicleRegNo} mono />
            <Row label="Driver Name" value={gp.driverName} />
            <Row label="Driver Mobile" value={gp.driverPhone} mono />
            <Row label="Carriage / Kiraya" value={gp.carriageCharges ? `Rs. ${Number(gp.carriageCharges).toLocaleString()} (${gp.carriagePaidBy || 'Paid'})` : "—"} mono />
          </div>

          {/* Manifest Table */}
          {(gp.manifest || []).length > 0 && (
            <div style={{ marginBottom: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)" }}>Dispatch Manifest</div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                  {gp.totalPieces || 0} Pcs • {gp.totalSqFt || 0} Sq.Ft
                </span>
              </div>
              <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-primary)" }}>
                      <th style={{ padding: "8px 10px", textAlign: "left", color: "var(--text-muted)", fontWeight: 700 }}>Item</th>
                      <th style={{ padding: "8px 10px", textAlign: "center", color: "var(--text-muted)", fontWeight: 700 }}>Sutar</th>
                      <th style={{ padding: "8px 10px", textAlign: "center", color: "var(--text-muted)", fontWeight: 700 }}>Pcs</th>
                      <th style={{ padding: "8px 10px", textAlign: "right", color: "var(--text-muted)", fontWeight: 700 }}>Sq.Ft</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(gp.manifest || []).map((row, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--border-divider)" }}>
                        <td style={{ padding: "8px 10px", color: "var(--text-primary)", fontWeight: 600 }}>{row.name}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center", color: "var(--accent-blue)", fontWeight: 700 }}>{row.thicknessSutar ? `${row.thicknessSutar}S` : "4S"}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center", color: "var(--text-secondary)" }}>{row.pieces || "—"}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--text-primary)", fontFamily: "monospace", fontWeight: 700 }}>
                          {row.sqFt ? Number(row.sqFt).toFixed(2) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {gp.notes && (
            <div style={{ marginBottom: "18px" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "6px" }}>Notes</div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", padding: "10px 14px", background: "var(--bg-primary)", borderRadius: "8px" }}>
                {gp.notes}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-color)", display: "flex", gap: "10px", background: "var(--bg-primary)" }}>
          <button
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px" }}
            onClick={onPrint}
          >
            <Printer size={15} /> Print Slip
          </button>
          {gp.status !== "Delivered" && (
            <button
              className="btn btn-primary"
              style={{ flex: 1, fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px" }}
              onClick={() => { onStatusChange(gp.id, "Delivered"); onClose(); }}
            >
              <Check size={15} /> Mark Delivered
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main GatePassView Component ───────────────────────────────────────────
export default function GatePassView() {
  const { language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [vehicleFilter, setVehicleFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [drawerPass, setDrawerPass] = useState(null);
  const [printingPass, setPrintingPass] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printFormat, setPrintFormat] = useState("a4");

  // 1. Live Query: All Gate Passes from Dexie DB
  const passes = useLiveQuery(async () => {
    const all = await db.gate_passes.toArray();
    return all.sort((a, b) => new Date(b.createdAt || b.dispatchDate || 0) - new Date(a.createdAt || a.dispatchDate || 0));
  }, []) || [];

  // 2. Live Query: Invoices available for linking
  const invoices = useLiveQuery(async () => {
    return await getInvoicesForLinking();
  }, []) || [];

  // 3. Live Query: Factory Settings
  const settings = useLiveQuery(async () => {
    const list = await db.settings.toArray();
    return list[0] || {};
  }, []);

  // 4. Calculate Live KPIs
  const todayStr = new Date().toISOString().slice(0, 10);
  let todayDispatches = 0;
  let inTransitCount = 0;
  let deliveredToday = 0;
  let totalSqFtToday = 0;

  passes.forEach(gp => {
    const d = (gp.date || gp.dispatchDate || gp.createdAt || "").slice(0, 10);
    if (d === todayStr) {
      todayDispatches += 1;
      totalSqFtToday += Number(gp.totalSqFt || 0);
      if (gp.status === "Delivered") {
        deliveredToday += 1;
      }
    }
    if (gp.status === "In Transit" || gp.status === "Dispatched") {
      inTransitCount += 1;
    }
  });

  const handleOpenModal = () => {
    setFormData(INITIAL_FORM);
    setIsModalOpen(true);
  };

  // Auto-fill from selected invoice
  const handleInvoiceSelect = (invoiceId) => {
    const inv = invoices.find(i => String(i.id) === String(invoiceId));
    if (!inv) {
      setFormData(prev => ({
        ...prev,
        invoiceId: "",
        invoiceNo: "",
        customerName: "",
        customerPhone: "",
        destination: "",
        carriageCharges: "",
        manifestItems: [{ name: "", thicknessSutar: "4", size: "", pieces: "", sqFt: "" }]
      }));
      return;
    }

    const manifestItems = (inv.items || []).map(line => ({
      name: line.name || "",
      thicknessSutar: line.thicknessSutar ? String(line.thicknessSutar) : "4",
      size: line.size || "",
      pieces: line.pieces ? String(line.pieces) : "",
      sqFt: line.sqFt ? String(line.sqFt) : ""
    }));

    setFormData(prev => ({
      ...prev,
      invoiceId: inv.id,
      invoiceNo: inv.invoiceNo,
      customerName: inv.customerName,
      customerPhone: inv.customerPhone || "",
      destination: inv.destination || "",
      carriageCharges: inv.carriageCharges ? String(inv.carriageCharges) : "",
      manifestItems: manifestItems.length > 0 ? manifestItems : [{ name: "", thicknessSutar: "4", size: "", pieces: "", sqFt: "" }]
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
    setFormData(prev => ({
      ...prev,
      manifestItems: [...prev.manifestItems, { name: "", thicknessSutar: "4", size: "", pieces: "", sqFt: "" }]
    }));
  };

  const handleRemoveManifestRow = (index) => {
    setFormData(prev => ({
      ...prev,
      manifestItems: prev.manifestItems.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const manifest = formData.manifestItems.filter(r => r.name.trim());
      if (manifest.length === 0) {
        alert(language === "ur" ? "براہ کرم کم از کم ایک آئٹم درج کریں۔" : "Please add at least one item to the manifest.");
        return;
      }

      const created = await createGatePass({
        ...formData,
        manifest
      });

      setIsModalOpen(false);
      // Open print preview modal for the newly created gate pass
      setPrintingPass(created);
      setPrintFormat("a4");
      setIsPrintModalOpen(true);
    } catch (err) {
      alert("Error creating gate pass: " + err.message);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateGatePassStatus(id, status);
      if (drawerPass?.id === id) {
        setDrawerPass(prev => prev ? { ...prev, status } : null);
      }
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(language === "ur" ? "کیا آپ واقعی یہ گیٹ پاس حذف کرنا چاہتے ہیں؟" : "Delete this gate pass? This cannot be undone.")) return;
    try {
      await deleteGatePass(id);
      if (drawerPass?.id === id) setDrawerPass(null);
    } catch (err) {
      alert("Failed to delete gate pass: " + err.message);
    }
  };

  const handleTriggerPrint = (gp, format = "a4") => {
    setPrintingPass(gp);
    setPrintFormat(format);
    setIsPrintModalOpen(true);
  };

  // Filter gate passes
  const filtered = passes.filter(gp => {
    const q = searchTerm.toLowerCase();
    const matches = !q ||
      gp.gatePassNo?.toLowerCase().includes(q) ||
      gp.customerName?.toLowerCase().includes(q) ||
      gp.invoiceNo?.toLowerCase().includes(q) ||
      gp.vehicleRegNo?.toLowerCase().includes(q) ||
      gp.driverName?.toLowerCase().includes(q) ||
      gp.destination?.toLowerCase().includes(q);

    if (!matches) return false;
    if (statusFilter !== "All" && gp.status !== statusFilter) return false;
    if (vehicleFilter !== "All" && gp.vehicleType !== vehicleFilter) return false;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", paddingBottom: "50px" }}>

      {/* ── TOP PAGE HEADER ── */}
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          paddingBottom: "20px",
          borderBottom: "1px solid var(--border-divider)",
          marginBottom: "24px"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
              {language === "ur" ? "رکشہ گیٹ پاس و ترسیل لاجسٹکس" : "Rickshaw Gate Pass & Yard Logistics"}
            </h1>
            <span style={{
              background: "rgba(37, 99, 235, 0.12)",
              color: "var(--accent-blue)",
              fontSize: "0.75rem",
              fontWeight: 800,
              padding: "4px 8px",
              borderRadius: "6px"
            }}>
              Dispatch Control
            </span>
          </div>
          <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
            {language === "ur"
              ? "فیکٹری سے رکشہ و لوڈر گاڑیوں کی باحفاظت ترسیل، ڈرائیور ریکارڈ اور گیٹ آؤٹ پرچی کا انتظام"
              : "Track every delivery vehicle, driver, marble manifest, and printable gate pass slip leaving the yard."}
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleOpenModal}
          id="add-gate-pass-btn"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            fontSize: "0.9rem",
            fontWeight: 800,
            boxShadow: "0 4px 12px rgba(37,99,235,0.25)"
          }}
        >
          <Plus size={16} /> {language === "ur" ? "نیا گیٹ پاس جاری کریں" : "Issue Gate Pass"}
        </button>
      </div>

      {/* ── 4 LOGISTICS KPI METRIC CARDS ── */}
      <div
        className="no-print"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px"
        }}
      >
        {/* KPI 1: Today Dispatches */}
        <div style={{
          background: "var(--bg-card)",
          padding: "16px 20px",
          borderRadius: "12px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 700 }}>
            <span>{language === "ur" ? "آج کی کل ڈسپیچ" : "Today's Dispatches"}</span>
            <Truck size={16} style={{ color: "var(--accent-blue)" }} />
          </div>
          <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "6px", fontFamily: "monospace" }}>
            {todayDispatches} <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>vehicles</span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
            {language === "ur" ? "آج فیکٹری گیٹ سے روانہ" : "Dispatched from yard today"}
          </div>
        </div>

        {/* KPI 2: In Transit */}
        <div style={{
          background: "var(--bg-card)",
          padding: "16px 20px",
          borderRadius: "12px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#f59e0b", fontSize: "0.8rem", fontWeight: 700 }}>
            <span>{language === "ur" ? "راستے میں مال (In Transit)" : "In Transit"}</span>
            <RefreshCw size={16} />
          </div>
          <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#f59e0b", marginTop: "6px", fontFamily: "monospace" }}>
            {inTransitCount} <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>on the road</span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
            {language === "ur" ? "خریدار تک پہنچنا باقی ہے" : "Awaiting delivery confirmation"}
          </div>
        </div>

        {/* KPI 3: Delivered Today */}
        <div style={{
          background: "var(--bg-card)",
          padding: "16px 20px",
          borderRadius: "12px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#10b981", fontSize: "0.8rem", fontWeight: 700 }}>
            <span>{language === "ur" ? "پہنچ گیا (Delivered Today)" : "Delivered Today"}</span>
            <Check size={16} />
          </div>
          <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#10b981", marginTop: "6px", fontFamily: "monospace" }}>
            {deliveredToday} <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>completed</span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
            {language === "ur" ? "گاہک وصولی مکمل" : "Verified received by customer"}
          </div>
        </div>

        {/* KPI 4: Total Sq.Ft Dispatched */}
        <div style={{
          background: "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(30,64,175,0.03) 100%)",
          padding: "16px 20px",
          borderRadius: "12px",
          border: "2px solid var(--accent-blue)",
          boxShadow: "0 4px 12px rgba(37,99,235,0.08)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--accent-blue)", fontSize: "0.8rem", fontWeight: 800 }}>
            <span>{language === "ur" ? "آج کا روانہ کردہ مال" : "DISPATCHED TODAY"}</span>
            <Layers size={16} />
          </div>
          <div style={{ fontSize: "1.55rem", fontWeight: 900, color: "var(--accent-blue)", marginTop: "6px", fontFamily: "monospace" }}>
            {totalSqFtToday.toLocaleString()} <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Sq.Ft</span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "4px", fontWeight: 600 }}>
            {language === "ur" ? "ماربل و ٹائلز حجم" : "Total volume dispatched today"}
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS BAR ── */}
      <div
        className="no-print"
        style={{
          background: "var(--bg-card)",
          padding: "14px 18px",
          borderRadius: "12px",
          border: "1px solid var(--border-color)",
          marginBottom: "20px",
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap"
        }}
      >
        {/* Search Input */}
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: "200px" }}>
          <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={language === "ur" ? "تلاش: گیٹ پاس نمبر، بل #، خریدار، ڈرائیور، گاڑی نمبر..." : "Search pass #, invoice, customer, driver, reg #..."}
            style={{
              width: "100%",
              padding: "8px 12px 8px 36px",
              fontSize: "0.85rem",
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              color: "var(--text-primary)",
              outline: "none"
            }}
          />
        </div>

        {/* Status Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <SlidersHorizontal size={14} style={{ color: "var(--text-muted)" }} />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              fontSize: "0.82rem",
              fontWeight: 600,
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              color: "var(--text-primary)",
              outline: "none"
            }}
          >
            <option value="All">{language === "ur" ? "تمام اسٹیٹس (All Status)" : "All Status"}</option>
            {ALL_STATUSES.filter(s => s !== "All").map(s => (
              <option key={s} value={s}>{language === "ur" ? STATUS_CONFIG[s]?.ur : s}</option>
            ))}
          </select>
        </div>

        {/* Vehicle Filter */}
        <div>
          <select
            value={vehicleFilter}
            onChange={e => setVehicleFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              fontSize: "0.82rem",
              fontWeight: 600,
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              color: "var(--text-primary)",
              outline: "none"
            }}
          >
            <option value="All">{language === "ur" ? "تمام گاڑیاں (All Vehicles)" : "All Vehicles"}</option>
            {VEHICLE_TYPES.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── GATE PASS TABLE ── */}
      <div
        className="no-print"
        style={{
          background: "var(--bg-card)",
          borderRadius: "14px",
          border: "1px solid var(--border-color)",
          overflow: "hidden",
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)"
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border-divider)" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 700, width: "14%" }}>
                  {language === "ur" ? "گیٹ پاس نمبر" : "Gate Pass #"}
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 700, width: "20%" }}>
                  {language === "ur" ? "خریدار و منزل" : "Customer & Dest."}
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 700, width: "18%" }}>
                  {language === "ur" ? "گاڑی و ڈرائیور" : "Vehicle & Driver"}
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 700, width: "14%" }}>
                  {language === "ur" ? "روانہ کردہ مال" : "Manifest Qty"}
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 700, width: "12%" }}>
                  {language === "ur" ? "تاریخ و وقت" : "Dispatch Time"}
                </th>
                <th style={{ padding: "12px 16px", textAlign: "center", color: "var(--text-secondary)", fontWeight: 700, width: "12%" }}>
                  {language === "ur" ? "اسٹیٹس" : "Status"}
                </th>
                <th style={{ padding: "12px 16px", textAlign: "center", color: "var(--text-secondary)", fontWeight: 700, width: "10%" }}>
                  {language === "ur" ? "ایکشن" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "60px 20px" }}>
                    <Truck size={36} style={{ color: "var(--text-muted)", opacity: 0.4, marginBottom: "10px" }} />
                    <p style={{ margin: 0, fontWeight: 700, color: "var(--text-secondary)" }}>
                      {language === "ur" ? "کوئی گیٹ پاس ریکارڈ نہیں ملا۔" : "No gate passes found."}
                    </p>
                    <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      {language === "ur" ? "اوپر موجود 'نیا گیٹ پاس' کے بٹن سے ڈسپیچ پرچی بنائیں۔" : "Click 'Issue Gate Pass' above to record a dispatch."}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(gp => {
                  const dispatchDateStr = gp.dispatchDate
                    ? new Date(gp.dispatchDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short" })
                    : "—";

                  return (
                    <tr
                      key={gp.id}
                      onClick={() => setDrawerPass(gp)}
                      style={{
                        borderBottom: "1px solid var(--border-divider)",
                        cursor: "pointer",
                        transition: "background 0.15s ease"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-primary)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {/* Gate Pass No & Invoice */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 800, color: "var(--text-primary)", fontFamily: "monospace", fontSize: "0.92rem" }}>
                          {gp.gatePassNo}
                        </div>
                        {gp.invoiceNo && (
                          <div style={{ fontSize: "0.74rem", color: "var(--accent-blue)", fontFamily: "monospace", fontWeight: 700, marginTop: "2px" }}>
                            {gp.invoiceNo}
                          </div>
                        )}
                      </td>

                      {/* Customer & Destination */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{gp.customerName}</div>
                        <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <MapPin size={11} style={{ flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>
                            {gp.destination || "Factory Yard Delivery"}
                          </span>
                        </div>
                      </td>

                      {/* Vehicle & Driver */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.82rem" }}>
                          {gp.vehicleType} {gp.vehicleRegNo ? <span style={{ fontFamily: "monospace", color: "var(--text-muted)" }}>({gp.vehicleRegNo})</span> : ''}
                        </div>
                        {gp.driverName && (
                          <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            {gp.driverName} {gp.driverPhone ? `• ${gp.driverPhone}` : ''}
                          </div>
                        )}
                      </td>

                      {/* Manifest Quantity */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 800, color: "var(--text-primary)", fontFamily: "monospace" }}>
                          {gp.totalSqFt || 0} <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>Sq.Ft</span>
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          {gp.totalPieces || (gp.manifest || []).length} Pcs • {(gp.manifest || []).length} items
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>
                          {dispatchDateStr}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1px" }}>
                          {gp.dispatchTime || "—"}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <StatusDot status={gp.status} language={language} />
                      </td>

                      {/* Action Buttons */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                          <button
                            onClick={() => handleTriggerPrint(gp, "a4")}
                            title={language === "ur" ? "پرنٹ گیٹ پرچی" : "Print Gate Slip"}
                            style={{
                              background: "var(--bg-card)",
                              border: "1px solid var(--border-color)",
                              color: "var(--text-primary)",
                              borderRadius: "6px",
                              padding: "6px 8px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center"
                            }}
                          >
                            <Printer size={14} />
                          </button>

                          <button
                            onClick={() => handleDelete(gp.id)}
                            title={language === "ur" ? "حذف کریں" : "Delete"}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--text-muted)",
                              borderRadius: "6px",
                              padding: "6px 8px",
                              cursor: "pointer"
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                            onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                          >
                            <X size={15} />
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
      </div>

      {/* ── DETAIL DRAWER ── */}
      {drawerPass && (
        <GatePassDrawer
          gp={drawerPass}
          onClose={() => setDrawerPass(null)}
          onPrint={() => handleTriggerPrint(drawerPass, "a4")}
          onStatusChange={handleStatusChange}
          language={language}
        />
      )}

      {/* ── PRINT MODAL (A4 & 80mm THERMAL REPLICA) ── */}
      <PrintableGateSlip
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        gatePass={printingPass}
        factorySettings={settings}
        defaultFormat={printFormat}
      />

      {/* ══════════════════════════════════════════════════════════════════
          NEW GATE PASS MODAL FORM (FULL BUSINESS LOGISTICS WORKFLOW)
      ═════════════════════════════════════════════════════════════════= */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="modal-card"
            style={{
              background: "var(--bg-card)",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "920px",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
              overflow: "hidden",
              border: "1px solid var(--border-color)"
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-divider)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-primary)" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  {language === "ur" ? "نیا رکشہ گیٹ پاس جاری کریں" : "Issue New Rickshaw Gate Pass"}
                </h2>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                  {language === "ur" ? "بل بک سے لنک کریں یا دستی ڈسپیچ پرچی بنائیں" : "Link with Invoice Bill or record manual dispatch manifest"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1 }}>
              <div style={{ padding: "24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>

                {/* 1. Invoice Reference Picker */}
                <div style={{ background: "var(--bg-primary)", padding: "14px 16px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
                    {language === "ur" ? "بل بک انوائس سے لنک کریں (اختیاری)" : "Link with Invoice Bill (Optional)"}
                  </label>
                  <select
                    value={formData.invoiceId}
                    onChange={e => handleInvoiceSelect(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-card)",
                      color: "var(--text-primary)",
                      fontSize: "0.88rem",
                      fontWeight: 600,
                      outline: "none"
                    }}
                  >
                    <option value="">{language === "ur" ? "— بل منتخب کریں یا نیچے دستی درج کریں —" : "— Select Invoice ▼ (or fill manually below) —"}</option>
                    {invoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNo} — {inv.customerName} ({inv.items.length} items • Rs. {Number(inv.totalAmount).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Customer & Destination */}
                <div>
                  <h4 style={{ fontSize: "0.82rem", fontWeight: 800, textTransform: "uppercase", color: "var(--accent-blue)", margin: "0 0 10px 0", borderBottom: "1px solid var(--border-divider)", paddingBottom: "4px" }}>
                    {language === "ur" ? "1. خریدار و ترسیل مقام" : "1. Customer & Delivery Destination"}
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px" }}>
                        {language === "ur" ? "خریدار کا نام *" : "Customer Name *"}
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.customerName}
                        onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))}
                        placeholder="e.g. Haji Aslam / City Builders"
                        style={{
                          width: "100%",
                          padding: "8px 11px",
                          borderRadius: "7px",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-primary)",
                          color: "var(--text-primary)",
                          fontSize: "0.85rem",
                          outline: "none"
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px" }}>
                        {language === "ur" ? "خریدار رابطہ نمبر" : "Customer Phone"}
                      </label>
                      <input
                        type="text"
                        value={formData.customerPhone}
                        onChange={e => setFormData(p => ({ ...p, customerPhone: e.target.value }))}
                        placeholder="e.g. 0300-1234567"
                        style={{
                          width: "100%",
                          padding: "8px 11px",
                          borderRadius: "7px",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-primary)",
                          color: "var(--text-primary)",
                          fontSize: "0.85rem",
                          outline: "none"
                        }}
                      />
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px" }}>
                        {language === "ur" ? "ترسیل کا پتہ / منزل *" : "Delivery Destination / Site Address *"}
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.destination}
                        onChange={e => setFormData(p => ({ ...p, destination: e.target.value }))}
                        placeholder="e.g. Main Bazar Jhumra / Near Civil Hospital"
                        style={{
                          width: "100%",
                          padding: "8px 11px",
                          borderRadius: "7px",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-primary)",
                          color: "var(--text-primary)",
                          fontSize: "0.85rem",
                          outline: "none"
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Vehicle, Driver & Kiraya */}
                <div>
                  <h4 style={{ fontSize: "0.82rem", fontWeight: 800, textTransform: "uppercase", color: "var(--accent-blue)", margin: "0 0 10px 0", borderBottom: "1px solid var(--border-divider)", paddingBottom: "4px" }}>
                    {language === "ur" ? "2. گاڑی، ڈرائیور و کرایہ باربرداری" : "2. Vehicle, Driver & Carriage Logistics"}
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px" }}>
                        {language === "ur" ? "گاڑی کی قسم *" : "Vehicle Type *"}
                      </label>
                      <select
                        value={formData.vehicleType}
                        onChange={e => setFormData(p => ({ ...p, vehicleType: e.target.value }))}
                        style={{
                          width: "100%",
                          padding: "8px 11px",
                          borderRadius: "7px",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-primary)",
                          color: "var(--text-primary)",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          outline: "none"
                        }}
                      >
                        {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px" }}>
                        {language === "ur" ? "گاڑی نمبر / نمبر پلیٹ" : "Vehicle Reg #"}
                      </label>
                      <input
                        type="text"
                        value={formData.vehicleRegNo}
                        onChange={e => setFormData(p => ({ ...p, vehicleRegNo: e.target.value }))}
                        placeholder="e.g. FD-4821"
                        style={{
                          width: "100%",
                          padding: "8px 11px",
                          borderRadius: "7px",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-primary)",
                          color: "var(--text-primary)",
                          fontSize: "0.85rem",
                          fontFamily: "monospace",
                          outline: "none"
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px" }}>
                        {language === "ur" ? "ڈرائیور کا نام" : "Driver Name"}
                      </label>
                      <input
                        type="text"
                        value={formData.driverName}
                        onChange={e => setFormData(p => ({ ...p, driverName: e.target.value }))}
                        placeholder="e.g. Karamat Ali"
                        style={{
                          width: "100%",
                          padding: "8px 11px",
                          borderRadius: "7px",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-primary)",
                          color: "var(--text-primary)",
                          fontSize: "0.85rem",
                          outline: "none"
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px" }}>
                        {language === "ur" ? "ڈرائیور موبائل" : "Driver Mobile"}
                      </label>
                      <input
                        type="text"
                        value={formData.driverPhone}
                        onChange={e => setFormData(p => ({ ...p, driverPhone: e.target.value }))}
                        placeholder="e.g. 0301-7654321"
                        style={{
                          width: "100%",
                          padding: "8px 11px",
                          borderRadius: "7px",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-primary)",
                          color: "var(--text-primary)",
                          fontSize: "0.85rem",
                          outline: "none"
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px" }}>
                        {language === "ur" ? "کرایہ رقم (Rs.)" : "Carriage / Kiraya (Rs.)"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.carriageCharges}
                        onChange={e => setFormData(p => ({ ...p, carriageCharges: e.target.value }))}
                        placeholder="0"
                        style={{
                          width: "100%",
                          padding: "8px 11px",
                          borderRadius: "7px",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-primary)",
                          color: "var(--text-primary)",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          outline: "none"
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px" }}>
                        {language === "ur" ? "کرایہ کون دے گا؟" : "Carriage Paid By"}
                      </label>
                      <select
                        value={formData.carriagePaidBy}
                        onChange={e => setFormData(p => ({ ...p, carriagePaidBy: e.target.value }))}
                        style={{
                          width: "100%",
                          padding: "8px 11px",
                          borderRadius: "7px",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-primary)",
                          color: "var(--text-primary)",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          outline: "none"
                        }}
                      >
                        {CARRIAGE_PAID_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 4. Dispatch Manifest Item Table */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: "1px solid var(--border-divider)", paddingBottom: "4px" }}>
                    <h4 style={{ fontSize: "0.82rem", fontWeight: 800, textTransform: "uppercase", color: "var(--accent-blue)", margin: 0 }}>
                      {language === "ur" ? "3. روانہ کردہ مال کی تفصیل (Dispatch Manifest)" : "3. Dispatch Item Manifest"}
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddManifestRow}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--accent-blue)",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <Plus size={14} /> {language === "ur" ? "آئٹم شامل کریں" : "Add Item Row"}
                    </button>
                  </div>

                  <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                      <thead>
                        <tr style={{ background: "var(--bg-primary)" }}>
                          <th style={{ padding: "8px 10px", textAlign: "left", color: "var(--text-muted)", fontWeight: 700, width: "35%" }}>Item Description</th>
                          <th style={{ padding: "8px 10px", textAlign: "center", color: "var(--text-muted)", fontWeight: 700, width: "15%" }}>Sutar</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", color: "var(--text-muted)", fontWeight: 700, width: "20%" }}>Size</th>
                          <th style={{ padding: "8px 10px", textAlign: "center", color: "var(--text-muted)", fontWeight: 700, width: "12%" }}>Pcs</th>
                          <th style={{ padding: "8px 10px", textAlign: "right", color: "var(--text-muted)", fontWeight: 700, width: "14%" }}>Sq.Ft</th>
                          <th style={{ padding: "8px 10px", width: "4%" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.manifestItems.map((row, i) => (
                          <tr key={i} style={{ borderTop: "1px solid var(--border-divider)" }}>
                            <td style={{ padding: "4px 8px" }}>
                              <input
                                placeholder="e.g. Sunny Grey 12x12"
                                value={row.name}
                                onChange={e => handleManifestChange(i, "name", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid var(--border-color)",
                                  background: "var(--bg-card)",
                                  color: "var(--text-primary)",
                                  fontSize: "0.82rem",
                                  fontWeight: 600
                                }}
                              />
                            </td>
                            <td style={{ padding: "4px 8px" }}>
                              <select
                                value={row.thicknessSutar}
                                onChange={e => handleManifestChange(i, "thicknessSutar", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "6px 4px",
                                  borderRadius: "6px",
                                  border: "1px solid var(--border-color)",
                                  background: "var(--bg-card)",
                                  color: "var(--text-primary)",
                                  fontSize: "0.8rem",
                                  fontWeight: 700,
                                  textAlign: "center"
                                }}
                              >
                                {SUTAR_OPTIONS.map(s => <option key={s} value={s}>{s} Sutar</option>)}
                              </select>
                            </td>
                            <td style={{ padding: "4px 8px" }}>
                              <input
                                placeholder="e.g. 12x24"
                                value={row.size}
                                onChange={e => handleManifestChange(i, "size", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid var(--border-color)",
                                  background: "var(--bg-card)",
                                  color: "var(--text-primary)",
                                  fontSize: "0.82rem"
                                }}
                              />
                            </td>
                            <td style={{ padding: "4px 8px" }}>
                              <input
                                type="number"
                                placeholder="0"
                                value={row.pieces}
                                onChange={e => handleManifestChange(i, "pieces", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid var(--border-color)",
                                  background: "var(--bg-card)",
                                  color: "var(--text-primary)",
                                  fontSize: "0.82rem",
                                  textAlign: "center",
                                  fontWeight: 700
                                }}
                              />
                            </td>
                            <td style={{ padding: "4px 8px" }}>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0"
                                value={row.sqFt}
                                onChange={e => handleManifestChange(i, "sqFt", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid var(--border-color)",
                                  background: "var(--bg-card)",
                                  color: "var(--text-primary)",
                                  fontSize: "0.82rem",
                                  textAlign: "right",
                                  fontWeight: 800,
                                  fontFamily: "monospace"
                                }}
                              />
                            </td>
                            <td style={{ padding: "4px 6px", textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveManifestRow(i)}
                                disabled={formData.manifestItems.length <= 1}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: formData.manifestItems.length > 1 ? "#ef4444" : "var(--text-muted)",
                                  cursor: formData.manifestItems.length > 1 ? "pointer" : "default",
                                  padding: "4px"
                                }}
                              >
                                <X size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. Special Notes */}
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px" }}>
                    {language === "ur" ? "خصوصی ہدایات / ریمارکس" : "Delivery Instructions / Notes"}
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    placeholder="e.g. Handle with care, deliver before 5 PM"
                    style={{
                      width: "100%",
                      padding: "8px 11px",
                      borderRadius: "7px",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                      outline: "none"
                    }}
                  />
                </div>

              </div>

              {/* Modal Submit Footer */}
              <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-divider)", background: "var(--bg-primary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    padding: "8px 16px",
                    borderRadius: "7px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    background: "linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)",
                    border: "none",
                    color: "#fff",
                    padding: "9px 22px",
                    borderRadius: "7px",
                    fontSize: "0.9rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 8px rgba(30, 64, 175, 0.25)"
                  }}
                >
                  <Check size={16} /> {language === "ur" ? "گیٹ پاس جاری کریں اور پرنٹ کریں" : "Issue & Print Gate Pass"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
