import { db } from '../db/index.js';

export const CATEGORY_UNITS = [
  'Sq.ft',
  'Running Feet',
  'Meter',
  'Pieces',
  'Bags',
  'Boxes',
  'Other'
];

export const MEASUREMENT_METHODS = [
  'Length × Width',
  'Length Only',
  'Fixed Quantity',
  'Manual Measurement'
];

export const OPTIONAL_ATTRIBUTES = [
  'Size',
  'Length',
  'Width',
  'Thickness/Sutar'
];

export const DEFAULT_CATEGORIES = [
  {
    id: 'marble',
    name: 'Marble',
    isDefault: true,
    defaultUnit: 'Sq.ft',
    measurementMethod: 'Length × Width',
    attributes: ['Size', 'Length', 'Width', 'Thickness/Sutar'],
    description: 'Natural stone marble slabs, tiles, floor and wall cuts',
    codePrefix: 'MB',
    isActive: true
  },
  {
    id: 'tiles',
    name: 'Tiles',
    isDefault: true,
    defaultUnit: 'Meter',
    measurementMethod: 'Fixed Quantity',
    attributes: ['Size'],
    description: 'Ceramic & porcelain floor/wall tiles per square meter',
    codePrefix: 'TL',
    isActive: true
  },
  {
    id: 'kakri',
    name: 'Kakri',
    isDefault: true,
    defaultUnit: 'Pieces',
    measurementMethod: 'Fixed Quantity',
    attributes: ['Size', 'Length', 'Width'],
    description: 'Marble Kakri cut stone (2×2, 3×3, 6×6, Custom) sold in Pieces',
    codePrefix: 'KK',
    isActive: true
  },
  {
    id: 'kalm',
    name: 'Kalm',
    isDefault: true,
    defaultUnit: 'Pieces',
    measurementMethod: 'Fixed Quantity',
    attributes: ['Size', 'Length', 'Width'],
    description: 'Marble Kalm cut strip (1 inch, 2 inch, 3 inch, Custom) sold in Pieces',
    codePrefix: 'KL',
    isActive: true
  },
  {
    id: 'tile-accessories',
    name: 'Tile Accessories',
    isDefault: true,
    defaultUnit: 'Pieces',
    measurementMethod: 'Fixed Quantity',
    attributes: ['Size'],
    description: 'Tile accessories: Gola, Spacer, Filling, Bond',
    codePrefix: 'TA',
    isActive: true
  },
  {
    id: 'other-accessories',
    name: 'Other Accessories',
    isDefault: true,
    defaultUnit: 'Pieces',
    measurementMethod: 'Fixed Quantity',
    attributes: ['Size'],
    description: 'Sanitary fittings: Combod, Seat, Bason, Sink',
    codePrefix: 'OA',
    isActive: true
  },
  {
    id: 'borders',
    name: 'Borders',
    isDefault: true,
    defaultUnit: 'Sq.ft',
    measurementMethod: 'Length Only',
    attributes: ['Size', 'Length', 'Width'],
    description: 'Marble decorative borders (3 inch, 6 inch)',
    codePrefix: 'BR',
    isActive: true
  },
  {
    id: 'kali-patti',
    name: 'Kali Patti',
    isDefault: true,
    defaultUnit: 'Sq.ft',
    measurementMethod: 'Length Only',
    attributes: ['Size', 'Length', 'Width'],
    description: 'Black stone accent Patti (2 inch, 3 inch)',
    codePrefix: 'KP',
    isActive: true
  },
  {
    id: 'panels',
    name: 'Panels',
    isDefault: true,
    defaultUnit: 'Pieces',
    measurementMethod: 'Fixed Quantity',
    attributes: ['Size'],
    description: 'Islamic & 3D wall elevation decorative panels (12 × 24)',
    codePrefix: 'PN',
    isActive: true
  },
  {
    id: 'flowers',
    name: 'Flowers',
    isDefault: true,
    defaultUnit: 'Pieces',
    measurementMethod: 'Fixed Quantity',
    attributes: ['Size'],
    description: 'Marble medallion flower designs (12x12, 24x24, 3x3, 4x4)',
    codePrefix: 'FL',
    isActive: true
  }
];

