-- ============================================================================
-- Internly — Supabase Schema Migration
-- Run this in your Supabase SQL editor or via CLI migration.
-- ============================================================================

-- Enable the uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Table: listings
-- Stores all scraped internship listings with scoring metadata.
-- ============================================================================
CREATE TABLE IF NOT EXISTS listings (
  id            uuid        PRIMARY KEY,
  title         text        NOT NULL,
  company       text        NOT NULL,
  stipend       integer     DEFAULT 0,
  duration      text,
  posted_date   text,
  apply_url     text        UNIQUE NOT NULL,
  skills        text[]      DEFAULT '{}',
  is_remote     boolean     DEFAULT true,
  source        text,
  score         integer     DEFAULT 0,
  shortlisted   boolean     DEFAULT false,
  scraped_at    timestamptz DEFAULT now()
);

-- Index on apply_url for fast upsert conflict resolution
CREATE INDEX IF NOT EXISTS idx_listings_apply_url ON listings (apply_url);

-- Index on shortlisted + score for the dashboard query pattern
CREATE INDEX IF NOT EXISTS idx_listings_shortlisted_score ON listings (shortlisted, score DESC);

-- ============================================================================
-- Table: applications
-- Tracks application status for each listing through the pipeline.
-- ============================================================================
CREATE TABLE IF NOT EXISTS applications (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    uuid        REFERENCES listings(id) ON DELETE CASCADE,
  status        text        DEFAULT 'pending',   -- pending | applied | replied | interview | rejected
  applied_at    timestamptz,
  notes         text,
  updated_at    timestamptz DEFAULT now()
);

-- Index on listing_id for fast joins
CREATE INDEX IF NOT EXISTS idx_applications_listing_id ON applications (listing_id);

-- Index on status for filtering by pipeline stage
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications (status);

-- ============================================================================
-- Row Level Security (RLS) — Enable if using Supabase Auth
-- Uncomment the lines below to restrict access to authenticated users only.
-- ============================================================================
-- ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Allow authenticated read on listings"
--   ON listings FOR SELECT
--   USING (auth.role() = 'authenticated');
--
-- CREATE POLICY "Allow authenticated insert on listings"
--   ON listings FOR INSERT
--   WITH CHECK (auth.role() = 'authenticated');
--
-- CREATE POLICY "Allow authenticated read on applications"
--   ON applications FOR SELECT
--   USING (auth.role() = 'authenticated');
--
-- CREATE POLICY "Allow authenticated all on applications"
--   ON applications FOR ALL
--   USING (auth.role() = 'authenticated');
