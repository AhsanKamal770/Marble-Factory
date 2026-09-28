import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Heart, Plus, Pencil, Trash2, CheckCircle, RotateCcw, Printer, X } from 'lucide-react';
import { db } from '../../db';
import { useLanguage } from '../../context/LanguageContext';

const MAX_BENEFICIARIES = 4;
const METHODS = ['Cash', 'EasyPaisa', 'Bank'];

const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
};
const currentMonthKey = () => new Date().toISOString().slice(0, 7);
const rs = (n) => 'Rs. ' + Number(n || 0).toLocaleString();

const emptyForm = { name: '', cnic: '', phone: '', monthlyAmount: '', notes: '' };

export default function ZakatManagementView() {
  const { language } = useLanguage();
  const tr = (en, ur) => (language === 'ur' ? ur : en);

  const [tab, setTab] = useState('log'); // log | directory | audit
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [auditYear, setAuditYear] = useState(new Date().getFullYear());
  const [methodByBen, setMethodByBen] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const beneficiaries = useLiveQuery(() => db.zakat_beneficiaries.toArray(), []) || [];
  const records = useLiveQuery(() => db.zakat_records.toArray(), []) || [];

  const monthRecords = records.filter((r) => r.monthKey === monthKey);
  const recordFor = (benId) => monthRecords.find((r) => r.beneficiaryId === benId);

  const monthTotalDue = beneficiaries.reduce((s, b) => s + Number(b.monthlyAmount || 0), 0);
  const monthTotalPaid = monthRecords.reduce((s, r) => s + Number(r.amount || 0), 0);

  // ---------- Beneficiary CRUD ----------
  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };
  const openEdit = (b) => {
    setEditingId(b.id);
    setForm({
      name: b.name || '',
      cnic: b.cnic || '',
      phone: b.phone || '',
      monthlyAmount: b.monthlyAmount || '',
      notes: b.notes || ''
    });
    setError('');
    setModalOpen(true);
  };
  const saveBeneficiary = async (e) => {
    e.preventDefault();
    const amount = parseFloat(form.monthlyAmount);
    if (!form.name.trim()) return setError(tr('Name is required.', 'نام درج کریں۔'));
    if (!amount || amount <= 0) return setError(tr('Enter a valid monthly amount.', 'ماہانہ رقم درست درج کریں۔'));
    const data = {
      name: form.name.trim(),
      cnic: form.cnic.trim(),
      phone: form.phone.trim(),
      monthlyAmount: amount,
      notes: form.notes.trim()
    };
    if (editingId) await db.zakat_beneficiaries.update(editingId, data);
    else await db.zakat_beneficiaries.add({ ...data, createdAt: new Date().toISOString() });
    setModalOpen(false);
  };
  const deleteBeneficiary = async (b) => {
    if (!window.confirm(tr(`Remove ${b.name} from the list? Past payments stay in the audit.`, `${b.name} کو فہرست سے ہٹائیں؟ پرانی ادائیگیاں آڈٹ میں رہیں گی۔`))) return;
    await db.zakat_beneficiaries.delete(b.id);
  };

  // ---------- Disbursement ----------
  const markPaid = async (b) => {
    if (recordFor(b.id)) return;
    await db.zakat_records.add({
      beneficiaryId: b.id,
      beneficiaryName: b.name,
      amount: Number(b.monthlyAmount),
      monthYear: monthLabel(monthKey),
      monthKey,
      status: 'Disbursed',
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: methodByBen[b.id] || 'Cash'
    });
  };
  const undoPaid = async (rec) => {
    if (!window.confirm(tr('Undo this payment?', 'یہ ادائیگی منسوخ کریں؟'))) return;
    await db.zakat_records.delete(rec.id);
  };

  // ---------- Annual audit ----------
  const yearRecords = records.filter((r) => (r.monthKey || '').startsWith(String(auditYear)));
  const yearTotal = yearRecords.reduce((s, r) => s + Number(r.amount || 0), 0);
  const perBeneficiary = {};
  yearRecords.forEach((r) => {
    const k = r.beneficiaryName;
    perBeneficiary[k] = perBeneficiary[k] || { total: 0, months: 0 };
    perBeneficiary[k].total += Number(r.amount || 0);
    perBeneficiary[k].months += 1;
  });
  const perMonth = Array.from({ length: 12 }, (_, i) => {
    const key = `${auditYear}-${String(i + 1).padStart(2, '0')}`;
    const recs = yearRecords.filter((r) => r.monthKey === key);
    return { key, total: recs.reduce((s, r) => s + Number(r.amount || 0), 0), count: recs.length };
  });

  const tabBtn = (id, label) => (
    <button
      key={id}
      type="button"
      className={`btn btn-sm ${tab === id ? 'btn-primary' : 'btn-secondary'}`}
      onClick={() => setTab(id)}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
      {/* Top bar */}
      <div className="card no-print" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {tabBtn('log', tr('Monthly Disbursement', 'ماہانہ ادائیگی'))}
          {tabBtn('directory', tr('Beneficiaries', 'مستحقین کی فہرست'))}
          {tabBtn('audit', tr('Annual Audit', 'سالانہ آڈٹ'))}
        </div>
        {tab === 'log' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label className="form-label" style={{ margin: 0 }}>{tr('Month', 'مہینہ')}</label>
            <input type="month" className="form-control" value={monthKey} onChange={(e) => e.target.value && setMonthKey(e.target.value)} />
          </div>
        )}
        {tab === 'directory' && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={openAdd}
            disabled={beneficiaries.length >= MAX_BENEFICIARIES}
            title={beneficiaries.length >= MAX_BENEFICIARIES ? tr('Maximum 4 beneficiaries', 'زیادہ سے زیادہ 4 مستحقین') : ''}
          >
            <Plus size={15} /> {tr('Add Beneficiary', 'مستحق شامل کریں')}
          </button>
        )}
        {tab === 'audit' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number"
              className="form-control"
              style={{ width: '100px' }}
              value={auditYear}
              onChange={(e) => setAuditYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
            />
            <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
              <Printer size={15} /> {tr('Print', 'پرنٹ')}
            </button>
          </div>
        )}
      </div>

      {/* MONTHLY LOG */}
      {tab === 'log' && (
        <>
          <div className="card" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              <Heart size={15} style={{ verticalAlign: 'middle', marginRight: '6px', color: '#e11d48' }} />
              {monthLabel(monthKey)}
            </span>
            <span className="font-mono" style={{ fontWeight: 700 }}>
              {tr('Paid', 'ادا شدہ')}: {rs(monthTotalPaid)} / {rs(monthTotalDue)}
            </span>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{tr('Beneficiary', 'مستحق')}</th>
                    <th>{tr('Monthly Amount', 'ماہانہ رقم')}</th>
                    <th>{tr('Payment Mode', 'ادائیگی کا طریقہ')}</th>
                    <th>{tr('Status', 'کیفیت')}</th>
                    <th>{tr('Date', 'تاریخ')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {beneficiaries.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}>
                        {tr('No beneficiaries yet. Add them in the Beneficiaries tab.', 'ابھی کوئی مستحق نہیں۔ "مستحقین کی فہرست" ٹیب میں شامل کریں۔')}
                      </td>
                    </tr>
                  )}
                  {beneficiaries.map((b) => {
                    const rec = recordFor(b.id);
                    return (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 600 }}>{b.name}</td>
                        <td className="font-mono">{rs(b.monthlyAmount)}</td>
                        <td>
                          {rec ? (
                            rec.paymentMethod
                          ) : (
                            <select
                              className="form-control"
                              value={methodByBen[b.id] || 'Cash'}
                              onChange={(e) => setMethodByBen((m) => ({ ...m, [b.id]: e.target.value }))}
                            >
                              {METHODS.map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${rec ? 'badge-paid' : 'badge-pending'}`}>
                            {rec ? tr('Disbursed', 'ادا کر دیا') : tr('Pending', 'باقی')}
                          </span>
                        </td>
                        <td>{rec ? rec.date : '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          {rec ? (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => undoPaid(rec)}>
                              <RotateCcw size={14} /> {tr('Undo', 'منسوخ')}
                            </button>
                          ) : (
                            <button type="button" className="btn btn-primary btn-sm" onClick={() => markPaid(b)}>
                              <CheckCircle size={14} /> {tr('Mark Paid', 'ادا کریں')}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* DIRECTORY */}
      {tab === 'directory' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{tr('Name', 'نام')}</th>
                  <th>CNIC</th>
                  <th>{tr('Phone', 'فون')}</th>
                  <th>{tr('Monthly Amount', 'ماہانہ رقم')}</th>
                  <th>{tr('Notes', 'نوٹس')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {beneficiaries.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}>
                      {tr('Add the 3–4 families who receive Zakat every month.', 'ہر ماہ زکوٰۃ لینے والے 3 سے 4 خاندان شامل کریں۔')}
                    </td>
                  </tr>
                )}
                {beneficiaries.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600 }}>{b.name}</td>
                    <td className="font-mono">{b.cnic || '—'}</td>
                    <td>{b.phone || '—'}</td>
                    <td className="font-mono">{rs(b.monthlyAmount)}</td>
                    <td>{b.notes || '—'}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(b)}>
                        <Pencil size={14} />
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#fb7185' }} onClick={() => deleteBeneficiary(b)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AUDIT */}
      {tab === 'audit' && (
        <>
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {tr('Total Zakat disbursed in', 'کل زکوٰۃ ادا کی گئی')} {auditYear}
            </div>
            <div className="font-mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {rs(yearTotal)}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ padding: 0 }}>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{tr('Beneficiary', 'مستحق')}</th>
                      <th>{tr('Months Paid', 'مہینے')}</th>
                      <th>{tr('Total', 'کل')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(perBeneficiary).length === 0 && (
                      <tr><td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>{tr('No payments recorded for this year.', 'اس سال کوئی ادائیگی درج نہیں۔')}</td></tr>
                    )}
                    {Object.entries(perBeneficiary).map(([name, v]) => (
                      <tr key={name}>
                        <td style={{ fontWeight: 600 }}>{name}</td>
                        <td>{v.months}</td>
                        <td className="font-mono">{rs(v.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{tr('Month', 'مہینہ')}</th>
                      <th>{tr('Payments', 'ادائیگیاں')}</th>
                      <th>{tr('Total', 'کل')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perMonth.map((m) => (
                      <tr key={m.key}>
                        <td>{monthLabel(m.key).split(' ')[0]}</td>
                        <td>{m.count}</td>
                        <td className="font-mono">{m.total ? rs(m.total) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add / Edit modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                {editingId ? tr('Edit Beneficiary', 'مستحق میں ترمیم') : tr('Add Beneficiary', 'مستحق شامل کریں')}
              </h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={saveBeneficiary}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{tr('Name / Family', 'نام / خاندان')} *</label>
                  <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">CNIC</label>
                    <input className="form-control" placeholder="33102-1234567-8" value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{tr('Phone', 'فون')}</label>
                    <input className="form-control" placeholder="0300-1234567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{tr('Fixed Monthly Amount (Rs.)', 'مقررہ ماہانہ رقم (روپے)')} *</label>
                  <input type="number" min="0" className="form-control" value={form.monthlyAmount} onChange={(e) => setForm({ ...form, monthlyAmount: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">{tr('Notes', 'نوٹس')}</label>
                  <input className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                {error && <div style={{ color: '#fb7185', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>{tr('Cancel', 'منسوخ')}</button>
                <button type="submit" className="btn btn-primary">{tr('Save', 'محفوظ کریں')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