/**
 * Fetch all custom categories from DB
 */
export async function getAllCustomCategories() {
  if (!db.categories) return [];
  try {
    return await db.categories.toArray();
  } catch (err) {
    console.error('Error fetching custom categories:', err);
    return [];
  }
}

/**
 * Fetch active custom categories from DB
 */
export async function getActiveCustomCategories() {
  const all = await getAllCustomCategories();
  return all.filter(c => c.isActive !== false);
}

/**
 * Get all active categories (built-in + active custom)
 */
export async function getAllActiveCategories() {
  const custom = await getActiveCustomCategories();
  return [...DEFAULT_CATEGORIES, ...custom];
}

/**
 * Get all active category names for dropdowns
 */
export async function getAllActiveCategoryNames() {
  const active = await getAllActiveCategories();
  return active.map(c => c.name);
}

/**
 * Normalize and retrieve category configuration (unit, measurement method, attributes)
 */
export function getCategoryConfigSync(categoryName, customCategories = []) {
  if (!categoryName) {
    return DEFAULT_CATEGORIES[0];
  }
  const clean = String(categoryName).trim().toLowerCase();

  // 1. Check custom categories list
  const foundCustom = customCategories.find(c => (c.name || '').trim().toLowerCase() === clean);
  if (foundCustom) {
    return {
      name: foundCustom.name,
      defaultUnit: foundCustom.defaultUnit || 'Sq.ft',
      measurementMethod: foundCustom.measurementMethod || 'Length × Width',
      attributes: foundCustom.attributes || ['Size', 'Length', 'Width'],
      description: foundCustom.description || '',
      codePrefix: foundCustom.codePrefix || (foundCustom.name.slice(0, 2).toUpperCase()),
      isDefault: false,
      isActive: foundCustom.isActive !== false
    };
  }

  // 2. Check built-in categories
  const foundDefault = DEFAULT_CATEGORIES.find(c => c.name.toLowerCase() === clean);
  if (foundDefault) {
    return foundDefault;
  }

  // 3. Fallback / legacy compatibility
  if (clean === 'kakri' || clean === 'kalm') {
    return {
      name: categoryName,
      defaultUnit: 'Sq.ft',
      measurementMethod: 'Length × Width',
      attributes: ['Size', 'Length', 'Width', 'Thickness/Sutar'],
      codePrefix: clean === 'kakri' ? 'KK' : 'KL',
      isDefault: false,
      isActive: true
    };
  }
  if (clean === 'granite') {
    return {
      name: 'Granite',
      defaultUnit: 'Sq.ft',
      measurementMethod: 'Length × Width',
      attributes: ['Size', 'Length', 'Width', 'Thickness/Sutar'],
      codePrefix: 'GR',
      isDefault: false,
      isActive: true
    };
  }

  // Generic fallback for any other custom category
  return {
    name: categoryName,
    defaultUnit: 'Sq.ft',
    measurementMethod: 'Length × Width',
    attributes: ['Size', 'Length', 'Width'],
    codePrefix: categoryName.slice(0, 2).toUpperCase() || 'IT',
    isDefault: false,
    isActive: true
  };
}

/**
 * Standardize category units between storage and UI
 */
export function normalizeCategoryUnit(unit) {
  if (!unit) return 'Sq. Ft.';
  const u = String(unit).trim().toLowerCase();
  if (u === 'sq.ft' || u === 'sq.ft.' || u === 'sqft' || u === 'sq. ft.' || u === 'sqft.') return 'Sq. Ft.';
  if (u === 'meter' || u === 'meters') return 'Meters';
  if (u === 'running feet' || u === 'r.ft' || u === 'rft' || u === 'r.ft.') return 'Running Feet';
  if (u === 'pieces' || u === 'piece' || u === 'pcs') return 'Pieces';
  if (u === 'bags' || u === 'bag') return 'Bags';
  if (u === 'boxes' || u === 'box') return 'Boxes';
  if (u === 'other') return 'Other';
  return unit;
}

