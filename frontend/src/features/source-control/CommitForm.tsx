import { useState } from 'react';

interface CommitFormProps {
  onCommit: (message: string) => Promise<void>;
  disabled?: boolean;
}

export const CommitForm: React.FC<CommitFormProps> = ({ onCommit, disabled }) => {
  const [message, setMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;

    setIsCommitting(true);
    setError(null);

    try {
      await onCommit(message);
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commit failed');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div
      style={{
        padding: '12px',
        borderTop: '1px solid #e0e0e0',
        backgroundColor: '#fafafa',
      }}
    >
      <form onSubmit={handleSubmit}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Commit message"
          disabled={disabled || isCommitting}
          style={{
            width: '100%',
            minHeight: '60px',
            padding: '8px',
            border: '1px solid #d0d0d0',
            borderRadius: '4px',
            fontSize: '13px',
            fontFamily: 'monospace',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
        {error && (
          <div
            style={{
              marginTop: '8px',
              padding: '6px 8px',
              backgroundColor: '#fee',
              color: '#c00',
              fontSize: '12px',
              borderRadius: '3px',
            }}
          >
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={!message.trim() || disabled || isCommitting}
          style={{
            marginTop: '8px',
            width: '100%',
            padding: '8px',
            backgroundColor: disabled || !message.trim() ? '#ccc' : '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: disabled || !message.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {isCommitting ? 'Committing...' : 'Commit'}
        </button>
      </form>
    </div>
  );
};
