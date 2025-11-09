import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }
  }

  // Get user role after authentication
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error('Error getting user:', userError)
    return NextResponse.redirect(`${origin}/login`)
  }

  // Wait a moment for the profile trigger to create the profile
  // Then get user role from profile
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, name, email')
    .eq('id', user.id)
    .maybeSingle()

  // If profile doesn't exist, create one with default role
  if (!profile) {
    const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
    const userEmail = user.email || ''
    
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: userEmail,
        name: userName,
        role: 'student', // Default role for OAuth users
      })

    if (insertError) {
      console.error('Error creating profile:', insertError)
    }

    // Redirect to student dashboard by default
    return NextResponse.redirect(`${origin}/student`)
  }

  // Redirect based on role
  const role = profile.role || 'student'
  if (role === 'professor') {
    return NextResponse.redirect(`${origin}/professor`)
  } else if (role === 'admin') {
    return NextResponse.redirect(`${origin}/admin`)
  } else {
    return NextResponse.redirect(`${origin}/student`)
  }
}
