#!/usr/bin/env node

/**
 * Clean up source photos that are successfully uploaded to R2
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const manifestPath = path.join(__dirname, '..', 'src', 'data', 'photo-manifest.json');
const sourcePhotosDir = path.join(__dirname, '..', 'source-photos');

async function cleanupSourcePhotos() {
  console.log('🧹 Cleaning up source photos that are uploaded to R2...');
  
  try {
    // Read manifest to get list of successfully uploaded photos
    const manifestContent = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    
    // Collect all uploaded photo filenames (without .jpg extension since manifest normalizes them)
    const uploadedPhotos = new Set();
    
    for (const [meetingDate, photos] of Object.entries(manifest.photosByMeeting)) {
      for (const photo of photos) {
        // Get base name without .jpg extension
        const baseName = path.parse(photo.filename).name;
        uploadedPhotos.add(baseName);
        console.log(`✅ Found in R2: ${photo.filename} (from ${meetingDate})`);
      }
    }
    
    console.log(`\\n📊 Found ${uploadedPhotos.size} unique photos uploaded to R2`);
    
    // Get list of source files
    const sourceFiles = await fs.readdir(sourcePhotosDir);
    
    let deletedCount = 0;
    let keptCount = 0;
    let totalSizeFreed = 0;
    
    for (const sourceFile of sourceFiles) {
      const filePath = path.join(sourcePhotosDir, sourceFile);
      const baseName = path.parse(sourceFile).name;
      
      if (uploadedPhotos.has(baseName)) {
        // This photo is uploaded to R2, safe to delete
        try {
          const stats = await fs.stat(filePath);
          const fileSize = stats.size;
          
          await fs.unlink(filePath);
          deletedCount++;
          totalSizeFreed += fileSize;
          console.log(`🗑️  Deleted: ${sourceFile} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);
        } catch (error) {
          console.error(`❌ Failed to delete ${sourceFile}:`, error.message);
        }
      } else {
        keptCount++;
        console.log(`⚠️  Keeping: ${sourceFile} (not found in R2 manifest)`);
      }
    }
    
    console.log(`\\n✅ Cleanup complete!`);
    console.log(`   🗑️  Deleted: ${deletedCount} files`);
    console.log(`   📁 Kept: ${keptCount} files`);
    console.log(`   💾 Space freed: ${(totalSizeFreed / 1024 / 1024).toFixed(2)}MB`);
    
  } catch (error) {
    console.error('❌ Failed to cleanup source photos:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupSourcePhotos().catch(console.error);
}

export { cleanupSourcePhotos };