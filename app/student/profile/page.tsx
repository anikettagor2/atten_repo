'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { FaceCapture } from '@/components/face-capture'
import { AlertCircle, CheckCircle2, Image as ImageIcon } from 'lucide-react'

export default function StudentProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [hasFaceImages, setHasFaceImages] = useState(false)
  const [faceImageUrls, setFaceImageUrls] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          router.push('/login')
          return
        }

        setUser(user)
        setUserId(user.id)

        // Check if user has face images
        const { data: profile } = await supabase
          .from('profiles')
          .select('face_image_urls, role')
          .eq('id', user.id)
          .maybeSingle()

        if (profile) {
          if (profile.role !== 'student') {
            router.push('/')
            return
          }

          const faceUrls = profile.face_image_urls
          if (Array.isArray(faceUrls) && faceUrls.length >= 10) {
            setHasFaceImages(true)
            setFaceImageUrls(faceUrls)
          }
        }

        setLoading(false)
      } catch (err) {
        console.error('Error checking auth:', err)
        router.push('/login')
      }
    }

    checkAuth()
  }, [router, supabase])

  const handleFaceCaptureComplete = async (imageUrls: string[]) => {
    if (!userId) {
      setError('User ID not found. Please try again.')
      return
    }

    try {
      setLoading(true)
      setError('')

      // Update profile with face image URLs
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          face_image_urls: imageUrls,
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Error updating profile:', updateError)
        setError('Failed to save face images. Please try again.')
        setLoading(false)
        return
      }

      setHasFaceImages(true)
      setFaceImageUrls(imageUrls)
      setLoading(false)
    } catch (err: any) {
      setError(err.message || 'Failed to complete face registration')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  if (hasFaceImages) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Face Registration Complete
              </CardTitle>
              <CardDescription>
                Your face images have been registered successfully and stored in your student profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  You can now use face recognition to mark your attendance for lectures.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push('/student')}
                    className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setHasFaceImages(false)
                      setFaceImageUrls([])
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                  >
                    Update Face Images
                  </button>
                </div>
              </div>

              {/* Registered Images Gallery */}
              {faceImageUrls.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-gray-600" />
                    <h3 className="text-sm font-semibold text-gray-700">
                      Registered Face Images ({faceImageUrls.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {faceImageUrls.map((url, index) => (
                      <div
                        key={index}
                        className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-primary transition-colors"
                      >
                        <img
                          src={url}
                          alt={`Registered face image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    These images are stored in Supabase storage and used for face recognition during attendance marking.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Face Registration Required
            </CardTitle>
            <CardDescription>
              You need to register your face to use attendance recognition.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
            {userId && (
              <FaceCapture
                userId={userId}
                onComplete={handleFaceCaptureComplete}
                onError={setError}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


