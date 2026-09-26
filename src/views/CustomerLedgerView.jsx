import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  DollarSign,
  FileText,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Calendar,
  CreditCard,
  Building,
  UserCheck
} from 'lucide-react';
import { db } from '../db/index';
import Badge from '../components/Badge';
import PaymentCollectionModal from '../components/PaymentCollectionModal';

export default function CustomerLedgerView() {
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');
  
  // Selected Customer for Ledger details drawer/modal
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    cnic: '',
    address: '',
    city: 'Karachi',
    customerType: 'Retail',
    creditLimit: 500000,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allCust = await db.customers.toArray();
    const allInv = await db.invoices.toArray();
    const allPay = await db.customer_payments.toArray();
    
    setCustomers(allCust);
    setInvoices(allInv);
    setPayments(allPay);
    if (activeCustomer) {
      const refreshed = allCust.find(c => c.id === activeCustomer.id);
      setActiveCustomer(refreshed || null);
    }
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      cnic: '',
      address: '',
      city: 'Karachi',
      customerType: 'Retail',
      creditLimit: 500000,
      notes: ''
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCustomer(c);
    setFormData({ ...c });
    setIsAddModalOpen(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await db.customers.update(editingCustomer.id, {
          ...formData,
          creditLimit: parseFloat(formData.creditLimit) || 0,
          updatedAt: new Date().toISOString()
        });
      } else {
        await db.customers.add({
          ...formData,
          totalBilled: 0,
          totalPaid: 0,
          balanceDue: 0,
          creditLimit: parseFloat(formData.creditLimit) || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      setIsAddModalOpen(false);
      loadData();
    } catch (err) {
      alert('Error saving customer: ' + err.message);
    }
  };

  const handleReceivePayment = (c) => {
    setActiveCustomer(c);
    setIsPaymentModalOpen(true);
  };

  // Customer transactions (Invoices + Payments combined)
  const getCustomerTransactions = (customerId) => {
    const custInvoices = invoices.filter(i => i.customerId === customerId).map(i => ({
      type: 'INVOICE',
      date: i.date || i.createdAt,
      refNo: i.invoiceNo,
      description: `Marble & Tile Sale (${i.items?.length || 0} items)`,
      debit: Number(i.grandTotal || 0), // Increases customer debt
      credit: Number(i.paidAmount || 0), // Paid on spot
      balance: Number(i.balanceDue || 0),
      raw: i
    }));

    const custPayments = payments.filter(p => p.customerId === customerId).map(p => ({
      type: 'PAYMENT',
      date: p.date || p.createdAt,
      refNo: p.paymentNo,
      description: `Khata Payment (${p.paymentMethod}) - ${p.notes || ''}`,
      debit: 0,
      credit: Number(p.amount || 0), // Reduces customer debt
      balance: 0,
      raw: p
    }));

    return [...custInvoices, ...custPayments].sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm) ||
      c.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnic?.includes(searchTerm);

    if (!matchesSearch) return false;
    if (selectedTypeFilter === 'ALL') return true;
    return c.customerType === selectedTypeFilter;
  });

  const totalUdhaar = customers.reduce((acc, c) => acc + (Number(c.balanceDue) || 0), 0);
  const totalBilledAll = customers.reduce((acc, c) => acc + (Number(c.totalBilled) || 0), 0);
  const totalRecoveredAll = customers.reduce((acc, c) => acc + (Number(c.totalPaid) || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 3 Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="card">
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
            Total Customer Receivables (Udhaar)
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: totalUdhaar > 0 ? '#fb7185' : '#34d399', marginTop: '4px' }} className="font-mono">
            Rs. {totalUdhaar.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>
            Pending balance from registered accounts
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
            Total Billed to Accounts
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '4px' }} className="font-mono">
            Rs. {totalBilledAll.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Builders, Contractors & Retail ledger
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
            Total Recovered (Wasooli)
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }} className="font-mono">
            Rs. {totalRecoveredAll.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>
            Paid amounts recorded in ledger
          </div>
        </div>
      </div>

      {/* Top Search & Filter Bar */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              className="input-search"
              style={{ paddingLeft: '36px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search retail or contractor by Name, Mobile #, CNIC, City..."
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {['ALL', 'Retail', 'Contractor', 'Builder', 'Architect'].map((type) => (
              <button
                key={type}
                type="button"
                className={`btn btn-sm ${selectedTypeFilter === type ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedTypeFilter(type)}
              >
                {type === 'ALL' ? 'All Customers' : type}
              </button>
            ))}
            <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
              <Plus size={15} /> Add Customer
            </button>
          </div>
        </div>
      </div>

      {/* Main Customers Ledger Split View */}
      <div style={{ display: 'grid', gridTemplateColumns: activeCustomer ? '1.2fr 1fr' : '1fr', gap: '20px' }}>
        {/* Customer Directory Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Users size={18} className="text-gold" /> Customer Accounts Directory ({filteredCustomers.length})
            </h3>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer Name & Type</th>
                  <th>Contact Info</th>
                  <th>Total Billed</th>
                  <th>Total Paid</th>
                  <th>Balance Due (Udhaar)</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      No customers match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => {
                    const hasDue = Number(cust.balanceDue || 0) > 0;
                    const isSelected = activeCustomer?.id === cust.id;
                    return (
                      <tr
                        key={cust.id}
                        style={{
                          background: isSelected ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                          cursor: 'pointer'
                        }}
                        onClick={() => setActiveCustomer(cust)}
                      >
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{cust.name}</div>
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: cust.customerType === 'Builder' ? 'rgba(37, 99, 235, 0.12)' :
                                       cust.customerType === 'Contractor' ? 'rgba(2, 132, 199, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                            color: cust.customerType === 'Builder' ? '#2563eb' :
                                   cust.customerType === 'Contractor' ? '#0284c7' : '#059669',
                            fontWeight: 700
                          }}>
                            {cust.customerType}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          <div>{cust.phone || '-'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cust.city || 'Karachi'}</div>
                        </td>
                        <td className="font-mono" style={{ fontWeight: 600 }}>
                          Rs. {Number(cust.totalBilled || 0).toLocaleString()}
                        </td>
                        <td className="font-mono text-emerald" style={{ fontWeight: 600 }}>
                          Rs. {Number(cust.totalPaid || 0).toLocaleString()}
                        </td>
                        <td>
                          <span className="font-mono" style={{ fontSize: '1rem', fontWeight: 800, color: hasDue ? '#e11d48' : '#059669' }}>
                            Rs. {Number(cust.balanceDue || 0).toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              className="btn btn-emerald btn-sm"
                              onClick={() => handleReceivePayment(cust)}
                              title="Receive Payment / Wasooli"
                            >
                              <DollarSign size={13} /> Settle
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenEdit(cust)}
                              title="Edit Customer Info"
                            >
                              Edit
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
        </div>

        {/* Customer Ledger History Drawer */}
        {activeCustomer && (
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title text-accent">
                  <UserCheck size={18} /> {activeCustomer.name} (Khata)
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {activeCustomer.customerType} • Ph: {activeCustomer.phone}
                </p>
              </div>

              <button className="btn btn-emerald btn-sm" onClick={() => handleReceivePayment(activeCustomer)}>
                <DollarSign size={14} /> Receive Payment
              </button>
            </div>

            {/* Khata Balance Snapshot */}
            <div style={{
              padding: '14px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '10px',
              marginBottom: '16px'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Billed</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }} className="font-mono">
                  Rs. {Number(activeCustomer.totalBilled || 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Paid</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#059669' }} className="font-mono">
                  Rs. {Number(activeCustomer.totalPaid || 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Balance Due</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: Number(activeCustomer.balanceDue) > 0 ? '#e11d48' : '#059669' }} className="font-mono">
                  Rs. {Number(activeCustomer.balanceDue || 0).toLocaleString()}
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
              Transaction & Invoices Statement
            </h4>

            <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {getCustomerTransactions(activeCustomer.id).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                  No transaction history yet for this account.
                </div>
              ) : (
                getCustomerTransactions(activeCustomer.id).map((t, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 14px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '3px',
                          background: t.type === 'INVOICE' ? 'rgba(37, 99, 235, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                          color: t.type === 'INVOICE' ? '#2563eb' : '#059669'
                        }}>
                          {t.type}
                        </span>
                        <span className="font-mono" style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                          {t.refNo}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {new Date(t.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} • {t.description}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      {t.type === 'INVOICE' ? (
                        <div>
                          <div className="font-mono text-accent" style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                            Rs. {t.debit.toLocaleString()}
                          </div>
                          {t.credit > 0 && (
                            <div style={{ fontSize: '0.72rem', color: '#059669' }}>
                              Paid: Rs. {t.credit.toLocaleString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="font-mono text-emerald" style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                          + Rs. {t.credit.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Payment Wasooli Modal */}
      {isPaymentModalOpen && activeCustomer && (
        <PaymentCollectionModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          customer={activeCustomer}
          onSuccess={loadData}
        />
      )}

      {/* Add / Edit Customer Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                {editingCustomer ? 'Edit Customer Info' : 'Add New Customer / Account'}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsAddModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveCustomer}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Customer / Party Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Haji Abdul Ghaffar or Tariq Builders"
                    autoFocus
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Phone / Mobile # *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0300-1234567"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Category</label>
                    <select
                      className="form-control"
                      value={formData.customerType}
                      onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                    >
                      <option value="Retail">Retail Walk-in Customer</option>
                      <option value="Contractor">Contractor / Thekedar</option>
                      <option value="Builder">Builder / Developer</option>
                      <option value="Architect">Architect / Interior Designer</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">CNIC / NTN</label>
                    <input
                      type="text"
                      className="form-control font-mono"
                      value={formData.cnic}
                      onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                      placeholder="42101-1234567-1"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Karachi"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Site / Delivery Address</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. Plot 12, Scheme 33"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. Regular commercial customer..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
