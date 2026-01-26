import { useEffect, useState } from 'react';
import { BranchSelector } from './BranchSelector';
import { ChangesSection } from './ChangesSection';
import { CommitForm } from './CommitForm';
import { gitAdapter, type GitStatus } from './git-adapter';

export const SourceControlPanel: React.FC = () => {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const gitStatus = await gitAdapter.getStatus();
      setStatus(gitStatus);
    } catch (error) {
      console.error('Failed to load git status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleStage = async (filePath: string) => {
    try {
      await gitAdapter.stage(filePath);
      await loadStatus();
    } catch (error) {
      console.error('Failed to stage file:', error);
    }
  };

  const handleUnstage = async (filePath: string) => {
    try {
      await gitAdapter.unstage(filePath);
      await loadStatus();
    } catch (error) {
      console.error('Failed to unstage file:', error);
    }
  };

  const handleCommit = async (message: string) => {
    await gitAdapter.commit(message);
    await loadStatus();
  };

  if (loading) {
    return (
      <div style={{ padding: '16px', height: '100%' }}>
        Loading...
      </div>
    );
  }

  if (!status) {
    return (
      <div style={{ padding: '16px', height: '100%', color: '#888' }}>
        Failed to load git status
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <BranchSelector onBranchChange={loadStatus} />
      <ChangesSection
        staged={status.staged}
        unstaged={status.unstaged}
        untracked={status.untracked}
        onStage={handleStage}
        onUnstage={handleUnstage}
      />
      <CommitForm
        onCommit={handleCommit}
        disabled={status.staged.length === 0}
      />
    </div>
  );
};
