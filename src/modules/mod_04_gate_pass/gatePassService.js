import { db, adjustItemStock } from "../../db/index.js";

/**
 * Normalizes text for resilient stock item matching
 */
export function normalizeItemSearchText(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[()[\]{}\-–—/\\,.:;*#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDimensions(str) {
  if (!str) return [];
  const s = String(str);
  const match = s.match(/(\d+)\s*(?:[x×*X]|by|\-)\s*(\d+)/i);
  if (match) {
    const d1 = parseInt(match[1], 10);
    const d2 = parseInt(match[2], 10);
    if (!isNaN(d1) && !isNaN(d2)) {
      return [Math.min(d1, d2), Math.max(d1, d2)];
    }
  }
  return [];
}

function extractSutarNumber(text, fallback) {
  if (fallback !== undefined && fallback !== null && String(fallback).trim() !== '') {
    const n = parseInt(String(fallback).replace(/[^0-9]/g, ''), 10);
    if (!isNaN(n)) return n;
  }
  if (!text) return null;
  const match = String(text).match(/(\d+)\s*(?:sutar|sutr|سوتر)/i);
  if (match) {
    const n = parseInt(match[1], 10);
    if (!isNaN(n)) return n;
  }
  return null;
}

/**
 * Intelligent stock item matcher that matches by:
 * 1. Exact Item ID
 * 2. Exact Item Code
 * 3. Exact Name
 * 4. Normalized Name
 * 5. Stone Keyword Groups (Badal, Sunny, Ziarat, Boticina, Tavera, Verona, Granite, Tile Bond, Spacer, Gola, Filling, Tukri, Kalm, Panels, Flowers, etc.)
 * 6. High-precision Disambiguation by Dimensions (e.g. 12×24 vs 12×12) & Sutar Thickness
 */
export function findMatchingStockItem(manifestItem, allDbItems = []) {
  if (!manifestItem || !Array.isArray(allDbItems) || allDbItems.length === 0) return null;

  // 1. Direct ID match
  if (manifestItem.itemId) {
    const byId = allDbItems.find(i => String(i.id) === String(manifestItem.itemId));
    if (byId) return byId;
  }

  // 2. Exact item code match
  const codeTarget = (manifestItem.code || '').trim().toLowerCase();
  if (codeTarget) {
    const byCode = allDbItems.find(i => (i.code || '').trim().toLowerCase() === codeTarget);
    if (byCode) return byCode;
  }

  const rawName = (manifestItem.name || '').trim();
  if (!rawName) return null;
  const cleanManifestName = normalizeItemSearchText(rawName);

  // Extract manifest dimensions & sutar thickness
  const mSizeStr = manifestItem.size || manifestItem.standardSize || manifestItem.selectedSizePreset || '';
  let manifestDims = getDimensions(mSizeStr);
  if (manifestDims.length === 0) {
    manifestDims = getDimensions(manifestItem.name || '');
  }
  const manifestSutar = extractSutarNumber(manifestItem.name || '', manifestItem.thicknessSutar || manifestItem.sutarThickness);

  // 3. Exact name match (case-insensitive & whitespace trimmed)
  const exactName = allDbItems.find(i => (i.name || '').trim().toLowerCase() === rawName.toLowerCase());
  if (exactName) return exactName;

  // 4. Normalized exact name match
  const normExact = allDbItems.find(i => normalizeItemSearchText(i.name) === cleanManifestName);
  if (normExact) return normExact;

  // 5. Keyword Groups for marble & factory inventory
  const KEYWORD_GROUPS = [
    { key: 'badal', tokens: ['badal', 'بادل'] },
    { key: 'sunny', tokens: ['sunny', 'سنی'] },
    { key: 'ziarat', tokens: ['ziarat', 'زیارت'] },
    { key: 'boticina', tokens: ['boticina', 'boticena', 'بوٹیسینا'] },
    { key: 'tavera', tokens: ['tavera', 'taweera', 'twera', 'تویرا'] },
    { key: 'verona', tokens: ['verona', 'ویرونا'] },
    { key: 'granite', tokens: ['granite', 'گرینائٹ'] },
    { key: 'black & gold', tokens: ['black & gold', 'black and gold', 'black gold'] },
    { key: 'bond', tokens: ['bond', 'بانڈ', 'adhesive'] },
    { key: 'spacer', tokens: ['spacer', 'اسپیسر'] },
    { key: 'filling', tokens: ['filling', 'فلنگ', 'grout'] },
    { key: 'gola', tokens: ['gola', 'گولہ'] },
    { key: 'tukri', tokens: ['tukri', 'ٹکڑی', 'kakri'] },
    { key: 'kalm', tokens: ['kalm', 'قلم'] },
    { key: 'flower', tokens: ['flower', 'phool', 'پھول', 'medallion'] },
    { key: 'panel', tokens: ['panel', 'پینل'] },
    { key: 'kali patti', tokens: ['kali patti', 'black patti', 'black border', 'کالی پٹی'] }
  ];

  for (const group of KEYWORD_GROUPS) {
    const matchesGroup = group.tokens.some(tok => cleanManifestName.includes(tok));
    if (matchesGroup) {
      const candidates = allDbItems.filter(i => {
        const dbNameNorm = normalizeItemSearchText(i.name);
        const dbCatNorm = normalizeItemSearchText(i.category);
        const dbSubNorm = normalizeItemSearchText(i.subCategory);
        const dbCombined = `${dbNameNorm} ${dbCatNorm} ${dbSubNorm}`;
        return group.tokens.some(tok => dbCombined.includes(tok));
      });

      if (candidates.length === 1) {
        const cDims = getDimensions(candidates[0].standardSize || candidates[0].size) || getDimensions(candidates[0].name);
        if (manifestDims.length === 2 && cDims.length === 2) {
          if (manifestDims[0] === cDims[0] && manifestDims[1] === cDims[1]) {
            return candidates[0];
          }
          // Dimension conflict, continue searching
        } else {
          return candidates[0];
        }
      }

      if (candidates.length > 1) {
        let bestCandidate = null;
        let highestScore = -9999;

        for (const c of candidates) {
          let score = 0;
          const cDims = getDimensions(c.standardSize || c.size) || getDimensions(c.name);
          const cSutar = extractSutarNumber(c.name, c.sutarThickness);
          const cCombined = `${normalizeItemSearchText(c.name)} ${normalizeItemSearchText(c.standardSize)} ${normalizeItemSearchText(c.subCategory)}`;

          // 1. Dimensions matching: heavily reward exact dimension match, penalize conflicting size
          if (manifestDims.length === 2) {
            if (cDims.length === 2) {
              if (manifestDims[0] === cDims[0] && manifestDims[1] === cDims[1]) {
                score += 150; // Perfect dimension match (e.g. 12x24 === 12x24)
              } else {
                score -= 300; // Dimension conflict (e.g. 12x24 vs 12x12)
              }
            } else {
              const hasD0 = cCombined.includes(String(manifestDims[0]));
              const hasD1 = cCombined.includes(String(manifestDims[1]));
              if (hasD0 && hasD1) score += 60;
              else if (hasD0 || hasD1) score += 10;
            }
          }

          // 2. Sutar thickness matching
          if (manifestSutar !== null) {
            if (cSutar !== null) {
              if (manifestSutar === cSutar) {
                score += 50; // Perfect sutar match
              } else {
                score -= 60; // Sutar mismatch
              }
            }
          }

          // 3. Name word overlap
          const words = cleanManifestName.split(' ').filter(w => w.length > 2);
          for (const w of words) {
            if (cCombined.includes(w)) {
              score += 15;
            }
          }

          if (score > highestScore) {
            highestScore = score;
            bestCandidate = c;
          }
        }

        if (bestCandidate && highestScore > -100) {
          return bestCandidate;
        }
      }
    }
  }

  // 6. Generic Substring matching
  const substringMatch = allDbItems.find(i => {
    const dbNorm = normalizeItemSearchText(i.name);
    return dbNorm.includes(cleanManifestName) || cleanManifestName.includes(dbNorm);
  });
  if (substringMatch) return substringMatch;

  // 7. Word overlap matching
  const manifestWords = cleanManifestName.split(' ').filter(w => w.length > 2);
  if (manifestWords.length > 0) {
    let bestCandidate = null;
    let maxOverlap = 0;
    for (const item of allDbItems) {
      const dbNorm = normalizeItemSearchText(item.name);
      const overlap = manifestWords.filter(w => dbNorm.includes(w)).length;
      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        bestCandidate = item;
      }
    }
    if (maxOverlap >= 1 && bestCandidate) {
      return bestCandidate;
    }
  }

  return null;
}

