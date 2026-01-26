import { SessionList } from './components';
import { useState } from 'react';

/**
 * Demo component showing how to use Session components
 */
export function SessionsDemo() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  return (
    <div className="h-screen flex">
      <div className="w-96 border-r border-border">
        <SessionList
          onSessionClick={setSelectedSessionId}
          onNewSession={() => console.log('New session')}
        />
      </div>
      <div className="flex-1">
        {selectedSessionId ? (
          <div className="p-4 text-muted-foreground">
            Selected session: {selectedSessionId}
            {/* SessionDetail would go here with actual session data */}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Select a session to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
