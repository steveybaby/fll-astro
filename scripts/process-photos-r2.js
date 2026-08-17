#!/usr/bin/env node

/**
 * Cloudflare R2 Photo Processing System
 * 
 * Processes photos from a local directory, creates thumbnails,
 * uploads to R2, and updates the photo manifest for the website.
 */

import dotenv from 'dotenv';
import fs from 'fs/promises';
import { readdirSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import ExifReader from 'exifreader';
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execFileAsync = promisify(execFile);

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
/**
 * Meeting dates, derived from the content files rather than hardcoded.
 *
 * This list used to be a hand-maintained array of 2025 dates. Combined with the
 * 7-day proximity rule below, that meant photos from any later season were
 * silently skipped — they matched no meeting and simply never uploaded. Reading
 * the dates from src/content/meetings keeps this correct every season with no
 * edit. Filenames are all `YYYY-MM-DD-slug.md`; several meetings can share a
 * date (tournament runs), hence the dedupe.
 */
const MEETING_DATES = [
  ...new Set(
    readdirSync(path.join(__dirname, '..', 'src', 'content', 'meetings'))
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.match(/^(\d{4}-\d{2}-\d{2})/)?.[1])
      .filter(Boolean)
  ),
].sort();

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
  const isVideo = isVideoFile(filename);
  
  try {
    if (!isVideo) {
      // For images, try EXIF data first
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
    }
    
    // For videos or images without EXIF, use file creation date (birthtime)
    console.log(`  📅 ${isVideo ? 'Video file' : 'No EXIF date found'}, using file creation date...`);
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
 * Video handling.
 *
 * Phones record HEVC in a .mov container, often at 4K. Chrome and Firefox
 * cannot play HEVC, and a 48-second 4K clip runs to ~150MB — which the gallery
 * would happily start pulling just to render its tile. So videos get the same
 * treatment images already get: normalised to something every browser can play
 * at a size that suits a phone on mobile data.
 *
 * Output is H.264/AAC in MP4, capped at 1080p, with +faststart so playback can
 * begin before the whole file arrives. A poster frame is extracted so the
 * gallery tile never has to touch the video at all.
 */
const VIDEO_MAX_HEIGHT = 1080;

async function hasFfmpeg() {
  try {
    await execFileAsync('ffmpeg', ['-version']);
    return true;
  } catch {
    return false;
  }
}

/** Probe a video's codec and height so we can skip re-encoding what is already fine. */
async function probeVideo(filePath) {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name,height',
      '-of', 'default=noprint_wrappers=1:nokey=1', filePath,
    ]);
    const [codec, height] = stdout.trim().split('\n');
    return { codec, height: parseInt(height, 10) };
  } catch {
    return { codec: null, height: null };
  }
}

/**
 * Produce a web-ready MP4 and a poster frame.
 * Returns { videoBuffer, posterBuffer, transcoded }.
 */
