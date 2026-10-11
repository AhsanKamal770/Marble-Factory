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
  ShieldCheck,
  UserPlus,
  Eye,
  MapPin
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

  // Live Query: All Distributions
  const liveRecords = useLiveQuery(async () => {
    try {
      const all = await zakatWelfareService.getAllRecords();
      return (all || []).sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
    } catch {
      return [];
    }
  }, []);

  // Live Query: All Zakat Holders / Beneficiaries
  const liveHolders = useLiveQuery(async () => {
    try {
      const all = await zakatWelfareService.getAllHolders();
      return (all || []).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } catch {
      return [];
    }
  }, []);

  const zakatRecords = liveRecords || [];
  const zakatHolders = liveHolders || [];

  // Tab State: 'distributions' | 'holders'
  const [mainTab, setMainTab] = useState("distributions");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL"); // 'ALL' | 'Zakat' | 'Welfare' | 'Ration'

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false); // Record Distribution Modal
  const [isHolderModalOpen, setIsHolderModalOpen] = useState(false); // Add/Edit Zakat Holder Modal
  const [viewingRecord, setViewingRecord] = useState(null); // View Distribution Receipt Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false); // Universal Audit Report

  const dbSettings = useLiveQuery(() => db.settings.toArray(), [])?.[0] || {};

  // Form State: Record Distribution
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [category, setCategory] = useState("Zakat"); // 'Zakat' | 'Welfare' | 'Ration'
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [reason, setReason] = useState("Monthly Ration Support");
  const [disbursementDate, setDisbursementDate] = useState(new Date().toISOString().slice(0, 10));

  // Form State: Zakat Holder
  const [editingHolderId, setEditingHolderId] = useState(null);
  const [holderName, setHolderName] = useState("");
  const [holderPhone, setHolderPhone] = useState("");
  const [holderAmount, setHolderAmount] = useState(""); // amount_per_month_paid
  const [holderAddress, setHolderAddress] = useState("");
  const [holderNotes, setHolderNotes] = useState("");

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS: DISTRIBUTION MODAL & ACTIONS
  // ─────────────────────────────────────────────────────────────────────────────
  const handleOpenAddModal = () => {
    setRecipientName("");
    setRecipientPhone("");
    setCategory("Zakat");
    setAmount("");
    setPaymentMode("Cash");
    setReason("Monthly Ration Support");
    setDisbursementDate(new Date().toISOString().slice(0, 10));
    setIsModalOpen(true);
  };

  const handleDeleteRecord = async (rec) => {
    const confirmMsg = isUrdu
      ? `کیا آپ واقعی "${rec.recipientName}" کا زکوٰۃ/امداد کا ریکارڈ حذف کرنا چاہتے ہیں؟`
      : `Are you sure you want to delete this disbursement record for "${rec.recipientName}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await zakatWelfareService.deleteRecord(rec.id);
    } catch (err) {
      alert("Error deleting record: " + err.message);
    }
  };

  const handleSaveRecord = async (e) => {
    e.preventDefault();
    if (!recipientName.trim() || !amount) {
      alert(isUrdu ? "براہِ کرم تمام لازمی خانے پر کریں!" : "Please fill required fields!");
      return;
    }

    const roundedAmount = Math.round(parseFloat(amount) || 0);

    try {
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

      setIsModalOpen(false);
      setRecipientName("");
      setRecipientPhone("");
      setAmount("");
    } catch (err) {
      alert("Error saving record: " + err.message);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS: ZAKAT HOLDERS MODAL & ACTIONS
  // ─────────────────────────────────────────────────────────────────────────────
  const handleOpenAddHolderModal = () => {
    setEditingHolderId(null);
    setHolderName("");
    setHolderPhone("");
    setHolderAmount("");
    setHolderAddress("");
    setHolderNotes("");
    setIsHolderModalOpen(true);
  };

  const handleOpenEditHolderModal = (holder) => {
    setEditingHolderId(holder.id);
    setHolderName(holder.name || "");
    setHolderPhone(holder.phone || "");
    setHolderAmount(String(holder.amount_per_month_paid || holder.monthlyAmount || ""));
    setHolderAddress(holder.address || "");
    setHolderNotes(holder.notes || "");
    setIsHolderModalOpen(true);
  };

  const handleDeleteHolder = async (holder) => {
    const confirmMsg = isUrdu
      ? `کیا آپ واقعی مستحق "${holder.name}" کو لسٹ سے حذف کرنا چاہتے ہیں؟`
      : `Are you sure you want to remove Zakat holder "${holder.name}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await zakatWelfareService.deleteHolder(holder.id);
    } catch (err) {
      alert("Error deleting Zakat holder: " + err.message);
    }
  };

  const handleSaveHolder = async (e) => {
    e.preventDefault();
    if (!holderName.trim() || !holderAmount) {
      alert(isUrdu ? "براہِ کرم مستحق کا نام اور ماہانہ رقم درج کریں!" : "Please fill name and monthly amount!");
      return;
    }

    const roundedAmount = Math.round(parseFloat(holderAmount) || 0);

    try {
      if (editingHolderId) {
        await zakatWelfareService.updateHolder(editingHolderId, {
          name: holderName.trim(),
          phone: holderPhone.trim(),
          amount_per_month_paid: roundedAmount,
          address: holderAddress.trim(),
          notes: holderNotes.trim()
        });
      } else {
        await zakatWelfareService.addHolder({
          name: holderName.trim(),
          phone: holderPhone.trim(),
          amount_per_month_paid: roundedAmount,
          address: holderAddress.trim(),
          notes: holderNotes.trim()
        });
      }

      setIsHolderModalOpen(false);
      setEditingHolderId(null);
      setHolderName("");
      setHolderPhone("");
      setHolderAmount("");
      setHolderAddress("");
      setHolderNotes("");
    } catch (err) {
      alert("Error saving Zakat holder: " + err.message);
    }
  };

  // Quick Pay Aid directly for a holder
  const handleQuickPayHolder = (holder) => {
    setRecipientName(holder.name || "");
    setRecipientPhone(holder.phone || "");
    setCategory("Zakat");
    setAmount(String(holder.amount_per_month_paid || holder.monthlyAmount || ""));
    setPaymentMode("Cash");
    setReason("ماہانہ زکوٰۃ / کفالت وظیفہ (Monthly Zakat)");
    setDisbursementDate(new Date().toISOString().slice(0, 10));
    setIsModalOpen(true);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // FILTERING
  // ─────────────────────────────────────────────────────────────────────────────
  // Filtered Distributions
  const filteredRecords = useMemo(() => {
    return zakatRecords.filter((r) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        (r.recipientName || "").toLowerCase().includes(q) ||
        (r.reason || "").toLowerCase().includes(q) ||
        (r.phone || "").includes(q);

      if (!matchesSearch) return false;
      if (filterType === "ALL") return true;
      return r.category === filterType;
    });
  }, [zakatRecords, searchTerm, filterType]);

  // Filtered Holders
  const filteredHolders = useMemo(() => {
    return zakatHolders.filter((h) => {
      const q = searchTerm.toLowerCase();
      return (
        (h.name || "").toLowerCase().includes(q) ||
        (h.phone || "").includes(q) ||
        (h.address || "").toLowerCase().includes(q) ||
        (h.notes || "").toLowerCase().includes(q)
      );
    });
  }, [zakatHolders, searchTerm]);

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

  const totalMonthlyCommitment = useMemo(() => {
    return zakatHolders.reduce((sum, h) => sum + Number(h.amount_per_month_paid || h.monthlyAmount || 0), 0);
  }, [zakatHolders]);

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
                  ? "سالانہ زکوٰۃ آڈٹ، رجسٹرڈ مستحقین، راشن سپورٹ اور مصدقہ آف لائن چیریٹی کا مکمل انتظام"
                  : "Annual Zakat compliance, monthly ration aid, registered beneficiaries & charity distributions"}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Buttons - Record Distribution & Add Zakat Holder */}
        <div className="no-print" style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Add Zakat Holder Button */}
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              borderColor: "#059669",
              fontWeight: 700,
              fontSize: "0.86rem",
              padding: "9px 16px",
              borderRadius: "9px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
            onClick={handleOpenAddHolderModal}
          >
            <UserPlus size={16} />
            <span>{tr("Add Zakat Holder", "نیا مستحق شامل کریں")}</span>
          </button>

          {/* Record Distribution Button */}
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
            backgroundImage: `url('./general_background.jpg')`,
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

        {/* KPI 4: REGISTERED ZAKAT HOLDERS */}
        <div
          className="kpi-metric-card interactive"
          onClick={() => setMainTab("holders")}
          style={{ cursor: "pointer" }}
          title={isUrdu ? "مستحقین کی فہرست دیکھنے کے لیے کلک کریں" : "Click to view Zakat Holders"}
        >
          <div className="kpi-metric-icon purple">
            <Users size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Zakat Holders</span>
              <span className="kpi-metric-label-ur">({isUrdu ? "رجسٹرڈ مستحقین" : "Holders"})</span>
            </div>
            <div className="kpi-metric-value font-mono">
              {zakatHolders.length} <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted, #94a3b8)" }}>{isUrdu ? "افراد" : "Holders"}</span>
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
            placeholder={
              mainTab === "holders"
                ? tr("Search by Zakat holder name, phone, address, notes...", "مستحق کا نام، فون، پتہ، نوٹس سے تلاش کریں...")
                : tr("Search by recipient, reason, contact...", "مستحق کا نام، وجہ، فون سے تلاش کریں...")
            }
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
      {/* 4. MAIN DATA SECTION: TAB SWITCHER & DATA TABLE                           */}
      {/* ------------------------------------------------------------------------- */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Main Tab Switcher Bar: Distributions vs Zakat Holders */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--border-divider, #f1f5f9)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            background: "var(--bg-secondary, #f8fafc)"
          }}
        >
          {/* Main Segmented Toggle */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              background: "var(--bg-primary, #ffffff)",
              padding: "4px",
              borderRadius: "10px",
              border: "1px solid var(--border-color, #e2e8f0)"
            }}
          >
            <button
              type="button"
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                border: "none",
                fontWeight: 800,
                fontSize: "0.86rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                background: mainTab === "distributions" ? "#059669" : "transparent",
                color: mainTab === "distributions" ? "#ffffff" : "var(--text-secondary)",
                transition: "all 0.2s ease"
              }}
              onClick={() => setMainTab("distributions")}
            >
              <Heart size={16} />
              <span>{isUrdu ? "امداد تقسیم ریکارڈ" : "All Distributions"}</span>
              <span
                style={{
                  background: mainTab === "distributions" ? "rgba(255,255,255,0.25)" : "var(--bg-secondary, #e2e8f0)",
                  padding: "2px 7px",
                  borderRadius: "10px",
                  fontSize: "0.75rem",
                  fontWeight: 700
                }}
              >
                {zakatRecords.length}
              </span>
            </button>

            <button
              type="button"
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                border: "none",
                fontWeight: 800,
                fontSize: "0.86rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                background: mainTab === "holders" ? "#059669" : "transparent",
                color: mainTab === "holders" ? "#ffffff" : "var(--text-secondary)",
                transition: "all 0.2s ease"
              }}
              onClick={() => setMainTab("holders")}
            >
              <Users size={16} />
              <span>{isUrdu ? "زکوٰۃ ہولڈرز / مستحقین" : "Zakat Holders"}</span>
              <span
                style={{
                  background: mainTab === "holders" ? "rgba(255,255,255,0.25)" : "var(--bg-secondary, #e2e8f0)",
                  padding: "2px 7px",
                  borderRadius: "10px",
                  fontSize: "0.75rem",
                  fontWeight: 700
                }}
              >
                {zakatHolders.length}
              </span>
            </button>
          </div>

          {/* Sub Filters for Distributions */}
          {mainTab === "distributions" && (
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
          )}

          {/* Quick Add Holder Button in Holders Tab */}
          {mainTab === "holders" && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                {isUrdu ? "ماہانہ کل وظیفہ:" : "Total Monthly Commitment:"}{" "}
                <strong className="font-mono" style={{ color: "#059669" }}>Rs. {totalMonthlyCommitment.toLocaleString()}</strong>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{
                  background: "#059669",
                  borderColor: "#059669",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 14px"
                }}
                onClick={handleOpenAddHolderModal}
              >
                <UserPlus size={14} />
                <span>{isUrdu ? "نیا مستحق شامل کریں" : "Add Holder"}</span>
              </button>
            </div>
          )}
        </div>

        {/* ── TAB 1: ALL DISTRIBUTIONS TABLE ────────────────────────────── */}
        {mainTab === "distributions" && (
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

                        {/* Actions (View & Delete ONLY as requested) */}
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                            {/* View Details Receipt Button */}
                            <button
                              type="button"
                              onClick={() => setViewingRecord(rec)}
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "6px",
                                border: "1px solid #bfdbfe",
                                background: "#eff6ff",
                                color: "#2563eb",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer"
                              }}
                              title={isUrdu ? "تفصیل و رسید دیکھیں" : "View receipt"}
                            >
                              <Eye size={14} />
                            </button>

                            {/* Delete Record Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteRecord(rec)}
                              style={{
                                width: "28px",
                                height: "28px",
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
        )}

        {/* ── TAB 2: ZAKAT HOLDERS TABLE ────────────────────────────────── */}
        {mainTab === "holders" && (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "45px", textAlign: "center" }}>#</th>
                  <th>{isUrdu ? "مستحق کا نام" : "Holder / Beneficiary Name"}</th>
                  <th>{isUrdu ? "فون نمبر" : "Phone Number"}</th>
                  <th style={{ textAlign: "right" }}>{isUrdu ? "ماہانہ وظیفہ / رقم" : "Monthly Amount (Rs.)"}</th>
                  <th style={{ textAlign: "right" }}>{isUrdu ? "کل وصول شدہ امداد" : "Total Disbursed"}</th>
                  <th>{isUrdu ? "پتہ / نوٹس" : "Address / Notes"}</th>
                  <th style={{ textAlign: "right" }}>{isUrdu ? "اختیارات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredHolders.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "36px", color: "#94a3b8" }}>
                      {isUrdu ? "کوئی زکوٰۃ ہولڈر موجود نہیں۔ 'نیا مستحق شامل کریں' پر کلک کریں۔" : "No Zakat holders found. Click 'Add Holder' to register a beneficiary."}
                    </td>
                  </tr>
                ) : (
                  filteredHolders.map((holder, idx) => {
                    const monthlyAmt = Number(holder.amount_per_month_paid || holder.monthlyAmount || 0);
                    // Calculate total aid received across all distribution records
                    const totalPaidToHolder = zakatRecords
                      .filter(
                        (r) =>
                          (r.recipientName || "").trim().toLowerCase() === (holder.name || "").trim().toLowerCase() ||
                          (holder.phone && r.phone && r.phone === holder.phone)
                      )
                      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

                    return (
                      <tr key={holder.id}>
                        {/* Number */}
                        <td style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                          {idx + 1}
                        </td>

                        {/* Holder Name */}
                        <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                background: "rgba(5, 150, 105, 0.12)",
                                color: "#059669",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 800,
                                fontSize: "0.85rem"
                              }}
                            >
                              {holder.name?.charAt(0)?.toUpperCase() || "H"}
                            </div>
                            <div>
                              <div style={{ fontSize: "0.92rem" }}>{holder.name}</div>
                              {holder.address && (
                                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                                  {holder.address}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="font-mono" style={{ fontSize: "0.86rem", color: holder.phone ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {holder.phone || "—"}
                        </td>

                        {/* Monthly Amount Paid */}
                        <td className="font-mono" style={{ textAlign: "right", fontWeight: 800, fontSize: "0.95rem", color: "#059669" }}>
                          Rs. {monthlyAmt.toLocaleString()}
                        </td>

                        {/* Total Disbursed */}
                        <td className="font-mono" style={{ textAlign: "right", fontWeight: 700, fontSize: "0.88rem", color: totalPaidToHolder > 0 ? "#2563eb" : "var(--text-muted)" }}>
                          Rs. {totalPaidToHolder.toLocaleString()}
                        </td>

                        {/* Address / Notes */}
                        <td style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                          {holder.notes || holder.address || "—"}
                        </td>

                        {/* Actions: Pay, Edit, Delete */}
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                            {/* Quick Pay Aid Button */}
                            <button
                              type="button"
                              onClick={() => handleQuickPayHolder(holder)}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                border: "1px solid #a7f3d0",
                                background: "#ecfdf5",
                                color: "#059669",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                cursor: "pointer",
                                fontSize: "0.74rem",
                                fontWeight: 700
                              }}
                              title={isUrdu ? "اس مستحق کو امداد ادا کریں" : "Pay Aid to this holder"}
                            >
                              <HandHeart size={13} />
                              <span>{isUrdu ? "ادائیگی" : "Pay"}</span>
                            </button>

                            {/* Edit Holder Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditHolderModal(holder)}
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "6px",
                                border: "1px solid #bbf7d0",
                                background: "#f0fdf4",
                                color: "#16a34a",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer"
                              }}
                              title={isUrdu ? "مستحق کی تفصیل میں ترمیم کریں" : "Edit holder details"}
                            >
                              <Pencil size={13} />
                            </button>

                            {/* Delete Holder Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteHolder(holder)}
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "6px",
                                border: "1px solid #fecdd3",
                                background: "#fff1f2",
                                color: "#e11d48",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer"
                              }}
                              title={isUrdu ? "مستحق کو حذف کریں" : "Delete holder"}
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
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: RECORD ZAKAT & WELFARE DISBURSEMENT                              */}
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
                    {isUrdu ? "زکوٰۃ و امداد کی ادائیگی کا اندراج" : "Record Zakat & Welfare Disbursement"}
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
                {/* Optional: Pick from Registered Zakat Holders */}
                {zakatHolders.length > 0 && (
                  <div className="app-form-group">
                    <label className="app-form-label">
                      {isUrdu ? "رجسٹرڈ مستحق منتخب کریں (اختیاری)" : "Select Registered Zakat Holder (Optional)"}
                    </label>
                    <div className="app-input-wrapper">
                      <Users size={16} className="app-input-icon" />
                      <select
                        className="app-form-select"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          const selected = zakatHolders.find((h) => String(h.id) === String(val));
                          if (selected) {
                            setRecipientName(selected.name || "");
                            setRecipientPhone(selected.phone || "");
                            if (selected.amount_per_month_paid || selected.monthlyAmount) {
                              setAmount(String(selected.amount_per_month_paid || selected.monthlyAmount));
                            }
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="">
                          {isUrdu ? "-- رجسٹرڈ مستحقین میں سے چنیں (یا نیچے نیا نام لکھیں) --" : "-- Select from Registered Holders (or type manually) --"}
                        </option>
                        {zakatHolders.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name} {h.phone ? `(${h.phone})` : ""} — Rs. {Number(h.amount_per_month_paid || h.monthlyAmount || 0).toLocaleString()}/ماہ
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="app-input-chevron" />
                    </div>
                  </div>
                )}

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
                      placeholder={isUrdu ? "مثلاً بیوہ حلیمہ بی بی، مستحق مزدور اختر علی" : "e.g. Haleema Bibi (Widow), Master Aslam"}
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
                  <span>{isUrdu ? "یہ ادائیگی زکوٰۃ فنڈ کی تاریخ اور آڈٹ میں محفوظ کی جائے گی۔" : "This payment will be recorded in annual Zakat compliance audit."}</span>
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
                  {isUrdu ? "امداد محفوظ کریں" : "Save Disbursement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT ZAKAT HOLDER (name, phone, amount_per_month_paid)     */}
      {/* ========================================================================= */}
      {isHolderModalOpen && (
        <div className="app-modal-overlay" onClick={() => setIsHolderModalOpen(false)}>
          <div
            className="app-modal-card"
            style={{ maxWidth: "540px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="app-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div className="app-modal-icon-badge" style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)" }}>
                  <Users size={24} color="#ffffff" />
                </div>
                <div>
                  <h3 className="app-modal-title">
                    {editingHolderId
                      ? (isUrdu ? "زکوٰۃ ہولڈر کی تفصیل میں ترمیم" : "Edit Zakat Holder")
                      : (isUrdu ? "نیا زکوٰۃ ہولڈر / مستحق شامل کریں" : "Add New Zakat Holder")}
                  </h3>
                  <p className="app-modal-subtitle">
                    {isUrdu ? "مستحق فرد کا نام، رابطہ اور ماہانہ مقررہ امداد کا اندراج کریں" : "Register a beneficiary with name, phone, and monthly aid amount"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="app-modal-close-btn"
                onClick={() => setIsHolderModalOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveHolder} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="app-modal-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Holder Name */}
                <div className="app-form-group">
                  <label className="app-form-label">
                    {isUrdu ? "مستحق فرد کا نام (Name)" : "Beneficiary Name"} <span className="app-form-label-required">*</span>
                  </label>
                  <div className="app-input-wrapper">
                    <User size={16} className="app-input-icon" />
                    <input
                      type="text"
                      required
                      className="app-form-input"
                      value={holderName}
                      onChange={(e) => setHolderName(e.target.value)}
                      placeholder={isUrdu ? "مثلاً بیوہ فاطمہ بی بی، مستحق عبد الستار" : "e.g. Fatima Bibi (Widow), Abdul Sattar"}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Phone & Monthly Amount Paid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  {/* Phone */}
                  <div className="app-form-group">
                    <label className="app-form-label">
                      {isUrdu ? "رابطہ فون نمبر (Phone)" : "Phone Number"}
                    </label>
                    <div className="app-input-wrapper">
                      <Phone size={16} className="app-input-icon" />
                      <input
                        type="text"
                        className="app-form-input font-mono"
                        value={holderPhone}
                        onChange={(e) => setHolderPhone(e.target.value)}
                        placeholder="0300-1234567"
                      />
                    </div>
                  </div>

                  {/* Monthly Amount Paid */}
                  <div className="app-form-group">
                    <label className="app-form-label">
                      {isUrdu ? "ماہانہ وظیفہ / رقم (Amount/Month)" : "Monthly Amount Paid (Rs.)"} <span className="app-form-label-required">*</span>
                    </label>
                    <div className="app-input-wrapper">
                      <DollarSign size={16} className="app-input-icon" />
                      <input
                        type="number"
                        required
                        min="1"
                        step="1"
                        className="app-form-input font-mono"
                        style={{ color: "#059669", fontWeight: 800, fontSize: "1.05rem" }}
                        value={holderAmount}
                        onChange={(e) => setHolderAmount(e.target.value)}
                        placeholder="e.g. 5000"
                      />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="app-form-group">
                  <label className="app-form-label">
                    {isUrdu ? "رہائشی پتہ / علاقہ (Address)" : "Address / Location (Optional)"}
                  </label>
                  <div className="app-input-wrapper">
                    <MapPin size={16} className="app-input-icon" />
                    <input
                      type="text"
                      className="app-form-input"
                      value={holderAddress}
                      onChange={(e) => setHolderAddress(e.target.value)}
                      placeholder={isUrdu ? "مثلاً گلی نمبر 4، جھمرہ روڈ فیصل آباد" : "e.g. Street 4, Jhumra Road, Faisalabad"}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="app-form-group">
                  <label className="app-form-label">
                    {isUrdu ? "اضافی تفصیل / نوٹس (Notes)" : "Notes / Remarks (Optional)"}
                  </label>
                  <div className="app-input-wrapper">
                    <FileText size={16} className="app-input-icon" />
                    <input
                      type="text"
                      className="app-form-input"
                      value={holderNotes}
                      onChange={(e) => setHolderNotes(e.target.value)}
                      placeholder={isUrdu ? "مثلاً بیوہ خاتون، 3 یتیم بچے، ماہانہ راشن حقدار" : "e.g. 3 orphan children, eligible for monthly ration"}
                    />
                  </div>
                </div>

                <div className="app-form-notice" style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}>
                  <Info size={16} color="#059669" style={{ flexShrink: 0 }} />
                  <span>{isUrdu ? "یہ مستحق لسٹ میں محفوظ ہو جائے گا اور ہر ماہ آسانی سے امداد درج کی جا سکے گی۔" : "This holder will be saved in your database for monthly disbursements."}</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="app-modal-footer">
                <button
                  type="button"
                  className="app-btn-cancel"
                  onClick={() => setIsHolderModalOpen(false)}
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
                  {editingHolderId
                    ? (isUrdu ? "تبدیلیاں محفوظ کریں" : "Update Holder")
                    : (isUrdu ? "مستحق محفوظ کریں" : "Save Holder")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: VIEW DISTRIBUTION RECEIPT / DETAILS (View Option)                */}
      {/* ========================================================================= */}
      {viewingRecord && (
        <div className="app-modal-overlay" onClick={() => setViewingRecord(null)}>
          <div
            className="app-modal-card"
            style={{ maxWidth: "520px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="app-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div className="app-modal-icon-badge" style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)" }}>
                  <FileText size={24} color="#ffffff" />
                </div>
                <div>
                  <h3 className="app-modal-title">
                    {isUrdu ? "امداد واؤچر / رسید کی تفصیل" : "Disbursement Voucher Details"}
                  </h3>
                  <p className="app-modal-subtitle">
                    {isUrdu ? "مصدقہ خیراتی ادائیگی برائے فیکٹری ریکارڈ" : "Official verified charity disbursement record"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="app-modal-close-btn"
                onClick={() => setViewingRecord(null)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="app-modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Receipt Card */}
              <div
                style={{
                  background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
                  border: "1.5px dashed #059669",
                  borderRadius: "12px",
                  padding: "20px",
                  textAlign: "center"
                }}
              >
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#059669", marginBottom: "4px" }}>
                  {viewingRecord.category === "Zakat" ? "زکوٰۃ فنڈ ادائیگی (Zakat Fund)" : viewingRecord.category === "Ration" ? "راشن سپورٹ فنڈ (Ration Aid)" : "عام فلاحی امداد (General Welfare)"}
                </div>
                <div className="font-mono" style={{ fontSize: "2rem", fontWeight: 900, color: "#065f46" }}>
                  Rs. {Number(viewingRecord.amount || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#047857", marginTop: "2px" }}>
                  طریقہ ادائیگی: {viewingRecord.paymentMode || "Cash"}
                </div>
              </div>

              {/* Details Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  background: "var(--bg-secondary)",
                  padding: "14px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-color)"
                }}
              >
                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>
                    {isUrdu ? "مستحق فرد / نام" : "Recipient Name"}
                  </div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>
                    {viewingRecord.recipientName}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>
                    {isUrdu ? "فون نمبر" : "Phone Number"}
                  </div>
                  <div className="font-mono" style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>
                    {viewingRecord.phone || "—"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>
                    {isUrdu ? "تاریخ ادائیگی" : "Date Paid"}
                  </div>
                  <div className="font-mono" style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>
                    {viewingRecord.date ? viewingRecord.date.slice(0, 10) : (viewingRecord.createdAt ? viewingRecord.createdAt.slice(0, 10) : "—")}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>
                    {isUrdu ? "فنڈ کیٹیگری" : "Fund Category"}
                  </div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#059669", marginTop: "2px" }}>
                    {viewingRecord.category}
                  </div>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>
                    {isUrdu ? "مقصد / ضرورت" : "Reason / Purpose"}
                  </div>
                  <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                    {viewingRecord.reason || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="app-modal-footer">
              <button
                type="button"
                className="app-btn-cancel"
                onClick={() => setViewingRecord(null)}
              >
                <X size={16} />
                {isUrdu ? "بند کریں" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Report Print Modal for Zakat & Welfare Fund */}
      <UniversalReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Zakat & Welfare Charity Fund Audit Statement"
        titleUrdu="زکوٰۃ و ویلفیئر فنڈ آڈٹ اسٹیٹمنٹ"
        subtitle={`Category: ${filterType} | Total Registered Holders: ${zakatHolders.length} | Distributions: ${filteredRecords.length}`}
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
          { label: "Zakat Holders", labelUrdu: "مستحقین تعداد", value: zakatHolders.length, color: "#d97706" }
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