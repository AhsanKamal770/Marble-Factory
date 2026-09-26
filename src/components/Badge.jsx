import React from 'react';
import { CheckCircle2, AlertCircle, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function Badge({ status, text }) {
  const displayStatus = status || text || '';
  const normalized = displayStatus.toLowerCase();

  if (normalized === 'paid' || normalized === 'active' || normalized === 'good') {
    return (
      <span className="badge badge-paid">
        <CheckCircle2 size={12} />
        {text || 'Paid'}
      </span>
    );
  }

  if (normalized === 'half paid' || normalized === 'partial' || normalized === 'partially paid') {
    return (
      <span className="badge badge-half-paid">
        <Clock size={12} />
        {text || 'Half Paid'}
      </span>
    );
  }

  if (normalized === 'pending' || normalized === 'unpaid' || normalized === 'due' || normalized === 'damaged') {
    return (
      <span className="badge badge-pending">
        <AlertCircle size={12} />
        {text || 'Pending'}
      </span>
    );
  }

  if (normalized === 'low stock' || normalized === 'critical') {
    return (
      <span className="badge badge-warning">
        <AlertTriangle size={12} />
        {text || 'Low Stock'}
      </span>
    );
  }

  return (
    <span className="badge badge-info">
      <ShieldCheck size={12} />
      {text || status}
    </span>
  );
}
