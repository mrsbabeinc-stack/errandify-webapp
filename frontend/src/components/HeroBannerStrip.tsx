import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * The read side of admin → Communications → Hero Banners.
 *
 * The admin screen has always been able to author banners, but nothing in the
 * app rendered them — they were saved to localStorage and stayed there. This
 * is the missing half: it shows whatever is live right now for a given screen.
 *
 * Renders nothing at all when there is no live banner. A promotional strip
 * that shows an empty placeholder is worse than one that isn't there.
 */

interface Banner {
  id: number;
  title: string;
  subtitle: string | null;
  image: string;
  imageUrl: string | null;
  ctaText: string;
  ctaLink: string;
}

export default function HeroBannerStrip({ location = 'home' }: { location?: string }) {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/banners?location=${encodeURIComponent(location)}`
        );
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setBanners(json.data || []);
      } catch {
        // A banner is decoration. If it cannot load, the page carries on.
      }
    })();
    return () => { cancelled = true; };
  }, [location]);

  if (banners.length === 0) return null;

  const go = (link: string) => {
    // Internal routes go through the router; anything else opens as a link,
    // so a campaign can point at an external page without breaking the SPA.
    if (link.startsWith('/')) navigate(link);
    else window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      {banners.map((b) => (
        <div
          key={b.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #FFF3EC 0%, #FFE4C4 100%)',
            border: '1px solid #FFD9B3',
          }}
        >
          {b.imageUrl ? (
            <img
              src={b.imageUrl}
              alt=""
              style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
            />
          ) : (
            <div style={{ fontSize: '32px', flexShrink: 0 }} aria-hidden="true">{b.image}</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: '#3B2A20', fontSize: '14px' }}>{b.title}</div>
            {b.subtitle && (
              <div style={{ fontSize: '12px', color: '#7A5C4A' }}>{b.subtitle}</div>
            )}
          </div>
          <button
            onClick={() => go(b.ctaLink)}
            style={{
              flexShrink: 0,
              padding: '8px 14px',
              background: '#FF6B35',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {b.ctaText}
          </button>
        </div>
      ))}
    </div>
  );
}
