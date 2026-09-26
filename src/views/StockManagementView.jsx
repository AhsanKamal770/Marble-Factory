import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Layers,
  ArrowUpDown,
  Filter,
  PackagePlus,
  Check,
  X
} from 'lucide-react';
import { db, adjustItemStock, logStockMovement } from '../db/index';
import Badge from '../components/Badge';

export default function StockManagementView() {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'Marble Slabs',
    subCategory: '',
    finish: 'Polished',
    grade: 'Grade A',
    thicknessMm: 16,
    standardSize: '',
    unit: 'Sq. Ft.',
    ratePerSqFt: 250,
    costPerSqFt: 180,
    stockSqFt: 1000,
    stockBoxes: 0,
    stockPieces: 50,
    minStockAlert: 500,
    lotNo: '',
    location: 'Yard Shed 1',
    notes: ''
  });

  // Quick Stock Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('Adjustment'); // 'Adjustment' | 'Damaged/Wastage'
  const [adjustNote, setAdjustNote] = useState('');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    const all = await db.items.toArray();
    setItems(all);
  };

  const categories = [
    'ALL',
    'Marble Slabs',
    'Marble Tiles',
    'Granite',
    'Porcelain Tiles',
    'Ceramic Tiles',
    'Borders & Patti',
    'Steps & Risers'
  ];

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      code: `MB-${Date.now().toString().slice(-4)}`,
      name: '',
      category: 'Marble Slabs',
      subCategory: '',
      finish: 'Polished',
      grade: 'Grade A',
      thicknessMm: 16,
      standardSize: 'Random Slabs',
      unit: 'Sq. Ft.',
      ratePerSqFt: 250,
      costPerSqFt: 180,
      stockSqFt: 1000,
      stockBoxes: 0,
      stockPieces: 50,
      minStockAlert: 500,
      lotNo: `LOT-${new Date().getFullYear()}`,
      location: 'Yard Shed 1',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await db.items.update(editingItem.id, {
          ...formData,
          ratePerSqFt: parseFloat(formData.ratePerSqFt) || 0,
          costPerSqFt: parseFloat(formData.costPerSqFt) || 0,
          stockSqFt: parseFloat(formData.stockSqFt) || 0,
          stockBoxes: parseInt(formData.stockBoxes) || 0,
          stockPieces: parseInt(formData.stockPieces) || 0,
          minStockAlert: parseFloat(formData.minStockAlert) || 0,
          updatedAt: new Date().toISOString()
        });
      } else {
        const addedId = await db.items.add({
          ...formData,
          ratePerSqFt: parseFloat(formData.ratePerSqFt) || 0,
          costPerSqFt: parseFloat(formData.costPerSqFt) || 0,
          stockSqFt: parseFloat(formData.stockSqFt) || 0,
          stockBoxes: parseInt(formData.stockBoxes) || 0,
          stockPieces: parseInt(formData.stockPieces) || 0,
          minStockAlert: parseFloat(formData.minStockAlert) || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        await logStockMovement({
          itemId: addedId,
          itemName: formData.name,
          category: formData.category,
          movementType: 'Initial',
          changeSqFt: parseFloat(formData.stockSqFt) || 0,
          changeBoxes: parseInt(formData.stockBoxes) || 0,
          changePieces: parseInt(formData.stockPieces) || 0,
          previousSqFt: 0,
          newSqFt: parseFloat(formData.stockSqFt) || 0,
          refDocNo: 'MANUAL-ENTRY',
          note: 'New item added to catalog'
        });
      }

      setIsModalOpen(false);
      loadItems();
    } catch (err) {
      alert('Error saving item: ' + err.message);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Delete ${item.name}? This will remove it from catalog.`)) return;
    await db.items.delete(item.id);
    loadItems();
  };

  const handleOpenAdjust = (item) => {
    setAdjustingItem(item);
    setAdjustQty('');
    setAdjustNote('');
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustingItem || !adjustQty) return;
    const delta = parseFloat(adjustQty);

    try {
      await adjustItemStock(
        adjustingItem.id,
        delta,
        0,
        0,
        adjustType,
        'MANUAL-ADJUST',
        adjustNote || 'Manual stock correction'
      );
      setIsAdjustModalOpen(false);
      loadItems();
    } catch (err) {
      alert('Error adjusting stock: ' + err.message);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.lotNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedCategory === 'ALL') return true;
    return item.category === selectedCategory;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Search & Filter Card */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              className="input-search"
              style={{ paddingLeft: '36px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by marble variety, item code, lot #, or shed location..."
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={handleOpenAddModal}>
              <Plus size={16} /> Add New Marble / Tile Variety
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '14px', paddingBottom: '4px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'ALL' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Items Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Boxes size={18} className="text-gold" /> Marble & Tile Inventory Items ({filteredItems.length})
          </h3>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code & Name</th>
                <th>Category & Grade</th>
                <th>Finish & Thickness</th>
                <th>Standard Sizing</th>
                <th>Rate / Sq.Ft</th>
                <th>Available Sq.Ft</th>
                <th>Status</th>
                <th>Location / Lot</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    No marble or tile items found. Click "Add New Marble / Tile Variety" above.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLow = Number(item.stockSqFt || 0) <= (Number(item.minStockAlert) || 500);
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="font-mono text-accent" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                          {item.code}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{item.name}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.category}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.grade || 'Standard'}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        <div>{item.finish || 'Polished'}</div>
                        <div style={{ color: 'var(--text-muted)' }}>{item.thicknessMm ? `${item.thicknessMm} mm` : '-'}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {item.standardSize || 'Random'}
                      </td>
                      <td className="font-mono text-accent" style={{ fontWeight: 700 }}>
                        Rs. {Number(item.ratePerSqFt || 0).toLocaleString()}
                      </td>
                      <td>
                        <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 800, color: isLow ? '#fb7185' : '#34d399' }}>
                          {Number(item.stockSqFt || 0).toLocaleString()} <span style={{ fontSize: '0.75rem' }}>Sq.Ft</span>
                        </div>
                        {item.stockBoxes > 0 && (
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{item.stockBoxes} Boxes</div>
                        )}
                      </td>
                      <td>
                        <Badge status={isLow ? 'Low Stock' : 'Good'} text={isLow ? 'Low Stock' : 'In Stock'} />
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        <div>{item.location || 'Yard Shed'}</div>
                        <div className="font-mono" style={{ fontSize: '0.72rem', color: '#64748b' }}>{item.lotNo}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenAdjust(item)}
                            title="Quick Stock Adjustment (+/- Sq Ft)"
                          >
                            <ArrowUpDown size={14} className="text-emerald" />
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEditModal(item)}
                            title="Edit Item Details"
                          >
                            <Edit2 size={14} className="text-gold" />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#fb7185' }}
                            onClick={() => handleDeleteItem(item)}
                            title="Delete Item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Item Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                {editingItem ? `Edit Item: ${editingItem.name}` : 'Add New Marble / Tile Variety'}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveItem}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Item Code *</label>
                    <input
                      type="text"
                      required
                      className="form-control font-mono"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Marble / Tile Variety Name *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Ziarat White Super Slab"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-control"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="Marble Slabs">Marble Slabs</option>
                      <option value="Marble Tiles">Marble Tiles</option>
                      <option value="Granite">Granite</option>
                      <option value="Porcelain Tiles">Porcelain Tiles</option>
                      <option value="Ceramic Tiles">Ceramic Tiles</option>
                      <option value="Borders & Patti">Borders & Patti</option>
                      <option value="Steps & Risers">Steps & Risers</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Grade / Quality</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      placeholder="e.g. Grade A (Super)"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Finish</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.finish}
                      onChange={(e) => setFormData({ ...formData, finish: e.target.value })}
                      placeholder="e.g. Mirror Polished"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Thickness (mm)</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-control"
                      value={formData.thicknessMm}
                      onChange={(e) => setFormData({ ...formData, thicknessMm: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sale Rate / Sq.Ft (Rs.) *</label>
                    <input
                      type="number"
                      required
                      className="form-control font-mono"
                      value={formData.ratePerSqFt}
                      onChange={(e) => setFormData({ ...formData, ratePerSqFt: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cost / Sq.Ft (Rs.)</label>
                    <input
                      type="number"
                      className="form-control font-mono"
                      value={formData.costPerSqFt}
                      onChange={(e) => setFormData({ ...formData, costPerSqFt: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Available Stock (Sq.Ft) *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      className="form-control font-mono"
                      style={{ color: '#34d399', fontWeight: 700 }}
                      value={formData.stockSqFt}
                      onChange={(e) => setFormData({ ...formData, stockSqFt: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock Boxes (if any)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.stockBoxes}
                      onChange={(e) => setFormData({ ...formData, stockBoxes: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Min Stock Alert (Sq.Ft)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.minStockAlert}
                      onChange={(e) => setFormData({ ...formData, minStockAlert: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Yard / Shed Location</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Shed 1 - Bay A"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lot / Batch Number</label>
                    <input
                      type="text"
                      className="form-control font-mono"
                      value={formData.lotNo}
                      onChange={(e) => setFormData({ ...formData, lotNo: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} /> Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Stock Adjustment Modal */}
      {isAdjustModalOpen && adjustingItem && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>Stock Adjustment</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsAdjustModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment}>
              <div className="modal-body">
                <div style={{ padding: '12px', background: '#0e131d', border: '1px solid #242f47', borderRadius: '8px', marginBottom: '14px' }}>
                  <div style={{ fontWeight: 700, color: '#fff' }}>{adjustingItem.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Current Yard Stock: <strong className="text-gold font-mono">{adjustingItem.stockSqFt} Sq.Ft</strong>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Adjustment Quantity (Sq.Ft) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    className="form-control font-mono"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    placeholder="e.g. +200 or -50"
                    autoFocus
                  />
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Use positive number (e.g. 100) to ADD stock, negative (e.g. -50) to REDUCE.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason / Type</label>
                  <select className="form-control" value={adjustType} onChange={(e) => setAdjustType(e.target.value)}>
                    <option value="Adjustment">Yard Physical Audit Count</option>
                    <option value="Damaged/Wastage">Damaged / Broken Marble Scrap</option>
                    <option value="Initial">Additional Loading</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Note / Reference</label>
                  <input
                    type="text"
                    className="form-control"
                    value={adjustNote}
                    onChange={(e) => setAdjustNote(e.target.value)}
                    placeholder="e.g. Monthly stock verification"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAdjustModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Apply Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
