import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface SafetyResource {
  id: number;
  title: string;
  category: string;
  phone?: string;
  email?: string;
  url?: string;
  hours: string;
  description: string;
  region: string;
  languages: string[];
}

interface CategoryGroup {
  [key: string]: SafetyResource[];
}

const CATEGORY_INFO: { [key: string]: { emoji: string; title: string; color: string } } = {
  trafficking: { emoji: '🚨', title: 'Anti-Trafficking', color: 'bg-red-50 border-red-200' },
  domestic_abuse: { emoji: '💙', title: 'Domestic Abuse Support', color: 'bg-blue-50 border-blue-200' },
  migrant: { emoji: '💼', title: 'Migrant Worker Support', color: 'bg-amber-50 border-amber-200' },
  elderly: { emoji: '👵', title: 'Elderly Protection', color: 'bg-purple-50 border-purple-200' },
  abuse: { emoji: '🤝', title: 'Abuse & Harassment', color: 'bg-pink-50 border-pink-200' },
  mental_health: { emoji: '🧠', title: 'Mental Health Crisis', color: 'bg-green-50 border-green-200' },
};

export default function SafetyResourcesPage() {
  const [resources, setResources] = useState<SafetyResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLanguages, setExpandedLanguages] = useState<number | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const response = await axios.get('/api/safety/resources');
      setResources(response.data.data.resources);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching safety resources:', error);
      setLoading(false);
    }
  };

  const groupedResources: CategoryGroup = resources.reduce((acc, resource) => {
    const category = resource.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(resource);
    return acc;
  }, {} as CategoryGroup);

  const handleCopyPhone = (phone: string, resourceId: number) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(resourceId);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const handleEmail = (email: string, title: string) => {
    window.location.href = `mailto:${email}?subject=Need Immediate Support from ${title}`;
  };

  const filteredResources = selectedCategory
    ? groupedResources[selectedCategory] || []
    : Object.values(groupedResources).flat();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading safety resources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 via-pink-500 to-red-600 text-white py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🆘</span>
            <h1 className="text-3xl font-bold">Safety & Support Resources</h1>
          </div>
          <p className="text-red-100 text-lg">Get help anytime. All services are 24/7, confidential, and free.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Emergency Banner */}
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg mb-8">
          <div className="flex gap-4">
            <span className="text-3xl flex-shrink-0">🚨</span>
            <div>
              <h2 className="text-lg font-bold text-red-900 mb-2">In Immediate Danger?</h2>
              <p className="text-red-800 mb-4">
                Contact emergency services or call the Anti-Trafficking Hotline now. They're available 24/7.
              </p>
              <div className="bg-white p-4 rounded border border-red-200">
                <p className="text-sm text-gray-600 mb-2">Singapore Anti-Trafficking Hotline</p>
                <div className="flex items-center gap-3">
                  <a
                    href="tel:+6518008388877"
                    className="text-2xl font-bold text-red-600 hover:text-red-700"
                  >
                    +65 1800-838-8877
                  </a>
                  <button
                    onClick={() => handleCopyPhone('+6518008388877', -1)}
                    className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded transition"
                  >
                    {copiedPhone === -1 ? '✅ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2">Text option available | Interpreters available</p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Filter by Category</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full font-medium transition ${
                selectedCategory === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              All Resources
            </button>
            {Object.entries(CATEGORY_INFO).map(([key, info]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-4 py-2 rounded-full font-medium transition flex items-center gap-2 ${
                  selectedCategory === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                <span>{info.emoji}</span>
                {info.title}
              </button>
            ))}
          </div>
        </div>

        {/* Resources Grid */}
        <div className="space-y-6">
          {selectedCategory === null ? (
            // Group by category
            Object.entries(groupedResources).map(([category, categoryResources]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{CATEGORY_INFO[category]?.emoji}</span>
                  <h2 className="text-2xl font-bold text-gray-900">{CATEGORY_INFO[category]?.title}</h2>
                </div>
                <div className="space-y-4">
                  {categoryResources.map((resource) => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      onCopyPhone={handleCopyPhone}
                      onEmail={handleEmail}
                      copiedPhone={copiedPhone}
                      expandedLanguages={expandedLanguages}
                      setExpandedLanguages={setExpandedLanguages}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Single category
            <div className="space-y-4">
              {filteredResources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onCopyPhone={handleCopyPhone}
                  onEmail={handleEmail}
                  copiedPhone={copiedPhone}
                  expandedLanguages={expandedLanguages}
                  setExpandedLanguages={setExpandedLanguages}
                />
              ))}
            </div>
          )}
        </div>

        {/* Safety Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-12">
          <h3 className="text-lg font-bold text-blue-900 mb-4">💡 Tips for Safe Calling</h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex gap-3">
              <span className="text-xl">✓</span>
              <span>Use a phone the other person doesn't know about if possible</span>
            </li>
            <li className="flex gap-3">
              <span className="text-xl">✓</span>
              <span>Call from a public place where you feel safe</span>
            </li>
            <li className="flex gap-3">
              <span className="text-xl">✓</span>
              <span>They can arrange safe transportation and immediate shelter</span>
            </li>
            <li className="flex gap-3">
              <span className="text-xl">✓</span>
              <span>All calls are confidential and anonymous</span>
            </li>
            <li className="flex gap-3">
              <span className="text-xl">✓</span>
              <span>If you don't speak English, ask for an interpreter</span>
            </li>
          </ul>
        </div>

        {/* Report Section */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-bold text-amber-900 mb-3">Need to Report Abuse?</h3>
          <p className="text-amber-800 mb-4">
            You can report unsafe situations anonymously. Your safety is our priority.
          </p>
          <button
            onClick={() => window.location.href = '/report-abuse'}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-lg transition"
          >
            Report Unsafe Situation Anonymously
          </button>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center text-gray-600 text-sm border-t pt-8">
          <p className="mb-2">
            <strong>Your Privacy is Protected:</strong> All calls and reports are completely confidential.
          </p>
          <p>If you're in immediate danger, call emergency services (911 or 995 in Singapore)</p>
        </div>
      </div>
    </div>
  );
}

interface ResourceCardProps {
  resource: SafetyResource;
  onCopyPhone: (phone: string, id: number) => void;
  onEmail: (email: string, title: string) => void;
  copiedPhone: number | null;
  expandedLanguages: number | null;
  setExpandedLanguages: (id: number | null) => void;
}

function ResourceCard({
  resource,
  onCopyPhone,
  onEmail,
  copiedPhone,
  expandedLanguages,
  setExpandedLanguages,
}: ResourceCardProps) {
  return (
    <div className="bg-white border-l-4 border-blue-400 rounded-lg p-6 hover:shadow-md transition">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{resource.title}</h3>
          <p className="text-sm text-gray-600">{resource.description}</p>
        </div>
        <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium whitespace-nowrap ml-2">
          {resource.hours}
        </span>
      </div>

      {/* Contact Info */}
      <div className="space-y-3 mb-4">
        {resource.phone && (
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
            <div>
              <p className="text-xs text-gray-600 mb-1">Phone</p>
              <p className="text-lg font-bold text-gray-900">{resource.phone}</p>
            </div>
            <button
              onClick={() => onCopyPhone(resource.phone!, resource.id)}
              className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition font-medium"
            >
              {copiedPhone === resource.id ? '✅ Copied' : 'Copy & Call'}
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {resource.email && (
            <button
              onClick={() => onEmail(resource.email!, resource.title)}
              className="flex-1 text-sm bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded transition font-medium"
            >
              📧 Email
            </button>
          )}
          {resource.url && (
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-sm bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded transition font-medium text-center"
            >
              🌐 Visit Site
            </a>
          )}
        </div>
      </div>

      {/* Languages */}
      {resource.languages && resource.languages.length > 0 && (
        <div className="border-t pt-3">
          <button
            onClick={() => setExpandedLanguages(expandedLanguages === resource.id ? null : resource.id)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
          >
            🌍 Available in {resource.languages.length} {resource.languages.length === 1 ? 'language' : 'languages'}
            <span className={`transition transform ${expandedLanguages === resource.id ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          {expandedLanguages === resource.id && (
            <div className="mt-2 flex flex-wrap gap-2">
              {resource.languages.map((lang) => (
                <span key={lang} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {lang}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
