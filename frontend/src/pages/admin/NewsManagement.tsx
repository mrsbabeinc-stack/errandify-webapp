import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

/**
 * The two news feeds behind MyKampung's news section.
 *
 * community — neighbourhood notices, optionally tied to a postal code
 * errandify — platform news written by the team
 *
 * Both had endpoints and no screen, so items could be created only by calling
 * the API directly and could never be corrected or taken down. Singapore news
 * is not here: it comes from an external source, not from us.
 */

type Feed = 'community' | 'errandify';

interface NewsItem {
  id: number;
  type: string;
  title: string;
  content: string;
  category?: string;
  location?: string;
  postal_code?: string;
  source?: string;
  created_at: string;
}

export default function NewsManagement() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [feed, setFeed] = useState<Feed>('community');
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newPostal, setNewPostal] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const loadItems = async (which: Feed) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/news?type=${which}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('request failed');
      const result = await res.json();
      setItems(result.data || []);
    } catch (err) {
      console.error('Failed to load news:', err);
      setItems([]);
      showToast('Could not load news', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems(feed);
    setEditingId(null);
  }, [feed]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      showToast('⚠️ Title and content are both needed', 'error');
      return;
    }
    try {
      // The two feeds have different shapes: only community news carries a
      // location and postal code, so those are sent only where they mean
      // something.
      const body: Record<string, unknown> = {
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory.trim() || null,
      };
      if (feed === 'community') {
        body.location = newLocation.trim() || null;
        body.postal_code = newPostal.trim() || null;
      }

      const res = await fetch(`${API_URL}/api/news/${feed}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) {
        showToast(result.error || 'Could not publish that item', 'error');
        return;
      }

      setNewTitle('');
      setNewContent('');
      setNewCategory('');
      setNewLocation('');
      setNewPostal('');
      showToast('Published to MyKampung', 'success');
      loadItems(feed);
    } catch (err) {
      console.error('Failed to create news:', err);
      showToast('Could not publish that item', 'error');
    }
  };

  const handleSaveEdit = async (id: number) => {
    if (!editTitle.trim() || !editContent.trim()) {
      showToast('⚠️ Title and content are both needed', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/news/${feed}/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ title: editTitle.trim(), content: editContent.trim() }),
      });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        showToast(result.error || 'Could not save that item', 'error');
        return;
      }
      setEditingId(null);
      showToast('Updated on MyKampung', 'success');
      loadItems(feed);
    } catch (err) {
      console.error('Failed to save news:', err);
      showToast('Could not save that item', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this item? It will disappear from MyKampung.')) return;
    try {
      const res = await fetch(`${API_URL}/api/news/${feed}/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        showToast(result.error || 'Could not delete that item', 'error');
        return;
      }
      showToast('🗑️ Item deleted', 'success');
      loadItems(feed);
    } catch (err) {
      console.error('Failed to delete news:', err);
      showToast('Could not delete that item', 'error');
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: '10px 12px',
    border: '2px solid #FFD9B3',
    borderRadius: '6px',
    fontSize: '14px',
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    background: active ? '#FF6B35' : 'white',
    color: active ? 'white' : '#666',
    border: `2px solid ${active ? '#FF6B35' : '#ccc'}`,
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
  });

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>📰 News</h2>
            <button
              onClick={() => navigate(-1)}
              style={{
                fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer',
                color: '#FF6B35', fontWeight: '700', padding: '0 8px',
              }}
              title="Go back"
            >
              ←
            </button>
          </div>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Shown in the MyKampung news section. Singapore news comes from an
            external source and is not managed here.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button style={tabStyle(feed === 'community')} onClick={() => setFeed('community')}>
            Community
          </button>
          <button style={tabStyle(feed === 'errandify')} onClick={() => setFeed('errandify')}>
            Errandify
          </button>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
            New {feed === 'community' ? 'Community Notice' : 'Errandify News'}
          </div>
          <div style={{ display: 'grid', gap: '12px' }}>
            <input
              type="text"
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={inputStyle}
            />
            <textarea
              placeholder="Content"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              style={{ ...inputStyle, minHeight: '80px' }}
            />
            <input
              type="text"
              placeholder="Category (optional)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              style={inputStyle}
            />
            {feed === 'community' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Location (optional)"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="text"
                  placeholder="Postal code (optional)"
                  value={newPostal}
                  onChange={(e) => setNewPostal(e.target.value)}
                  maxLength={6}
                  style={inputStyle}
                />
              </div>
            )}
            <button
              onClick={handleCreate}
              style={{
                padding: '10px',
                background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                color: 'white', border: 'none', borderRadius: '6px',
                fontWeight: '600', cursor: 'pointer',
              }}
            >
              + Publish
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ fontSize: '14px', color: '#666' }}>Loading…</p>
        ) : items.length === 0 ? (
          <p style={{ fontSize: '14px', color: '#666' }}>
            Nothing published in this feed yet.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '16px', background: 'white',
                  border: '2px solid #FFD9B3', borderRadius: '8px',
                }}
              >
                {editingId === item.id ? (
                  <div style={{ display: 'grid', gap: '8px', marginBottom: '10px' }}>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      style={{ ...inputStyle, borderColor: '#FF6B35', fontSize: '13px' }}
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      style={{ ...inputStyle, borderColor: '#FF6B35', fontSize: '12px', minHeight: '70px' }}
                    />
                  </div>
                ) : (
                  <>
                    <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                      {item.content}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999', marginBottom: '10px' }}>
                      {item.category && <>{item.category} • </>}
                      {item.location && <>{item.location} • </>}
                      {item.postal_code && <>{item.postal_code} • </>}
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  {editingId === item.id ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(item.id)}
                        style={{
                          padding: '6px 12px', background: '#FF6B35', color: 'white',
                          border: 'none', borderRadius: '6px', fontSize: '12px',
                          fontWeight: '600', cursor: 'pointer',
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          padding: '6px 12px', background: 'white', color: '#666',
                          border: '2px solid #ccc', borderRadius: '6px', fontSize: '12px',
                          fontWeight: '600', cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(item.id);
                          setEditTitle(item.title);
                          setEditContent(item.content);
                        }}
                        style={{
                          padding: '6px 12px', background: 'white', color: '#FF6B35',
                          border: '2px solid #FF6B35', borderRadius: '6px', fontSize: '12px',
                          fontWeight: '600', cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        style={{
                          padding: '6px 12px', background: 'white', color: '#E53935',
                          border: '2px solid #E53935', borderRadius: '6px', fontSize: '12px',
                          fontWeight: '600', cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
