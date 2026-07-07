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

  const getTaskSpecificTips = (title: string, category?: string): string => {
    const lowerTitle = title.toLowerCase();

    // Category-specific tips with certification references
    if (category === 'childcare') {
      return '📚 Ideal for: Childcare certification (ECSRN), Early Childhood Development knowledge. • Confirm emergency contacts, dietary needs, and sleep schedules. • Update asker with photos/messages. • Have safeguarding knowledge.';
    }

    if (category === 'eldercare') {
      return '👴 Ideal for: Eldercare/caregiver certification, dementia care training. • Ask about mobility, medication, or special care needs. • Keep emergency contacts handy. • Practice patience & compassionate communication.';
    }

    if (category === 'wellness') {
      return '💪 Ideal for: Fitness certification (ACE, NASM), nutritionist/dietitian credentials. • Clarify health conditions or injuries before starting. • Check insurance/liability if providing fitness services. • Customize approach to asker\'s fitness level.';
    }

    if (category === 'homehelp') {
      return '🏠 Ideal for: Home maintenance certification, pest control license (if needed). • Document before/after with photos. • Use safe, eco-friendly products when possible. • Request access details & restricted areas beforehand.';
    }

    if (category === 'petcare') {
      return '🐾 Ideal for: Pet first aid, dog training certification (optional). • Ask about pet temperament, diet, medications, emergency vet. • Know breed-specific needs & allergies. • Keep leashes & safety equipment ready.';
    }

    if (category === 'delivery') {
      return '📦 Ideal for: Driver\'s license, vehicle insurance, delivery experience. • Photo-document items before & after pickup. • Confirm fragile items & handling instructions. • Provide real-time location updates to asker.';
    }

    if (category === 'tripcarry') {
      return '✈️ Ideal for: Knowledge of customs regulations, immigration requirements. • Clarify prohibited items & declaration needs. • Get detailed list of items before traveling. • Keep receipts & documentation for customs.';
    }

    if (category === 'eventhelp') {
      return '🎉 Ideal for: Event planning experience, vendor management skills. • Arrive early to assess setup & requirements. • Confirm materials, timeline, & responsibilities. • Stay in frequent contact with organizer.';
    }

    if (category === 'donate') {
      return '❤️ Ideal for: Community service experience, knowledge of local charities. • Confirm donation items & recipient organizations. • Handle donations with care & respect. • Keep donation records for tax purposes.';
    }

    if (category === 'localbiz') {
      return '📋 Ideal for: Business administration, document handling, accounting knowledge. • Handle documents with care & confidentiality. • Understand filing systems & organizational needs. • Provide accurate pickup/delivery with proper receipts.';
    }

    return '✅ Ideal for: Relevant skills & experience in this area. • Communicate clearly about expectations & timeline. • Take progress photos/videos as documentation. • Provide professional, friendly service.';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-errandify-brown mb-6">Review Your Task</h2>

        {/* Tips for Doers */}
        {taskData.category && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6">
            <p className="text-xs font-semibold text-errandify-orange mb-2">💡 What doers should know:</p>
            <p className="text-xs text-errandify-orange leading-relaxed">
              {getTaskSpecificTips(taskData.title, taskData.category)}
            </p>
          </div>
        )}

        {/* Task Summary */}
        <div className="space-y-4 mb-6 bg-gray-50 p-4 rounded-lg">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">Task</p>
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
            {isSubmitting ? 'Posting...' : 'Post Task'}
          </button>
        </div>

        {/* Info Message */}
        <p className="text-xs text-gray-500 text-center mt-4">
          You can edit this task anytime after posting.
        </p>
      </div>
    </div>
  );
}
