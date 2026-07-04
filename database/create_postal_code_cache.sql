-- Create postal_code_cache table for address lookups
-- Purpose: Cache Mapbox API responses to avoid repeated lookups
-- TTL: 90 days (data older than 90 days will be considered stale)

CREATE TABLE IF NOT EXISTS postal_code_cache (
  -- Primary key
  postal_code VARCHAR(6) NOT NULL PRIMARY KEY,

  -- Address information
  full_address VARCHAR(500) NOT NULL DEFAULT 'Singapore',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Location classification
  planning_area VARCHAR(100),     -- URA Planning Area (e.g., "Choa Chu Kang")
  subzone VARCHAR(100),           -- Future enhancement for URA Subzones

  -- Metadata
  provider VARCHAR(50) NOT NULL DEFAULT 'mapbox',  -- Which provider resolved this (mapbox, singpost, onemap, manual)
  confidence NUMERIC(3, 2) DEFAULT 0.95,            -- Confidence score 0.00-1.00

  -- User corrections
  manually_corrected BOOLEAN DEFAULT FALSE,
  corrected_by_user_id VARCHAR(50),

  -- Timestamps
  last_verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for cache lookups (primary operation: SELECT WHERE postal_code = X AND last_verified_at > ...)
CREATE INDEX IF NOT EXISTS idx_postal_code_cache_lookup
  ON postal_code_cache(postal_code, last_verified_at DESC);

-- Index for area-based queries (future: find all errands in an area)
CREATE INDEX IF NOT EXISTS idx_postal_code_cache_area
  ON postal_code_cache(planning_area);

-- Index for finding recently verified addresses (cache refresh queries)
CREATE INDEX IF NOT EXISTS idx_postal_code_cache_verified
  ON postal_code_cache(last_verified_at DESC);

-- Index for manually corrected addresses (audit/review)
CREATE INDEX IF NOT EXISTS idx_postal_code_cache_corrected
  ON postal_code_cache(manually_corrected, corrected_by_user_id)
  WHERE manually_corrected = TRUE;

-- Add comments for documentation
COMMENT ON TABLE postal_code_cache IS 'Cache for Mapbox address lookups - reduces API calls by 50-70%';
COMMENT ON COLUMN postal_code_cache.postal_code IS 'Singapore postal code (6 digits) - unique identifier';
COMMENT ON COLUMN postal_code_cache.full_address IS 'Full street address from Mapbox reverse geocoding';
COMMENT ON COLUMN postal_code_cache.planning_area IS 'URA Planning Area from official postal code sector mapping';
COMMENT ON COLUMN postal_code_cache.provider IS 'Which service resolved this lookup (mapbox/singpost/onemap/manual)';
COMMENT ON COLUMN postal_code_cache.confidence IS 'Confidence score 0-1 (0.95 for Mapbox, varies for others)';
COMMENT ON COLUMN postal_code_cache.manually_corrected IS 'TRUE if user manually corrected the result';
COMMENT ON COLUMN postal_code_cache.last_verified_at IS 'When this cache entry was last verified (90-day TTL)';
