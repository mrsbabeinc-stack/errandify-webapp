import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { COMPREHENSIVE_FAQ, FAQ_TOPICS } from '../../data/HanaFAQDatabase';

type Language = 'en' | 'zh' | 'yue';

export const HanaFAQBrowser: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [searchQuery, setSearchQuery] = useState('');

  // Get FAQs for selected category
  const categoryFAQs = selectedCategory
    ? COMPREHENSIVE_FAQ.filter(faq => faq.category === selectedCategory)
    : COMPREHENSIVE_FAQ;

  // Filter by search
  const filteredFAQs = categoryFAQs.filter(faq => {
    const question = (faq.question[language] || faq.question.en).toLowerCase();
    const answer = (faq.answer[language] || faq.answer.en).toLowerCase();
    return question.includes(searchQuery.toLowerCase()) || answer.includes(searchQuery.toLowerCase());
  });

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📚 Hana FAQ Browser</h1>
          <p className="text-gray-600">Browse and view all Hana FAQ content</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-3 gap-4">
            {/* Language Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              >
                <option value="en">🇬🇧 English</option>
                <option value="zh">🇨🇳 中文</option>
                <option value="yue">🇭🇰 粵語</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              >
                <option value="">All Categories ({COMPREHENSIVE_FAQ.length} FAQs)</option>
                {Object.entries(FAQ_TOPICS).map(([key, label]) => {
                  const count = COMPREHENSIVE_FAQ.filter(faq => faq.category === key).length;
                  return (
                    <option key={key} value={key}>
                      {label} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search FAQs..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredFAQs.length} of {categoryFAQs.length} FAQs
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {filteredFAQs.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-4xl mb-2">🔍</div>
              <p className="text-gray-600">No FAQs found matching your criteria</p>
            </div>
          ) : (
            filteredFAQs.map((faq) => (
              <div key={faq.id} className="bg-white rounded-lg shadow p-6">
                {/* Category Badge */}
                <div className="mb-2">
                  <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                    {FAQ_TOPICS[faq.category as keyof typeof FAQ_TOPICS] || faq.category}
                  </span>
                </div>

                {/* Question */}
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {faq.question[language] || faq.question.en}
                </h3>

                {/* Answer */}
                <p className="text-gray-700 whitespace-pre-wrap mb-4">
                  {faq.answer[language] || faq.answer.en}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {faq.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Metadata */}
                {faq.relatedErrandStatus && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      <strong>Related Errand Status:</strong> {faq.relatedErrandStatus.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default HanaFAQBrowser;
