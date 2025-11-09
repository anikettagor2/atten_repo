'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

interface EditLectureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lecture: {
    id: string
    title: string
    scheduled_time: string
    duration: number
  } | null
  onSuccess: () => void
}

export function EditLectureDialog({ open, onOpenChange, lecture, onSuccess }: EditLectureDialogProps) {
  const [title, setTitle] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [duration, setDuration] = useState('60')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  // Populate form when lecture changes
  useEffect(() => {
    if (lecture) {
      setTitle(lecture.title)
      // Convert scheduled_time to local datetime-local format
      const date = new Date(lecture.scheduled_time)
      // Use local time components directly
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`
      setScheduledTime(localDateTime)
      setDuration(lecture.duration.toString())
    }
  }, [lecture])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setTitle('')
      setScheduledTime('')
      setDuration('60')
      setError('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lecture) return

    setLoading(true)
    setError('')

    try {
      // Convert datetime-local value to ISO string for database
      // datetime-local gives us local time, we need to convert it properly
      const localDate = new Date(scheduledTime)
      // Create ISO string - this will be in local timezone
      const isoString = localDate.toISOString()

      const { error: updateError } = await supabase
        .from('lectures')
        .update({
          title,
          scheduled_time: isoString,
          duration: parseInt(duration),
          updated_at: new Date().toISOString(),
        })
        .eq('id', lecture.id)

      if (updateError) throw updateError

      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to update lecture')
    } finally {
      setLoading(false)
    }
  }

  if (!lecture) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Lecture</DialogTitle>
          <DialogDescription>
            Update the lecture details. Changes will be reflected in real-time.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Lecture Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Introduction to Computer Science"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-scheduledTime">Scheduled Time</Label>
              <Input
                id="edit-scheduledTime"
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-duration">Duration (minutes)</Label>
              <Input
                id="edit-duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="1"
                required
              />
            </div>
            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-3 rounded">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Lecture'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

