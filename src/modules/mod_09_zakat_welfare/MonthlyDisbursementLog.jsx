import React, { useState } from 'react';
import { CreditCard, CheckCircle2, Clock } from 'lucide-react';

const INITIAL_LOGS = [
  { id: 1, month: 'September 2026', beneficiary: 'Muhammad Yasin', amount: 15000, datePaid: '2026-09-05', status: 'Disbursed' },
  { id: 2, month: 'September 2026', beneficiary: 'Rashida Bibi', amount: 12000, datePaid: '2026-09-05', status: 'Disbursed' },
  { id: 3, month: 'September 2026', beneficiary: 'Tariq Mehmood', amount: 10000, datePaid: '2026-09-06', status: 'Disbursed' },
  { id: 4, month: 'October 2026', beneficiary: 'Muhammad Yasin', amount: 15000, datePaid: '-', status: 'Pending' }
];

export default function MonthlyDisbursementLog() {
  const [logs, setLogs] = useState(INITIAL_LOGS);

  const markDisbursed = (id) => {
    setLogs(logs.map(log => log.id === id ? { ...log, status: 'Disbursed', datePaid: new Date().toISOString().split('T')[0] } : log));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-600"/>
          Monthly Disbursement Log (ماہانہ ادائیگی کا لاگ)
        </h2>
        <p className="text-sm text-slate-500 mt-1">Track monthly Zakat payouts and approval statuses</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Month Cycle</th>
              <th className="py-3 px-4">Beneficiary</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Date Disbursed</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-medium text-slate-800">{log.month}</td>
                <td className="py-3 px-4">{log.beneficiary}</td>
                <td className="py-3 px-4 font-semibold text-slate-900">Rs. {log.amount.toLocaleString()}</td>
                <td className="py-3 px-4">{log.datePaid}</td>
                <td className="py-3 px-4">
                  {log.status === 'Disbursed' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3"/> Disbursed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
                      <Clock className="w-3 h-3"/> Pending
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  {log.status === 'Pending' && (
                    <button
                      onClick={() => markDisbursed(log.id)}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1.5 rounded-md transition-colors"
                    >
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}