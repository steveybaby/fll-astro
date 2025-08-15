#!/usr/bin/env node

/**
 * Copy Photos Within R2 to Correct Meeting Paths
 * 
 * Copies the IMG_000X photos from 2025-08-17 to 2025-08-10 paths in R2
 */

import dotenv from 'dotenv';
import { S3Client, CopyObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { fileURLToPath } from 'url';
import path from 'path';

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
  publicUrl: process.env.R2_PUBLIC_URL
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

// Photos to copy from 2025-08-17 to 2025-08-10
const photosToCopy = [
  'IMG_0008',
  'IMG_0009',
  'IMG_0010'
];

async function copyPhotoInR2(baseName) {
  try {
    console.log(`\n📋 Copying ${baseName} from 2025-08-17 to 2025-08-10...`);
    
    // Source paths (where photos currently are)
    const sourceThumbnailKey = `meetings/2025-08-17/thumbnails/thumb_${baseName}.jpg`;
    const sourceFullImageKey = `meetings/2025-08-17/${baseName}.jpg`;
    
    // Destination paths (where photos should be)
    const destThumbnailKey = `meetings/2025-08-10/thumbnails/thumb_${baseName}.jpg`;
    const destFullImageKey = `meetings/2025-08-10/${baseName}.jpg`;
    
    // Copy thumbnail
    console.log(`  📸 Copying thumbnail: ${sourceThumbnailKey} → ${destThumbnailKey}`);
    const copyThumbnailCommand = new CopyObjectCommand({
      Bucket: config.bucketName,
      CopySource: `${config.bucketName}/${sourceThumbnailKey}`,
      Key: destThumbnailKey,
      ContentType: 'image/jpeg'
    });
    
    await r2Client.send(copyThumbnailCommand);
    console.log(`  ✅ Thumbnail copied`);
    
    // Copy full image
    console.log(`  🖼️  Copying full image: ${sourceFullImageKey} → ${destFullImageKey}`);
    const copyFullImageCommand = new CopyObjectCommand({
      Bucket: config.bucketName,
      CopySource: `${config.bucketName}/${sourceFullImageKey}`,
      Key: destFullImageKey,
      ContentType: 'image/jpeg'
    });
    
    await r2Client.send(copyFullImageCommand);
    console.log(`  ✅ Full image copied`);
    
    console.log(`  🎯 Successfully copied ${baseName}`);
    return true;
    
  } catch (error) {
    console.error(`  ❌ Failed to copy ${baseName}:`, error.message);
    return false;
  }
}

async function copyPhotosInR2() {
  console.log('🔄 Copying photos to correct R2 paths...');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const baseName of photosToCopy) {
    const success = await copyPhotoInR2(baseName);
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
  }
  
  console.log(`\n✅ Copy operation complete!`);
  console.log(`   🎯 Success: ${successCount} photos`);
  console.log(`   ❌ Errors: ${errorCount} photos`);
  
  if (successCount > 0) {
    console.log('\n📋 The photos are now available at both paths:');
    console.log('   - /meetings/2025-08-17/ (original location)');
    console.log('   - /meetings/2025-08-10/ (new location for manifest)');
    console.log('\nThe manifest URLs should now work correctly!');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  copyPhotosInR2().catch(console.error);
}

export { copyPhotosInR2 };