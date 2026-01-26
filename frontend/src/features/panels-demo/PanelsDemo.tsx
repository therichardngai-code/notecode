import { useState } from 'react';
import { FileTree, FileViewer } from '../explorer';
import { SourceControlPanel } from '../source-control';
import { NotificationList } from '../inbox';

type ActivePanel = 'explorer' | 'source-control' | 'inbox';

export const PanelsDemo: React.FC = () => {
  const [activePanel, setActivePanel] = useState<ActivePanel>('explorer');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          backgroundColor: '#2c2c2c',
          color: 'white',
          padding: '12px 16px',
          fontSize: '16px',
          fontWeight: 'bold',
        }}
      >
        AI Workspace - Panels Demo
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            width: '60px',
            backgroundColor: '#333',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '8px 0',
          }}
        >
          <button
            onClick={() => setActivePanel('explorer')}
            title="Explorer"
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto',
              backgroundColor: activePanel === 'explorer' ? '#007acc' : 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            📁
          </button>
          <button
            onClick={() => setActivePanel('source-control')}
            title="Source Control"
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto',
              backgroundColor: activePanel === 'source-control' ? '#007acc' : 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            🔀
          </button>
          <button
            onClick={() => setActivePanel('inbox')}
            title="Inbox"
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto',
              backgroundColor: activePanel === 'inbox' ? '#007acc' : 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            📨
          </button>
        </div>

        <div
          style={{
            width: '300px',
            borderRight: '1px solid #e0e0e0',
            backgroundColor: 'white',
            overflow: 'hidden',
          }}
        >
          {activePanel === 'explorer' && (
            <FileTree onFileSelect={setSelectedFile} />
          )}
          {activePanel === 'source-control' && <SourceControlPanel />}
          {activePanel === 'inbox' && <NotificationList />}
        </div>

        <div style={{ flex: 1, backgroundColor: '#fafafa', overflow: 'hidden' }}>
          {activePanel === 'explorer' && <FileViewer filePath={selectedFile} />}
          {activePanel === 'source-control' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#888',
              }}
            >
              Select a file to view diff
            </div>
          )}
          {activePanel === 'inbox' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#888',
              }}
            >
              Notification details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
