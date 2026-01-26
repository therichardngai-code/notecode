import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import {
  Calendar, User, Folder, Bot, Sparkles, Zap, Play, Clock,
  AtSign, Paperclip, Globe, X, Pause, CheckCircle, Archive, MessageSquare,
  FileCode, GitBranch, Terminal, ThumbsUp, ThumbsDown, ExternalLink,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useTaskStore } from '@/shared/stores/task-store';
import { statusConfig, priorityConfig, type StatusId } from '@/shared/config/task-config';
import { agentLabels, providerLabels, modelLabels } from '@/shared/config/property-config';

export const Route = createFileRoute('/tasks/$taskId')({
  component: TaskDetailPage,
});

// Status badge component
function StatusBadge({ status }: { status: StatusId }) {
  const config = statusConfig[status];
  const iconMap: Record<StatusId, React.ElementType> = {
    'not-started': Clock, 'in-progress': Play, 'review': Pause, 'done': CheckCircle, 'cancelled': Clock, 'archived': Archive,
  };
  const Icon = iconMap[status];
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: config.bgColor, color: config.color }}>
      <Icon className="w-3 h-3" />{config.label}
    </div>
  );
}

// Priority badge
function PriorityBadge({ priority }: { priority?: 'low' | 'medium' | 'high' }) {
  if (!priority) return null;
  const config = priorityConfig[priority];
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: config.bgColor, color: config.color }}>{config.label}</span>;
}

// Property row
function PropertyRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-sidebar/50 hover:bg-sidebar transition-colors">
      <div className="flex items-center gap-2 w-24 text-sm text-muted-foreground shrink-0"><Icon className="w-4 h-4" /><span>{label}</span></div>
      <span className="text-sm text-foreground truncate">{value}</span>
    </div>
  );
}

// Mock chat messages
interface ChatFile { name: string; additions?: number; deletions?: number; }
interface ChatCommand { cmd: string; status: 'success' | 'running' | 'pending'; }
interface ChatMessage { id: string; role: 'assistant'; content: string; files?: ChatFile[]; commands?: ChatCommand[]; }
const mockChatMessages: ChatMessage[] = [
  { id: '1', role: 'assistant', content: "Checking dependencies...", files: [{ name: 'package.json' }] },
  { id: '2', role: 'assistant', content: "Installing library:", commands: [{ cmd: 'npm install canvas-confetti', status: 'success' }] },
  { id: '3', role: 'assistant', content: "Adding confetti animation:", files: [{ name: 'src/components/InstallCommand.jsx', additions: 15, deletions: 1 }] },
];

// Mock diffs
const mockDiffs = [
  { id: 'diff-1', filename: 'src/components/InstallCommand.jsx', additions: 45, deletions: 8, chunks: [
    { header: '@@ -1,3 +1,5 @@', lines: [
      { type: 'add' as const, lineNum: 1, content: "import confetti from 'canvas-confetti'" },
      { type: 'add' as const, lineNum: 2, content: "import { useState } from 'react'" },
    ]},
  ]},
];

