# Face Recognition Implementation - Complete Guide

## Overview

The face recognition system has been successfully implemented for the Atocrane attendance management system. Students can now register 10 face images during signup, and use face recognition to mark attendance for scheduled lectures.

## Features Implemented

### 1. Face Registration During Signup
- **Student Signup Flow**: Students are required to capture 10 face images during registration
- **Face Capture Component**: Interactive component with live camera feed and face detection
- **Image Storage**: All images are stored in Supabase storage under `face-registration/{userId}/`
- **Database Storage**: Face image URLs are stored as JSONB array in `profiles.face_image_urls`

### 2. Face Recognition for Attendance
- **Real-time Verification**: Students can verify their face to mark attendance
- **Face Matching**: Uses face-api.js to compare captured image with registered images
- **Confidence Scoring**: Returns similarity score (0-1) with 60% threshold
- **Attendance Recording**: Automatically marks attendance in the database

### 3. Profile Management
- **Profile Page**: Students can register face images later if they signed up via Google OAuth
- **Dashboard Notice**: Students without face images see a notice to register
- **Face Image Management**: View and manage registered face images

## File Structure

```
atocrane/
├── components/
│   ├── face-capture.tsx          # Component for capturing 10 face images
│   └── face-recognition.tsx      # Component for attendance verification
├── lib/
│   └── face-recognition.ts       # Face recognition utilities and logic
├── app/
│   ├── signup/
│   │   └── page.tsx              # Updated signup with face capture
│   ├── student/
│   │   ├── page.tsx              # Student dashboard with face recognition
│   │   └── profile/
│   │       └── page.tsx          # Profile page for face registration
│   └── auth/
│       └── callback/
│           └── route.ts          # OAuth callback handler
├── public/
│   └── models/                   # Face-api.js models (download required)
└── scripts/
    └── download-models.js        # Script to download models
```

## Setup Instructions

### Step 1: Install Dependencies

```bash
cd atocrane
npm install face-api.js
```

### Step 2: Database Migration

Run the SQL migration to add the `face_image_urls` column:

```sql
-- Run in Supabase SQL Editor
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS face_image_urls JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_face_image_urls ON profiles USING GIN (face_image_urls);
```

### Step 3: Download Face-api.js Models

**Option A: Use Download Script (Recommended)**
```bash
node scripts/download-models.js
```

**Option B: Manual Download**
1. Download models from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
2. Place all files in `public/models/` directory

**Option C: Use CDN (Development Only)**
The application will automatically fallback to GitHub CDN if local models are not found.

### Step 4: Verify Storage Bucket

Ensure the `face-images` storage bucket exists in Supabase:
- Go to Supabase Dashboard > Storage
- Verify `face-images` bucket exists
- Ensure proper RLS policies are set

## Usage

### Student Registration Flow

1. **Sign Up**: Student creates account with email/password
2. **Face Capture**: Student captures 10 face images
   - Face detection ensures a face is visible before capturing
   - Images are uploaded to Supabase storage
   - URLs are stored in `profiles.face_image_urls`
3. **Completion**: Student is redirected to dashboard

### Attendance Marking Flow

1. **View Lectures**: Student views scheduled lectures on dashboard
2. **Start Recognition**: For ongoing lectures, click "Start Face Recognition"
3. **Capture Face**: Camera opens, student positions face in view
4. **Verification**: System compares captured face with registered images
5. **Mark Attendance**: If match is found (≥60% similarity), attendance is marked

### Profile Management

1. **Access Profile**: Students can access `/student/profile` to register face images
2. **Capture Images**: Same 10-image capture process as signup
3. **Update Profile**: Face image URLs are updated in the database

## Technical Details

### Face Recognition Algorithm

- **Library**: face-api.js (TensorFlow.js-based)
- **Models Used**:
  - Tiny Face Detector (fast detection)
  - Face Landmark 68 (facial feature detection)
  - Face Recognition Net (face descriptor extraction)

### Face Matching Process

1. **Face Detection**: Detect face in captured image
2. **Descriptor Extraction**: Extract 128-dimensional face descriptor
3. **Comparison**: Compare with all registered face descriptors
4. **Similarity Calculation**: Calculate Euclidean distance
5. **Threshold Check**: Verify similarity ≥ 0.6 (60%)

