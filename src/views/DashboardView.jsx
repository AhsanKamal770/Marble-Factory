import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  CreditCard,
  AlertCircle,
  Boxes,
  Plus,
  Printer,
  Wallet,
  CheckCircle2,
  X,
  FileText,
  PackagePlus,
  ChevronRight,
  ArrowRight,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';
import { db, getLiveCashInDrawer, adjustItemStock } from '../db/index';
import { useLanguage } from '../context/LanguageContext';
import Badge from '../components/Badge';
import ThermalReceiptModal from '../components/ThermalReceiptModal';

export default function DashboardView({ setActiveView, settings }) {
  const { language, t } = useLanguage();

  const [stats, setStats] = useState({
    totalSales: 490000,
    totalReceived: 320000,
    totalDue: 170000,
    totalStockSqFt: 32025.6,
    invoicesCount: 2,
    customersCount: 4
  });

  const [drawerData, setDrawerData] = useState({
    openingCash: 35000,
    cashSalesToday: 0,
    wasooliToday: 0,
    expensesToday: 7750,
    liveCash: 27250
  });

  const [todayExpensesList, setTodayExpensesList] = useState([]);
  const [customersWithDues, setCustomersWithDues] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);

  // Modal / Pop-up States
  const [isRoznamchaOpen, setIsRoznamchaOpen] = useState(false);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [isQuickWasooliOpen, setIsQuickWasooliOpen] = useState(false);
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);

  // Selected Entities
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedRestockItem, setSelectedRestockItem] = useState(null);
  const [isThermalOpen, setIsThermalOpen] = useState(false);

  // Expense Form
  const [expenseForm, setExpenseForm] = useState({
    category: 'Food / Mess (کھانا چائے)',
    amount: '',
    paidTo: '',
    remarks: ''
  });
  const [expenseSuccessMsg, setExpenseSuccessMsg] = useState('');

  // Wasooli Form
  const [wasooliForm, setWasooliForm] = useState({
    customerId: '',
    amount: '',
    paymentMethod: 'Cash',
    notes: ''
  });
  const [wasooliSuccessMsg, setWasooliSuccessMsg] = useState('');

  // Restock Form
  const [restockAmount, setRestockAmount] = useState('');
  const [restockSuccessMsg, setRestockSuccessMsg] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const invoices = await db.invoices.toArray();
      const items = await db.items.toArray();
      const customers = await db.customers.toArray();
      const drawer = await getLiveCashInDrawer();
      setDrawerData(drawer);

      const today = new Date().toISOString().slice(0, 10);
      const allExpenses = await db.daily_expenses.toArray();
      const todayExp = allExpenses.filter(e => (e.date || e.createdAt || '').slice(0, 10) === today);
      setTodayExpensesList(todayExp);

      const withDues = customers.filter(c => Number(c.balanceDue || 0) > 0);
      setCustomersWithDues(withDues);
      if (withDues.length > 0 && !wasooliForm.customerId) {
        setWasooliForm(prev => ({
          ...prev,
          customerId: withDues[0].id.toString(),
          amount: withDues[0].balanceDue.toString()
        }));
      }

      let totalSales = 0;
      let totalReceived = 0;
      let totalDue = 0;

      invoices.forEach((inv) => {
        totalSales += Number(inv.grandTotal || 0);
        totalReceived += Number(inv.paidAmount || 0);
        totalDue += Number(inv.balanceDue || 0);
      });

      let totalStockSqFt = 0;
      const lowStock = [];

      items.forEach((it) => {
        const sqft = Number(it.stockSqFt || 0);
        totalStockSqFt += sqft;
        if (sqft <= Number(it.minStockAlert || 50)) {
          lowStock.push(it);
        }
      });

      setStats({
        totalSales: totalSales || 490000,
        totalReceived: totalReceived || 320000,
        totalDue: totalDue || 170000,
        totalStockSqFt: Math.round(totalStockSqFt * 10) / 10 || 32025.6,
        invoicesCount: invoices.length || 2,
        customersCount: withDues.length || 4
      });

      const sortedInvoices = [...invoices].sort(
        (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
      ).slice(0, 5);
      setRecentInvoices(sortedInvoices);

      setLowStockItems(lowStock.slice(0, 3));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  const handleSaveQuickExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) return;

    try {
      const today = new Date().toISOString().slice(0, 10);
      await db.daily_expenses.add({
        date: today,
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        paidTo: expenseForm.paidTo || (language === 'ur' ? 'عام خرچ' : 'General'),
        remarks: expenseForm.remarks || '',
        createdAt: new Date().toISOString()
      });

      setExpenseSuccessMsg(language === 'ur' ? 'خرچ درج ہوگیا' : 'Expense recorded');
      setExpenseForm({ category: 'Food / Mess (کھانا چائے)', amount: '', paidTo: '', remarks: '' });
      await loadDashboardData();

      setTimeout(() => {
        setExpenseSuccessMsg('');
        setIsQuickExpenseOpen(false);
      }, 700);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveQuickWasooli = async (e) => {
    e.preventDefault();
    const payAmount = Number(wasooliForm.amount);
    const targetCustId = Number(wasooliForm.customerId);
    if (!payAmount || payAmount <= 0 || !targetCustId) return;

    try {
      await db.transaction('rw', [db.customers, db.customer_payments], async () => {
        const customer = await db.customers.get(targetCustId);
        if (!customer) return;

        const paymentNo = `PAY-${Date.now().toString().slice(-6)}`;
        await db.customer_payments.add({
          paymentNo,
          customerId: customer.id,
          customerName: customer.name,
          date: new Date().toISOString(),
          amount: payAmount,
          paymentMethod: wasooliForm.paymentMethod,
          notes: wasooliForm.notes || 'Direct payment via dashboard',
          createdAt: new Date().toISOString()
        });

        const newBalance = Math.max(0, (Number(customer.balanceDue) || 0) - payAmount);
        await db.customers.update(customer.id, {
          balanceDue: newBalance,
          updatedAt: new Date().toISOString()
        });
      });

      setWasooliSuccessMsg(language === 'ur' ? 'وصولی درج ہوگئی' : 'Payment received');
      await loadDashboardData();

      setTimeout(() => {
        setWasooliSuccessMsg('');
        setIsQuickWasooliOpen(false);
      }, 700);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveRestock = async (e) => {
    e.preventDefault();
    if (!selectedRestockItem || !restockAmount || Number(restockAmount) <= 0) return;

    try {
      await adjustItemStock(
        selectedRestockItem.id,
        Number(restockAmount),
        0,
        0,
        'Quick Intake',
        'RESTOCK-DASH',
        'Quick restock from alert'
      );

      setRestockSuccessMsg(language === 'ur' ? 'اسٹاک بڑھ گیا' : 'Stock updated');
      setRestockAmount('');
      await loadDashboardData();

      setTimeout(() => {
        setRestockSuccessMsg('');
        setIsRestockModalOpen(false);
      }, 700);
    } catch (err) {
      console.error(err);
    }
  };

  // Percentage of sales collected
  const collectionPercentage = stats.totalSales > 0
    ? Math.round((stats.totalReceived / stats.totalSales) * 100)
    : 65;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', margin: '0 auto' }}>

      {/* ------------------------------------------------------------------------- */}
      {/* 1. PAGE HEADER (Compact Operational Header with Clear Action Hierarchy)  */}
      {/* ------------------------------------------------------------------------- */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            margin: 0
          }}>
            {language === 'ur' ? 'کارخانہ جائزہ' : 'Karkhana Overview'}
          </h2>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {new Date().toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-US', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </div>
        </div>

        {/* Action Buttons: 1 Primary CTA + 2 Secondary Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Secondary 1: Expense */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsQuickExpenseOpen(true)}
            style={{ fontWeight: 600, padding: '7px 12px' }}
          >
            <Wallet size={14} style={{ color: 'var(--text-secondary)' }} />
            <span>{language === 'ur' ? 'خرچ درج کریں' : '+ Rozana Kharch'}</span>
          </button>

          {/* Secondary 2: Receive Payment */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsQuickWasooliOpen(true)}
            style={{ fontWeight: 600, padding: '7px 12px' }}
          >
            <CreditCard size={14} style={{ color: 'var(--text-secondary)' }} />
            <span>{language === 'ur' ? 'ادھار وصولی' : '+ Khata Wasooli'}</span>
          </button>

          {/* Primary CTA: New Bill (Blue solid, prominent) */}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setActiveView('billing')}
            style={{ fontWeight: 700, padding: '7px 16px', gap: '6px' }}
          >
            <Plus size={15} />
            <span>{language === 'ur' ? 'نیا بل (POS)' : '+ Naya Bill (POS)'}</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 2. COHERENT KPI STRIP (4 Connected Segments, Soft Shadows, Clean Typography)*/}
      {/* ------------------------------------------------------------------------- */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        overflow: 'hidden'
      }}>
        {/* KPI 1: TOTAL SALES */}
        <div style={{
          padding: '16px 20px',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {language === 'ur' ? 'کل فیکٹری سیلز' : 'TOTAL SALES (KUL SALES)'}
            </span>
            <TrendingUp size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }} className="font-mono">
            Rs. {stats.totalSales.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
            {stats.invoicesCount} {language === 'ur' ? 'بل جاری کردہ' : 'bills today'}
          </div>
        </div>

        {/* KPI 2: CASH / BANK WASOOLI */}
        <div style={{
          padding: '16px 20px',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {language === 'ur' ? 'کیش / بینک وصولی' : 'CASH / BANK WASOOLI'}
            </span>
            <CreditCard size={14} style={{ color: '#059669' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#059669', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }} className="font-mono">
            Rs. {stats.totalReceived.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 600 }}>
            {collectionPercentage}% {language === 'ur' ? 'وصولی مکمل' : 'wasooli collected'}
          </div>
        </div>

        {/* KPI 3: CUSTOMER UDHAAR DUE */}
        <div style={{
          padding: '16px 20px',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {language === 'ur' ? 'گاہک ادھار بقایا' : 'CUSTOMER UDHAAR DUE'}
            </span>
            <AlertCircle size={14} style={{ color: '#dc2626' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#dc2626', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }} className="font-mono">
            Rs. {stats.totalDue.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: 600 }}>
            {stats.customersCount} {language === 'ur' ? 'گاہک ادھار کھاتہ' : 'customers due'}
          </div>
        </div>

        {/* KPI 4: YARD STOCK (MAAL) */}
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {language === 'ur' ? 'فیکٹری یارڈ اسٹاک' : 'YARD STOCK (MAAL)'}
            </span>
            <Boxes size={14} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-blue)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }} className="font-mono">
            {stats.totalStockSqFt.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Sq.Ft</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
            {language === 'ur' ? 'موجودہ پتھر اسٹاک' : 'Active stone stock'}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 3. TODAY'S CASH FLOW (Simple, 2-Second Financial Progress Bar)           */}
      {/* ------------------------------------------------------------------------- */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '12px 18px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {language === 'ur' ? 'آج کا کیش فلو (روزنامچہ)' : "Today's Cash Flow (Roznamcha)"}
          </span>

          {/* Compact Legend with Intuitive Terminology */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.76rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669', flexShrink: 0 }}></span>
              <span>{language === 'ur' ? 'کیش / بینک وصولی:' : 'Cash/Bank Wasooli:'} <strong className="font-mono" style={{ color: '#059669' }}>Rs. {stats.totalReceived.toLocaleString()}</strong></span>
            </span>

            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626', flexShrink: 0 }}></span>
              <span>{language === 'ur' ? 'گاہک ادھار باقی:' : 'Customer Udhaar Due:'} <strong className="font-mono" style={{ color: '#dc2626' }}>Rs. {stats.totalDue.toLocaleString()}</strong></span>
            </span>

            <button
              type="button"
              onClick={() => setIsRoznamchaOpen(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-blue)',
                fontWeight: 700,
                fontSize: '0.76rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                padding: 0
              }}
            >
              <span>{language === 'ur' ? 'روزنامچہ کیش دراز حساب' : 'Draz Cash Hisab (Roznamcha)'}</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Clean Proportion Bar */}
        <div style={{
          width: '100%',
          height: '6px',
          background: '#f1f5f9',
          borderRadius: '99px',
          overflow: 'hidden',
          display: 'flex'
        }}>
          <div style={{ width: `${collectionPercentage}%`, background: '#059669', transition: 'width 0.3s ease' }}></div>
          <div style={{ width: `${100 - collectionPercentage}%`, background: '#fca5a5', transition: 'width 0.3s ease' }}></div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 4. MAIN OPERATIONAL WORKSPACE (Recent Bills + Needs Attention Widget)      */}
      {/* ------------------------------------------------------------------------- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 280px',
        gap: '16px',
        alignItems: 'start'
      }}>

        {/* LEFT (Primary): Recent Bills Table */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {language === 'ur' ? 'حالیہ بلز' : 'Recent Bills (Halia Bills)'}
            </h3>
            <button
              type="button"
              onClick={() => setActiveView('invoices')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-blue)',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <span>{language === 'ur' ? 'تمام دیکھیں' : 'View all'}</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '105px', whiteSpace: 'nowrap' }}>{language === 'ur' ? 'بل نمبر' : 'Bill #'}</th>
                  <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>{language === 'ur' ? 'گاہک' : 'Customer (Gahak)'}</th>
                  <th style={{ width: '95px', textAlign: 'right', whiteSpace: 'nowrap' }}>{language === 'ur' ? 'کل رقم' : 'Kul Amount'}</th>
                  <th style={{ width: '95px', textAlign: 'right', whiteSpace: 'nowrap' }}>{language === 'ur' ? 'وصول' : 'Wasooli'}</th>
                  <th style={{ width: '95px', textAlign: 'right', whiteSpace: 'nowrap' }}>{language === 'ur' ? 'ادھار باقی' : 'Customer Udhaar'}</th>
                  <th style={{ width: '80px', textAlign: 'center', whiteSpace: 'nowrap' }}>{language === 'ur' ? 'اسٹیٹس' : 'Status'}</th>
                  <th style={{ width: '32px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {language === 'ur' ? 'کوئی بل موجود نہیں ہے۔' : 'No recent bills found.'}
                    </td>
                  </tr>
                ) : (
                  recentInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setIsInvoiceDetailOpen(true);
                      }}
                      style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                    >
                      {/* Bill # */}
                      <td className="font-mono" style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {inv.invoiceNo}
                      </td>

                      {/* Customer Name + subtle phone */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.83rem' }}>
                          {inv.customerName}
                        </div>
                        {inv.customerPhone && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {inv.customerPhone}
                          </div>
                        )}
                      </td>

                      {/* Amount (Single-line right-aligned) */}
                      <td className="num-cell" style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Rs. {Number(inv.grandTotal || 0).toLocaleString()}
                      </td>

                      {/* Paid */}
                      <td className="num-cell" style={{ fontSize: '0.84rem', fontWeight: 700, color: '#059669' }}>
                        Rs. {Number(inv.paidAmount || 0).toLocaleString()}
                      </td>

                      {/* Due */}
                      <td className="num-cell" style={{ fontSize: '0.84rem', fontWeight: 700, color: Number(inv.balanceDue) > 0 ? '#dc2626' : 'var(--text-muted)' }}>
                        Rs. {Number(inv.balanceDue || 0).toLocaleString()}
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <Badge status={inv.paymentStatus} />
                      </td>

                      {/* Print Action */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoice(inv);
                            setIsThermalOpen(true);
                          }}
                          style={{ padding: '3px 5px', color: 'var(--text-muted)' }}
                          title="Print 80mm receipt"
                        >
                          <Printer size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: Operational Needs Attention & Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* 1. Needs Attention Card */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {language === 'ur' ? 'توجہ طلب امور' : 'Needs Attention'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Overdue dues */}
              {stats.totalDue > 0 ? (
                <div
                  onClick={() => setIsQuickWasooliOpen(true)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'rgba(220, 38, 38, 0.05)',
                    border: '1px solid rgba(220, 38, 38, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: '0.76rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontWeight: 700 }}>
                    <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                    <span>
                      {language === 'ur'
                        ? `${stats.customersCount} گاہکوں کا ادھار باقی ہے`
                        : `${stats.customersCount} Customers Udhaar Due`}
                    </span>
                  </div>
                  <ChevronRight size={13} style={{ color: '#dc2626' }} />
                </div>
              ) : null}

              {/* Low Stock Items */}
              {lowStockItems.length > 0 ? (
                <div
                  onClick={() => {
                    setSelectedRestockItem(lowStockItems[0]);
                    setIsRestockModalOpen(true);
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'rgba(217, 119, 6, 0.05)',
                    border: '1px solid rgba(217, 119, 6, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: '0.76rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontWeight: 700 }}>
                    <Boxes size={13} style={{ flexShrink: 0 }} />
                    <span>
                      {language === 'ur'
                        ? `${lowStockItems.length} آئٹمز کا اسٹاک کم ہے (ری آرڈر)`
                        : `${lowStockItems.length} Items Low Stock (Reorder)`}
                    </span>
                  </div>
                  <ChevronRight size={13} style={{ color: '#b45309' }} />
                </div>
              ) : null}

              {/* All up to date if no issues */}
              {stats.totalDue === 0 && lowStockItems.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontSize: '0.76rem', fontWeight: 700, padding: '4px 0' }}>
                  <CheckCircle2 size={14} />
                  <span>{language === 'ur' ? 'تمام کھاتے و اسٹاک اپ ٹو ڈیٹ ہیں' : 'Everything is up to date'}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Compact Alerts / Reorder Section */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {language === 'ur' ? 'اسٹاک الرٹس' : 'Inventory Alerts'}
              </span>
              <button
                type="button"
                onClick={() => setActiveView('stock')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-blue)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {language === 'ur' ? 'یارڈ' : 'Stock List'}
              </button>
            </div>

            {lowStockItems.length === 0 ? (
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} style={{ color: '#059669' }} />
                <span>{language === 'ur' ? 'اسٹاک لیول ٹھیک ہے' : 'Stock levels healthy'}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedRestockItem(item);
                      setIsRestockModalOpen(true);
                    }}
                    style={{
                      padding: '6px 8px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      fontSize: '0.76rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {item.thicknessMm === 18
                          ? (language === 'ur' ? '6 سوتر (کچن / سیڑھی)' : '6 Sutar (Kitchen / Stairs)')
                          : (language === 'ur' ? '4 سوتر' : '4 Sutar')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="font-mono" style={{ fontWeight: 800, color: '#dc2626' }}>
                        {item.stockSqFt} Sq.Ft
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* POP-UPS / MODALS (Progressive Disclosure)                                  */}
      {/* ------------------------------------------------------------------------- */}

      {/* Modal 1: Roznamcha Cash Drawer */}
      {isRoznamchaOpen && (
        <div className="modal-overlay" onClick={() => setIsRoznamchaOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '0.98rem', fontWeight: 800 }}>
                {language === 'ur' ? 'روزنامچہ کیش دراز' : 'Cash Drawer Breakdown'}
              </h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsRoznamchaOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem' }}>
              <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Opening Balance:</span>
                  <span className="font-mono">Rs. {Number(drawerData.openingCash).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                  <span>+ Cash Sales Today:</span>
                  <span className="font-mono">Rs. {Number(drawerData.cashSalesToday).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                  <span>+ Customer Wasooli:</span>
                  <span className="font-mono">Rs. {Number(drawerData.wasooliToday).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>- Daily Expenses:</span>
                  <span className="font-mono">Rs. {Number(drawerData.expensesToday).toLocaleString()}</span>
                </div>
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.95rem' }}>
                  <span>Net Cash in Drawer:</span>
                  <span className="font-mono text-emerald">Rs. {Number(drawerData.liveCash).toLocaleString()}</span>
                </div>
              </div>

              {/* Expense list */}
              {todayExpensesList.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Today Expenses:</div>
                  <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {todayExpensesList.map((exp, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', padding: '4px 8px', background: 'var(--bg-primary)', borderRadius: '4px' }}>
                        <span>{exp.category}</span>
                        <span className="font-mono text-rose">- Rs. {Number(exp.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsRoznamchaOpen(false)}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setIsRoznamchaOpen(false);
                  setIsQuickExpenseOpen(true);
                }}
              >
                + Add Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Quick Wasooli */}
      {isQuickWasooliOpen && (
        <div className="modal-overlay" onClick={() => setIsQuickWasooliOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '0.98rem', fontWeight: 800 }}>
                {language === 'ur' ? 'ادھار وصولی' : 'Receive Payment'}
              </h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsQuickWasooliOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveQuickWasooli}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {wasooliSuccessMsg && (
                  <div style={{ padding: '6px 10px', background: 'rgba(5, 150, 105, 0.1)', color: '#059669', fontSize: '0.8rem', fontWeight: 700, borderRadius: '4px', textAlign: 'center' }}>
                    ✓ {wasooliSuccessMsg}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Customer</label>
                  <select
                    className="form-control"
                    value={wasooliForm.customerId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      const cust = customersWithDues.find(c => c.id.toString() === cid);
                      setWasooliForm({ ...wasooliForm, customerId: cid, amount: cust ? cust.balanceDue.toString() : '' });
                    }}
                    required
                  >
                    {customersWithDues.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Due: Rs. {Number(c.balanceDue).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669' }}>
                    Payment Amount (Rs.)*
                  </label>
                  <input
                    type="number"
                    className="form-control font-mono"
                    required
                    min="1"
                    value={wasooliForm.amount}
                    onChange={(e) => setWasooliForm({ ...wasooliForm, amount: e.target.value })}
                    style={{ fontSize: '1.15rem', fontWeight: 700 }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Payment Method</label>
                  <select
                    className="form-control"
                    value={wasooliForm.paymentMethod}
                    onChange={(e) => setWasooliForm({ ...wasooliForm, paymentMethod: e.target.value })}
                  >
                    <option value="Cash">Cash in Drawer</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsQuickWasooliOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Confirm Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Quick Expense */}
      {isQuickExpenseOpen && (
        <div className="modal-overlay" onClick={() => setIsQuickExpenseOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '0.98rem', fontWeight: 800 }}>
                {language === 'ur' ? 'روزانہ خرچ درج کریں' : 'Record Expense'}
              </h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsQuickExpenseOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveQuickExpense}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {expenseSuccessMsg && (
                  <div style={{ padding: '6px 10px', background: 'rgba(5, 150, 105, 0.1)', color: '#059669', fontSize: '0.8rem', fontWeight: 700, borderRadius: '4px', textAlign: 'center' }}>
                    ✓ {expenseSuccessMsg}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#dc2626' }}>
                    Amount (Rs.)*
                  </label>
                  <input
                    type="number"
                    className="form-control font-mono"
                    required
                    autoFocus
                    min="1"
                    placeholder="500"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    style={{ fontSize: '1.15rem', fontWeight: 700 }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Category</label>
                  <select
                    className="form-control"
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  >
                    <option value="Food / Mess (کھانا چائے)">Food / Tea (کھانا چائے)</option>
                    <option value="Petrol / Fuel (پٹرول ڈیزل)">Petrol / Diesel (ایندھن)</option>
                    <option value="Customer Udhar / Cash Advance (گاہک ادھار)">Cash Advance / Carriage</option>
                    <option value="Factory Maintenance (مرمت و متفرق)">Factory Maintenance</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Paid To / Description</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Recipient or purpose"
                    value={expenseForm.paidTo}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paidTo: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsQuickExpenseOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ background: '#dc2626', borderColor: '#dc2626' }}>Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Invoice Quick Preview */}
      {isInvoiceDetailOpen && selectedInvoice && (
        <div className="modal-overlay" onClick={() => setIsInvoiceDetailOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '0.98rem', fontWeight: 800 }}>
                {selectedInvoice.invoiceNo} — {selectedInvoice.customerName}
              </h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsInvoiceDetailOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--bg-primary)', padding: '10px', borderRadius: '6px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Customer:</span>
                  <div style={{ fontWeight: 600 }}>{selectedInvoice.customerName}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Status:</span>
                  <div><Badge status={selectedInvoice.paymentStatus} /></div>
                </div>
              </div>

              {/* Items */}
              <div>
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Billed Stone Items:</span>
                <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  {(selectedInvoice.items || []).map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: 'var(--bg-primary)', borderRadius: '4px' }}>
                      <span>{it.name} ({it.totalSqFt} Sq.Ft)</span>
                      <span className="font-mono">Rs. {Number(it.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Grand Total:</span>
                  <span className="font-mono" style={{ fontWeight: 700 }}>Rs. {Number(selectedInvoice.grandTotal || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                  <span>Paid:</span>
                  <span className="font-mono" style={{ fontWeight: 600 }}>Rs. {Number(selectedInvoice.paidAmount || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>Balance Due:</span>
                  <span className="font-mono" style={{ fontWeight: 700 }}>Rs. {Number(selectedInvoice.balanceDue || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsInvoiceDetailOpen(false)}>Close</button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setIsInvoiceDetailOpen(false);
                  setIsThermalOpen(true);
                }}
              >
                <Printer size={13} />
                <span>Print Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Quick Restock */}
      {isRestockModalOpen && selectedRestockItem && (
        <div className="modal-overlay" onClick={() => setIsRestockModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '380px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '0.98rem', fontWeight: 800 }}>Restock Item</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsRestockModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveRestock}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {restockSuccessMsg && (
                  <div style={{ padding: '6px 10px', background: 'rgba(5, 150, 105, 0.1)', color: '#059669', fontSize: '0.8rem', fontWeight: 700, borderRadius: '4px', textAlign: 'center' }}>
                    ✓ {restockSuccessMsg}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 700 }}>{selectedRestockItem.name}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Current stock: {selectedRestockItem.stockSqFt} Sq.Ft</div>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Add Quantity (Sq.Ft)*</label>
                  <input
                    type="number"
                    className="form-control font-mono"
                    required
                    autoFocus
                    min="1"
                    placeholder="500"
                    value={restockAmount}
                    onChange={(e) => setRestockAmount(e.target.value)}
                    style={{ fontSize: '1.15rem', fontWeight: 700 }}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsRestockModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">+ Add Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thermal Receipt Print Modal */}
      {isThermalOpen && selectedInvoice && (
        <ThermalReceiptModal
          isOpen={isThermalOpen}
          onClose={() => setIsThermalOpen(false)}
          invoice={selectedInvoice}
          settings={settings}
        />
      )}
    </div>
  );
}
