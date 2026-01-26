import { useEffect, useState } from 'react';
import { gitAdapter, type GitBranch } from './git-adapter';

interface BranchSelectorProps {
  onBranchChange?: (branch: string) => void;
}

export const BranchSelector: React.FC<BranchSelectorProps> = ({ onBranchChange }) => {
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const branchList = await gitAdapter.getBranches();
      setBranches(branchList);
    } catch (error) {
      console.error('Failed to load branches:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const handleChange = async (branchName: string) => {
    try {
      await gitAdapter.checkout(branchName);
      await loadBranches();
      onBranchChange?.(branchName);
    } catch (error) {
      console.error('Failed to checkout branch:', error);
    }
  };

  const currentBranch = branches.find((b) => b.current);

  if (loading) {
    return <div style={{ padding: '8px' }}>Loading branches...</div>;
  }

  return (
    <div style={{ padding: '8px', borderBottom: '1px solid #e0e0e0' }}>
      <select
        value={currentBranch?.name ?? ''}
        onChange={(e) => handleChange(e.target.value)}
        style={{
          width: '100%',
          padding: '6px 8px',
          border: '1px solid #d0d0d0',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '13px',
        }}
      >
        {branches.map((branch) => (
          <option key={branch.name} value={branch.name}>
            {branch.current ? '* ' : '  '}
            {branch.name}
          </option>
        ))}
      </select>
    </div>
  );
};
