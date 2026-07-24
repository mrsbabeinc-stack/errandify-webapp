import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

/**
 * Announcements shown at the top of MyKampung.
 *
 * The endpoints were built alongside the community feed and events but had no
 * screen, so announcements could only be created with a direct API call. This
 * is that screen — same shape as Community Feed, reading and writing
 * /api/announcements.
 *
 * Pinned announcements sort above the rest, which is the order MyKampung
 * renders them in.
 */

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: 'important' | 'feature' | 'maintenance' | 'tip';
  icon?: string;
  isPinned: boolean;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  important: '#E53935',
  feature: '#F0A81E',
  maintenance: '#FF9800',
  tip: '#4CAF50',
};

// A sensible default per type, so an admin who leaves the icon blank still gets
// something recognisable rather than an empty gap in the feed.
const TYPE_ICONS: Record<string, string> = {
  important: '⚠️',
  feature: '✨',
  maintenance: '🔧',
  tip: '💡',
};

export default function Announcements() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<Announcement['type']>('tip');
  const [newIcon, setNewIcon] = useState('');
  const [newPinned, setNewPinned] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const loadAnnouncements = async () => {
    try {
      const res = await fetch(`${API_URL}/api/announcements`, { headers: authHeaders() });
      if (!res.ok) throw new Error('request failed');
      const result = await res.json();
      setAnnouncements(result.data || []);
    } catch (err) {
      console.error('Failed to load announcements:', err);
      setAnnouncements([]);
      showToast('Could not load announcements', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      showToast('⚠️ Title and content are both needed', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/announcements`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
          type: newType,
          icon: newIcon.trim() || TYPE_ICONS[newType],
          isPinned: newPinned,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        showToast(result.error || 'Could not publish that announcement', 'error');
        return;
      }

      showToast('Published to MyKampung', 'success');
      setNewTitle('');
      setNewContent('');
      setNewIcon('');
      setNewPinned(false);
      loadAnnouncements();
    } catch (err) {
      console.error('Failed to create announcement:', err);
      showToast('Could not publish that announcement', 'error');
    }
  };

  const startEdit = (a: Announcement) => {
    setEditingId(a.id);
    setEditTitle(a.title);
    setEditContent(a.content);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editTitle.trim() || !editContent.trim()) {
      showToast('⚠️ Title and content are both needed', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/announcements/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ title: editTitle.trim(), content: editContent.trim() }),
      });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        showToast(result.error || 'Could not save that edit', 'error');
        return;
      }
      setEditingId(null);
      showToast('Updated on MyKampung', 'success');
      loadAnnouncements();
    } catch (err) {
      console.error('Failed to edit announcement:', err);
      showToast('Could not save that edit', 'error');
    }
  };

  const handleTogglePin = async (a: Announcement) => {
    try {
      const res = await fetch(`${API_URL}/api/announcements/${a.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ isPinned: !a.isPinned }),
      });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        showToast(result.error || 'Could not update that announcement', 'error');
        return;
      }
      loadAnnouncements();
    } catch (err) {
      console.error('Failed to toggle pin:', err);
      showToast('Could not update that announcement', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this announcement? It will disappear from MyKampung.')) return;
    try {
      const res = await fetch(`${API_URL}/api/announcements/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        showToast(result.error || 'Could not delete that announcement', 'error');
        return;
      }
      showToast('🗑️ Announcement deleted', 'success');
      loadAnnouncements();
    } catch (err) {
      console.error('Failed to delete announcement:', err);
      showToast('Could not delete that announcement', 'error');
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: '10px 12px',
    border: '2px solid #FFD9B3',
    borderRadius: '6px',
    fontSize: '14px',
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>
              📢 Announcements
            </h2>
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
            Shown at the top of MyKampung. Pinned announcements appear first.
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
            New Announcement
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
              placeholder="What do you want the community to know?"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              style={{ ...inputStyle, minHeight: '80px' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as Announcement['type'])}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="important">Important</option>
                <option value="feature">New Feature</option>
                <option value="maintenance">Maintenance</option>
                <option value="tip">Tip</option>
              </select>
              <input
                type="text"
                placeholder={`Icon (default ${TYPE_ICONS[newType]})`}
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                maxLength={4}
                style={inputStyle}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#333', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newPinned}
                onChange={(e) => setNewPinned(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              Pin to the top of MyKampung
            </label>
            <button
              onClick={handleCreate}
              style={{
                padding: '10px',
                background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                color: 'white', border: 'none', borderRadius: '6px',
                fontWeight: '600', cursor: 'pointer',
              }}
            >
              + Publish Announcement
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ fontSize: '14px', color: '#666' }}>Loading announcements…</p>
        ) : announcements.length === 0 ? (
          <p style={{ fontSize: '14px', color: '#666' }}>
            Nothing published yet. Anything you post here appears at the top of MyKampung.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {announcements.map((a) => (
              <div
                key={a.id}
                style={{
                  padding: '16px',
                  background: 'white',
                  border: `2px solid ${TYPE_COLORS[a.type] || '#ccc'}`,
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start', marginBottom: '8px' }}>
                  <div>
                    {editingId === a.id ? (
                      <div style={{ display: 'grid', gap: '8px' }}>
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
                          {a.icon} {a.title} {a.isPinned && <span title="Pinned">📌</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{a.content}</div>
                      </>
                    )}
                  </div>
                  <span
                    style={{
                      padding: '6px 10px',
                      background: TYPE_COLORS[a.type] || '#ccc',
                      color: 'white', borderRadius: '4px', fontSize: '11px',
                      fontWeight: '600', height: 'fit-content', whiteSpace: 'nowrap',
                    }}
                  >
                    {a.type.toUpperCase()}
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: '#999', marginBottom: '10px' }}>
                  {new Date(a.createdAt).toLocaleString()}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {editingId === a.id ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(a.id)}
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
                  <button
                    onClick={() => startEdit(a)}
                    style={{
                      padding: '6px 12px', background: 'white', color: '#FF6B35',
                      border: '2px solid #FF6B35', borderRadius: '6px',
                      fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    }}
                  >
                    Edit
                  </button>
                  )}
                  <button
                    onClick={() => handleTogglePin(a)}
                    style={{
                      padding: '6px 12px', background: 'white', color: '#FF6B35',
                      border: '2px solid #FF6B35', borderRadius: '6px',
                      fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    }}
                  >
                    {a.isPinned ? 'Unpin' : 'Pin to top'}
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    style={{
                      padding: '6px 12px', background: 'white', color: '#E53935',
                      border: '2px solid #E53935', borderRadius: '6px',
                      fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
