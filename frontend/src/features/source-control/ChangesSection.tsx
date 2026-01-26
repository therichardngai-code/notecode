import { ChangeItem } from './ChangeItem';
import type { GitFileChange } from './git-adapter';

interface ChangesSectionProps {
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  untracked: string[];
  onStage: (filePath: string) => void;
  onUnstage: (filePath: string) => void;
}

export const ChangesSection: React.FC<ChangesSectionProps> = ({
  staged,
  unstaged,
  untracked,
  onStage,
  onUnstage,
}) => {
  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      {staged.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              padding: '8px',
              backgroundColor: '#f5f5f5',
              fontWeight: 'bold',
              fontSize: '12px',
              textTransform: 'uppercase',
              borderBottom: '1px solid #e0e0e0',
            }}
          >
            Staged Changes ({staged.length})
          </div>
          <div style={{ padding: '4px 0' }}>
            {staged.map((file) => (
              <ChangeItem
                key={file.path}
                file={file}
                staged={true}
                onUnstage={() => onUnstage(file.path)}
              />
            ))}
          </div>
        </div>
      )}

      {unstaged.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              padding: '8px',
              backgroundColor: '#f5f5f5',
              fontWeight: 'bold',
              fontSize: '12px',
              textTransform: 'uppercase',
              borderBottom: '1px solid #e0e0e0',
            }}
          >
            Changes ({unstaged.length})
          </div>
          <div style={{ padding: '4px 0' }}>
            {unstaged.map((file) => (
              <ChangeItem
                key={file.path}
                file={file}
                staged={false}
                onStage={() => onStage(file.path)}
              />
            ))}
          </div>
        </div>
      )}

      {untracked.length > 0 && (
        <div>
          <div
            style={{
              padding: '8px',
              backgroundColor: '#f5f5f5',
              fontWeight: 'bold',
              fontSize: '12px',
              textTransform: 'uppercase',
              borderBottom: '1px solid #e0e0e0',
            }}
          >
            Untracked Files ({untracked.length})
          </div>
          <div style={{ padding: '4px 0' }}>
            {untracked.map((filePath) => (
              <ChangeItem
                key={filePath}
                file={{ path: filePath, status: 'added' }}
                staged={false}
                onStage={() => onStage(filePath)}
              />
            ))}
          </div>
        </div>
      )}

      {staged.length === 0 && unstaged.length === 0 && untracked.length === 0 && (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            color: '#888',
            fontSize: '14px',
          }}
        >
          No changes
        </div>
      )}
    </div>
  );
};
