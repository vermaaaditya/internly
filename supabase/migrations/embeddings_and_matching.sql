-- ============================================================================
-- Internly — Vector Embeddings & Semantic Search Migration
-- ============================================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add description text column if it does not already exist
ALTER TABLE listings ADD COLUMN IF NOT EXISTS description text;

-- 3. Add embedding vector(384) column if it does not already exist
ALTER TABLE listings ADD COLUMN IF NOT EXISTS embedding vector(384);

-- 4. Create semantic matching RPC function
CREATE OR REPLACE FUNCTION match_listings (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  title text,
  company text,
  stipend integer,
  duration text,
  posted_date text,
  apply_url text,
  skills text[],
  is_remote boolean,
  source text,
  score integer,
  shortlisted boolean,
  scraped_at timestamptz,
  description text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    listings.id,
    listings.title,
    listings.company,
    listings.stipend,
    listings.duration,
    listings.posted_date,
    listings.apply_url,
    listings.skills,
    listings.is_remote,
    listings.source,
    listings.score,
    listings.shortlisted,
    listings.scraped_at,
    listings.description,
    1 - (listings.embedding <=> query_embedding) AS similarity
  FROM listings
  WHERE 1 - (listings.embedding <=> query_embedding) > match_threshold
  ORDER BY listings.embedding <=> query_embedding
  LIMIT match_count;
$$;
