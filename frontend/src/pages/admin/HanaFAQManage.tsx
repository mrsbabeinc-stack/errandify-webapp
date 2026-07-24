import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { COMPREHENSIVE_FAQ, FAQ_TOPICS } from '../../data/HanaFAQDatabase';
import { useErrandifyToast } from '../../utils/errandifyToast';

type Language = 'en' | 'zh';

interface NewFAQ {
  category: string;
  question: { en: string; zh: string };
  answer: { en: string; zh: string };
  tags: string[];
}

export const HanaFAQManage: React.FC = () => {
  const { success, error, info } = useErrandifyToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [formData, setFormData] = useState<NewFAQ>({
    category: Object.keys(FAQ_TOPICS)[0],
    question: { en: '', zh: '' },
    answer: { en: '', zh: '' },
    tags: [],
  });

  const categoryFAQs = selectedCategory
    ? COMPREHENSIVE_FAQ.filter(faq => faq.category === selectedCategory)
    : COMPREHENSIVE_FAQ;

  const handleAddFAQ = () => {
    if (!formData.question.en || !formData.answer.en) {
      error('Validation Error', 'Please fill in English question and answer');
      return;
    }
    success('FAQ Created', 'New FAQ added successfully (pending backend integration)');
    setShowForm(false);
    setFormData({
      category: Object.keys(FAQ_TOPICS)[0],
      question: { en: '', zh: '' },
      answer: { en: '', zh: '' },
      tags: [],
    });
  };

  const handleEditFAQ = (faqId: string) => {
    const faq = COMPREHENSIVE_FAQ.find(f => f.id === faqId);
    if (faq) {
      setEditingId(faqId);
      setFormData({
        category: faq.category,
        question: faq.question,
        answer: faq.answer,
        tags: faq.tags,
      });
      setShowForm(true);
    }
  };

  const handleDeleteFAQ = (faqId: string) => {
    success('FAQ Deleted', 'FAQ item removed successfully (pending backend integration)');
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">✏️ Manage FAQs</h1>
            <p className="text-gray-600">Create, edit, and delete FAQ items</p>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                category: Object.keys(FAQ_TOPICS)[0],
                question: { en: '', zh: '' },
                answer: { en: '', zh: '' },
                tags: [],
              });
              setShowForm(!showForm);
            }}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold"
          >
            {showForm ? '✕ Cancel' : '+ Add New FAQ'}
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingId ? 'Edit FAQ' : 'Add New FAQ'}
            </h2>

            <div className="grid grid-cols-1 gap-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                >
                  {Object.entries(FAQ_TOPICS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* English Question & Answer */}
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-orange-900 mb-3">🇬🇧 English</h3>
                <input
                  type="text"
                  placeholder="Question (English)"
                  value={formData.question.en}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      question: { ...formData.question, en: e.target.value },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2 focus:outline-none focus:border-orange-500"
                />
                <textarea
                  placeholder="Answer (English)"
                  value={formData.answer.en}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      answer: { ...formData.answer, en: e.target.value },
                    })
                  }
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Chinese Question & Answer */}
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-semibold text-red-900 mb-3">🇨🇳 中文</h3>
                <input
                  type="text"
                  placeholder="问题 (中文)"
                  value={formData.question.zh}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      question: { ...formData.question, zh: e.target.value },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2 focus:outline-none focus:border-orange-500"
                />
                <textarea
                  placeholder="答案 (中文)"
                  value={formData.answer.zh}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      answer: { ...formData.answer, zh: e.target.value },
                    })
                  }
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Cantonese Question & Answer */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-3">🇭🇰 粵語</h3>
                <input
                  type="text"
                  placeholder="問題 (粵語)"
                  value={formData.question.yue}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      question: { ...formData.question, yue: e.target.value },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2 focus:outline-none focus:border-orange-500"
                />
                <textarea
                  placeholder="答案 (粵語)"
                  value={formData.answer.yue}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      answer: { ...formData.answer, yue: e.target.value },
                    })
                  }
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g., posting, beginner, tips"
                  value={formData.tags.join(', ')}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tags: e.target.value.split(',').map(t => t.trim()).filter(t => t),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleAddFAQ}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold"
                >
                  {editingId ? 'Save Changes' : 'Add FAQ'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Category</label>
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
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

        {/* FAQ List */}
        <div className="space-y-4">
          {categoryFAQs.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-gray-600">No FAQs in this category</p>
            </div>
          ) : (
            categoryFAQs.map((faq) => (
              <div key={faq.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full mb-2">
                      {FAQ_TOPICS[faq.category as keyof typeof FAQ_TOPICS]}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900">{faq.question.en}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditFAQ(faq.id)}
                      className="px-3 py-1 bg-orange-100 text-orange-600 hover:bg-orange-200 rounded text-sm font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteFAQ(faq.id)}
                      className="px-3 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded text-sm font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-3">{faq.answer.en.substring(0, 150)}...</p>

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
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default HanaFAQManage;
