/**
 * printItemFormatter.js
 * Universal, standardized product item formatter for Bill Print and Gate Pass Print.
 * Correctly distinguishes:
 * - Marble (Sq.ft, Sutar, Length × Width)
 * - Marble Accessories (Tukri, Kalm - Sq.ft / Pieces)
 * - Border & Kali Patti (Running Feet / Sq.ft)
 * - Tiles (Meter, Dimensions e.g. 24×24)
 * - Tile Accessories (Gola, Spacer, Filling, Bond - Pieces / Bags)
 * - Panels (Pieces, Dimensions e.g. 12×24, 24×48)
 * - Flower (Pieces, Dimensions e.g. 12×12, 24×24, 3×3)
 * - Other Accessories (Sink, Basin, Seat, Commode - Pieces)
 * - Custom Categories (Granite, etc.)
 */

const BUILTIN_CATEGORY_KEYS = new Set([
  'marble',
  'tiles',
  'tile',
  'tile accessories',
  'other accessories',
  'marble accessories',
  'accessories',
  'borders',
  'border',
  'kali patti',
  'flowers',
  'flower',
  'panels',
  'panel',
  'tukri',
  'kakri',
  'kalm'
]);

export function findCustomCategoryConfig(item, customCategories = []) {
  if (!item || !Array.isArray(customCategories) || customCategories.length === 0) return null;
  const cat = (item.category || '').trim().toLowerCase();
  if (!cat || BUILTIN_CATEGORY_KEYS.has(cat)) return null;
  return customCategories.find(
    c => c && c.isActive !== false && (c.name || '').trim().toLowerCase() === cat
  ) || null;
}

