import { createFileRoute } from '@tanstack/react-router';
import { FolderOpen, Users, GitBranch, FileText, Bot, Loader2 } from 'lucide-react';
import { useRecentProjects } from '@/shared/hooks/use-projects-query';

export const Route = createFileRoute('/')({
  component: HomePage,
});

interface WorkspaceItemProps {
  name: string;
  path: string;
  onClick?: () => void;
}

function WorkspaceItem({ name, path, onClick }: WorkspaceItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 rounded-lg border border-sidebar-border bg-sidebar hover:bg-muted/50 transition-colors"
    >
      <div className="text-base text-foreground font-medium">{name}</div>
      <div className="text-sm text-muted-foreground truncate">{path}</div>
    </button>
  );
}

function HomePage() {
  const { data: projects, isLoading, isError } = useRecentProjects(5);
  const hasWorkspaces = projects && projects.length > 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Empty state or error - Welcome view
  if (!hasWorkspaces || isError) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Bot className="w-8 h-8 text-foreground/60" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">
              Welcome to NoteCode
            </h1>
            <p className="text-base text-muted-foreground">
              Your AI-powered coding workspace. Start by opening a file or chatting with AI.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-sidebar-border bg-sidebar hover:bg-muted/50 transition-colors text-foreground">
              <FileText className="w-4 h-4" />
              <span>Open File</span>
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors">
              <Bot className="w-4 h-4" />
              <span>Start Chat</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // With workspaces - Main view
  return (
    <div className="h-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-8 w-full max-w-md">
        <div className="flex flex-col items-center gap-3">
          <div className="text-5xl font-bold text-foreground">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 8L8 40h8l8-20 8 20h8L24 8z" fill="currentColor"/>
            </svg>
          </div>
          <h1 className="text-xl font-medium text-foreground">NoteCode</h1>
        </div>

        <button className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors text-white font-medium">
          <FolderOpen className="w-5 h-5" />
          <span>Open Folder</span>
        </button>

        <div className="flex items-center gap-3 w-full">
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-sidebar-border bg-sidebar hover:bg-muted/50 transition-colors text-foreground">
            <Users className="w-4 h-4" />
            <span>Open Agent Manager</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-sidebar-border bg-sidebar hover:bg-muted/50 transition-colors text-foreground">
            <GitBranch className="w-4 h-4" />
            <span>Clone Repository</span>
          </button>
        </div>

        <div className="w-full">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Workspaces</h2>
          <div className="flex flex-col gap-2">
            {projects.map((project) => (
              <WorkspaceItem
                key={project.id}
                name={project.name}
                path={project.path}
                onClick={() => console.log('Open workspace:', project.path)}
              />
            ))}
          </div>
          <button className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Show More...
          </button>
        </div>
      </div>
    </div>
  );
}
