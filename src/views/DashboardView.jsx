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
  BarChart2,
  LayoutDashboard
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

  // Sales Trend & Collection Time Filter ('today' | 'week' | 'month')
  const [salesTimeFilter, setSalesTimeFilter] = useState('week');
  const [hoveredChartPoint, setHoveredChartPoint] = useState(null);

  // Dynamic Chart & Summary Data for Selected Time Horizon
  const { chartTrendData, salesTrendSummary } = useMemo(() => {
    // 1. TODAY: Hourly / Time of Day Breakdown
    if (salesTimeFilter === 'today') {
      const timeSlots = [
        { labelEn: '8 AM', labelUr: '8 بجے', minHour: 0, maxHour: 9, sales: 0, wasooli: 0 },
        { labelEn: '10 AM', labelUr: '10 بجے', minHour: 10, maxHour: 11, sales: 0, wasooli: 0 },
        { labelEn: '12 PM', labelUr: '12 بجے', minHour: 12, maxHour: 13, sales: 0, wasooli: 0 },
        { labelEn: '2 PM', labelUr: '2 بجے', minHour: 14, maxHour: 15, sales: 0, wasooli: 0 },
        { labelEn: '4 PM', labelUr: '4 بجے', minHour: 16, maxHour: 17, sales: 0, wasooli: 0 },
        { labelEn: '6 PM', labelUr: '6 بجے', minHour: 18, maxHour: 19, sales: 0, wasooli: 0 },
        { labelEn: '8 PM', labelUr: '8 بجے', minHour: 20, maxHour: 21, sales: 0, wasooli: 0 },
        { labelEn: '10 PM', labelUr: '10 بجے', minHour: 22, maxHour: 23, sales: 0, wasooli: 0 }
      ];

      let todaySales = 0;
      let todayWasooli = 0;

      invoices.forEach((inv) => {
        const dateStr = (inv.createdAt || inv.date || '').slice(0, 10);
        if (dateStr === todayDate) {
          const grandTotal = Number(inv.grandTotal || 0);
          const paidAmt = !inv.customerId ? Number(inv.paidAmount || 0) : 0;
          todaySales += grandTotal;
          todayWasooli += paidAmt;

          const invDate = new Date(inv.createdAt || inv.date || Date.now());
          const h = isNaN(invDate.getHours()) ? 12 : invDate.getHours();
          const slot = timeSlots.find((s) => h >= s.minHour && h <= s.maxHour) || timeSlots[2];
          slot.sales += grandTotal;
          slot.wasooli += paidAmt;
        }
      });

      customerPayments.forEach((pay) => {
        const dateStr = (pay.date || pay.createdAt || '').slice(0, 10);
        if (dateStr === todayDate) {
          const amount = Number(pay.amount || 0);
          todayWasooli += amount;

          const payDate = new Date(pay.date || pay.createdAt || Date.now());
          const h = isNaN(payDate.getHours()) ? 12 : payDate.getHours();
          const slot = timeSlots.find((s) => h >= s.minHour && h <= s.maxHour) || timeSlots[2];
          slot.wasooli += amount;
        }
      });

      const trend = timeSlots.map((s) => ({
        label: language === 'ur' ? s.labelUr : s.labelEn,
        labelEn: s.labelEn,
        labelUr: s.labelUr,
        sales: s.sales,
        wasooli: s.wasooli
      }));

      return {
        chartTrendData: trend,
        salesTrendSummary: { periodSales: todaySales, periodWasooli: todayWasooli }
      };
    }

    // 2. THIS MONTH: Multi-interval / Weekly Distribution of Current Month
    if (salesTimeFilter === 'month') {
      const now = new Date();
      const currentMonthStr = todayDate.slice(0, 7); // 'YYYY-MM'
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const monthBuckets = [
        { labelEn: '1-7', labelUr: '1-7 تاریخ', startDay: 1, endDay: 7, sales: 0, wasooli: 0 },
        { labelEn: '8-14', labelUr: '8-14 تاریخ', startDay: 8, endDay: 14, sales: 0, wasooli: 0 },
        { labelEn: '15-21', labelUr: '15-21 تاریخ', startDay: 15, endDay: 21, sales: 0, wasooli: 0 },
        { labelEn: '22-28', labelUr: '22-28 تاریخ', startDay: 22, endDay: 28, sales: 0, wasooli: 0 },
        { labelEn: `29-${daysInMonth}`, labelUr: `29-${daysInMonth} تاریخ`, startDay: 29, endDay: daysInMonth, sales: 0, wasooli: 0 }
      ];

      let monthSales = 0;
      let monthWasooli = 0;

      invoices.forEach((inv) => {
        const rawDate = inv.createdAt || inv.date || '';
        if (rawDate.slice(0, 7) === currentMonthStr) {
          const grandTotal = Number(inv.grandTotal || 0);
          const paidAmt = !inv.customerId ? Number(inv.paidAmount || 0) : 0;
          monthSales += grandTotal;
          monthWasooli += paidAmt;

          const invDate = new Date(rawDate || Date.now());
          const d = isNaN(invDate.getDate()) ? 1 : invDate.getDate();
          const bucket = monthBuckets.find((b) => d >= b.startDay && d <= b.endDay) || monthBuckets[monthBuckets.length - 1];
          bucket.sales += grandTotal;
          bucket.wasooli += paidAmt;
        }
      });

      customerPayments.forEach((pay) => {
        const rawDate = pay.date || pay.createdAt || '';
        if (rawDate.slice(0, 7) === currentMonthStr) {
          const amount = Number(pay.amount || 0);
          monthWasooli += amount;

          const payDate = new Date(rawDate || Date.now());
          const d = isNaN(payDate.getDate()) ? 1 : payDate.getDate();
          const bucket = monthBuckets.find((b) => d >= b.startDay && d <= b.endDay) || monthBuckets[monthBuckets.length - 1];
          bucket.wasooli += amount;
        }
      });

      const trend = monthBuckets.map((b) => ({
        label: language === 'ur' ? b.labelUr : b.labelEn,
        labelEn: b.labelEn,
        labelUr: b.labelUr,
        sales: b.sales,
        wasooli: b.wasooli
      }));

      return {
        chartTrendData: trend,
        salesTrendSummary: { periodSales: monthSales, periodWasooli: monthWasooli }
      };
    }

    // 3. THIS WEEK (DEFAULT): Last 7 Days Daily Breakdown
    const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNamesUr = ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'];
    const trend = [];
    let weekSales = 0;
    let weekWasooli = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dStr = d.toISOString().slice(0, 10);
      let sAmt = 0;
      let wAmt = 0;

      invoices.forEach((inv) => {
        if ((inv.createdAt || inv.date || '').slice(0, 10) === dStr) {
          const grandTotal = Number(inv.grandTotal || 0);
          const paidAmt = !inv.customerId ? Number(inv.paidAmount || 0) : 0;
          sAmt += grandTotal;
          wAmt += paidAmt;
        }
      });

      customerPayments.forEach((pay) => {
        if ((pay.date || pay.createdAt || '').slice(0, 10) === dStr) {
          wAmt += Number(pay.amount || 0);
        }
      });

      weekSales += sAmt;
      weekWasooli += wAmt;

      const dayIdx = d.getDay();
      trend.push({
        label: language === 'ur' ? dayNamesUr[dayIdx] : dayNamesEn[dayIdx],
        labelEn: dayNamesEn[dayIdx],
        labelUr: dayNamesUr[dayIdx],
        dateStr: dStr,
        sales: sAmt,
        wasooli: wAmt
      });
    }

    return {
      chartTrendData: trend,
      salesTrendSummary: { periodSales: weekSales, periodWasooli: weekWasooli }
    };
  }, [salesTimeFilter, invoices, customerPayments, todayDate, language]);

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
      await db.transaction('rw', [db.customers, db.customer_payments, db.invoices], async () => {
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

        // FIFO Waterfall: Automatically allocate payment to customer's oldest unpaid invoices
        const allInvoices = await db.invoices.toArray();
        const customerInvoices = allInvoices
          .filter((inv) => String(inv.customerId) === String(customer.id))
          .sort((a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0));

        let remainingToAllocate = payAmount;
        for (const inv of customerInvoices) {
          if (remainingToAllocate <= 0) break;
          const invDue = Number(inv.balanceDue || 0);
          if (invDue > 0) {
            const alloc = Math.min(invDue, remainingToAllocate);
            const newInvPaid = (Number(inv.paidAmount) || 0) + alloc;
            const newInvDue = Math.max(0, invDue - alloc);
            const newStatus = newInvDue <= 0 ? 'Paid' : (newInvPaid > 0 ? 'Half Paid' : 'Pending');

            await db.invoices.update(inv.id, {
              paidAmount: newInvPaid,
              balanceDue: newInvDue,
              paymentStatus: newStatus
            });

            remainingToAllocate -= alloc;
          }
        }
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
      {/* 1. SEAMLESS HERO HEADER SECTION (with invoice_background.jpeg)            */}
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
        {/* Left: Overview Breadcrumb + Title + Subtitle / Live Date */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#2563eb',
            marginBottom: '4px',
            display: 'inline-block'
          }}>
            {language === 'ur' ? 'کارخانہ مانیٹرنگ' : 'Overview'}
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
              <LayoutDashboard size={24} />
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
                {language === 'ur' ? 'کارخانہ ڈیش بورڈ' : 'Karkhana Dashboard'}
              </h1>
              <p style={{
                fontSize: '0.86rem',
                color: 'var(--text-secondary, #64748b)',
                margin: '2px 0 0 0',
                fontWeight: 500
              }}>
                {new Date().toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-US', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Background Marble Image extending seamlessly across the header */}
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
      {/* 2. REAL-TIME KPI STRIP (Derived from Real Live Database)                   */}
      {/* ------------------------------------------------------------------------- */}
      <div className="kpi-card-grid">
        {/* KPI 1: TOTAL SALES */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon blue">
            <TrendingUp size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Total Sales</span>
              <span className="kpi-metric-label-ur">(کل سیلز)</span>
            </div>
            <div className="kpi-metric-value font-mono">
              Rs. {totalSales.toLocaleString()}
            </div>
          </div>
        </div>

        {/* KPI 2: CASH & BANK (Clickable to open Roznamcha Modal) */}
        <div
          className="kpi-metric-card interactive"
          onClick={() => setIsRoznamchaOpen(true)}
          title={language === 'ur' ? 'روزنامچہ کیش دراز حساب کھولیں' : 'Click to view Live Roznamcha Cash Breakdown'}
        >
          <div className="kpi-metric-icon green">
            <CreditCard size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Cash & Bank</span>
              <span className="kpi-metric-label-ur">(وصول شدہ)</span>
            </div>
            <div className="kpi-metric-value font-mono">
              Rs. {totalReceived.toLocaleString()}
            </div>
          </div>
        </div>

        {/* KPI 3: CUSTOMER DUES */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon red">
            <AlertCircle size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Customer Dues</span>
              <span className="kpi-metric-label-ur">(بقایا ادھار)</span>
            </div>
            <div className="kpi-metric-value font-mono">
              Rs. {totalDue.toLocaleString()}
            </div>
          </div>
        </div>

        {/* KPI 4: YARD STOCK */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon purple">
            <Boxes size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Yard Stock</span>
              <span className="kpi-metric-label-ur">(یارڈ اسٹاک)</span>
            </div>
            <div className="kpi-metric-value font-mono">
              {totalStockSqFt.toLocaleString()} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)' }}>Sq.Ft</span>
            </div>
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
      {/* 4. SALES & COLLECTION TREND (Wide 2-Card Full Width Banner)               */}
      {/* ------------------------------------------------------------------------- */}
      <div className="dash-card" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="dash-card-header">
          <div>
            <h3 className="dash-card-title">
              <BarChart2 size={18} style={{ color: 'var(--accent-blue)' }} />
              <span>{language === 'ur' ? 'سیلز و وصولی رجحان' : 'Sales & Collection Trend'}</span>
            </h3>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {salesTimeFilter === 'today'
                ? (language === 'ur' ? 'آج کی کارکردگی اور کیش فلو' : "Today's sales vs wasooli performance")
                : salesTimeFilter === 'month'
                ? (language === 'ur' ? 'اس ماہ کا مجموعی جائزہ' : 'This Month total comparison')
                : (language === 'ur' ? 'حالیہ 7 دن کی سیلز اور کیش وصولی کا جائزہ' : 'Last 7 days daily sales vs collections')}
            </div>
          </div>

          {/* Filter Pills */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-primary)',
            padding: '3px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            fontSize: '0.74rem'
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
                  borderRadius: '7px',
                  padding: '5px 14px',
                  fontWeight: salesTimeFilter === f.key ? 700 : 500,
                  color: salesTimeFilter === f.key ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  boxShadow: salesTimeFilter === f.key ? '0 1px 3px rgba(15,23,42,0.08)' : 'none'
                }}
              >
                {language === 'ur' ? f.labelUr : f.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px', padding: '0 4px' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              {language === 'ur' ? 'کل سیلز' : 'Total Sales'}
            </div>
            <div className="font-mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '2px' }}>
              Rs. {salesTrendSummary.periodSales.toLocaleString()}
            </div>
          </div>

          <div style={{ borderLeft: '1px solid var(--border-color)', height: '36px' }}></div>

          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              {language === 'ur' ? 'وصول شدہ رقم' : 'Total Received'}
            </div>
            <div className="font-mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
              Rs. {salesTrendSummary.periodWasooli.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Wide SVG Trend Chart with Floating Interactive Tooltip Card */}
        <div
          style={{ width: '100%', padding: '10px 0 8px', position: 'relative', overflow: 'visible' }}
          onMouseLeave={() => setHoveredChartPoint(null)}
        >
          {(() => {
            const maxVal = Math.max(...chartTrendData.map((d) => Math.max(d.sales, d.wasooli)), 1000);
            const totalPoints = chartTrendData.length;
            const step = totalPoints > 1 ? 680 / (totalPoints - 1) : 100;
            const salesPoints = chartTrendData.map((d, i) => `${40 + i * step},${125 - (d.sales / maxVal) * 95}`).join(' ');
            const wasooliPoints = chartTrendData.map((d, i) => `${40 + i * step},${125 - (d.wasooli / maxVal) * 95}`).join(' ');

            return (
              <div style={{ position: 'relative', width: '100%', overflow: 'visible' }}>
                <svg viewBox="0 0 760 155" style={{ width: '100%', height: '160px', overflow: 'visible' }}>
                  {/* Grid Lines */}
                  <line x1="30" y1="30" x2="730" y2="30" stroke="var(--border-subtle, #e2e8f0)" strokeDasharray="3 3" opacity="0.8" />
                  <line x1="30" y1="78" x2="730" y2="78" stroke="var(--border-subtle, #e2e8f0)" strokeDasharray="3 3" opacity="0.8" />
                  <line x1="30" y1="125" x2="730" y2="125" stroke="var(--border-color, #cbd5e1)" />

                  {/* Polylines */}
                  <polyline points={salesPoints} fill="none" stroke="var(--accent-blue, #2563eb)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points={wasooliPoints} fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Vertical Guide Line when Hovered */}
                  {hoveredChartPoint && (
                    <line
                      x1={hoveredChartPoint.cx}
                      y1="15"
                      x2={hoveredChartPoint.cx}
                      y2="132"
                      stroke="var(--accent-blue, #2563eb)"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      opacity="0.5"
                    />
                  )}

                  {/* Interactive Points & Broad Hit Areas */}
                  {chartTrendData.map((d, i) => {
                    const cx = 40 + i * step;
                    const cySales = 125 - (d.sales / maxVal) * 95;
                    const cyWasooli = 125 - (d.wasooli / maxVal) * 95;
                    const isHovered = hoveredChartPoint?.index === i;

                    return (
                      <g key={i}>
                        {/* Invisible Column Hit-Box for Smooth Hover Activation */}
                        <rect
                          x={cx - step / 2}
                          y="5"
                          width={step}
                          height="145"
                          fill="transparent"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredChartPoint({ ...d, index: i, cx, cySales, cyWasooli })}
                          onTouchStart={() => setHoveredChartPoint({ ...d, index: i, cx, cySales, cyWasooli })}
                        />

                        {/* Sales Dot */}
                        <circle
                          cx={cx}
                          cy={cySales}
                          r={isHovered ? 6.5 : 4.5}
                          fill="var(--accent-blue, #2563eb)"
                          stroke="#ffffff"
                          strokeWidth={isHovered ? 2.5 : 1.5}
                          style={{ transition: 'all 0.15s ease', pointerEvents: 'none' }}
                        />

                        {/* Wasooli Dot */}
                        <circle
                          cx={cx}
                          cy={cyWasooli}
                          r={isHovered ? 6.5 : 4.5}
                          fill="#059669"
                          stroke="#ffffff"
                          strokeWidth={isHovered ? 2.5 : 1.5}
                          style={{ transition: 'all 0.15s ease', pointerEvents: 'none' }}
                        />

                        {/* X-Axis Label */}
                        <text
                          x={cx}
                          y="145"
                          textAnchor="middle"
                          fontSize="11.5"
                          fill={isHovered ? 'var(--text-primary, #0f172a)' : 'var(--text-secondary, #64748b)'}
                          fontWeight={isHovered ? 800 : 600}
                          style={{ pointerEvents: 'none' }}
                        >
                          {d.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Floating Interactive Tooltip Card */}
                {hoveredChartPoint && (() => {
                  const isRightSide = hoveredChartPoint.cx > 520;
                  const isBottomSide = Math.min(hoveredChartPoint.cySales, hoveredChartPoint.cyWasooli) > 75;

                  // Anchor cursor to top-left of card by default; flip gracefully on boundaries
                  let transform = 'translate(12px, 6px)';
                  if (isRightSide && isBottomSide) {
                    transform = 'translate(-105%, -85%)';
                  } else if (isRightSide) {
                    transform = 'translate(-105%, 6px)';
                  } else if (isBottomSide) {
                    transform = 'translate(12px, -85%)';
                  }

                  const topPos = Math.min(hoveredChartPoint.cySales, hoveredChartPoint.cyWasooli);

                  return (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${(hoveredChartPoint.cx / 760) * 100}%`,
                        top: `${topPos}px`,
                        transform,
                        background: 'var(--bg-card, #ffffff)',
                        border: '1px solid var(--border-color, #e2e8f0)',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        boxShadow: '0 10px 25px -3px rgba(15,23,42,0.22), 0 4px 6px -2px rgba(15,23,42,0.08)',
                        zIndex: 50,
                        pointerEvents: 'none',
                        minWidth: '165px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        animation: 'fadeIn 0.12s ease-out'
                      }}
                    >
                      {/* Header: Localized Label */}
                      <div style={{
                        fontWeight: 800,
                        color: 'var(--text-primary, #1e293b)',
                        borderBottom: '1px solid var(--border-color, #f1f5f9)',
                        paddingBottom: '4px',
                        marginBottom: '2px',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span>
                          {language === 'ur'
                            ? (hoveredChartPoint.labelUr || hoveredChartPoint.label)
                            : (hoveredChartPoint.labelEn || hoveredChartPoint.label)}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 500 }}>
                          {salesTimeFilter === 'today'
                            ? (language === 'ur' ? 'آج' : 'Today')
                            : salesTimeFilter === 'month'
                            ? (language === 'ur' ? 'ماہانہ' : 'Monthly')
                            : (language === 'ur' ? 'ہفتہ وار' : 'Weekly')}
                        </span>
                      </div>

                      {/* Blue Color Sales Metric */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <span style={{
                          color: 'var(--accent-blue, #2563eb)',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-blue, #2563eb)' }}></span>
                          {language === 'ur' ? 'سیلز:' : 'Sales:'}
                        </span>
                        <span className="font-mono" style={{ color: 'var(--accent-blue, #2563eb)', fontWeight: 800, fontSize: '0.84rem' }}>
                          Rs. {Number(hoveredChartPoint.sales || 0).toLocaleString()}
                        </span>
                      </div>

                      {/* Green Color Received Metric */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <span style={{
                          color: '#059669',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }}></span>
                          {language === 'ur' ? 'وصول شدہ:' : 'Received:'}
                        </span>
                        <span className="font-mono" style={{ color: '#059669', fontWeight: 800, fontSize: '0.84rem' }}>
                          Rs. {Number(hoveredChartPoint.wasooli || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </div>

        <div className="dash-card-footer" style={{ borderTop: '1px solid var(--border-color, #f1f5f9)', paddingTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-blue)' }}></span>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{language === 'ur' ? 'سیلز (Sales)' : 'Sales'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#059669' }}></span>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{language === 'ur' ? 'وصولی (Received)' : 'Received'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 5. CUSTOMER DUES | YARD STOCK POSITION (2 Column Side-by-Side Grid)        */}
      {/* ------------------------------------------------------------------------- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '16px'
      }}>
        {/* Left: CUSTOMER DUES PANEL */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="dash-card-header">
              <h3 className="dash-card-title">
                <CreditCard size={17} style={{ color: '#dc2626' }} />
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
                padding: '36px 12px',
                textAlign: 'center',
                color: '#059669',
                fontSize: '0.84rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 size={18} />
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
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {cust.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {cust.phone || 'No phone'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="font-mono" style={{ fontSize: '0.92rem', fontWeight: 800, color: '#dc2626' }}>
                        Rs. {Number(cust.balanceDue).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', fontWeight: 600, marginTop: '2px' }}>
                        + {language === 'ur' ? 'وصولی' : 'Receive Payment'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dash-card-footer">
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
              {customersWithDues.length} {language === 'ur' ? 'گاہکوں کا ادھار' : 'customers overdue'}
            </span>
            <div>
              <span style={{ color: 'var(--text-muted)', marginRight: '6px', fontSize: '0.78rem' }}>{language === 'ur' ? 'کل بقایا:' : 'Total Due:'}</span>
              <strong className="font-mono" style={{ color: '#dc2626', fontSize: '0.96rem' }}>
                Rs. {totalDue.toLocaleString()}
              </strong>
            </div>
          </div>
        </div>

        {/* Right: YARD STOCK POSITION & BREAKDOWN */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="dash-card-header">
              <h3 className="dash-card-title">
                <Boxes size={17} style={{ color: 'var(--accent-blue)' }} />
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
              <span className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                {totalStockSqFt.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Sq.Ft Total</span>
              </span>
            </div>

            {/* Category Proportion Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Slabs */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {language === 'ur' ? 'ماربل سلیبز' : 'Marble Slabs'}
                  </span>
                  <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {stockBreakdown.slabsSqFt.toLocaleString()} Sq.Ft ({stockBreakdown.slabsPct}%)
                  </span>
                </div>
                <div style={{ height: '8px', background: 'var(--border-subtle)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ width: `${stockBreakdown.slabsPct}%`, height: '100%', background: 'var(--accent-blue)', borderRadius: '99px' }}></div>
                </div>
              </div>

              {/* Tiles */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {language === 'ur' ? 'ماربل و پورسلین ٹائلز' : 'Marble & Porcelain Tiles'}
                  </span>
                  <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {stockBreakdown.tilesSqFt.toLocaleString()} Sq.Ft ({stockBreakdown.tilesPct}%)
                  </span>
                </div>
                <div style={{ height: '8px', background: 'var(--border-subtle)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ width: `${stockBreakdown.tilesPct}%`, height: '100%', background: '#059669', borderRadius: '99px' }}></div>
                </div>
              </div>

              {/* Other & Borders */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {language === 'ur' ? 'سیڑھیاں، گرینائٹ و پٹی' : 'Steps, Granite & Borders'}
                  </span>
                  <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {stockBreakdown.otherSqFt.toLocaleString()} Sq.Ft ({stockBreakdown.otherPct}%)
                  </span>
                </div>
                <div style={{ height: '8px', background: 'var(--border-subtle)', borderRadius: '99px', overflow: 'hidden' }}>
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
                style={{ color: '#b45309', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}
              >
                <AlertTriangle size={14} />
                <span>
                  {language === 'ur'
                    ? `${lowStockItems.length} آئٹمز ری آرڈر لیول سے نیچے ہیں (اسٹاک بڑھائیں)`
                    : `${lowStockItems.length} items below factory reorder level`}
                </span>
              </div>
            ) : (
              <div style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                <CheckCircle2 size={14} />
                <span>{language === 'ur' ? 'یارڈ کا اسٹاک لیول تسلی بخش ہے' : 'Yard inventory levels healthy'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 6. RECENT BILLS TABLE (Real Database Records)                              */}
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
          <div className="modal-card" style={{ maxWidth: '420px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <h3 className="modal-title" style={{ fontSize: '0.98rem', fontWeight: 800 }}>
                {language === 'ur' ? 'ادھار وصولی' : 'Receive Payment'}
              </h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsQuickWasooliOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveQuickWasooli} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }}>
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
              <div className="modal-footer" style={{ justifyContent: 'space-between', flexShrink: 0 }}>
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
          <div className="modal-card" style={{ maxWidth: '420px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <h3 className="modal-title" style={{ fontSize: '0.98rem', fontWeight: 800 }}>
                {language === 'ur' ? 'روزانہ خرچ درج کریں' : 'Record Expense'}
              </h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsQuickExpenseOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveQuickExpense} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }}>
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
              <div className="modal-footer" style={{ justifyContent: 'space-between', flexShrink: 0 }}>
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
