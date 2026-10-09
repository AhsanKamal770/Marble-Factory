import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Truck,
  Plus,
  Search,
  DollarSign,
  PackagePlus,
  FileText,
  Building,
  Phone,
  Layers,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  X,
  Boxes,
  Printer,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  Tag,
  ChevronDown,
  Receipt,
  ArrowUpDown,
  UserCheck,
  CreditCard,
  MapPin,
  User,
  Save,
  Info
} from 'lucide-react';
import { db, adjustItemStock, logStockMovement } from '../db/index';
import { useLanguage } from '../context/LanguageContext';
import GlobalPagination from '../components/GlobalPagination';
import UniversalReportPrintModal from '../components/UniversalReportPrintModal';

export default function SupplierManagementView({ settings }) {
  const { language } = useLanguage();

  // ─────────────────────────────────────────────────────────────────────────────
  // Live Database Queries
  // ─────────────────────────────────────────────────────────────────────────────
  const suppliers = useLiveQuery(() => db.suppliers.orderBy('name').toArray(), []) || [];
  const purchases = useLiveQuery(async () => {
    const all = await db.supplier_purchases.toArray();
    return all.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  }, []) || [];
  const payments = useLiveQuery(async () => {
    const all = await db.supplier_payments.toArray();
    return all.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  }, []) || [];
  const items = useLiveQuery(() => db.items.orderBy('name').toArray(), []) || [];

  // ─────────────────────────────────────────────────────────────────────────────
  // View & Filter States
  // ─────────────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('purchases'); // 'purchases' | 'suppliers' | 'payments'
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination
  const [purchasePage, setPurchasePage] = useState(1);
  const [supplierPage, setSupplierPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const pageSize = 10;

  // Modals & Drawers
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [drawerPurchase, setDrawerPurchase] = useState(null);
  const [ledgerSupplier, setLedgerSupplier] = useState(null);
  const [activeSupplierForPayment, setActiveSupplierForPayment] = useState(null);

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  // Inward Purchase Form
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [challanNo, setChallanNo] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [freightCharges, setFreightCharges] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState('Bank Transfer');
  const [purchaseNotes, setPurchaseNotes] = useState('');

  // Supplier Form
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    company: '',
    address: '',
    city: 'Quetta / Khuzdar',
    notes: ''
  });

  // Supplier Payment Form
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Bank Transfer');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // ─────────────────────────────────────────────────────────────────────────────
  // KPI Metrics Calculations
  // ─────────────────────────────────────────────────────────────────────────────
  const totalPurchasesAll = purchases.reduce((acc, p) => acc + (Number(p.grandTotal) || 0), 0);
  const totalPaidToSuppliers = suppliers.reduce((acc, s) => acc + (Number(s.totalPaid) || 0), 0);
  const totalPayable = suppliers.reduce((acc, s) => acc + (Number(s.balancePayable) || 0), 0);
  const totalShipmentsCount = purchases.length;

  // ─────────────────────────────────────────────────────────────────────────────
  // Filtered Lists
  // ─────────────────────────────────────────────────────────────────────────────
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const matches =
          (p.purchaseNo || '').toLowerCase().includes(s) ||
          (p.supplierName || '').toLowerCase().includes(s) ||
          (p.challanNo || '').toLowerCase().includes(s) ||
          (p.vehicleNo || '').toLowerCase().includes(s) ||
          (p.notes || '').toLowerCase().includes(s);
        if (!matches) return false;
      }

      if (statusFilter !== 'ALL' && (p.paymentStatus || '').toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      if (dateRange !== 'ALL') {
        const rawDate = p.date || p.createdAt || '';
        const now = new Date();
        const pDate = new Date(rawDate);
        if (dateRange === 'TODAY' && pDate.toDateString() !== now.toDateString()) return false;
        if (dateRange === 'WEEK') {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          if (pDate < weekAgo) return false;
        }
        if (dateRange === 'MONTH') {
          const monthAgo = new Date();
          monthAgo.setMonth(now.getMonth() - 1);
          if (pDate < monthAgo) return false;
        }
        if (dateRange === 'CUSTOM') {
          const pDateStr = rawDate.slice(0, 10);
          if (customStartDate && pDateStr < customStartDate) return false;
          if (customEndDate && pDateStr > customEndDate) return false;
        }
      }

      return true;
    });
  }, [purchases, searchTerm, statusFilter, dateRange, customStartDate, customEndDate]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matches =
          (s.name || '').toLowerCase().includes(q) ||
          (s.company || '').toLowerCase().includes(q) ||
          (s.city || '').toLowerCase().includes(q) ||
          (s.contactPerson || '').toLowerCase().includes(q) ||
          (s.phone || '').includes(searchTerm);
        if (!matches) return false;
      }

      if (statusFilter === 'PAID' && Number(s.balancePayable) > 0) return false;
      if (statusFilter === 'PENDING' && Number(s.balancePayable) <= 0) return false;

      return true;
    });
  }, [suppliers, searchTerm, statusFilter]);

  const filteredPayments = useMemo(() => {
    return payments.filter((py) => {
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const matches =
          (py.paymentNo || '').toLowerCase().includes(s) ||
          (py.supplierName || '').toLowerCase().includes(s) ||
          (py.referenceNo || '').toLowerCase().includes(s) ||
          (py.paymentMethod || '').toLowerCase().includes(s) ||
          (py.notes || '').toLowerCase().includes(s);
        if (!matches) return false;
      }

      if (dateRange !== 'ALL') {
        const rawDate = py.date || py.createdAt || '';
        const now = new Date();
        const pyDate = new Date(rawDate);
        if (dateRange === 'TODAY' && pyDate.toDateString() !== now.toDateString()) return false;
        if (dateRange === 'WEEK') {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          if (pyDate < weekAgo) return false;
        }
        if (dateRange === 'MONTH') {
          const monthAgo = new Date();
          monthAgo.setMonth(now.getMonth() - 1);
          if (pyDate < monthAgo) return false;
        }
        if (dateRange === 'CUSTOM') {
          const pyDateStr = rawDate.slice(0, 10);
          if (customStartDate && pyDateStr < customStartDate) return false;
          if (customEndDate && pyDateStr > customEndDate) return false;
        }
      }

      return true;
    });
  }, [payments, searchTerm, dateRange, customStartDate, customEndDate]);

  // Paginated Data
  const purchaseTotalPages = Math.max(1, Math.ceil(filteredPurchases.length / pageSize));
  const activePurchasePage = Math.min(Math.max(1, purchasePage), purchaseTotalPages);
  const paginatedPurchases = useMemo(() => {
    const start = (activePurchasePage - 1) * pageSize;
    return filteredPurchases.slice(start, start + pageSize);
  }, [filteredPurchases, activePurchasePage, pageSize]);

  const supplierTotalPages = Math.max(1, Math.ceil(filteredSuppliers.length / pageSize));
  const activeSupplierPage = Math.min(Math.max(1, supplierPage), supplierTotalPages);
  const paginatedSuppliers = useMemo(() => {
    const start = (activeSupplierPage - 1) * pageSize;
    return filteredSuppliers.slice(start, start + pageSize);
  }, [filteredSuppliers, activeSupplierPage, pageSize]);

  const paymentTotalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const activePaymentPage = Math.min(Math.max(1, paymentPage), paymentTotalPages);
  const paginatedPayments = useMemo(() => {
    const start = (activePaymentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, activePaymentPage, pageSize]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Purchase Modal Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const handleOpenNewPurchase = () => {
    if (suppliers.length === 0) {
      alert('Please add at least one supplier first.');
      setIsAddSupplierModalOpen(true);
      return;
    }
    setEditingPurchase(null);
    setSelectedSupplierId(suppliers[0].id.toString());
    setChallanNo(`CH-${Date.now().toString().slice(-4)}`);
    setVehicleNo('TK-');
    setFreightCharges(0);
    setPaidAmount(0);
    setPurchasePaymentMethod('Bank Transfer');
    setPurchaseNotes('');

    if (items.length > 0) {
      const defaultItem = items[0];
      setPurchaseItems([
        {
          itemId: defaultItem.id,
          name: defaultItem.name,
          category: defaultItem.category,
          totalSqFt: 500,
          ratePerSqFt: defaultItem.costPerSqFt || defaultItem.ratePerSqFt || 200,
          amount: 500 * (defaultItem.costPerSqFt || defaultItem.ratePerSqFt || 200)
        }
      ]);
    } else {
      setPurchaseItems([]);
    }
    setIsPurchaseModalOpen(true);
  };

  const handleOpenEditPurchase = (pur) => {
    setEditingPurchase(pur);
    setSelectedSupplierId(String(pur.supplierId || (suppliers[0]?.id || '')));
    setChallanNo(pur.challanNo || '');
    setVehicleNo(pur.vehicleNo || '');
    setFreightCharges(pur.freightCharges || 0);
    setPaidAmount(pur.paidAmount || 0);
    setPurchasePaymentMethod(pur.paymentMethod || 'Bank Transfer');
    setPurchaseNotes(pur.notes || '');

    if (pur.items && pur.items.length > 0) {
      setPurchaseItems(JSON.parse(JSON.stringify(pur.items)));
    } else if (items.length > 0) {
      const defaultItem = items[0];
      setPurchaseItems([
        {
          itemId: defaultItem.id,
          name: defaultItem.name,
          category: defaultItem.category,
          totalSqFt: 500,
          ratePerSqFt: defaultItem.costPerSqFt || defaultItem.ratePerSqFt || 200,
          amount: 500 * (defaultItem.costPerSqFt || defaultItem.ratePerSqFt || 200)
        }
      ]);
    } else {
      setPurchaseItems([]);
    }
    setIsPurchaseModalOpen(true);
  };

  const handleDeletePurchase = async (pur) => {
    if (!window.confirm(`Delete Inward Shipment #${pur.purchaseNo} (Challan #${pur.challanNo})?\n\nThis will safely reverse the stock added to your yard and adjust supplier ${pur.supplierName}'s ledger balance.`)) {
      return;
    }

    try {
      await db.transaction('rw', [db.supplier_purchases, db.suppliers, db.items, db.stock_movements, db.supplier_payments], async () => {
        // 1. Reverse stock for each inward item
        if (pur.items && Array.isArray(pur.items)) {
          for (const it of pur.items) {
            if (it.itemId !== undefined && it.itemId !== null && it.itemId !== '') {
              const finalItemId = !isNaN(Number(it.itemId)) ? Number(it.itemId) : it.itemId;
              await adjustItemStock(
                finalItemId,
                -(parseFloat(it.totalSqFt) || 0),
                0,
                0,
                'Adjustment',
                pur.purchaseNo,
                `Stock reversed due to deletion of Purchase #${pur.purchaseNo}`
              );
            }
          }
        }

        // 2. Adjust supplier balance
        const sup = await db.suppliers.get(pur.supplierId);
        if (sup) {
          const newTotalPurchased = Math.max(0, (Number(sup.totalPurchased) || 0) - (Number(pur.grandTotal) || 0));
          const newTotalPaid = Math.max(0, (Number(sup.totalPaid) || 0) - (Number(pur.paidAmount) || 0));
          const newBalancePayable = Math.max(0, (Number(sup.balancePayable) || 0) - (Number(pur.balanceDue) || 0));

          await db.suppliers.update(sup.id, {
            totalPurchased: newTotalPurchased,
            totalPaid: newTotalPaid,
            balancePayable: newBalancePayable,
            updatedAt: new Date().toISOString()
          });
        }

        // 3. Remove associated payment records
        const linkedPayments = await db.supplier_payments.where('purchaseId').equals(pur.id).toArray();
        for (const p of linkedPayments) {
          await db.supplier_payments.delete(p.id);
        }

        // 4. Delete the purchase record
        await db.supplier_purchases.delete(pur.id);
      });

      if (drawerPurchase?.id === pur.id) setDrawerPurchase(null);
    } catch (err) {
      alert('Error deleting purchase: ' + err.message);
    }
  };

  const handleAddPurchaseItem = () => {
    if (items.length === 0) {
      alert('No inventory items found. Please add items in Stock Management first.');
      return;
    }
    // Pick the next available item that is not already selected
    const selectedIds = new Set(purchaseItems.map((p) => String(p.itemId)));
    const nextItem = items.find((i) => !selectedIds.has(String(i.id))) || items[0];

    setPurchaseItems([
      ...purchaseItems,
      {
        itemId: nextItem.id,
        name: nextItem.name,
        category: nextItem.category,
        totalSqFt: 500,
        ratePerSqFt: nextItem.costPerSqFt || nextItem.ratePerSqFt || 200,
        amount: 500 * (nextItem.costPerSqFt || nextItem.ratePerSqFt || 200)
      }
    ]);
  };

  const handleUpdatePurchaseItem = (index, field, value) => {
    const updated = [...purchaseItems];
    const row = { ...updated[index] };

    if (field === 'itemId') {
      const parsedId = !isNaN(Number(value)) ? Number(value) : value;
      const found = items.find((i) => i.id === parsedId || String(i.id) === String(value));
      if (found) {
        row.itemId = found.id;
        row.name = found.name;
        row.category = found.category;
        row.ratePerSqFt = found.costPerSqFt || found.ratePerSqFt || row.ratePerSqFt || 200;
      } else {
        row.itemId = parsedId;
      }
    } else {
      row[field] = value;
    }

    const sqft = parseFloat(field === 'totalSqFt' ? value : row.totalSqFt) || 0;
    const rate = parseFloat(field === 'ratePerSqFt' ? value : row.ratePerSqFt) || 0;
    row.amount = Math.round(sqft * rate);

    updated[index] = row;
    setPurchaseItems(updated);
  };

  const handleRemovePurchaseItem = (index) => {
    if (purchaseItems.length <= 1) {
      alert('At least one item is required in the inward shipment.');
      return;
    }
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const purchaseSubtotal = purchaseItems.reduce((acc, it) => acc + (parseFloat(it.amount) || 0), 0);
  const purchaseGrandTotal = purchaseSubtotal + (parseFloat(freightCharges) || 0);
  const purchaseBalanceDue = Math.max(0, purchaseGrandTotal - (parseFloat(paidAmount) || 0));

  let purchaseStatus = 'Pending';
  const numPaid = parseFloat(paidAmount) || 0;
  if (numPaid >= purchaseGrandTotal && purchaseGrandTotal > 0) {
    purchaseStatus = 'Paid';
  } else if (numPaid > 0) {
    purchaseStatus = 'Half Paid';
  }

  const handleSavePurchase = async (e) => {
    e.preventDefault();
    if (purchaseItems.length === 0) {
      alert('Please add at least one stock item.');
      return;
    }

    const sup = suppliers.find((s) => s.id === parseInt(selectedSupplierId, 10));
    if (!sup) return;

    try {
      if (editingPurchase) {
        // ─── EDIT MODE ───
        const oldPur = editingPurchase;
        const purchaseNo = oldPur.purchaseNo;

        await db.transaction('rw', [db.supplier_purchases, db.suppliers, db.items, db.stock_movements, db.supplier_payments], async () => {
          // 1. Revert previous stock movements
          if (oldPur.items && Array.isArray(oldPur.items)) {
            for (const oldIt of oldPur.items) {
              if (oldIt.itemId) {
                const finalId = !isNaN(Number(oldIt.itemId)) ? Number(oldIt.itemId) : oldIt.itemId;
                await adjustItemStock(
                  finalId,
                  -(parseFloat(oldIt.totalSqFt) || 0),
                  0,
                  0,
                  'Adjustment',
                  purchaseNo,
                  `Revert old stock for edited Purchase #${purchaseNo}`
                );
              }
            }
          }

          // 2. Add new updated stock
          for (const it of purchaseItems) {
            if (it.itemId !== undefined && it.itemId !== null && it.itemId !== '') {
              const finalItemId = !isNaN(Number(it.itemId)) ? Number(it.itemId) : it.itemId;
              await adjustItemStock(
                finalItemId,
                parseFloat(it.totalSqFt) || 0,
                0,
                0,
                'Purchase',
                purchaseNo,
                `Updated inward from ${sup.name} (Challan #${challanNo})`
              );
            }
          }

          // 3. Update Supplier Balance
          if (oldPur.supplierId === sup.id) {
            const diffPurchased = purchaseGrandTotal - (Number(oldPur.grandTotal) || 0);
            const diffPaid = numPaid - (Number(oldPur.paidAmount) || 0);
            const diffDue = purchaseBalanceDue - (Number(oldPur.balanceDue) || 0);

            await db.suppliers.update(sup.id, {
              totalPurchased: Math.max(0, (Number(sup.totalPurchased) || 0) + diffPurchased),
              totalPaid: Math.max(0, (Number(sup.totalPaid) || 0) + diffPaid),
              balancePayable: Math.max(0, (Number(sup.balancePayable) || 0) + diffDue),
              updatedAt: new Date().toISOString()
            });
          } else {
            // Revert old supplier and update new supplier
            const oldSup = await db.suppliers.get(oldPur.supplierId);
            if (oldSup) {
              await db.suppliers.update(oldSup.id, {
                totalPurchased: Math.max(0, (Number(oldSup.totalPurchased) || 0) - (Number(oldPur.grandTotal) || 0)),
                totalPaid: Math.max(0, (Number(oldSup.totalPaid) || 0) - (Number(oldPur.paidAmount) || 0)),
                balancePayable: Math.max(0, (Number(oldSup.balancePayable) || 0) - (Number(oldPur.balanceDue) || 0)),
                updatedAt: new Date().toISOString()
              });
            }
            await db.suppliers.update(sup.id, {
              totalPurchased: (Number(sup.totalPurchased) || 0) + purchaseGrandTotal,
              totalPaid: (Number(sup.totalPaid) || 0) + numPaid,
              balancePayable: (Number(sup.balancePayable) || 0) + purchaseBalanceDue,
              updatedAt: new Date().toISOString()
            });
          }

          // 4. Update the Purchase Record
          await db.supplier_purchases.update(oldPur.id, {
            challanNo,
            vehicleNo,
            supplierId: sup.id,
            supplierName: sup.name,
            items: purchaseItems,
            subtotal: purchaseSubtotal,
            freightCharges: parseFloat(freightCharges) || 0,
            grandTotal: purchaseGrandTotal,
            paidAmount: numPaid,
            balanceDue: purchaseBalanceDue,
            paymentStatus: purchaseStatus,
            paymentMethod: purchasePaymentMethod,
            notes: purchaseNotes,
            updatedAt: new Date().toISOString()
          });

          // 5. Update or recreate payment record
          const linkedPayments = await db.supplier_payments.where('purchaseId').equals(oldPur.id).toArray();
          if (linkedPayments.length > 0) {
            if (numPaid > 0) {
              await db.supplier_payments.update(linkedPayments[0].id, {
                amount: numPaid,
                supplierId: sup.id,
                supplierName: sup.name,
                paymentMethod: purchasePaymentMethod,
                notes: `Payment for Inward Purchase #${purchaseNo}`,
                updatedAt: new Date().toISOString()
              });
            } else {
              await db.supplier_payments.delete(linkedPayments[0].id);
            }
          } else if (numPaid > 0) {
            await db.supplier_payments.add({
              paymentNo: `SPAY-${Date.now().toString().slice(-6)}`,
              purchaseId: oldPur.id,
              supplierId: sup.id,
              supplierName: sup.name,
              date: new Date().toISOString(),
              amount: numPaid,
              paymentMethod: purchasePaymentMethod,
              referenceNo: purchaseNo,
              notes: `Payment for Inward Purchase #${purchaseNo}`,
              createdAt: new Date().toISOString()
            });
          }
        });

        setEditingPurchase(null);
      } else {
        // ─── CREATE NEW MODE ───
        const purchaseNo = `PUR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

        await db.transaction('rw', [db.supplier_purchases, db.suppliers, db.items, db.stock_movements, db.supplier_payments], async () => {
          const purchaseData = {
            purchaseNo,
            challanNo,
            vehicleNo,
            date: new Date().toISOString(),
            supplierId: sup.id,
            supplierName: sup.name,
            items: purchaseItems,
            subtotal: purchaseSubtotal,
            freightCharges: parseFloat(freightCharges) || 0,
            grandTotal: purchaseGrandTotal,
            paidAmount: numPaid,
            balanceDue: purchaseBalanceDue,
            paymentStatus: purchaseStatus,
            paymentMethod: purchasePaymentMethod,
            notes: purchaseNotes,
            createdAt: new Date().toISOString()
          };

          const purId = await db.supplier_purchases.add(purchaseData);

          // Add stock to yard inventory and log stock movement
          for (const it of purchaseItems) {
            if (it.itemId !== undefined && it.itemId !== null && it.itemId !== '') {
              const finalItemId = !isNaN(Number(it.itemId)) ? Number(it.itemId) : it.itemId;
              await adjustItemStock(
                finalItemId,
                parseFloat(it.totalSqFt) || 0,
                0,
                0,
                'Purchase',
                purchaseNo,
                `Inward from ${sup.name} (Challan #${challanNo})`
              );
            }
          }

          // Update supplier balance
          const newTotalPurchased = (Number(sup.totalPurchased) || 0) + purchaseGrandTotal;
          const newTotalPaid = (Number(sup.totalPaid) || 0) + numPaid;
          const newBalancePayable = (Number(sup.balancePayable) || 0) + purchaseBalanceDue;

          await db.suppliers.update(sup.id, {
            totalPurchased: newTotalPurchased,
            totalPaid: newTotalPaid,
            balancePayable: newBalancePayable,
            updatedAt: new Date().toISOString()
          });

          if (numPaid > 0) {
            await db.supplier_payments.add({
              paymentNo: `SPAY-${Date.now().toString().slice(-6)}`,
              purchaseId: purId,
              supplierId: sup.id,
              supplierName: sup.name,
              date: new Date().toISOString(),
              amount: numPaid,
              paymentMethod: purchasePaymentMethod,
              referenceNo: purchaseNo,
              notes: `Advance/Payment for Inward Purchase #${purchaseNo}`,
              createdAt: new Date().toISOString()
            });
          }
        });
      }

      setIsPurchaseModalOpen(false);
    } catch (err) {
      alert('Error recording purchase: ' + err.message);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Supplier Add / Edit Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      company: '',
      address: '',
      city: 'Quetta / Khuzdar',
      notes: ''
    });
    setIsAddSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (sup) => {
    setEditingSupplier(sup);
    setSupplierFormData({
      name: sup.name || '',
      contactPerson: sup.contactPerson || '',
      phone: sup.phone || '',
      email: sup.email || '',
      company: sup.company || '',
      address: sup.address || '',
      city: sup.city || 'Quetta / Khuzdar',
      notes: sup.notes || ''
    });
    setIsAddSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await db.suppliers.update(editingSupplier.id, {
          ...supplierFormData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await db.suppliers.add({
          ...supplierFormData,
          totalPurchased: 0,
          totalPaid: 0,
          balancePayable: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      setIsAddSupplierModalOpen(false);
    } catch (err) {
      alert('Error saving supplier: ' + err.message);
    }
  };

  const handleDeleteSupplier = async (sup) => {
    if (!window.confirm(`Delete supplier "${sup.name}"? This action cannot be undone.`)) return;
    try {
      await db.suppliers.delete(sup.id);
      if (ledgerSupplier?.id === sup.id) setLedgerSupplier(null);
    } catch (err) {
      alert('Error deleting supplier: ' + err.message);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Supplier Payment Handler
  // ─────────────────────────────────────────────────────────────────────────────
  const handleOpenPaymentModal = (sup) => {
    setActiveSupplierForPayment(sup);
    setPayAmount(sup.balancePayable > 0 ? sup.balancePayable : '');
    setPayRef(`REF-${Date.now().toString().slice(-4)}`);
    setPayMethod('Bank Transfer');
    setPayNotes(`Payment against outstanding balance`);
    setIsPaymentModalOpen(true);
  };

  const handleRecordSupplierPayment = async (e) => {
    e.preventDefault();
    if (!activeSupplierForPayment || !payAmount) return;

    const amountNum = parseFloat(payAmount);
    if (amountNum <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    try {
      await db.transaction('rw', [db.suppliers, db.supplier_payments, db.supplier_purchases], async () => {
        await db.supplier_payments.add({
          paymentNo: `SPAY-${Date.now().toString().slice(-6)}`,
          supplierId: activeSupplierForPayment.id,
          supplierName: activeSupplierForPayment.name,
          date: new Date().toISOString(),
          amount: amountNum,
          paymentMethod: payMethod,
          referenceNo: payRef,
          notes: payNotes || `Payment to supplier ${activeSupplierForPayment.name}`,
          createdAt: new Date().toISOString()
        });

        const newPaid = (Number(activeSupplierForPayment.totalPaid) || 0) + amountNum;
        const newPayable = Math.max(0, (Number(activeSupplierForPayment.balancePayable) || 0) - amountNum);

        await db.suppliers.update(activeSupplierForPayment.id, {
          totalPaid: newPaid,
          balancePayable: newPayable,
          updatedAt: new Date().toISOString()
        });
      });

      setIsPaymentModalOpen(false);
    } catch (err) {
      alert('Error recording payment: ' + err.message);
    }
  };

  return (
    <div
      className="supplier-printable-area"
      style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '1440px', margin: '0 auto', paddingBottom: '30px' }}
    >
      {/* ── Dynamic Print Styles ─────────────────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .supplier-printable-area, .supplier-printable-area * { visibility: visible !important; }
          .supplier-printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 15px !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print { display: none !important; }
          h1, h2, h3, p, span, td, th, div {
            color: #000000 !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          table { border: 1px solid #cbd5e1 !important; width: 100% !important; border-collapse: collapse !important; }
          th, td { border-bottom: 1px solid #e2e8f0 !important; padding: 6px 8px !important; }
          .print-header-banner { display: block !important; margin-bottom: 14px !important; border-bottom: 2px solid #0f172a !important; padding-bottom: 8px !important; }
        }
        .print-header-banner { display: none; }
      `}</style>

      {/* Print-Only Header */}
      <div className="print-header-banner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>Marble & Granite Factory</h1>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2563eb', marginTop: '2px' }}>
              {activeTab === 'purchases' ? 'Supplier Purchases & Quarry Inward Shipments Report' : activeTab === 'suppliers' ? 'Supplier Accounts & Payables Ledger Report' : 'Supplier Payment Voucher Records Audit'}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
            <div><strong>Printed On:</strong> {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            <div><strong>Total Payable:</strong> Rs. {totalPayable.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 1. SEAMLESS HERO HEADER (With Background Image matching Stock Sheet)       */}
      {/* ------------------------------------------------------------------------- */}
      <div
        className="no-print"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 4px 10px 4px',
          minHeight: '84px',
          overflow: 'hidden'
        }}
      >
        {/* Left Title & Breadcrumb */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#2563eb',
              marginBottom: '4px',
              display: 'inline-block'
            }}
          >
            Supplier Purchases & Inward Stock
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
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
              }}
            >
              <Truck size={24} style={{ color: '#ffffff' }} />
            </div>

            <div>
              <h1
                style={{
                  fontSize: '1.7rem',
                  fontWeight: 800,
                  color: 'var(--text-primary, #0f172a)',
                  margin: 0,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2
                }}
              >
                Supplier Purchases <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-secondary, #64748b)', fontFamily: 'var(--font-urdu)' }}>(سپلائر خریداری و مال آمد)</span>
              </h1>
              <p
                style={{
                  fontSize: '0.86rem',
                  color: 'var(--text-secondary, #64748b)',
                  margin: '2px 0 0 0',
                  fontWeight: 500
                }}
              >
                {language === 'ur'
                  ? 'سپلائر خریداری اور کھاتہ جات کا انتظام'
                  : 'Manage quarry shipments and supplier ledgers'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleOpenAddSupplier}
            style={{
              fontWeight: 700,
              fontSize: '0.84rem',
              padding: '10px 16px',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={15} />
            <span>Add Supplier</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenNewPurchase}
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
            <PackagePlus size={16} />
            <span>New Inward Shipment</span>
          </button>
        </div>

        {/* Background Supplier Image extending seamlessly across the header */}
        <div
          style={{
            position: 'absolute',
            right: '0',
            top: '-15px',
            bottom: '-15px',
            width: '50%',
            maxWidth: '520px',
            backgroundImage: `url('./supplier_background.jpg'), url('/supplier_background.jpg'), url('./stock_background.jpg'), url('/stock_background.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'right center',
            maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
            pointerEvents: 'none',
            opacity: 0.95,
            borderRadius: '14px'
          }}
        />
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 2. TOP 4 KPI CARDS (Matching Global Stock Sheet Aesthetic)                 */}
      {/* ------------------------------------------------------------------------- */}
      <div className="kpi-card-grid">
        {/* Card 1: Total Raw Purchases */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon blue">
            <Truck size={22} />
          </div>
          <div className="kpi-metric-body" style={{ flex: 1, minWidth: 0 }}>
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Total Purchases</span>
              <span className="kpi-metric-label-ur" style={{ fontFamily: 'var(--font-urdu)' }}>(کل خریداری)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Rs. {Math.round(totalPurchasesAll).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card 2: Total Paid to Suppliers */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon green" style={{ background: '#10b981' }}>
            <DollarSign size={22} />
          </div>
          <div className="kpi-metric-body" style={{ flex: 1, minWidth: 0 }}>
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Total Paid</span>
              <span className="kpi-metric-label-ur" style={{ fontFamily: 'var(--font-urdu)' }}>(کل ادا شدہ)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#059669' }}>
              Rs. {Math.round(totalPaidToSuppliers).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card 3: Balance Payable to Quarries */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon red" style={{ background: '#ef4444' }}>
            <AlertTriangle size={22} />
          </div>
          <div className="kpi-metric-body" style={{ flex: 1, minWidth: 0 }}>
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Balance Payable</span>
              <span className="kpi-metric-label-ur" style={{ fontFamily: 'var(--font-urdu)' }}>(مارکیٹ بقایا دینا)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: totalPayable > 0 ? '#dc2626' : '#16a34a' }}>
              Rs. {Math.round(totalPayable).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card 4: Registered Quarry Suppliers */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon amber" style={{ background: '#f59e0b' }}>
            <Building size={22} />
          </div>
          <div className="kpi-metric-body" style={{ flex: 1, minWidth: 0 }}>
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Suppliers</span>
              <span className="kpi-metric-label-ur" style={{ fontFamily: 'var(--font-urdu)' }}>(رجسٹرڈ سپلائرز)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {suppliers.length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Quarries</span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 3. TABS & FILTER CONTROL PANEL (Identical to Stock Sheet)                  */}
      {/* ------------------------------------------------------------------------- */}
      <div
        className="no-print"
        style={{
          background: 'var(--bg-card, #ffffff)',
          borderRadius: '16px',
          padding: '16px 18px',
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        {/* Top: 3 Segment Tabs Switcher + Print Report */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('purchases')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'purchases' ? '#2563eb' : '#f1f5f9',
              color: activeTab === 'purchases' ? '#ffffff' : 'var(--text-secondary, #475569)',
              fontWeight: 700,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: activeTab === 'purchases' ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Truck size={15} />
            <span>Inward Stock Shipments ({purchases.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('suppliers')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'suppliers' ? '#2563eb' : '#f1f5f9',
              color: activeTab === 'suppliers' ? '#ffffff' : 'var(--text-secondary, #475569)',
              fontWeight: 700,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: activeTab === 'suppliers' ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Building size={15} />
            <span>Supplier Directory & Khata ({suppliers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'payments' ? '#2563eb' : '#f1f5f9',
              color: activeTab === 'payments' ? '#ffffff' : 'var(--text-secondary, #475569)',
              fontWeight: 700,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: activeTab === 'payments' ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Receipt size={15} />
            <span>Payment Records ({payments.length})</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              marginLeft: 'auto',
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--bg-primary, #f8fafc)',
              color: 'var(--text-secondary, #475569)',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Printer size={14} />
            <span>Print Report</span>
          </button>
        </div>

        {/* Bottom: Filter Controls Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPurchasePage(1);
                setSupplierPage(1);
                setPaymentPage(1);
              }}
              placeholder={
                activeTab === 'purchases'
                  ? 'Search purchase #, supplier, truck #, challan...'
                  : activeTab === 'suppliers'
                  ? 'Search supplier name, company, phone, city...'
                  : 'Search payment #, reference #, remarks...'
              }
              style={{
                width: '100%',
                padding: '10px 14px 10px 38px',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #cbd5e1)',
                fontSize: '0.84rem',
                outline: 'none',
                background: 'var(--bg-primary, #f8fafc)',
                color: 'var(--text-primary, #0f172a)',
                height: '44px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Date Range Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setPurchasePage(1);
                setPaymentPage(1);
              }}
              style={{
                padding: '0 14px 0 34px',
                height: '44px',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: 'var(--bg-primary, #f8fafc)',
                color: 'var(--text-primary, #0f172a)',
                fontSize: '0.84rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">Date Range: All</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">This Week</option>
              <option value="MONTH">This Month</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
            <Calendar size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
          </div>

          {/* Custom Date Pickers when CUSTOM is active */}
          {dateRange === 'CUSTOM' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setPurchasePage(1);
                  setPaymentPage(1);
                }}
                style={{
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '0.8rem',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-card, #ffffff)',
                  outline: 'none',
                  height: '44px'
                }}
                title="From Date"
              />
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setPurchasePage(1);
                  setPaymentPage(1);
                }}
                style={{
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '0.8rem',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-card, #ffffff)',
                  outline: 'none',
                  height: '44px'
                }}
                title="To Date"
              />
            </div>
          )}

          {/* Status Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPurchasePage(1);
                setSupplierPage(1);
              }}
              style={{
                padding: '0 14px 0 34px',
                height: '44px',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: 'var(--bg-primary, #f8fafc)',
                color: 'var(--text-primary, #0f172a)',
                fontSize: '0.84rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">Status: All</option>
              <option value="PAID">Paid / Cleared</option>
              <option value="HALF PAID">Half Paid</option>
              <option value="PENDING">Pending / Payable</option>
            </select>
            <Tag size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
          </div>

          {/* Reset Filters */}
          {(searchTerm || statusFilter !== 'ALL' || dateRange !== 'ALL' || customStartDate || customEndDate) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setDateRange('ALL');
                setCustomStartDate('');
                setCustomEndDate('');
                setPurchasePage(1);
                setSupplierPage(1);
                setPaymentPage(1);
              }}
              style={{
                height: '44px',
                padding: '0 10px',
                color: '#ef4444',
                fontSize: '0.78rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 600
              }}
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 4. MAIN DATA TABLES (Zero Horizontal Scroll + Proportional Columns)        */}
      {/* ------------------------------------------------------------------------- */}

      {/* TAB 1: Inward Stock Shipments Table */}
      {activeTab === 'purchases' && (
        <div className="global-table-container">
          <div className="global-table-scroll">
            <table className="global-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '110px', padding: '10px 8px' }}>PURCHASE #</th>
                  <th style={{ width: '90px', padding: '10px 6px' }}>DATE</th>
                  <th style={{ padding: '10px 8px' }}>SUPPLIER / QUARRY</th>
                  <th style={{ width: '130px', padding: '10px 6px' }}>CHALLAN & TRUCK</th>
                  <th style={{ width: '160px', padding: '10px 6px' }}>ITEMS RECEIVED</th>
                  <th style={{ width: '105px', textAlign: 'right', padding: '10px 6px' }}>GRAND TOTAL</th>
                  <th style={{ width: '95px', textAlign: 'right', padding: '10px 6px' }}>PAID</th>
                  <th style={{ width: '105px', textAlign: 'right', padding: '10px 6px' }}>BALANCE</th>
                  <th style={{ width: '85px', textAlign: 'center', padding: '10px 4px' }}>STATUS</th>
                  <th style={{ width: '110px', textAlign: 'center', padding: '10px 4px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '45px 20px', color: '#94a3b8' }}>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>No inward shipment records found.</div>
                      <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Click "+ New Inward Shipment" to record incoming material into your yard.</div>
                    </td>
                  </tr>
                ) : (
                  paginatedPurchases.map((pur) => {
                    const isPaid = pur.paymentStatus === 'Paid';
                    const isHalf = pur.paymentStatus === 'Half Paid';

                    return (
                      <tr key={pur.id}>
                        {/* Purchase # */}
                        <td style={{ padding: '8px 8px' }}>
                          <span style={{ fontWeight: 800, color: '#2563eb', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                            {pur.purchaseNo}
                          </span>
                        </td>

                        {/* Date */}
                        <td style={{ fontSize: '0.78rem', color: '#64748b', padding: '8px 6px', whiteSpace: 'nowrap' }}>
                          {new Date(pur.date || pur.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>

                        {/* Supplier */}
                        <td style={{ padding: '8px 8px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary, #0f172a)', fontSize: '0.84rem' }}>
                            {pur.supplierName}
                          </div>
                          {pur.notes && (
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{pur.notes}</div>
                          )}
                        </td>

                        {/* Challan & Truck */}
                        <td style={{ padding: '8px 6px' }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                            {pur.challanNo || '—'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{pur.vehicleNo || '—'}</div>
                        </td>

                        {/* Items Received */}
                        <td style={{ padding: '8px 6px' }}>
                          {pur.items?.map((it, idx) => (
                            <div key={idx} style={{ fontSize: '0.75rem', lineHeight: 1.3 }}>
                              <span style={{ fontWeight: 600 }}>{it.name}</span> <span style={{ color: '#64748b' }}>({it.totalSqFt} Sq.Ft)</span>
                            </div>
                          ))}
                        </td>

                        {/* Grand Total */}
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.82rem', padding: '8px 6px', whiteSpace: 'nowrap' }}>
                          Rs. {Number(pur.grandTotal || 0).toLocaleString()}
                        </td>

                        {/* Paid Amount */}
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#059669', fontSize: '0.82rem', padding: '8px 6px', whiteSpace: 'nowrap' }}>
                          Rs. {Number(pur.paidAmount || 0).toLocaleString()}
                        </td>

                        {/* Balance Due */}
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: Number(pur.balanceDue) > 0 ? '#dc2626' : '#16a34a', fontSize: '0.82rem', padding: '8px 6px', whiteSpace: 'nowrap' }}>
                          Rs. {Number(pur.balanceDue || 0).toLocaleString()}
                        </td>

                        {/* Status */}
                        <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                          <span
                            style={{
                              background: isPaid ? '#dcfce7' : isHalf ? 'rgba(37, 99, 235, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              color: isPaid ? '#15803d' : isHalf ? '#2563eb' : '#dc2626',
                              border: `1px solid ${isPaid ? '#bbf7d0' : isHalf ? 'rgba(37, 99, 235, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                              padding: '2px 8px',
                              borderRadius: '20px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              display: 'inline-block',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {pur.paymentStatus || 'Pending'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <button
                              type="button"
                              onClick={() => setDrawerPurchase(pur)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                border: 'none',
                                background: '#eff6ff',
                                color: '#2563eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                              title="View Shipment Details"
                            >
                              <Eye size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditPurchase(pur)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                border: 'none',
                                background: '#f0fdf4',
                                color: '#16a34a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                              title="Edit Inward Shipment"
                            >
                              <Edit2 size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeletePurchase(pur)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                border: 'none',
                                background: '#fff1f2',
                                color: '#e11d48',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                              title="Delete Inward Shipment"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Global Pagination */}
          <GlobalPagination
            currentPage={activePurchasePage}
            totalPages={purchaseTotalPages}
            totalRecords={filteredPurchases.length}
            pageSize={pageSize}
            onPageChange={(page) => setPurchasePage(page)}
            language={language}
          />
        </div>
      )}

      {/* TAB 2: Supplier Directory & Khata Table */}
      {activeTab === 'suppliers' && (
        <div className="global-table-container">
          <div className="global-table-scroll">
            <table className="global-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 8px' }}>SUPPLIER / QUARRY NAME</th>
                  <th style={{ width: '150px', padding: '10px 6px' }}>COMPANY & LOCATION</th>
                  <th style={{ width: '130px', padding: '10px 6px' }}>PHONE / CONTACT</th>
                  <th style={{ width: '120px', textAlign: 'right', padding: '10px 6px' }}>TOTAL PURCHASES</th>
                  <th style={{ width: '110px', textAlign: 'right', padding: '10px 6px' }}>TOTAL PAID</th>
                  <th style={{ width: '120px', textAlign: 'right', padding: '10px 6px' }}>BALANCE PAYABLE</th>
                  <th style={{ width: '90px', textAlign: 'center', padding: '10px 4px' }}>STATUS</th>
                  <th style={{ width: '130px', textAlign: 'center', padding: '10px 4px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '45px 20px', color: '#94a3b8' }}>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>No suppliers registered yet.</div>
                      <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Click "+ Add Supplier" to register quarries and vendors.</div>
                    </td>
                  </tr>
                ) : (
                  paginatedSuppliers.map((sup) => {
                    const hasBalance = Number(sup.balancePayable) > 0;

                    return (
                      <tr key={sup.id}>
                        {/* Supplier Name */}
                        <td style={{ padding: '8px 8px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary, #0f172a)', fontSize: '0.84rem' }}>
                            {sup.name}
                          </div>
                          {sup.contactPerson && (
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Contact: {sup.contactPerson}</div>
                          )}
                        </td>

                        {/* Company & Location */}
                        <td style={{ padding: '8px 6px' }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{sup.company || '—'}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{sup.city}</div>
                        </td>

                        {/* Phone */}
                        <td style={{ padding: '8px 6px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                          {sup.phone || '—'}
                        </td>

                        {/* Total Purchases */}
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.82rem', padding: '8px 6px' }}>
                          Rs. {Number(sup.totalPurchased || 0).toLocaleString()}
                        </td>

                        {/* Total Paid */}
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#059669', fontSize: '0.82rem', padding: '8px 6px' }}>
                          Rs. {Number(sup.totalPaid || 0).toLocaleString()}
                        </td>

                        {/* Balance Payable */}
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: hasBalance ? '#dc2626' : '#059669', fontSize: '0.84rem', padding: '8px 6px' }}>
                          Rs. {Number(sup.balancePayable || 0).toLocaleString()}
                        </td>

                        {/* Status */}
                        <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                          <span
                            style={{
                              background: hasBalance ? 'rgba(239, 68, 68, 0.12)' : '#dcfce7',
                              color: hasBalance ? '#dc2626' : '#15803d',
                              border: `1px solid ${hasBalance ? 'rgba(239, 68, 68, 0.25)' : '#bbf7d0'}`,
                              padding: '2px 8px',
                              borderRadius: '20px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              display: 'inline-block'
                            }}
                          >
                            {hasBalance ? 'Payable' : 'Cleared'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentModal(sup)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#10b981',
                                color: '#ffffff',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Record Payment to Supplier"
                            >
                              <DollarSign size={12} /> Pay
                            </button>

                            <button
                              type="button"
                              onClick={() => setLedgerSupplier(sup)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                border: 'none',
                                background: '#eff6ff',
                                color: '#2563eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                              title="View Supplier Khata"
                            >
                              <Eye size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditSupplier(sup)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                border: 'none',
                                background: '#f0fdf4',
                                color: '#16a34a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                              title="Edit Supplier"
                            >
                              <Edit2 size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSupplier(sup)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                border: 'none',
                                background: '#fff1f2',
                                color: '#e11d48',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                              title="Delete Supplier"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Global Pagination */}
          <GlobalPagination
            currentPage={activeSupplierPage}
            totalPages={supplierTotalPages}
            totalRecords={filteredSuppliers.length}
            pageSize={pageSize}
            onPageChange={(page) => setSupplierPage(page)}
            language={language}
          />
        </div>
      )}

      {/* TAB 3: Payment Records Table */}
      {activeTab === 'payments' && (
        <div className="global-table-container">
          <div className="global-table-scroll">
            <table className="global-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '120px', padding: '10px 8px' }}>PAYMENT #</th>
                  <th style={{ width: '100px', padding: '10px 6px' }}>DATE</th>
                  <th style={{ padding: '10px 8px' }}>SUPPLIER NAME</th>
                  <th style={{ width: '120px', textAlign: 'right', padding: '10px 6px' }}>AMOUNT PAID</th>
                  <th style={{ width: '130px', textAlign: 'center', padding: '10px 6px' }}>PAYMENT MODE</th>
                  <th style={{ width: '140px', padding: '10px 6px' }}>REF / DOC #</th>
                  <th style={{ padding: '10px 8px' }}>NOTES / REMARKS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '45px 20px', color: '#94a3b8' }}>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>No payment transactions found.</div>
                      <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Payments recorded against suppliers will appear here chronologically.</div>
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map((py) => (
                    <tr key={py.id}>
                      <td style={{ padding: '8px 8px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#2563eb', fontSize: '0.82rem' }}>
                        {py.paymentNo}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#64748b', padding: '8px 6px', whiteSpace: 'nowrap' }}>
                        {new Date(py.date || py.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary, #0f172a)', padding: '8px 8px' }}>
                        {py.supplierName}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669', fontFamily: 'var(--font-mono)', fontSize: '0.84rem', padding: '8px 6px' }}>
                        Rs. {Number(py.amount || 0).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px 6px' }}>
                        <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>
                          {py.paymentMethod || 'Bank Transfer'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', padding: '8px 6px' }}>
                        {py.referenceNo || '—'}
                      </td>
                      <td style={{ fontSize: '0.76rem', color: '#64748b', padding: '8px 8px' }}>
                        {py.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Global Pagination */}
          <GlobalPagination
            currentPage={activePaymentPage}
            totalPages={paymentTotalPages}
            totalRecords={filteredPayments.length}
            pageSize={pageSize}
            onPageChange={(page) => setPaymentPage(page)}
            language={language}
          />
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 5. SLIDE-OVER SHIPMENT DETAILS DRAWER                                      */}
      {/* ------------------------------------------------------------------------- */}
      {drawerPurchase && (
        <div className="modal-backdrop" onClick={() => setDrawerPurchase(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              right: 0,
              top: 0,
              bottom: 0,
              width: '460px',
              maxWidth: '92vw',
              height: '100vh',
              borderRadius: 0,
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-secondary, #ffffff)',
              borderLeft: '1px solid var(--border-color)',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
              animation: 'slideInRight 0.2s ease'
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700, textTransform: 'uppercase' }}>
                  Inward Shipment • {drawerPurchase.purchaseNo}
                </div>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {drawerPurchase.supplierName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDrawerPurchase(null)}
                className="btn btn-ghost btn-sm"
                style={{ padding: '4px', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Key Strip */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'var(--bg-primary, #f8fafc)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Grand Total</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2563eb', marginTop: '2px' }} className="font-mono">
                    Rs. {Number(drawerPurchase.grandTotal || 0).toLocaleString()}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-primary, #f8fafc)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Balance Due</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: Number(drawerPurchase.balanceDue) > 0 ? '#dc2626' : '#059669', marginTop: '2px' }} className="font-mono">
                    Rs. {Number(drawerPurchase.balanceDue || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Shipment Info */}
              <div style={{ background: 'var(--bg-primary, #f8fafc)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Date:</span>
                  <span style={{ fontWeight: 700 }}>{new Date(drawerPurchase.date || drawerPurchase.createdAt).toLocaleDateString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Challan / Bilty #:</span>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{drawerPurchase.challanNo || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Truck / Vehicle #:</span>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{drawerPurchase.vehicleNo || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Freight Charges:</span>
                  <span style={{ fontWeight: 700 }}>Rs. {Number(drawerPurchase.freightCharges || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Payment Mode:</span>
                  <span style={{ fontWeight: 700 }}>{drawerPurchase.paymentMethod || 'Bank Transfer'}</span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Received Materials
                </div>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--bg-primary, #f1f5f9)' }}>
                      <tr>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Item</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Sq.Ft</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Rate</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drawerPurchase.items?.map((it, idx) => (
                        <tr key={idx} style={{ borderTop: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px', fontWeight: 600 }}>{it.name}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{it.totalSqFt}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>Rs. {it.ratePerSqFt}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>Rs. {Number(it.amount || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 6. SUPPLIER KHATA LEDGER MODAL                                             */}
      {/* ------------------------------------------------------------------------- */}
      {ledgerSupplier && (
        <div className="modal-backdrop" onClick={() => setLedgerSupplier(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '780px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700, textTransform: 'uppercase' }}>
                  Supplier Khata Account
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  {ledgerSupplier.name} ({ledgerSupplier.company || ledgerSupplier.city})
                </h3>
              </div>
              <button type="button" onClick={() => setLedgerSupplier(null)} className="btn btn-ghost btn-sm" style={{ padding: '4px', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Summary Strip */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'var(--bg-primary, #f8fafc)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Total Purchased</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px' }} className="font-mono">
                    Rs. {Number(ledgerSupplier.totalPurchased || 0).toLocaleString()}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-primary, #f8fafc)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Total Paid</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669', marginTop: '2px' }} className="font-mono">
                    Rs. {Number(ledgerSupplier.totalPaid || 0).toLocaleString()}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-primary, #f8fafc)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Balance Payable</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: Number(ledgerSupplier.balancePayable) > 0 ? '#dc2626' : '#059669', marginTop: '2px' }} className="font-mono">
                    Rs. {Number(ledgerSupplier.balancePayable || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Transactions History */}
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px', color: '#475569' }}>
                  Shipment & Payment History
                </div>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--bg-primary, #f1f5f9)' }}>
                      <tr>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Doc / Ref #</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Description</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Debit / Billed</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Credit / Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases
                        .filter((p) => p.supplierId === ledgerSupplier.id)
                        .map((p) => (
                          <tr key={`p-${p.id}`} style={{ borderTop: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px', color: '#64748b' }}>{new Date(p.date || p.createdAt).toLocaleDateString()}</td>
                            <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#2563eb' }}>{p.purchaseNo}</td>
                            <td style={{ padding: '8px' }}>Challan #{p.challanNo} ({p.vehicleNo})</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>Rs. {Number(p.grandTotal || 0).toLocaleString()}</td>
                            <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>—</td>
                          </tr>
                        ))}
                      {payments
                        .filter((py) => py.supplierId === ledgerSupplier.id)
                        .map((py) => (
                          <tr key={`py-${py.id}`} style={{ borderTop: '1px solid var(--border-color)', background: '#f0fdf4' }}>
                            <td style={{ padding: '8px', color: '#64748b' }}>{new Date(py.date || py.createdAt).toLocaleDateString()}</td>
                            <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#059669' }}>{py.paymentNo}</td>
                            <td style={{ padding: '8px' }}>Payment ({py.paymentMethod}) {py.referenceNo ? `Ref: ${py.referenceNo}` : ''}</td>
                            <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>—</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: '#059669', fontFamily: 'var(--font-mono)' }}>Rs. {Number(py.amount || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setLedgerSupplier(null)}>Close</button>
              <button type="button" className="btn btn-primary" onClick={() => { const s = ledgerSupplier; setLedgerSupplier(null); handleOpenPaymentModal(s); }}>
                <DollarSign size={14} /> Pay Supplier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 7. RECORD INWARD STOCK SHIPMENT MODAL                                      */}
      {/* ------------------------------------------------------------------------- */}
      {/* ------------------------------------------------------------------------- */}
      {/* 7. RECORD INWARD STOCK SHIPMENT MODAL                                      */}
      {/* ------------------------------------------------------------------------- */}
      {isPurchaseModalOpen && (
        <div className="app-modal-overlay" onClick={() => setIsPurchaseModalOpen(false)}>
          <div
            className="app-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '780px', width: '100%' }}
          >
            {/* Modal Header */}
            <div className="app-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="app-modal-icon-badge">
                  <Truck size={24} color="#ffffff" />
                </div>
                <div>
                  <h3 className="app-modal-title">
                    {editingPurchase ? `Edit Inward Shipment (${editingPurchase.purchaseNo})` : 'Record Inward Stock Shipment'}
                  </h3>
                  <p className="app-modal-subtitle">
                    {editingPurchase ? 'Update received stock materials, quantities, rates and supplier balance' : 'Receive stock & update inventory from quarry or supplier'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPurchaseModalOpen(false)}
                className="app-modal-close-btn"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="app-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Supplier Selection */}
                <div className="app-form-group">
                  <label className="app-form-label">
                    Supplier / Quarry <span className="app-form-label-required">*</span>
                  </label>
                  <div className="app-input-wrapper">
                    <Building size={16} className="app-input-icon" />
                    <select
                      className="app-form-select"
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.company || s.city})</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="app-input-chevron" />
                  </div>
                </div>

                {/* Row: Challan & Truck */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      Challan / Bilty # <span className="app-form-label-required">*</span>
                    </label>
                    <div className="app-input-wrapper">
                      <FileText size={16} className="app-input-icon" />
                      <input
                        type="text"
                        required
                        className="app-form-input font-mono"
                        value={challanNo}
                        onChange={(e) => setChallanNo(e.target.value)}
                        placeholder="e.g. CH-9901"
                      />
                    </div>
                  </div>

                  <div className="app-form-group">
                    <label className="app-form-label">
                      Truck / Vehicle # <span className="app-form-label-required">*</span>
                    </label>
                    <div className="app-input-wrapper">
                      <Truck size={16} className="app-input-icon" />
                      <input
                        type="text"
                        required
                        className="app-form-input font-mono"
                        value={vehicleNo}
                        onChange={(e) => setVehicleNo(e.target.value)}
                        placeholder="e.g. TK-9022"
                      />
                    </div>
                  </div>
                </div>

                {/* Items Received into Yard */}
                <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <label className="app-form-label" style={{ margin: 0, fontWeight: 800, color: '#1e293b', fontSize: '0.88rem' }}>
                        Inward Shipment Materials ({purchaseItems.length} {purchaseItems.length === 1 ? 'Item' : 'Items'})
                      </label>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Select inventory marble/tile items and specify incoming square footage</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleAddPurchaseItem}
                      style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
                    >
                      <Plus size={15} /> Add Item Row
                    </button>
                  </div>

                  {/* Table Column Headings */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr 1.1fr 1.2fr 36px', gap: '8px', padding: '0 8px 6px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    <span>Select Item / Type</span>
                    <span>Qty (Sq.Ft)</span>
                    <span>Rate / Sq.Ft</span>
                    <span style={{ textAlign: 'right' }}>Total (Rs.)</span>
                    <span></span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                    {purchaseItems.map((it, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr 1.1fr 1.2fr 36px', gap: '8px', alignItems: 'center', background: '#ffffff', padding: '8px 10px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                        <div className="app-input-wrapper">
                          <Layers size={14} className="app-input-icon" />
                          <select
                            className="app-form-select"
                            value={String(it.itemId)}
                            onChange={(e) => handleUpdatePurchaseItem(idx, 'itemId', e.target.value)}
                            style={{ padding: '7px 10px 7px 32px', fontSize: '0.82rem', height: '36px', fontWeight: 600 }}
                          >
                            {items.map((i) => {
                              const cleanName = (i.name || '').replace(/^Kali Patti\s+/i, '');
                              return (
                                <option key={i.id} value={String(i.id)}>
                                  {cleanName} ({i.category || 'Marble'})
                                </option>
                              );
                            })}
                          </select>
                          <ChevronDown size={12} className="app-input-chevron" />
                        </div>

                        <div className="app-input-wrapper">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Sq.Ft"
                            className="app-form-input font-mono"
                            value={it.totalSqFt}
                            onChange={(e) => handleUpdatePurchaseItem(idx, 'totalSqFt', e.target.value)}
                            style={{ padding: '7px 10px', fontSize: '0.82rem', height: '36px', textAlign: 'center', fontWeight: 700 }}
                          />
                        </div>

                        <div className="app-input-wrapper">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Rate"
                            className="app-form-input font-mono"
                            value={it.ratePerSqFt}
                            onChange={(e) => handleUpdatePurchaseItem(idx, 'ratePerSqFt', e.target.value)}
                            style={{ padding: '7px 10px', fontSize: '0.82rem', height: '36px', textAlign: 'center', fontWeight: 700 }}
                          />
                        </div>

                        <div className="font-mono" style={{ fontWeight: 800, textAlign: 'right', color: '#2563eb', fontSize: '0.86rem', paddingRight: '4px' }}>
                          Rs. {Number(it.amount || 0).toLocaleString()}
                        </div>

                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: purchaseItems.length <= 1 ? '#cbd5e1' : '#ef4444', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: purchaseItems.length <= 1 ? 'not-allowed' : 'pointer' }}
                          onClick={() => handleRemovePurchaseItem(idx)}
                          disabled={purchaseItems.length <= 1}
                          title={purchaseItems.length <= 1 ? 'At least one item row is required' : 'Remove item row'}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Freight & Payment */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="app-form-group">
                    <label className="app-form-label">Freight / Fare (Rs.)</label>
                    <div className="app-input-wrapper">
                      <DollarSign size={16} className="app-input-icon" />
                      <input
                        type="number"
                        min="0"
                        className="app-form-input font-mono"
                        value={freightCharges}
                        onChange={(e) => setFreightCharges(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="app-form-group">
                    <label className="app-form-label">Paid Now (Rs.)</label>
                    <div className="app-input-wrapper">
                      <DollarSign size={16} className="app-input-icon" />
                      <input
                        type="number"
                        min="0"
                        className="app-form-input font-mono"
                        style={{ color: '#059669', fontWeight: 700 }}
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="app-form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="app-form-label">Payment Mode</label>
                    <div className="app-input-wrapper">
                      <CreditCard size={16} className="app-input-icon" />
                      <select
                        className="app-form-select"
                        value={purchasePaymentMethod}
                        onChange={(e) => setPurchasePaymentMethod(e.target.value)}
                      >
                        <option value="Bank Transfer">Bank Transfer / IBFT</option>
                        <option value="Cash">Cash (Naqad)</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                      <ChevronDown size={14} className="app-input-chevron" />
                    </div>
                  </div>
                </div>

                {/* Totals Summary Banner */}
                <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Grand Total Purchase:</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb' }} className="font-mono">
                      Rs. {purchaseGrandTotal.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Balance Payable:</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: purchaseBalanceDue > 0 ? '#dc2626' : '#059669' }} className="font-mono">
                      Rs. {purchaseBalanceDue.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span
                      style={{
                        background: purchaseStatus === 'Paid' ? '#dcfce7' : purchaseStatus === 'Half Paid' ? 'rgba(37, 99, 235, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: purchaseStatus === 'Paid' ? '#15803d' : purchaseStatus === 'Half Paid' ? '#2563eb' : '#dc2626',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: 700
                      }}
                    >
                      {purchaseStatus}
                    </span>
                  </div>
                </div>

                {/* Required Notice Banner */}
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
                  onClick={() => setIsPurchaseModalOpen(false)}
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  type="submit"
                  className="app-btn-submit"
                >
                  <Save size={16} />
                  {editingPurchase ? 'Update Stock Shipment' : 'Receive Stock & Update Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 8. ADD / EDIT SUPPLIER MODAL                                               */}
      {/* ------------------------------------------------------------------------- */}
      {isAddSupplierModalOpen && (
        <div className="app-modal-overlay" onClick={() => setIsAddSupplierModalOpen(false)}>
          <div
            className="app-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '560px' }}
          >
            {/* Modal Header */}
            <div className="app-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="app-modal-icon-badge">
                  <Building size={24} color="#ffffff" />
                </div>
                <div>
                  <h3 className="app-modal-title">
                    {editingSupplier ? 'Edit Marble Supplier / Quarry' : 'Register Marble Supplier'}
                  </h3>
                  <p className="app-modal-subtitle">
                    {editingSupplier ? 'Update supplier information and quarry details' : 'Add new quarry supplier to your supply chain'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSupplierModalOpen(false)}
                className="app-modal-close-btn"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="app-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="app-form-group">
                  <label className="app-form-label">
                    Supplier / Quarry Name <span className="app-form-label-required">*</span>
                  </label>
                  <div className="app-input-wrapper">
                    <Building size={16} className="app-input-icon" />
                    <input
                      type="text"
                      required
                      className="app-form-input"
                      value={supplierFormData.name}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                      placeholder="e.g. Balochistan Mining Corp"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="app-form-group">
                    <label className="app-form-label">Contact Person</label>
                    <div className="app-input-wrapper">
                      <User size={16} className="app-input-icon" />
                      <input
                        type="text"
                        className="app-form-input"
                        value={supplierFormData.contactPerson}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, contactPerson: e.target.value })}
                        placeholder="e.g. Mir Khan"
                      />
                    </div>
                  </div>

                  <div className="app-form-group">
                    <label className="app-form-label">
                      Phone # <span className="app-form-label-required">*</span>
                    </label>
                    <div className="app-input-wrapper">
                      <Phone size={16} className="app-input-icon" />
                      <input
                        type="text"
                        required
                        className="app-form-input"
                        value={supplierFormData.phone}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                        placeholder="0300-1234567"
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="app-form-group">
                    <label className="app-form-label">Company / Quarry</label>
                    <div className="app-input-wrapper">
                      <Layers size={16} className="app-input-icon" />
                      <input
                        type="text"
                        className="app-form-input"
                        value={supplierFormData.company}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, company: e.target.value })}
                        placeholder="e.g. Ziarat Quarry Hub"
                      />
                    </div>
                  </div>

                  <div className="app-form-group">
                    <label className="app-form-label">City / Location</label>
                    <div className="app-input-wrapper">
                      <MapPin size={16} className="app-input-icon" />
                      <input
                        type="text"
                        className="app-form-input"
                        value={supplierFormData.city}
                        onChange={(e) => setSupplierFormData({ ...supplierFormData, city: e.target.value })}
                        placeholder="e.g. Quetta / Karachi"
                      />
                    </div>
                  </div>
                </div>

                {/* Required Notice Banner */}
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
                  onClick={() => setIsAddSupplierModalOpen(false)}
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  type="submit"
                  className="app-btn-submit"
                >
                  <Save size={16} />
                  {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 9. RECORD SUPPLIER PAYMENT MODAL                                          */}
      {/* ------------------------------------------------------------------------- */}
      {isPaymentModalOpen && activeSupplierForPayment && (
        <div className="modal-backdrop" onClick={() => setIsPaymentModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', width: '100%', display: 'flex', flexDirection: 'column' }}
          >
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={18} style={{ color: '#10b981' }} />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Record Payment to {activeSupplierForPayment.name}</h3>
              </div>
              <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: '4px', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordSupplierPayment} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Balance Info Box */}
                <div style={{ padding: '12px 14px', background: 'var(--bg-primary, #f8fafc)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Balance Payable to Supplier:</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }} className="font-mono">
                    Rs. {Number(activeSupplierForPayment.balancePayable || 0).toLocaleString()}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '4px' }}>Payment Amount (Rs.) *</label>
                  <input
                    type="number"
                    required
                    className="form-control font-mono"
                    style={{ color: '#059669', fontSize: '1.15rem', fontWeight: 800, padding: '8px 10px' }}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="Enter amount..."
                    autoFocus
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '4px' }}>Payment Mode</label>
                    <select
                      className="form-control"
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      style={{ padding: '8px 10px', fontSize: '0.84rem' }}
                    >
                      <option value="Bank Transfer">Bank Transfer / IBFT</option>
                      <option value="Cash">Cash (Naqad)</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '4px' }}>Reference / Slip #</label>
                    <input
                      type="text"
                      className="form-control font-mono"
                      value={payRef}
                      onChange={(e) => setPayRef(e.target.value)}
                      placeholder="e.g. IBFT-99482"
                      style={{ padding: '8px 10px', fontSize: '0.84rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '4px' }}>Notes / Remarks</label>
                  <input
                    type="text"
                    className="form-control"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="e.g. Payment towards Quarry Invoice"
                    style={{ padding: '8px 10px', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsPaymentModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }}>
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Universal Report Print Modal for Supplier Purchases / Suppliers / Payments */}
      <UniversalReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={
          activeTab === 'purchases'
            ? 'Supplier Purchases & Inward Shipments Report'
            : activeTab === 'suppliers'
            ? 'Supplier Accounts & Payable Balance Directory'
            : 'Supplier Payment History & Vouchers Log'
        }
        titleUrdu={
          activeTab === 'purchases'
            ? 'سپلائر انورڈ خریداری و کنسائنمنٹ آڈٹ رپورٹ'
            : activeTab === 'suppliers'
            ? 'سپلائر اکاؤنٹس و واجب الادا بقایا جات آڈٹ رپورٹ'
            : 'سپلائر ادائیگیاں و واؤچرز آڈٹ لاگ'
        }
        subtitle={`Active Tab: ${activeTab.toUpperCase()} | Date Filter: ${dateRange} | Total: ${
          activeTab === 'purchases'
            ? filteredPurchases.length
            : activeTab === 'suppliers'
            ? filteredSuppliers.length
            : filteredPayments.length
        }`}
        factorySettings={settings}
        kpis={
          activeTab === 'purchases'
            ? [
                { label: 'Total Inward Shipments', labelUrdu: 'کل کنسائنمنٹس', value: filteredPurchases.length, color: '#2563eb' },
                {
                  label: 'Gross Purchase',
                  labelUrdu: 'کل خریداری',
                  value: `Rs. ${filteredPurchases.reduce((acc, p) => acc + (Number(p.grandTotal) || 0), 0).toLocaleString()}`,
                  color: '#1e293b'
                },
                {
                  label: 'Total Paid',
                  labelUrdu: 'ادا شدہ رقم',
                  value: `Rs. ${filteredPurchases.reduce((acc, p) => acc + (Number(p.paidAmount) || 0), 0).toLocaleString()}`,
                  color: '#059669'
                },
                {
                  label: 'Outstanding Payable',
                  labelUrdu: 'واجب الادا بقایا',
                  value: `Rs. ${filteredPurchases.reduce((acc, p) => acc + (Number(p.balanceDue) || 0), 0).toLocaleString()}`,
                  color: '#dc2626'
                }
              ]
            : activeTab === 'suppliers'
            ? [
                { label: 'Total Suppliers', labelUrdu: 'کل سپلائرز', value: filteredSuppliers.length, color: '#2563eb' },
                {
                  label: 'Total Purchases',
                  labelUrdu: 'کل مال خریدا',
                  value: `Rs. ${filteredSuppliers.reduce((acc, s) => acc + (Number(s.totalPurchases) || 0), 0).toLocaleString()}`,
                  color: '#1e293b'
                },
                {
                  label: 'Total Paid',
                  labelUrdu: 'ادا شدہ',
                  value: `Rs. ${filteredSuppliers.reduce((acc, s) => acc + (Number(s.totalPaid) || 0), 0).toLocaleString()}`,
                  color: '#059669'
                },
                {
                  label: 'Net Balance Payable',
                  labelUrdu: 'کل واجب الادا',
                  value: `Rs. ${filteredSuppliers.reduce((acc, s) => acc + (Number(s.balancePayable) || 0), 0).toLocaleString()}`,
                  color: '#dc2626'
                }
              ]
            : [
                { label: 'Total Payments', labelUrdu: 'کل واؤچرز', value: filteredPayments.length, color: '#2563eb' },
                {
                  label: 'Total Disbursed',
                  labelUrdu: 'کل ادائیگی',
                  value: `Rs. ${filteredPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0).toLocaleString()}`,
                  color: '#059669'
                }
              ]
        }
        columns={
          activeTab === 'purchases'
            ? [
                { key: 'purchaseNo', label: 'Purchase #', labelUrdu: 'نمبر', bold: true },
                {
                  key: 'date',
                  label: 'Date',
                  labelUrdu: 'تاریخ',
                  render: (r) => new Date(r.date || r.createdAt || Date.now()).toLocaleDateString('en-PK')
                },
                { key: 'supplierName', label: 'Supplier Name', labelUrdu: 'سپلائر' },
                {
                  key: 'vehicleNo',
                  label: 'Vehicle / Challan',
                  labelUrdu: 'گاڑی / چالان',
                  render: (r) => `${r.vehicleNo || '-'} / ${r.challanNo || '-'}`
                },
                {
                  key: 'items',
                  label: 'Items',
                  labelUrdu: 'آئٹمز',
                  render: (r) => `${(r.items || []).length} items`
                },
                {
                  key: 'grandTotal',
                  label: 'Grand Total',
                  labelUrdu: 'کل رقم',
                  align: 'right',
                  bold: true,
                  render: (r) => `Rs. ${Number(r.grandTotal || 0).toLocaleString()}`
                },
                {
                  key: 'paidAmount',
                  label: 'Paid',
                  labelUrdu: 'ادا شدہ',
                  align: 'right',
                  render: (r) => `Rs. ${Number(r.paidAmount || 0).toLocaleString()}`
                },
                {
                  key: 'balanceDue',
                  label: 'Balance',
                  labelUrdu: 'بقایا',
                  align: 'right',
                  bold: true,
                  render: (r) => `Rs. ${Number(r.balanceDue || 0).toLocaleString()}`
                },
                {
                  key: 'paymentStatus',
                  label: 'Status',
                  labelUrdu: 'حیثیت',
                  align: 'center',
                  render: (r) => (r.paymentStatus === 'PAID' ? 'مکمل ادا' : r.paymentStatus === 'PARTIAL' ? 'جزوی ادا' : 'غیر ادا شدہ')
                }
              ]
            : activeTab === 'suppliers'
            ? [
                { key: 'name', label: 'Supplier Name', labelUrdu: 'سپلائر نام', bold: true },
                { key: 'company', label: 'Company / Quarry', labelUrdu: 'کمپنی / کان' },
                { key: 'contactPerson', label: 'Contact Person', labelUrdu: 'رابطہ کار' },
                { key: 'phone', label: 'Phone', labelUrdu: 'فون نمبر' },
                {
                  key: 'totalPurchases',
                  label: 'Total Purchases',
                  labelUrdu: 'کل خریداری',
                  align: 'right',
                  render: (r) => `Rs. ${Number(r.totalPurchases || 0).toLocaleString()}`
                },
                {
                  key: 'totalPaid',
                  label: 'Total Paid',
                  labelUrdu: 'کل ادائیگی',
                  align: 'right',
                  render: (r) => `Rs. ${Number(r.totalPaid || 0).toLocaleString()}`
                },
                {
                  key: 'balancePayable',
                  label: 'Balance Payable',
                  labelUrdu: 'واجب الادا بقایا',
                  align: 'right',
                  bold: true,
                  render: (r) => `Rs. ${Number(r.balancePayable || 0).toLocaleString()}`
                }
              ]
            : [
                {
                  key: 'date',
                  label: 'Date',
                  labelUrdu: 'تاریخ',
                  render: (r) => new Date(r.date || r.createdAt || Date.now()).toLocaleDateString('en-PK')
                },
                { key: 'paymentNo', label: 'Voucher #', labelUrdu: 'واؤچر نمبر', bold: true },
                { key: 'supplierName', label: 'Supplier Name', labelUrdu: 'سپلائر نام' },
                { key: 'paymentMethod', label: 'Method', labelUrdu: 'طریقہ' },
                { key: 'referenceNo', label: 'Reference / Cheque', labelUrdu: 'ریفرنس' },
                {
                  key: 'amount',
                  label: 'Amount Paid',
                  labelUrdu: 'ادا رقم',
                  align: 'right',
                  bold: true,
                  render: (r) => `Rs. ${Number(r.amount || 0).toLocaleString()}`
                },
                { key: 'notes', label: 'Notes', labelUrdu: 'تفصیل' }
              ]
        }
        data={
          activeTab === 'purchases'
            ? filteredPurchases
            : activeTab === 'suppliers'
            ? filteredSuppliers
            : filteredPayments
        }
        summaryRows={
          activeTab === 'purchases'
            ? [
                {
                  label: 'Total Purchases',
                  labelUrdu: 'کل خریداری رقم',
                  value: `Rs. ${filteredPurchases.reduce((acc, p) => acc + (Number(p.grandTotal) || 0), 0).toLocaleString()}`
                },
                {
                  label: 'Total Balance Due',
                  labelUrdu: 'کل واجب الادا بقایا',
                  value: `Rs. ${filteredPurchases.reduce((acc, p) => acc + (Number(p.balanceDue) || 0), 0).toLocaleString()}`
                }
              ]
            : activeTab === 'suppliers'
            ? [
                {
                  label: 'Total Net Payable',
                  labelUrdu: 'کل واجب الادا بقایا جات',
                  value: `Rs. ${filteredSuppliers.reduce((acc, s) => acc + (Number(s.balancePayable) || 0), 0).toLocaleString()}`
                }
              ]
            : [
                {
                  label: 'Total Disbursed',
                  labelUrdu: 'کل ادا شدہ رقم',
                  value: `Rs. ${filteredPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0).toLocaleString()}`
                }
              ]
        }
      />
    </div>
  );
}
