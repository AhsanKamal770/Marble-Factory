import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Calculator,
  Printer,
  UserPlus,
  Layers,
  AlertCircle,
  Truck,
  ChevronDown,
  Search,
  X,
  FileText,
  Percent,
  Wallet,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { db, adjustItemStock, getLiveCashInDrawer } from '../db/index';
import { useLanguage } from '../context/LanguageContext';
import DimensionCalculator from '../components/DimensionCalculator';
import BillPrintModal from '../components/BillPrintModal';

export default function BillingView({ setActiveView, settings }) {
  const { language } = useLanguage();
  const isUrdu = language === 'ur';

  // Master Data
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [liveCash, setLiveCash] = useState(0);

  // Bill Identity
  const [invoiceNo] = useState(`INV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
  const [billDate] = useState(new Date().toLocaleDateString(isUrdu ? 'ur-PK' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }));

  // Customer Selection & Search
  const [selectedCustomer, setSelectedCustomer] = useState(null); // null = Walk-in Cash Sale
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    city: 'Faisalabad / Jhumra',
    customerType: 'Retail',
    address: ''
  });
  const customerDropdownRef = useRef(null);

  // Delivery / Carrier (Progressive Disclosure)
  const [carrierDetails, setCarrierDetails] = useState(null); // null or { method, driverName, vehicleNo, notes }
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({
    method: 'Rickshaw (رکشہ)',
    driverName: '',
    vehicleNo: '',
    notes: ''
  });

  // Line Items
  const [lineItems, setLineItems] = useState([]);
  const [itemToDeleteIndex, setItemToDeleteIndex] = useState(null);

  // Item Entry / Edit Modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [itemModalForm, setItemModalForm] = useState({
    itemId: null,
    name: '',
    category: 'Marble Slab',
    thicknessSutar: 6,
    usageTag: 'Kitchen / Stairs',
    length: 4,
    width: 2.5,
    pieces: 10,
    boxes: 0,
    totalSqFt: 100,
    ratePerSqFt: 380,
    availableStock: 4500
  });

  // Dimension Calculator Modal
  const [isCalcOpen, setIsCalcOpen] = useState(false);

  // Additional Charges & Discount
  const [charges, setCharges] = useState({ carriage: 0, labour: 0, polish: 0, other: 0 });
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [chargeForm, setChargeForm] = useState({ type: 'Carriage (کرایہ)', amount: '' });

  const [discount, setDiscount] = useState({ type: 'fixed', value: 0, reason: '' });
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountForm, setDiscountForm] = useState({ type: 'fixed', value: '', reason: '' });

  const [billNote, setBillNote] = useState('');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteForm, setNoteForm] = useState('');
  const [isChargesMenuOpen, setIsChargesMenuOpen] = useState(false);
  const chargesMenuRef = useRef(null);

  // Payment Settlement
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Pre-Save Review & Save States
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // -------------------------------------------------------------
  // Data Fetching & Internal Keyboard Handlers (Zero UI Clutter)
  // -------------------------------------------------------------
  useEffect(() => {
    loadMasterData();

    const handleClickOutside = (e) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setIsCustomerDropdownOpen(false);
      }
      if (chargesMenuRef.current && !chargesMenuRef.current.contains(e.target)) {
        setIsChargesMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Keyboard handlers run silently without visible UI hints
    const handleKeyDown = (e) => {
      if (e.key === 'F3') {
        e.preventDefault();
        handleOpenAddItemModal();
      } else if (e.key === 'F2') {
        e.preventDefault();
        setIsCustomerDropdownOpen(true);
      } else if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (lineItems.length > 0) setIsReviewModalOpen(true);
      } else if (e.key === 'Escape') {
        setIsItemModalOpen(false);
        setIsCalcOpen(false);
        setIsDeliveryModalOpen(false);
        setIsChargeModalOpen(false);
        setIsDiscountModalOpen(false);
        setIsNoteModalOpen(false);
        setIsReviewModalOpen(false);
        setIsCustomerDropdownOpen(false);
        setItemToDeleteIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lineItems]);

  const loadMasterData = async () => {
    try {
      const allItems = await db.items.toArray();
      const allCustomers = await db.customers.toArray();
      const drawer = await getLiveCashInDrawer();
      setItems(allItems);
      setCustomers(allCustomers);
      setLiveCash(drawer.liveCash || 0);
    } catch (err) {
      console.error('Error loading POS master data:', err);
    }
  };

  // -------------------------------------------------------------
  // Real-time Financial Calculations
  // -------------------------------------------------------------
  const subtotal = lineItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
  const totalCharges = Object.values(charges).reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
  
  let netDiscount = 0;
  if (discount.type === 'percentage') {
    netDiscount = Math.round((subtotal * (parseFloat(discount.value) || 0)) / 100);
  } else {
    netDiscount = parseFloat(discount.value) || 0;
  }

  const grandTotal = Math.max(0, subtotal + totalCharges - netDiscount);
  const numPaid = parseFloat(paidAmount) || 0;
  const balanceDue = Math.max(0, grandTotal - numPaid);

  let paymentStatus = 'Udhar';
  if (numPaid >= grandTotal && grandTotal > 0) {
    paymentStatus = 'Paid';
  } else if (numPaid > 0) {
    paymentStatus = 'Half Paid';
  }

  // Quick Payment Shortcuts
  const handleQuickPayment = (ratio) => {
    setPaidAmount(Math.round(grandTotal * ratio));
  };

  // -------------------------------------------------------------
  // Customer Handlers
  // -------------------------------------------------------------
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearch))
  );

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setIsCustomerDropdownOpen(false);
    setCustomerSearch('');
  };

  const handleCreateNewCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim()) return;

    try {
      const id = await db.customers.add({
        ...newCustomerForm,
        totalBilled: 0,
        totalPaid: 0,
        balanceDue: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const newCust = await db.customers.get(id);
      setCustomers(prev => [...prev, newCust]);
      setSelectedCustomer(newCust);
      setIsNewCustomerModalOpen(false);
      setIsCustomerDropdownOpen(false);
      setNewCustomerForm({ name: '', phone: '', city: 'Faisalabad / Jhumra', customerType: 'Retail', address: '' });
    } catch (err) {
      console.error('Failed to create customer:', err);
    }
  };

  // -------------------------------------------------------------
  // Item Entry / Edit Handlers
  // -------------------------------------------------------------
  const handleOpenAddItemModal = () => {
    const defaultItem = items[0] || {};
    const rate = defaultItem.ratePerSqFt || 380;
    setItemModalForm({
      itemId: defaultItem.id || null,
      name: defaultItem.name || 'Ziarat White Super Slab',
      category: defaultItem.category || 'Marble Slab',
      thicknessSutar: 6,
      usageTag: 'Kitchen / Stairs',
      length: 4,
      width: 2.5,
      pieces: 10,
      boxes: 0,
      totalSqFt: 100,
      ratePerSqFt: rate,
      availableStock: defaultItem.stockSqFt || 4500
    });
    setEditingItemIndex(null);
    setIsItemModalOpen(true);
  };

  const handleOpenEditItemModal = (index) => {
    const item = lineItems[index];
    const matchItem = items.find(i => i.id === item.itemId);
    setItemModalForm({
      ...item,
      availableStock: matchItem ? matchItem.stockSqFt : 4500
    });
    setEditingItemIndex(index);
    setIsItemModalOpen(true);
  };

  const handleItemSelectInModal = (selectedItem) => {
    const rate = selectedItem.ratePerSqFt || 380;
    const isKitchen = selectedItem.thicknessMm === 18;
    setItemModalForm(prev => {
      const sqft = prev.length * prev.width * prev.pieces;
      return {
        ...prev,
        itemId: selectedItem.id,
        name: selectedItem.name,
        category: selectedItem.category,
        thicknessSutar: isKitchen ? 6 : 4,
        usageTag: isKitchen ? 'Kitchen / Stairs' : 'Standard Floor',
        ratePerSqFt: rate,
        availableStock: selectedItem.stockSqFt || 0,
        totalSqFt: sqft,
        amount: Math.round(sqft * rate)
      };
    });
  };

  const handleRecalculateItemModal = (field, val) => {
    setItemModalForm(prev => {
      const next = { ...prev, [field]: val };
      if (['length', 'width', 'pieces'].includes(field)) {
        const l = parseFloat(field === 'length' ? val : next.length) || 0;
        const w = parseFloat(field === 'width' ? val : next.width) || 0;
        const p = parseInt(field === 'pieces' ? val : next.pieces, 10) || 0;
        const sqft = Math.round(l * w * p * 100) / 100;
        next.totalSqFt = sqft;
      }
      const rate = parseFloat(field === 'ratePerSqFt' ? val : next.ratePerSqFt) || 0;
      next.amount = Math.round(next.totalSqFt * rate);
      return next;
    });
  };

  const handleSaveItemModal = () => {
    if (!itemModalForm.itemId && !itemModalForm.name) return;

    const formattedItem = {
      id: editingItemIndex !== null ? lineItems[editingItemIndex].id : `item-${Date.now()}`,
      itemId: itemModalForm.itemId,
      name: itemModalForm.name,
      category: itemModalForm.category,
      thicknessSutar: itemModalForm.thicknessSutar,
      usageTag: itemModalForm.usageTag,
      length: itemModalForm.length,
      width: itemModalForm.width,
      pieces: itemModalForm.pieces,
      boxes: itemModalForm.boxes,
      totalSqFt: itemModalForm.totalSqFt,
      ratePerSqFt: itemModalForm.ratePerSqFt,
      amount: Math.round(itemModalForm.totalSqFt * itemModalForm.ratePerSqFt)
    };

    if (editingItemIndex !== null) {
      const updated = [...lineItems];
      updated[editingItemIndex] = formattedItem;
      setLineItems(updated);
    } else {
      setLineItems([...lineItems, formattedItem]);
    }

    setIsItemModalOpen(false);
  };

  const handleDuplicateItem = (index) => {
    const item = lineItems[index];
    setLineItems([
      ...lineItems,
      {
        ...item,
        id: `item-${Date.now()}`
      }
    ]);
  };

  const handleConfirmDeleteItem = () => {
    if (itemToDeleteIndex !== null) {
      setLineItems(lineItems.filter((_, i) => i !== itemToDeleteIndex));
      setItemToDeleteIndex(null);
    }
  };

  // -------------------------------------------------------------
  // Calculator Callback
  // -------------------------------------------------------------
  const handleApplyDimensionCalc = (calcData) => {
    setItemModalForm(prev => ({
      ...prev,
      length: calcData.length || 4,
      width: calcData.width || 2.5,
      pieces: calcData.pieces || 10,
      boxes: calcData.boxes || 0,
      totalSqFt: calcData.totalSqFt,
      ratePerSqFt: calcData.ratePerSqFt || prev.ratePerSqFt,
      amount: calcData.totalAmount
    }));
    setIsCalcOpen(false);
  };

  // -------------------------------------------------------------
  // Additional Charges Handlers
  // -------------------------------------------------------------
  const handleApplyCharge = (e) => {
    e.preventDefault();
    const amt = parseFloat(chargeForm.amount) || 0;
    if (amt <= 0) return;

    if (chargeForm.type.includes('Carriage')) {
      setCharges(c => ({ ...c, carriage: amt }));
    } else if (chargeForm.type.includes('Labour')) {
      setCharges(c => ({ ...c, labour: amt }));
    } else if (chargeForm.type.includes('Polish')) {
      setCharges(c => ({ ...c, polish: amt }));
    } else {
      setCharges(c => ({ ...c, other: amt }));
    }
    setIsChargeModalOpen(false);
    setChargeForm({ type: 'Carriage (کرایہ)', amount: '' });
  };

  const handleRemoveCharge = (typeKey) => {
    setCharges(c => ({ ...c, [typeKey]: 0 }));
  };

  const handleApplyDiscount = (e) => {
    e.preventDefault();
    const val = parseFloat(discountForm.value) || 0;
    setDiscount({
      type: discountForm.type,
      value: val,
      reason: discountForm.reason
    });
    setIsDiscountModalOpen(false);
  };

  const handleApplyNote = (e) => {
    e.preventDefault();
    setBillNote(noteForm.trim());
    setIsNoteModalOpen(false);
  };

  // -------------------------------------------------------------
  // Final Database Save Execution (Atomic Dexie Transaction)
  // -------------------------------------------------------------
  const handleExecuteSaveInvoice = async () => {
    if (lineItems.length === 0) {
      setErrorMessage(isUrdu ? 'برائے مہربانی کم از کم ایک آئٹم شامل کریں۔' : 'Please add at least one marble item.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');

      const customerName = selectedCustomer ? selectedCustomer.name : (isUrdu ? 'عام خریدار (نقد)' : 'Walk-in Cash Sale');
      const customerPhone = selectedCustomer ? selectedCustomer.phone : '';

      const invoiceData = {
        invoiceNo,
        date: new Date().toISOString(),
        customerId: selectedCustomer ? selectedCustomer.id : null,
        customerName,
        customerPhone,
        carrier: carrierDetails
          ? `${carrierDetails.method} • ${carrierDetails.driverName} (${carrierDetails.vehicleNo})`
          : (isUrdu ? 'فیکٹری گیٹ ڈائریکٹ' : 'Direct Factory Pickup'),
        items: lineItems,
        subtotal,
        carriageCharges: charges.carriage || 0,
        labourCharges: charges.labour || 0,
        polishCharges: charges.polish || 0,
        discountAmount: netDiscount,
        grandTotal,
        paidAmount: numPaid,
        balanceDue,
        paymentStatus,
        paymentMethod,
        notes: billNote,
        createdAt: new Date().toISOString()
      };

      await db.transaction('rw', [db.invoices, db.items, db.customers, db.stock_movements, db.customer_payments], async () => {
        // 1. Add invoice record
        const invId = await db.invoices.add(invoiceData);

        // 2. Adjust physical inventory stock for each stone item
        for (const it of lineItems) {
          if (it.itemId) {
            await adjustItemStock(
              it.itemId,
              -(it.totalSqFt || 0),
              -(it.boxes || 0),
              -(it.pieces || 0),
              'Sale',
              invoiceNo,
              `Sold to ${customerName}`
            );
          }
        }

        // 3. Update customer ledger if registered customer
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

          // 4. Record customer payment voucher
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
              notes: `POS Cash Collection for Invoice #${invoiceNo}`,
              createdAt: new Date().toISOString()
            });
          }
        }
      });

      setCreatedInvoice(invoiceData);
      setIsReviewModalOpen(false);
      setIsPrintModalOpen(true);

      // Clean bill states for next sale
      setLineItems([]);
      setSelectedCustomer(null);
      setCarrierDetails(null);
      setCharges({ carriage: 0, labour: 0, polish: 0, other: 0 });
      setDiscount({ type: 'fixed', value: 0, reason: '' });
      setBillNote('');
      setPaidAmount(0);
    } catch (err) {
      console.error('Error saving invoice:', err);
      setErrorMessage(err.message || 'Transaction failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1440px', margin: '0 auto', paddingBottom: '32px' }}>
      
      {/* ------------------------------------------------------------- */}
      {/* 1. QUIET TOP HEADER                                            */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Left: Back & Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => lineItems.length > 0 ? setIsDiscardModalOpen(true) : setActiveView('dashboard')}
            style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}
            title={isUrdu ? 'واپس جائیں' : 'Back'}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {isUrdu ? 'بل بک و کاؤنٹر سیل' : 'Bill Book / POS'}
            </h2>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              {invoiceNo} • {billDate}
            </div>
          </div>
        </div>

        {/* Right: Quiet Cash Drawer Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <Wallet size={15} style={{ color: '#059669' }} />
          <span>{isUrdu ? 'کیش دراز:' : 'Cash Drawer:'}</span>
          <strong className="font-mono" style={{ color: '#059669', fontSize: '0.88rem' }}>
            Rs. {liveCash.toLocaleString()}
          </strong>
        </div>
      </div>

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
          fontSize: '0.82rem',
          fontWeight: 600
        }}>
          <AlertCircle size={15} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. MAIN POS WORKSPACE: 2-COLUMN ERGONOMIC WORKFLOW            */}
      {/* ------------------------------------------------------------- */}
      <div className="billing-layout-grid">

        {/* =========================================================== */}
        {/* LEFT COLUMN: CUSTOMER, ITEMS & CHARGES                      */}
        {/* =========================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* --------------------------------------------------------- */}
          {/* STEP 1: CUSTOMER SELECTION                                */}
          {/* --------------------------------------------------------- */}
          <div className="dash-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {isUrdu ? 'گاہک' : 'Customer'}
              </span>
            </div>

            {/* Selected Customer Card OR Primary Search Selector */}
            <div ref={customerDropdownRef} style={{ position: 'relative' }}>
              {selectedCustomer ? (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                      {selectedCustomer.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '12px', marginTop: '2px' }}>
                      <span>📞 {selectedCustomer.phone || (isUrdu ? 'فون درج نہیں' : 'No phone')}</span>
                      <span>📍 {selectedCustomer.city || 'Faisalabad'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {Number(selectedCustomer.balanceDue || 0) > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 700 }}>
                          {isUrdu ? 'سابقہ ادھار' : 'Previous Due'}
                        </div>
                        <div className="font-mono" style={{ fontSize: '0.86rem', fontWeight: 800, color: '#dc2626' }}>
                          Rs. {Number(selectedCustomer.balanceDue).toLocaleString()}
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(null)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        color: 'var(--text-secondary)',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                      title="Change customer"
                    >
                      {isUrdu ? 'تبدیل کریں' : 'Change'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    onClick={() => setIsCustomerDropdownOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '9px 12px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease'
                    }}
                  >
                    <Search size={15} style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder={isUrdu ? 'گاہک تلاش کریں یا عام خریدار منتخب کریں...' : 'Search customer or select Walk-in...'}
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setIsCustomerDropdownOpen(true);
                      }}
                      onFocus={() => setIsCustomerDropdownOpen(true)}
                      style={{
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        width: '100%',
                        fontSize: '0.86rem',
                        color: 'var(--text-primary)'
                      }}
                    />
                    <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                  </div>

                  {/* Customer Dropdown Menu with "Create New Customer" inside */}
                  {isCustomerDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '105%',
                      left: 0,
                      right: 0,
                      background: 'var(--bg-card, #FFFFFF)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-lg, 0 10px 25px -5px rgba(15,23,42,0.15))',
                      zIndex: 100,
                      maxHeight: '270px',
                      overflowY: 'auto'
                    }}>
                      {/* Walk-in Cash Sale */}
                      <div
                        onClick={() => handleSelectCustomer(null)}
                        style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(37, 99, 235, 0.03)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover, #F8FAFC)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.03)'}
                      >
                        <div>
                          <strong style={{ fontSize: '0.84rem', color: 'var(--accent-blue)' }}>
                            {isUrdu ? 'عام خریدار (نقد سیل)' : 'Walk-in Cash Sale'}
                          </strong>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {isUrdu ? 'فوری کاؤنٹر ادائیگی' : 'Immediate counter cash sale'}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{isUrdu ? 'منتخب کریں' : 'Select'}</span>
                      </div>

                      {/* Filtered Customer List */}
                      {filteredCustomers.length === 0 ? (
                        <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {isUrdu ? 'کوئی رجسٹرڈ گاہک نہیں ملا' : 'No registered customer found'}
                        </div>
                      ) : (
                        filteredCustomers.map(cust => (
                          <div
                            key={cust.id}
                            onClick={() => handleSelectCustomer(cust)}
                            style={{
                              padding: '10px 14px',
                              borderBottom: '1px solid var(--border-color)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover, #F8FAFC)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div>
                              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {cust.name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {cust.phone || 'No phone'} • {cust.city || 'Faisalabad'}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span className="font-mono" style={{ fontSize: '0.78rem', fontWeight: 700, color: Number(cust.balanceDue) > 0 ? '#dc2626' : 'var(--text-muted)' }}>
                                {Number(cust.balanceDue) > 0 ? `Due: Rs. ${Number(cust.balanceDue).toLocaleString()}` : 'Clear'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}

                      {/* Integrated "Create New Customer" Option in Dropdown */}
                      <div
                        onClick={() => {
                          setIsCustomerDropdownOpen(false);
                          setIsNewCustomerModalOpen(true);
                        }}
                        style={{
                          padding: '10px 14px',
                          background: 'var(--bg-primary, #F8FAFC)',
                          borderTop: '1px solid var(--border-divider, #E5EAF0)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: 'var(--accent-blue)',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-primary, #F8FAFC)'}
                      >
                        <UserPlus size={14} />
                        <span>+ {isUrdu ? 'نیا گاہک رجسٹر کریں' : 'Create New Customer'}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Delivery / Carrier Trigger (Quiet & Secondary) */}
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.76rem' }}>
              {carrierDetails ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 10px',
                  background: 'rgba(37, 99, 235, 0.06)',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                  borderRadius: '99px',
                  color: 'var(--accent-blue)',
                  fontWeight: 600
                }}>
                  <Truck size={13} />
                  <span>{carrierDetails.method} • {carrierDetails.driverName || 'Driver'} ({carrierDetails.vehicleNo || 'Loader'})</span>
                  <button
                    type="button"
                    onClick={() => setIsDeliveryModalOpen(true)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: '0.72rem' }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setCarrierDetails(null)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsDeliveryModalOpen(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '2px 0',
                    transition: 'color 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-blue)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  <Truck size={13} />
                  <span>+ {isUrdu ? 'ڈیلیوری و لوڈر معلومات' : 'Add Delivery'}</span>
                </button>
              )}
            </div>
          </div>

          {/* --------------------------------------------------------- */}
          {/* STEP 2: ITEMS SECTION (Primary Content Area)              */}
          {/* --------------------------------------------------------- */}
          <div className="dash-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {isUrdu ? `آئٹمز (${lineItems.length})` : `ITEMS (${lineItems.length})`}
              </span>

              {/* Main Section Action: + Add Item */}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleOpenAddItemModal}
                style={{ fontWeight: 700, padding: '7px 14px', gap: '6px', borderRadius: '8px' }}
              >
                <Plus size={15} />
                <span>{isUrdu ? '+ آئٹم شامل کریں' : '+ Add Item'}</span>
              </button>
            </div>

            {/* Line Items List */}
            {lineItems.length === 0 ? (
              <div style={{
                padding: '36px 16px',
                textAlign: 'center',
                border: '1px dashed var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-muted)',
                background: 'var(--bg-primary)'
              }}>
                <Layers size={26} style={{ margin: '0 auto 8px', opacity: 0.35 }} />
                <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {isUrdu ? 'کوئی آئٹم درج نہیں ہے۔ "+ آئٹم شامل کریں" پر کلک کریں۔' : 'No items added yet. Click "+ Add Item" to begin.'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {lineItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '13px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'border-color 0.15s ease'
                    }}
                  >
                    {/* Top Row: Name (Left) & Price (Right) */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.96rem', color: 'var(--text-primary)', fontWeight: 800, letterSpacing: '-0.01em' }}>
                          {item.name}
                        </div>
                        {/* Subordinate product metadata */}
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                          {item.thicknessSutar} Sutar • {item.usageTag || 'Standard'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {item.totalSqFt} Sq.Ft × Rs. {item.ratePerSqFt}
                          {item.length && item.width ? ` (${item.length}ft × ${item.width}ft • ${item.pieces} slabs)` : ''}
                        </div>
                      </div>

                      {/* Highly Readable Financial Amount */}
                      <div className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        Rs. {Number(item.amount || 0).toLocaleString()}
                      </div>
                    </div>

                    {/* Bottom Row: Subtle Tertiary Actions (Edit, Duplicate, Remove) */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '16px',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--border-divider, #E5EAF0)',
                      fontSize: '0.74rem'
                    }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditItemModal(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 600,
                          padding: '2px 4px',
                          transition: 'color 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-blue)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                      >
                        <Edit2 size={12} />
                        <span>{isUrdu ? 'ترمیم' : 'Edit'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicateItem(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 600,
                          padding: '2px 4px',
                          transition: 'color 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-blue)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                      >
                        <Copy size={12} />
                        <span>{isUrdu ? 'کاپی' : 'Duplicate'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setItemToDeleteIndex(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 600,
                          padding: '2px 4px',
                          transition: 'color 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <Trash2 size={12} />
                        <span>{isUrdu ? 'حذف' : 'Remove'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* --------------------------------------------------------- */}
          {/* STEP 3: ADDITIONAL CHARGES (Progressive Disclosure)       */}
          {/* --------------------------------------------------------- */}
          {(() => {
            const hasAdditional = (totalCharges > 0 || netDiscount > 0 || Boolean(billNote));

            if (!hasAdditional) {
              return (
                <div className="dash-card" style={{
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: '48px'
                }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {isUrdu ? 'اضافی اخراجات، رعایت یا نوٹ' : 'Additional charges'}
                  </span>
                  
                  <div ref={chargesMenuRef} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setIsChargesMenuOpen(prev => !prev)}
                      style={{ padding: '5px 12px', fontSize: '0.76rem', fontWeight: 600, gap: '4px' }}
                    >
                      <Plus size={13} />
                      <span>{isUrdu ? '+ شامل کریں' : '+ Add'}</span>
                    </button>

                    {/* Popover Menu for Adding Charges / Concessions */}
                    {isChargesMenuOpen && (
                      <div style={{
                        position: 'absolute',
                        right: 0,
                        top: '110%',
                        background: 'var(--bg-card, #FFFFFF)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md, 8px)',
                        boxShadow: 'var(--shadow-lg, 0 10px 25px -5px rgba(15,23,42,0.15))',
                        zIndex: 100,
                        minWidth: '190px',
                        overflow: 'hidden',
                        padding: '4px 0'
                      }}>
                        <div
                          onClick={() => {
                            setIsChargesMenuOpen(false);
                            setIsChargeModalOpen(true);
                          }}
                          style={{
                            padding: '8px 14px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover, #F8FAFC)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Plus size={13} style={{ color: 'var(--accent-blue)' }} />
                          <span>{isUrdu ? 'کرایہ / مزدوری / پالش' : 'Carriage / Labour / Polish'}</span>
                        </div>
                        <div
                          onClick={() => {
                            setIsChargesMenuOpen(false);
                            setIsDiscountModalOpen(true);
                          }}
                          style={{
                            padding: '8px 14px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover, #F8FAFC)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Percent size={13} style={{ color: '#059669' }} />
                          <span>{isUrdu ? 'بل رعایت (Discount)' : 'Discount Concession'}</span>
                        </div>
                        <div
                          onClick={() => {
                            setIsChargesMenuOpen(false);
                            setNoteForm(billNote);
                            setIsNoteModalOpen(true);
                          }}
                          style={{
                            padding: '8px 14px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover, #F8FAFC)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <FileText size={13} style={{ color: 'var(--text-secondary)' }} />
                          <span>{isUrdu ? 'خصوصی ہدایات / نوٹ' : 'Special Note / Remark'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // Expanded state when charges/discount/note are active
            return (
              <div className="dash-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {isUrdu ? 'اضافی اخراجات و رعایت' : 'Additional Charges'}
                  </span>

                  <div ref={chargesMenuRef} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setIsChargesMenuOpen(prev => !prev)}
                      style={{ padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, gap: '4px' }}
                    >
                      <Plus size={12} />
                      <span>{isUrdu ? '+ مزید شامل کریں' : '+ Add More'}</span>
                    </button>

                    {/* Popover Menu for Adding More */}
                    {isChargesMenuOpen && (
                      <div style={{
                        position: 'absolute',
                        right: 0,
                        top: '110%',
                        background: 'var(--bg-card, #FFFFFF)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md, 8px)',
                        boxShadow: 'var(--shadow-lg, 0 10px 25px -5px rgba(15,23,42,0.15))',
                        zIndex: 100,
                        minWidth: '190px',
                        overflow: 'hidden',
                        padding: '4px 0'
                      }}>
                        <div
                          onClick={() => {
                            setIsChargesMenuOpen(false);
                            setIsChargeModalOpen(true);
                          }}
                          style={{ padding: '8px 14px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover, #F8FAFC)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Plus size={13} style={{ color: 'var(--accent-blue)' }} />
                          <span>{isUrdu ? 'کرایہ / مزدوری / پالش' : 'Carriage / Labour / Polish'}</span>
                        </div>
                        <div
                          onClick={() => {
                            setIsChargesMenuOpen(false);
                            setIsDiscountModalOpen(true);
                          }}
                          style={{ padding: '8px 14px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover, #F8FAFC)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Percent size={13} style={{ color: '#059669' }} />
                          <span>{isUrdu ? 'بل رعایت (Discount)' : 'Discount Concession'}</span>
                        </div>
                        <div
                          onClick={() => {
                            setIsChargesMenuOpen(false);
                            setNoteForm(billNote);
                            setIsNoteModalOpen(true);
                          }}
                          style={{ padding: '8px 14px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover, #F8FAFC)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <FileText size={13} style={{ color: 'var(--text-secondary)' }} />
                          <span>{isUrdu ? 'خصوصی ہدایات / نوٹ' : 'Special Note / Remark'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Charge Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {charges.carriage > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--bg-primary)', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>🚚 {isUrdu ? 'کرایہ' : 'Carriage'}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>+ Rs. {charges.carriage.toLocaleString()}</strong>
                        <button type="button" onClick={() => handleRemoveCharge('carriage')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}><X size={13} /></button>
                      </div>
                    </div>
                  )}

                  {charges.labour > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--bg-primary)', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>💪 {isUrdu ? 'مزدوری' : 'Labour'}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>+ Rs. {charges.labour.toLocaleString()}</strong>
                        <button type="button" onClick={() => handleRemoveCharge('labour')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}><X size={13} /></button>
                      </div>
                    </div>
                  )}

                  {charges.polish > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', padding: '6px 10px', background: 'var(--bg-primary)', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>✨ {isUrdu ? 'پالش و کٹنگ' : 'Polishing & Cutting'}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>+ Rs. {charges.polish.toLocaleString()}</strong>
                        <button type="button" onClick={() => handleRemoveCharge('polish')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}><X size={13} /></button>
                      </div>
                    </div>
                  )}

                  {netDiscount > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', padding: '6px 10px', background: 'rgba(220, 38, 38, 0.05)', borderRadius: '6px' }}>
                      <span style={{ color: '#dc2626', fontWeight: 600 }}>🏷️ {isUrdu ? 'رعایت' : `Discount (${discount.reason || 'Concession'})`}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong className="font-mono" style={{ color: '#dc2626' }}>- Rs. {netDiscount.toLocaleString()}</strong>
                        <button type="button" onClick={() => setDiscount({ type: 'fixed', value: 0, reason: '' })} style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}><X size={13} /></button>
                      </div>
                    </div>
                  )}

                  {billNote && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>📝 {billNote}</span>
                      <button type="button" onClick={() => setBillNote('')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}><X size={12} /></button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

        </div>

        {/* =========================================================== */}
        {/* RIGHT COLUMN: STICKY BILL SUMMARY & PAYMENT PANEL           */}
        {/* =========================================================== */}
        <div style={{
          position: 'sticky',
          top: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>

          <div className="dash-card" style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            
            {/* 1. BILL TOTAL (The Dominant Financial Value) */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {isUrdu ? 'کل رقم' : 'BILL TOTAL'}
              </div>
              <div className="font-mono" style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginTop: '2px' }}>
                Rs. {grandTotal.toLocaleString()}
              </div>

              {/* Subtotal & Charges Breakdown (Quiet supporting text) */}
              {(totalCharges > 0 || netDiscount > 0) && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '8px' }}>
                  <span>Subtotal: Rs. {subtotal.toLocaleString()}</span>
                  {totalCharges > 0 && <span>• Charges: +Rs. {totalCharges.toLocaleString()}</span>}
                  {netDiscount > 0 && <span>• Disc: -Rs. {netDiscount.toLocaleString()}</span>}
                </div>
              )}
            </div>

            {/* 2. PAYMENT MODE (Clean Segmented Control) */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
                {isUrdu ? 'ادائیگی طریقہ' : 'PAYMENT'}
              </label>

              {(() => {
                const isFull = (numPaid === grandTotal && grandTotal > 0);
                const isHalf = (numPaid === Math.round(grandTotal * 0.5) && numPaid > 0 && grandTotal > 0 && !isFull);
                const isUdhar = (numPaid === 0);

                return (
                  <div className="pos-segmented-control">
                    <button
                      type="button"
                      className={`pos-segment-btn ${isFull ? 'active' : ''}`}
                      onClick={() => handleQuickPayment(1.0)}
                    >
                      {isUrdu ? 'مکمل نقد' : 'Full'}
                    </button>
                    <button
                      type="button"
                      className={`pos-segment-btn ${isHalf ? 'active' : ''}`}
                      onClick={() => handleQuickPayment(0.5)}
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      className={`pos-segment-btn ${isUdhar ? 'active-udhar' : ''}`}
                      onClick={() => handleQuickPayment(0)}
                    >
                      {isUrdu ? 'ادھار' : 'Udhar'}
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* 3. AMOUNT PAYING (Editable Numeric Input) */}
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px', display: 'block' }}>
                {isUrdu ? 'ادا کی جانے والی رقم' : 'Amount Paying'}
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Rs.
                </span>
                <input
                  type="number"
                  min="0"
                  max={grandTotal}
                  value={paidAmount || ''}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="form-control font-mono"
                  style={{
                    paddingLeft: '38px',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    height: '42px',
                    borderRadius: '8px'
                  }}
                  placeholder="0"
                />
              </div>
            </div>

            {/* 4. DUE (Clean Secondary Stat) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                {isUrdu ? 'بقایا ادھار' : 'Due'}
              </span>
              <strong className="font-mono" style={{
                color: balanceDue > 0 ? '#dc2626' : '#059669',
                fontSize: '1rem',
                fontWeight: 800
              }}>
                Rs. {balanceDue.toLocaleString()}
              </strong>
            </div>

            {/* 5. PAYMENT METHOD */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {isUrdu ? 'طریقہ ادائیگی' : 'Payment Method'}
              </label>
              <select
                className="form-control"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ fontWeight: 600, height: '38px', borderRadius: '8px', fontSize: '0.84rem' }}
              >
                <option value="Cash">{isUrdu ? 'نقد دراز کیش' : 'Cash in Drawer'}</option>
                <option value="Bank Transfer">{isUrdu ? 'بینک ٹرانسفر' : 'Bank Transfer'}</option>
                <option value="JazzCash">JazzCash</option>
                <option value="Easypaisa">Easypaisa</option>
              </select>
            </div>

            {/* 6. PRIMARY CTA: SAVE & PRINT BILL (Dominant Single Focus) */}
            <button
              type="button"
              className="btn btn-primary"
              disabled={lineItems.length === 0 || isSaving}
              onClick={() => setIsReviewModalOpen(true)}
              style={{
                padding: '13px',
                fontSize: '0.96rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderRadius: '10px',
                marginTop: '4px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)'
              }}
            >
              <Printer size={17} />
              <span>{isUrdu ? 'محفوظ و پرنٹ کریں' : 'SAVE & PRINT BILL'}</span>
            </button>

            {/* 7. SECONDARY ACTIONS: Save Draft & Cancel (Quiet Tertiary Text Links) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '2px' }}>
              <button
                type="button"
                onClick={() => alert(isUrdu ? 'ڈرافٹ محفوظ ہو گیا۔' : 'Bill draft saved.')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 6px',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                {isUrdu ? 'ڈرافٹ محفوظ' : 'Save Draft'}
              </button>
              <span style={{ color: 'var(--border-divider, #E5EAF0)' }}>|</span>
              <button
                type="button"
                onClick={() => setIsDiscardModalOpen(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 6px',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                {isUrdu ? 'کینسل' : 'Cancel'}
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. MODALS (POPUPS HANDLE ALL SECONDARY COMPLEXITY)            */}
      {/* ------------------------------------------------------------- */}

      {/* MODAL 1: ADD / EDIT ITEM MODAL */}
      {isItemModalOpen && (
        <div className="modal-overlay" onClick={() => setIsItemModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '0.98rem', fontWeight: 800 }}>
                {editingItemIndex !== null ? (isUrdu ? 'آئٹم میں ترمیم' : 'Edit Marble / Tile Item') : (isUrdu ? 'آئٹم شامل کریں' : 'Add Marble / Tile Item')}
              </h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsItemModalOpen(false)} style={{ padding: '3px' }}>
                <X size={15} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Stone Selection */}
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {isUrdu ? 'ماربل ورائٹی' : 'Select Stone Variety'}
                </label>
                <select
                  className="form-control"
                  value={itemModalForm.itemId || ''}
                  onChange={(e) => {
                    const sel = items.find(i => i.id === parseInt(e.target.value, 10));
                    if (sel) handleItemSelectInModal(sel);
                  }}
                  style={{ fontWeight: 700 }}
                >
                  {items.map(it => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.category}) • Stock: {it.stockSqFt} Sq.Ft • Rs.{it.ratePerSqFt}/Sq.Ft
                    </option>
                  ))}
                </select>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginTop: '4px', color: 'var(--text-muted)' }}>
                  <span>Available Stock: <strong className="font-mono" style={{ color: itemModalForm.availableStock < 500 ? '#dc2626' : '#059669' }}>{itemModalForm.availableStock.toLocaleString()} Sq.Ft</strong></span>
                  <span>{itemModalForm.category}</span>
                </div>
              </div>

              {/* Sutar Thickness Classification */}
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {isUrdu ? 'موٹائی (سوتر)' : 'Thickness (Sutar)'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[
                    { sutar: 4, mm: '12mm', label: '4 Sutar', tag: 'Standard Floor' },
                    { sutar: 6, mm: '18mm', label: '6 Sutar', tag: 'Kitchen / Stairs' },
                    { sutar: 9, mm: '28mm', label: '9 Sutar', tag: 'Heavy Steps' },
                    { sutar: 14, mm: '44mm', label: '14 Sutar', tag: 'Heavy Base' }
                  ].map(thick => (
                    <button
                      key={thick.sutar}
                      type="button"
                      onClick={() => setItemModalForm(prev => ({ ...prev, thicknessSutar: thick.sutar, usageTag: thick.tag }))}
                      style={{
                        padding: '6px 4px',
                        borderRadius: 'var(--radius-sm)',
                        border: itemModalForm.thicknessSutar === thick.sutar ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                        background: itemModalForm.thicknessSutar === thick.sutar ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-primary)',
                        color: itemModalForm.thicknessSutar === thick.sutar ? 'var(--accent-blue)' : 'var(--text-primary)',
                        textAlign: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.78rem' }}>{thick.label}</div>
                      <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>{thick.mm}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dimensions (Length, Width, Slabs) */}
              <div style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {isUrdu ? 'پیمائش' : 'Dimensions'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCalcOpen(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-blue)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: 0
                    }}
                  >
                    <Calculator size={13} />
                    <span>{isUrdu ? 'کیلکولیٹر' : 'Calculator'}</span>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Length (ft)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control form-control-sm font-mono"
                      value={itemModalForm.length}
                      onChange={(e) => handleRecalculateItemModal('length', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Width (ft)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control form-control-sm font-mono"
                      value={itemModalForm.width}
                      onChange={(e) => handleRecalculateItemModal('width', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Quantity (slabs)</label>
                    <input
                      type="number"
                      step="1"
                      className="form-control form-control-sm font-mono"
                      value={itemModalForm.pieces}
                      onChange={(e) => handleRecalculateItemModal('pieces', e.target.value)}
                    />
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '10px',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--border-color)',
                  fontSize: '0.78rem'
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Area:</span>
                  <span className="font-mono" style={{ fontWeight: 800, color: 'var(--accent-blue)', fontSize: '0.9rem' }}>
                    {itemModalForm.totalSqFt} Sq.Ft
                  </span>
                </div>
              </div>

              {/* Rate & Subtotal */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Rate / Sq.Ft (Rs.)
                  </label>
                  <input
                    type="number"
                    className="form-control form-control-sm font-mono"
                    value={itemModalForm.ratePerSqFt}
                    onChange={(e) => handleRecalculateItemModal('ratePerSqFt', e.target.value)}
                    style={{ fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Subtotal (Rs.)
                  </label>
                  <div className="font-mono" style={{
                    padding: '6px 10px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    color: 'var(--text-primary)'
                  }}>
                    Rs. {(itemModalForm.totalSqFt * itemModalForm.ratePerSqFt).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Stock Warning if requested > stock */}
              {itemModalForm.totalSqFt > itemModalForm.availableStock && (
                <div style={{
                  padding: '8px 10px',
                  background: 'rgba(217, 119, 6, 0.08)',
                  border: '1px solid rgba(217, 119, 6, 0.25)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#b45309',
                  fontSize: '0.74rem'
                }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  <span>
                    Only {itemModalForm.availableStock} Sq.Ft in stock. Requested: {itemModalForm.totalSqFt} Sq.Ft.
                  </span>
                </div>
              )}

            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsItemModalOpen(false)}>
                {isUrdu ? 'منسوخ' : 'Cancel'}
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveItemModal} style={{ fontWeight: 700 }}>
                {editingItemIndex !== null ? (isUrdu ? 'محفوظ کریں' : 'Update Item') : (isUrdu ? 'آئٹم شامل کریں' : 'Add Item')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTER NEW CUSTOMER */}
      {isNewCustomerModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNewCustomerModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '0.96rem', fontWeight: 800 }}>
                {isUrdu ? 'نیا گاہک رجسٹر کریں' : 'New Customer'}
              </h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsNewCustomerModalOpen(false)} style={{ padding: '3px' }}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleCreateNewCustomer}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control form-control-sm"
                    value={newCustomerForm.name}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                    placeholder="e.g. Mian Rashid Builder"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Phone</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                    placeholder="0300-1234567"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>City</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={newCustomerForm.city}
                      onChange={(e) => setNewCustomerForm({ ...newCustomerForm, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Type</label>
                    <select
                      className="form-control form-control-sm"
                      value={newCustomerForm.customerType}
                      onChange={(e) => setNewCustomerForm({ ...newCustomerForm, customerType: e.target.value })}
                    >
                      <option value="Retail">Retail</option>
                      <option value="Builder / Contractor">Builder / Contractor</option>
                      <option value="Wholesaler">Wholesaler</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsNewCustomerModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELIVERY DETAILS */}
      {isDeliveryModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDeliveryModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '0.96rem', fontWeight: 800 }}>
                {isUrdu ? 'ڈیلیوری تفصیلات' : 'Delivery Details'}
              </h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsDeliveryModalOpen(false)} style={{ padding: '3px' }}>
                <X size={15} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Method</label>
                <select
                  className="form-control form-control-sm"
                  value={deliveryForm.method}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, method: e.target.value })}
                >
                  <option value="Rickshaw (رکشہ)">Rickshaw (رکشہ)</option>
                  <option value="Pickup">Pickup (Factory Gate)</option>
                  <option value="Truck / Shahzor">Truck / Shahzor (ڈالہ)</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Carrier / Driver</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={deliveryForm.driverName}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, driverName: e.target.value })}
                  placeholder="e.g. Aslam"
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Vehicle #</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={deliveryForm.vehicleNo}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, vehicleNo: e.target.value })}
                  placeholder="e.g. FSD-4821"
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Destination / Notes</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={deliveryForm.notes}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, notes: e.target.value })}
                  placeholder="e.g. Site near Jhumra canal"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsDeliveryModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setCarrierDetails({ ...deliveryForm });
                  setIsDeliveryModalOpen(false);
                }}
                style={{ fontWeight: 700 }}
              >
                Save Delivery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD CHARGE */}
      {isChargeModalOpen && (
        <div className="modal-overlay" onClick={() => setIsChargeModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '380px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '0.94rem', fontWeight: 800 }}>
                {isUrdu ? 'اضافی خرچہ' : 'Add Charge'}
              </h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsChargeModalOpen(false)} style={{ padding: '3px' }}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleApplyCharge}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Type</label>
                  <select
                    className="form-control form-control-sm"
                    value={chargeForm.type}
                    onChange={(e) => setChargeForm({ ...chargeForm, type: e.target.value })}
                  >
                    <option value="Carriage (کرایہ)">Carriage / Freight (کرایہ)</option>
                    <option value="Labour (مزدوری)">Labour / Loading (مزدوری)</option>
                    <option value="Polish (پالش)">Polishing & Edge Cutting (پالش)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Amount (Rs.) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="form-control form-control-sm font-mono"
                    value={chargeForm.amount}
                    onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })}
                    placeholder="e.g. 2000"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsChargeModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
                  Add Charge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: ADD DISCOUNT */}
      {isDiscountModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDiscountModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '380px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '0.94rem', fontWeight: 800 }}>
                {isUrdu ? 'رعایت' : 'Discount'}
              </h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsDiscountModalOpen(false)} style={{ padding: '3px' }}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleApplyDiscount}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setDiscountForm({ ...discountForm, type: 'fixed' })}
                    style={{
                      padding: '6px',
                      borderRadius: 'var(--radius-sm)',
                      border: discountForm.type === 'fixed' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                      background: discountForm.type === 'fixed' ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-primary)',
                      fontSize: '0.74rem',
                      fontWeight: 700
                    }}
                  >
                    Amount (Rs.)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountForm({ ...discountForm, type: 'percentage' })}
                    style={{
                      padding: '6px',
                      borderRadius: 'var(--radius-sm)',
                      border: discountForm.type === 'percentage' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                      background: discountForm.type === 'percentage' ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-primary)',
                      fontSize: '0.74rem',
                      fontWeight: 700
                    }}
                  >
                    Percentage (%)
                  </button>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {discountForm.type === 'fixed' ? 'Amount (Rs.)' : 'Percentage (%)'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="form-control form-control-sm font-mono"
                    value={discountForm.value}
                    onChange={(e) => setDiscountForm({ ...discountForm, value: e.target.value })}
                    placeholder={discountForm.type === 'fixed' ? 'e.g. 1500' : 'e.g. 5'}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Reason (Optional)</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={discountForm.reason}
                    onChange={(e) => setDiscountForm({ ...discountForm, reason: e.target.value })}
                    placeholder="e.g. Concession"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsDiscountModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
                  Apply Discount
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: BILL NOTE */}
      {isNoteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNoteModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '0.94rem', fontWeight: 800 }}>
                {isUrdu ? 'بل پر نوٹ' : 'Bill Note'}
              </h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsNoteModalOpen(false)} style={{ padding: '3px' }}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleApplyNote}>
              <div className="modal-body">
                <textarea
                  className="form-control"
                  rows={3}
                  value={noteForm}
                  onChange={(e) => setNoteForm(e.target.value)}
                  placeholder="e.g. Deliver to site near Jhumra canal bridge..."
                  style={{ fontSize: '0.82rem' }}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsNoteModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: DELETE ITEM CONFIRMATION */}
      {itemToDeleteIndex !== null && (
        <div className="modal-overlay" onClick={() => setItemToDeleteIndex(null)}>
          <div className="modal-card" style={{ maxWidth: '380px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
                <AlertTriangle size={18} />
                <h3 className="modal-title" style={{ fontSize: '0.96rem', fontWeight: 800, color: '#dc2626' }}>
                  {isUrdu ? 'آئٹم حذف کریں؟' : 'Remove Item?'}
                </h3>
              </div>
            </div>
            <div className="modal-body" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Are you sure you want to remove <strong>{lineItems[itemToDeleteIndex]?.name}</strong> ({lineItems[itemToDeleteIndex]?.totalSqFt} Sq.Ft) from this bill?
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setItemToDeleteIndex(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleConfirmDeleteItem}
                style={{ background: '#dc2626', color: '#ffffff', fontWeight: 700 }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: BILL READY REVIEW & CONFIRMATION */}
      {isReviewModalOpen && (
        <div className="modal-overlay" onClick={() => setIsReviewModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ fontSize: '1rem', fontWeight: 800 }}>
                  {isUrdu ? 'بل جائزہ و تصدیق' : 'Bill Review'}
                </h3>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {invoiceNo} • {selectedCustomer ? selectedCustomer.name : 'Walk-in Cash Sale'}
                </div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsReviewModalOpen(false)} style={{ padding: '3px' }}>
                <X size={15} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Financial Summary Box */}
              <div style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '0.82rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Items:</span>
                  <strong>{lineItems.length} items ({lineItems.reduce((acc, i) => acc + (parseFloat(i.totalSqFt) || 0), 0)} Sq.Ft)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total:</span>
                  <strong className="font-mono">Rs. {grandTotal.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                  <span>Amount Paid ({paymentMethod}):</span>
                  <strong className="font-mono">Rs. {numPaid.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: balanceDue > 0 ? '#dc2626' : 'var(--text-muted)' }}>
                  <span>Remaining Due:</span>
                  <strong className="font-mono">Rs. {balanceDue.toLocaleString()}</strong>
                </div>
              </div>

              {/* Inventory & Cash Impacts */}
              <div style={{
                padding: '10px 12px',
                borderRadius: '6px',
                background: 'rgba(37, 99, 235, 0.05)',
                border: '1px solid rgba(37, 99, 235, 0.15)',
                fontSize: '0.74rem',
                color: 'var(--text-primary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} style={{ color: 'var(--accent-blue)' }} />
                  <span><strong>Inventory:</strong> Automatic stock deduction across {lineItems.length} items.</span>
                </div>
                {paymentMethod === 'Cash' && numPaid > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Wallet size={14} style={{ color: '#059669' }} />
                    <span><strong>Cash Drawer:</strong> +Rs. {numPaid.toLocaleString()} added to live drawer.</span>
                  </div>
                )}
              </div>

            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsReviewModalOpen(false)}>
                ← Back
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={isSaving}
                onClick={handleExecuteSaveInvoice}
                style={{ fontWeight: 800, padding: '7px 16px' }}
              >
                {isSaving ? 'Saving...' : (isUrdu ? 'محفوظ کریں' : 'Confirm & Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 9: UNSAVED CHANGES / DISCARD WARNING */}
      {isDiscardModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDiscardModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '380px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '0.96rem', fontWeight: 800 }}>
                {isUrdu ? 'غیر محفوظ بل' : 'Unsaved Bill'}
              </h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsDiscardModalOpen(false)}>
                <X size={15} />
              </button>
            </div>
            <div className="modal-body" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {isUrdu
                ? 'اس بل میں آئٹمز موجود ہیں۔ کیا آپ چھوڑ کر جانا چاہتے ہیں؟'
                : 'You have unfinished items in this bill. Do you want to leave?'}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setIsDiscardModalOpen(false);
                  setActiveView('dashboard');
                }}
                style={{ color: '#dc2626' }}
              >
                Leave
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setIsDiscardModalOpen(false);
                }}
              >
                Continue Editing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIMENSION CALCULATOR COMPONENT */}
      <DimensionCalculator
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
        onApply={handleApplyDimensionCalc}
        initialItem={itemModalForm}
      />

      {/* BILL PRINT MODAL COMPONENT (Authentic A4 Replica & 80mm Thermal Receipt Slip) */}
      <BillPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setCreatedInvoice(null);
        }}
        invoice={createdInvoice}
        settings={settings}
      />

    </div>
  );
}
