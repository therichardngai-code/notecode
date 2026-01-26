import { useState } from 'react';
import type { GitFileChange } from './git-adapter';

interface ChangeItemProps {
  file: GitFileChange;
  staged: boolean;
  onStage?: () => void;
  onUnstage?: () => void;
}

export const ChangeItem: React.FC<ChangeItemProps> = ({
  file,
  staged,
  onStage,
  onUnstage,
}) => {
  const [showDiff, setShowDiff] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'modified': return 'M';
      case 'added': return 'A';
      case 'deleted': return 'D';
      default: return '?';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'modified': return '#ffa500';
      case 'added': return '#00aa00';
      case 'deleted': return '#ff0000';
      default: return '#888';
    }
  };

  return (
    <div style={{ marginBottom: '4px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px',
          gap: '8px',
          cursor: 'pointer',
          borderRadius: '3px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f0f0f0';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        onClick={() => setShowDiff(!showDiff)}
      >
        <span
          style={{
            fontWeight: 'bold',
            fontSize: '11px',
            color: getStatusColor(file.status),
            width: '16px',
          }}
        >
          {getStatusIcon(file.status)}
        </span>
        <span style={{ flex: 1, fontSize: '13px', fontFamily: 'monospace' }}>
          {file.path}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            staged ? onUnstage?.() : onStage?.();
          }}
          style={{
            padding: '2px 8px',
            fontSize: '11px',
            border: '1px solid #d0d0d0',
            borderRadius: '3px',
            background: 'white',
            cursor: 'pointer',
          }}
        >
          {staged ? '-' : '+'}
        </button>
      </div>
      {showDiff && file.diff && (
        <div
          style={{
            marginLeft: '24px',
            marginTop: '4px',
            padding: '8px',
            backgroundColor: '#f8f8f8',
            border: '1px solid #e0e0e0',
            borderRadius: '3px',
            fontSize: '12px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
          }}
        >
          {file.diff}
        </div>
      )}
    </div>
  );
};
