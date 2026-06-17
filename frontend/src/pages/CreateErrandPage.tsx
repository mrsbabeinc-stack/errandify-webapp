import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Certification {
  required: string[];
  optional: string[];
}

export default function CreateErrandPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    category: categoryId || '',
    title: '',
    description: '',
    budget: '',
    deadline: '',
    certifications: { required: [] as string[], optional: [] as string[] },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    location: false,
    certifications: false,
  });

  const [aiSuggestions, setAiSuggestions] = useState({
    suggestedCategory: '',
    suggestedDescription: '',
    correctedTitle: '',
    hasCorrections: false,
    certifications: { required: [] as string[], optional: [] as string[] },
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
    if (!title.trim() || title.length < 5) return;

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
          blocked: false,
          error: '',
        });

        if (!formData.category && response.data.data.category) {
          setFormData((prev) => ({
            ...prev,
            category: response.data.data.category,
          }));
        }

        if (!formData.description && response.data.data.description) {
          setFormData((prev) => ({
            ...prev,
            description: response.data.data.description,
          }));
        }
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

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, title: value }));

    if (value.length > 5) {
      getAiSuggestions(value);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  const applySuggestedCertifications = () => {
    setFormData((prev) => ({
      ...prev,
      certifications: aiSuggestions.certifications,
    }));
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
                aiSuggestions.suggestedDescription || 'Describe your errand...'
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
            <div className="px-3 py-2 border-b-2 border-gray-300 text-base text-gray-700">
              {formData.category ? categoryNames[formData.category] : 'Auto-detected'}
            </div>
          </div>

          {/* Budget & Date - Side by side */}
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

          {/* Certifications Section - Collapsible */}
          <div className="border-t pt-4">
            <button
              onClick={() =>
                setExpandedSections((prev) => ({
                  ...prev,
                  certifications: !prev.certifications,
                }))
              }
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="font-semibold text-errandify-brown">
                Certifications {formData.certifications.required.length > 0 ? '✓' : ''}
              </h3>
              <span className="text-gray-400">
                {expandedSections.certifications ? '▼' : '▶'}
              </span>
            </button>

            {expandedSections.certifications && (
              <div className="mt-3 space-y-3">
                {/* AI Suggestion Button */}
                {aiSuggestions.certifications.required.length > 0 ||
                aiSuggestions.certifications.optional.length > 0 ? (
                  <button
                    onClick={applySuggestedCertifications}
                    className="text-xs text-errandify-orange hover:text-orange-600 font-semibold mb-2"
                  >
                    ✨ Apply AI suggestions
                  </button>
                ) : null}

                {/* Required Certifications */}
                {aiSuggestions.certifications.required.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-600 font-semibold mb-2">
                      AI Suggested (Required):
                    </p>
                    <div className="flex flex-wrap gap-2">
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

                {/* Optional Certifications */}
                {aiSuggestions.certifications.optional.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-600 font-semibold mb-2">
                      AI Suggested (Optional):
                    </p>
                    <div className="flex flex-wrap gap-2">
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
                  <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                    <p className="font-semibold text-blue-900 mb-1">Selected:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.certifications.required.map((cert) => (
                        <button
                          key={cert}
                          onClick={() => toggleCertification(cert, 'required')}
                          className="bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-300"
                        >
                          {cert} ✕
                        </button>
                      ))}
                      {formData.certifications.optional.map((cert) => (
                        <button
                          key={cert}
                          onClick={() => toggleCertification(cert, 'optional')}
                          className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded hover:bg-blue-200"
                        >
                          {cert} ✕
                        </button>
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
            <p className="text-gray-700">
              {formData.title} • {categoryNames[formData.category] || 'No category'} •{' '}
              {formData.budget ? `SGD $${formData.budget}` : 'No budget set'}
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
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4">
            <h2 className="text-xl font-bold text-errandify-brown">Confirm & Post?</h2>

            <div className="space-y-2 text-sm text-gray-700">
              <p>
                <span className="font-semibold">Title:</span> {formData.title}
              </p>
              <p>
                <span className="font-semibold">Category:</span>{' '}
                {categoryNames[formData.category]}
              </p>
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
