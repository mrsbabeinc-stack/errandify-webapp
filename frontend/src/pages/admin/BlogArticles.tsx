import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface Article {
  id: string;
  title: string;
  category: string;
  author: string;
  status: 'published' | 'draft' | 'archived';
  views: number;
  publishedAt?: string;
  createdAt: string;
}

export default function BlogArticles() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [articles, setArticles] = useState<Article[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('tips');
  const [newAuthor, setNewAuthor] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('blogArticles');
    if (saved) {
      setArticles(JSON.parse(saved));
    } else {
      const demoArticles: Article[] = [
        {
          id: 'blog_1',
          title: '10 Tips for Getting More Errands Done',
          category: 'tips',
          author: 'Sarah Chen',
          status: 'published',
          views: 3421,
          publishedAt: new Date(Date.now() - 604800000).toISOString(),
          createdAt: new Date(Date.now() - 864000000).toISOString(),
        },
        {
          id: 'blog_2',
          title: 'How to Become a Top-Rated Doer',
          category: 'guides',
          author: 'Mike Johnson',
          status: 'published',
          views: 2156,
          publishedAt: new Date(Date.now() - 1296000000).toISOString(),
          createdAt: new Date(Date.now() - 1382400000).toISOString(),
        },
        {
          id: 'blog_3',
          title: 'Maximizing Your Earnings on Errandify',
          category: 'tips',
          author: 'Lisa Wong',
          status: 'draft',
          views: 0,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ];
      setArticles(demoArticles);
      localStorage.setItem('blogArticles', JSON.stringify(demoArticles));
    }
  }, []);

  const handleCreateArticle = () => {
    if (!newTitle.trim() || !newAuthor.trim()) return;

    const newArticle: Article = {
      id: `blog_${Date.now()}`,
      title: newTitle,
      category: newCategory,
      author: newAuthor,
      status: 'draft',
      views: 0,
      createdAt: new Date().toISOString(),
    };

    const updated = [...articles, newArticle];
    setArticles(updated);
    localStorage.setItem('blogArticles', JSON.stringify(updated));
    setNewTitle('');
    setNewAuthor('');
  };

  const statusColors = {
    'published': '#4CAF50',
    'draft': '#2196F3',
    'archived': '#999',
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff' }}>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>
            📰 Blog & Articles
          </h2>
          <button
            onClick={() => navigate(-1)}
            style={{
              fontSize: '20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#FF6B35',
              fontWeight: '700',
              padding: '0 8px',
            }}
            title="Go back"
          >
            ←
          </button>
        </div>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Publish articles and guides for your community
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
          Create New Article
        </div>
        <div style={{ display: 'grid', gap: '12px' }}>
          <input
            type="text"
            placeholder="Article title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
          />
          <input
            type="text"
            placeholder="Author name"
            value={newAuthor}
            onChange={(e) => setNewAuthor(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
          >
            <option value="tips">Tips & Tricks</option>
            <option value="guides">Guides</option>
            <option value="announcements">Announcements</option>
            <option value="stories">Success Stories</option>
          </select>
          <button
            onClick={handleCreateArticle}
            style={{
              padding: '10px',
              background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            + Create Article
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {articles.map(article => (
          <div key={article.id} style={{
            padding: '16px',
            background: 'white',
            border: `2px solid ${statusColors[article.status]}`,
            borderRadius: '8px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                  {article.title}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  By {article.author} • Category: {article.category}
                </div>
              </div>
              <span style={{
                padding: '6px 10px',
                background: statusColors[article.status],
                color: 'white',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                height: 'fit-content',
                whiteSpace: 'nowrap',
              }}>
                {article.status.toUpperCase()}
              </span>
            </div>

            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
              Views: <strong>{article.views.toLocaleString()}</strong>
            </div>
            <div style={{ fontSize: '11px', color: '#999' }}>
              Created: {new Date(article.createdAt).toLocaleDateString()}
              {article.publishedAt && ` • Published: ${new Date(article.publishedAt).toLocaleDateString()}`}
            </div>
          </div>
        ))}
      </div>
      </div>
    </AdminLayout>
  );
}
