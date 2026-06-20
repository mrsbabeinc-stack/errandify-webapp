import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import blogPostsData from '../data/blogPosts';

export default function BlogDetailPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Find post by slug
    const foundPost = blogPostsData.find(p => p.slug === slug);
    if (foundPost) {
      setPost(foundPost);
    }
    setLoading(false);
  }, [slug]);

  const handleBack = () => {
    // Always go back to MyKampung page (the blog will show blog tab)
    navigate('/my-kampung');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg flex items-center justify-center">
        <p className="text-gray-600">Loading article...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-errandify-bg px-4 py-4 pb-20">
        <div className="max-w-3xl mx-auto">
          <button onClick={handleBack} className="mb-4 text-lg text-gray-600 font-bold hover:text-gray-800 transition">
            ‹ Back
          </button>
          <p className="text-gray-600">Article not found.</p>
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
              <span className="text-sm text-gray-500">
                {post.readTime} min read
              </span>
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
          <div className="prose prose-sm max-w-none text-gray-700 mb-8">
            {post.content.split('\n\n').map((paragraph: string, idx: number) => {
              // Handle headings
              if (paragraph.startsWith('# ')) {
                return <h1 key={idx} className="text-3xl font-bold text-errandify-brown mt-8 mb-4">{paragraph.replace('# ', '')}</h1>;
              }
              if (paragraph.startsWith('## ')) {
                return <h2 key={idx} className="text-2xl font-bold text-errandify-brown mt-6 mb-3">{paragraph.replace('## ', '')}</h2>;
              }
              if (paragraph.startsWith('### ')) {
                return <h3 key={idx} className="text-xl font-bold text-gray-800 mt-4 mb-2">{paragraph.replace('### ', '')}</h3>;
              }
              // Handle lists
              if (paragraph.startsWith('- ')) {
                const items = paragraph.split('\n').filter(line => line.startsWith('- '));
                return (
                  <ul key={idx} className="list-disc list-inside space-y-2 my-4 text-gray-700">
                    {items.map((item, i) => (
                      <li key={i}>{item.replace('- ', '')}</li>
                    ))}
                  </ul>
                );
              }
              // Handle tables
              if (paragraph.includes('|')) {
                return (
                  <div key={idx} className="overflow-x-auto my-4">
                    <table className="w-full border-collapse text-sm">
                      <tbody>
                        {paragraph.split('\n').map((row, ridx) => {
                          if (!row.trim() || row.includes('---')) return null;
                          const cells = row.split('|').filter(c => c.trim());
                          return (
                            <tr key={ridx} className={ridx === 0 ? 'bg-gray-100' : 'border-b'}>
                              {cells.map((cell, cidx) => (
                                <td key={cidx} className={`px-4 py-2 border ${ridx === 0 ? 'font-bold text-gray-800' : 'text-gray-700'}`}>
                                  {cell.trim()}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              }
              // Regular paragraphs
              return paragraph.trim() ? (
                <p key={idx} className="text-gray-700 mb-4 leading-relaxed">
                  {paragraph}
                </p>
              ) : null;
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-2 text-gray-600 hover:text-red-600 font-medium transition">
                  {post.isLiked ? '❤️' : '🤍'} {post.likes}
                </button>
              </div>
              <button className="px-4 py-2 bg-errandify-orange text-white rounded-lg hover:bg-opacity-90 transition font-medium">
                Share Article
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

          {/* CTA */}
          <div className="mt-12 p-6 bg-gradient-to-r from-errandify-orange to-orange-600 rounded-lg text-white">
            <h3 className="text-xl font-bold mb-2">Ready to Get Started?</h3>
            <p className="mb-4 opacity-90">Join thousands of Singaporeans building community through Errandify.</p>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2 bg-white text-errandify-orange rounded-lg font-bold hover:bg-opacity-90 transition"
            >
              Sign In / Join Now
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
