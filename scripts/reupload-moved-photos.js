#!/usr/bin/env node

/**
 * Re-upload Moved Photos to Correct R2 Paths
 * 
 * Re-uploads the IMG_000X photos to the correct R2 meeting folder
 */

import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Configuration
const config = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.R2_BUCKET_NAME,
  publicUrl: process.env.R2_PUBLIC_URL,
  
  sourcePhotosDir: path.join(__dirname, '..', 'source-photos'),
  thumbnailWidth: 400,
  thumbnailHeight: 300,
  thumbnailQuality: 80,
  fullImageMaxWidth: 1920,
  fullImageQuality: 85
};

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
});

// Photos to re-upload
const photosToReupload = [
  'IMG_0008.JPG',
  'IMG_0009.JPG',
  'IMG_0010.JPG'
];

/**
 * Create optimized image buffer with proper orientation
 */
async function createOptimizedImage(inputPath, isThumb = false) {
  const sharpInstance = sharp(inputPath);
  
  // Auto-rotate based on EXIF orientation
  sharpInstance.rotate();
  
  if (isThumb) {
    return await sharpInstance
      .resize(config.thumbnailWidth, config.thumbnailHeight, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: config.thumbnailQuality })
      .toBuffer();
  } else {
    return await sharpInstance
      .resize(config.fullImageMaxWidth, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: config.fullImageQuality })
      .toBuffer();
  }
}

/**
 * Upload file to R2
 */
async function uploadToR2(buffer, key, contentType = 'image/jpeg') {
  try {
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });
    
    await r2Client.send(command);
    console.log(`✓ Uploaded: ${key}`);
    return `${config.publicUrl}/${key}`;
  } catch (error) {
    console.error(`✗ Failed to upload ${key}:`, error.message);
    throw error;
  }
}

async function reuploadMovedPhotos() {
  console.log('🔄 Re-uploading moved photos to correct R2 paths...');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const filename of photosToReupload) {
    const filePath = path.join(config.sourcePhotosDir, filename);
    
    try {
      console.log(`\\nProcessing: ${filename}`);
      
      // Check if file exists
      await fs.access(filePath);
      
      // Generate R2 keys for 2025-08-10 meeting
      const baseName = path.parse(filename).name;
      const fullImageKey = `meetings/2025-08-10/${baseName}.jpg`;
      const thumbnailKey = `meetings/2025-08-10/thumbnails/thumb_${baseName}.jpg`;
      
      console.log(`  📸 Creating thumbnail...`);
      const thumbnailBuffer = await createOptimizedImage(filePath, true);
      
      console.log(`  🖼️  Creating full image...`);
      const fullImageBuffer = await createOptimizedImage(filePath, false);
      
      console.log(`  ☁️  Uploading to R2...`);
      await uploadToR2(thumbnailBuffer, thumbnailKey);
      await uploadToR2(fullImageBuffer, fullImageKey);
      
      successCount++;
      console.log(`  ✅ Successfully re-uploaded: ${filename}`);
      
    } catch (error) {
      console.error(`  ❌ Failed to process ${filename}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\\n✅ Re-upload complete!`);
  console.log(`   🎯 Success: ${successCount} photos`);
  console.log(`   ❌ Errors: ${errorCount} photos`);
  
  if (successCount > 0) {
    console.log('\\n📋 The manifest now correctly points to 2025-08-10 meeting paths');
    console.log('   and the actual photos are uploaded to those paths in R2.');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  reuploadMovedPhotos().catch(console.error);
}

export { reuploadMovedPhotos };