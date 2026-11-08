/**
 * printItemFormatter.js
 * Universal, standardized product item formatter for Bill Print and Gate Pass Print.
 * Correctly distinguishes:
 * - Marble (Sq.ft, Sutar, Length × Width)
 * - Marble Accessories (Kakri, Kalm - Sq.ft / Pieces)
 * - Border & Kali Patti (Running Feet / Sq.ft)
 * - Tiles (Meter, Dimensions e.g. 24×24)
 * - Tile Accessories (Gola, Spacer, Filling, Bond - Pieces / Bags)
 * - Panels (Pieces, Dimensions e.g. 12×24, 24×48)
 * - Flower (Pieces, Dimensions e.g. 12×12, 24×24, 3×3)
 * - Other Accessories (Sink, Basin, Seat, Commode - Pieces)
 * - Custom Categories (Granite, etc.)
 */

export function getItemCategoryType(item) {
  if (!item) return 'MARBLE';
  const cat = (item.category || '').toLowerCase();
  const name = (item.name || item.itemName || '').toLowerCase();
  const unit = (item.unit || '').toLowerCase();

  if (
    cat.includes('tile accessories') ||
    (cat.includes('accessories') && (name.includes('gola') || name.includes('spacer') || name.includes('filling') || name.includes('bond'))) ||
    name.includes('gola') || name.includes('spacer') || name.includes('filling') || name.includes('bond')
  ) {
    return 'TILE_ACCESSORIES';
  }

  if (
    cat.includes('other accessories') ||
    name.includes('sink') || name.includes('basin') || name.includes('bason') ||
    name.includes('seat') || name.includes('combod') || name.includes('commode')
  ) {
    return 'OTHER_ACCESSORIES';
  }

  if (
    cat.includes('marble accessories') ||
    cat.includes('kakri') || cat.includes('kalm') ||
    name.includes('kakri') || name.includes('kalm')
  ) {
    return 'MARBLE_ACCESSORIES';
  }

  if (cat.includes('tile') || unit.includes('meter')) {
    return 'TILES';
  }

  if (cat.includes('border') || name.includes('border')) {
    return 'BORDER';
  }

  if (cat.includes('kali patti') || name.includes('kali patti') || name.includes('patti')) {
    return 'KALI_PATTI';
  }

  if (cat.includes('flower') || name.includes('flower')) {
    return 'FLOWER';
  }

  if (cat.includes('panel') || name.includes('panel')) {
    return 'PANELS';
  }

  if (unit.includes('piece') || unit.includes('pcs')) {
    return 'PIECE_GENERIC';
  }

  return 'MARBLE';
}

export function formatUrduUnit(unitStr, catType) {
  if (!unitStr) {
    if (catType === 'TILES') return 'میٹر';
    if (catType === 'BORDER' || catType === 'KALI_PATTI') return 'رننگ فٹ';
    if (
      catType === 'TILE_ACCESSORIES' ||
      catType === 'OTHER_ACCESSORIES' ||
      catType === 'FLOWER' ||
      catType === 'PANELS' ||
      catType === 'PIECE_GENERIC'
    ) return 'عدد';
    return 'مربع فٹ';
  }

  const u = String(unitStr).toLowerCase().trim();
  if (u.includes('meter') || u === 'm') return 'میٹر';
  if (u.includes('r.ft') || u.includes('running')) return 'رننگ فٹ';
  if (u.includes('piece') || u.includes('pcs') || u === 'pc') return 'عدد';
  if (u.includes('box')) return 'ڈبہ';
  if (u.includes('bag')) return 'بیگ';
  if (u.includes('pack')) return 'پیکٹ';
  if (u.includes('sq') || u.includes('ft') || u.includes('feet')) return 'مربع فٹ';
  return unitStr;
}

