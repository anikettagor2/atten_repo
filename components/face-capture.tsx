'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, CheckCircle2, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import * as faceapi from 'face-api.js'

interface FaceCaptureProps {
  userId: string
  onComplete: (imageUrls: string[]) => void
  onError: (error: string) => void
}

export function FaceCapture({ userId, onComplete, onError }: FaceCaptureProps) {
  const [images, setImages] = useState<string[]>([])
  const [isCapturing, setIsCapturing] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [isCapturingImage, setIsCapturingImage] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [uploading, setUploading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  const REQUIRED_IMAGES = 10

  useEffect(() => {
    // Load face-api.js models from CDN
    const loadModels = async () => {
      try {
        // Try loading from public/models first, fallback to CDN
        const MODEL_URL = '/models'
        const CDN_BASE = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'
        
        try {
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          ])
        } catch (localError) {
          console.warn('Local models not found, trying GitHub CDN...', localError)
          // Fallback to GitHub CDN if local models don't exist
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(CDN_BASE),
            faceapi.nets.faceLandmark68Net.loadFromUri(CDN_BASE),
            faceapi.nets.faceRecognitionNet.loadFromUri(CDN_BASE),
          ])
        }
        
        setModelsLoaded(true)
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading face-api models:', error)
        onError('Failed to load face recognition models. Please ensure models are available or check your internet connection.')
        setIsLoading(false)
      }
    }

    loadModels()
  }, [onError])

  useEffect(() => {
    return () => {
      stopFaceDetection()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      // Set capturing state first so video element is rendered
      setIsCapturing(true)
      
      // Small delay to ensure video element is in DOM
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
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
            
            // Start continuous face detection after video is playing
            startFaceDetection()
          } catch (playError: any) {
            console.error('Video play error:', playError)
            onError(`Failed to start camera preview: ${playError.message}`)
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
          startFaceDetection()
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
      onError(errorMessage)
      console.error('Camera error:', err)
    }
  }

  const startFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
    }
    
    // Wait a bit for video to be ready before starting detection
    setTimeout(() => {
      detectionIntervalRef.current = setInterval(async () => {
        if (videoRef.current && modelsLoaded && videoRef.current.readyState >= 2) {
          const detected = await detectFace()
          setFaceDetected(detected)
        }
      }, 500) // Check every 500ms
    }, 500) // Wait 500ms for video to initialize
  }

  const stopFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
  }

  const detectFace = async (): Promise<boolean> => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) return false

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      
      // Check if video is ready and has valid dimensions
      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        return false
      }
      
      const displaySize = { width: video.videoWidth, height: video.videoHeight }
      
      // Ensure canvas dimensions match video
      if (canvas.width !== displaySize.width || canvas.height !== displaySize.height) {
        canvas.width = displaySize.width
        canvas.height = displaySize.height
      }
      
      faceapi.matchDimensions(canvas, displaySize)

      const detections = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (detections) {
        // Draw detection on canvas for visual feedback
        const resizedDetections = faceapi.resizeResults(detections, displaySize)
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          faceapi.draw.drawDetections(canvas, resizedDetections)
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
        }
        return true
      }
      
      // Clear canvas if no face detected
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      return false
    } catch (error) {
      console.error('Face detection error:', error)
      return false
    }
  }

  const captureImage = async () => {
    if (!videoRef.current) return
    if (isCapturingImage || uploading) return

    try {
      setIsCapturingImage(true)
      
      // Check if face is detected
      if (!faceDetected) {
        onError('No face detected. Please position your face in front of the camera.')
        setIsCapturingImage(false)
        return
      }

      const video = videoRef.current
      
      // Check if video is ready
      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        onError('Camera is not ready. Please wait a moment and try again.')
        setIsCapturingImage(false)
        return
      }
      
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        onError('Failed to initialize canvas.')
        setIsCapturingImage(false)
        return
      }

      ctx.drawImage(video, 0, 0)
      
      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsCapturingImage(false)
          return
        }

        setUploading(true)

        try {
          // Upload to Supabase storage in student profile folder
          const timestamp = Date.now()
          const fileName = `student-profiles/${userId}/image_${images.length + 1}_${timestamp}.jpg`
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('face-images')
            .upload(fileName, blob, {
              contentType: 'image/jpeg',
              upsert: false
            })

          if (uploadError) {
            console.error('Upload error:', uploadError)
            onError('Failed to upload image. Please try again.')
            setUploading(false)
            setIsCapturingImage(false)
            return
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('face-images')
            .getPublicUrl(fileName)

          const newImages = [...images, publicUrl]
          setImages(newImages)
          setCurrentImageIndex(newImages.length)

          // Check if we have enough images
          if (newImages.length >= REQUIRED_IMAGES) {
            stopCamera()
            onComplete(newImages)
          }
        } catch (err: any) {
          onError(err.message || 'Failed to upload image')
          console.error('Upload error:', err)
        } finally {
          setUploading(false)
          setIsCapturingImage(false)
        }
      }, 'image/jpeg', 0.9)
    } catch (err: any) {
      onError(err.message || 'Failed to capture image')
      console.error('Capture error:', err)
      setIsCapturingImage(false)
      setUploading(false)
    }
  }

  const removeImage = async (index: number) => {
    if (uploading) return
    
    const imageToRemove = images[index]
    const newImages = images.filter((_, i) => i !== index)
    setImages(newImages)
    setCurrentImageIndex(newImages.length)

    // Optionally delete from storage (optional cleanup)
    try {
      if (imageToRemove) {
        // Extract file path from public URL
        // URL format: https://[project].supabase.co/storage/v1/object/public/face-images/student-profiles/[userId]/image_X_timestamp.jpg
        const urlParts = imageToRemove.split('/')
        const bucketIndex = urlParts.findIndex(part => part === 'face-images')
        if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
          const fileName = urlParts.slice(bucketIndex + 1).join('/')
          await supabase.storage
            .from('face-images')
            .remove([fileName])
        }
      }
    } catch (err) {
      console.error('Error deleting image from storage:', err)
      // Continue even if deletion fails
    }
  }

  const stopCamera = () => {
    stopFaceDetection()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
    setIsCapturing(false)
    setFaceDetected(false)
  }

  if (isLoading) {
    return (
      <div className="text-center p-8">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-4" />
        <p className="text-sm text-gray-600">Loading face recognition models...</p>
      </div>
    )
  }

  if (images.length >= REQUIRED_IMAGES) {
    return (
      <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
        <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 mb-3" />
        <p className="text-green-800 font-semibold text-lg mb-1">
          Successfully captured {REQUIRED_IMAGES} images!
        </p>
        <p className="text-sm text-green-600">
          Your face images have been stored in your student profile.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(images.length / REQUIRED_IMAGES) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-700 min-w-[60px]">
            {images.length}/{REQUIRED_IMAGES}
          </span>
        </div>
        <p className="text-sm text-gray-600">
          Capture {REQUIRED_IMAGES} images of your face for face recognition
        </p>
        <p className="text-xs text-gray-500">
          Position your face in the center, ensure good lighting, and look directly at the camera
        </p>
      </div>

      {/* Camera Preview Section */}
      {!isCapturing ? (
        <div className="space-y-4">
          <div className="aspect-video bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
            <div className="text-center space-y-3">
              <Camera className="w-12 h-12 mx-auto text-gray-400" />
              <p className="text-sm text-gray-500">Camera preview will appear here</p>
            </div>
          </div>
          <Button 
            onClick={startCamera} 
            className="w-full" 
            variant="default"
            size="lg"
            disabled={!modelsLoaded}
          >
            <Camera className="w-5 h-5 mr-2" />
            Start Camera
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Camera Preview with Shutter Button */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border-2 border-gray-300" style={{ minHeight: '400px' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
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
                onError('Video playback error. Please try again.')
              }}
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ transform: 'scaleX(-1)' }}
            />
            
            {/* Face Detection Indicator */}
            {faceDetected && (
              <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Face Detected
              </div>
            )}
            
            {/* Shutter Button Overlay */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
              <button
                onClick={captureImage}
                disabled={!faceDetected || isCapturingImage || uploading}
                className={`
                  w-20 h-20 rounded-full border-4 border-white shadow-lg
                  flex items-center justify-center
                  transition-all duration-200
                  ${faceDetected && !isCapturingImage && !uploading
                    ? 'bg-primary hover:bg-primary/90 active:scale-95 cursor-pointer'
                    : 'bg-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : isCapturingImage ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Camera Controls */}
          <div className="flex gap-2">
            <Button 
              onClick={stopCamera} 
              variant="outline" 
              className="flex-1"
              disabled={isCapturingImage || uploading}
            >
              Stop Camera
            </Button>
            <Button 
              onClick={captureImage} 
              variant="default" 
              className="flex-1"
              disabled={!faceDetected || isCapturingImage || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Capture ({images.length + 1})
                </>
              )}
            </Button>
          </div>

          {!faceDetected && isCapturing && (
            <p className="text-xs text-amber-600 text-center bg-amber-50 p-2 rounded">
              ⚠️ No face detected. Please position your face in front of the camera.
            </p>
          )}
        </div>
      )}

      {/* Image Gallery Preview */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-700">
              Captured Images ({images.length})
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {images.map((url, index) => (
              <div 
                key={index} 
                className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-primary transition-colors"
              >
                <img
                  src={url}
                  alt={`Student face capture ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                  {index + 1}
                </div>
                <button
                  onClick={() => removeImage(index)}
                  disabled={uploading}
                  className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                  title="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 text-center">
            All images are stored in your student profile and will be used for face recognition
          </p>
        </div>
      )}
    </div>
  )
}