### Storage Structure

```
face-images/
├── face-registration/
│   └── {userId}/
│       ├── image_1.jpg
│       ├── image_2.jpg
│       └── ... (up to image_10.jpg)
└── attendance/
    └── {lectureId}/
        └── {userId}_{timestamp}.jpg
```

### Database Schema

```sql
profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  name TEXT,
  role TEXT,
  face_image_urls JSONB DEFAULT '[]',  -- Array of image URLs
  ...
)
```

## Configuration

### Face Recognition Threshold

Default: 0.6 (60% similarity)

Location: `lib/face-recognition.ts`

```typescript
const threshold = 0.6 // Adjust between 0.0 - 1.0
```

### Number of Registration Images

Default: 10 images

Location: `components/face-capture.tsx`

```typescript
const REQUIRED_IMAGES = 10 // Adjust as needed
```

### Model Loading

Models are loaded from:
1. Local: `public/models/` (preferred)
2. CDN: GitHub raw content (fallback)

## Troubleshooting

### Models Not Loading

**Issue**: Face recognition models fail to load

**Solutions**:
- Verify models are in `public/models/` directory
- Check browser console for errors
- Ensure models are downloaded correctly
- Try using CDN fallback

### Face Detection Fails

**Issue**: No face detected during capture

**Solutions**:
- Ensure good lighting
- Face should be clearly visible
- Check camera permissions
- Position face directly in front of camera

### Face Recognition Fails

**Issue**: Face verification fails even with correct face

**Solutions**:
- Check image quality (should be clear and well-lit)
- Verify at least 10 images were captured during registration
- Adjust similarity threshold if needed
- Ensure face is directly facing camera

### Storage Upload Errors

**Issue**: Images fail to upload to Supabase

**Solutions**:
- Verify storage bucket exists
- Check RLS policies on storage bucket
- Verify user has proper permissions
- Check Supabase storage logs

## Security Considerations

1. **Biometric Data**: Face images are sensitive biometric data
2. **Storage Security**: Ensure proper RLS policies on storage buckets
3. **Access Control**: Only authorized users should access face images
4. **Data Privacy**: Consider GDPR/compliance requirements
5. **Encryption**: Consider encrypting face images at rest

## Performance Optimization

1. **Model Loading**: Models are loaded once and cached
2. **Image Compression**: Images are compressed before upload (quality: 0.9)
3. **Batch Processing**: Consider batch processing for multiple verifications
4. **CDN**: Use CDN for model files in production

## Future Enhancements

1. **Face Liveness Detection**: Prevent spoofing with photo/video
2. **Multiple Face Detection**: Detect multiple faces in crowd
3. **Real-time Tracking**: Track faces in real-time video
4. **Improved Accuracy**: Use larger training sets
5. **Offline Mode**: Support offline face recognition
6. **Face Update**: Allow students to update their face images

## API Reference

### Face Capture Component

```typescript
<FaceCapture
  userId: string
  onComplete: (imageUrls: string[]) => void
  onError: (error: string) => void
/>
```

### Face Recognition Component

```typescript
<FaceRecognition
  lectureId: string
  userId: string
/>
```

### Face Recognition Utilities

```typescript
// Load models
await loadFaceModels()

// Detect face in image
const descriptor = await detectFaceInImage(image)

// Compare two faces
const similarity = await compareFaces(descriptor1, descriptor2)

// Verify face
const result = await verifyFace(capturedImage, registeredImages)
```

## Testing

### Test Student Registration

1. Sign up as a student
2. Complete face capture (10 images)
3. Verify images are uploaded to storage
4. Verify `face_image_urls` is updated in database

### Test Attendance Marking

1. Log in as a registered student
2. Go to a scheduled lecture
3. Click "Start Face Recognition"
4. Capture and verify face
5. Verify attendance is marked in database

### Test Profile Management

1. Log in as a student without face images
2. Go to `/student/profile`
3. Complete face capture
4. Verify face images are saved
5. Verify dashboard notice disappears

## Support

For issues and questions:
1. Check browser console for errors
2. Verify all setup steps are completed
3. Check Supabase logs for backend errors
4. Review this documentation

## License

This implementation uses face-api.js, which is licensed under the MIT License.






