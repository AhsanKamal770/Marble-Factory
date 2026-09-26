import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Calculator,
  Printer,
  Save,
  UserPlus,
  Search,
  Receipt,
  Layers,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { db, adjustItemStock } from '../db/index';
import DimensionCalculator from '../components/DimensionCalculator';
import ThermalReceiptModal from '../components/ThermalReceiptModal';
import Badge from '../components/Badge';

export default function BillingView({ setActiveView, settings }) {
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  // Customer selection
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isNewCustomerModal, setIsNewCustomerModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    phone: '',
    city: 'Karachi',
    customerType: 'Retail',
    address: ''
  });

  // Invoice Items
  const [lineItems, setLineItems] = useState([]);
  const [activeCalcItemIndex, setActiveCalcItemIndex] = useState(null);
  const [isCalcOpen, setIsCalcOpen] = useState(false);

  // Additional Charges & Totals
  const [carriageCharges, setCarriageCharges] = useState(0);
  const [labourCharges, setLabourCharges] = useState(0);
  const [polishCharges, setPolishCharges] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // Invoice completion & thermal print
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [isThermalOpen, setIsThermalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allItems = await db.items.toArray();
    const allCustomers = await db.customers.toArray();
    setItems(allItems);
    setCustomers(allCustomers);
  };

  // Add blank line item
  const handleAddLineItem = () => {
    if (items.length === 0) return;
    const defaultItem = items[0];
    setLineItems([
      ...lineItems,
      {
        itemId: defaultItem.id,
        code: defaultItem.code,
        name: defaultItem.name,
        category: defaultItem.category,
        dimensions: defaultItem.standardSize || '1 Slab',
        length: 4,
        width: 2.5,
        pieces: 10,
        boxes: 0,
        totalSqFt: 100,
        ratePerSqFt: defaultItem.ratePerSqFt || 200,
        amount: (100 * (defaultItem.ratePerSqFt || 200))
      }
    ]);
  };

  // Update item selection
  const handleItemSelect = (index, itemId) => {
    const selected = items.find((i) => i.id === parseInt(itemId, 10));
    if (!selected) return;

    const updated = [...lineItems];
    const sqft = updated[index].totalSqFt || 50;
    const rate = selected.ratePerSqFt || 200;

    updated[index] = {
      ...updated[index],
      itemId: selected.id,
      code: selected.code,
      name: selected.name,
      category: selected.category,
      ratePerSqFt: rate,
      amount: Math.round(sqft * rate)
    };
    setLineItems(updated);
  };

  // Open Dimension Calculator for specific row
  const handleOpenCalculator = (index) => {
    setActiveCalcItemIndex(index);
    setIsCalcOpen(true);
  };

  // Apply Dimension Calculator results
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

  // Update raw fields
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

  const handleRemoveLineItem = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Calculations
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

  // Quick Payment buttons
  const setQuickPaid = (ratio) => {
    setPaidAmount(Math.round(grandTotal * ratio));
  };

  // Save new customer modal
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerData.name) return;

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
    setNewCustomerData({ name: '', phone: '', city: 'Karachi', customerType: 'Retail', address: '' });
  };

  // Submit invoice
  const handleSaveInvoice = async () => {
    if (lineItems.length === 0) {
      setErrorMessage('Please add at least one marble or tile line item.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');

      const invoiceNo = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
      const customerName = selectedCustomer ? selectedCustomer.name : 'Walk-in Retail Customer';
      const customerPhone = selectedCustomer ? selectedCustomer.phone : '';

      const invoiceData = {
        invoiceNo,
        date: new Date().toISOString(),
        customerId: selectedCustomer ? selectedCustomer.id : null,
        customerName,
        customerPhone,
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
        thermalPrinted: true,
        createdAt: new Date().toISOString()
      };

      await db.transaction('rw', [db.invoices, db.items, db.customers, db.stock_movements, db.customer_payments], async () => {
        // Save invoice
        const invId = await db.invoices.add(invoiceData);

        // Deduct inventory stock for each line item
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

        // If registered customer, update customer balance & ledger
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

          // Record payment transaction if amount was paid
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
      setIsThermalOpen(true);

      // Reset form
      setLineItems([]);
      setSelectedCustomer(null);
      setCarriageCharges(0);
      setLabourCharges(0);
      setPolishCharges(0);
      setDiscountAmount(0);
      setPaidAmount(0);
      setInvoiceNotes('');
    } catch (err) {
      setErrorMessage(err.message || 'Error saving invoice');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {errorMessage && (
        <div style={{ padding: '12px 16px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '10px', color: '#fb7185', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} /> {errorMessage}
        </div>
      )}

      {/* Top Customer & Party Selection Card */}
      <div className="card" style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <label className="form-label">Select Customer / Account (Khata)</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                className="form-control"
                value={selectedCustomer ? selectedCustomer.id : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) setSelectedCustomer(null);
                  else setSelectedCustomer(customers.find((c) => c.id === parseInt(val, 10)) || null);
                }}
              >
                <option value="">Walk-in Retail Customer (Naqad / Cash)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) - {c.customerType} [Bal: Rs. {Number(c.balanceDue || 0).toLocaleString()}]
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsNewCustomerModal(true)}
                title="Add New Customer"
              >
                <UserPlus size={16} /> New
              </button>
            </div>
          </div>

          {/* Customer Summary Pill */}
          {selectedCustomer ? (
            <div style={{ display: 'flex', gap: '16px', background: '#0e131d', padding: '10px 18px', borderRadius: '10px', border: '1px solid #242f47', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Customer Balance</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: Number(selectedCustomer.balanceDue || 0) > 0 ? '#fb7185' : '#34d399' }} className="font-mono">
                  Rs. {Number(selectedCustomer.balanceDue || 0).toLocaleString()}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid #242f47', paddingLeft: '14px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                <div><strong>Type:</strong> {selectedCustomer.customerType}</div>
                <div><strong>Phone:</strong> {selectedCustomer.phone}</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', background: '#0e131d', padding: '10px 16px', borderRadius: '8px', border: '1px solid #242f47' }}>
              Standard Walk-in Cash Sale
            </div>
          )}
        </div>
      </div>

      {/* Line Items Table & Live Dimension Calculator Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Layers size={18} className="text-gold" /> Marble Slabs & Tiles Items
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Enter dimensions ($L \times W \times Pcs$) or use Box calculator to get accurate Sq. Ft.
            </p>
          </div>

          <button className="btn btn-primary btn-sm" onClick={handleAddLineItem}>
            <Plus size={15} /> Add Line Item
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Item Variety / Marble</th>
                <th style={{ width: '24%' }}>Dimensions & Sizing</th>
                <th style={{ width: '12%', textAlign: 'right' }}>Total Sq.Ft</th>
                <th style={{ width: '14%', textAlign: 'right' }}>Rate / Sq.Ft (Rs.)</th>
                <th style={{ width: '16%', textAlign: 'right' }}>Total Amount</th>
                <th style={{ width: '6%', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    No items in this invoice yet. Click <strong>"Add Line Item"</strong> above.
                  </td>
                </tr>
              ) : (
                lineItems.map((item, idx) => (
                  <tr key={idx}>
                    {/* Item selector */}
                    <td>
                      <select
                        className="form-control"
                        style={{ fontSize: '0.88rem' }}
                        value={item.itemId}
                        onChange={(e) => handleItemSelect(idx, e.target.value)}
                      >
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name} [{it.category}] - Avail: {it.stockSqFt} sqft
                          </option>
                        ))}
                      </select>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '3px' }}>
                        Stock in yard: {items.find(i => i.id === item.itemId)?.stockSqFt || 0} Sq.Ft
                      </div>
                    </td>

                    {/* Sizing & Calc Button */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="text"
                          className="form-control"
                          style={{ fontSize: '0.85rem' }}
                          value={item.dimensions}
                          onChange={(e) => handleUpdateLineField(idx, 'dimensions', e.target.value)}
                          placeholder="e.g. 5ft x 2.5ft (12 Pcs)"
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '8px 10px' }}
                          onClick={() => handleOpenCalculator(idx)}
                          title="Open Live Dimension Calculator"
                        >
                          <Calculator size={15} className="text-gold" />
                        </button>
                      </div>
                    </td>

                    {/* Total Sq.Ft */}
                    <td style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control font-mono"
                        style={{ textAlign: 'right', fontSize: '0.92rem', fontWeight: 700 }}
                        value={item.totalSqFt}
                        onChange={(e) => handleUpdateLineField(idx, 'totalSqFt', e.target.value)}
                      />
                    </td>

                    {/* Rate per Sq Ft */}
                    <td style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        step="1"
                        className="form-control font-mono"
                        style={{ textAlign: 'right', fontSize: '0.92rem' }}
                        value={item.ratePerSqFt}
                        onChange={(e) => handleUpdateLineField(idx, 'ratePerSqFt', e.target.value)}
                      />
                    </td>

                    {/* Total Amount */}
                    <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: 'var(--accent-blue)' }} className="font-mono">
                      Rs. {Number(item.amount || 0).toLocaleString()}
                    </td>

                    {/* Delete */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#fb7185' }}
                        onClick={() => handleRemoveLineItem(idx)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill Settlement Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Additional Charges & Details */}
        <div className="card">
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '14px' }}>
            Carriage, Labour & Additional Charges
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Carriage / Transport (Rs.)</label>
              <input
                type="number"
                min="0"
                className="form-control font-mono"
                value={carriageCharges}
                onChange={(e) => setCarriageCharges(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Labour / Loading (Rs.)</label>
              <input
                type="number"
                min="0"
                className="form-control font-mono"
                value={labourCharges}
                onChange={(e) => setLabourCharges(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Polishing / Edge Cutting (Rs.)</label>
              <input
                type="number"
                min="0"
                className="form-control font-mono"
                value={polishCharges}
                onChange={(e) => setPolishCharges(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Special Discount (Rs.)</label>
              <input
                type="number"
                min="0"
                className="form-control font-mono"
                style={{ color: '#fb7185' }}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '6px' }}>
            <label className="form-label">Delivery Site / Truck # / Bill Notes</label>
            <textarea
              className="form-control"
              rows={2}
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
              placeholder="e.g. Delivered to Site Block 13-D via Suzuki pickup..."
            />
          </div>
        </div>

        {/* Grand Total & Payment Split */}
        <div className="card" style={{ border: '2px solid var(--accent-blue)' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
            Payment & Settlement (80mm Slip)
          </h4>

          {/* Subtotal breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Items Subtotal:</span>
              <strong className="font-mono text-accent">Rs. {subtotal.toLocaleString()}</strong>
            </div>
            {extraCharges > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Carriage + Labour + Polish:</span>
                <span className="font-mono">+ Rs. {extraCharges.toLocaleString()}</span>
              </div>
            )}
            {totalDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fb7185' }}>
                <span>Discount:</span>
                <span className="font-mono">- Rs. {totalDiscount.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Grand Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>GRAND TOTAL:</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-blue)' }} className="font-mono">
              Rs. {grandTotal.toLocaleString()}
            </span>
          </div>

          {/* Paid Amount Input */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ margin: 0 }}>Amount Paid Now (Rs.)</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQuickPaid(1)}>
                  Full Paid
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQuickPaid(0.5)}>
                  50% Paid
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQuickPaid(0)}>
                  Credit
                </button>
              </div>
            </div>
            <input
              type="number"
              min="0"
              className="form-control font-mono"
              style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399' }}
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
            />
          </div>

          {/* Payment Method */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label className="form-label">Payment Method</label>
              <select className="form-control" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="Cash">Cash (Naqad)</option>
                <option value="Bank Transfer">Bank Transfer / IBFT</option>
                <option value="Cheque">Cheque</option>
                <option value="JazzCash / Online">JazzCash / Online</option>
              </select>
            </div>
            <div>
              <label className="form-label">Status Result</label>
              <div style={{ marginTop: '6px' }}>
                <Badge status={paymentStatus} />
              </div>
            </div>
          </div>

          {/* Balance Due Display */}
          <div style={{
            padding: '12px',
            background: '#0e131d',
            border: '1px solid #242f47',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>Remaining Due (Udhaar):</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: balanceDue > 0 ? '#fb7185' : '#34d399' }} className="font-mono">
              Rs. {balanceDue.toLocaleString()}
            </span>
          </div>

          {/* Save & Print Button */}
          <button
            type="button"
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            onClick={handleSaveInvoice}
            disabled={isSaving || lineItems.length === 0}
          >
            <Printer size={18} />
            {isSaving ? 'Processing Bill...' : 'Save & Print 80mm Receipt'}
          </button>
        </div>
      </div>

      {/* Dimension Calculator Modal */}
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

      {/* Thermal Receipt Preview Modal */}
      {isThermalOpen && createdInvoice && (
        <ThermalReceiptModal
          isOpen={isThermalOpen}
          onClose={() => setIsThermalOpen(false)}
          invoice={createdInvoice}
          settings={settings}
          customer={selectedCustomer}
        />
      )}

      {/* Add New Customer Quick Modal */}
      {isNewCustomerModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>Quick Add New Customer</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsNewCustomerModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateCustomer}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Customer / Party Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={newCustomerData.name}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                    placeholder="e.g. Tariq Builders or Haji Irfan"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone / Mobile #</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newCustomerData.phone}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                    placeholder="0300-1234567"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Customer Type</label>
                  <select
                    className="form-control"
                    value={newCustomerData.customerType}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, customerType: e.target.value })}
                  >
                    <option value="Retail">Retail Walk-in</option>
                    <option value="Contractor">Contractor / Thekedar</option>
                    <option value="Builder">Builder / Developer</option>
                    <option value="Architect">Architect / Designer</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Site / Delivery Address</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newCustomerData.address}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                    placeholder="e.g. DHA Phase 6"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsNewCustomerModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save & Select</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
