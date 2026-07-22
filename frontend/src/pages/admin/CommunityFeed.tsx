import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface Discussion {
  id: number;
  title: string;
  author: string;
  category: string;
  replies: number;
  views: number;
  status: string;
  lastUpdated: string;
}

interface FeedPost {
  id: string;
  author: string;
  content: string;
  type: 'announcement' | 'story' | 'tip' | 'question';
  likes: number;
  comments: number;
  status: 'published' | 'pending' | 'archived';
  createdAt: string;
}

export default function CommunityFeed() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<'announcement' | 'story' | 'tip' | 'question'>('tip');
  const [newAuthor, setNewAuthor] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [newDiscTitle, setNewDiscTitle] = useState('');
  const [newDiscAuthor, setNewDiscAuthor] = useState('');
  const [newDiscCategory, setNewDiscCategory] = useState('general');
  const [editingDiscId, setEditingDiscId] = useState<number | null>(null);
  const [editDiscTitle, setEditDiscTitle] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // This feed used to live in localStorage, which meant a post written here was
  // saved to this browser only — MyKampung could never see it, and it was lost
  // when the cache cleared. Both ends now read and write the same table.
  const loadPosts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/community/posts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('request failed');
      const result = await res.json();
      setPosts(
        (result.data || []).map((p: any) => ({
          id: String(p.id),
          author: p.author,
          content: p.content,
          type: p.category,
          likes: p.likes ?? 0,
          comments: p.comments ?? 0,
          status: 'published',
          createdAt: p.createdAt,
        }))
      );
    } catch (err) {
      console.error('Failed to load community feed:', err);
      setPosts([]);
      showToast('Could not load the community feed', 'error');
    }
  };

  useEffect(() => {
    loadPosts();
    loadDiscussions();
  }, []);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const loadDiscussions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/community/discussions/all`, { headers: authHeaders() });
      if (!res.ok) throw new Error('request failed');
      const result = await res.json();
      setDiscussions(result.data || []);
    } catch (err) {
      console.error('Failed to load discussions:', err);
      setDiscussions([]);
    }
  };

  const handleCreateDiscussion = async () => {
    if (!newDiscTitle.trim()) {
      showToast('⚠️ A discussion needs a title', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/community/discussions`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: newDiscTitle.trim(),
          author: newDiscAuthor.trim() || 'Errandify',
          category: newDiscCategory,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        showToast(result.error || 'Could not start that discussion', 'error');
        return;
      }
      setNewDiscTitle('');
      setNewDiscAuthor('');
      showToast('Discussion posted to MyKampung', 'success');
      loadDiscussions();
    } catch (err) {
      console.error('Failed to create discussion:', err);
      showToast('Could not start that discussion', 'error');
    }
  };

  const handleSaveDiscussion = async (id: number) => {
    if (!editDiscTitle.trim()) {
      showToast('⚠️ Title cannot be empty', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/community/discussions/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ title: editDiscTitle.trim() }),
      });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        showToast(result.error || 'Could not save that discussion', 'error');
        return;
      }
      setEditingDiscId(null);
      showToast('Updated on MyKampung', 'success');
      loadDiscussions();
    } catch (err) {
      console.error('Failed to save discussion:', err);
      showToast('Could not save that discussion', 'error');
    }
  };

  const handleDeleteDiscussion = async (id: number) => {
    if (!confirm('Delete this discussion? It will disappear from MyKampung.')) return;
    try {
      const res = await fetch(`${API_URL}/api/community/discussions/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        showToast(result.error || 'Could not delete that discussion', 'error');
        return;
      }
      showToast('🗑️ Discussion deleted', 'success');
      loadDiscussions();
    } catch (err) {
      console.error('Failed to delete discussion:', err);
      showToast('Could not delete that discussion', 'error');
    }
  };

  const startEdit = (post: FeedPost) => {
    setEditingId(post.id);
    setEditContent(post.content);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editContent.trim()) {
      showToast('⚠️ Content cannot be empty', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/community/posts/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        showToast(result.error || 'Could not save that edit', 'error');
        return;
      }
      setEditingId(null);
      showToast('Updated on MyKampung', 'success');
      loadPosts();
    } catch (err) {
      console.error('Failed to edit post:', err);
      showToast('Could not save that edit', 'error');
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm('Delete this post? It will disappear from MyKampung.')) return;
    try {
      const res = await fetch(`${API_URL}/api/community/posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        showToast(result.error || 'Could not delete that post', 'error');
        return;
      }
      showToast('🗑️ Post deleted', 'success');
      loadPosts();
    } catch (err) {
      console.error('Failed to delete post:', err);
      showToast('Could not delete that post', 'error');
    }
  };

  const handleCreatePost = async () => {
    if (!newContent.trim() || !newAuthor.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/community/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newContent.trim(),
          author: newAuthor.trim(),
          category: newType,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        showToast(result.error || 'Could not publish that post', 'error');
        return;
      }

      // Posts publish immediately: an admin writing here is Errandify speaking
      // to its community, and there is no review queue in this screen to move
      // a pending post out of. Change status via PATCH if that ever changes.
      showToast('Published to MyKampung', 'success');
      setNewContent('');
      setNewAuthor('');
      loadPosts();
    } catch (err) {
      console.error('Failed to create post:', err);
      showToast('Could not publish that post', 'error');
    }
  };

  const typeColors = {
    'announcement': '#2196F3',
    'story': '#4CAF50',
    'tip': '#FF9800',
    'question': '#9C27B0',
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff' }}>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>
            📰 Community Feed
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
          Manage community posts and discussions
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
          Create Feed Post
        </div>
        <div style={{ display: 'grid', gap: '12px' }}>
          <input
            type="text"
            placeholder="Author name"
            value={newAuthor}
            onChange={(e) => setNewAuthor(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
          />
          <textarea
            placeholder="Post content"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', minHeight: '80px' }}
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as any)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
          >
            <option value="announcement">Announcement</option>
            <option value="story">Success Story</option>
            <option value="tip">Tip & Trick</option>
            <option value="question">Question</option>
          </select>
          <button
            onClick={handleCreatePost}
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
            + Post to Feed
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {posts.map(post => (
          <div key={post.id} style={{
            padding: '16px',
            background: 'white',
            border: `2px solid ${typeColors[post.type]}`,
            borderRadius: '8px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                  {post.author}
                </div>
                {editingId === post.id ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    style={{
                      width: '100%', padding: '8px', border: '2px solid #FF6B35',
                      borderRadius: '6px', fontSize: '12px', minHeight: '70px',
                    }}
                  />
                ) : (
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {post.content}
                  </div>
                )}
              </div>
              <span style={{
                padding: '6px 10px',
                background: typeColors[post.type],
                color: 'white',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                height: 'fit-content',
                whiteSpace: 'nowrap',
              }}>
                {post.type.toUpperCase()}
              </span>
            </div>

            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', display: 'flex', gap: '16px' }}>
              <span>👍 {post.likes}</span>
              <span>💬 {post.comments}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              {editingId === post.id ? (
                <>
                  <button
                    onClick={() => handleSaveEdit(post.id)}
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
                    onClick={() => startEdit(post)}
                    style={{
                      padding: '6px 12px', background: 'white', color: '#FF6B35',
                      border: '2px solid #FF6B35', borderRadius: '6px', fontSize: '12px',
                      fontWeight: '600', cursor: 'pointer',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePost(post.id)}
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
            <div style={{ fontSize: '11px', color: '#999' }}>
              {new Date(post.createdAt).toLocaleString()} • Status: {post.status}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '2px solid #FFD9B3' }}>
        <div style={{ fontSize: '16px', fontWeight: '700', color: '#333', marginBottom: '4px' }}>
          💬 Discussions
        </div>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
          Conversation threads shown in the MyKampung discussions tab.
        </p>

        <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Discussion title"
            value={newDiscTitle}
            onChange={(e) => setNewDiscTitle(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input
              type="text"
              placeholder="Author (defaults to Errandify)"
              value={newDiscAuthor}
              onChange={(e) => setNewDiscAuthor(e.target.value)}
              style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
            />
            <select
              value={newDiscCategory}
              onChange={(e) => setNewDiscCategory(e.target.value)}
              style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
            >
              <option value="general">General</option>
              <option value="tips">Tips</option>
              <option value="issues">Issues</option>
              <option value="feedback">Feedback</option>
            </select>
          </div>
          <button
            onClick={handleCreateDiscussion}
            style={{
              padding: '10px',
              background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
              color: 'white', border: 'none', borderRadius: '6px',
              fontWeight: '600', cursor: 'pointer',
            }}
          >
            + Start Discussion
          </button>
        </div>

        {discussions.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#666' }}>No discussions yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {discussions.map(d => (
              <div key={d.id} style={{
                padding: '14px', background: 'white',
                border: '2px solid #9C27B0', borderRadius: '8px',
              }}>
                {editingDiscId === d.id ? (
                  <input
                    type="text"
                    value={editDiscTitle}
                    onChange={(e) => setEditDiscTitle(e.target.value)}
                    style={{
                      width: '100%', padding: '8px', border: '2px solid #FF6B35',
                      borderRadius: '6px', fontSize: '13px', marginBottom: '8px',
                    }}
                  />
                ) : (
                  <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                    {d.title}
                  </div>
                )}
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                  {d.author} • {d.category} • 💬 {d.replies} • 👁 {d.views}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {editingDiscId === d.id ? (
                    <>
                      <button
                        onClick={() => handleSaveDiscussion(d.id)}
                        style={{
                          padding: '6px 12px', background: '#FF6B35', color: 'white',
                          border: 'none', borderRadius: '6px', fontSize: '12px',
                          fontWeight: '600', cursor: 'pointer',
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingDiscId(null)}
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
                        onClick={() => { setEditingDiscId(d.id); setEditDiscTitle(d.title); }}
                        style={{
                          padding: '6px 12px', background: 'white', color: '#FF6B35',
                          border: '2px solid #FF6B35', borderRadius: '6px', fontSize: '12px',
                          fontWeight: '600', cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteDiscussion(d.id)}
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

      </div>
    </AdminLayout>
  );
}
