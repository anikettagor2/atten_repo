'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MapPin, AlertCircle } from 'lucide-react'

interface LocationRequestDialogProps {
  open: boolean
  onLocationGranted: (location: { latitude: number; longitude: number }) => void
  onCancel?: () => void
}

export function LocationRequestDialog({ open, onLocationGranted, onCancel }: LocationRequestDialogProps) {
  const [isRequesting, setIsRequesting] = useState(false)
  const [error, setError] = useState<string>('')

  const requestLocation = () => {
    setIsRequesting(true)
    setError('')

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setIsRequesting(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        setIsRequesting(false)
        onLocationGranted(location)
      },
      (err) => {
        setError('Unable to retrieve your location. Please allow location access in your browser settings.')
        setIsRequesting(false)
        console.error('Geolocation error:', err)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Location Access Required
          </DialogTitle>
          <DialogDescription>
            We need your location to verify attendance. Your location will only be used for attendance verification.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-800 font-medium mb-1">Location Access Denied</p>
                  <p className="text-xs text-red-600">{error}</p>
                  <p className="text-xs text-red-600 mt-2">
                    Please enable location permissions in your browser settings and try again.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Click the button below to share your location. This is required to mark attendance.
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              onClick={requestLocation}
              disabled={isRequesting}
              className="flex-1"
            >
              {isRequesting ? (
                <>
                  <MapPin className="w-4 h-4 mr-2 animate-pulse" />
                  Getting Location...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  Share Location
                </>
              )}
            </Button>
            {onCancel && (
              <Button
                onClick={onCancel}
                variant="outline"
                disabled={isRequesting}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

