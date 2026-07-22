import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface TaskDetail {
  id: number;
  title: string;
  budget: number;
  doer?: { display_name: string };
  asker?: { display_name: string };
}

interface UserRole {
  role: 'asker' | 'doer';
  id: number;
}

export default function TaskCompletedPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user role
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUserRole(JSON.parse(userStr));
    }

    fetchTaskDetails();
  }, [id]);

  const fetchTaskDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTask(response.data.data);
    } catch (err) {
      console.error('Failed to load errand:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !task || !userRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">✓</div>
          <p className="text-gray-600 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  const isAsker = userRole.role === 'asker';
  const otherPartyName = isAsker ? task.doer?.display_name : task.asker?.display_name;

  // ============= DOER VIEW: Task Completed =============
  if (!isAsker) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-4 pb-32">
        <div className="max-w-2xl mx-auto">
          {/* Celebration */}
          <div className="text-center mt-12 mb-8">
            <div className="text-9xl mb-4 animate-bounce">✓</div>
            <h1 className="text-4xl font-bold text-green-700 mb-2">Errand Completed!</h1>
            <p className="text-lg text-gray-600">Amazing work! You've submitted your completion.</p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-8 text-center">
              <h2 className="text-2xl font-bold mb-1">{task.title}</h2>
              <p className="text-green-100">Waiting for {task.asker?.display_name || 'the asker'} to review</p>
            </div>

            <div className="p-8 space-y-6">
              {/* What Happens Next */}
              <div className="space-y-4">
                <h3 className="font-bold text-errandify-brown text-lg">What Happens Next?</h3>

                <div className="space-y-3">
                  {/* Step 1 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700">
                      1
                    </div>
                    <div className="pt-1">
                      <p className="font-semibold text-errandify-brown">Asker Reviews Your Work</p>
                      <p className="text-sm text-gray-600">They'll check your photos and notes</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center font-bold text-yellow-700">
                      2
                    </div>
                    <div className="pt-1">
                      <p className="font-semibold text-errandify-brown">Payment Processing</p>
                      <p className="text-sm text-gray-600">SGD arrives in 24-48 hours (if no dispute)</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700">
                      3
                    </div>
                    <div className="pt-1">
                      <p className="font-semibold text-errandify-brown">Get Rated</p>
                      <p className="text-sm text-gray-600">Rate {task.asker?.display_name || 'the asker'} too!</p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700">
                      🎉
                    </div>
                    <div className="pt-1">
                      <p className="font-semibold text-errandify-brown">Earn Errandify Points</p>
                      <p className="text-sm text-gray-600">Up to 40 EP on a 5⭐ rating!</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>💰 Errand Budget:</strong> SGD ${task.budget.toFixed(2)}
                </p>
                <p className="text-xs text-green-700 mt-2">
                  Payment will be released once {task.asker?.display_name || 'the asker'} approves and there's no active dispute.
                </p>
              </div>

              {/* Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-semibold text-blue-900">💡 Quick Tips:</p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>✓ Good photos help get faster approvals</li>
                  <li>✓ Clear notes prevent misunderstandings</li>
                  <li>✓ Rate promptly for faster ratings</li>
                  <li>✓ Build your reputation = better matches</li>
                </ul>
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  onClick={() => navigate('/my-offers')}
                  className="py-3 rounded-lg font-bold text-errandify-orange border-2 border-orange-200 hover:bg-orange-50 transition"
                >
                  ← My Offers
                </button>
                <button
                  onClick={() => navigate('/home')}
                  className="py-3 rounded-lg font-bold text-white bg-green-500 hover:bg-green-600 transition"
                >
                  Go to Home →
                </button>
              </div>
            </div>
          </div>

          {/* Encouragement */}
          <div className="text-center mt-8">
            <p className="text-lg font-bold text-green-700 mb-2">🌟 You're Building Your Reputation!</p>
            <p className="text-sm text-gray-600">
              Every completed errand gets you closer to earning more and matching with better errands.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============= ASKER VIEW: Completion Submitted =============
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 pb-32">
      <div className="max-w-2xl mx-auto">
        {/* Celebration */}
        <div className="text-center mt-12 mb-8">
          <div className="text-9xl mb-4 animate-bounce">📦</div>
          <h1 className="text-4xl font-bold text-blue-700 mb-2">Completion Submitted!</h1>
          <p className="text-lg text-gray-600">{task.doer?.display_name || 'The doer'} finished the work.</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-8 text-center">
            <h2 className="text-2xl font-bold mb-1">{task.title}</h2>
            <p className="text-blue-100">Ready for your review</p>
          </div>

          <div className="p-8 space-y-6">
            {/* Action Needed */}
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
              <p className="text-sm font-semibold text-yellow-900 mb-2">⏳ Your Review Needed</p>
              <p className="text-sm text-yellow-800">
                {task.doer?.display_name || 'The doer'} has submitted their completion. Review their photos and notes, then approve or request changes.
              </p>
            </div>

            {/* Next Steps */}
            <div className="space-y-4">
              <h3 className="font-bold text-errandify-brown text-lg">What to Do Now?</h3>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700">
                    1
                  </div>
                  <div className="pt-1">
                    <p className="font-semibold text-errandify-brown">Review the Work</p>
                    <p className="text-sm text-gray-600">Check photos and notes they provided</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700">
                    2
                  </div>
                  <div className="pt-1">
                    <p className="font-semibold text-errandify-brown">Approve or Request Changes</p>
                    <p className="text-sm text-gray-600">Choose wisely - this triggers payment!</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700">
                    3
                  </div>
                  <div className="pt-1">
                    <p className="font-semibold text-errandify-brown">Release Payment</p>
                    <p className="text-sm text-gray-600">SGD arrives to doer in 24-48 hours</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-700">
                    ⭐
                  </div>
                  <div className="pt-1">
                    <p className="font-semibold text-errandify-brown">Rate & Earn EP</p>
                    <p className="text-sm text-gray-600">Rate the doer and earn up to 25 EP!</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Budget Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>💰 Errand Budget:</strong> SGD ${task.budget.toFixed(2)}
              </p>
              <p className="text-xs text-blue-700 mt-2">
                This amount will be deducted from your account once you approve the completion.
              </p>
            </div>

            {/* Review Button */}
            <button
              onClick={() => navigate(`/review/${id}`)}
              className="w-full py-4 rounded-lg font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 transition text-lg"
            >
              👀 Review Their Work
            </button>

            {/* Secondary Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => navigate('/errands')}
                className="py-3 rounded-lg font-bold text-errandify-orange border-2 border-orange-200 hover:bg-orange-50 transition"
              >
                ← My Errands
              </button>
              <button
                onClick={() => navigate('/home')}
                className="py-3 rounded-lg font-bold text-gray-700 border-2 border-gray-300 hover:bg-gray-50 transition"
              >
                Home →
              </button>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-red-900 mb-1">⚠️ Important</p>
          <p className="text-xs text-red-800">
            Only approve if you're satisfied with the work. Once approved, {task.doer?.display_name || 'the doer'} can request disputes for 24-48 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
