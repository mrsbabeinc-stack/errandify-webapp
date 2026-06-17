import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function CreateErrandPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    category: categoryId || '',
    title: '',
    description: '',
    location: '',
    specialNote: '',
    budget: '',
    deadline: '',
    duration: '',
    durationUnit: 'Hr' as 'Min' | 'Hr' | 'Day' | 'Week',
    isRecurring: false,
    repeatEvery: '1',
    repeatUnit: 'week' as 'day' | 'week' | 'month',
    occurrences: '1',
    skills: [] as string[],
    certifications: { required: [] as string[], optional: [] as string[] },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const [aiSuggestions, setAiSuggestions] = useState({
    suggestedCategory: '',
    suggestedDescription: '',
    correctedTitle: '',
    hasCorrections: false,
    certifications: { required: [] as string[], optional: [] as string[] },
    skills: [] as string[],
    blocked: false,
    error: '',
  });

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

  const getAiSuggestions = async (title: string) => {
    if (!title.trim() || title.length < 4) return;

    setAiLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/suggestions`,
        { title }
      );

      if (response.data.success) {
        setAiSuggestions({
          suggestedCategory: response.data.data.category,
          suggestedDescription: response.data.data.description,
          correctedTitle: response.data.data.correctedTitle || '',
          hasCorrections: response.data.data.hasCorrections,
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

  const debouncedGetAiSuggestions = (value: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      getAiSuggestions(value);
    }, 300); // Wait 300ms after user stops typing
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, title: value }));

    // Trigger AI suggestions with debounce (wait 300ms after user stops typing)
    if (value.length > 3) {
      debouncedGetAiSuggestions(value);
    }
  };

  // Auto-apply AI suggestions to form when they arrive
  useEffect(() => {
    if (aiSuggestions.suggestedCategory) {
      setFormData((prev) => ({
        ...prev,
        category: aiSuggestions.suggestedCategory,
      }));
    }
    if (aiSuggestions.suggestedDescription) {
      setFormData((prev) => ({
        ...prev,
        description: aiSuggestions.suggestedDescription,
      }));
    }
    // Auto-apply suggested skills
    if (aiSuggestions.skills.length > 0) {
      setFormData((prev) => ({
        ...prev,
        skills: [...new Set([...prev.skills, ...aiSuggestions.skills])], // Avoid duplicates
      }));
    }
    // Auto-apply suggested certifications
    if (aiSuggestions.certifications.required.length > 0 || aiSuggestions.certifications.optional.length > 0) {
      setFormData((prev) => ({
        ...prev,
        certifications: aiSuggestions.certifications,
      }));
    }
  }, [aiSuggestions.suggestedCategory, aiSuggestions.suggestedDescription, aiSuggestions.skills, aiSuggestions.certifications]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

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
    if (!formData.title || !formData.category) {
      setError('Title and category are required');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
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

      if (response.data.success) {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create errand');
    } finally {
      setLoading(false);
      setShowConfirm(false);
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
                onChange={handleTitleChange}
                placeholder="What do you need help with?"
                className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-base"
              />
              {aiSuggestions.hasCorrections && (
                <p className="text-xs text-blue-600 mt-1">
                  💡 Suggested: {aiSuggestions.correctedTitle}
                </p>
              )}
            </div>

            {/* Description - Auto-filled from AI */}
            <div>
              <label className="block text-sm font-semibold text-errandify-brown mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder={
                  aiSuggestions.suggestedDescription || 'Describe your errand in detail...'
                }
                rows={2}
                className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-base resize-none"
              />
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
                  Budget (SGD)
                </label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  placeholder="100"
                  className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-errandify-brown mb-2">
                  Needed By
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-errandify-brown mb-2">
                  Duration
                </label>
                <div className="flex gap-2">
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
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isRecurring"
                  checked={formData.isRecurring}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                <span className="text-sm font-semibold text-errandify-brown">Recurring errand?</span>
              </label>
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

          {/* Section 3: Location - Special note moved to confirmation only */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-bold text-errandify-brown text-sm">Work Location</h3>

            <div className="space-y-2">
              <div>
                <label className="block text-sm font-semibold text-errandify-brown mb-2">
                  Postal Code (Singapore)
                </label>
                <input
                  type="text"
                  placeholder="e.g., 138667"
                  onChange={(e) => {
                    const postalCode = e.target.value.trim();
                    if (postalCode.length === 6 && /^\d+$/.test(postalCode)) {
                      // For now, just accept the postal code
                      // In a real app, you'd call a Singapore postal code API
                      setFormData((prev) => ({
                        ...prev,
                        location: `Singapore ${postalCode}`,
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-errandify-brown mb-2">
                  Full Address
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Street address or area (auto-filled from postal code)"
                  className="w-full px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-base"
                />
              </div>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.location.toLowerCase() === 'remote' || !formData.location}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData((prev) => ({ ...prev, location: 'Remote' }));
                  }
                }}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">This is remote work (no specific location)</span>
            </label>

            <p className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
              💡 Access instructions (unit number, building name) can be added in the confirmation step - only the confirmed doer will see these.
            </p>
          </div>

          {/* Section 4: Skills Required */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-bold text-errandify-brown text-sm">Skills Required (Optional)</h3>

            {/* AI Suggestions */}
            {aiSuggestions.skills.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 font-semibold mb-2">🤖 AI Suggested Skills (auto-added):</p>
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

            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                placeholder="Add a skill (press Enter)"
                className="flex-1 px-3 py-2 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-errandify-orange text-sm"
              />
              <button
                onClick={addSkill}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded font-semibold hover:bg-gray-200 text-sm"
              >
                Add
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

          {/* Section 5: Certifications Required */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-bold text-errandify-brown text-sm">
              Certifications Required {formData.certifications.required.length > 0 ? '✓' : ''}
            </h3>


            {/* Required Certifications from AI */}
            {aiSuggestions.certifications.required.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 font-semibold mb-2">
                  🤖 Required Certifications (auto-added):
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
                  🤖 Optional Certifications (auto-added):
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-errandify-brown">Confirm & Post</h2>

            <div className="space-y-3 text-sm text-gray-700">
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

            {/* Special Note - Only editable in confirmation */}
            <div className="border-t pt-4">
              <label className="block text-sm font-semibold text-errandify-brown mb-2">
                Special Note <span className="text-xs text-red-600">(shown only to confirmed doer)</span>
              </label>
              <textarea
                name="specialNote"
                value={formData.specialNote}
                onChange={handleChange}
                placeholder="Unit number, building name, access instructions, etc."
                rows={2}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:border-errandify-orange text-sm"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-errandify-orange text-white rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50"
              >
                {loading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
