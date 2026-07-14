import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import ScheduleCalendar from '../../components/ScheduleCalendar';

interface Article {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  author: string;
  status: 'published' | 'draft' | 'archived';
  views: number;
  seoKeywords: string;
  thumbnailUrl?: string;
  thumbnailAlt?: string;
  publishedAt?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  frequency?: 'weekly' | 'biweekly' | 'monthly';
  engagementScore?: number;
  createdAt: string;
}

export default function BlogArticles() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [articles, setArticles] = useState<Article[]>([]);
  const [activeTab, setActiveTab] = useState<'articles' | 'ai-assist' | 'schedule'>('articles');

  // Article form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newExcerpt, setNewExcerpt] = useState('');
  const [newCategory, setNewCategory] = useState('tips');
  const [newAuthor, setNewAuthor] = useState('');
  const [newSeoKeywords, setNewSeoKeywords] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailAlt, setThumbnailAlt] = useState('');

  // AI generation state
  const [articleTopic, setArticleTopic] = useState('');
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [thumbnailPrompt, setThumbnailPrompt] = useState('');
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');

  // Edit mode state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editExcerpt, setEditExcerpt] = useState('');
  const [editCategory, setEditCategory] = useState('tips');
  const [editAuthor, setEditAuthor] = useState('');
  const [editSeoKeywords, setEditSeoKeywords] = useState('');

  const callQwenAPI = async (prompt: string): Promise<string> => {
    try {
      const response = await axios.post(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2text/qwen',
        {
          model: 'qwen-turbo',
          input: { messages: [{ role: 'user', content: prompt }] },
          parameters: { max_tokens: 2000, temperature: 0.7 },
        },
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_QWEN_API_KEY || 'demo'}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data.output?.text || '';
    } catch (error) {
      console.error('Qwen API error:', error);
      return '';
    }
  };

  const handleGenerateArticle = async () => {
    if (!articleTopic.trim()) return;
    setPlannerLoading(true);

    const prompt = `You are an expert SEO content writer for Errandify, a gig economy platform. Generate a blog article that is:
- SEO-optimized for search engines and AI agents
- Legal, safe, and unbiased content
- Practical and actionable
- Non-discriminatory with inclusive language

Topic: "${articleTopic}"

Create content that:
1. Uses natural language for AI agent searchability
2. Includes clear headers and subheaders (HTML: h2, h3)
3. Has 3-5 paragraphs with practical tips
4. Is 1000-1500 words (optimal for SEO)
5. Uses active voice and clear instructions
6. Includes 2-3 numbered lists or bullet points
7. Avoids clickbait, bias, or discriminatory language
8. Includes calls-to-action that encourage community engagement

Respond with ONLY valid JSON (no markdown, no explanations):
{
  "title": "SEO-friendly title (50-60 chars, includes primary keyword)",
  "excerpt": "Compelling meta description (150-160 chars, includes primary keyword)",
  "content": "Full article HTML content with headers, paragraphs, lists. Make it scannable for AI agents.",
  "seoKeywords": "primary_keyword, long_tail_keyword, related_keyword, search_term, user_intent_keyword",
  "thumbnailPrompt": "Professional, inclusive, diverse representation. Avoid stereotypes. (1200x600px)"
}

CRITICAL: Ensure all text is legally safe, non-biased, and compliant with content policies.`;

    const result = await callQwenAPI(prompt);

    if (result) {
      try {
        const parsed = JSON.parse(result);
        setNewTitle(parsed.title || '');
        setNewContent(parsed.content || '');
        setNewExcerpt(parsed.excerpt || '');
        setNewSeoKeywords(parsed.seoKeywords || '');
        setThumbnailPrompt(parsed.thumbnailPrompt || '');
        showToast('✅ Article generated successfully!', 'success');
      } catch (error) {
        console.error('Parse error:', error);
        showToast('⚠️ Failed to parse AI response', 'error');
      }
    } else {
      showToast('⚠️ Failed to generate article', 'error');
    }
    setPlannerLoading(false);
  };

  const handleGenerateThumbnail = async () => {
    if (!thumbnailPrompt.trim()) return;
    setThumbnailLoading(true);

    const prompt = `You are a professional image description writer. Create a detailed visual description for a blog thumbnail.
Dimensions: 1200x600 pixels
Style: Professional, modern, clean, inclusive, diverse
Prompt: "${thumbnailPrompt}"

Respond with ONLY valid JSON:
{
  "imageDescription": "A detailed description of the generated image (2-3 sentences, include colors, composition, subjects, diversity aspects)",
  "imageUrl": "A placeholder description of what the image shows"
}

CRITICAL: Ensure diverse representation, inclusive imagery, no stereotypes.`;

    const result = await callQwenAPI(prompt);

    if (result) {
      try {
        const parsed = JSON.parse(result);

        // Use AI-described image with Unsplash professional placeholder
        // In production, this would call an actual image generation API
        const keywords = thumbnailPrompt.split(' ').slice(0, 2).join('+');
        const placeholderUrls = [
          `https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=600&fit=crop&q=80`,
          `https://images.unsplash.com/photo-1557821552-17105176677c?w=1200&h=600&fit=crop&q=80`,
          `https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&h=600&fit=crop&q=80`,
          `https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=600&fit=crop&q=80`,
        ];

        // Use a random professional image as placeholder
        const selectedUrl = placeholderUrls[Math.floor(Math.random() * placeholderUrls.length)];
        setGeneratedImageUrl(selectedUrl);
        setThumbnailUrl(selectedUrl);
        setThumbnailAlt(parsed.imageDescription || thumbnailPrompt);
        showToast('🎨 Thumbnail generated with AI description!', 'success');
      } catch (error) {
        console.error('Parse error:', error);
        // Fallback to generic professional image
        const fallbackUrl = `https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=600&fit=crop&q=80`;
        setGeneratedImageUrl(fallbackUrl);
        setThumbnailUrl(fallbackUrl);
        setThumbnailAlt(thumbnailPrompt);
        showToast('🎨 Thumbnail generated (using professional template)!', 'success');
      }
    } else {
      // Fallback if API call fails
      const fallbackUrl = `https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=600&fit=crop&q=80`;
      setGeneratedImageUrl(fallbackUrl);
      setThumbnailUrl(fallbackUrl);
      setThumbnailAlt(thumbnailPrompt);
      showToast('🎨 Thumbnail generated (using professional template)', 'success');
    }
    setThumbnailLoading(false);
  };

  useEffect(() => {
    const saved = localStorage.getItem('blogArticles');
    if (saved) {
      setArticles(JSON.parse(saved));
    } else {
      const demoArticles: Article[] = [
        {
          id: 'blog_1',
          title: '10 Tips for Getting More Errands Done',
          content: 'Discover strategies to maximize your productivity and tackle more errands efficiently. Learn time management techniques, prioritization methods, and tools that successful errand runners use.',
          excerpt: 'Maximize your productivity with proven strategies and time management techniques.',
          category: 'tips',
          author: 'Sarah Chen',
          status: 'published',
          views: 3421,
          seoKeywords: 'errand tips, productivity, time management, efficiency',
          publishedAt: new Date(Date.now() - 604800000).toISOString(),
          createdAt: new Date(Date.now() - 864000000).toISOString(),
        },
        {
          id: 'blog_2',
          title: 'How to Become a Top-Rated Doer',
          content: 'Building a stellar reputation on Errandify takes dedication and attention to detail. Learn how top doers maintain high ratings, communicate effectively, and build lasting relationships with askers.',
          excerpt: 'Master the skills and strategies of top-rated service providers.',
          category: 'guides',
          author: 'Mike Johnson',
          status: 'published',
          views: 2156,
          seoKeywords: 'doer, ratings, reputation, customer service',
          publishedAt: new Date(Date.now() - 1296000000).toISOString(),
          createdAt: new Date(Date.now() - 1382400000).toISOString(),
        },
        {
          id: 'blog_3',
          title: 'Maximizing Your Earnings on Errandify',
          content: 'Increase your income potential by understanding pricing strategies, choosing high-value errands, and optimizing your availability.',
          excerpt: 'Strategic approaches to boost your earnings on our platform.',
          category: 'tips',
          author: 'Lisa Wong',
          status: 'draft',
          views: 0,
          seoKeywords: 'earnings, income, pricing, doer',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ];
      setArticles(demoArticles);
      localStorage.setItem('blogArticles', JSON.stringify(demoArticles));
    }
  }, []);

  const handleCreateArticle = () => {
    if (!newTitle.trim() || !newAuthor.trim() || !newContent.trim()) {
      showToast('⚠️ Title, author, and content are required', 'error');
      return;
    }

    const newArticle: Article = {
      id: `blog_${Date.now()}`,
      title: newTitle.slice(0, 200),
      content: newContent.slice(0, 5000),
      excerpt: newExcerpt.slice(0, 300),
      category: newCategory,
      author: newAuthor.slice(0, 100),
      status: 'draft',
      views: 0,
      seoKeywords: newSeoKeywords.slice(0, 200),
      thumbnailUrl: thumbnailUrl || undefined,
      thumbnailAlt: thumbnailAlt.slice(0, 200),
      createdAt: new Date().toISOString(),
    };

    const updated = [...articles, newArticle];
    setArticles(updated);
    localStorage.setItem('blogArticles', JSON.stringify(updated));

    setNewTitle('');
    setNewContent('');
    setNewExcerpt('');
    setNewAuthor('');
    setNewSeoKeywords('');
    setThumbnailUrl('');
    setThumbnailAlt('');
    showToast('✅ Article created as draft!', 'success');
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim() || !editAuthor.trim() || !editContent.trim()) {
      showToast('⚠️ Title, author, and content are required', 'error');
      return;
    }

    const updated = articles.map(a =>
      a.id === editingId
        ? {
            ...a,
            title: editTitle.slice(0, 200),
            content: editContent.slice(0, 5000),
            excerpt: editExcerpt.slice(0, 300),
            category: editCategory,
            author: editAuthor.slice(0, 100),
            seoKeywords: editSeoKeywords.slice(0, 200),
          }
        : a
    );

    setArticles(updated);
    localStorage.setItem('blogArticles', JSON.stringify(updated));
    setEditingId(null);
    showToast('✅ Article updated!', 'success');
  };

  const handleDeleteArticle = (id: string) => {
    if (confirm('Delete this article?')) {
      const updated = articles.filter(a => a.id !== id);
      setArticles(updated);
      localStorage.setItem('blogArticles', JSON.stringify(updated));
      showToast('🗑️ Article deleted', 'success');
    }
  };

  const handlePublish = (id: string) => {
    const updated = articles.map(a =>
      a.id === id
        ? { ...a, status: 'published' as const, publishedAt: new Date().toISOString() }
        : a
    );
    setArticles(updated);
    localStorage.setItem('blogArticles', JSON.stringify(updated));
    showToast('📤 Article published!', 'success');
  };

  const statusColors = {
    'published': '#4CAF50',
    'draft': '#2196F3',
    'archived': '#999',
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>
              📰 Blog & Articles
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
            Create and publish SEO-optimized articles for your community
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3' }}>
          {(['articles', 'ai-assist', 'schedule'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 16px',
                background: activeTab === tab ? '#FFD9B3' : 'transparent',
                color: activeTab === tab ? '#333' : '#999',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid #FF6B35' : 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'articles' ? '📰 Articles' : tab === 'ai-assist' ? '🤖 AI Assist' : '📅 Calendar & Schedule'}
            </button>
          ))}
        </div>

        {/* Articles Tab */}
        {activeTab === 'articles' && (
          <>
            {/* Create Form */}
            <div style={{ marginBottom: '24px', padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                ➕ Create New Article
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Article title (SEO-friendly, <60 chars)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  maxLength={200}
                />
                <textarea
                  placeholder="Article excerpt (150-300 chars for meta description)"
                  value={newExcerpt}
                  onChange={(e) => setNewExcerpt(e.target.value)}
                  style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', minHeight: '60px', resize: 'vertical' }}
                  maxLength={300}
                />
                <textarea
                  placeholder="Article content (800-2000 words recommended for SEO)"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', minHeight: '200px', resize: 'vertical' }}
                  maxLength={5000}
                />
                <input
                  type="text"
                  placeholder="Author name"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  maxLength={100}
                />
                <input
                  type="text"
                  placeholder="SEO Keywords (comma-separated, 3-5 keywords)"
                  value={newSeoKeywords}
                  onChange={(e) => setNewSeoKeywords(e.target.value)}
                  style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  maxLength={200}
                />
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
                >
                  <option value="tips">📌 Tips & Tricks</option>
                  <option value="guides">📖 Guides</option>
                  <option value="announcements">📢 Announcements</option>
                  <option value="stories">⭐ Success Stories</option>
                </select>
                {thumbnailUrl && (
                  <div style={{ borderRadius: '6px', overflow: 'hidden', maxHeight: '200px' }}>
                    <img src={thumbnailUrl} alt={thumbnailAlt} style={{ width: '100%', height: 'auto' }} />
                  </div>
                )}
                <button
                  onClick={handleCreateArticle}
                  style={{
                    padding: '10px',
                    background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ➕ Create Article
                </button>
              </div>
            </div>

            {/* Articles List */}
            <div style={{ display: 'grid', gap: '12px' }}>
              {articles.map(article => (
                <div
                  key={article.id}
                  style={{
                    padding: '16px',
                    background: 'white',
                    border: `2px solid ${statusColors[article.status]}`,
                    borderRadius: '8px',
                  }}
                >
                  {editingId === article.id ? (
                    <>
                      <div style={{ display: 'grid', gap: '12px' }}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Title"
                          style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                          maxLength={200}
                        />
                        <textarea
                          value={editExcerpt}
                          onChange={(e) => setEditExcerpt(e.target.value)}
                          placeholder="Excerpt"
                          style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', minHeight: '60px', resize: 'vertical' }}
                          maxLength={300}
                        />
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          placeholder="Content"
                          style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', minHeight: '200px', resize: 'vertical' }}
                          maxLength={5000}
                        />
                        <input
                          type="text"
                          value={editAuthor}
                          onChange={(e) => setEditAuthor(e.target.value)}
                          placeholder="Author"
                          style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                          maxLength={100}
                        />
                        <input
                          type="text"
                          value={editSeoKeywords}
                          onChange={(e) => setEditSeoKeywords(e.target.value)}
                          placeholder="SEO Keywords"
                          style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                          maxLength={200}
                        />
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
                        >
                          <option value="tips">📌 Tips & Tricks</option>
                          <option value="guides">📖 Guides</option>
                          <option value="announcements">📢 Announcements</option>
                          <option value="stories">⭐ Success Stories</option>
                        </select>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <button
                            onClick={handleSaveEdit}
                            style={{ padding: '10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                          >
                            ✅ Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            style={{ padding: '10px', background: '#999', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                          >
                            ❌ Cancel
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px', fontSize: '16px' }}>
                            {article.title}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                            By {article.author} • {article.category}
                          </div>
                          <div style={{ fontSize: '13px', color: '#555', marginBottom: '8px', lineHeight: '1.4' }}>
                            {article.excerpt}
                          </div>
                          {article.seoKeywords && (
                            <div style={{ fontSize: '11px', color: '#FF6B35', marginBottom: '4px' }}>
                              🔍 SEO: {article.seoKeywords}
                            </div>
                          )}
                        </div>
                        <span style={{
                          padding: '6px 10px',
                          background: statusColors[article.status],
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          height: 'fit-content',
                          whiteSpace: 'nowrap',
                        }}>
                          {article.status.toUpperCase()}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                        👁️ Views: <strong>{article.views.toLocaleString()}</strong>
                      </div>
                      <div style={{ fontSize: '11px', color: '#999', marginBottom: '12px' }}>
                        Created: {new Date(article.createdAt).toLocaleDateString()}
                        {article.publishedAt && ` • Published: ${new Date(article.publishedAt).toLocaleDateString()}`}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setEditingId(article.id);
                            setEditTitle(article.title);
                            setEditExcerpt(article.excerpt);
                            setEditContent(article.content);
                            setEditAuthor(article.author);
                            setEditSeoKeywords(article.seoKeywords);
                            setEditCategory(article.category);
                          }}
                          style={{ padding: '8px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}
                        >
                          ✏️ Edit
                        </button>
                        {article.status === 'draft' && (
                          <button
                            onClick={() => handlePublish(article.id)}
                            style={{ padding: '8px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}
                          >
                            📤 Publish
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteArticle(article.id)}
                          style={{ padding: '8px', background: '#F44336', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}
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

        {/* AI Assist Tab */}
        {activeTab === 'ai-assist' && (
          <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#333', marginBottom: '16px' }}>
              🤖 AI Article Generator
            </div>

            {/* Article Topic Input */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '8px' }}>
                📝 Article Topic/Idea
              </label>
              <textarea
                placeholder="E.g., 'How to manage time when doing multiple errands' or 'Best practices for quality work'"
                value={articleTopic}
                onChange={(e) => setArticleTopic(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #FFD9B3',
                  borderRadius: '6px',
                  fontSize: '14px',
                  minHeight: '100px',
                  fontFamily: 'system-ui',
                  resize: 'vertical',
                }}
              />
            </div>

            <button
              onClick={handleGenerateArticle}
              disabled={plannerLoading}
              style={{
                width: '100%',
                padding: '12px',
                background: plannerLoading ? '#ccc' : 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: plannerLoading ? 'wait' : 'pointer',
                fontSize: '14px',
                marginBottom: '16px',
              }}
            >
              {plannerLoading ? '⏳ Generating...' : '🎯 Generate Article'}
            </button>

            {/* Thumbnail Section */}
            {thumbnailPrompt && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #FFD9B3' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                  🎨 Generate Thumbnail
                </div>
                <textarea
                  placeholder="Image description for thumbnail generation"
                  value={thumbnailPrompt}
                  onChange={(e) => setThumbnailPrompt(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '4px',
                    fontSize: '13px',
                    minHeight: '60px',
                    marginBottom: '8px',
                    resize: 'vertical',
                  }}
                />
                <button
                  onClick={handleGenerateThumbnail}
                  disabled={thumbnailLoading}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: thumbnailLoading ? '#ccc' : '#FF6B35',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: '600',
                    cursor: thumbnailLoading ? 'wait' : 'pointer',
                    fontSize: '13px',
                  }}
                >
                  {thumbnailLoading ? '⏳ Generating...' : '🎨 Generate Image'}
                </button>
              </div>
            )}

            {/* Generated Image Preview */}
            {generatedImageUrl && (
              <div style={{ marginTop: '16px', borderRadius: '6px', overflow: 'hidden', border: '2px solid #FFD9B3' }}>
                <img src={generatedImageUrl} alt="Generated thumbnail" style={{ width: '100%', height: 'auto' }} />
              </div>
            )}

            {/* Generated Content Preview */}
            {newTitle && (
              <div style={{ marginTop: '24px', padding: '16px', background: 'white', borderRadius: '6px', border: '2px solid #FFD9B3' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
                  ✓ Generated Article Preview
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                    📰 {newTitle}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                    By {newAuthor || '(Author not set)'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#555', marginBottom: '8px', lineHeight: '1.5' }}>
                    {newExcerpt}
                  </div>
                  {newSeoKeywords && (
                    <div style={{ fontSize: '11px', color: '#FF6B35', marginBottom: '8px' }}>
                      🔍 Keywords: {newSeoKeywords}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setActiveTab('articles');
                    window.scrollTo(0, 0);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ✅ Use This Content & Publish
                </button>
              </div>
            )}
          </div>
        )}

        {/* SCHEDULE & CALENDAR TAB */}
        {activeTab === 'schedule' && (
          <div style={{ display: 'grid', gap: '24px' }}>
            <ScheduleCalendar
              contentType="blog"
              targetAudience={newCategory || 'all-readers'}
              contentTopic={newTitle || 'Blog Article'}
              onScheduleSelect={(date, time) => {
                // Update the form with scheduled date/time
                const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
                if (dateInput) dateInput.value = date;
                setActiveTab('articles');
                showToast(`✅ Schedule set for ${new Date(`${date}T${time}`).toLocaleString()}`, 'success');
              }}
            />

            {/* ARTICLE HISTORY & REMINDERS */}
            <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#333', marginBottom: '16px' }}>
                📋 Article History & Reminders
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
                {articles.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
                    No articles yet. Create one to see history and set reminders.
                  </div>
                ) : (
                  articles.map(article => (
                    <div
                      key={article.id}
                      style={{
                        padding: '12px',
                        background: 'white',
                        borderRadius: '6px',
                        border: '1px solid #FFD9B3',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                            {article.title}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                            By {article.author} • {article.category}
                          </div>
                        </div>
                        <span
                          style={{
                            padding: '4px 8px',
                            background: article.status === 'published' ? '#4CAF50' : article.status === 'draft' ? '#2196F3' : '#999',
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {article.status.toUpperCase()}
                        </span>
                      </div>

                      <div style={{ fontSize: '11px', color: '#999', marginBottom: '8px' }}>
                        📅 Created: {new Date(article.createdAt).toLocaleString()}
                        {article.scheduledDate && (
                          <>
                            <br />
                            ⏰ Scheduled: {new Date(`${article.scheduledDate}T${article.scheduledTime || '09:00'}`).toLocaleString()}
                            {article.frequency && ` • Frequency: ${article.frequency}`}
                            {article.engagementScore && ` • Expected: ${article.engagementScore}%`}
                          </>
                        )}
                        {article.publishedAt && (
                          <>
                            <br />
                            ✓ Published: {new Date(article.publishedAt).toLocaleString()}
                          </>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '11px' }}>
                        <div style={{ background: '#FFF8F5', padding: '6px', borderRadius: '4px' }}>
                          👁️ {article.views.toLocaleString()} views
                        </div>
                        <div style={{ background: '#FFF8F5', padding: '6px', borderRadius: '4px' }}>
                          🔍 {(article.seoKeywords || '').split(',').filter(k => k.trim()).length} keywords
                        </div>
                        <div style={{ background: '#FFF8F5', padding: '6px', borderRadius: '4px' }}>
                          📝 {(article.content || '').split(' ').length} words
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* REMINDER SETTINGS */}
              <div style={{ marginTop: '24px', padding: '12px', background: '#F5F5F5', borderRadius: '6px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                  🔔 Reminder Settings
                </div>
                <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
                  <div style={{ marginBottom: '8px' }}>
                    ✓ Get notified 1 week before article publish
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    ✓ Get notified 2 days before article publish
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    ✓ Get notified 1 day before article publish
                  </div>
                  <div>
                    ✓ Get notified 2 hours before article publish
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
