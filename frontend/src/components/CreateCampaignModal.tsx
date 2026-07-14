import React, { useState, useEffect } from 'react';

interface CreateCampaignModalProps {
  isOpen: boolean;
  adType: 'hero-banner' | 'in-feed-ads';
  onClose: () => void;
  onCreate: (campaign: any) => void;
}

const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({ isOpen, adType, onClose, onCreate }) => {
  const [campaignTitle, setCampaignTitle] = useState('');
  const [aiSuggestedTitle, setAiSuggestedTitle] = useState('Summer Cleaning Special');
  const [campaignUrl, setCampaignUrl] = useState('');
  const [urlType, setUrlType] = useState<'website' | 'instagram' | 'facebook' | 'tiktok'>('website');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageQuality, setImageQuality] = useState<'high' | 'warning' | 'low' | null>(null);
  const [duration, setDuration] = useState(adType === 'hero-banner' ? 2 : 1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [budget, setBudget] = useState(500);
  const [endDate, setEndDate] = useState('');
  const [aiRecommendation, setAiRecommendation] = useState('');
  const [addMultipleAds, setAddMultipleAds] = useState(false);
  const [campaignCount, setCampaignCount] = useState(1);
  const [bundleDiscount, setBundleDiscount] = useState(0);

  // Calculate end date based on duration
  useEffect(() => {
    const start = new Date(startDate);
    const end = new Date(start.getTime() + duration * 7 * 24 * 60 * 60 * 1000);
    setEndDate(end.toISOString().split('T')[0]);
  }, [startDate, duration]);

  // AI recommendation with budget insights
  const generateAiRecommendation = () => {
    let rec = '';

    if (budget < 300) {
      rec = `🌱 Starter Reach - Good for testing. You'll reach ~${Math.round(2000 * (budget / 500))} users.`;
    } else if (budget < 600) {
      rec = `📈 Strong Visibility - Recommended tier. You'll reach ~${Math.round(4000 * (budget / 500))} users. Best ROI typically here.`;
    } else if (budget < 1000) {
      rec = `👑 Premium Reach - You'll reach ~${Math.round(6000 * (budget / 500))} users. Expect 5-8% CTR.`;
    } else {
      rec = `🚀 Enterprise Reach - You'll reach ~${Math.round(8000 * (budget / 500))} users. Expect 6-10% CTR.`;
    }

    if (addMultipleAds && campaignCount > 1) {
      const discount = campaignCount === 2 ? 15 : 20;
      rec += ` 🎁 Save ${discount}% with bundle!`;
    }

    setAiRecommendation(rec);
  };

  useEffect(() => {
    generateAiRecommendation();
  }, [budget, duration, adType, campaignCount, addMultipleAds]);

  // Calculate bundle discount
  useEffect(() => {
    if (addMultipleAds && campaignCount > 1) {
      setBundleDiscount(campaignCount === 2 ? 15 : 20);
    } else {
      setBundleDiscount(0);
    }
  }, [campaignCount, addMultipleAds]);

  // Generate AI title
  const generateAiTitle = () => {
    const titles: string[] = [
      'Summer Cleaning Special',
      'Professional Hair Transformation',
      'Electric Excellence',
      'Home Renovation Magic',
      'Tutoring Success',
      'Beauty & Wellness',
      'Quality Service Delivered',
    ];
    const random = titles[Math.floor(Math.random() * titles.length)];
    setAiSuggestedTitle(random);
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File too large! Max 5MB.');
      return;
    }

    const img = new Image();
    img.onload = () => {
      const requiredWidth = adType === 'hero-banner' ? 1200 : 500;
      const requiredHeight = adType === 'hero-banner' ? 300 : 250;
      const pixelCount = img.width * img.height;
      const bytesPerPixel = file.size / pixelCount;

      let quality: 'high' | 'warning' | 'low' = 'high';
      if (bytesPerPixel < 0.5) quality = 'low';
      else if (bytesPerPixel < 1) quality = 'warning';

      if (img.width < requiredWidth || img.height < requiredHeight) {
        quality = 'low';
      }

      setImageQuality(quality);
      setImage(file);
      setImagePreview(img.src);
    };

    img.src = URL.createObjectURL(file);
  };

  const suggestedDimensions = adType === 'hero-banner' ? '1200×300px' : '500×250px';
  const totalCost = budget * campaignCount * (1 - bundleDiscount / 100);

  if (!isOpen) return null;

  return (
    <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflowY: 'auto'}}>
      <div style={{background: 'white', borderRadius: '12px', padding: '32px', maxWidth: '700px', width: '90%', margin: '20px auto', maxHeight: '95vh', overflowY: 'auto'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
          <h2 style={{margin: 0, fontSize: '24px', fontWeight: '700'}}>Create Smart Campaign</h2>
          <button onClick={onClose} style={{background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'}}>✕</button>
        </div>

        {/* Campaign Type Badge */}
        <div style={{background: '#FFF8F5', border: '1px solid #FFD5C0', borderRadius: '8px', padding: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px'}}>
          <span>{adType === 'hero-banner' ? '🌟' : '📰'}</span>
          <span style={{fontWeight: '600', color: '#FF6B35'}}>{adType === 'hero-banner' ? 'Hero Banner Ad' : 'In-Feed Ad'}</span>
          <span style={{marginLeft: 'auto', fontSize: '11px', background: '#FF6B35', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: '600'}}>REQUIRES APPROVAL</span>
        </div>

        {/* PREVIEW AT TOP - Easy access */}
        {imagePreview && (
          <div style={{marginBottom: '24px', background: '#f9f9f9', border: '2px solid #FFD5C0', borderRadius: '8px', padding: '16px'}}>
            <div style={{fontWeight: '600', marginBottom: '12px', fontSize: '14px'}}>📱 Campaign Preview</div>
            <img src={imagePreview} alt="preview" style={{width: '100%', maxHeight: '200px', borderRadius: '6px', objectFit: 'cover'}} />
            <div style={{marginTop: '12px', fontSize: '12px', color: '#666'}}>
              <strong>{campaignTitle || 'Your Campaign Title'}</strong><br/>
              Runs {startDate} to {endDate} • SGD ${budget}/week
            </div>
            {imageQuality === 'low' && (
              <div style={{marginTop: '8px', fontSize: '12px', color: '#E74C3C', fontWeight: '600'}}>
                ⚠️ Low resolution - Try {suggestedDimensions} at higher quality
              </div>
            )}
          </div>
        )}

        {/* Campaign Title */}
        <div style={{marginBottom: '20px'}}>
          <label style={{display: 'block', fontWeight: '600', marginBottom: '8px'}}>Campaign Title</label>
          <div style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
            <input
              type="text"
              placeholder="Enter campaign title"
              value={campaignTitle}
              onChange={(e) => setCampaignTitle(e.target.value)}
              style={{flex: 1, padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px'}}
            />
            <button
              onClick={generateAiTitle}
              style={{padding: '10px 16px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px'}}
            >
              ✨ Suggest
            </button>
          </div>
          {aiSuggestedTitle && (
            <button
              onClick={() => setCampaignTitle(aiSuggestedTitle)}
              style={{width: '100%', padding: '10px', background: '#FFF8F5', border: '1px solid #FFD5C0', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#FF6B35', fontSize: '13px'}}
            >
              Use: "{aiSuggestedTitle}"
            </button>
          )}
        </div>

        {/* Campaign URL */}
        <div style={{marginBottom: '20px'}}>
          <label style={{display: 'block', fontWeight: '600', marginBottom: '8px'}}>Where Should Clicks Go?</label>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px'}}>
            {(['website', 'instagram', 'facebook', 'tiktok'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setUrlType(type)}
                style={{
                  padding: '10px 8px',
                  background: urlType === type ? '#FF6B35' : '#f5f5f5',
                  color: urlType === type ? 'white' : '#333',
                  border: `2px solid ${urlType === type ? '#FF6B35' : '#ddd'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '12px',
                }}
              >
                {type === 'website' && '🌐'}
                {type === 'instagram' && '📷'}
                {type === 'facebook' && '👍'}
                {type === 'tiktok' && '🎵'}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder={`Paste your ${urlType} link...`}
            value={campaignUrl}
            onChange={(e) => setCampaignUrl(e.target.value)}
            style={{width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box'}}
          />
        </div>

        {/* Image Upload */}
        <div style={{marginBottom: '20px'}}>
          <label style={{display: 'block', fontWeight: '600', marginBottom: '8px'}}>Upload Image</label>
          <p style={{fontSize: '12px', color: '#666', marginBottom: '12px'}}>Required: {suggestedDimensions} • Max 5MB</p>
          <div style={{border: '2px dashed #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center', cursor: 'pointer', background: '#f9f9f9'}}>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{display: 'none'}}
              id="image-upload"
            />
            <label htmlFor="image-upload" style={{cursor: 'pointer', display: 'block'}}>
              <div style={{fontSize: '24px', marginBottom: '8px'}}>📸</div>
              <div style={{fontWeight: '600', marginBottom: '4px'}}>Click to upload</div>
              <div style={{fontSize: '12px', color: '#666'}}>PNG, JPG • Auto-resize available</div>
            </label>
          </div>
          {imageQuality && !imagePreview && (
            <div style={{marginTop: '8px', fontSize: '12px', fontWeight: '600', color: imageQuality === 'high' ? '#27AE60' : imageQuality === 'warning' ? '#F39C12' : '#E74C3C'}}>
              {imageQuality === 'high' && '✅ Great quality'}
              {imageQuality === 'warning' && '⚠️ Could be sharper'}
              {imageQuality === 'low' && '❌ Too low resolution'}
            </div>
          )}
        </div>

        {/* Duration & Budget */}
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px'}}>
          {/* Duration */}
          <div>
            <label style={{display: 'block', fontWeight: '600', marginBottom: '8px'}}>Duration</label>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
              <input
                type="range"
                min={adType === 'hero-banner' ? 2 : 1}
                max={12}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                style={{flex: 1}}
              />
              <span style={{fontWeight: '700', fontSize: '16px', color: '#FF6B35', minWidth: '45px'}}>{duration}w</span>
            </div>
            <div style={{fontSize: '12px', color: '#ddd', display: 'flex', justifyContent: 'space-between'}}>
              <span>{adType === 'hero-banner' ? '2w' : '1w'}</span>
              <span>12w</span>
            </div>
          </div>

          {/* Budget */}
          <div>
            <label style={{display: 'block', fontWeight: '600', marginBottom: '8px'}}>Budget</label>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
              <input
                type="range"
                min={100}
                max={2000}
                step={50}
                value={budget}
                onChange={(e) => setBudget(parseInt(e.target.value))}
                style={{flex: 1}}
              />
              <span style={{fontWeight: '700', fontSize: '16px', color: '#FF6B35', minWidth: '60px'}}>SGD ${budget}</span>
            </div>
            <div style={{fontSize: '12px', color: '#999'}}>
              {(budget / duration).toFixed(0)}/week
            </div>
          </div>
        </div>

        {/* Start/End Dates */}
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px'}}>
          <div>
            <label style={{fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px'}}>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box'}}
            />
          </div>
          <div>
            <label style={{fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px'}}>End Date</label>
            <input
              type="date"
              value={endDate}
              disabled
              style={{width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', background: '#f5f5f5'}}
            />
          </div>
        </div>

        {/* Multiple Ads */}
        <div style={{background: '#F0F8FF', border: '1px solid #B0D4FF', borderRadius: '8px', padding: '12px', marginBottom: '20px', cursor: 'pointer'}} onClick={() => setAddMultipleAds(!addMultipleAds)}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <input type="checkbox" checked={addMultipleAds} readOnly style={{width: '18px', height: '18px'}} />
            <label style={{fontWeight: '600', color: '#0066CC', cursor: 'pointer', margin: 0, flex: 1}}>Create Multiple Campaigns</label>
          </div>
          {addMultipleAds && (
            <div style={{marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #B0D4FF'}}>
              <div style={{fontSize: '12px', color: '#666', marginBottom: '8px'}}>How many campaigns?</div>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <button onClick={() => setCampaignCount(Math.max(1, campaignCount - 1))} style={{padding: '6px 12px', background: '#ddd', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600'}}>−</button>
                <span style={{fontWeight: '700', fontSize: '20px', color: '#0066CC', minWidth: '40px', textAlign: 'center'}}>{campaignCount}</span>
                <button onClick={() => setCampaignCount(Math.min(5, campaignCount + 1))} style={{padding: '6px 12px', background: '#0066CC', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600'}}>+</button>
              </div>
              {campaignCount > 1 && (
                <div style={{marginTop: '8px', padding: '8px', background: 'white', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: '#27AE60'}}>
                  🎁 Save {bundleDiscount}% on total!
                </div>
              )}
            </div>
          )}
        </div>

        {/* AI Recommendation */}
        {aiRecommendation && (
          <div style={{background: '#FFF8F5', border: '1px solid #FFD5C0', borderRadius: '8px', padding: '12px', marginBottom: '20px', fontSize: '13px', color: '#333'}}>
            {aiRecommendation}
          </div>
        )}

        {/* Payment Summary */}
        <div style={{background: '#FFF8F5', border: '1px solid #FFD5C0', borderRadius: '8px', padding: '16px', marginBottom: '20px'}}>
          <div style={{fontWeight: '600', marginBottom: '12px', fontSize: '14px'}}>Payment Summary</div>
          <div style={{fontSize: '13px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between'}}>
            <span>Subtotal ({campaignCount} campaign{campaignCount > 1 ? 's' : ''})</span>
            <span>SGD ${(budget * campaignCount).toFixed(0)}</span>
          </div>
          {bundleDiscount > 0 && (
            <div style={{fontSize: '13px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', color: '#27AE60', fontWeight: '600'}}>
              <span>Bundle Discount ({bundleDiscount}%)</span>
              <span>-SGD ${(budget * campaignCount * bundleDiscount / 100).toFixed(0)}</span>
            </div>
          )}
          <div style={{fontSize: '14px', fontWeight: '700', display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #FFD5C0', color: '#FF6B35'}}>
            <span>Total (held until approval)</span>
            <span>SGD ${totalCost.toFixed(0)}</span>
          </div>
        </div>

        {/* Info Box */}
        <div style={{background: '#E8F5E9', border: '1px solid #81C784', borderRadius: '8px', padding: '12px', marginBottom: '20px', fontSize: '12px', color: '#333'}}>
          <div style={{fontWeight: '600', marginBottom: '6px'}}>✅ What Happens Next</div>
          <ul style={{margin: 0, paddingLeft: '16px', lineHeight: '1.6'}}>
            <li>Payment held by Stripe until admin approves</li>
            <li>Once approved → auto-live</li>
            <li>Declined → auto-refunded</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{display: 'flex', gap: '12px'}}>
          <button
            onClick={onClose}
            style={{flex: 1, padding: '12px', background: '#f5f5f5', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '14px'}}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!campaignTitle || !campaignUrl || !image) {
                alert('Please fill in all required fields');
                return;
              }
              // Go to Stripe checkout
              window.location.href = `/stripe-checkout?campaigns=${campaignCount}&budget=${budget}&discount=${bundleDiscount}&type=${adType}`;
            }}
            style={{flex: 1, padding: '12px', background: '#FF6B35', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '14px'}}
          >
            💳 Proceed to Payment
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCampaignModal;
