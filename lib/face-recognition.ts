import * as faceapi from 'face-api.js'

let modelsLoaded = false

export async function loadFaceModels() {
  if (modelsLoaded) return true

  try {
    const MODEL_URL = '/models'
    // Use unpkg CDN as fallback - this hosts the face-api.js weights
    const CDN_BASE = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'
    
    try {
      // Try loading from local public/models first
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ])
    } catch (localError) {
      console.warn('Local models not found, trying GitHub CDN...', localError)
      // Fallback to GitHub CDN if local models don't exist
      // Note: This requires CORS to be enabled, which GitHub raw content supports
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(CDN_BASE),
        faceapi.nets.faceLandmark68Net.loadFromUri(CDN_BASE),
        faceapi.nets.faceRecognitionNet.loadFromUri(CDN_BASE),
      ])
    }
    
    modelsLoaded = true
    return true
  } catch (error) {
    console.error('Error loading face-api models:', error)
    return false
  }
}

export async function detectFaceInImage(image: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<faceapi.FaceDescriptor | null> {
  if (!modelsLoaded) {
    const loaded = await loadFaceModels()
    if (!loaded) return null
  }

  try {
    const detection = await faceapi
      .detectSingleFace(image, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor()

    return detection?.descriptor || null
  } catch (error) {
    console.error('Face detection error:', error)
    return null
  }
}

export async function compareFaces(
  descriptor1: Float32Array,
  descriptor2: Float32Array
): Promise<number> {
  // Calculate Euclidean distance between descriptors
  // Lower distance = more similar faces
  const distance = faceapi.euclideanDistance(descriptor1, descriptor2)
  // Convert distance to similarity score (0-1, where 1 is most similar)
  const similarity = 1 - Math.min(distance, 1)
  return similarity
}

export async function verifyFace(
  capturedImage: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  registeredImages: string[]
): Promise<{ verified: boolean; confidence: number; bestMatch?: string }> {
  try {
    // Load models if not loaded
    if (!modelsLoaded) {
      const loaded = await loadFaceModels()
      if (!loaded) {
        return { verified: false, confidence: 0 }
      }
    }

    // Detect face in captured image
    const capturedDescriptor = await detectFaceInImage(capturedImage)
    if (!capturedDescriptor) {
      return { verified: false, confidence: 0 }
    }

    // Compare with all registered images
    let bestSimilarity = 0
    let bestMatch: string | undefined

    for (const imageUrl of registeredImages) {
      try {
        const img = await loadImage(imageUrl)
        const registeredDescriptor = await detectFaceInImage(img)
        
        if (registeredDescriptor) {
          const similarity = await compareFaces(capturedDescriptor, registeredDescriptor)
          
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity
            bestMatch = imageUrl
          }
        }
      } catch (error) {
        console.error('Error processing registered image:', error)
        continue
      }
    }

    // Threshold for face recognition (0.69 = 69% similarity)
    const threshold = 0.69
    const verified = bestSimilarity >= threshold

    return {
      verified,
      confidence: bestSimilarity,
      bestMatch,
    }
  } catch (error) {
    console.error('Face verification error:', error)
    return { verified: false, confidence: 0 }
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

