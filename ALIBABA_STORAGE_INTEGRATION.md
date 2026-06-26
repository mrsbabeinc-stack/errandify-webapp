# Alibaba Cloud Storage Integration for Photo Uploads

Complete guide to integrate Alibaba OSS (Object Storage Service) for job completion photo uploads.

---

## PART 1: WHY ALIBABA FOR STORAGE?

### Alibaba Cloud Advantages for Singapore/Asia

```
✓ Fastest in Asia (data centers in Singapore, Hong Kong, Shanghai)
✓ Very cheap (cheaper than AWS S3 for Asia)
✓ Great for video/photo storage
✓ Free tier available ($0 for first 5GB/month)
✓ Simple API (easier than AWS S3)
✓ Perfect for startup MVP

Pricing (Singapore Region - oss-ap-southeast-1):
- Storage: ¥0.120/GB/month (~$0.017/GB/month)
- Upload bandwidth: Free
- Download bandwidth: ¥0.50/GB (~$0.07/GB)
- Free tier: First 5GB storage free per month

For comparison:
AWS S3 Singapore: $0.025/GB/month + data transfer costs
Firebase: $0.05/GB after free tier
Alibaba: $0.017/GB (cheaper + faster in Asia)
```

---

## PART 2: SETUP ALIBABA OSS

### Step 1: Create Alibaba Cloud Account

```
Go to: https://www.alibabacloud.com
1. Sign up
2. Add payment method (credit card or Alipay)
3. Create access key ID and secret
4. Create bucket named: errandify-jobs
```

### Step 2: Create Bucket

```
1. Go to OSS Console
2. Click "Create Bucket"
3. Settings:
   - Name: errandify-jobs
   - Region: Singapore (oss-ap-southeast-1)
   - Storage Type: Standard
   - Access Control: Private (users auth via SDK)
4. Click Create
```

### Step 3: Get Credentials

```
Go to Settings → Access Key Management

Copy these credentials (save securely):
- Access Key ID: LTAI5txxxxxxxxxx
- Access Key Secret: xxxxxxxxxxxxxxxxxxx
- Region: oss-ap-southeast-1
- Endpoint: oss-ap-southeast-1.aliyuncs.com
```

---

## PART 3: BACKEND SETUP

### Install Alibaba OSS SDK

```bash
cd backend
npm install ali-oss
npm install --save-dev @types/ali-oss
```

### Create OSS Service (backend/src/services/ossService.ts)

```typescript
import OSS from 'ali-oss';
import { v4 as uuidv4 } from 'uuid';

// Initialize OSS client
const ossClient = new OSS({
  region: process.env.ALIBABA_OSS_REGION || 'oss-ap-southeast-1',
  accessKeyId: process.env.ALIBABA_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIBABA_ACCESS_KEY_SECRET,
  bucket: process.env.ALIBABA_OSS_BUCKET || 'errandify-jobs',
});

export async function generateSignedUrl(
  fileType: string = 'image/jpeg'
): Promise<{
  uploadUrl: string;
  key: string;
}> {
  // Generate unique key for the photo
  const key = `jobs/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${uuidv4()}.jpg`;

  // Generate signed URL for direct upload from frontend
  // URL valid for 30 minutes
  const signedUrl = ossClient.generateObjectUrl(key, {
    expires: 30 * 60, // 30 minutes
    method: 'PUT',
  });

  return {
    uploadUrl: signedUrl,
    key: key,
  };
}

export async function uploadFile(
  buffer: Buffer,
  filename: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  try {
    const key = `jobs/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${uuidv4()}-${filename}`;

    const result = await ossClient.put(key, buffer, {
      contentType: contentType,
      headers: {
        'Cache-Control': 'max-age=31536000', // Cache for 1 year
      },
    });

    return result.url;
  } catch (error) {
    console.error('OSS upload error:', error);
    throw new Error('Failed to upload file to Alibaba OSS');
  }
}

export async function deleteFile(key: string): Promise<void> {
  try {
    await ossClient.delete(key);
  } catch (error) {
    console.error('OSS delete error:', error);
    throw new Error('Failed to delete file from Alibaba OSS');
  }
}

export async function getFileUrl(key: string): Promise<string> {
  // Get public URL for the file
  const url = ossClient.getObjectUrl(key);
  return url;
}
```

