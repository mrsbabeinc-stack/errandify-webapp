import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import BidSubmissionModal from '../components/BidSubmissionModal';
import BidsViewer from '../components/BidsViewer';
import TaskChatbox from '../components/TaskChatbox';
import RecurringErrandSessionSelector from '../components/RecurringErrandSessionSelector';
import TaskQA from '../components/TaskQA';
import ErrandActivityLog from '../components/ErrandActivityLog';
import { capitalizeStatus } from '../utils/format';

interface ErrandDetail {
  id: number;
  errandId?: string;
  formatted_id?: string;
  title: string;
  description?: string;
  notes?: string;
  category: string;
  status: string;
  budget?: number;
  deadline?: string;
  location?: string;
  postal_code?: string;
  postalCode?: string;
  askerId?: number;
  askerName?: string;
  asker?: { name: string; mobile: string; display_name?: string };
  doerName?: string;
  createdAt: string;
  isRecurring?: boolean;
  bidCount?: number;
  acceptedBidId?: number;
}

interface UserProfile {
  id: number;
  role: 'asker' | 'doer';
  name?: string;
}

interface AcceptedBid {
  id: number;
  doerId: number;
}

interface Props {
  userRole?: 'asker' | 'doer';
}

export default function ErrandDetailPage({ userRole = 'doer' }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const activityTimelineRef = useRef<any>(null);
  const [errand, setErrand] = useState<ErrandDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showSessionSelector, setShowSessionSelector] = useState(false);
  const [bidSubmitted, setBidSubmitted] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [userBidAmount, setUserBidAmount] = useState<number | null>(null);
  const [confirmationTimeLeft, setConfirmationTimeLeft] = useState<string>('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedTipToClipboard, setCopiedTipToClipboard] = useState(false);
  const [showCompletionEvidence, setShowCompletionEvidence] = useState(false);
  const [completionPhotos, setCompletionPhotos] = useState<any[]>([]);
  const [completionNotes, setCompletionNotes] = useState('');
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [showCelebratory, setShowCelebratory] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
    }

    // Load user bids from localStorage
    if (id) {
      const bids = JSON.parse(localStorage.getItem('userBids') || '{}');
      setUserBidAmount(bids[id] || null);
    }
  }, [id]);

  useEffect(() => {
    fetchErrandDetail();
  }, [id]);

  // Redirect askers to their own errands page if they try to browse others' posts
  useEffect(() => {
    if (errand && userRole === 'asker' && currentUser && currentUser.id !== errand.askerId) {
      navigate('/errands', { replace: true });
    }
  }, [errand, userRole, currentUser, navigate]);

  const fetchErrandDetail = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated. Please log in.');
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success && response.data.data) {
        setErrand(response.data.data);
      } else {
        setError('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Errand fetch error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load errand details';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompletionEvidence = async () => {
    if (showCompletionEvidence) {
      setShowCompletionEvidence(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/jobs/${id}/submissions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && response.data.data) {
        const submissions = response.data.data.submissions || [];
        const latestSubmission = submissions[submissions.length - 1];
        if (latestSubmission) {
          setCompletionNotes(latestSubmission.completion_notes || '');
          setCompletionPhotos(latestSubmission.files || []);
        }
        setShowCompletionEvidence(true);

        // Log that asker viewed the evidence
        await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${id}/log-viewed-evidence`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        ).catch(err => console.error('Failed to log evidence viewed:', err));
      }
    } catch (err: any) {
      console.error('Failed to load completion evidence:', err);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      // GROUP 1: HOME & HOUSEHOLD
      'home-maintenance': 'bg-orange-100 text-orange-700',
      'cleaning-household': 'bg-orange-100 text-errandify-orange-700',
      'food-beverage': 'bg-red-100 text-red-700',
      'furniture-assembly': 'bg-amber-100 text-amber-700',

      // GROUP 2: ERRANDS & LOGISTICS
      'shopping-errands': 'bg-pink-100 text-pink-700',
      'delivery-moving': 'bg-yellow-100 text-yellow-700',
      'travel-mobility': 'bg-sky-100 text-sky-700',
      'event-planning': 'bg-violet-100 text-violet-700',

      // GROUP 3: CARE & WELLBEING
      'childcare-education': 'bg-green-100 text-green-700',
      'eldercare-healthcare': 'bg-gray-100 text-gray-700',
      'pet-care': 'bg-purple-100 text-purple-700',
      'personal-care': 'bg-rose-100 text-rose-700',

      // GROUP 4: SKILLS & SERVICES
      'tech-support': 'bg-indigo-100 text-indigo-700',
      'creative-arts': 'bg-fuchsia-100 text-fuchsia-700',
      'admin-business': 'bg-slate-100 text-slate-700',
      'charity-community': 'bg-red-100 text-red-700',

      // Legacy category names for backwards compatibility
      'cleaning-laundry': 'bg-orange-100 text-errandify-orange-700',
      'childcare-tutoring': 'bg-pink-100 text-pink-700',
      'moving-help': 'bg-red-100 text-red-700',
      'tech-support-it': 'bg-indigo-100 text-indigo-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  // Singapore postal code to area mapping (first 2 digits) - same as Hana form
  const postalCodeAreas: Record<string, string> = {
    '01': 'Raffles Place', '02': 'Cecil Street', '03': 'Tanjong Pagar', '04': 'Tanjong Pagar', '05': 'Outram',
    '06': 'People\'s Park', '07': 'Chinatown', '08': 'Tanjong Pagar', '09': 'Tanjong Pagar', '10': 'Orchard',
    '11': 'Orchard', '12': 'Novena', '13': 'Newton', '14': 'Farrer Park', '15': 'Henderson',
    '16': 'Henderson', '17': 'Balestier', '18': 'Macpherson', '19': 'Paya Lebar', '20': 'Paya Lebar',
    '21': 'Geylang', '22': 'Geylang', '23': 'Geylang', '24': 'Eunos', '25': 'Bedok',
    '26': 'Bedok', '27': 'Bedok', '28': 'Tampines', '29': 'Tampines', '30': 'Tampines',
    '31': 'Pasir Ris', '32': 'Pasir Ris', '33': 'Punggol', '34': 'Punggol', '35': 'Hougang',
    '36': 'Hougang', '37': 'Sengkang', '38': 'Sengkang', '39': 'Sengkang', '40': 'Jurong West',
    '41': 'Jurong West', '42': 'Jurong', '43': 'Jurong East', '44': 'Clementi', '45': 'Clementi',
    '46': 'Clementi', '47': 'Bukit Merah', '48': 'Bukit Merah', '49': 'Tiong Bahru', '50': 'Redhill',
    '51': 'Queenstown', '52': 'Commonwealth', '53': 'Pasir Panjang', '54': 'Pasir Panjang', '55': 'Bukit Timah',
    '56': 'Bukit Timah', '57': 'Holland', '58': 'Tanglin', '59': 'Clementi', '60': 'Bukit Timah',
    '61': 'Bishan', '62': 'Bishan', '63': 'Ang Mo Kio', '64': 'Ang Mo Kio', '65': 'Serangoon',
    '66': 'Serangoon', '67': 'Ang Mo Kio', '68': 'Choa Chu Kang', '69': 'Geylang', '70': 'Bedok',
    '71': 'Bedok', '72': 'Bedok', '73': 'Bedok', '74': 'Tampines', '75': 'Tampines',
    '76': 'Tampines', '77': 'Tampines', '78': 'Tampines', '79': 'Sengkang', '80': 'Sengkang',
    '81': 'Sengkang', '82': 'Sengkang',
  };

  const getAreaOnly = (location?: string, postalCode?: string) => {
    if (!location) return null;
    if (location.toLowerCase() === 'remote') return 'Remote';

    // Split by comma
    const parts = location.split(',').map(p => p.trim());

    // Street keywords and patterns to filter out
    const isStreetOrUnit = (part: string) => {
      return /avenue|street|road|lane|drive|boulevard|crescent|terrace|place|court|building|blk|block|^#\d+|\d+[-\/]\d+/i.test(part) ||
             /^\d{6}$/.test(part) || // postal code
             /^\d+$/.test(part) || // just numbers
             part.toLowerCase() === 'singapore';
    };

    // Strategy 1: Find part right before "Singapore" (if exists)
    const singaporeIdx = parts.findIndex(p => p.toLowerCase() === 'singapore');
    if (singaporeIdx > 0) {
      let areaCandidate = parts[singaporeIdx - 1];
      if (areaCandidate && !isStreetOrUnit(areaCandidate)) {
        return areaCandidate;
      }
      // If prev part is postal, try the one before
      if (/^\d{6}$/.test(areaCandidate) && singaporeIdx >= 2) {
        areaCandidate = parts[singaporeIdx - 2];
        if (areaCandidate && !isStreetOrUnit(areaCandidate)) {
          return areaCandidate;
        }
      }
    }

    // Strategy 2: Find the LAST part that is NOT a street/unit/postal/Singapore
    for (let i = parts.length - 1; i >= 0; i--) {
      if (!isStreetOrUnit(parts[i]) && parts[i].length > 0) {
        return parts[i];
      }
    }

    // Strategy 3: If we only have street parts, extract area from the first street address
    // E.g., "8 Eunos Road" → "Eunos"
    const firstPart = parts[0];
    if (firstPart) {
      // Try to extract area name from street address
      // "8 Eunos Road" → extract "Eunos"
      const areaMatch = firstPart.match(/\b([A-Za-z\s]+?)\s+(Road|Street|Avenue|Lane|Drive|Boulevard|Crescent|Terrace|Place|Court|Building|Blk|Block)\b/i);
      if (areaMatch && areaMatch[1]) {
        const extracted = areaMatch[1].trim();
        if (extracted.length > 0 && !/^\d+$/.test(extracted)) {
          return extracted;
        }
      }
    }

    // Strategy 4: Just return the first meaningful part
    if (parts.length > 0 && !isStreetOrUnit(parts[0])) {
      return parts[0];
    }

    return location;
  };

  const getMaskedLocation = (location?: string) => {
    if (!location) return null;

    // If it's "Remote", show as is
    if (location.toLowerCase() === 'remote') return 'Remote';

    // Extract postal code (6 digits) or area name
    const postalMatch = location.match(/\d{6}/);
    if (postalMatch) {
      return `Singapore ${postalMatch[0]}`;
    }

    // If it contains "Singapore", show only that + postal or area
    if (location.toLowerCase().includes('singapore')) {
      return location.split(',')[0]; // Show first part (area/postal)
    }

    // Otherwise, show only the last part (should be area/postal)
    const parts = location.split(',');
    return parts[parts.length - 1].trim();
  };

  const handleCancelErrand = async () => {
    const reason = window.prompt('Reason for cancellation (optional):');
    if (reason === null) {
      return; // User clicked Cancel
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${id}/cancel`,
        { reason: reason || null },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Show stage-specific success message
      const stage = response.data.stage;
      const stageMessages = {
        open: '✓ Errand cancelled. All bidders have been notified. No doer was selected yet.',
        confirmed: '⚠️ Errand cancelled after confirmation. The confirmed doer has been notified.',
        in_progress: '⚠️ Errand cancelled while in progress. A dispute has been initiated and all parties notified.',
      };

      const successMsg = stageMessages[stage] || '✓ Errand cancelled. All bids and offers have been cancelled.';
      alert(successMsg);
      navigate('/errands');
    } catch (error: any) {
      console.error('Failed to cancel errand:', error);
      const errorMsg = error.response?.data?.error || 'Failed to cancel errand. Please try again.';
      const stage = error.response?.data?.stage;

      if (stage === 'in_progress') {
        alert('⚠️ Cannot cancel job in progress.\n\nPlease contact the asker or raise a dispute if needed.');
      } else if (stage === 'completed') {
        alert('❌ Cannot cancel a completed job.');
      } else if (stage === 'cancelled') {
        alert('ℹ️ This job is already cancelled.');
      } else {
        alert(errorMsg);
      }
    }
  };

  const handleStartJob = async () => {
    const confirmMessage = `Ready to Make a Difference?\n\n"${errand.title}"\n\nYou're about to help someone in your community. Your efforts will brighten their day and create positive impact.\n\nLet's get started!`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/jobs/${id}/start`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert('Amazing! You\'ve started the errand.\n\nYou\'re making a real difference in someone\'s life. Thank you for being an awesome community doer!');
      fetchErrandDetail();
    } catch (error: any) {
      console.error('Failed to start job:', error);
      alert(error.response?.data?.error || 'Failed to start job. Please try again.');
    }
  };

  const handleCompleteErrand = async () => {
    if (!window.confirm('Mark this errand as completed?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${id}/complete`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert('You did it! The asker will rate you soon. Great work!');
      fetchErrandDetail();
    } catch (error: any) {
      console.error('Failed to complete errand:', error);
      alert(error.response?.data?.error || 'Failed to complete errand. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Loading errand details...</p>
          <p className="text-xs text-gray-500">Errand ID: {id}</p>
        </div>
      </div>
    );
  }

  if (error || !errand) {
    return (
      <div className="min-h-screen bg-errandify-bg">
        <div className="h-12"></div>
        <div className="max-w-3xl mx-auto px-4">
          <button
            onClick={() => navigate(-1)}
            className="text-errandify-orange font-semibold mb-4 text-sm"
          >
            ← Back
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 font-semibold mb-2">⚠️ {error || 'Errand not found'}</p>
            <p className="text-xs text-gray-600 mb-4">Errand ID: {id}</p>
            <p className="text-xs text-gray-500">The errand you're looking for may have been deleted or you don't have permission to view it.</p>
          </div>
        </div>
      </div>
    );
  }

  const getTaskSpecificTips = (title: string, category?: string): string => {
    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes('lunch') || lowerTitle.includes('meal') || lowerTitle.includes('cook') || lowerTitle.includes('prepare') || category === 'food-beverage') {
      return '• Confirm any dietary restrictions or allergies with the asker. • Bring all necessary cooking equipment unless specified otherwise. • Arrive 15-30 minutes early to prep ingredients.';
    }

    if (lowerTitle.includes('clean') || category === 'cleaning-laundry') {
      return '• Bring all cleaning supplies unless the asker provides them. • Take photos before and after as evidence. • Check if access to any restricted areas needs prior arrangement.';
    }

    if (lowerTitle.includes('babysit') || lowerTitle.includes('childcare') || category === 'childcare-tutoring') {
      return '• Get emergency contact numbers and ensure you have them saved. • Ask about bedtime routines and any special dietary needs. • Keep the asker updated with photos/messages during the job.';
    }

    if (lowerTitle.includes('elderly') || lowerTitle.includes('elder') || lowerTitle.includes('care')) {
      return '• Ask about any mobility assistance or special care requirements. • Ensure you have emergency contacts and medical history if needed. • Be patient and maintain a calm, supportive demeanor.';
    }

    if (lowerTitle.includes('delivery') || lowerTitle.includes('send') || lowerTitle.includes('transport')) {
      return '• Take photos of items before and after delivery. • Keep the asker informed of your location and ETA. • Handle items with care and avoid damage.';
    }

    if (lowerTitle.includes('tutor') || lowerTitle.includes('teach') || lowerTitle.includes('lesson')) {
      return '• Clarify learning goals and student level before the session. • Prepare materials and examples relevant to the subject. • Provide feedback and suggest next steps for improvement.';
    }

    if (lowerTitle.includes('event') || lowerTitle.includes('party') || lowerTitle.includes('setup')) {
      return '• Arrive early to understand the layout and setup needs. • Confirm what materials/decorations you need to provide. • Have a clear timeline and stay in touch with the organizer.';
    }

    if (lowerTitle.includes('repair') || lowerTitle.includes('fix')) {
      return '• Assess the problem and provide a cost estimate upfront. • Use quality materials and ensure proper installation. • Provide warranty or guarantee if applicable.';
    }

    return '• Communicate clearly with the asker about expectations. • Take progress photos/videos as documentation. • Follow any special instructions provided by the asker.';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-errandify-bg pb-20">
      {/* Page Container */}
      <div className="max-w-2xl mx-auto px-2 py-1">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="text-errandify-orange font-bold mb-1 text-xs hover:text-orange-600 transition"
        >
          ← Back
        </button>

        {/* Main Errand Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-orange-100">
          {/* Header Section - Warm & Compact */}
          <div className="relative bg-gradient-to-r from-errandify-orange via-orange-400 to-orange-500 text-white p-2.5">
            {/* Title Row + Price */}
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex-1">
                {errand.formatted_id && (
                  <p className="text-xs text-orange-100 font-semibold mb-1">{errand.formatted_id}</p>
                )}
                <h1 className="text-sm font-bold leading-tight">
                  {errand.title}
                </h1>
              </div>
              <div className="text-right flex-shrink-0 flex flex-col items-end gap-0">
                <p className="text-base font-bold text-white">
                  SGD ${userBidAmount ? userBidAmount : errand.budget ? parseFloat(String(errand.budget)).toFixed(0) : '0'}
                </p>
                {userBidAmount && errand.budget && (
                  <p className="text-xs text-orange-100 font-normal">
                    Asker: ${parseFloat(String(errand.budget)).toFixed(0)}
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Row: Category, Status, Offer Status */}
            <div className="flex flex-wrap items-center gap-0.5 mt-0">
              <span
                className={`${getCategoryColor(
                  errand.category
                )} px-1 py-0.5 rounded-full text-xs font-semibold`}
              >
                {errand.category}
              </span>
              <span
                className={`px-1 py-0.5 rounded-full text-xs font-semibold ${
                  errand.status === 'open'
                    ? 'bg-green-400 text-white'
                    : 'bg-gray-400 text-white'
                }`}
              >
                {capitalizeStatus(errand.status)}
              </span>
              {userBidAmount && (
                <span className="text-xs bg-white text-errandify-orange px-1 py-0.5 rounded font-bold">
                  ✓ Your offer submitted
                </span>
              )}
            </div>
          </div>

          {/* Chat Button - Top Right (when confirmed/in_progress) */}
          {errand.status !== 'open' && currentUser?.id !== errand.askerId && (
            <div className="absolute top-3 right-3">
              <button
                onClick={() => setShowChat(true)}
                className="bg-errandify-brown text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-opacity-90 transition-colors"
              >
                💬 Chat
              </button>
            </div>
          )}

          {/* Content Section - Compact & Warm */}
          <div className="p-2 space-y-1.5">
            {/* Deadline + Location Grid */}
            {errand.deadline && errand.location ? (
              <div className="grid grid-cols-2 gap-1">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-1.5 rounded-lg border border-orange-200">
                  <p className="text-xs text-gray-600 font-semibold mb-0.5">📅 When</p>
                  <p className="text-xs text-gray-800 font-medium">
                    {new Date(errand.deadline).toLocaleDateString('en-SG', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })} {new Date(errand.deadline).toLocaleTimeString('en-SG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-1.5 rounded-lg border border-orange-200">
                  <p className="text-xs text-gray-600 font-semibold mb-0.5">📍 Where</p>
                  <p className="text-xs text-gray-800 font-medium">
                    {getAreaOnly(errand.location) || errand.location}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {errand.deadline && (
                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-1.5 rounded-lg border border-orange-200">
                    <p className="text-xs text-gray-600 font-semibold mb-0.5">📅 Deadline</p>
                    <p className="text-xs text-gray-800 font-medium">
                      {new Date(errand.deadline).toLocaleDateString('en-SG', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })} {new Date(errand.deadline).toLocaleTimeString('en-SG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
                {errand.location && (
                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-1.5 rounded-lg border border-orange-200">
                    <p className="text-xs text-gray-600 font-semibold mb-0.5">📍 Location</p>
                    <p className="text-xs text-gray-800 font-medium">
                      {getAreaOnly(errand.location) || errand.location}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Full Address (when confirmed) */}
            {errand.location && errand.status === 'confirmed' && (
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-1.5 rounded-lg border border-orange-200">
                <p className="text-xs text-gray-600 font-semibold mb-0.5">📍 Full Address</p>
                <p className="text-xs text-gray-800 font-medium break-words">
                  {(() => {
                    const location = errand.location || 'Not specified';
                    let postalCode = errand.postal_code;

                    if (!postalCode) {
                      const postalMatch = location.match(/(\d{6})/);
                      if (postalMatch) {
                        postalCode = postalMatch[1];
                      }
                    }

                    if (postalCode) {
                      const cleanLocation = location.replace(/\s*S?\d{6}\s*$/, '').trim();
                      return `${cleanLocation} S${postalCode}`;
                    }

                    return location;
                  })()}
                </p>
              </div>
            )}

            {/* Description */}
            <div className="border-t border-orange-200 pt-1.5 mt-1.5">
              <h2 className="font-bold text-errandify-brown mb-1 text-xs">
                About This Errand
              </h2>
              <p className="text-xs text-gray-700 leading-relaxed">
                {errand.description || 'No description yet - asker will add more details!'}
              </p>
            </div>

            {/* Notes & Tips for Confirmed Doer - Only show if current user is the confirmed doer */}
            {errand.status === 'confirmed' && errand.notes && currentUser && currentUser.id !== errand.askerId && (
              <div className="border-t border-orange-200 pt-1.5 mt-1.5">
                <div className="flex items-center justify-between mb-1.5">
                  <h2 className="font-bold text-errandify-brown text-xs">
                    Instructions from Neighbor
                  </h2>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(errand.notes || '');
                      setCopiedTipToClipboard(true);
                      setTimeout(() => setCopiedTipToClipboard(false), 2000);
                    }}
                    className="text-xs px-2 py-1 bg-errandify-orange text-white rounded-full hover:bg-orange-600 transition font-medium"
                  >
                    {copiedTipToClipboard ? 'Saved!' : 'Save'}
                  </button>
                </div>
                <div className="text-xs text-gray-700 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 px-2 py-1.5 rounded-lg leading-relaxed">
                  {errand.notes}
                </div>
              </div>
            )}

            {/* AI Tips (only if no asker notes and user is confirmed doer) */}
            {errand.status === 'confirmed' && !errand.notes && errand.title && currentUser && currentUser.id !== errand.askerId && (
              <div className="border-t border-orange-200 pt-1.5 mt-1.5">
                <div className="flex items-center justify-between mb-1.5">
                  <h2 className="font-bold text-errandify-brown text-xs">
                    Helpful Tips
                  </h2>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(getTaskSpecificTips(errand.title, errand.category));
                      setCopiedTipToClipboard(true);
                      setTimeout(() => setCopiedTipToClipboard(false), 2000);
                    }}
                    className="text-xs px-2 py-1 bg-errandify-orange text-white rounded-full hover:bg-orange-600 transition font-medium"
                  >
                    {copiedTipToClipboard ? 'Saved!' : 'Save'}
                  </button>
                </div>
                <div className="text-xs text-gray-700 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 px-2 py-1.5 rounded-lg leading-relaxed">
                  {getTaskSpecificTips(errand.title, errand.category)}
                </div>
              </div>
            )}

            {/* Asker Info - Show alias/display_name */}
            {(errand.askerName || errand.asker) && (
              <div className="border-t border-orange-200 pt-1.5 mt-1.5">
                <p className="text-xs text-gray-600 font-bold mb-0.5">Posted By</p>
                <p className="text-xs text-gray-800 font-medium mb-0.5">
                  {errand.asker?.alias || errand.askerName || errand.asker?.display_name || errand.asker?.name || 'Community Member'}
                </p>
              </div>
            )}

            {/* Errand Completion Progress */}
            {errand.status !== 'open' && (
              <div className="border-t border-orange-200 pt-1.5 mt-1.5">
                {/* Fun Progress Bar */}
                <div className="mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-semibold text-gray-700">Journey Progress</p>
                    <p className="text-xs font-bold text-errandify-orange">
                      {errand.status === 'confirmed' && '25%'}
                      {errand.status === 'in_progress' && '50%'}
                      {errand.status === 'completed' && '75%'}
                      {errand.status === 'completed_unconfirmed' && '90%'}
                      {errand.status === 'disputed' && '⚠️ On Hold'}
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 via-errandify-orange to-green-500 rounded-full transition-all duration-500 ease-out"
                      style={{
                        width:
                          errand.status === 'confirmed'
                            ? '25%'
                            : errand.status === 'in_progress'
                            ? '50%'
                            : errand.status === 'completed'
                            ? '75%'
                            : errand.status === 'completed_unconfirmed'
                            ? '90%'
                            : '100%',
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
                    <span>Accepted</span>
                    <span>In Progress</span>
                    <span>Done</span>
                    <span>Complete</span>
                  </div>
                </div>

                {/* Activity Timeline - Scrollable */}
                <h2 className="font-bold text-errandify-brown mb-1.5 text-xs">
                  Activity Timeline
                </h2>
                <div className="bg-white rounded border border-gray-200 overflow-hidden relative">
                  <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {errand.id && <ErrandActivityLog ref={activityTimelineRef} errandId={errand.id} userRole={userRole} />}
                  </div>
                  {/* Visual scroll indicator */}
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-errandify-orange to-green-500 opacity-30 pointer-events-none"></div>
                </div>
              </div>
            )}

            {/* Action Button */}
            {errand.status === 'open' && currentUser && currentUser.id !== errand.askerId && userRole === 'doer' ? (
              bidSubmitted || userBidAmount ? (
                <button
                  onClick={() => setShowBidModal(true)}
                  className="w-full bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-colors text-base mt-2"
                >
                  ✏️ Update Offer
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (errand.isRecurring) {
                      setShowSessionSelector(true);
                    } else {
                      setShowBidModal(true);
                    }
                  }}
                  className="w-full bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-colors text-base mt-2"
                >
                  {errand.isRecurring ? 'Select Sessions' : 'Submit an Offer'}
                </button>
              )
            ) : errand.status === 'open' && currentUser && currentUser.id === errand.askerId && !errand.acceptedBidId ? (
              <div className="flex gap-2 mt-2">
                {!errand.bidCount ? (
                  <button
                    onClick={() => navigate(`/errand/${id}/edit`)}
                    className="flex-1 bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-colors text-base"
                  >
                    Edit Errand
                  </button>
                ) : (
                  <div className="flex-1 bg-gray-400 text-white py-3 rounded-lg font-bold text-center text-base cursor-not-allowed">
                    Locked (Has Offers)
                  </div>
                )}
                <button
                  onClick={handleCancelErrand}
                  className="flex-1 bg-red-500 text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-colors text-base"
                >
                  Cancel Errand
                </button>
              </div>
            ) : errand.status === 'confirmed' && currentUser && currentUser.id !== errand.askerId && userRole === 'doer' ? (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowChat(true)}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors text-base"
                >
                  💬 Chat
                </button>
                <button
                  onClick={handleStartJob}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors text-base"
                >
                  ▶️ Start Errand
                </button>
              </div>
            ) : errand.status === 'in_progress' && currentUser && currentUser.id !== errand.askerId && userRole === 'doer' ? (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowChat(true)}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors text-base"
                >
                  💬 Chat
                </button>
                <button
                  onClick={() => navigate(`/task/${id}/complete`)}
                  className="flex-1 bg-green-500 text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-colors text-base"
                >
                  ✓ Mark as Completed
                </button>
              </div>
            ) : errand.status === 'completed_unconfirmed' && currentUser && currentUser.id === errand.askerId ? (
              <button
                onClick={() => navigate(`/task/${id}/review-completion`)}
                className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors text-base mt-2"
              >
                👁️ Review Completion
              </button>
            ) : errand.status === 'disputed' ? (
              <div className="w-full bg-red-50 border border-red-200 rounded-lg p-3 mt-2 text-center">
                <p className="text-red-800 font-semibold">⚠️ Under Admin Review</p>
                <p className="text-xs text-red-600">Dispute is being reviewed. Payment is held.</p>
              </div>
            ) : errand.status === 'completed' ? (
              <>
                {/* Reminder banner if evidence viewed but not rated */}
                {showCompletionEvidence && !hasRated && (
                  <div className="w-full bg-amber-50 border-l-4 border-amber-400 p-2 mt-2 mb-2 rounded">
                    <p className="text-xs text-amber-800 font-semibold">⚡ Don't forget: Rate the work to complete this job!</p>
                  </div>
                )}

              <div className="w-full bg-green-50 border border-green-200 rounded-lg p-3 mt-2 space-y-2">
                {/* Status Header */}
                <div className="text-center pb-2 border-b border-green-200">
                  <p className="text-green-800 font-bold text-base">✓ Errand Completed</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    {currentUser && currentUser.id === errand.askerId
                      ? 'Review and rate the doer\'s work'
                      : 'Waiting for asker to review and rate your work'}
                  </p>
                </div>

                {/* Process Flow */}
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-gray-700 text-xs">📋 What Happens Next:</p>
                  <div className="space-y-0.5 text-gray-600 text-xs">
                    {currentUser && currentUser.id === errand.askerId ? (
                      <>
                        <p>✓ Doer submitted completion evidence</p>
                        <p>⏳ You have 48 hours to review</p>
                        <p>⭐ Rate the doer's work</p>
                        <p>💰 Payment releases after rating</p>
                      </>
                    ) : (
                      <>
                        <p>✓ You submitted completion evidence</p>
                        <p>⏳ Asker has 48 hours to review</p>
                        <p>⭐ Asker rates your work</p>
                        <p>💰 Payment releases automatically</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Asker: Show Doer's Completion Evidence */}
                {currentUser && currentUser.id === errand.askerId && (
                  <div className="space-y-1 pt-2 border-t border-green-200">
                    <p className="font-semibold text-gray-700 text-xs">📸 Completion Evidence:</p>
                    <button
                      onClick={toggleCompletionEvidence}
                      className="w-full px-2 py-1.5 bg-blue-50 border border-blue-300 text-blue-700 text-xs rounded font-medium hover:bg-blue-100 transition-all"
                    >
                      {showCompletionEvidence ? '▼ Hide' : '▶ View & Complete'}
                    </button>

                    {/* Completion Evidence Expanded View */}
                    {showCompletionEvidence && (
                      <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200 space-y-2">
                        {completionPhotos.length > 0 && (
                          <div>
                            <p className="font-semibold text-xs text-gray-700 mb-1">📷 Photos:</p>
                            <div className="flex gap-2 flex-wrap">
                              {completionPhotos.map((photo, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setSelectedPhotoUrl(photo.file_url)}
                                  className="text-xs bg-white text-blue-600 px-2 py-1 rounded border border-blue-300 hover:bg-blue-100 cursor-pointer transition-all"
                                >
                                  Photo {idx + 1}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {completionNotes && (
                          <div>
                            <p className="font-semibold text-xs text-gray-700 mb-1">📝 Notes from doer:</p>
                            <p className="text-xs text-gray-700 p-2 rounded">{completionNotes}</p>
                          </div>
                        )}

                        {/* Quick Rating Form */}
                        <div className="mt-3 pt-2 border-t border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-2 rounded">
                          <p className="font-semibold text-xs text-green-800 mb-2 text-center">How wonderful was the experience?</p>
                          <div className="flex gap-1 mb-3 justify-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => setRating(star)}
                                className={`text-3xl transition-all hover:scale-110 ${
                                  star <= rating ? 'text-yellow-400 drop-shadow-md' : 'text-gray-300 hover:text-yellow-300'
                                }`}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-center text-green-800 mb-3 font-semibold">
                            {rating === 1 && 'Needs improvement'}
                            {rating === 2 && 'Could be better'}
                            {rating === 3 && 'Good work!'}
                            {rating === 4 && 'Really good!'}
                            {rating === 5 && 'Amazing! Wonderful work!'}
                          </p>

                          {/* AI Suggestions based on rating */}
                          <p className="text-xs text-green-700 font-semibold mb-1">Feedback tags (click to add):</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {rating === 1 && (
                              <>
                                <button
                                  onClick={() => setRatingComment(prev => prev ? prev + ' • Didn\'t follow instructions' : 'Didn\'t follow instructions')}
                                  type="button"
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-green-200 hover:text-green-800 cursor-pointer transition"
                                >
                                  Didn't follow instructions
                                </button>
                                <button
                                  onClick={() => setRatingComment(prev => prev ? prev + ' • Quality not acceptable' : 'Quality not acceptable')}
                                  type="button"
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-green-200 hover:text-green-800 cursor-pointer transition"
                                >
                                  Quality not acceptable
                                </button>
                                <button
                                  onClick={() => setRatingComment(prev => prev ? prev + ' • Late or incomplete' : 'Late or incomplete')}
                                  type="button"
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-green-200 hover:text-green-800 cursor-pointer transition"
                                >
                                  Late or incomplete
                                </button>
                              </>
                            )}
                            {rating === 2 && (
                              <>
                                <button
                                  onClick={() => setRatingComment(prev => prev ? prev + ' • Took longer than expected' : 'Took longer than expected')}
                                  type="button"
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-green-200 hover:text-green-800 cursor-pointer transition"
                                >
                                  Took longer than expected
                                </button>
                                <button
                                  onClick={() => setRatingComment(prev => prev ? prev + ' • Some parts need fixing' : 'Some parts need fixing')}
                                  type="button"
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-green-200 hover:text-green-800 cursor-pointer transition"
                                >
                                  Some parts need fixing
                                </button>
                                <button
                                  onClick={() => setRatingComment(prev => prev ? prev + ' • Could communicate better' : 'Could communicate better')}
                                  type="button"
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-green-200 hover:text-green-800 cursor-pointer transition"
                                >
                                  Could communicate better
                                </button>
                              </>
                            )}
                            {rating === 3 && (
                              <>
                                <button
                                  onClick={() => setRatingComment(prev => prev ? prev + ' • Did the job well' : 'Did the job well')}
                                  type="button"
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-green-200 hover:text-green-800 cursor-pointer transition"
                                >
                                  Did the job well
                                </button>
                                <button
                                  onClick={() => setRatingComment(prev => prev ? prev + ' • Good communication' : 'Good communication')}
                                  type="button"
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-green-200 hover:text-green-800 cursor-pointer transition"
                                >
                                  Good communication
                                </button>
                                <button
                                  onClick={() => setRatingComment(prev => prev ? prev + ' • Finished on time' : 'Finished on time')}
                                  type="button"
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-green-200 hover:text-green-800 cursor-pointer transition"
                                >
                                  Finished on time
                                </button>
                              </>
                            )}
                            {rating === 4 && (
                              <>
                                <button
                                  onClick={() => setRatingComment(prev => prev ? prev + ' • Excellent work quality' : 'Excellent work quality')}
                                  type="button"
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-green-200 hover:text-green-800 cursor-pointer transition"
                                >
                                  Excellent work quality
                                </button>
                                <button
                                  onClick={() => setRatingComment(prev => prev ? prev + ' • Very helpful & friendly' : 'Very helpful & friendly')}
                                  type="button"
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-green-200 hover:text-green-800 cursor-pointer transition"
                                >
                                  Very helpful & friendly
                                </button>
                                <button
                                  onClick={() => setRatingComment(prev => prev ? prev + ' • Quick to complete' : 'Quick to complete')}
                                  type="button"
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-green-200 hover:text-green-800 cursor-pointer transition"
                                >
                                  Quick to complete
                                </button>
                              </>
                            )}
                            {rating === 5 && (
                              <>
                                <button
                                  onClick={() => setRatingComment(prev => prev ? prev + ' • Exceptional care & quality' : 'Exceptional care & quality')}
                                  type="button"
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-green-200 hover:text-green-800 cursor-pointer transition"
                                >
                                  Exceptional care & quality
                                </button>
                                <button
                                  onClick={() => setRatingComment(prev => prev ? prev + ' • Truly a wonderful neighbor' : 'Truly a wonderful neighbor')}
                                  type="button"
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-green-200 hover:text-green-800 cursor-pointer transition"
                                >
                                  Truly a wonderful neighbor
                                </button>
                                <button
                                  onClick={() => setRatingComment(prev => prev ? prev + ' • Went above & beyond' : 'Went above & beyond')}
                                  type="button"
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-green-200 hover:text-green-800 cursor-pointer transition"
                                >
                                  Went above & beyond
                                </button>
                              </>
                            )}
                          </div>

                          <textarea
                            value={ratingComment}
                            onChange={(e) => setRatingComment(e.target.value)}
                            placeholder="Add your personal message... (optional)"
                            maxLength={200}
                            rows={2}
                            className="w-full text-xs px-2 py-1 border border-green-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
                          />
                          {!hasRated ? (
                            <button
                              onClick={async () => {
                                if (!currentUser || !errand) return;
                                setRatingSubmitting(true);
                                try {
                                  const token = localStorage.getItem('token');
                                  // Backend will auto-lookup doer from bids if not provided
                                  await axios.post(
                                    `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ratings`,
                                    {
                                      taskId: errand.id,
                                      ratedUserId: errand.doerId || undefined, // Let backend find if not available
                                      rating,
                                      comment: ratingComment || null,
                                    },
                                    { headers: { Authorization: `Bearer ${token}` } }
                                  );
                                  setHasRated(true);
                                  setShowCelebratory(true);
                                  setRatingComment('');
                                  // Auto-hide celebratory message after 5 seconds
                                  setTimeout(() => setShowCelebratory(false), 5000);
                                } catch (err: any) {
                                  console.error('Rating submission error:', err);
                                  alert('Error submitting rating: ' + (err.response?.data?.error || err.message));
                                } finally {
                                  setRatingSubmitting(false);
                                }
                              }}
                              disabled={ratingSubmitting}
                              className="w-full mt-2 px-2 py-1 text-xs bg-gradient-to-r from-green-500 to-green-600 text-white rounded font-semibold hover:shadow disabled:opacity-50 transition"
                            >
                            {ratingSubmitting ? '✨ Sending...' : '✓ Submit Review & Approve Completion'}
                          </button>
                          ) : (
                            <div className="w-full mt-2 px-2 py-1 text-xs bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded font-semibold text-center border border-green-300">
                              ✨ Thanks for rating! You're amazing!
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Doer Actions - Only show if current user is the doer */}
                {currentUser && currentUser.id !== errand.askerId && (
                  <div className="space-y-2 pt-2 border-t border-green-200">
                    <p className="font-semibold text-gray-700 text-xs">📌 Your Options:</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowChat(true)}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 text-xs transition-all"
                      >
                        💬 Chat
                      </button>
                      <button
                        onClick={() => navigate(`/task/${id}/complete`)}
                        className="flex-1 bg-orange-500 text-white py-2 rounded-lg font-semibold hover:bg-orange-600 text-xs transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                        disabled={errand.status === 'disputed'}
                        title={errand.status === 'disputed' ? 'Cannot add files during dispute' : 'Submit additional files before 48 hours pass'}
                      >
                        📁 Add More Files
                      </button>
                    </div>
                  </div>
                )}

                {/* Asker Actions - Only show if current user is the asker */}
                {currentUser && currentUser.id === errand.askerId && !hasRated && (
                  <div className="space-y-1 pt-2 border-t border-green-200">
                    <p className="font-semibold text-gray-700 text-xs">Your Actions:</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setShowChat(true)}
                        className="flex-1 bg-blue-600 text-white py-1.5 px-2 rounded font-semibold hover:bg-blue-700 text-xs transition-all"
                      >
                        💬 Chat
                      </button>
                      <button
                        onClick={() => {
                          const reason = window.prompt('Why do you need to reopen this job? (Explain to doer)');
                          if (reason === null) return;
                          const token = localStorage.getItem('token');
                          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${errand.id}/reopen`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ reason: reason || 'Please revise your work' }),
                          })
                            .then(r => r.json())
                            .then(() => {
                              alert('✓ Job reopened. Doer notified to make changes.');
                              fetchErrandDetail();
                            })
                            .catch(e => alert('Error: ' + e.message));
                        }}
                        className="flex-1 bg-amber-500 text-white py-1.5 px-2 rounded font-semibold hover:bg-amber-600 text-xs transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                        disabled={errand.status === 'disputed' || hasRated}
                        title={hasRated ? 'Already approved - cannot request changes' : errand.status === 'disputed' ? 'Cannot reopen during dispute' : 'Request doer to make changes'}
                      >
                        🔄 Request Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* After Rating - Show happy message */}
                {currentUser && currentUser.id === errand.askerId && hasRated && (
                  <div className="mt-2 p-2 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300 rounded text-center">
                    <p className="text-xs text-green-700 font-semibold">✨ All done! Job marked complete</p>
                  </div>
                )}
              </div>
              </>
            ) : null}
          </div>
        </div>

        {/* Photo Modal */}
        {selectedPhotoUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl max-h-96 relative">
              {/* Close Button */}
              <button
                onClick={() => setSelectedPhotoUrl(null)}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg transition-all z-10"
                title="Close photo"
              >
                ✕
              </button>

              {/* Photo */}
              <img
                src={selectedPhotoUrl}
                alt="Completion evidence"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Celebratory Modal - Show after rating submitted */}
        {showCelebratory && (
          <div className="fixed bottom-6 right-6 z-50 animate-fadeIn pointer-events-none">
            <div className="bg-gradient-to-br from-green-100 via-emerald-100 to-green-50 rounded-xl max-w-xs shadow-2xl relative overflow-hidden border-2 border-green-400 animate-scaleIn pointer-events-auto p-4">
              {/* Content */}
              <div className="relative z-10 text-center">
                <p className="text-3xl mb-1 animate-pulse">🎉</p>
                <h2 className="text-lg font-bold text-green-800 mb-1">Amazing!</h2>
                <p className="text-xs text-green-700 mb-2">You've approved this work</p>
                <button
                  onClick={() => setShowCelebratory(false)}
                  className="px-3 py-1 bg-green-500 text-white rounded-full font-bold hover:bg-green-600 transition-all text-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleIn {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-in;
          }
          .animate-scaleIn {
            animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
        `}</style>

        {/* Q&A Section */}
        {errand && (
          <TaskQA
            errandId={errand.id}
            isAsker={currentUser?.id === errand.askerId}
            userRole={userRole}
            errandStatus={errand.status}
          />
        )}

        {/* Bids Section - Only for Asker when task is open */}
        {currentUser && currentUser.id === errand?.askerId && errand?.status === 'open' && (
          <div className="mt-6">
            <BidsViewer
              taskId={errand?.id || 0}
              taskBudget={errand?.budget || 0}
              onBidAccepted={() => fetchErrandDetail()}
            />
          </div>
        )}


      </div>

      {/* Page Container End */}

      {/* Bottom Spacing */}
      <div className="h-8"></div>

      {/* Bid Submission Modal */}
      {showBidModal && errand && !errand.isRecurring && (
        <BidSubmissionModal
          taskId={errand.id}
          taskBudget={errand.budget || 0}
          taskTitle={errand.title}
          existingBidAmount={userBidAmount || undefined}
          askerId={errand.askerId}
          onSuccess={() => {
            setBidSubmitted(true);
            setShowBidModal(false);
            // Reload bid amount
            const bids = JSON.parse(localStorage.getItem('userBids') || '{}');
            setUserBidAmount(bids[errand.id] || null);
            // Refresh activity timeline to show new bid
            if (activityTimelineRef.current?.refreshActivity) {
              activityTimelineRef.current.refreshActivity();
            }
          }}
          onClose={() => setShowBidModal(false)}
        />
      )}

      {/* Recurring Errand Session Selector */}
      {showSessionSelector && errand && errand.isRecurring && (
        <RecurringErrandSessionSelector
          errandId={errand.id}
          onSessionsSelected={() => {
            setBidSubmitted(true);
            setShowSessionSelector(false);
          }}
          onCancel={() => setShowSessionSelector(false)}
        />
      )}

      {/* Task Chatbox */}
      {errand && (
        <TaskChatbox
          taskId={errand.id}
          taskTitle={errand.title}
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          errandDetails={{
            budget: errand.budget,
            deadline: errand.deadline,
            location: errand.location,
            postal_code: errand.postal_code || (errand as any).postalCode,
            description: errand.description,
          }}
        />
      )}

      {/* Share Modal */}
      {showShareModal && errand && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-2xl font-bold text-errandify-brown mb-2">
              💌 Share & Earn Together!
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Invite a friend to join Errandify. You both earn 50 EP when they complete their first task! 🎁
            </p>

            {/* Get user's referral code */}
            {currentUser && (
              <>
                {/* QR Code */}
                <div className="bg-gray-100 rounded-lg p-4 mb-4 text-center">
                  <p className="text-xs text-gray-600 mb-2 font-semibold">📱 Scan to Join</p>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/signup?ref=${currentUser.referral_code || 'unknown'}&errand=${errand.id}`)}`}
                    alt="Referral QR Code"
                    className="w-32 h-32 mx-auto"
                  />
                  <p className="text-xs text-gray-500 mt-2">Opens signup with your referral code</p>
                </div>

                {/* Share Link */}
                <div className="bg-orange-50 rounded-lg p-3 mb-3">
                  <p className="text-xs text-gray-600 mb-2 font-semibold">🔗 Share Link:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/signup?ref=${currentUser.referral_code || 'unknown'}&errand=${errand.id}`}
                      className="flex-1 px-2 py-1.5 bg-white border border-orange-200 rounded text-xs font-mono"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/signup?ref=${currentUser.referral_code || 'unknown'}&errand=${errand.id}`
                        );
                      }}
                      className="px-2 py-1.5 bg-errandify-orange text-white text-xs font-semibold rounded hover:bg-opacity-90 transition"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Share Message */}
                <div className="bg-green-50 rounded-lg p-3 mb-3">
                  <p className="text-xs text-gray-600 mb-2 font-semibold">💬 Share Message (with link):</p>
                  <textarea
                    readOnly
                    value={`🎯 ${errand.title}
📌 Errand ID: ${errand.errandId}

Hi! I found this perfect errand on Errandify and thought of you!

💰 Join with my referral code: ${currentUser.referral_code || 'REF-CODE'}
🎁 We both earn 50 Errandify Points when you complete your first task!

🔗 ${window.location.origin}/signup?ref=${currentUser.referral_code || 'unknown'}&errand=${errand.id}

Let's help each other! 🤝`}
                    className="w-full px-2 py-1.5 bg-white border border-green-200 rounded text-xs resize-none h-32 font-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `🎯 ${errand.title}\n📌 Errand ID: ${errand.errandId}\n\nHi! I found this perfect errand on Errandify and thought of you! \n\n💰 Join with my referral code: ${currentUser.referral_code || 'REF-CODE'}\n🎁 We both earn 50 Errandify Points when you complete your first task!\n\n🔗 ${window.location.origin}/signup?ref=${currentUser.referral_code || 'unknown'}&errand=${errand.id}\n\nLet's help each other! 🤝`
                      );
                    }}
                    className="mt-2 w-full px-2 py-1.5 bg-green-500 text-white text-xs font-semibold rounded hover:bg-green-600 transition"
                  >
                    Copy Message
                  </button>
                </div>

                {/* Share Buttons */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`🎯 ${errand.title}\n📌 Errand ID: ${errand.errandId}\n\nHi! I found this perfect errand on Errandify and thought of you! \n\n💰 Join with my referral code: ${currentUser.referral_code || 'REF-CODE'}\n🎁 We both earn 50 Errandify Points when you complete your first task!\n\n🔗 ${window.location.origin}/signup?ref=${currentUser.referral_code || 'unknown'}&errand=${errand.id}\n\nLet's help each other! 🤝`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-green-500 text-white text-xs font-semibold rounded hover:bg-green-600 transition text-center"
                  >
                    WhatsApp
                  </a>
                  <button
                    onClick={() => {
                      const subject = `Join me on Errandify - ${errand.title}`;
                      const body = `🎯 ${errand.title}\n📌 Errand ID: ${errand.errandId}\n\nHi! I found this perfect errand on Errandify and thought of you! \n\n💰 Join with my referral code: ${currentUser.referral_code || 'REF-CODE'}\n🎁 We both earn 50 Errandify Points when you complete your first task!\n\n🔗 ${window.location.origin}/signup?ref=${currentUser.referral_code || 'unknown'}&errand=${errand.id}\n\nLet's help each other! 🤝`;
                      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    }}
                    className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition"
                  >
                    Email
                  </button>
                </div>
              </>
            )}

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full px-3 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded hover:bg-gray-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
