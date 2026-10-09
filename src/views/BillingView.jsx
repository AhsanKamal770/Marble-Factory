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

export default function BillingView({ setActiveView, settings }) {
  const { language } = useLanguage();
  const isUrdu = language === 'ur';

  // Live KPI Queries for Dashboard-Consistent Metrics Strip
  const allLiveInvoices = useLiveQuery(() => db.invoices.toArray(), []) || [];
  const allLiveCustomers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const allLiveItems = useLiveQuery(() => db.items.toArray(), []) || [];
  const allLivePayments = useLiveQuery(() => db.customer_payments.toArray(), []) || [];
  const allLiveExpenses = useLiveQuery(() => db.daily_expenses.toArray(), []) || [];

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

  // Pre-Save Review & Save States
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isProfitModalOpen, setIsProfitModalOpen] = useState(false);
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
  const billTotalBeforeDiscount = subtotal + totalCharges;

  let netDiscount = 0;
  if (discount.type === 'percentage') {
    netDiscount = Math.round((subtotal * (parseFloat(discount.value) || 0)) / 100);
  } else {
    netDiscount = parseFloat(discount.value) || 0;
  }
  // Cap discount so it cannot exceed the bill total
  netDiscount = Math.min(billTotalBeforeDiscount, Math.max(0, netDiscount));

  const grandTotal = Math.max(0, billTotalBeforeDiscount - netDiscount);
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
      paidAmount: createdInvoice?.paidAmount !== undefined ? createdInvoice.paidAmount : numPaid,
      balanceDue: createdInvoice?.balanceDue !== undefined ? createdInvoice.balanceDue : balanceDue,
      paymentStatus: createdInvoice?.paymentStatus || paymentStatus,
      paymentMethod: createdInvoice?.paymentMethod || paymentMethod,
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

      const updatedCustomers = await db.customers.toArray();
      setCustomers(updatedCustomers.sort((a, b) => Number(b.balanceDue || 0) - Number(a.balanceDue || 0)));

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
  const ITEM_CATEGORY_FILTERS = [
    { id: 'Marble', label: 'Marble (ماربل - فی مربع فٹ)', labelUrdu: 'ماربل (فی مربع فٹ)' },
    { id: 'Tiles', label: 'Tiles (ٹائلز - فی میٹر: 5 پیس)', labelUrdu: 'ٹائلز (فی میٹر: 5 پیس)' },
    { id: 'Border', label: 'Border (بارڈر پٹی - فی رننگ فٹ)', labelUrdu: 'بارڈر پٹی (فی رننگ فٹ)' },
    { id: 'Kali Patti', label: 'Kali Patti (کالی پٹی - فی رننگ فٹ)', labelUrdu: 'کالی پٹی (فی رننگ فٹ)' },
    { id: 'Flower', label: 'Flower (پھول - فی پیس)', labelUrdu: 'پھول (فی پیس)' },
    { id: 'Panels', label: 'Panels (ماشاء اللہ و قرآنی پینل - فی پیس)', labelUrdu: 'پینل (فی پیس)' },
    { id: 'Accessories', label: 'Tile Accessories (لوازمات)', labelUrdu: 'ٹائل لوازمات' }
  ];

  const matchItemToFilter = (it, filter) => {
    if (!it) return false;
    if (filter === 'ALL') return true;
    const name = (it.name || '').toLowerCase();
    const cat = (it.category || '').toLowerCase();
    const sub = (it.subCategory || '').toLowerCase();

    if (filter === 'Marble') {
      return (cat.includes('marble') || sub.includes('marble') || name.includes('marble') || cat.includes('slab') || name.includes('slab') || name.includes('sutar')) &&
        !cat.includes('tile') && !sub.includes('tile') && !name.includes('flower') && !name.includes('border') && !name.includes('patti') && !name.includes('panel') && !name.includes('mashallah') && !cat.includes('accessories');
    }
    if (filter === 'Flower') {
      return name.includes('flower') || cat.includes('flower') || sub.includes('flower') || name.includes('phool') || name.includes('medallion');
    }
    if (filter === 'Border') {
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
    if (filter === 'Accessories') {
      return cat.includes('accessories') || sub.includes('accessories') || name.includes('spacer') || name.includes('filling') || name.includes('gola') || name.includes('bond') || sub.includes('gola') || sub.includes('spacer') || sub.includes('bond');
    }
    if (filter === 'Panels') {
      return name.includes('panel') || cat.includes('panel') || sub.includes('panel') || name.includes('mashallah') || name.includes('ayat');
    }
    return true;
  };

  const inStockItems = items.filter(it => {
    const stock = Number(it.stockSqFt || it.stockPieces || it.stockBoxes || 0);
    return stock > 0;
  });

  const filteredModalItems = inStockItems.filter(it => matchItemToFilter(it, itemCategoryFilter));

  const handleOpenAddItemModal = () => {
    setItemCategoryFilter('Marble');
    setSelectedSizePreset('12 × 12');
    const available = items.filter(it => Number(it.stockSqFt || it.stockPieces || it.stockBoxes || 0) > 0);
    const marbleItems = available.filter(it => matchItemToFilter(it, 'Marble'));
    const defaultItem = marbleItems[0] || available[0] || items[0] || {};
    const rate = defaultItem.ratePerSqFt || 160;
    const isKitchen = defaultItem.subCategory?.includes('Kitchen') || defaultItem.name?.includes('Kitchen') || defaultItem.sutarThickness === 6;
    const sutar = defaultItem.sutarThickness || (isKitchen ? 6 : 4);
    const availStock = Number(defaultItem.stockSqFt || defaultItem.stockPieces || defaultItem.stockBoxes || 0);

    const unitCost = Number(defaultItem.costPerSqFt) || Number(defaultItem.purchasePrice) || Math.round(rate * 0.72);

    setItemModalForm({
      itemId: defaultItem.id || null,
      name: defaultItem.name || 'Badal Grey Marble 4-Sutar (12×12)',
      category: defaultItem.category || 'Marble',
      subCategory: defaultItem.subCategory || '4 Sutar (12×12)',
      thicknessSutar: sutar,
      usageTag: isKitchen ? 'Kitchen / Stairs (صرف کچن اور سیڑھیاں)' : (sutar === 6 ? 'Kitchen / Stairs (صرف کچن اور سیڑھیاں)' : (sutar === 9 ? 'Heavy Steps' : (sutar === 14 ? 'Heavy Base' : 'Standard Floor'))),
      length: 1,
      width: 1,
      pieces: 10,
      boxes: 0,
      meters: 2,
      runningFeet: 10,
      totalSqFt: 10,
      ratePerSqFt: rate,
      costPerSqFt: unitCost,
      availableStock: availStock || 3800,
      unit: defaultItem.unit || 'Sq. Ft.'
    });
    setEditingItemIndex(null);
    setIsItemModalOpen(true);
  };

  const handleOpenEditItemModal = (index) => {
    const item = lineItems[index];
    const matchItem = items.find(i => i.id === item.itemId);
    const cat = item.category || 'Marble';
    setSelectedSizePreset(item.selectedSizePreset || null);
    setItemCategoryFilter(cat);
    setItemModalForm({
      ...item,
      runningFeet: item.runningFeet || item.billedQuantity || item.totalSqFt || 10,
      meters: item.meters || item.billedQuantity || (item.pieces ? item.pieces / 5 : 2),
      boxes: item.boxes || (item.unit === 'Box' ? item.billedQuantity : 0),
      pieces: item.pieces || 1,
      totalSqFt: item.billedQuantity || item.totalSqFt || 10,
      availableStock: matchItem ? Number(matchItem.stockSqFt || matchItem.stockPieces || matchItem.stockBoxes || 0) : 4500,
      unit: item.unit || (matchItem ? matchItem.unit : 'Sq. Ft.')
    });
    setEditingItemIndex(index);
    setIsItemModalOpen(true);
  };

  const handleItemSelectInModal = (selectedItem) => {
    const rate = selectedItem.ratePerSqFt || selectedItem.rate || 180;
    const isKitchen = (selectedItem.subCategory && selectedItem.subCategory.includes('Kitchen')) ||
      (selectedItem.name && selectedItem.name.includes('Kitchen')) ||
      selectedItem.sutarThickness === 6;
    const sutar = selectedItem.sutarThickness || (isKitchen ? 6 : 4);
    const avail = Number(selectedItem.stockSqFt || selectedItem.stockPieces || selectedItem.stockBoxes || 0);

    let itemL = 1;
    let itemW = 1;
    let itemPreset = '12 × 12';
    let unit = selectedItem.unit || 'Sq. Ft.';

    const cat = selectedItem.category || itemCategoryFilter;
    const isTile = cat === 'Tiles' || itemCategoryFilter === 'Tiles';
    const isRunning = cat === 'Border' || cat === 'Kali Patti' || itemCategoryFilter === 'Border' || itemCategoryFilter === 'Kali Patti';
    const isFlower = cat === 'Flower' || itemCategoryFilter === 'Flower';
    const isPanel = cat === 'Panels' || itemCategoryFilter === 'Panels';
    const isAccessory = cat === 'Accessories' || itemCategoryFilter === 'Accessories';

    if (isFlower) {
      itemL = 1; itemW = 1; itemPreset = '12 × 12'; unit = 'Piece';
    } else if (cat === 'Border' || itemCategoryFilter === 'Border') {
      itemL = 10; itemW = 0.25; itemPreset = '3 inch'; unit = 'R.Ft.';
    } else if (cat === 'Kali Patti' || itemCategoryFilter === 'Kali Patti') {
      itemL = 10; itemW = 0.166; itemPreset = '2 inch'; unit = 'R.Ft.';
    } else if (isTile) {
      itemL = 2; itemW = 1; itemPreset = '12 × 24'; unit = 'Meter';
    } else if (isPanel) {
      itemL = 4; itemW = 2; itemPreset = '24 × 48'; unit = 'Piece';
    } else if (isAccessory) {
      const isGola = (selectedItem.name || '').toLowerCase().includes('gola');
      itemL = 1; itemW = 1; itemPreset = isGola ? 'Gola' : 'Filling'; unit = isGola ? 'Box' : 'Piece';
    } else {
      itemL = 1; itemW = 1; itemPreset = '12 × 12'; unit = 'Sq. Ft.';
    }

    if (selectedItem.length !== undefined && selectedItem.length !== null && Number(selectedItem.length) > 0) {
      itemL = Number(selectedItem.length);
    }
    if (selectedItem.width !== undefined && selectedItem.width !== null && Number(selectedItem.width) > 0) {
      itemW = Number(selectedItem.width);
    }

    setSelectedSizePreset(itemPreset);
    setItemModalForm(prev => {
      const unitCost = Number(selectedItem.costPerSqFt) || Number(selectedItem.purchasePrice) || Number(selectedItem.unitCost) || Math.round(rate * 0.72);

      if (isTile) {
        const p = prev.pieces || 10;
        const m = Math.round((p / 5) * 100) / 100;
        return {
          ...prev,
          itemId: selectedItem.id,
          name: selectedItem.name,
          category: 'Tiles',
          subCategory: selectedItem.subCategory || '',
          thicknessSutar: 0,
          usageTag: 'Porcelain / Ceramic Tile (Per Meter: 5 Pcs = 1m)',
          length: itemL,
          width: itemW,
          pieces: p,
          meters: m,
          boxes: 0,
          totalSqFt: m,
          ratePerSqFt: rate,
          costPerSqFt: unitCost,
          availableStock: avail || 2000,
          unit: 'Meter',
          amount: Math.round(m * rate)
        };
      }

      if (isRunning) {
        const inch = itemPreset === '6 inch' ? 6 : (itemPreset === '3 inch' ? 3 : 2);
        const rft = 10;
        const pcs = Math.ceil((rft * 12) / inch);
        return {
          ...prev,
          itemId: selectedItem.id,
          name: selectedItem.name,
          category: selectedItem.category || itemCategoryFilter,
          subCategory: selectedItem.subCategory || '',
          thicknessSutar: inch,
          usageTag: `${inch} inch Running Patti`,
          length: rft,
          width: inch / 12,
          pieces: pcs,
          runningFeet: rft,
          ratePerSqFt: rate,
          costPerSqFt: unitCost,
          availableStock: avail || 2500,
          unit: 'R.Ft.',
          totalSqFt: rft,
          amount: Math.round(rft * rate)
        };
      }

      if (isFlower || isPanel) {
        const pcs = prev.pieces || 1;
        return {
          ...prev,
          itemId: selectedItem.id,
          name: selectedItem.name,
          category: isFlower ? 'Flower' : 'Panels',
          subCategory: selectedItem.subCategory || '',
          thicknessSutar: 0,
          usageTag: isFlower ? 'Flower Medallion (Per Piece)' : 'Decorative Wall Panel (Per Piece)',
          length: itemL,
          width: itemW,
          pieces: pcs,
          boxes: 0,
          totalSqFt: pcs,
          ratePerSqFt: rate,
          costPerSqFt: unitCost,
          availableStock: avail || 100,
          unit: 'Piece',
          amount: Math.round(pcs * rate)
        };
      }

      if (isAccessory) {
        const isGola = (selectedItem.name || '').toLowerCase().includes('gola') || itemPreset === 'Gola';
        const unitLabel = isGola ? 'Box' : 'Piece';
        const qty = prev.pieces || prev.boxes || 1;
        return {
          ...prev,
          itemId: selectedItem.id,
          name: selectedItem.name,
          category: 'Accessories',
          subCategory: selectedItem.subCategory || '',
          thicknessSutar: 0,
          usageTag: isGola ? 'Chamfer Corner Gola (Per Box)' : 'Tile Accessory (Per Piece)',
          length: 1,
          width: 1,
          pieces: isGola ? 0 : qty,
          boxes: isGola ? qty : 0,
          ratePerSqFt: rate || (isGola ? 350 : 450),
          costPerSqFt: unitCost || (isGola ? 250 : 320),
          availableStock: avail || 500,
          unit: unitLabel,
          totalSqFt: qty,
          amount: Math.round(qty * (rate || (isGola ? 350 : 450)))
        };
      }

      // Marble
      const p = prev.pieces || 10;
      const sqft = Math.round(itemL * itemW * p * 100) / 100;
      return {
        ...prev,
        itemId: selectedItem.id,
        name: selectedItem.name,
        category: 'Marble',
        subCategory: selectedItem.subCategory || '',
        thicknessSutar: sutar,
        usageTag: isKitchen ? 'Kitchen / Stairs (صرف کچن اور سیڑھیاں)' : (sutar === 6 ? 'Kitchen / Stairs (صرف کچن اور سیڑھیاں)' : (sutar === 9 ? 'Heavy Steps' : (sutar === 14 ? 'Heavy Base' : 'Standard Floor'))),
        length: itemL,
        width: itemW,
        pieces: p,
        boxes: 0,
        ratePerSqFt: rate,
        costPerSqFt: unitCost,
        availableStock: avail || 3800,
        unit: 'Sq. Ft.',
        totalSqFt: sqft,
        amount: Math.round(sqft * rate)
      };
    });
  };

  const handleCategoryFilterChange = (filterId) => {
    setItemCategoryFilter(filterId);
    const matching = inStockItems.filter(it => matchItemToFilter(it, filterId));
    let targetItem = null;
    if (matching.length > 0) {
      const isCurrentlySelectedInMatching = matching.some(it => it.id === itemModalForm.itemId);
      targetItem = isCurrentlySelectedInMatching ? items.find(it => it.id === itemModalForm.itemId) : matching[0];
    } else {
      targetItem = items.find(it => matchItemToFilter(it, filterId)) || items[0];
    }

    if (targetItem) {
      handleItemSelectInModal(targetItem);
    }

    // Set default preset based on category
    if (filterId === 'Flower') {
      handleApplySizePreset({ label: '12 × 12', length: 1, width: 1, unit: 'Piece', defaultRate: 850 });
    } else if (filterId === 'Border') {
      handleApplySizePreset({ label: '3 inch', inch: 3, unit: 'R.Ft.', defaultRate: 120 });
    } else if (filterId === 'Kali Patti') {
      handleApplySizePreset({ label: '2 inch', inch: 2, unit: 'R.Ft.', defaultRate: 90 });
    } else if (filterId === 'Tiles') {
      handleApplySizePreset({ label: '12 × 24', length: 2, width: 1, unit: 'Meter', defaultRate: 850 });
    } else if (filterId === 'Accessories') {
      handleApplySizePreset({ label: 'Filling', unit: 'Piece', defaultRate: 450 });
    } else if (filterId === 'Panels') {
      handleApplySizePreset({ label: '24 × 48', length: 4, width: 2, unit: 'Piece', defaultRate: 3500 });
    } else if (filterId === 'Marble') {
      handleSutarChange(4, 'Standard Floor');
      handleApplySizePreset({ label: '12 × 12', length: 1, width: 1, unit: 'Sq. Ft.' });
    }
  };

  const handleSutarChange = (sutarValue, usageTag) => {
    let newL = 1;
    let newW = 1;
    let defaultPreset = '12 × 12';

    const matchingSutarItem = inStockItems.find(it => 
      matchItemToFilter(it, 'Marble') && (Number(it.sutarThickness) === Number(sutarValue) || (sutarValue === 6 && (it.name?.includes('Kitchen') || it.subCategory?.includes('Kitchen'))))
    );

    setSelectedSizePreset(defaultPreset);
    setItemModalForm(prev => {
      const p = prev.pieces || 10;
      const sqft = Math.round(newL * newW * p * 100) / 100;
      const currentRate = matchingSutarItem ? (matchingSutarItem.ratePerSqFt || prev.ratePerSqFt) : prev.ratePerSqFt;
      return {
        ...prev,
        itemId: matchingSutarItem ? matchingSutarItem.id : prev.itemId,
        name: matchingSutarItem ? matchingSutarItem.name : prev.name,
        category: 'Marble',
        subCategory: matchingSutarItem ? (matchingSutarItem.subCategory || '') : prev.subCategory,
        ratePerSqFt: currentRate,
        availableStock: matchingSutarItem ? Number(matchingSutarItem.stockSqFt || matchingSutarItem.stockPieces || matchingSutarItem.stockBoxes || 0) : prev.availableStock,
        thicknessSutar: sutarValue,
        usageTag: usageTag,
        length: newL,
        width: newW,
        unit: 'Sq. Ft.',
        totalSqFt: sqft,
        amount: Math.round(sqft * currentRate)
      };
    });
  };

  const handleApplySizePreset = (preset) => {
    setSelectedSizePreset(preset.label);
    setItemModalForm(prev => {
      const cat = itemCategoryFilter;
      const isTile = cat === 'Tiles';
      const isRunning = cat === 'Border' || cat === 'Kali Patti';
      const isFlower = cat === 'Flower';
      const isPanel = cat === 'Panels';
      const isAccessory = cat === 'Accessories';

      if (isTile) {
        const p = prev.pieces || 10;
        const m = Math.round((p / 5) * 100) / 100;
        const rate = preset.defaultRate || prev.ratePerSqFt || 850;
        return {
          ...prev,
          unit: 'Meter',
          selectedSizePreset: preset.label,
          length: preset.length || prev.length || 2,
          width: preset.width || prev.width || 1,
          pieces: p,
          meters: m,
          totalSqFt: m,
          ratePerSqFt: rate,
          amount: Math.round(m * rate)
        };
      }

      if (isRunning) {
        const inch = preset.inch || (preset.label.includes('6') ? 6 : (preset.label.includes('3') ? 3 : 2));
        const rft = parseFloat(prev.runningFeet || prev.totalSqFt || 10) || 10;
        const pcs = Math.ceil((rft * 12) / inch);
        const rate = preset.defaultRate || prev.ratePerSqFt || 120;
        return {
          ...prev,
          unit: 'R.Ft.',
          selectedSizePreset: preset.label,
          thicknessSutar: inch,
          runningFeet: rft,
          totalSqFt: rft,
          pieces: pcs,
          length: rft,
          width: inch / 12,
          ratePerSqFt: rate,
          amount: Math.round(rft * rate)
        };
      }

      if (isFlower || isPanel) {
        const pcs = prev.pieces || 1;
        const rate = preset.defaultRate || prev.ratePerSqFt || (isFlower ? 850 : 3500);
        return {
          ...prev,
          unit: 'Piece',
          selectedSizePreset: preset.label,
          length: preset.length || prev.length || 1,
          width: preset.width || prev.width || 1,
          pieces: pcs,
          totalSqFt: pcs,
          ratePerSqFt: rate,
          amount: Math.round(pcs * rate)
        };
      }

      if (isAccessory) {
        const isGola = preset.label.toLowerCase().includes('gola') || preset.unit === 'Box';
        const unitLabel = isGola ? 'Box' : 'Piece';
        const qty = prev.pieces || prev.boxes || 1;
        const rate = preset.defaultRate || prev.ratePerSqFt || (isGola ? 350 : 450);
        return {
          ...prev,
          unit: unitLabel,
          selectedSizePreset: preset.label,
          pieces: isGola ? 0 : qty,
          boxes: isGola ? qty : 0,
          totalSqFt: qty,
          ratePerSqFt: rate,
          amount: Math.round(qty * rate)
        };
      }

      // Marble
      const l = preset.length !== undefined ? preset.length : prev.length;
      const w = preset.width !== undefined ? preset.width : prev.width;
      const p = prev.pieces || 10;
      const sqft = Math.round(l * w * p * 100) / 100;
      return {
        ...prev,
        unit: 'Sq. Ft.',
        selectedSizePreset: preset.label,
        length: l,
        width: w,
        totalSqFt: sqft,
        amount: Math.round(sqft * prev.ratePerSqFt)
      };
    });
  };

  const getCategoryClassifications = () => {
    const cat = itemCategoryFilter;
    const currentSutar = Number(itemModalForm.thicknessSutar) || 4;

    if (cat === 'Flower') {
      return {
        title: isUrdu ? 'پھول کے سائز (Flower Medallions - Per Piece)' : 'Flower Medallions (Per Piece)',
        subtitle: isUrdu ? 'مطلوبہ پھول کا سائز منتخب کریں (فی پیس ریٹ)' : 'Select flower medallion size (Per Piece Rate)',
        options: [
          { label: '12 × 12', length: 1, width: 1, sub: '1 ft × 1 ft', tag: 'فی پیس / نگ', defaultRate: 850 },
          { label: '24 × 24', length: 2, width: 2, sub: '2 ft × 2 ft', tag: 'فی پیس / نگ', defaultRate: 1800 },
          { label: '3 × 3', length: 3, width: 3, sub: '3 ft × 3 ft', tag: 'فی پیس / نگ', defaultRate: 3500 }
        ]
      };
    }

    if (cat === 'Border') {
      return {
        title: isUrdu ? 'بارڈر پٹی کے سائز (Border Patti - Per Running Feet)' : 'Border Patti (Per Running Feet)',
        subtitle: isUrdu ? 'پٹی کا سائز منتخب کریں (3 انچ یا 6 انچ)' : 'Select border patti size (3 inch or 6 inch)',
        isRunningFeet: true,
        options: [
          { label: '3 inch', inch: 3, sub: '3" Patti Length', tag: 'Per Running Foot', defaultRate: 120 },
          { label: '6 inch', inch: 6, sub: '6" Patti Length', tag: 'Per Running Foot', defaultRate: 220 }
        ]
      };
    }

    if (cat === 'Kali Patti') {
      return {
        title: isUrdu ? 'کالی پٹی کے سائز (Kali Patti - Per Running Feet)' : 'Kali Patti (Black Border - Per Running Feet)',
        subtitle: isUrdu ? 'کالی پٹی کا سائز منتخب کریں (2 انچ یا 3 انچ)' : 'Select Kali Patti size (2 inch or 3 inch)',
        isRunningFeet: true,
        options: [
          { label: '2 inch', inch: 2, sub: '2" Jet Black', tag: 'Per Running Foot', defaultRate: 90 },
          { label: '3 inch', inch: 3, sub: '3" Jet Black', tag: 'Per Running Foot', defaultRate: 140 }
        ]
      };
    }

    if (cat === 'Tiles') {
      return {
        title: isUrdu ? 'ٹائلز کے معیاری سائز (Tile Types - Per Meter | 1m = 5 Pcs)' : 'Tile Types (Per Meter | 1 Meter = 5 Pieces)',
        subtitle: isUrdu ? 'مطلوبہ ٹائل سائز منتخب کریں (1 میٹر = 5 پیس)' : 'Select tile size (1 Meter = 5 Pieces)',
        options: [
          { label: '12 × 24', length: 2, width: 1, sub: '1 ft × 2 ft', tag: 'Wall Tile (فی میٹر)', defaultRate: 850 },
          { label: '24 × 24', length: 2, width: 2, sub: '2 ft × 2 ft', tag: 'Porcelain Floor (فی میٹر)', defaultRate: 1250 },
          { label: '24 × 48', length: 4, width: 2, sub: '2 ft × 4 ft', tag: 'Jumbo Grand (فی میٹر)', defaultRate: 1650 },
          { label: '16 × 16', length: 1.33, width: 1.33, sub: '1.33 × 1.33 ft', tag: 'Standard Floor (فی میٹر)', defaultRate: 750 },
          { label: '12 × 36', length: 3, width: 1, sub: '1 ft × 3 ft', tag: 'Kitchen Tile (فی میٹر)', defaultRate: 1100 }
        ]
      };
    }

    if (cat === 'Accessories') {
      return {
        title: isUrdu ? 'ٹائلز کی اضافی اشیاء (Tile Accessories)' : 'Tile Accessories (Gola per Box, Filling/Spacer/Bond per Piece)',
        subtitle: isUrdu ? 'گولا فی بکس، فلنگ/سپیسر/بانڈ فی پیس' : 'Gola (Per Box) | Filling, Spacer, Bond (Per Piece)',
        isAccessories: true,
        options: [
          { label: 'Gola', unit: 'Box', sub: 'کارنر گولا (باکس)', tag: 'فی باکس / ڈبہ', defaultRate: 350 },
          { label: 'Filling', unit: 'Piece', sub: 'جوائنٹ فلنگ پاؤڈر (20kg)', tag: 'فی پیس / بوری', defaultRate: 450 },
          { label: 'Spacer', unit: 'Piece', sub: 'ٹائل کراس سپیسر پیکٹ', tag: 'فی پیس / پیکٹ', defaultRate: 250 },
          { label: 'Tile Bond', unit: 'Piece', sub: 'ٹائل بانڈ بوری (20kg)', tag: 'فی پیس / بوری', defaultRate: 650 }
        ]
      };
    }

    if (cat === 'Panels') {
      return {
        title: isUrdu ? 'پینل کی اقسام (Panel Types - Per Piece)' : 'Panel Types (Per Piece)',
        subtitle: isUrdu ? 'ماشاء اللہ و قرآنی وال پینل منتخب کریں (فی پیس ریٹ)' : 'Select decorative wall panel (Per Piece Rate)',
        options: [
          { label: '24 × 48', length: 4, width: 2, sub: '2 ft × 4 ft', tag: 'ماشاء اللہ پینل (فی پیس)', defaultRate: 3500 },
          { label: '3 × 3', length: 3, width: 3, sub: '3 ft × 3 ft', tag: 'قرآنی آیت پینل (فی پیس)', defaultRate: 4500 },
          { label: '3 × 5', length: 5, width: 3, sub: '3 ft × 5 ft', tag: 'گرینڈ ایلیویشن (فی پیس)', defaultRate: 7500 }
        ]
      };
    }

    // Default / Marble
    return {
      title: isUrdu ? 'ماربل سوتر موٹائی (Types of Marble - Sutar | Per Sq.Ft)' : 'Types of Marble - Sutar Thickness (Per Sq.Ft)',
      subtitle: isUrdu ? 'ماربل کی موٹائی / سوتر منتخب کریں (فی مربع فٹ)' : 'Select marble sutar thickness (Per Sq.Ft)',
      isMarble: true,
      sutarOptions: [
        { sutar: 4, mm: '12mm', label: '4 Sutar', tag: 'Standard Floor', isKitchen: false },
        { sutar: 6, mm: '18mm', label: '6 Sutar', tag: 'Kitchen / Stairs Only (صرف کچن اور سیڑھیاں)', isKitchen: true },
        { sutar: 9, mm: '28mm', label: '9 Sutar', tag: 'Heavy Steps', isKitchen: false },
        { sutar: 14, mm: '44mm', label: '14 Sutar', tag: 'Heavy Base', isKitchen: false }
      ],
      sutarSizeOptions: currentSutar === 4 ? [
        { label: '12 × 12', length: 1, width: 1, sub: '1 ft × 1 ft', tag: '1.0 Sq.Ft Tile' },
        { label: '12 × 24', length: 2, width: 1, sub: '2 ft × 1 ft', tag: '2.0 Sq.Ft Tile' },
        { label: '6 × 12', length: 1, width: 0.5, sub: '1 ft × 0.5 ft', tag: '0.5 Sq.Ft Tile' },
        { label: '6 × 24', length: 2, width: 0.5, sub: '2 ft × 0.5 ft', tag: '1.0 Sq.Ft Tile' }
      ] : [
        { label: '12 × 12', length: 1, width: 1, sub: '1 ft × 1 ft', tag: '1.0 Sq.Ft Tile' }
      ]
    };
  };

  const getSizePresets = () => {
    const name = (itemModalForm.name || '').toLowerCase();
    const cat = (itemModalForm.category || '').toLowerCase();
    const sub = (itemModalForm.subCategory || '').toLowerCase();
    const sutar = Number(itemModalForm.thicknessSutar);

    // 1. Flowers (12×12, 24×24, 3×3) - Per Piece
    if (itemCategoryFilter === 'Flower' || name.includes('flower') || cat.includes('flower') || sub.includes('flower')) {
      return [
        { label: '12 × 12', length: 1, width: 1, desc: '1 ft × 1 ft (Per Piece)' },
        { label: '24 × 24', length: 2, width: 2, desc: '2 ft × 2 ft (Per Piece)' },
        { label: '3 × 3', length: 3, width: 3, desc: '3 ft × 3 ft (Per Piece)' }
      ];
    }

    // 2. Borders (3 inch, 6 inch) - Per Running Foot
    if (itemCategoryFilter === 'Border' || (cat.includes('border') && !name.includes('kali') && !cat.includes('kali'))) {
      return [
        { label: '3 inch', inch: 3, desc: '3 inch piece (Per Running Foot)' },
        { label: '6 inch', inch: 6, desc: '6 inch piece (Per Running Foot)' }
      ];
    }

    // 3. Black Border / Kali Patti (2 inch, 3 inch) - Per Running Foot
    if (itemCategoryFilter === 'Kali Patti' || name.includes('kali') || sub.includes('kali') || cat.includes('kali')) {
      return [
        { label: '2 inch', inch: 2, desc: '2 inch piece (Per Running Foot)' },
        { label: '3 inch', inch: 3, desc: '3 inch piece (Per Running Foot)' }
      ];
    }

    // 4. Tiles (12×24, 24×24, 24×48, 16×16, 12×36) - Per Meter (5 pcs = 1m)
    if (itemCategoryFilter === 'Tiles' || cat.includes('tile') || sub.includes('tile')) {
      return [
        { label: '12 × 24', length: 2, width: 1, desc: '12" × 24" (Per Meter - 5 Pcs)' },
        { label: '24 × 24', length: 2, width: 2, desc: '24" × 24" (Per Meter - 5 Pcs)' },
        { label: '24 × 48', length: 4, width: 2, desc: '24" × 48" (Per Meter - 5 Pcs)' },
        { label: '16 × 16', length: 1.33, width: 1.33, desc: '16" × 16" (Per Meter - 5 Pcs)' },
        { label: '12 × 36', length: 3, width: 1, desc: '12" × 36" (Per Meter - 5 Pcs)' }
      ];
    }

    // 5. Tile Accessories (Gola per Box, Filling/Spacer/Bond per Piece)
    if (itemCategoryFilter === 'Accessories' || cat.includes('accessories') || sub.includes('accessories')) {
      return [
        { label: 'Gola', unit: 'Box', desc: 'Chamfer Corner Gola (Per Box)' },
        { label: 'Filling', unit: 'Piece', desc: 'Joint Filling 20kg (Per Bag/Piece)' },
        { label: 'Spacer', unit: 'Piece', desc: 'Tile Spacers (Per Pack/Piece)' },
        { label: 'Tile Bond', unit: 'Piece', desc: 'Tile Adhesive 20kg (Per Bag/Piece)' }
      ];
    }

    // 6. Panels (Mashallah etc. - Per Piece)
    if (itemCategoryFilter === 'Panels' || name.includes('panel') || name.includes('mashallah')) {
      return [
        { label: '24 × 48', length: 4, width: 2, desc: 'Mashallah Panel 2ft × 4ft (Per Piece)' },
        { label: '3 × 3', length: 3, width: 3, desc: 'Entrance Panel 3ft × 3ft (Per Piece)' },
        { label: '3 × 5', length: 5, width: 3, desc: 'Front Elevation Panel 3ft × 5ft (Per Piece)' }
      ];
    }

    // 7. Marble Sutar 6, 9, 14
    if (sutar === 6 || sutar === 9 || sutar === 14) {
      return [
        { label: '12 × 12', length: 1, width: 1, sub: '1 ft × 1 ft', tag: '1.0 Sq.Ft Tile' },
      ];
    }

    // 10. Marble Sutar 4 (12x12, 12x24, 6x12, 6x24)
    return [
      { label: '12 × 12', length: 1, width: 1, desc: '1 ft × 1 ft (1 Sq.Ft)' },
      { label: '12 × 24', length: 2, width: 1, desc: '2 ft × 1 ft (2 Sq.Ft)' },
      { label: '6 × 12', length: 1, width: 0.5, desc: '1 ft × 0.5 ft (0.5 Sq.Ft)' },
      { label: '6 × 24', length: 2, width: 0.5, desc: '2 ft × 0.5 ft (1 Sq.Ft)' }
    ];
  };

  const handleRecalculateItemModal = (field, val) => {
    setItemModalForm(prev => {
      const next = { ...prev, [field]: val };
      const cat = itemCategoryFilter;
      const isTile = cat === 'Tiles';
      const isRunning = cat === 'Border' || cat === 'Kali Patti' || next.unit === 'R.Ft.';
      const isFlower = cat === 'Flower';
      const isPanel = cat === 'Panels';
      const isAccessory = cat === 'Accessories';
      const isGola = isAccessory && (next.name?.toLowerCase().includes('gola') || selectedSizePreset === 'Gola' || next.unit === 'Box');

      const rate = parseFloat(field === 'ratePerSqFt' ? val : next.ratePerSqFt) || 0;
      next.ratePerSqFt = rate;

      if (isTile) {
        if (field === 'pieces') {
          const p = parseInt(val, 10) || 0;
          const m = Math.round((p / 5) * 100) / 100;
          next.pieces = p;
          next.meters = m;
          next.totalSqFt = m;
        } else if (field === 'meters') {
          const m = parseFloat(val) || 0;
          const p = Math.round(m * 5);
          next.meters = m;
          next.pieces = p;
          next.totalSqFt = m;
        } else {
          const m = parseFloat(next.meters) || ((parseInt(next.pieces, 10) || 0) / 5);
          next.meters = m;
          next.totalSqFt = m;
        }
        next.unit = 'Meter';
        next.amount = Math.round((next.meters || 0) * rate);
        return next;
      }

      if (isRunning) {
        const rft = parseFloat(field === 'runningFeet' ? val : (next.runningFeet || next.totalSqFt || 10)) || 0;
        let inch = 3;
        if (cat === 'Border') {
          inch = selectedSizePreset === '6 inch' ? 6 : 3;
        } else if (cat === 'Kali Patti') {
          inch = selectedSizePreset === '3 inch' ? 3 : 2;
        } else {
          inch = Number(next.thicknessSutar) || 3;
        }
        const pcs = inch > 0 ? Math.ceil((rft * 12) / inch) : 0;
        next.runningFeet = rft;
        next.totalSqFt = rft;
        next.pieces = pcs;
        next.length = rft;
        next.width = inch / 12;
        next.unit = 'R.Ft.';
        next.amount = Math.round(rft * rate);
        return next;
      }

      if (isFlower || isPanel) {
        const pcs = parseInt(field === 'pieces' ? val : (next.pieces || 1), 10) || 0;
        next.pieces = pcs;
        next.totalSqFt = pcs;
        next.unit = 'Piece';
        next.amount = Math.round(pcs * rate);
        return next;
      }

      if (isAccessory) {
        if (isGola) {
          const boxes = parseInt(field === 'boxes' ? val : (field === 'pieces' ? val : (next.boxes || next.pieces || 1)), 10) || 0;
          next.boxes = boxes;
          next.pieces = boxes;
          next.totalSqFt = boxes;
          next.unit = 'Box';
          next.amount = Math.round(boxes * rate);
        } else {
          const qty = parseInt(field === 'pieces' ? val : (next.pieces || 1), 10) || 0;
          next.pieces = qty;
          next.boxes = 0;
          next.totalSqFt = qty;
          next.unit = 'Piece';
          next.amount = Math.round(qty * rate);
        }
        return next;
      }

      // Marble (Per Sq. Ft)
      if (['length', 'width', 'pieces'].includes(field)) {
        const l = parseFloat(field === 'length' ? val : next.length) || 0;
        const w = parseFloat(field === 'width' ? val : next.width) || 0;
        const p = parseInt(field === 'pieces' ? val : next.pieces, 10) || 0;
        const sqft = Math.round(l * w * p * 100) / 100;
        next.length = l;
        next.width = w;
        next.pieces = p;
        next.totalSqFt = sqft;
      }
      next.unit = 'Sq. Ft.';
      next.amount = Math.round((next.totalSqFt || 0) * rate);
      return next;
    });
  };

  const handleSaveItemModal = () => {
    if (!itemModalForm.itemId && !itemModalForm.name) return;

    const cat = itemModalForm.category || itemCategoryFilter;
    const isTile = cat === 'Tiles' || itemCategoryFilter === 'Tiles';
    const isRunning = cat === 'Border' || cat === 'Kali Patti' || itemCategoryFilter === 'Border' || itemCategoryFilter === 'Kali Patti';
    const isFlower = cat === 'Flower' || itemCategoryFilter === 'Flower';
    const isPanel = cat === 'Panels' || itemCategoryFilter === 'Panels';
    const isAccessory = cat === 'Accessories' || itemCategoryFilter === 'Accessories';
    const isGola = isAccessory && ((itemModalForm.name || '').toLowerCase().includes('gola') || selectedSizePreset === 'Gola');

    let billedQuantity = 0;
    let finalUnit = 'Sq. Ft.';

    if (isTile) {
      finalUnit = 'Meter';
      billedQuantity = Number(itemModalForm.meters) || (Number(itemModalForm.pieces || 0) / 5) || 0;
    } else if (isRunning) {
      finalUnit = 'R.Ft.';
      billedQuantity = Number(itemModalForm.runningFeet) || Number(itemModalForm.totalSqFt) || 0;
    } else if (isFlower || isPanel) {
      finalUnit = 'Piece';
      billedQuantity = Number(itemModalForm.pieces) || 1;
    } else if (isAccessory) {
      if (isGola) {
        finalUnit = 'Box';
        billedQuantity = Number(itemModalForm.boxes) || Number(itemModalForm.pieces) || 1;
      } else {
        finalUnit = 'Piece';
        billedQuantity = Number(itemModalForm.pieces) || 1;
      }
    } else {
      finalUnit = 'Sq. Ft.';
      billedQuantity = Number(itemModalForm.totalSqFt) || 0;
    }

    const ratePerUnit = Number(itemModalForm.ratePerSqFt || 0);
    const unitCost = Number(itemModalForm.costPerSqFt) || Math.round(ratePerUnit * 0.72);
    const saleAmount = Math.round(billedQuantity * ratePerUnit);
    const totalCost = Math.round(billedQuantity * unitCost);

    const formattedItem = {
      id: editingItemIndex !== null ? lineItems[editingItemIndex].id : `item-${Date.now()}`,
      itemId: itemModalForm.itemId,
      name: itemModalForm.name,
      category: cat,
      subCategory: itemModalForm.subCategory,
      thicknessSutar: itemModalForm.thicknessSutar,
      usageTag: itemModalForm.usageTag,
      selectedSizePreset: selectedSizePreset,
      length: itemModalForm.length,
      width: itemModalForm.width,
      pieces: Number(itemModalForm.pieces || 0),
      boxes: Number(itemModalForm.boxes || (isGola ? billedQuantity : 0)),
      meters: Number(itemModalForm.meters || (isTile ? billedQuantity : 0)),
      runningFeet: Number(itemModalForm.runningFeet || (isRunning ? billedQuantity : 0)),
      billedQuantity: billedQuantity,
      totalSqFt: billedQuantity, // Keep aligned for compatibility
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
  const handleExecuteSaveInvoice = async () => {
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

        // 2. Adjust physical inventory stock for each item based on unit
        for (const it of lineItems) {
          if (it.itemId) {
            const isGola = it.unit === 'Box' || (it.category === 'Accessories' && (it.name || '').toLowerCase().includes('gola'));
            const isPieceBased = it.unit === 'Piece';
            const isMeterBased = it.unit === 'Meter';
            const isRunning = it.unit === 'R.Ft.';

            let dSqFt = 0;
            let dBoxes = 0;
            let dPieces = 0;

            if (it.unit === 'Sq. Ft.') {
              dSqFt = -(it.billedQuantity || it.totalSqFt || 0);
              dPieces = -(it.pieces || 0);
            } else if (isMeterBased) {
              dSqFt = -(it.billedQuantity || it.meters || 0);
              dPieces = -(it.pieces || Math.round((it.billedQuantity || it.meters || 0) * 5) || 0);
            } else if (isRunning) {
              dSqFt = -(it.billedQuantity || it.runningFeet || 0);
              dPieces = -(it.pieces || 0);
            } else if (isGola) {
              dBoxes = -(it.boxes || it.billedQuantity || 0);
            } else if (isPieceBased) {
              dPieces = -(it.pieces || it.billedQuantity || 0);
            } else {
              dSqFt = -(it.billedQuantity || it.totalSqFt || 0);
              dPieces = -(it.pieces || 0);
            }

            await adjustItemStock(
              it.itemId,
              dSqFt,
              dBoxes,
              dPieces,
              'Sale',
              invoiceNo,
              `Sold to ${customerName}`
            );
          }
        }

        // 3. Update customer ledger if registered customer
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
            const newBilled = (Number(freshCust.totalBilled) || 0) + grandTotal;
            const newPaid = (Number(freshCust.totalPaid) || 0) + numPaid;
            const newDue = (Number(freshCust.balanceDue) || 0) + balanceDue;

            await db.customers.update(freshCust.id, {
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
                {isUrdu ? 'نیا بل (POS سسٹم)' : 'New Bill (POS System)'}
              </h1>
              <p style={{
                fontSize: '0.86rem',
                color: 'var(--text-secondary, #64748b)',
                margin: '2px 0 0 0',
                fontWeight: 500
              }}>
                {isUrdu ? 'نئی سیلز کا بل بنائیں، کسٹمر کھاتہ اور رکشہ گیٹ پاس جاری کریں' : 'Create new sales invoice, update customer khata, and dispatch gate pass'}
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
          backgroundImage: `url('./general_background.png'), url('/general_background.png'), url('./general_background.jpg'), url('/general_background.jpg'), url('./invoice_background.jpg'), url('/invoice_background.jpg')`,
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
              {Math.round(totalYardStock).toLocaleString()} <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Sq.Ft</span>
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
                            ? `Tiles • Per Meter (5 Pcs = 1m) • ${item.selectedSizePreset || 'Standard'}`
                            : item.unit === 'R.Ft.'
                            ? `${item.thicknessSutar || 3}" Patti • Running Feet`
                            : item.unit === 'Box'
                            ? `Corner Gola • Per Box`
                            : item.unit === 'Piece'
                            ? (item.category === 'Flower' ? `Flower Medallion • Per Piece` : (item.category === 'Panels' ? `Decorative Wall Panel • Per Piece` : `${item.selectedSizePreset || 'Accessory'} • Per Piece`))
                            : `${item.thicknessSutar || 4} Sutar • ${item.usageTag || 'Standard'}`}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {item.unit === 'Meter' ? (
                            `${item.billedQuantity || item.meters || (item.pieces / 5)} Meters × Rs. ${item.ratePerSqFt || item.rate} (${item.pieces} Pcs Tiles @ 5 pcs/m)`
                          ) : item.unit === 'R.Ft.' ? (
                            `${item.billedQuantity || item.runningFeet || item.totalSqFt} R.Ft. × Rs. ${item.ratePerSqFt || item.rate} (${item.thicknessSutar || 3}" Patti • ${item.pieces} Pieces)`
                          ) : item.unit === 'Box' ? (
                            `${item.billedQuantity || item.boxes} Box × Rs. ${item.ratePerSqFt || item.rate} (Corner Gola)`
                          ) : item.unit === 'Piece' ? (
                            `${item.billedQuantity || item.pieces} Pcs × Rs. ${item.ratePerSqFt || item.rate}${item.selectedSizePreset ? ` (${item.selectedSizePreset})` : ''}`
                          ) : (
                            `${item.billedQuantity || item.totalSqFt} Sq.Ft × Rs. ${item.ratePerSqFt || item.rate}${item.length && item.width ? ` (${item.length}ft × ${item.width}ft • ${item.pieces} slabs)` : ''}`
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

              {/* 1. CATEGORY DROPDOWN & SELECT IN-STOCK ITEM DROPDOWN (2-Column Grid) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '12px' }}>
                {/* Category Dropdown */}
                <div className="app-form-group">
                  <label className="app-form-label">
                    <Filter size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    {isUrdu ? 'کیٹیگری منتخب کریں' : 'Select Category'} <span className="app-form-label-required">*</span>
                  </label>
                  <div className="app-input-wrapper">
                    <select
                      className="app-form-select"
                      value={itemCategoryFilter}
                      onChange={(e) => handleCategoryFilterChange(e.target.value)}
                      style={{ fontWeight: 700 }}
                    >
                      {ITEM_CATEGORY_FILTERS.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {isUrdu ? cat.labelUrdu : cat.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="app-input-chevron" />
                  </div>
                </div>

                {/* Select In-Stock Item Dropdown (Strictly item name only) */}
                <div className="app-form-group">
                  <label className="app-form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      {isUrdu ? 'دستیاب آئٹم منتخب کریں' : 'Select In-Stock Item'} <span className="app-form-label-required">*</span>
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                      {filteredModalItems.length} {isUrdu ? 'دستیاب' : 'in stock'}
                    </span>
                  </label>
                  <div className="app-input-wrapper">
                    <Layers size={16} className="app-input-icon" />
                    <select
                      className="app-form-select"
                      value={itemModalForm.itemId || ''}
                      onChange={(e) => {
                        const sel = items.find(i => i.id === parseInt(e.target.value, 10));
                        if (sel) handleItemSelectInModal(sel);
                      }}
                      style={{ fontWeight: 600 }}
                    >
                      {filteredModalItems.length === 0 ? (
                        <option value="" disabled>
                          {isUrdu ? 'اس کیٹیگری میں کوئی آئٹم نہیں ہے' : 'No in-stock items found in this category'}
                        </option>
                      ) : (
                        filteredModalItems.map(it => (
                          <option key={it.id} value={it.id}>
                            {it.name}
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown size={14} className="app-input-chevron" />
                  </div>
                </div>
              </div>

              {/* Subordinate Item Metadata & Stock Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', padding: '0 4px', marginTop: '-4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{isUrdu ? 'دستیاب اسٹاک:' : 'Stock:'}</span>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: itemModalForm.availableStock > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: itemModalForm.availableStock > 0 ? '#059669' : '#dc2626',
                    fontWeight: 700,
                    fontFamily: 'monospace'
                  }}>
                    {itemModalForm.availableStock.toLocaleString()} {itemModalForm.unit || 'Sq.Ft'}
                  </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: '0.72rem' }}>
                    {itemModalForm.category} {itemModalForm.subCategory ? `• ${itemModalForm.subCategory}` : ''}
                  </span>
                </span>
              </div>

              {/* 2. DYNAMIC CATEGORY CLASSIFICATION CARDS (SAME STYLING FOR ALL CATEGORIES) */}
              {(() => {
                const classData = getCategoryClassifications();
                if (!classData) return null;

                if (classData.isMarble) {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Marble Sutar Thickness Cards */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <label className="app-form-label" style={{ margin: 0, fontWeight: 700 }}>
                            {classData.title}
                          </label>
                          {itemModalForm.thicknessSutar === 6 && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706', background: 'rgba(217, 119, 6, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                              ⚡ {isUrdu ? 'صرف کچن اور سیڑھیوں کے لیے' : 'Kitchen & Stairs Only'}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                          {classData.sutarOptions.map(thick => {
                            const isSelected = itemModalForm.thicknessSutar === thick.sutar;
                            return (
                              <button
                                key={thick.sutar}
                                type="button"
                                onClick={() => handleSutarChange(thick.sutar, thick.tag)}
                                style={{
                                  padding: '8px 4px',
                                  borderRadius: '10px',
                                  border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                  background: isSelected ? '#eff6ff' : '#ffffff',
                                  color: isSelected ? '#2563eb' : '#334155',
                                  textAlign: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>{thick.label}</div>
                                <div style={{ fontSize: '0.66rem', color: thick.isKitchen ? '#d97706' : (isSelected ? '#2563eb' : '#64748b'), fontWeight: thick.isKitchen ? 700 : 500 }}>
                                  {thick.isKitchen ? 'Kitchen/Stairs' : thick.mm}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Marble Sutar Size Cards */}
                      {classData.sutarSizeOptions && classData.sutarSizeOptions.length > 0 && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label className="app-form-label" style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
                              {isUrdu ? `${itemModalForm.thicknessSutar} سوتر کے معیاری سائز` : `Standard Sizes for ${itemModalForm.thicknessSutar} Sutar`}
                            </label>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              {isUrdu ? 'سائز لگانے کے لیے کلک کریں' : 'Click to apply dimensions'}
                            </span>
                          </div>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: classData.sutarSizeOptions.length === 2 ? 'repeat(2, 1fr)' : (classData.sutarSizeOptions.length === 3 ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)'),
                            gap: '8px'
                          }}>
                            {classData.sutarSizeOptions.map(opt => {
                              const isSelected = selectedSizePreset === opt.label ||
                                (Number(itemModalForm.length) === Number(opt.length) && Number(itemModalForm.width) === Number(opt.width));
                              return (
                                <button
                                  key={opt.label}
                                  type="button"
                                  onClick={() => handleApplySizePreset(opt)}
                                  style={{
                                    padding: '8px 4px',
                                    borderRadius: '10px',
                                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                    background: isSelected ? '#eff6ff' : '#ffffff',
                                    color: isSelected ? '#2563eb' : '#334155',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>{opt.label}</div>
                                  <div style={{ fontSize: '0.66rem', color: isSelected ? '#2563eb' : '#64748b', fontWeight: 600 }}>
                                    {opt.sub}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                // All other categories: Tiles, Flower, Border, Kali Patti, Accessories, Panels
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="app-form-label" style={{ margin: 0, fontWeight: 700 }}>
                        {classData.title}
                      </label>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {classData.subtitle}
                      </span>
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: classData.options?.length === 2 ? 'repeat(2, 1fr)' : (classData.options?.length === 3 ? 'repeat(3, 1fr)' : (classData.options?.length === 4 ? 'repeat(4, 1fr)' : 'repeat(5, 1fr)')),
                      gap: '8px'
                    }}>
                      {(classData.options || []).map(opt => {
                        const isSelected = selectedSizePreset === opt.label;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => handleApplySizePreset(opt)}
                            style={{
                              padding: '8px 4px',
                              borderRadius: '10px',
                              border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                              background: isSelected ? '#eff6ff' : '#ffffff',
                              color: isSelected ? '#2563eb' : '#334155',
                              textAlign: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>{opt.label}</div>
                            <div style={{ fontSize: '0.66rem', color: isSelected ? '#2563eb' : '#64748b', fontWeight: 600 }}>
                              {opt.sub || opt.tag}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* 5. DIMENSIONS SECTION BASED ON CATEGORY */}
              {(() => {
                const cat = itemCategoryFilter;
                const isTile = cat === 'Tiles';
                const isRunning = cat === 'Border' || cat === 'Kali Patti' || itemModalForm.unit === 'R.Ft.';
                const isFlower = cat === 'Flower';
                const isPanel = cat === 'Panels';
                const isAccessory = cat === 'Accessories' || itemModalForm.category === 'Accessories';
                const isGola = isAccessory && ((itemModalForm.name || '').toLowerCase().includes('gola') || selectedSizePreset === 'Gola' || itemModalForm.unit === 'Box');

                if (isTile) {
                  return (
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                          {isUrdu ? 'ٹائلز پیمائش و میٹر حساب (Tiles - Per Meter Calculation)' : 'Tiles - Per Meter Calculation'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                          ✨ 1 میٹر = 5 پیس ٹائلز (1m = 5 Pcs)
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div className="app-form-group">
                          <label className="app-form-label" style={{ fontSize: '0.72rem' }}>
                            {isUrdu ? 'تعداد ٹائل پیس (Tiles Quantity - Pieces)' : 'Tile Pieces (Count)'} <span className="app-form-label-required">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            className="app-form-input font-mono"
                            value={itemModalForm.pieces || ''}
                            onChange={(e) => handleRecalculateItemModal('pieces', e.target.value)}
                            placeholder="e.g. 20"
                            style={{ fontWeight: 700 }}
                          />
                        </div>

                        <div className="app-form-group">
                          <label className="app-form-label" style={{ fontSize: '0.72rem' }}>
                            {isUrdu ? 'کل میٹر (Total Calculated Meters)' : 'Calculated Meters (m)'} <span className="app-form-label-required">*</span>
                          </label>
                          <input
                            type="number"
                            min="0.2"
                            step="0.2"
                            className="app-form-input font-mono"
                            value={itemModalForm.meters || ''}
                            onChange={(e) => handleRecalculateItemModal('meters', e.target.value)}
                            placeholder="e.g. 4.0"
                            style={{ fontWeight: 700 }}
                          />
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '10px',
                        paddingTop: '10px',
                        borderTop: '1px solid #e2e8f0',
                        fontSize: '0.82rem'
                      }}>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>
                          {isUrdu ? 'بلنگ کوانٹٹی (Billed Quantity):' : 'Billed Quantity:'}
                        </span>
                        <span className="font-mono" style={{ fontWeight: 800, color: '#2563eb', fontSize: '1rem' }}>
                          {itemModalForm.meters || (Number(itemModalForm.pieces || 0) / 5)} Meter <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({itemModalForm.pieces || 0} Pieces @ 5 pcs/m)</span>
                        </span>
                      </div>
                    </div>
                  );
                }

                if (isRunning) {
                  return (
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                          {isUrdu ? 'پیمائش رننگ فٹ و ٹکڑے (Border Patti Running Feet)' : 'Dimensions & Running Feet Count (Feet)'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700 }}>
                          📏 12" = 1 R.Ft
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '10px' }}>
                        <div className="app-form-group">
                          <label className="app-form-label" style={{ fontSize: '0.72rem' }}>
                            {isUrdu ? 'پٹی سائز (Length)' : 'Patti Size (Inches)'}
                          </label>
                          <div className="app-form-input font-mono" style={{ background: '#f1f5f9', display: 'flex', alignItems: 'center', fontWeight: 700, color: '#334155' }}>
                            {selectedSizePreset || `${itemModalForm.thicknessSutar || 3} inch`}
                          </div>
                        </div>
                        <div className="app-form-group">
                          <label className="app-form-label" style={{ fontSize: '0.72rem' }}>
                            {isUrdu ? 'مطلوبہ رننگ فٹ (No. of Feets)' : 'Required Running Feet (ft)'} <span className="app-form-label-required">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            className="app-form-input font-mono"
                            value={itemModalForm.runningFeet || itemModalForm.totalSqFt}
                            onChange={(e) => handleRecalculateItemModal('runningFeet', e.target.value)}
                            style={{ fontWeight: 700 }}
                          />
                        </div>
                        <div className="app-form-group">
                          <label className="app-form-label" style={{ fontSize: '0.72rem' }}>
                            {isUrdu ? 'تعداد ٹکڑے (Pieces)' : 'Calculated Pieces'}
                          </label>
                          <div className="app-form-input font-mono" style={{ background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#0369a1' }}>
                            {itemModalForm.pieces} Pcs
                          </div>
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '10px',
                        paddingTop: '10px',
                        borderTop: '1px solid #e2e8f0',
                        fontSize: '0.82rem'
                      }}>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>
                          {isUrdu ? 'کل رننگ فٹ (Total Running Feet):' : 'Total Running Feet:'}
                        </span>
                        <span className="font-mono" style={{ fontWeight: 800, color: '#2563eb', fontSize: '1rem' }}>
                          {itemModalForm.totalSqFt} R.Ft. <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({itemModalForm.pieces} Pieces)</span>
                        </span>
                      </div>
                    </div>
                  );
                }

                if (isFlower || isPanel) {
                  return (
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                          {isFlower
                            ? (isUrdu ? 'پھول تعداد (فی پیس / نگ کے حساب سے)' : 'Flower Quantity (Per Piece / Nag)')
                            : (isUrdu ? 'پینل تعداد (ماشاء اللہ و قرآنی پینل - فی پیس)' : 'Panel Quantity (Per Piece)')}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700 }}>
                          {selectedSizePreset || 'Standard Size'}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                        <div className="app-form-group">
                          <label className="app-form-label" style={{ fontSize: '0.72rem' }}>
                            {isUrdu ? 'تعداد نگ / پیس (Quantity / Pieces)' : 'Quantity (Pieces / Count)'} <span className="app-form-label-required">*</span>
                          </label>
                          <input
                            type="number"
                            step="1"
                            min="1"
                            className="app-form-input font-mono"
                            value={itemModalForm.pieces || 1}
                            onChange={(e) => handleRecalculateItemModal('pieces', e.target.value)}
                            style={{ fontWeight: 700 }}
                          />
                        </div>
                        <div className="app-form-group">
                          <label className="app-form-label" style={{ fontSize: '0.72rem' }}>
                            {isUrdu ? 'بلنگ یونٹ' : 'Billing Unit'}
                          </label>
                          <div className="app-form-input font-mono" style={{ background: '#f1f5f9', display: 'flex', alignItems: 'center', fontWeight: 700, color: '#334155' }}>
                            Piece (فی پیس)
                          </div>
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '10px',
                        paddingTop: '10px',
                        borderTop: '1px solid #e2e8f0',
                        fontSize: '0.82rem'
                      }}>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>
                          {isUrdu ? 'کل بلنگ مقدار (Total Quantity):' : 'Total Billed Quantity:'}
                        </span>
                        <span className="font-mono" style={{ fontWeight: 800, color: '#2563eb', fontSize: '1rem' }}>
                          {itemModalForm.pieces || 1} Piece <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({selectedSizePreset || ''})</span>
                        </span>
                      </div>
                    </div>
                  );
                }

                if (isAccessory) {
                  return (
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                          {isGola
                            ? (isUrdu ? 'کارنر گولا (باکس / ڈبے کے حساب سے)' : 'Chamfer Corner Gola (Per Box)')
                            : (isUrdu ? 'لوازمات تعداد (فلنگ، سپیسر، بانڈ - فی پیس / بوری)' : 'Accessory Quantity (Filling, Spacer, Bond - Per Piece)')}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700 }}>
                          {isGola ? '📦 یونٹ: باکس (Box)' : '🛍️ یونٹ: پیس / بوری (Piece)'}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                        <div className="app-form-group">
                          <label className="app-form-label" style={{ fontSize: '0.72rem' }}>
                            {isGola
                              ? (isUrdu ? 'تعداد بکس / ڈبے (Number of Boxes)' : 'Number of Boxes')
                              : (isUrdu ? 'تعداد بوری / پیکٹ / پیس (Quantity / Pieces)' : 'Quantity (Pieces / Bags / Packs)')} <span className="app-form-label-required">*</span>
                          </label>
                          <input
                            type="number"
                            step="1"
                            min="1"
                            className="app-form-input font-mono"
                            value={isGola ? (itemModalForm.boxes || itemModalForm.pieces || 1) : (itemModalForm.pieces || 1)}
                            onChange={(e) => handleRecalculateItemModal(isGola ? 'boxes' : 'pieces', e.target.value)}
                            style={{ fontWeight: 700 }}
                          />
                        </div>
                        <div className="app-form-group">
                          <label className="app-form-label" style={{ fontSize: '0.72rem' }}>
                            {isUrdu ? 'پیکنگ و بلنگ یونٹ' : 'Billing Unit'}
                          </label>
                          <div className="app-form-input font-mono" style={{ background: '#f1f5f9', display: 'flex', alignItems: 'center', fontWeight: 700, color: '#334155' }}>
                            {isGola ? 'Box (فی ڈبہ)' : 'Piece (فی پیس)'}
                          </div>
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '10px',
                        paddingTop: '10px',
                        borderTop: '1px solid #e2e8f0',
                        fontSize: '0.82rem'
                      }}>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>
                          {isUrdu ? 'کل بلنگ مقدار (Total Billed Count):' : 'Total Billed Quantity:'}
                        </span>
                        <span className="font-mono" style={{ fontWeight: 800, color: '#2563eb', fontSize: '1rem' }}>
                          {isGola ? (itemModalForm.boxes || itemModalForm.pieces || 1) : (itemModalForm.pieces || 1)} {isGola ? 'Box' : 'Piece'}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Standard Marble (Per Sq. Ft)
                return (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                        {isUrdu ? 'پیمائش اور تعداد (فٹ اور تھان / پیس)' : 'Dimensions & Slab / Piece Count (Feet)'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCalcOpen(true)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#2563eb',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: 0
                        }}
                      >
                        <Calculator size={14} />
                        <span>{isUrdu ? 'کیلکولیٹر' : 'Calculator'}</span>
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      <div className="app-form-group">
                        <label className="app-form-label" style={{ fontSize: '0.72rem' }}>
                          {isUrdu ? 'لمبائی (Length ft)' : 'Length (ft)'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="app-form-input font-mono"
                          value={itemModalForm.length}
                          onChange={(e) => handleRecalculateItemModal('length', e.target.value)}
                        />
                      </div>
                      <div className="app-form-group">
                        <label className="app-form-label" style={{ fontSize: '0.72rem' }}>
                          {isUrdu ? 'چوڑائی (Width ft)' : 'Width (ft)'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="app-form-input font-mono"
                          value={itemModalForm.width}
                          onChange={(e) => handleRecalculateItemModal('width', e.target.value)}
                        />
                      </div>
                      <div className="app-form-group">
                        <label className="app-form-label" style={{ fontSize: '0.72rem' }}>
                          {isUrdu ? 'تعداد (Quantity)' : 'Quantity (slabs/pcs)'}
                        </label>
                        <input
                          type="number"
                          step="1"
                          className="app-form-input font-mono"
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
                      paddingTop: '10px',
                      borderTop: '1px solid #e2e8f0',
                      fontSize: '0.82rem'
                    }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>{isUrdu ? 'کل رقبہ (Total Area):' : 'Total Calculated Area:'}</span>
                      <span className="font-mono" style={{ fontWeight: 800, color: '#2563eb', fontSize: '1rem' }}>
                        {itemModalForm.totalSqFt} Sq.Ft
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 6. RATE & LINE TOTAL */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="app-form-group">
                  <label className="app-form-label">
                    {itemCategoryFilter === 'Tiles'
                      ? (isUrdu ? 'ریٹ فی میٹر (Rate / Meter Rs.)' : 'Rate / Meter (Rs.)')
                      : itemCategoryFilter === 'Border' || itemCategoryFilter === 'Kali Patti'
                      ? (isUrdu ? 'ریٹ فی رننگ فٹ (Rate / R.Ft Rs.)' : 'Rate / R.Ft (Rs.)')
                      : itemCategoryFilter === 'Flower'
                      ? (isUrdu ? 'ریٹ فی پیس / پھول (Rate / Piece Rs.)' : 'Rate / Piece (Rs.)')
                      : itemCategoryFilter === 'Panels'
                      ? (isUrdu ? 'ریٹ فی پینل (Rate / Piece Rs.)' : 'Rate / Piece (Rs.)')
                      : itemCategoryFilter === 'Accessories'
                      ? (itemModalForm.unit === 'Box' || (itemModalForm.name || '').toLowerCase().includes('gola') || selectedSizePreset === 'Gola'
                        ? (isUrdu ? 'ریٹ فی باکس / ڈبہ (Rate / Box Rs.)' : 'Rate / Box (Rs.)')
                        : (isUrdu ? 'ریٹ فی پیس / بوری (Rate / Piece Rs.)' : 'Rate / Piece (Rs.)'))
                      : (isUrdu ? 'ریٹ فی مربع فٹ (Rate / Sq.Ft Rs.)' : 'Rate / Sq.Ft (Rs.)')} <span className="app-form-label-required">*</span>
                  </label>
                  <div className="app-input-wrapper">
                    <DollarSign size={16} className="app-input-icon" />
                    <input
                      type="number"
                      className="app-form-input font-mono"
                      value={itemModalForm.ratePerSqFt}
                      onChange={(e) => handleRecalculateItemModal('ratePerSqFt', e.target.value)}
                      style={{ fontWeight: 700 }}
                    />
                  </div>
                </div>
                <div className="app-form-group">
                  <label className="app-form-label">
                    {isUrdu ? 'کل رقم (Line Total Rs.)' : 'Line Total (Rs.)'}
                  </label>
                  <div className="font-mono" style={{
                    padding: '8px 12px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    height: '38px',
                    boxSizing: 'border-box'
                  }}>
                    Rs. {(itemModalForm.totalSqFt * itemModalForm.ratePerSqFt).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* 7. STOCK WARNING IF REQUESTED > STOCK */}
              {itemModalForm.totalSqFt > itemModalForm.availableStock && (
                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(217, 119, 6, 0.08)',
                  border: '1px solid rgba(217, 119, 6, 0.25)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#b45309',
                  fontSize: '0.78rem'
                }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>
                    {isUrdu
                      ? `صرف ${itemModalForm.availableStock} ${itemModalForm.unit || 'فٹ'} اسٹاک میں ہے۔ مطلوبہ: ${itemModalForm.totalSqFt} ${itemModalForm.unit || 'فٹ'}`
                      : `Only ${itemModalForm.availableStock} ${itemModalForm.unit || 'Sq.Ft'} in stock. Requested: ${itemModalForm.totalSqFt} ${itemModalForm.unit || 'Sq.Ft'}.`}
                  </span>
                </div>
              )}

              {/* Notice banner */}
              <div className="app-form-notice">
                <Info size={16} color="#2563eb" style={{ flexShrink: 0 }} />
                <span>All fields marked with <b style={{ color: '#ef4444' }}>*</b> are required.</span>
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
                {isUrdu ? 'منسوخ' : 'Cancel'}
              </button>
              <button
                type="button"
                className="app-btn-submit"
                onClick={handleSaveItemModal}
              >
                <Save size={16} />
                {editingItemIndex !== null ? (isUrdu ? 'محفوظ کریں' : 'Update Item') : (isUrdu ? 'آئٹم شامل کریں' : 'Add Item')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTER NEW CUSTOMER (Exact Customer Khata Profile Form) */}
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
                  <strong>{lineItems.length} {isUrdu ? 'اشیاء' : 'items'}</strong>
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
                  {isSaving ? 'Saving...' : (isUrdu ? 'محفوظ کریں' : 'Confirm & Save')}
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
