import React, { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Plus, Search, Truck, X, Check, Printer,
  ChevronDown, SlidersHorizontal, MapPin, User,
  Phone, FileText, CheckCircle2, RefreshCw,
  Layers, RotateCcw, Calendar, Eye, Trash2,
  PackageCheck, ArrowRight, ExternalLink,
  Info, DollarSign, CreditCard, Save
} from "lucide-react";
import {
  createGatePass,
  updateGatePassStatus,
  deleteGatePass,
  bulkDeleteGatePasses,
  bulkUpdateGatePassStatus,
  getInvoicesForLinking
} from "./gatePassService";
import PrintableGateSlip from "./PrintableGateSlip";
import { db } from "../../db/index";
import { useLanguage } from "../../context/LanguageContext";

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  "Dispatched": { color: "#2563eb", bg: "rgba(37,99,235,0.10)", dot: "#2563eb", ur: "روانہ شدہ (Dispatched)" },
  "In Transit": { color: "#f59e0b", bg: "rgba(245,158,11,0.10)", dot: "#f59e0b", ur: "راستے میں (In Transit)" },
  "Delivered": { color: "#10b981", bg: "rgba(16,185,129,0.10)", dot: "#10b981", ur: "پہنچ گیا (Delivered)" },
  "Cancelled": { color: "#64748b", bg: "rgba(100,116,139,0.10)", dot: "#64748b", ur: "منسوخ (Cancelled)" },
};
const ALL_STATUSES = ["All", "Dispatched", "In Transit", "Delivered", "Cancelled"];

