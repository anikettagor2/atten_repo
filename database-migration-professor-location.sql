-- Migration: Add professor location tracking to lectures table
-- Run this in Supabase SQL Editor

-- Add professor location columns to lectures table
-- This will track where the professor was when they started/conducted the lecture
ALTER TABLE lectures 
ADD COLUMN IF NOT EXISTS professor_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS professor_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS professor_location_captured_at TIMESTAMP WITH TIME ZONE;

-- Add index for location queries (optional, for future use)
CREATE INDEX IF NOT EXISTS idx_lectures_professor_location ON lectures(professor_latitude, professor_longitude) 
WHERE professor_latitude IS NOT NULL AND professor_longitude IS NOT NULL;

-- Add comment to document the fields
COMMENT ON COLUMN lectures.professor_latitude IS 'Professor location latitude when lecture is active';
COMMENT ON COLUMN lectures.professor_longitude IS 'Professor location longitude when lecture is active';
COMMENT ON COLUMN lectures.professor_location_captured_at IS 'Timestamp when professor location was captured';

