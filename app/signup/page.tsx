'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Navbar } from '@/components/navbar'
import { Chrome } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FaceCapture } from '@/components/face-capture'

type SignupStep = 'form' | 'face-capture' | 'complete'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'student' | 'professor'>('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<SignupStep>('form')
  const [userId, setUserId] = useState<string | null>(null)
  const [faceImageUrls, setFaceImageUrls] = useState<string[]>([])
  const router = useRouter()
  const supabase = createClient()

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      if (data.user) {
        setUserId(data.user.id)
        
        // Wait for profile to be created
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // If student, proceed to face capture
        if (role === 'student') {
          setStep('face-capture')
          setLoading(false)
        } else {
          // For professors, skip face capture and go to dashboard
          const userRole = role
          if (userRole === 'professor') {
            router.push('/professor')
          } else {
            router.push('/student')
          }
          router.refresh()
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup')
      setLoading(false)
    }
  }

  const handleFaceCaptureComplete = async (imageUrls: string[]) => {
    if (!userId) {
      setError('User ID not found. Please try again.')
      return
    }

    try {
      setLoading(true)
      setFaceImageUrls(imageUrls)

      // Update profile with face image URLs
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          face_image_urls: imageUrls, // Store array of URLs
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Error updating profile:', updateError)
        setError('Failed to save face images. Please try again.')
        setLoading(false)
        return
      }

      setStep('complete')
      setLoading(false)

      // Redirect to student dashboard after a short delay
      setTimeout(() => {
        router.push('/student')
        router.refresh()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to complete registration')
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    setError('')

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (oauthError) {
        setError(oauthError.message)
        setLoading(false)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during Google signup')
      setLoading(false)
    }
  }

  if (step === 'face-capture' && userId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <Navbar />
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <Card className="w-full max-w-2xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">Face Registration</CardTitle>
              <CardDescription className="text-center">
                Please capture 10 images of your face for attendance recognition
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FaceCapture
                userId={userId}
                onComplete={handleFaceCaptureComplete}
                onError={setError}
              />
              {error && (
                <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}
              {loading && (
                <div className="text-center text-sm text-gray-600">
                  Saving your face images...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <Navbar />
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Registration Complete!</h2>
                <p className="text-gray-600">Your account has been created successfully.</p>
                <p className="text-sm text-gray-500 mt-2">Redirecting to your dashboard...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Sign Up</CardTitle>
            <CardDescription className="text-center">
              Create an account as Student or Professor
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleEmailSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(value: 'student' | 'professor') => setRole(value)} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="professor">Professor</SelectItem>
                  </SelectContent>
                </Select>
                {role === 'student' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Students will need to capture 10 face images for attendance recognition
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
              {error && (
                <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Sign up with Email'}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignup}
              disabled={loading}
            >
              <Chrome className="w-4 h-4 mr-2" />
              Sign up with Google
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Login
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