const VEHICLE_TYPES = [
  "All Vehicles",
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

// ── Status Badge Component ──────────────────────────────────────────────────
function StatusBadge({ status, language }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Dispatched"];
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      background: cfg.bg,
      padding: "4px 10px",
      borderRadius: "9999px",
      border: `1px solid ${cfg.color}33`,
      whiteSpace: "nowrap"
    }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      <span style={{ fontSize: "0.78rem", color: cfg.color, fontWeight: 700 }}>
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
    : (gp.date || "—");
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
        fontFamily: mono ? "var(--font-mono)" : "inherit", textAlign: "right"
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
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
              {gp.gatePassNo}
            </div>
            <div style={{ marginTop: "6px" }}>
              <StatusBadge status={gp.status} language={language} />
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
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--accent-blue)", marginTop: "2px", fontFamily: "var(--font-mono)" }}>
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
                        <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
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
  const tr = (en, ur) => (language === "ur" ? ur : en);

  const [searchTerm, setSearchTerm] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState("All Dates");
  const [customDates, setCustomDates] = useState({ from: "", to: "" });
  const [statusFilter, setStatusFilter] = useState("All");
  const [vehicleFilter, setVehicleFilter] = useState("All Vehicles");

  // Selection & Pagination
  const [selectedIds, setSelectedIds] = useState([]);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal & Drawer states
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
  let deliveredCount = 0;
  let totalSqFtDispatched = 0;

  passes.forEach(gp => {
    const d = (gp.date || gp.dispatchDate || gp.createdAt || "").slice(0, 10);
    if (d === todayStr) {
      todayDispatches += 1;
    }
    if (gp.status === "In Transit" || gp.status === "Dispatched") {
      inTransitCount += 1;
    }
    if (gp.status === "Delivered") {
      deliveredCount += 1;
    }
    totalSqFtDispatched += Number(gp.totalSqFt || 0);
  });

  // Filter Logic
  const filtered = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    return passes.filter(gp => {
      // 1. Search filter
      const q = searchTerm.toLowerCase().trim();
      if (q) {
        const matches =
          gp.gatePassNo?.toLowerCase().includes(q) ||
          gp.customerName?.toLowerCase().includes(q) ||
          gp.invoiceNo?.toLowerCase().includes(q) ||
          gp.vehicleRegNo?.toLowerCase().includes(q) ||
          gp.driverName?.toLowerCase().includes(q) ||
          gp.driverPhone?.includes(q) ||
          gp.destination?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 2. Status filter
      if (statusFilter !== "All" && gp.status !== statusFilter) {
        return false;
      }

      // 3. Vehicle filter
      if (vehicleFilter !== "All Vehicles" && gp.vehicleType !== vehicleFilter) {
        return false;
      }

      // 4. Date Range filter
      const gpDateStr = (gp.date || gp.dispatchDate || gp.createdAt || "").slice(0, 10);
      if (dateRangeFilter === "Today") {
        if (gpDateStr !== today) return false;
      } else if (dateRangeFilter === "Yesterday") {
        const yest = new Date(now);
        yest.setDate(now.getDate() - 1);
        if (gpDateStr !== yest.toISOString().slice(0, 10)) return false;
      } else if (dateRangeFilter === "This Week") {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const startStr = startOfWeek.toISOString().slice(0, 10);
        if (gpDateStr < startStr || gpDateStr > today) return false;
      } else if (dateRangeFilter === "This Month") {
        const monthPrefix = now.toISOString().slice(0, 7);
        if (!gpDateStr.startsWith(monthPrefix)) return false;
      } else if (dateRangeFilter === "Custom Range" && customDates.from && customDates.to) {
        if (gpDateStr < customDates.from || gpDateStr > customDates.to) return false;
      }

      return true;
    });
  }, [passes, searchTerm, statusFilter, vehicleFilter, dateRangeFilter, customDates]);

  // Pagination calculation
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIdx = (currentPage - 1) * pageSize;
  const paginatedList = useMemo(() => {
    return filtered.slice(startIdx, startIdx + pageSize);
  }, [filtered, startIdx, pageSize]);

  // Reset filter handler
  const handleResetFilters = () => {
    setSearchTerm("");
    setDateRangeFilter("All Dates");
    setCustomDates({ from: "", to: "" });
    setStatusFilter("All");
    setVehicleFilter("All Vehicles");
    setCurrentPage(1);
    setSelectedIds([]);
  };

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedList.length && paginatedList.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedList.map(gp => gp.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(tr(`Are you sure you want to delete ${selectedIds.length} gate passes?`, `کیا آپ واقعی ${selectedIds.length} گیٹ پاس حذف کرنا چاہتے ہیں؟`))) return;
    try {
      await bulkDeleteGatePasses(selectedIds);
      setSelectedIds([]);
    } catch (err) {
      alert("Error deleting: " + err.message);
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (selectedIds.length === 0) return;
    try {
      await bulkUpdateGatePassStatus(selectedIds, newStatus);
      setSelectedIds([]);
    } catch (err) {
      alert("Error updating status: " + err.message);
    }
  };

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
        alert(tr("Please add at least one item to the manifest.", "براہ کرم کم از کم ایک آئٹم درج کریں۔"));
        return;
      }

      const created = await createGatePass({
        ...formData,
        manifest
      });

      setIsModalOpen(false);
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
    if (!window.confirm(tr("Delete this gate pass? This cannot be undone.", "کیا آپ واقعی یہ گیٹ پاس حذف کرنا چاہتے ہیں؟"))) return;
    try {
      await deleteGatePass(id);
      if (drawerPass?.id === id) setDrawerPass(null);
      setSelectedIds(prev => prev.filter(i => i !== id));
    } catch (err) {
      alert("Failed to delete gate pass: " + err.message);
    }
  };

  const handleTriggerPrint = (gp, format = "a4") => {
    setPrintingPass(gp);
    setPrintFormat(format);
    setIsPrintModalOpen(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "1440px", margin: "0 auto", paddingBottom: "30px" }}>

      {/* ── 1. SEAMLESS HERO HEADER (Matching Dashboard Template) ── */}
      <div
        className="no-print"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 4px 10px 4px",
          minHeight: "84px",
          overflow: "hidden"
        }}
      >
        {/* Left: Overview Breadcrumb + Title + Subtitle */}
        <div style={{ position: "relative", zIndex: 2 }}>
          <div
            style={{
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#2563eb",
              marginBottom: "4px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>{language === "ur" ? "لاجسٹکس و گیٹ پاس" : "Logistics & Gate Pass"}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "13px",
                background: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
                flexShrink: 0
              }}
            >
              <Truck size={24} />
            </div>

            <div>
              <h1
                style={{
                  fontSize: "1.7rem",
                  fontWeight: 800,
                  color: "var(--text-primary, #0f172a)",
                  margin: 0,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2
                }}
              >
                {language === "ur" ? "رکشہ گیٹ پاس و ترسیل" : "Gate Pass & Yard Logistics"}{" "}
                <span
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "var(--text-secondary, #64748b)",
                    fontFamily: "var(--font-urdu, inherit)"
                  }}
                >
                  {language === "ur" ? "" : "(گیٹ پاس لاجسٹکس)"}
                </span>
              </h1>
              <p
                style={{
                  fontSize: "0.86rem",
                  color: "var(--text-secondary, #64748b)",
                  margin: "2px 0 0 0",
                  fontWeight: 500
                }}
              >
                {language === "ur"
                  ? "گاڑیوں اور گیٹ پاس پرچی کا انتظام"
                  : "Track vehicles, drivers, and gate passes"}
              </p>
            </div>
          </div>
        </div>

        {/* Right: + Issue Gate Pass Action Button */}
        <div className="no-print" style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenModal}
            id="add-gate-pass-btn"
            style={{
              background: "#2563eb",
              borderColor: "#2563eb",
              fontWeight: 700,
              fontSize: "0.86rem",
              padding: "10px 18px",
              borderRadius: "9px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
              color: "#ffffff"
            }}
          >
            <Plus size={16} />
            <span>{tr("Issue Gate Pass", "نیا گیٹ پاس جاری کریں")}</span>
          </button>
        </div>

        {/* Seamless Background Image extending across header right */}
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "-15px",
            bottom: "-15px",
            width: "50%",
            maxWidth: "520px",
            backgroundImage: "url('./general_background.jpg'), url('/general_background.jpg'), url('./gate_background.jpg'), url('/gate_background.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "right center",
            maskImage: "linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)",
            WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)",
            pointerEvents: "none",
            opacity: 0.95,
            borderRadius: "14px"
          }}
        />
      </div>

      {/* ── 2. TOP 4 KPI METRIC CARDS (Dashboard .kpi-card-grid & .kpi-metric-card) ── */}
      <div className="kpi-card-grid no-print">
        {/* KPI 1: Total Gate Passes */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon blue">
            <FileText size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Total Passes</span>
              <span className="kpi-metric-label-ur">(کل گیٹ پاس)</span>
            </div>
            <div className="kpi-metric-value font-mono">
              {passes.length}
            </div>
          </div>
        </div>

        {/* KPI 2: Delivered */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon green">
            <CheckCircle2 size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Delivered</span>
              <span className="kpi-metric-label-ur">(پہنچ گیا)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ color: "#059669" }}>
              {deliveredCount}
            </div>
          </div>
        </div>

        {/* KPI 3: In Transit */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon amber">
            <Truck size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">In Transit</span>
              <span className="kpi-metric-label-ur">(زیر ترسیل)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ color: "#d97706" }}>
              {inTransitCount}
            </div>
          </div>
        </div>

        {/* KPI 4: Dispatched Volume */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon purple">
            <Layers size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Dispatched Volume</span>
              <span className="kpi-metric-label-ur">(کل رقبہ)</span>
            </div>
            <div className="kpi-metric-value font-mono">
              {totalSqFtDispatched.toLocaleString()} <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted, #94a3b8)" }}>Sq.Ft</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. UNIFIED SEARCH & FILTER BAR (Exact Match of Pic 1) ─────────── */}
      <div
        className="no-print"
        style={{
          background: "var(--bg-card)",
          padding: "12px 18px",
          borderRadius: "12px",
          border: "1px solid var(--border-color)",
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)"
        }}
      >
        {/* Search Input Box */}
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: "220px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder={tr("Search by pass #, invoice, customer, driver, reg #...", "تلاش: گیٹ پاس نمبر، بل #، خریدار، ڈرائیور، گاڑی نمبر...")}
            style={{
              width: "100%",
              padding: "9px 12px 9px 36px",
              fontSize: "0.84rem",
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              color: "var(--text-primary)",
              outline: "none",
              transition: "border-color 0.2s ease"
            }}
          />
        </div>

        {/* Date Range Dropdown Pill */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "var(--bg-primary)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "5px 10px"
        }}>
          <Calendar size={15} style={{ color: "var(--accent-blue)", flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.62rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)", lineHeight: 1 }}>
              {tr("Date Range", "تاریخ")}
            </span>
            <select
              value={dateRangeFilter}
              onChange={e => { setDateRangeFilter(e.target.value); setCurrentPage(1); }}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                cursor: "pointer",
                padding: 0
              }}
            >
              <option value="All Dates">{tr("All Dates", "تمام تاریخیں")}</option>
              <option value="Today">{tr("Today", "آج")}</option>
              <option value="Yesterday">{tr("Yesterday", "گزشتہ کل")}</option>
              <option value="This Week">{tr("This Week", "اس ہفتے")}</option>
              <option value="This Month">{tr("This Month", "اس ماہ")}</option>
              <option value="Custom Range">{tr("Custom Range...", "مخصوص تاریخ...")}</option>
            </select>
          </div>
        </div>

        {/* Status Dropdown Pill */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "var(--bg-primary)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "5px 10px"
        }}>
          <Layers size={15} style={{ color: "var(--accent-blue)", flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.62rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)", lineHeight: 1 }}>
              {tr("Status", "اسٹیٹس")}
            </span>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                cursor: "pointer",
                padding: 0
              }}
            >
              <option value="All">{tr("All", "تمام")}</option>
              {ALL_STATUSES.filter(s => s !== "All").map(s => (
                <option key={s} value={s}>{language === "ur" ? STATUS_CONFIG[s]?.ur : s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Vehicle / Category Dropdown Pill */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "var(--bg-primary)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "5px 10px"
        }}>
          <Truck size={15} style={{ color: "var(--accent-blue)", flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.62rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)", lineHeight: 1 }}>
              {tr("Vehicle Type", "گاڑی کی قسم")}
            </span>
            <select
              value={vehicleFilter}
              onChange={e => { setVehicleFilter(e.target.value); setCurrentPage(1); }}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                cursor: "pointer",
                padding: 0
              }}
            >
              {VEHICLE_TYPES.map(v => (
                <option key={v} value={v}>{v === "All Vehicles" ? tr("All Vehicles", "تمام گاڑیاں") : v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Reset Filter Button */}
        <button
          className="btn btn-secondary"
          onClick={handleResetFilters}
          title={tr("Reset Filters", "فلٹرز ری سیٹ کریں")}
          style={{
            width: "38px",
            height: "38px",
            padding: 0,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)"
          }}
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Custom Date Pickers (if Custom Range is selected) */}
      {dateRangeFilter === "Custom Range" && (
        <div
          className="no-print"
          style={{
            background: "var(--bg-card)",
            padding: "10px 16px",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
            fontSize: "0.82rem"
          }}
        >
          <span style={{ fontWeight: 700, color: "var(--text-muted)" }}>From Date:</span>
          <input
            type="date"
            value={customDates.from}
            onChange={e => setCustomDates(p => ({ ...p, from: e.target.value }))}
            style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
          />
          <span style={{ fontWeight: 700, color: "var(--text-muted)" }}>To Date:</span>
          <input
            type="date"
            value={customDates.to}
            onChange={e => setCustomDates(p => ({ ...p, to: e.target.value }))}
            style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
          />
        </div>
      )}

      {/* ── 4. GATE PASS REGISTER DATA TABLE CARD (Exact Style of Pic 1) ── */}
      <div
        className="no-print"
        style={{
          background: "var(--bg-card)",
          borderRadius: "14px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
          overflow: "hidden"
        }}
      >
        {/* Table Header Row with Title and Page Size Dropdown */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FileText size={18} style={{ color: "var(--accent-blue)" }} />
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              {tr("Gate Pass Register", "گیٹ پاس رجسٹر")} <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>({filtered.length})</span>
            </h3>
          </div>

          {/* Right Controls: Bulk Actions & Show 10/page */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {selectedIds.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  className="btn btn-emerald btn-sm"
                  onClick={() => handleBulkStatusChange("Delivered")}
                  style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                >
                  <Check size={13} /> Mark Delivered ({selectedIds.length})
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: "#fb7185", fontSize: "0.75rem", padding: "4px 8px" }}
                  onClick={handleBulkDelete}
                >
                  <Trash2 size={13} /> Delete ({selectedIds.length})
                </button>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                style={{
                  padding: "5px 8px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  outline: "none"
                }}
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>
          </div>
        </div>

        {/* The Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border-color)" }}>
                {/* Select All Checkbox */}
                <th style={{ padding: "12px 14px", width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={paginatedList.length > 0 && selectedIds.length === paginatedList.length}
                    onChange={toggleSelectAll}
                    style={{ cursor: "pointer", width: "15px", height: "15px" }}
                  />
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {tr("Gate Pass #", "گیٹ پاس نمبر")}
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {tr("Date & Time", "تاریخ و وقت")}
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {tr("Customer & Dest.", "خریدار و منزل")}
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {tr("Vehicle & Driver", "گاڑی و ڈرائیور")}
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {tr("Manifest Qty", "روانہ کردہ مال")}
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {tr("Carriage / Kiraya", "کرایہ / اخراجات")}
                </th>
                <th style={{ padding: "12px 14px", textAlign: "center", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {tr("Status", "اسٹیٹس")}
                </th>
                <th style={{ padding: "12px 14px", textAlign: "center", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {tr("Actions", "ایکشن")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "64px 20px" }}>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      {tr("No gate passes match your filter criteria.", "کوئی گیٹ پاس ریکارڈ نہیں ملا۔")}
                    </div>
                    <div style={{ fontSize: "0.82rem", marginTop: "6px", color: "var(--text-muted)" }}>
                      {tr("Try clearing filters or creating a new gate pass from Issue Gate Pass.", "فلٹرز تبدیل کریں یا نیا گیٹ پاس بنائیں۔")}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedList.map(gp => {
                  const dispatchDateStr = gp.dispatchDate
                    ? new Date(gp.dispatchDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })
                    : (gp.date || "—");

                  const isSelected = selectedIds.includes(gp.id);

                  return (
                    <tr
                      key={gp.id}
                      onClick={() => setDrawerPass(gp)}
                      style={{
                        borderBottom: "1px solid var(--border-divider)",
                        background: isSelected ? "rgba(37,99,235,0.04)" : "transparent",
                        cursor: "pointer",
                        transition: "background 0.15s ease"
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--bg-primary)"; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                    >
                      {/* Selection Checkbox */}
                      <td style={{ padding: "14px 14px", textAlign: "center" }} onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(gp.id)}
                          style={{ cursor: "pointer", width: "15px", height: "15px" }}
                        />
                      </td>

                      {/* Gate Pass No & Invoice */}
                      <td style={{ padding: "14px 14px" }}>
                        <div style={{ fontWeight: 800, color: "var(--accent-blue)", fontFamily: "var(--font-mono)", fontSize: "0.92rem" }}>
                          {gp.gatePassNo}
                        </div>
                        {gp.invoiceNo && (
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontWeight: 600, marginTop: "2px" }}>
                            #{gp.invoiceNo}
                          </div>
                        )}
                      </td>

                      {/* Date & Time */}
                      <td style={{ padding: "14px 14px" }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>
                          {dispatchDateStr}
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          {gp.dispatchTime || "—"}
                        </div>
                      </td>

                      {/* Customer & Destination */}
                      <td style={{ padding: "14px 14px" }}>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{gp.customerName}</div>
                        <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <MapPin size={11} style={{ flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
                            {gp.destination || "Factory Yard"}
                          </span>
                        </div>
                      </td>

                      {/* Vehicle & Driver */}
                      <td style={{ padding: "14px 14px" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.82rem" }}>
                          {gp.vehicleType} {gp.vehicleRegNo ? <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>({gp.vehicleRegNo})</span> : ''}
                        </div>
                        {gp.driverName && (
                          <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            {gp.driverName} {gp.driverPhone ? `• ${gp.driverPhone}` : ''}
                          </div>
                        )}
                      </td>

                      {/* Manifest Quantity */}
                      <td style={{ padding: "14px 14px" }}>
                        <div style={{ fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                          {gp.totalSqFt || 0} <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Sq.Ft</span>
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          {gp.totalPieces || (gp.manifest || []).length} Pcs • {(gp.manifest || []).length} items
                        </div>
                      </td>

                      {/* Carriage Charges */}
                      <td style={{ padding: "14px 14px" }}>
                        {Number(gp.carriageCharges) > 0 ? (
                          <>
                            <div className="font-mono" style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                              Rs. {Number(gp.carriageCharges).toLocaleString()}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1px" }}>
                              {gp.carriagePaidBy?.includes("Customer") ? "Paid by Customer" : "Factory Paid"}
                            </div>
                          </>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 14px", textAlign: "center" }}>
                        <StatusBadge status={gp.status} language={language} />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 14px", textAlign: "center" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                          {/* View Drawer Button */}
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setDrawerPass(gp)}
                            title={tr("View Details", "تفصیل دیکھیں")}
                            style={{ padding: "5px 7px" }}
                          >
                            <Eye size={14} style={{ color: "var(--accent-blue)" }} />
                          </button>

                          {/* Print Button */}
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleTriggerPrint(gp, "a4")}
                            title={tr("Print Slip", "پرنٹ پرچی")}
                            style={{ padding: "5px 7px" }}
                          >
                            <Printer size={14} style={{ color: "var(--accent-blue)" }} />
                          </button>

                          {/* Quick Deliver */}
                          {gp.status !== "Delivered" && (
                            <button
                              className="btn btn-emerald btn-sm"
                              onClick={() => handleStatusChange(gp.id, "Delivered")}
                              title={tr("Mark Delivered", "مکمل کریں")}
                              style={{ padding: "5px 7px" }}
                            >
                              <Check size={14} />
                            </button>
                          )}

                          {/* Delete Button */}
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#fb7185", padding: "5px 7px" }}
                            onClick={() => handleDelete(gp.id)}
                            title={tr("Delete Pass", "حذف کریں")}
                          >
                            <Trash2 size={14} />
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

        {/* Table Footer with Exact Pic 1 Pagination Buttons */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            background: "var(--bg-card)"
          }}
        >
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500 }}>
            {filtered.length === 0
              ? "Showing 0 records"
              : `Showing ${startIdx + 1} to ${Math.min(startIdx + pageSize, filtered.length)} of ${filtered.length} records`}
          </div>

          {/* Pagination Buttons (Matching Bills & Invoices in Pic 1) */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-card)",
                color: currentPage === 1 ? "var(--text-muted)" : "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                opacity: currentPage === 1 ? 0.45 : 1,
                fontSize: "0.85rem",
                fontWeight: 600,
                transition: "all 0.15s ease"
              }}
            >
              &lt;
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
              const isActive = currentPage === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    border: isActive ? "1px solid #2563eb" : "1px solid var(--border-color)",
                    background: isActive ? "#2563eb" : "var(--bg-card)",
                    color: isActive ? "#ffffff" : "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: isActive ? 700 : 500,
                    boxShadow: isActive ? "0 2px 6px rgba(37,99,235,0.3)" : "none",
                    transition: "all 0.15s ease"
                  }}
                >
                  {p}
                </button>
              );
            })}

            <button
              type="button"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-card)",
                color: (currentPage === totalPages || totalPages === 0) ? "var(--text-muted)" : "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: (currentPage === totalPages || totalPages === 0) ? "not-allowed" : "pointer",
                opacity: (currentPage === totalPages || totalPages === 0) ? 0.45 : 1,
                fontSize: "0.85rem",
                fontWeight: 600,
                transition: "all 0.15s ease"
              }}
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* ── DETAIL DRAWER ──────────────────────────────────────────────── */}
      {drawerPass && (
        <GatePassDrawer
          gp={drawerPass}
          onClose={() => setDrawerPass(null)}
          onPrint={() => handleTriggerPrint(drawerPass, "a4")}
          onStatusChange={handleStatusChange}
          language={language}
        />
      )}

      {/* ── PRINT MODAL (A4 & 80mm THERMAL REPLICA) ────────────────────── */}
      <PrintableGateSlip
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        gatePass={printingPass}
        factorySettings={settings}
        defaultFormat={printFormat}
      />

      {/* ── ISSUE NEW GATE PASS MODAL FORM ─────────────────────────────── */}
      {isModalOpen && (
        <div className="app-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="app-modal-card"
            style={{ maxWidth: "580px" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="app-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div className="app-modal-icon-badge">
                  <Truck size={24} color="#ffffff" />
                </div>
                <div>
                  <h3 className="app-modal-title">
                    {tr("Issue Delivery / Rickshaw Gate Pass", "نیا رکشہ گیٹ پاس جاری کریں")}
                  </h3>
                  <p className="app-modal-subtitle">
                    {tr("Link with invoice bill or record manual dispatch manifest for factory exit", "بل بک سے لنک کریں یا دستی ڈسپیچ پرچی بنائیں")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="app-modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="app-modal-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                {/* 1. Link with Invoice */}
                <div className="app-form-group" style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <label className="app-form-label" style={{ marginBottom: "6px" }}>
                    {tr("Link Existing Invoice Bill (Optional)", "بل بک سے انوائس منتخب کریں (اختیاری)")}
                  </label>
                  <div className="app-input-wrapper">
                    <FileText size={16} className="app-input-icon" />
                    <select
                      value={formData.invoiceId}
                      onChange={e => handleInvoiceSelect(e.target.value)}
                      className="app-form-select"
                      style={{ fontWeight: 600 }}
                    >
                      <option value="">{tr("-- Manual Dispatch (No Linked Bill) --", "-- دستی ڈسپیچ (بغیر انوائس) --")}</option>
                      {invoices.map(inv => (
                        <option key={inv.id} value={inv.id}>
                          #{inv.invoiceNo} — {inv.customerName} ({inv.items?.length || 0} items, Rs. {Number(inv.totalAmount || 0).toLocaleString()})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="app-input-chevron" />
                  </div>
                </div>

                {/* 2. Customer & Destination */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      {tr("Customer Name", "خریدار کا نام")} <span className="app-form-label-required">*</span>
                    </label>
                    <div className="app-input-wrapper">
                      <User size={16} className="app-input-icon" />
                      <input
                        type="text"
                        required
                        value={formData.customerName}
                        onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                        placeholder="e.g. Tariq Mehmood"
                        className="app-form-input"
                      />
                    </div>
                  </div>

                  <div className="app-form-group">
                    <label className="app-form-label">
                      {tr("Customer Mobile", "گاہک کا فون")}
                    </label>
                    <div className="app-input-wrapper">
                      <Phone size={16} className="app-input-icon" />
                      <input
                        type="text"
                        value={formData.customerPhone}
                        onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                        placeholder="0300-1234567"
                        className="app-form-input"
                      />
                    </div>
                  </div>

                  <div className="app-form-group" style={{ gridColumn: "1 / -1" }}>
                    <label className="app-form-label">
                      {tr("Delivery Destination / Site Address", "منزل کا پتہ")}
                    </label>
                    <div className="app-input-wrapper">
                      <MapPin size={16} className="app-input-icon" />
                      <input
                        type="text"
                        value={formData.destination}
                        onChange={e => setFormData({ ...formData, destination: e.target.value })}
                        placeholder="e.g. House #14, Street 5, Eden Gardens, Faisalabad"
                        className="app-form-input"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Vehicle & Driver Details (2x2 Grid) */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div className="app-form-group">
                    <label className="app-form-label" style={{ fontSize: "0.74rem" }}>
                      {tr("Vehicle Type", "گاڑی کی قسم")}
                    </label>
                    <div className="app-input-wrapper">
                      <Truck size={14} className="app-input-icon" />
                      <select
                        value={formData.vehicleType}
                        onChange={e => setFormData({ ...formData, vehicleType: e.target.value })}
                        className="app-form-select"
                        style={{ fontSize: "0.82rem", padding: "7px 10px 7px 32px", height: "36px" }}
                      >
                        {VEHICLE_TYPES.filter(v => v !== "All Vehicles").map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="app-input-chevron" />
                    </div>
                  </div>

                  <div className="app-form-group">
                    <label className="app-form-label" style={{ fontSize: "0.74rem" }}>
                      {tr("Vehicle Reg #", "گاڑی نمبر")}
                    </label>
                    <div className="app-input-wrapper">
                      <input
                        type="text"
                        value={formData.vehicleRegNo}
                        onChange={e => setFormData({ ...formData, vehicleRegNo: e.target.value.toUpperCase() })}
                        placeholder="e.g. FSD-8492"
                        className="app-form-input font-mono"
                        style={{ fontSize: "0.82rem", height: "36px" }}
                      />
                    </div>
                  </div>

                  <div className="app-form-group">
                    <label className="app-form-label" style={{ fontSize: "0.74rem" }}>
                      {tr("Driver Name", "ڈرائیور کا نام")}
                    </label>
                    <div className="app-input-wrapper">
                      <User size={14} className="app-input-icon" />
                      <input
                        type="text"
                        value={formData.driverName}
                        onChange={e => setFormData({ ...formData, driverName: e.target.value })}
                        placeholder="e.g. Aslam"
                        className="app-form-input"
                        style={{ fontSize: "0.82rem", padding: "7px 10px 7px 32px", height: "36px" }}
                      />
                    </div>
                  </div>

                  <div className="app-form-group">
                    <label className="app-form-label" style={{ fontSize: "0.74rem" }}>
                      {tr("Driver Mobile", "ڈرائیور موبائل")}
                    </label>
                    <div className="app-input-wrapper">
                      <Phone size={14} className="app-input-icon" />
                      <input
                        type="text"
                        value={formData.driverPhone}
                        onChange={e => setFormData({ ...formData, driverPhone: e.target.value })}
                        placeholder="0321-7654321"
                        className="app-form-input"
                        style={{ fontSize: "0.82rem", padding: "7px 10px 7px 32px", height: "36px" }}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Carriage Charges & Payment Mode */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      {tr("Carriage / Kiraya (Rs.)", "کرایہ رقم")}
                    </label>
                    <div className="app-input-wrapper">
                      <DollarSign size={16} className="app-input-icon" />
                      <input
                        type="number"
                        value={formData.carriageCharges}
                        onChange={e => setFormData({ ...formData, carriageCharges: e.target.value })}
                        placeholder="0"
                        className="app-form-input font-mono"
                      />
                    </div>
                  </div>

                  <div className="app-form-group">
                    <label className="app-form-label">
                      {tr("Carriage Paid By", "کرایہ ادائیگی کی ذمہ داری")}
                    </label>
                    <div className="app-input-wrapper">
                      <CreditCard size={16} className="app-input-icon" />
                      <select
                        value={formData.carriagePaidBy}
                        onChange={e => setFormData({ ...formData, carriagePaidBy: e.target.value })}
                        className="app-form-select"
                      >
                        {CARRIAGE_PAID_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="app-input-chevron" />
                    </div>
                  </div>
                </div>

                {/* 5. Dispatch Manifest Items */}
                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <label className="app-form-label" style={{ margin: 0, fontWeight: 700, color: "#1e293b" }}>
                      {tr("Dispatch Manifest / Marble Items", "روانہ کردہ مال کی فہرست")}
                    </label>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleAddManifestRow}
                      style={{ padding: "5px 12px", fontSize: "0.78rem", borderRadius: "8px", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}
                    >
                      <Plus size={14} /> {tr("Add Row", "نئی لائن شامل کریں")}
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {formData.manifestItems.map((item, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 1.2fr 0.9fr 1fr auto", gap: "8px", alignItems: "center", background: "#ffffff", padding: "8px 10px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                        <div className="app-input-wrapper">
                          <Layers size={14} className="app-input-icon" />
                          <input
                            type="text"
                            required
                            value={item.name}
                            onChange={e => handleManifestChange(idx, "name", e.target.value)}
                            placeholder="e.g. Ziarat White Slabs"
                            className="app-form-input"
                            style={{ padding: "7px 10px 7px 32px", fontSize: "0.82rem", height: "36px" }}
                          />
                        </div>

                        <div className="app-input-wrapper">
                          <select
                            value={item.thicknessSutar}
                            onChange={e => handleManifestChange(idx, "thicknessSutar", e.target.value)}
                            className="app-form-select"
                            style={{ padding: "7px 20px 7px 8px", fontSize: "0.82rem", height: "36px", fontWeight: 700 }}
                          >
                            {SUTAR_OPTIONS.map(s => (
                              <option key={s} value={s}>{s} Sutar</option>
                            ))}
                          </select>
                          <ChevronDown size={12} className="app-input-chevron" />
                        </div>

                        <div className="app-input-wrapper">
                          <input
                            type="text"
                            value={item.size}
                            onChange={e => handleManifestChange(idx, "size", e.target.value)}
                            placeholder="12×12 / 2×4"
                            className="app-form-input"
                            style={{ padding: "7px 10px", fontSize: "0.82rem", height: "36px" }}
                          />
                        </div>

                        <div className="app-input-wrapper">
                          <input
                            type="number"
                            value={item.pieces}
                            onChange={e => handleManifestChange(idx, "pieces", e.target.value)}
                            placeholder="Pcs"
                            className="app-form-input font-mono"
                            style={{ padding: "7px 8px", fontSize: "0.82rem", height: "36px", textAlign: "center" }}
                          />
                        </div>

                        <div className="app-input-wrapper">
                          <input
                            type="number"
                            step="0.01"
                            value={item.sqFt}
                            onChange={e => handleManifestChange(idx, "sqFt", e.target.value)}
                            placeholder="Sq.Ft"
                            className="app-form-input font-mono"
                            style={{ padding: "7px 8px", fontSize: "0.82rem", height: "36px", textAlign: "right", fontWeight: 700 }}
                          />
                        </div>

                        {formData.manifestItems.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#ef4444", padding: "6px", borderRadius: "6px" }}
                            onClick={() => handleRemoveManifestRow(idx)}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6. Notes */}
                <div className="app-form-group">
                  <label className="app-form-label">
                    {tr("Notes / Dispatch Remarks", "خصوصی ہدایات یا ریمارکس")}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. Fragile load, handle with care."
                    className="app-form-textarea"
                    style={{ minHeight: "60px" }}
                  />
                </div>

                {/* Notice banner */}
                <div className="app-form-notice">
                  <Info size={16} color="#2563eb" style={{ flexShrink: 0 }} />
                  <span>All fields marked with <b style={{ color: '#ef4444' }}>*</b> are required.</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="app-modal-footer">
                <button
                  type="button"
                  className="app-btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  <X size={16} />
                  {tr("Cancel", "منسوخ")}
                </button>
                <button
                  type="submit"
                  className="app-btn-submit"
                >
                  <Printer size={16} />
                  {tr("Save & Print Gate Slip", "محفوظ کریں اور پرنٹ کریں")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
