#!/usr/bin/env node

/**
 * Clean Duplicates from Photo Manifest
 * 
 * Removes duplicate photo entries from the manifest file
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const manifestPath = path.join(__dirname, '..', 'src', 'data', 'photo-manifest.json');

async function cleanDuplicates() {
  console.log('🧹 Cleaning duplicate entries from photo manifest...');
  
  try {
    // Read existing manifest
    const manifestContent = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    
    const originalCounts = {};
    let totalOriginal = 0;
    
    // Count original photos per meeting
    for (const [meetingDate, photos] of Object.entries(manifest.photosByMeeting)) {
      originalCounts[meetingDate] = photos.length;
      totalOriginal += photos.length;
    }
    
    console.log(`Original photo counts: ${JSON.stringify(originalCounts, null, 2)}`);
    console.log(`Total original photos: ${totalOriginal}`);
    
    // Clean duplicates
    const cleanedPhotosByMeeting = {};
    
    for (const [meetingDate, photos] of Object.entries(manifest.photosByMeeting)) {
      const seen = new Set();
      const uniquePhotos = [];
      
      for (const photo of photos) {
        const normalizedFilename = photo.filename.toLowerCase();
        
        if (!seen.has(normalizedFilename)) {
          seen.add(normalizedFilename);
          uniquePhotos.push(photo);
        } else {
          console.log(`  🗑️  Removing duplicate: ${photo.filename} from ${meetingDate}`);
        }
      }
      
      cleanedPhotosByMeeting[meetingDate] = uniquePhotos;
    }
    
    // Update manifest
    const cleanedManifest = {
      ...manifest,
      photosByMeeting: cleanedPhotosByMeeting,
      lastUpdated: new Date().toISOString()
    };
    
    // Count cleaned photos
    const cleanedCounts = {};
    let totalCleaned = 0;
    
    for (const [meetingDate, photos] of Object.entries(cleanedPhotosByMeeting)) {
      cleanedCounts[meetingDate] = photos.length;
      totalCleaned += photos.length;
    }
    
    console.log(`\\nCleaned photo counts: ${JSON.stringify(cleanedCounts, null, 2)}`);
    console.log(`Total cleaned photos: ${totalCleaned}`);
    console.log(`Removed duplicates: ${totalOriginal - totalCleaned}`);
    
    // Write cleaned manifest
    await fs.writeFile(manifestPath, JSON.stringify(cleanedManifest, null, 2));
    
    console.log(`\\n✅ Manifest cleaned successfully!`);
    console.log(`   📁 File: ${manifestPath}`);
    console.log(`   🗑️  Duplicates removed: ${totalOriginal - totalCleaned}`);
    console.log(`   📸 Unique photos: ${totalCleaned}`);
    
  } catch (error) {
    console.error('❌ Failed to clean duplicates:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanDuplicates().catch(console.error);
}

export { cleanDuplicates };