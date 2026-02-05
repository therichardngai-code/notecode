import { useFilterStore } from '../../shared/stores/filter-store';
import type { TaskPriority } from '../../domain/entities';

export function BoardFilters() {
  const {
    priorityFilter,
    searchQuery,
    setPriorityFilter,
    setSearchQuery,
    resetFilters,
  } = useFilterStore();

  return (
    <div className="bg-card rounded-lg border border-border p-4 mb-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <select
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(e.target.value as TaskPriority | 'all')
            }
            className="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <button
          onClick={resetFilters}
          className="px-4 py-2 text-secondary-foreground bg-secondary rounded-md hover:bg-secondary/80 transition-colors"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}
