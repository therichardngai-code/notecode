/**
 * Onboarding Welcome
 * Shown to new users with no projects. Collects profile info,
 * reuses GlobalApprovalGateSection for full approval config,
 * and provides get-started actions.
 */

import { useState, useCallback } from 'react';
import { FolderOpen, Plus, MessageSquare, Lock, Check, Loader2 } from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/shared/hooks/use-settings';
import { GlobalApprovalGateSection } from '@/features/settings/GlobalApprovalGateSection';
import { cn } from '@/shared/lib/utils';
import logoSvg from '/logo.svg';

interface OnboardingWelcomeProps {
  onOpenFolder: () => void;
  onNewTask: () => void;
  onStartChat: () => void;
  isSelectingFolder?: boolean;
}

export function OnboardingWelcome({
  onOpenFolder,
  onNewTask,
  onStartChat,
  isSelectingFolder,
}: OnboardingWelcomeProps) {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  // Profile form state
  const [userName, setUserName] = useState(settings?.userName || '');
  const [userEmail, setUserEmail] = useState(settings?.userEmail || '');
  const [profileSaved, setProfileSaved] = useState(false);

  /** Save profile to settings */
  const handleSaveProfile = useCallback(() => {
    updateSettings.mutate(
      { userName: userName.trim(), userEmail: userEmail.trim() },
      {
        onSuccess: () => {
          setProfileSaved(true);
          setTimeout(() => setProfileSaved(false), 2000);
        },
      }
    );
  }, [userName, userEmail, updateSettings]);

  const hasProfileChanges =
    userName.trim() !== (settings?.userName || '') ||
    userEmail.trim() !== (settings?.userEmail || '');

  return (
    <div className="h-full overflow-y-auto py-8">
      <div className="flex flex-col gap-5 max-w-lg mx-auto px-4 animate-float-up">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-2xl overflow-hidden">
            <img src={logoSvg} alt="NoteCode" className="w-full h-full" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Welcome to NoteCode</h1>
            <p className="text-base text-muted-foreground mt-1">
              Your AI-powered coding workspace. Let's get you set up.
            </p>
          </div>
        </div>

        {/* Profile Section */}
        <div className="rounded-xl glass p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Set Up Your Profile</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Display Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2 text-sm rounded-lg glass text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Email <span className="text-muted-foreground/60">(fallback for git commits)</span>
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2 text-sm rounded-lg glass text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Privacy notice */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-white/5 rounded-lg px-3 py-2">
            <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Your data is stored locally on your machine only. NoteCode never sends your personal information to any external server.
            </span>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={!hasProfileChanges || updateSettings.isPending}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors',
                profileSaved
                  ? 'bg-green-500/20 text-green-500'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90',
                (!hasProfileChanges || updateSettings.isPending) && !profileSaved && 'opacity-50 cursor-not-allowed'
              )}
            >
              {updateSettings.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : profileSaved ? (
                <Check className="w-3.5 h-3.5" />
              ) : null}
              {profileSaved ? 'Saved' : 'Save Profile'}
            </button>
          </div>
        </div>

        {/* Approval Gate Section — reuse full settings component */}
        <div className="rounded-xl glass p-5">
          <GlobalApprovalGateSection />
        </div>

        {/* Get Started Actions */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground text-center">Get Started</h2>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onOpenFolder}
              disabled={isSelectingFolder}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium glass border border-border hover:bg-white/20 dark:hover:bg-white/10 transition-all"
            >
              {isSelectingFolder ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FolderOpen className="w-4 h-4" />
              )}
              <span>Open Folder</span>
            </button>
            <button
              onClick={onNewTask}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium glass border border-border hover:bg-white/20 dark:hover:bg-white/10 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </button>
            <button
              onClick={onStartChat}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Start Chat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
