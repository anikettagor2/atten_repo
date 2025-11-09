# Fix for 406 Not Acceptable Error

## Problem
Getting `406 Not Acceptable` error when trying to access dashboard. This happens when querying the `profiles` table.

## Root Cause
The error occurs when using `.single()` on a Supabase query that returns no rows. Supabase returns a 406 error in this case.

## Solution
Changed all `.single()` calls to `.maybeSingle()` which returns `null` instead of throwing an error when no rows are found.

## Files Fixed

1. **app/student/page.tsx** - Changed profile query to use `.maybeSingle()`
2. **app/professor/page.tsx** - Changed profile query to use `.maybeSingle()`
3. **app/admin/page.tsx** - Changed profile query to use `.maybeSingle()`
4. **app/login/page.tsx** - Changed profile query to use `.maybeSingle()`
5. **app/page.tsx** - Changed profile query to use `.maybeSingle()`
6. **app/auth/callback/route.ts** - Changed profile query to use `.maybeSingle()`

## Additional Improvements

- Added error handling for profile queries
- Added redirect to signup if profile doesn't exist
- Better error messages for users

## Database Setup

Make sure you've run the `fix-rls-policies.sql` script in Supabase to:
1. Create the database trigger that automatically creates profiles on signup
2. Set up proper RLS policies

## Testing

After these changes:
1. Users should be able to access their dashboards without 406 errors
2. If a profile doesn't exist, users will be redirected to signup
3. Error messages will be more helpful









