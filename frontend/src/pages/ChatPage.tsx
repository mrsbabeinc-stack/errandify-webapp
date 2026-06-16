interface ChatPageProps {
  userRole: 'asker' | 'doer';
}

export default function ChatPage({ userRole }: ChatPageProps) {
  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-errandify-brown mb-4">Messages</h1>
      <p className="text-gray-600 mb-6">
        Chat with users about errands
      </p>

      {/* TODO: Implement real-time chat with Qwen AI integration */}
      <div className="grid gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-500">Chat interface coming soon...</p>
        </div>
      </div>
    </div>
  );
}
