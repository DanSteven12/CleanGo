import React from 'react';
import type { Checkpoint } from '../../services/mapService';

interface CheckpointMarkerProps {
  checkpoint: Checkpoint;
  index: number;
  isActive: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}

export const CheckpointMarker: React.FC<CheckpointMarkerProps> = ({
  checkpoint,
  index,
  isActive,
  onClick,
  style,
}) => {
  return (
    <div
      className={`custom-map-marker ${isActive ? 'active-marker' : ''}`}
      style={style}
      onClick={onClick}
      title={`${index}. ${checkpoint.name}`}
    >
      <div className="pin-container">
        <div className="pin-bubble">
          <span className={`pin-status-dot pin-dot-${checkpoint.status}`} />
          {index}
        </div>
        <div className="pin-stem" />
      </div>
    </div>
  );
};
