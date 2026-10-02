import { db } from "../../db/index.js";

/**
 * Generate sequential Gate Pass Number (e.g. GP-2026-0001)
 */
export async function generateGatePassNo() {
  const currentYear = new Date().getFullYear();
  const allPasses = await db.gate_passes.toArray();
  
  let maxSeq = 0;
  const prefix = `GP-${currentYear}-`;

  allPasses.forEach(p => {
    if (p.gatePassNo && p.gatePassNo.startsWith(prefix)) {
      const numPart = parseInt(p.gatePassNo.replace(prefix, ""), 10);
      if (!isNaN(numPart) && numPart > maxSeq) {
        maxSeq = numPart;
      }
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(4, "0");
  return `${prefix}${nextSeq}`;
}

/**
 * Create a new Gate Pass with full logistics and manifest data
 */
export async function createGatePass(data) {
  const gatePassNo = data.gatePassNo || (await generateGatePassNo());
  const now = new Date();
  const todayDate = now.toISOString().slice(0, 10);

  // Compute manifest totals
  const manifest = Array.isArray(data.manifest) ? data.manifest : [];
  let totalPieces = 0;
  let totalSqFt = 0;

  const sanitizedManifest = manifest.map((item, idx) => {
    const pcs = Number(item.pieces) || 0;
    const sqft = Number(item.sqFt || item.totalSqFt) || 0;
    totalPieces += pcs;
    totalSqFt += sqft;

    return {
      sr: idx + 1,
      name: item.name || item.itemName || "Marble / Tile Item",
      thicknessSutar: item.thicknessSutar ? String(item.thicknessSutar) : "4",
      size: item.size || item.dimensions || (item.length && item.width ? `${item.length}ft × ${item.width}ft` : ""),
      pieces: pcs,
      sqFt: sqft
    };
  });

  const record = {
    gatePassNo,
    invoiceId: data.invoiceId ? Number(data.invoiceId) : null,
    invoiceNo: data.invoiceNo ? data.invoiceNo.trim() : "",
    customerName: data.customerName ? data.customerName.trim() : "Walk-in Customer",
    customerPhone: data.customerPhone ? data.customerPhone.trim() : "",
    destination: data.destination ? data.destination.trim() : "",
    vehicleType: data.vehicleType || "Qingqi Rickshaw",
    vehicleRegNo: data.vehicleRegNo ? data.vehicleRegNo.trim().toUpperCase() : "",
    driverName: data.driverName ? data.driverName.trim() : "",
    driverPhone: data.driverPhone ? data.driverPhone.trim() : "",
    carriageCharges: Number(data.carriageCharges) || 0,
    carriagePaidBy: data.carriagePaidBy || "Customer (موقع پر ادا کرے گا)",
    driverAdvance: Number(data.driverAdvance) || 0,
    manifest: sanitizedManifest,
    totalPieces,
    totalSqFt: Number(totalSqFt.toFixed(2)),
    status: data.status || "Dispatched",
    notes: data.notes ? data.notes.trim() : "",
    date: data.date ? data.date.slice(0, 10) : todayDate,
    dispatchDate: now.toISOString(),
    dispatchTime: now.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true }),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  const id = await db.gate_passes.add(record);

  // If linked to an invoice, update invoice status in DB
  if (record.invoiceId) {
    try {
      await db.invoices.update(record.invoiceId, {
        gatePassNo: record.gatePassNo,
        isDispatched: true,
        dispatchedAt: now.toISOString()
      });
    } catch (err) {
      console.warn("Could not update invoice dispatch status:", err);
    }
  }

  return { id, ...record };
}

/**
 * Fetch all Gate Passes ordered by newest first
 */
export async function getAllGatePasses() {
  const all = await db.gate_passes.toArray();
  return all.sort((a, b) => new Date(b.createdAt || b.dispatchDate || 0) - new Date(a.createdAt || a.dispatchDate || 0));
}

/**
 * Fetch a single Gate Pass by ID
 */
export async function getGatePassById(id) {
  return await db.gate_passes.get(Number(id));
}

/**
 * Update status (e.g. Dispatched -> In Transit -> Delivered -> Cancelled)
 */
export async function updateGatePassStatus(id, status) {
  return await db.gate_passes.update(Number(id), {
    status,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Bulk update status of multiple gate passes
 */
export async function bulkUpdateGatePassStatus(ids, status) {
  const now = new Date().toISOString();
  return await db.transaction('rw', db.gate_passes, async () => {
    for (const id of ids) {
      await db.gate_passes.update(Number(id), {
        status,
        updatedAt: now
      });
    }
  });
}

/**
 * Update full gate pass record
 */
export async function updateGatePass(id, updatedData) {
  const now = new Date();
  const manifest = Array.isArray(updatedData.manifest) ? updatedData.manifest : [];
  let totalPieces = 0;
  let totalSqFt = 0;

  const sanitizedManifest = manifest.map((item, idx) => {
    const pcs = Number(item.pieces) || 0;
    const sqft = Number(item.sqFt || item.totalSqFt) || 0;
    totalPieces += pcs;
    totalSqFt += sqft;

    return {
      sr: idx + 1,
      name: item.name || item.itemName || "Marble / Tile Item",
      thicknessSutar: item.thicknessSutar ? String(item.thicknessSutar) : "4",
      size: item.size || item.dimensions || "",
      pieces: pcs,
      sqFt: sqft
    };
  });

  return await db.gate_passes.update(Number(id), {
    ...updatedData,
    manifest: sanitizedManifest,
    totalPieces,
    totalSqFt: Number(totalSqFt.toFixed(2)),
    updatedAt: now.toISOString()
  });
}

/**
 * Delete a Gate Pass
 */
export async function deleteGatePass(id) {
  return await db.gate_passes.delete(Number(id));
}

/**
 * Bulk delete Gate Passes
 */
export async function bulkDeleteGatePasses(ids) {
  return await db.transaction('rw', db.gate_passes, async () => {
    for (const id of ids) {
      await db.gate_passes.delete(Number(id));
    }
  });
}

/**
 * Fetch all invoices for linking into gate pass (with items and customer details)
 */
export async function getInvoicesForLinking() {
  const allInvoices = await db.invoices.toArray();
  const allCustomers = await db.customers.toArray();
  const customerMap = {};
  allCustomers.forEach(c => {
    customerMap[c.id] = c;
    customerMap[c.name] = c;
  });

  return allInvoices
    .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
    .map(inv => {
      const cust = customerMap[inv.customerId] || customerMap[inv.customerName] || {};
      return {
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        customerName: inv.customerName || "Customer",
        customerPhone: cust.phone || inv.customerPhone || "",
        destination: cust.city || cust.address || inv.deliveryAddress || "",
        carrier: inv.carrier || "",
        carriageCharges: inv.carriageCharges || 0,
        date: (inv.createdAt || inv.date || "").slice(0, 10),
        totalAmount: inv.grandTotal || inv.totalAmount || 0,
        paidAmount: inv.paidAmount || 0,
        balanceDue: inv.balanceDue || 0,
        items: (inv.items || []).map(it => ({
          name: it.name || it.itemName || "",
          thicknessSutar: it.thicknessSutar || "4",
          size: it.dimensions || `${it.length || 0}ft × ${it.width || 0}ft`,
          pieces: it.pieces || 0,
          sqFt: it.totalSqFt || it.sqFt || 0
        }))
      };
    });
}

/**
 * Calculate live logistics KPIs for the gate pass dashboard
 */
export async function getLogisticsKPIs() {
  const all = await db.gate_passes.toArray();
  const todayStr = new Date().toISOString().slice(0, 10);

  let todayDispatches = 0;
  let inTransitCount = 0;
  let deliveredCount = 0;
  let totalSqFtDispatched = 0;

  all.forEach(gp => {
    const gpDate = (gp.date || gp.dispatchDate || gp.createdAt || "").slice(0, 10);
    const isToday = gpDate === todayStr;

    if (isToday) {
      todayDispatches += 1;
    }

    totalSqFtDispatched += Number(gp.totalSqFt || 0);

    if (gp.status === "Delivered") {
      deliveredCount += 1;
    } else if (gp.status === "In Transit" || gp.status === "Dispatched") {
      inTransitCount += 1;
    }
  });

  return {
    totalPasses: all.length,
    todayDispatches,
    inTransitCount,
    deliveredCount,
    totalSqFtDispatched: Number(totalSqFtDispatched.toFixed(2))
  };
}
