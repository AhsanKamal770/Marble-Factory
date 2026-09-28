import { db } from '../../db/index.js';

export async function getAllCustomers() {
  const list = await db.customers.toArray();
  return list.sort((a, b) => Number(b.balanceDue || 0) - Number(a.balanceDue || 0));
}

export async function getCustomerById(id) {
  return await db.customers.get(Number(id));
}

export async function saveCustomer(customerData) {
  const openingBal = Number(customerData.balanceDue || 0);

  if (customerData.id) {
    const id = Number(customerData.id);
    const existing = await db.customers.get(id);
    if (!existing) throw new Error("Customer not found");

    const updatePayload = {
      name: customerData.name?.trim(),
      phone: customerData.phone?.trim() || '',
      cnic: customerData.cnic?.trim() || '',
      city: customerData.city?.trim() || 'Faisalabad / Jhumra',
      address: customerData.address?.trim() || '',
      customerType: customerData.customerType || 'Retail',
      creditLimit: Number(customerData.creditLimit || 0),
      notes: customerData.notes || '',
      updatedAt: new Date().toISOString()
    };

    await db.customers.update(id, updatePayload);
    return id;
  } else {
    // New Customer
    const newPayload = {
      name: customerData.name?.trim(),
      phone: customerData.phone?.trim() || '',
      cnic: customerData.cnic?.trim() || '',
      city: customerData.city?.trim() || 'Faisalabad / Jhumra',
      address: customerData.address?.trim() || '',
      customerType: customerData.customerType || 'Retail',
      creditLimit: Number(customerData.creditLimit || 0),
      totalBilled: openingBal,
      totalPaid: 0,
      balanceDue: openingBal,
      notes: customerData.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newId = await db.customers.add(newPayload);
    return newId;
  }
}

export async function deleteCustomer(id) {
  const custId = Number(id);
  return await db.transaction('rw', [db.customers, db.invoices, db.customer_payments], async () => {
    // Check if customer has linked invoices
    const invCount = await db.invoices.where('customerId').equals(custId).count();
    if (invCount > 0) {
      throw new Error(`Cannot delete customer: ${invCount} invoice(s) exist for this customer in Bill Book.`);
    }
    // Delete payments and customer record
    await db.customer_payments.where('customerId').equals(custId).delete();
    await db.customers.delete(custId);
    return true;
  });
}

export async function getCustomerTimeline(customerId) {
  const id = Number(customerId);
  const customer = await db.customers.get(id);
  if (!customer) return [];

  const [invoices, payments] = await Promise.all([
    db.invoices.where('customerId').equals(id).toArray(),
    db.customer_payments.where('customerId').equals(id).toArray()
  ]);

  const timeline = [
    ...invoices.map(inv => ({
      ...inv,
      type: 'INVOICE',
      sortDate: new Date(inv.date || inv.createdAt || Date.now()).getTime(),
      amount: Number(inv.grandTotal || 0),
      debit: Number(inv.grandTotal || 0),
      credit: 0
    })),
    ...payments.map(pay => ({
      ...pay,
      type: 'PAYMENT',
      sortDate: new Date(pay.date || pay.createdAt || Date.now()).getTime(),
      amount: Number(pay.amount || 0),
      debit: 0,
      credit: Number(pay.amount || 0)
    }))
  ];

  // Sort chronologically ascending to calculate running balance
  timeline.sort((a, b) => a.sortDate - b.sortDate);

  let currentRunningBalance = 0;
  const computedTimeline = timeline.map(item => {
    if (item.type === 'INVOICE') {
      currentRunningBalance += item.debit;
      // If invoice had a partial immediate cash payment at billing time, record that credit
      const immediatePaid = Number(item.paidAmount || 0);
      return {
        ...item,
        runningBalance: currentRunningBalance,
        immediatePaid
      };
    } else {
      currentRunningBalance = Math.max(0, currentRunningBalance - item.credit);
      return {
        ...item,
        runningBalance: currentRunningBalance
      };
    }
  });

  // Return reverse chronological (most recent first)
  return computedTimeline.reverse();
}

export async function recordPaymentRecovery(customerId, amount, paymentMethod = 'Cash', notes = '', invoiceId = null) {
  const custId = Number(customerId);
  const paymentAmount = Number(amount);
  if (!paymentAmount || paymentAmount <= 0) throw new Error("Payment amount must be greater than 0");

  return await db.transaction('rw', [db.customers, db.customer_payments, db.invoices], async () => {
    const customer = await db.customers.get(custId);
    if (!customer) throw new Error("Customer not found");

    const currentYear = new Date().getFullYear();
    const count = await db.customer_payments.count();
    const paymentNo = `PAY-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    const payment = {
      paymentNo,
      customerId: custId,
      customerName: customer.name,
      invoiceId: invoiceId ? Number(invoiceId) : null,
      amount: paymentAmount,
      paymentMethod: paymentMethod || 'Cash',
      notes: notes || 'Khata payment recovery',
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    await db.customer_payments.add(payment);

    // Update customer balance & totalPaid
    const currentBalance = Number(customer.balanceDue || 0);
    const currentPaid = Number(customer.totalPaid || 0);
    const newBalance = Math.max(0, currentBalance - paymentAmount);
    const newPaid = currentPaid + paymentAmount;

    await db.customers.update(custId, {
      balanceDue: newBalance,
      totalPaid: newPaid,
      updatedAt: new Date().toISOString()
    });

    // If specific invoice is linked, adjust invoice balanceDue
    if (invoiceId) {
      const inv = await db.invoices.get(Number(invoiceId));
      if (inv) {
        const invPaid = (Number(inv.paidAmount) || 0) + paymentAmount;
        const invDue = Math.max(0, (Number(inv.grandTotal) || 0) - invPaid);
        const invStatus = invDue === 0 ? 'Paid' : invPaid > 0 ? 'Half Paid' : 'Unpaid';
        await db.invoices.update(inv.id, {
          paidAmount: invPaid,
          balanceDue: invDue,
          paymentStatus: invStatus
        });
      }
    }

    return { payment, newBalance };
  });
}