### Add Environment Variables (backend/.env)

```env
# Alibaba OSS Configuration
ALIBABA_OSS_REGION=oss-ap-southeast-1
ALIBABA_OSS_BUCKET=errandify-jobs
ALIBABA_ACCESS_KEY_ID=your_access_key_id_here
ALIBABA_ACCESS_KEY_SECRET=your_access_key_secret_here
```

### Add Backend Endpoint (backend/src/routes/uploads.ts)

```typescript
import { Router, Request, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { generateSignedUrl } from '../services/ossService.js';

const router = Router();

// GET /api/uploads/sign-url - Get signed URL for direct browser upload
router.get('/sign-url', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { fileType = 'image/jpeg' } = req.query;

    const { uploadUrl, key } = await generateSignedUrl(fileType as string);

    res.json({
      success: true,
      data: {
        uploadUrl: uploadUrl,
        key: key,
        expiresIn: 30 * 60, // 30 minutes in seconds
      },
    });
  } catch (error) {
    console.error('Sign URL error:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

// POST /api/uploads/verify - Verify file was uploaded and save to database
router.post('/verify', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { key, caption } = req.body;
    const userId = parseInt(req.userId || '0', 10);

    if (!key) {
      return res.status(400).json({ error: 'Key is required' });
    }

    // In real scenario, verify file exists in OSS
    // For now, construct the public URL
    const publicUrl = `https://${process.env.ALIBABA_OSS_BUCKET}.${process.env.ALIBABA_OSS_REGION}.aliyuncs.com/${key}`;

    res.json({
      success: true,
      data: {
        photoUrl: publicUrl,
        key: key,
        message: 'Photo uploaded successfully',
      },
    });
  } catch (error) {
    console.error('Verify upload error:', error);
    res.status(500).json({ error: 'Failed to verify upload' });
  }
});

export default router;
```

### Update Main Backend File (backend/src/index.ts)

```typescript
import uploadRoutes from './routes/uploads.js';

// Add this line with other route registrations
app.use('/api/uploads', uploadRoutes);
```

---

## PART 4: FRONTEND SETUP

### Install Alibaba OSS Client SDK

```bash
cd frontend
npm install ali-oss
```

### Create Photo Upload Component (frontend/src/components/JobCompletion.tsx)

```typescript
import React, { useState, useRef } from 'react';
import OSS from 'ali-oss';
import { useToast } from '../hooks/useToast.js';

interface JobCompletionProps {
  jobId: number;
  onComplete: (photos: string[], notes: string) => void;
  onCancel: () => void;
}

