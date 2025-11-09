'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, Users, Download, Plus, Edit2, Trash2, RefreshCw, CheckCircle2, Play, CalendarDays, MapPin } from 'lucide-react'
import { CreateLectureDialog } from '@/components/create-lecture-dialog'
import { EditLectureDialog } from '@/components/edit-lecture-dialog'
import { BulkLectureScheduler } from '@/components/bulk-lecture-scheduler'
import { LocationRequestDialog } from '@/components/location-request-dialog'
import { LocationDisplay } from '@/components/location-display'
import { formatDate, formatTime, formatDateTime } from '@/lib/date-utils'

interface Attendance {
  id: string
  student_id: string
  student_name: string
  student_email: string
  marked_at: string
  method: string
}

interface Lecture {
  id: string
  title: string
  scheduled_time: string
  duration: number
  attendance_count: number
  status?: 'upcoming' | 'ongoing' | 'completed'
  professor_latitude?: number
  professor_longitude?: number
  professor_location_captured_at?: string
}

export default function ProfessorDashboard() {
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [currentLecture, setCurrentLecture] = useState<Lecture | null>(null)
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showBulkScheduler, setShowBulkScheduler] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [lectureToEdit, setLectureToEdit] = useState<Lecture | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [dayStarted, setDayStarted] = useState(false)
  const [showLocationDialog, setShowLocationDialog] = useState(false)
  const [professorLocation, setProfessorLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationGranted, setLocationGranted] = useState(false)
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

        // Get user role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
          if (profileError.code === 'PGRST116' || profileError.message.includes('No rows') || profileError.code === '42P01') {
            window.location.href = '/signup'
            return
          }
          console.warn('Profile fetch error, continuing anyway:', profileError)
        }

        if (!profile) {
          console.warn('No profile found, redirecting to signup')
          window.location.href = '/signup'
          return
        }

        if (profile.role !== 'professor' && profile.role !== 'admin') {
          console.warn('User is not a professor, redirecting to home')
          window.location.href = '/'
          return
        }

        await fetchLectures(user.id)
      } catch (err) {
        console.error('Error in checkAuth:', err)
        window.location.href = '/login'
      }
    }

    checkAuth()
  }, [])

  // Auto-refresh every 5 seconds - updates all dashboard data automatically
  useEffect(() => {
    if (!user?.id) return

    const refreshInterval = setInterval(() => {
      // Refresh lectures (updates status, attendance counts, etc.)
      fetchLectures(user.id)
      // Also refresh attendance if a lecture is selected (updates present students list)
      if (currentLecture) {
        fetchAttendance(currentLecture.id)
      }
    }, 5000) // Refresh every 5 seconds - all data updates automatically
    
    return () => clearInterval(refreshInterval)
  }, [user?.id, currentLecture?.id])

  // Automatic lecture start/end monitoring when day is started
  // Note: This is handled by the 5-second refresh above, but keeping for explicit monitoring
  useEffect(() => {
    if (!dayStarted || !user?.id) return

    const checkLectureStatus = () => {
      // Lectures automatically start and end based on scheduled time
      // Status is already calculated in getLectureStatus, just refresh
      fetchLectures(user.id)
      // Also refresh attendance to update present students
      if (currentLecture) {
        fetchAttendance(currentLecture.id)
      }
    }

    // Check every 5 seconds for lecture start/end (aligned with main refresh)
    const statusInterval = setInterval(checkLectureStatus, 5000)
    
    return () => clearInterval(statusInterval)
  }, [dayStarted, user?.id, currentLecture?.id])

  // Set up real-time subscription for attendance updates
  useEffect(() => {
    if (!currentLecture) return

    console.log('Setting up real-time subscription for lecture:', currentLecture.id)

    const channel = supabase
      .channel(`attendance:${currentLecture.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
          filter: `lecture_id=eq.${currentLecture.id}`,
        },
        (payload) => {
          console.log('New attendance record:', payload.new)
          // Refresh attendance when new record is added
          fetchAttendance(currentLecture.id)
          // Also refresh lectures to update attendance count
          if (user?.id) {
            fetchLectures(user.id)
          }
          setLastUpdated(new Date())
        }
      )
      .subscribe()

    return () => {
      console.log('Cleaning up real-time subscription')
      supabase.removeChannel(channel)
    }
  }, [currentLecture, user?.id])

  // Set up real-time subscription for lecture updates
  useEffect(() => {
    if (!user?.id) return

    console.log('Setting up real-time subscription for lectures')

    const channel = supabase
      .channel(`lectures:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'lectures',
          filter: `professor_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Lecture change detected:', payload)
          // Refresh lectures when any change occurs
          fetchLectures(user.id)
        }
      )
      .subscribe()

    return () => {
      console.log('Cleaning up lecture subscription')
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const getLectureStatus = (scheduledTime: string, duration: number): 'upcoming' | 'ongoing' | 'completed' => {
    const now = new Date()
    const start = new Date(scheduledTime)
    const end = new Date(start.getTime() + duration * 60000)

    if (now < start) return 'upcoming'
    if (now >= start && now <= end) return 'ongoing'
    return 'completed'
  }

  const fetchLectures = async (professorId?: string) => {
    try {
      const userId = professorId || user?.id
      
      if (!userId) {
        console.warn('No user ID available for fetching lectures')
        setLectures([])
        setLoading(false)
        return
      }

      // Fetch all lectures, not just recent 10
      const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .eq('professor_id', userId)
        .order('scheduled_time', { ascending: false })

      if (error) {
        console.error('Supabase error fetching lectures:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        throw error
      }

      // Get attendance count for each lecture and recalculate status
      const lecturesWithCount = await Promise.all(
        (data || []).map(async (lecture) => {
          const { count } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('lecture_id', lecture.id)

          // Recalculate status on each refresh to ensure accuracy
          const currentStatus = getLectureStatus(lecture.scheduled_time, lecture.duration)

          return {
            ...lecture,
            attendance_count: count || 0,
            status: currentStatus,
          }
        })
      )

      setLectures(lecturesWithCount)
    } catch (error: any) {
      console.error('Error fetching lectures:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error: error
      })
      // Set empty array on error to prevent UI issues
      setLectures([])
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendance = async (lectureId: string) => {
    try {
      setIsRefreshing(true)
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          profiles:student_id (
            name,
            email
          )
        `)
        .eq('lecture_id', lectureId)
        .order('marked_at', { ascending: false })

      if (error) throw error

      const formattedAttendance = (data || []).map((item: any) => ({
        id: item.id,
        student_id: item.student_id,
        student_name: item.profiles?.name || 'Unknown',
        student_email: item.profiles?.email || 'Unknown',
        marked_at: item.marked_at,
        method: item.method,
      }))

      // If lecture has ended, only show students who marked attendance (present students)
      // This is already the case since we're fetching from attendance table
      // But we can add a note that these are the present students
      setAttendance(formattedAttendance)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching attendance:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRefreshAttendance = () => {
    if (currentLecture) {
      fetchAttendance(currentLecture.id)
    }
  }

  const handleLectureClick = (lecture: Lecture) => {
    setCurrentLecture(lecture)
    fetchAttendance(lecture.id)
  }

  const handleEditLecture = (e: React.MouseEvent, lecture: Lecture) => {
    e.stopPropagation() // Prevent triggering lecture click
    setLectureToEdit(lecture)
    setShowEditDialog(true)
  }

  const handleDeleteLecture = async (e: React.MouseEvent, lectureId: string) => {
    e.stopPropagation() // Prevent triggering lecture click
    
    if (!confirm('Are you sure you want to delete this lecture? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('lectures')
        .delete()
        .eq('id', lectureId)

      if (error) throw error

      // Refresh lectures
      if (user?.id) {
        await fetchLectures(user.id)
      }
      
      // Clear current lecture if it was deleted
      if (currentLecture?.id === lectureId) {
        setCurrentLecture(null)
        setAttendance([])
      }
    } catch (error) {
      console.error('Error deleting lecture:', error)
      alert('Failed to delete lecture. Please try again.')
    }
  }

  const handleEditSuccess = () => {
    if (user?.id) {
      fetchLectures(user.id)
    }
    // Update current lecture if it was edited
    if (lectureToEdit && currentLecture?.id === lectureToEdit.id) {
      fetchAttendance(lectureToEdit.id)
    }
  }

  const handleLocationGranted = async (location: { latitude: number; longitude: number }) => {
    setProfessorLocation(location)
    setLocationGranted(true)
    setShowLocationDialog(false)
    
    // Update all ongoing lectures with professor location
    if (user?.id) {
      await updateOngoingLecturesWithLocation(location)
    }
  }

  const handleStartDay = () => {
    // Request location before starting the day
    if (!locationGranted || !professorLocation) {
      setShowLocationDialog(true)
      return
    }
    setDayStarted(true)
    // Update ongoing lectures with location
    if (user?.id && professorLocation) {
      updateOngoingLecturesWithLocation(professorLocation)
    }
  }

  const updateOngoingLecturesWithLocation = async (location: { latitude: number; longitude: number }) => {
    if (!user?.id) return

    try {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Find all lectures that are ongoing or upcoming today
      const { data: lecturesToUpdate, error } = await supabase
        .from('lectures')
        .select('id, scheduled_time, duration')
        .eq('professor_id', user.id)
        .gte('scheduled_time', today.toISOString())
        .lt('scheduled_time', tomorrow.toISOString())

      if (error) {
        console.error('Error fetching lectures for location update:', error)
        return
      }

      if (!lecturesToUpdate || lecturesToUpdate.length === 0) return

      // Update lectures that are currently ongoing
      const updatePromises = lecturesToUpdate.map(async (lecture) => {
        const start = new Date(lecture.scheduled_time)
        const end = new Date(start.getTime() + (lecture.duration || 60) * 60000)
        
        // Only update if lecture is ongoing (between start and end time)
        if (now >= start && now <= end) {
          const { error: updateError } = await supabase
            .from('lectures')
            .update({
              professor_latitude: location.latitude,
              professor_longitude: location.longitude,
              professor_location_captured_at: now.toISOString(),
            })
            .eq('id', lecture.id)

          if (updateError) {
            console.error(`Error updating location for lecture ${lecture.id}:`, updateError)
          }
        }
      })

      await Promise.all(updatePromises)
    } catch (error) {
      console.error('Error updating lectures with location:', error)
    }
  }

  // Periodically update professor location for ongoing lectures
  useEffect(() => {
    if (!dayStarted || !locationGranted || !professorLocation || !user?.id) return

    const updateLocationInterval = setInterval(() => {
      updateOngoingLecturesWithLocation(professorLocation)
    }, 30000) // Update location every 30 seconds for ongoing lectures

    return () => clearInterval(updateLocationInterval)
  }, [dayStarted, locationGranted, professorLocation, user?.id])

  const exportToJSON = () => {
    if (!currentLecture || attendance.length === 0) return

    const data = {
      lecture: {
        id: currentLecture.id,
        title: currentLecture.title,
        scheduled_time: currentLecture.scheduled_time,
      },
      attendance: attendance.map(a => ({
        student_name: a.student_name,
        student_email: a.student_email,
        marked_at: a.marked_at,
        method: a.method,
      })),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${currentLecture.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToCSV = () => {
    if (!currentLecture || attendance.length === 0) return

    const headers = ['Student Name', 'Student Email', 'Marked At', 'Method']
    const rows = attendance.map(a => [
      a.student_name,
      a.student_email,
      formatDateTime(a.marked_at),
      a.method,
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${currentLecture.id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToXLS = () => {
    if (!currentLecture || attendance.length === 0) return

    // For XLS export, we'll create a CSV with .xls extension
    // For proper XLS, you'd need a library like xlsx
    const headers = ['Student Name', 'Student Email', 'Marked At', 'Method']
    const rows = attendance.map(a => [
      a.student_name,
      a.student_email,
      formatDateTime(a.marked_at),
      a.method,
    ])

    const csv = [
      headers.join('\t'),
      ...rows.map(row => row.join('\t'))
    ].join('\n')

    const blob = new Blob([csv], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${currentLecture.id}.xls`
    a.click()
    URL.revokeObjectURL(url)
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Professor Dashboard</h1>
            <p className="text-gray-600">Manage lectures and view attendance</p>
          </div>
          <div className="flex gap-2">
            {!dayStarted && lectures.length > 0 && (
              <Button 
                onClick={handleStartDay} 
                variant="default"
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Day
              </Button>
            )}
            {dayStarted && (
              <Button 
                variant="outline"
                disabled
                className="bg-green-50 text-green-700 border-green-200"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Day Active
              </Button>
            )}
            <Button onClick={() => setShowBulkScheduler(true)} variant="outline">
              <CalendarDays className="w-4 h-4 mr-2" />
              Schedule Multiple
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Lecture
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Lectures List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Lectures</CardTitle>
                <CardDescription>Click on a lecture to view attendance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {lectures.map((lecture) => (
                    <Card
                      key={lecture.id}
                      className={`cursor-pointer transition-colors relative ${
                        currentLecture?.id === lecture.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleLectureClick(lecture)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-semibold flex-1">{lecture.title}</div>
                          <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => handleEditLecture(e, lecture)}
                              title="Edit lecture"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => handleDeleteLecture(e, lecture.id)}
                              title="Delete lecture"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          {lecture.status === 'ongoing' && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded animate-pulse">
                              Live
                            </span>
                          )}
                          {lecture.status === 'upcoming' && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              Upcoming
                            </span>
                          )}
                          {lecture.status === 'completed' && (
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                              Completed
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-2 mb-2">
                          <Calendar className="w-3 h-3" />
                          {formatDate(lecture.scheduled_time)}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-2 mb-2">
                          <Clock className="w-3 h-3" />
                          {formatTime(lecture.scheduled_time)} ({lecture.duration} min)
                        </div>
                        <div className="text-sm flex items-center gap-2">
                          <Users className="w-3 h-3" />
                          <span className="font-semibold">{lecture.attendance_count}</span>
                          <span className="text-gray-600">students present</span>
                        </div>
                        {lecture.status === 'ongoing' && lecture.professor_latitude && lecture.professor_longitude && (
                          <div className="text-xs flex items-center gap-1 text-green-600 mt-1">
                            <MapPin className="w-3 h-3" />
                            <span>Location tracked</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {lectures.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No lectures yet. Create your first lecture!
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Attendance Details */}
          <div className="lg:col-span-2">
            {currentLecture ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {currentLecture.title}
                        {currentLecture.status === 'ongoing' && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
                            <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                            Live Session
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {formatDateTime(currentLecture.scheduled_time)}
                        {lastUpdated && (
                          <span className="ml-2 text-xs">
                            • Last updated: {lastUpdated.toLocaleTimeString()}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleRefreshAttendance} 
                        variant="outline" 
                        size="sm"
                        disabled={isRefreshing}
                        title="Refresh attendance list"
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                      <Button onClick={exportToJSON} variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        JSON
                      </Button>
                      <Button onClick={exportToCSV} variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        CSV
                      </Button>
                      <Button onClick={exportToXLS} variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        XLS
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="text-2xl font-bold text-blue-900">
                            {attendance.length}
                          </div>
                          <div className="text-sm font-medium text-blue-700">
                            {currentLecture.status === 'completed' 
                              ? 'Students Present (Final Count)' 
                              : currentLecture.status === 'ongoing'
                              ? 'Students Present (Live)'
                              : 'Students Present'}
                          </div>
                        </div>
                      </div>
                      {currentLecture.status === 'ongoing' && (
                        <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                          Real-time updates active
                        </div>
                      )}
                    </div>
                    {currentLecture.status === 'completed' ? (
                      <p className="text-xs text-blue-600 mt-2">
                        Attendance is now closed. Only students who marked attendance are shown.
                      </p>
                    ) : currentLecture.status === 'ongoing' ? (
                      <p className="text-xs text-blue-600 mt-2">
                        Viewing students who have marked attendance. List updates automatically as students check in.
                      </p>
                    ) : (
                      <p className="text-xs text-blue-600 mt-2">
                        Students who mark attendance will appear here once the session starts.
                      </p>
                    )}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Marked At</TableHead>
                        <TableHead>Method</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-gray-500">
                            No attendance records yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        attendance.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">
                              {record.student_name}
                            </TableCell>
                            <TableCell>{record.student_email}</TableCell>
                            <TableCell>
                              {formatDateTime(record.marked_at)}
                            </TableCell>
                            <TableCell>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                {record.method}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Select a lecture to view attendance</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <CreateLectureDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        professorId={user?.id}
        onSuccess={fetchLectures}
      />

      <EditLectureDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        lecture={lectureToEdit}
        onSuccess={handleEditSuccess}
      />

      <BulkLectureScheduler
        open={showBulkScheduler}
        onOpenChange={setShowBulkScheduler}
        professorId={user?.id || ''}
        onSuccess={() => {
          if (user?.id) {
            fetchLectures(user.id)
          }
        }}
      />

      {locationGranted && professorLocation && (
        <LocationDisplay onLocationObtained={(loc) => {
          setProfessorLocation(loc)
          if (dayStarted && user?.id) {
            updateOngoingLecturesWithLocation(loc)
          }
        }} />
      )}

      <LocationRequestDialog
        open={showLocationDialog}
        onLocationGranted={handleLocationGranted}
        onCancel={() => {
          setShowLocationDialog(false)
        }}
      />
    </div>
  )
}

