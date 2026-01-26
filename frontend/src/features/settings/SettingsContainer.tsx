import { useState } from 'react';
import { ApiKeysSection } from './ApiKeysSection';
import { DefaultModelSection } from './DefaultModelSection';
import { ToolsConfigSection } from './ToolsConfigSection';
import { YoloModeToggle } from './YoloModeToggle';

type TabId = 'general' | 'api-keys' | 'tools' | 'advanced';

interface Tab {
  id: TabId;
  label: string;
}

const tabs: Tab[] = [
  { id: 'general', label: 'General' },
  { id: 'api-keys', label: 'API Keys' },
  { id: 'tools', label: 'Tools' },
  { id: 'advanced', label: 'Advanced' },
];

export function SettingsContainer() {
  const [activeTab, setActiveTab] = useState<TabId>('general');

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-200 bg-white">
        <div className="px-6 pt-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Settings</h1>
          <nav className="flex space-x-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <DefaultModelSection />
              <div className="pt-6 border-t border-gray-200">
                <YoloModeToggle />
              </div>
            </div>
          )}
          {activeTab === 'api-keys' && <ApiKeysSection />}
          {activeTab === 'tools' && <ToolsConfigSection />}
          {activeTab === 'advanced' && (
            <div className="text-gray-600">
              <h2 className="text-lg font-semibold mb-2">Advanced Settings</h2>
              <p>Advanced configuration options will be available here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
