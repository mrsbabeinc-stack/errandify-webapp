import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface Recognition {
  id: string;
  userName: string;
  award: string;
  reason: string;
  icon: string;
  awardedAt: string;
  visibility: 'public' | 'private';
}

export default function Recognition() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [recognitions, setRecognitions] = useState<Recognition[]>([]);
  const [newUserName, setNewUserName] = useState('');
  const [newAward, setNewAward] = useState('top-doer');
  const [newReason, setNewReason] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('recognitions');
    if (saved) {
      setRecognitions(JSON.parse(saved));
    } else {
      const demoRecognitions: Recognition[] = [
        {
          id: 'rec_1',
          userName: 'Alex Wong',
          award: 'Top Doer of the Month',
          reason: 'Completed 50 errands with 100% satisfaction',
          icon: '🏆',
          awardedAt: new Date(Date.now() - 86400000).toISOString(),
          visibility: 'public',
        },
        {
          id: 'rec_2',
          userName: 'Sarah Chen',
          award: 'Community Hero',
          reason: 'Helped 20 users with emergency errands',
          icon: '⭐',
          awardedAt: new Date(Date.now() - 604800000).toISOString(),
          visibility: 'public',
        },
        {
          id: 'rec_3',
          userName: 'John Lee',
          award: 'Reliable Partner',
          reason: '99% on-time completion rate',
          icon: '✓',
          awardedAt: new Date(Date.now() - 1296000000).toISOString(),
          visibility: 'private',
        },
      ];
      setRecognitions(demoRecognitions);
      localStorage.setItem('recognitions', JSON.stringify(demoRecognitions));
    }
  }, []);

  const handleCreateRecognition = () => {
    if (!newUserName.trim() || !newReason.trim()) return;

    const awardIcons: { [key: string]: string } = {
      'top-doer': '🏆',
      'community-hero': '⭐',
      'reliable': '✓',
      'helpful': '❤️',
    };

    const newRecognition: Recognition = {
      id: `rec_${Date.now()}`,
      userName: newUserName,
      award: newAward,
      reason: newReason,
      icon: awardIcons[newAward] || '🏅',
      awardedAt: new Date().toISOString(),
      visibility: 'public',
    };

    const updated = [...recognitions, newRecognition];
    setRecognitions(updated);
    localStorage.setItem('recognitions', JSON.stringify(updated));
    setNewUserName('');
    setNewReason('');
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff' }}>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>
            🏆 Recognition
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
          Recognize and celebrate user achievements
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
          Award Recognition
        </div>
        <div style={{ display: 'grid', gap: '12px' }}>
          <input
            type="text"
            placeholder="User name"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
          />
          <select
            value={newAward}
            onChange={(e) => setNewAward(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
          >
            <option value="top-doer">🏆 Top Doer</option>
            <option value="community-hero">⭐ Community Hero</option>
            <option value="reliable">✓ Reliable Partner</option>
            <option value="helpful">❤️ Most Helpful</option>
          </select>
          <textarea
            placeholder="Reason for award"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', minHeight: '60px' }}
          />
          <button
            onClick={handleCreateRecognition}
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
            + Award Recognition
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {recognitions.map(rec => (
          <div key={rec.id} style={{
            padding: '16px',
            background: 'white',
            border: '2px solid #FFD9B3',
            borderRadius: '8px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px', alignItems: 'start' }}>
              <div style={{ fontSize: '20px' }}>{rec.icon}</div>
              <div>
                <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                  {rec.userName}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  {rec.award}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  {rec.reason}
                </div>
                <div style={{ fontSize: '11px', color: '#999' }}>
                  {new Date(rec.awardedAt).toLocaleDateString()}
                </div>
              </div>
              <span style={{
                padding: '6px 10px',
                background: rec.visibility === 'public' ? '#e8f5e9' : '#f5f5f5',
                color: rec.visibility === 'public' ? '#2e7d32' : '#999',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                height: 'fit-content',
                whiteSpace: 'nowrap',
              }}>
                {rec.visibility.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>
      </div>
    </AdminLayout>
  );
}