export function formatCleanSize(item, catType) {
  if (!item) return '-';

  // 0. If customSize is explicitly provided
  if (item.customSize && String(item.customSize).trim() !== '' && String(item.customSize).trim() !== 'Custom') {
    return String(item.customSize).replace(/[\uFFFD\u00BF]/g, '×').trim();
  }

  // 1. If explicit preset exists and is clean
  if (item.selectedSizePreset && item.selectedSizePreset !== 'Standard' && item.selectedSizePreset !== 'معیاری') {
    return String(item.selectedSizePreset)
      .replace(/[\uFFFD\u00BF]/g, '×')
      .trim();
  }

  // 2. Border & Kali Patti: width in inches is the standard size
  if (catType === 'BORDER' || catType === 'KALI_PATTI') {
    const w = Number(item.width);
    if (!isNaN(w) && w > 0) {
      return `${w} in`;
    }
  }

  // 3. If length & width exist and are meaningful
  const l = Number(item.length);
  const w = Number(item.width);
  if (!isNaN(l) && !isNaN(w) && l > 0 && w > 0) {
    return `${l} × ${w}`;
  }

  // 4. If standardSize exists in record
  if (item.standardSize && item.standardSize !== '-' && item.standardSize !== 'Standard') {
    return String(item.standardSize)
      .replace(/[\uFFFD\u00BF]/g, '×')
      .replace(/A-\s*/g, '× ')
      .trim();
  }

  // 5. If item.size exists and is valid
  if (item.size && item.size !== '-' && item.size !== 'Standard') {
    return String(item.size).replace(/[\uFFFD\u00BF]/g, '×').trim();
  }

  // 6. Fallback for specific categories
  if (catType === 'TILES') return '-';
  if (catType === 'TILE_ACCESSORIES' || catType === 'OTHER_ACCESSORIES') return '-';

  return '-';
}

export function formatCleanDetails(item, catType) {
  if (!item) return '-';

  // 1. Marble: Thickness in Sutar is primary specification
  if (catType === 'MARBLE') {
    const sutar = Number(item.thicknessSutar || item.sutarThickness);
    if (!isNaN(sutar) && sutar > 0) {
      return `${sutar} سوتر`;
    }
    return 'معیاری سلیب';
  }

  // 2. Marble Accessories: Sutar or dimension detail
  if (catType === 'MARBLE_ACCESSORIES') {
    const sutar = Number(item.thicknessSutar || item.sutarThickness);
    if (!isNaN(sutar) && sutar > 0) {
      return `${sutar} سوتر`;
    }
    const nameLower = (item.name || '').toLowerCase();
    if (nameLower.includes('kakri')) return 'ککڑی ماربل';
    if (nameLower.includes('kalm')) return 'قلم پٹی';
    return '-';
  }

  // 3. Border / Kali Patti
  if (catType === 'BORDER' || catType === 'KALI_PATTI') {
    const sutar = Number(item.thicknessSutar || item.sutarThickness);
    if (!isNaN(sutar) && sutar > 0) {
      return `${sutar} سوتر`;
    }
    return 'رننگ فٹ پٹی';
  }

  // 4. Tiles: NEVER show Sutar. Show boxes if present, or -
  if (catType === 'TILES') {
    const boxes = Number(item.boxes);
    if (!isNaN(boxes) && boxes > 0) {
      return `${boxes} کارٹن`;
    }
    return '-';
  }

  // 5. Tile Accessories: NEVER show Sutar
  if (catType === 'TILE_ACCESSORIES') {
    const nameLower = (item.name || '').toLowerCase();
    if (nameLower.includes('gola')) return 'گولا پٹی';
    if (nameLower.includes('spacer')) return 'ٹائل اسپیسر';
    if (nameLower.includes('filling')) return 'جوائنٹ فلنگ';
    if (nameLower.includes('bond')) return 'ٹائل بونڈ';
    return '-';
  }

  // 6. Other Accessories: NEVER show Sutar
  if (catType === 'OTHER_ACCESSORIES') {
    const nameLower = (item.name || '').toLowerCase();
    if (nameLower.includes('sink')) return 'سنگ مرمر سنک';
    if (nameLower.includes('basin') || nameLower.includes('bason')) return 'وینٹی بیسن';
    if (nameLower.includes('seat')) return 'ٹوالیٹ سیٹ';
    if (nameLower.includes('combod') || nameLower.includes('commode')) return 'کموڈ';
    return 'سینیٹری';
  }

  // 7. Panels & Flower
  if (catType === 'PANELS') return 'وال پینل';
  if (catType === 'FLOWER') return 'فرشی پھول';

  // 8. Custom Categories: show sutar only if valid
  const sutar = Number(item.thicknessSutar || item.sutarThickness);
  if (!isNaN(sutar) && sutar > 0) {
    return `${sutar} سوتر`;
  }

  return '-';
}

