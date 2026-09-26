import React, { useState, useEffect } from 'react';
import { Calculator, Check, X, Layers, Box } from 'lucide-react';

export default function DimensionCalculator({ isOpen, onClose, onApply, initialItem = null }) {
  const [calcMode, setCalcMode] = useState('dimension'); // 'dimension' | 'boxes' | 'pieces'
  
  // Dimensions
  const [lengthFt, setLengthFt] = useState(4);
  const [lengthIn, setLengthIn] = useState(0);
  const [widthFt, setWidthFt] = useState(2.5);
  const [widthIn, setWidthIn] = useState(0);
  const [pieces, setPieces] = useState(10);

  // Box mode
  const [boxCount, setBoxCount] = useState(20);
  const [sqFtPerBox, setSqFtPerBox] = useState(14.4);

  // Rates
  const [ratePerSqFt, setRatePerSqFt] = useState(initialItem?.ratePerSqFt || 250);

  // Computed results
  const [totalSqFt, setTotalSqFt] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [summaryText, setSummaryText] = useState('');

  useEffect(() => {
    if (initialItem) {
      if (initialItem.ratePerSqFt) setRatePerSqFt(initialItem.ratePerSqFt);
      if (initialItem.category?.toLowerCase().includes('tile')) {
        setCalcMode('boxes');
      } else {
        setCalcMode('dimension');
      }
    }
  }, [initialItem]);

  useEffect(() => {
    let calculatedSqFt = 0;
    let desc = '';

    if (calcMode === 'dimension') {
      const effLength = parseFloat(lengthFt || 0) + (parseFloat(lengthIn || 0) / 12);
      const effWidth = parseFloat(widthFt || 0) + (parseFloat(widthIn || 0) / 12);
      const pcs = parseInt(pieces || 0, 10);
      calculatedSqFt = effLength * effWidth * pcs;
      desc = `${effLength.toFixed(2)}ft × ${effWidth.toFixed(2)}ft (${pcs} Slabs/Pcs)`;
    } else if (calcMode === 'boxes') {
      const bCount = parseInt(boxCount || 0, 10);
      const sqFtBox = parseFloat(sqFtPerBox || 0);
      calculatedSqFt = bCount * sqFtBox;
      desc = `${bCount} Boxes (${sqFtBox} Sq.Ft/Box)`;
    } else {
      const pcs = parseInt(pieces || 0, 10);
      calculatedSqFt = pcs; // Direct piece count
      desc = `${pcs} Pieces Direct`;
    }

    const roundedSqFt = Math.round(calculatedSqFt * 100) / 100;
    setTotalSqFt(roundedSqFt);
    setTotalAmount(Math.round(roundedSqFt * (parseFloat(ratePerSqFt) || 0)));
    setSummaryText(desc);
  }, [calcMode, lengthFt, lengthIn, widthFt, widthIn, pieces, boxCount, sqFtPerBox, ratePerSqFt]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply({
      calcMode,
      dimensions: summaryText,
      length: parseFloat(lengthFt || 0) + (parseFloat(lengthIn || 0) / 12),
      width: parseFloat(widthFt || 0) + (parseFloat(widthIn || 0) / 12),
      pieces: parseInt(pieces || 0, 10),
      boxes: calcMode === 'boxes' ? parseInt(boxCount || 0, 10) : 0,
      sqFtPerBox: calcMode === 'boxes' ? parseFloat(sqFtPerBox || 0) : 0,
      totalSqFt,
      ratePerSqFt: parseFloat(ratePerSqFt) || 0,
      totalAmount
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(37, 99, 235, 0.12)', borderRadius: '8px', color: 'var(--accent-blue)' }}>
              <Calculator size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Marble Area & Dimension Calculator</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {initialItem ? initialItem.name : 'Calculate Square Feet & Pricing'}
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Mode Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            <button
              type="button"
              className={`btn ${calcMode === 'dimension' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCalcMode('dimension')}
            >
              <Layers size={16} /> Slab Dimension (L × W)
            </button>
            <button
              type="button"
              className={`btn ${calcMode === 'boxes' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCalcMode('boxes')}
            >
              <Box size={16} /> Tile Boxes Packing
            </button>
          </div>

          {calcMode === 'dimension' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Length */}
              <div>
                <label className="form-label">Slab Length</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={lengthFt}
                      onChange={(e) => setLengthFt(e.target.value)}
                      placeholder="Feet (e.g. 5)"
                    />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Feet (ft)</span>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="1"
                      className="form-control"
                      value={lengthIn}
                      onChange={(e) => setLengthIn(e.target.value)}
                      placeholder="Inches (0-11)"
                    />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Inches (in)</span>
                  </div>
                </div>
              </div>

              {/* Width */}
              <div>
                <label className="form-label">Slab Width / Height</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={widthFt}
                      onChange={(e) => setWidthFt(e.target.value)}
                      placeholder="Feet (e.g. 2.5)"
                    />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Feet (ft)</span>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="1"
                      className="form-control"
                      value={widthIn}
                      onChange={(e) => setWidthIn(e.target.value)}
                      placeholder="Inches (0-11)"
                    />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Inches (in)</span>
                  </div>
                </div>
              </div>

              {/* Pieces */}
              <div>
                <label className="form-label">Total Slabs / Pieces</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={pieces}
                  onChange={(e) => setPieces(e.target.value)}
                  placeholder="Number of pieces"
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Number of Tile Boxes</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={boxCount}
                  onChange={(e) => setBoxCount(e.target.value)}
                  placeholder="e.g. 25"
                />
              </div>
              <div>
                <label className="form-label">Sq. Ft. Coverage per Box</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control"
                  value={sqFtPerBox}
                  onChange={(e) => setSqFtPerBox(e.target.value)}
                  placeholder="e.g. 14.4 (for 60x60 tiles)"
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Common: 60x60cm = 14.4 sqft | 60x120cm = 15.4 sqft | 30x60cm = 11.52 sqft
                </span>
              </div>
            </div>
          )}

          {/* Rate per Sq Ft */}
          <div style={{ marginTop: '16px' }}>
            <label className="form-label">Rate per Sq. Ft. (Rs.)</label>
            <input
              type="number"
              step="1"
              className="form-control"
              value={ratePerSqFt}
              onChange={(e) => setRatePerSqFt(e.target.value)}
              placeholder="e.g. 380"
            />
          </div>

          {/* Calculated Output Display */}
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Area</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-blue)' }} className="font-mono">
                {totalSqFt.toLocaleString()} <span style={{ fontSize: '0.85rem' }}>Sq.Ft</span>
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Calculated Amount</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }} className="font-mono">
                Rs. {totalAmount.toLocaleString()}
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-color)', paddingTop: '8px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              <strong>Breakdown:</strong> {summaryText} @ Rs. {ratePerSqFt}/sqft
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleApply}>
            <Check size={16} /> Apply to Line Item
          </button>
        </div>
      </div>
    </div>
  );
}
