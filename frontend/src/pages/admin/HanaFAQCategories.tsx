import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { COMPREHENSIVE_FAQ, FAQ_TOPICS } from '../../data/HanaFAQDatabase';

export const HanaFAQCategories: React.FC = () => {
  // Calculate stats per category
  const categoryStats = Object.entries(FAQ_TOPICS).map(([key, label]) => {
    const faqs = COMPREHENSIVE_FAQ.filter(faq => faq.category === key);
    return {
      id: key,
      label,
      count: faqs.length,
      faqs,
    };
  });

  const totalFAQs = COMPREHENSIVE_FAQ.length;

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📂 FAQ Categories</h1>
          <p className="text-gray-600">Manage FAQ categories and organization</p>
        </div>

        {/* Stats Card */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-3xl font-bold">{totalFAQs}</div>
              <div className="text-sm opacity-90">Total FAQs</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{categoryStats.length}</div>
              <div className="text-sm opacity-90">Categories</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{(totalFAQs / categoryStats.length).toFixed(1)}</div>
              <div className="text-sm opacity-90">Avg FAQs/Category</div>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryStats.map((category) => (
            <div key={category.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              {/* Category Header */}
              <h3 className="text-xl font-bold text-gray-900 mb-2">{category.label}</h3>

              {/* FAQ Count */}
              <div className="mb-4">
                <span className="text-3xl font-bold text-orange-500">{category.count}</span>
                <span className="text-gray-600 ml-2">FAQ items</span>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full transition-all"
                    style={{ width: `${(category.count / totalFAQs) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {((category.count / totalFAQs) * 100).toFixed(1)}% of total
                </p>
              </div>

              {/* FAQ List Preview */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">Items in this category:</p>
                <ul className="space-y-1">
                  {category.faqs.slice(0, 3).map((faq) => (
                    <li key={faq.id} className="text-xs text-gray-600 truncate">
                      • {faq.question.en}
                    </li>
                  ))}
                  {category.count > 3 && (
                    <li className="text-xs text-gray-500 italic">
                      + {category.count - 3} more
                    </li>
                  )}
                </ul>
              </div>

              {/* Action Button */}
              <button className="w-full px-4 py-2 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg font-semibold transition-colors">
                View Category
              </button>
            </div>
          ))}
        </div>

        {/* Category Details Table */}
        <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">FAQs</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Percentage</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {categoryStats.map((category) => (
                <tr key={category.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{category.label}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">{category.count}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">
                    {((category.count / totalFAQs) * 100).toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        category.count > 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {category.count > 0 ? '✓ Active' : 'Empty'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default HanaFAQCategories;
