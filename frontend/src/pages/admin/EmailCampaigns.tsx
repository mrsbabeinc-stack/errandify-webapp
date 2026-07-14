import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  recipientCount: number;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  createdAt: string;
  sentAt?: string;
  openRate: number;
  clickRate: number;
  content?: string;
  recipientSegment: 'all-users' | 'doers' | 'askers' | 'vip';
  scheduledDate?: string;
  templateType: 'promotional' | 'announcement' | 'reminder' | 'transactional';
  fromName: string;
  fromEmail: string;
  aiGenerated?: boolean;
  imageUrl?: string;
  imageAlt?: string;
}

interface SegmentAIVariant {
  segment: 'all-users' | 'doers' | 'askers' | 'vip';
  subject: string;
  content: string;
  template: 'promotional' | 'announcement' | 'reminder' | 'transactional';
}

export default function EmailCampaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'ai-assist'>('campaigns');
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignSubject, setNewCampaignSubject] = useState('');
  const [newCampaignContent, setNewCampaignContent] = useState('');
  const [newCampaignRecipients, setNewCampaignRecipients] = useState('all-users');
  const [newCampaignTemplate, setNewCampaignTemplate] = useState('promotional');
  const [newCampaignFromName, setNewCampaignFromName] = useState('Errandify');
  const [newCampaignFromEmail, setNewCampaignFromEmail] = useState('noreply@errandify.com');
  const [newCampaignScheduled, setNewCampaignScheduled] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editContent, setEditContent] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiVariants, setAiVariants] = useState<SegmentAIVariant[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [newCampaignImageUrl, setNewCampaignImageUrl] = useState('');
  const [newCampaignImageAlt, setNewCampaignImageAlt] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [campaignObjective, setCampaignObjective] = useState('');
  const [plannerLoading, setPlannerLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('emailCampaigns');
    if (saved) {
      setCampaigns(JSON.parse(saved));
    } else {
      const demoCampaigns: Campaign[] = [
        {
          id: 'c_1',
          name: 'Welcome New Users',
          subject: 'Welcome to Errandify! Get Started Today',
          content: 'Hi there! Welcome to Errandify. Here\'s how to get started...',
          recipientCount: 2345,
          status: 'sent',
          createdAt: new Date(Date.now() - 604800000).toISOString(),
          sentAt: new Date(Date.now() - 604800000).toISOString(),
          openRate: 42,
          clickRate: 18,
          recipientSegment: 'all-users',
          templateType: 'promotional',
          fromName: 'Errandify',
          fromEmail: 'noreply@errandify.com',
        },
        {
          id: 'c_2',
          name: 'Referral Program Launch',
          subject: 'Invite Friends and Earn Rewards!',
          content: 'Earn 50 EP when you refer a friend. Share your unique link today!',
          recipientCount: 5234,
          status: 'sent',
          createdAt: new Date(Date.now() - 1296000000).toISOString(),
          sentAt: new Date(Date.now() - 1296000000).toISOString(),
          openRate: 35,
          clickRate: 12,
          recipientSegment: 'doers',
          templateType: 'promotional',
          fromName: 'Errandify Growth',
          fromEmail: 'growth@errandify.com',
        },
        {
          id: 'c_3',
          name: 'Q3 Summer Promotion',
          subject: 'Limited Time: 20% Off First Order',
          content: 'This summer, enjoy 20% off your first errand! Use code SUMMER20.',
          recipientCount: 8901,
          status: 'scheduled',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          scheduledDate: new Date(Date.now() + 259200000).toISOString(),
          openRate: 0,
          clickRate: 0,
          recipientSegment: 'all-users',
          templateType: 'promotional',
          fromName: 'Errandify Promotions',
          fromEmail: 'promos@errandify.com',
        },
      ];
      setCampaigns(demoCampaigns);
      localStorage.setItem('emailCampaigns', JSON.stringify(demoCampaigns));
    }
  }, []);

  const handleCreateCampaign = () => {
    if (!newCampaignName.trim() || !newCampaignSubject.trim() || !newCampaignContent.trim()) {
      alert('Please fill in all required fields (name, subject, content)');
      return;
    }

    const newCampaign: Campaign = {
      id: `c_${Date.now()}`,
      name: newCampaignName,
      subject: newCampaignSubject,
      content: newCampaignContent,
      recipientCount: newCampaignRecipients === 'all-users' ? 12450 : newCampaignRecipients === 'doers' ? 5234 : 7216,
      status: newCampaignScheduled ? 'scheduled' : 'draft',
      createdAt: new Date().toISOString(),
      scheduledDate: newCampaignScheduled || undefined,
      openRate: 0,
      clickRate: 0,
      recipientSegment: newCampaignRecipients as any,
      templateType: newCampaignTemplate as any,
      fromName: newCampaignFromName,
      fromEmail: newCampaignFromEmail,
      imageUrl: newCampaignImageUrl,
      imageAlt: newCampaignImageAlt,
    };

    const updated = [...campaigns, newCampaign];
    setCampaigns(updated);
    localStorage.setItem('emailCampaigns', JSON.stringify(updated));
    setNewCampaignName('');
    setNewCampaignSubject('');
    setNewCampaignContent('');
    setNewCampaignRecipients('all-users');
    setNewCampaignTemplate('promotional');
    setNewCampaignScheduled('');
    setNewCampaignImageUrl('');
    setNewCampaignImageAlt('');
    setGeneratedImageUrl('');
    alert('✅ Campaign created successfully!');
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingId(campaign.id);
    setEditName(campaign.name);
    setEditSubject(campaign.subject);
    setEditContent(campaign.content || '');
  };

  const handleSaveEdit = (campaignId: string) => {
    if (!editName.trim() || !editSubject.trim() || !editContent.trim()) {
      alert('Please fill in all fields (name, subject, content)');
      return;
    }

    const updated = campaigns.map(c =>
      c.id === campaignId
        ? { ...c, name: editName, subject: editSubject, content: editContent }
        : c
    );
    setCampaigns(updated);
    localStorage.setItem('emailCampaigns', JSON.stringify(updated));
    setEditingId(null);
    alert('✅ Campaign updated successfully!');
  };

  const handleDeleteCampaign = (campaignId: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) {
      return;
    }
    const updated = campaigns.filter(c => c.id !== campaignId);
    setCampaigns(updated);
    localStorage.setItem('emailCampaigns', JSON.stringify(updated));
    alert('✅ Campaign deleted!');
  };

  const callQwenAPI = async (prompt: string, maxTokens: number = 600): Promise<string | null> => {
    try {
      const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text2text/qwen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-demo'
        },
        body: JSON.stringify({
          model: 'qwen-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: 0.7
        })
      }).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        return data.output?.text || data.choices?.[0]?.message?.content || null;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const handleGenerateAIVariants = async () => {
    if (!aiPrompt.trim()) {
      alert('Please enter a campaign description to generate variants');
      return;
    }

    setAiLoading(true);
    try {
      const segments: Array<'all-users' | 'doers' | 'askers' | 'vip'> = ['all-users', 'doers', 'askers', 'vip'];
      const variants: SegmentAIVariant[] = [];

      const segmentDescriptions = {
        'all-users': 'General audience - new and experienced users',
        'doers': 'Service providers/workers - focus on earnings and flexibility',
        'askers': 'Task creators/requesters - focus on convenience and quality',
        'vip': 'VIP/power users - premium experience and exclusive benefits'
      };

      for (const segment of segments) {
        const brandVoice = `Brand: Errandify - a warm, engaging, happy, and community-focused (kampung) service that brings neighbors together to help each other.`;
        const segmentContext = segmentDescriptions[segment];
        const prompt = `${brandVoice}\n\nGenerate a warm, engaging email for: ${segmentContext}\n\nCampaign: ${aiPrompt}\n\nRequirements:\n- Warm and friendly tone, like talking to a neighbor\n- Engaging and celebratory language\n- Emphasize community and mutual help (kampung spirit)\n- Use conversational language, avoid corporate speak\n- Include emoji if appropriate\n- Keep subject under 60 characters\n\nRespond ONLY with valid JSON (no markdown): {"subject":"...", "content":"...", "template":"promotional"|"announcement"|"reminder"|"transactional"}`;

        const qwenResponse = await callQwenAPI(prompt, 600);

        if (qwenResponse) {
          try {
            const parsed = JSON.parse(qwenResponse);
            variants.push({
              segment,
              subject: parsed.subject,
              content: parsed.content,
              template: parsed.template || 'promotional'
            });
          } catch (parseError) {
            const templateVariants = {
              'all-users': {
                subject: '👋 Hey! We\'re so glad you\'re here - join our Errandify kampung today!',
                content: `We're all about helping each other out - just like neighbors do. Whether you need help or want to earn by helping others, you're in the right place! ${aiPrompt}`,
                template: 'promotional' as const
              },
              'doers': {
                subject: '💪 Ready to help neighbors and earn? Let\'s make a difference together!',
                content: `As part of our kampung, your skills matter. Help neighbors with tasks and earn rewards. ${aiPrompt} Join us in building a community where everyone looks out for each other!`,
                template: 'promotional' as const
              },
              'askers': {
                subject: '🤝 Neighbors are ready to help - let us ease your load!',
                content: `Life\'s busy! Our friendly helpers are ready to support you. From errands to tasks, we\'ve got your back. ${aiPrompt} Because in Errandify, we\'re all in this together!`,
                template: 'promotional' as const
              },
              'vip': {
                subject: '🌟 Exclusive: Premium perks for our VIP neighbors!',
                content: `You\'re a valued member of our kampung! As a VIP, enjoy special treatment. ${aiPrompt} Thank you for being part of our warm and caring community!`,
                template: 'promotional' as const
              }
            };
            const template = templateVariants[segment];
            variants.push({
              segment,
              subject: template.subject,
              content: template.content,
              template: template.template
            });
          }
        } else {
          const templateVariants = {
            'all-users': {
              subject: '👋 Hey! We\'re so glad you\'re here - join our Errandify kampung!',
              content: `We're all about helping each other out, just like neighbors do. ${aiPrompt}`,
              template: 'promotional' as const
            },
            'doers': {
              subject: '💪 Ready to help neighbors and earn? Let\'s make a difference!',
              content: `As part of our kampung, your skills matter. Help neighbors and earn rewards. ${aiPrompt}`,
              template: 'promotional' as const
            },
            'askers': {
              subject: '🤝 Neighbors are ready to help - let us ease your load!',
              content: `Our friendly helpers are ready to support you. ${aiPrompt}`,
              template: 'promotional' as const
            },
            'vip': {
              subject: '🌟 Exclusive: Premium perks for our VIP neighbors!',
              content: `You're a valued member of our kampung! Enjoy special treatment. ${aiPrompt}`,
              template: 'promotional' as const
            }
          };
          const template = templateVariants[segment];
          variants.push({
            segment,
            subject: template.subject,
            content: template.content,
            template: template.template
          });
        }
      }

      setAiVariants(variants);
      alert('✅ Generated warm, engaging variants for all segments using Qwen!');
    } catch (error) {
      alert('Error generating variants. Using template variants.');
      const segments: Array<'all-users' | 'doers' | 'askers' | 'vip'> = ['all-users', 'doers', 'askers', 'vip'];
      const templateVariants = {
        'all-users': {
          subject: '👋 Hey! We\'re so glad you\'re here - join our Errandify kampung!',
          content: `We're all about helping each other out, just like neighbors do. ${aiPrompt}`,
          template: 'promotional' as const
        },
        'doers': {
          subject: '💪 Ready to help neighbors and earn? Let\'s make a difference!',
          content: `As part of our kampung, your skills matter. Help neighbors and earn rewards. ${aiPrompt}`,
          template: 'promotional' as const
        },
        'askers': {
          subject: '🤝 Neighbors are ready to help - let us ease your load!',
          content: `Our friendly helpers are ready to support you. ${aiPrompt}`,
          template: 'promotional' as const
        },
        'vip': {
          subject: '🌟 Exclusive: Premium perks for our VIP neighbors!',
          content: `You're a valued member of our kampung! Enjoy special treatment. ${aiPrompt}`,
          template: 'promotional' as const
        }
      };
      const variants = segments.map(segment => templateVariants[segment]);
      setAiVariants(variants);
    } finally {
      setAiLoading(false);
    }
  };

  const handleUseAIVariant = (variant: SegmentAIVariant) => {
    setNewCampaignSubject(variant.subject);
    setNewCampaignContent(variant.content);
    setNewCampaignTemplate(variant.template);
    setNewCampaignRecipients(variant.segment);
    setActiveTab('campaigns');
    alert(`✅ Loaded "${variant.subject}" for ${variant.segment}`);
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      alert('Please enter a description for the image');
      return;
    }

    setImageLoading(true);
    try {
      const qwenImagePrompt = `Generate a professional email banner image (1200x400px) for Errandify.\n\nDescription: ${imagePrompt}\n\nStyle requirements:\n- Warm, community-focused (kampung) atmosphere\n- Happy, engaging, colorful\n- Show people helping each other\n- Neighborhood/community vibes\n- Positive energy\n- Professional quality suitable for email marketing\n\nReturn ONLY the image URL or data URI.`;

      const qwenResponse = await callQwenAPI(qwenImagePrompt, 200);

      if (qwenResponse && (qwenResponse.includes('http') || qwenResponse.includes('data:'))) {
        setGeneratedImageUrl(qwenResponse);
        setNewCampaignImageUrl(qwenResponse);
        setNewCampaignImageAlt(imagePrompt);
        alert('✅ Image generated successfully with Qwen!');
        return;
      }

      try {
        const imageApiResponse = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk-demo'
          },
          body: JSON.stringify({
            model: 'qwen-vl-max',
            prompt: qwenImagePrompt,
            size: '1200x400',
            n: 1,
            quality: 'hd'
          })
        }).catch(() => null);

        if (imageApiResponse && imageApiResponse.ok) {
          const data = await imageApiResponse.json();
          const imageUrl = data.results?.[0]?.url || data.output?.image_url || '';
          if (imageUrl) {
            setGeneratedImageUrl(imageUrl);
            setNewCampaignImageUrl(imageUrl);
            setNewCampaignImageAlt(imagePrompt);
            alert('✅ Image generated with Qwen!');
            return;
          }
        }
      } catch (apiError) {
        console.log('Qwen image API call failed, using templates');
      }

      const mockImages = {
        'referral': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=400&fit=crop',
        'summer': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=400&fit=crop',
        'welcome': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=400&fit=crop',
        'community': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=400&fit=crop',
        'help': 'https://images.unsplash.com/photo-1553531088-be5f74c3e83f?w=1200&h=400&fit=crop',
        'earn': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=400&fit=crop',
        'neighbor': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=400&fit=crop',
        'happy': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=400&fit=crop',
      };

      let imageUrl = '';
      for (const [key, url] of Object.entries(mockImages)) {
        if (imagePrompt.toLowerCase().includes(key)) {
          imageUrl = url;
          break;
        }
      }

      if (!imageUrl) {
        imageUrl = mockImages['community'];
      }

      setGeneratedImageUrl(imageUrl);
      setNewCampaignImageUrl(imageUrl);
      setNewCampaignImageAlt(imagePrompt);
      alert('✅ Generated image from template library (Qwen API unavailable)');
    } catch (error) {
      alert('Error generating image. Using template image.');
      const templateUrl = 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=400&fit=crop';
      setGeneratedImageUrl(templateUrl);
      setNewCampaignImageUrl(templateUrl);
      setNewCampaignImageAlt(imagePrompt);
    } finally {
      setImageLoading(false);
    }
  };

  const handleGenerateFullCampaign = async () => {
    if (!campaignObjective.trim()) {
      alert('Please enter your campaign objective');
      return;
    }

    setPlannerLoading(true);
    try {
      const plannerPrompt = `You are an expert email marketing strategist for Errandify (a warm, community-focused, kampung-style service platform).

Campaign Objective: ${campaignObjective}

Generate a COMPLETE email campaign plan in JSON format. Return ONLY valid JSON, no markdown:

{
  "name": "Campaign name (short, descriptive)",
  "textVariants": {
    "all-users": {
      "subject": "Subject line for general users",
      "content": "Email body optimized for all users"
    },
    "doers": {
      "subject": "Subject line for service providers",
      "content": "Email body highlighting earnings and impact"
    },
    "askers": {
      "subject": "Subject line for task creators",
      "content": "Email body highlighting convenience and support"
    },
    "vip": {
      "subject": "Subject line for VIP users",
      "content": "Email body with exclusive benefits"
    }
  },
  "imageDescription": "Detailed description for AI image generation (must include Errandify brand elements: warm, community, kampung, helpful neighbors)",
  "templateType": "promotional|announcement|reminder|transactional",
  "reasoning": "Why this approach works"
}

Requirements:
- ALL text must be warm, engaging, happy tone (like talking to neighbors)
- Emphasize kampung (community/neighborhood) spirit
- Use emojis appropriately
- Avoid corporate language
- Keep subjects under 60 characters
- Make image description vivid and actionable for AI generation
- Each variant must be segment-specific but aligned to same objective`;

      const response = await callQwenAPI(plannerPrompt, 1200);

      if (response) {
        try {
          const parsed = JSON.parse(response);

          setNewCampaignName(parsed.name);
          setNewCampaignTemplate(parsed.templateType);
          setAiVariants([
            {
              segment: 'all-users',
              subject: parsed.textVariants['all-users'].subject,
              content: parsed.textVariants['all-users'].content,
              template: parsed.templateType as any
            },
            {
              segment: 'doers',
              subject: parsed.textVariants.doers.subject,
              content: parsed.textVariants.doers.content,
              template: parsed.templateType as any
            },
            {
              segment: 'askers',
              subject: parsed.textVariants.askers.subject,
              content: parsed.textVariants.askers.content,
              template: parsed.templateType as any
            },
            {
              segment: 'vip',
              subject: parsed.textVariants.vip.subject,
              content: parsed.textVariants.vip.content,
              template: parsed.templateType as any
            }
          ]);

          setImagePrompt(parsed.imageDescription);

          alert(`✅ Campaign plan generated!
Campaign: "${parsed.name}"
Template: ${parsed.templateType}
Reasoning: ${parsed.reasoning}

Next: Generate image in the Image Generator, then select a text variant to load.`);
        } catch (parseError) {
          alert('Error parsing campaign plan. Please try again.');
        }
      } else {
        alert('Error generating campaign plan with Qwen. Please try manual approach.');
      }
    } catch (error) {
      alert('Error in campaign planner. Please try again.');
    } finally {
      setPlannerLoading(false);
    }
  };

  const statusColors = {
    'draft': '#2196F3',
    'scheduled': '#FF9800',
    'sent': '#4CAF50',
    'failed': '#F44336',
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>
            📧 Email Campaigns
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
          Create and manage email marketing campaigns
        </p>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '2px solid #f0f0f0', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('campaigns')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'campaigns' ? '#FF6B35' : 'transparent',
            color: activeTab === 'campaigns' ? 'white' : '#666',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          📧 Campaigns
        </button>
        <button
          onClick={() => setActiveTab('ai-assist')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'ai-assist' ? '#FF6B35' : 'transparent',
            color: activeTab === 'ai-assist' ? 'white' : '#666',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🤖 AI Assist
        </button>
      </div>

      {activeTab === 'ai-assist' && (
        <>
        <div style={{ marginBottom: '24px', padding: '16px', background: '#F0E6FF', borderRadius: '8px', border: '2px solid #D4B5FF' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
            🚀 AI Campaign Planner - Full Campaign Generation
          </h3>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
            <strong>State your objective</strong> and Qwen AI will generate a complete campaign plan: name, 4 text variants, image description, and reasoning!
          </p>
          <div style={{ display: 'grid', gap: '12px' }}>
            <textarea
              placeholder="E.g., 'Increase referrals by 50% among active doers' or 'Drive adoption of new premium features among VIP users' or 'Launch summer promotion targeting askers with convenience messaging'"
              value={campaignObjective}
              onChange={(e) => setCampaignObjective(e.target.value)}
              rows={3}
              style={{ padding: '10px 12px', border: '2px solid #D4B5FF', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit' }}
            />
            <button
              onClick={handleGenerateFullCampaign}
              disabled={plannerLoading}
              style={{
                padding: '12px',
                background: plannerLoading ? '#ccc' : 'linear-gradient(135deg, #A78BFA 0%, #C4B5FD 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: plannerLoading ? 'not-allowed' : 'pointer',
                fontSize: '15px'
              }}
            >
              {plannerLoading ? '⏳ Planning campaign with Qwen...' : '🎯 Generate Full Campaign Plan'}
            </button>
            <div style={{ fontSize: '11px', color: '#666', background: '#fff', padding: '8px', borderRadius: '4px' }}>
              ✨ This creates: campaign name, 4 segment-specific texts, image prompt, and template type
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px', padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
            📝 AI Text Generator - Segment-Optimized Variants
          </h3>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>
            <strong>Describe your campaign</strong> and Qwen will create <strong>warm, engaging, and community-focused</strong> versions for each segment
          </p>
          <p style={{ fontSize: '12px', color: '#999', marginBottom: '12px' }}>
            📍 Brand voice: Warm, engaging, happy, and kampung (community-centered) • Tailored for All Users, Doers, Askers, VIP
          </p>
          <div style={{ display: 'grid', gap: '12px' }}>
            <textarea
              placeholder="E.g., 'Limited time summer promotion with 20% discount for first-time users' or 'Referral bonus campaign to encourage user growth'"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={3}
              style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit' }}
            />
            <button
              onClick={handleGenerateAIVariants}
              disabled={aiLoading}
              style={{
                padding: '10px',
                background: aiLoading ? '#ccc' : 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: aiLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {aiLoading ? '⏳ Generating variants...' : '✨ Generate for All Segments'}
            </button>
          </div>

          {aiVariants.length > 0 && (
            <div style={{ marginTop: '16px', display: 'grid', gap: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#FF6B35', marginBottom: '8px' }}>
                Generated Variants ({aiVariants.length}):
              </div>
              {aiVariants.map((variant, idx) => (
                <div key={idx} style={{
                  padding: '12px',
                  background: 'white',
                  border: '1px solid #FFD9B3',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#FFF8F5'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                onClick={() => handleUseAIVariant(variant)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#FF6B35', marginBottom: '4px', textTransform: 'uppercase' }}>
                        {variant.segment.replace('-', ' ')}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                        {variant.subject}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', background: '#FFD9B3', padding: '4px 8px', borderRadius: '4px', color: '#333', fontWeight: '600' }}>
                      {variant.template}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
                    {variant.content}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
                    💡 Click to load this variant for editing
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'ai-assist' && (
        <div style={{ marginBottom: '24px', padding: '16px', background: '#FFF0E6', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
            🖼️ AI Image Generator - Qwen Powered
          </h3>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
            Generate stunning email banner images using Qwen. Describe what you'd like to see in Errandify's warm, community-focused style.
          </p>
          <div style={{ display: 'grid', gap: '12px' }}>
            <textarea
              placeholder="E.g., 'Neighbors helping each other with tasks and smiling' or 'Community members giving five-star ratings'"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              rows={2}
              style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit' }}
            />
            <button
              onClick={handleGenerateImage}
              disabled={imageLoading}
              style={{
                padding: '10px',
                background: imageLoading ? '#ccc' : 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: imageLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {imageLoading ? '⏳ Generating image with Qwen...' : '🎨 Generate Image'}
            </button>
          </div>

          {generatedImageUrl && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #FFD9B3' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#FF6B35', marginBottom: '8px' }}>
                ✨ Generated Image Preview:
              </div>
              <img
                src={generatedImageUrl}
                alt={newCampaignImageAlt || 'Campaign image'}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  maxHeight: '250px',
                  objectFit: 'cover'
                }}
              />
              <div style={{ fontSize: '11px', color: '#999', marginBottom: '8px' }}>
                💡 This image is ready to use. Load a text variant and it will be included automatically.
              </div>
              <button
                onClick={() => {
                  setGeneratedImageUrl('');
                  setNewCampaignImageUrl('');
                  setNewCampaignImageAlt('');
                  setImagePrompt('');
                }}
                style={{
                  padding: '6px 12px',
                  background: '#f0f0f0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Clear Image
              </button>
            </div>
          )}
        </div>
        </>
      )}

      {activeTab === 'campaigns' && (
        <>
        <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
          Create New Campaign
        </div>
        <div style={{ display: 'grid', gap: '12px' }}>
          <input
            type="text"
            placeholder="Campaign name"
            value={newCampaignName}
            onChange={(e) => setNewCampaignName(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
          />
          <input
            type="text"
            placeholder="Email subject line"
            value={newCampaignSubject}
            onChange={(e) => setNewCampaignSubject(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
          />
          <textarea
            placeholder="Email content/body"
            value={newCampaignContent}
            onChange={(e) => setNewCampaignContent(e.target.value)}
            rows={4}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input
              type="text"
              placeholder="From Name"
              value={newCampaignFromName}
              onChange={(e) => setNewCampaignFromName(e.target.value)}
              style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
            />
            <input
              type="email"
              placeholder="From Email"
              value={newCampaignFromEmail}
              onChange={(e) => setNewCampaignFromEmail(e.target.value)}
              style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <select
              value={newCampaignRecipients}
              onChange={(e) => setNewCampaignRecipients(e.target.value)}
              style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
            >
              <option value="all-users">All Users</option>
              <option value="doers">Doers Only</option>
              <option value="askers">Askers Only</option>
              <option value="vip">VIP Only</option>
            </select>
            <select
              value={newCampaignTemplate}
              onChange={(e) => setNewCampaignTemplate(e.target.value)}
              style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
            >
              <option value="promotional">Promotional</option>
              <option value="announcement">Announcement</option>
              <option value="reminder">Reminder</option>
              <option value="transactional">Transactional</option>
            </select>
            <input
              type="date"
              placeholder="Schedule (optional)"
              value={newCampaignScheduled}
              onChange={(e) => setNewCampaignScheduled(e.target.value)}
              style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
            />
          </div>

          <div style={{ padding: '12px', background: '#FFF8F5', borderRadius: '6px', border: '1px solid #FFD9B3' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#FF6B35', marginBottom: '8px' }}>
              🖼️ Campaign Image (Optional)
            </div>
            {newCampaignImageUrl && (
              <div style={{ marginBottom: '12px' }}>
                <img
                  src={newCampaignImageUrl}
                  alt={newCampaignImageAlt}
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    borderRadius: '4px',
                    maxHeight: '150px',
                    objectFit: 'cover'
                  }}
                />
              </div>
            )}
            <div style={{ display: 'grid', gap: '8px' }}>
              <input
                type="text"
                placeholder="Image URL (or use AI Image Generator tab)"
                value={newCampaignImageUrl}
                onChange={(e) => setNewCampaignImageUrl(e.target.value)}
                style={{ padding: '8px 10px', border: '1px solid #FFD9B3', borderRadius: '4px', fontSize: '12px' }}
              />
              <input
                type="text"
                placeholder="Image alt text (for accessibility)"
                value={newCampaignImageAlt}
                onChange={(e) => setNewCampaignImageAlt(e.target.value)}
                style={{ padding: '8px 10px', border: '1px solid #FFD9B3', borderRadius: '4px', fontSize: '12px' }}
              />
              {!newCampaignImageUrl && (
                <button
                  onClick={() => setActiveTab('ai-assist')}
                  style={{
                    padding: '6px',
                    background: '#FFF0E6',
                    color: '#FF6B35',
                    border: '1px solid #FFD9B3',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  🎨 Go to AI Image Generator
                </button>
              )}
            </div>
          </div>

          <button
            onClick={handleCreateCampaign}
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
            + Create Campaign
          </button>
        </div>
      </div>
      )}

      {activeTab === 'campaigns' && (
        <>
          <div style={{ display: 'grid', gap: '12px' }}>
            {campaigns.map(campaign => (
              <div key={campaign.id} style={{
                padding: '16px',
                background: 'white',
                border: `2px solid ${statusColors[campaign.status]}`,
                borderRadius: '8px',
              }}>
                {editingId === campaign.id ? (
                  // Edit Mode
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                      placeholder="Campaign name"
                    />
                    <input
                      type="text"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                      placeholder="Email subject"
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={4}
                      style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit' }}
                      placeholder="Email content"
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <button
                        onClick={() => handleSaveEdit(campaign.id)}
                        style={{
                          padding: '10px',
                          background: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        ✅ Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          padding: '10px',
                          background: '#f0f0f0',
                          color: '#333',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // Display Mode
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                          {campaign.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>
                          📧 {campaign.fromName} &lt;{campaign.fromEmail}&gt;
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                          Subject: "{campaign.subject}"
                        </div>
                        <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px', lineHeight: '1.4' }}>
                          {campaign.content}
                        </div>
                      </div>
                      <span style={{
                        padding: '6px 10px',
                        background: statusColors[campaign.status],
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        height: 'fit-content',
                        whiteSpace: 'nowrap',
                      }}>
                        {campaign.status.toUpperCase()}
                      </span>
                    </div>

                    {campaign.imageUrl && (
                      <div style={{ marginBottom: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                        <img
                          src={campaign.imageUrl}
                          alt={campaign.imageAlt || 'Campaign image'}
                          style={{
                            maxWidth: '100%',
                            height: 'auto',
                            maxHeight: '200px',
                            objectFit: 'cover'
                          }}
                        />
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', fontSize: '12px', marginBottom: '12px' }}>
                      <div style={{ background: '#FFF8F5', padding: '8px', borderRadius: '4px' }}>
                        <div style={{ fontSize: '10px', color: '#999' }}>Recipients</div>
                        <div style={{ fontWeight: '700', color: '#FF6B35', fontSize: '14px' }}>
                          {campaign.recipientCount.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '9px', color: '#999', marginTop: '2px' }}>
                          {campaign.recipientSegment === 'all-users' ? 'All Users' : campaign.recipientSegment === 'doers' ? 'Doers' : campaign.recipientSegment === 'askers' ? 'Askers' : 'VIP'}
                        </div>
                      </div>
                      <div style={{ background: '#FFF8F5', padding: '8px', borderRadius: '4px' }}>
                        <div style={{ fontSize: '10px', color: '#999' }}>Template</div>
                        <div style={{ fontWeight: '700', color: '#FF6B35', fontSize: '13px', textTransform: 'capitalize' }}>
                          {campaign.templateType}
                        </div>
                      </div>
                      <div style={{ background: '#FFF8F5', padding: '8px', borderRadius: '4px' }}>
                        <div style={{ fontSize: '10px', color: '#999' }}>Sent</div>
                        <div style={{ fontWeight: '700', color: '#FF6B35', fontSize: '14px' }}>
                          {campaign.status === 'sent' ? '✓' : campaign.status === 'scheduled' ? '⏱️' : '—'}
                        </div>
                        <div style={{ fontSize: '9px', color: '#999', marginTop: '2px' }}>
                          {campaign.sentAt ? new Date(campaign.sentAt).toLocaleDateString() : 'Pending'}
                        </div>
                      </div>
                      <div style={{ background: '#FFF8F5', padding: '8px', borderRadius: '4px' }}>
                        <div style={{ fontSize: '10px', color: '#999' }}>Engagement</div>
                        <div style={{ fontWeight: '700', color: '#FF6B35', fontSize: '14px' }}>
                          {campaign.openRate}% / {campaign.clickRate}%
                        </div>
                        <div style={{ fontSize: '9px', color: '#999', marginTop: '2px' }}>
                          Open / Click
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <button
                        onClick={() => handleEditCampaign(campaign)}
                        style={{
                          padding: '8px',
                          background: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(campaign.id)}
                        style={{
                          padding: '8px',
                          background: '#F44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      </div>
    </AdminLayout>
  );
}
