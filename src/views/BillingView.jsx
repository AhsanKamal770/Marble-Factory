import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Calculator,
  Printer,
  UserPlus,
  Receipt,
  Layers,
  AlertCircle,
  Truck,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { db, adjustItemStock } from '../db/index';
import { useLanguage } from '../context/LanguageContext';
import DimensionCalculator from '../components/DimensionCalculator';
import BillPrintModal from '../components/BillPrintModal';
import Badge from '../components/Badge';

export default function BillingView({ setActiveView, settings }) {
  const { language, t } = useLanguage();
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Customer & Dispatch Details
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [carrier, setCarrier] = useState('');
  const [isNewCustomerModal, setIsNewCustomerModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    phone: '',
    city: 'Faisalabad / Jhumra',
    customerType: 'Retail',
    address: ''
  });

  // Invoice Line Items
  const [lineItems, setLineItems] = useState([]);
  const [activeCalcItemIndex, setActiveCalcItemIndex] = useState(null);
  const [isCalcOpen, setIsCalcOpen] = useState(false);

  // Additional Charges & Settlement
  const [carriageCharges, setCarriageCharges] = useState(0);
  const [labourCharges, setLabourCharges] = useState(0);
  const [polishCharges, setPolishCharges] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // Print Modal & Saving Status
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allItems = await db.items.toArray();
      const allCustomers = await db.customers.toArray();
      setItems(allItems);
      setCustomers(allCustomers);

      // Pre-populate with 1 empty line item if empty
      if (allItems.length > 0 && lineItems.length === 0) {
        const def = allItems[0];
        setLineItems([
          {
            itemId: def.id,
            name: def.name,
            category: def.category,
            thicknessSutar: def.thicknessMm === 18 ? 6 : 4,
            dimensions: '4ft × 2.5ft (10 Slabs)',
            length: 4,
            width: 2.5,
            pieces: 10,
            boxes: 0,
            totalSqFt: 100,
            ratePerSqFt: def.ratePerSqFt || 220,
            amount: 100 * (def.ratePerSqFt || 220)
          }
        ]);
      }
    } catch (err) {
      console.error('Error loading billing data:', err);
    }
  };

  // Add line item
  const handleAddLineItem = () => {
    if (items.length === 0) return;
    const def = items[0];
    setLineItems([
      ...lineItems,
      {
        itemId: def.id,
        name: def.name,
        category: def.category,
        thicknessSutar: def.thicknessMm === 18 ? 6 : 4,
        dimensions: '4ft × 2.5ft (5 Slabs)',
        length: 4,
        width: 2.5,
        pieces: 5,
        boxes: 0,
        totalSqFt: 50,
        ratePerSqFt: def.ratePerSqFt || 220,
        amount: 50 * (def.ratePerSqFt || 220)
      }
    ]);
  };

  // Change selected item
  const handleItemSelect = (index, itemId) => {
    const selected = items.find((i) => i.id === parseInt(itemId, 10));
    if (!selected) return;

    const updated = [...lineItems];
    const sqft = updated[index].totalSqFt || 50;
    const rate = selected.ratePerSqFt || 220;

    updated[index] = {
      ...updated[index],
      itemId: selected.id,
      name: selected.name,
      category: selected.category,
      thicknessSutar: selected.thicknessMm === 18 ? 6 : 4,
      ratePerSqFt: rate,
      amount: Math.round(sqft * rate)
    };
    setLineItems(updated);
  };

  // Update line field
  const handleUpdateLineField = (index, field, value) => {
    const updated = [...lineItems];
    const item = { ...updated[index], [field]: value };

    if (field === 'totalSqFt' || field === 'ratePerSqFt') {
      const sqft = parseFloat(field === 'totalSqFt' ? value : item.totalSqFt) || 0;
      const rate = parseFloat(field === 'ratePerSqFt' ? value : item.ratePerSqFt) || 0;
      item.amount = Math.round(sqft * rate);
    }
    updated[index] = item;
    setLineItems(updated);
  };

  // Open dimension calculator
  const handleOpenCalculator = (index) => {
    setActiveCalcItemIndex(index);
    setIsCalcOpen(true);
  };

  // Apply dimension calculator result
  const handleApplyCalculations = (calcData) => {
    if (activeCalcItemIndex === null) return;
    const updated = [...lineItems];
    const current = updated[activeCalcItemIndex];

    updated[activeCalcItemIndex] = {
      ...current,
      dimensions: calcData.dimensions,
      length: calcData.length,
      width: calcData.width,
      pieces: calcData.pieces,
      boxes: calcData.boxes,
      totalSqFt: calcData.totalSqFt,
      ratePerSqFt: calcData.ratePerSqFt,
      amount: calcData.totalAmount
    };
    setLineItems(updated);
  };

  const handleRemoveLineItem = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Financial Calculations
  const subtotal = lineItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
  const extraCharges = (parseFloat(carriageCharges) || 0) + (parseFloat(labourCharges) || 0) + (parseFloat(polishCharges) || 0);
  const totalDiscount = parseFloat(discountAmount) || 0;
  const grandTotal = Math.max(0, subtotal + extraCharges - totalDiscount);
  const balanceDue = Math.max(0, grandTotal - (parseFloat(paidAmount) || 0));

  let paymentStatus = 'Pending';
  const numPaid = parseFloat(paidAmount) || 0;
  if (numPaid >= grandTotal && grandTotal > 0) {
    paymentStatus = 'Paid';
  } else if (numPaid > 0) {
    paymentStatus = 'Half Paid';
  }

  // Quick Settlement buttons
  const setQuickPaid = (ratio) => {
    setPaidAmount(Math.round(grandTotal * ratio));
  };

  // Create new customer
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerData.name) return;

    try {
      const id = await db.customers.add({
        ...newCustomerData,
        totalBilled: 0,
        totalPaid: 0,
        balanceDue: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const newCust = await db.customers.get(id);
      setCustomers([...customers, newCust]);
      setSelectedCustomer(newCust);
      setIsNewCustomerModal(false);
      setNewCustomerData({ name: '', phone: '', city: 'Faisalabad / Jhumra', customerType: 'Retail', address: '' });
    } catch (err) {
      console.error(err);
    }
  };

  // Save invoice and trigger bill print modal
  const handleSaveInvoice = async () => {
    if (lineItems.length === 0) {
      setErrorMessage(language === 'ur' ? 'برائے مہربانی کم از کم ایک ماربل آئٹم درج کریں۔' : 'Please add at least one marble line item.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');

      const invoiceNo = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
      const customerName = selectedCustomer ? selectedCustomer.name : (language === 'ur' ? 'عام خریدار (نقد)' : 'Walk-in Retail Customer');
      const customerPhone = selectedCustomer ? selectedCustomer.phone : '';

      const invoiceData = {
        invoiceNo,
        date: new Date().toISOString(),
        customerId: selectedCustomer ? selectedCustomer.id : null,
        customerName,
        customerPhone,
        carrier: carrier || (language === 'ur' ? 'رکشہ / ڈیلیوری' : 'Rickshaw / Factory Dispatch'),
        items: lineItems,
        subtotal,
        carriageCharges: parseFloat(carriageCharges) || 0,
        labourCharges: parseFloat(labourCharges) || 0,
        polishCharges: parseFloat(polishCharges) || 0,
        discountAmount: totalDiscount,
        grandTotal,
        paidAmount: numPaid,
        balanceDue,
        paymentStatus,
        paymentMethod,
        notes: invoiceNotes,
        createdAt: new Date().toISOString()
      };

      await db.transaction('rw', [db.invoices, db.items, db.customers, db.stock_movements, db.customer_payments], async () => {
        // 1. Save invoice
        const invId = await db.invoices.add(invoiceData);

        // 2. Deduct inventory stock for each line item
        for (const item of lineItems) {
          if (item.itemId) {
            await adjustItemStock(
              item.itemId,
              -(item.totalSqFt || 0),
              -(item.boxes || 0),
              -(item.pieces || 0),
              'Sale',
              invoiceNo,
              `Sold to ${customerName}`
            );
          }
        }

        // 3. If customer registered, update customer balance & payment record
        if (selectedCustomer) {
          const newBilled = (Number(selectedCustomer.totalBilled) || 0) + grandTotal;
          const newPaid = (Number(selectedCustomer.totalPaid) || 0) + numPaid;
          const newDue = (Number(selectedCustomer.balanceDue) || 0) + balanceDue;

          await db.customers.update(selectedCustomer.id, {
            totalBilled: newBilled,
            totalPaid: newPaid,
            balanceDue: newDue,
            updatedAt: new Date().toISOString()
          });

          // 4. Record customer payment if paid
          if (numPaid > 0) {
            await db.customer_payments.add({
              paymentNo: `PAY-${Date.now().toString().slice(-6)}`,
              invoiceId: invId,
              customerId: selectedCustomer.id,
              customerName: selectedCustomer.name,
              date: new Date().toISOString(),
              amount: numPaid,
              paymentMethod,
              referenceNo: invoiceNo,
              notes: `Payment for Invoice #${invoiceNo}`,
              createdAt: new Date().toISOString()
            });
          }
        }
      });

      setCreatedInvoice(invoiceData);
      setIsPrintModalOpen(true);

      // Reset fields
      setLineItems([]);
      setSelectedCustomer(null);
      setCarrier('');
      setCarriageCharges(0);
      setLabourCharges(0);
      setPolishCharges(0);
      setDiscountAmount(0);
      setPaidAmount(0);
      setInvoiceNotes('');
    } catch (err) {
      setErrorMessage(err.message || 'Error processing invoice');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Error Banner */}
      {errorMessage && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(220, 38, 38, 0.08)',
          border: '1px solid rgba(220, 38, 38, 0.25)',
          borderRadius: '8px',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. BRANDED FACTORY BILL BOOK HEADER BANNER                     */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 20px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'rgba(37, 99, 235, 0.1)',
            color: 'var(--accent-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Receipt size={22} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {language === 'ur' ? 'رانا شہاب ماربل فیکٹری بل بک' : 'Rana Shahab Marble Factory — Bill Book'}
              </h2>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                background: 'rgba(37, 99, 235, 0.1)',
                color: 'var(--accent-blue)',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                POS v2.0
              </span>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {language === 'ur' ? 'نام ہی کافی ہے — جھمرہ روڈ کٹنگ و سیلز کاؤنٹر' : 'Naam Hi Kaafi Hai — Jhumra Road Factory Sales & POS'}
            </div>
          </div>
        </div>

        {/* Live Bill Sequence Metadata */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '0.78rem'
        }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>{language === 'ur' ? 'بل بک نمبر:' : 'Bill Book #:'}</span>{' '}
            <strong className="font-mono text-accent">INV-{new Date().getFullYear()}-AUTO</strong>
          </div>
          <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '14px' }}>
            <span style={{ color: 'var(--text-muted)' }}>{language === 'ur' ? 'تاریخ:' : 'Date:'}</span>{' '}
            <strong>{new Date().toLocaleDateString('en-GB')}</strong>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. CUSTOMER KHATA & CARRIER DISPATCH ROW                       */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        boxShadow: 'var(--shadow-sm)',
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 1.3fr) minmax(240px, 1fr) auto',
        gap: '16px',
        alignItems: 'center'
      }}>
        {/* Customer Select */}
        <div>
          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
            {language === 'ur' ? 'گاہک کھاتہ منتخب کریں' : 'Customer Account / Digital Khata'}
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              className="form-control"
              value={selectedCustomer ? selectedCustomer.id : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) setSelectedCustomer(null);
                else setSelectedCustomer(customers.find((c) => c.id === parseInt(val, 10)) || null);
              }}
              style={{ fontSize: '0.84rem' }}
            >
              <option value="">{language === 'ur' ? 'عام خریدار (نقد / Walk-in)' : 'Walk-in Cash Sale (Retail)'}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone || 'No phone'}) — Bal: Rs. {Number(c.balanceDue || 0).toLocaleString()}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsNewCustomerModal(true)}
              title="Add New Customer to Khata"
              style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}
            >
              <UserPlus size={14} />
              <span>{language === 'ur' ? 'نیا گاہک' : 'New'}</span>
            </button>
          </div>
        </div>

        {/* Carrier / Rickshaw Dispatch Field */}
        <div>
          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
            {language === 'ur' ? 'درج ذیل مال بدست (رکشہ / گاڑی / ڈرائیور)' : 'Delivered Via / Carrier (Rickshaw/Pickup/Truck)'}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="text"
              className="form-control"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder={language === 'ur' ? 'مثلاً: رکشہ نمبر 1432 - وقاص' : 'e.g. Loader Rickshaw #5421 - Driver Waqas'}
              style={{ fontSize: '0.82rem' }}
            />
          </div>
        </div>

        {/* Customer Balance Indicator Badge */}
        <div>
          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, visibility: 'hidden' }}>
            Status
          </label>
          {selectedCustomer ? (
            <div style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              padding: '6px 12px',
              borderRadius: '6px',
              textAlign: 'right',
              whiteSpace: 'nowrap'
            }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {language === 'ur' ? 'سابقہ واجب الادا ادھار:' : 'Previous Khata Due:'}
              </div>
              <div className="font-mono" style={{
                fontSize: '0.92rem',
                fontWeight: 800,
                color: Number(selectedCustomer.balanceDue || 0) > 0 ? '#dc2626' : '#059669'
              }}>
                Rs. {Number(selectedCustomer.balanceDue || 0).toLocaleString()}
              </div>
            </div>
          ) : (
            <div style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap'
            }}>
              {language === 'ur' ? 'عام نقد سیل' : 'Standard Cash Retail'}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. STONE LINE ITEMS & SUTAR THICKNESS TABLE                   */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
        {/* Table Header Action Bar */}
        <div style={{
          padding: '12px 18px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {language === 'ur' ? 'ماربل سلیب و ٹائلز تفصیل' : 'Billed Marble Slabs & Tiles Items'}
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {language === 'ur' ? 'سوتر موٹائی، لمبائی چوڑائی اور اسکوائر فٹ پیمائش' : 'Stone thickness (Sutar), dimensions and square feet calculation'}
            </span>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleAddLineItem}
            style={{ fontWeight: 700, padding: '6px 12px', gap: '5px' }}
          >
            <Plus size={14} />
            <span>{language === 'ur' ? '+ پتھر آئٹم شامل کریں' : '+ Add Line Item'}</span>
          </button>
        </div>

        {/* Data Table */}
        <div className="table-container" style={{ margin: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '25%', whiteSpace: 'nowrap' }}>{language === 'ur' ? 'پتھر و ماربل ورائٹی' : 'Marble Variety / Item'}</th>
                <th style={{ width: '15%', textAlign: 'center', whiteSpace: 'nowrap' }}>{language === 'ur' ? 'سوتر موٹائی' : 'Thickness (Sutar)'}</th>
                <th style={{ width: '24%', whiteSpace: 'nowrap' }}>{language === 'ur' ? 'پیمائش سائز (L × W)' : 'Dimensions & Sizing'}</th>
                <th style={{ width: '11%', textAlign: 'right', whiteSpace: 'nowrap' }}>{language === 'ur' ? 'کل اسکوائر فٹ' : 'Total Sq.Ft'}</th>
                <th style={{ width: '11%', textAlign: 'right', whiteSpace: 'nowrap' }}>{language === 'ur' ? 'ریٹ (Rs.)' : 'Rate / Sq.Ft'}</th>
                <th style={{ width: '11%', textAlign: 'right', whiteSpace: 'nowrap' }}>{language === 'ur' ? 'رقم' : 'Subtotal'}</th>
                <th style={{ width: '3%', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                    {language === 'ur' ? 'کوئی آئٹم درج نہیں۔ اوپر دائیں بٹن سے آئٹم شامل کریں۔' : 'No items added. Click "+ Add Line Item" above.'}
                  </td>
                </tr>
              ) : (
                lineItems.map((item, idx) => (
                  <tr key={idx}>
                    {/* Item Selector */}
                    <td>
                      <select
                        className="form-control"
                        value={item.itemId}
                        onChange={(e) => handleItemSelect(idx, e.target.value)}
                        style={{ fontSize: '0.82rem', fontWeight: 600 }}
                      >
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name} [{it.category}]
                          </option>
                        ))}
                      </select>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {language === 'ur' ? 'یارڈ اسٹاک:' : 'Yard Stock:'} {items.find(i => i.id === item.itemId)?.stockSqFt || 0} Sq.Ft
                      </div>
                    </td>

                    {/* Sutar Thickness Selector */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                        <select
                          className="form-control"
                          value={item.thicknessSutar || 4}
                          onChange={(e) => handleUpdateLineField(idx, 'thicknessSutar', parseInt(e.target.value, 10))}
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            padding: '4px 6px',
                            color: item.thicknessSutar === 6 ? '#0284c7' : 'var(--text-primary)',
                            background: item.thicknessSutar === 6 ? 'rgba(2, 132, 199, 0.08)' : 'var(--bg-primary)'
                          }}
                        >
                          <option value={4}>4 Sutar (Standard)</option>
                          <option value={6}>6 Sutar (Kitchen/Stairs)</option>
                          <option value={9}>9 Sutar (Heavy)</option>
                          <option value={14}>14 Sutar (Monument)</option>
                        </select>
                        {item.thicknessSutar === 6 && (
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#0284c7' }}>
                            Kitchen / Stairs
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Dimensions & Calculator */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="text"
                          className="form-control"
                          value={item.dimensions}
                          onChange={(e) => handleUpdateLineField(idx, 'dimensions', e.target.value)}
                          placeholder="e.g. 4ft × 2.5ft (10 Slabs)"
                          style={{ fontSize: '0.8rem' }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenCalculator(idx)}
                          title="Open Live Dimension Calculator"
                          style={{ padding: '6px 8px', flexShrink: 0 }}
                        >
                          <Calculator size={13} style={{ color: 'var(--accent-blue)' }} />
                        </button>
                      </div>
                    </td>

                    {/* Total Sq.Ft */}
                    <td style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control font-mono"
                        value={item.totalSqFt}
                        onChange={(e) => handleUpdateLineField(idx, 'totalSqFt', e.target.value)}
                        style={{ textAlign: 'right', fontSize: '0.86rem', fontWeight: 700 }}
                      />
                    </td>

                    {/* Rate / Sq.Ft */}
                    <td style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        step="1"
                        className="form-control font-mono"
                        value={item.ratePerSqFt}
                        onChange={(e) => handleUpdateLineField(idx, 'ratePerSqFt', e.target.value)}
                        style={{ textAlign: 'right', fontSize: '0.86rem' }}
                      />
                    </td>

                    {/* Subtotal */}
                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-blue)', whiteSpace: 'nowrap' }}>
                      Rs. {Number(item.amount || 0).toLocaleString()}
                    </td>

                    {/* Delete */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleRemoveLineItem(idx)}
                        style={{ color: '#dc2626', padding: '4px' }}
                        title="Remove row"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. SETTLEMENT & FACTORY CHARGES GRID                           */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '18px',
        alignItems: 'start'
      }}>
        {/* LEFT: Additional Factory Charges & Delivery Notes */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
            {language === 'ur' ? 'کرایہ باربرداری، لوڈنگ و پالش اخراجات' : 'Carriage, Labour, Polishing & Discount'}
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.74rem' }}>
                {language === 'ur' ? 'کرایہ باربرداری (Rs.)' : 'Carriage / Transport (Rs.)'}
              </label>
              <input
                type="number"
                min="0"
                className="form-control font-mono"
                value={carriageCharges}
                onChange={(e) => setCarriageCharges(e.target.value)}
                placeholder="0"
                style={{ fontSize: '0.84rem' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.74rem' }}>
                {language === 'ur' ? 'مزدوری و لوڈنگ (Rs.)' : 'Labour / Loading (Rs.)'}
              </label>
              <input
                type="number"
                min="0"
                className="form-control font-mono"
                value={labourCharges}
                onChange={(e) => setLabourCharges(e.target.value)}
                placeholder="0"
                style={{ fontSize: '0.84rem' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.74rem' }}>
                {language === 'ur' ? 'پالش و کٹائی (Rs.)' : 'Polishing & Cutting (Rs.)'}
              </label>
              <input
                type="number"
                min="0"
                className="form-control font-mono"
                value={polishCharges}
                onChange={(e) => setPolishCharges(e.target.value)}
                placeholder="0"
                style={{ fontSize: '0.84rem' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: 700 }}>
                {language === 'ur' ? 'خاص رعایت / ڈسکاؤنٹ (Rs.)' : 'Special Discount (Rs.)'}
              </label>
              <input
                type="number"
                min="0"
                className="form-control font-mono"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="0"
                style={{ fontSize: '0.84rem', color: '#dc2626', fontWeight: 700 }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '10px' }}>
            <label className="form-label" style={{ fontSize: '0.74rem' }}>
              {language === 'ur' ? 'بل بک ریمارکس / سائٹ ایڈریس' : 'Bill Notes / Delivery Site Address'}
            </label>
            <textarea
              className="form-control"
              rows={2}
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
              placeholder={language === 'ur' ? 'سائٹ ڈلیوری کا پتہ یا خصوصی ہدایات درج کریں...' : 'e.g. Delivered to Site Near Jhumra Canal, balance to be cleared upon delivery...'}
              style={{ fontSize: '0.8rem' }}
            />
          </div>
        </div>

        {/* RIGHT: Financial Summary & Quick Settlement */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
            {language === 'ur' ? 'صافی میزان و ادائیگی کھاتہ' : 'Payment & Settlement Summary'}
          </h4>

          {/* Subtotal List */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '0.8rem',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '10px',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{language === 'ur' ? 'میزان کل مال:' : 'Items Subtotal:'}</span>
              <span className="font-mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                Rs. {subtotal.toLocaleString()}
              </span>
            </div>

            {extraCharges > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{language === 'ur' ? 'کرایہ + لوڈنگ + پالش:' : 'Carriage + Labour + Polish:'}</span>
                <span className="font-mono">+ Rs. {extraCharges.toLocaleString()}</span>
              </div>
            )}

            {totalDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                <span>{language === 'ur' ? 'ڈسکاؤنٹ:' : 'Discount:'}</span>
                <span className="font-mono">- Rs. {totalDiscount.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Grand Total */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 0',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <span style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {language === 'ur' ? 'صافی واجب الادا:' : 'GRAND TOTAL:'}
            </span>
            <span className="font-mono" style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--accent-blue)' }}>
              Rs. {grandTotal.toLocaleString()}
            </span>
          </div>

          {/* Payment Split & Quick Buttons */}
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ fontSize: '0.74rem', margin: 0, fontWeight: 700, color: '#059669' }}>
                {language === 'ur' ? 'وصول نقد (Rs.)' : 'Amount Paid Now (Cash in Drawer)'}
              </label>

              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setQuickPaid(1)}
                  style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                >
                  Full Paid
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setQuickPaid(0.5)}
                  style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                >
                  50%
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setQuickPaid(0)}
                  style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                >
                  Udhar
                </button>
              </div>
            </div>

            <input
              type="number"
              min="0"
              className="form-control font-mono"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              style={{ fontSize: '1.15rem', fontWeight: 700, color: '#059669' }}
            />
          </div>

          {/* Payment Method & Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.72rem' }}>
                {language === 'ur' ? 'ادائیگی ذریعہ' : 'Method'}
              </label>
              <select
                className="form-control"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ fontSize: '0.78rem' }}
              >
                <option value="Cash">Cash in Drawer (Roznamcha)</option>
                <option value="Bank Transfer">Bank Transfer / IBFT</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.72rem' }}>
                {language === 'ur' ? 'بل اسٹیٹس' : 'Payment Status'}
              </label>
              <div style={{ marginTop: '4px' }}>
                <Badge status={paymentStatus} />
              </div>
            </div>
          </div>

          {/* Remaining Udhar Due Bar */}
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {language === 'ur' ? 'بقایا واجب الادا ادھار:' : 'Remaining Balance Due:'}
            </span>
            <span className="font-mono" style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              color: balanceDue > 0 ? '#dc2626' : '#059669'
            }}>
              Rs. {balanceDue.toLocaleString()}
            </span>
          </div>

          {/* Save & Print Bill CTA Button */}
          <button
            type="button"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: '14px', fontWeight: 800, gap: '8px' }}
            onClick={handleSaveInvoice}
            disabled={isSaving || lineItems.length === 0}
          >
            <Printer size={18} />
            <span>
              {isSaving
                ? (language === 'ur' ? 'بل محفوظ ہو رہا ہے...' : 'Processing Bill...')
                : (language === 'ur' ? 'بل بک تصدیق و پرنٹ (A4 / 80mm)' : 'Save & Print Bill Book (A4 / 80mm)')}
            </span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. MODALS & POP-UPS                                            */}
      {/* ------------------------------------------------------------- */}

      {/* Live Dimension Calculator Modal */}
      {isCalcOpen && activeCalcItemIndex !== null && (
        <DimensionCalculator
          isOpen={isCalcOpen}
          onClose={() => {
            setIsCalcOpen(false);
            setActiveCalcItemIndex(null);
          }}
          initialItem={items.find(i => i.id === lineItems[activeCalcItemIndex]?.itemId)}
          onApply={handleApplyCalculations}
        />
      )}

      {/* Composite Dual Print Modal (A4 Bill Book & 80mm Thermal) */}
      {isPrintModalOpen && createdInvoice && (
        <BillPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          invoice={createdInvoice}
          settings={settings}
          customer={selectedCustomer}
        />
      )}

      {/* Add New Customer Modal */}
      {isNewCustomerModal && (
        <div className="modal-overlay" onClick={() => setIsNewCustomerModal(false)}>
          <div className="modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {language === 'ur' ? 'نیا گاہک کھاتہ شامل کریں' : 'Quick Add Customer to Khata'}
              </h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsNewCustomerModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateCustomer}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    {language === 'ur' ? 'گاہک کا نام *' : 'Customer / Party Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={newCustomerData.name}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                    placeholder="e.g. Haji Abdul Ghaffar"
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>
                    {language === 'ur' ? 'فون / موبائل نمبر' : 'Phone / Mobile #'}
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={newCustomerData.phone}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                    placeholder="0300-1234567"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>
                    {language === 'ur' ? 'گاہک کی قسم' : 'Customer Category'}
                  </label>
                  <select
                    className="form-control"
                    value={newCustomerData.customerType}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, customerType: e.target.value })}
                  >
                    <option value="Retail">Retail Walk-in (عام گاہک)</option>
                    <option value="Contractor">Contractor / Thekedar (ٹھیکیدار)</option>
                    <option value="Builder">Builder / Developer (بلڈر)</option>
                    <option value="Architect">Architect / Designer (آرکیٹیکٹ)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>
                    {language === 'ur' ? 'سائٹ / ترسیل کا پتہ' : 'Site / Delivery Address'}
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={newCustomerData.address}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                    placeholder="e.g. Main Jhumra Road, Faisalabad"
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsNewCustomerModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  {language === 'ur' ? 'محفوظ کریں' : 'Save & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
