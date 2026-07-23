import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

/**
 * Category performance, from `GET /api/categories/stats`.
 *
 * This screen printed a hardcoded five-row table — GMV, errand counts and star
 * ratings that had never come from anywhere and did not match the sixteen real
 * categories. The figures are now computed off the errands themselves.
 *
 * The "+ New Category" / "Edit" buttons are gone rather than left inert:
 * categories come from `category_codes`, which is the single source of truth
 * for the marketplace tiles, the ER26<code> errand ids and the restriction
 * rules. Adding or renaming one from here without touching those is not a
 * feature, and there is no endpoint for it.
 */
interface CategoryStat {
  slug: string;
  name: string;
  icon: string;
  code: string;
  total_errands: number;
  open_errands: number;
  completed_errands: number;
  gmv: number;
  avg_rating: number | null;
  rating_count: number;
}

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/categories/stats', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
        setCategories(body.data || []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sgd = (n: number) =>
    `$${n.toLocaleString('en-SG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="page-header">
          <h1>📂 Category Performance</h1>
        </div>

        {/* Happy Message Box */}
        <div className="happy-message-box">
          <span className="emoji">✨</span>
          <div>
            <strong>{loading ? 'Loading…' : `${categories.length} categories`}</strong>
            <p>
              GMV counts completed errands only — budget on an open errand is an intention, not money that
              moved. Ratings are averaged across all rated errands in the category.
            </p>
          </div>
        </div>

        {error && (
          <div style={{ padding: '16px', background: '#ffebee', border: '2px solid #f44336', borderRadius: '8px', color: '#c62828', fontSize: '14px' }}>
            ⚠️ {error}
          </div>
        )}

        <div className="categories-grid">
          {categories.map((cat) => (
            <div key={cat.slug} className="category-card">
              <div className="cat-header">
                <div className="cat-name">{cat.icon} {cat.name}</div>
                <span className="status-badge">{cat.code}</span>
              </div>

              <div className="cat-stats">
                <div className="stat">
                  <span className="stat-label">GMV</span>
                  <span className="stat-value">{sgd(cat.gmv)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Errands</span>
                  <span className="stat-value">{cat.total_errands}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Rating</span>
                  <span className="stat-value">
                    {cat.avg_rating != null ? `${cat.avg_rating}★` : '—'}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                {cat.completed_errands} completed · {cat.open_errands} open
                {cat.rating_count > 0 && ` · ${cat.rating_count} rating${cat.rating_count === 1 ? '' : 's'}`}
              </div>
            </div>
          ))}
          {!loading && categories.length === 0 && !error && (
            <p style={{ color: '#888', fontSize: '14px' }}>No categories configured.</p>
          )}
        </div>
      </div>

      <style>{`
        .admin-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .page-header h1 {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
          color: #ff6b35;
        }

        .btn-primary {
          padding: 10px 16px;
          background: #ff6b35;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover {
          background: #ff5722;
          box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
        }

        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }

        .category-card {
          background: white;
          border: 1px solid #ffb88c;
          border-radius: 8px;
          padding: 14px;
          transition: all 0.2s;
        }

        .category-card:hover {
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.15);
          border-color: #ff6b35;
        }

        .cat-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 12px;
        }

        .cat-name {
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .status-badge {
          background: #e6f9f0;
          color: #27b55d;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .cat-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }

        .stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 8px;
          background: #fff9f5;
          border-radius: 4px;
          text-align: center;
        }

        .stat-label {
          font-size: 10px;
          color: #888;
          font-weight: 600;
          text-transform: uppercase;
        }

        .stat-value {
          font-size: 13px;
          font-weight: 700;
          color: #ff6b35;
        }

        .cat-actions {
          display: flex;
          gap: 6px;
        }

        .btn-small {
          flex: 1;
          padding: 6px 8px;
          background: #f0f0f0;
          color: #333;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-small:hover {
          background: #ff6b35;
          color: white;
          border-color: #ff6b35;
        }

        .happy-message-box {
          background: linear-gradient(135deg, #fff9f5 0%, #fffbf7 100%);
          border-left: 4px solid #ff6b35;
          border-radius: 8px;
          padding: 12px 14px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .happy-message-box .emoji {
          font-size: 24px;
          min-width: 24px;
        }

        .happy-message-box strong {
          color: #ff6b35;
          font-size: 13px;
          display: block;
          margin-bottom: 2px;
        }

        .happy-message-box p {
          margin: 0;
          font-size: 12px;
          color: #666;
          line-height: 1.5;
        }
      `}</style>
    </AdminLayout>
  );
};

export default CategoriesPage;
