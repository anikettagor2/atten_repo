'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FaceRecognition } from '@/components/face-recognition'

interface FaceRecognitionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lectureId: string
  userId: string
  lectureTitle: string
  scheduledTime: string
  duration: number
  onSuccess: () => void
}

export function FaceRecognitionDialog({
  open,
  onOpenChange,
  lectureId,
  userId,
  lectureTitle,
  scheduledTime,
  duration,
  onSuccess
}: FaceRecognitionDialogProps) {
  const [attendanceMarked, setAttendanceMarked] = useState(false)
  const [isExpired, setIsExpired] = useState(false)

  // Check if lecture has ended
  useEffect(() => {
    if (!open) {
      setAttendanceMarked(false)
      setIsExpired(false)
      return
    }

    const checkTime = () => {
      const now = new Date()
      const start = new Date(scheduledTime)
      const end = new Date(start.getTime() + duration * 60000)
      
      // Check if lecture has ended or hasn't started
      if (now > end) {
        setIsExpired(true)
        // Close dialog if session has ended
        if (open && !attendanceMarked) {
          setTimeout(() => {
            onOpenChange(false)
          }, 2000) // Give user 2 seconds to see the message
        }
      } else if (now < start) {
        setIsExpired(true)
      } else {
        setIsExpired(false)
      }
    }

    checkTime()
    const interval = setInterval(checkTime, 1000) // Check every second

    return () => clearInterval(interval)
  }, [open, scheduledTime, duration, attendanceMarked, onOpenChange])

  const handleAttendanceMarked = () => {
    setAttendanceMarked(true)
    // Call onSuccess after a short delay to show success message
    setTimeout(() => {
      onSuccess()
      onOpenChange(false)
      setAttendanceMarked(false)
    }, 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" showCloseButton={!attendanceMarked}>
        <DialogHeader>
          <DialogTitle>Mark Attendance - {lectureTitle}</DialogTitle>
          <DialogDescription>
            Complete face recognition to mark your attendance. Accuracy must be above 69%.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isExpired ? (
            <div className="text-center p-6 bg-red-50 rounded-lg border border-red-200">
              <p className="text-red-800 font-semibold mb-2">
                {(() => {
                  const now = new Date()
                  const start = new Date(scheduledTime)
                  const end = new Date(start.getTime() + duration * 60000)
                  return now > end ? 'Lecture Has Ended' : 'Lecture Has Not Started'
                })()}
              </p>
              <p className="text-sm text-red-600">
                {(() => {
                  const now = new Date()
                  const start = new Date(scheduledTime)
                  const end = new Date(start.getTime() + duration * 60000)
                  return now > end 
                    ? 'Attendance can no longer be marked for this lecture.'
                    : 'Please wait until the scheduled time to mark attendance.'
                })()}
              </p>
            </div>
          ) : (
            <FaceRecognition
              lectureId={lectureId}
              userId={userId}
              scheduledTime={scheduledTime}
              duration={duration}
              onAttendanceMarked={handleAttendanceMarked}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

