import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/index.js';
import {
  X,
  Layers,
  Plus,
  Check,
  AlertCircle,
  Edit2,
  Trash2,
  Save
} from 'lucide-react';
import {
  CATEGORY_UNITS,
  MEASUREMENT_METHODS,
  OPTIONAL_ATTRIBUTES,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllManageableCategoriesSync
} from '../services/categoryService.js';

export default function CategoryManagementModal({ isOpen, onClose, onCategoryCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultUnit, setDefaultUnit] = useState('Sq.ft');
  const [measurementMethod, setMeasurementMethod] = useState('Length × Width');
  const [selectedAttributes, setSelectedAttributes] = useState(['Size', 'Length', 'Width']);
  const [editingCategory, setEditingCategory] = useState(null); // null or category object
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Live Query custom categories from DB
  const customCategories = useLiveQuery(() => {
    if (!db.categories) return [];
    return db.categories.toArray();
  }, []) || [];

  const allManageableCategories = getAllManageableCategoriesSync(customCategories);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setDescription('');
    setDefaultUnit('Sq.ft');
    setMeasurementMethod('Length × Width');
    setSelectedAttributes(['Size', 'Length', 'Width']);
    setEditingCategory(null);
    setError('');
    setSuccess('');
  };

  const handleToggleAttribute = (attr) => {
    if (selectedAttributes.includes(attr)) {
      setSelectedAttributes(selectedAttributes.filter(a => a !== attr));
    } else {
      setSelectedAttributes([...selectedAttributes, attr]);
    }
  };

  const handleMeasurementMethodChange = (method) => {
    setMeasurementMethod(method);
    if (method === 'Length × Width') {
      setSelectedAttributes(['Size', 'Length', 'Width']);
      if (defaultUnit === 'Pieces' || defaultUnit === 'Bags') setDefaultUnit('Sq.ft');
    } else if (method === 'Length Only') {
      setSelectedAttributes(['Size', 'Length', 'Width']);
      setDefaultUnit('Running Feet');
    } else if (method === 'Fixed Quantity') {
      setSelectedAttributes(['Size']);
      if (defaultUnit === 'Sq.ft' || defaultUnit === 'Running Feet') setDefaultUnit('Pieces');
    }
  };

  const handleStartEdit = (cat) => {
    setEditingCategory(cat);
    setName(cat.name || '');
    setDescription(cat.description || '');
    setDefaultUnit(cat.defaultUnit || 'Sq.ft');
    setMeasurementMethod(cat.measurementMethod || 'Length × Width');
    setSelectedAttributes(Array.isArray(cat.attributes) ? cat.attributes : ['Size']);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (cat) => {
    const confirmMsg = `Are you sure you want to delete category "${cat.name}"? This will remove it from category dropdowns.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteCategory(cat.id || cat.name);
      setSuccess(`Category "${cat.name}" deleted successfully.`);
      if (editingCategory && (editingCategory.id === cat.id || editingCategory.name === cat.name)) {
        resetForm();
      }
    } catch (err) {
      setError(err.message || 'Error deleting category.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Category Name is required.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingCategory) {
        // Update existing category
        const updated = await updateCategory(editingCategory.id || editingCategory.name, {
          name,
          description,
          defaultUnit,
          measurementMethod,
          attributes: selectedAttributes
        });
        setSuccess(`Category "${name}" updated successfully!`);
        resetForm();
        if (onCategoryCreated) {
          onCategoryCreated(updated);
        }
      } else {
        // Create new category
        const newCat = await createCategory({
          name,
          description,
          defaultUnit,
          measurementMethod,
          attributes: selectedAttributes,
          isActive: true
        });

        setSuccess(`Category "${newCat.name}" created successfully!`);
        resetForm();
        if (onCategoryCreated) {
          onCategoryCreated(newCat);
        }
      }
    } catch (err) {
      setError(err.message || 'Error saving category.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-modal-overlay" onClick={onClose}>
      <div
        className="app-modal-card"
        style={{ maxWidth: "680px", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="app-modal-header" style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 20px' }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div className="app-modal-icon-badge" style={{ background: '#2563eb' }}>
              <Layers size={22} color="#ffffff" />
            </div>
            <div>
              <h3 className="app-modal-title" style={{ color: '#0f172a' }}>
                {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Category Management (کیٹیگری منیجمنٹ)'}
              </h3>
              <p className="app-modal-subtitle" style={{ color: '#64748b' }}>
                {editingCategory ? 'Update category specifications, measurement rules, and default unit' : 'Register new stock category or manage and edit existing categories'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="app-modal-close-btn"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div className="app-modal-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {error && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#16a34a',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Check size={15} />
                <span>{success}</span>
              </div>
            )}

            {/* 1. Category Name & Default Unit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div className="app-form-group">
                <label className="app-form-label">
                  Category Name <span className="app-form-label-required">*</span>
                </label>
                <input
                  type="text"
                  className="app-form-input font-mono"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Granite, Sanitary..."
                  style={{ fontWeight: 700 }}
                  autoFocus
                />
              </div>

              <div className="app-form-group">
                <label className="app-form-label">
                  Default Unit <span className="app-form-label-required">*</span>
                </label>
                <select
                  className="app-form-select"
                  value={defaultUnit}
                  onChange={(e) => setDefaultUnit(e.target.value)}
                  style={{ fontWeight: 700 }}
                >
                  {CATEGORY_UNITS.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Measurement Method */}
            <div className="app-form-group">
              <label className="app-form-label">
                Measurement Method <span className="app-form-label-required">*</span>
              </label>
              <select
                className="app-form-select"
                value={measurementMethod}
                onChange={(e) => handleMeasurementMethodChange(e.target.value)}
                style={{ fontWeight: 700 }}
              >
                {MEASUREMENT_METHODS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* 3. Optional Attributes */}
            <div className="app-form-group">
              <label className="app-form-label">
                Attributes
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                {OPTIONAL_ATTRIBUTES.map(attr => {
                  const checked = selectedAttributes.includes(attr);
                  return (
                    <button
                      key={attr}
                      type="button"
                      onClick={() => handleToggleAttribute(attr)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: checked ? '#2563eb' : '#cbd5e1',
                        backgroundColor: checked ? '#eff6ff' : '#f8fafc',
                        color: checked ? '#2563eb' : '#475569',
                        fontWeight: 700,
                        fontSize: '0.80rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '4px',
                          border: '1px solid',
                          borderColor: checked ? '#2563eb' : '#94a3b8',
                          backgroundColor: checked ? '#2563eb' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: '10px'
                        }}
                      >
                        {checked && '✓'}
                      </span>
                      <span>{attr}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Description */}
            <div className="app-form-group">
              <label className="app-form-label">Description (Optional)</label>
              <input
                type="text"
                className="app-form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional specification or notes..."
              />
            </div>

            {/* 5. Complete Categories Management Table (Default & Custom) */}
            <div style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>
                  All Inventory Categories ({allManageableCategories.length})
                </div>
                {editingCategory && (
                  <button
                    type="button"
                    onClick={resetForm}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      color: '#475569',
                      borderRadius: '6px',
                      padding: '3px 10px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    + Switch to New Category Form
                  </button>
                )}
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', maxHeight: '240px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '8px 10px', fontWeight: 700, color: '#475569' }}>Category</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700, color: '#475569' }}>Default Unit</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700, color: '#475569' }}>Measurement Method</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Type</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700, color: '#475569', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allManageableCategories.map((cat, idx) => {
                      const isCurrentlyEditing = editingCategory && (editingCategory.id === cat.id || editingCategory.name === cat.name);
                      return (
                        <tr
                          key={cat.id || cat.name || idx}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: isCurrentlyEditing ? '#eff6ff' : (idx % 2 === 0 ? '#ffffff' : '#fcfcfd')
                          }}
                        >
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: isCurrentlyEditing ? '#2563eb' : '#0f172a' }}>
                            {cat.name}
                          </td>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#2563eb' }}>
                            {cat.defaultUnit}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#64748b' }}>
                            {cat.measurementMethod}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                backgroundColor: cat.isDefault ? '#f1f5f9' : '#e0e7ff',
                                color: cat.isDefault ? '#475569' : '#3730a3'
                              }}
                            >
                              {cat.isDefault ? 'Default' : 'Custom'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(cat)}
                                title="Edit Category"
                                style={{
                                  background: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  color: '#2563eb',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Edit2 size={12} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(cat)}
                                title="Delete Category"
                                style={{
                                  background: '#fff1f2',
                                  border: '1px solid #fecdd3',
                                  color: '#e11d48',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Trash2 size={12} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="app-modal-footer">
            <button
              type="button"
              onClick={editingCategory ? resetForm : onClose}
              className="app-btn-cancel"
            >
              <X size={16} />
              <span>{editingCategory ? 'Cancel Edit' : 'Cancel'}</span>
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="app-btn-submit"
            >
              {editingCategory ? <Save size={16} /> : <Plus size={16} />}
              <span>{editingCategory ? 'Update Category' : 'Save Category'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
