#!/usr/bin/env node

/**
 * Cloudflare R2 Photo Processing System
 * 
 * Processes photos from a local directory, creates thumbnails,
 * uploads to R2, and updates the photo manifest for the website.
 */

import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import ExifReader from 'exifreader';
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Configuration from environment variables
const config = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.R2_BUCKET_NAME || 'fll-photos',
  publicUrl: process.env.R2_PUBLIC_URL || `https://${process.env.R2_BUCKET_NAME}.your-domain.com`,
  
  // Local paths
  sourcePhotosDir: path.join(__dirname, '..', 'source-photos'),
  outputManifest: path.join(__dirname, '..', 'src', 'data', 'photo-manifest.json'),
  
  // Image processing
  thumbnailWidth: 400,
  thumbnailHeight: 300,
  thumbnailQuality: 80,
  fullImageMaxWidth: 1920,
  fullImageQuality: 85
};

// Meeting dates for photo grouping
const MEETING_DATES = [
  '2025-08-10',
  '2025-08-17',
  '2025-08-20',
  '2025-08-21',
  '2025-08-24',
  '2025-08-28',
  '2025-08-31',
  '2025-09-04',
  '2025-09-07',
  '2025-09-11',
  '2025-09-14',
  '2025-09-18',
  '2025-09-21',
  '2025-10-02',
  '2025-10-05',
  '2025-10-09',
  '2025-10-12',
  '2025-11-06',
  '2025-11-09',
  '2025-12-04',
  '2025-12-07'
];

// Manual date assignments for photos without EXIF data
// Format: filename (without extension) -> meeting date
const MANUAL_DATE_ASSIGNMENTS = {
  '3190850475024400528': '2025-08-10',
  '5703217700916735598': '2025-08-10', 
  '6132005204961641733': '2025-08-10',
  'IMG_0008': '2025-08-10',
  'IMG_0009': '2025-08-10',
  'IMG_0010': '2025-08-10',
  // Photos from 8/20 meeting (added today but should be assigned to yesterday)
  '1985566967856903279': '2025-08-20',
  '2206557133100762278': '2025-08-20',
  '3604902907576489929': '2025-08-20',
  '4256567167217438593': '2025-08-20',
  '4471225442618467430': '2025-08-20',
  '6349211677595816968': '2025-08-20'
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
 * Validate configuration
 */
function validateConfig() {
  const required = ['accountId', 'accessKeyId', 'secretAccessKey', 'bucketName'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.map(k => `R2_${k.toUpperCase()}`).join(', ')}`);
  }
}

/**
 * Extract date from EXIF data, with fallback to file creation date
 */
async function extractPhotoDate(filePath, filename) {
  try {
    const buffer = await fs.readFile(filePath);
    const tags = ExifReader.load(buffer);
    
    const dateFields = ['DateTimeOriginal', 'DateTimeDigitized', 'DateTime'];
    
    // Try EXIF dates first (prefer DateTimeOriginal as it's when photo was actually taken)
    for (const field of dateFields) {
      if (tags[field]) {
        const dateString = tags[field].description;
        const dateMatch = dateString.match(/^(\d{4}):(\d{2}):(\d{2})/);
        if (dateMatch) {
          console.log(`  📅 Using EXIF ${field}: ${dateString}`);
          return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
        }
      }
    }
    
    // No EXIF date found - try file creation date (birthtime)
    console.warn(`⚠️  No EXIF date found for ${filename}, trying file creation date...`);
    const stats = await fs.stat(filePath);
    
    // Use creation date, but convert to local date to avoid timezone issues
    const creationDate = new Date(stats.birthtime);
    const localDateString = creationDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format in local timezone
    
    console.log(`  📅 Using file creation date: ${stats.birthtime.toISOString()} → ${localDateString}`);
    return localDateString;
    
  } catch (error) {
    console.warn(`Could not extract date from ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Find closest meeting date for a photo date
 */
function findClosestMeetingDate(photoDate) {
  const photoTime = new Date(photoDate).getTime();
  
  let closest = MEETING_DATES[0];
  let minDiff = Math.abs(new Date(MEETING_DATES[0]).getTime() - photoTime);
  
  for (const meetingDate of MEETING_DATES) {
    const diff = Math.abs(new Date(meetingDate).getTime() - photoTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = meetingDate;
    }
  }
  
  // Only assign to meeting if within 7 days
  return minDiff <= 7 * 24 * 60 * 60 * 1000 ? closest : 'uncategorized';
}

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

/**
 * Get existing photos from R2 to avoid re-uploading
 */
async function getExistingPhotos() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: config.bucketName,
    });
    
    const response = await r2Client.send(command);
    return new Set((response.Contents || []).map(obj => obj.Key));
  } catch (error) {
    console.warn('Could not list existing photos:', error.message);
    return new Set();
  }
}

/**
 * Process photos and upload to R2
 */
