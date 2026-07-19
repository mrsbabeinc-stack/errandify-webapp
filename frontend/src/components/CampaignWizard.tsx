import React, { useState } from 'react';

interface CampaignData {
  id: string;
  type: 'hero-banner' | 'in-feed-ads';
  title: string;
  bio?: string;
  url: string;
  imageUrl?: string;
  budget: number;
  duration: number;
  startDate: string;
  endDate: string;
}

interface CampaignWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCampaignSubmit?: (campaigns: CampaignData[]) => void;
}

const CampaignWizard: React.FC<CampaignWizardProps> = ({ isOpen, onClose, onCampaignSubmit }) => {
  const [step, setStep] = useState<'package-setup' | 'campaign-details' | 'refund-warning'>('package-setup');
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [currentCampaign, setCurrentCampaign] = useState<Partial<CampaignData> | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [pendingSubmission, setPendingSubmission] = useState<CampaignData[] | null>(null);

  // Reset to step 1 when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setStep('package-setup');
      setPendingSubmission(null);
    }
  }, [isOpen]);

  // Package setup state
  const [selectedTypes, setSelectedTypes] = useState<Set<'hero-banner' | 'in-feed-ads'>>(new Set());

  // Campaign detail states
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignUrl, setCampaignUrl] = useState('');
  const [urlType, setUrlType] = useState<'website' | 'instagram' | 'facebook' | 'tiktok'>('website');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageQuality, setImageQuality] = useState<'high' | 'warning' | 'low' | null>(null);
  const [campaignBio, setCampaignBio] = useState('');
  const [biaSuggestion, setBioSuggestion] = useState('');
  const [titleSpellCheck, setTitleSpellCheck] = useState('');
  const [bioSpellCheck, setBioSpellCheck] = useState('');
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [durationSuggestion, setDurationSuggestion] = useState('');
  const [duration, setDuration] = useState(2);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [budget, setBudget] = useState(500);
  const [endDate, setEndDate] = useState('');
  const [titleSuggestion, setTitleSuggestion] = useState('');
  const [urlWarning, setUrlWarning] = useState('');
  const [formIsValid, setFormIsValid] = useState(false);

  // Check for upcoming holidays and suggest longer duration
  const checkUpcomingHolidays = (startDate: Date) => {
    const holidays = [
      { date: '2026-02-10', name: 'Chinese New Year', suggestWeeks: 4 },
      { date: '2026-04-10', name: 'Good Friday', suggestWeeks: 3 },
      { date: '2026-05-01', name: 'Labour Day', suggestWeeks: 3 },
      { date: '2026-05-24', name: 'Vesak Day', suggestWeeks: 3 },
      { date: '2026-08-09', name: 'National Day', suggestWeeks: 3 },
      { date: '2026-10-24', name: 'Deepavali', suggestWeeks: 3 },
      { date: '2026-12-25', name: 'Christmas Day', suggestWeeks: 4 },
      { date: '2026-03-27', name: 'School Term Break', suggestWeeks: 3 },
      { date: '2026-06-04', name: 'School Mid-Year Break', suggestWeeks: 3 },
      { date: '2026-11-21', name: 'School Year-End Break', suggestWeeks: 4 },
    ];

    const endDate = new Date(startDate.getTime() + duration * 7 * 24 * 60 * 60 * 1000);

    for (const holiday of holidays) {
      const holidayDate = new Date(holiday.date);
      if (holidayDate >= startDate && holidayDate <= endDate) {
        setDurationSuggestion(`📅 ${holiday.name} is during your campaign! Consider extending to ${holiday.suggestWeeks} weeks to maximize reach during the holiday period.`);
        return;
      }
    }

    setDurationSuggestion('');
  };

  // Calculate end date
  React.useEffect(() => {
    if (currentCampaign) {
      const start = new Date(startDate);
      const end = new Date(start.getTime() + duration * 7 * 24 * 60 * 60 * 1000);
      setEndDate(end.toISOString().split('T')[0]);
      checkUpcomingHolidays(start);
    }
  }, [startDate, duration, currentCampaign]);

  // AI Validation for title
  React.useEffect(() => {
    if (campaignTitle.trim().length < 5) {
      setTitleSuggestion('Your title is too short. Make it descriptive like "Summer Cleaning Special" or "Back-to-School Bundle"');
    } else if (campaignTitle.trim().length < 15) {
      setTitleSuggestion('Make it more descriptive! Add what you\'re offering like "Spring Cleaning Special" or "Hair Salon Makeover Package"');
    } else {
      setTitleSuggestion('');
    }
  }, [campaignTitle]);

  // AI Suggestion for bio
  React.useEffect(() => {
    if (!campaignBio.trim()) {
      setBioSuggestion('');
      setBioSpellCheck('');
    } else if (campaignBio.trim().length < 10) {
      setBioSuggestion('💡 Add more details! What makes this special? (e.g., "Limited time only" or "Free gift with purchase")');
    } else if (campaignBio.trim().length > 100) {
      setBioSuggestion('💡 Keep it snappy! One line is best for ads (aim for ~50-80 characters)');
    } else {
      setBioSuggestion('');
    }

    // Spell check for bio
    checkSpelling(campaignBio, setBioSpellCheck);
  }, [campaignBio]);

  // Spell check for title
  React.useEffect(() => {
    checkSpelling(campaignTitle, setTitleSpellCheck);
  }, [campaignTitle]);

  // Simple spell check - check for common misspellings
  const checkSpelling = (text: string, setSpellError: (msg: string) => void) => {
    const commonMisspellings: Record<string, string> = {
      'teh': 'the',
      'recieve': 'receive',
      'occured': 'occurred',
      'seperate': 'separate',
      'accomodate': 'accommodate',
      'bussiness': 'business',
      'adress': 'address',
      'recomend': 'recommend',
      'writting': 'writing',
      'unneccessary': 'unnecessary',
      'wich': 'which',
      'thier': 'their',
      'doesnt': 'doesn\'t',
      'cant': 'can\'t',
      'wont': 'won\'t',
      'shouldnt': 'shouldn\'t',
      'isnt': 'isn\'t',
      'arent': 'aren\'t',
      'havent': 'haven\'t',
    };

    const words = text.toLowerCase().split(/\s+/);
    for (const word of words) {
      const cleanWord = word.replace(/[.,!?;:]/g, '');
      if (commonMisspellings[cleanWord]) {
        setSpellError(`💡 Did you mean "${commonMisspellings[cleanWord]}"?`);
        return;
      }
    }
    setSpellError('');
  };

  // AI Validation for URL
  React.useEffect(() => {
    if (!campaignUrl.trim()) {
      setUrlWarning('');
    } else if (campaignUrl.length > 2000) {
      setUrlWarning('⚠️ URL is too long. Keep it under 2000 characters');
    } else if (urlType === 'website') {
      if (!campaignUrl.includes('.') || !campaignUrl.startsWith('http')) {
        setUrlWarning('⚠️ Website URL should start with http:// or https://');
      } else {
        setUrlWarning('');
      }
    } else if (urlType === 'instagram') {
      if (!campaignUrl.includes('instagram.com') && !campaignUrl.includes('ig.me')) {
        setUrlWarning('⚠️ Instagram link should include instagram.com or ig.me');
      } else {
        setUrlWarning('');
      }
    } else if (urlType === 'facebook') {
      if (!campaignUrl.includes('facebook.com') && !campaignUrl.includes('fb.com')) {
        setUrlWarning('⚠️ Facebook link should include facebook.com or fb.com');
      } else {
        setUrlWarning('');
      }
    } else if (urlType === 'tiktok') {
      if (!campaignUrl.includes('tiktok.com') && !campaignUrl.includes('vm.tiktok.com')) {
        setUrlWarning('⚠️ TikTok link should include tiktok.com or vm.tiktok.com');
      } else {
        setUrlWarning('');
      }
    }
  }, [campaignUrl, urlType]);

  // Validate entire form
  React.useEffect(() => {
    const isValid = campaignTitle.trim().length >= 15 &&
                   campaignUrl.trim().length > 0 &&
                   !urlWarning &&
                   image !== null &&
                   imageQuality !== 'low';
    setFormIsValid(isValid);
  }, [campaignTitle, campaignUrl, urlWarning, image, imageQuality]);

  // Step 1: Select campaign types to create
  const handleSelectType = (type: 'hero-banner' | 'in-feed-ads') => {
    const newTypes = new Set(selectedTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setSelectedTypes(newTypes);
  };

  // Start campaign details for first type
  const handleStartCampaigns = () => {
    if (selectedTypes.size === 0) {
      alert('Please select at least one ad type');
      return;
    }

    // Start with first selected type
    const firstType = Array.from(selectedTypes)[0];
    setCurrentCampaign({ type: firstType });
    setStep('campaign-details');
  };

  // Save campaign and go to next or summary
  const handleSaveCampaign = () => {
    if (!campaignTitle || !campaignUrl || !image) {
      alert('Please fill in all required fields');
      return;
    }

    const newCampaign: CampaignData = {
      id: `campaign-${Date.now()}`,
      type: currentCampaign?.type as 'hero-banner' | 'in-feed-ads',
      title: campaignTitle,
      bio: campaignBio || undefined,
      url: campaignUrl,
      imageUrl: imagePreview,
      budget,
      duration,
      startDate,
      endDate,
    };

    if (editingIndex !== null) {
      const updated = [...campaigns];
      updated[editingIndex] = newCampaign;
      setCampaigns(updated);
      setEditingIndex(null);
    } else {
      setCampaigns([...campaigns, newCampaign]);
    }

    // Find next type to fill
    const allTypes = Array.from(selectedTypes);
    const currentTypeIndex = allTypes.indexOf(currentCampaign?.type as 'hero-banner' | 'in-feed-ads');
    const nextTypeIndex = currentTypeIndex + 1;

    if (nextTypeIndex < allTypes.length) {
      // More types to add
      setCurrentCampaign({ type: allTypes[nextTypeIndex] });
      resetFormFields();
    } else {
      // All types done, check if we want to add multiple of same type
      step === 'campaign-details';
    }
  };

  const resetFormFields = () => {
    setCampaignTitle('');
    setCampaignBio('');
    setCampaignUrl('');
    setImage(null);
    setImagePreview('');
    setImageQuality(null);
    setDuration(2);
    setStartDate(new Date().toISOString().split('T')[0]);
    setBudget(500);
  };

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
      const requiredWidth = currentCampaign?.type === 'hero-banner' ? 1200 : 500;
      const requiredHeight = currentCampaign?.type === 'hero-banner' ? 300 : 250;
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

  const suggestedDimensions = currentCampaign?.type === 'hero-banner' ? '1200×300px' : '500×250px';
  const bundleDiscount = campaigns.length > 1 ? (campaigns.length === 2 ? 15 : 20) : 0;
  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
  const discountAmount = (totalBudget * bundleDiscount) / 100;
  const finalPrice = totalBudget - discountAmount;

  // Full screen ad preview modal
  const previewRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (showFullPreview && previewRef.current) {
      // Scroll to top immediately
      previewRef.current.scrollTop = 0;
      // Also scroll window to top as backup
      window.scrollTo(0, 0);
      // Force scroll after a tiny delay to ensure it takes effect
      setTimeout(() => {
        if (previewRef.current) {
          previewRef.current.scrollTop = 0;
        }
      }, 50);
    }
  }, [showFullPreview]);

  const FullAdPreview = () => {
    if (!showFullPreview || !imagePreview) return null;

    return (
      <div ref={previewRef} style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 2000, paddingTop: '60px', paddingBottom: '20px', paddingLeft: '20px', paddingRight: '20px', overflowY: 'auto'}}>
        {/* Close button - fixed at top */}
        <button
          onClick={() => setShowFullPreview(false)}
          style={{position: 'fixed', top: '20px', right: '30px', background: 'white', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 'bold', fontSize: '24px', color: '#333', zIndex: 2001, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', hover: {transform: 'scale(1.1)'}}}
          onMouseEnter={(e) => {e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = '#f0f0f0';}}
          onMouseLeave={(e) => {e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'white';}}
        >
          ✕
        </button>

        <div style={{position: 'relative', maxWidth: currentCampaign?.type === 'hero-banner' ? '900px' : '400px', width: '100%', maxHeight: 'fit-content'}}>

          {/* Hero Banner Full Preview */}
          {currentCampaign?.type === 'hero-banner' && (
            <div style={{background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.4)'}}>
              {/* Company profile header - Premium look */}
              <div style={{padding: '24px', background: 'linear-gradient(135deg, #f9f9f9 0%, #ffffff 100%)', borderBottom: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', gap: '16px'}}>
                <div style={{width: '56px', height: '56px', borderRadius: '12px', background: 'linear-gradient(135deg, #FF6B35, #FF8C5A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '24px', boxShadow: '0 4px 16px rgba(255,107,53,0.2)'}}>E</div>
                <div style={{flex: 1}}>
                  <div style={{fontWeight: '800', fontSize: '18px', color: '#1a1a1a'}}>Your Company</div>
                  <div style={{fontSize: '13px', color: '#666', marginTop: '2px'}}>Professional Services • 4.8 ⭐ (127 reviews)</div>
                </div>
              </div>

              {/* Hero banner image - 4:1 aspect ratio (1200x300) with overlay */}
              <div style={{position: 'relative', width: '100%', paddingBottom: '25%', background: 'linear-gradient(135deg, #FFF8F5 0%, #FFE5D9 100%)', overflow: 'hidden'}}>
                <img src={imagePreview} alt="hero banner" style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover'}} />
                {/* Subtle overlay for text readability */}
                <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 100%)'}}></div>
              </div>

              {/* Campaign info - What customers see */}
              <div style={{padding: '32px', background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)'}}>
                <div style={{fontWeight: '800', fontSize: '32px', color: '#1a1a1a', marginBottom: '16px', lineHeight: '1.2'}}>
                  {campaignTitle || 'Your Campaign Title'}
                </div>
                {campaignBio && (
                  <div style={{fontSize: '18px', color: '#666', marginBottom: '24px', lineHeight: '1.6', fontWeight: '500'}}>
                    {campaignBio}
                  </div>
                )}

                {/* CTA Button - what customers click */}
                <button style={{width: '100%', padding: '16px', background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '16px', cursor: 'pointer', boxShadow: '0 8px 24px rgba(255,107,53,0.3)', transition: 'all 0.3s ease'}}>
                  Discover More →
                </button>
              </div>
            </div>
          )}

          {/* In-Feed Ad Full Preview */}
          {currentCampaign?.type === 'in-feed-ads' && (
            <div style={{background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.4)'}}>
              {/* Social media header - Authentic look */}
              <div style={{padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e8e8e8', background: 'white'}}>
                <div style={{width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF6B35, #FF8C5A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '18px', boxShadow: '0 2px 8px rgba(255,107,53,0.15)'}}>E</div>
                <div style={{flex: 1}}>
                  <div style={{fontWeight: '700', fontSize: '15px', color: '#1a1a1a'}}>Your Company</div>
                  <div style={{fontSize: '12px', color: '#888', marginTop: '2px'}}>Sponsored • 2 hours ago</div>
                </div>
                <div style={{cursor: 'pointer', fontSize: '20px', color: '#ccc', padding: '4px 8px'}}>⋯</div>
              </div>

              {/* Image - Premium quality display */}
              <div style={{position: 'relative', width: '100%', background: 'linear-gradient(135deg, #f0f0f0 0%, #e8e8e8 100%)', overflow: 'hidden'}}>
                <img src={imagePreview} alt="feed ad" style={{width: '100%', height: 'auto', maxHeight: '500px', objectFit: 'cover', display: 'block'}} />
              </div>

              {/* Engagement interactions */}
              <div style={{padding: '12px 16px', display: 'flex', gap: '16px', fontSize: '14px', color: '#666', borderBottom: '1px solid #e8e8e8', background: '#fafafa'}}>
                <span style={{cursor: 'pointer', transition: 'all 0.2s ease'}}>👍 2.4K</span>
                <span style={{cursor: 'pointer', transition: 'all 0.2s ease'}}>💬 234</span>
                <span style={{cursor: 'pointer', transition: 'all 0.2s ease'}}>↗️ 123</span>
                <span style={{marginLeft: 'auto', cursor: 'pointer'}}>🔖</span>
              </div>

              {/* Caption - What customers see */}
              <div style={{padding: '20px', background: 'white'}}>
                <div style={{marginBottom: '16px'}}>
                  <span style={{fontWeight: '800', color: '#1a1a1a', fontSize: '16px'}}>{campaignTitle || 'Your Company'}</span>
                  {campaignBio && (
                    <div style={{color: '#666', marginTop: '8px', fontSize: '15px', lineHeight: '1.5'}}>{campaignBio}</div>
                  )}
                </div>

                {/* Engagement metrics - what customers see */}
                <div style={{display: 'flex', gap: '16px', paddingTop: '12px', borderTop: '1px solid #e0e0e0', fontSize: '13px', color: '#666', marginBottom: '16px'}}>
                  <span>👍 2.4K likes</span>
                  <span>💬 234 comments</span>
                  <span>↗️ 123 shares</span>
                </div>

                {/* CTA Button */}
                <button style={{width: '100%', padding: '14px', background: 'linear-gradient(135deg, #FF6B35, #FF8C5A)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255,107,53,0.2)', transition: 'all 0.2s ease'}}>
                  Learn More
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  // STEP 1: Select Campaign Types
  if (step === 'package-setup') {
    return (
      <>
      <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
        <div style={{background: 'white', borderRadius: '12px', padding: '40px', maxWidth: '750px', width: '90%'}}>
          <h1 style={{margin: '0 0 8px 0', fontSize: '32px', fontWeight: '700', color: '#333'}}>📦 Build Your Ad Campaign</h1>
          <p style={{margin: '0 0 12px 0', fontSize: '15px', color: '#666'}}>Select one or both ad types for your package</p>

          {/* Pro Tip Banner */}
          <div style={{background: '#FFF8F5', border: '2px solid #FF6B35', borderRadius: '8px', padding: '16px', marginBottom: '32px', display: 'flex', alignItems: 'start', gap: '12px'}}>
            <div style={{fontSize: '20px'}}>💡</div>
            <div>
              <div style={{fontWeight: '700', color: '#FF6B35', marginBottom: '4px'}}>Pro Tip: Combine Both Ads for Maximum Impact</div>
              <div style={{fontSize: '13px', color: '#666', lineHeight: '1.6'}}>
                <strong>Hero Banner</strong> on your profile makes a great first impression.<br/>
                <strong>In-Feed Ads</strong> reach users while they browse.<br/>
                <span style={{color: '#27AE60', fontWeight: '600'}}>Bundle both → Save 15% on total cost!</span>
              </div>
            </div>
          </div>

          {/* Selection Cards */}
          <div style={{marginBottom: '12px', fontSize: '13px', fontWeight: '600', color: '#666'}}>
            Select ad types (click to toggle):
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px'}}>
            {/* Hero Banner */}
            <div
              onClick={() => handleSelectType('hero-banner')}
              style={{
                border: selectedTypes.has('hero-banner') ? '3px solid #FF6B35' : '2px solid #ddd',
                borderRadius: '12px',
                padding: '24px',
                cursor: 'pointer',
                background: selectedTypes.has('hero-banner') ? '#FFF8F5' : 'white',
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!selectedTypes.has('hero-banner')) {
                  e.currentTarget.style.borderColor = '#FFB399';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,107,53,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (!selectedTypes.has('hero-banner')) {
                  e.currentTarget.style.borderColor = '#ddd';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {selectedTypes.has('hero-banner') && (
                <div style={{position: 'absolute', top: '12px', right: '12px', background: '#27AE60', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '16px'}}>
                  ✓
                </div>
              )}
              <div style={{fontSize: '40px', marginBottom: '12px'}}>🌟</div>
              <h3 style={{margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700'}}>Hero Banner</h3>
              <p style={{margin: '0 0 16px 0', fontSize: '13px', color: '#666', lineHeight: '1.5'}}>
                Showcase at the top of your profile. First impression matters!
              </p>
              <div style={{fontSize: '12px', color: '#999', marginBottom: '12px'}}>
                • 1200×300px size<br/>
                • Min 2 weeks<br/>
                • From SGD $280/week
              </div>
              <div style={{fontSize: '14px', fontWeight: '700', color: selectedTypes.has('hero-banner') ? '#FF6B35' : '#999'}}>
                {selectedTypes.has('hero-banner') ? '✅ Added to package' : '+ Add to package'}
              </div>
            </div>

            {/* In-Feed Ads */}
            <div
              onClick={() => handleSelectType('in-feed-ads')}
              style={{
                border: selectedTypes.has('in-feed-ads') ? '3px solid #FF6B35' : '2px solid #ddd',
                borderRadius: '12px',
                padding: '24px',
                cursor: 'pointer',
                background: selectedTypes.has('in-feed-ads') ? '#FFF8F5' : 'white',
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!selectedTypes.has('in-feed-ads')) {
                  e.currentTarget.style.borderColor = '#FFB399';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,107,53,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (!selectedTypes.has('in-feed-ads')) {
                  e.currentTarget.style.borderColor = '#ddd';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {selectedTypes.has('in-feed-ads') && (
                <div style={{position: 'absolute', top: '12px', right: '12px', background: '#27AE60', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '16px'}}>
                  ✓
                </div>
              )}
              <div style={{fontSize: '40px', marginBottom: '12px'}}>📰</div>
              <h3 style={{margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700'}}>In-Feed Ads</h3>
              <p style={{margin: '0 0 16px 0', fontSize: '13px', color: '#666', lineHeight: '1.5'}}>
                Appear naturally between errands. Reach active users!
              </p>
              <div style={{fontSize: '12px', color: '#999', marginBottom: '12px'}}>
                • 500×250px size<br/>
                • Min 1 week<br/>
                • From SGD $180/week
              </div>
              <div style={{fontSize: '14px', fontWeight: '700', color: selectedTypes.has('in-feed-ads') ? '#FF6B35' : '#999'}}>
                {selectedTypes.has('in-feed-ads') ? '✅ Added to package' : '+ Add to package'}
              </div>
            </div>
          </div>

          {/* Bundle Discount Display */}
          <div style={{marginBottom: '24px'}}>
            {selectedTypes.size === 0 && (
              <div style={{background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '8px', padding: '16px', textAlign: 'center', color: '#999'}}>
                <div style={{fontSize: '12px'}}>Select at least one ad type to continue</div>
              </div>
            )}
            {selectedTypes.size === 1 && (
              <div style={{background: '#E8F5E9', border: '1px solid #81C784', borderRadius: '8px', padding: '16px'}}>
                <div style={{fontWeight: '600', color: '#27AE60', marginBottom: '4px'}}>Single Campaign Selected</div>
                <div style={{fontSize: '13px', color: '#666'}}>
                  💡 Tip: Add another ad type to get <span style={{fontWeight: '700', color: '#FF6B35'}}>15% bundle discount!</span>
                </div>
              </div>
            )}
            {selectedTypes.size === 2 && (
              <div style={{background: '#E8F5E9', border: '2px solid #27AE60', borderRadius: '8px', padding: '16px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
                  <span style={{fontSize: '24px'}}>🎁</span>
                  <div style={{fontWeight: '700', color: '#27AE60', fontSize: '16px'}}>Bundle Deal Activated!</div>
                </div>
                <div style={{fontSize: '13px', color: '#666', marginBottom: '8px'}}>
                  You're combining Hero Banner + In-Feed Ads
                </div>
                <div style={{fontSize: '15px', fontWeight: '700', color: '#FF6B35'}}>
                  Save 15% on your total package
                </div>
                <div style={{fontSize: '12px', color: '#666', marginTop: '8px'}}>
                  Example: SGD $800 total → Pay only SGD $680
                </div>
              </div>
            )}
          </div>

          {/* Selection Summary */}
          {selectedTypes.size > 0 && (
            <div style={{background: '#f9f9f9', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', marginBottom: '24px'}}>
              <div style={{fontWeight: '600', marginBottom: '12px', fontSize: '14px'}}>Your Selection:</div>
              <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                {selectedTypes.has('hero-banner') && (
                  <div style={{background: '#FFF8F5', border: '1px solid #FFD5C0', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', fontWeight: '600', color: '#FF6B35'}}>
                    🌟 Hero Banner
                  </div>
                )}
                {selectedTypes.has('in-feed-ads') && (
                  <div style={{background: '#FFF8F5', border: '1px solid #FFD5C0', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', fontWeight: '600', color: '#FF6B35'}}>
                    📰 In-Feed Ads
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div style={{display: 'flex', gap: '12px'}}>
            <button
              onClick={onClose}
              style={{flex: 1, padding: '14px', background: '#f5f5f5', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '14px'}}
            >
              Cancel
            </button>
            <button
              onClick={handleStartCampaigns}
              disabled={selectedTypes.size === 0}
              style={{
                flex: 1,
                padding: '14px',
                background: selectedTypes.size > 0 ? '#FF6B35' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: selectedTypes.size > 0 ? 'pointer' : 'not-allowed',
                fontSize: '14px',
              }}
            >
              Continue: Fill Details → ({selectedTypes.size} {selectedTypes.size === 1 ? 'ad' : 'ads'})
            </button>
          </div>
        </div>
      </div>
      <FullAdPreview />
      </>
    );
  }

  // STEP 2: Fill Campaign Details
  if (step === 'campaign-details') {
    const allTypes = Array.from(selectedTypes);
    const campaignIndex = allTypes.indexOf(currentCampaign?.type as 'hero-banner' | 'in-feed-ads');
    const isLastType = campaignIndex === allTypes.length - 1;
    const progressPercent = ((campaignIndex + 1) / allTypes.length) * 100;

    const motivationalMessages = [
      '✨ You\'re almost there! Make this campaign shine.',
      '🚀 Let\'s create something amazing.',
      '💡 Your ads are going to look great!',
      '🎯 Time to make an impact!',
      '⭐ Companies who fill this step see 3x more engagement!',
    ];
    const motivationalMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    return (
      <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflowY: 'auto'}}>
        <div style={{background: 'white', borderRadius: '12px', padding: '32px', maxWidth: '700px', width: '90%', margin: '20px auto', maxHeight: '95vh', overflowY: 'auto'}}>
          {/* Progress Bar */}
          <div style={{marginBottom: '24px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
              <div>
                <h2 style={{margin: '0 0 4px 0', fontSize: '24px', fontWeight: '700'}}>
                  {currentCampaign?.type === 'hero-banner' ? '🌟' : '📰'} {currentCampaign?.type === 'hero-banner' ? 'Hero Banner' : 'In-Feed Ads'} Details
                </h2>
                <p style={{margin: 0, fontSize: '13px', color: '#666'}}>Step 2 of 2 • Campaign {campaignIndex + 1} of {allTypes.length}</p>
              </div>
              <button onClick={onClose} style={{background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'}}>✕</button>
            </div>
            {/* Visual Progress Bar */}
            <div style={{width: '100%', height: '4px', background: '#e0e0e0', borderRadius: '2px', overflow: 'hidden', marginTop: '8px'}}>
              <div style={{width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #FF6B35, #FF8C5A)', transition: 'width 0.3s ease'}}></div>
            </div>
          </div>

          {/* Motivational Message */}
          <div style={{background: 'linear-gradient(135deg, #FFF8F5 0%, #FFE5D9 100%)', border: '1px solid #FFD5C0', borderRadius: '8px', padding: '12px', marginBottom: '24px', fontSize: '13px', fontWeight: '600', color: '#FF6B35'}}>
            {motivationalMessage}
          </div>

          {/* Campaign Type Badge */}
          <div style={{background: '#FFF8F5', border: '1px solid #FFD5C0', borderRadius: '8px', padding: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span>{currentCampaign?.type === 'hero-banner' ? '🌟' : '📰'}</span>
            <span style={{fontWeight: '600', color: '#FF6B35'}}>{currentCampaign?.type === 'hero-banner' ? 'Hero Banner' : 'In-Feed Ads'}</span>
            <span style={{marginLeft: 'auto', fontSize: '11px', background: '#FF6B35', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: '600'}}>REQUIRES APPROVAL</span>
          </div>

          {/* LIVE AD PREVIEW - Platform-specific mockup */}
          {imagePreview && (
            <div style={{marginBottom: '32px', background: 'linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%)', borderRadius: '14px', padding: '24px', border: '2px solid #FF6B35', boxShadow: '0 4px 16px rgba(255,107,53,0.1)'}}>
              <div style={{fontWeight: '800', marginBottom: '16px', fontSize: '12px', color: '#FF6B35', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '6px'}}>
                ✨ Live Preview: How Your Ad Looks
              </div>

              {/* Hero Banner Preview - Narrow banner aspect ratio */}
              {currentCampaign?.type === 'hero-banner' && (
                <div style={{background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxWidth: '600px', margin: '0 auto'}}>
                  {/* Mini header */}
                  <div style={{padding: '12px 14px', background: 'linear-gradient(135deg, #f9f9f9 0%, #ffffff 100%)', borderBottom: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <div style={{width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #FF6B35, #FF8C5A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 2px 8px rgba(255,107,53,0.2)'}}>E</div>
                    <div style={{flex: 1}}>
                      <div style={{fontWeight: '700', fontSize: '13px', color: '#1a1a1a'}}>Your Company</div>
                      <div style={{fontSize: '11px', color: '#888'}}>Professional • 4.8 ⭐</div>
                    </div>
                  </div>

                  {/* Hero Banner - 4:1 aspect ratio (1200x300) */}
                  <div style={{width: '100%', paddingBottom: '25%', position: 'relative', background: 'linear-gradient(135deg, #FFF8F5 0%, #FFE5D9 100%)'}}>
                    <img src={imagePreview} alt="hero" style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block'}} />
                  </div>

                  {/* Content section below banner - what customers see */}
                  <div style={{padding: '16px', background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)'}}>
                    <div style={{fontWeight: '800', fontSize: '16px', color: '#1a1a1a', marginBottom: '6px', lineHeight: '1.3'}}>{campaignTitle || 'Your Campaign Title'}</div>
                    {campaignBio && (
                      <div style={{fontSize: '13px', color: '#666', fontWeight: '500'}}>{campaignBio}</div>
                    )}
                  </div>
                </div>
              )}

              {/* In-Feed Ad Preview */}
              {currentCampaign?.type === 'in-feed-ads' && (
                <div style={{background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxWidth: '320px', margin: '0 auto'}}>
                  {/* Social header */}
                  <div style={{padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e8e8e8'}}>
                    <div style={{width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF6B35, #FF8C5A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '13px', boxShadow: '0 2px 8px rgba(255,107,53,0.15)'}}>E</div>
                    <div style={{flex: 1}}>
                      <div style={{fontWeight: '700', fontSize: '12px', color: '#1a1a1a'}}>Your Company</div>
                      <div style={{fontSize: '10px', color: '#888'}}>Sponsored • Now</div>
                    </div>
                    <div style={{fontSize: '14px', color: '#ddd'}}>⋯</div>
                  </div>

                  {/* Image */}
                  <img src={imagePreview} alt="feed ad" style={{width: '100%', height: '240px', objectFit: 'cover', display: 'block'}} />

                  {/* Engagement bar */}
                  <div style={{padding: '8px 12px', display: 'flex', gap: '12px', fontSize: '11px', color: '#888', borderBottom: '1px solid #e8e8e8'}}>
                    <span>👍 2.4K</span>
                    <span>💬 234</span>
                    <span>↗️ 123</span>
                    <span style={{marginLeft: 'auto'}}>🔖</span>
                  </div>

                  {/* Caption - what customers see */}
                  <div style={{padding: '12px'}}>
                    <div style={{fontWeight: '800', fontSize: '13px', color: '#1a1a1a', marginBottom: '4px'}}>{campaignTitle || 'Your Company'}</div>
                    {campaignBio && (
                      <div style={{fontSize: '12px', color: '#666', fontWeight: '500'}}>{campaignBio}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div style={{marginBottom: '24px'}}>
            <label style={{display: 'block', fontWeight: '700', marginBottom: '10px', fontSize: '14px', color: '#333'}}>
              📝 What's your campaign called?
            </label>
            <input
              type="text"
              value={campaignTitle}
              onChange={(e) => setCampaignTitle(e.target.value)}
              placeholder="e.g., Summer Cleaning Special, Fresh Start 2026"
              style={{width: '100%', padding: '13px 16px', border: titleSpellCheck ? '2px solid #E74C3C' : titleSuggestion ? '2px solid #F39C12' : '2px solid #ddd', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box', transition: 'all 0.3s ease', outline: 'none', background: 'white'}}
              onFocus={(e) => {e.currentTarget.style.borderColor = titleSpellCheck ? '#E74C3C' : titleSuggestion ? '#F39C12' : '#FF6B35'; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(${titleSpellCheck ? '231,76,60' : titleSuggestion ? '243,156,18' : '255,107,53'},0.1)`; e.currentTarget.style.background = '#fafafa';}}
              onBlur={(e) => {e.currentTarget.style.borderColor = titleSpellCheck ? '#E74C3C' : titleSuggestion ? '#F39C12' : '#ddd'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'white';}}
            />
            {titleSpellCheck && (
              <p style={{fontSize: '12px', color: '#E74C3C', marginTop: '6px', fontWeight: '500'}}>
                {titleSpellCheck}
              </p>
            )}
            {titleSuggestion && !titleSpellCheck && (
              <p style={{fontSize: '12px', color: '#F39C12', marginTop: '6px', fontWeight: '500'}}>
                💡 {titleSuggestion}
              </p>
            )}
            {!titleSuggestion && !titleSpellCheck && campaignTitle.length >= 15 && (
              <p style={{fontSize: '12px', color: '#27AE60', marginTop: '6px', fontWeight: '500'}}>
                ✅ Great title!
              </p>
            )}
          </div>

          {/* Bio/Tagline */}
          <div style={{marginBottom: '24px'}}>
            <label style={{display: 'block', fontWeight: '700', marginBottom: '10px', fontSize: '14px', color: '#333'}}>
              ✨ What's the hook? One-line bio (optional)
            </label>
            <input
              type="text"
              value={campaignBio}
              onChange={(e) => setCampaignBio(e.target.value)}
              placeholder="e.g., Limited time only • Free delivery • 50% off this weekend"
              style={{width: '100%', padding: '13px 16px', border: bioSpellCheck ? '2px solid #E74C3C' : biaSuggestion ? '2px solid #F39C12' : '2px solid #ddd', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box', transition: 'all 0.3s ease', outline: 'none', background: 'white'}}
              onFocus={(e) => {e.currentTarget.style.borderColor = bioSpellCheck ? '#E74C3C' : biaSuggestion ? '#F39C12' : '#FF6B35'; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(${bioSpellCheck ? '231,76,60' : biaSuggestion ? '243,156,18' : '255,107,53'},0.1)`; e.currentTarget.style.background = '#fafafa';}}
              onBlur={(e) => {e.currentTarget.style.borderColor = bioSpellCheck ? '#E74C3C' : biaSuggestion ? '#F39C12' : '#ddd'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'white';}}
            />
            {bioSpellCheck && (
              <p style={{fontSize: '12px', color: '#E74C3C', marginTop: '6px', fontWeight: '500'}}>
                {bioSpellCheck}
              </p>
            )}
            {biaSuggestion && !bioSpellCheck && (
              <p style={{fontSize: '12px', color: '#F39C12', marginTop: '6px', fontWeight: '500'}}>
                {biaSuggestion}
              </p>
            )}
            {campaignBio && !biaSuggestion && !bioSpellCheck && campaignBio.length >= 10 && campaignBio.length <= 100 && (
              <p style={{fontSize: '12px', color: '#27AE60', marginTop: '6px', fontWeight: '500'}}>
                ✅ Perfect hook!
              </p>
            )}
          </div>

          {/* URL */}
          <div style={{marginBottom: '24px'}}>
            <label style={{display: 'block', fontWeight: '700', marginBottom: '12px', fontSize: '14px', color: '#333'}}>
              🎯 Where should clicks take them?
            </label>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px'}}>
              {(['website', 'instagram', 'facebook', 'tiktok'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setUrlType(type)}
                  style={{
                    padding: '12px 8px',
                    background: urlType === type ? 'linear-gradient(135deg, #FF6B35, #FF8C5A)' : 'white',
                    color: urlType === type ? 'white' : '#333',
                    border: `2px solid ${urlType === type ? '#FF6B35' : '#e0e0e0'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '12px',
                    transition: 'all 0.3s ease',
                    boxShadow: urlType === type ? '0 4px 12px rgba(255,107,53,0.2)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (urlType !== type) {
                      e.currentTarget.style.borderColor = '#FF6B35';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,107,53,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (urlType !== type) {
                      e.currentTarget.style.borderColor = '#e0e0e0';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  {type === 'website' && '🌐 Website'}
                  {type === 'instagram' && '📷 Insta'}
                  {type === 'facebook' && '👍 FB'}
                  {type === 'tiktok' && '🎵 TikTok'}
                </button>
              ))}
            </div>
            <div style={{display: 'flex', gap: '0'}}>
              {urlType === 'website' && (
                <div style={{display: 'flex', alignItems: 'center', padding: '13px 16px', background: 'linear-gradient(135deg, #FFF8F5 0%, #FFE5D9 100%)', borderRadius: '10px 0 0 10px', border: '2px solid #FFB399', borderRight: 'none', fontWeight: '700', fontSize: '13px', color: '#FF6B35'}}>
                  https://
                </div>
              )}
              <input
                type="text"
                value={campaignUrl}
                onChange={(e) => {
                  let val = e.target.value;
                  if (urlType === 'website' && val && !val.startsWith('http')) {
                    val = 'https://' + val;
                  }
                  setCampaignUrl(val);
                }}
                placeholder={urlType === 'website' ? 'www.mycompany.com/summer' : `Paste your ${urlType} link...`}
                style={{flex: 1, padding: '13px 16px', border: urlWarning ? '2px solid #E74C3C' : '2px solid #FFB399', borderRadius: urlType === 'website' ? '0 10px 10px 0' : '10px', fontSize: '14px', boxSizing: 'border-box', transition: 'all 0.3s ease', outline: 'none', background: 'white'}}
                onFocus={(e) => {e.currentTarget.style.borderColor = urlWarning ? '#E74C3C' : '#FF6B35'; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(${urlWarning ? '231,76,60' : '255,107,53'},0.1)`; e.currentTarget.style.background = '#fafafa';}}
                onBlur={(e) => {e.currentTarget.style.borderColor = urlWarning ? '#E74C3C' : '#FFB399'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'white';}}
              />
            </div>
            {urlWarning && (
              <p style={{fontSize: '12px', color: '#E74C3C', marginTop: '6px', fontWeight: '500'}}>{urlWarning}</p>
            )}
            {campaignUrl && !urlWarning && (
              <p style={{fontSize: '12px', color: '#27AE60', marginTop: '6px'}}>✅ Users will click through to: <strong>{campaignUrl.substring(0, 40)}...</strong></p>
            )}
          </div>

          {/* Image Upload & Preview */}
          <div style={{marginBottom: '24px'}}>
            <label style={{display: 'block', fontWeight: '700', marginBottom: '12px', fontSize: '14px', color: '#333'}}>
              ✨ Upload your ad image 📸
            </label>

            {imagePreview ? (
              // Image uploaded - show edit state
              <div style={{position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '3px solid #27AE60', boxShadow: '0 6px 20px rgba(39,174,96,0.25)', cursor: 'pointer', background: 'white'}}
                onMouseEnter={(e) => {const overlay = e.currentTarget.querySelector('[data-overlay]'); if (overlay) overlay.style.opacity = '1';}}
                onMouseLeave={(e) => {const overlay = e.currentTarget.querySelector('[data-overlay]'); if (overlay) overlay.style.opacity = '0';}}
              >
                <img src={imagePreview} alt="Ad preview" style={{width: '100%', maxHeight: '300px', objectFit: 'cover', display: 'block'}} />

                {/* Overlay */}
                <div data-overlay style={{position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', opacity: 0, transition: 'opacity 0.2s ease', cursor: 'pointer'}}
                  onClick={() => document.getElementById('image-upload-change')?.click()}
                >
                  <div style={{fontSize: '36px'}}>📸</div>
                  <div style={{fontWeight: '700', color: 'white', fontSize: '15px'}}>Click to change image</div>
                  <div style={{fontSize: '12px', color: '#ccc'}}>or drag & drop a new one</div>
                </div>

                <input type="file" accept="image/*" onChange={handleImageUpload} style={{display: 'none'}} id="image-upload-change" />

                {/* Success badge with animation */}
                <div style={{position: 'absolute', top: '12px', right: '12px', background: 'linear-gradient(135deg, #27AE60, #20C997)', color: 'white', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(39,174,96,0.3)', animation: 'pulse 2s infinite'}}>
                  ✓
                </div>

                {/* Quality indicator */}
                <div style={{position: 'absolute', bottom: '12px', left: '12px', right: '12px', background: 'rgba(255,255,255,0.98)', borderRadius: '8px', padding: '12px 14px', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <div style={{fontSize: '20px'}}>
                      {imageQuality === 'high' && '✅'}
                      {imageQuality === 'warning' && '⚠️'}
                      {imageQuality === 'low' && '❌'}
                    </div>
                    <div style={{flex: 1}}>
                      <div style={{fontWeight: '600', fontSize: '12px', color: '#333'}}>
                        {imageQuality === 'high' && 'Perfect! Great quality'}
                        {imageQuality === 'warning' && 'Good, could be sharper'}
                        {imageQuality === 'low' && 'Too low resolution'}
                      </div>
                      <div style={{fontSize: '11px', color: '#999'}}>
                        {imageQuality === 'high' && 'Admins will love this!'}
                        {imageQuality === 'warning' && 'Still acceptable'}
                        {imageQuality === 'low' && 'Please upload clearer image'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // No image - show engaging upload box
              <div style={{border: '3px dashed #FF6B35', borderRadius: '12px', padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: 'linear-gradient(135deg, #FFF8F5 0%, #FFE5D9 100%)', transition: 'all 0.3s ease'}}
                onMouseEnter={(e) => {e.currentTarget.style.borderColor = '#FF8C5A'; e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,107,53,0.15)';}}
                onMouseLeave={(e) => {e.currentTarget.style.borderColor = '#FF6B35'; e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none';}}
              >
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{display: 'none'}} id="image-upload" />
                <label htmlFor="image-upload" style={{cursor: 'pointer', display: 'block'}}>
                  <div style={{fontSize: '48px', marginBottom: '12px', animation: 'bounce 2s infinite'}}>🎬</div>
                  <div style={{fontWeight: '700', fontSize: '16px', marginBottom: '6px', color: '#FF6B35'}}>Make Your Ad Stand Out!</div>
                  <div style={{fontSize: '13px', color: '#666', marginBottom: '14px'}}>Click to upload your best image</div>
                  <div style={{fontSize: '12px', color: '#999', background: 'white', padding: '10px 14px', borderRadius: '8px', display: 'inline-block', fontWeight: '600', marginBottom: '12px'}}>
                    {suggestedDimensions} • PNG/JPG • Max 5MB
                  </div>
                  <div style={{fontSize: '11px', color: '#999', marginTop: '12px'}}>
                    💡 High quality images get approved faster!
                  </div>
                </label>
              </div>
            )}
          </div>

          <style>{`
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.1); }
            }
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
          `}</style>

          {/* Duration, Budget, Dates */}
          <div style={{marginBottom: '24px', background: 'linear-gradient(135deg, #FFF8F5 0%, #FFE5D9 100%)', borderRadius: '12px', padding: '20px', border: '1px solid #FFD5C0'}}>
            <label style={{display: 'block', fontWeight: '700', marginBottom: '16px', fontSize: '14px', color: '#333'}}>
              ⏱️ How long & 💰 How much?
            </label>
            {/* Duration */}
            <div style={{marginBottom: '20px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                <span style={{fontSize: '13px', fontWeight: '700', color: '#333'}}>Campaign Duration</span>
                <span style={{fontSize: '16px', fontWeight: '700', color: '#FF6B35', background: 'white', padding: '6px 12px', borderRadius: '6px', minWidth: '80px', textAlign: 'center'}}>{duration} {duration === 1 ? 'week' : 'weeks'}</span>
              </div>
              <input type="range" min={currentCampaign?.type === 'hero-banner' ? 2 : 1} max={12} value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} style={{width: '100%', height: '8px', borderRadius: '4px', background: 'linear-gradient(90deg, #FF6B35, #FF8C5A)', outline: 'none', cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none'}} />
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginTop: '6px', fontWeight: '600'}}>
                <span>{currentCampaign?.type === 'hero-banner' ? '2w' : '1w'} min</span>
                <span>12w max</span>
              </div>
              {durationSuggestion && (
                <div style={{background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: '6px', padding: '10px 12px', marginTop: '8px', fontSize: '12px', color: '#F57F17', fontWeight: '500', lineHeight: '1.5'}}>
                  {durationSuggestion}
                </div>
              )}
            </div>

            {/* Budget */}
            <div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                <span style={{fontSize: '13px', fontWeight: '700', color: '#333'}}>Total Budget</span>
                <span style={{fontSize: '16px', fontWeight: '700', color: '#27AE60', background: 'white', padding: '6px 12px', borderRadius: '6px', minWidth: '100px', textAlign: 'center'}}>SGD ${budget}</span>
              </div>
              <input type="range" min={500} max={10000} step={100} value={budget} onChange={(e) => setBudget(parseInt(e.target.value))} style={{width: '100%', height: '8px', borderRadius: '4px', background: 'linear-gradient(90deg, #FF6B35, #FF8C5A)', outline: 'none', cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none'}} />
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginTop: '6px', fontWeight: '600'}}>
                <span>SGD $500</span>
                <span style={{fontWeight: '700', color: '#FF6B35', background: 'white', padding: '4px 8px', borderRadius: '4px'}}>SGD ${(budget / duration).toFixed(0)}/week</span>
                <span>SGD $10k</span>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div style={{marginBottom: '24px'}}>
            <label style={{display: 'block', fontWeight: '700', marginBottom: '12px', fontSize: '14px', color: '#333'}}>
              📅 When do you want to run this?
            </label>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px'}}>
              <div>
                <label style={{fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px', color: '#666'}}>Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{width: '100%', padding: '12px', border: '2px solid #FFB399', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', outline: 'none', cursor: 'pointer', transition: 'all 0.2s ease'}} />
              </div>
              <div>
                <label style={{fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px', color: '#666'}}>Ends (Auto-calculated)</label>
                <input type="date" value={endDate} disabled style={{width: '100%', padding: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', background: '#f9f9f9', color: '#999'}} />
              </div>
            </div>
            <p style={{fontSize: '12px', color: '#999', marginTop: '8px', marginBottom: '16px'}}>💡 Campaigns run for exactly {duration} week{duration > 1 ? 's' : ''}</p>

            {/* Preview Button */}
            {imagePreview && campaignTitle && (
              <button
                onClick={() => {
                  setShowFullPreview(true);
                  // Scroll to top immediately
                  window.scrollTo(0, 0);
                  if (previewRef.current) {
                    setTimeout(() => {
                      previewRef.current?.scrollTo(0, 0);
                    }, 100);
                  }
                }}
                style={{width: '100%', padding: '14px', background: 'linear-gradient(135deg, #667EEA, #764BA2)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.3s ease', boxShadow: '0 4px 12px rgba(102,126,234,0.3)'}}
                onMouseEnter={(e) => {e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(102,126,234,0.4)';}}
                onMouseLeave={(e) => {e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(102,126,234,0.3)';}}
              >
                👁️ Preview Full Ad
              </button>
            )}
          </div>

          {/* Progress & Actions */}
          {!isLastType && (
            <div style={{background: '#F0F8FF', border: '1px solid #B0D4FF', borderRadius: '8px', padding: '12px', marginBottom: '20px', fontSize: '12px', color: '#333'}}>
              <strong>After this:</strong> You'll fill in details for {allTypes.length - campaignIndex - 1} more campaign{allTypes.length - campaignIndex - 1 > 1 ? 's' : ''}
            </div>
          )}

          {/* Final Summary */}
          {isLastType && campaigns.length > 0 && (
            <div style={{background: '#FFF8F5', border: '1px solid #FFD5C0', borderRadius: '8px', padding: '16px', marginBottom: '20px'}}>
              <div style={{fontWeight: '600', marginBottom: '12px'}}>Your Complete Package</div>
              {campaigns.map((c, i) => (
                <div key={i} style={{fontSize: '12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'start'}}>
                  <div>
                    <div>{c.type === 'hero-banner' ? '🌟' : '📰'} {c.title}</div>
                    {c.bio && <div style={{fontSize: '11px', color: '#999', fontStyle: 'italic'}}>{c.bio}</div>}
                  </div>
                  <span style={{whiteSpace: 'nowrap', marginLeft: '8px'}}>SGD ${c.budget}</span>
                </div>
              ))}
              {currentCampaign && (
                <div style={{fontSize: '12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'start', fontWeight: '600', color: '#FF6B35'}}>
                  <div>
                    <div>{currentCampaign.type === 'hero-banner' ? '🌟' : '📰'} {campaignTitle}</div>
                    {campaignBio && <div style={{fontSize: '11px', color: '#BF360C', fontStyle: 'italic', fontWeight: '500'}}>{campaignBio}</div>}
                  </div>
                  <span style={{whiteSpace: 'nowrap', marginLeft: '8px'}}>SGD ${budget}</span>
                </div>
              )}
              <div style={{borderTop: '1px solid #FFD5C0', paddingTop: '8px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: '700'}}>
                <span>Total (held by Stripe until approval)</span>
                <span style={{color: '#FF6B35'}}>SGD ${(totalBudget + budget).toFixed(0)}</span>
              </div>
              {bundleDiscount > 0 && (
                <div style={{fontSize: '12px', color: '#27AE60', fontWeight: '600', marginTop: '4px'}}>
                  🎁 You save {bundleDiscount}%: -SGD ${(((totalBudget + budget) * bundleDiscount) / 100).toFixed(0)}
                </div>
              )}
            </div>
          )}

          {/* Quality Warning - Warm & Helpful */}
          {imageQuality === 'low' && (
            <div style={{background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)', border: '2px solid #FF9800', borderRadius: '8px', padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'start'}}>
              <div style={{fontSize: '28px', flexShrink: 0}}>📸</div>
              <div>
                <div style={{fontWeight: '700', color: '#E65100', marginBottom: '6px', fontSize: '15px'}}>Let's Make This Ad Look Amazing! ✨</div>
                <div style={{fontSize: '13px', color: '#BF360C', lineHeight: '1.6', marginBottom: '10px'}}>
                  Your image looks a bit fuzzy right now. Our admins want to make sure your ad looks crisp and professional when it goes live—that way, it'll get more attention from customers!
                </div>
                <div style={{background: 'rgba(255,255,255,0.8)', borderRadius: '6px', padding: '10px', fontSize: '12px', color: '#333', fontWeight: '500', lineHeight: '1.5'}}>
                  💡 <strong>Quick Fix:</strong> Use a clearer image at <strong>{suggestedDimensions}</strong> or higher. Smartphone photos work great if the lighting is good!
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div style={{display: 'flex', gap: '12px', marginTop: '32px'}}>
            <button
              onClick={() => {
                if (campaigns.length === 0) {
                  setStep('package-setup');
                  setSelectedTypes(new Set());
                } else {
                  setStep('package-setup');
                }
              }}
              style={{flex: 1, padding: '14px', background: '#f5f5f5', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', color: '#666', transition: 'all 0.2s ease'}}
              onMouseEnter={(e) => {e.currentTarget.style.background = '#e0e0e0';}}
              onMouseLeave={(e) => {e.currentTarget.style.background = '#f5f5f5';}}
            >
              ← Back
            </button>
            {isLastType ? (
              <button
                onClick={() => {
                  if (!formIsValid) {
                    alert('Please complete all fields and fix any warnings');
                    return;
                  }
                  handleSaveCampaign();
                  // Store pending submission and show refund warning
                  const newCampaign: CampaignData = {
                    id: `campaign-${Date.now()}`,
                    type: currentCampaign?.type as 'hero-banner' | 'in-feed-ads',
                    title: campaignTitle,
                    bio: campaignBio || undefined,
                    url: campaignUrl,
                    imageUrl: imagePreview,
                    budget,
                    duration,
                    startDate,
                    endDate,
                  };
                  setPendingSubmission([...campaigns, newCampaign]);
                  setStep('refund-warning');
                }}
                disabled={!formIsValid}
                style={{flex: 1, padding: '14px', background: formIsValid ? 'linear-gradient(135deg, #FF6B35, #FF8C5A)' : '#ccc', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: formIsValid ? 'pointer' : 'not-allowed', fontSize: '14px', transition: 'all 0.2s ease', boxShadow: formIsValid ? '0 4px 12px rgba(255,107,53,0.3)' : 'none', opacity: formIsValid ? 1 : 0.6}}
                onMouseEnter={(e) => {if (formIsValid) {e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(255,107,53,0.4)';}}}
                onMouseLeave={(e) => {if (formIsValid) {e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,107,53,0.3)';}}}
              >
                {!formIsValid ? '⚠️ Complete All Fields' : '💳 Ready for Payment →'}
              </button>
            ) : (
              <button
                onClick={() => {
                  if (!formIsValid) {
                    alert('Please complete all fields and fix any warnings');
                    return;
                  }
                  handleSaveCampaign();
                }}
                disabled={!formIsValid}
                style={{flex: 1, padding: '14px', background: formIsValid ? 'linear-gradient(135deg, #FF6B35, #FF8C5A)' : '#ccc', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: formIsValid ? 'pointer' : 'not-allowed', fontSize: '14px', transition: 'all 0.2s ease', boxShadow: formIsValid ? '0 4px 12px rgba(255,107,53,0.3)' : 'none', opacity: formIsValid ? 1 : 0.6}}
                onMouseEnter={(e) => {if (formIsValid) {e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(255,107,53,0.4)';}}}
                onMouseLeave={(e) => {if (formIsValid) {e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,107,53,0.3)';}}}
              >
                {!formIsValid ? '⚠️ Complete All Fields' : '✅ Save & Next Campaign →'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // STEP 3: Refund Warning before Payment
  if (step === 'refund-warning' && pendingSubmission) {
    return (
      <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '20px'}}>
        <div style={{background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '500px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'}}>

          {/* Header */}
          <div style={{textAlign: 'center', marginBottom: '24px'}}>
            <div style={{fontSize: '48px', marginBottom: '12px'}}>⚠️</div>
            <h2 style={{margin: '0 0 8px 0', fontSize: '20px', fontWeight: '800', color: '#333'}}>
              Payment Policy
            </h2>
            <p style={{margin: 0, fontSize: '13px', color: '#666'}}>Please read carefully before proceeding</p>
          </div>

          {/* Policy Content */}
          <div style={{background: '#FFF5F0', border: '2px solid #FF6B35', borderRadius: '12px', padding: '20px', marginBottom: '24px'}}>
            <div style={{marginBottom: '16px'}}>
              <h3 style={{margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#FF6B35', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span>❌</span> No Refunds - Ever
              </h3>
              <p style={{margin: 0, fontSize: '13px', color: '#333', lineHeight: '1.6'}}>
                Once you submit payment, <strong>no refunds will be issued</strong>—regardless of reason, timing, or status. This includes when campaigns are paused or stopped.
              </p>
            </div>

            <div style={{marginBottom: '16px', paddingTop: '16px', borderTop: '1px solid #FFD5C0'}}>
              <h3 style={{margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#FF6B35', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span>⏸️</span> Pause Anytime (No Refund)
              </h3>
              <p style={{margin: 0, fontSize: '13px', color: '#333', lineHeight: '1.6'}}>
                You can <strong>pause</strong> your campaign at any time and <strong>resume it later</strong>. <strong>No partial refunds</strong> when paused—full budget remains held.
              </p>
            </div>

            <div style={{paddingTop: '16px', borderTop: '1px solid #FFD5C0'}}>
              <h3 style={{margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#FF6B35', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span>⏹️</span> Stop Permanently
              </h3>
              <p style={{margin: 0, fontSize: '13px', color: '#333', lineHeight: '1.6'}}>
                You can <strong>stop</strong> your campaign at any time to end it permanently. <strong>No refund for unused budget.</strong>
              </p>
            </div>
          </div>

          {/* Important Note */}
          <div style={{background: '#FFF9F5', border: '1px solid #FFE5D9', borderRadius: '8px', padding: '12px', marginBottom: '24px', fontSize: '12px', color: '#555', lineHeight: '1.6'}}>
            <strong style={{color: '#FF6B35'}}>💡 Important:</strong> Review your campaign details carefully before payment. Make sure everything is correct—you cannot edit once submitted for payment. No refunds for any reason, including when paused.
          </div>

          {/* Agreement Checkbox */}
          <label style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', cursor: 'pointer', fontSize: '13px'}}>
            <input
              type="checkbox"
              id="refund-policy-agree"
              defaultChecked={false}
              style={{width: '18px', height: '18px', cursor: 'pointer', accentColor: '#FF6B35'}}
            />
            <span style={{color: '#333'}}>
              I understand there are <strong>no refunds under any circumstance</strong>. Payment is non-refundable whether campaign is active, paused, or stopped.
            </span>
          </label>

          {/* Buttons */}
          <div style={{display: 'flex', gap: '12px'}}>
            <button
              onClick={() => {
                setStep('campaign-details');
                setPendingSubmission(null);
              }}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: '#f5f5f5',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#333'
              }}
            >
              Go Back
            </button>
            <button
              onClick={() => {
                const checkbox = document.getElementById('refund-policy-agree') as HTMLInputElement;
                if (!checkbox.checked) {
                  alert('Please agree to the policy to proceed');
                  return;
                }
                // Notify parent component and proceed to payment
                if (onCampaignSubmit) {
                  onCampaignSubmit(pendingSubmission);
                }
                // Go to checkout
                const totalBudget = pendingSubmission.reduce((sum, c) => sum + c.budget, 0);
                const finalDiscount = pendingSubmission.length > 1 ? (pendingSubmission.length === 2 ? 15 : 20) : 0;
                const finalTotal = totalBudget - (totalBudget * finalDiscount) / 100;
                window.location.href = `/stripe-checkout?total=${finalTotal}&discount=${finalDiscount}&campaigns=${pendingSubmission.length}`;
              }}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #FF6B35, #FF8C5A)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(255,107,53,0.4)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              💳 Continue to Payment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default CampaignWizard;
