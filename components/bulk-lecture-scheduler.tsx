'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, X, CheckCircle2 } from 'lucide-react'

interface LectureForm {
  title: string
  scheduledTime: string
  duration: string
}

interface BulkLectureSchedulerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  professorId: string
  onSuccess: () => void
}

export function BulkLectureScheduler({ open, onOpenChange, professorId, onSuccess }: BulkLectureSchedulerProps) {
  const [numLectures, setNumLectures] = useState<number>(1)
  const [lectures, setLectures] = useState<LectureForm[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [completed, setCompleted] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setNumLectures(1)
      setLectures([])
      setCurrentIndex(0)
      setError('')
      setCompleted(false)
    }
  }, [open])

  const handleNumLecturesSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (numLectures < 1 || numLectures > 10) {
      setError('Please enter a number between 1 and 10')
      return
    }
    // Initialize lectures array with empty forms
    const initialLectures: LectureForm[] = Array.from({ length: numLectures }, () => ({
      title: '',
      scheduledTime: '',
      duration: '60',
    }))
    setLectures(initialLectures)
    setCurrentIndex(0)
    setError('')
  }

  const handleLectureSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const currentLecture = lectures[currentIndex]

    if (!currentLecture.title || !currentLecture.scheduledTime) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const localDate = new Date(currentLecture.scheduledTime)
      const isoString = localDate.toISOString()

      const { error: insertError } = await supabase
        .from('lectures')
        .insert({
          title: currentLecture.title,
          professor_id: professorId,
          scheduled_time: isoString,
          duration: parseInt(currentLecture.duration),
        })

      if (insertError) throw insertError

      // Move to next lecture
      if (currentIndex < lectures.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        // All lectures created
        setCompleted(true)
        setTimeout(() => {
          onSuccess()
          onOpenChange(false)
        }, 2000)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create lecture')
    } finally {
      setLoading(false)
    }
  }

  const updateCurrentLecture = (field: keyof LectureForm, value: string) => {
    const updated = [...lectures]
    updated[currentIndex] = { ...updated[currentIndex], [field]: value }
    setLectures(updated)
  }

  if (completed) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">All Lectures Created!</h3>
            <p className="text-gray-600">You have successfully scheduled {lectures.length} lecture(s).</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (lectures.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Schedule Your Lectures
            </DialogTitle>
            <DialogDescription>
              How many lectures do you have today?
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleNumLecturesSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="numLectures">Number of Lectures</Label>
                <Input
                  id="numLectures"
                  type="number"
                  min="1"
                  max="10"
                  value={numLectures}
                  onChange={(e) => setNumLectures(parseInt(e.target.value) || 1)}
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-500">Enter a number between 1 and 10</p>
              </div>
              {error && (
                <div className="text-sm text-red-500 bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Continue
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  const currentLecture = lectures[currentIndex]

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Lecture {currentIndex + 1} of {lectures.length}
            </span>
            <div className="text-sm text-gray-500 font-normal">
              {currentIndex + 1}/{lectures.length}
            </div>
          </DialogTitle>
          <DialogDescription>
            Fill in the details for this lecture
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleLectureSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Lecture Title</Label>
              <Input
                id="title"
                value={currentLecture.title}
                onChange={(e) => updateCurrentLecture('title', e.target.value)}
                placeholder="e.g., Introduction to Computer Science"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduledTime">Scheduled Time</Label>
              <Input
                id="scheduledTime"
                type="datetime-local"
                value={currentLecture.scheduledTime}
                onChange={(e) => updateCurrentLecture('scheduledTime', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={currentLecture.duration}
                onChange={(e) => updateCurrentLecture('duration', e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-3 rounded">
                {error}
              </div>
            )}
          </div>
          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (currentIndex > 0) {
                  setCurrentIndex(currentIndex - 1)
                }
              }}
              disabled={currentIndex === 0 || loading}
            >
              Previous
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : currentIndex < lectures.length - 1 ? 'Next' : 'Finish'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