/**
 * Universal formatter for an item row for Bill Print & Gate Pass
 */
export function formatPrintRow(item, idx = 0) {
  const catType = getItemCategoryType(item);

  // Clean Quality / Item Name
  const cleanName = (item.name || item.itemName || 'ماربل')
    .replace(/\s*\([\u0600-\u06FF\s]+\)/g, '')
    .trim();

  // Size
  const size = formatCleanSize(item, catType);

  // Details / Measurement
  const details = formatCleanDetails(item, catType);

  // Quantity & Unit determination (Honoring explicit item.quantity from Gate Pass first!)
  let quantity = 0;
  let unit = 'مربع فٹ';
  let totalMeasurement = '';

  const hasExplicitQty = item.quantity !== undefined && item.quantity !== "" && item.quantity !== null && !isNaN(Number(item.quantity));

  if (catType === 'TILES') {
    quantity = hasExplicitQty ? Number(item.quantity) : Number(item.meters || item.billedQuantity || item.totalSqFt || 0);
    unit = 'میٹر';
    totalMeasurement = `${quantity} میٹر`;
  } else if (catType === 'BORDER' || catType === 'KALI_PATTI') {
    quantity = hasExplicitQty ? Number(item.quantity) : Number(item.runningFeet || item.billedQuantity || item.totalSqFt || 0);
    const isSq = (item.unit || '').toLowerCase().includes('sq');
    unit = isSq ? 'مربع فٹ' : 'رننگ فٹ';
    totalMeasurement = `${quantity} ${unit}`;
  } else if (
    catType === 'TILE_ACCESSORIES' ||
    catType === 'OTHER_ACCESSORIES' ||
    catType === 'FLOWER' ||
    catType === 'PANELS' ||
    catType === 'PIECE_GENERIC'
  ) {
    quantity = hasExplicitQty ? Number(item.quantity) : Number(item.pieces || item.billedQuantity || 1);
    unit = formatUrduUnit(item.unit, catType);
    if (unit === 'مربع فٹ') unit = 'عدد'; // Force pieces for accessories/flower/panels
    totalMeasurement = `${quantity} ${unit}`;
  } else if (catType === 'MARBLE_ACCESSORIES') {
    const isPiece = (item.unit || '').toLowerCase().includes('piece') || (item.unit || '').toLowerCase().includes('pc');
    if (isPiece) {
      quantity = hasExplicitQty ? Number(item.quantity) : Number(item.pieces || item.billedQuantity || 1);
      unit = 'عدد';
      totalMeasurement = `${quantity} عدد`;
    } else {
      quantity = hasExplicitQty ? Number(item.quantity) : Number(item.totalSqFt || item.billedQuantity || item.pieces || 0);
      unit = 'مربع فٹ';
      totalMeasurement = `${quantity} مربع فٹ`;
    }
  } else {
    // Marble, Granite & Custom Stone Categories
    const unitFormatted = formatUrduUnit(item.unit, catType);
    const isPiece = (item.unit || '').toLowerCase().includes('piece') || unitFormatted === 'عدد';
    if (isPiece) {
      quantity = hasExplicitQty ? Number(item.quantity) : Number(item.pieces || item.billedQuantity || 1);
      unit = 'عدد';
      totalMeasurement = `${quantity} عدد`;
    } else {
      quantity = hasExplicitQty ? Number(item.quantity) : Number(item.totalSqFt || item.billedQuantity || (item.pieces && item.length && item.width ? item.pieces * item.length * item.width : 0) || 0);
      unit = unitFormatted || 'مربع فٹ';
      totalMeasurement = `${quantity} ${unit}`;
    }
  }

  // Rate & Amount (for bill print)
  const rate = Number(item.ratePerSqFt || item.rate || 0);
  const amount = Number(item.amount !== undefined ? item.amount : (quantity * rate));

  return {
    sr: idx + 1,
    name: cleanName,
    size: size,
    details: details,
    quantity: quantity,
    unit: unit,
    totalMeasurement: totalMeasurement,
    rate: rate,
    amount: amount,
    catType: catType
  };
}
