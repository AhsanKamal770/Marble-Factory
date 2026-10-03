import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  FileText,
  Users,
  CreditCard,
  AlertTriangle,
  ChevronRight,
  Printer,
  Edit2,
  Trash2,
  SlidersHorizontal,
  Wallet,
  Phone,
  MapPin,
  CheckCircle2,
  DollarSign,
  ArrowUpDown,
  Zap
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db";
import { useLanguage } from "../../context/LanguageContext";
import CustomerProfileModal from "./CustomerProfileModal";
import PaymentRecoveryModal from "./PaymentRecoveryModal";
import PrintableKhataModal from "./PrintableKhataModal";
import GlobalPagination from "../../components/GlobalPagination";
import {
  getCustomerTimeline,
  saveCustomer,
  recordPaymentRecovery,
  deleteCustomer
} from "./customerLedgerService";

export default function CustomerLedgerView() {
  const { language } = useLanguage();

  // ---------------------------------------------------------------------------
  // 1. LIVE DATABASE QUERIES
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

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Selected Payment Method Dropdown
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("Cash in Drawer");

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
  // 3. FILTERING & PAGINATION
  // ---------------------------------------------------------------------------
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const balance = Number(c.balanceDue || 0);

      // Status filter
      if (statusFilter === 'dues' && balance <= 0) return false;
      if (statusFilter === 'cleared' && balance > 0) return false;

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
  }, [customers, statusFilter, searchTerm]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, currentPage]);

  // ---------------------------------------------------------------------------
  // 4. HELPERS
  // ---------------------------------------------------------------------------
  const getInitials = (name) => {
    if (!name) return 'C';
    const clean = name.replace(/\([^)]*\)/g, '').trim();
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getStatusBadge = (c) => {
    const due = Number(c.balanceDue || 0);
    const paid = Number(c.totalPaid || 0);
    const billed = Number(c.totalBilled || 0);

    if (due === 0 && billed > 0) return { label: 'Paid', className: 'paid' };
    if (due === 0) return { label: 'Cleared', className: 'cleared' };
    if (paid > 0 && due > 0) return { label: 'Partial', className: 'partial' };
    if (due > 50000) return { label: 'Overdue', className: 'overdue' };
    return { label: 'Due', className: 'due' };
  };

  // ---------------------------------------------------------------------------
  // 5. ACTION HANDLERS
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
        recoveryData.paymentMethod || selectedPaymentMethod,
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
    <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "1440px", margin: "0 auto", paddingBottom: "30px" }}>

      {/* ------------------------------------------------------------------------- */}
      {/* 1. SEAMLESS HERO HEADER (Matching Dashboard and InvoicesView)             */}
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
            {language === 'ur' ? 'گاہکوں کا کھاتہ' : 'Customer Accounts'}
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
              <Users size={24} />
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
                Customer Ledgers & Khata <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-secondary, #64748b)', fontFamily: 'var(--font-urdu)' }}>(گاہکوں کا کھاتہ)</span>
              </h1>
              <p style={{
                fontSize: '0.86rem',
                color: 'var(--text-secondary, #64748b)',
                margin: '2px 0 0 0',
                fontWeight: 500
              }}>
                {language === 'ur' ? 'گاہکوں کے کھاتے، رننگ لیجر اور وصولی کا مکمل انتظام' : 'Manage customer accounts, running khata ledgers, and payment recovery'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Register New Customer Action Button */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openNewCustomerModal}
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
            <span>Register New Customer</span>
          </button>
        </div>

        {/* Background Marble Image extending seamlessly across the header */}
        <div style={{
          position: 'absolute',
          right: '0',
          top: '-15px',
          bottom: '-15px',
          width: '50%',
          maxWidth: '520px',
          backgroundImage: `url('./invoice_background.jpg'), url('/invoice_background.jpg'), url('./invoice_background.jpeg'), url('/invoice_background.jpeg')`,
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
      {/* 2. TOP 4 KPI CARDS (Matching Screenshot & Unified Global Style)            */}
      {/* ------------------------------------------------------------------------- */}
      <div className="kpi-card-grid">
        {/* Card 1: Registered Customers */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon blue">
            <Users size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Registered</span>
              <span className="kpi-metric-label-ur">(رجسٹرڈ گاہک)</span>
            </div>
            <div className="kpi-metric-value font-mono">
              {customers.length}
            </div>
          </div>
        </div>

        {/* Card 2: Total Market Dues */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon green">
            <DollarSign size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Dues</span>
              <span className="kpi-metric-label-ur">(مارکیٹ بقایا)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ color: '#059669' }}>
              Rs. {totalMarketUdhaar.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card 3: Total Recovered */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon blue">
            <FileText size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Received</span>
              <span className="kpi-metric-label-ur">(کل وصولی)</span>
            </div>
            <div className="kpi-metric-value font-mono">
              Rs. {totalWasooliAllTime.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card 4: Overdue Accounts */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon red">
            <AlertTriangle size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Overdues</span>
              <span className="kpi-metric-label-ur">(تاخیر)</span>
            </div>
            <div className="kpi-metric-value font-mono">
              {overdueCustomersCount} <span style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 600 }}></span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 3. TWO-COLUMN MAIN CONTENT (Customer List + Selected Detail Panel)        */}
      {/* ------------------------------------------------------------------------- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1.05fr)',
        gap: '18px',
        alignItems: 'stretch'
      }}>

        {/* ======================================================================= */}
        {/* LEFT COLUMN: CUSTOMER LIST TABLE                                       */}
        {/* ======================================================================= */}
        <div className="global-table-container" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', boxSizing: 'border-box' }}>

          {/* Header Title */}
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
            Customer List
          </div>

          {/* Search & Filter Row */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search customer name, phone, city..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  fontSize: '0.86rem',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  borderRadius: '8px',
                  background: 'var(--bg-primary, #f8fafc)',
                  color: 'var(--text-primary, #0f172a)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              style={{
                padding: '9px 12px',
                fontSize: '0.84rem',
                border: '1px solid var(--border-color, #cbd5e1)',
                borderRadius: '8px',
                background: 'var(--bg-primary, #f8fafc)',
                color: 'var(--text-primary, #0f172a)',
                outline: 'none',
                minWidth: '135px',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Categories</option>
              <option value="dues">With Dues</option>
              <option value="cleared">Cleared</option>
            </select>

            {/* Filter Reset Button */}
            <button
              type="button"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: (searchTerm || statusFilter !== 'all') ? '#eff6ff' : 'var(--bg-primary, #f8fafc)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: (searchTerm || statusFilter !== 'all') ? '#2563eb' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); setCurrentPage(1); }}
              title="Reset Filters (فلٹر صاف کریں)"
            >
              <SlidersHorizontal size={15} />
            </button>
          </div>

          {/* Customer Table (100% Fit, Zero Horizontal Scroll) */}
          <div className="global-table-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <table className="global-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 6px' }}>
                    CUSTOMER
                  </th>
                  <th style={{ textAlign: 'right', width: '90px', padding: '8px 6px' }}>
                    DUE
                  </th>
                  <th style={{ textAlign: 'center', width: '65px', padding: '8px 4px' }}>
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '36px 10px', color: '#94a3b8' }}>
                      No customers match your search criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map((c, idx) => {
                    const isSelected = selectedCustomer?.id === c.id;
                    const due = Number(c.balanceDue || 0);
                    const status = getStatusBadge(c);

                    return (
                      <tr
                        key={c.id}
                        onClick={() => handleSelectCustomer(c.id)}
                        className={isSelected ? 'active-row' : ''}
                        style={{
                          cursor: 'pointer'
                        }}
                      >
                        {/* Avatar & Name & Subtext */}
                        <td style={{ padding: '8px 6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="avatar-circle" style={{ width: '28px', height: '28px', fontSize: '0.72rem', flexShrink: 0 }}>
                              {getInitials(c.name)}
                            </div>
                            <div style={{ minWidth: 0, overflow: 'hidden' }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary, #0f172a)', fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {c.name}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>{c.phone || c.city || 'Karachi'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Balance Due */}
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: due > 0 ? '#0f172a' : '#16a34a', padding: '8px 6px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          Rs. {due.toLocaleString()}
                        </td>

                        {/* Status Pill */}
                        <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                          <span className={`status-pill-badge ${status.className}`} style={{ fontSize: '0.66rem', padding: '1px 5px' }}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls - Always Visible Exact Match to Screenshot */}
          <div style={{ marginTop: 'auto' }}>
            <GlobalPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={filteredCustomers.length}
              pageSize={itemsPerPage}
              onPageChange={(p) => setCurrentPage(p)}
              language={language}
            />
          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: SELECTED CUSTOMER KHATA DETAIL PANEL                      */}
        {/* ======================================================================= */}
        <div
          className="global-table-container"
          style={{
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            height: '100%',
            boxSizing: 'border-box'
          }}
        >
          {selectedCustomer ? (
            <>
              {/* Customer Info Card with Integrated Compact Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  background: 'var(--bg-primary, #f8fafc)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  padding: '12px 16px',
                  flexWrap: 'wrap'
                }}
              >
                {/* Left: Customer Avatar & Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                  <div className="avatar-circle" style={{ width: '44px', height: '44px', fontSize: '1.05rem' }}>
                    {getInitials(selectedCustomer.name)}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: 0 }}>
                        {selectedCustomer.name}
                      </h2>
                      <span style={{
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        padding: '1px 6px',
                        borderRadius: '5px',
                        fontSize: '0.68rem',
                        fontWeight: 700
                      }}>
                        Builder
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', fontSize: '0.78rem', color: '#64748b', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Phone size={12} style={{ color: '#2563eb' }} />
                        <span className="font-mono">{selectedCustomer.phone || '0300-8456123'}</span>
                      </span>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <MapPin size={12} style={{ color: '#2563eb' }} />
                        <span>{selectedCustomer.city || 'Karachi'}</span>
                      </span>
                      {selectedCustomer.address && (
                        <>
                          <span>•</span>
                          <span style={{ fontSize: '0.76rem' }}>{selectedCustomer.address}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Integrated Compact Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="btn btn-primary"
                    style={{
                      background: '#2563eb',
                      borderColor: '#2563eb',
                      fontWeight: 700,
                      padding: '6px 11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      borderRadius: '7px',
                      color: '#ffffff',
                      fontSize: '0.78rem',
                      boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)'
                    }}
                  >
                    <Zap size={13} />
                    <span>Receive Payment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(true)}
                    className="btn btn-secondary"
                    style={{
                      padding: '6px 11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      borderRadius: '7px',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      background: 'var(--bg-card, #ffffff)',
                      border: '1px solid var(--border-color, #cbd5e1)'
                    }}
                  >
                    <Printer size={13} />
                    <span>Print Slip</span>
                  </button>

                  <button
                    type="button"
                    onClick={openEditCustomerModal}
                    style={{
                      width: '31px',
                      height: '31px',
                      borderRadius: '7px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: 'var(--bg-card, #ffffff)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                    title="Edit Customer Profile"
                  >
                    <Edit2 size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteCustomer(selectedCustomer.id)}
                    style={{
                      width: '31px',
                      height: '31px',
                      borderRadius: '7px',
                      border: '1px solid #fecdd3',
                      background: 'var(--bg-card, #ffffff)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#e11d48',
                      cursor: 'pointer'
                    }}
                    title="Delete Customer Account"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* 4 Financial Metrics Cards (Separate, Unmerged Cards) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: '10px'
                }}
              >
                {/* Card 1: Total Purchases */}
                <div
                  style={{
                    background: 'var(--bg-card, #ffffff)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    padding: '12px 14px',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                    Total Purchases
                  </div>
                  <div className="font-mono" style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                    Rs. {Number(selectedCustomer.totalBilled || 0).toLocaleString()}
                  </div>
                </div>

                {/* Card 2: Total Wasooli */}
                <div
                  style={{
                    background: 'var(--bg-card, #ffffff)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    padding: '12px 14px',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                    Total Received
                  </div>
                  <div className="font-mono" style={{ fontSize: '1.02rem', fontWeight: 800, color: '#16a34a' }}>
                    Rs. {Number(selectedCustomer.totalPaid || 0).toLocaleString()}
                  </div>
                </div>

                {/* Card 3: Balance Due */}
                <div
                  style={{
                    background: 'var(--bg-card, #ffffff)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    padding: '12px 14px',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                    Balance Due
                  </div>
                  <div className="font-mono" style={{ fontSize: '1.02rem', fontWeight: 900, color: Number(selectedCustomer.balanceDue) > 0 ? '#dc2626' : '#16a34a' }}>
                    Rs. {Number(selectedCustomer.balanceDue || 0).toLocaleString()}
                  </div>
                </div>

                {/* Card 4: Credit Limit */}
                <div
                  style={{
                    background: 'var(--bg-card, #ffffff)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    padding: '12px 14px',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                    Credit Limit
                  </div>
                  <div className="font-mono" style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                    Rs. {Number(selectedCustomer.creditLimit || 500000).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Payment Method Selector Dropdown */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Payment Method
                </label>
                <div style={{ position: 'relative' }}>
                  <Wallet size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#2563eb' }} />
                  <select
                    value={selectedPaymentMethod}
                    onChange={e => setSelectedPaymentMethod(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 38px',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      border: '1px solid var(--border-color, #cbd5e1)',
                      borderRadius: '8px',
                      background: 'var(--bg-primary, #f8fafc)',
                      color: 'var(--text-primary, #0f172a)',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Cash in Drawer">Cash in Drawer</option>
                    <option value="Bank Account (HBL / Meezan)">Bank Account (HBL / Meezan)</option>
                    <option value="EasyPaisa / JazzCash">EasyPaisa / JazzCash</option>
                    <option value="Cheque Deposit">Cheque Deposit</option>
                  </select>
                </div>
              </div>

              {/* Khata Ledger & Transaction History */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                    <FileText size={16} style={{ color: '#2563eb' }} />
                    <span>Khata Ledger & Transaction History</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>View All</span>
                    <ChevronRight size={13} />
                  </button>
                </div>

                {/* Ledger Transactions or Empty State */}
                {activeTimeline.length === 0 ? (
                  <div
                    style={{
                      border: '1px dashed var(--border-color, #cbd5e1)',
                      borderRadius: '12px',
                      padding: '36px 20px',
                      textAlign: 'center',
                      color: '#64748b',
                      background: 'var(--bg-primary, #f8fafc)'
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: '#e0f2fe',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 10px auto'
                      }}
                    >
                      <FileText size={24} />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary, #1e293b)' }}>
                      No transaction records found
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '4px 0 0 0' }}>
                      Transactions will appear here once available.
                    </p>
                  </div>
                ) : (
                  <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '10px' }}>
                    <table className="global-table" style={{ fontSize: '0.78rem', width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '16%', padding: '8px 6px' }}>Date</th>
                          <th style={{ width: '24%', padding: '8px 6px' }}>Document</th>
                          <th style={{ width: '20%', textAlign: 'right', padding: '8px 6px' }}>Debit (+)</th>
                          <th style={{ width: '20%', textAlign: 'right', padding: '8px 6px' }}>Credit (-)</th>
                          <th style={{ width: '20%', textAlign: 'right', padding: '8px 6px' }}>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeTimeline.map((item, tIdx) => {
                          const isInvoice = item.type === "INVOICE";
                          const dateStr = new Date(item.sortDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

                          return (
                            <tr key={tIdx}>
                              <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>
                                {dateStr}
                              </td>
                              <td>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                                  {isInvoice ? `Bill #${item.invoiceNo}` : `Wasooli #${item.paymentNo || 'REC'}`}
                                </div>
                              </td>
                              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#dc2626' }}>
                                {isInvoice ? `Rs. ${Number(item.debit).toLocaleString()}` : '-'}
                              </td>
                              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#16a34a' }}>
                                {!isInvoice ? `Rs. ${Number(item.credit).toLocaleString()}` : '-'}
                              </td>
                              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                                Rs. {Number(item.runningBalance !== undefined ? item.runningBalance : selectedCustomer.balanceDue).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <Users size={36} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
              <div>Please select a customer from the left list.</div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 4. MODALS & POPUPS                                                        */}
      {/* ------------------------------------------------------------------------- */}
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
