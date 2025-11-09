# Face Recognition Setup Guide

## Overview

This guide will help you set up face recognition for the Atocrane attendance system. Students need to register 10 face images during signup, which are then used for attendance verification.

## Prerequisites

1. Face-api.js models need to be available
2. Supabase storage bucket `face-images` must be configured
3. Database migration for `face_image_urls` column must be run

## Step 1: Database Migration

Run the SQL migration to add the `face_image_urls` column:

```sql
-- Run this in Supabase SQL Editor
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS face_image_urls JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_face_image_urls ON profiles USING GIN (face_image_urls);
```

## Step 2: Download Face-api.js Models

You have two options:

### Option A: Use CDN (Recommended for Development)

The application will automatically try to load models from CDN if local models are not found. However, for production, you should download the models locally.

### Option B: Download Models Locally (Recommended for Production)

1. Download the face-api.js models from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

2. Download these files:
   - `tiny_face_detector_model-weights_manifest.json`
   - `tiny_face_detector_model-shard1`
   - `face_landmark_68_model-weights_manifest.json`
   - `face_landmark_68_model-shard1`
   - `face_recognition_model-weights_manifest.json`
   - `face_recognition_model-shard1`
   - `face_recognition_model-shard2`

3. Place all files in `public/models/` directory

### Option C: Use the Download Script

Run the download script (requires Node.js):

```bash
node scripts/download-models.js
```

## Step 3: Verify Storage Bucket

Ensure the `face-images` storage bucket exists in Supabase:

1. Go to Supabase Dashboard > Storage
2. Verify `face-images` bucket exists
3. Ensure it's public or has proper RLS policies

The bucket should have these folders:
- `face-registration/{userId}/` - For student registration images
- `attendance/{lectureId}/` - For attendance verification images

## Step 4: Test the Setup

1. **Student Registration:**
   - Sign up as a student
   - Complete the face capture process (10 images)
   - Verify images are uploaded to Supabase storage
   - Verify `face_image_urls` is updated in the profiles table

2. **Attendance Verification:**
   - Log in as a student
   - Go to a scheduled lecture
   - Click "Start Face Recognition"
   - Capture and verify your face
   - Verify attendance is marked in the database

## Troubleshooting

### Models Not Loading

- Check browser console for errors
- Verify models are in `public/models/` directory
- Check network tab for failed requests
- Try using CDN fallback (automatically attempted)

### Face Detection Not Working

- Ensure good lighting
- Face should be clearly visible
- Check camera permissions
- Verify models are loaded (check browser console)

### Storage Upload Errors

- Verify storage bucket exists
- Check RLS policies on storage bucket
- Verify user has proper permissions
- Check Supabase storage logs

### Face Recognition Fails

- Ensure at least 10 images were captured during registration
- Check image quality (should be clear and well-lit)
- Verify face is directly facing camera
- Check similarity threshold (currently set to 0.6)

## Configuration

### Face Recognition Threshold

The face recognition similarity threshold is set to 0.6 (60%) in `lib/face-recognition.ts`. You can adjust this value:

```typescript
// In verifyFace function
const threshold = 0.6 // Adjust this value (0.0 - 1.0)
```

- Lower threshold (0.4-0.5) = More lenient, easier to match
- Higher threshold (0.7-0.8) = More strict, harder to match

### Number of Registration Images

The number of images required during registration is set to 10 in `components/face-capture.tsx`:

```typescript
const REQUIRED_IMAGES = 10 // Adjust this value
```

## API Reference

### Face Capture Component

`components/face-capture.tsx`

Props:
- `userId: string` - User ID for storing images
- `onComplete: (imageUrls: string[]) => void` - Callback when all images are captured
- `onError: (error: string) => void` - Error callback

### Face Recognition Component

`components/face-recognition.tsx`

Props:
- `lectureId: string` - Lecture ID for attendance
- `userId: string` - Student user ID

### Face Recognition Utilities

`lib/face-recognition.ts`

Functions:
- `loadFaceModels()` - Load face-api.js models
- `detectFaceInImage(image)` - Detect face in an image
- `compareFaces(descriptor1, descriptor2)` - Compare two face descriptors
- `verifyFace(capturedImage, registeredImages)` - Verify face against registered images

## Security Considerations

1. **Storage Security:** Ensure proper RLS policies on storage buckets
2. **Image Privacy:** Face images contain sensitive biometric data
3. **Access Control:** Only allow authorized users to access face images
4. **Data Retention:** Consider implementing data retention policies
5. **Encryption:** Consider encrypting face images at rest

## Performance Optimization

1. **Model Loading:** Models are loaded once and cached
2. **Image Compression:** Images are compressed before upload (quality: 0.9)
3. **Batch Processing:** Consider batch processing for multiple verifications
4. **CDN:** Use CDN for model files in production

## Future Enhancements

1. Face liveness detection
2. Multiple face detection in crowd
3. Real-time face tracking
4. Improved accuracy with larger training sets
5. Offline mode support






