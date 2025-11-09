import { createClient } from './supabase/server'
import { redirect } from 'next/navigation'

export type UserRole = 'student' | 'professor' | 'admin'

export async function getUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }

  // Get user role from profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  // If profile doesn't exist, return null (user should signup)
  if (profileError && profileError.code !== 'PGRST116') {
    console.error('Error fetching profile:', profileError)
    return null
  }

  return {
    ...user,
    role: profile?.role || 'student' as UserRole
  }
}

export async function requireAuth(requiredRole?: UserRole) {
  const user = await getUser()
  
  if (!user) {
    redirect('/login')
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    redirect('/')
  }

  return user
}


