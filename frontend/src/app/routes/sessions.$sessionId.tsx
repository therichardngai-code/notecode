import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { ChatContainer, ChatInput } from '../../features/chat';
import type { Message } from '../../domain/entities';

export const Route = createFileRoute('/sessions/$sessionId')({
  component: SessionDetail,
});

function SessionDetail() {
  const { sessionId } = Route.useParams();
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      sessionId,
      role: 'user',
      blocks: [{ type: 'text', content }],
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleApprove = (filePath: string) => {
    console.log('Approve:', filePath);
    // TODO: Call ApproveChangeUseCase
  };

  const handleReject = (filePath: string) => {
    console.log('Reject:', filePath);
    // TODO: Call ApproveChangeUseCase
  };

  const handleFileClick = (path: string) => {
    console.log('File clicked:', path);
    // TODO: Open file in editor
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Session: {sessionId}
        </h1>
      </header>
      <main className="flex-1 overflow-hidden">
        <ChatContainer
          messages={messages}
          onApprove={handleApprove}
          onReject={handleReject}
          onFileClick={handleFileClick}
          height={window.innerHeight - 180}
        />
      </main>
      <footer>
        <ChatInput onSend={handleSendMessage} />
      </footer>
    </div>
  );
}
