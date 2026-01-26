import { useState, useEffect } from 'react';

type ToolMode = 'allowlist' | 'blocklist';

const availableTools = [
  'Bash',
  'Read',
  'Write',
  'Edit',
  'Glob',
  'Grep',
  'WebSearch',
  'WebFetch',
  'NotebookEdit',
  'TaskCreate',
  'TaskUpdate',
  'TaskList',
];

export function ToolsConfigSection() {
  const [mode, setMode] = useState<ToolMode>('allowlist');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedMode = localStorage.getItem('toolsMode') as ToolMode;
    const storedTools = localStorage.getItem('toolsList');
    if (storedMode) setMode(storedMode);
    if (storedTools) {
      try {
        setSelectedTools(JSON.parse(storedTools));
      } catch (e) {
        console.error('Failed to load tools list', e);
      }
    }
  }, []);

  const handleToggleTool = (tool: string) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
    setSaved(false);
  };

  const handleSelectAll = () => {
    setSelectedTools(availableTools);
    setSaved(false);
  };

  const handleClearAll = () => {
    setSelectedTools([]);
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem('toolsMode', mode);
    localStorage.setItem('toolsList', JSON.stringify(selectedTools));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Tools Configuration</h2>
        <p className="text-sm text-gray-600 mb-4">
          Control which tools AI agents can use. Allowlist mode only permits selected tools, while
          blocklist mode permits all except selected tools.
        </p>
      </div>

      <div>
        <label htmlFor="mode" className="block text-sm font-medium text-gray-700 mb-2">
          Mode
        </label>
        <select
          id="mode"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as ToolMode);
            setSaved(false);
          }}
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="allowlist">Allowlist (only selected tools allowed)</option>
          <option value="blocklist">Blocklist (all except selected tools allowed)</option>
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Tools</label>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Select All
            </button>
            <button
              onClick={handleClearAll}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {availableTools.map((tool) => (
              <label
                key={tool}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedTools.includes(tool)}
                  onChange={() => handleToggleTool(tool)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900">{tool}</span>
              </label>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          {mode === 'allowlist'
            ? `${selectedTools.length} tools allowed`
            : `${availableTools.length - selectedTools.length} tools allowed (${
                selectedTools.length
              } blocked)`}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Save Changes
        </button>
        {saved && <span className="text-green-600 text-sm">✓ Saved successfully</span>}
      </div>
    </div>
  );
}