/**
 * Idempotently deducts inventory stock for a gate pass
 * Can be called during creation OR when printing the gate pass slip
 */
export async function deductGatePassStock(gpOrId) {
  let gp = typeof gpOrId === 'object' && gpOrId !== null ? gpOrId : await db.gate_passes.get(Number(gpOrId));
  if (!gp) return null;

  // If already deducted, avoid double deduction
  if (gp.isStockDeducted) {
    return gp;
  }

  const manifest = Array.isArray(gp.manifest) ? gp.manifest : [];
  if (manifest.length === 0) return gp;

  const allDbItems = await db.items.toArray();
  const updatedManifest = [];

  for (const it of manifest) {
    const matchedItem = findMatchingStockItem(it, allDbItems);
    const updatedIt = { ...it };

    if (matchedItem) {
      updatedIt.itemId = matchedItem.id;
      const cat = (matchedItem.category || '').toLowerCase();
      const unit = (it.unit || matchedItem.unit || '').toLowerCase();
      const isPiece = unit.includes('pc') || unit.includes('bag') || cat.includes('accessories') ||
        cat.includes('flower') || cat.includes('panel') || cat.includes('tukri') || cat.includes('kalm');
      const isMeter = unit.includes('meter') || (cat.includes('tile') && !isPiece);
      const isBox = unit.includes('box');
      const qty = Number(it.quantity) || Number(it.totalSqFt) || Number(it.sqFt) ||
        Number(it.billedQuantity) || Number(it.pieces) || Number(it.meters) || 0;

      let dSqFt = 0;
      let dPieces = 0;
      let dBoxes = 0;

      if (isPiece) {
        dPieces = -qty;
        dSqFt = -qty;
      } else if (isMeter) {
        dSqFt = -qty;
      } else if (isBox) {
        dBoxes = -qty;
      } else {
        dSqFt = -qty;
        const pieceArea = (Number(matchedItem.length) || 1) * (Number(matchedItem.width) || 1);
        dPieces = - (Number(it.pieces) || Math.round(qty / (pieceArea > 0 ? pieceArea : 1)) || qty);
      }

      await adjustItemStock(
        matchedItem.id,
        dSqFt,
        dBoxes,
        dPieces,
        'Gate Pass Dispatch',
        gp.gatePassNo,
        `Dispatched via Gate Pass #${gp.gatePassNo} (${gp.vehicleRegNo || gp.vehicleType || 'Factory'}) to ${gp.customerName}`
      );
    }
    updatedManifest.push(updatedIt);
  }

  const now = new Date().toISOString();
  if (gp.id) {
    await db.gate_passes.update(gp.id, {
      manifest: updatedManifest,
      isStockDeducted: true,
      stockDeductedAt: now,
      updatedAt: now
    });
  }

  gp.isStockDeducted = true;
  gp.stockDeductedAt = now;
  gp.manifest = updatedManifest;

  return gp;
}

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
  if (manifest.length === 0) {
    throw new Error('Gate pass requires at least 1 item.');
  }
  let totalPieces = 0;
  let totalSqFt = 0;
  let totalQuantity = 0;

  const sanitizedManifest = manifest.map((item, idx) => {
    const rawQty = item.quantity !== undefined && item.quantity !== "" ? Number(item.quantity) : null;
    const computedQty = rawQty !== null ? rawQty : (Number(item.sqFt || item.totalSqFt) || Number(item.pieces) || 0);
    const qty = Math.max(0, computedQty);
    const pcs = Number(item.pieces) || (item.unit?.toLowerCase().includes("pc") ? qty : 0);
    const sqft = Number(item.sqFt || item.totalSqFt) || (!item.unit || item.unit?.toLowerCase().includes("sq") ? qty : 0);

    totalPieces += pcs || (item.unit?.toLowerCase().includes("pc") ? qty : 0);
    totalSqFt += sqft || (item.unit?.toLowerCase().includes("sq") || !item.unit ? qty : 0);
    totalQuantity += qty;

    return {
      sr: idx + 1,
      itemId: item.itemId || item.id || null,
      category: item.category || "",
      name: item.name || item.itemName || "Marble / Tile Item",
      quantity: qty,
      unit: item.unit || (sqft > 0 ? "Sq.Ft" : "Pcs"),
      thicknessSutar: item.thicknessSutar !== undefined && item.thicknessSutar !== "" ? String(item.thicknessSutar) : "",
      size: item.size || item.dimensions || item.selectedSizePreset || item.standardSize || (item.length && item.width ? `${item.length}×${item.width}` : ""),
      selectedSizePreset: item.selectedSizePreset || "",
      standardSize: item.standardSize || "",
      length: item.length,
      width: item.width,
      meters: item.meters,
      runningFeet: item.runningFeet,
      pieces: pcs || qty,
      sqFt: sqft || qty
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
    totalPieces: Math.round(totalPieces),
    totalSqFt: Number(totalSqFt.toFixed(2)),
    totalQuantity: Number(totalQuantity.toFixed(2)),
    status: data.status || "Dispatched",
    notes: data.notes ? data.notes.trim() : "",
    date: data.date ? data.date.slice(0, 10) : todayDate,
    dispatchDate: now.toISOString(),
    dispatchTime: now.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true }),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    isStockDeducted: false
  };

  const id = await db.gate_passes.add(record);
  record.id = id;

  // Deduct physical yard stock for dispatched goods atomically
  await deductGatePassStock(record);

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
  let totalQuantity = 0;

  const sanitizedManifest = manifest.map((item, idx) => {
    const rawQty = item.quantity !== undefined && item.quantity !== "" ? Number(item.quantity) : null;
    const computedQty = rawQty !== null ? rawQty : (Number(item.sqFt || item.totalSqFt) || Number(item.pieces) || 0);
    const qty = Math.max(0, computedQty);
    const pcs = Number(item.pieces) || (item.unit?.toLowerCase().includes("pc") ? qty : 0);
    const sqft = Number(item.sqFt || item.totalSqFt) || (!item.unit || item.unit?.toLowerCase().includes("sq") ? qty : 0);

    totalPieces += pcs || (item.unit?.toLowerCase().includes("pc") ? qty : 0);
    totalSqFt += sqft || (item.unit?.toLowerCase().includes("sq") || !item.unit ? qty : 0);
    totalQuantity += qty;

    return {
      sr: idx + 1,
      itemId: item.itemId || item.id || null,
      category: item.category || "",
      name: item.name || item.itemName || "Marble / Tile Item",
      quantity: qty,
      unit: item.unit || (sqft > 0 ? "Sq.Ft" : "Pcs"),
      thicknessSutar: item.thicknessSutar !== undefined && item.thicknessSutar !== "" ? String(item.thicknessSutar) : "",
      size: item.size || item.dimensions || "",
      pieces: pcs || qty,
      sqFt: sqft || qty
    };
  });

  return await db.gate_passes.update(Number(id), {
    ...updatedData,
    manifest: sanitizedManifest,
    totalPieces: Math.round(totalPieces),
    totalSqFt: Number(totalSqFt.toFixed(2)),
    totalQuantity: Number(totalQuantity.toFixed(2)),
    updatedAt: now.toISOString()
  });
}

