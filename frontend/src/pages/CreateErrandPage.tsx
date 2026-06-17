import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

export default function CreateErrandPage() {
  console.log('===== CreateErrandPage LOADED =====');
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlCategory = searchParams.get('category') || categoryId || '';

  const [formData, setFormData] = useState({
    category: urlCategory,
    title: '',
    description: '',
    location: '',
    startLocation: '',
    specialNote: '',
    budget: '',
    deadline: '',
    time: '',
    duration: '',
    durationUnit: 'Hr' as 'Min' | 'Hr' | 'Day' | 'Week',
    isRecurring: false,
    repeatEvery: '1',
    repeatUnit: 'week' as 'day' | 'week' | 'month',
    occurrences: '1',
    skills: [] as string[],
    certifications: { required: [] as string[], optional: [] as string[] },
  });

  const [lastExtractedTitle, setLastExtractedTitle] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [startLocationPostalCode, setStartLocationPostalCode] = useState('');
  const [startLocationFullAddress, setStartLocationFullAddress] = useState('');
  const [isRemoteWork, setIsRemoteWork] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [showStartLocation, setShowStartLocation] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const [aiSuggestions, setAiSuggestions] = useState({
    suggestedCategory: '',
    suggestedDescription: '',
    correctedTitle: '',
    hasCorrections: false,
    suggestedBudget: null as number | null,
    suggestedNotes: '',
    certifications: { required: [] as string[], optional: [] as string[] },
    skills: [] as string[],
    blocked: false,
    error: '',
  });

  // Request GPS location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setGpsEnabled(true);
        },
        (error) => {
          console.log('GPS not available:', error.message);
          setGpsEnabled(false);
        }
      );
    }
  }, []);

  // Load prefilled data from Hana on mount
  useEffect(() => {
    const prefilledJson = searchParams.get('prefilled');
    if (prefilledJson) {
      try {
        const prefilledData = JSON.parse(decodeURIComponent(prefilledJson));
        const newFormData = {
          title: prefilledData.title || '',
          description: prefilledData.description || '',
          category: prefilledData.category || '',
          location: prefilledData.location || '',
          startLocation: '',
          budget: prefilledData.budget || '',
          deadline: prefilledData.date || '',
          time: prefilledData.time || '',
          duration: prefilledData.duration || '',
          durationUnit: (prefilledData.durationUnit || 'Hr') as 'Min' | 'Hr' | 'Day' | 'Week',
          isRecurring: false,
          repeatEvery: '1',
          repeatUnit: 'week' as 'day' | 'week' | 'month',
          occurrences: '1',
          specialNote: prefilledData.notes || '',
          skills: [] as string[],
          certifications: { required: [] as string[], optional: [] as string[] },
        };
        setFormData(newFormData);

        // Set postal code and full address from prefilled data
        if (prefilledData.postalCode) {
          const code = prefilledData.postalCode;
          setPostalCode(code);

          // Use full address from API if available
          if (prefilledData.fullAddress) {
            setFullAddress(prefilledData.fullAddress);
          } else {
            // Fallback: Update location and address based on postal code prefix
            if (code.length === 6 && /^\d+$/.test(code)) {
              const areaPrefix = code.substring(0, 2);
              const areaData = postalCodeAreas[areaPrefix];
              if (areaData) {
                setFormData((prev) => ({
                  ...prev,
                  location: areaData.area,
                }));
                setFullAddress(`1 ${areaData.building}, Unit: __, Singapore ${code}`);
              }
            }
          }
        }

        // Auto-fetch AI suggestions for the prefilled title
        if (newFormData.title) {
          fetchAiSuggestions(newFormData.title, newFormData.description);
        }
      } catch (err) {
        console.error('Failed to load prefilled data:', err);
      }
    }
  }, [searchParams]);

  const categoryNames: Record<string, string> = {
    'home-maintenance': 'Home Maintenance',
    'cleaning-laundry': 'Cleaning & Laundry',
    'shopping-errands': 'Shopping & Errands',
    'delivery-moving': 'Delivery & Moving',
    'childcare-tutoring': 'Childcare & Tutoring',
    'pet-care': 'Pet Care',
    'tech-support': 'Tech Support',
    'moving-help': 'Moving Help',
  };

  const commonCertifications = [
    'First Aid',
    'CPR / AED',
    'Enhanced DBS Check',
    'Driving License',
    'Gas Safe Register',
    'Electrical Safety',
    'Plumbing License',
    'Forklift Operator',
    'Teaching Qualification',
    'Pet Care Certification',
    'Animal First Aid',
  ];

  // Singapore postal code to area and building/location name mapping (first 2 digits)
  const postalCodeAreas: Record<string, { area: string; building: string }> = {
    '01': { area: 'Raffles Place', building: 'Raffles Place' },
    '02': { area: 'Cecil Street', building: 'Cecil Street' },
    '03': { area: 'Tanjong Pagar', building: 'Tanjong Pagar Plaza' },
    '04': { area: 'Tanjong Pagar', building: 'Tanjong Pagar Plaza' },
    '05': { area: 'Outram', building: 'Outram Park' },
    '06': { area: 'People\'s Park', building: 'People\'s Park Centre' },
    '07': { area: 'Chinatown', building: 'Chinatown Complex' },
    '08': { area: 'Tanjong Pagar', building: 'Tanjong Pagar Plaza' },
    '09': { area: 'Tanjong Pagar', building: 'Tanjong Pagar Plaza' },
    '10': { area: 'Orchard', building: 'Orchard Road' },
    '11': { area: 'Orchard', building: 'Orchard Road' },
    '12': { area: 'Novena', building: 'Novena Square' },
    '13': { area: 'Newton', building: 'Newton Food Centre' },
    '14': { area: 'Farrer Park', building: 'Farrer Park' },
    '15': { area: 'Henderson', building: 'Henderson Road' },
    '16': { area: 'Henderson', building: 'Henderson Road' },
    '17': { area: 'Balestier', building: 'Balestier Road' },
    '18': { area: 'Macpherson', building: 'Macpherson' },
    '19': { area: 'Paya Lebar', building: 'Paya Lebar Square' },
    '20': { area: 'Paya Lebar', building: 'Paya Lebar Square' },
    '21': { area: 'Geylang', building: 'Geylang' },
    '22': { area: 'Geylang', building: 'Geylang' },
    '23': { area: 'Geylang', building: 'Geylang' },
    '24': { area: 'Eunos', building: 'Eunos' },
    '25': { area: 'Bedok', building: 'Bedok' },
    '26': { area: 'Bedok', building: 'Bedok' },
    '27': { area: 'Bedok', building: 'Bedok' },
    '28': { area: 'Tampines', building: 'Tampines' },
    '29': { area: 'Tampines', building: 'Tampines' },
    '30': { area: 'Tampines', building: 'Tampines' },
    '31': { area: 'Pasir Ris', building: 'Pasir Ris' },
    '32': { area: 'Pasir Ris', building: 'Pasir Ris' },
    '33': { area: 'Punggol', building: 'Punggol' },
    '34': { area: 'Punggol', building: 'Punggol' },
    '35': { area: 'Hougang', building: 'Hougang' },
    '36': { area: 'Hougang', building: 'Hougang' },
    '37': { area: 'Sengkang', building: 'Sengkang' },
    '38': { area: 'Sengkang', building: 'Sengkang' },
    '39': { area: 'Sengkang', building: 'Sengkang' },
    '40': { area: 'Jurong West', building: 'Jurong West' },
    '41': { area: 'Jurong West', building: 'Jurong West' },
    '42': { area: 'Jurong', building: 'Jurong' },
    '43': { area: 'Jurong East', building: 'Jurong East' },
    '44': { area: 'Clementi', building: 'Clementi' },
    '45': { area: 'Clementi', building: 'Clementi' },
    '46': { area: 'Clementi', building: 'Clementi' },
    '47': { area: 'Bukit Merah', building: 'Bukit Merah' },
    '48': { area: 'Bukit Merah', building: 'Bukit Merah' },
    '49': { area: 'Tiong Bahru', building: 'Tiong Bahru' },
    '50': { area: 'Redhill', building: 'Redhill' },
    '51': { area: 'Queenstown', building: 'Queenstown' },
    '52': { area: 'Commonwealth', building: 'Commonwealth' },
    '53': { area: 'Pasir Panjang', building: 'Pasir Panjang' },
    '54': { area: 'Pasir Panjang', building: 'Pasir Panjang' },
    '55': { area: 'Bukit Timah', building: 'Bukit Timah' },
    '56': { area: 'Bukit Timah', building: 'Bukit Timah' },
    '57': { area: 'Holland', building: 'Holland' },
    '58': { area: 'Tanglin', building: 'Tanglin' },
    '59': { area: 'Clementi', building: 'Clementi' },
    '60': { area: 'Bukit Timah', building: 'Bukit Timah' },
    '61': { area: 'Bishan', building: 'Bishan' },
    '62': { area: 'Bishan', building: 'Bishan' },
    '63': { area: 'Ang Mo Kio', building: 'Ang Mo Kio' },
    '64': { area: 'Ang Mo Kio', building: 'Ang Mo Kio' },
    '65': { area: 'Serangoon', building: 'Serangoon Central' },
    '66': { area: 'Serangoon', building: 'Serangoon Central' },
    '67': { area: 'Ang Mo Kio', building: 'Ang Mo Kio' },
    '68': { area: 'Choa Chu Kang', building: 'Choa Chu Kang' },
    '69': { area: 'Geylang', building: 'Geylang' },
    '70': { area: 'Bedok', building: 'Bedok' },
    '71': { area: 'Bedok', building: 'Bedok' },
    '72': { area: 'Bedok', building: 'Bedok' },
    '73': { area: 'Bedok', building: 'Bedok' },
    '74': { area: 'Tampines', building: 'Tampines' },
    '75': { area: 'Tampines', building: 'Tampines' },
    '76': { area: 'Tampines', building: 'Tampines' },
    '77': { area: 'Tampines', building: 'Tampines' },
    '78': { area: 'Tampines', building: 'Tampines' },
    '79': { area: 'Sengkang', building: 'Sengkang' },
    '80': { area: 'Sengkang', building: 'Sengkang' },
    '81': { area: 'Sengkang', building: 'Sengkang' },
    '82': { area: 'Sengkang', building: 'Sengkang' },
  };

  const extractFieldsFromTitle = async (title: string) => {
    if (!title.trim() || title.length < 2) return;

    try {
      console.log('[EXTRACT] Calling /extract-task-info with:', title);
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/extract-task-info`,
        { input: title }
      );

      console.log('[EXTRACT] Response:', response.data);

      if (response.data.success && response.data.data) {
        const extracted = response.data.data;
        console.log('[EXTRACT] Setting form data with:', extracted);
        setFormData((prev) => ({
          ...prev,
          ...(extracted.time && { time: extracted.time }),
          ...(extracted.duration && { duration: extracted.duration }),
          ...(extracted.durationUnit && { durationUnit: extracted.durationUnit }),
          ...(extracted.budget && { budget: extracted.budget }),
          ...(extracted.location && { location: extracted.location }),
          ...(extracted.date && { deadline: extracted.date }),
          ...(extracted.description && { description: extracted.description }),
        }));
        // Set postal code separately (it's not in formData, it's a separate state)
        if (extracted.postalCode) {
          console.log('[EXTRACT] Setting postal code:', extracted.postalCode);
          setPostalCode(extracted.postalCode);
        }
      }
    } catch (err) {
      console.error('Extraction error:', err);
    }
  };

  const fetchAiSuggestions = async (title: string, description: string = '') => {
    if (!title.trim() || title.length < 2) return;

    setAiLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/suggestions`,
        { title, description }
      );

      if (response.data.success) {
        setAiSuggestions({
          suggestedCategory: response.data.data.category,
          suggestedDescription: response.data.data.description,
          correctedTitle: response.data.data.correctedTitle || '',
          hasCorrections: response.data.data.hasCorrections,
          suggestedBudget: response.data.data.budget || null,
          suggestedNotes: response.data.data.notes || '',
          certifications: response.data.data.certifications || { required: [], optional: [] },
          skills: response.data.data.skills || [],
          blocked: false,
          error: '',
        });
      }
    } catch (err: any) {
      console.error('AI suggestion error:', err);
      if (err.response?.data?.blocked) {
        setAiSuggestions((prev) => ({
          ...prev,
          blocked: true,
          error: err.response.data.error,
        }));
      }
    } finally {
      setAiLoading(false);
    }
  };

  // Fetch AI description from suggestions endpoint
  const fetchAiDescription = async (title: string, description: string = '') => {
    if (!title.trim() || title.length < 2) return;

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/suggestions`,
        { title, description }
      );

      if (response.data.success && response.data.data.description) {
        setFormData((prev) => ({
          ...prev,
          description: response.data.data.description,
        }));
      }
    } catch (err) {
      console.error('AI description error:', err);
    }
  };

  const debouncedFetchAiSuggestions = (value: string, desc: string = '') => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchAiSuggestions(value, desc);
    }, 300); // Wait 300ms after user stops typing
  };

  const debouncedExtractFields = (value: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      extractFieldsFromTitle(value);
    }, 100); // Extract faster than AI suggestions
  };



  // Auto-apply AI suggestions when they arrive
  useEffect(() => {
    // Update category if AI has a suggestion and user hasn't selected one yet
    if (aiSuggestions.suggestedCategory && !formData.category) {
      setFormData((prev) => ({
        ...prev,
        category: aiSuggestions.suggestedCategory,
      }));
    }
  }, [aiSuggestions.suggestedCategory, formData.category]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    console.log('[handleChange] FIRED - name:', name, 'value:', value, 'type:', type);

    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()],
      }));
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  };

  const toggleCertification = (cert: string, type: 'required' | 'optional') => {
    setFormData((prev) => {
      const certList = prev.certifications[type];
      if (certList.includes(cert)) {
        return {
          ...prev,
          certifications: {
            ...prev.certifications,
            [type]: certList.filter((c) => c !== cert),
          },
        };
      } else {
        return {
          ...prev,
          certifications: {
            ...prev.certifications,
            [type]: [...certList, cert],
          },
        };
      }
    });
  };


  const handleSubmit = async () => {
    console.log('[DEBUG] *** POST BUTTON CLICKED - handleSubmit STARTED ***');
    console.log('[DEBUG] Current state - loading:', loading, 'showConfirm:', showConfirm);
    console.log('[DEBUG] formData:', formData);

    if (!formData.title || !formData.category) {
      console.error('[DEBUG] *** VALIDATION FAILED - Missing title or category ***');
      setError('Title and category are required');
      return;
    }

    console.log('[DEBUG] *** VALIDATION PASSED - SETTING LOADING TRUE ***');
    setLoading(true);
    console.log('[DEBUG] After setLoading(true) - loading will update asynchronously');

    try {
      const token = localStorage.getItem('token');
      console.log('[DEBUG] Token from localStorage:', !!token);

      if (!token) {
        console.error('[DEBUG] *** NO TOKEN FOUND ***');
        setError('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }

      console.log('[DEBUG] *** ABOUT TO POST ERRAND TO /api/errands ***');
      console.log('[DEBUG] Payload:', {
        title: formData.title,
        category: formData.category,
        budget: formData.budget,
        description: formData.description,
      });

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands`,
        {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          location: formData.location || null,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
          certifications:
            formData.certifications.required.length > 0 ||
            formData.certifications.optional.length > 0
              ? formData.certifications
              : undefined,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('[DEBUG] *** API RESPONSE RECEIVED ***:', response.data);

      if (response.data.success) {
        console.log('[DEBUG] *** SUCCESS - ERRAND POSTED ***');
        setPaymentRequired(false);
        setShowConfirm(false);
        alert('✓ Errand posted successfully! Dummy payment confirmed.');
        navigate('/home');
      } else {
        console.error('[DEBUG] *** API RETURNED success:false ***:', response.data);
        setError('Failed to post errand');
      }
    } catch (err: any) {
      console.error('[DEBUG] *** EXCEPTION CAUGHT ***');
      console.error('[DEBUG] Error:', err.message);
      console.error('[DEBUG] Error response:', err.response?.data);
      console.error('[DEBUG] Full error:', err);

      // Handle duplicate errand error specifically
      if (err.response?.status === 409) {
        const duplicateMsg = err.response?.data?.message || 'You already have a similar open errand. Please check your existing errands or modify this one.';
        setError(duplicateMsg);
      } else {
        const errorMsg = err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to create errand';
        setError(errorMsg);
      }
    } finally {
      console.log('[DEBUG] *** FINALLY BLOCK - SETTING LOADING FALSE ***');
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-errandify-bg">
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="text-errandify-orange font-semibold mb-4 text-sm"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-bold text-errandify-brown mb-6">Create Your Errand</h1>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Blocked Content Alert */}
        {aiSuggestions.blocked && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {aiSuggestions.error}
          </div>
        )}

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-sm space-y-4 p-4">
          {/* Section 1: Essentials (Title, Description, Category) */}
          <div className="space-y-4">
            <h3 className="font-bold text-errandify-brown text-sm">About Your Errand</h3>

            {/* Title - Required */}
            <div>
              <label className="block text-sm font-semibold text-errandify-brown mb-2">
                Errand Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={(e) => {
                  handleChange(e);
                  debouncedFetchAiSuggestions(e.target.value, formData.description);
                }}
                placeholder="What do you need help with?"
                className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-base"
              />

            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-errandify-brown mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your errand in detail..."
                rows={2}
                className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-base resize-none"
              />

              {/* AI Suggestion for Description */}
              {aiSuggestions.suggestedDescription && !formData.description && (
                <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-900 mb-1">💡 AI Suggestion:</p>
                      <p className="text-sm text-blue-800">{aiSuggestions.suggestedDescription}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          description: aiSuggestions.suggestedDescription,
                        }));
                      }}
                      className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 whitespace-nowrap flex-shrink-0"
                    >
                      ✓ Use
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Category - Auto-detected */}
            <div>
              <label className="block text-sm font-semibold text-errandify-brown mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-base"
              >
                <option value="">Select a category</option>
                {Object.entries(categoryNames).map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: Logistics (Budget, Deadline, Duration) */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-bold text-errandify-brown text-sm">Timeline & Budget</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-errandify-brown mb-2">
                  Budget (SGD) {aiSuggestions.suggestedBudget && <span className="text-xs text-gray-400">(suggested)</span>}
                </label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  placeholder="Enter amount"
                  className={`w-full px-3 py-2 border-b-2 bg-transparent focus:outline-none focus:border-errandify-orange text-base ${
                    aiSuggestions.suggestedBudget
                      ? 'border-gray-200 text-gray-500'
                      : 'border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-errandify-brown mb-2">
                  Errand Date
                </label>
                <input
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-base"
                />
              </div>
            </div>

            {/* Time Field */}
            <div className="relative">
              <label className="block text-sm font-semibold text-errandify-brown mb-2">
                Errand Time <span className="text-xs text-gray-400 font-normal">e.g. HH:MM AM/PM</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      time: e.target.value,
                    }));
                  }}
                  onFocus={() => setShowTimePicker(true)}
                  onBlur={() => setTimeout(() => setShowTimePicker(false), 200)}
                  placeholder="HH:MM"
                  className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-base placeholder:text-gray-400 cursor-pointer"
                />

                {/* Clock icon indicator */}
                {showTimePicker && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xl animate-pulse">
                    🕐
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-errandify-brown mb-2">
                Duration (How Long It Will Take)
              </label>
              <div className="flex gap-2 items-end">
                <div className="flex-1 flex gap-2">
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    placeholder="1"
                    className="flex-1 px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-base"
                  />
                  <select
                    name="durationUnit"
                    value={formData.durationUnit}
                    onChange={handleChange}
                    className="px-2 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-base"
                  >
                    <option>Min</option>
                    <option>Hr</option>
                    <option>Day</option>
                    <option>Week</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                  <input
                    type="checkbox"
                    name="isRecurring"
                    checked={formData.isRecurring}
                    onChange={handleChange}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-semibold text-errandify-brown">Recurring?</span>
                </label>
              </div>
            </div>

            {formData.isRecurring && (
              <div className="grid grid-cols-3 gap-3 bg-gray-50 p-3 rounded">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    Every
                  </label>
                  <input
                    type="number"
                    name="repeatEvery"
                    value={formData.repeatEvery}
                    onChange={handleChange}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    Unit
                  </label>
                  <select
                    name="repeatUnit"
                    value={formData.repeatUnit}
                    onChange={handleChange}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    Times
                  </label>
                  <input
                    type="number"
                    name="occurrences"
                    value={formData.occurrences}
                    onChange={handleChange}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Location - Only area shown here */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-bold text-errandify-brown text-sm">Errand Location</h3>

            {/* Remote Work Checkbox */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isRemoteWork}
                onChange={(e) => {
                  setIsRemoteWork(e.target.checked);
                  if (e.target.checked) {
                    setFormData((prev) => ({ ...prev, location: 'Remote' }));
                    setShowStartLocation(false);
                  } else {
                    setFormData((prev) => ({ ...prev, location: '' }));
                  }
                }}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">This is remote work (no specific location)</span>
            </label>

            {/* Postal Code and Full Address - Only shown when NOT remote work */}
            {!isRemoteWork && (
              <>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-semibold text-errandify-brown mb-2">
                      Postal Code (Singapore)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 082001"
                      value={postalCode}
                      onChange={(e) => {
                        const code = e.target.value.trim();
                        setPostalCode(code);

                        // Only update location if postal code is exactly 6 digits
                        if (code.length === 6 && /^\d+$/.test(code)) {
                          const areaPrefix = code.substring(0, 2);
                          const areaData = postalCodeAreas[areaPrefix];

                          if (areaData) {
                            // Only update if we have valid area data for this prefix
                            setFormData((prev) => ({
                              ...prev,
                              location: areaData.area,
                            }));
                            setFullAddress(`1 ${areaData.building}, Unit: __, Singapore ${code}`);
                          }
                        } else if (code.length === 0) {
                          // Clear addresses only if postal code is completely cleared
                          setFormData((prev) => ({
                            ...prev,
                            location: '',
                          }));
                          setFullAddress('');
                        }
                        // Otherwise: don't update location (partial postal codes won't modify anything)
                      }}
                      className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-errandify-brown mb-2">
                      Area (Shown to Potential Doers)
                    </label>
                    <div className={`w-full px-3 py-2 border-b-2 border-gray-300 bg-gray-50 text-base ${formData.location ? 'text-gray-900' : 'text-gray-400'}`}>
                      {formData.location || 'Enter postal code above'}
                    </div>
                  </div>
                </div>

                {/* Full Address - Shown only to confirmed doer */}
                <div>
                  <label className="block text-sm font-semibold text-errandify-brown mb-2">
                    Full Address <span className="text-xs text-gray-600">(Shown to Confirmed Doer - Add Unit Number if Required)</span>
                  </label>
                  <textarea
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                    placeholder="e.g., Block 1, Tanjong Pagar Plaza, Unit #5-10, Singapore 082001"
                    rows={2}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:border-errandify-orange text-sm"
                  />

                  {/* GPS Location Notice */}
                  {gpsEnabled && gpsLocation && (
                    <div className="mt-2 p-2 bg-blue-50 border-l-4 border-blue-400 rounded text-xs">
                      <p className="text-blue-900">
                        📍 <span className="font-semibold">Your current location detected:</span> {gpsLocation.latitude.toFixed(4)}, {gpsLocation.longitude.toFixed(4)}
                      </p>
                      {formData.location && (
                        <p className="text-blue-800 mt-1">
                          ℹ️ Task location: <span className="font-semibold">{formData.location}</span> — Make sure this is different from your current location if the doer needs to travel.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

          </div>

          {/* Section 4: Skills Required */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-bold text-errandify-brown text-sm">Skills Required (Optional)</h3>

            {/* AI Suggestions */}
            {aiSuggestions.skills.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 font-semibold mb-2">🤖 AI Suggested Skills — Please select:</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {aiSuggestions.skills.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => {
                        if (!formData.skills.includes(skill)) {
                          setFormData((prev) => ({
                            ...prev,
                            skills: [...prev.skills, skill],
                          }));
                        }
                      }}
                      className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${
                        formData.skills.includes(skill)
                          ? 'bg-errandify-orange text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            )}


            {/* Manual Skill Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                placeholder="Add custom skill..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-errandify-orange"
              />
              <button
                onClick={addSkill}
                className="px-3 py-2 bg-errandify-orange text-white rounded-lg hover:bg-orange-600 font-semibold text-sm transition-colors"
              >
                +
              </button>
            </div>

            {formData.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => removeSkill(skill)}
                    className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full font-semibold hover:bg-blue-200"
                  >
                    {skill} ✕
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Certifications Required - Only show if category needs them or AI has suggestions */}
          {(aiSuggestions.certifications.required.length > 0 || aiSuggestions.certifications.optional.length > 0) && (
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-bold text-errandify-brown text-sm">
              Certifications Required {formData.certifications.required.length > 0 ? '✓' : ''}
            </h3>


            {/* Required Certifications from AI */}
            {aiSuggestions.certifications.required.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 font-semibold mb-2">
                  🤖 Required Certifications — Please select:
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {aiSuggestions.certifications.required.map((cert) => (
                    <button
                      key={cert}
                      onClick={() => toggleCertification(cert, 'required')}
                      className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${
                        formData.certifications.required.includes(cert)
                          ? 'bg-errandify-orange text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {cert}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Certifications from AI */}
            {aiSuggestions.certifications.optional.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 font-semibold mb-2">
                  🤖 Optional Certifications — Please select:
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {aiSuggestions.certifications.optional.map((cert) => (
                    <button
                      key={cert}
                      onClick={() => toggleCertification(cert, 'optional')}
                      className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${
                        formData.certifications.optional.includes(cert)
                          ? 'bg-errandify-orange text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {cert}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Common Certs if no suggestions yet */}
            {aiSuggestions.certifications.required.length === 0 &&
              aiSuggestions.certifications.optional.length === 0 && (
                <div>
                  <p className="text-xs text-gray-600 font-semibold mb-2">
                    Common Certifications:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {commonCertifications.map((cert) => (
                      <button
                        key={cert}
                        onClick={() => {
                          if (formData.certifications.required.includes(cert)) {
                            toggleCertification(cert, 'required');
                          } else if (
                            formData.certifications.optional.includes(cert)
                          ) {
                            toggleCertification(cert, 'optional');
                          } else {
                            toggleCertification(cert, 'optional');
                          }
                        }}
                        className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${
                          formData.certifications.required.includes(cert) ||
                          formData.certifications.optional.includes(cert)
                            ? 'bg-errandify-orange text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {cert}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            {/* Selected Certifications Display */}
            {(formData.certifications.required.length > 0 ||
              formData.certifications.optional.length > 0) && (
              <div className="p-3 bg-blue-50 rounded text-sm mt-3 space-y-3">
                <p className="font-semibold text-blue-900">Selected Certifications:</p>

                {formData.certifications.required.length > 0 && (
                  <div>
                    <p className="text-xs text-blue-800 font-semibold mb-2">Required:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.certifications.required.map((cert) => (
                        <div
                          key={cert}
                          className="bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded flex items-center gap-2"
                        >
                          <span>{cert}</span>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={true}
                              onChange={() => {
                                toggleCertification(cert, 'required');
                                toggleCertification(cert, 'optional');
                              }}
                              className="w-3 h-3"
                            />
                            <span className="text-xs">Optional?</span>
                          </label>
                          <button
                            onClick={() => toggleCertification(cert, 'required')}
                            className="hover:opacity-70 ml-1"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {formData.certifications.optional.length > 0 && (
                  <div>
                    <p className="text-xs text-blue-700 font-semibold mb-2">Optional:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.certifications.optional.map((cert) => (
                        <div
                          key={cert}
                          className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded flex items-center gap-2"
                        >
                          <span>{cert}</span>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={false}
                              onChange={() => {
                                toggleCertification(cert, 'optional');
                                toggleCertification(cert, 'required');
                              }}
                              className="w-3 h-3"
                            />
                            <span className="text-xs">Required?</span>
                          </label>
                          <button
                            onClick={() => toggleCertification(cert, 'optional')}
                            className="hover:opacity-70 ml-1"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          )}
        </div>

        {/* Section 6: Notes - At end of form */}
        <div className="border-t pt-4 space-y-4">
          <h3 className="font-bold text-errandify-brown text-sm">Additional Notes</h3>

          <div>
            <label className="block text-sm font-semibold text-errandify-brown mb-2">
              Notes (Shown to Confirmed Doer) <span className="text-xs text-gray-600">(optional)</span>
            </label>
            <textarea
              name="specialNote"
              value={formData.specialNote}
              onChange={handleChange}
              placeholder="e.g., access instructions, special requirements, or preferences"
              rows={2}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:border-errandify-orange text-sm"
            />

            {/* AI Suggestion for Notes */}
            {aiSuggestions.suggestedNotes && !formData.specialNote && (
              <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-blue-900 mb-1">💡 AI Suggested Notes:</p>
                    <p className="text-sm text-blue-800">{aiSuggestions.suggestedNotes}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        specialNote: aiSuggestions.suggestedNotes,
                      }));
                    }}
                    className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 whitespace-nowrap flex-shrink-0"
                  >
                    ✓ Use
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Summary & Post Button */}
        <div className="mt-6 space-y-3">
          <div className="bg-orange-50 border-l-4 border-errandify-orange p-3 rounded text-sm">
            <p className="font-semibold text-errandify-brown mb-1">Ready to post?</p>
            <p className="text-gray-700 text-xs">
              {formData.title} • {categoryNames[formData.category] || 'No category'} •{' '}
              {formData.budget ? `SGD $${formData.budget}` : 'No budget'}
            </p>
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            disabled={!formData.title || !formData.category || loading}
            className="w-full bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {loading ? 'Posting...' : 'Post Now'}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 pointer-events-auto">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full flex flex-col max-h-[90vh] pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 pb-0">
              <h2 className="text-xl font-bold text-errandify-brown">Confirm & Post</h2>
            </div>

            <div className="p-6 pt-4 flex-1 overflow-y-auto space-y-3 text-sm text-gray-700">
              <p>
                <span className="font-semibold">Title:</span> {formData.title}
              </p>
              <p>
                <span className="font-semibold">Category:</span>{' '}
                {categoryNames[formData.category]}
              </p>
              {formData.description && (
                <p>
                  <span className="font-semibold">Description:</span> {formData.description}
                </p>
              )}
              {formData.budget && (
                <p>
                  <span className="font-semibold">Budget:</span> SGD ${formData.budget}
                </p>
              )}
              {formData.deadline && (
                <p>
                  <span className="font-semibold">Deadline:</span>{' '}
                  {new Date(formData.deadline).toLocaleDateString()}
                </p>
              )}
              {formData.duration && (
                <p>
                  <span className="font-semibold">Duration:</span> {formData.duration}{' '}
                  {formData.durationUnit}
                </p>
              )}
              {formData.location && (
                <p>
                  <span className="font-semibold">Location:</span> {formData.location}
                </p>
              )}
              {formData.skills.length > 0 && (
                <p>
                  <span className="font-semibold">Skills:</span> {formData.skills.join(', ')}
                </p>
              )}
              {(formData.certifications.required.length > 0 ||
                formData.certifications.optional.length > 0) && (
                <p>
                  <span className="font-semibold">Certifications:</span>{' '}
                  {[
                    ...formData.certifications.required,
                    ...formData.certifications.optional,
                  ].join(', ')}
                </p>
              )}
            </div>

            <div className="border-t px-6 py-4 flex gap-2 pointer-events-auto">
              <button
                onClick={() => {
                  console.log('[DEBUG] Edit button clicked');
                  setShowConfirm(false);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer pointer-events-auto"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  console.log('[DEBUG] *** POST BUTTON CLICKED - DIRECT HANDLER ***');
                  console.log('[DEBUG] Current loading state:', loading);
                  handleSubmit();
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-errandify-orange text-white rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer pointer-events-auto"
              >
                {loading ? '⏳ Posting...' : '✓ Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
