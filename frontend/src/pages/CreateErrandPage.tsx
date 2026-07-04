import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { getAreaFromPostalCode } from '../data/singaporePostalCodes';

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
  const [showSuccess, setShowSuccess] = useState(false);
  const [successErrandId, setSuccessErrandId] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [area, setArea] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [startLocationPostalCode, setStartLocationPostalCode] = useState('');
  const [startLocationFullAddress, setStartLocationFullAddress] = useState('');
  const [isRemoteWork, setIsRemoteWork] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [showStartLocation, setShowStartLocation] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [needsAreaConfirmation, setNeedsAreaConfirmation] = useState(false);
  const [pendingPostalCode, setPendingPostalCode] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Singapore areas list for dropdown
  const singaporeAreas = [
    'Raffles Place', 'Cecil Street', 'Tanjong Pagar', 'Outram', 'People\'s Park',
    'Chinatown', 'Orchard', 'Pasir Panjang', 'Novena', 'Newton', 'Farrer Park',
    'Henderson', 'Balestier', 'Macpherson', 'Paya Lebar', 'Geylang', 'Eunos',
    'Bedok', 'Tampines', 'Pasir Ris', 'Punggol', 'Hougang', 'Serangoon',
    'Sengkang', 'Choa Chu Kang', 'Jurong West', 'Jurong', 'Jurong East',
    'Clementi', 'Bukit Merah', 'Tiong Bahru', 'Queenstown', 'Bukit Timah',
    'Ang Mo Kio', 'Bishan', 'Toa Payoh', 'Yishun', 'Sembawang', 'Kranji', 'Woodlands', 'Simei',
  ].sort();

  // Load copied errand data on mount
  useEffect(() => {
    const copyErrandData = sessionStorage.getItem('copyErrandData');
    if (copyErrandData) {
      try {
        const data = JSON.parse(copyErrandData);
        setFormData((prev) => ({
          ...prev,
          title: data.title || '',
          description: data.description || '',
          category: data.category || prev.category,
          budget: data.budget ? data.budget.toString() : '',
          deadline: data.deadline || '',
          location: data.location || '',
          isRecurring: data.isRecurring || false,
        }));
        // Clear the session storage so it doesn't persist
        sessionStorage.removeItem('copyErrandData');
      } catch (err) {
        console.error('Failed to load copied errand data:', err);
      }
    }
  }, []);

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
    const loadPrefilled = async () => {
      const prefilledJson = searchParams.get('prefilled');
      console.log('[CreateErrand] searchParams.get("prefilled"):', prefilledJson);
      if (prefilledJson) {
        try {
          const prefilledData = JSON.parse(decodeURIComponent(prefilledJson));
          console.log('[CreateErrand] Parsed prefilled data:', prefilledData);
          console.log('[CreateErrand] Data keys:', Object.keys(prefilledData));

          const newFormData = {
            title: prefilledData.title || '',
            description: prefilledData.description || '',
            category: mapHanaCategory(prefilledData.category) || '',
            location: prefilledData.location || '',
            startLocation: '',
            budget: prefilledData.budget ? String(prefilledData.budget) : '',
            deadline: prefilledData.date || new Date().toISOString().split('T')[0],
            time: prefilledData.time || '',
            duration: prefilledData.duration ? String(prefilledData.duration) : '',
            durationUnit: (prefilledData.durationUnit || 'Hr') as 'Min' | 'Hr' | 'Day' | 'Week',
            isRecurring: false,
            repeatEvery: '1',
            repeatUnit: 'week' as 'day' | 'week' | 'month',
            occurrences: '1',
            specialNote: prefilledData.notes || '',
            skills: [], // Don't auto-add suggested skills - user can add manually
            certifications: { required: [] as string[], optional: [] as string[] },
          };

          console.log('[CreateErrand] Setting form data - title:', newFormData.title, 'budget:', newFormData.budget, 'date:', newFormData.deadline);
          setFormData(newFormData);

          // Set postal code, area, and full address from prefilled data
          if (prefilledData.postalCode) {
            setPostalCode(prefilledData.postalCode);
            console.log('[CreateErrand] Postal code:', prefilledData.postalCode);
          }

          // Check if area confirmation is needed
          if (prefilledData.needsAreaConfirmation) {
            console.log('[CreateErrand] ⚠️ Area confirmation needed for postal:', prefilledData.postalCode);
            setNeedsAreaConfirmation(true);
            setPendingPostalCode(prefilledData.postalCode);
          } else {
            // Use prefilled area, normalize to title case
            if (prefilledData.area) {
              const normalizedArea = prefilledData.area
                .split(' ')
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
              setArea(normalizedArea);
              setFormData((prev) => ({
                ...prev,
                location: normalizedArea,
              }));
              console.log('[CreateErrand] Area set from prefilled data:', normalizedArea);
            }
          }

          if (prefilledData.fullAddress) {
            setFullAddress(prefilledData.fullAddress);
            console.log('[CreateErrand] Full address:', prefilledData.fullAddress);
          }

          // Set AI suggestions from prefilled data if available
          if (prefilledData.suggestedDescription || prefilledData.suggestedNotes) {
            console.log('[CreateErrand] Setting AI suggestions from prefilled data');
            setAiSuggestions({
              suggestedCategory: '',
              suggestedDescription: prefilledData.suggestedDescription || '',
              correctedTitle: '',
              hasCorrections: false,
              suggestedBudget: null,
              suggestedNotes: prefilledData.suggestedNotes || '',
              certifications: { required: [], optional: [] },
              skills: prefilledData.suggestedSkills || [],
              blocked: false,
              error: '',
            });
          } else if (newFormData.title) {
            // Fetch suggestions for any title to get AI category recommendation (even if category is empty)
            console.log('[CreateErrand] Fetching AI suggestions for title:', newFormData.title, 'category:', newFormData.category);
            try {
              const response = await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/suggestions`,
                {
                  title: newFormData.title,
                  description: newFormData.description,
                  category: newFormData.category,
                  date: newFormData.deadline,
                  time: newFormData.time
                }
              );
              if (response.data.success) {
                console.log('[CreateErrand] Got suggestions:', response.data.data);
                setAiSuggestions({
                  suggestedCategory: response.data.data.category,
                  suggestedDescription: response.data.data.description,
                  correctedTitle: response.data.data.correctedTitle || '',
                  hasCorrections: response.data.data.hasCorrections,
                  suggestedBudget: response.data.data.suggestedBudget || null,
                  suggestedNotes: response.data.data.notes || '',
                  certifications: response.data.data.certifications || { required: [], optional: [] },
                  skills: response.data.data.skills || [],
                  blocked: false,
                  error: '',
                });
              }
            } catch (err) {
              console.error('Error fetching suggestions:', err);
            }
          }
        } catch (err) {
          console.error('Failed to load prefilled data:', err);
        }
      }
    };

    loadPrefilled();
  }, [searchParams]);

  const categoryNames: Record<string, string> = {
    'home-maintenance': 'Home Maintenance',
    'cleaning-household': 'Cleaning & Laundry',
    'food-beverage': 'Food & Beverage',
    'furniture-assembly': 'Furniture Assembly',
    'shopping-errands': 'Shopping & Errands',
    'delivery-moving': 'Delivery & Moving',
    'travel-mobility': 'Travel & Mobility',
    'event-planning': 'Event Planning & Setup',
    'childcare-education': 'Childcare & Education',
    'eldercare-healthcare': 'Eldercare & Healthcare',
    'pet-care': 'Pet Care',
    'personal-care': 'Personal Care',
    'tech-support': 'Tech Support',
    'creative-arts': 'Creative & Arts',
    'admin-business': 'Admin & Business',
    'charity-community': 'Charity & Community',
  };

  // Map short category names from Hana extraction to full category names
  const mapHanaCategory = (category: string): string => {
    const mapping: Record<string, string> = {
      'homehelp': 'home-maintenance',
      'homehelp-maintenance': 'home-maintenance',
      'cleaning': 'cleaning-household',
      'cleaning-laundry': 'cleaning-household',
      'food': 'food-beverage',
      'food-beverage': 'food-beverage',
      'furniture': 'furniture-assembly',
      'furniture-assembly': 'furniture-assembly',
      'shopping': 'shopping-errands',
      'shopping-errands': 'shopping-errands',
      'delivery': 'delivery-moving',
      'delivery-moving': 'delivery-moving',
      'travel': 'travel-mobility',
      'travel-mobility': 'travel-mobility',
      'eventhelp': 'event-planning',
      'event-planning': 'event-planning',
      'childcare': 'childcare-education',
      'childcare-education': 'childcare-education',
      'eldercare': 'eldercare-healthcare',
      'eldercare-healthcare': 'eldercare-healthcare',
      'petcare': 'pet-care',
      'pet-care': 'pet-care',
      'personal': 'personal-care',
      'personal-care': 'personal-care',
      'tech': 'tech-support',
      'tech-support': 'tech-support',
      'creative': 'creative-arts',
      'creative-arts': 'creative-arts',
      'admin': 'admin-business',
      'admin-business': 'admin-business',
      'donate': 'charity-community',
      'charity-community': 'charity-community',
    };
    return mapping[category] || category;
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

  // Override map for postal codes where OneMap data is inaccurate
  const postalCodeCorrections: Record<string, string> = {
    '629652': 'Jurong/Tuas',
    '507565': 'Loyang/Pasir Ris',
    '489223': 'Simei',
  };

  // Extract area name from full address string
  const extractAreaFromAddress = (address: string): string => {
    if (!address) return '';
    // Remove postal code and SINGAPORE
    const parts = address.replace(/\d{6}/, '').replace(/SINGAPORE/i, '').trim().split(' ');
    // Get the most meaningful part (usually after street number)
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i] && parts[i].length > 2 && !/^(ROAD|STREET|AVENUE|LANE|DRIVE|BOULEVARD|ST|RD|AVE)$/i.test(parts[i])) {
        return parts[i];
      }
    }
    return parts.filter(p => p && p.length > 2)[0] || '';
  };

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
    '11': { area: 'Pasir Panjang', building: 'Pasir Panjang' },
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
    '62': { area: 'Jurong', building: 'Jurong' },
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
    '83': { area: 'Simei', building: 'Simei' },
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
        console.log('[EXTRACT] Description from extraction:', extracted.description);
        console.log('[EXTRACT] Area from extraction:', extracted.area);
        console.log('[EXTRACT] FullAddress from extraction:', extracted.fullAddress);

        // Set main form fields (but NOT description - user should write it manually)
        setFormData((prev) => ({
          ...prev,
          ...(extracted.category && { category: extracted.category }),
          ...(extracted.time && { time: extracted.time }),
          ...(extracted.duration && { duration: extracted.duration }),
          ...(extracted.durationUnit && { durationUnit: extracted.durationUnit }),
          ...(extracted.budget && { budget: extracted.budget }),
          ...(extracted.location && { location: extracted.location }),
          ...(extracted.date && { deadline: extracted.date }),
        }));

        // Set separate state fields
        if (extracted.postalCode) {
          console.log('[EXTRACT] Setting postal code:', extracted.postalCode);
          setPostalCode(extracted.postalCode);
        }
        if (extracted.area) {
          console.log('[EXTRACT] Setting area:', extracted.area);
          setArea(extracted.area);
        }

        // Auto-fill full address with area + postal code
        let autoFullAddress = extracted.fullAddress;
        if (!autoFullAddress && extracted.area && extracted.postalCode) {
          autoFullAddress = `${extracted.area} S${extracted.postalCode}`;
          console.log('[EXTRACT] Auto-filled full address:', autoFullAddress);
        }
        if (autoFullAddress) {
          console.log('[EXTRACT] Setting full address:', autoFullAddress);
          setFullAddress(autoFullAddress);
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
        { title, description, category: formData.category, date: formData.deadline, time: formData.time }
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
        { title, description, category: formData.category, date: formData.deadline, time: formData.time }
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
    // Note: Do NOT auto-fill description or notes - only show as suggestions for user to approve
    // Update category if AI has a suggestion and user hasn't selected one yet
    if (aiSuggestions.suggestedCategory && !formData.category) {
      console.log('[useEffect] Auto-filling category from AI suggestion');
      setFormData((prev) => ({
        ...prev,
        category: aiSuggestions.suggestedCategory,
      }));
    }
  }, [aiSuggestions.suggestedCategory, aiSuggestions.suggestedDescription, aiSuggestions.suggestedNotes, formData.category, formData.description, formData.specialNote]);

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

    setLoading(true);
    console.log('[DEBUG] Set loading to true');

    // ===== COMPREHENSIVE VALIDATION =====

    // 1. Title validation
    console.log('[DEBUG] Validating title:', formData.title);
    if (!formData.title || formData.title.trim().length === 0) {
      console.log('[DEBUG] VALIDATION FAILED: No title');
      setError('Please enter an errand title. Tell me what help you need 😊');
      setLoading(false);
      setShowConfirm(false);
      return;
    }
    if (formData.title.trim().length < 5) {
      console.log('[DEBUG] VALIDATION FAILED: Title too short');
      setError('Title is too short. Please provide more details 🙏');
      setLoading(false);
      return;
    }
    if (formData.title.length > 100) {
      console.log('[DEBUG] VALIDATION FAILED: Title too long');
      setError('Title is too long. Please keep it short and clear ✌️');
      setLoading(false);
      return;
    }

    // 2. Category validation
    console.log('[DEBUG] Validating category:', formData.category);
    if (!formData.category) {
      console.log('[DEBUG] VALIDATION FAILED: No category');
      setError('Please select a category. What kind of help do you need? 🤔');
      setLoading(false);
      return;
    }

    // 3. Location validation
    console.log('[DEBUG] Validating location, isRemoteWork:', isRemoteWork, 'location:', formData.location);
    if (!isRemoteWork && (!formData.location || formData.location.trim().length === 0)) {
      console.log('[DEBUG] VALIDATION FAILED: No location (not remote)');
      setError('Please enter the location or mark it as remote work 📍');
      setLoading(false);
      return;
    }

    // 3b. Full address validation
    console.log('[DEBUG] Validating fullAddress:', fullAddress);
    if (!isRemoteWork && (!fullAddress || fullAddress.trim().length === 0)) {
      console.log('[DEBUG] VALIDATION FAILED: No full address (not remote)');
      setError('Please enter a valid address or mark it as remote work 📍');
      setLoading(false);
      return;
    }

    // 4. Budget validation
    console.log('[DEBUG] Validating budget:', formData.budget);
    if (!formData.budget || formData.budget.trim().length === 0) {
      console.log('[DEBUG] VALIDATION FAILED: No budget');
      setError('Please enter a budget amount. How much are you willing to pay? 💰');
      setLoading(false);
      return;
    }
    const budgetNum = parseFloat(formData.budget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      console.log('[DEBUG] VALIDATION FAILED: Invalid budget number');
      setError('Budget must be a valid number 😄');
      setLoading(false);
      return;
    }
    if (budgetNum > 99999) {
      console.log('[DEBUG] VALIDATION FAILED: Budget too high');
      setError('Budget is too high. Please enter a reasonable amount 😅');
      setLoading(false);
      return;
    }
    if (budgetNum < 8) {
      console.log('[DEBUG] VALIDATION FAILED: Budget too low');
      setError('Minimum budget is $8. Please increase it slightly 🙂');
      setLoading(false);
      return;
    }

    // 5. Date and time validation
    console.log('[DEBUG] Validating deadline:', formData.deadline, 'time:', formData.time);
    if (!formData.deadline) {
      console.log('[DEBUG] VALIDATION FAILED: No deadline');
      setError('Please enter the date. When do you need help? 📅');
      setLoading(false);
      return;
    }

    // Use provided time or default to 09:00 if not specified
    const timeToUse = formData.time || '09:00';
    console.log('[DEBUG] Time to use:', timeToUse);

    // Parse the deadline date
    const errandDateTime = new Date(`${formData.deadline}T${timeToUse}`);
    console.log('[DEBUG] Parsed errandDateTime:', errandDateTime, 'isValid:', !isNaN(errandDateTime.getTime()));

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const errandDate = new Date(`${formData.deadline}T00:00:00`);
    console.log('[DEBUG] Parsed today:', today, 'errandDate:', errandDate);

    if (isNaN(errandDateTime.getTime())) {
      console.log('[DEBUG] VALIDATION FAILED: Invalid datetime');
      setError('Invalid date or time format. Please check again 🤨');
      setLoading(false);
      return;
    }

    // Check if the selected date is in the past (before today)
    if (errandDate < today) {
      console.log('[DEBUG] VALIDATION FAILED: Date in past');
      setError('That date is in the past. Please select today or a future date 📅');
      setLoading(false);
      return;
    }

    // Check if date/time is at least 30 minutes from now (only if scheduling for TODAY)
    const isToday = errandDate.getTime() === today.getTime();
    console.log('[DEBUG] Is today?', isToday);

    if (isToday) {
      // For today's errands, require 30 minutes from now
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
      if (errandDateTime < thirtyMinutesFromNow) {
        console.log('[DEBUG] VALIDATION FAILED: Not enough time from now');
        setError('Please schedule at least 30 minutes from now to give doers time to respond ⏳');
        setLoading(false);
        return;
      }
    }
    console.log('[DEBUG] Date/time validation passed');
    console.log('[DEBUG] ===== CHECKPOINT: About to validate duration =====');

    // 6. Duration validation (if specified)
    if (formData.duration && formData.duration.trim().length > 0) {
      console.log('[DEBUG] Checking duration:', formData.duration);
      const durationNum = parseFloat(formData.duration);
      if (isNaN(durationNum) || durationNum <= 0) {
        setError('Duration must be a valid positive number 🙃');
        setLoading(false);
        return;
      }
      if (durationNum > 480) { // Max 8 hours
        setError('Duration cannot exceed 480 hours. That is too long 😅');
        setLoading(false);
        return;
      }
    }

    // 7. Description length validation
    console.log('[DEBUG] ===== CHECKPOINT: About to validate description length =====');
    console.log('[DEBUG] Description length:', formData.description?.length || 0);
    if (formData.description && formData.description.length > 150) {
      console.log('[DEBUG] VALIDATION FAILED: Description too long');
      setError('Description is too long. Please keep it under 150 characters 📝');
      setLoading(false);
      return;
    }

    // 8. Notes length validation
    console.log('[DEBUG] ===== CHECKPOINT: About to validate notes length =====');
    console.log('[DEBUG] Notes length:', formData.specialNote?.length || 0);
    if (formData.specialNote && formData.specialNote.length > 500) {
      console.log('[DEBUG] VALIDATION FAILED: Notes too long');
      setError('Notes are too long. Please keep them under 500 characters 😄');
      setLoading(false);
      return;
    }

    // 9. Content moderation check for inappropriate content (skip for now - will check server-side)
    console.log('[DEBUG] ===== CHECKPOINT: Skipping client-side content moderation, will validate on server =====');

    // 10. Duplication check - block exact duplicates, warn on similar but different location/time
    console.log('[DEBUG] ===== CHECKPOINT: Skipping client-side duplication check, will validate on server =====');

    console.log('[DEBUG] *** VALIDATION PASSED - PROCEEDING WITH API CALL ***');
    console.log('[DEBUG] All validations completed, proceeding to API call');

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

      const payload: any = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        location: formData.location || null,  // This should be the AREA name from the form
        full_address: fullAddress || null,
        postal_code: postalCode || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        certifications:
          formData.certifications.required.length > 0 ||
          formData.certifications.optional.length > 0
            ? formData.certifications
            : undefined,
      };

      // Add recurring config if enabled
      if (formData.isRecurring) {
        payload.isRecurring = true;
        payload.repeatEvery = parseInt(formData.repeatEvery, 10);
        payload.repeatUnit = formData.repeatUnit;
        if (formData.occurrences) {
          payload.occurrences = parseInt(formData.occurrences, 10);
        }
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000, // 15 second timeout
        }
      );

      console.log('[DEBUG] *** API RESPONSE RECEIVED ***:', response.data);
      setLoading(false);
      console.log('[DEBUG] *** setLoading(false) called ***');

      if (response.data.success) {
        console.log('[DEBUG] *** SUCCESS - ERRAND POSTED ***');
        setPaymentRequired(false);
        setShowConfirm(false);

        // Analyze task with AI (non-blocking)
        try {
          await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/analyze-task`,
            {
              title: formData.title,
              description: formData.description,
              location: formData.location,
              category: formData.category,
              budget: formData.budget,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 20000,
            }
          );
          console.log('[DEBUG] AI task analysis completed');
        } catch (aiErr) {
          console.warn('[DEBUG] AI analysis skipped:', aiErr);
        }

        // Show success modal with errand ID
        console.log('[DEBUG] response.data.data:', response.data.data);
        const errandId = response.data.data?.errandId || response.data.errandId;
        console.log('[DEBUG] Extracted errandId:', errandId);

        if (errandId) {
          setSuccessErrandId(errandId);
          setShowSuccess(true);
        } else {
          console.log('[DEBUG] No errandId found, redirecting to home');
          navigate('/my-errands');
        }
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
    <div className="min-h-screen bg-errandify-bg pb-20">
      <div className="max-w-2xl mx-auto px-3 py-1">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="text-errandify-orange font-semibold mb-0.5 text-sm"
        >
          ← Back
        </button>

        <h1 className="text-lg font-bold text-errandify-brown mb-0.5">Create Your Errand</h1>

        {/* Error Display */}
        {error && (
          <div className="mb-3 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg text-sm font-medium">
            <p className="font-bold mb-1">⚠️ Error:</p>
            <p>{error}</p>
            {error.includes('Authentication') && (
              <p className="text-xs text-red-600 mt-2">Please log in first, then try posting again.</p>
            )}
          </div>
        )}

        {/* Blocked Content Alert */}
        {aiSuggestions.blocked && (
          <div className="mb-0.5 p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
            {aiSuggestions.error}
          </div>
        )}

        {/* Main Form - Warm, Approachable, Breathing Room */}
        <div className="bg-white rounded-2xl shadow-md p-4 space-y-4">
          {/* Section 1: Essentials (Title, Description, Category) */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-errandify-brown text-sm leading-relaxed tracking-tight">Tell us what you need</h3>

            {/* Title - Required */}
            <div>
              <label className="block text-sm font-semibold text-errandify-brown mb-1.5">
                What help do you need? *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={(e) => {
                  handleChange(e);
                  debouncedExtractFields(e.target.value);
                  debouncedFetchAiSuggestions(e.target.value, formData.description);
                }}
                placeholder="e.g., help move boxes, tutoring, cleaning..."
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 bg-gray-50 focus:outline-none focus:bg-white transition-colors text-sm font-medium text-errandify-brown placeholder:text-gray-400"
              />
            </div>

            {/* Description - Compact */}
            <div>
              <label className="block text-sm font-semibold text-errandify-brown mb-1.5">
                Description
              </label>
              <div className="relative">
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Add details about your task above"
                  rows={2}
                  maxLength={150}
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 bg-gray-50 focus:outline-none focus:bg-white transition-colors resize-none text-sm font-medium text-errandify-brown placeholder:text-gray-400"
                />
                <span className="absolute bottom-2 right-3 text-xs text-gray-400">{formData.description.length}/150</span>
              </div>
              {formData.title && aiSuggestions.suggestedDescription && (
                <div className="text-xs text-errandify-orange-700 mt-1.5 px-2 py-1 bg-orange-50 rounded">
                  💡 Tip: {(() => {
                    let tip = aiSuggestions.suggestedDescription;
                    // Add time-based tips if duration and time are specified
                    if (formData.time && formData.duration) {
                      const [hours, minutes] = formData.time.split(':').map(Number);
                      const duration = parseFloat(formData.duration);
                      const durationUnit = formData.durationUnit || 'hr';

                      // Convert duration to minutes
                      let durationMinutes = duration * 60;
                      if (durationUnit === 'min') durationMinutes = duration;

                      // Calculate completion time
                      const startTime = new Date();
                      startTime.setHours(hours, minutes, 0);
                      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
                      const endHours = endTime.getHours();
                      const endMinutes = endTime.getMinutes();
                      const endTimeStr = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

                      tip += ` Place should be ready by ${endTimeStr}.`;
                    }
                    return tip;
                  })()}
                </div>
              )}

              {formData.title && aiSuggestions.suggestedNotes && (
                <div className="text-xs text-gray-600 mt-1.5 px-2 py-1.5 bg-gray-50 rounded border-l-2 border-gray-300">
                  <div>💡 <strong>Note for doer:</strong> {aiSuggestions.suggestedNotes}</div>
                </div>
              )}
            </div>

            {/* Category - Auto-detected */}
            <div>
              <label className="block text-sm font-semibold text-errandify-brown mb-1.5">
                Type of help *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 bg-gray-50 focus:outline-none focus:bg-white transition-colors text-sm appearance-none cursor-pointer text-errandify-brown"
              >
                <option value="">Pick a category</option>
                {Object.entries(categoryNames).map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: Logistics (Budget, Deadline, Duration) */}
          <div className="border-t-2 border-gray-100 pt-4 space-y-2.5">
            <h3 className="font-bold text-errandify-brown text-sm leading-relaxed tracking-tight">When & how much</h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-semibold text-errandify-brown mb-1.5">
                  Pay (SGD) *
                </label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  placeholder="$"
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 bg-gray-50 focus:outline-none focus:bg-white transition-colors text-sm font-medium text-errandify-brown placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-errandify-brown mb-1.5">
                  Date *
                </label>
                <input
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 bg-gray-50 focus:outline-none focus:bg-white transition-colors text-sm font-medium text-errandify-brown"
                />
              </div>
              <div className="relative">
                <label className="block text-sm font-semibold text-errandify-brown mb-1.5">
                  Time *
                </label>
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
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 bg-gray-50 focus:outline-none focus:bg-white transition-colors text-sm placeholder:text-gray-400 cursor-pointer font-medium text-errandify-brown"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-sm font-semibold text-errandify-brown mb-1.5">
                  Duration
                </label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  placeholder="1"
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 bg-gray-50 focus:outline-none focus:bg-white focus:border-errandify-orange transition-colors text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-errandify-brown mb-1.5">
                  Unit
                </label>
                <select
                  name="durationUnit"
                  value={formData.durationUnit}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 bg-gray-50 focus:outline-none focus:bg-white focus:border-errandify-orange transition-colors text-sm font-medium appearance-none cursor-pointer"
                >
                  <option>Min</option>
                  <option>Hr</option>
                  <option>Day</option>
                  <option>Week</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1 cursor-pointer whitespace-nowrap">
                  <input
                    type="checkbox"
                    name="isRecurring"
                    checked={formData.isRecurring}
                    onChange={handleChange}
                    className="w-3 h-3"
                  />
                  <span className="text-xs font-semibold text-errandify-brown">Recurring</span>
                </label>
              </div>
            </div>

            {formData.isRecurring && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded space-y-3">
                {/* Input Row */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-0.5 block">
                      Every
                    </label>
                    <input
                      type="number"
                      name="repeatEvery"
                      value={formData.repeatEvery}
                      onChange={handleChange}
                      min="1"
                      className="w-full px-2 py-0.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-0.5 block">
                      Unit
                    </label>
                    <select
                      name="repeatUnit"
                      value={formData.repeatUnit}
                      onChange={handleChange}
                      className="w-full px-2 py-0.5 border border-gray-300 rounded text-sm"
                    >
                      <option value="day">Day</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-0.5 block">
                      Times
                    </label>
                    <input
                      type="number"
                      name="occurrences"
                      value={formData.occurrences}
                      onChange={handleChange}
                      min="1"
                      max="12"
                      className="w-full px-2 py-0.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>

                {/* Preview Row */}
                <div className="border-t border-blue-200 pt-2">
                  <p className="text-xs text-gray-600 mb-2">📅 <strong>Scheduled Dates:</strong></p>
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: Math.min(parseInt(formData.occurrences || '1'), 12) }).map((_, idx) => {
                      const date = new Date(formData.deadline || new Date());
                      const multiplier = {
                        'day': 1,
                        'week': 7,
                        'month': 30,
                      }[formData.repeatUnit] || 1;
                      date.setDate(date.getDate() + idx * (parseInt(formData.repeatEvery || '1') * multiplier));
                      return (
                        <span key={idx} className="text-xs bg-white border border-blue-200 px-2 py-1 rounded">
                          {date.toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Cost Row */}
                {formData.budget && (
                  <div className="border-t border-blue-200 pt-2">
                    <p className="text-sm font-semibold text-blue-700">
                      💰 Total: <span className="text-lg text-errandify-orange">${(parseFloat(formData.budget) * parseInt(formData.occurrences || '1')).toFixed(2)}</span>
                      <span className="text-xs text-gray-600 ml-2">({formData.occurrences} × ${formData.budget})</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Location - Only area shown here */}
          <div className="border-t-2 border-gray-100 pt-4 space-y-2.5">
            <h3 className="font-bold text-errandify-brown text-sm leading-relaxed tracking-tight mb-2">Where</h3>

            {/* Remote Work Checkbox */}
            <label className="flex items-center gap-2 mb-2">
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
                className="w-4 h-4 rounded cursor-pointer"
              />
              <span className="text-sm text-gray-700 cursor-pointer">Online only</span>
            </label>

            {/* Postal Code and Area - Side by side */}
            {!isRemoteWork && (
              <div className="grid grid-cols-2 gap-3 mb-2">
                {/* Postal Code */}
                <div>
                  <label className="block text-sm font-semibold text-errandify-brown mb-1.5">
                    Postal Code (SG)
                  </label>
                  <input
                    type="text"
                    placeholder="082001"
                    value={postalCode}
                    onChange={(e) => {
                      const code = e.target.value.trim();
                      setPostalCode(code);

                      // Only look up postal code if exactly 6 digits
                      if (code.length === 6 && /^\d+$/.test(code)) {
                        // Get area from comprehensive postal code database
                        const areaName = getAreaFromPostalCode(code);

                        // Set area immediately (no waiting for OneMap)
                        if (areaName) {
                          setFormData((prev) => ({
                            ...prev,
                            location: areaName,
                          }));
                          setArea(areaName);
                          console.log('[PostalCode] Area auto-set to:', areaName);
                        }

                        // Call backend to lookup address via OneMap (which has auth token)
                        const token = localStorage.getItem('token');
                        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/extract-task-info`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                          },
                          body: JSON.stringify({ input: code }), // Just send postal code
                        })
                          .then(res => res.json())
                          .then(data => {
                            console.log('[Extract] Response:', data);
                            if (data.success && data.data.fullAddress && data.data.fullAddress !== `Singapore ${code}`) {
                              console.log('[Extract] Setting full address to:', data.data.fullAddress);
                              setFullAddress(data.data.fullAddress);
                            } else {
                              console.log('[Extract] No address found or default fallback');
                            }
                          })
                          .catch(err => {
                            console.warn('Address lookup failed:', err);
                          });
                      } else if (code.length === 0) {
                        // Clear addresses only if postal code is completely cleared
                        setFormData((prev) => ({
                          ...prev,
                          location: '',
                        }));
                        setArea('');
                        setFullAddress('');
                      }
                      // Otherwise: don't update location (partial postal codes won't modify anything)
                    }}
                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 bg-gray-50 focus:outline-none focus:bg-white transition-colors text-sm font-medium text-errandify-brown placeholder:text-gray-400"
                  />
                </div>

                {/* Area */}
                <div>
                  <label className="block text-sm font-semibold text-errandify-brown mb-1.5">
                    Area <span className="text-xs font-normal text-gray-500">(Shown to All)</span>
                  </label>
                  <select
                    value={area}
                    onChange={(e) => {
                      setArea(e.target.value);
                      setFormData((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 bg-gray-50 focus:outline-none focus:bg-white transition-colors text-sm font-medium text-errandify-brown appearance-none cursor-pointer"
                  >
                    <option value="">Select Area</option>
                    {Array.from(new Set(Object.values(postalCodeAreas).map(x => x.area))).sort().map((areaName) => (
                      <option key={areaName} value={areaName}>{areaName}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Full Address - Only shown when NOT remote */}
            {!isRemoteWork && (
              <div>
                  <label className="block text-sm font-semibold text-errandify-brown mb-1.5">
                    Full address (add unit if needed) <span className="text-xs font-normal text-gray-500">(Shown to Confirmed Doer)</span>
                  </label>
                  <textarea
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                    placeholder="e.g., Block 1, Unit #5-10"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 bg-gray-50 focus:outline-none focus:bg-white transition-colors resize-none text-sm font-medium text-errandify-brown placeholder:text-gray-400"
                  />

                  {/* GPS Location Notice */}
                  {gpsEnabled && gpsLocation && (
                    <div className="mt-2 p-2 bg-orange-50 border-l-4 border-errandify-orange-400 rounded text-xs">
                      <p className="text-errandify-orange-900">
                        📍 <span className="font-semibold">Your current location detected:</span> {gpsLocation.latitude.toFixed(4)}, {gpsLocation.longitude.toFixed(4)}
                      </p>
                      {formData.location && (
                        <p className="text-errandify-orange-800 mt-1">
                          ℹ️ Task location: <span className="font-semibold">{formData.location}</span> — Make sure this is different from your current location if the doer needs to travel.
                        </p>
                      )}
                    </div>
                  )}
              </div>
            )}

          </div>

          {/* Section 4: Skills Required */}
          <div className="border-t pt-1 space-y-1">
            <h3 className="font-bold text-errandify-brown text-sm">Skills Required (Optional)</h3>

            {/* AI Suggestions */}
            {aiSuggestions.skills.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 font-semibold mb-0.5">🤖 AI Suggested Skills — Please select:</p>
                <div className="flex flex-wrap gap-2 mb-0.5">
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
                className="flex-1 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-errandify-orange"
              />
              <button
                onClick={addSkill}
                className="px-3 py-1 bg-errandify-orange text-white rounded-lg hover:bg-orange-600 font-semibold text-sm transition-colors"
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
                    className="bg-orange-100 text-errandify-orange-700 text-sm px-3 py-1 rounded-full font-semibold hover:bg-orange-200"
                  >
                    {skill} ✕
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Certifications Required - Only show if category needs them or AI has suggestions */}
          {(aiSuggestions.certifications.required.length > 0 || aiSuggestions.certifications.optional.length > 0) && (
          <div className="border-t pt-1 space-y-1">
            <h3 className="font-bold text-errandify-brown text-sm">
              Certifications Required {formData.certifications.required.length > 0 ? '✓' : ''}
            </h3>


            {/* Required Certifications from AI */}
            {aiSuggestions.certifications.required.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 font-semibold mb-0.5">
                  🤖 Required Certifications — Please select:
                </p>
                <div className="flex flex-wrap gap-2 mb-0.5">
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
                <p className="text-xs text-gray-600 font-semibold mb-0.5">
                  🤖 Optional Certifications — Please select:
                </p>
                <div className="flex flex-wrap gap-2 mb-0.5">
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
                  <p className="text-xs text-gray-600 font-semibold mb-0.5">
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
              <div className="p-2 bg-orange-50 rounded text-sm mt-3 space-y-3">
                <p className="font-semibold text-errandify-orange-900">Selected Certifications:</p>

                {formData.certifications.required.length > 0 && (
                  <div>
                    <p className="text-xs text-errandify-orange-800 font-semibold mb-0.5">Required:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.certifications.required.map((cert) => (
                        <div
                          key={cert}
                          className="bg-orange-200 text-errandify-orange-800 text-xs px-2 py-0.5 rounded flex items-center gap-2"
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
                    <p className="text-xs text-errandify-orange-700 font-semibold mb-0.5">Optional:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.certifications.optional.map((cert) => (
                        <div
                          key={cert}
                          className="bg-orange-100 text-errandify-orange-700 text-xs px-2 py-0.5 rounded flex items-center gap-2"
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
        <div className="border-t-2 border-gray-100 pt-4 space-y-2.5">
          <h3 className="font-bold text-errandify-brown text-sm leading-relaxed tracking-tight">Anything else</h3>

          <div>
            <label className="block text-sm font-semibold text-errandify-brown mb-1.5">
              Notes to Confirmed Doer <span className="text-xs font-normal text-gray-500">(Shown to Confirmed Doer)</span>
            </label>
            <div className="relative">
              <textarea
                name="specialNote"
                value={formData.specialNote}
                onChange={handleChange}
                placeholder="access tips, requests, special needs..."
                rows={2}
                maxLength={300}
                className={`w-full px-3 py-2 rounded-lg border-2 bg-gray-50 focus:outline-none focus:bg-white transition-colors resize-none text-sm font-medium ${
                  formData.specialNote ? 'border-errandify-orange text-errandify-brown' : 'border-gray-200 text-gray-900 placeholder:text-gray-400'
                }`}
              />
              <span className="absolute bottom-2 right-3 text-xs text-gray-400">{formData.specialNote.length}/300</span>
            </div>
          </div>
        </div>

        {/* Quick Summary & Post Button */}
        <div className="mt-4 space-y-2.5">
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-errandify-orange p-3 rounded-lg">
            <p className="font-semibold text-errandify-brown text-sm">Ready to post?</p>
            <p className="text-gray-700 text-sm leading-relaxed">
              <strong>{formData.title}</strong> • {categoryNames[formData.category] || '?'} • SGD ${formData.budget || '?'}
            </p>
          </div>

          {/* Missing Fields Checklist */}
          {(() => {
            const missingFields = [];
            if (!formData.title || formData.title.trim().length < 5) missingFields.push({ icon: '📝', label: 'Add a clear title', field: 'title' });
            if (!formData.description || formData.description.trim().length === 0) missingFields.push({ icon: '📋', label: 'Describe what you need', field: 'description' });
            if (!formData.category) missingFields.push({ icon: '🏷️', label: 'Pick a category', field: 'category' });
            if (!formData.deadline || !formData.time) missingFields.push({ icon: '📅', label: 'Set a date and time', field: 'deadline' });
            if (!formData.budget || parseFloat(formData.budget) <= 0) missingFields.push({ icon: '💰', label: 'Enter your budget', field: 'budget' });
            const isRemoteWork = formData.location === 'remote';
            if (!isRemoteWork && (!formData.location || formData.location.trim().length === 0)) missingFields.push({ icon: '📍', label: 'Add a location', field: 'location' });

            return missingFields.length > 0 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <p className="text-sm font-semibold text-blue-900">✨ Just a couple things:</p>
                <div className="space-y-1">
                  {missingFields.map((item) => (
                    <div key={item.field} className="flex items-center gap-2 text-sm text-blue-800">
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          <button
            onClick={() => {
              console.log('[DEBUG] *** POST BUTTON IN FORM CLICKED ***');
              console.log('[DEBUG] formData.title:', formData.title);
              console.log('[DEBUG] formData.category:', formData.category);
              console.log('[DEBUG] loading:', loading);
              console.log('[DEBUG] *** SETTING showConfirm to true ***');
              setShowConfirm(true);
              console.log('[DEBUG] *** setShowConfirm CALLED ***');
            }}
            disabled={(() => {
              // Check all required fields
              if (!formData.title || formData.title.trim().length < 5) return true;
              if (!formData.description || formData.description.trim().length === 0) return true;
              if (!formData.category) return true;
              if (!formData.deadline) return true;
              if (!formData.time) return true;
              if (!formData.budget || parseFloat(formData.budget) <= 0) return true;
              const isRemoteWork = formData.location === 'remote';
              if (!isRemoteWork && (!formData.location || formData.location.trim().length === 0)) return true;
              if (loading) return true;
              return false;
            })()}
            className="w-full bg-errandify-orange text-white py-2.5 rounded-xl font-bold hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base shadow-sm"
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 pointer-events-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full flex flex-col max-h-[90vh] pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 pb-3 border-b-2 border-orange-100">
              <h2 className="text-2xl font-bold text-errandify-brown">Ready to post?</h2>
              <p className="text-sm text-gray-600 mt-1">Here's what doers will see</p>
            </div>

            <div className="p-5 pt-4 flex-1 overflow-y-auto space-y-2.5 text-sm text-gray-700">
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
              {fullAddress && (
                <p>
                  <span className="font-semibold">Full Address:</span> {fullAddress}
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

            <div className="border-t-2 border-orange-100 px-5 py-4 flex gap-2.5 pointer-events-auto bg-gradient-to-r from-orange-50 to-white">
              <button
                onClick={() => {
                  console.log('[DEBUG] Edit button clicked');
                  setShowConfirm(false);
                }}
                className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer pointer-events-auto"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  console.log('[DEBUG] *** POST BUTTON CLICKED - DIRECT HANDLER ***');
                  console.log('[DEBUG] Current loading state:', loading);
                  console.log('[DEBUG] showConfirm:', showConfirm);
                  console.log('[DEBUG] handleSubmit function:', typeof handleSubmit);
                  if (loading) {
                    console.log('[DEBUG] *** ALREADY LOADING - IGNORING CLICK ***');
                    return;
                  }
                  console.log('[DEBUG] *** CALLING handleSubmit ***');
                  handleSubmit();
                  console.log('[DEBUG] *** handleSubmit RETURNED ***');
                }}
                disabled={loading}
                className="flex-1 px-3 py-2 bg-errandify-orange text-white rounded-lg font-bold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer pointer-events-auto transition-all shadow-sm"
              >
                {loading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Area Confirmation Modal */}
      {needsAreaConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h2 className="text-2xl font-bold text-errandify-brown mb-2">Confirm Location</h2>
            <p className="text-gray-600 mb-4">
              We couldn't auto-detect the area for postal code <strong>{pendingPostalCode}</strong>. Please select the correct area:
            </p>

            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-errandify-orange mb-4"
            >
              <option value="">-- Select Area --</option>
              {singaporeAreas.map((areaName) => (
                <option key={areaName} value={areaName}>
                  {areaName}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setNeedsAreaConfirmation(false);
                  setSelectedArea('');
                }}
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedArea) {
                    setArea(selectedArea);
                    setFormData((prev) => ({
                      ...prev,
                      location: selectedArea,
                    }));
                    setNeedsAreaConfirmation(false);
                    setSelectedArea('');
                    console.log('[CreateErrand] Area confirmed by user:', selectedArea);
                  }
                }}
                disabled={!selectedArea}
                className="flex-1 px-4 py-2 bg-errandify-orange text-white rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal with Errand ID */}
      {showSuccess && successErrandId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-errandify-brown mb-2">
              Errand Posted!
            </h2>
            <p className="text-gray-600 mb-4">
              Your errand is now live and doers can see it.
            </p>

            {/* Errand ID Display */}
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-600 mb-1">Your Errand ID:</p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-lg font-mono font-bold text-errandify-brown flex-1">
                  {successErrandId}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(successErrandId);
                  }}
                  className="px-3 py-1.5 bg-errandify-orange text-white text-xs font-semibold rounded hover:bg-opacity-90 transition"
                >
                  Copy
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Save this ID to reference your errand in chat and communications.
            </p>

            <button
              onClick={() => {
                setShowSuccess(false);
                navigate('/home');
              }}
              className="w-full bg-errandify-orange text-white py-2 rounded-lg font-semibold hover:bg-opacity-90 transition"
            >
              Go to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