/**
 * Delete a Gate Pass
 */
export async function deleteGatePass(id) {
  const gp = await db.gate_passes.get(Number(id));
  if (gp && Array.isArray(gp.manifest) && gp.isStockDeducted !== false) {
    const allDbItems = await db.items.toArray();
    for (const it of gp.manifest) {
      const matched = it.itemId ? allDbItems.find(i => String(i.id) === String(it.itemId)) : findMatchingStockItem(it, allDbItems);
      if (matched) {
        const qty = Number(it.quantity) || Number(it.totalSqFt) || Number(it.sqFt) || Number(it.billedQuantity) || Number(it.pieces) || Number(it.meters) || 0;
        const cat = (matched.category || '').toLowerCase();
        const unit = (it.unit || matched.unit || '').toLowerCase();
        const isPiece = unit.includes('pc') || unit.includes('bag') || cat.includes('accessories') ||
          cat.includes('flower') || cat.includes('panel') || cat.includes('tukri') || cat.includes('kalm');
        const isMeter = unit.includes('meter') || (cat.includes('tile') && !isPiece);
        const isBox = unit.includes('box');
        const dSqFt = (isPiece || isBox) ? (isPiece ? qty : 0) : qty;
        const dPieces = isPiece ? qty : 0;
        const dBoxes = isBox ? qty : 0;
        await adjustItemStock(
          matched.id,
          dSqFt,
          dBoxes,
          dPieces,
          'Gate Pass Reversal',
          gp.gatePassNo,
          `Cancelled Gate Pass #${gp.gatePassNo}`
        );
      }
    }
  }
  return await db.gate_passes.delete(Number(id));
}
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
          quantity: it.quantity !== undefined && it.quantity !== "" ? it.quantity : (it.sqFt || it.totalSqFt || it.pieces || 0),
          unit: it.unit || (it.totalSqFt || it.sqFt ? "Sq.Ft" : "Pcs"),
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
