import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Brain, Plus, Search, Edit2, Trash2, BookOpen, Lightbulb, Settings2, FileText } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';

export const Route = createFileRoute('/memory')({
  component: MemoryPage,
});

type MemoryType = 'rule' | 'guide' | 'preference' | 'context';

interface Memory {
  id: string;
  type: MemoryType;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

function MemoryPage() {
  const [filter, setFilter] = useState<MemoryType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - replace with actual data
  const [memories] = useState<Memory[]>([
    { id: '1', type: 'rule', title: 'Code Style', content: 'Use TypeScript strict mode. Prefer functional components.', createdAt: new Date(), updatedAt: new Date() },
    { id: '2', type: 'guide', title: 'Project Structure', content: 'Features go in src/features/, shared components in src/shared/', createdAt: new Date(), updatedAt: new Date() },
    { id: '3', type: 'preference', title: 'Testing', content: 'Write unit tests for all use cases and hooks', createdAt: new Date(), updatedAt: new Date() },
    { id: '4', type: 'context', title: 'Current Sprint', content: 'Working on AI Workspace MVP - Phase 1 features', createdAt: new Date(), updatedAt: new Date() },
  ]);

  const filteredMemories = memories.filter(m => {
    const matchesFilter = filter === 'all' || m.type === filter;
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         m.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getTypeIcon = (type: MemoryType) => {
    switch (type) {
      case 'rule': return <Settings2 className="w-4 h-4" />;
      case 'guide': return <BookOpen className="w-4 h-4" />;
      case 'preference': return <Lightbulb className="w-4 h-4" />;
      case 'context': return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: MemoryType) => {
    switch (type) {
      case 'rule': return 'bg-red-100 text-red-800';
      case 'guide': return 'bg-blue-100 text-blue-800';
      case 'preference': return 'bg-yellow-100 text-yellow-800';
      case 'context': return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            <h1 className="text-xl font-semibold">Memory</h1>
          </div>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Memory
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Type Filters */}
        <div className="flex gap-2">
          {(['all', 'rule', 'guide', 'preference', 'context'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filter === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Memory List */}
      <div className="flex-1 overflow-auto p-4">
        {filteredMemories.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No memories found</p>
            <p className="text-sm mt-1">Add rules, guides, and context for the AI</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMemories.map((memory) => (
              <div
                key={memory.id}
                className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(memory.type)}
                    <span className="font-medium">{memory.title}</span>
                    <span className={`px-2 py-0.5 text-xs rounded ${getTypeColor(memory.type)}`}>
                      {memory.type}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded hover:bg-muted">
                      <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button className="p-1.5 rounded hover:bg-muted">
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{memory.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
