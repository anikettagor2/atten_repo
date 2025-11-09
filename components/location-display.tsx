'use client'

import { useState, useEffect } from 'react'
import { MapPin } from 'lucide-react'

interface LocationDisplayProps {
  onLocationObtained?: (location: { latitude: number; longitude: number }) => void
}

export function LocationDisplay({ onLocationObtained }: LocationDisplayProps) {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [error, setError] = useState<string>('')
  const [isRequesting, setIsRequesting] = useState(false)

  useEffect(() => {
    requestLocation()
  }, [])

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
        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        setLocation(loc)
        setIsRequesting(false)
        if (onLocationObtained) {
          onLocationObtained(loc)
        }
      },
      (err) => {
        setError('Unable to retrieve your location. Please allow location access.')
        setIsRequesting(false)
        console.error('Geolocation error:', err)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  if (error) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-3 shadow-lg z-50 max-w-xs">
        <div className="flex items-center gap-2 text-red-800 text-xs">
          <MapPin className="w-4 h-4" />
          <span>{error}</span>
        </div>
        <button
          onClick={requestLocation}
          className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (isRequesting) {
    return (
      <div className="fixed bottom-4 right-4 bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-lg z-50">
        <div className="flex items-center gap-2 text-blue-800 text-xs">
          <MapPin className="w-4 h-4 animate-pulse" />
          <span>Requesting location...</span>
        </div>
      </div>
    )
  }

  if (!location) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-lg p-3 shadow-lg z-50 max-w-xs">
      <div className="flex items-center gap-2 text-green-800 text-xs mb-1">
        <MapPin className="w-4 h-4" />
        <span className="font-semibold">Live Location</span>
      </div>
      <div className="text-xs text-green-700 space-y-0.5">
        <div>Lat: {location.latitude.toFixed(6)}</div>
        <div>Lng: {location.longitude.toFixed(6)}</div>
      </div>
      <button
        onClick={requestLocation}
        className="mt-2 text-xs text-green-600 hover:text-green-800 underline"
      >
        Refresh
      </button>
    </div>
  )
}

