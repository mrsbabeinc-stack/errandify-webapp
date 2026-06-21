-- Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  subtitle VARCHAR(500),
  content TEXT NOT NULL,
  excerpt VARCHAR(1000),
  featured_image_url VARCHAR(500),
  category VARCHAR(100),
  author VARCHAR(200) DEFAULT 'Errandify Team',
  published_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  view_count INTEGER DEFAULT 0,
  read_time_minutes INTEGER,
  seo_keywords VARCHAR(500),
  seo_meta_description VARCHAR(500),
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create blog_comments table (for future use)
CREATE TABLE IF NOT EXISTS blog_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  comment_text TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_blog_published ON blog_posts(is_published, published_at DESC);
CREATE INDEX idx_blog_category ON blog_posts(category);
CREATE INDEX idx_blog_slug ON blog_posts(slug);
