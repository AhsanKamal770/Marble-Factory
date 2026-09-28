import { db } from '../../db';

export async function getAllCustomers() {
  return await db.customers.toArray();
}

export async function getCustomerById(id) {
  return await db.customers.get(Number(id));
}

export async function saveCustomer(customerData) {
  const data = {
    ...customerData,
    balanceDue: Number(customerData.balanceDue) || 0,
    updatedAt: new Date().toISOString()
  };
  
  if (data.id) {
    const id = data.id;
    delete data.id;
    await db.customers.update(id, data);
    return id;
  } else {
    data.createdAt = new Date().toISOString();
    return await db.customers.add(data);
  }
}

export async function deleteCustomer(id) {
  // optionally check if they have invoices
  return await db.customers.delete(Number(id));
}

export async function getCustomerTimeline(customerId) {
  const id = Number(customerId);
  const [invoices, payments] = await Promise.all([
    db.invoices.where('customerId').equals(id).toArray(),
    db.customer_payments.where('customerId').equals(id).toArray()
  ]);

  // Combines invoices and payments into a single timeline.
  const timeline = [
    ...invoices.map(inv => ({ ...inv, type: 'INVOICE', sortDate: new Date(inv.date || inv.createdAt).getTime() })),
    ...payments.map(pay => ({ ...pay, type: 'PAYMENT', sortDate: new Date(pay.date).getTime() }))
  ];

  return timeline.sort((a, b) => b.sortDate - a.sortDate);
}

export async function recordPaymentRecovery(customerId, amount, paymentMethod, notes) {
  return await db.transaction('rw', db.customers, db.customer_payments, db.invoices, async () => {
    const customer = await db.customers.get(Number(customerId));
    if (!customer) throw new Error("Customer not found");

    const paymentAmount = Number(amount);
    
    // Create payment record
    const payment = {
      paymentNo: `REC-${Date.now()}`,
      customerId: Number(customerId),
      amount: paymentAmount,
      paymentMethod,
      notes,
      date: new Date().toISOString(),
    };
    
    await db.customer_payments.add(payment);

    // Update customer balance
    const newBalance = Math.max(0, (customer.balanceDue || 0) - paymentAmount);
    await db.customers.update(Number(customerId), { balanceDue: newBalance });
    
    return { payment, newBalance };
  });
}
