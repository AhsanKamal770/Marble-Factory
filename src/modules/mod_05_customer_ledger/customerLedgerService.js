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
      creditLimit: Number(customerData.creditLimit) || 50000,
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
      creditLimit: Number(customerData.creditLimit) || 50000,
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
  const targetIdStr = String(id);

  return await db.transaction('rw', [db.customers, db.invoices, db.customer_payments], async () => {
    // 1. Fetch customer by number or string ID
    let customer = await db.customers.get(custId);
    if (!customer) {
      customer = await db.customers.get(id);
    }
    if (!customer) {
      const allCust = await db.customers.toArray();
      customer = allCust.find((c) => String(c.id) === targetIdStr);
    }

    if (!customer) {
      throw new Error('Customer record not found.');
    }

    // 2. Check customer Khata balance
    const balanceDue = Math.round(Number(customer.balanceDue || 0));

    // If Khata has an actual positive balance (udhaar exists)
    if (balanceDue > 0) {
      throw new Error(`Khata not cleared! Customer has an outstanding balance of Rs. ${balanceDue.toLocaleString()}. Please recover all dues before deleting.`);
    }

    // 3. Khata is Cleared (balance <= 0) -> Cascade delete all invoices, payments, and customer record
    const allInvoices = await db.invoices.toArray();
    const invIdsToDelete = allInvoices
      .filter((inv) => String(inv.customerId) === targetIdStr)
      .map((inv) => inv.id);

    if (invIdsToDelete.length > 0) {
      await db.invoices.bulkDelete(invIdsToDelete);
    }

    const allPayments = await db.customer_payments.toArray();
    const payIdsToDelete = allPayments
      .filter((pay) => String(pay.customerId) === targetIdStr)
      .map((pay) => pay.id);

    if (payIdsToDelete.length > 0) {
      await db.customer_payments.bulkDelete(payIdsToDelete);
    }

    await db.customers.delete(customer.id);
    return true;
  });
}

export async function getCustomerTimeline(customerId) {
  const id = Number(customerId);
  const targetIdStr = String(customerId);

  let customer = await db.customers.get(id);
  if (!customer) {
    customer = await db.customers.get(customerId);
  }
  if (!customer) {
    const allCust = await db.customers.toArray();
    customer = allCust.find((c) => String(c.id) === targetIdStr);
  }
  if (!customer) return [];

  const [allInvoices, allPayments] = await Promise.all([
    db.invoices.toArray(),
    db.customer_payments.toArray()
  ]);

  const custNameClean = (customer.name || '').trim().toLowerCase();

  // Filter invoices for this customer (by ID or exact customerName match)
  const invoices = allInvoices.filter(inv => {
    if (inv.customerId !== null && inv.customerId !== undefined) {
      return String(inv.customerId) === targetIdStr;
    }
    if (inv.customerName) {
      const invCustName = inv.customerName.trim().toLowerCase();
      if (
        invCustName !== 'walk-in cash sale' &&
        invCustName !== 'عام خریدار (نقد)' &&
        invCustName !== 'walk-in' &&
        invCustName === custNameClean
      ) {
        return true;
      }
    }
    return false;
  });

  // Filter payment vouchers for this customer
  const payments = allPayments.filter(pay => {
    if (pay.customerId !== null && pay.customerId !== undefined) {
      return String(pay.customerId) === targetIdStr;
    }
    if (pay.customerName) {
      const payCustName = pay.customerName.trim().toLowerCase();
      if (
        payCustName !== 'walk-in cash sale' &&
        payCustName !== 'عام خریدار (نقد)' &&
        payCustName !== 'walk-in' &&
        payCustName === custNameClean
      ) {
        return true;
      }
    }
    return false;
  });

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
  const targetIdStr = String(customerId);
  const paymentAmount = Number(amount);
  if (!paymentAmount || paymentAmount <= 0) throw new Error("Payment amount must be greater than 0");

  return await db.transaction('rw', [db.customers, db.customer_payments, db.invoices], async () => {
    let customer = await db.customers.get(custId);
    if (!customer) {
      customer = await db.customers.get(customerId);
    }
    if (!customer) {
      const allCust = await db.customers.toArray();
      customer = allCust.find((c) => String(c.id) === targetIdStr);
    }
    if (!customer) throw new Error("Customer not found");

    const currentYear = new Date().getFullYear();
    const count = await db.customer_payments.count();
    const paymentNo = `PAY-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    const payment = {
      paymentNo,
      customerId: customer.id,
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

    await db.customers.update(customer.id, {
      balanceDue: newBalance,
      totalPaid: newPaid,
      updatedAt: new Date().toISOString()
    });

    // 1. If specific invoice is linked, adjust target invoice
    if (invoiceId) {
      const inv = await db.invoices.get(Number(invoiceId));
      if (inv) {
        const invDue = Number(inv.balanceDue || 0);
        const alloc = Math.min(invDue, paymentAmount);
        const newInvPaid = (Number(inv.paidAmount) || 0) + alloc;
        const newInvDue = Math.max(0, invDue - alloc);
        const invStatus = newInvDue <= 0 ? 'Paid' : (newInvPaid > 0 ? 'Half Paid' : 'Pending');
        await db.invoices.update(inv.id, {
          paidAmount: newInvPaid,
          balanceDue: newInvDue,
          paymentStatus: invStatus
        });
      }
    } else {
      // 2. FIFO Waterfall: Automatically allocate payment starting from the OLDEST unpaid invoice
      const allInvoices = await db.invoices.toArray();
      const customerInvoices = allInvoices
        .filter((inv) => String(inv.customerId) === targetIdStr)
        .sort((a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0));

      let remainingToAllocate = paymentAmount;
      for (const inv of customerInvoices) {
        if (remainingToAllocate <= 0) break;
        const invDue = Number(inv.balanceDue || 0);
        if (invDue > 0) {
          const alloc = Math.min(invDue, remainingToAllocate);
          const newInvPaid = (Number(inv.paidAmount) || 0) + alloc;
          const newInvDue = Math.max(0, invDue - alloc);
          const newStatus = newInvDue <= 0 ? 'Paid' : (newInvPaid > 0 ? 'Half Paid' : 'Pending');

          await db.invoices.update(inv.id, {
            paidAmount: newInvPaid,
            balanceDue: newInvDue,
            paymentStatus: newStatus
          });

          remainingToAllocate -= alloc;
        }
      }
    }

    return { payment, newBalance };
  });
}
