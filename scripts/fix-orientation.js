#!/usr/bin/env node

/**
 * Fix Photo Orientation
 * 
 * Reprocesses existing photos to fix EXIF orientation issues
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
    console.log(`✓ Re-uploaded: ${key}`);
    return `${config.publicUrl}/${key}`;
  } catch (error) {
    console.error(`✗ Failed to re-upload ${key}:`, error.message);
    throw error;
  }
}

/**
 * Check if image needs rotation based on EXIF
 */
async function needsRotation(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    // If orientation exists and is not 1 (normal), it needs rotation
    return metadata.orientation && metadata.orientation !== 1;
  } catch (error) {
    console.warn(`Could not check orientation for ${filePath}:`, error.message);
    return false;
  }
}

async function fixOrientation() {
  console.log('🔄 Fixing photo orientation...');
  
  // Read manifest to get list of photos
  const manifestPath = path.join(__dirname, '..', 'src', 'data', 'photo-manifest.json');
  const manifestContent = await fs.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestContent);
  
  let fixedCount = 0;
  let skippedCount = 0;
  
  // Process each meeting's photos
  for (const [meetingDate, photos] of Object.entries(manifest.photosByMeeting)) {
    console.log(`\\nChecking meeting ${meetingDate}:`);
    
    for (const photo of photos) {
      const baseName = path.parse(photo.filename).name;
      
      // Try to find the original source file
      const possibleExtensions = ['.jpg', '.JPG', '.jpeg', '.JPEG', '.png', '.PNG', '.heic', '.HEIC'];
      let sourceFile = null;
      
      for (const ext of possibleExtensions) {
        const possiblePath = path.join(config.sourcePhotosDir, baseName + ext);
        try {
          await fs.access(possiblePath);
          sourceFile = possiblePath;
          break;
        } catch {
          // File doesn't exist with this extension
        }
      }
      
      if (!sourceFile) {
        console.log(`  ⚠️  Source file not found for: ${photo.filename}`);
        skippedCount++;
        continue;
      }
      
      // Check if rotation is needed
      const needsRotationFix = await needsRotation(sourceFile);
      
      if (!needsRotationFix) {
        console.log(`  ✅ No rotation needed: ${baseName}`);
        skippedCount++;
        continue;
      }
      
      console.log(`  🔄 Fixing orientation: ${baseName}`);
      
      try {
        // Generate R2 keys
        const fullImageKey = `meetings/${meetingDate}/${baseName}.jpg`;
        const thumbnailKey = `meetings/${meetingDate}/thumbnails/thumb_${baseName}.jpg`;
        
        // Create corrected images
        console.log(`    📸 Creating corrected thumbnail...`);
        const thumbnailBuffer = await createOptimizedImage(sourceFile, true);
        
        console.log(`    🖼️  Creating corrected full image...`);
        const fullImageBuffer = await createOptimizedImage(sourceFile, false);
        
        // Re-upload to R2
        console.log(`    ☁️  Re-uploading to R2...`);
        await uploadToR2(thumbnailBuffer, thumbnailKey);
        await uploadToR2(fullImageBuffer, fullImageKey);
        
        fixedCount++;
        console.log(`    ✅ Fixed orientation: ${baseName}`);
        
      } catch (error) {
        console.error(`    ❌ Failed to fix ${baseName}:`, error.message);
        skippedCount++;
      }
    }
  }
  
  console.log(`\\n✅ Orientation fix complete!`);
  console.log(`   🔄 Fixed: ${fixedCount} photos`);
  console.log(`   ⏭️  Skipped: ${skippedCount} photos`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixOrientation().catch(console.error);
}

export { fixOrientation };