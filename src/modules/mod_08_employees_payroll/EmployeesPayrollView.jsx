import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Pencil, Trash2, Wallet, TrendingUp, CheckCircle, RotateCcw, Printer, X } from 'lucide-react';
import { db } from '../../db';
import { useLanguage } from '../../context/LanguageContext';

const ROLES = ['Cutter Master', 'Polish Master', 'Yard Labourer', 'Driver', 'Cashier', 'Gate Supervisor'];

const todayStr = () => new Date().toISOString().slice(0, 10);
const monthKeyNow = () => new Date().toISOString().slice(0, 7);
const rs = (n) => 'Rs. ' + Number(n || 0).toLocaleString();
const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

// Anniversary logic: 1 full year since last increment (or joining date)
const anniversaryInfo = (emp) => {
  const base = emp.lastIncrementDate || emp.joiningDate;
  if (!base) return { due: false };
  const baseDate = new Date(base);
  const dueDate = new Date(baseDate);
  dueDate.setFullYear(dueDate.getFullYear() + 1);
  const due = new Date() >= dueDate;
  const years = Math.floor((new Date() - new Date(emp.joiningDate || base)) / (365.25 * 24 * 3600 * 1000));
  return { due, dueDate: dueDate.toISOString().slice(0, 10), years };
};

const emptyEmp = { name: '', role: ROLES[0], phone: '', cnic: '', joiningDate: todayStr(), basicSalary: '' };
const emptyAdv = { employeeId: '', amount: '', date: todayStr(), notes: '' };

