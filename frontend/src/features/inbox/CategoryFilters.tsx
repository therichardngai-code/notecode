import type { NotificationType } from '../../domain/entities/notification';

interface CategoryFiltersProps {
  activeFilter: NotificationType | 'all';
  onFilterChange: (filter: NotificationType | 'all') => void;
  counts: Record<NotificationType | 'all', number>;
}

export const CategoryFilters: React.FC<CategoryFiltersProps> = ({
  activeFilter,
  onFilterChange,
  counts,
}) => {
  const categories: Array<{ label: string; value: NotificationType | 'all' }> = [
    { label: 'All', value: 'all' },
    { label: 'Approvals', value: 'approval-pending' },
    { label: 'Tasks', value: 'task-completed' },
    { label: 'Reviews', value: 'review-ready' },
    { label: 'Errors', value: 'error' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        padding: '8px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#fafafa',
        overflowX: 'auto',
      }}
    >
      {categories.map((category) => {
        const count = counts[category.value] ?? 0;
        const isActive = activeFilter === category.value;

        return (
          <button
            key={category.value}
            onClick={() => onFilterChange(category.value)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: isActive ? 'bold' : 'normal',
              border: '1px solid',
              borderColor: isActive ? '#007acc' : '#d0d0d0',
              backgroundColor: isActive ? '#007acc' : 'white',
              color: isActive ? 'white' : '#333',
              borderRadius: '4px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {category.label}
            {count > 0 && (
              <span
                style={{
                  marginLeft: '6px',
                  padding: '2px 6px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : '#007acc',
                  color: isActive ? 'white' : 'white',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
