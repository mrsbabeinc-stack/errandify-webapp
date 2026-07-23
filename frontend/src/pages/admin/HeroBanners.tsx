import React, { useState, useEffect } from 'react';
import { generateText } from '../../utils/aiClient';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Banner {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  imageUrl?: string | null;
  ctaText: string;
  ctaLink: string;
  status: 'active' | 'scheduled' | 'archived';
  displayLocation: string;
  createdAt: string;
  activeFrom?: string | null;
  activeTo?: string | null;
}

export default function HeroBanners() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newCTAText, setNewCTAText] = useState('');
  const [newCTALink, setNewCTALink] = useState('/browse');
  const [newLocation, setNewLocation] = useState('home');
  const [newEmoji, setNewEmoji] = useState('📢');
  const [newActiveFrom, setNewActiveFrom] = useState('');
  const [newActiveTo, setNewActiveTo] = useState('');
  const [saving, setSaving] = useState(false);

  // Hero banner AI design
  const [heroBannerDesignLoading, setHeroBannerDesignLoading] = useState(false);
  const [generatedHeroBannerDesign, setGeneratedHeroBannerDesign] = useState('');
  const [customBannerRequirements, setCustomBannerRequirements] = useState('');

  /**
   * Banners used to live in localStorage and were never rendered anywhere in
   * the app — creating one changed nothing a user could see. They now go to
   * the server, and GET /api/banners?location=… is the read side.
   */
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const loadBanners = async () => {
    try {
      const res = await fetch(`${API_URL}/api/marcom/banners`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setBanners(json.data || []);
    } catch (err) {
      console.error('Could not load banners:', err);
      showToast('Could not load banners', 'error');
    }
  };

  useEffect(() => { loadBanners(); }, []);

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

  const handleCreateBanner = async () => {
    if (!newTitle.trim() || !newCTAText.trim()) {
      showToast('⚠️ Title and button text are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/marcom/banners`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: newTitle,
          subtitle: newSubtitle,
          image: newEmoji || '📢',
          ctaText: newCTAText,
          ctaLink: newCTALink || '/browse',
          displayLocation: newLocation,
          status: 'scheduled',
          activeFrom: newActiveFrom || null,
          activeTo: newActiveTo || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);

      await loadBanners();
      setNewTitle('');
      setNewSubtitle('');
      setNewCTAText('');
      setNewCTALink('/browse');
      setNewActiveFrom('');
      setNewActiveTo('');
      setGeneratedHeroBannerDesign('');
      setCustomBannerRequirements('');
      showToast('✅ Banner saved as scheduled — press Publish to make it live', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not create that banner', 'error');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Publish/archive is what actually puts a banner in front of users:
   * /api/banners returns only 'active' rows inside their date window.
   */
  const handleSetStatus = async (banner: Banner, status: Banner['status']) => {
    try {
      const res = await fetch(`${API_URL}/api/marcom/banners/${banner.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      await loadBanners();
      showToast(
        status === 'active' ? '✅ Live now on ' + banner.displayLocation
          : status === 'archived' ? '📦 Archived — no longer shown'
          : '📅 Back to scheduled',
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Could not change that banner', 'error');
    }
  };

  const handleDeleteBanner = async (banner: Banner) => {
    if (!window.confirm(`Delete the banner "${banner.title}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/marcom/banners/${banner.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      await loadBanners();
      showToast('🗑️ Banner deleted', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not delete that banner', 'error');
    }
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
          {/* Where the button goes. This was hardcoded to /browse, so every
              banner's call to action led to the same page. */}
          <input
            type="text"
            placeholder="CTA link (e.g., /referral)"
            value={newCTALink}
            onChange={(e) => setNewCTALink(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '12px' }}>
            <input
              type="text"
              placeholder="📢"
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              maxLength={4}
              title="Emoji shown on the banner"
              style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '18px', textAlign: 'center' }}
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
          </div>
          {/* The window a banner runs for. The interface carried activeFrom
              and activeTo but the form never asked for either. */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label style={{ fontSize: '11px', color: '#666' }}>
              Live from (optional)
              <input
                type="datetime-local"
                value={newActiveFrom}
                onChange={(e) => setNewActiveFrom(e.target.value)}
                style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', width: '100%' }}
              />
            </label>
            <label style={{ fontSize: '11px', color: '#666' }}>
              Live until (optional)
              <input
                type="datetime-local"
                value={newActiveTo}
                onChange={(e) => setNewActiveTo(e.target.value)}
                style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', width: '100%' }}
              />
            </label>
          </div>

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
            disabled={saving}
            style={{
              padding: '10px',
              background: saving ? '#ccc' : 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : '+ Create Banner'}
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
                  Button: "{banner.ctaText}" → {banner.ctaLink} • Location: {banner.displayLocation}
                </div>
                <div style={{ fontSize: '11px', color: '#999' }}>
                  Created: {new Date(banner.createdAt).toLocaleDateString()}
                  {banner.activeFrom && ` • From ${new Date(banner.activeFrom).toLocaleString()}`}
                  {banner.activeTo && ` • Until ${new Date(banner.activeTo).toLocaleString()}`}
                </div>
              </div>
              {/* Every card used to be read-only: no publish, no archive, no
                  delete, so a banner could be created and never changed. */}
              <div style={{ display: 'grid', gap: '6px', height: 'fit-content' }}>
                <span style={{
                  padding: '6px 10px',
                  background: statusColors[banner.status],
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}>
                  {banner.status.toUpperCase()}
                </span>
                {banner.status !== 'active' && (
                  <button
                    onClick={() => handleSetStatus(banner, 'active')}
                    style={{ padding: '4px 10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Publish
                  </button>
                )}
                {banner.status !== 'archived' && (
                  <button
                    onClick={() => handleSetStatus(banner, 'archived')}
                    style={{ padding: '4px 10px', background: '#757575', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Archive
                  </button>
                )}
                <button
                  onClick={() => handleDeleteBanner(banner)}
                  style={{ padding: '4px 10px', background: '#F44336', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>
    </AdminLayout>
  );
}
