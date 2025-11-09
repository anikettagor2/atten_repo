# Complete Setup Guide - Fix Signup Data Storage

## Critical Issue: Signup Data Not Stored

If signup data is not being stored in Supabase, follow these steps:

## Step 1: Run the SQL Script

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy the **ENTIRE** contents of `FINAL-SUPABASE-SETUP.sql`
3. Paste and run it
4. Verify all tables are created

## Step 2: Verify Trigger is Created

Run this query in Supabase SQL Editor to verify the trigger exists:

```sql
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```

You should see:
- `trigger_name`: `on_auth_user_created`
- `event_manipulation`: `INSERT`
- `event_object_table`: `users`

## Step 3: Verify Function Exists

Run this query to verify the function exists:

```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';
```

You should see:
- `routine_name`: `handle_new_user`
- `routine_type`: `FUNCTION`

## Step 4: Test the Trigger Manually

Run this query to test if the trigger works (replace with a test user ID):

```sql
-- Check if trigger function works
SELECT handle_new_user(NEW) FROM auth.users LIMIT 1;
```

## Step 5: Check RLS Status

Verify RLS is disabled:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'lectures', 'attendance', 'login_chat');
```

All should show `rowsecurity = false`

## Step 6: Common Issues and Fixes

### Issue 1: Trigger Not Firing
**Solution**: Recreate the trigger:
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Issue 2: Function Has Errors
**Solution**: Recreate the function:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NOT NULL THEN
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
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Issue 3: RLS Still Enabled
**Solution**: Disable RLS:
```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE lectures DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE login_chat DISABLE ROW LEVEL SECURITY;
```

## Step 7: Test Signup Flow

1. Go to signup page
2. Fill in the form:
   - Name: Test User
   - Email: test@example.com
   - Password: test123456
   - Role: Student
3. Click Sign up
4. Check browser console for any errors
5. Check Supabase Dashboard → Authentication → Users (should see the user)
6. Check Supabase Dashboard → Table Editor → profiles (should see the profile)

## Step 8: Verify Data Storage

After signup, run these queries:

```sql
-- Check if user exists in auth.users
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if profile exists
SELECT id, email, name, role, created_at 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 5;
```

Both should show the newly created user/profile.

## Step 9: If Still Not Working

If data is still not being stored:

1. **Check Supabase Logs**:
   - Go to Supabase Dashboard → Logs
   - Check for any errors related to triggers or functions

2. **Check Browser Console**:
   - Open browser DevTools → Console
   - Look for any errors during signup

3. **Verify Environment Variables**:
   - Make sure `.env.local` has correct Supabase URL and key
   - Restart dev server after changing env vars

4. **Check Network Tab**:
   - Open browser DevTools → Network
   - Look for failed requests to Supabase

5. **Manual Profile Creation**:
   - The signup page now has fallback manual creation
   - If trigger fails, it will try to create profile manually

## Step 10: Final Verification

After fixing everything:

1. ✅ User is created in `auth.users`
2. ✅ Profile is created in `profiles` table
3. ✅ Login works with the created account
4. ✅ Dashboard is accessible after login

## Troubleshooting Checklist

- [ ] SQL script has been run successfully
- [ ] Trigger exists and is active
- [ ] Function exists and has no errors
- [ ] RLS is disabled on all tables
- [ ] Environment variables are correct
- [ ] Dev server has been restarted
- [ ] Browser console shows no errors
- [ ] Network requests to Supabase are successful
- [ ] User appears in Supabase Authentication
- [ ] Profile appears in Supabase Table Editor

## Need More Help?

If you're still having issues:
1. Check Supabase Dashboard → Logs for errors
2. Check browser console for JavaScript errors
3. Verify the SQL script ran without errors
4. Make sure all tables exist
5. Verify the trigger is active