async function processPhotos() {
  console.log('🦙 Starting R2 photo processing...');
  
  validateConfig();
  
  // Check if source directory exists
  try {
    await fs.access(config.sourcePhotosDir);
  } catch {
    console.error(`Source photos directory not found: ${config.sourcePhotosDir}`);
    console.log('Please create this directory and add your photos to it.');
    return;
  }
  
  // Get list of photos to process
  const files = await fs.readdir(config.sourcePhotosDir);
  console.log(`Found files: ${files.join(', ')}`);
  
  const imageFiles = files.filter(file => 
    /\.(jpg|jpeg|png|heic|webp)$/i.test(file)
  );
  
  console.log(`Image files: ${imageFiles.join(', ')}`);
  
  if (imageFiles.length === 0) {
    console.log('No image files found to process.');
    return;
  }
  
  console.log(`Found ${imageFiles.length} images to process`);
  
  // Get existing photos to avoid re-uploading
  const existingPhotos = await getExistingPhotos();
  
  // Load existing manifest to avoid duplicates
  let existingManifest = { photosByMeeting: {} };
  try {
    const manifestContent = await fs.readFile(config.outputManifest, 'utf8');
    existingManifest = JSON.parse(manifestContent);
  } catch {
    console.log('No existing manifest found, creating new one');
  }
  
  const photosByMeeting = { ...existingManifest.photosByMeeting };
  let uploadCount = 0;
  let skipCount = 0;
  const processedBasenames = new Set();
  
  for (const filename of imageFiles) {
    const filePath = path.join(config.sourcePhotosDir, filename);
    
    try {
      console.log(`\\nProcessing: ${filename}`);
      
      // Extract photo date and assign to meeting
      let photoDate = await extractPhotoDate(filePath, filename);
      let meetingDate;
      
      if (photoDate === null) {
        // Still no date found - check manual assignments as last resort
        const baseName = path.parse(filename).name;
        if (MANUAL_DATE_ASSIGNMENTS[baseName]) {
          meetingDate = MANUAL_DATE_ASSIGNMENTS[baseName];
          photoDate = meetingDate; // Use meeting date as photo date
          console.log(`  📋 Using manual assignment: ${baseName} → ${meetingDate}`);
        } else {
          console.log(`  ❌ No date found and no manual assignment for ${filename}, skipping`);
          skipCount++;
          continue;
        }
      } else {
        meetingDate = findClosestMeetingDate(photoDate);
      }
      
      console.log(`  Date: ${photoDate} → Meeting: ${meetingDate}`);
      
      // Generate file paths - normalize extension to .jpg
      const baseName = path.parse(filename).name;
      const normalizedBaseName = baseName.toLowerCase();
      const fullImageKey = `meetings/${meetingDate}/${baseName}.jpg`;
      const thumbnailKey = `meetings/${meetingDate}/thumbnails/thumb_${baseName}.jpg`;
      
      // Check for duplicates based on basename and meeting date
      const photoKey = `${meetingDate}:${normalizedBaseName}`;
      if (processedBasenames.has(photoKey)) {
        console.log(`  🔄 Duplicate basename detected, skipping: ${baseName}`);
        skipCount++;
        continue;
      }
      
      // Check if already exists in manifest
      const existingInManifest = photosByMeeting[meetingDate]?.some(photo => 
        photo.filename.toLowerCase() === (baseName + '.jpg').toLowerCase()
      );
      
      if (existingInManifest) {
        console.log(`  📋 Already in manifest, skipping: ${baseName}`);
        skipCount++;
        processedBasenames.add(photoKey);
        continue;
      }
      
      // Check if already uploaded to R2
      if (existingPhotos.has(fullImageKey) && existingPhotos.has(thumbnailKey)) {
        console.log(`  ⏭️  Already uploaded to R2, adding to manifest: ${baseName}`);
        skipCount++;
        
        // Add to manifest
        if (!photosByMeeting[meetingDate]) {
          photosByMeeting[meetingDate] = [];
        }
        
        photosByMeeting[meetingDate].push({
          filename: baseName + '.jpg',
          thumbnail: `${config.publicUrl}/${thumbnailKey}`,
          fullImage: `${config.publicUrl}/${fullImageKey}`,
          dateFound: photoDate,
          uploadedAt: new Date().toISOString()
        });
        
        processedBasenames.add(photoKey);
        continue;
      }
      
      // Create optimized images
      console.log(`  📸 Creating thumbnail...`);
      const thumbnailBuffer = await createOptimizedImage(filePath, true);
      
      console.log(`  🖼️  Creating full image...`);
      const fullImageBuffer = await createOptimizedImage(filePath, false);
      
      // Upload to R2
      console.log(`  ☁️  Uploading to R2...`);
      const thumbnailUrl = await uploadToR2(thumbnailBuffer, thumbnailKey);
      const fullImageUrl = await uploadToR2(fullImageBuffer, fullImageKey);
      
      // Add to manifest
      if (!photosByMeeting[meetingDate]) {
        photosByMeeting[meetingDate] = [];
      }
      
      photosByMeeting[meetingDate].push({
        filename: baseName + '.jpg',
        thumbnail: thumbnailUrl,
        fullImage: fullImageUrl,
        dateFound: photoDate,
        uploadedAt: new Date().toISOString()
      });
      
      processedBasenames.add(photoKey);
      uploadCount++;
      console.log(`  ✅ Successfully processed: ${filename}`);
      
    } catch (error) {
      console.error(`  ❌ Failed to process ${filename}:`, error.message);
    }
  }
  
  // Generate photo manifest
  const manifest = {
    lastUpdated: new Date().toISOString(),
    r2Config: {
      bucketName: config.bucketName,
      publicUrl: config.publicUrl
    },
    photosByMeeting
  };
  
  // Ensure output directory exists
  await fs.mkdir(path.dirname(config.outputManifest), { recursive: true });
  
  // Write manifest
  await fs.writeFile(
    config.outputManifest,
    JSON.stringify(manifest, null, 2)
  );
  
  console.log(`\\n✅ Processing complete!`);
  console.log(`   📤 Uploaded: ${uploadCount} photos`);
  console.log(`   ⏭️  Skipped: ${skipCount} photos (already uploaded)`);
  console.log(`   📁 Meetings: ${Object.keys(photosByMeeting).length}`);
  console.log(`   📋 Manifest: ${config.outputManifest}`);
  console.log(`   ☁️  R2 Bucket: ${config.bucketName}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  processPhotos().catch(console.error);
}

export { processPhotos };