import { useState, useEffect } from 'react';

export function YoloModeToggle() {
  const [yoloMode, setYoloMode] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('yoloMode');
    if (stored) {
      setYoloMode(stored === 'true');
    }
  }, []);

  const handleToggle = () => {
    const newValue = !yoloMode;
    setYoloMode(newValue);
    localStorage.setItem('yoloMode', String(newValue));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">YOLO Mode</h3>
        <p className="text-sm text-gray-600">
          When enabled, automatically approves all tool executions without requiring manual
          approval. Use with caution as this allows AI agents to execute commands without
          oversight.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            yoloMode ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              yoloMode ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm font-medium text-gray-900">
          {yoloMode ? 'Enabled' : 'Disabled'}
        </span>
        {saved && <span className="text-green-600 text-sm">✓ Saved</span>}
      </div>

      {yoloMode && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            ⚠ Warning: YOLO mode is enabled. AI agents can execute commands without your approval.
          </p>
        </div>
      )}
    </div>
  );
}