/**
 * Get effective category configuration resolving all properties
 */
export function getEffectiveCategoryConfig(categoryName, customCategories = []) {
  const cfg = getCategoryConfigSync(categoryName, customCategories);
  const normUnit = normalizeCategoryUnit(cfg.defaultUnit);
  const attributes = Array.isArray(cfg.attributes) ? cfg.attributes : [];
  const catName = cfg.name || categoryName || '';
  const cleanCat = catName.trim().toLowerCase();

  const hasSutar = attributes.includes('Thickness/Sutar') ||
    cleanCat === 'marble' ||
    cleanCat === 'granite';

  let method = cfg.measurementMethod;
  if (!method) {
    if (normUnit === 'Running Feet' || cleanCat === 'borders' || cleanCat === 'kali patti') {
      method = 'Length Only';
    } else if (['Pieces', 'Bags', 'Boxes'].includes(normUnit) || ['kakri', 'kalm', 'marble accessories', 'flowers', 'panels', 'tile accessories', 'other accessories', 'accessories'].includes(cleanCat)) {
      method = 'Fixed Quantity';
    } else if (normUnit === 'Meters' || cleanCat === 'tiles') {
      method = 'Fixed Quantity';
    } else {
      method = 'Length × Width';
    }
  }

  return {
    ...cfg,
    normUnit,
    hasSutar,
    method
  };
}

/**
 * Async version of getCategoryConfig that pulls custom categories from DB if not provided
 */
export async function getCategoryConfig(categoryName) {
  const custom = await getAllCustomCategories();
  return getCategoryConfigSync(categoryName, custom);
}

/**
 * Create a new custom category
 */
export async function createCategory({
  name,
  description = '',
  defaultUnit = 'Sq.ft',
  measurementMethod = 'Length × Width',
  attributes = ['Size', 'Length', 'Width'],
  isActive = true
}) {
  const trimmedName = (name || '').trim();
  if (!trimmedName) {
    throw new Error('Category name is required.');
  }

  const cleanLower = trimmedName.toLowerCase();

  // Duplicate check against default categories
  const duplicateDefault = DEFAULT_CATEGORIES.some(c => c.name.toLowerCase() === cleanLower);
  if (duplicateDefault) {
    throw new Error(`Category "${trimmedName}" already exists as a default system category.`);
  }

  // Duplicate check against DB custom categories
  const existingCustom = await getAllCustomCategories();
  const duplicateCustom = existingCustom.some(c => (c.name || '').trim().toLowerCase() === cleanLower);
  if (duplicateCustom) {
    throw new Error(`Category "${trimmedName}" already exists.`);
  }

  // Generate a 2-3 letter code prefix
  const words = trimmedName.split(/\s+/);
  let codePrefix = '';
  if (words.length > 1) {
    codePrefix = (words[0][0] + words[1][0]).toUpperCase();
  } else {
    codePrefix = trimmedName.slice(0, 2).toUpperCase();
  }

  const newDoc = {
    name: trimmedName,
    description: description.trim(),
    defaultUnit,
    measurementMethod,
    attributes: Array.isArray(attributes) ? attributes : ['Size'],
    codePrefix,
    isActive: isActive !== false,
    createdAt: new Date().toISOString()
  };

  const id = await db.categories.add(newDoc);
  return { id, ...newDoc };
}

/**
 * Toggle category active/inactive status (Soft delete / deactivate)
 */
export async function toggleCategoryStatus(id, newStatus) {
  if (!db.categories) return;
  await db.categories.update(id, { isActive: Boolean(newStatus) });
}

/**
 * Update an existing category (custom or default)
 */