export default function EmployeesPayrollView() {
  const { language } = useLanguage();
  const tr = (en, ur) => (language === 'ur' ? ur : en);

  const [tab, setTab] = useState('roster'); // roster | payroll | ledger
  const [payMonth, setPayMonth] = useState(monthKeyNow());
  const [ledgerEmp, setLedgerEmp] = useState('all');

  const [empModal, setEmpModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [empForm, setEmpForm] = useState(emptyEmp);
  const [advModal, setAdvModal] = useState(false);
  const [advForm, setAdvForm] = useState(emptyAdv);
  const [error, setError] = useState('');

  const employees = useLiveQuery(() => db.employees.toArray(), []) || [];
  const advances = useLiveQuery(() => db.employee_advances.toArray(), []) || [];
  const payrolls = useLiveQuery(() => db.payroll_records.toArray(), []) || [];

  const advancesInMonth = (empId, key) =>
    advances
      .filter((a) => a.employeeId === empId && (a.date || '').slice(0, 7) === key)
      .reduce((s, a) => s + Number(a.amount || 0), 0);

  // ---------- Employee CRUD ----------
  const openAddEmp = () => {
    setEditingId(null);
    setEmpForm(emptyEmp);
    setError('');
    setEmpModal(true);
  };
  const openEditEmp = (e) => {
    setEditingId(e.id);
    setEmpForm({
      name: e.name || '',
      role: e.role || ROLES[0],
      phone: e.phone || '',
      cnic: e.cnic || '',
      joiningDate: e.joiningDate || todayStr(),
      basicSalary: e.basicSalary || ''
    });
    setError('');
    setEmpModal(true);
  };
  const saveEmp = async (ev) => {
    ev.preventDefault();
    const salary = parseFloat(empForm.basicSalary);
    if (!empForm.name.trim()) return setError(tr('Name is required.', 'نام درج کریں۔'));
    if (!salary || salary <= 0) return setError(tr('Enter a valid salary.', 'تنخواہ درست درج کریں۔'));
    const data = { ...empForm, name: empForm.name.trim(), basicSalary: salary };
    if (editingId) await db.employees.update(editingId, data);
    else await db.employees.add({ ...data, advanceDrawn: 0, createdAt: new Date().toISOString() });
    setEmpModal(false);
  };
  const deleteEmp = async (e) => {
    if (!window.confirm(tr(`Delete ${e.name}?`, `${e.name} کو حذف کریں؟`))) return;
    await db.employees.delete(e.id);
  };

  // ---------- Advances ----------
  const openAdvance = (empId = '') => {
    setAdvForm({ ...emptyAdv, employeeId: empId ? String(empId) : employees[0] ? String(employees[0].id) : '' });
    setError('');
    setAdvModal(true);
  };
  const saveAdvance = async (ev) => {
    ev.preventDefault();
    const amount = parseFloat(advForm.amount);
    const emp = employees.find((x) => x.id === parseInt(advForm.employeeId, 10));
    if (!emp) return setError(tr('Select an employee.', 'ملازم منتخب کریں۔'));
    if (!amount || amount <= 0) return setError(tr('Enter a valid amount.', 'رقم درست درج کریں۔'));
    await db.employee_advances.add({
      employeeId: emp.id,
      employeeName: emp.name,
      amount,
      date: advForm.date,
      notes: advForm.notes.trim(),
      createdAt: new Date().toISOString()
    });
    // keep employee.advanceDrawn = this month's total
    const all = await db.employee_advances.where('employeeId').equals(emp.id).toArray();
    const key = advForm.date.slice(0, 7);
    const monthTotal = all.filter((a) => (a.date || '').slice(0, 7) === key).reduce((s, a) => s + Number(a.amount), 0);
    await db.employees.update(emp.id, { advanceDrawn: monthTotal });
    setAdvModal(false);
  };

  // ---------- 10% increment ----------
  const applyIncrement = async (emp) => {
    const newSalary = Math.round(Number(emp.basicSalary) * 1.1);
    if (!window.confirm(tr(
      `Raise ${emp.name}'s salary from ${rs(emp.basicSalary)} to ${rs(newSalary)}?`,
      `${emp.name} کی تنخواہ ${rs(emp.basicSalary)} سے بڑھا کر ${rs(newSalary)} کریں؟`
    ))) return;
    const history = emp.salaryHistory || [];
    await db.employees.update(emp.id, {
      basicSalary: newSalary,
      lastIncrementDate: todayStr(),
      salaryHistory: [...history, { date: todayStr(), oldSalary: emp.basicSalary, newSalary }]
    });
  };

  // ---------- Payroll ----------
  const payrollFor = (empId) => payrolls.find((p) => p.employeeId === empId && p.monthKey === payMonth);
  const payrollRows = employees.map((e) => {
    const adv = advancesInMonth(e.id, payMonth);
    return { emp: e, adv, net: Math.max(0, Number(e.basicSalary) - adv), rec: payrollFor(e.id) };
  });
  const totalNet = payrollRows.reduce((s, r) => s + r.net, 0);
  const totalPaid = payrollRows.filter((r) => r.rec).reduce((s, r) => s + Number(r.rec.netPaid || 0), 0);

  const markSalaryPaid = async (row) => {
    if (row.rec) return;
    await db.payroll_records.add({
      employeeId: row.emp.id,
      employeeName: row.emp.name,
      monthKey: payMonth,
      monthYear: monthLabel(payMonth),
      baseSalary: Number(row.emp.basicSalary),
      advances: row.adv,
      netPaid: row.net,
      status: 'Paid',
      date: todayStr()
    });
  };
  const undoSalaryPaid = async (rec) => {
    if (!window.confirm(tr('Undo this salary payment?', 'یہ تنخواہ کی ادائیگی منسوخ کریں؟'))) return;
    await db.payroll_records.delete(rec.id);
  };

  const dueEmployees = employees.filter((e) => anniversaryInfo(e).due);
  const ledgerRows = advances
    .filter((a) => ledgerEmp === 'all' || String(a.employeeId) === ledgerEmp)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const tabBtn = (id, label) => (
    <button key={id} type="button" className={`btn btn-sm ${tab === id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(id)}>
      {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
      {/* Top bar */}
      <div className="card no-print" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {tabBtn('roster', tr('Employees', 'ملازمین'))}
          {tabBtn('payroll', tr('Monthly Payroll', 'ماہانہ تنخواہ'))}
          {tabBtn('ledger', tr('Advance Ledger', 'ایڈوانس کھاتہ'))}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {tab === 'payroll' && (
            <>
              <input type="month" className="form-control" value={payMonth} onChange={(e) => e.target.value && setPayMonth(e.target.value)} />
              <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
                <Printer size={15} /> {tr('Print', 'پرنٹ')}
              </button>
            </>
          )}
          {tab === 'roster' && (
            <button type="button" className="btn btn-primary" onClick={openAddEmp}>
              <Plus size={15} /> {tr('Add Employee', 'ملازم شامل کریں')}
            </button>
          )}
          {(tab === 'roster' || tab === 'ledger') && (
            <button type="button" className="btn btn-secondary" onClick={() => openAdvance()} disabled={employees.length === 0}>
              <Wallet size={15} /> {tr('Give Advance', 'ایڈوانس دیں')}
            </button>
          )}
        </div>
      </div>

      {/* ROSTER */}
      {tab === 'roster' && (
        <>
          {dueEmployees.length > 0 && (
            <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                <TrendingUp size={16} style={{ verticalAlign: 'middle', marginRight: '6px', color: '#f59e0b' }} />
                {tr('Annual 10% increment due', 'سالانہ 10% اضافہ واجب')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {dueEmployees.map((e) => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{e.name}</strong> · {e.role} · {rs(e.basicSalary)} → <strong>{rs(Math.round(e.basicSalary * 1.1))}</strong>
                    </span>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => applyIncrement(e)}>
                      {tr('Apply 10%', '10% اضافہ لگائیں')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card" style={{ padding: 0 }}>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{tr('Name', 'نام')}</th>
                    <th>{tr('Role', 'عہدہ')}</th>
                    <th>{tr('Joined', 'شمولیت')}</th>
                    <th>{tr('Basic Salary', 'بنیادی تنخواہ')}</th>
                    <th>{tr('Advance (this month)', 'ایڈوانس (اس ماہ)')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}>{tr('No employees yet. Add your first one.', 'ابھی کوئی ملازم نہیں۔ پہلا ملازم شامل کریں۔')}</td></tr>
                  )}
                  {employees.map((e) => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>{e.name}</td>
                      <td>{e.role}</td>
                      <td>{e.joiningDate || '—'}</td>
                      <td className="font-mono">{rs(e.basicSalary)}</td>
                      <td className="font-mono">{rs(advancesInMonth(e.id, monthKeyNow()))}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button type="button" className="btn btn-ghost btn-sm" title={tr('Advance', 'ایڈوانس')} onClick={() => openAdvance(e.id)}><Wallet size={14} /></button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEditEmp(e)}><Pencil size={14} /></button>
                        <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#fb7185' }} onClick={() => deleteEmp(e)}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* PAYROLL */}
      {tab === 'payroll' && (
        <>
          <div className="card" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{tr('Payroll', 'تنخواہ')} — {monthLabel(payMonth)}</span>
            <span className="font-mono" style={{ fontWeight: 700 }}>
              {tr('Paid', 'ادا شدہ')}: {rs(totalPaid)} / {rs(totalNet)}
            </span>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{tr('Employee', 'ملازم')}</th>
                    <th>{tr('Base Salary', 'بنیادی تنخواہ')}</th>
                    <th>{tr('Advances', 'ایڈوانس')}</th>
                    <th>{tr('Net Payout', 'خالص ادائیگی')}</th>
                    <th>{tr('Status', 'کیفیت')}</th>
                    <th className="no-print"></th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRows.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}>{tr('No employees to pay.', 'کوئی ملازم موجود نہیں۔')}</td></tr>
                  )}
                  {payrollRows.map((r) => (
                    <tr key={r.emp.id}>
                      <td style={{ fontWeight: 600 }}>{r.emp.name}<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.emp.role}</div></td>
                      <td className="font-mono">{rs(r.emp.basicSalary)}</td>
                      <td className="font-mono" style={{ color: r.adv ? '#fb7185' : undefined }}>{r.adv ? '− ' + rs(r.adv) : '—'}</td>
                      <td className="font-mono" style={{ fontWeight: 800 }}>{rs(r.rec ? r.rec.netPaid : r.net)}</td>
                      <td>
                        <span className={`badge ${r.rec ? 'badge-paid' : 'badge-pending'}`}>
                          {r.rec ? `${tr('Paid', 'ادا')} ${r.rec.date}` : tr('Unpaid', 'باقی')}
                        </span>
                      </td>
                      <td className="no-print" style={{ textAlign: 'right' }}>
                        {r.rec ? (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => undoSalaryPaid(r.rec)}><RotateCcw size={14} /> {tr('Undo', 'منسوخ')}</button>
                        ) : (
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => markSalaryPaid(r)}><CheckCircle size={14} /> {tr('Mark Paid', 'ادا کریں')}</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ADVANCE LEDGER */}
      {tab === 'ledger' && (
        <>
          <div className="card no-print" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label className="form-label" style={{ margin: 0 }}>{tr('Employee', 'ملازم')}</label>
            <select className="form-control" style={{ maxWidth: '260px' }} value={ledgerEmp} onChange={(e) => setLedgerEmp(e.target.value)}>
              <option value="all">{tr('All employees', 'تمام ملازمین')}</option>
              {employees.map((e) => <option key={e.id} value={String(e.id)}>{e.name}</option>)}
            </select>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{tr('Date', 'تاریخ')}</th>
                    <th>{tr('Employee', 'ملازم')}</th>
                    <th>{tr('Amount', 'رقم')}</th>
                    <th>{tr('Notes', 'نوٹس')}</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}>{tr('No advances recorded.', 'کوئی ایڈوانس درج نہیں۔')}</td></tr>
                  )}
                  {ledgerRows.map((a) => (
                    <tr key={a.id}>
                      <td>{a.date}</td>
                      <td style={{ fontWeight: 600 }}>{a.employeeName}</td>
                      <td className="font-mono">{rs(a.amount)}</td>
                      <td>{a.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Employee modal */}
      {empModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                {editingId ? tr('Edit Employee', 'ملازم میں ترمیم') : tr('Add Employee', 'ملازم شامل کریں')}
              </h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEmpModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={saveEmp}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{tr('Name', 'نام')} *</label>
                  <input className="form-control" value={empForm.name} onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">{tr('Role', 'عہدہ')}</label>
                    <select className="form-control" value={empForm.role} onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{tr('Basic Salary (Rs.)', 'بنیادی تنخواہ')} *</label>
                    <input type="number" min="0" className="form-control" value={empForm.basicSalary} onChange={(e) => setEmpForm({ ...empForm, basicSalary: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">{tr('Phone', 'فون')}</label>
                    <input className="form-control" value={empForm.phone} onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CNIC</label>
                    <input className="form-control" value={empForm.cnic} onChange={(e) => setEmpForm({ ...empForm, cnic: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{tr('Joining Date', 'شمولیت کی تاریخ')}</label>
                  <input type="date" className="form-control" value={empForm.joiningDate} onChange={(e) => setEmpForm({ ...empForm, joiningDate: e.target.value })} />
                </div>
                {error && <div style={{ color: '#fb7185', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEmpModal(false)}>{tr('Cancel', 'منسوخ')}</button>
                <button type="submit" className="btn btn-primary">{tr('Save', 'محفوظ کریں')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Advance modal */}
      {advModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{tr('Advance Salary', 'ایڈوانس تنخواہ')}</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdvModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={saveAdvance}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{tr('Employee', 'ملازم')}</label>
                  <select className="form-control" value={advForm.employeeId} onChange={(e) => setAdvForm({ ...advForm, employeeId: e.target.value })}>
                    {employees.map((e) => <option key={e.id} value={String(e.id)}>{e.name} — {e.role}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">{tr('Amount (Rs.)', 'رقم (روپے)')} *</label>
                    <input type="number" min="0" className="form-control" value={advForm.amount} onChange={(e) => setAdvForm({ ...advForm, amount: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{tr('Date', 'تاریخ')}</label>
                    <input type="date" className="form-control" value={advForm.date} onChange={(e) => setAdvForm({ ...advForm, date: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{tr('Notes', 'نوٹس')}</label>
                  <input className="form-control" value={advForm.notes} onChange={(e) => setAdvForm({ ...advForm, notes: e.target.value })} />
                </div>
                {error && <div style={{ color: '#fb7185', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAdvModal(false)}>{tr('Cancel', 'منسوخ')}</button>
                <button type="submit" className="btn btn-primary">{tr('Save Advance', 'ایڈوانس محفوظ کریں')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
