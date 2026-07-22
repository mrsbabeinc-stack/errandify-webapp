import { TaskData } from '../../pages/HanaTaskCreationPage';

interface TaskReviewModalProps {
  taskData: TaskData;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function TaskReviewModal({
  taskData,
  onConfirm,
  onCancel,
  isSubmitting,
}: TaskReviewModalProps) {
  const categoryEmojis: Record<string, string> = {
    'eldercare': '👴',
    'childcare': '🧒',
    'homehelp': '🏠',
    'wellness': '🌿',
    'tripcarry': '✈️',
    'petcare': '🐾',
    'delivery': '📦',
    'eventhelp': '🎉',
    'donate': '❤️',
    'localbiz': '🏪',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-errandify-brown mb-6">Review Your Errand</h2>

        {/* Task Summary */}
        <div className="space-y-4 mb-6 bg-gray-50 p-4 rounded-lg">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">Errand</p>
            <p className="text-lg font-semibold text-errandify-brown">{taskData.title}</p>
          </div>

          {taskData.description && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Details</p>
              <p className="text-sm text-gray-700 line-clamp-2">{taskData.description}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">📍 Location</p>
            <p className="text-sm text-gray-700">{taskData.location}</p>
            {taskData.area && <p className="text-xs text-gray-500">Area: {taskData.area}</p>}
            {taskData.fullAddress && <p className="text-xs text-gray-500">📬 {taskData.fullAddress}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">💰 Budget</p>
              <p className="text-sm font-semibold text-errandify-orange">
                SGD ${taskData.budget || '0'}
              </p>
            </div>

            {taskData.duration && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">⏱️ Duration</p>
                <p className="text-sm text-gray-700">{taskData.duration} {taskData.durationUnit || 'Hr'}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">📅 Date</p>
              <p className="text-sm text-gray-700">
                {new Date(taskData.date).toLocaleDateString('en-SG')}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">⏰ Time</p>
              <p className="text-sm text-gray-700">{taskData.time}</p>
            </div>
          </div>

          {taskData.category && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Category</p>
              <div className="inline-block bg-errandify-orange text-white px-3 py-1 rounded-full text-xs font-semibold">
                {categoryEmojis[taskData.category] || '📝'} {taskData.category}
              </div>
            </div>
          )}

          {taskData.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">📌 Notes</p>
              <p className="text-sm text-gray-700">{taskData.notes}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 border border-gray-300 py-3 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Edit
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Posting...' : 'Post Errand'}
          </button>
        </div>

        {/* Info Message */}
        <p className="text-xs text-gray-500 text-center mt-4">
          You can edit this errand anytime after posting.
        </p>
      </div>
    </div>
  );
}