export async function updateCategory(idOrName, {
  name,
  description = '',
  defaultUnit = 'Sq.ft',
  measurementMethod = 'Length × Width',
  attributes = ['Size', 'Length', 'Width']
}) {
  if (!db.categories) return;
  const trimmedName = (name || '').trim();
  if (!trimmedName) throw new Error('Category name is required.');

  // Check if updating by numeric/string ID in db.categories
  let existing = null;
  if (typeof idOrName === 'number' || (typeof idOrName === 'string' && /^\d+$/.test(idOrName))) {
    existing = await db.categories.get(Number(idOrName));
  } else if (typeof idOrName === 'string') {
    existing = await db.categories.where('name').equalsIgnoreCase(idOrName).first();
  }

  const words = trimmedName.split(/\s+/);
  const codePrefix = words.length > 1
    ? (words[0][0] + words[1][0]).toUpperCase()
    : trimmedName.slice(0, 2).toUpperCase();

  if (existing) {
    await db.categories.update(existing.id, {
      name: trimmedName,
      description: description.trim(),
      defaultUnit,
      measurementMethod,
      attributes: Array.isArray(attributes) ? attributes : ['Size'],
      codePrefix,
      updatedAt: new Date().toISOString()
    });
    return { ...existing, name: trimmedName, defaultUnit, measurementMethod, attributes, description, codePrefix };
  } else {
    // If it was a default category not yet in DB, add it as an override
    const newDoc = {
      name: trimmedName,
      originalName: typeof idOrName === 'string' ? idOrName : trimmedName,
      description: description.trim(),
      defaultUnit,
      measurementMethod,
      attributes: Array.isArray(attributes) ? attributes : ['Size'],
      codePrefix,
      isDefaultOverride: true,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    const newId = await db.categories.add(newDoc);
    return { id: newId, ...newDoc };
  }
}

/**
 * Delete a category (custom or default)
 */
export async function deleteCategory(idOrName) {
  if (!db.categories) return;
  let existing = null;
  if (typeof idOrName === 'number' || (typeof idOrName === 'string' && /^\d+$/.test(idOrName))) {
    existing = await db.categories.get(Number(idOrName));
  } else if (typeof idOrName === 'string') {
    existing = await db.categories.where('name').equalsIgnoreCase(idOrName).first();
  }

  if (existing) {
    // Delete from db.categories
    await db.categories.delete(existing.id);
  } else if (typeof idOrName === 'string') {
    // If it's a default category, insert a soft-deleted marker so it won't appear
    await db.categories.add({
      name: idOrName,
      isDeleted: true,
      createdAt: new Date().toISOString()
    });
  }
}

/**
 * Get all manageable categories (combining default system categories and DB custom categories)
 */
export function getAllManageableCategoriesSync(customCategories = []) {
  const deletedNames = new Set(
    customCategories.filter(c => c.isDeleted).map(c => (c.name || '').trim().toLowerCase())
  );

  const overriddenNames = new Map();
  customCategories.filter(c => !c.isDeleted).forEach(c => {
    overriddenNames.set((c.name || '').trim().toLowerCase(), c);
    if (c.originalName) {
      overriddenNames.set(c.originalName.trim().toLowerCase(), c);
    }
  });

  const result = [];
  const addedNames = new Set();

  // 1. Process default categories
  DEFAULT_CATEGORIES.forEach(def => {
    const key = def.name.trim().toLowerCase();
    if (deletedNames.has(key)) return;

    if (overriddenNames.has(key)) {
      const override = overriddenNames.get(key);
      result.push({
        ...def,
        ...override,
        isDefault: true
      });
      addedNames.add((override.name || def.name).trim().toLowerCase());
    } else {
      result.push({ ...def });
      addedNames.add(key);
    }
  });

  // 2. Add custom categories
  customCategories.forEach(c => {
    if (c.isDeleted) return;
    const key = (c.name || '').trim().toLowerCase();
    if (!addedNames.has(key)) {
      result.push({
        ...c,
        isDefault: false
      });
      addedNames.add(key);
    }
  });

  return result;
}

