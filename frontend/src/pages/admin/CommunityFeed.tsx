import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

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

  useEffect(() => {
    const saved = localStorage.getItem('communityFeed');
    if (saved) {
      setPosts(JSON.parse(saved));
    } else {
      const demoPosts: FeedPost[] = [
        {
          id: 'post_1',
          author: 'Sarah Chen',
          content: 'Just completed my 100th errand! So grateful for this platform',
          type: 'story',
          likes: 234,
          comments: 45,
          status: 'published',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'post_2',
          author: 'Mike Johnson',
          content: 'Pro tip: Always check the errand location before accepting to save time',
          type: 'tip',
          likes: 156,
          comments: 23,
          status: 'published',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: 'post_3',
          author: 'Lisa Wong',
          content: 'Any tips for getting more high-paying errands?',
          type: 'question',
          likes: 89,
          comments: 34,
          status: 'published',
          createdAt: new Date(Date.now() - 259200000).toISOString(),
        },
      ];
      setPosts(demoPosts);
      localStorage.setItem('communityFeed', JSON.stringify(demoPosts));
    }
  }, []);

  const handleCreatePost = () => {
    if (!newContent.trim() || !newAuthor.trim()) return;

    const newPost: FeedPost = {
      id: `post_${Date.now()}`,
      author: newAuthor,
      content: newContent,
      type: newType,
      likes: 0,
      comments: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const updated = [...posts, newPost];
    setPosts(updated);
    localStorage.setItem('communityFeed', JSON.stringify(updated));
    setNewContent('');
    setNewAuthor('');
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
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {post.content}
                </div>
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
            <div style={{ fontSize: '11px', color: '#999' }}>
              {new Date(post.createdAt).toLocaleString()} • Status: {post.status}
            </div>
          </div>
        ))}
      </div>
      </div>
    </AdminLayout>
  );
}
