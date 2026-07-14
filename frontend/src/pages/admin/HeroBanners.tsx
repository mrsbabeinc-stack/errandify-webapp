import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  ctaText: string;
  ctaLink: string;
  status: 'active' | 'scheduled' | 'archived';
  displayLocation: string;
  createdAt: string;
  activeFrom?: string;
  activeTo?: string;
}

export default function HeroBanners() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newCTAText, setNewCTAText] = useState('');
  const [newLocation, setNewLocation] = useState('home');

  useEffect(() => {
    const saved = localStorage.getItem('heroBanners');
    if (saved) {
      setBanners(JSON.parse(saved));
    } else {
      const demoBanners: Banner[] = [
        {
          id: 'banner_1',
          title: 'Summer Promotion',
          subtitle: 'Get 20% off your first errand',
          image: '🌞',
          ctaText: 'Browse Errands',
          ctaLink: '/browse',
          status: 'active',
          displayLocation: 'home',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'banner_2',
          title: 'Become a Top Doer',
          subtitle: 'Earn up to $50 per errand',
          image: '⭐',
          ctaText: 'Sign Up as Doer',
          ctaLink: '/signup/doer',
          status: 'active',
          displayLocation: 'home',
          createdAt: new Date(Date.now() - 604800000).toISOString(),
        },
        {
          id: 'banner_3',
          title: 'Refer & Earn',
          subtitle: 'Get $10 for each friend you refer',
          image: '🎁',
          ctaText: 'Learn More',
          ctaLink: '/referral',
          status: 'scheduled',
          displayLocation: 'asker-dashboard',
          createdAt: new Date(Date.now() - 1296000000).toISOString(),
          activeFrom: new Date(Date.now() + 604800000).toISOString(),
          activeTo: new Date(Date.now() + 1209600000).toISOString(),
        },
      ];
      setBanners(demoBanners);
      localStorage.setItem('heroBanners', JSON.stringify(demoBanners));
    }
  }, []);

  const handleCreateBanner = () => {
    if (!newTitle.trim() || !newCTAText.trim()) return;

    const newBanner: Banner = {
      id: `banner_${Date.now()}`,
      title: newTitle,
      subtitle: newSubtitle,
      image: '📢',
      ctaText: newCTAText,
      ctaLink: '/browse',
      status: 'scheduled',
      displayLocation: newLocation,
      createdAt: new Date().toISOString(),
    };

    const updated = [...banners, newBanner];
    setBanners(updated);
    localStorage.setItem('heroBanners', JSON.stringify(updated));
    setNewTitle('');
    setNewSubtitle('');
    setNewCTAText('');
  };

  const statusColors = {
    'active': '#4CAF50',
    'scheduled': '#FF9800',
    'archived': '#999',
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff' }}>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>
            🎨 Hero Banners
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
          Create and manage promotional hero banners
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
          Create Banner
        </div>
        <div style={{ display: 'grid', gap: '12px' }}>
          <input
            type="text"
            placeholder="Banner title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
          />
          <input
            type="text"
            placeholder="Subtitle/description"
            value={newSubtitle}
            onChange={(e) => setNewSubtitle(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
          />
          <input
            type="text"
            placeholder="CTA Button Text (e.g., Learn More)"
            value={newCTAText}
            onChange={(e) => setNewCTAText(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
          />
          <select
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
          >
            <option value="home">Home Page</option>
            <option value="doer-dashboard">Doer Dashboard</option>
            <option value="asker-dashboard">Asker Dashboard</option>
            <option value="browse">Browse Page</option>
          </select>
          <button
            onClick={handleCreateBanner}
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
            + Create Banner
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {banners.map(banner => (
          <div key={banner.id} style={{
            padding: '16px',
            background: 'white',
            border: `2px solid ${statusColors[banner.status]}`,
            borderRadius: '8px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '16px', alignItems: 'start' }}>
              <div style={{ fontSize: '48px' }}>{banner.image}</div>
              <div>
                <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                  {banner.title}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                  {banner.subtitle}
                </div>
                <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>
                  Button: "{banner.ctaText}" • Location: {banner.displayLocation}
                </div>
                <div style={{ fontSize: '11px', color: '#999' }}>
                  Created: {new Date(banner.createdAt).toLocaleDateString()}
                </div>
              </div>
              <span style={{
                padding: '6px 10px',
                background: statusColors[banner.status],
                color: 'white',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                height: 'fit-content',
                whiteSpace: 'nowrap',
              }}>
                {banner.status.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>
      </div>
    </AdminLayout>
  );
}
