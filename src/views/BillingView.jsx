import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
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
  ShieldCheck,
  Info,
  DollarSign,
  Save,
  Filter,
  Boxes,
  CreditCard,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { db, adjustItemStock, getLiveCashInDrawer } from '../db/index';
import { useLanguage } from '../context/LanguageContext';
import DimensionCalculator from '../components/DimensionCalculator';
import BillPrintModal from '../components/BillPrintModal';
import BillProfitPrintModal from '../components/BillProfitPrintModal';
import CustomerProfileModal from '../modules/mod_05_customer_ledger/CustomerProfileModal';
import { saveCustomer } from '../modules/mod_05_customer_ledger/customerLedgerService';
import { getEffectiveCategoryConfig } from '../services/categoryService';

export default function BillingView({ setActiveView, settings, editingInvoice = null, onClearEditingInvoice }) {
  const { language } = useLanguage();
  const isUrdu = language === 'ur';

  // Live KPI Queries for Dashboard-Consistent Metrics Strip
  const allLiveInvoices = useLiveQuery(() => db.invoices.toArray(), []) || [];
  const allLiveCustomers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const allLiveItems = useLiveQuery(() => db.items.toArray(), []) || [];
  const allLivePayments = useLiveQuery(() => db.customer_payments.toArray(), []) || [];
  const allLiveExpenses = useLiveQuery(() => db.daily_expenses.toArray(), []) || [];
  const customCategories = useLiveQuery(() => {
    if (!db.categories) return [];
    return db.categories.toArray();
  }, []) || [];

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const todaySalesTotal = useMemo(() => {
    return allLiveInvoices.filter(inv => (inv.createdAt || inv.date || '').slice(0, 10) === todayStr)
      .reduce((s, inv) => s + Number(inv.grandTotal || 0), 0);
  }, [allLiveInvoices, todayStr]);

  const totalCustomerDues = useMemo(() => {
    return allLiveCustomers.reduce((s, c) => s + Number(c.balanceDue || 0), 0);
  }, [allLiveCustomers]);

  const totalYardStock = useMemo(() => {
    return allLiveItems.reduce((s, it) => s + Number(it.stockSqFt || 0), 0);
  }, [allLiveItems]);

  const liveDrawerData = useLiveQuery(() => getLiveCashInDrawer(), [allLiveInvoices.length, allLivePayments.length, allLiveExpenses.length]) || { liveCash: 0 };

  // Master Data (Directly reactive to Live DB)
  const items = allLiveItems;
  const customers = allLiveCustomers;
  const [liveCash, setLiveCash] = useState(0);

  // Bill Identity
  const generateFreshInvoiceNo = () => `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
  const formatDisplayDate = (dateVal = new Date()) => new Date(dateVal).toLocaleDateString(isUrdu ? 'ur-PK' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const [invoiceNo, setInvoiceNo] = useState(generateFreshInvoiceNo);
  const [originalInvoice, setOriginalInvoice] = useState(null);
  const [justFinishedEdit, setJustFinishedEdit] = useState(false);
  const isEditMode = Boolean(originalInvoice && originalInvoice.id);
  const [billDate, setBillDate] = useState(() => new Date().toLocaleDateString(isUrdu ? 'ur-PK' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }));

  // Customer Selection & Search
  const [selectedCustomer, setSelectedCustomer] = useState(null); // null = Walk-in Cash Sale
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
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
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [itemCategoryFilter, setItemCategoryFilter] = useState('ALL');
  const [selectedSizePreset, setSelectedSizePreset] = useState(null);
  const [itemModalForm, setItemModalForm] = useState({
    itemId: null,
    name: '',
    category: 'Marble',
    subCategory: '',
    thicknessSutar: 4,
    usageTag: 'Standard Floor',
    length: 1,
    width: 1,
    pieces: 10,
    boxes: 0,
    meters: 2,
    runningFeet: 10,
    totalSqFt: 10,
    ratePerSqFt: 180,
    availableStock: 3800,
    unit: 'Sq. Ft.'
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
  const [applyAdvance, setApplyAdvance] = useState(true);
  const [appliedAdvanceAmount, setAppliedAdvanceAmount] = useState(0);

  // Pre-Save Review & Save States
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isProfitModalOpen, setIsProfitModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const resetBillForm = () => {
    setOriginalInvoice(null);
    setInvoiceNo(generateFreshInvoiceNo());
    setBillDate(formatDisplayDate());
    setLineItems([]);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setCarrierDetails(null);
    setDeliveryForm({ method: 'Rickshaw (رکشہ)', driverName: '', vehicleNo: '', notes: '' });
    setCharges({ carriage: 0, labour: 0, polish: 0, other: 0 });
    setDiscount({ type: 'fixed', value: 0, reason: '' });
    setBillNote('');
    setPaidAmount(0);
    setPaymentMethod('Cash');
    setApplyAdvance(true);
    setAppliedAdvanceAmount(0);
    setErrorMessage('');
  };

  useEffect(() => {
    let active = true;
    const hydrateEditingInvoice = async () => {
      if (!editingInvoice) {
        if (originalInvoice) {
          resetBillForm();
        }
        return;
      }

      setJustFinishedEdit(false);
      const freshInv = editingInvoice.id
        ? (await db.invoices.get(editingInvoice.id)) || editingInvoice
        : editingInvoice;
      if (!active) return;

      setOriginalInvoice(freshInv);
      setInvoiceNo(freshInv.invoiceNo || generateFreshInvoiceNo());
      setBillDate(formatDisplayDate(freshInv.date || freshInv.createdAt || new Date()));

      if (freshInv.customerId) {
        let cust = await db.customers.get(Number(freshInv.customerId));
        if (!cust) cust = await db.customers.get(freshInv.customerId);
        if (!cust) {
          const allCust = await db.customers.toArray();
          cust = allCust.find(c => String(c.id) === String(freshInv.customerId));
        }
        if (active) {
          setSelectedCustomer(cust || {
            id: freshInv.customerId,
            name: freshInv.customerName || '',
            phone: freshInv.customerPhone || '',
            advanceBalance: 0,
            balanceDue: 0
          });
          setCustomerSearch('');
        }
      } else {
        setSelectedCustomer(null);
        setCustomerSearch('');
      }

      if (freshInv.carrierDetails && (freshInv.carrierDetails.driverName || freshInv.carrierDetails.vehicleNo || freshInv.carrierDetails.method)) {
        setCarrierDetails(freshInv.carrierDetails);
        setDeliveryForm({
          method: freshInv.carrierDetails.method || 'Rickshaw (رکشہ)',
          driverName: freshInv.carrierDetails.driverName || '',
          vehicleNo: freshInv.carrierDetails.vehicleNo || '',
          notes: freshInv.carrierDetails.notes || ''
        });
      } else if (freshInv.carrier && freshInv.carrier !== 'Direct Factory Pickup' && freshInv.carrier !== 'فیکٹری گیٹ ڈائریکٹ') {
        const matchCarrier = freshInv.carrier.match(/^(.+?)\s*•\s*(.*?)\s*\((.*?)\)\s*$/);
        const parsed = matchCarrier
          ? { method: matchCarrier[1].trim(), driverName: matchCarrier[2].trim(), vehicleNo: matchCarrier[3].trim(), notes: '' }
          : { method: 'Rickshaw (رکشہ)', driverName: freshInv.carrier, vehicleNo: '', notes: '' };
        setCarrierDetails(parsed);
        setDeliveryForm(parsed);
      } else {
        setCarrierDetails(null);
        setDeliveryForm({ method: 'Rickshaw (رکشہ)', driverName: '', vehicleNo: '', notes: '' });
      }

      const hydratedItems = (freshInv.items || []).map((it, idx) => ({
        ...it,
        id: it.id || `item-edit-${Date.now()}-${idx}`
      }));
      setLineItems(hydratedItems);

      setCharges({
        carriage: Number(freshInv.carriageCharges || 0),
        labour: Number(freshInv.labourCharges || 0),
        polish: Number(freshInv.polishCharges || 0),
        other: Number(freshInv.otherCharges || 0)
      });
      const discAmt = Number(freshInv.discountAmount || 0);
      setDiscount({
        type: 'fixed',
        value: discAmt,
        reason: freshInv.discountReason || (discAmt > 0 ? 'Direct Bill Discount' : '')
      });
      setBillNote(freshInv.notes || '');

      const origAdvApplied = Number(freshInv.appliedAdvance || 0);
      setApplyAdvance(origAdvApplied > 0);
      setAppliedAdvanceAmount(origAdvApplied);
      setPaidAmount(Number(freshInv.paidAmount || 0));

      const rawPm = (freshInv.paymentMethod || 'Cash').toString();
      if (rawPm.includes('Bank Transfer')) {
        setPaymentMethod('Bank Transfer');
      } else if (rawPm.includes('Card')) {
        setPaymentMethod('Card');
      } else {
        setPaymentMethod('Cash');
      }

      setCreatedInvoice(null);
      setErrorMessage('');
    };

    hydrateEditingInvoice();
    return () => { active = false; };
  }, [editingInvoice]);

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
      const drawer = await getLiveCashInDrawer();
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
  const billTotalBeforeDiscount = subtotal + totalCharges;

  let netDiscount = 0;
  if (discount.type === 'percentage') {
    netDiscount = Math.round((subtotal * (parseFloat(discount.value) || 0)) / 100);
  } else {
    netDiscount = parseFloat(discount.value) || 0;
  }
  // Cap discount so it cannot exceed the bill total
  netDiscount = Math.min(billTotalBeforeDiscount, Math.max(0, netDiscount));

  // Auto-sync applied advance amount with available customer advance
  const grandTotal = Math.max(0, billTotalBeforeDiscount - netDiscount);
  const sameCustomerAsOriginal = Boolean(isEditMode && selectedCustomer && originalInvoice?.customerId && String(selectedCustomer.id) === String(originalInvoice.customerId));
  const restoredOriginalAdvance = sameCustomerAsOriginal ? Number(originalInvoice.appliedAdvance || 0) : 0;
  const customerAdvanceAvailable = Number(selectedCustomer?.advanceBalance || 0) + restoredOriginalAdvance;

  useEffect(() => {
    if (selectedCustomer && customerAdvanceAvailable > 0 && applyAdvance) {
      const maxApp = Math.min(grandTotal, customerAdvanceAvailable);
      setAppliedAdvanceAmount(maxApp);
    } else {
      setAppliedAdvanceAmount(0);
    }
  }, [selectedCustomer?.id, customerAdvanceAvailable, grandTotal, applyAdvance]);

  // Auto-cap applied advance to available balance & grand total
  const defaultAdvanceToApply = Math.min(grandTotal, customerAdvanceAvailable);
  const effectiveAppliedAdvance = (applyAdvance && customerAdvanceAvailable > 0)
    ? (appliedAdvanceAmount !== undefined && appliedAdvanceAmount !== '' && Number(appliedAdvanceAmount) > 0
        ? Math.min(grandTotal, customerAdvanceAvailable, Number(appliedAdvanceAmount))
        : defaultAdvanceToApply)
    : 0;

  const numPaid = parseFloat(paidAmount) || 0;
  const totalCovered = effectiveAppliedAdvance + numPaid;
  const balanceDue = Math.max(0, grandTotal - totalCovered);

  let paymentStatus = 'Udhar';
  if (grandTotal <= 0 || totalCovered >= grandTotal) {
    paymentStatus = 'Paid';
  } else if (totalCovered > 0) {
    paymentStatus = 'Half Paid';
  }

  // Quick Payment Shortcuts
  const handleQuickPayment = (ratio) => {
    const remainingToPay = Math.max(0, grandTotal - effectiveAppliedAdvance);
    setPaidAmount(Math.round(remainingToPay * ratio));
  };

  // Live Invoice Object (For Real-Time Profit Report Generation)
  const currentInvoiceObject = useMemo(() => {
    let effectiveCustomer = selectedCustomer;
    const customerName = effectiveCustomer ? effectiveCustomer.name : (isUrdu ? 'عام خریدار (نقد)' : 'Walk-in Cash Sale');
    const customerPhone = effectiveCustomer ? (effectiveCustomer.phone || '') : '';
    const customerId = effectiveCustomer ? effectiveCustomer.id : null;

    return {
      invoiceNo: createdInvoice?.invoiceNo || invoiceNo,
      date: createdInvoice?.date || new Date().toISOString(),
      customerId: createdInvoice?.customerId || customerId,
      customerName: createdInvoice?.customerName || customerName,
      customerPhone: createdInvoice?.customerPhone || customerPhone,
      carrier: createdInvoice?.carrier || (carrierDetails
        ? `${carrierDetails.method} • ${carrierDetails.driverName} (${carrierDetails.vehicleNo})`
        : (isUrdu ? 'فیکٹری گیٹ ڈائریکٹ' : 'Direct Factory Pickup')),
      items: createdInvoice?.items || lineItems,
      subtotal: createdInvoice?.subtotal || subtotal,
      carriageCharges: createdInvoice?.carriageCharges !== undefined ? createdInvoice.carriageCharges : (charges.carriage || 0),
      labourCharges: createdInvoice?.labourCharges !== undefined ? createdInvoice.labourCharges : (charges.labour || 0),
      polishCharges: createdInvoice?.polishCharges !== undefined ? createdInvoice.polishCharges : (charges.polish || 0),
      discountAmount: createdInvoice?.discountAmount !== undefined ? createdInvoice.discountAmount : netDiscount,
      grandTotal: createdInvoice?.grandTotal !== undefined ? createdInvoice.grandTotal : grandTotal,
      appliedAdvance: createdInvoice?.appliedAdvance !== undefined ? createdInvoice.appliedAdvance : effectiveAppliedAdvance,
      paidAmount: createdInvoice?.paidAmount !== undefined ? createdInvoice.paidAmount : numPaid,
      totalPaid: (createdInvoice?.appliedAdvance || effectiveAppliedAdvance) + (createdInvoice?.paidAmount !== undefined ? createdInvoice.paidAmount : numPaid),
      balanceDue: createdInvoice?.balanceDue !== undefined ? createdInvoice.balanceDue : balanceDue,
      paymentStatus: createdInvoice?.paymentStatus || paymentStatus,
      paymentMethod: createdInvoice?.paymentMethod || (effectiveAppliedAdvance > 0 && numPaid > 0 ? `${paymentMethod} + Advance` : (effectiveAppliedAdvance > 0 ? 'Advance Adjustment' : paymentMethod)),
      notes: createdInvoice?.notes || billNote,
      createdAt: createdInvoice?.createdAt || new Date().toISOString()
    };
  }, [
    createdInvoice,
    invoiceNo,
    selectedCustomer,
    isUrdu,
    carrierDetails,
    lineItems,
    subtotal,
    charges,
    netDiscount,
    grandTotal,
    numPaid,
    balanceDue,
    paymentStatus,
    paymentMethod,
    billNote
  ]);

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

  const handleCreateNewCustomer = async (formData) => {
    try {
      const savedId = await saveCustomer(formData);
      const newCust = await db.customers.get(savedId);

      setSelectedCustomer(newCust);
      setIsNewCustomerModalOpen(false);
      setIsCustomerDropdownOpen(false);
    } catch (err) {
      console.error('Failed to create customer:', err);
      alert('Failed to save customer: ' + err.message);
    }
  };

  // -------------------------------------------------------------
  // Item Entry / Edit Handlers with Taxonomy & Filters
  // -------------------------------------------------------------
  const ITEM_CATEGORY_FILTERS = useMemo(() => {
    const base = [
      { id: 'Marble', label: 'Marble' },
      { id: 'Tiles', label: 'Tiles' },
      { id: 'Tile Accessories', label: 'Tile Accessories' },
      { id: 'Tukri', label: 'Tukri' },
      { id: 'Kalm', label: 'Kalm' },
      { id: 'Other Accessories', label: 'Other Accessories' },
      { id: 'Borders', label: 'Borders' },
      { id: 'Kali Patti', label: 'Kali Patti' },
      { id: 'Flower', label: 'Flower' },
      { id: 'Panels', label: 'Panels' }
    ];
    const seen = new Set(base.map(b => b.id.toLowerCase()));
    seen.add('border');
    seen.add('borders');
    seen.add('tukri');
    seen.add('kalm');
    seen.add('accessories');
    seen.add('marble accessories');

    // Add active custom categories
    (customCategories || []).forEach(c => {
      if (c.isActive !== false && c.name && !seen.has(c.name.trim().toLowerCase())) {
        seen.add(c.name.trim().toLowerCase());
        base.push({ id: c.name.trim(), label: c.name.trim() });
      }
    });

    (items || []).forEach(it => {
      if (it.category && !seen.has(it.category.trim().toLowerCase())) {
        seen.add(it.category.trim().toLowerCase());
        base.push({ id: it.category.trim(), label: it.category.trim() });
      }
    });
    return base;
  }, [items, customCategories]);

  const matchItemToFilter = (it, filter) => {
    if (!it) return false;
    if (filter === 'ALL') return true;
    const name = (it.name || '').toLowerCase();
    const cat = (it.category || '').toLowerCase();
    const sub = (it.subCategory || '').toLowerCase();
    const filterClean = filter.trim().toLowerCase();

    // Direct category match always takes priority
    if (cat === filterClean) {
      return true;
    }

    if (filter === 'Tukri') {
      return cat === 'tukri' || name.includes('tukri') || sub.includes('tukri') || name.includes('tk-');
    }
    if (filter === 'Kalm') {
      return cat === 'kalm' || name.includes('kalm') || sub.includes('kalm') || name.includes('kl-');
    }
    if (filter === 'Marble Accessories') {
      return cat.includes('marble accessories') || sub.includes('marble accessories') ||
        name.includes('tukri') || cat.includes('tukri') || sub.includes('tukri') ||
        name.includes('kalm') || cat.includes('kalm') || sub.includes('kalm') ||
        name.includes('kk-') || name.includes('kl-');
    }
    if (filter === 'Marble') {
      return (cat.includes('marble') || sub.includes('marble') || name.includes('marble') || cat.includes('slab') || name.includes('slab') || name.includes('sutar')) &&
        !cat.includes('tile') && !sub.includes('tile') && !name.includes('flower') && !name.includes('border') && !name.includes('patti') && !name.includes('panel') && !name.includes('mashallah') && !cat.includes('accessories') && !name.includes('tukri') && !name.includes('kalm');
    }
    if (filter === 'Tile Accessories') {
      return (cat.includes('tile accessories') || sub.includes('tile accessories') ||
        ((cat.includes('tile') || cat.includes('accessories')) && (name.includes('gola') || name.includes('spacer') || name.includes('filling') || name.includes('bond')))) ||
        name.includes('gola') || name.includes('spacer') || name.includes('filling') || name.includes('bond') ||
        sub.includes('gola') || sub.includes('spacer') || sub.includes('filling') || sub.includes('bond');
    }
    if (filter === 'Other Accessories') {
      return cat.includes('other accessories') || sub.includes('other accessories') ||
        name.includes('combod') || name.includes('commode') || sub.includes('combod') || sub.includes('commode') ||
        name.includes('seat') || sub.includes('seat') ||
        name.includes('bason') || name.includes('basin') || sub.includes('bason') || sub.includes('basin') ||
        name.includes('sink') || sub.includes('sink');
    }
    if (filter === 'Flower') {
      return name.includes('flower') || cat.includes('flower') || sub.includes('flower') || name.includes('phool') || name.includes('medallion');
    }
    if (filter === 'Border' || filter === 'Borders') {
      return (name.includes('border') || cat.includes('border') || sub.includes('border') || name.includes('patti')) &&
        !name.includes('kali') && !sub.includes('kali') && !cat.includes('kali') && !name.includes('black');
    }
    if (filter === 'Kali Patti') {
      return name.includes('kali') || sub.includes('kali') || name.includes('black border') || (name.includes('patti') && (name.includes('black') || sub.includes('black')));
    }
    if (filter === 'Tiles') {
      return (cat.includes('tile') || sub.includes('tile') || name.includes('tile') || cat.includes('porcelain')) &&
        !name.includes('panel') && !name.includes('mashallah') && !cat.includes('accessories') && !sub.includes('spacer') && !sub.includes('gola') && !sub.includes('filling') && !sub.includes('bond');
    }
    if (filter === 'Panels') {
      return name.includes('panel') || cat.includes('panel') || sub.includes('panel') || name.includes('mashallah') || name.includes('ayat');
    }
    // Custom category name match
    if (name.includes(filterClean) || sub.includes(filterClean)) {
      return true;
    }
    return false;
  };

  const getItemDisplayName = (it) => {
    if (!it) return '';
    let name = (it.name || '').trim();
    const lowerName = name.toLowerCase();
    const cat = (it.category || '').toLowerCase();
    const sub = (it.subCategory || '').toLowerCase();

    // 1. MARBLE
    if (cat.includes('marble') || it.sutarThickness || sub.includes('sutar') || lowerName.includes('marble')) {
      let sutarPart = it.sutarThickness ? `${it.sutarThickness}S` : '';
      let cleanName = name
        .replace(/standard floor/gi, '')
        .replace(/extra quality/gi, '')
        .replace(/super fine/gi, '')
        .replace(/high grade/gi, '')
        .replace(/\b\d+[- ]?sutar\b/gi, '')
        .replace(/\bmarble\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      let sizePart = '';
      if (it.standardSize) {
        sizePart = it.standardSize.replace(/in$/i, '').trim();
      } else if (it.length && it.width) {
        const lenIn = Math.round(Number(it.length) * 12);
        const widIn = Math.round(Number(it.width) * 12);
        sizePart = `${widIn}×${lenIn}`;
      }

      let extra = [];
      if (sutarPart) extra.push(sutarPart);
      if (sizePart && !cleanName.includes(sizePart)) extra.push(sizePart);

      return extra.length > 0 ? `${cleanName} (${extra.join(' ')})` : cleanName;
    }

    // 2. TILES
    if (cat.includes('tile') || sub.includes('tile') || lowerName.includes('tile')) {
      let sizePart = '';
      if (it.standardSize) {
        sizePart = it.standardSize.replace(/in$/i, '').trim();
      } else if (it.length && it.width) {
        const lenIn = Math.round(Number(it.length) * 12);
        const widIn = Math.round(Number(it.width) * 12);
        sizePart = `${widIn}×${lenIn}`;
      }
      let cleanName = name
        .replace(/grande luxury porcelain tile/gi, 'Grande Tile')
        .replace(/classic ceramic glazed tile/gi, 'Classic Tile')
        .replace(/porcelain/gi, '')
        .replace(/ceramic/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      return sizePart && !cleanName.includes(sizePart) ? `${cleanName} (${sizePart})` : cleanName;
    }

    // 3. BORDER & KALI PATTI
    if (cat.includes('border') || cat.includes('patti') || sub.includes('border') || sub.includes('patti') || lowerName.includes('patti') || lowerName.includes('border')) {
      let sizePart = '';
      if (it.standardSize) {
        sizePart = it.standardSize;
      } else if (it.width) {
        const inVal = Math.round(Number(it.width) * 12);
        if (inVal > 0) sizePart = `${inVal}"`;
      }
      let cleanName = name
        .replace(/chamfer corner/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      return sizePart && !cleanName.includes(sizePart) ? `${cleanName} (${sizePart})` : cleanName;
    }

    // 4. PANELS (Only 12x24)
    if (cat.includes('panel') || lowerName.includes('panel') || lowerName.includes('mashallah')) {
      let cleanName = name
        .replace(/decorative entrance /gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      return `${cleanName} (12×24)`;
    }

    // 5. FLOWERS
    if (cat.includes('flower') || lowerName.includes('flower')) {
      let sizePart = '';
      if (it.standardSize) {
        sizePart = it.standardSize;
      } else if (it.length && it.width) {
        sizePart = it.length === 3 ? '3×3' : (it.length === 2 ? '24×24' : '12×12');
      }
      let cleanName = name.trim();
      return sizePart && !cleanName.includes(sizePart) ? `${cleanName} (${sizePart})` : cleanName;
    }

    // 6. ACCESSORIES (Gola, etc.)
    if (cat.includes('accessories') || lowerName.includes('gola') || lowerName.includes('spacer') || lowerName.includes('bond') || lowerName.includes('filling')) {
      return name
        .replace(/chamfer corner /gi, '')
        .replace(/patti \(8ft\)/gi, 'Gola 8ft')
        .trim();
    }

    return name;
  };

  const getItemStockInfo = (item, cat) => {
    if (!item) return { stock: 0, unit: 'Sq. Ft.' };

    const name = (item.name || '').toLowerCase();
    const sub = (item.subCategory || '').toLowerCase();
    const itemCat = (item.category || '').toLowerCase();
    const catStr = (cat || '').toLowerCase();

    const isTileAcc = catStr.includes('tile accessories') || itemCat.includes('tile accessories') ||
      ((itemCat.includes('tile') || itemCat.includes('accessories')) && (name.includes('gola') || name.includes('spacer') || name.includes('filling') || name.includes('bond')));
    const isOtherAcc = catStr.includes('other accessories') || itemCat.includes('other accessories') ||
      name.includes('sink') || name.includes('basin') || name.includes('bason') || name.includes('seat') || name.includes('combod') || name.includes('commode');
    const isTukri = cat === 'Tukri' || name.includes('tukri') || sub.includes('tukri');
    const isKalm = cat === 'Kalm' || name.includes('kalm') || sub.includes('kalm');
    const isMarbleAcc = catStr.includes('marble accessories') || itemCat.includes('marble accessories') || isTukri || isKalm;

    const isTiles = (cat === 'Tiles' || itemCat.includes('tile')) && !isTileAcc && !isOtherAcc && !isMarbleAcc && !catStr.includes('accessories');

    if (isTileAcc || isOtherAcc || cat === 'Accessories' || (!isMarbleAcc && (item.unit === 'Piece' || item.unit === 'Pieces'))) {
      const val = Number(item.stockPieces || item.stockSqFt || 0);
      return { stock: val, unit: 'Piece' };
    }

    if (isTiles) {
      let stockInMeters = 0;
      if (item.unit === 'Meter' || item.unit === 'Meters') {
        stockInMeters = Number(item.stockSqFt || item.stockPieces || 0);
      } else if (item.stockPieces && Number(item.stockPieces) > 0) {
        stockInMeters = Math.round((Number(item.stockPieces) / 5) * 10) / 10;
      } else {
        stockInMeters = Number(item.stockSqFt || 0);
      }
      return { stock: stockInMeters, unit: 'Meter' };
    }

    if (isMarbleAcc || isTukri || isKalm) {
      const sqft = Number(item.stockSqFt || 0);
      return { stock: Math.round(sqft * 100) / 100, unit: 'Sq. Ft.' };
    }

    if (cat === 'Border' || cat === 'Kali Patti') {
      const sqft = Number(item.stockSqFt || (item.stockPieces ? item.stockPieces * (item.width || 0.25) : 0));
      return { stock: Math.round(sqft * 100) / 100, unit: 'R.Ft.' };
    }

    if (cat === 'Flower' || cat === 'Panels') {
      const pcs = Number(item.stockPieces || item.stockSqFt || 0);
      return { stock: pcs, unit: 'Piece' };
    }

    // Default / Marble: Sq. Ft.
    const sqft = Number(item.stockSqFt || item.stockPieces || 0);
    return { stock: Math.round(sqft * 100) / 100, unit: 'Sq. Ft.' };
  };

  const detectItemPresetAndDimensions = (item, cat) => {
    const name = (item?.name || '').toLowerCase();
    const sub = (item?.subCategory || '').toLowerCase();
    const size = (item?.standardSize || '').toLowerCase();
    const text = `${name} ${sub} ${size}`;

    if (cat === 'Border') {
      if (text.includes('6 inch') || text.includes('6"') || text.includes('06in') || (item?.width && Math.round(item.width * 12) === 6)) {
        return { preset: '6 inch', inch: 6, length: 1, width: 0.5 };
      }
      return { preset: '3 inch', inch: 3, length: 1, width: 0.25 };
    }

    if (cat === 'Kali Patti') {
      if (text.includes('3 inch') || text.includes('3"') || text.includes('03in') || (item?.width && Math.round(item.width * 12) === 3)) {
        return { preset: '3 inch', inch: 3, length: 1, width: 0.25 };
      }
      return { preset: '2 inch', inch: 2, length: 1, width: 0.166 };
    }

    if (cat === 'Tiles') {
      if (text.includes('24 × 48') || text.includes('24x48') || (item?.length === 4 && item?.width === 2)) {
        return { preset: '24 × 48', length: 4, width: 2, defaultRate: 1650 };
      }
      if (text.includes('24 × 24') || text.includes('24x24') || (item?.length === 2 && item?.width === 2)) {
        return { preset: '24 × 24', length: 2, width: 2, defaultRate: 1250 };
      }
      if (text.includes('16 × 16') || text.includes('16x16') || (item?.length && Math.round(item.length * 10) === 13)) {
        return { preset: '16 × 16', length: 1.33, width: 1.33, defaultRate: 750 };
      }
      return { preset: '12 × 24', length: 2, width: 1, defaultRate: 850 };
    }

    // Panels are strictly 12 × 24 only
    if (cat === 'Panels') {
      return { preset: '12 × 24', length: 2, width: 1, defaultRate: 2500 };
    }

    if (cat === 'Flower') {
      if (text.includes('3 × 3') || text.includes('3x3') || text.includes('3 ft') || (item?.length === 3 && item?.width === 3)) {
        return { preset: '3 × 3', length: 3, width: 3, defaultRate: 3500 };
      }
      if (text.includes('24 × 24') || text.includes('24x24') || (item?.length === 2 && item?.width === 2)) {
        return { preset: '24 × 24', length: 2, width: 2, defaultRate: 1800 };
      }
      return { preset: '12 × 12', length: 1, width: 1, defaultRate: 850 };
    }

    if (cat === 'Tukri' || text.includes('tukri')) {
      if (text.includes('6 × 6') || text.includes('6x6') || text.includes('0606')) {
        return { preset: '6 × 6', length: 6/12, width: 6/12, defaultRate: 210, unit: 'Sq. Ft.' };
      }
      if (text.includes('3 × 3') || text.includes('3x3') || text.includes('0303')) {
        return { preset: '3 × 3', length: 3/12, width: 3/12, defaultRate: 190, unit: 'Sq. Ft.' };
      }
      return { preset: '2 × 2', length: 2/12, width: 2/12, defaultRate: 180, unit: 'Sq. Ft.' };
    }

    if (cat === 'Kalm' || text.includes('kalm')) {
      if (text.includes('3 inch') || text.includes('3"') || text.includes('03in')) {
        return { preset: '3 inch', inch: 3, length: 1, width: 3/12, defaultRate: 155, unit: 'Sq. Ft.' };
      }
      if (text.includes('2 inch') || text.includes('2"') || text.includes('02in')) {
        return { preset: '2 inch', inch: 2, length: 1, width: 2/12, defaultRate: 125, unit: 'Sq. Ft.' };
      }
      return { preset: '1 inch', inch: 1, length: 1, width: 1/12, defaultRate: 95, unit: 'Sq. Ft.' };
    }

    if (cat === 'Accessories' || cat === 'Tile Accessories' || cat === 'Marble Accessories' || cat === 'Other Accessories') {
      if (text.includes('sink')) return { preset: 'Sink', unit: 'Piece', defaultRate: 4500 };
      if (text.includes('basin') || text.includes('bason')) return { preset: 'Bason', unit: 'Piece', defaultRate: 3800 };
      if (text.includes('seat')) return { preset: 'Seat', unit: 'Piece', defaultRate: 2800 };
      if (text.includes('combod') || text.includes('commode')) return { preset: 'Combod', unit: 'Piece', defaultRate: 7500 };
      if (text.includes('bond')) return { preset: 'Bond', unit: 'Piece', defaultRate: 650 };
      if (text.includes('spacer')) return { preset: 'Spacer', unit: 'Piece', defaultRate: 250 };
      if (text.includes('gola')) return { preset: 'Gola', unit: 'Piece', defaultRate: 85 };
      if (text.includes('tukri')) {
        if (text.includes('6x6') || text.includes('6 × 6')) return { preset: '6 × 6', length: 6/12, width: 6/12, defaultRate: 210, unit: 'Sq. Ft.' };
        if (text.includes('3x3') || text.includes('3 × 3')) return { preset: '3 × 3', length: 3/12, width: 3/12, defaultRate: 190, unit: 'Sq. Ft.' };
        return { preset: '2 × 2', length: 2/12, width: 2/12, defaultRate: 180, unit: 'Sq. Ft.' };
      }
      if (text.includes('kalm')) {
        if (text.includes('3 inch') || text.includes('3"')) return { preset: '3 inch', inch: 3, length: 1, width: 3/12, defaultRate: 155, unit: 'Sq. Ft.' };
        if (text.includes('2 inch') || text.includes('2"')) return { preset: '2 inch', inch: 2, length: 1, width: 2/12, defaultRate: 125, unit: 'Sq. Ft.' };
        return { preset: '1 inch', inch: 1, length: 1, width: 1/12, defaultRate: 95, unit: 'Sq. Ft.' };
      }
      return { preset: 'Filling', unit: 'Piece', defaultRate: 450 };
    }

    // Marble
    let sutar = Number(item?.sutarThickness);
    if (!sutar) {
      if (text.includes('14-sutar') || text.includes('14 sutar') || text.includes('base')) sutar = 14;
      else if (text.includes('9-sutar') || text.includes('9 sutar') || text.includes('step')) sutar = 9;
      else if (text.includes('6-sutar') || text.includes('6 sutar') || text.includes('kitchen') || text.includes('stairs')) sutar = 6;
      else sutar = 4;
    }

    if (text.includes('4 × 24') || text.includes('4x24') || (item?.length === 2 && Math.round(Number(item?.width) * 12) === 4)) {
      return { preset: '4 × 24', length: 2, width: 0.3333, sutar };
    }
    if (text.includes('12 × 24') || text.includes('12x24') || (item?.length === 2 && item?.width === 1)) {
      return { preset: '12 × 24', length: 2, width: 1, sutar };
    }
    if (text.includes('6 × 24') || text.includes('6x24') || (item?.length === 2 && item?.width === 0.5)) {
      return { preset: '6 × 24', length: 2, width: 0.5, sutar };
    }
    if (text.includes('6 × 12') || text.includes('6x12') || (item?.length === 1 && item?.width === 0.5)) {
      return { preset: '6 × 12', length: 1, width: 0.5, sutar };
    }
    return { preset: '12 × 12', length: 1, width: 1, sutar };
  };

  // ─────────────────────────────────────────────────────────────
  // Item Selection & Searchable Stock Population for Billing
  // ─────────────────────────────────────────────────────────────
  const formatStockOptionLabel = (it) => {
    if (!it) return '';
    const name = it.name || 'Unnamed Item';
    const sutar = Number(it.sutarThickness) > 0 ? `${it.sutarThickness}S ` : '';
    const size = it.standardSize && it.standardSize !== '-' && it.standardSize !== 'Standard'
      ? it.standardSize
      : (it.length && it.width ? `${it.length} × ${it.width}` : '');
    const spec = (sutar || size) ? `(${sutar}${size})`.trim() : '';
    const unit = it.unit || (it.category === 'Tiles' ? 'Meters' : (['Tukri', 'Kalm'].includes(it.category) ? 'Pieces' : 'Sq. Ft.'));
    const stockQty = Number((unit === 'Pieces' || ['Tukri', 'Kalm', 'Pieces'].includes(it.category)) && it.stockPieces !== undefined && it.stockPieces !== null ? it.stockPieces : (it.stockSqFt || 0));
    return `${name} ${spec} — Available: ${stockQty.toLocaleString()} ${unit}`.replace(/\s+/g, ' ');
  };

  const filteredModalItems = useMemo(() => {
    let list = items || [];
    if (itemCategoryFilter && itemCategoryFilter !== 'ALL') {
      list = list.filter(it => matchItemToFilter(it, itemCategoryFilter));
    }
    if (stockSearchQuery && stockSearchQuery.trim()) {
      const q = stockSearchQuery.trim().toLowerCase();
      list = list.filter(it => {
        const name = (it.name || '').toLowerCase();
        const code = (it.code || '').toLowerCase();
        const cat = (it.category || '').toLowerCase();
        const sub = (it.subCategory || '').toLowerCase();
        const size = (it.standardSize || '').toLowerCase();
        return name.includes(q) || code.includes(q) || cat.includes(q) || sub.includes(q) || size.includes(q);
      });
    }
    return list;
  }, [items, itemCategoryFilter, stockSearchQuery]);

  const isSutarAllowedForItem = (categoryName, unitName, itemName) => {
    const cleanCat = (categoryName || '').trim().toLowerCase();
    const builtInKeys = new Set([
      'marble', 'tiles', 'tile', 'tile accessories', 'other accessories', 'marble accessories',
      'accessories', 'borders', 'border', 'kali patti', 'flowers', 'flower', 'panels', 'panel',
      'tukri', 'kakri', 'kalm'
    ]);
    const isCustomCat = (customCategories || []).some(
      c => c && c.isActive !== false && (c.name || '').trim().toLowerCase() === cleanCat
    ) && !builtInKeys.has(cleanCat);

    if (isCustomCat) {
      return Boolean(getEffectiveCategoryConfig(categoryName, customCategories).hasSutar);
    }

    const meta = `${categoryName || ''} ${itemName || ''}`.toLowerCase();
    const nonSutar = meta.includes('border') || meta.includes('patti') || meta.includes('tile') ||
      meta.includes('flower') || meta.includes('panel') || meta.includes('accessori') ||
      meta.includes('tukri') || meta.includes('kakri') || meta.includes('kalm') ||
      ['Meters', 'Meter', 'Pieces', 'Piece', 'Running Feet', 'R.Ft.', 'Boxes', 'Box', 'Bags'].includes(unitName);
    return !nonSutar;
  };

  const handleItemSelectInModal = (selectedItem) => {
    if (!selectedItem) return;

    const rate = Number(selectedItem.ratePerSqFt || selectedItem.rate || 0);
    const cost = Number(selectedItem.costPerSqFt || selectedItem.purchasePrice || selectedItem.unitCost || Math.round(rate * 0.72));
    const available = Number(selectedItem.stockSqFt !== undefined && selectedItem.stockSqFt !== null ? selectedItem.stockSqFt : (selectedItem.stockPieces || 0));
    const unit = selectedItem.unit || (selectedItem.category === 'Tiles' ? 'Meters' : 'Sq. Ft.');
    const size = selectedItem.standardSize || (selectedItem.length && selectedItem.width ? `${selectedItem.length} × ${selectedItem.width}` : '-');
    const selMeta = `${selectedItem.category || ''} ${selectedItem.name || ''}`.toLowerCase();
    const isNonSutarCat = !isSutarAllowedForItem(selectedItem.category, selectedItem.unit, selectedItem.name);
    const sutar = isNonSutarCat ? 0 : (Number(selectedItem.sutarThickness) || 0);

    setItemModalForm(prev => {
      const prevQty = parseFloat(prev.billedQuantity) || 0;
      const initialQty = prevQty > 0 ? prevQty : (unit === 'Sq. Ft.' ? (selectedItem.category === 'Marble' ? 10 : 1) : 1);
      const initialRate = rate > 0 ? rate : (parseFloat(prev.ratePerSqFt) || 100);
      return {
        ...prev,
        itemId: selectedItem.id,
        name: selectedItem.name,
        code: selectedItem.code || '',
        category: selectedItem.category || 'Marble',
        subCategory: selectedItem.subCategory || '',
        standardSize: size,
        selectedSizePreset: size,
        size: size,
        thicknessSutar: sutar,
        usageTag: sutar ? `${sutar} Sutar` : (selectedItem.subCategory || ''),
        unit: unit,
        stockUnit: unit,
        length: Number(selectedItem.length) || 1,
        width: Number(selectedItem.width) || 1,
        availableStock: available,
        billedQuantity: initialQty,
        totalSqFt: initialQty,
        meters: (unit.includes('Meter') || unit === 'm') ? initialQty : 0,
        runningFeet: (unit.includes('R.Ft') || unit.includes('Running')) ? initialQty : 0,
        pieces: (unit.includes('Piece') || unit.includes('Pcs')) ? initialQty : 0,
        ratePerSqFt: initialRate,
        rate: initialRate,
        costPerSqFt: cost,
        unitCost: cost,
        amount: Math.round(initialQty * initialRate)
      };
    });
  };

  const handleOpenAddItemModal = () => {
    setItemCategoryFilter('ALL');
    setStockSearchQuery('');
    setEditingItemIndex(null);

    const available = (items || []).filter(it => Number(it.stockSqFt || it.stockPieces || it.stockBoxes || 0) > 0);
    const firstItem = available[0] || (items && items[0]) || null;
    if (firstItem) {
      handleItemSelectInModal(firstItem);
    } else {
      setItemModalForm({
        itemId: null,
        name: '',
        code: '',
        category: 'Marble',
        subCategory: '',
        standardSize: '',
        selectedSizePreset: '',
        size: '',
        thicknessSutar: 0,
        usageTag: '',
        unit: 'Sq. Ft.',
        availableStock: 0,
        billedQuantity: 1,
        totalSqFt: 1,
        meters: 0,
        runningFeet: 0,
        pieces: 1,
        ratePerSqFt: 100,
        rate: 100,
        costPerSqFt: 70,
        amount: 100
      });
    }
    setIsItemModalOpen(true);
  };

  const handleOpenEditItemModal = (index) => {
    const item = lineItems[index];
    const matchItem = (items || []).find(i => i.id === item.itemId);
    setItemCategoryFilter(item.category || 'ALL');
    setStockSearchQuery('');
    setEditingItemIndex(index);

    const qty = parseFloat(item.billedQuantity || item.totalSqFt || item.meters || item.runningFeet || item.pieces || 1);
    const rate = parseFloat(item.ratePerSqFt || item.rate || 0);

    setItemModalForm({
      itemId: item.itemId,
      name: item.name,
      code: item.code || (matchItem ? matchItem.code : ''),
      category: item.category || (matchItem ? matchItem.category : 'Marble'),
      subCategory: item.subCategory || '',
      standardSize: item.standardSize || item.selectedSizePreset || (matchItem ? matchItem.standardSize : '-'),
      selectedSizePreset: item.selectedSizePreset || item.standardSize || '-',
      size: item.size || item.standardSize || '-',
      thicknessSutar: isSutarAllowedForItem(item.category || matchItem?.category, item.unit || matchItem?.unit, item.name) ? Number(item.thicknessSutar || (matchItem ? matchItem.sutarThickness : 0)) : 0,
      usageTag: item.usageTag || '',
      unit: item.unit || (matchItem ? matchItem.unit : 'Sq. Ft.'),
      stockUnit: item.unit || (matchItem ? matchItem.unit : 'Sq. Ft.'),
      length: Number(item.length || (matchItem ? matchItem.length : 1)),
      width: Number(item.width || (matchItem ? matchItem.width : 1)),
      availableStock: matchItem ? Number(matchItem.stockSqFt || matchItem.stockPieces || matchItem.stockBoxes || 0) : 0,
      billedQuantity: qty,
      totalSqFt: qty,
      meters: (item.unit === 'Meter' || item.unit === 'Meters') ? qty : 0,
      runningFeet: (item.unit === 'R.Ft.' || item.unit === 'Running Feet') ? qty : 0,
      pieces: (item.unit === 'Piece' || item.unit === 'Pieces') ? qty : 0,
      ratePerSqFt: rate,
      rate: rate,
      costPerSqFt: Number(item.costPerSqFt || 0),
      unitCost: Number(item.unitCost || item.costPerSqFt || 0),
      amount: Math.round(qty * rate)
    });
    setIsItemModalOpen(true);
  };

  const handleCategoryFilterChange = (filterId) => {
    setItemCategoryFilter(filterId);
    let matching = items || [];
    if (filterId !== 'ALL') {
      matching = matching.filter(it => matchItemToFilter(it, filterId));
    }
    if (matching.length > 0) {
      handleItemSelectInModal(matching[0]);
    }
  };

  const handleBilledQuantityChange = (val) => {
    const qty = parseFloat(val) || 0;
    setItemModalForm(prev => {
      const rate = parseFloat(prev.ratePerSqFt) || 0;
      return {
        ...prev,
        billedQuantity: val,
        totalSqFt: qty,
        meters: (prev.unit?.includes('Meter') || prev.unit === 'm') ? qty : 0,
        runningFeet: (prev.unit?.includes('R.Ft') || prev.unit?.includes('Running')) ? qty : 0,
        pieces: (prev.unit?.includes('Piece') || prev.unit?.includes('Pcs')) ? qty : 0,
        amount: Math.round(qty * rate)
      };
    });
  };

  const handleSaleRateChange = (val) => {
    const rate = parseFloat(val) || 0;
    setItemModalForm(prev => {
      const qty = parseFloat(prev.billedQuantity) || 0;
      return {
        ...prev,
        ratePerSqFt: val,
        rate: rate,
        amount: Math.round(qty * rate)
      };
    });
  };

  const handleSaveItemModal = () => {
    if (!itemModalForm.itemId && !itemModalForm.name) return;

    const billedQty = parseFloat(itemModalForm.billedQuantity) || 0;
    const ratePerUnit = parseFloat(itemModalForm.ratePerSqFt) || 0;

    if (billedQty <= 0) {
      alert(isUrdu ? 'برائے مہربانی درست مقدار (0 سے زیادہ) درج کریں۔' : 'Please enter a valid quantity greater than 0.');
      return;
    }

    if (ratePerUnit <= 0) {
      alert(isUrdu ? 'برائے مہربانی درست ریٹ (0 سے زیادہ) درج کریں۔' : 'Please enter a valid rate greater than 0.');
      return;
    }

    const available = Number(itemModalForm.availableStock || 0);
    if (available > 0 && billedQty > available) {
      const proceed = window.confirm(
        isUrdu
          ? `انتباہ: مطلوبہ مقدار (${billedQty} ${itemModalForm.unit}) یارڈ کے موجودہ اسٹاک (${available} ${itemModalForm.unit}) سے زیادہ ہے! کیا آپ پھر بھی یہ آئٹم شامل کرنا چاہتے ہیں؟`
          : `Stock Warning: Requested quantity (${billedQty} ${itemModalForm.unit}) exceeds available yard stock (${available} ${itemModalForm.unit})! Do you still want to proceed?`
      );
      if (!proceed) return;
    }

    const unitCost = Number(itemModalForm.costPerSqFt) || Math.round(ratePerUnit * 0.72);
    const saleAmount = Math.round(billedQty * ratePerUnit);
    const totalCost = Math.round(billedQty * unitCost);
    const finalUnit = itemModalForm.unit || 'Sq. Ft.';

    const isPieceItem = finalUnit.includes('Piece') || finalUnit.includes('Pcs');
    const isTileItem = finalUnit.includes('Meter') || finalUnit === 'm';
    const isRunningItem = finalUnit.includes('R.Ft') || finalUnit.includes('Running');

    const formattedItem = {
      id: editingItemIndex !== null ? lineItems[editingItemIndex].id : `item-${Date.now()}`,
      itemId: itemModalForm.itemId,
      name: itemModalForm.name,
      code: itemModalForm.code || '',
      category: itemModalForm.category || 'Marble',
      subCategory: itemModalForm.subCategory || '',
      thicknessSutar: Number(itemModalForm.thicknessSutar || 0),
      usageTag: itemModalForm.usageTag || '',
      selectedSizePreset: itemModalForm.standardSize || itemModalForm.size || '-',
      standardSize: itemModalForm.standardSize || itemModalForm.size || '-',
      size: itemModalForm.standardSize || itemModalForm.size || '-',
      length: Number(itemModalForm.length || 1),
      width: Number(itemModalForm.width || 1),
      pieces: isPieceItem ? billedQty : (itemModalForm.pieces || 0),
      boxes: 0,
      meters: isTileItem ? billedQty : 0,
      runningFeet: isRunningItem ? billedQty : 0,
      billedQuantity: billedQty,
      totalSqFt: isPieceItem ? 0 : billedQty,
      ratePerSqFt: ratePerUnit,
      rate: ratePerUnit,
      costPerSqFt: unitCost,
      unitCost: unitCost,
      totalCost: totalCost,
      profit: saleAmount - totalCost,
      unit: finalUnit,
      amount: saleAmount
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
  const handleUpdateExistingInvoice = async () => {
    if (lineItems.length === 0) {
      setErrorMessage(isUrdu ? 'برائے مہربانی کم از کم ایک آئٹم شامل کریں۔' : 'Please add at least one marble item.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');

      let effectiveCustomer = selectedCustomer;
      if (!effectiveCustomer && customerSearch.trim()) {
        const queryName = customerSearch.trim();
        const allCust = await db.customers.toArray();
        const match = allCust.find(c => c.name?.trim().toLowerCase() === queryName.toLowerCase());
        if (match) {
          effectiveCustomer = match;
        } else {
          const newCustId = await db.customers.add({
            name: queryName,
            phone: '',
            city: 'Faisalabad / Jhumra',
            totalBilled: 0,
            totalPaid: 0,
            balanceDue: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          effectiveCustomer = await db.customers.get(newCustId);
        }
      }

      if (!effectiveCustomer && balanceDue > 0) {
        setErrorMessage(
          isUrdu
            ? 'ادھار بل کے لیے کسٹمر منتخب کرنا یا نام اور فون نمبر درج کرنا لازمی ہے! عام خریدار پر ادھار ممکن نہیں۔'
            : 'Credit / Udhaar sales require selecting or registering a customer with their Name and Phone number!'
        );
        setIsSaving(false);
        return;
      }

      const nowIso = new Date().toISOString();
      const customerName = effectiveCustomer ? effectiveCustomer.name : (isUrdu ? 'عام خریدار (نقد)' : 'Walk-in Cash Sale');
      const customerPhone = effectiveCustomer ? (effectiveCustomer.phone || '') : '';
      const customerId = effectiveCustomer ? effectiveCustomer.id : null;

      let savedInvoiceRecord = null;

      await db.transaction('rw', [db.invoices, db.customers, db.customer_payments], async () => {
        const latestOldInv = (await db.invoices.get(originalInvoice.id)) || originalInvoice;
        const updatedFields = {
          invoiceNo: latestOldInv.invoiceNo || invoiceNo,
          date: latestOldInv.date || latestOldInv.createdAt || nowIso,
          customerId,
          customerName,
          customerPhone,
          carrier: carrierDetails
            ? `${carrierDetails.method} • ${carrierDetails.driverName} (${carrierDetails.vehicleNo})`
            : (isUrdu ? 'فیکٹری گیٹ ڈائریکٹ' : 'Direct Factory Pickup'),
          carrierDetails: carrierDetails || null,
          items: lineItems,
          subtotal,
          carriageCharges: charges.carriage || 0,
          labourCharges: charges.labour || 0,
          polishCharges: charges.polish || 0,
          otherCharges: charges.other || 0,
          discountAmount: netDiscount,
          discountReason: discount.reason || '',
          grandTotal,
          appliedAdvance: effectiveAppliedAdvance,
          paidAmount: numPaid,
          totalPaid: totalCovered,
          balanceDue,
          paymentStatus,
          paymentMethod: effectiveAppliedAdvance > 0 && numPaid > 0
            ? `${paymentMethod} + Advance`
            : (effectiveAppliedAdvance > 0 ? 'Advance Adjustment' : paymentMethod),
          notes: billNote,
          updatedAt: nowIso
        };

        await db.invoices.update(originalInvoice.id, updatedFields);
        savedInvoiceRecord = { ...latestOldInv, ...updatedFields, id: originalInvoice.id };

        const resolveCustomerInTx = async (cid) => {
          if (!cid) return null;
          let cust = await db.customers.get(cid);
          if (!cust && typeof cid === 'string' && !isNaN(Number(cid))) {
            cust = await db.customers.get(Number(cid));
          }
          if (!cust) {
            const allCust = await db.customers.toArray();
            cust = allCust.find(c => String(c.id) === String(cid));
          }
          return cust || null;
        };

        const oldCustId = latestOldInv.customerId ? String(latestOldInv.customerId) : null;
        const newCustId = effectiveCustomer ? String(effectiveCustomer.id) : null;
        const oldGrand = Number(latestOldInv.grandTotal || 0);
        const oldPaid = Number(latestOldInv.paidAmount || 0);
        const oldAppliedAdv = Number(latestOldInv.appliedAdvance || 0);
        const oldDue = Math.max(0, Number(latestOldInv.balanceDue !== undefined ? latestOldInv.balanceDue : (oldGrand - oldAppliedAdv - oldPaid)));

        if (oldCustId && newCustId && oldCustId === newCustId) {
          const freshCust = await resolveCustomerInTx(newCustId);
          if (freshCust) {
            await db.customers.update(freshCust.id, {
              totalBilled: Math.max(0, (Number(freshCust.totalBilled) || 0) - oldGrand + grandTotal),
              totalPaid: Math.max(0, (Number(freshCust.totalPaid) || 0) - oldPaid + numPaid),
              balanceDue: Math.max(0, (Number(freshCust.balanceDue) || 0) - oldDue + balanceDue),
              advanceBalance: Math.max(0, (Number(freshCust.advanceBalance) || 0) + oldAppliedAdv - effectiveAppliedAdvance),
              updatedAt: nowIso
            });
          }
        } else {
          if (oldCustId) {
            const oldCust = await resolveCustomerInTx(oldCustId);
            if (oldCust) {
              await db.customers.update(oldCust.id, {
                totalBilled: Math.max(0, (Number(oldCust.totalBilled) || 0) - oldGrand),
                totalPaid: Math.max(0, (Number(oldCust.totalPaid) || 0) - oldPaid),
                balanceDue: Math.max(0, (Number(oldCust.balanceDue) || 0) - oldDue),
                advanceBalance: Math.max(0, (Number(oldCust.advanceBalance) || 0) + oldAppliedAdv),
                updatedAt: nowIso
              });
            }
          }
          if (newCustId) {
            const newCust = await resolveCustomerInTx(newCustId);
            if (newCust) {
              await db.customers.update(newCust.id, {
                totalBilled: (Number(newCust.totalBilled) || 0) + grandTotal,
                totalPaid: (Number(newCust.totalPaid) || 0) + numPaid,
                balanceDue: (Number(newCust.balanceDue) || 0) + balanceDue,
                advanceBalance: Math.max(0, (Number(newCust.advanceBalance) || 0) - effectiveAppliedAdvance),
                updatedAt: nowIso
              });
            }
          }
        }

        const linkedPayments = await db.customer_payments.where('invoiceId').equals(originalInvoice.id).toArray();
        const advRows = linkedPayments.filter(p => p.isAdvanceAdjustment || (p.paymentNo || '').startsWith('ADV-ADJ-'));
        const cashRows = linkedPayments.filter(p => !p.isAdvanceAdjustment && !(p.paymentNo || '').startsWith('ADV-ADJ-'));

        if (advRows.length > 0) {
          await db.customer_payments.bulkDelete(advRows.map(p => p.id));
        }
        if (effectiveCustomer && effectiveAppliedAdvance > 0) {
          await db.customer_payments.add({
            paymentNo: `ADV-ADJ-${Date.now().toString().slice(-6)}`,
            invoiceId: originalInvoice.id,
            customerId: effectiveCustomer.id,
            customerName: effectiveCustomer.name,
            date: latestOldInv.date || nowIso,
            amount: effectiveAppliedAdvance,
            paymentMethod: 'Advance Adjustment',
            isAdvanceAdjustment: true,
            referenceNo: latestOldInv.invoiceNo || invoiceNo,
            notes: `Advance applied against Bill #${latestOldInv.invoiceNo || invoiceNo} (پیشگی ایڈوانس سے کٹوتی)`,
            createdAt: nowIso
          });
        }

        if (!effectiveCustomer || numPaid <= 0) {
          if (cashRows.length > 0) {
            await db.customer_payments.bulkDelete(cashRows.map(p => p.id));
          }
        } else if (oldCustId === newCustId && numPaid === oldPaid && cashRows.length > 0) {
          if (cashRows.length === 1) {
            await db.customer_payments.update(cashRows[0].id, {
              customerName: effectiveCustomer.name,
              paymentMethod,
              updatedAt: nowIso
            });
          }
        } else if (cashRows.length === 1) {
          await db.customer_payments.update(cashRows[0].id, {
            customerId: effectiveCustomer.id,
            customerName: effectiveCustomer.name,
            amount: numPaid,
            paymentMethod,
            referenceNo: latestOldInv.invoiceNo || invoiceNo,
            updatedAt: nowIso
          });
        } else {
          if (cashRows.length > 0) {
            await db.customer_payments.bulkDelete(cashRows.map(p => p.id));
          }
          await db.customer_payments.add({
            paymentNo: `PAY-${Date.now().toString().slice(-6)}`,
            invoiceId: originalInvoice.id,
            customerId: effectiveCustomer.id,
            customerName: effectiveCustomer.name,
            date: latestOldInv.date || nowIso,
            amount: numPaid,
            paymentMethod,
            referenceNo: latestOldInv.invoiceNo || invoiceNo,
            notes: `Updated POS Collection for Invoice #${latestOldInv.invoiceNo || invoiceNo}`,
            createdAt: nowIso
          });
        }
      });

      setCreatedInvoice(savedInvoiceRecord);
      setIsReviewModalOpen(false);
      setJustFinishedEdit(true);
      setIsPrintModalOpen(true);
      resetBillForm();
      if (onClearEditingInvoice) onClearEditingInvoice();
    } catch (err) {
      console.error('Error updating invoice:', err);
      setErrorMessage(err.message || 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteSaveInvoice = async () => {
    if (originalInvoice && originalInvoice.id) {
      return await handleUpdateExistingInvoice();
    }
    if (lineItems.length === 0) {
      setErrorMessage(isUrdu ? 'برائے مہربانی کم از کم ایک آئٹم شامل کریں۔' : 'Please add at least one marble item.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');

      // Determine customer (from selected dropdown or typed search name)
      let effectiveCustomer = selectedCustomer;
      if (!effectiveCustomer && customerSearch.trim()) {
        const queryName = customerSearch.trim();
        const allCust = await db.customers.toArray();
        const match = allCust.find(c => c.name?.trim().toLowerCase() === queryName.toLowerCase());
        if (match) {
          effectiveCustomer = match;
        } else {
          // Auto-create registered customer in DB so their Khata is immediately created!
          const newCustId = await db.customers.add({
            name: queryName,
            phone: '',
            city: 'Faisalabad / Jhumra',
            totalBilled: 0,
            totalPaid: 0,
            balanceDue: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          effectiveCustomer = await db.customers.get(newCustId);
        }
      }

      // Strict Validation: Prevent Walk-in Udhar (Khata is mandatory if balanceDue > 0)
      if (!effectiveCustomer && balanceDue > 0) {
        setErrorMessage(
          isUrdu
            ? 'ادھار بل کے لیے کسٹمر منتخب کرنا یا نام اور فون نمبر درج کرنا لازمی ہے! عام خریدار پر ادھار ممکن نہیں۔'
            : 'Credit / Udhaar sales require selecting or registering a customer with their Name and Phone number!'
        );
        setIsSaving(false);
        return;
      }

      const customerName = effectiveCustomer ? effectiveCustomer.name : (isUrdu ? 'عام خریدار (نقد)' : 'Walk-in Cash Sale');
      const customerPhone = effectiveCustomer ? (effectiveCustomer.phone || '') : '';
      const customerId = effectiveCustomer ? effectiveCustomer.id : null;

      const invoiceData = {
        invoiceNo,
        date: new Date().toISOString(),
        customerId,
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
        appliedAdvance: effectiveAppliedAdvance,
        paidAmount: numPaid,
        totalPaid: totalCovered,
        balanceDue,
        paymentStatus,
        paymentMethod: effectiveAppliedAdvance > 0 && numPaid > 0
          ? `${paymentMethod} + Advance`
          : (effectiveAppliedAdvance > 0 ? 'Advance Adjustment' : paymentMethod),
        carrierDetails: carrierDetails || null,
        otherCharges: charges.other || 0,
        discountReason: discount.reason || '',
        notes: billNote,
        createdAt: new Date().toISOString()
      };

      await db.transaction('rw', [db.invoices, db.items, db.customers, db.stock_movements, db.customer_payments], async () => {
        // 1. Add invoice record
        const invId = await db.invoices.add(invoiceData);

        // 2. Update customer ledger if registered customer
        if (effectiveCustomer) {
          let freshCust = await db.customers.get(effectiveCustomer.id);
          if (!freshCust && typeof effectiveCustomer.id === 'string') {
            freshCust = await db.customers.get(Number(effectiveCustomer.id));
          }
          if (!freshCust) {
            const allCust = await db.customers.toArray();
            freshCust = allCust.find(c => String(c.id) === String(effectiveCustomer.id));
          }

          if (freshCust) {
            const currentDue = Number(freshCust.balanceDue) || 0;
            const currentAdv = Number(freshCust.advanceBalance) || 0;
            const currentBilled = Number(freshCust.totalBilled) || 0;
            const currentPaid = Number(freshCust.totalPaid) || 0;

            // Advance is deducted by applied advance amount
            const newAdv = Math.max(0, currentAdv - effectiveAppliedAdvance);
            // Bill remaining balance after advance and spot cash is added to due
            const billUnpaid = Math.max(0, grandTotal - effectiveAppliedAdvance - numPaid);
            const newDue = currentDue + billUnpaid;
            const newBilled = currentBilled + grandTotal;
            const newPaid = currentPaid + numPaid; // Advance is an adjustment; only actual new cash paid increases totalPaid

            await db.customers.update(freshCust.id, {
              totalBilled: newBilled,
              totalPaid: newPaid,
              balanceDue: newDue,
              advanceBalance: newAdv,
              updatedAt: new Date().toISOString()
            });

            // 3. Record advance adjustment entry for audit trail (NOT cash, so it doesn't inflate live drawer)
            if (effectiveAppliedAdvance > 0) {
              await db.customer_payments.add({
                paymentNo: `ADV-ADJ-${Date.now().toString().slice(-6)}`,
                invoiceId: invId,
                customerId: freshCust.id,
                customerName: freshCust.name,
                date: new Date().toISOString(),
                amount: effectiveAppliedAdvance,
                paymentMethod: 'Advance Adjustment',
                isAdvanceAdjustment: true,
                referenceNo: invoiceNo,
                notes: `Advance applied against Bill #${invoiceNo} (پیشگی ایڈوانس سے کٹوتی)`,
                createdAt: new Date().toISOString()
              });
            }

            // 4. Record customer spot cash payment voucher if cash was paid
            if (numPaid > 0) {
              await db.customer_payments.add({
                paymentNo: `PAY-${Date.now().toString().slice(-6)}`,
                invoiceId: invId,
                customerId: freshCust.id,
                customerName: freshCust.name,
                date: new Date().toISOString(),
                amount: numPaid,
                paymentMethod,
                referenceNo: invoiceNo,
                notes: `POS Cash Collection for Invoice #${invoiceNo}`,
                createdAt: new Date().toISOString()
              });
            }
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
      setApplyAdvance(true);
      setAppliedAdvanceAmount(0);
      setInvoiceNo(generateFreshInvoiceNo());
    } catch (err) {
      console.error('Error saving invoice:', err);
      setErrorMessage(err.message || 'Transaction failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '1440px', margin: '0 auto', paddingBottom: '32px' }}>

      {/* ------------------------------------------------------------------------- */}
      {/* 1. SEAMLESS HERO HEADER SECTION (with general_background)                 */}
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
            {isUrdu ? 'سیلز و انوائسنگ' : 'Sales & Invoicing'}
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
              <FileText size={24} />
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
                {isEditMode ? (isUrdu ? `بل ترمیم #${invoiceNo}` : `Edit Bill #${invoiceNo}`) : 'New Bill (نیا بل)'}
              </h1>
              <p style={{
                fontSize: '0.86rem',
                color: 'var(--text-secondary, #64748b)',
                margin: '2px 0 0 0',
                fontWeight: 500
              }}>
                {isEditMode
                  ? (isUrdu ? `موجودہ انوائس #${invoiceNo} میں آئٹمز، مقدار یا ادائیگی کی ترمیم کریں` : `Modifying existing invoice #${invoiceNo} — items & khata will reconcile cleanly`)
                  : (isUrdu ? 'نئی سیلز کا بل بنائیں، کسٹمر کھاتہ اور رکشہ گیٹ پاس جاری کریں' : 'Create new sales invoice, update customer khata, and dispatch gate pass')}
                {isEditMode && (
                  <button
                    type="button"
                    onClick={() => {
                      resetBillForm();
                      if (onClearEditingInvoice) onClearEditingInvoice();
                      if (setActiveView) setActiveView('invoices');
                    }}
                    style={{
                      marginLeft: '10px',
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '6px',
                      padding: '2px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#b45309',
                      cursor: 'pointer'
                    }}
                  >
                    {isUrdu ? 'ترمیم منسوخ کریں (واپس انوائسز)' : '← Cancel Edit'}
                  </button>
                )}
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
          backgroundImage: `url('./general_background.jpg')`,
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
      {/* 2. REAL-TIME KPI STRIP                                                    */}
      {/* ------------------------------------------------------------------------- */}
      <div className="kpi-card-grid">
        {/* KPI 1: Live Cash in Drawer */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon blue">
            <Wallet size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Live Cash Drawer</span>
              <span className="kpi-metric-label-ur">(روزنامچہ کیش)</span>
            </div>
            <div className="kpi-metric-value font-mono">
              Rs. {Number(liveDrawerData.liveCash || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* KPI 2: Today's Sales */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon green">
            <DollarSign size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Today's Sales</span>
              <span className="kpi-metric-label-ur">(آج کی سیلز)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ color: '#059669' }}>
              Rs. {Number(todaySalesTotal).toLocaleString()}
            </div>
          </div>
        </div>

        {/* KPI 3: Market Receivables / Dues */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon amber">
            <CreditCard size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Customer Dues</span>
              <span className="kpi-metric-label-ur">(مارکیٹ بقایا)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ color: '#d97706' }}>
              Rs. {Number(totalCustomerDues).toLocaleString()}
            </div>
          </div>
        </div>

        {/* KPI 4: Yard Stock Available */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon purple">
            <Boxes size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Yard Stock</span>
              <span className="kpi-metric-label-ur">(کل اسٹاک)</span>
            </div>
            <div className="kpi-metric-value font-mono">
              {Math.round(totalYardStock).toLocaleString()} <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Units</span>
            </div>
          </div>
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
          <div className="dash-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
                  <UserPlus size={20} />
                </div>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {isUrdu ? 'گاہک' : 'Customer'} <span style={{ color: '#dc2626' }}>*</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(true)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--accent-blue)',
                  color: 'var(--accent-blue)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} />
                <span>{isUrdu ? 'نیا گاہک' : 'Add Customer'}</span>
              </button>
            </div>

            {/* Selected Customer Card OR Primary Search Selector */}
            <div ref={customerDropdownRef} style={{ position: 'relative' }}>
              {selectedCustomer ? (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
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
                      style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 8px', color: 'var(--text-secondary)', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }}
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
                      gap: '10px',
                      padding: '10px 14px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <Search size={16} style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder={isUrdu ? 'گاہک تلاش کریں یا عام خریدار منتخب کریں...' : 'Search customer or select Walk-in...'}
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setIsCustomerDropdownOpen(true);
                      }}
                      onFocus={() => setIsCustomerDropdownOpen(true)}
                      style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.88rem', color: 'var(--text-primary)' }}
                    />
                    <ChevronDown size={15} style={{ color: 'var(--text-muted)' }} />
                  </div>

                  {/* Dropdown Menu */}
                  {isCustomerDropdownOpen && (
                    <div style={{
                      position: 'absolute', top: '105%', left: 0, right: 0, background: 'var(--bg-card, #FFFFFF)',
                      border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(15,23,42,0.15)',
                      zIndex: 100, maxHeight: '270px', overflowY: 'auto'
                    }}>
                      <div
                        onClick={() => handleSelectCustomer(null)}
                        style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', background: 'rgba(37, 99, 235, 0.03)' }}
                      >
                        <strong style={{ fontSize: '0.86rem', color: 'var(--accent-blue)' }}>{isUrdu ? 'عام خریدار (نقد سیل)' : 'Walk-in Cash Sale'}</strong>
                      </div>
                      {filteredCustomers.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          <div>{isUrdu ? 'کوئی رجسٹرڈ گاہک نہیں ملا' : 'No registered customer found'}</div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomerDropdownOpen(false);
                              setIsNewCustomerModalOpen(true);
                            }}
                            style={{
                              marginTop: '8px',
                              background: 'rgba(37,99,235,0.08)',
                              border: '1px solid var(--accent-blue)',
                              color: 'var(--accent-blue)',
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            + {isUrdu ? 'نیا گاہک کھاتہ درج کریں' : 'Register New Customer'}
                          </button>
                        </div>
                      ) : (
                        filteredCustomers.map(cust => (
                          <div
                            key={cust.id}
                            onClick={() => handleSelectCustomer(cust)}
                            style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                          >
                            <div>
                              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>{cust.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cust.phone || 'No phone'} • {cust.city}</div>
                            </div>
                          </div>
                        ))
                      )}
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

              {/* Main Section Action: Add Item */}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleOpenAddItemModal}
                style={{ fontWeight: 700, padding: '7px 14px', gap: '6px', borderRadius: '8px' }}
              >
                <Plus size={15} />
                <span>{isUrdu ? 'آئٹم شامل کریں' : 'Add Item'}</span>
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
                background: 'var(--bg-primary)',
                height: '420px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Layers size={26} style={{ margin: '0 auto 8px', opacity: 0.35 }} />
                <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {isUrdu ? 'کوئی آئٹم درج نہیں ہے۔ "آئٹم شامل کریں" پر کلک کریں۔' : 'No items added yet. Click "Add Item" to begin.'}
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                height: '420px',
                overflowY: 'auto',
                paddingRight: '6px'
              }}>
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
                          {item.unit === 'Meter'
                            ? `Tiles • Per Meter • ${item.selectedSizePreset || 'Standard'}`
                            : item.unit === 'R.Ft.'
                            ? `${item.selectedSizePreset || item.standardSize || (Number(item.width) > 0 ? `${Math.round(Number(item.width) * 12)}"` : (item.category === 'Kali Patti' ? '2"' : '3"'))} Patti • Running Feet`
                            : item.unit === 'Box'
                            ? `Corner Gola • Per Box`
                            : (item.unit === 'Piece' || item.category === 'Tile Accessories' || item.category === 'Other Accessories' || item.category === 'Flower' || item.category === 'Panels')
                            ? (item.category === 'Flower' ? `Flower Medallion • Per Piece` : (item.category === 'Panels' ? `Decorative Wall Panel (12×24) • Per Piece` : `${item.selectedSizePreset || (item.category === 'Tile Accessories' ? 'Tile Accessory' : (item.category === 'Other Accessories' ? 'Sanitary Piece' : 'Accessory'))} • Per Piece`))
                            : `${isSutarAllowedForItem(item.category, item.unit, item.name) && Number(item.thicknessSutar) > 0 ? `${item.thicknessSutar} Sutar • ` : ''}${item.category ? `${item.category} • ` : ''}${item.selectedSizePreset && item.selectedSizePreset !== '-' ? item.selectedSizePreset + ' • ' : ''}${item.usageTag || 'Standard'}`}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {item.unit === 'Meter' ? (
                            `${item.billedQuantity || item.meters || 0} Meters × Rs. ${item.ratePerSqFt || item.rate}`
                          ) : item.unit === 'R.Ft.' ? (
                            `${item.billedQuantity || item.runningFeet || item.totalSqFt} R.Ft. × Rs. ${item.ratePerSqFt || item.rate} (${item.selectedSizePreset || item.standardSize || (Number(item.width) > 0 ? `${Math.round(Number(item.width) * 12)}"` : (item.category === 'Kali Patti' ? '2"' : '3"'))} Width • ${item.runningFeet || item.length || item.billedQuantity} ft Length)`
                          ) : item.unit === 'Box' ? (
                            `${item.billedQuantity || item.boxes} Box × Rs. ${item.ratePerSqFt || item.rate} (Corner Gola)`
                          ) : (item.unit === 'Piece' || item.category === 'Tile Accessories' || item.category === 'Other Accessories') ? (
                            `${item.billedQuantity || item.pieces || 1} Pcs × Rs. ${item.ratePerSqFt || item.rate}${item.selectedSizePreset ? ` (${item.selectedSizePreset})` : ''}`
                          ) : (
                            `${item.billedQuantity || item.totalSqFt} Sq.Ft × Rs. ${item.ratePerSqFt || item.rate}${item.length && item.width ? ` (${item.selectedSizePreset ? item.selectedSizePreset + ' • ' : ''}${item.length}ft × ${item.width}ft • ${item.pieces} slabs)` : ''}`
                          )}
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
                <div className="dash-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
                      <Percent size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {isUrdu ? 'اضافی اخراجات' : 'Additional Charges'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {isUrdu ? 'ٹرانسپورٹ، مزدوری وغیرہ جیسے اخراجات شامل کریں' : 'Add any extra charges like transport, labour, etc.'}
                      </div>
                    </div>
                  </div>

                  <div ref={chargesMenuRef} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setIsChargesMenuOpen(prev => !prev)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--accent-blue)',
                        color: 'var(--accent-blue)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={14} />
                      <span>{isUrdu ? 'شامل کریں' : 'Add Charge'}</span>
                    </button>

                    {/* Popover Menu for Adding Charges / Concessions */}
                    {isChargesMenuOpen && (
                      <div style={{
                        position: 'absolute', right: 0, top: '110%', background: 'var(--bg-card, #FFFFFF)',
                        border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(15,23,42,0.15)',
                        zIndex: 100, minWidth: '190px', overflow: 'hidden', padding: '4px 0'
                      }}>
                        <div onClick={() => { setIsChargesMenuOpen(false); setIsChargeModalOpen(true); }} style={{ padding: '10px 14px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Plus size={14} style={{ color: 'var(--accent-blue)' }} /> <span>{isUrdu ? 'کرایہ / مزدوری' : 'Carriage / Labour'}</span>
                        </div>
                        <div onClick={() => { setIsChargesMenuOpen(false); setIsDiscountModalOpen(true); }} style={{ padding: '10px 14px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Percent size={14} style={{ color: '#059669' }} /> <span>{isUrdu ? 'رعایت (Discount)' : 'Discount Concession'}</span>
                        </div>
                        <div onClick={() => { setIsChargesMenuOpen(false); setNoteForm(billNote); setIsNoteModalOpen(true); }} style={{ padding: '10px 14px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={14} style={{ color: 'var(--text-secondary)' }} /> <span>{isUrdu ? 'خصوصی نوٹ' : 'Special Note'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // Expanded state when charges/discount/note are active
            return (
              <div className="dash-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
                      <Percent size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {isUrdu ? 'اضافی اخراجات' : 'Additional Charges'}
                      </div>
                    </div>
                  </div>

                  <div ref={chargesMenuRef} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setIsChargesMenuOpen(prev => !prev)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--accent-blue)',
                        color: 'var(--accent-blue)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={14} />
                      <span>{isUrdu ? 'مزید شامل کریں' : 'Add More'}</span>
                    </button>

                    {/* Popover Menu for Adding More */}
                    {isChargesMenuOpen && (
                      <div style={{
                        position: 'absolute', right: 0, top: '110%', background: 'var(--bg-card, #FFFFFF)',
                        border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(15,23,42,0.15)',
                        zIndex: 100, minWidth: '190px', overflow: 'hidden', padding: '4px 0'
                      }}>
                        <div onClick={() => { setIsChargesMenuOpen(false); setIsChargeModalOpen(true); }} style={{ padding: '10px 14px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Plus size={14} style={{ color: 'var(--accent-blue)' }} /> <span>{isUrdu ? 'کرایہ / مزدوری' : 'Carriage / Labour'}</span>
                        </div>
                        <div onClick={() => { setIsChargesMenuOpen(false); setIsDiscountModalOpen(true); }} style={{ padding: '10px 14px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Percent size={14} style={{ color: '#059669' }} /> <span>{isUrdu ? 'رعایت (Discount)' : 'Discount Concession'}</span>
                        </div>
                        <div onClick={() => { setIsChargesMenuOpen(false); setNoteForm(billNote); setIsNoteModalOpen(true); }} style={{ padding: '10px 14px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={14} style={{ color: 'var(--text-secondary)' }} /> <span>{isUrdu ? 'خصوصی نوٹ' : 'Special Note'}</span>
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
        <div style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* BILL SUMMARY CARD */}
          <div className="dash-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={18} style={{ color: 'var(--accent-blue)' }} />
              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{isUrdu ? 'بل سمری' : 'Bill Summary'}</span>
            </div>

            {/* BILL TOTAL */}
            <div style={{
              background: 'rgba(37,99,235,0.05)',
              border: '1px solid rgba(37,99,235,0.1)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: '4px' }}>
                  {isUrdu ? 'کل رقم' : 'Bill Total'}
                </div>
                <div className="font-mono" style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  Rs. {grandTotal.toLocaleString()}
                </div>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
                <Wallet size={24} />
              </div>
            </div>
          </div>

          {/* PAYMENT CARD */}
          <div className="dash-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <Layers size={18} style={{ color: 'var(--accent-blue)' }} />
              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{isUrdu ? 'ادائیگی' : 'Payment'}</span>
            </div>

            {/* PAYMENT TABS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[
                { id: 'Cash', icon: <Wallet size={16} />, label: 'Cash' },
                { id: 'Card', icon: <FileText size={16} />, label: 'Card' },
                { id: 'Bank Transfer', icon: <Layers size={16} />, label: 'Bank Transfer' },
                { id: 'Udhaar', icon: <UserPlus size={16} />, label: 'Udhaar' }
              ].map(tab => {
                const isActive = (tab.id === 'Udhaar' && numPaid === 0) || (paymentMethod === tab.id && numPaid > 0);
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      if (tab.id === 'Udhaar') {
                        setPaidAmount(0);
                        setPaymentMethod('Cash');
                      } else {
                        setPaymentMethod(tab.id);
                        if (numPaid === 0) setPaidAmount(grandTotal);
                      }
                    }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '12px 4px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
                      background: isActive ? 'var(--accent-blue)' : 'var(--bg-primary)',
                      border: isActive ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                      color: isActive ? '#fff' : 'var(--text-secondary)'
                    }}
                  >
                    {tab.icon}
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, textAlign: 'center' }}>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* DIRECT DISCOUNT (RS) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {isUrdu ? 'رعایت / ڈسکاؤنٹ' : 'Discount (Rs.)'}
                </label>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Max: Rs. {billTotalBeforeDiscount.toLocaleString()}
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min="0"
                  max={billTotalBeforeDiscount}
                  value={discount.value === 0 ? '' : discount.value}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setDiscount({ type: 'fixed', value: 0, reason: '' });
                    } else {
                      const val = parseFloat(raw) || 0;
                      const cappedVal = Math.min(billTotalBeforeDiscount, Math.max(0, val));
                      setDiscount({ type: 'fixed', value: cappedVal, reason: 'Direct Bill Discount' });
                    }
                  }}
                  className="form-control font-mono"
                  style={{ paddingLeft: '16px', paddingRight: '40px', fontSize: '1rem', fontWeight: 600, color: '#dc2626', height: '44px', borderRadius: '8px', background: 'var(--bg-primary)' }}
                  placeholder="0"
                />
                <span style={{ position: 'absolute', right: '16px', top: '12px', fontSize: '0.85rem', color: '#dc2626', fontWeight: 700 }}>
                  Rs.
                </span>
              </div>
            </div>

            {/* CUSTOMER ADVANCE NOTIFICATION & ADJUSTMENT */}
            {selectedCustomer && customerAdvanceAvailable > 0 && (
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: '#1e40af', cursor: 'pointer', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={applyAdvance}
                      onChange={(e) => setApplyAdvance(e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span>{isUrdu ? 'پیشگی ایڈوانس لاگو کریں' : 'Apply Customer Advance'}</span>
                  </label>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2563eb', fontFamily: 'var(--font-mono)' }}>
                    Rs. {customerAdvanceAvailable.toLocaleString()}
                  </span>
                </div>

                {applyAdvance && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#475569', paddingTop: '4px', borderTop: '1px dashed #bfdbfe' }}>
                    <span>
                      {isUrdu ? 'بل پر کٹوتی:' : 'Applied to Bill:'} <strong>Rs. {effectiveAppliedAdvance.toLocaleString()}</strong>
                    </span>
                    <span>
                      {isUrdu ? 'باقی ایڈوانس:' : 'Remaining Advance:'} <strong style={{ color: '#059669' }}>Rs. {(customerAdvanceAvailable - effectiveAppliedAdvance).toLocaleString()}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* AMOUNT PAYING */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', display: 'block' }}>
                {isUrdu ? 'رقم ادا کی جا رہی ہے' : 'Amount Paying'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min="0"
                  max={grandTotal}
                  value={paidAmount || ''}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="form-control font-mono"
                  style={{ paddingLeft: '16px', paddingRight: '40px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', height: '46px', borderRadius: '8px', background: 'var(--bg-primary)' }}
                  placeholder="Enter amount..."
                />
                <span style={{ position: 'absolute', right: '16px', top: '13px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Rs.
                </span>
              </div>
            </div>

            {/* DUE AND CHANGE */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'rgba(220, 38, 38, 0.05)', border: '1px solid rgba(220, 38, 38, 0.1)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Due</div>
                <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626' }}>Rs. {balanceDue > 0 ? balanceDue.toLocaleString() : '0'}</div>
              </div>
              <div style={{ background: 'rgba(5, 150, 105, 0.05)', border: '1px solid rgba(5, 150, 105, 0.1)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Change</div>
                <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669' }}>Rs. {numPaid > grandTotal ? (numPaid - grandTotal).toLocaleString() : '0'}</div>
              </div>
            </div>

            {/* PAYMENT METHOD DROPDOWN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {isUrdu ? 'ادائیگی کا طریقہ' : 'Payment Method'}
              </label>
              <select
                className="form-control"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ fontWeight: 600, height: '42px', borderRadius: '8px', fontSize: '0.85rem', background: 'var(--bg-primary)' }}
              >
                <option value="Cash">{isUrdu ? 'نقد دراز کیش' : 'Cash in Drawer'}</option>
                <option value="Bank Transfer">{isUrdu ? 'بینک ٹرانسفر' : 'Bank Transfer'}</option>
                <option value="Card">Card</option>
              </select>
            </div>

            {/* ACTION BUTTONS (SAVE & BILL PRINT + BILL PROFIT REPORT) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {/* PRIMARY 1: SAVE & PRINT BILL (CUSTOMER COPY) */}
              <button
                type="button"
                className="btn btn-primary"
                disabled={lineItems.length === 0 || isSaving}
                onClick={() => setIsReviewModalOpen(true)}
                style={{
                  padding: '13px 16px',
                  fontSize: '0.96rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  borderRadius: '9px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  cursor: lineItems.length === 0 || isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                <Printer size={18} />
                <span>{isUrdu ? 'محفوظ و پرنٹ بل (Customer Copy)' : 'Save & Print Bill'}</span>
              </button>

              {/* PRIMARY 2: BILL PROFIT REPORT (ADMIN CONFIDENTIAL PDF & PRINT) */}
              <button
                type="button"
                disabled={lineItems.length === 0}
                onClick={() => setIsProfitModalOpen(true)}
                style={{
                  padding: '12px 16px',
                  fontSize: '0.90rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  borderRadius: '9px',
                  cursor: lineItems.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: lineItems.length === 0 ? 0.6 : 1,
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.22)',
                  transition: 'all 0.2s ease'
                }}
                title={isUrdu ? 'کیٹگری وائز بل منافع رپورٹ (ایڈمن پی ڈی ایف ریکارڈ)' : 'Bill Profit Report (Category-wise profit & PDF export for Admin)'}
              >
                <TrendingUp size={17} />
                <span>{isUrdu ? 'بل منافع رپورٹ (Admin PDF)' : 'Bill Profit Report (Admin PDF)'}</span>
              </button>
            </div>

            {/* SECONDARY ACTIONS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                onClick={() => alert(isUrdu ? 'ڈرافٹ محفوظ ہو گیا۔' : 'Bill draft saved.')}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '10px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FileText size={14} />
                {isUrdu ? 'ڈرافٹ محفوظ' : 'Save Draft'}
              </button>
              <button
                type="button"
                onClick={() => setIsDiscardModalOpen(true)}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '10px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <X size={14} />
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
        <div className="app-modal-overlay" onClick={() => setIsItemModalOpen(false)}>
          <div className="app-modal-card" style={{ maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="app-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="app-modal-icon-badge">
                  <Layers size={24} color="#ffffff" />
                </div>
                <div>
                  <h3 className="app-modal-title">
                    {editingItemIndex !== null ? (isUrdu ? 'آئٹم میں ترمیم کریں' : 'Edit Bill Item') : (isUrdu ? 'بل میں آئٹم شامل کریں' : 'Add Item to Bill')}
                  </h3>
                  <p className="app-modal-subtitle">
                    {isUrdu ? 'کیٹیگری فلٹرز، دستیاب اسٹاک اور سائز منتخب کریں' : 'Filter categories, select in-stock item & configure dimensions'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="app-modal-close-btn"
                onClick={() => setIsItemModalOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="app-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* 1. Category Filter & Search Input */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '12px' }}>
                <div className="app-form-group">
                  <label className="app-form-label">
                    <Filter size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    {isUrdu ? 'کیٹیگری فلٹر' : 'Category Filter'}
                  </label>
                  <div className="app-input-wrapper">
                    <select
                      className="app-form-select"
                      value={itemCategoryFilter}
                      onChange={(e) => handleCategoryFilterChange(e.target.value)}
                      style={{ fontWeight: 700 }}
                    >
                      <option value="ALL">{isUrdu ? 'تمام کیٹگریز (All)' : 'All Categories'}</option>
                      {ITEM_CATEGORY_FILTERS.filter(f => f.id !== 'ALL').map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="app-input-chevron" />
                  </div>
                </div>

                <div className="app-form-group">
                  <label className="app-form-label">
                    <Search size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    {isUrdu ? 'اسٹاک آئٹم سرچ کریں' : 'Quick Search Item'}
                  </label>
                  <div className="app-input-wrapper">
                    <input
                      type="text"
                      className="app-form-input font-mono"
                      placeholder={isUrdu ? 'نام، کوڈ یا سائز سے تلاش کریں...' : 'Search by name, code or size...'}
                      value={stockSearchQuery}
                      onChange={(e) => setStockSearchQuery(e.target.value)}
                      style={{ fontSize: '0.84rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Registered Stock Item Dropdown */}
              <div className="app-form-group">
                <label className="app-form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    <Boxes size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px', color: '#2563eb' }} />
                    {isUrdu ? 'اسٹاک ریکارڈ سے آئٹم منتخب کریں' : 'Select Registered Stock Item'} <span className="app-form-label-required">*</span>
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>
                    {filteredModalItems.length} {isUrdu ? 'دستیاب ریکارڈز' : 'items found'}
                  </span>
                </label>
                <div className="app-input-wrapper">
                  <select
                    className="app-form-select font-mono"
                    value={itemModalForm.itemId || ''}
                    onChange={(e) => {
                      const sel = (items || []).find(i => i.id === parseInt(e.target.value, 10));
                      if (sel) handleItemSelectInModal(sel);
                    }}
                    style={{
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      height: '42px',
                      borderColor: '#3b82f6'
                    }}
                  >
                    {filteredModalItems.length === 0 ? (
                      <option value="" disabled>
                        {isUrdu ? 'کوئی اسٹاک آئٹم موجود نہیں ہے' : 'No stock items match your search'}
                      </option>
                    ) : (
                      filteredModalItems.map(it => (
                        <option key={it.id} value={it.id}>
                          {formatStockOptionLabel(it)}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown size={14} className="app-input-chevron" />
                </div>
              </div>

              {/* 3. Selected Stock Item Specifications (Card / Badges - Read Only) */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {itemModalForm.category} {itemModalForm.code ? `• #${itemModalForm.code}` : ''}
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                      {itemModalForm.name || (isUrdu ? 'کوئی آئٹم منتخب نہیں' : 'No item selected')}
                    </div>
                  </div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: itemModalForm.availableStock > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: itemModalForm.availableStock > 0 ? '#059669' : '#dc2626',
                    fontWeight: 700,
                    fontSize: '0.80rem',
                    flexShrink: 0
                  }}>
                    <Boxes size={14} />
                    <span>
                      {isUrdu ? 'دستیاب یارڈ اسٹاک:' : 'In Yard:'} {Number(itemModalForm.availableStock || 0).toLocaleString()} {itemModalForm.unit}
                    </span>
                  </div>
                </div>

                {/* Specification Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                    📏 {isUrdu ? 'سائز:' : 'Size:'} {itemModalForm.standardSize || itemModalForm.size || '-'}
                  </div>
                  {Number(itemModalForm.thicknessSutar) > 0 && (
                    <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, color: '#2563eb' }}>
                      🔷 {itemModalForm.thicknessSutar} {isUrdu ? 'سوتر' : 'Sutar'}
                    </div>
                  )}
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>
                    ⚖ {isUrdu ? 'یونٹ:' : 'Unit:'} {itemModalForm.unit}
                  </div>
                  {itemModalForm.subCategory && (
                    <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                      🏷 {itemModalForm.subCategory}
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Stock Exceed Warning Banner (if requested > available) */}
              {Number(itemModalForm.availableStock || 0) > 0 && parseFloat(itemModalForm.billedQuantity || 0) > Number(itemModalForm.availableStock || 0) && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(234, 88, 12, 0.1)',
                  border: '1px solid rgba(234, 88, 12, 0.3)',
                  borderRadius: '8px',
                  color: '#c2410c',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.80rem',
                  fontWeight: 600
                }}>
                  <AlertTriangle size={18} color="#ea580c" style={{ flexShrink: 0 }} />
                  <span>
                    {isUrdu
                      ? `انتباہ: مطلوبہ بلنگ مقدار (${itemModalForm.billedQuantity} ${itemModalForm.unit}) موجودہ یارڈ اسٹاک (${itemModalForm.availableStock} ${itemModalForm.unit}) سے زیادہ ہے!`
                      : `Stock Warning: Requested quantity (${itemModalForm.billedQuantity} ${itemModalForm.unit}) exceeds available yard stock (${itemModalForm.availableStock} ${itemModalForm.unit})!`}
                  </span>
                </div>
              )}

              {/* 5. Billing Inputs: Quantity, Rate, and Line Total */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '12px',
                alignItems: 'flex-start'
              }}>
                {/* Quantity Input */}
                <div className="app-form-group">
                  <label className="app-form-label" style={{ fontWeight: 700 }}>
                    {isUrdu ? `بلنگ مقدار (${itemModalForm.unit})` : `Billed Quantity (${itemModalForm.unit})`} <span className="app-form-label-required">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    className="app-form-input font-mono"
                    value={itemModalForm.billedQuantity || ''}
                    onChange={(e) => handleBilledQuantityChange(e.target.value)}
                    placeholder="e.g. 50"
                    style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}
                    autoFocus
                  />
                  <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                    {isUrdu ? `یونٹ: ${itemModalForm.unit}` : `Billed per ${itemModalForm.unit}`}
                  </span>
                </div>

                {/* Sale Rate Input */}
                <div className="app-form-group">
                  <label className="app-form-label" style={{ fontWeight: 700 }}>
                    {isUrdu ? `سیل ریٹ (Rs. / ${itemModalForm.unit})` : `Sale Rate (Rs. / ${itemModalForm.unit})`} <span className="app-form-label-required">*</span>
                  </label>
                  <div className="app-input-wrapper">
                    <DollarSign size={16} className="app-input-icon" />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      className="app-form-input font-mono"
                      value={itemModalForm.ratePerSqFt || ''}
                      onChange={(e) => handleSaleRateChange(e.target.value)}
                      placeholder="e.g. 180"
                      style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}
                    />
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                    {isUrdu ? 'فیکٹری ریٹ' : 'Selling price'}
                  </span>
                </div>

                {/* Line Total Display */}
                <div className="app-form-group">
                  <label className="app-form-label" style={{ fontWeight: 700 }}>
                    {isUrdu ? 'کل رقم (Line Total Rs.)' : 'Total Amount (Rs.)'}
                  </label>
                  <div className="font-mono" style={{
                    padding: '8px 12px',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '1.1rem',
                    fontWeight: 900,
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    height: '38px',
                    boxSizing: 'border-box'
                  }}>
                    Rs. {Number(itemModalForm.amount || 0).toLocaleString()}
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 600, marginTop: '2px' }}>
                    = {itemModalForm.billedQuantity || 0} × Rs. {itemModalForm.ratePerSqFt || 0}
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="app-modal-footer">
              <button
                type="button"
                className="app-btn-cancel"
                onClick={() => setIsItemModalOpen(false)}
              >
                <X size={16} />
                <span>{isUrdu ? 'منسوخ کریں' : 'Cancel'}</span>
              </button>
              <button
                type="button"
                className="app-btn-submit"
                onClick={handleSaveItemModal}
              >
                <Plus size={16} />
                <span>{editingItemIndex !== null ? (isUrdu ? 'آئٹم اپ ڈیٹ کریں' : 'Update Item') : (isUrdu ? 'بل میں شامل کریں' : 'Add to Bill')}</span>
              </button>
            </div>
          </div>
        </div>
      )}{/* MODAL 2: REGISTER NEW CUSTOMER (Exact Customer Khata Profile Form) */}
      {isNewCustomerModalOpen && (
        <CustomerProfileModal
          customer={null}
          onClose={() => setIsNewCustomerModalOpen(false)}
          onSave={handleCreateNewCustomer}
        />
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
                  {isEditMode ? (isUrdu ? 'بل ترمیم جائزہ و تصدیق' : 'Edit Bill Review') : (isUrdu ? 'بل جائزہ و تصدیق' : 'Bill Review')}
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
                  <strong>{lineItems.length} {isUrdu ? 'اشیاء' : 'items'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total:</span>
                  <strong className="font-mono">Rs. {grandTotal.toLocaleString()}</strong>
                </div>
                {effectiveAppliedAdvance > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563eb' }}>
                    <span>Advance Applied:</span>
                    <strong className="font-mono">Rs. {effectiveAppliedAdvance.toLocaleString()}</strong>
                  </div>
                )}
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
                  <span><strong>{isEditMode ? 'Invoice & Khata:' : 'Inventory:'}</strong> {isEditMode ? `Updates existing invoice #${invoiceNo}, customer khata, and advance balance.` : `Automatic stock deduction across ${lineItems.length} items.`}</span>
                </div>
                {paymentMethod === 'Cash' && numPaid > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Wallet size={14} style={{ color: '#059669' }} />
                    <span><strong>Cash Drawer:</strong> +Rs. {numPaid.toLocaleString()} added to live drawer.</span>
                  </div>
                )}
              </div>

            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsReviewModalOpen(false)}>
                ← Back
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setIsProfitModalOpen(true)}
                  style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#059669',
                    fontWeight: 800,
                    padding: '7px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="View Profit Report & Export PDF"
                >
                  <TrendingUp size={14} />
                  <span>{isUrdu ? 'منافع رپورٹ (PDF)' : 'Profit Report (PDF)'}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={isSaving}
                  onClick={handleExecuteSaveInvoice}
                  style={{ fontWeight: 800, padding: '7px 16px' }}
                >
                  {isSaving ? 'Saving...' : (isEditMode ? (isUrdu ? 'تبدیلیاں محفوظ کریں' : 'Update & Save') : (isUrdu ? 'محفوظ کریں' : 'Confirm & Save'))}
                </button>
              </div>
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
          if (justFinishedEdit) {
            setJustFinishedEdit(false);
            if (setActiveView) setActiveView('invoices');
          }
        }}
        invoice={createdInvoice}
        settings={settings}
      />

      {/* BILL PROFIT REPORT MODAL (Category-Wise Profit & PDF Export for Admin Record) */}
      <BillProfitPrintModal
        isOpen={isProfitModalOpen}
        onClose={() => setIsProfitModalOpen(false)}
        invoice={createdInvoice || currentInvoiceObject}
        settings={settings}
      />

    </div>
  );
}
