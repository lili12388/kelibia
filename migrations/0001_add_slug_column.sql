-- Migration: Add slug column to properties table for SEO-friendly URLs
-- Run this on your production database before deploying the new code
-- After running this migration, call POST /api/broker/backfill-slugs to generate slugs for existing properties

ALTER TABLE properties ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index on slug for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS properties_slug_idx ON properties(slug);
