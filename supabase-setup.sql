-- ============================================
-- ATOCRANE - COMPLETE SUPABASE SETUP
-- ============================================
-- This is the single comprehensive SQL setup file
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Create Tables
-- ============================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'professor', 'admin')),
  face_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lectures table
CREATE TABLE IF NOT EXISTS lectures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  professor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE NOT NULL,
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  method TEXT NOT NULL DEFAULT 'face_recognition',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, lecture_id)
);

-- ============================================
-- STEP 2: Enable Row Level Security
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Create RLS Policies
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

DROP POLICY IF EXISTS "Anyone can view lectures" ON lectures;
DROP POLICY IF EXISTS "Professors can create lectures" ON lectures;
DROP POLICY IF EXISTS "Professors can update their own lectures" ON lectures;
DROP POLICY IF EXISTS "Professors can delete their own lectures" ON lectures;

DROP POLICY IF EXISTS "Students can view their own attendance" ON attendance;
DROP POLICY IF EXISTS "Students can insert their own attendance" ON attendance;
DROP POLICY IF EXISTS "Professors can view attendance for their lectures" ON attendance;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Lectures policies
CREATE POLICY "Anyone can view lectures"
  ON lectures FOR SELECT
  USING (true);

CREATE POLICY "Professors can create lectures"
  ON lectures FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('professor', 'admin')
    )
    AND professor_id = auth.uid()
  );

CREATE POLICY "Professors can update their own lectures"
  ON lectures FOR UPDATE
  USING (
    professor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    professor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Professors can delete their own lectures"
  ON lectures FOR DELETE
  USING (
    professor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Attendance policies
CREATE POLICY "Students can view their own attendance"
  ON attendance FOR SELECT
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('professor', 'admin')
    )
  );

CREATE POLICY "Students can insert their own attendance"
  ON attendance FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Professors can view attendance for their lectures"
  ON attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = attendance.lecture_id
      AND lectures.professor_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- STEP 4: Create Trigger Function for Auto Profile Creation
-- ============================================

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile for new user
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = COALESCE(EXCLUDED.email, profiles.email),
    name = COALESCE(EXCLUDED.name, profiles.name),
    role = COALESCE(EXCLUDED.role, profiles.role),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 5: Create Update Timestamp Function
-- ============================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_lectures_updated_at ON lectures;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lectures_updated_at 
  BEFORE UPDATE ON lectures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 6: Create Storage Bucket for Face Images
-- ============================================

-- Create storage bucket for face images
INSERT INTO storage.buckets (id, name, public)
VALUES ('face-images', 'face-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for face-images bucket
DROP POLICY IF EXISTS "Anyone can upload face images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view face images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own face images" ON storage.objects;

CREATE POLICY "Anyone can upload face images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'face-images');

CREATE POLICY "Anyone can view face images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'face-images');

CREATE POLICY "Users can delete their own face images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'face-images');

-- ============================================
-- STEP 7: Create Indexes for Performance
-- ============================================

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Indexes for lectures
CREATE INDEX IF NOT EXISTS idx_lectures_professor_id ON lectures(professor_id);
CREATE INDEX IF NOT EXISTS idx_lectures_scheduled_time ON lectures(scheduled_time);

-- Indexes for attendance
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_lecture_id ON attendance(lecture_id);
CREATE INDEX IF NOT EXISTS idx_attendance_marked_at ON attendance(marked_at);

-- ============================================
-- STEP 8: Clean Up Orphaned Data (Optional)
-- ============================================

-- Delete any orphaned profiles (profiles without corresponding users)
DELETE FROM profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- All tables are created with RLS enabled
-- Trigger will automatically create profiles on signup
-- Storage bucket is ready for face images
-- You can now test signup, login, and dashboard functionality
-- ============================================

