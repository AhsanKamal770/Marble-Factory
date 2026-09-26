import Dexie from 'dexie';

export const db = new Dexie('MarbleFactoryDB');

db.version(1).stores({
  items: '++id, code, name, category, finish, grade, stockSqFt, minStockAlert',
  customers: '++id, name, phone, city, customerType, balanceDue',
  suppliers: '++id, name, phone, company, balancePayable',
  invoices: '++id, invoiceNo, date, customerId, customerName, paymentStatus, balanceDue',
  customer_payments: '++id, paymentNo, invoiceId, customerId, date',
  supplier_purchases: '++id, purchaseNo, challanNo, date, supplierId, paymentStatus, balanceDue',
  supplier_payments: '++id, paymentNo, purchaseId, supplierId, date',
  returns: '++id, returnNo, type, refDocNo, partyName, date',
  stock_movements: '++id, date, itemId, movementType, refDocNo',
  settings: '++id, companyName'
});

// Helper functions for common transactions & stock updates
export async function logStockMovement({ itemId, itemName, category, movementType, changeSqFt, changeBoxes = 0, changePieces = 0, previousSqFt, newSqFt, refDocNo, note = '' }) {
  return await db.stock_movements.add({
    date: new Date().toISOString(),
    itemId,
    itemName,
    category,
    movementType,
    changeSqFt,
    changeBoxes,
    changePieces,
    previousSqFt,
    newSqFt,
    refDocNo,
    note,
    createdAt: new Date().toISOString()
  });
}

// Update item stock atomically
export async function adjustItemStock(itemId, deltaSqFt, deltaBoxes = 0, deltaPieces = 0, movementType = 'Adjustment', refDocNo = '', note = '') {
  return await db.transaction('rw', db.items, db.stock_movements, async () => {
    const item = await db.items.get(itemId);
    if (!item) throw new Error(`Item with id ${itemId} not found`);

    const prevSqFt = Number(item.stockSqFt) || 0;
    const newSqFt = Math.max(0, Math.round((prevSqFt + deltaSqFt) * 100) / 100);
    const newBoxes = Math.max(0, (Number(item.stockBoxes) || 0) + deltaBoxes);
    const newPieces = Math.max(0, (Number(item.stockPieces) || 0) + deltaPieces);

    await db.items.update(itemId, {
      stockSqFt: newSqFt,
      stockBoxes: newBoxes,
      stockPieces: newPieces,
      updatedAt: new Date().toISOString()
    });

    await logStockMovement({
      itemId,
      itemName: item.name,
      category: item.category,
      movementType,
      changeSqFt: deltaSqFt,
      changeBoxes: deltaBoxes,
      changePieces: deltaPieces,
      previousSqFt: prevSqFt,
      newSqFt,
      refDocNo,
      note
    });

    return { prevSqFt, newSqFt };
  });
}