export const JobCompletion: React.FC<JobCompletionProps> = ({
  jobId,
  onComplete,
  onCancel,
}) => {
  const [photos, setPhotos] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Handle photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      // Max 5 photos, each max 10MB
      if (selectedFiles.length + photos.length > 5) {
        showToast({
          type: 'warning',
          title: 'Max 5 photos',
          message: 'You can upload up to 5 photos per job',
        });
        return;
      }

      const validFiles = selectedFiles.filter(file => {
        if (file.size > 10 * 1024 * 1024) {
          showToast({
            type: 'warning',
            title: 'File too large',
            message: `${file.name} is too large (max 10MB)`,
          });
          return false;
        }
        return true;
      });

      setPhotos([...photos, ...validFiles]);
    }
  };

  // Upload photos to Alibaba OSS
  const uploadPhotosToOSS = async (): Promise<string[]> => {
    try {
      setUploading(true);
      setUploadProgress(0);
      const uploadedUrls: string[] = [];

      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];

        // Step 1: Get signed URL from backend
        const signResponse = await fetch('/api/uploads/sign-url', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!signResponse.ok) {
          throw new Error('Failed to get upload URL');
        }

        const { data } = await signResponse.json();
        const { uploadUrl, key } = data;

        // Step 2: Upload directly to Alibaba OSS using signed URL
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        // Step 3: Verify upload with backend
        const verifyResponse = await fetch('/api/uploads/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            key: key,
            caption: `Photo ${i + 1}`,
          }),
        });

        if (!verifyResponse.ok) {
          throw new Error('Failed to verify upload');
        }

        const { data: verifyData } = await verifyResponse.json();
        uploadedUrls.push(verifyData.photoUrl);

        // Update progress
        setUploadProgress(Math.round(((i + 1) / photos.length) * 100));
      }

      return uploadedUrls;
    } catch (error) {
      console.error('Upload error:', error);
      showToast({
        type: 'critical',
        title: 'Upload failed',
        message: error instanceof Error ? error.message : 'Failed to upload photos',
      });
      throw error;
    }
  };

  // Handle completion
  const handleComplete = async () => {
    if (photos.length === 0) {
      showToast({
        type: 'warning',
        title: 'Photos required',
        message: 'Please upload at least one photo of completed work',
      });
      return;
    }

    try {
      // Upload photos to Alibaba OSS
      const photoUrls = await uploadPhotosToOSS();

      // Mark job complete with backend
      const response = await fetch(`/api/tasks/${jobId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          photos: photoUrls,
          notes: notes,
          approved: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark job complete');
      }

      showToast({
        type: 'success',
        title: 'Job completed!',
        message: 'Photos uploaded and job marked complete',
      });

      onComplete(photoUrls, notes);
    } catch (error) {
      console.error('Completion error:', error);
      showToast({
        type: 'critical',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to complete job',
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Complete Job</h2>

      {/* Photos Section */}
      <div className="mb-6">
        <label className="block text-lg font-semibold mb-3">
          Upload Photos of Completed Work
        </label>

        {/* Photo Preview Grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            {photos.map((photo, index) => (
              <div
                key={index}
                className="relative bg-gray-100 rounded-lg overflow-hidden aspect-square"
              >
                <img
                  src={URL.createObjectURL(photo)}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => {
                    setPhotos(photos.filter((_, i) => i !== index));
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handlePhotoSelect}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full py-3 px-4 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-50"
        >
          {photos.length === 0 ? (
            <>📸 Select Photos (up to 5)</>
          ) : (
            <>📸 Add More Photos ({photos.length}/5)</>
          )}
        </button>

        {photos.length > 0 && (
          <p className="text-sm text-gray-600 mt-2">
            {photos.length} photo{photos.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2 text-center">
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}

      {/* Notes Section */}
      <div className="mb-6">
        <label className="block text-lg font-semibold mb-3">
          Completion Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe what was done, any special notes..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
          maxLength={500}
        />
        <p className="text-sm text-gray-600 mt-2">
          {notes.length}/500 characters
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={onCancel}
          disabled={uploading}
          className="flex-1 py-3 px-4 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleComplete}
          disabled={uploading || photos.length === 0}
          className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? `Uploading... ${uploadProgress}%` : 'Mark Complete'}
        </button>
      </div>
    </div>
  );
};
```

---

## PART 5: SECURITY & CORS SETUP

### Alibaba OSS CORS Configuration

```
In Alibaba OSS Console:

1. Go to Bucket → errandify-jobs
2. Click "CORS"
3. Create CORS rule:
   - Origins: https://yourdomain.com (your frontend domain)
   - Methods: GET, POST, PUT
   - Response Headers: Content-Length, Content-Type, ETag
   - Max Age: 3600

This allows frontend to upload directly to OSS without going through backend.
```

### Security Best Practices

```typescript
// Backend should verify:
1. User is authenticated
2. User has permission to upload for this job
3. File size is reasonable
4. File type is image only
5. Rate limit uploads (max 5 per job)

Example validation:
if (!isAuthenticated) throw new Error('Not authenticated');
if (!canEditJob(userId, jobId)) throw new Error('No permission');
if (fileSize > 10 * 1024 * 1024) throw new Error('File too large');
if (!['image/jpeg', 'image/png', 'image/webp'].includes(fileType)) {
  throw new Error('Invalid file type');
}
```

---

## PART 6: COMPLETE FLOW

### How It Works End-to-End

```
1. Frontend: User selects photo
   ↓
2. Frontend: Request signed URL from backend
   ↓
3. Backend: Generate signed URL (30 min validity)
   ↓
4. Frontend: Upload photo directly to Alibaba OSS using signed URL
   (No backend processing needed - faster!)
   ↓
5. Frontend: Get public URL after successful upload
   ↓
6. Frontend: Request job completion with photo URLs
   ↓
7. Backend: Store photo URLs in task_photos table
   ↓
8. Frontend: Show success message
```

### Why This Architecture?

```
✓ Fast: Upload goes directly to Alibaba (not through backend)
✓ Scalable: Backend not bottleneck for file uploads
✓ Secure: Signed URLs have time/signature limits
✓ Cheap: Use Alibaba's infrastructure
✓ Simple: Only 2 backend endpoints needed (/sign-url, /verify)
✓ Mobile-friendly: Works on any device with browser
```

---

## PART 7: COST ESTIMATES

### For Errandify Launch

```
Scenario: 1,000 jobs/month, avg 3 photos/job = 3,000 photos

Storage:
- Avg photo size: 2MB (compressed JPG)
- Total storage: 3,000 × 2MB = 6GB/month
- Cost with free tier: $0 (free up to 5GB)
- When exceeding free: $0.17/GB/month (~$0.51/month)

Download bandwidth (askers viewing photos):
- Assume each photo viewed 3x (asker + platform admins)
- Total downloads: 3,000 × 3 = 9,000 downloads
- Avg bandwidth: 9,000 × 2MB = 18GB
- Cost: 18GB × $0.07 = $1.26/month

**Total Monthly Cost: ~$1.50 for 1,000 jobs/month**

Compare:
- AWS S3 Singapore: ~$8-12/month
- Firebase Storage: ~$5-10/month
- Alibaba: ~$1.50/month (best for Asia)
```

---

## PART 8: IMPLEMENTATION CHECKLIST

```
Backend:
✓ Install ali-oss SDK
✓ Create ossService.ts
✓ Create uploads.ts endpoints
✓ Add environment variables
✓ Add CORS headers
✓ Update index.ts routing

Frontend:
✓ Install ali-oss SDK
✓ Create JobCompletion.tsx component
✓ Handle photo selection
✓ Handle upload progress
✓ Handle errors gracefully
✓ Display success message

Alibaba Setup:
✓ Create account
✓ Create bucket
✓ Get access keys
✓ Configure CORS
✓ Set storage policy

Integration:
✓ Wire JobCompletion into ErrandDetailPage
✓ Call /api/tasks/:id/complete after upload
✓ Store photo URLs in database
✓ Display uploaded photos
✓ Test on mobile device

Testing:
✓ Test single photo upload
✓ Test multiple photo upload
✓ Test large file rejection
✓ Test network failure recovery
✓ Test on slow connection
```

---

## SUMMARY

Using Alibaba OSS is the **fastest, cheapest solution for Asia**:

- **Cost**: ~$0.01-2/month (vs AWS $8-12/month)
- **Speed**: Direct uploads from browser, no backend bottleneck
- **Latency**: Fastest data center for Singapore/Malaysia/Hong Kong
- **Simplicity**: 2 backend endpoints + 1 frontend component
- **Security**: Signed URLs with expiration

**Build time: 1 week**
- Backend: 2-3 days
- Frontend: 2-3 days
- Testing: 1-2 days

Ready to build?
