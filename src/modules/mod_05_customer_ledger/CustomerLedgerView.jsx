import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  FileText,
  Users,
  CreditCard,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Building2,
  Wallet
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db";
import { useLanguage } from "../../context/LanguageContext";
import CustomerList from "./CustomerList";
import CustomerTimelineView from "./CustomerTimelineView";
import CustomerProfileModal from "./CustomerProfileModal";
import PaymentRecoveryModal from "./PaymentRecoveryModal";
import PrintableKhataModal from "./PrintableKhataModal";
import {
  getCustomerTimeline,
  saveCustomer,
  recordPaymentRecovery,
  deleteCustomer
} from "./customerLedgerService";

export default function CustomerLedgerView() {
  const { language } = useLanguage();

  // ---------------------------------------------------------------------------
  // 1. LIVE REAL-TIME DATABASE QUERIES
  // ---------------------------------------------------------------------------
  const rawCustomers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const invoices = useLiveQuery(() => db.invoices.toArray(), []) || [];
  const customerPayments = useLiveQuery(() => db.customer_payments.toArray(), []) || [];
  const settingsList = useLiveQuery(() => db.settings.toArray(), []) || [];
  const settings = settingsList[0] || {};

  // Sort customers by balanceDue descending
  const customers = useMemo(() => {
    return [...rawCustomers].sort((a, b) => Number(b.balanceDue || 0) - Number(a.balanceDue || 0));
  }, [rawCustomers]);

  // Selected Customer ID
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  // Search & Category Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("all");

  // Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Active Selected Customer Object
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId && customers.length > 0) {
      return customers[0];
    }
    return customers.find(c => c.id === selectedCustomerId) || customers[0] || null;
  }, [customers, selectedCustomerId]);

  // Live Timeline for Selected Customer
  const activeTimeline = useLiveQuery(
    () => {
      if (!selectedCustomer) return [];
      return getCustomerTimeline(selectedCustomer.id);
    },
    [selectedCustomer?.id, invoices, customerPayments]
  ) || [];

  // ---------------------------------------------------------------------------
  // 2. KHATA KPI SUMMARY CALCULATIONS
  // ---------------------------------------------------------------------------
  const totalMarketUdhaar = useMemo(
    () => customers.reduce((acc, c) => acc + Number(c.balanceDue || 0), 0),
    [customers]
  );

  const totalWasooliAllTime = useMemo(
    () => customerPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0) +
      invoices.filter(inv => !inv.customerId).reduce((acc, inv) => acc + Number(inv.paidAmount || 0), 0),
    [customerPayments, invoices]
  );

  const overdueCustomersCount = useMemo(
    () => customers.filter(c => Number(c.balanceDue || 0) > 0).length,
    [customers]
  );

  // ---------------------------------------------------------------------------
  // 3. FILTERING LOGIC
  // ---------------------------------------------------------------------------
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // Category filter
      if (activeCategoryFilter === 'dues' && Number(c.balanceDue || 0) <= 0) return false;
      if (['Builder', 'Contractor', 'Retail'].includes(activeCategoryFilter) && c.customerType !== activeCategoryFilter) {
        return false;
      }

      // Search term
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.cnic?.toLowerCase().includes(q)
      );
    });
  }, [customers, activeCategoryFilter, searchTerm]);

  // ---------------------------------------------------------------------------
  // 4. HANDLERS
  // ---------------------------------------------------------------------------
  const handleSelectCustomer = (id) => {
    setSelectedCustomerId(id);
  };

  const handleSaveCustomer = async (formData) => {
    try {
      const savedId = await saveCustomer(formData);
      setIsProfileModalOpen(false);
      setEditingCustomer(null);
      setSelectedCustomerId(savedId);
    } catch (err) {
      alert("Failed to save customer: " + err.message);
    }
  };

  const handlePaymentRecovery = async (recoveryData) => {
    if (!selectedCustomer) return;
    try {
      await recordPaymentRecovery(
        selectedCustomer.id,
        recoveryData.amount,
        recoveryData.paymentMethod,
        recoveryData.notes
      );
      setIsPaymentModalOpen(false);
    } catch (err) {
      alert("Failed to record payment: " + err.message);
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm("Are you sure you want to delete this customer account?")) return;
    try {
      await deleteCustomer(id);
      setSelectedCustomerId(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const openNewCustomerModal = () => {
    setEditingCustomer(null);
    setIsProfileModalOpen(true);
  };

  const openEditCustomerModal = () => {
    setEditingCustomer(selectedCustomer);
    setIsProfileModalOpen(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "16px" }}>
      {/* ── PAGE HEADER & KPI METRICS ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h1 style={{ fontSize: "1.45rem", fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.02em", margin: 0 }}>
              {language === 'ur' ? 'گاہک ڈیجیٹل کھاتہ و بقایا جات' : 'Customer Ledgers & Khata'}
            </h1>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: "3px 0 0" }}>
              {language === 'ur'
                ? 'تمام گاہکوں کے بلز، نقد ادھار اور لائیو کھاتہ وصولی کا حساب'
                : 'Manage customer accounts, running khata ledgers, and payment recovery'}
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={openNewCustomerModal}
            style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}
          >
            <Plus size={16} />
            <span>{language === 'ur' ? 'نیا گاہک کھاتہ' : 'Register New Customer'}</span>
          </button>
        </div>

        <div className="kpi-cards-grid">
          {/* KPI 1: Total Market Udhaar */}
          <div className="kpi-stat-card">
            <div className="kpi-header">
              <span className="kpi-title">
                {language === 'ur' ? 'کل مارکیٹ ادھار' : 'TOTAL MARKET DUES'}
              </span>
              <AlertCircle size={14} style={{ color: "var(--accent-red)" }} />
            </div>
            <div className="kpi-value font-mono" style={{ color: "var(--accent-red)" }}>
              Rs. {totalMarketUdhaar.toLocaleString()}
            </div>
          </div>

          {/* KPI 2: Total Recovered */}
          <div className="kpi-stat-card">
            <div className="kpi-header">
              <span className="kpi-title">
                {language === 'ur' ? 'کل وصول شدہ رقم' : 'TOTAL RECOVERED'}
              </span>
              <CreditCard size={14} style={{ color: "var(--accent-green)" }} />
            </div>
            <div className="kpi-value font-mono" style={{ color: "var(--accent-green)" }}>
              Rs. {totalWasooliAllTime.toLocaleString()}
            </div>
          </div>

          {/* KPI 3: Overdue Accounts Count */}
          <div className="kpi-stat-card">
            <div className="kpi-header">
              <span className="kpi-title">
                {language === 'ur' ? 'بقایا دار گاہک' : 'OVERDUE ACCOUNTS'}
              </span>
              <TrendingDown size={14} style={{ color: "var(--accent-blue)" }} />
            </div>
            <div className="kpi-value font-mono" style={{ color: "var(--accent-blue)" }}>
              {overdueCustomersCount} <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>/ {customers.length}</span>
            </div>
          </div>

          {/* KPI 4: Total Registered Customers */}
          <div className="kpi-stat-card">
            <div className="kpi-header">
              <span className="kpi-title">
                {language === 'ur' ? 'کل رجسٹرڈ کھاتے' : 'REGISTERED KHATAS'}
              </span>
              <Users size={14} style={{ color: "var(--text-secondary)" }} />
            </div>
            <div className="kpi-value font-mono">
              {customers.length}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN SPLIT VIEW CONTAINER ── */}
      <div style={{
        flex: 1,
        display: "flex",
        background: "var(--bg-card)",
        borderRadius: "14px",
        border: "1px solid var(--border-color)",
        overflow: "hidden",
        minHeight: "480px",
        boxShadow: "var(--shadow-sm)"
      }}>
        {/* Left Side: Customer List */}
        <div style={{
          width: "35%",
          minWidth: "280px",
          maxWidth: "380px",
          flexShrink: 0,
          borderRight: "1px solid var(--border-divider)",
          display: "flex",
          flexDirection: "column"
        }}>
          <CustomerList
            customers={filteredCustomers}
            selectedCustomerId={selectedCustomer?.id}
            onSelectCustomer={handleSelectCustomer}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            activeFilter={activeCategoryFilter}
            onFilterChange={setActiveCategoryFilter}
          />
        </div>
        
        {/* Right Side: Selected Customer Running Ledger Timeline */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <CustomerTimelineView
            customer={selectedCustomer}
            timeline={activeTimeline}
            onOpenEditProfile={openEditCustomerModal}
            onOpenReceivePayment={() => setIsPaymentModalOpen(true)}
            onOpenPrintKhata={() => setIsPrintModalOpen(true)}
            onDeleteCustomer={handleDeleteCustomer}
          />
        </div>
      </div>

      {/* ── MODALS ── */}
      {isProfileModalOpen && (
        <CustomerProfileModal
          customer={editingCustomer}
          onClose={() => setIsProfileModalOpen(false)}
          onSave={handleSaveCustomer}
        />
      )}

      {isPaymentModalOpen && selectedCustomer && (
        <PaymentRecoveryModal
          customer={selectedCustomer}
          onClose={() => setIsPaymentModalOpen(false)}
          onSave={handlePaymentRecovery}
        />
      )}

      {isPrintModalOpen && selectedCustomer && (
        <PrintableKhataModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          customer={selectedCustomer}
          timeline={activeTimeline}
          settings={settings}
        />
      )}
    </div>
  );
}
