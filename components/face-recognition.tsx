'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, CheckCircle2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { verifyFace, loadFaceModels, detectFaceInImage, compareFaces } from '@/lib/face-recognition'

interface FaceRecognitionProps {
  lectureId: string
  userId: string
  scheduledTime?: string
  duration?: number
  onAttendanceMarked?: () => void
}

export function FaceRecognition({ lectureId, userId, scheduledTime, duration, onAttendanceMarked }: FaceRecognitionProps) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [attendanceMarked, setAttendanceMarked] = useState(false)
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(true)
  const [realTimeConfidence, setRealTimeConfidence] = useState<number | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Load face recognition models on component mount
    const loadModels = async () => {
      try {
        const loaded = await loadFaceModels()
        if (!loaded) {
          setError('Failed to load face recognition models. Please refresh the page.')
        }
        setModelsLoading(false)
      } catch (err) {
        console.error('Error loading models:', err)
        setError('Failed to load face recognition models.')
        setModelsLoading(false)
      }
    }

    loadModels()
  }, [])

  useEffect(() => {
    return () => {
      stopRealTimeDetection()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Load registered images for real-time detection
  const [registeredDescriptors, setRegisteredDescriptors] = useState<Float32Array[]>([])

  useEffect(() => {
    const loadRegisteredFaces = async () => {
      if (!userId || modelsLoading) return

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('face_image_urls')
          .eq('id', userId)
          .maybeSingle()

        if (profileError || !profile || !profile.face_image_urls) return

        const registeredImages = Array.isArray(profile.face_image_urls) 
          ? profile.face_image_urls 
          : []

        if (registeredImages.length === 0) return

        // Load descriptors for all registered images
        const descriptors: Float32Array[] = []
        for (const imageUrl of registeredImages) {
          try {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            await new Promise((resolve, reject) => {
              img.onload = resolve
              img.onerror = reject
              img.src = imageUrl
            })
            const descriptor = await detectFaceInImage(img)
            if (descriptor) {
              descriptors.push(descriptor)
            }
          } catch (error) {
            console.error('Error loading registered image:', error)
          }
        }

        setRegisteredDescriptors(descriptors)
      } catch (error) {
        console.error('Error loading registered faces:', error)
      }
    }

    if (!modelsLoading) {
      loadRegisteredFaces()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, modelsLoading])

  const startRealTimeDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
    }

    if (!videoRef.current || registeredDescriptors.length === 0) return

    setIsDetecting(true)
    
    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || modelsLoading) return
      
      try {
        const video = videoRef.current
        if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
          return
        }

        // Detect face in current video frame
        const capturedDescriptor = await detectFaceInImage(video)
        if (!capturedDescriptor) {
          setRealTimeConfidence(null)
          return
        }

        // Compare with all registered descriptors
        let bestSimilarity = 0
        for (const registeredDescriptor of registeredDescriptors) {
          const similarity = await compareFaces(capturedDescriptor, registeredDescriptor)
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity
          }
        }

        setRealTimeConfidence(bestSimilarity)
      } catch (error) {
        console.error('Real-time detection error:', error)
      }
    }, 500) // Check every 500ms
  }, [registeredDescriptors, modelsLoading])

  const stopRealTimeDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    setIsDetecting(false)
    setRealTimeConfidence(null)
  }

  const startCamera = async () => {
    try {
      // Set capturing state first so video element is rendered
      setIsCapturing(true)
      
      // Small delay to ensure video element is in DOM
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      })
      
      console.log('Camera stream obtained:', stream)
      streamRef.current = stream
      
      // Wait a bit more for video element to be ready
      await new Promise(resolve => setTimeout(resolve, 50))
      
      if (videoRef.current) {
        console.log('Setting video srcObject...')
        const video = videoRef.current
        video.srcObject = stream
        
        const handleCanPlay = async () => {
          console.log('Video can play, starting playback...')
          try {
            await video.play()
            console.log('Video is playing!', {
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              readyState: video.readyState,
              paused: video.paused,
              currentTime: video.currentTime
            })
            
            // Initialize canvas dimensions
            if (canvasRef.current && video.videoWidth > 0 && video.videoHeight > 0) {
              canvasRef.current.width = video.videoWidth
              canvasRef.current.height = video.videoHeight
              console.log('Canvas dimensions set:', {
                width: canvasRef.current.width,
                height: canvasRef.current.height
              })
            }
            
            // Start real-time face detection after a short delay
            setTimeout(() => {
              if (registeredDescriptors.length > 0) {
                startRealTimeDetection()
              }
            }, 1000)
          } catch (playError: any) {
            console.error('Video play error:', playError)
            setError(`Failed to start camera preview: ${playError.message}`)
            stream.getTracks().forEach(track => track.stop())
            setIsCapturing(false)
          }
        }
        
        // Use canplay event
        video.addEventListener('canplay', handleCanPlay, { once: true })
        
        // Also try playing immediately
        try {
          await video.play()
          console.log('Video playing immediately')
          if (canvasRef.current && video.videoWidth > 0 && video.videoHeight > 0) {
            canvasRef.current.width = video.videoWidth
            canvasRef.current.height = video.videoHeight
          }
          
          // Start real-time face detection after a short delay
          setTimeout(() => {
            if (registeredDescriptors.length > 0) {
              startRealTimeDetection()
            }
          }, 1000)
        } catch (immediateError) {
          console.log('Immediate play failed, waiting for canplay event...')
        }
      } else {
        console.error('Video ref is null after setting isCapturing!')
        stream.getTracks().forEach(track => track.stop())
        setIsCapturing(false)
      }
    } catch (err: any) {
      setIsCapturing(false)
      let errorMessage = 'Unable to access camera. '
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow camera permissions and try again.'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera found. Please connect a camera and try again.'
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage += 'Camera is already in use by another application.'
      } else {
        errorMessage += 'Please check permissions and try again.'
      }
      setError(errorMessage)
      console.error('Camera error:', err)
    }
  }

  const captureAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current) return
    if (modelsLoading) {
      setError('Face recognition models are still loading. Please wait.')
      return
    }

    // Check if lecture has ended (if scheduledTime and duration are provided)
    if (scheduledTime && duration) {
      const now = new Date()
      const start = new Date(scheduledTime)
      const end = new Date(start.getTime() + duration * 60000)
      
      if (now > end) {
        setError('Lecture has ended. Attendance can no longer be marked.')
        return
      }
      
      if (now < start) {
        setError('Lecture has not started yet. Please wait until the scheduled time.')
        return
      }
    }

    setIsVerifying(true)
    setError('')

    try {
      const canvas = canvasRef.current
      const video = videoRef.current
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        setError('Failed to initialize canvas.')
        setIsVerifying(false)
        return
      }

      // Check if video is ready
      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        setError('Camera is not ready. Please wait a moment and try again.')
        setIsVerifying(false)
        return
      }
      
      // Draw current frame to canvas
      ctx.drawImage(video, 0, 0)
      
      // Get registered face images for this user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('face_image_urls')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) {
        throw new Error('Failed to fetch user profile.')
      }

      if (!profile || !profile.face_image_urls || profile.face_image_urls.length === 0) {
        setError('No registered face images found. Please complete face registration first.')
        setIsVerifying(false)
        return
      }

      // Convert face_image_urls from JSONB to string array
      const registeredImages = Array.isArray(profile.face_image_urls) 
        ? profile.face_image_urls 
        : []

      if (registeredImages.length === 0) {
        setError('No registered face images found. Please complete face registration first.')
        setIsVerifying(false)
        return
      }

      // Verify face using face recognition
      const result = await verifyFace(canvas, registeredImages)
      
      const confidencePercent = (result.confidence * 100).toFixed(1)
      console.log(`Face recognition confidence: ${confidencePercent}%`)

      if (result.verified && result.confidence >= 0.8) {
        // Upload verification image to Supabase storage
        canvas.toBlob(async (blob) => {
          if (!blob) {
            setError('Failed to process image.')
            setIsVerifying(false)
            return
          }

          try {
            const fileName = `attendance/${lectureId}/${userId}_${Date.now()}.jpg`
            const { error: uploadError } = await supabase.storage
              .from('face-images')
              .upload(fileName, blob, {
                contentType: 'image/jpeg',
                upsert: false
              })

            if (uploadError) {
              console.error('Upload error:', uploadError)
              // Continue even if upload fails
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('face-images')
              .getPublicUrl(fileName)

            // Mark attendance
            const { error: attendanceError } = await supabase
              .from('attendance')
              .insert({
                student_id: userId,
                lecture_id: lectureId,
                marked_at: new Date().toISOString(),
                method: 'face_recognition',
                image_url: publicUrl,
              })

            if (attendanceError) {
              // Check if it's a duplicate entry
              if (attendanceError.code === '23505') {
                setError('Attendance already marked for this lecture.')
              } else {
                throw attendanceError
              }
              setIsVerifying(false)
              return
            }

            setAttendanceMarked(true)
            stopCamera()
            setIsVerifying(false)
            
            // Call callback if provided
            if (onAttendanceMarked) {
              onAttendanceMarked()
            }
          } catch (err: any) {
            setError(err.message || 'Failed to mark attendance')
            setIsVerifying(false)
          }
        }, 'image/jpeg', 0.9)
      } else {
        const confidencePercent = (result.confidence * 100).toFixed(1)
        setError(
          `Face recognition failed. Confidence: ${confidencePercent}% (Required: 80%+). ` +
          'Please ensure good lighting and look directly at the camera.'
        )
        setIsVerifying(false)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify face')
      setIsVerifying(false)
      console.error('Capture error:', err)
    }
  }

  const stopCamera = () => {
    stopRealTimeDetection()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCapturing(false)
  }

  if (attendanceMarked) {
    return (
      <div className="text-center p-4 bg-green-50 rounded-lg">
        <CheckCircle2 className="w-8 h-8 mx-auto text-green-600 mb-2" />
        <p className="text-green-800 font-semibold">Attendance Marked Successfully!</p>
        <p className="text-sm text-green-600 mt-1">Your face has been verified and attendance recorded.</p>
      </div>
    )
  }

  if (modelsLoading) {
    return (
      <div className="text-center p-4">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary mb-2" />
        <p className="text-sm text-gray-600">Loading face recognition models...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!isCapturing ? (
        <Button 
          onClick={startCamera} 
          className="w-full" 
          variant="default"
          disabled={modelsLoading}
        >
          <Camera className="w-4 h-4 mr-2" />
          Start Face Recognition
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-lg border-2"
              style={{ 
                transform: 'scaleX(-1)',
                minHeight: '400px',
                backgroundColor: '#000',
                display: 'block'
              }}
              onLoadedMetadata={(e) => {
                const video = e.currentTarget
                console.log('Video metadata loaded:', {
                  width: video.videoWidth,
                  height: video.videoHeight,
                  readyState: video.readyState,
                  srcObject: !!video.srcObject
                })
                if (canvasRef.current && video.videoWidth > 0 && video.videoHeight > 0) {
                  canvasRef.current.width = video.videoWidth
                  canvasRef.current.height = video.videoHeight
                }
              }}
              onCanPlay={() => {
                console.log('Video can play event fired')
                if (videoRef.current) {
                  videoRef.current.play().catch(err => {
                    console.error('Video play error in onCanPlay:', err)
                  })
                }
              }}
              onPlaying={() => {
                console.log('Video is now playing!')
              }}
              onError={(e) => {
                console.error('Video element error:', e)
                const video = e.currentTarget
                console.error('Video error details:', {
                  error: video.error,
                  srcObject: !!video.srcObject,
                  readyState: video.readyState
                })
                setError('Video playback error. Please try again.')
              }}
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Real-time Confidence Display */}
            {isCapturing && realTimeConfidence !== null && (
              <div className="absolute top-4 right-4 bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
                <div className="text-xs text-gray-300 mb-1">Recognition Accuracy</div>
                <div className={`text-2xl font-bold ${
                  realTimeConfidence >= 0.8 
                    ? 'text-green-400' 
                    : realTimeConfidence >= 0.6 
                    ? 'text-yellow-400' 
                    : 'text-red-400'
                }`}>
                  {(realTimeConfidence * 100).toFixed(1)}%
                </div>
                {realTimeConfidence >= 0.8 && (
                  <div className="text-xs text-green-400 mt-1">✓ Ready to capture</div>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={captureAndVerify} 
              className="flex-1" 
              variant="default"
              disabled={isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Capture & Verify
                </>
              )}
            </Button>
            <Button 
              onClick={stopCamera} 
              variant="outline"
              disabled={isVerifying}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {error && (
        <div className="text-sm text-red-500 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}
      {isCapturing && (
        <p className="text-xs text-gray-500 text-center">
          Position your face in the center and look directly at the camera
        </p>
      )}
    </div>
  )
}
