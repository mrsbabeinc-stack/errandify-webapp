import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  content: string;
  featured_image_url: string;
  category: string;
  author: string;
  published_at: string;
  read_time_minutes: number;
  view_count: number;
  seo_meta_description: string;
}

interface RelatedPost {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  featured_image_url: string;
  published_at: string;
  read_time_minutes: number;
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchPost(slug);
    }
  }, [slug]);

  const fetchPost = async (postSlug: string) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || window.location.origin}/api/blog/${postSlug}`
      );
      setPost(response.data.data);
      setRelatedPosts(response.data.data.related_posts || []);
    } catch (error) {
      console.error('Error fetching post:', error);
      navigate('/blog');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg flex items-center justify-center px-4 pb-24">
        <p className="text-gray-600">Loading article...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-errandify-bg flex items-center justify-center px-4 pb-24">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Article not found</p>
          <button
            onClick={() => navigate('/blog')}
            className="px-4 py-2 bg-errandify-orange text-white rounded hover:bg-orange-600"
          >
            Back to Blog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-errandify-bg px-4 py-8 pb-24">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/blog')}
          className="mb-6 text-errandify-orange hover:text-orange-600 font-semibold flex items-center gap-1"
        >
          ← Back to Blog
        </button>

        {/* Featured Image */}
        {post.featured_image_url && (
          <img
            src={post.featured_image_url}
            alt={post.title}
            className="w-full h-80 object-cover rounded-lg mb-6"
          />
        )}

        {/* Article Header */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-errandify-orange text-white px-3 py-1 rounded text-sm font-semibold">
              {post.category}
            </span>
            <span className="text-gray-500 text-sm">{post.read_time_minutes} min read</span>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-2">{post.title}</h1>
          <p className="text-lg text-gray-600 mb-4">{post.subtitle}</p>

          <div className="flex items-center justify-between text-sm text-gray-500 border-t border-gray-200 pt-4">
            <span>By {post.author}</span>
            <span>{new Date(post.published_at).toLocaleDateString('en-SG', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
            <span>👁️ {post.view_count} views</span>
          </div>
        </div>

        {/* Article Content */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="prose prose-lg max-w-none">
            {post.content.split('\n\n').map((paragraph, index) => {
              // Handle headings
              if (paragraph.startsWith('# ')) {
                return (
                  <h2 key={index} className="text-2xl font-bold text-gray-900 mt-6 mb-3">
                    {paragraph.replace(/^# /, '')}
                  </h2>
                );
              }
              if (paragraph.startsWith('## ')) {
                return (
                  <h3 key={index} className="text-xl font-bold text-gray-800 mt-5 mb-2">
                    {paragraph.replace(/^## /, '')}
                  </h3>
                );
              }
              if (paragraph.startsWith('### ')) {
                return (
                  <h4 key={index} className="text-lg font-bold text-gray-700 mt-4 mb-2">
                    {paragraph.replace(/^### /, '')}
                  </h4>
                );
              }

              // Handle bold and italics
              let content = paragraph
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code>$1</code>');

              // Handle links
              content = content.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-errandify-orange hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

              return (
                <p
                  key={index}
                  className="text-gray-700 leading-relaxed mb-4"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              );
            })}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-900">
            ⚠️ <strong>Disclaimer:</strong> This article is current as of{' '}
            {new Date(post.published_at).toLocaleDateString()}. Government policies and rates change.
            Please verify current details with official sources.
          </p>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="bg-white rounded-lg p-6 mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">📖 Related Articles</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {relatedPosts.map((relatedPost) => (
                <div
                  key={relatedPost.id}
                  onClick={() => navigate(`/blog/${relatedPost.slug}`)}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                >
                  {relatedPost.featured_image_url && (
                    <img
                      src={relatedPost.featured_image_url}
                      alt={relatedPost.title}
                      className="w-full h-24 object-cover rounded mb-3"
                    />
                  )}
                  <h4 className="font-bold text-sm text-gray-900 line-clamp-2 mb-2">
                    {relatedPost.title}
                  </h4>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{relatedPost.read_time_minutes} min</span>
                    <span>{new Date(relatedPost.published_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Share & CTA */}
        <div className="bg-white rounded-lg p-6">
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Found this helpful? Share it with someone who needs it. 💙
            </p>
            <div className="flex justify-center gap-3 mb-6">
              <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Facebook
              </button>
              <button className="px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600">
                Twitter
              </button>
              <button className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">
                Copy Link
              </button>
            </div>
            <button
              onClick={() => navigate('/blog')}
              className="text-errandify-orange hover:text-orange-600 font-semibold"
            >
              ← Back to all articles
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
