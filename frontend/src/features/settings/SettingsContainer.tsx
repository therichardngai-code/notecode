/**
 * Settings Container
 * Main settings page with tabbed navigation
 */

import { useState } from 'react';
import { ProfileSection } from './ProfileSection';
import { DefaultModelSection } from './DefaultModelSection';
import { ActiveProjectSection } from './ActiveProjectSection';
import { SystemPromptSection } from './SystemPromptSection';
import { ApiKeysSection } from './ApiKeysSection';
import { ToolsConfigSection } from './ToolsConfigSection';
import { YoloModeToggle } from './YoloModeToggle';
import { DataRetentionSection } from './DataRetentionSection';
import { BackupSection } from './BackupSection';
import { ProjectManagementSection } from './ProjectManagementSection';
import { GlobalApprovalGateSection } from './GlobalApprovalGateSection';

type TabId = 'general' | 'api-keys' | 'prompts' | 'projects' | 'advanced';

interface Tab {
  id: TabId;
  label: string;
}

const tabs: Tab[] = [
  { id: 'general', label: 'General' },
  { id: 'api-keys', label: 'API Keys' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'projects', label: 'Projects' },
  { id: 'advanced', label: 'Advanced' },
];

export function SettingsContainer() {
  const [activeTab, setActiveTab] = useState<TabId>('general');

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-background">
        <div className="px-6 pt-6">
          <h1 className="text-2xl font-bold text-foreground mb-4">Settings</h1>
          <nav className="flex space-x-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-muted/30">
        <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-sm border border-border p-6">
          {activeTab === 'general' && (
            <div className="space-y-8">
              <ProfileSection />
              <div className="border-t border-border pt-8">
                <DefaultModelSection />
              </div>
              <div className="border-t border-border pt-8">
                <ActiveProjectSection />
              </div>
            </div>
          )}

          {activeTab === 'api-keys' && <ApiKeysSection />}

          {activeTab === 'prompts' && (
            <div className="space-y-8">
              <SystemPromptSection />
            </div>
          )}

          {activeTab === 'projects' && <ProjectManagementSection />}

          {activeTab === 'advanced' && (
            <div className="space-y-8">
              <YoloModeToggle />
              <div className="border-t border-border pt-8">
                <GlobalApprovalGateSection />
              </div>
              <div className="border-t border-border pt-8">
                <DataRetentionSection />
              </div>
              <div className="border-t border-border pt-8">
                <ToolsConfigSection />
              </div>
              <div className="border-t border-border pt-8">
                <BackupSection />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
