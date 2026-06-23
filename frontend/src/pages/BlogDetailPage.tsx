import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import blogPostsData from '../data/blogPosts';

export default function BlogDetailPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  // Find post by slug
  const post = blogPostsData.find(p => p.slug === slug);

  // Scroll to top when slug changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // Update meta tags and JSON-LD schema for SEO
  useEffect(() => {
    if (!post) return;

    // Update document title
    document.title = `${post.title} - Errandify Blog`;

    // Update/create meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', post.excerpt || post.title);
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content = post.excerpt || post.title;
      document.head.appendChild(newMeta);
    }

    // Open Graph tags
    updateMetaTag('og:title', post.title);
    updateMetaTag('og:description', post.excerpt || post.title);
    updateMetaTag('og:image', post.featured_image_url || 'https://errandify.sg/og-image.jpg');
    updateMetaTag('og:url', window.location.href);
    updateMetaTag('og:type', 'article');

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', post.title);
    updateMetaTag('twitter:description', post.excerpt || post.title);
    updateMetaTag('twitter:image', post.featured_image_url || 'https://errandify.sg/og-image.jpg');

    // Canonical URL
    updateCanonical(`https://errandify.sg/blog/${slug}`);

    // JSON-LD Article Schema
    const articleSchema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.excerpt || post.title,
      image: post.featured_image_url || 'https://errandify.sg/og-image.jpg',
      datePublished: post.published_at,
      dateModified: post.updated_at || post.published_at,
      author: {
        '@type': 'Organization',
        name: post.author || 'Errandify Team',
        url: 'https://errandify.sg'
      },
      publisher: {
        '@type': 'Organization',
        name: 'Errandify',
        logo: {
          '@type': 'ImageObject',
          url: 'https://errandify.sg/logo.png'
        }
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `https://errandify.sg/blog/${slug}`
      }
    };

    updateJsonLdSchema('article-schema', articleSchema);
  }, [slug]);

  // Helper functions for meta tag management
  const updateMetaTag = (name: string, content: string) => {
    let element = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
    if (!element) {
      element = document.createElement('meta');
      if (name.startsWith('og:') || name.startsWith('twitter:')) {
        element.setAttribute('property', name);
      } else {
        element.setAttribute('name', name);
      }
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  const updateCanonical = (url: string) => {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);
  };

  const updateJsonLdSchema = (id: string, schema: any) => {
    let script = document.getElementById(id);
    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);
  };

  // Get related articles (same category, different post)
  const relatedArticles = post
    ? blogPostsData
        .filter(p => p.category === post.category && p.id !== post.id)
        .slice(0, 3)
    : [];

  const handleBack = () => {
    navigate('/my-kampung', { state: { tab: 'blog' } });
  };

  const handleShare = () => {
    const url = `${window.location.origin}/blog/${slug}`;
    const title = post?.title || 'Check out this article';
    const text = `${title} - Errandify Community Blog`;

    // Try native share if available
    if (navigator.share) {
      navigator.share({
        title: 'Errandify Blog',
        text: text,
        url: url,
      }).catch(err => console.log('Share cancelled:', err));
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${text}\n${url}`);
      alert('Article link copied to clipboard!');
    }
  };

  if (!post) {
    return (
      <div className="min-h-screen bg-errandify-bg px-4 py-4 pb-20">
        <div className="max-w-3xl mx-auto">
          <button onClick={handleBack} className="mb-4 text-lg text-gray-600 font-bold hover:text-gray-800 transition">
            ‹ Back to MyKampung
          </button>
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <p className="text-gray-600">Article not found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-errandify-bg px-4 py-4 pb-20">
      <div className="max-w-3xl mx-auto">
        <button onClick={handleBack} className="mb-4 text-lg text-gray-600 font-bold hover:text-gray-800 transition">
          ‹ Back to MyKampung
        </button>

        <article className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
          {/* Header */}
          <div className="mb-8 border-b border-gray-200 pb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                post.category === 'guide' ? 'bg-blue-100 text-blue-700' :
                post.category === 'stories' ? 'bg-green-100 text-green-700' :
                post.category === 'tips' ? 'bg-orange-100 text-orange-700' :
                'bg-purple-100 text-purple-700'
              }`}>
                {post.category === 'guide' ? '📚 Guide' :
                 post.category === 'stories' ? '📖 Story' :
                 post.category === 'tips' ? '💡 Tips' :
                 '📰 News'}
              </span>
              <span className="text-sm text-gray-500">{post.readTime} min read</span>
            </div>

            <h1 className="text-4xl font-bold text-errandify-brown mb-4">{post.title}</h1>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>By {post.author}</span>
              <span>•</span>
              <span>{new Date(post.createdAt).toLocaleDateString('en-SG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-sm max-w-none text-gray-700 mb-8 whitespace-pre-wrap">
            {post.content}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-2 text-gray-600 hover:text-red-600 font-medium transition">
                  {post.isLiked ? '❤️' : '🤍'} {post.likes}
                </button>
              </div>
              <button
                onClick={handleShare}
                className="px-4 py-2 bg-errandify-orange text-white rounded-lg hover:bg-opacity-90 transition font-medium"
              >
                📤 Share
              </button>
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag: string) => (
                  <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 cursor-pointer transition">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className="mt-12 border-t border-gray-200 pt-8">
              <h3 className="text-2xl font-bold text-errandify-brown mb-6">Read More Articles</h3>
              <div className="grid grid-cols-1 gap-4">
                {relatedArticles.map((article) => (
                  <div
                    key={article.slug}
                    onClick={() => {
                      console.log('[Related Article Click]', article.slug);
                      navigate(`/blog/${article.slug}`);
                    }}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md hover:bg-white transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 hover:text-errandify-orange transition">
                          {article.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">{article.excerpt}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>{article.readTime} min read</span>
                          <span>•</span>
                          <span>By {article.author}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                        article.category === 'guide' ? 'bg-blue-100 text-blue-700' :
                        article.category === 'stories' ? 'bg-green-100 text-green-700' :
                        article.category === 'tips' ? 'bg-orange-100 text-orange-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {article.category === 'guide' ? '📚' :
                         article.category === 'stories' ? '📖' :
                         article.category === 'tips' ? '💡' :
                         '📰'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Back to Blog */}
          <div className="mt-8 text-center">
            <button
              onClick={handleBack}
              className="px-6 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              ← Back to MyKampung Blog
            </button>
          </div>
        </article>

        {/* CTA */}
        <div className="mt-8 p-6 bg-gradient-to-r from-errandify-orange to-orange-600 rounded-lg text-white">
          <h3 className="text-xl font-bold mb-2">Ready to Get Started?</h3>
          <p className="mb-4 opacity-90">Join thousands of Singaporeans building community through Errandify.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-white text-errandify-orange rounded-lg font-bold hover:bg-opacity-90 transition"
          >
            Sign In / Join Now
          </button>
        </div>
      </div>
    </div>
  );
}
