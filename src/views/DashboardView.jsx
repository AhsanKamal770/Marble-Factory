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
  Eye,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign
} from 'lucide-react';
import { db, getLiveCashInDrawer, adjustItemStock } from '../db/index';
import { useLanguage } from '../context/LanguageContext';
import Badge from '../components/Badge';
import ThermalReceiptModal from '../components/ThermalReceiptModal';

export default function DashboardView({ setActiveView, settings }) {
  const { language, t } = useLanguage();

  const [stats, setStats] = useState({
    totalSales: 0,
    totalReceived: 0,
    totalDue: 0,
    totalStockSqFt: 0,
    invoicesCount: 0,
    customersCount: 0
  });

  const [drawerData, setDrawerData] = useState({
    openingCash: 35000,
    cashSalesToday: 0,
    wasooliToday: 0,
    expensesToday: 0,
    liveCash: 35000
  });

  const [todayExpensesList, setTodayExpensesList] = useState([]);
  const [customersWithDues, setCustomersWithDues] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);

  // Pop-up States (Intuitive Progressive Disclosure)
  const [isRoznamchaOpen, setIsRoznamchaOpen] = useState(false);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [isQuickWasooliOpen, setIsQuickWasooliOpen] = useState(false);
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);

  // Selected Entities for Modals
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedRestockItem, setSelectedRestockItem] = useState(null);
  const [isThermalOpen, setIsThermalOpen] = useState(false);

  // Quick Expense Form
  const [expenseForm, setExpenseForm] = useState({
    category: 'Food / Mess (کھانا چائے)',
    amount: '',
    paidTo: '',
    remarks: ''
  });
  const [expenseSuccessMsg, setExpenseSuccessMsg] = useState('');

  // Quick Wasooli Form
  const [wasooliForm, setWasooliForm] = useState({
    customerId: '',
    amount: '',
    paymentMethod: 'Cash',
    notes: ''
  });
  const [wasooliSuccessMsg, setWasooliSuccessMsg] = useState('');

  // Quick Restock Form
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

      // Fetch today's expenses list for the Roznamcha pop-up
      const today = new Date().toISOString().slice(0, 10);
      const allExpenses = await db.daily_expenses.toArray();
      const todayExp = allExpenses.filter(e => (e.date || e.createdAt || '').slice(0, 10) === today);
      setTodayExpensesList(todayExp);

      // Customers with active balance due for Quick Wasooli pop-up
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
        totalSales,
        totalReceived,
        totalDue,
        totalStockSqFt,
        invoicesCount: invoices.length,
        customersCount: customers.length
      });

      // Recent 5 invoices
      const sortedInvoices = [...invoices].sort(
        (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
      ).slice(0, 5);
      setRecentInvoices(sortedInvoices);

      setLowStockItems(lowStock.slice(0, 4));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  // 1. Submit Quick Expense
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

      setExpenseSuccessMsg(language === 'ur' ? 'خرچ درج ہوگیا!' : 'Kharch darj ho gaya!');
      setExpenseForm({
        category: 'Food / Mess (کھانا چائے)',
        amount: '',
        paidTo: '',
        remarks: ''
      });

      await loadDashboardData();

      setTimeout(() => {
        setExpenseSuccessMsg('');
        setIsQuickExpenseOpen(false);
      }, 900);
    } catch (err) {
      console.error('Error saving expense:', err);
    }
  };

  // 2. Submit Quick Wasooli
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
          notes: wasooliForm.notes || 'Quick Wasooli via Dashboard',
          createdAt: new Date().toISOString()
        });

        const newBalance = Math.max(0, (Number(customer.balanceDue) || 0) - payAmount);
        await db.customers.update(customer.id, {
          balanceDue: newBalance,
          updatedAt: new Date().toISOString()
        });
      });

      setWasooliSuccessMsg(language === 'ur' ? 'وصولی درج ہوگئی!' : 'Wasooli darj ho gayi!');
      await loadDashboardData();

      setTimeout(() => {
        setWasooliSuccessMsg('');
        setIsQuickWasooliOpen(false);
      }, 900);
    } catch (err) {
      console.error('Error saving wasooli:', err);
    }
  };

  // 3. Submit Quick Restock
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
        'Direct restock from dashboard alert pop-up'
      );

      setRestockSuccessMsg(language === 'ur' ? 'اسٹاک شامل ہوگیا!' : 'Stock shamil ho gaya!');
      setRestockAmount('');
      await loadDashboardData();

      setTimeout(() => {
        setRestockSuccessMsg('');
        setIsRestockModalOpen(false);
      }, 900);
    } catch (err) {
      console.error('Error updating stock:', err);
    }
  };

  // Open Receipt Modal
  const handleOpenReceipt = (invoice) => {
    setSelectedInvoice(invoice);
    setIsThermalOpen(true);
  };

  // Open Invoice Quick Detail Pop-up
  const handleRowClick = (invoice) => {
    setSelectedInvoice(invoice);
    setIsInvoiceDetailOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Top Action Bar: Sleek, single-line, zero clutter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {language === 'ur' ? 'ماربل کارخانہ لائیو جائزہ' : 'Marble Factory Overview'}
          </h2>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>

        {/* 3 Intuitive Action Triggers (Fitts's Law) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setActiveView('billing')}
            style={{ fontWeight: 700, padding: '7px 15px', borderRadius: 'var(--radius-md)' }}
          >
            <Plus size={16} />
            <span>{language === 'ur' ? 'نیا بل (POS)' : 'Naya Bill (POS)'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsQuickExpenseOpen(true)}
            style={{ color: '#e11d48', borderColor: '#fca5a5', fontWeight: 700, padding: '7px 13px', borderRadius: 'var(--radius-md)' }}
            title="Rozana Kharch Pop-up Kholein"
          >
            <Wallet size={14} />
            <span>{language === 'ur' ? 'روزانہ خرچ' : '+ Kharch'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsQuickWasooliOpen(true)}
            style={{ color: '#059669', borderColor: '#6ee7b7', fontWeight: 700, padding: '7px 13px', borderRadius: 'var(--radius-md)' }}
            title="Gahak Se Wasooli Pop-up Kholein"
          >
            <CreditCard size={14} />
            <span>{language === 'ur' ? 'ادھار وصولی' : 'Wasooli'}</span>
          </button>
        </div>
      </div>

      {/* 4 Interactive Metric Cards (Single balanced 4-column row) */}
      <div className="stats-grid-4">

        {/* 1. Total Sales */}
        <div className="card" style={{ padding: '16px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {language === 'ur' ? 'کل فیکٹری سیلز' : 'Kul Sales'}
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }} className="font-mono">
                Rs. {stats.totalSales.toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '8px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '8px', color: 'var(--accent-blue)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
            {stats.invoicesCount} {language === 'ur' ? 'بل جاری' : 'Bills Generated'}
          </div>
        </div>

        {/* 2. Total Cash Received (Clickable to open Roznamcha Drawer Pop-up!) */}
        <div
          className="card"
          onClick={() => setIsRoznamchaOpen(true)}
          style={{
            padding: '16px',
            cursor: 'pointer',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
          title="Click to view Roznamcha Drawer Breakdown Pop-up"
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {language === 'ur' ? 'کل وصولی (کیش)' : 'Kul Wasooli'}
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#059669', marginTop: '4px' }} className="font-mono">
                Rs. {stats.totalReceived.toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: '#059669' }}>
              <Wallet size={20} />
            </div>
          </div>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              {language === 'ur' ? 'دراز کیش:' : 'Draz Cash:'} <strong className="font-mono text-emerald">Rs. {drawerData.liveCash.toLocaleString()}</strong>
            </span>
            <span style={{ color: 'var(--accent-blue)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
              {language === 'ur' ? 'حساب' : 'Hisab'} <ChevronRight size={12} />
            </span>
          </div>
        </div>

        {/* 3. Udhar Due (Clickable to open Quick Wasooli Pop-up!) */}
        <div
          className="card"
          onClick={() => setIsQuickWasooliOpen(true)}
          style={{
            padding: '16px',
            cursor: 'pointer',
            border: stats.totalDue > 0 ? '1px solid rgba(225, 29, 72, 0.3)' : undefined,
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
          title="Click to record Quick Wasooli Pop-up"
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {language === 'ur' ? 'ادھار بقایا جات' : 'Udhar Baqaya'}
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: stats.totalDue > 0 ? '#e11d48' : '#059669', marginTop: '4px' }} className="font-mono">
                Rs. {stats.totalDue.toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '8px', background: 'rgba(225, 29, 72, 0.1)', borderRadius: '8px', color: '#e11d48' }}>
              <AlertCircle size={20} />
            </div>
          </div>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
            <span style={{ color: '#e11d48', fontWeight: 600 }}>
              {stats.customersCount} {language === 'ur' ? 'گاہک کھاتہ' : 'Customer Dues'}
            </span>
            <span style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
              {language === 'ur' ? 'وصولی' : 'Wasooli'} <ChevronRight size={12} />
            </span>
          </div>
        </div>

        {/* 4. Yard Stock */}
        <div
          className="card"
          onClick={() => setActiveView('stock')}
          style={{
            padding: '16px',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
          title="Click to view Yard Stock Catalog"
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {language === 'ur' ? 'فیکٹری یارڈ اسٹاک' : 'Yard Stock'}
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '4px' }} className="font-mono">
                {stats.totalStockSqFt.toLocaleString()} <span style={{ fontSize: '0.8rem' }}>Sq.Ft</span>
              </div>
            </div>
            <div style={{ padding: '8px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '8px', color: 'var(--accent-blue)' }}>
              <Boxes size={20} />
            </div>
          </div>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              {language === 'ur' ? 'موجودہ سلیب و ٹائلز' : 'Active Stock'}
            </span>
            <span style={{ color: 'var(--accent-blue)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
              {language === 'ur' ? 'اسٹاک' : 'Catalog'} <ChevronRight size={12} />
            </span>
          </div>
        </div>

      </div>

      {/* Two-Column Section: Recent Invoices & Low Stock Alerts */}
      <div className="dashboard-bottom-grid">

        {/* Left Column: Recent Invoices */}
        <div className="card">
          <div className="card-header" style={{ padding: '12px 16px' }}>
            <h3 className="card-title" style={{ fontSize: '0.92rem', fontWeight: 800 }}>
              {language === 'ur' ? 'تازہ ترین بل بک ریکارڈ' : 'Recent Invoices (Bills)'}
            </h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveView('invoices')}
              style={{ fontSize: '0.74rem', padding: '3px 8px' }}
            >
              {language === 'ur' ? 'تمام دیکھیں' : 'View All'}
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{language === 'ur' ? 'بل نمبر' : 'Bill #'}</th>
                  <th>{language === 'ur' ? 'گاہک' : 'Customer'}</th>
                  <th>{language === 'ur' ? 'کل رقم' : 'Total'}</th>
                  <th>{language === 'ur' ? 'وصول' : 'Paid'}</th>
                  <th>{language === 'ur' ? 'بقایا' : 'Due'}</th>
                  <th>{language === 'ur' ? 'اسٹیٹس' : 'Status'}</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                      {language === 'ur' ? 'کوئی بل موجود نہیں ہے۔' : 'No invoices recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  recentInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => handleRowClick(inv)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view Invoice Details Pop-up"
                    >
                      <td className="font-mono text-accent" style={{ fontWeight: 700 }}>
                        {inv.invoiceNo}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{inv.customerName}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{inv.customerPhone}</div>
                      </td>
                      <td className="font-mono" style={{ fontWeight: 700 }}>
                        Rs. {Number(inv.grandTotal || 0).toLocaleString()}
                      </td>
                      <td className="font-mono text-emerald" style={{ fontWeight: 600 }}>
                        Rs. {Number(inv.paidAmount || 0).toLocaleString()}
                      </td>
                      <td className="font-mono text-rose" style={{ fontWeight: 700 }}>
                        Rs. {Number(inv.balanceDue || 0).toLocaleString()}
                      </td>
                      <td>
                        <Badge status={inv.paymentStatus} />
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenReceipt(inv);
                          }}
                          title="80mm Thermal Receipt Print"
                          style={{ padding: '4px' }}
                        >
                          <Printer size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Low Stock Alerts */}
        <div className="card">
          <div className="card-header" style={{ padding: '12px 16px' }}>
            <h3 className="card-title" style={{ fontSize: '0.92rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
              <AlertCircle size={15} className="text-rose" />
              <span>{language === 'ur' ? 'کم اسٹاک الرٹس' : 'Low Stock Alerts'}</span>
            </h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveView('stock')}
              style={{ fontSize: '0.74rem', padding: '3px 8px' }}
            >
              {language === 'ur' ? 'اسٹاک' : 'Stock'}
            </button>
          </div>

          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {lowStockItems.length === 0 ? (
              <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                <CheckCircle2 size={20} style={{ color: '#10b981', margin: '0 auto 6px' }} />
                <div>{language === 'ur' ? 'اسٹاک تسلی بخش ہے' : 'Stock is healthy'}</div>
              </div>
            ) : (
              lowStockItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedRestockItem(item);
                    setIsRestockModalOpen(true);
                  }}
                  style={{
                    padding: '8px 10px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease'
                  }}
                  title="Click to Quick Restock Pop-up"
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      <span style={{
                        background: 'rgba(37, 99, 235, 0.1)',
                        color: 'var(--accent-blue)',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        fontWeight: 600,
                        marginRight: '4px'
                      }}>
                        {item.thicknessMm === 18 ? '6 Sutar' : '4 Sutar'}
                      </span>
                      <span>{item.category}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#e11d48' }} className="font-mono">
                      {item.stockSqFt} Sq.Ft
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--accent-blue)', fontWeight: 700 }}>
                      + {language === 'ur' ? 'مال شامل کریں' : 'Restock'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* POP-UP 1: ROZNAMCHA / CASH DRAWER BREAKDOWN MODAL                         */}
      {/* ========================================================================= */}
      {isRoznamchaOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet className="text-emerald" size={20} />
                <h3 className="modal-title" style={{ fontSize: '1rem', fontWeight: 800 }}>
                  {language === 'ur' ? 'روزنامچہ کیش دراز حساب' : 'Roznamcha: Cash Drawer Ledger'}
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIsRoznamchaOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Equation Box */}
              <div style={{
                background: 'var(--bg-primary)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{language === 'ur' ? 'صبح کا اوپننگ کیش:' : 'Opening Cash (Subah):'}</span>
                  <span className="font-mono" style={{ fontWeight: 700 }}>Rs. {Number(drawerData.openingCash).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                  <span>+ {language === 'ur' ? 'آج کی نقد سیلز:' : 'Today Cash Sales:'}</span>
                  <span className="font-mono" style={{ fontWeight: 700 }}>Rs. {Number(drawerData.cashSalesToday).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                  <span>+ {language === 'ur' ? 'آج کی ادھار وصولی:' : 'Today Udhar Wasooli:'}</span>
                  <span className="font-mono" style={{ fontWeight: 700 }}>Rs. {Number(drawerData.wasooliToday).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e11d48' }}>
                  <span>- {language === 'ur' ? 'آج کا کل خرچ:' : 'Today Factory Expenses:'}</span>
                  <span className="font-mono" style={{ fontWeight: 700 }}>Rs. {Number(drawerData.expensesToday).toLocaleString()}</span>
                </div>

                <div style={{
                  borderTop: '1px dashed var(--border-color)',
                  paddingTop: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: '#059669'
                }}>
                  <span>{language === 'ur' ? 'دراز میں موجود کل رقم:' : 'Live Cash in Drawer:'}</span>
                  <span className="font-mono" style={{ fontSize: '1.25rem', color: '#047857' }}>
                    Rs. {Number(drawerData.liveCash).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Today's Expense Breakdown */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {language === 'ur' ? 'آج کے اخراجات کی تفصیل:' : 'Today Expenses List:'}
                </div>
                <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {todayExpensesList.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                      {language === 'ur' ? 'آج کوئی خرچ ریکارڈ نہیں ہوا' : 'No expenses logged today'}
                    </div>
                  ) : (
                    todayExpensesList.map((exp, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                        background: 'var(--bg-primary)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.78rem'
                      }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{exp.category}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{exp.paidTo} {exp.remarks ? `• ${exp.remarks}` : ''}</div>
                        </div>
                        <div className="font-mono text-rose" style={{ fontWeight: 800 }}>
                          - Rs. {Number(exp.amount).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsRoznamchaOpen(false)}
              >
                {language === 'ur' ? 'بند کریں' : 'Close'}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setIsRoznamchaOpen(false);
                  setIsQuickExpenseOpen(true);
                }}
                style={{ background: '#e11d48', borderColor: '#e11d48' }}
              >
                + {language === 'ur' ? 'نیا خرچ کاٹیں' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POP-UP 2: QUICK WASOOLI (RECOVERY) MODAL                                  */}
      {/* ========================================================================= */}
      {isQuickWasooliOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard className="text-emerald" size={20} />
                <h3 className="modal-title" style={{ fontSize: '1rem', fontWeight: 800 }}>
                  {language === 'ur' ? 'گاہک سے ادھار وصولی' : 'Quick Udhar Wasooli'}
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIsQuickWasooliOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuickWasooli}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {wasooliSuccessMsg && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#059669',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    textAlign: 'center'
                  }}>
                    ✓ {wasooliSuccessMsg}
                  </div>
                )}

                {/* Customer Dropdown */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>
                    {language === 'ur' ? 'گاہک منتخب کریں' : 'Select Customer'}
                  </label>
                  <select
                    className="form-control"
                    value={wasooliForm.customerId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      const cust = customersWithDues.find(c => c.id.toString() === cid);
                      setWasooliForm({
                        ...wasooliForm,
                        customerId: cid,
                        amount: cust ? cust.balanceDue.toString() : ''
                      });
                    }}
                    required
                  >
                    {customersWithDues.length === 0 ? (
                      <option value="">{language === 'ur' ? 'کسی گاہک کا ادھار نہیں' : 'No active customer dues'}</option>
                    ) : (
                      customersWithDues.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (Baqaya: Rs. {Number(c.balanceDue).toLocaleString()})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Wasooli Amount */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 800, color: '#059669', fontSize: '0.8rem' }}>
                    {language === 'ur' ? 'وصول شدہ رقم (روپے)*' : 'Wasooli Amount (PKR)*'}
                  </label>
                  <input
                    type="number"
                    className="form-control font-mono"
                    placeholder="50000"
                    required
                    min="1"
                    value={wasooliForm.amount}
                    onChange={(e) => setWasooliForm({ ...wasooliForm, amount: e.target.value })}
                    style={{ fontSize: '1.2rem', fontWeight: 800 }}
                  />
                </div>

                {/* Payment Method */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>
                    {language === 'ur' ? 'ادائیگی کا طریقہ' : 'Payment Method'}
                  </label>
                  <select
                    className="form-control"
                    value={wasooliForm.paymentMethod}
                    onChange={(e) => setWasooliForm({ ...wasooliForm, paymentMethod: e.target.value })}
                  >
                    <option value="Cash">Cash (نقد کیش دراز)</option>
                    <option value="Bank Transfer">Bank Transfer (بینک آن لائن)</option>
                    <option value="Cheque">Cheque (چیک)</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer" style={{ justifyContent: 'space-between', padding: '12px 20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsQuickWasooliOpen(false)}
                >
                  {language === 'ur' ? 'منسوخ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ background: '#059669', borderColor: '#059669', fontWeight: 800 }}
                >
                  {language === 'ur' ? 'وصولی درج کریں' : 'Record Wasooli'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POP-UP 3: QUICK EXPENSE ENTRY MODAL                                       */}
      {/* ========================================================================= */}
      {isQuickExpenseOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '1rem', fontWeight: 800 }}>
                {language === 'ur' ? 'روزانہ خرچ درج کریں' : 'Rozana Kharch Entry'}
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIsQuickExpenseOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuickExpense}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {expenseSuccessMsg && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#059669',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    textAlign: 'center'
                  }}>
                    ✓ {expenseSuccessMsg}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 800, color: '#e11d48', fontSize: '0.8rem' }}>
                    {language === 'ur' ? 'رقم (روپے)*' : 'Amount (PKR)*'}
                  </label>
                  <input
                    type="number"
                    className="form-control font-mono"
                    placeholder="500"
                    autoFocus
                    required
                    min="1"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    style={{ fontSize: '1.2rem', fontWeight: 800 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>
                    {language === 'ur' ? 'خرچ کی مد' : 'Category'}
                  </label>
                  <select
                    className="form-control"
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  >
                    <option value="Food / Mess (کھانا چائے)">Food / Mess (کھانا، چائے)</option>
                    <option value="Petrol / Fuel (پٹرول ڈیزل)">Petrol / Diesel (ایندھن)</option>
                    <option value="Customer Udhar / Cash Advance (گاہک ادھار)">Customer Advance / Carriage</option>
                    <option value="Factory Maintenance (مرمت و متفرق)">Factory Maintenance</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>
                    {language === 'ur' ? 'کس کو دیا' : 'Paid To'}
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={language === 'ur' ? 'نام' : 'Recipient name'}
                    value={expenseForm.paidTo}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paidTo: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ justifyContent: 'space-between', padding: '12px 20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsQuickExpenseOpen(false)}
                >
                  {language === 'ur' ? 'منسوخ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ background: '#e11d48', borderColor: '#e11d48', fontWeight: 800 }}
                >
                  {language === 'ur' ? 'دراز سے کاٹیں' : 'Draz Se Kathein'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POP-UP 4: INVOICE QUICK PREVIEW MODAL                                     */}
      {/* ========================================================================= */}
      {isInvoiceDetailOpen && selectedInvoice && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText className="text-accent" size={20} />
                <h3 className="modal-title" style={{ fontSize: '1rem', fontWeight: 800 }}>
                  {selectedInvoice.invoiceNo} — {selectedInvoice.customerName}
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIsInvoiceDetailOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.84rem' }}>
              <div style={{
                background: 'var(--bg-primary)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{language === 'ur' ? 'فون نمبر:' : 'Phone:'}</span>
                  <div style={{ fontWeight: 600 }}>{selectedInvoice.customerPhone || 'N/A'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{language === 'ur' ? 'تاریخ:' : 'Date:'}</span>
                  <div>{new Date(selectedInvoice.createdAt || selectedInvoice.date).toLocaleDateString()}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{language === 'ur' ? 'اسٹیٹس:' : 'Status:'}</span>
                  <div><Badge status={selectedInvoice.paymentStatus} /></div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{language === 'ur' ? 'پتہ:' : 'Address:'}</span>
                  <div>{selectedInvoice.customerAddress || 'Direct Factory Yard'}</div>
                </div>
              </div>

              {/* Items List */}
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {language === 'ur' ? 'مال کی تفصیل:' : 'Billed Items:'}
                </div>
                <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(selectedInvoice.items || []).map((item, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      background: 'var(--bg-primary)',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      <div>
                        <span style={{ fontWeight: 700 }}>{item.name}</span>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {item.dimensions} • {item.totalSqFt} Sq.Ft @ Rs. {item.ratePerSqFt}
                        </div>
                      </div>
                      <div className="font-mono" style={{ fontWeight: 700 }}>
                        Rs. {Number(item.amount).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Totals */}
              <div style={{
                borderTop: '1px solid var(--border-color)',
                paddingTop: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 700
              }}>
                <span>{language === 'ur' ? 'کل بل رقم:' : 'Total Amount:'}</span>
                <span className="font-mono">Rs. {Number(selectedInvoice.grandTotal || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 700 }}>
                <span>{language === 'ur' ? 'وصول شدہ:' : 'Paid Amount:'}</span>
                <span className="font-mono">Rs. {Number(selectedInvoice.paidAmount || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e11d48', fontWeight: 800 }}>
                <span>{language === 'ur' ? 'بقایا ادھار:' : 'Balance Due:'}</span>
                <span className="font-mono">Rs. {Number(selectedInvoice.balanceDue || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsInvoiceDetailOpen(false)}
              >
                {language === 'ur' ? 'بند کریں' : 'Close'}
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setIsInvoiceDetailOpen(false);
                  handleOpenReceipt(selectedInvoice);
                }}
              >
                <Printer size={14} />
                <span>{language === 'ur' ? '80mm سلپ پرنٹ' : 'Print 80mm Slip'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POP-UP 5: QUICK RESTOCK / INTAKE MODAL                                    */}
      {/* ========================================================================= */}
      {isRestockModalOpen && selectedRestockItem && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PackagePlus className="text-accent" size={20} />
                <h3 className="modal-title" style={{ fontSize: '1rem', fontWeight: 800 }}>
                  {language === 'ur' ? 'مال اسٹاک شامل کریں' : 'Quick Restock Intake'}
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIsRestockModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRestock}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {restockSuccessMsg && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#059669',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    textAlign: 'center'
                  }}>
                    ✓ {restockSuccessMsg}
                  </div>
                )}

                <div style={{
                  background: 'var(--bg-primary)',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem'
                }}>
                  <div style={{ fontWeight: 700 }}>{selectedRestockItem.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                    {language === 'ur' ? 'موجودہ اسٹاک:' : 'Current Stock:'} <span className="font-mono text-rose" style={{ fontWeight: 800 }}>{selectedRestockItem.stockSqFt} Sq.Ft</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 800, color: 'var(--accent-blue)', fontSize: '0.8rem' }}>
                    {language === 'ur' ? 'کتنا اسکوائر فٹ شامل کریں؟*' : 'Add Sq.Ft Quantity*'}
                  </label>
                  <input
                    type="number"
                    className="form-control font-mono"
                    placeholder="500"
                    autoFocus
                    required
                    min="1"
                    value={restockAmount}
                    onChange={(e) => setRestockAmount(e.target.value)}
                    style={{ fontSize: '1.2rem', fontWeight: 800 }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ justifyContent: 'space-between', padding: '12px 20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsRestockModalOpen(false)}
                >
                  {language === 'ur' ? 'منسوخ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 800 }}
                >
                  + {language === 'ur' ? 'اسٹاک بڑھائیں' : 'Add Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 80mm Thermal Receipt Modal */}
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
