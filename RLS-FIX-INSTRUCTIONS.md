# Fix RLS Policy Error for Signup

## Problem
You're getting "new row violates row-level security policy for table 'profiles'" during signup.

## Solution

Run the SQL script `fix-rls-policies.sql` in your Supabase SQL Editor. This will:

1. Create a database trigger that automatically creates a profile when a user signs up (bypasses RLS)
2. Update RLS policies to be more permissive
3. Allow users to view all profiles (needed for professors to see students)

## Steps

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `fix-rls-policies.sql`
4. Run the SQL script
5. Try signing up again

## What the fix does

- **Database Trigger**: Automatically creates a profile when a new user signs up using `SECURITY DEFINER`, which bypasses RLS policies
- **Updated RLS Policies**: 
  - Users can view their own profile
  - Anyone can view all profiles (needed for professors)
  - Users can update their own profile
  - Users can insert their own profile (fallback)

## Alternative: Manual Profile Creation

If you prefer to create profiles manually in the signup flow, you can also:

1. Temporarily disable RLS on profiles table (not recommended for production)
2. Use the Supabase service role key for profile creation (requires backend)
3. Use the database trigger (recommended - already in the fix script)

The database trigger approach is the most secure and reliable method.









