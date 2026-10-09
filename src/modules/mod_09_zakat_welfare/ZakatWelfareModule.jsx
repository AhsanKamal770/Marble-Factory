import React, { useState, useEffect, useMemo } from "react";
import {
  HandHeart,
  Plus,
  Search,
  DollarSign,
  Heart,
  Calendar,
  FileText,
  X,
  CheckCircle,
  Users,
  User,
  Phone,
  ChevronDown,
  CreditCard,
  Save,
  Info,
  Printer,
  Pencil,
  Trash2,
  Gift,
  Award,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/index";
import { useLanguage } from "../../context/LanguageContext";
import UniversalReportPrintModal from "../../components/UniversalReportPrintModal";
import { zakatWelfareService } from "./zakatWelfareService";

export default function ZakatWelfareModule() {
  const { language } = useLanguage();
  const isUrdu = language === "ur";
  const tr = (en, ur) => (isUrdu ? ur : en);

  const [zakatRecords, setZakatRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL"); // 'ALL' | 'Zakat' | 'Welfare' | 'Ration'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const dbSettings = useLiveQuery(() => db.settings.toArray(), [])?.[0] || {};

  // Form State
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [category, setCategory] = useState("Zakat"); // 'Zakat' | 'Welfare' | 'Ration'
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [reason, setReason] = useState("Monthly Ration Support");
  const [disbursementDate, setDisbursementDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allZakat = await zakatWelfareService.getAllRecords();
      setZakatRecords(
        allZakat.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
      );
    } catch (err) {
      console.error("Error loading Zakat records:", err);
    }
  };

  const handleOpenAddModal = () => {
    setEditingRecordId(null);
    setRecipientName("");
    setRecipientPhone("");
    setCategory("Zakat");
    setAmount("");
    setPaymentMode("Cash");
    setReason("Monthly Ration Support");
    setDisbursementDate(new Date().toISOString().slice(0, 10));
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rec) => {
    setEditingRecordId(rec.id);
    setRecipientName(rec.recipientName || "");
    setRecipientPhone(rec.phone || "");
    setCategory(rec.category || "Zakat");
    setAmount(String(rec.amount || ""));
    setPaymentMode(rec.paymentMode || "Cash");
    setReason(rec.reason || "Monthly Ration Support");
    setDisbursementDate(rec.date ? rec.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setIsModalOpen(true);
  };

  const handleDeleteRecord = async (rec) => {
    const confirmMsg = isUrdu
      ? `کیا آپ واقعی "${rec.recipientName}" کا زکوٰۃ/امداد کا ریکارڈ حذف کرنا چاہتے ہیں؟`
      : `Are you sure you want to delete this disbursement record for "${rec.recipientName}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await zakatWelfareService.deleteRecord(rec.id);
      loadData();
    } catch (err) {
      alert("Error deleting record: " + err.message);
    }
  };

  const handleSaveRecord = async (e) => {
    e.preventDefault();
    if (!recipientName || !amount) {
      alert(isUrdu ? "براہِ کرم تمام لازمی خانے پر کریں!" : "Please fill required fields!");
      return;
    }

    const roundedAmount = Math.round(parseFloat(amount) || 0);

    try {
      if (editingRecordId) {
        const existing = zakatRecords.find((r) => r.id === editingRecordId);
        await zakatWelfareService.updateRecord(editingRecordId, {
          ...existing,
          recipientName: recipientName.trim(),
          phone: recipientPhone.trim(),
          category,
          amount: roundedAmount,
          paymentMode,
          reason: reason.trim(),
          date: disbursementDate,
          updatedAt: new Date().toISOString()
        });
      } else {
        await zakatWelfareService.addRecord({
          recipientName: recipientName.trim(),
          phone: recipientPhone.trim(),
          category,
          amount: roundedAmount,
          paymentMode,
          reason: reason.trim(),
          date: disbursementDate,
          createdAt: new Date().toISOString()
        });
      }

      setIsModalOpen(false);
      setEditingRecordId(null);
      setRecipientName("");
      setRecipientPhone("");
      setAmount("");
      loadData();
    } catch (err) {
      alert("Error saving record: " + err.message);
    }
  };

  // Filtered Records
  const filteredRecords = zakatRecords.filter((r) => {
    const matchesSearch =
      (r.recipientName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.reason || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.phone || "").includes(searchTerm);

    if (!matchesSearch) return false;
    if (filterType === "ALL") return true;
    return r.category === filterType;
  });

  // KPI Calculations
  const totals = useMemo(() => {
    return zakatRecords.reduce(
      (acc, curr) => {
        const amt = Number(curr.amount) || 0;
        if (curr.category === "Zakat") acc.zakat += amt;
        else if (curr.category === "Ration") acc.ration += amt;
        else acc.welfare += amt;
        acc.total += amt;
        return acc;
      },
      { zakat: 0, welfare: 0, ration: 0, total: 0 }
    );
  }, [zakatRecords]);

  const uniqueBeneficiariesCount = useMemo(() => {
    const set = new Set(zakatRecords.map((r) => (r.recipientName || "").trim().toLowerCase()).filter(Boolean));
    return set.size;
  }, [zakatRecords]);

  return (
    <div
      className="zakat-printable-area"
      style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "1440px", margin: "0 auto" }}
    >
      {/* ── Dynamic Print Styles Fix ────────────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .zakat-printable-area, .zakat-printable-area * { visibility: visible !important; }
          .zakat-printable-area {
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
          table { border: 1px solid #ccc !important; width: 100% !important; border-collapse: collapse !important; }
          th, td { border-bottom: 1px solid #ddd !important; padding: 6px 8px !important; }
        }
      `}</style>

      {/* Print-Only Header Banner */}
      <div style={{ display: 'none' }} className="print-target">
        <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: '#000' }}>
            رانا عبداللہ صدیق ماربل فیکٹری (Rana Abdullah Siddique Marble Factory)
          </h2>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '3px' }}>
            Zakat & Welfare Charity Fund Audit Statement (زکوٰۃ و فلاحی فنڈ آڈٹ رپورٹ)
          </div>
          <div style={{ fontSize: '0.78rem', color: '#555', marginTop: '2px' }}>
            Printed on: {new Date().toLocaleString()} | Total Distributed: Rs. {totals.total.toLocaleString()}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 1. SEAMLESS HERO HEADER SECTION (Matching Dashboard & general_background) */}
      {/* ------------------------------------------------------------------------- */}
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
              color: "#059669",
              marginBottom: "4px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>{isUrdu ? "زکوٰۃ و فلاحی فنڈ" : "Zakat & Welfare Charity Fund"}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "13px",
                background: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
                flexShrink: 0
              }}
            >
              <Heart size={24} />
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
                {isUrdu ? "زکوٰۃ فنڈ و فلاحی امداد" : "Zakat & Welfare Fund"}{" "}
                <span
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "var(--text-secondary, #64748b)",
                    fontFamily: "var(--font-urdu, inherit)"
                  }}
                >
                  {isUrdu ? "" : "(زکوٰۃ و امداد)"}
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
                {isUrdu
                  ? "سالانہ زکوٰۃ آڈٹ، مستحق خاندانوں کی کفالت، راشن سپورٹ اور مصدقہ آف لائن چیریٹی کا مکمل انتظام"
                  : "Annual Zakat compliance, monthly ration aid, medical support & offline charity disbursements"}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Buttons - Record Distribution ONLY */}
        <div className="no-print" style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{
              background: "#059669",
              borderColor: "#059669",
              fontWeight: 700,
              fontSize: "0.86rem",
              padding: "9px 18px",
              borderRadius: "9px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
              color: "#ffffff"
            }}
            onClick={handleOpenAddModal}
          >
            <Plus size={16} />
            <span>{tr("Record Distribution", "امداد درج کریں")}</span>
          </button>
        </div>

        {/* Right: Background Marble Image with seamless fade mask using general_background */}
        <div
          style={{
            position: "absolute",
            right: "0",
            top: "-15px",
            bottom: "-15px",
            width: "50%",
            maxWidth: "520px",
            backgroundImage: `url('./general_background.jpg'), url('/general_background.jpg'), url('./general_background.jpeg'), url('/general_background.jpeg'), url('./invoice_background.jpg')`,
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

      {/* ------------------------------------------------------------------------- */}
      {/* 2. PRIMARY 4 KPI METRIC CARDS (Dashboard standard .kpi-card-grid)         */}
      {/* ------------------------------------------------------------------------- */}
      <div className="kpi-card-grid">
        {/* KPI 1: TOTAL DISTRIBUTED FUND */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon green">
            <Heart size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Total Distributed</span>
              <span className="kpi-metric-label-ur">({isUrdu ? "کل تقسیم شدہ" : "Total Aid"})</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ color: "#059669" }}>
              Rs. {totals.total.toLocaleString()}
            </div>
          </div>
        </div>

        {/* KPI 2: ZAKAT DISBURSED */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon blue">
            <HandHeart size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Zakat Fund</span>
              <span className="kpi-metric-label-ur">({isUrdu ? "زکوٰۃ فنڈ" : "Zakat Aid"})</span>
            </div>
            <div className="kpi-metric-value font-mono">
              Rs. {totals.zakat.toLocaleString()}
            </div>
          </div>
        </div>

        {/* KPI 3: WELFARE & RATION AID */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon amber">
            <Gift size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Welfare & Ration</span>
              <span className="kpi-metric-label-ur">({isUrdu ? "امداد و راشن" : "Welfare"})</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ color: "#d97706" }}>
              Rs. {(totals.welfare + totals.ration).toLocaleString()}
            </div>
          </div>
        </div>

        {/* KPI 4: BENEFICIARIES SUPPORTED */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon purple">
            <Users size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Beneficiaries</span>
              <span className="kpi-metric-label-ur">({isUrdu ? "کل مستحقین" : "Families"})</span>
            </div>
            <div className="kpi-metric-value font-mono">
              {uniqueBeneficiariesCount} <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted, #94a3b8)" }}>{isUrdu ? "خاندان" : "Families"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. TOOLBAR CARD (Search bar on Left, Print Audit on Right) ──────── */}
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
          justifyContent: "space-between",
          flexWrap: "wrap",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)"
        }}
      >
        {/* Left: Search Input Box */}
        <div style={{ position: "relative", flex: "1 1 260px", minWidth: "220px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={tr("Search by beneficiary, CNIC, category, contact...", "مستحق کا نام، شناختی کارڈ، کیٹیگری، فون سے تلاش کریں...")}
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

        {/* Right: Print Audit Statement Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              fontWeight: 700,
              fontSize: "0.84rem",
              padding: "9px 16px",
              borderRadius: "9px",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
            onClick={() => setIsPrintModalOpen(true)}
          >
            <Printer size={15} />
            <span>{tr("Print Audit Statement", "آڈٹ رپورٹ پرنٹ کریں")}</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 4. MAIN DATA SECTION: CATEGORY TABS & DISBURSEMENT TABLE                  */}
      {/* ------------------------------------------------------------------------- */}
      <div className="card" style={{ padding: 0 }}>
        {/* Table Toolbar Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-divider, #f1f5f9)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          {/* Left: Filter Buttons */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { id: "ALL", label: tr("All Distributions", "تمام فنڈ"), count: zakatRecords.length },
              { id: "Zakat", label: tr("Zakat Fund", "زکوٰۃ فنڈ"), count: zakatRecords.filter(r => r.category === "Zakat").length },
              { id: "Welfare", label: tr("Welfare Aid", "فلاحی امداد"), count: zakatRecords.filter(r => r.category === "Welfare").length },
              { id: "Ration", label: tr("Ration Aid", "راشن سپورٹ"), count: zakatRecords.filter(r => r.category === "Ration").length }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`btn btn-sm ${filterType === tab.id ? "btn-primary" : "btn-secondary"}`}
                style={{
                  fontWeight: 700,
                  background: filterType === tab.id ? "#059669" : undefined,
                  borderColor: filterType === tab.id ? "#059669" : undefined
                }}
                onClick={() => setFilterType(tab.id)}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{isUrdu ? "تاریخ" : "Date"}</th>
                <th>{isUrdu ? "مستحق فرد / خاندان" : "Recipient / Beneficiary"}</th>
                <th>{isUrdu ? "فنڈ کیٹیگری" : "Category"}</th>
                <th>{isUrdu ? "ادائیگی موڈ" : "Payment Mode"}</th>
                <th style={{ textAlign: "right" }}>{isUrdu ? "ادا شدہ رقم" : "Amount Paid"}</th>
                <th>{isUrdu ? "مقصد / تفصیل" : "Reason / Purpose"}</th>
                <th style={{ textAlign: "right" }}>{isUrdu ? "اختیارات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "36px", color: "#94a3b8" }}>
                    {isUrdu ? "کوئی ریکارڈ موجود نہیں۔ 'امداد درج کریں' پر کلک کریں۔" : "No disbursement records found. Click 'Record Distribution' to add."}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isZakat = rec.category === "Zakat";
                  const isRation = rec.category === "Ration";
                  return (
                    <tr key={rec.id}>
                      {/* Date */}
                      <td className="font-mono" style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        {rec.date ? rec.date.slice(0, 10) : (rec.createdAt ? rec.createdAt.slice(0, 10) : "—")}
                      </td>

                      {/* Recipient Name */}
                      <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%",
                            background: isZakat ? "rgba(5, 150, 105, 0.1)" : "rgba(37, 99, 235, 0.1)",
                            color: isZakat ? "#059669" : "#2563eb",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: "0.8rem"
                          }}>
                            {rec.recipientName?.charAt(0)?.toUpperCase() || "R"}
                          </div>
                          <div>
                            <div>{rec.recipientName}</div>
                            {rec.phone && (
                              <div className="font-mono" style={{ fontSize: "0.72rem", color: "#64748b" }}>
                                {rec.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "0.74rem",
                            fontWeight: 800,
                            background: isZakat ? "#dcfce7" : isRation ? "#fef3c7" : "#eff6ff",
                            color: isZakat ? "#16a34a" : isRation ? "#d97706" : "#2563eb",
                            border: `1px solid ${isZakat ? "#bbf7d0" : isRation ? "#fde68a" : "#bfdbfe"}`
                          }}
                        >
                          {isZakat ? <HandHeart size={12} /> : isRation ? <Gift size={12} /> : <Heart size={12} />}
                          {rec.category}
                        </span>
                      </td>

                      {/* Payment Mode */}
                      <td>{rec.paymentMode || "Cash"}</td>

                      {/* Amount */}
                      <td className="font-mono" style={{ textAlign: "right", fontWeight: 800, fontSize: "0.95rem", color: "#059669" }}>
                        Rs. {Number(rec.amount || 0).toLocaleString()}
                      </td>

                      {/* Reason */}
                      <td style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                        {rec.reason || "—"}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(rec)}
                            style={{
                              width: "26px",
                              height: "26px",
                              borderRadius: "6px",
                              border: "1px solid #bbf7d0",
                              background: "#f0fdf4",
                              color: "#16a34a",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer"
                            }}
                            title={isUrdu ? "ترمیم کریں" : "Edit record"}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(rec)}
                            style={{
                              width: "26px",
                              height: "26px",
                              borderRadius: "6px",
                              border: "1px solid #fecdd3",
                              background: "#fff1f2",
                              color: "#e11d48",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer"
                            }}
                            title={isUrdu ? "حذف کریں" : "Delete record"}
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
      </div>

      {/* ========================================================================= */}
      {/* MODAL: RECORD / EDIT ZAKAT & WELFARE DISBURSEMENT                         */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="app-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="app-modal-card"
            style={{ maxWidth: "560px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="app-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div className="app-modal-icon-badge" style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)" }}>
                  <Heart size={24} color="#ffffff" />
                </div>
                <div>
                  <h3 className="app-modal-title">
                    {editingRecordId
                      ? (isUrdu ? "زکوٰۃ / امداد کی تفصیل میں ترمیم" : "Edit Disbursement Record")
                      : (isUrdu ? "زکوٰۃ و امداد کی ادائیگی کا اندراج" : "Record Zakat & Welfare Disbursement")}
                  </h3>
                  <p className="app-modal-subtitle">
                    {isUrdu ? "مستحق فرد، امداد کی قسم اور رقم کا مصدقہ اندراج کریں" : "Record charity disbursement details for audit & record keeping"}
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

            <form onSubmit={handleSaveRecord} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="app-modal-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Recipient Name */}
                <div className="app-form-group">
                  <label className="app-form-label">
                    {isUrdu ? "مستحق فرد / خاندان کا نام" : "Beneficiary / Recipient Name"} <span className="app-form-label-required">*</span>
                  </label>
                  <div className="app-input-wrapper">
                    <User size={16} className="app-input-icon" />
                    <input
                      type="text"
                      required
                      className="app-form-input"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder={isUrdu ? "مثلاً بیوہ حلیمہ بی بی، مستحق مزدور اختر علی" : "e.g. Haleema Bibi (Widow), Master Aslam Helper"}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Category & Phone */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      {isUrdu ? "فنڈ کیٹیگری" : "Fund Category"} <span className="app-form-label-required">*</span>
                    </label>
                    <div className="app-input-wrapper">
                      <Heart size={16} className="app-input-icon" />
                      <select
                        className="app-form-select"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option value="Zakat">{isUrdu ? "زکوٰۃ فنڈ (Zakat Fund)" : "Zakat Fund"}</option>
                        <option value="Welfare">{isUrdu ? "عام فلاحی امداد (General Welfare)" : "General Welfare"}</option>
                        <option value="Ration">{isUrdu ? "ماہانہ راشن پیکج (Ration Aid)" : "Ration Package"}</option>
                      </select>
                      <ChevronDown size={14} className="app-input-chevron" />
                    </div>
                  </div>

                  <div className="app-form-group">
                    <label className="app-form-label">
                      {isUrdu ? "موبائل فون (اختیاری)" : "Phone Number (Optional)"}
                    </label>
                    <div className="app-input-wrapper">
                      <Phone size={16} className="app-input-icon" />
                      <input
                        type="text"
                        className="app-form-input font-mono"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        placeholder="0300-1234567"
                      />
                    </div>
                  </div>
                </div>

                {/* Amount & Date */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      {isUrdu ? "امداد رقم (روپے - Amount)" : "Amount Paid (Rs.)"} <span className="app-form-label-required">*</span>
                    </label>
                    <div className="app-input-wrapper">
                      <DollarSign size={16} className="app-input-icon" />
                      <input
                        type="number"
                        required
                        min="1"
                        step="1"
                        className="app-form-input font-mono"
                        style={{ color: "#059669", fontWeight: 800, fontSize: "1.1rem" }}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="e.g. 5000"
                      />
                    </div>
                  </div>

                  <div className="app-form-group">
                    <label className="app-form-label">
                      {isUrdu ? "تاریخ" : "Date"}
                    </label>
                    <div className="app-input-wrapper">
                      <Calendar size={16} className="app-input-icon" />
                      <input
                        type="date"
                        className="app-form-input font-mono"
                        value={disbursementDate}
                        onChange={(e) => setDisbursementDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Mode & Reason */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      {isUrdu ? "ادائیگی کا طریقہ" : "Payment Mode"}
                    </label>
                    <div className="app-input-wrapper">
                      <CreditCard size={16} className="app-input-icon" />
                      <select
                        className="app-form-select"
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                      >
                        <option value="Cash">{isUrdu ? "نقدی دراز (Cash)" : "Cash"}</option>
                        <option value="Bank Transfer">{isUrdu ? "بینک ٹرانسفر (Bank Transfer)" : "Bank Transfer"}</option>
                        <option value="EasyPaisa / JazzCash">EasyPaisa / JazzCash</option>
                      </select>
                      <ChevronDown size={14} className="app-input-chevron" />
                    </div>
                  </div>

                  <div className="app-form-group">
                    <label className="app-form-label">
                      {isUrdu ? "مقصد / ضرورت" : "Reason / Purpose"}
                    </label>
                    <div className="app-input-wrapper">
                      <FileText size={16} className="app-input-icon" />
                      <input
                        type="text"
                        className="app-form-input"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={isUrdu ? "مثلاً راشن، علاج، عید خرچ" : "e.g. Monthly Ration, Medical aid"}
                      />
                    </div>
                  </div>
                </div>

                <div className="app-form-notice" style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}>
                  <Info size={16} color="#059669" style={{ flexShrink: 0 }} />
                  <span>{isUrdu ? "یہ اندراج فیکٹری کے سالانہ زکوٰۃ آڈٹ اور ڈیش بورڈ رپورٹس میں شامل ہو جائے گا۔" : "This payment will be recorded in annual Zakat compliance audit."}</span>
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
                  {isUrdu ? "منسوخ" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="app-btn-submit"
                  style={{ background: "#059669", borderColor: "#059669" }}
                >
                  <Save size={16} />
                  {editingRecordId ? (isUrdu ? "تبدیلیاں محفوظ کریں" : "Update Record") : (isUrdu ? "امداد محفوظ کریں" : "Save Disbursement")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Universal Report Print Modal for Zakat & Welfare Fund */}
      <UniversalReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Zakat & Welfare Charity Fund Audit Statement"
        titleUrdu="زکوٰۃ و ویلفیئر فنڈ آڈٹ اسٹیٹمنٹ"
        subtitle={`Category: ${filterType} | Total Beneficiaries: ${uniqueBeneficiariesCount} | Records: ${filteredRecords.length}`}
        factorySettings={dbSettings}
        kpis={[
          { label: "Total Disbursed", labelUrdu: "کل امداد تقسیم", value: `Rs. ${totals.total.toLocaleString()}`, color: "#059669" },
          { label: "Zakat Funds", labelUrdu: "زکوٰۃ فنڈ", value: `Rs. ${totals.zakat.toLocaleString()}`, color: "#2563eb" },
          {
            label: "Welfare & Ration",
            labelUrdu: "ویلفیئر و راشن",
            value: `Rs. ${(totals.welfare + totals.ration).toLocaleString()}`,
            color: "#7c3aed"
          },
          { label: "Beneficiaries", labelUrdu: "مستحقین تعداد", value: uniqueBeneficiariesCount, color: "#d97706" }
        ]}
        columns={[
          {
            key: "date",
            label: "Date",
            labelUrdu: "تاریخ",
            render: (r) => (r.date || r.createdAt || "").slice(0, 10)
          },
          { key: "recipientName", label: "Beneficiary Name", labelUrdu: "مستحق کا نام", bold: true },
          { key: "phone", label: "Contact Phone", labelUrdu: "فون" },
          {
            key: "category",
            label: "Fund Category",
            labelUrdu: "فنڈ کیٹیگری",
            render: (r) =>
              r.category === "Zakat"
                ? "زکوٰۃ فنڈ"
                : r.category === "Ration"
                ? "راشن فنڈ"
                : "ویلفیئر امداد"
          },
          {
            key: "amount",
            label: "Amount (Rs.)",
            labelUrdu: "امداد رقم",
            align: "right",
            bold: true,
            render: (r) => `Rs. ${Number(r.amount || 0).toLocaleString()}`
          },
          { key: "paymentMode", label: "Payment Mode", labelUrdu: "طریقہ ادائیگی" },
          { key: "reason", label: "Purpose / Details", labelUrdu: "وجہ / تفصیل" }
        ]}
        data={filteredRecords}
        summaryRows={[
          { label: "Total Zakat Disbursed", labelUrdu: "کل زکوٰۃ تقسیم", value: `Rs. ${totals.zakat.toLocaleString()}` },
          {
            label: "Total Welfare Disbursed",
            labelUrdu: "کل ویلفیئر فنڈ تقسیم",
            value: `Rs. ${(totals.welfare + totals.ration).toLocaleString()}`
          },
          { label: "Grand Total Charity Disbursed", labelUrdu: "گرینڈ ٹوٹل امداد تقسیم", value: `Rs. ${totals.total.toLocaleString()}` }
        ]}
      />
    </div>
  );
}