'use client'

import { useEffect, useState } from 'react'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CheckCircle2, Users, Calendar, Camera, FileText, LayoutDashboard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
        setUserRole(profile?.role || 'student')
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            setUserRole(profile?.role || 'student')
          })
          .catch((error) => {
            console.error('Error fetching profile:', error)
            setUserRole(null)
          })
      } else {
        setUserRole(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const getDashboardLink = () => {
    if (!user || !userRole) return null
    if (userRole === 'professor') return '/professor'
    if (userRole === 'admin') return '/admin'
    return '/student'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <section className="text-center mb-20">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-primary">Atocrane</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Modern Attendance Management System with AI-Powered Face Recognition
          </p>
          <div className="flex gap-4 justify-center">
            {user ? (
              <Link href={getDashboardLink() || '/login'}>
                <Button size="lg" className="text-lg px-8">
                  <LayoutDashboard className="w-5 h-5 mr-2" />
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button size="lg" className="text-lg px-8">
                    Get Started
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="lg" variant="outline" className="text-lg px-8">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <Camera className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Face Recognition</h3>
              <p className="text-gray-600">
                Advanced AI-powered face recognition for automatic attendance marking
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <Calendar className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Lecture Scheduling</h3>
              <p className="text-gray-600">
                Professors can schedule lectures and students can view upcoming classes
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <Users className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Real-time Tracking</h3>
              <p className="text-gray-600">
                Track student attendance in real-time during lectures
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <FileText className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Export Reports</h3>
              <p className="text-gray-600">
                Export attendance data in JSON, CSV, and XLS formats
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <CheckCircle2 className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Role-Based Access</h3>
              <p className="text-gray-600">
                Separate dashboards for Students, Professors, and Administrators
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <Users className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Secure Authentication</h3>
              <p className="text-gray-600">
                Google OAuth and email/password authentication for secure access
              </p>
            </div>
          </div>
        </section>

        {/* Description Section */}
        <section className="bg-white rounded-lg shadow-lg p-8 mb-20">
          <h2 className="text-3xl font-bold mb-6">About Atocrane</h2>
          <p className="text-gray-700 text-lg leading-relaxed mb-4">
            Atocrane is a comprehensive attendance management system designed to streamline 
            the process of tracking student attendance in educational institutions. Our 
            platform leverages cutting-edge face recognition technology to automatically 
            mark attendance, eliminating the need for manual roll calls.
          </p>
          <p className="text-gray-700 text-lg leading-relaxed mb-4">
            With separate dashboards for students, professors, and administrators, Atocrane 
            provides a tailored experience for each user type. Students can view their 
            scheduled lectures and mark attendance through face recognition, while professors 
            can schedule classes, monitor attendance in real-time, and export detailed reports.
          </p>
          <p className="text-gray-700 text-lg leading-relaxed">
            Built with Next.js, Tailwind CSS, and Supabase, Atocrane offers a modern, 
            scalable, and secure solution for attendance management.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2024 Atocrane. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
