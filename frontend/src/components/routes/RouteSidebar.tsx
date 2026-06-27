import React from 'react';
import type { Checkpoint, RouteStats } from '../../services/mapService';

interface RouteSidebarProps {
  checkpoints: Checkpoint[];
  selectedId: string | null;
  stats: RouteStats;
  onSelectCheckpoint: (id: string | null) => void;
  onRemoveCheckpoint: (id: string) => void;
  onUpdateCheckpointStatus: (id: string, status: Checkpoint['status']) => void;
  onOptimizeRoute: () => void;
  onResetRoute: () => void;
}

export const RouteSidebar: React.FC<RouteSidebarProps> = ({
  checkpoints,
  stats,
  onRemoveCheckpoint,
  onOptimizeRoute,
  onResetRoute,
}) => {
  // Format estimated time
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="route-sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <h2>CleanGo Router</h2>
        <p className="sidebar-subtitle">
          Optimize and manage cleaning tasks across locations.
        </p>
      </div>

      {/* Stats Board */}
      <div className="route-stats">
        <div className="stat-card">
          <div className="stat-label">Total Distance</div>
          <div className="stat-value">{stats.totalDistanceKm} km</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Est. Duration</div>
          <div className="stat-value">{formatTime(stats.estimatedTimeMinutes)}</div>
        </div>
      </div>

      <table className="checkpoint-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Lat</th>
            <th>Lng</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {checkpoints.map((cp, index) => (
            <tr key={cp.id}>
              <td>{index + 1}</td>
              <td>{cp.name}</td>
              <td>{cp.lat.toFixed(4)}</td>
              <td>{cp.lng.toFixed(4)}</td>
              <td>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveCheckpoint(cp.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--danger-color)',
                    cursor: 'pointer',
                  }}
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer / Actions panel */}
      <div className="sidebar-actions">
        <button className="btn-primary" onClick={onOptimizeRoute}>
          ✨ Optimize Route Order
        </button>
        <button className="btn-secondary" onClick={onResetRoute}>
          🔄 Reset Default Route
        </button>
      </div>
    </div>
  );
};
