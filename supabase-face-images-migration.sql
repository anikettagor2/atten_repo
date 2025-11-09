-- Migration to add face_image_urls array column to profiles table
-- Run this in Supabase SQL Editor after the main setup

-- Add face_image_urls column as JSONB array to store multiple face images
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS face_image_urls JSONB DEFAULT '[]'::jsonb;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_face_image_urls ON profiles USING GIN (face_image_urls);

-- Update existing face_image_url to face_image_urls if it exists
UPDATE profiles 
SET face_image_urls = CASE 
  WHEN face_image_url IS NOT NULL AND face_image_url != '' THEN 
    jsonb_build_array(face_image_url)
  ELSE 
    '[]'::jsonb
END
WHERE face_image_urls IS NULL OR face_image_urls = '[]'::jsonb;

-- Note: You can optionally remove the old face_image_url column after migration
-- ALTER TABLE profiles DROP COLUMN IF EXISTS face_image_url;