function TaskDetailPage() {
  const { taskId } = Route.useParams();
  const task = useTaskStore((state) => state.tasks[taskId]);
  const updateTask = useTaskStore((state) => state.updateTask);

  // UI state
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<'activity' | 'ai-session' | 'diffs'>('ai-session');
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [diffApprovals, setDiffApprovals] = useState<Record<string, 'approved' | 'rejected' | null>>({});

  // File Details sub-panel state
  const [selectedDiffFile, setSelectedDiffFile] = useState<string | null>(null);
  const [subPanelTab, setSubPanelTab] = useState<'chat-session' | 'diffs'>('diffs');

  // Chat handler
  const sendMessage = async (content: string) => {
    if (!content.trim() || isTyping) return;
    setChatInput('');
    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsTyping(false);
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(chatInput); }
  };

  const handleStartTask = () => { if (task) updateTask(taskId, { columnId: 'in-progress' }); };
  const handleCancelTask = () => { if (task) updateTask(taskId, { columnId: 'cancelled' }); };
  const handleContinueTask = () => { if (task) updateTask(taskId, { columnId: 'in-progress' }); };

  // File Details handlers
  const handleDiffFileClick = (fileId: string) => { setSelectedDiffFile(fileId); setSubPanelTab('diffs'); };
  const handleCloseFileDetails = () => { setSelectedDiffFile(null); };
  const handleApproveDiff = (diffId: string) => setDiffApprovals(prev => ({ ...prev, [diffId]: 'approved' }));
  const handleRejectDiff = (diffId: string) => setDiffApprovals(prev => ({ ...prev, [diffId]: 'rejected' }));

  if (!task) {
    return <div className="h-full flex items-center justify-center text-muted-foreground">Task not found</div>;
  }

  return (
    <div className="h-full flex bg-sidebar">
      {/* Main Content - adjusts width when File Details is open */}
      <div className={cn("flex-1 flex flex-col transition-all duration-300", selectedDiffFile ? "max-w-[50%]" : "")}>
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-4xl mx-auto">
          {/* Title */}
          <h1 className="text-2xl font-medium text-foreground mb-2">{task.title}</h1>

          {/* Description */}
          {task.description && (
            <div className="mb-6 overflow-hidden">
              <p className={cn("text-sm text-muted-foreground break-words", !isDescriptionExpanded && "line-clamp-2")}>{task.description}</p>
              {task.description.length > 100 && (
                <button onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className="text-xs text-primary hover:underline mt-1">
                  {isDescriptionExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}

          {/* Status & Priority */}
          <div className="flex items-center gap-3 mb-6">
            {task.project && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Folder className="w-3 h-3" />{task.project}</span>}
            <StatusBadge status={task.columnId as StatusId} />
            <PriorityBadge priority={task.priority} />
          </div>

          {/* Properties */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-foreground mb-3">Properties</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="max-h-[120px] overflow-y-auto divide-y divide-border">
                <PropertyRow icon={Folder} label="Project" value={task.project} />
                <PropertyRow icon={Bot} label="Agent" value={task.agent ? agentLabels[task.agent] || task.agent : undefined} />
                <PropertyRow icon={Sparkles} label="Provider" value={task.provider ? providerLabels[task.provider] || task.provider : undefined} />
                <PropertyRow icon={Zap} label="Model" value={task.model ? modelLabels[task.model] || task.model : undefined} />
                <PropertyRow icon={User} label="Assignee" value={task.assignee} />
                <PropertyRow icon={Calendar} label="Due Date" value={task.dueDate} />
              </div>
            </div>
          </div>

          <div className="border-t border-border my-6" />

          {/* Tabbed Info Panel */}
          <div>
            <div className="flex items-center gap-1 mb-4 border-b border-border">
              <button onClick={() => setActiveInfoTab('activity')} className={cn("flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px", activeInfoTab === 'activity' ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}>
                <MessageSquare className="w-4 h-4" />Activity
              </button>
              <button onClick={() => setActiveInfoTab('ai-session')} className={cn("flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px", activeInfoTab === 'ai-session' ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}>
                <Bot className="w-4 h-4" />AI Session
              </button>
              <button onClick={() => setActiveInfoTab('diffs')} className={cn("flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px", activeInfoTab === 'diffs' ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}>
                <GitBranch className="w-4 h-4" />Diffs
              </button>
            </div>

            {/* Activity Tab */}
            {activeInfoTab === 'activity' && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5"><User className="w-3 h-3 text-muted-foreground" /></div>
                  <div><p className="text-foreground">Task created</p><p className="text-xs text-muted-foreground">2 days ago</p></div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5"><GitBranch className="w-3 h-3 text-blue-500" /></div>
                  <div><p className="text-foreground">Branch created: feature/{task.id}</p><p className="text-xs text-muted-foreground">1 day ago</p></div>
                </div>
              </div>
            )}

            {/* AI Session Tab */}
            {activeInfoTab === 'ai-session' && (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {mockChatMessages.map((msg) => (
                  <div key={msg.id} className="mb-6">
                    <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mb-2">{msg.content}</div>
                    {msg.files && msg.files.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-2 py-1 bg-muted/30 rounded text-xs font-mono text-muted-foreground">
                        <FileCode className="w-3 h-3" /><span className="flex-1">{file.name}</span>
                        {file.additions !== undefined && <span className="text-green-500">+{file.additions}</span>}
                        {file.deletions !== undefined && file.deletions > 0 && <span className="text-red-500">-{file.deletions}</span>}
                      </div>
                    ))}
                    {msg.commands && msg.commands.map((cmd, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-2 py-1 bg-muted/30 rounded text-xs font-mono">
                        <Terminal className="w-3 h-3 text-muted-foreground" /><span className="flex-1 text-foreground">{cmd.cmd}</span>
                        {cmd.status === 'success' && <CheckCircle className="w-3 h-3 text-green-500" />}
                      </div>
                    ))}
                  </div>
                ))}
                {isTyping && <div className="flex items-center gap-2 text-sm text-muted-foreground"><span>Thinking...</span></div>}
              </div>
            )}

            {/* Diffs Tab */}
            {activeInfoTab === 'diffs' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                  <span>{mockDiffs.length} file{mockDiffs.length > 1 ? 's' : ''} changed,</span>
                  <span className="text-green-500">+{mockDiffs.reduce((sum, d) => sum + d.additions, 0)}</span>
                  <span className="text-red-500">-{mockDiffs.reduce((sum, d) => sum + d.deletions, 0)}</span>
                </div>
                {mockDiffs.map((diff) => (
                  <div key={diff.id} className={cn("border rounded-lg overflow-hidden", diffApprovals[diff.id] === 'approved' && "border-green-500/50", diffApprovals[diff.id] === 'rejected' && "border-red-500/50", !diffApprovals[diff.id] && "border-border")}>
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
                      <button onClick={() => handleDiffFileClick(diff.id)} className="flex items-center gap-2 flex-1 hover:bg-muted/50 px-1 py-0.5 rounded transition-colors cursor-pointer">
                        <FileCode className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{diff.filename}</span>
                        {diffApprovals[diff.id] === 'approved' && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 font-medium">Approved</span>}
                        {diffApprovals[diff.id] === 'rejected' && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 font-medium">Rejected</span>}
                      </button>
                      <span className="text-xs text-green-500">+{diff.additions}</span>
                      {diff.deletions > 0 && <span className="text-xs text-red-500">-{diff.deletions}</span>}
                      <button onClick={() => handleDiffFileClick(diff.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="View file details"><ExternalLink className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleApproveDiff(diff.id)} className={cn("p-1.5 rounded", diffApprovals[diff.id] === 'approved' ? "bg-green-500/20 text-green-500" : "hover:bg-green-500/10 text-muted-foreground hover:text-green-500")}><ThumbsUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleRejectDiff(diff.id)} className={cn("p-1.5 rounded", diffApprovals[diff.id] === 'rejected' ? "bg-red-500/20 text-red-500" : "hover:bg-red-500/10 text-muted-foreground hover:text-red-500")}><ThumbsDown className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto bg-background font-mono text-xs">
                      {diff.chunks.map((chunk, idx) => (
                        <div key={idx}>
                          <div className="px-3 py-1 bg-muted/30 text-muted-foreground border-b border-border/50">{chunk.header}</div>
                          {chunk.lines.map((line, lineIdx) => (
                            <div key={lineIdx} className={cn("px-3 py-0.5 flex items-start gap-3", line.type === 'add' && "bg-green-500/10")}>
                              <span className="w-12 text-right text-muted-foreground/60 select-none shrink-0">{line.lineNum}</span>
                              <span className={cn("w-4 shrink-0", line.type === 'add' && "text-green-500")}>+</span>
                              <span className="flex-1 text-green-400">{line.content}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Chat Input Footer */}
      <div className="border-t border-border p-4">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-border bg-muted/30 p-3 focus-within:border-primary/50 transition-colors">
            <div className="mb-2">
              <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted text-muted-foreground transition-colors">
                <AtSign className="w-3.5 h-3.5" />Add context
              </button>
            </div>
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleChatKeyDown} placeholder="Ask, search, or make anything..." className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none mb-2" disabled={isTyping} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-0.5">
                <button className="p-2 rounded-lg hover:bg-muted transition-colors"><Paperclip className="w-4 h-4 text-muted-foreground" /></button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Auto</button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"><Globe className="w-3.5 h-3.5" />All sources</button>
              </div>
              {task.columnId === 'not-started' ? (
                <button onClick={handleStartTask} className="h-7 px-3 rounded-lg flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium"><Play className="w-3.5 h-3.5" />Start</button>
              ) : task.columnId === 'in-progress' ? (
                <button onClick={handleCancelTask} className="h-7 px-3 rounded-lg flex items-center justify-center gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors text-xs font-medium"><X className="w-3.5 h-3.5" />Cancel</button>
              ) : (
                <button onClick={handleContinueTask} className="h-7 px-3 rounded-lg flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium"><Play className="w-3.5 h-3.5" />Continue</button>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* File Details Panel - shown on the right when a diff file is selected */}
      {selectedDiffFile && (
        <div className="w-1/2 border-l border-border flex flex-col bg-sidebar">
          {/* File Details Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-foreground">File Details</span>
            <button onClick={handleCloseFileDetails} className="p-1 rounded hover:bg-muted transition-colors" title="Close">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* File Details Tabs */}
          <div className="flex items-center gap-1 px-4 pt-3 border-b border-border">
            <button onClick={() => setSubPanelTab('chat-session')} className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px", subPanelTab === 'chat-session' ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}>
              <Bot className="w-3.5 h-3.5" />Chat Session
            </button>
            <button onClick={() => setSubPanelTab('diffs')} className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px", subPanelTab === 'diffs' ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}>
              <GitBranch className="w-3.5 h-3.5" />Diffs
            </button>
          </div>

          {/* File Details Content */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {subPanelTab === 'chat-session' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-foreground mb-3">AI Session Messages</h3>
                  {mockChatMessages.map((msg) => (
                    <div key={msg.id} className="mb-6">
                      <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mb-2">{msg.content}</div>
                    </div>
                  ))}
                </div>
              )}

              {subPanelTab === 'diffs' && (
                <div>
                  {mockDiffs.filter(diff => diff.id === selectedDiffFile).map((diff) => (
                    <div key={diff.id}>
                      {/* File Header */}
                      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border flex-wrap">
                        <FileCode className="w-5 h-5 text-muted-foreground" />
                        <span className="text-base font-medium text-foreground">{diff.filename}</span>
                        {diffApprovals[diff.id] === 'approved' && <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/20 text-green-600 font-medium">Approved</span>}
                        {diffApprovals[diff.id] === 'rejected' && <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-red-600 font-medium">Rejected</span>}
                        <span className="text-sm text-green-500 ml-auto">+{diff.additions}</span>
                        {diff.deletions > 0 && <span className="text-sm text-red-500">-{diff.deletions}</span>}
                        <div className="flex items-center gap-2 ml-2">
                          <button onClick={() => handleApproveDiff(diff.id)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors", diffApprovals[diff.id] === 'approved' ? "bg-green-500 text-white" : "bg-green-500/10 text-green-600 hover:bg-green-500/20")}>
                            <ThumbsUp className="w-4 h-4" />Approve
                          </button>
                          <button onClick={() => handleRejectDiff(diff.id)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors", diffApprovals[diff.id] === 'rejected' ? "bg-red-500 text-white" : "bg-red-500/10 text-red-600 hover:bg-red-500/20")}>
                            <ThumbsDown className="w-4 h-4" />Reject
                          </button>
                        </div>
                      </div>

                      {/* Diff Content */}
                      <div className="border border-border rounded-lg overflow-hidden">
                        {diff.chunks.map((chunk, chunkIdx) => (
                          <div key={chunkIdx} className="font-mono text-xs">
                            <div className="px-3 py-2 bg-muted/30 text-muted-foreground border-b border-border/50 sticky top-0">{chunk.header}</div>
                            <div className="bg-background">
                              {chunk.lines.map((line, lineIdx) => (
                                <div key={lineIdx} className={cn("px-3 py-1 flex items-start gap-3", line.type === 'add' && "bg-green-500/10")}>
                                  <span className="w-12 text-right text-muted-foreground/60 select-none shrink-0">{line.lineNum}</span>
                                  <span className={cn("w-4 shrink-0", line.type === 'add' && "text-green-500")}>+</span>
                                  <span className={cn("flex-1 break-all", line.type === 'add' && "text-green-400")}>{line.content}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
