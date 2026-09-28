import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  CreditCard,
  AlertCircle,
  Boxes,
  Plus,
  Printer,
  Wallet,
  CheckCircle2,
  FileText,
  ArrowRight,
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  Clock,
  Activity,
  BarChart2
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getLiveCashInDrawer, adjustItemStock } from '../db/index';
import { useLanguage } from '../context/LanguageContext';
import Badge from '../components/Badge';
import ThermalReceiptModal from '../components/ThermalReceiptModal';
import ActionButton, { ActionGroup } from '../components/ActionButton';

export default function DashboardView({ setActiveView, settings }) {
  const { language } = useLanguage();

  // ---------------------------------------------------------------------------
  // 1. LIVE REAL-TIME DATABASE QUERIES (Zero Mock Fallbacks)
  // ---------------------------------------------------------------------------
  const invoices = useLiveQuery(() => db.invoices.orderBy('id').reverse().toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const items = useLiveQuery(() => db.items.toArray(), []) || [];
  const customerPayments = useLiveQuery(() => db.customer_payments.toArray(), []) || [];
  const dailyExpenses = useLiveQuery(() => db.daily_expenses.toArray(), []) || [];

  // Live cash drawer query - depends on invoices, customer_payments, and daily_expenses
  const drawerDependencies = useLiveQuery(
    () => db.invoices.count() + db.customer_payments.count() + db.daily_expenses.count(),
    []
  );

  const drawerData = useLiveQuery(
    () => getLiveCashInDrawer(),
    [drawerDependencies]
  ) || {
    openingCash: Number(settings?.openingCashBalance || 0),
    cashSalesToday: 0,
    wasooliToday: 0,
    expensesToday: 0,
    liveCash: Number(settings?.openingCashBalance || 0)
  };

  // ---------------------------------------------------------------------------
  // 2. DERIVED METRICS & BUSINESS INTELLIGENCE
  // ---------------------------------------------------------------------------
  const todayDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Primary 4 KPIs
  const totalSales = useMemo(
    () => invoices.reduce((acc, inv) => acc + Number(inv.grandTotal || 0), 0),
    [invoices]
  );

  const totalReceived = useMemo(() => {
    const directSalesCash = invoices.filter(inv => !inv.customerId).reduce((acc, inv) => acc + Number(inv.paidAmount || 0), 0);
    const wasooliCash = customerPayments.reduce((acc, pay) => acc + Number(pay.amount || 0), 0);
    return directSalesCash + wasooliCash;
  }, [invoices, customerPayments]);

  const totalDue = useMemo(
    () => customers.reduce((acc, cust) => acc + Number(cust.balanceDue || 0), 0),
    [customers]
  );

  const totalStockSqFt = useMemo(
    () => Math.round(items.reduce((acc, it) => acc + Number(it.stockSqFt || 0), 0) * 10) / 10,
    [items]
  );

  // Customers with outstanding balances
  const customersWithDues = useMemo(
    () => customers.filter((c) => Number(c.balanceDue || 0) > 0),
    [customers]
  );

  // Items below reorder level
  const lowStockItems = useMemo(
    () => items.filter((it) => Number(it.stockSqFt || 0) <= Number(it.minStockAlert || 50)),
    [items]
  );

  // Recent 5 Invoices
  const recentInvoices = useMemo(
    () => invoices.slice(0, 5),
    [invoices]
  );

  // Today's Expense List
  const todayExpensesList = useMemo(
    () => dailyExpenses.filter((e) => (e.date || e.createdAt || '').slice(0, 10) === todayDate),
    [dailyExpenses, todayDate]
  );

  // Stock Category Breakdown (Slabs vs Tiles vs Others)
  const stockBreakdown = useMemo(() => {
    let slabsSq = 0;
    let tilesSq = 0;
    let otherSq = 0;

    items.forEach((it) => {
      const sqft = Number(it.stockSqFt || 0);
      const cat = (it.category || '').toLowerCase();
      const nm = (it.name || '').toLowerCase();

      if (cat.includes('tile') || nm.includes('tile') || cat.includes('porcelain') || cat.includes('ceramic')) {
        tilesSq += sqft;
      } else if (cat.includes('slab') || nm.includes('slab') || cat.includes('granite') || cat.includes('marble')) {
        slabsSq += sqft;
      } else {
        otherSq += sqft;
      }
    });

    const totalYard = slabsSq + tilesSq + otherSq || 1;
    return {
      slabsSqFt: Math.round(slabsSq),
      tilesSqFt: Math.round(tilesSq),
      otherSqFt: Math.round(otherSq),
      slabsPct: Math.round((slabsSq / totalYard) * 100),
      tilesPct: Math.round((tilesSq / totalYard) * 100),
      otherPct: Math.round((otherSq / totalYard) * 100)
    };
  }, [items]);

  // Sales Trend & Collection Time Filter
  const [salesTimeFilter, setSalesTimeFilter] = useState('week'); // 'today' | 'week' | 'month'

  const salesTrendSummary = useMemo(() => {
    if (salesTimeFilter === 'today') {
      let todaySales = 0;
      let todayWasooli = 0;
      invoices.forEach((inv) => {
        if ((inv.createdAt || inv.date || '').slice(0, 10) === todayDate) {
          todaySales += Number(inv.grandTotal || 0);
          if (!inv.customerId) {
            todayWasooli += Number(inv.paidAmount || 0);
          }
        }
      });
      customerPayments.forEach((pay) => {
        if ((pay.date || pay.createdAt || '').slice(0, 10) === todayDate) {
          todayWasooli += Number(pay.amount || 0);
        }
      });
      return { periodSales: todaySales, periodWasooli: todayWasooli };
    }

    if (salesTimeFilter === 'month') {
      const currentMonth = todayDate.slice(0, 7);
      let monthSales = 0;
      let monthWasooli = 0;
      invoices.forEach((inv) => {
        if ((inv.createdAt || inv.date || '').slice(0, 7) === currentMonth) {
          monthSales += Number(inv.grandTotal || 0);
          if (!inv.customerId) {
            monthWasooli += Number(inv.paidAmount || 0);
          }
        }
      });
      customerPayments.forEach((pay) => {
        if ((pay.date || pay.createdAt || '').slice(0, 7) === currentMonth) {
          monthWasooli += Number(pay.amount || 0);
        }
      });
      return { periodSales: monthSales, periodWasooli: monthWasooli };
    }

    // Default: Total / Week
    return { periodSales: totalSales, periodWasooli: totalReceived };
  }, [salesTimeFilter, invoices, customerPayments, todayDate, totalSales, totalReceived]);

  // Real 7-Day Trend Points
  const weeklyTrendData = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const trend = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dStr = d.toISOString().slice(0, 10);
      let sAmt = 0;
      let wAmt = 0;

      invoices.forEach((inv) => {
        if ((inv.createdAt || inv.date || '').slice(0, 10) === dStr) {
          sAmt += Number(inv.grandTotal || 0);
          if (!inv.customerId) {
            wAmt += Number(inv.paidAmount || 0);
          }
        }
      });

      customerPayments.forEach((pay) => {
        if ((pay.date || pay.createdAt || '').slice(0, 10) === dStr) {
          wAmt += Number(pay.amount || 0);
        }
      });

      trend.push({
        day: dayNames[d.getDay()],
        dateStr: dStr,
        sales: sAmt,
        wasooli: wAmt
      });
    }

    return trend;
  }, [invoices, customerPayments]);

  // Real Activity Stream
  const activityFeed = useMemo(() => {
    const activities = [];

    invoices.forEach((inv) => {
      activities.push({
        id: `inv-${inv.id || inv.invoiceNo}`,
        type: 'sale',
        title: `Bill #${inv.invoiceNo}`,
        subtitle: `${inv.customerName || 'Walk-in'} • ${inv.items?.length || 1} items`,
        amount: `Rs. ${Number(inv.grandTotal || 0).toLocaleString()}`,
        date: new Date(inv.createdAt || inv.date || Date.now()),
        invoiceObj: inv
      });
    });

    customerPayments.forEach((pay) => {
      activities.push({
        id: `pay-${pay.id}`,
        type: 'payment',
        title: `Wasooli received`,
        subtitle: `${pay.customerName || 'Customer'} • ${pay.paymentMethod || 'Cash'}`,
        amount: `+Rs. ${Number(pay.amount || 0).toLocaleString()}`,
        date: new Date(pay.date || pay.createdAt || Date.now())
      });
    });

    dailyExpenses.forEach((exp) => {
      activities.push({
        id: `exp-${exp.id}`,
        type: 'expense',
        title: `Expense: ${exp.category}`,
        subtitle: exp.paidTo ? `Paid to ${exp.paidTo}` : 'Karkhana expense',
        amount: `-Rs. ${Number(exp.amount || 0).toLocaleString()}`,
        date: new Date(exp.createdAt || exp.date || Date.now())
      });
    });

    activities.sort((a, b) => b.date - a.date);
    return activities.slice(0, 6);
  }, [invoices, customerPayments, dailyExpenses]);

  // ---------------------------------------------------------------------------
  // 3. MODALS & POP-UP INTERACTION STATES
  // ---------------------------------------------------------------------------
  const [isRoznamchaOpen, setIsRoznamchaOpen] = useState(false);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [isQuickWasooliOpen, setIsQuickWasooliOpen] = useState(false);
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);

  // Selected Entities
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedRestockItem, setSelectedRestockItem] = useState(null);
  const [isThermalOpen, setIsThermalOpen] = useState(false);

  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    category: 'Food / Mess (کھانا چائے)',
    amount: '',
    paidTo: '',
    remarks: ''
  });
  const [expenseSuccessMsg, setExpenseSuccessMsg] = useState('');

  // Wasooli Form State
  const [wasooliForm, setWasooliForm] = useState({
    customerId: '',
    amount: '',
    paymentMethod: 'Cash',
    notes: ''
  });
  const [wasooliSuccessMsg, setWasooliSuccessMsg] = useState('');

  // Restock Form State
  const [restockAmount, setRestockAmount] = useState('');
  const [restockSuccessMsg, setRestockSuccessMsg] = useState('');

  // ---------------------------------------------------------------------------
  // 4. DATABASE ACTION HANDLERS
  // ---------------------------------------------------------------------------
  const handleSaveQuickExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) return;

    try {
      await db.daily_expenses.add({
        date: todayDate,
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        paidTo: expenseForm.paidTo || (language === 'ur' ? 'عام خرچ' : 'General Expense'),
        remarks: expenseForm.remarks || '',
        createdAt: new Date().toISOString()
      });

      setExpenseSuccessMsg(language === 'ur' ? 'خرچ کامیابی سے درج ہوگیا' : 'Expense recorded successfully');
      setExpenseForm({ category: 'Food / Mess (کھانا چائے)', amount: '', paidTo: '', remarks: '' });

      setTimeout(() => {
        setExpenseSuccessMsg('');
        setIsQuickExpenseOpen(false);
      }, 700);
    } catch (err) {
      console.error('Error saving quick expense:', err);
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

        const paymentNo = `PAY-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
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

        const currentBalance = Number(customer.balanceDue || 0);
        const currentPaid = Number(customer.totalPaid || 0);
        const newBalance = Math.max(0, currentBalance - payAmount);
        const newPaid = currentPaid + payAmount;

        await db.customers.update(customer.id, {
          balanceDue: newBalance,
          totalPaid: newPaid,
          updatedAt: new Date().toISOString()
        });
      });

      setWasooliSuccessMsg(language === 'ur' ? 'وصولی درج ہوگئی' : 'Payment received');
      setWasooliForm({ customerId: '', amount: '', paymentMethod: 'Cash', notes: '' });

      setTimeout(() => {
        setWasooliSuccessMsg('');
        setIsQuickWasooliOpen(false);
      }, 700);
    } catch (err) {
      console.error('Error recording wasooli:', err);
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
        'Quick restock from low stock alert'
      );

      setRestockSuccessMsg(language === 'ur' ? 'اسٹاک بڑھ گیا' : 'Stock updated');
      setRestockAmount('');

      setTimeout(() => {
        setRestockSuccessMsg('');
        setIsRestockModalOpen(false);
      }, 700);
    } catch (err) {
      console.error('Error updating stock:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '1440px', margin: '0 auto' }}>

      {/* ------------------------------------------------------------------------- */}
      {/* 1. PAGE HEADER (Action Buttons & Live Factory Context)                     */}
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
            {language === 'ur' ? 'کارخانہ ڈیش بورڈ' : 'Karkhana Dashboard'}
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

        {/* Action Button System */}
        <ActionGroup
          language={language}
          primaryAction={{
            icon: Plus,
            label: language === 'ur' ? 'نیا بل' : 'New Bill',
            onClick: () => setActiveView('billing'),
            title: language === 'ur' ? 'نیا بل کاؤنٹر کھولیں' : 'Create new bill in Bill Book'
          }}
          secondaryActions={[
            {
              icon: Wallet,
              iconColor: 'var(--text-secondary, #475569)',
              label: language === 'ur' ? 'نیا خرچ' : '+ Record Expense',
              onClick: () => setIsQuickExpenseOpen(true),
              title: language === 'ur' ? 'فیکٹری خرچ درج کریں' : 'Record daily expense'
            },
            {
              icon: CreditCard,
              iconColor: 'var(--text-secondary, #475569)',
              label: language === 'ur' ? 'ادھار وصولی' : '+ Receive Payment',
              onClick: () => {
                if (customersWithDues.length > 0) {
                  setWasooliForm({
                    customerId: customersWithDues[0].id.toString(),
                    amount: customersWithDues[0].balanceDue.toString(),
                    paymentMethod: 'Cash',
                    notes: `Payment for ${customersWithDues[0].name}`
                  });
                }
                setIsQuickWasooliOpen(true);
              },
              title: language === 'ur' ? 'گاہک سے رقم وصول کریں' : 'Receive customer payment'
            },
            {
              icon: BookOpen,
              iconColor: '#059669',
              label: language === 'ur' ? 'روزنامچہ' : 'Roznamcha',
              onClick: () => setIsRoznamchaOpen(true),
              title: language === 'ur' ? 'روزنامچہ کیش دراز حساب کھولیں' : "Today's Cash Flow & Live Drawer"
            }
          ]}
        />
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 2. REAL-TIME KPI STRIP (Derived from Real Live Database)                   */}
      {/* ------------------------------------------------------------------------- */}
      <div className="kpi-unified-strip">
        {/* KPI 1: TOTAL SALES */}
        <div className="kpi-strip-cell">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {language === 'ur' ? 'کل سیلز' : 'TOTAL SALES'}
            </span>
            <TrendingUp size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }} className="font-mono">
            Rs. {totalSales.toLocaleString()}
          </div>
        </div>

        {/* KPI 2: CASH & BANK (Clickable to open Roznamcha Modal) */}
        <div
          className="kpi-strip-cell"
          onClick={() => setIsRoznamchaOpen(true)}
          title={language === 'ur' ? 'روزنامچہ کیش دراز حساب کھولیں' : 'Click to view Live Roznamcha Cash Breakdown'}
          style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(5, 150, 105, 0.04)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {language === 'ur' ? 'وصول شدہ رقم' : 'CASH & BANK'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CreditCard size={14} style={{ color: '#059669' }} />
              <ArrowUpRight size={12} style={{ color: '#059669', opacity: 0.7 }} />
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#059669', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }} className="font-mono">
            Rs. {totalReceived.toLocaleString()}
          </div>
        </div>

        {/* KPI 3: CUSTOMER DUES */}
        <div className="kpi-strip-cell">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {language === 'ur' ? 'گاہک بقایا ادھار' : 'CUSTOMER DUES'}
            </span>
            <AlertCircle size={14} style={{ color: '#dc2626' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#dc2626', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }} className="font-mono">
            Rs. {totalDue.toLocaleString()}
          </div>
        </div>

        {/* KPI 4: YARD STOCK */}
        <div className="kpi-strip-cell">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {language === 'ur' ? 'یارڈ اسٹاک' : 'YARD STOCK'}
            </span>
            <Boxes size={14} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-blue)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }} className="font-mono">
            {totalStockSqFt.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Sq.Ft</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 3. REAL OPERATIONAL ALERT BANNER                                          */}
      {/* ------------------------------------------------------------------------- */}
      {(() => {
        const hasUdhaarAlert = totalDue > 0;
        const hasStockAlert = lowStockItems.length > 0;
        const totalAlerts = (hasUdhaarAlert ? 1 : 0) + (hasStockAlert ? 1 : 0);

        if (totalAlerts === 0) return null;

        if (totalAlerts === 1) {
          return (
            <div className="dash-alert-strip">
              {hasUdhaarAlert ? (
                <>
                  <div className="dash-alert-message">
                    <AlertTriangle size={18} style={{ color: '#DC2626', flexShrink: 0 }} />
                    <span>
                      {language === 'ur'
                        ? `${customersWithDues.length} گاہکوں کا ادھار بقایا ہے (Rs. ${totalDue.toLocaleString()})`
                        : `${customersWithDues.length} Customers have outstanding Udhaar (Rs. ${totalDue.toLocaleString()})`}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="dash-alert-action-btn"
                    onClick={() => {
                      if (customersWithDues.length > 0) {
                        setWasooliForm({
                          customerId: customersWithDues[0].id.toString(),
                          amount: customersWithDues[0].balanceDue.toString(),
                          paymentMethod: 'Cash',
                          notes: `Payment for ${customersWithDues[0].name}`
                        });
                      }
                      setIsQuickWasooliOpen(true);
                    }}
                  >
                    <span>{language === 'ur' ? 'وصولی درج کریں' : 'Receive Payment'}</span>
                    <ArrowRight size={13} />
                  </button>
                </>
              ) : (
                <>
                  <div className="dash-alert-message" style={{ color: '#B45309' }}>
                    <Boxes size={18} style={{ color: '#D97706', flexShrink: 0 }} />
                    <span>
                      {language === 'ur'
                        ? `${lowStockItems.length} آئٹمز کا اسٹاک ری آرڈر لیول سے نیچے ہے`
                        : `${lowStockItems.length} Items below factory reorder level`}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="dash-alert-action-btn"
                    style={{ borderColor: 'rgba(217, 119, 6, 0.3)', color: '#B45309' }}
                    onClick={() => {
                      setSelectedRestockItem(lowStockItems[0]);
                      setIsRestockModalOpen(true);
                    }}
                  >
                    <span>{language === 'ur' ? 'ری اسٹاک کریں' : 'Restock'}</span>
                    <ArrowRight size={13} />
                  </button>
                </>
              )}
            </div>
          );
        }

        // Multiple Alerts
        return (
          <div className="dash-alert-strip dash-alert-multi">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={15} style={{ color: '#DC2626' }} />
                <span>{language === 'ur' ? 'توجہ طلب امور' : 'Needs Attention'}</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#991B1B', fontWeight: 600 }}>
                {totalAlerts} {language === 'ur' ? 'ضروری الرٹس' : 'Active alerts'}
              </span>
            </div>

            {hasUdhaarAlert && (
              <div className="dash-alert-row" style={{ paddingTop: '6px', borderTop: '1px solid rgba(239, 68, 68, 0.15)' }}>
                <div className="dash-alert-message">
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>
                    {language === 'ur'
                      ? `${customersWithDues.length} گاہکوں کا ادھار بقایا ہے (Rs. ${totalDue.toLocaleString()})`
                      : `${customersWithDues.length} Customers have outstanding Udhaar (Rs. ${totalDue.toLocaleString()})`}
                  </span>
                </div>
                <button
                  type="button"
                  className="dash-alert-action-btn"
                  onClick={() => {
                    if (customersWithDues.length > 0) {
                      setWasooliForm({
                        customerId: customersWithDues[0].id.toString(),
                        amount: customersWithDues[0].balanceDue.toString(),
                        paymentMethod: 'Cash',
                        notes: `Payment for ${customersWithDues[0].name}`
                      });
                    }
                    setIsQuickWasooliOpen(true);
                  }}
                >
                  <span>{language === 'ur' ? 'وصولی' : 'Payment'}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            )}

            {hasStockAlert && (
              <div className="dash-alert-row" style={{ paddingTop: '6px', borderTop: '1px solid rgba(239, 68, 68, 0.15)' }}>
                <div className="dash-alert-message" style={{ color: '#B45309' }}>
                  <Boxes size={15} style={{ color: '#D97706', flexShrink: 0 }} />
                  <span>
                    {language === 'ur'
                      ? `${lowStockItems.length} آئٹمز ری آرڈر لیول سے نیچے ہیں`
                      : `${lowStockItems.length} Items below factory reorder level`}
                  </span>
                </div>
                <button
                  type="button"
                  className="dash-alert-action-btn"
                  style={{ borderColor: 'rgba(217, 119, 6, 0.3)', color: '#B45309' }}
                  onClick={() => {
                    setSelectedRestockItem(lowStockItems[0]);
                    setIsRestockModalOpen(true);
                  }}
                >
                  <span>{language === 'ur' ? 'اسٹاک بڑھائیں' : 'Restock'}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* ------------------------------------------------------------------------- */}
      {/* 4. RECENT BILLS TABLE (Real Database Records)                              */}
      {/* ------------------------------------------------------------------------- */}
      <div className="dash-card dash-card-flush" style={{ width: '100%' }}>
        <div className="dash-card-header-flush">
          <h3 className="dash-card-title">
            <FileText size={16} style={{ color: 'var(--accent-blue)' }} />
            <span>{language === 'ur' ? 'حالیہ بلز' : 'Recent Bills'}</span>
          </h3>
          <button
            type="button"
            className="dash-card-action"
            onClick={() => setActiveView('invoices')}
          >
            <span>{language === 'ur' ? 'تمام بلز دیکھیں' : 'View all'}</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="dash-table-container">
          <table className="dash-table">
            <thead>
              <tr>
                <th style={{ width: '14%' }}>{language === 'ur' ? 'بل نمبر' : 'Bill #'}</th>
                <th style={{ width: '26%' }}>{language === 'ur' ? 'گاہک' : 'Customer'}</th>
                <th style={{ width: '14%', textAlign: 'right' }}>{language === 'ur' ? 'کل رقم' : 'Total'}</th>
                <th style={{ width: '14%', textAlign: 'right' }}>{language === 'ur' ? 'وصول' : 'Paid'}</th>
                <th style={{ width: '14%', textAlign: 'right' }}>{language === 'ur' ? 'ادھار باقی' : 'Due'}</th>
                <th style={{ width: '12%', textAlign: 'center' }}>{language === 'ur' ? 'اسٹیٹس' : 'Status'}</th>
                <th style={{ width: '6%', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                    <div>{language === 'ur' ? 'ابھی تک کوئی بل ریکارڈ نہیں ہوا۔' : 'No invoices generated yet.'}</div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setActiveView('billing')}
                      style={{ marginTop: '10px' }}
                    >
                      <Plus size={14} />
                      <span>{language === 'ur' ? 'نیا بل بنائیں (POS)' : 'Create First Bill'}</span>
                    </button>
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
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="font-mono" style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
                      {inv.invoiceNo}
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                        {inv.customerName}
                      </div>
                      {inv.customerPhone && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {inv.customerPhone}
                        </div>
                      )}
                    </td>

                    <td className="num-cell" style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Rs. {Number(inv.grandTotal || 0).toLocaleString()}
                    </td>

                    <td className="num-cell" style={{ fontSize: '0.86rem', fontWeight: 700, color: '#059669' }}>
                      Rs. {Number(inv.paidAmount || 0).toLocaleString()}
                    </td>

                    <td className="num-cell" style={{ fontSize: '0.86rem', fontWeight: 700, color: Number(inv.balanceDue) > 0 ? '#dc2626' : 'var(--text-muted)' }}>
                      Rs. {Number(inv.balanceDue || 0).toLocaleString()}
                    </td>

                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <Badge status={inv.paymentStatus} />
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedInvoice(inv);
                          setIsThermalOpen(true);
                        }}
                        style={{ padding: '4px 6px', color: 'var(--text-muted)' }}
                        title="Print 80mm receipt"
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

      {/* ------------------------------------------------------------------------- */}
      {/* 5. BUSINESS INTELLIGENCE & OPERATIONAL CONTEXT (2x2 Uniform Grid)          */}
      {/* ------------------------------------------------------------------------- */}
      <div className="dash-grid-2x2">

        {/* 1. SALES & COLLECTION TREND */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="dash-card-header">
              <div>
                <h3 className="dash-card-title">
                  <BarChart2 size={16} style={{ color: 'var(--accent-blue)' }} />
                  <span>{language === 'ur' ? 'سیلز و وصولی رجحان' : 'Sales & Collection Trend'}</span>
                </h3>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {salesTimeFilter === 'today'
                    ? (language === 'ur' ? 'آج کی کارکردگی' : "Today's performance")
                    : salesTimeFilter === 'month'
                    ? (language === 'ur' ? 'اس ماہ کا مجموعہ' : 'This Month total')
                    : (language === 'ur' ? 'حالیہ 7 دن کا جائزہ' : 'Last 7 days daily trend')}
                </div>
              </div>

              {/* Filter Pills */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-primary)',
                padding: '2px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '0.72rem'
              }}>
                {[
                  { key: 'today', labelEn: 'Today', labelUr: 'آج' },
                  { key: 'week', labelEn: 'This Week', labelUr: 'اس ہفتے' },
                  { key: 'month', labelEn: 'This Month', labelUr: 'اس ماہ' }
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setSalesTimeFilter(f.key)}
                    style={{
                      background: salesTimeFilter === f.key ? 'var(--bg-card)' : 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontWeight: salesTimeFilter === f.key ? 700 : 500,
                      color: salesTimeFilter === f.key ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      boxShadow: salesTimeFilter === f.key ? '0 1px 2px rgba(15,23,42,0.06)' : 'none'
                    }}
                  >
                    {language === 'ur' ? f.labelUr : f.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Metric KPIs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  {language === 'ur' ? 'سیلز' : 'Sales'}
                </div>
                <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-blue)' }}>
                  Rs. {salesTrendSummary.periodSales.toLocaleString()}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border-color)', height: '30px' }}></div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  {language === 'ur' ? 'وصول رقم' : 'Received'}
                </div>
                <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#059669' }}>
                  Rs. {salesTrendSummary.periodWasooli.toLocaleString()}
                </div>
              </div>
            </div>

            {/* SVG Trend Visualization */}
            <div style={{ width: '100%', overflowX: 'auto', padding: '4px 0' }}>
              {(() => {
                const maxVal = Math.max(...weeklyTrendData.map((d) => Math.max(d.sales, d.wasooli)), 1000);
                const salesPoints = weeklyTrendData.map((d, i) => `${35 + i * 65},${120 - (d.sales / maxVal) * 95}`).join(' ');
                const wasooliPoints = weeklyTrendData.map((d, i) => `${35 + i * 65},${120 - (d.wasooli / maxVal) * 95}`).join(' ');

                return (
                  <svg viewBox="0 0 460 145" style={{ width: '100%', height: '145px', overflow: 'visible' }}>
                    <line x1="20" y1="25" x2="445" y2="25" stroke="var(--border-subtle)" strokeDasharray="3 3" opacity="0.8" />
                    <line x1="20" y1="72" x2="445" y2="72" stroke="var(--border-subtle)" strokeDasharray="3 3" opacity="0.8" />
                    <line x1="20" y1="120" x2="445" y2="120" stroke="var(--border-color)" />

                    <polyline points={salesPoints} fill="none" stroke="var(--accent-blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points={wasooliPoints} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                    {weeklyTrendData.map((d, i) => {
                      const cx = 35 + i * 65;
                      const cySales = 120 - (d.sales / maxVal) * 95;
                      const cyWasooli = 120 - (d.wasooli / maxVal) * 95;
                      return (
                        <g key={i}>
                          <circle cx={cx} cy={cySales} r="3.5" fill="var(--accent-blue)" />
                          <circle cx={cx} cy={cyWasooli} r="3.5" fill="#059669" />
                          <text x={cx} y="138" textAnchor="middle" fontSize="11" fill="var(--text-secondary)" fontWeight="600">
                            {d.day}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>
          </div>

          <div className="dash-card-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.74rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-blue)' }}></span>
                <span style={{ color: 'var(--text-secondary)' }}>{language === 'ur' ? 'سیلز' : 'Sales'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }}></span>
                <span style={{ color: 'var(--text-secondary)' }}>{language === 'ur' ? 'وصولی' : 'Received'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. CUSTOMER DUES PANEL */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="dash-card-header">
              <h3 className="dash-card-title">
                <CreditCard size={16} style={{ color: '#dc2626' }} />
                <span>{language === 'ur' ? 'گاہک ادھار' : 'Customer Dues'}</span>
              </h3>
              <button
                type="button"
                className="dash-card-action"
                onClick={() => setActiveView('customers')}
              >
                <span>{language === 'ur' ? 'تمام دیکھیں' : 'View all'}</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {customersWithDues.length === 0 ? (
              <div style={{
                padding: '28px 12px',
                textAlign: 'center',
                color: '#059669',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
                <CheckCircle2 size={16} />
                <span>{language === 'ur' ? 'تمام گاہکوں کے ادھار کھاتے کلیئر ہیں' : 'All customer accounts are settled'}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {customersWithDues.slice(0, 4).map((cust) => (
                  <div
                    key={cust.id}
                    className="dash-row-item interactive"
                    onClick={() => {
                      setWasooliForm({
                        customerId: cust.id.toString(),
                        amount: cust.balanceDue.toString(),
                        paymentMethod: 'Cash',
                        notes: `Payment for ${cust.name}`
                      });
                      setIsQuickWasooliOpen(true);
                    }}
                    title="Click to record payment"
                  >
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {cust.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {cust.phone || 'No phone'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="font-mono" style={{ fontSize: '0.88rem', fontWeight: 800, color: '#dc2626' }}>
                        Rs. {Number(cust.balanceDue).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--accent-blue)', fontWeight: 600 }}>
                        + {language === 'ur' ? 'وصولی' : 'Payment'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dash-card-footer">
            <span style={{ color: 'var(--text-secondary)' }}>
              {customersWithDues.length} {language === 'ur' ? 'گاہکوں کا ادھار' : 'customers overdue'}
            </span>
            <div>
              <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>{language === 'ur' ? 'کل بقایا:' : 'Total Due:'}</span>
              <strong className="font-mono" style={{ color: '#dc2626', fontSize: '0.92rem' }}>
                Rs. {totalDue.toLocaleString()}
              </strong>
            </div>
          </div>
        </div>

        {/* 3. YARD STOCK POSITION & BREAKDOWN */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="dash-card-header">
              <h3 className="dash-card-title">
                <Boxes size={16} style={{ color: 'var(--accent-blue)' }} />
                <span>{language === 'ur' ? 'یارڈ اسٹاک پوزیشن' : 'Yard Stock Position'}</span>
              </h3>
              <button
                type="button"
                className="dash-card-action"
                onClick={() => setActiveView('stock')}
              >
                <span>{language === 'ur' ? 'اسٹاک لسٹ' : 'View stock'}</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <span className="font-mono" style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                {totalStockSqFt.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Sq.Ft Total</span>
              </span>
            </div>

            {/* Category Proportion Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Slabs */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {language === 'ur' ? 'ماربل سلیبز' : 'Marble Slabs'}
                  </span>
                  <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {stockBreakdown.slabsSqFt.toLocaleString()} Sq.Ft ({stockBreakdown.slabsPct}%)
                  </span>
                </div>
                <div style={{ height: '7px', background: 'var(--border-subtle)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ width: `${stockBreakdown.slabsPct}%`, height: '100%', background: 'var(--accent-blue)', borderRadius: '99px' }}></div>
                </div>
              </div>

              {/* Tiles */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {language === 'ur' ? 'ماربل و پورسلین ٹائلز' : 'Marble & Porcelain Tiles'}
                  </span>
                  <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {stockBreakdown.tilesSqFt.toLocaleString()} Sq.Ft ({stockBreakdown.tilesPct}%)
                  </span>
                </div>
                <div style={{ height: '7px', background: 'var(--border-subtle)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ width: `${stockBreakdown.tilesPct}%`, height: '100%', background: '#059669', borderRadius: '99px' }}></div>
                </div>
              </div>

              {/* Other & Borders */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {language === 'ur' ? 'سیڑھیاں، گرینائٹ و پٹی' : 'Steps, Granite & Borders'}
                  </span>
                  <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {stockBreakdown.otherSqFt.toLocaleString()} Sq.Ft ({stockBreakdown.otherPct}%)
                  </span>
                </div>
                <div style={{ height: '7px', background: 'var(--border-subtle)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ width: `${stockBreakdown.otherPct}%`, height: '100%', background: '#d97706', borderRadius: '99px' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="dash-card-footer">
            {lowStockItems.length > 0 ? (
              <div
                onClick={() => {
                  setSelectedRestockItem(lowStockItems[0]);
                  setIsRestockModalOpen(true);
                }}
                style={{ color: '#b45309', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <AlertTriangle size={14} />
                <span>
                  {language === 'ur'
                    ? `${lowStockItems.length} آئٹمز ری آرڈر لیول سے نیچے ہیں (اسٹاک بڑھائیں)`
                    : `${lowStockItems.length} items below factory reorder level`}
                </span>
              </div>
            ) : (
              <div style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} />
                <span>{language === 'ur' ? 'یارڈ کا اسٹاک لیول تسلی بخش ہے' : 'Yard inventory levels healthy'}</span>
              </div>
            )}
          </div>
        </div>

        {/* 4. RECENT FACTORY ACTIVITY FEED */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="dash-card-header">
              <h3 className="dash-card-title">
                <Activity size={16} style={{ color: 'var(--accent-blue)' }} />
                <span>{language === 'ur' ? 'حالیہ فیکٹری سرگرمیاں' : 'Recent Activity'}</span>
              </h3>
            </div>

            {activityFeed.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {language === 'ur' ? 'کوئی حالیہ سرگرمی ریکارڈ نہیں ہے' : 'No recent factory activity recorded'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {activityFeed.map((act) => (
                  <div
                    key={act.id}
                    className={`dash-row-item ${act.invoiceObj ? 'interactive' : ''}`}
                    onClick={() => {
                      if (act.invoiceObj) {
                        setSelectedInvoice(act.invoiceObj);
                        setIsInvoiceDetailOpen(true);
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: act.type === 'sale' ? 'rgba(37, 99, 235, 0.08)' : act.type === 'payment' ? 'rgba(5, 150, 105, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: act.type === 'sale' ? 'var(--accent-blue)' : act.type === 'payment' ? '#059669' : '#dc2626',
                        flexShrink: 0
                      }}>
                        {act.type === 'sale' ? <FileText size={14} /> : act.type === 'payment' ? <CreditCard size={14} /> : <Wallet size={14} />}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {act.title}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {act.subtitle}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="font-mono" style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: act.type === 'payment' ? '#059669' : act.type === 'expense' ? '#dc2626' : 'var(--text-primary)'
                      }}>
                        {act.amount}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                        {act.date.toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-US', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dash-card-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)' }}>
              <Clock size={13} />
              <span>{language === 'ur' ? 'لائیو آڈٹ ٹریل' : 'Live factory audit stream'}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 6. POP-UPS / MODALS (Progressive Disclosure)                               */}
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
                  {customersWithDues.length === 0 ? (
                    <div style={{ padding: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      No customers with pending dues found.
                    </div>
                  ) : (
                    <select
                      className="form-control"
                      value={wasooliForm.customerId}
                      onChange={(e) => {
                        const cid = e.target.value;
                        const cust = customersWithDues.find((c) => c.id.toString() === cid);
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
                  )}
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
                <button type="submit" className="btn btn-primary btn-sm" disabled={customersWithDues.length === 0}>
                  Confirm Payment
                </button>
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

              <div>
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Billed Stone Items:</span>
                <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  {(selectedInvoice.items || []).map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: 'var(--bg-primary)', borderRadius: '4px' }}>
                      <span>{it.name} ({it.totalSqFt || 0} Sq.Ft)</span>
                      <span className="font-mono">Rs. {Number(it.amount || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

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
