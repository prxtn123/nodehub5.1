import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NodeLogo from '../../components/NodeLogo';
import './MapView.css';

/**
 * MapView — interactive warehouse floor-plan camera map
 * Shows camera positions, status, and last-seen incidents
 */

const CAMERAS = [
  { id: 'CAM-01', name: 'Loading Bay A', x: 20, y: 28, status: 'active', positionLabel: 'Loading' },
  { id: 'CAM-02', name: 'Aisle 1',       x: 45, y: 50, status: 'active', positionLabel: 'Storage' },
  { id: 'CAM-03', name: 'Dispatch Gate', x: 70, y: 26, status: 'active', positionLabel: 'Dispatch' },
];

const ZONES = [
  { label: 'Loading',   x: 5,  y: 8,  w: 35, h: 25, color: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.25)' },
  { label: 'Storage',   x: 5,  y: 33, w: 65, h: 30, color: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.25)' },
  { label: 'Dispatch',  x: 60, y: 8,  w: 35, h: 25, color: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.25)' },
  { label: 'Amenities', x: 70, y: 45, w: 25, h: 22, color: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)' },
  { label: 'Office',    x: 70, y: 67, w: 25, h: 22, color: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)' },
];

const STATUS_COLOR = { active: '#22d3ee', inactive: '#4b5563', warning: '#f59e0b' };
const STATUS_LABEL = { active: 'Active', inactive: 'Offline', warning: 'Warning' };

const MapView = () => {
  const navigate  = useNavigate();
  const [selected, setSelected] = useState(null);

  const filtered = CAMERAS; // simple POC mode uses the 3 configured cameras only

  return (
    <div className="mv-page">
      <div className="bg-orb bg-orb--cyan"   aria-hidden="true" />
      <div className="bg-orb bg-orb--violet" aria-hidden="true" />

      {/* ── Header ── */}
      <div className="mv-header">
        <div className="mv-header-left">
          <button className="mv-back-btn" onClick={() => navigate('/')}>← Dashboard</button>
          <div>
            <NodeLogo size="sm" />
            <h1 className="mv-title">Camera Map</h1>
            <p className="mv-subtitle">Warehouse floor-plan (3 cameras only, POC mode)</p>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="mv-content">

        {/* ── Floor plan ── */}
        <div className="mv-floorplan">
          <div className="mv-floorplan-label">Warehouse Floor Plan</div>

          {/* Zone overlays */}
          {ZONES.map(z => (
            <div
              key={z.label}
              className="mv-zone"
              style={{
                left:   `${z.x}%`,  top:    `${z.y}%`,
                width:  `${z.w}%`,  height: `${z.h}%`,
                background: z.color,
                border: `1px solid ${z.border}`,
              }}
            >
              <span className="mv-zone-label">{z.label}</span>
            </div>
          ))}

          {/* Camera markers */}
          {filtered.map(cam => (
            <button
              key={cam.id}
              className={`mv-cam-marker${selected?.id === cam.id ? ' mv-cam-marker--selected' : ''}`}
              style={{
                left:   `${cam.x}%`,
                top:    `${cam.y}%`,
                '--cam-color': STATUS_COLOR[cam.status],
              }}
              onClick={() => setSelected(selected?.id === cam.id ? null : cam)}
              title={`${cam.id} — ${cam.name} (${STATUS_LABEL[cam.status]})`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </button>
          ))}

          {/* Popup for selected camera */}
          {selected && (
            <div
              className="mv-popup"
              style={{
                left: `${Math.min(selected.x + 4, 70)}%`,
                top:  `${Math.min(selected.y + 4, 72)}%`,
              }}
            >
              <button className="mv-popup-close" onClick={() => setSelected(null)}>✕</button>
              <div className="mv-popup-id">{selected.id}</div>
              <div className="mv-popup-name">{selected.name}</div>
              <div className="mv-popup-status" style={{ color: STATUS_COLOR[selected.status] }}>
                ● {STATUS_LABEL[selected.status]}
              </div>
              <div className="mv-popup-zone">Area: {selected.positionLabel}</div>
            </div>
          )}
        </div>

        {/* ── Camera list sidebar ── */}
        <div className="mv-sidebar">
          <h3 className="mv-sidebar-title">Camera Directory</h3>
          <div className="mv-cam-list">
            {filtered.map(cam => (
              <div
                key={cam.id}
                className={`mv-cam-row${selected?.id === cam.id ? ' mv-cam-row--selected' : ''}`}
                onClick={() => setSelected(selected?.id === cam.id ? null : cam)}
              >
                <div
                  className="mv-cam-row-dot"
                  style={{ background: STATUS_COLOR[cam.status] }}
                />
                <div className="mv-cam-row-info">
                  <div className="mv-cam-row-id">{cam.id}</div>
                  <div className="mv-cam-row-name">{cam.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;
