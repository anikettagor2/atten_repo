-- Migration: Add location fields to attendance table
-- Run this in Supabase SQL Editor

-- Add latitude and longitude columns to attendance table
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add index for location queries (optional, for future use)
CREATE INDEX IF NOT EXISTS idx_attendance_location ON attendance(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comment to document the fields
COMMENT ON COLUMN attendance.latitude IS 'Student location latitude when marking attendance';
COMMENT ON COLUMN attendance.longitude IS 'Student location longitude when marking attendance';

