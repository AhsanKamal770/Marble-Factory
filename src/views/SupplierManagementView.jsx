import React, { useState, useEffect } from 'react';
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
  X,
  Boxes
} from 'lucide-react';
import { db, adjustItemStock } from '../db/index';
import Badge from '../components/Badge';

export default function SupplierManagementView() {
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [items, setItems] = useState([]);

  const [activeTab, setActiveTab] = useState('purchases'); // 'purchases' | 'suppliers'
  const [searchTerm, setSearchTerm] = useState('');

  // New Inward Purchase Modal
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [challanNo, setChallanNo] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [freightCharges, setFreightCharges] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState('Bank Transfer');
  const [purchaseNotes, setPurchaseNotes] = useState('');

  // Add Supplier Modal
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
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

  // Supplier Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeSupplierForPayment, setActiveSupplierForPayment] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Bank Transfer');
  const [payRef, setPayRef] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allSuppliers = await db.suppliers.toArray();
    const allPurchases = await db.supplier_purchases.toArray();
    const allItems = await db.items.toArray();

    setSuppliers(allSuppliers);
    setPurchases(allPurchases.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)));
    setItems(allItems);
  };

  const handleOpenNewPurchase = () => {
    if (suppliers.length === 0) {
      alert('Please add at least one supplier first.');
      return;
    }
    setSelectedSupplierId(suppliers[0].id.toString());
    setChallanNo(`CH-${Date.now().toString().slice(-4)}`);
    setVehicleNo('TK-');
    setFreightCharges(0);
    setPaidAmount(0);
    setPurchaseNotes('');

    if (items.length > 0) {
      setPurchaseItems([
        {
          itemId: items[0].id,
          name: items[0].name,
          category: items[0].category,
          totalSqFt: 1000,
          ratePerSqFt: items[0].costPerSqFt || 200,
          amount: 1000 * (items[0].costPerSqFt || 200)
        }
      ]);
    } else {
      setPurchaseItems([]);
    }
    setIsPurchaseModalOpen(true);
  };

  const handleAddPurchaseItem = () => {
    if (items.length === 0) return;
    const it = items[0];
    setPurchaseItems([
      ...purchaseItems,
      {
        itemId: it.id,
        name: it.name,
        category: it.category,
        totalSqFt: 500,
        ratePerSqFt: it.costPerSqFt || 200,
        amount: 500 * (it.costPerSqFt || 200)
      }
    ]);
  };

  const handleUpdatePurchaseItem = (index, field, value) => {
    const updated = [...purchaseItems];
    const row = { ...updated[index], [field]: value };

    if (field === 'itemId') {
      const found = items.find(i => i.id === parseInt(value, 10));
      if (found) {
        row.name = found.name;
        row.category = found.category;
        row.ratePerSqFt = found.costPerSqFt || row.ratePerSqFt;
      }
    }

    const sqft = parseFloat(field === 'totalSqFt' ? value : row.totalSqFt) || 0;
    const rate = parseFloat(field === 'ratePerSqFt' ? value : row.ratePerSqFt) || 0;
    row.amount = Math.round(sqft * rate);

    updated[index] = row;
    setPurchaseItems(updated);
  };

  const handleRemovePurchaseItem = (index) => {
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

    const sup = suppliers.find(s => s.id === parseInt(selectedSupplierId, 10));
    if (!sup) return;

    try {
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

        // Add stock to yard inventory
        for (const it of purchaseItems) {
          if (it.itemId) {
            await adjustItemStock(
              it.itemId,
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

      setIsPurchaseModalOpen(false);
      loadData();
    } catch (err) {
      alert('Error recording purchase: ' + err.message);
    }
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    try {
      await db.suppliers.add({
        ...supplierFormData,
        totalPurchased: 0,
        totalPaid: 0,
        balancePayable: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setIsAddSupplierModalOpen(false);
      loadData();
    } catch (err) {
      alert('Error saving supplier: ' + err.message);
    }
  };

  const handleRecordSupplierPayment = async (e) => {
    e.preventDefault();
    if (!activeSupplierForPayment || !payAmount) return;

    const amountNum = parseFloat(payAmount);
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
          notes: `Payment to supplier ${activeSupplierForPayment.name}`,
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
      loadData();
    } catch (err) {
      alert('Error recording payment: ' + err.message);
    }
  };

  const totalPayable = suppliers.reduce((acc, s) => acc + (Number(s.balancePayable) || 0), 0);
  const totalPurchasesAll = suppliers.reduce((acc, s) => acc + (Number(s.totalPurchased) || 0), 0);
  const totalPaidToSuppliers = suppliers.reduce((acc, s) => acc + (Number(s.totalPaid) || 0), 0);

  const filteredPurchases = purchases.filter((p) =>
    p.purchaseNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.challanNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.vehicleNo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter((s) =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone?.includes(searchTerm)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="card">
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
            Total Supplier Payables (Dena Baqi)
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: totalPayable > 0 ? '#fb7185' : '#34d399', marginTop: '4px' }} className="font-mono">
            Rs. {totalPayable.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>
            Outstanding balance to quarries & distributors
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
            Total Raw Stock Purchases
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '4px' }} className="font-mono">
            Rs. {totalPurchasesAll.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Inward marble blocks, slabs & tile containers
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
            Total Paid to Suppliers
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }} className="font-mono">
            Rs. {totalPaidToSuppliers.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>
            Payments dispatched via bank/cash
          </div>
        </div>
      </div>

      {/* Action Header & Tabs */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`btn ${activeTab === 'purchases' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('purchases')}
            >
              <Truck size={16} /> Inward Stock Shipments ({purchases.length})
            </button>
            <button
              type="button"
              className={`btn ${activeTab === 'suppliers' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('suppliers')}
            >
              <Building size={16} /> Supplier Directory & Khata ({suppliers.length})
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                className="input-search"
                style={{ paddingLeft: '34px', fontSize: '0.88rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search supplier, truck #, challan..."
              />
            </div>

            <button className="btn btn-secondary btn-sm" onClick={() => setIsAddSupplierModalOpen(true)}>
              <Plus size={15} /> Add Supplier
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleOpenNewPurchase}>
              <PackagePlus size={15} /> New Inward Shipment
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Inward Purchases List */}
      {activeTab === 'purchases' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Truck size={18} className="text-gold" /> Inward Stock Purchase Records ({filteredPurchases.length})
            </h3>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Purchase #</th>
                  <th>Date</th>
                  <th>Supplier / Quarry</th>
                  <th>Challan & Truck #</th>
                  <th>Items / Slabs Received</th>
                  <th>Total Amount</th>
                  <th>Paid Amount</th>
                  <th>Balance Payable</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      No inward shipment purchases recorded yet. Click "New Inward Shipment" to record incoming stock.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((pur) => (
                    <tr key={pur.id}>
                      <td className="font-mono text-gold" style={{ fontWeight: 700 }}>
                        {pur.purchaseNo}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                        {new Date(pur.date || pur.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ fontWeight: 700 }}>{pur.supplierName}</td>
                      <td style={{ fontSize: '0.85rem' }}>
                        <div className="font-mono" style={{ color: '#cbd5e1' }}>Challan: {pur.challanNo}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{pur.vehicleNo}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {pur.items?.map((it, idx) => (
                          <div key={idx}>
                            {it.name} ({it.totalSqFt} sqft)
                          </div>
                        ))}
                      </td>
                      <td className="font-mono" style={{ fontWeight: 800 }}>
                        Rs. {Number(pur.grandTotal || 0).toLocaleString()}
                      </td>
                      <td className="font-mono text-emerald" style={{ fontWeight: 600 }}>
                        Rs. {Number(pur.paidAmount || 0).toLocaleString()}
                      </td>
                      <td className="font-mono text-rose" style={{ fontWeight: 700 }}>
                        Rs. {Number(pur.balanceDue || 0).toLocaleString()}
                      </td>
                      <td>
                        <Badge status={pur.paymentStatus} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Supplier Directory & Ledgers */}
      {activeTab === 'suppliers' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Building size={18} className="text-gold" /> Supplier Accounts & Quarry Directory
            </h3>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Supplier / Quarry Name</th>
                  <th>Company & Location</th>
                  <th>Contact Person & Phone</th>
                  <th>Total Purchases</th>
                  <th>Total Paid</th>
                  <th>Balance Payable (Khata)</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700, color: '#fff' }}>{s.name}</td>
                    <td>
                      <div>{s.company}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{s.city}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      <div>{s.contactPerson}</div>
                      <div style={{ color: '#94a3b8' }}>{s.phone}</div>
                    </td>
                    <td className="font-mono" style={{ fontWeight: 600 }}>
                      Rs. {Number(s.totalPurchased || 0).toLocaleString()}
                    </td>
                    <td className="font-mono text-emerald" style={{ fontWeight: 600 }}>
                      Rs. {Number(s.totalPaid || 0).toLocaleString()}
                    </td>
                    <td>
                      <span className="font-mono" style={{ fontSize: '1rem', fontWeight: 800, color: Number(s.balancePayable) > 0 ? '#fb7185' : '#34d399' }}>
                        Rs. {Number(s.balancePayable || 0).toLocaleString()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-emerald btn-sm"
                        onClick={() => {
                          setActiveSupplierForPayment(s);
                          setPayAmount('');
                          setPayRef('');
                          setIsPaymentModalOpen(true);
                        }}
                      >
                        <DollarSign size={13} /> Pay Supplier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Inward Purchase Modal */}
      {isPurchaseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                Record Inward Stock Shipment (Stock Intake)
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsPurchaseModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePurchase}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Supplier / Quarry *</label>
                    <select
                      className="form-control"
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                    >
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.company})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Challan / Bilty # *</label>
                    <input
                      type="text"
                      required
                      className="form-control font-mono"
                      value={challanNo}
                      onChange={(e) => setChallanNo(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Truck / Vehicle # *</label>
                    <input
                      type="text"
                      required
                      className="form-control font-mono"
                      value={vehicleNo}
                      onChange={(e) => setVehicleNo(e.target.value)}
                      placeholder="e.g. TK-9022"
                    />
                  </div>
                </div>

                {/* Incoming Items */}
                <div style={{ margin: '14px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ margin: 0 }}>Stock Items Received into Yard</label>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddPurchaseItem}>
                      <Plus size={14} /> Add Item
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {purchaseItems.map((it, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr auto', gap: '8px', alignItems: 'center', background: '#0e131d', padding: '8px', borderRadius: '8px' }}>
                        <select
                          className="form-control"
                          value={it.itemId}
                          onChange={(e) => handleUpdatePurchaseItem(idx, 'itemId', e.target.value)}
                        >
                          {items.map(i => (
                            <option key={i.id} value={i.id}>{i.name} [{i.category}]</option>
                          ))}
                        </select>

                        <input
                          type="number"
                          step="0.1"
                          placeholder="Sq.Ft"
                          className="form-control font-mono"
                          value={it.totalSqFt}
                          onChange={(e) => handleUpdatePurchaseItem(idx, 'totalSqFt', e.target.value)}
                        />

                        <input
                          type="number"
                          placeholder="Rate/SqFt"
                          className="form-control font-mono"
                          value={it.ratePerSqFt}
                          onChange={(e) => handleUpdatePurchaseItem(idx, 'ratePerSqFt', e.target.value)}
                        />

                        <div className="font-mono text-accent" style={{ fontWeight: 700, textAlign: 'right' }}>
                          Rs. {Number(it.amount || 0).toLocaleString()}
                        </div>

                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#fb7185' }}
                          onClick={() => handleRemovePurchaseItem(idx)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Freight & Payment */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Freight / Truck Fare (Rs.)</label>
                    <input
                      type="number"
                      className="form-control font-mono"
                      value={freightCharges}
                      onChange={(e) => setFreightCharges(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount Paid Now (Rs.)</label>
                    <input
                      type="number"
                      className="form-control font-mono"
                      style={{ color: '#059669', fontWeight: 700 }}
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select
                      className="form-control"
                      value={purchasePaymentMethod}
                      onChange={(e) => setPurchasePaymentMethod(e.target.value)}
                    >
                      <option value="Bank Transfer">Bank Transfer / IBFT</option>
                      <option value="Cash">Cash (Naqad)</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                {/* Totals Banner */}
                <div style={{ padding: '14px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Grand Total Purchase:</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-blue)' }} className="font-mono">
                      Rs. {purchaseGrandTotal.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Balance Payable to Supplier:</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: purchaseBalanceDue > 0 ? '#fb7185' : '#34d399' }} className="font-mono">
                      Rs. {purchaseBalanceDue.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <Badge status={purchaseStatus} />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsPurchaseModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Receive Stock & Update Inventory</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isAddSupplierModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>Add New Marble Supplier / Quarry</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsAddSupplierModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveSupplier}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Supplier / Quarry Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={supplierFormData.name}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                    placeholder="e.g. Balochistan Mining Corp"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Contact Person</label>
                    <input
                      type="text"
                      className="form-control"
                      value={supplierFormData.contactPerson}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, contactPerson: e.target.value })}
                      placeholder="e.g. Mir Khan"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone # *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={supplierFormData.phone}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                      placeholder="0300-1234567"
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Company / Quarry</label>
                    <input
                      type="text"
                      className="form-control"
                      value={supplierFormData.company}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, company: e.target.value })}
                      placeholder="e.g. Ziarat Quarry Hub"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City / Location</label>
                    <input
                      type="text"
                      className="form-control"
                      value={supplierFormData.city}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, city: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddSupplierModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Payment Modal */}
      {isPaymentModalOpen && activeSupplierForPayment && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                Record Payment to {activeSupplierForPayment.name}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsPaymentModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleRecordSupplierPayment}>
              <div className="modal-body">
                <div style={{ padding: '12px', background: '#0e131d', border: '1px solid #242f47', borderRadius: '8px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Total Balance Payable to Supplier:</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fb7185' }} className="font-mono">
                    Rs. {Number(activeSupplierForPayment.balancePayable || 0).toLocaleString()}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Amount (Rs.) *</label>
                  <input
                    type="number"
                    required
                    className="form-control font-mono"
                    style={{ color: '#34d399', fontSize: '1.2rem', fontWeight: 700 }}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="Enter amount..."
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
                  <select className="form-control" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                    <option value="Bank Transfer">Bank Transfer / IBFT</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Cheque / Bank Reference #</label>
                  <input
                    type="text"
                    className="form-control"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="e.g. Online Transfer Ref # 99482"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsPaymentModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-emerald">Confirm Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