async function processVideo(filePath, baseName) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fll-video-'));
  const mp4Path = path.join(tmpDir, `${baseName}.mp4`);
  const posterPath = path.join(tmpDir, `thumb_${baseName}.jpg`);

  try {
    const { codec, height } = await probeVideo(filePath);
    // Already a web-friendly H.264 at a sane size? Copy it rather than re-encode,
    // which would only lose quality.
    const needsTranscode = codec !== 'h264' || !height || height > VIDEO_MAX_HEIGHT;

    if (needsTranscode) {
      console.log(`  🎞️  Transcoding (${codec || 'unknown'}${height ? ` ${height}p` : ''} → h264 ${VIDEO_MAX_HEIGHT}p)...`);
      await execFileAsync('ffmpeg', [
        '-y', '-loglevel', 'error', '-i', filePath,
        '-vf', `scale=-2:'min(${VIDEO_MAX_HEIGHT},ih)'`,
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart',
        mp4Path,
      ], { maxBuffer: 1024 * 1024 * 64 });
    } else {
      console.log(`  🎞️  Already h264 ${height}p, copying without re-encoding...`);
      await fs.copyFile(filePath, mp4Path);
    }

    console.log(`  🖼️  Extracting poster frame...`);
    await execFileAsync('ffmpeg', [
      '-y', '-loglevel', 'error', '-ss', '2', '-i', mp4Path,
      '-frames:v', '1', '-vf', `scale=-2:${config.thumbnailHeight}`, '-q:v', '3',
      posterPath,
    ], { maxBuffer: 1024 * 1024 * 16 });

    const [videoBuffer, posterBuffer] = await Promise.all([
      fs.readFile(mp4Path),
      fs.readFile(posterPath),
    ]);
    return { videoBuffer, posterBuffer, transcoded: needsTranscode };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Check if file is a video
 */
function isVideoFile(filename) {
  return /\.(mov|mp4)$/i.test(filename);
}

/**
 * Get appropriate content type for file
 */
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.mov':
      return 'video/quicktime';
    case '.mp4':
      return 'video/mp4';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.heic':
      return 'image/heic';
    default:
      return 'application/octet-stream';
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
async function uploadToR2(buffer, key, contentType) {
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
  
  const mediaFiles = files.filter(file => 
    /\.(jpg|jpeg|png|heic|webp|mov|mp4)$/i.test(file)
  );
  
  console.log(`Media files: ${mediaFiles.join(', ')}`);
  
  if (mediaFiles.length === 0) {
    console.log('No media files found to process.');
    return;
  }

  // Fail loudly rather than uploading an unplayable original: without ffmpeg we
  // cannot normalise video, and a raw phone capture is HEVC that Chrome and
  // Firefox refuse to play.
  const videoFiles = mediaFiles.filter(isVideoFile);
  if (videoFiles.length > 0 && !(await hasFfmpeg())) {
    console.error(`\n❌ ${videoFiles.length} video file(s) found but ffmpeg is not installed.`);
    console.error('   Videos need transcoding to H.264 or most browsers cannot play them.');
    console.error('   Install it with: brew install ffmpeg');
    console.error(`   Affected: ${videoFiles.join(', ')}\n`);
    process.exit(1);
  }
  
  console.log(`Found ${mediaFiles.length} media files to process`);
  
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
  
  for (const filename of mediaFiles) {
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
      
      // Generate file paths - preserve original extension for videos, normalize to .jpg for images
      const baseName = path.parse(filename).name;
      const originalExt = path.extname(filename).toLowerCase();
      const normalizedBaseName = baseName.toLowerCase();
      const isVideo = isVideoFile(filename);
      
      // Videos are normalised to .mp4 regardless of source container, and get a
      // poster frame just like images get a thumbnail.
      const fullImageKey = isVideo
        ? `meetings/${meetingDate}/${baseName}.mp4`
        : `meetings/${meetingDate}/${baseName}.jpg`;
      const thumbnailKey = `meetings/${meetingDate}/thumbnails/thumb_${baseName}.jpg`;
      
      // Check for duplicates based on basename and meeting date
      const photoKey = `${meetingDate}:${normalizedBaseName}`;
      if (processedBasenames.has(photoKey)) {
        console.log(`  🔄 Duplicate basename detected, skipping: ${baseName}`);
        skipCount++;
        continue;
      }
      
      // Check if already exists in manifest
      const expectedFilename = isVideo ? baseName + '.mp4' : baseName + '.jpg';
      const existingInManifest = photosByMeeting[meetingDate]?.some(item => 
        item.filename.toLowerCase() === expectedFilename.toLowerCase()
      );
      
      if (existingInManifest) {
        console.log(`  📋 Already in manifest, skipping: ${baseName}`);
        skipCount++;
        processedBasenames.add(photoKey);
        continue;
      }
      
      // Check if already uploaded to R2
      const alreadyUploaded = existingPhotos.has(fullImageKey) && existingPhotos.has(thumbnailKey);
      
      if (alreadyUploaded) {
        console.log(`  ⏭️  Already uploaded to R2, adding to manifest: ${baseName}`);
        skipCount++;
        
        // Add to manifest
        if (!photosByMeeting[meetingDate]) {
          photosByMeeting[meetingDate] = [];
        }
        
        photosByMeeting[meetingDate].push({
          filename: expectedFilename,
          type: isVideo ? 'video' : 'image',
          thumbnail: `${config.publicUrl}/${thumbnailKey}`,
          fullImage: `${config.publicUrl}/${fullImageKey}`,
          dateFound: photoDate,
          uploadedAt: new Date().toISOString()
        });
        
        processedBasenames.add(photoKey);
        continue;
      }
      
      // Handle images and videos differently
      let thumbnailUrl = null;
      let fullImageUrl;
      
      if (isVideo) {
        console.log(`  🎬 Processing video file...`);
        const { videoBuffer, posterBuffer } = await processVideo(filePath, baseName);

        console.log(`  ☁️  Uploading to R2...`);
        thumbnailUrl = await uploadToR2(posterBuffer, thumbnailKey, 'image/jpeg');
        fullImageUrl = await uploadToR2(videoBuffer, fullImageKey, 'video/mp4');
      } else {
        console.log(`  📸 Creating thumbnail...`);
        const thumbnailBuffer = await createOptimizedImage(filePath, true);
        
        console.log(`  🖼️  Creating full image...`);
        const fullImageBuffer = await createOptimizedImage(filePath, false);
        
        // Upload to R2
        console.log(`  ☁️  Uploading to R2...`);
        thumbnailUrl = await uploadToR2(thumbnailBuffer, thumbnailKey, 'image/jpeg');
        fullImageUrl = await uploadToR2(fullImageBuffer, fullImageKey, 'image/jpeg');
      }
      
      // Add to manifest
      if (!photosByMeeting[meetingDate]) {
        photosByMeeting[meetingDate] = [];
      }
      
      photosByMeeting[meetingDate].push({
        filename: expectedFilename,
        type: isVideo ? 'video' : 'image',
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