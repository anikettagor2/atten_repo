'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, User, Camera } from 'lucide-react'
import { FaceRecognitionDialog } from '@/components/face-recognition-dialog'
import { formatTime, formatDate } from '@/lib/date-utils'

interface Lecture {
  id: string
  title: string
  professor_name: string
  scheduled_time: string
  duration: number
  status: 'upcoming' | 'ongoing' | 'completed'
}

export default function StudentDashboard() {
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [hasFaceImages, setHasFaceImages] = useState(true) // Default to true, will be checked
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null)
  const [showFaceRecognitionDialog, setShowFaceRecognitionDialog] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          console.error('Auth error:', error)
          window.location.href = '/login'
          return
        }
        setUser(user)

        // Get user role and face images
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, face_image_urls')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
          // If profile doesn't exist, redirect to signup
          if (profileError.code === 'PGRST116' || profileError.message.includes('No rows') || profileError.code === '42P01') {
            window.location.href = '/signup'
            return
          }
          // For other errors, show error but don't block
          console.warn('Profile fetch error, continuing anyway:', profileError)
        }

        if (!profile) {
          console.warn('No profile found, redirecting to signup')
          window.location.href = '/signup'
          return
        }

        if (profile.role !== 'student') {
          console.warn('User is not a student, redirecting to home')
          window.location.href = '/'
          return
        }

        // Check if student has face images registered
        const faceUrls = profile.face_image_urls
        if (!Array.isArray(faceUrls) || faceUrls.length < 10) {
          // Student hasn't registered face images yet
          setHasFaceImages(false)
        } else {
          setHasFaceImages(true)
        }

        // Fetch today's lectures
        await fetchLectures()
      } catch (err) {
        console.error('Error in checkAuth:', err)
        window.location.href = '/login'
      }
    }

    checkAuth()
    
    // Refresh lectures every 30 seconds to remove completed ones
    const refreshInterval = setInterval(() => {
      fetchLectures()
    }, 30000) // Refresh every 30 seconds
    
    return () => clearInterval(refreshInterval)
  }, [])

  const fetchLectures = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('lectures')
        .select('*, profiles:professor_id(name)')
        .gte('scheduled_time', `${today}T00:00:00`)
        .lte('scheduled_time', `${today}T23:59:59`)
        .order('scheduled_time', { ascending: true })

      if (error) throw error

      const formattedLectures = data?.map((lecture: any) => ({
        id: lecture.id,
        title: lecture.title,
        professor_name: lecture.profiles?.name || 'Unknown',
        scheduled_time: lecture.scheduled_time,
        duration: lecture.duration || 60,
        status: getLectureStatus(lecture.scheduled_time, lecture.duration),
      })) || []

      // Filter out completed lectures - students should not see them
      const activeLectures = formattedLectures.filter(lecture => lecture.status !== 'completed')
      setLectures(activeLectures)
    } catch (error) {
      console.error('Error fetching lectures:', error)
    } finally {
      setLoading(false)
    }
  }

  const getLectureStatus = (scheduledTime: string, duration: number): 'upcoming' | 'ongoing' | 'completed' => {
    const now = new Date()
    const start = new Date(scheduledTime)
    const end = new Date(start.getTime() + duration * 60000)

    if (now < start) return 'upcoming'
    if (now >= start && now <= end) return 'ongoing'
    return 'completed'
  }

  const handleLectureClick = (lecture: Lecture) => {
    if (!hasFaceImages) {
      router.push('/student/profile')
      return
    }
    
    // Check if lecture is still ongoing (double check with current time)
    const now = new Date()
    const start = new Date(lecture.scheduled_time)
    const end = new Date(start.getTime() + lecture.duration * 60000)
    
    // Only allow attendance for ongoing lectures (within time window)
    if (now < start) {
      alert('Lecture has not started yet. Please wait until the scheduled time.')
      return
    }
    
    if (now > end) {
      alert('Lecture has ended. Attendance can no longer be marked.')
      return
    }
    
    if (lecture.status !== 'ongoing') {
      return
    }
    
    setSelectedLecture(lecture)
    setShowFaceRecognitionDialog(true)
  }

  const handleAttendanceSuccess = () => {
    // Refresh lectures to update any status
    fetchLectures()
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Student Dashboard</h1>
          <p className="text-gray-600">View your scheduled lectures and mark attendance</p>
        </div>

        {/* Face Registration Notice */}
        {user && !hasFaceImages && (
          <Card className="bg-yellow-50 border-yellow-200 mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-yellow-800">
                    Face Registration Required
                  </p>
                  <p className="text-sm text-yellow-600 mt-1">
                    You need to register your face to use attendance recognition.
                  </p>
                </div>
                <Button
                  onClick={() => router.push('/student/profile')}
                  className="bg-yellow-600 text-white hover:bg-yellow-700"
                >
                  Register Face
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {lectures.map((lecture) => (
            <Card 
              key={lecture.id} 
              className={`
                ${lecture.status === 'ongoing' ? 'border-primary border-2 cursor-pointer hover:shadow-lg transition-shadow' : ''}
                ${lecture.status === 'upcoming' ? 'opacity-75' : ''}
                ${lecture.status === 'completed' ? 'opacity-60' : ''}
              `}
              onClick={() => handleLectureClick(lecture)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{lecture.title}</span>
                  {lecture.status === 'ongoing' && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded animate-pulse">
                      Live
                    </span>
                  )}
                  {lecture.status === 'upcoming' && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Upcoming
                    </span>
                  )}
                  {lecture.status === 'completed' && (
                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                      Completed
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <User className="w-4 h-4" />
                    <span>{lecture.professor_name}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(lecture.scheduled_time)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(lecture.scheduled_time)}</span>
                  </div>
                  {lecture.status === 'ongoing' && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-primary font-medium">
                        <Camera className="w-4 h-4" />
                        <span>Click to mark attendance</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Face recognition required (80%+ accuracy)
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {lectures.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No lectures scheduled for today</p>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedLecture && user && (
        <FaceRecognitionDialog
          open={showFaceRecognitionDialog}
          onOpenChange={setShowFaceRecognitionDialog}
          lectureId={selectedLecture.id}
          userId={user.id}
          lectureTitle={selectedLecture.title}
          scheduledTime={selectedLecture.scheduled_time}
          duration={selectedLecture.duration}
          onSuccess={handleAttendanceSuccess}
        />
      )}
    </div>
  )
}

