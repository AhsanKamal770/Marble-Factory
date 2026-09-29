import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  RotateCcw, Plus, Search, CheckCircle, AlertCircle, Calendar,
  Layers, FileText, User, Truck, ArrowDownLeft, Hammer,
  Trash2, Filter, X, ArrowUpRight, ShieldAlert, Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { db } from '../../db/index';
import { useLanguage } from '../../context/LanguageContext';
import Badge from '../../components/Badge';
import {
  getAllReturns,
  getAllWastageLogs,
  recordSalesReturn,
  recordPurchaseReturn,
  recordFactoryWastage,
  deleteReturnRecord,
  getWastageSummaryStats,
  getInvoiceDetailsForReturn,
  getRecentInvoicesForLinking
} from './returnsWastageService';

const rs = (n) => 'Rs. ' + Number(n || 0).toLocaleString();

export default function ReturnsView() {
  const { language } = useLanguage();
  const tr = (en, ur) => (language === 'ur' ? ur : en);

  // Data States
  const [returnsList, setReturnsList] = useState([]);
  const [wastageStats, setWastageStats] = useState({ totalSqFt: 0, totalFinancialLoss: 0, count: 0 });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'SALES_RETURNS' | 'FACTORY_WASTAGE'
  const [filterType, setFilterType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('Sales Return'); // 'Sales Return' | 'Factory Wastage' | 'Purchase Return'

  // Form Fields
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [returnSqFt, setReturnSqFt] = useState('50');
  const [returnRate, setReturnRate] = useState('180');
  const [condition, setCondition] = useState('Good - Return to Yard Stock');
  const [refundMethod, setRefundMethod] = useState('Deduct from Khata Due Balance');
  const [reason, setReason] = useState('Leftover marble after flooring completion');
  const [wastageSource, setWastageSource] = useState('Bridge-Cutter Cutting Loss');
  const [operatorName, setOperatorName] = useState('Master Aslam (Cutter Master)');
  const [submitting, setSubmitting] = useState(false);

  // Live queries for reactive updates
  const items = useLiveQuery(() => db.items.toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const suppliers = useLiveQuery(() => db.suppliers.toArray(), []) || [];

  useEffect(() => {
    loadData();
  }, [searchTerm, filterType, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const typeFilter = activeTab === 'SALES_RETURNS' ? 'Sales Return' :
                         activeTab === 'FACTORY_WASTAGE' ? 'Factory Wastage' : filterType;

      const [data, stats, invoices] = await Promise.all([
        getAllReturns({ type: typeFilter, searchTerm }),
        getWastageSummaryStats(),
        getRecentInvoicesForLinking()
      ]);

      setReturnsList(data);
      setWastageStats(stats);
      setRecentInvoices(invoices);
    } catch (err) {
      console.error('Error loading returns data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (mode = 'Sales Return') => {
    setModalMode(mode);
    setSelectedInvoiceNo('');
    if (customers.length > 0) {
      setSelectedCustomerId(customers[0].id.toString());
      setCustomerName(customers[0].name);
    }
    if (suppliers.length > 0) {
      setSelectedSupplierId(suppliers[0].id.toString());
    }
    if (items.length > 0) {
      setSelectedItemId(items[0].id.toString());
      setReturnRate(items[0].ratePerSqFt ? items[0].ratePerSqFt.toString() : '180');
    }
    setReturnSqFt('40');
    setCondition('Good - Return to Yard Stock');
    setRefundMethod('Deduct from Khata Due Balance');
    setReason(mode === 'Factory Wastage' ? 'Edge crack during diagonal trimming' : 'Leftover tiles after project completion');
    setWastageSource('Bridge-Cutter Cutting Loss');
    setIsModalOpen(true);
  };

  const handleInvoiceSelect = async (invNo) => {
    setSelectedInvoiceNo(invNo);
    if (!invNo) return;
    try {
      const details = await getInvoiceDetailsForReturn(invNo);
      if (details) {
        if (details.customerId) {
          setSelectedCustomerId(details.customerId.toString());
        }
        setCustomerName(details.customerName || '');
        if (details.items && details.items.length > 0) {
          const first = details.items[0];
          setSelectedItemId(first.itemId.toString());
          setReturnRate(first.rate.toString());
          setReturnSqFt(Math.min(first.sqft, 50).toString());
        }
      }
    } catch (err) {
      console.error('Error fetching invoice details:', err);
    }
  };

  const handleItemSelect = (itemIdStr) => {
    setSelectedItemId(itemIdStr);
    const it = items.find((i) => i.id === parseInt(itemIdStr, 10));
    if (it) {
      setReturnRate((it.costPerSqFt || it.ratePerSqFt || 180).toString());
    }
  };

  const handleSaveReturn = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const item = items.find((i) => i.id === parseInt(selectedItemId, 10));
      if (!item) throw new Error('Please select a stone item.');

      const sqft = parseFloat(returnSqFt);
      const rate = parseFloat(returnRate) || 0;
      if (isNaN(sqft) || sqft <= 0) throw new Error('Please enter a valid square feet value.');

      if (modalMode === 'Sales Return') {
        const cust = customers.find((c) => c.id === parseInt(selectedCustomerId, 10));
        await recordSalesReturn({
          refDocNo: selectedInvoiceNo || 'N/A',
          partyId: cust ? cust.id : null,
          partyName: cust ? cust.name : (customerName || 'Walk-in Customer'),
          items: [
            {
              itemId: item.id,
              name: item.name,
              category: item.category,
              sqft,
              rate,
              condition
            }
          ],
          refundMethod,
          reason
        });
      } else if (modalMode === 'Factory Wastage') {
        await recordFactoryWastage({
          itemId: item.id,
          sqFt: sqft,
          source: wastageSource,
          reason,
          operatorName
        });
      } else if (modalMode === 'Purchase Return') {
        const sup = suppliers.find((s) => s.id === parseInt(selectedSupplierId, 10));
        if (!sup) throw new Error('Please select a supplier.');
        await recordPurchaseReturn({
          partyId: sup.id,
          refDocNo: selectedInvoiceNo || 'N/A',
          items: [
            {
              itemId: item.id,
              name: item.name,
              category: item.category,
              sqft,
              rate
            }
          ],
          reason
        });
      }

      // Celebrate success!
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 }
      });

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, returnNo) => {
    if (!window.confirm(tr(`Are you sure you want to rollback ${returnNo}? This will restore stock & ledger balances.`, `کیا آپ واقعی ${returnNo} کو ختم کرنا چاہتے ہیں؟ اس سے اسٹاک اور کھاتہ خودکار درست ہو جائے گا۔`))) {
      return;
    }
    try {
      await deleteReturnRecord(id);
      await loadData();
    } catch (err) {
      alert('Error during rollback: ' + err.message);
    }
  };

  // Calculate Aggregates for KPI Strip
  const totalSalesReturnVal = returnsList
    .filter((r) => r.type === 'Sales Return')
    .reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);

  const totalRestockedSqFt = returnsList
    .filter((r) => r.type === 'Sales Return')
    .reduce((sum, r) => {
      const sq = (r.items || []).filter(it => it.condition?.includes('Good')).reduce((s, it) => s + (Number(it.sqft) || 0), 0);
      return sum + sq;
    }, 0);

  const TH = {
    padding: '12px 16px',
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
    background: 'var(--bg-primary)',
    borderBottom: '1px solid var(--border-color)',
    whiteSpace: 'nowrap',
    textAlign: 'left'
  };

  const TD = {
    padding: '14px 16px',
    verticalAlign: 'middle',
    fontSize: '0.85rem',
    borderBottom: '1px solid var(--border-divider, rgba(0,0,0,0.05))'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      
      {/* ── HEADER & ACTIONS ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              {tr('Returns & Factory Wastage Management', 'واپسی مال و فیکٹری کٹائی نقصان')}
            </h1>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(239,68,68,0.1)',
              color: '#ef4444'
            }}>
              MOD-11
            </span>
          </div>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            {tr('Manage customer returns, bridge-cutter wastage logs, and automatic Dexie inventory reconciliation', 'گاہک واپسی مال، برج کٹر کٹائی نقصان اور خودکار اسٹاک درستگی کا انتظام')}
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleOpenModal('Factory Wastage')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '0 16px', height: '40px',
              background: '#ef4444', color: '#ffffff',
              border: 'none', borderRadius: 'var(--radius-md)',
              fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(239,68,68,0.25)'
            }}
          >
            <Hammer size={16} />
            {tr('+ Log Factory Wastage', '+ فیکٹری کٹائی نقصان درج کریں')}
          </button>

          <button
            type="button"
            onClick={() => handleOpenModal('Sales Return')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '0 16px', height: '40px',
              background: '#2563eb', color: '#ffffff',
              border: 'none', borderRadius: 'var(--radius-md)',
              fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37,99,235,0.25)'
            }}
          >
            <RotateCcw size={16} />
            {tr('+ New Sales Return', '+ گاہک واپسی مال درج کریں')}
          </button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        
        {/* Card 1: Total Sales Returns Amount */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)', padding: '16px 18px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {tr('Customer Returns Value', 'گاہک واپسی مال کی مالیت')}
            </span>
            <RotateCcw size={18} style={{ color: '#2563eb' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
            {rs(totalSalesReturnVal)}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            {tr('Restocked back to yard', 'واپس یارڈ میں شامل')}: <strong style={{ color: '#10b981' }}>{totalRestockedSqFt} Sq. Ft.</strong>
          </div>
        </div>

        {/* Card 2: Factory Cutting Loss (Sq. Ft.) */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)', padding: '16px 18px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>
              {tr('Factory Breakage Loss', 'فیکٹری کٹائی نقصان (رقبہ)')}
            </span>
            <Hammer size={18} style={{ color: '#ef4444' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ef4444', fontFamily: 'monospace' }}>
            {wastageStats.totalSqFt.toLocaleString()} {tr('Sq. Ft.', 'مربع فٹ')}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            {wastageStats.count} {tr('breakage incidents logged', 'واقعات ریکارڈ ہوئے')}
          </div>
        </div>

        {/* Card 3: Financial Loss from Wastage */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)', padding: '16px 18px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {tr('Wastage Financial Loss', 'کٹائی نقصان کی مالیاتی قیمت')}
            </span>
            <ShieldAlert size={18} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
            {rs(wastageStats.totalFinancialLoss)}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            {tr('Deducted from yard stock automatically', 'اسٹاک سے از خود منہا کر دیا گیا')}
          </div>
        </div>

        {/* Card 4: Primary Wastage Machine/Source */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)', padding: '16px 18px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {tr('Top Breakage Machine', 'سب سے زیادہ نقصان کا ذریعہ')}
            </span>
            <Layers size={18} style={{ color: '#8b5cf6' }} />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {wastageStats.sourceBreakdown?.[0]?.name || tr('Bridge Cutter', 'برج کٹر')}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            {wastageStats.sourceBreakdown?.[0]?.sqft || 0} {tr('Sq. Ft. cracked in processing', 'فٹ دورانِ کٹائی ضائع ہوا')}
          </div>
        </div>

      </div>

      {/* ── TABS & FILTER BAR ────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)', padding: '12px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
      }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'ALL', label: tr('All Records', 'تمام ریکارڈ') },
            { id: 'SALES_RETURNS', label: tr('Customer Returns', 'گاہک واپسی مال') },
            { id: 'FACTORY_WASTAGE', label: tr('Factory Wastage', 'فیکٹری کٹائی نقصان') }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '7px 14px', borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                background: activeTab === tab.id ? '#2563eb' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-primary)',
                border: '1px solid ' + (activeTab === tab.id ? '#2563eb' : 'var(--border-color)'),
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder={tr('Search return #, customer, item...', 'نمبر، گاہک یا ماربل تلاش کریں...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', height: '36px', paddingLeft: '32px', paddingRight: '12px',
              background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: 'var(--text-primary)', outline: 'none'
            }}
          />
        </div>
      </div>

      {/* ── DATA AUDIT TABLE ─────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)', overflowX: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>{tr('Doc #', 'دستاویز نمبر')}</th>
              <th style={TH}>{tr('Date', 'تاریخ')}</th>
              <th style={TH}>{tr('Type', 'قسم')}</th>
              <th style={TH}>{tr('Party / Source', 'گاہک یا مشین')}</th>
              <th style={TH}>{tr('Stone Item', 'ماربل آئٹم')}</th>
              <th style={TH}>{tr('Sq. Ft.', 'مربع فٹ')}</th>
              <th style={TH}>{tr('Financial Amount', 'مالیت')}</th>
              <th style={TH}>{tr('Condition / Method', 'حالت و طریقہ')}</th>
              <th style={TH}>{tr('Reason & Notes', 'وجہ و تفصیل')}</th>
              <th style={{ ...TH, textAlign: 'right' }}>{tr('Action', 'کارروائی')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ ...TD, textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {tr('Loading returns data...', 'ڈیٹا لوڈ ہو رہا ہے...')}
                </td>
              </tr>
            ) : returnsList.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ ...TD, textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {tr('No return or wastage records found.', 'کوئی واپسی یا نقصان کا ریکارڈ موجود نہیں۔')}
                </td>
              </tr>
            ) : (
              returnsList.map((ret, idx) => {
                const item = ret.items?.[0] || {};
                const isWastage = ret.type === 'Factory Wastage';
                const isSalesReturn = ret.type === 'Sales Return';

                return (
                  <tr key={ret.id || idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                    <td style={{ ...TD, fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {ret.returnNo}
                    </td>
                    <td style={{ ...TD, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {(ret.date || ret.createdAt || '').slice(0, 10)}
                    </td>
                    <td style={{ ...TD }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                        background: isWastage ? 'rgba(239,68,68,0.1)' : isSalesReturn ? 'rgba(37,99,235,0.1)' : 'rgba(245,158,11,0.1)',
                        color: isWastage ? '#ef4444' : isSalesReturn ? '#2563eb' : '#f59e0b'
                      }}>
                        {ret.type}
                      </span>
                    </td>
                    <td style={{ ...TD, fontWeight: 600 }}>
                      {ret.partyName}
                      {ret.refDocNo && ret.refDocNo !== 'N/A' && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Ref: {ret.refDocNo}
                        </div>
                      )}
                    </td>
                    <td style={{ ...TD }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name || 'Marble'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.category}</div>
                    </td>
                    <td style={{ ...TD, fontFamily: 'monospace', fontWeight: 700 }}>
                      {item.sqft || 0} {tr('SqFt', 'فٹ')}
                    </td>
                    <td style={{ ...TD, fontFamily: 'monospace', fontWeight: 700, color: isWastage ? '#ef4444' : '#2563eb' }}>
                      {rs(ret.totalAmount)}
                    </td>
                    <td style={{ ...TD, fontSize: '0.78rem' }}>
                      <div style={{ color: item.condition?.includes('Good') ? '#10b981' : 'var(--text-muted)', fontWeight: 600 }}>
                        {item.condition || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {ret.refundMethod}
                      </div>
                    </td>
                    <td style={{ ...TD, fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '240px' }}>
                      {ret.reason}
                    </td>
                    <td style={{ ...TD, textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(ret.id, ret.returnNo)}
                        title={tr('Rollback and revert stock/balance', 'اسٹاک اور کھاتہ بحال کریں')}
                        style={{
                          background: 'transparent', border: 'none', color: '#ef4444',
                          cursor: 'pointer', padding: '6px', borderRadius: '4px'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── MODAL: NEW RETURN OR FACTORY WASTAGE ──────────────────────────── */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          backdropFilter: 'blur(3px)', padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '580px',
            maxHeight: '90vh', overflowY: 'auto', padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  {modalMode === 'Factory Wastage' ? tr('Log Factory Cutting Wastage', 'فیکٹری کٹائی نقصان درج کریں') :
                   modalMode === 'Sales Return' ? tr('Record Customer Sales Return', 'گاہک واپسی مال ریکارڈ کریں') :
                   tr('Record Supplier Purchase Return', 'سپلائر واپسی مال')}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {tr('Dexie.js atomic multi-table transaction with automatic stock adjustment', 'ڈیکسی جے ایس خودکار اسٹاک اور کھاتہ ایڈجسٹمنٹ')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Mode Selector Tabs inside Modal */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', background: 'var(--bg-primary)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
              {['Sales Return', 'Factory Wastage', 'Purchase Return'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModalMode(m)}
                  style={{
                    flex: 1, padding: '8px 6px', fontSize: '0.78rem', fontWeight: 700, borderRadius: '4px',
                    border: 'none', cursor: 'pointer',
                    background: modalMode === m ? (m === 'Factory Wastage' ? '#ef4444' : '#2563eb') : 'transparent',
                    color: modalMode === m ? '#ffffff' : 'var(--text-muted)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {m === 'Sales Return' ? tr('Sales Return (گاہک)', 'گاہک واپسی') :
                   m === 'Factory Wastage' ? tr('Factory Wastage (کٹائی)', 'فیکٹری نقصان') :
                   tr('Supplier Return (سپلائر)', 'سپلائر واپسی')}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveReturn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* If Sales Return: Option to pick recent invoice */}
              {modalMode === 'Sales Return' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    {tr('Link Existing Invoice (بل سے منسلک کریں)', 'بل نمبر منتخب کریں (اختیاری)')}
                  </label>
                  <select
                    value={selectedInvoiceNo}
                    onChange={(e) => handleInvoiceSelect(e.target.value)}
                    style={{
                      width: '100%', height: '38px', padding: '0 10px', fontSize: '0.84rem',
                      background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none'
                    }}
                  >
                    <option value="">-- {tr('Manual / Walk-in Return without Bill', 'بغیر بل کے براہِ راست واپسی')} --</option>
                    {recentInvoices.map((inv) => (
                      <option key={inv.id} value={inv.invoiceNo}>
                        {inv.invoiceNo} - {inv.customerName} ({rs(inv.grandTotal)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Customer selection for Sales Return */}
              {modalMode === 'Sales Return' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      {tr('Customer Khata', 'گاہک کھاتہ')}
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                        const c = customers.find(x => x.id === parseInt(e.target.value, 10));
                        if (c) setCustomerName(c.name);
                      }}
                      style={{
                        width: '100%', height: '38px', padding: '0 10px', fontSize: '0.84rem',
                        background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none'
                      }}
                    >
                      <option value="">-- {tr('Walk-in Customer (عام خریدار)', 'عام گاہک')} --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} (Due: {rs(c.balanceDue)})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      {tr('Customer Name', 'گاہک کا نام')}
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Tariq Mehmood"
                      style={{
                        width: '100%', height: '38px', padding: '0 10px', fontSize: '0.84rem',
                        background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Supplier selection for Purchase Return */}
              {modalMode === 'Purchase Return' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    {tr('Select Supplier', 'سپلائر منتخب کریں')}
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    style={{
                      width: '100%', height: '38px', padding: '0 10px', fontSize: '0.84rem',
                      background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none'
                    }}
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.company || s.name} (Payable: {rs(s.balancePayable)})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Wastage Source for Factory Wastage */}
              {modalMode === 'Factory Wastage' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      {tr('Wastage Machine / Source', 'کٹائی نقصان کا ذریعہ')}
                    </label>
                    <select
                      value={wastageSource}
                      onChange={(e) => setWastageSource(e.target.value)}
                      style={{
                        width: '100%', height: '38px', padding: '0 10px', fontSize: '0.84rem',
                        background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none'
                      }}
                    >
                      <option value="Bridge-Cutter Cutting Loss">Bridge-Cutter Cutting Loss (برج کٹر کٹائی)</option>
                      <option value="Gangsaw Slab Sawing Crack">Gangsaw Slab Sawing Crack (گینگ سا ٹوٹ پھوٹ)</option>
                      <option value="Polish & Edge Trimming Chipping">Polish & Edge Chipping (پالش و کنارہ نقصان)</option>
                      <option value="Yard Loading & Transit Breakage">Yard Loading & Transit (لوڈنگ ان لوڈنگ)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      {tr('Cutter Master / Staff', 'کٹائی ماسٹر یا ملازم')}
                    </label>
                    <input
                      type="text"
                      value={operatorName}
                      onChange={(e) => setOperatorName(e.target.value)}
                      placeholder="e.g. Master Aslam"
                      style={{
                        width: '100%', height: '38px', padding: '0 10px', fontSize: '0.84rem',
                        background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Stone Item selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  {tr('Marble / Stone Item', 'ماربل یا پتھر کا انتخاب')}
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => handleItemSelect(e.target.value)}
                  style={{
                    width: '100%', height: '38px', padding: '0 10px', fontSize: '0.84rem',
                    background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none'
                  }}
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} - {it.category} ({it.stockSqFt} SqFt in Yard)
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity (Sq Ft) and Rate */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    {tr('Quantity (Sq. Ft.)', 'مقدار (مربع فٹ)')}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={returnSqFt}
                    onChange={(e) => setReturnSqFt(e.target.value)}
                    required
                    style={{
                      width: '100%', height: '38px', padding: '0 10px', fontSize: '0.84rem',
                      background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none',
                      fontFamily: 'monospace', fontWeight: 700
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    {modalMode === 'Factory Wastage' ? tr('Unit Cost (Rs/SqFt)', 'لاگت فی فٹ') : tr('Return Rate (Rs/SqFt)', 'ریٹ فی مربع فٹ')}
                  </label>
                  <input
                    type="number"
                    value={returnRate}
                    onChange={(e) => setReturnRate(e.target.value)}
                    required
                    style={{
                      width: '100%', height: '38px', padding: '0 10px', fontSize: '0.84rem',
                      background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none',
                      fontFamily: 'monospace', fontWeight: 700
                    }}
                  />
                </div>
              </div>

              {/* Total Calculation Display */}
              <div style={{
                background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)', padding: '10px 14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {modalMode === 'Factory Wastage' ? tr('Estimated Financial Loss:', 'کٹائی نقصان کی رقم:') : tr('Total Return Credit Value:', 'کل واپسی کی رقم:')}
                </span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: modalMode === 'Factory Wastage' ? '#ef4444' : '#2563eb', fontFamily: 'monospace' }}>
                  {rs((parseFloat(returnSqFt) || 0) * (parseFloat(returnRate) || 0))}
                </span>
              </div>

              {/* Condition & Settlement for Sales Return */}
              {modalMode === 'Sales Return' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      {tr('Stone Condition', 'مال کی حالت')}
                    </label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      style={{
                        width: '100%', height: '38px', padding: '0 10px', fontSize: '0.82rem',
                        background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none'
                      }}
                    >
                      <option value="Good - Return to Yard Stock">Good - Restock to Yard (ٹھیک مال)</option>
                      <option value="Damaged - Scrap">Damaged - Scrap (خراب / سکریپ)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      {tr('Refund Method', 'رقم کا طریقہ کار')}
                    </label>
                    <select
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value)}
                      style={{
                        width: '100%', height: '38px', padding: '0 10px', fontSize: '0.82rem',
                        background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none'
                      }}
                    >
                      <option value="Deduct from Khata Due Balance">Deduct from Khata Balance (ادھار سے کٹوتی)</option>
                      <option value="Cash Refund">Cash Refund from Drawer (نقد ادائیگی)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Reason / Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  {tr('Reason / Remarks', 'وجہ و تفصیل')}
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Leftover tiles, cracked during cutting, etc."
                  style={{
                    width: '100%', height: '38px', padding: '0 10px', fontSize: '0.84rem',
                    background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none'
                  }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 18px', borderRadius: 'var(--radius-md)',
                    background: 'transparent', border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  {tr('Cancel', 'منسوخ')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 22px', borderRadius: 'var(--radius-md)',
                    background: modalMode === 'Factory Wastage' ? '#ef4444' : '#2563eb',
                    border: 'none', color: '#ffffff',
                    fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                  }}
                >
                  {submitting ? tr('Saving...', 'محفوظ ہو رہا ہے...') : tr('Save & Reconcile Stock', 'محفوظ کریں')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