export function getItemCategoryType(item, customCategories = []) {
  if (!item) return 'MARBLE';
  if (findCustomCategoryConfig(item, customCategories)) {
    return 'CUSTOM';
  }
  const cat = (item.category || '').toLowerCase();
  const name = (item.name || item.itemName || '').toLowerCase();
  const unit = (item.unit || '').toLowerCase();

  if (cat.includes('tile accessories')) return 'TILE_ACCESSORIES';
  if (cat.includes('other accessories') || cat.trim() === 'accessories') return 'OTHER_ACCESSORIES';
  if (cat.includes('kali patti') || cat.includes('kali')) return 'KALI_PATTI';
  if (cat === 'border' || cat === 'borders') return 'BORDER';
  if (cat === 'flower' || cat === 'flowers') return 'FLOWER';
  if (cat === 'panel' || cat === 'panels') return 'PANELS';

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
    cat.includes('tukri') || cat.includes('kakri') || cat.includes('kalm') ||
    name.includes('tukri') || name.includes('kakri') || name.includes('kalm')
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

export function formatCleanDetails(item, catType, customCategories = []) {
  if (!item) return '';

  // 1. Marble: Thickness in Sutar is primary specification
  if (catType === 'MARBLE') {
    const sutar = Number(item.thicknessSutar || item.sutarThickness);
    if (!isNaN(sutar) && sutar > 0) {
      return `${sutar} سوتر`;
    }
    return 'معیاری سلیب';
  }

  // 2. New Custom Categories: Format strictly according to New Category Form settings
  if (catType === 'CUSTOM') {
    const customCat = findCustomCategoryConfig(item, customCategories);
    if (!customCat) return '';

    const attrs = Array.isArray(customCat.attributes) ? customCat.attributes : [];
    const method = customCat.measurementMethod || '';
    const desc = (customCat.description || '').trim();
    const parts = [];

    if (attrs.includes('Thickness/Sutar')) {
      const sutar = Number(item.thicknessSutar || item.sutarThickness);
      if (!isNaN(sutar) && sutar > 0) {
        parts.push(`${sutar} سوتر`);
      }
    }

    const len = Number(item.length);
    const wid = Number(item.width);
    if (method === 'Length × Width' || (attrs.includes('Length') && attrs.includes('Width'))) {
      if (!isNaN(len) && len > 0 && !isNaN(wid) && wid > 0) {
        if (!attrs.includes('Thickness/Sutar') || parts.length === 0) {
          parts.push(`${len} × ${wid} فٹ`);
        }
      }
    } else if (method === 'Length Only' || (attrs.includes('Length') && !attrs.includes('Width'))) {
      const lenVal = Number(item.runningFeet || item.length);
      if (!isNaN(lenVal) && lenVal > 0) {
        parts.push(`${lenVal} فٹ لمبائی`);
      }
    } else if (method === 'Manual Measurement') {
      const measVal = Number(item.totalSqFt || item.billedQuantity || item.meters || item.runningFeet);
      if (!isNaN(measVal) && measVal > 0) {
        const unitLabel = item.unit || customCat.defaultUnit || '';
        parts.push(unitLabel ? `${measVal} ${unitLabel}` : `${measVal}`);
      }
    } else if (method === 'Fixed Quantity') {
      const boxes = Number(item.boxes);
      if ((customCat.defaultUnit === 'Boxes' || item.unit === 'Box' || item.unit === 'Boxes') && !isNaN(boxes) && boxes > 0) {
        parts.push(`${boxes} کارٹن`);
      }
    }

    if (parts.length === 0 && attrs.includes('Size')) {
      const sz = (item.selectedSizePreset || item.standardSize || item.size || '').toString().trim();
      if (sz && sz !== '-' && sz !== 'Standard') {
        parts.push(sz);
      }
    }

    if (parts.length === 0 && desc) {
      parts.push(desc);
    }

    return parts.join(' • ');
  }

  // 3. Built-in non-marble categories (Kali Patti, Borders, Flowers, Panels, Tukri, Kalm, Tiles, Tile Accessories, Other Accessories):
  // Nothing should appear in پیمائش / تفصیل column on Bill Print.
  return '';
}

/**
 * Universal formatter for an item row for Bill Print & Gate Pass
 */
export function formatPrintRow(item, idx = 0, customCategories = []) {
  const catType = getItemCategoryType(item, customCategories);

  // Clean Quality / Item Name
  const cleanName = (item.name || item.itemName || 'ماربل')
    .replace(/\s*\([\u0600-\u06FF\s]+\)/g, '')
    .trim();

  // Size
  const size = formatCleanSize(item, catType);

  // Details / Measurement
  const details = formatCleanDetails(item, catType, customCategories);

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
  } else if (catType === 'CUSTOM') {
    const customCat = findCustomCategoryConfig(item, customCategories);
    const rawUnit = item.unit || customCat?.defaultUnit || 'Sq. Ft.';
    const unitLower = rawUnit.toLowerCase();
    const unitFormatted = formatUrduUnit(rawUnit, catType);

    if (unitLower.includes('meter')) {
      quantity = hasExplicitQty ? Number(item.quantity) : Number(item.meters || item.billedQuantity || item.totalSqFt || 0);
      unit = 'میٹر';
    } else if (unitLower.includes('running') || unitLower.includes('r.ft')) {
      quantity = hasExplicitQty ? Number(item.quantity) : Number(item.runningFeet || item.billedQuantity || item.totalSqFt || 0);
      unit = 'رننگ فٹ';
    } else if (unitLower.includes('piece') || unitLower.includes('pc')) {
      quantity = hasExplicitQty ? Number(item.quantity) : Number(item.pieces || item.billedQuantity || 1);
      unit = 'عدد';
    } else if (unitLower.includes('box')) {
      quantity = hasExplicitQty ? Number(item.quantity) : Number(item.boxes || item.billedQuantity || item.pieces || 1);
      unit = 'کارٹن';
    } else if (unitLower.includes('bag')) {
      quantity = hasExplicitQty ? Number(item.quantity) : Number(item.billedQuantity || item.pieces || item.totalSqFt || 1);
      unit = unitFormatted !== '-' && unitFormatted !== 'مربع فٹ' ? unitFormatted : 'بیگ';
    } else {
      quantity = hasExplicitQty ? Number(item.quantity) : Number(item.billedQuantity || item.totalSqFt || (item.pieces && item.length && item.width ? item.pieces * item.length * item.width : 0) || item.pieces || 0);
      unit = unitFormatted || rawUnit || 'مربع فٹ';
    }
    totalMeasurement = `${quantity} ${unit}`;
  } else {
    // Marble
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
