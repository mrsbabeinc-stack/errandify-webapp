import React, { useState, useEffect } from 'react';
import { generateText } from '../../utils/aiClient';
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

  // Hero banner AI design
  const [heroBannerDesignLoading, setHeroBannerDesignLoading] = useState(false);
  const [generatedHeroBannerDesign, setGeneratedHeroBannerDesign] = useState('');
  const [customBannerRequirements, setCustomBannerRequirements] = useState('');

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

  const handleGenerateHeroBannerDesign = async () => {
    if (!newTitle.trim() || !newSubtitle.trim()) {
      showToast('⚠️ Fill in title and description first', 'error');
      return;
    }

    setHeroBannerDesignLoading(true);

    try {
      const prompt = `You are a professional hero banner designer. Create a detailed visual design description for a promotional hero banner.

Banner: "${newTitle}"
Description: "${newSubtitle}"
Location: ${newLocation}
CTA Button: "${newCTAText}"
${customBannerRequirements.trim() ? `Custom Requirements: ${customBannerRequirements}` : ''}

Generate a vivid design description for a 1200x400px hero banner that includes:

1. **Color Scheme**: Suggest 2-3 primary colors (hex codes)
   - Use bold, eye-catching colors
   - Ensure good contrast with white text
   - Consider brand consistency

2. **Layout Elements**:
   - Hero headline positioning (banner title)
   - Subheading placement
   - Where to place CTA button
   - Visual hierarchy

3. **Style & Mood**:
   - Professional vs casual tone?
   - Modern, vibrant, playful?
   - Special design elements (shapes, patterns, decorations)

4. **Typography**:
   - Headline font style (bold, sans-serif, modern?)
   - Font sizes for hierarchy
   - Text color/contrast

5. **Visual Elements**:
   - Background pattern/gradient
   - Decorative icons or illustrations
   - Call-to-action button styling
   - Any animated elements recommended?

6. **Display Considerations**:
   - Works well on: ${newLocation}
   - Mobile responsiveness tips
   - Animation suggestions (if any)

Format as detailed, actionable design brief. Be specific about colors, placement, and visual hierarchy.`;

      const responseText = await generateText(prompt, { maxTokens: 700, temperature: 0.8 });

      const bannerDesign = responseText || 'Unable to generate banner design';
      setGeneratedHeroBannerDesign(bannerDesign);
      showToast('✅ Hero banner design created!', 'success');
    } catch (error) {
      console.error('Failed to generate hero banner:', error);
      showToast('⚠️ Failed to generate banner design', 'error');
    }
    setHeroBannerDesignLoading(false);
  };

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
    setGeneratedHeroBannerDesign('');
    setCustomBannerRequirements('');
    showToast('✅ Banner created!', 'success');
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
            placeholder="Banner title (e.g., Summer Promotion, Refer & Earn)"
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

          {/* AI Hero Banner Design Section */}
          <div style={{ padding: '16px', background: '#E8F5E9', borderRadius: '8px', border: '2px solid #81C784' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '10px' }}>
              🎨 AI Hero Banner Designer
            </div>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
              Generate professional hero banner (1200x400px) design specifications before creating.
            </p>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
                💡 Your Design Requirements (Optional)
              </label>
              <textarea
                placeholder="Add your custom requirements or design preferences"
                value={customBannerRequirements}
                onChange={(e) => setCustomBannerRequirements(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #81C784',
                  borderRadius: '6px',
                  fontSize: '13px',
                  minHeight: '60px',
                  fontFamily: 'system-ui',
                  resize: 'vertical',
                }}
                maxLength={300}
              />
              <div style={{ fontSize: '11px', color: '#666', marginTop: '6px', fontStyle: 'italic' }}>
                Examples: "Use vibrant colors", "Modern minimalist style", "Include nature icons", "Gradient background", "Professional look", "Playful and fun"
              </div>
            </div>

            <button
              onClick={handleGenerateHeroBannerDesign}
              disabled={heroBannerDesignLoading || !newTitle.trim() || !newSubtitle.trim()}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: heroBannerDesignLoading ? '#ddd' : 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: heroBannerDesignLoading ? 'wait' : 'pointer',
                fontSize: '14px',
                boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
                transform: 'translateY(0)',
                transition: 'all 0.2s',
                marginBottom: '12px',
              }}
              onMouseDown={(e) => {
                if (!heroBannerDesignLoading) {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(2px)';
                }
              }}
              onMouseUp={(e) => {
                if (!heroBannerDesignLoading) {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                }
              }}
            >
              {heroBannerDesignLoading ? '🎨 Designing Banner...' : '✨ Design Banner'}
            </button>

            {generatedHeroBannerDesign && (
              <div style={{ padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #81C784', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#1B5E20', marginBottom: '8px' }}>
                  ✓ Banner Design Guide (1200x400px)
                </div>
                <div style={{ fontSize: '12px', color: '#333', lineHeight: '1.6', whiteSpace: 'pre-wrap', maxHeight: '250px', overflow: 'auto' }}>
                  {generatedHeroBannerDesign}
                </div>
                <p style={{ fontSize: '11px', color: '#666', marginTop: '8px', fontStyle: 'italic' }}>
                  💡 Use this design guide in Canva, Photoshop, Figma, or any design tool
                </p>
              </div>
            )}
          </div>

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
