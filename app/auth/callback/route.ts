import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const roleParam = requestUrl.searchParams.get('role') // Get role from URL params
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
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, name, email')
    .eq('id', user.id)
    .maybeSingle()

  // Determine the role to use: from URL param, existing profile, or default to student
  let userRole = 'student'
  if (roleParam && (roleParam === 'professor' || roleParam === 'student')) {
    userRole = roleParam
  } else if (profile?.role) {
    userRole = profile.role
  }

  // If profile doesn't exist, create one with the selected role
  if (!profile) {
    const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
    const userEmail = user.email || ''
    
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: userEmail,
        name: userName,
        role: userRole, // Use role from URL param or default to student
      })

    if (insertError) {
      console.error('Error creating profile:', insertError)
      // If insert fails, try to update existing profile
      await supabase
        .from('profiles')
        .update({ role: userRole })
        .eq('id', user.id)
    }

    // Redirect based on role
    if (userRole === 'professor') {
      return NextResponse.redirect(`${origin}/professor`)
    } else if (userRole === 'admin') {
      return NextResponse.redirect(`${origin}/admin`)
    } else {
      return NextResponse.redirect(`${origin}/student`)
    }
  } else {
    // Profile exists - update role if it was specified in URL and different
    if (roleParam && (roleParam === 'professor' || roleParam === 'student') && profile.role !== roleParam) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: roleParam })
        .eq('id', user.id)
      
      if (!updateError) {
        userRole = roleParam
      }
    } else {
      userRole = profile.role || 'student'
    }
  }

  // Redirect based on role
  if (userRole === 'professor') {
    return NextResponse.redirect(`${origin}/professor`)
  } else if (userRole === 'admin') {
    return NextResponse.redirect(`${origin}/admin`)
  } else {
    return NextResponse.redirect(`${origin}/student`)
  }
}
