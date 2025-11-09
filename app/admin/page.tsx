'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Users, GraduationCap, BookOpen, BarChart3 } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    students: 0,
    professors: 0,
    lectures: 0,
    totalAttendance: 0,
  })
  const [loading, setLoading] = useState(true)
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

        if (profile.role !== 'admin') {
          console.warn('User is not an admin, redirecting to home')
          window.location.href = '/'
          return
        }

        await fetchStats()
      } catch (err) {
        console.error('Error in checkAuth:', err)
        window.location.href = '/login'
      }
    }

    checkAuth()
  }, [])

  const fetchStats = async () => {
    try {
      // Get student count
      const { count: studentCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')

      // Get professor count
      const { count: professorCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'professor')

      // Get lecture count
      const { count: lectureCount } = await supabase
        .from('lectures')
        .select('*', { count: 'exact', head: true })

      // Get total attendance count
      const { count: attendanceCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })

      setStats({
        students: studentCount || 0,
        professors: professorCount || 0,
        lectures: lectureCount || 0,
        totalAttendance: attendanceCount || 0,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Overview of the attendance management system</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.students}</div>
              <p className="text-xs text-muted-foreground">
                Registered students
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Professors</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.professors}</div>
              <p className="text-xs text-muted-foreground">
                Active professors
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Lectures</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.lectures}</div>
              <p className="text-xs text-muted-foreground">
                Scheduled lectures
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attendance</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAttendance}</div>
              <p className="text-xs text-muted-foreground">
                Attendance records
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

