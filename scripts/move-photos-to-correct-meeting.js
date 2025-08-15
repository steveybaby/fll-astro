#!/usr/bin/env node

/**
 * Move Photos to Correct Meeting
 * 
 * Moves IMG_000X photos from 2025-08-17 to 2025-08-10 where they belong
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const manifestPath = path.join(__dirname, '..', 'src', 'data', 'photo-manifest.json');

// Photos that should be moved from 2025-08-17 to 2025-08-10
const photosToMove = [
  'IMG_0008.jpg',
  'IMG_0009.jpg', 
  'IMG_0010.jpg'
];

async function movePhotosToCorrectMeeting() {
  console.log('🔄 Moving photos to correct meeting...');
  
  try {
    // Read existing manifest
    const manifestContent = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    
    console.log('Before move:');
    console.log(`  2025-08-10: ${manifest.photosByMeeting['2025-08-10'].length} photos`);
    console.log(`  2025-08-17: ${manifest.photosByMeeting['2025-08-17'].length} photos`);
    
    // Find photos to move from 2025-08-17
    const photosToMoveData = [];
    const remaining2025_08_17 = manifest.photosByMeeting['2025-08-17'].filter(photo => {
      if (photosToMove.includes(photo.filename)) {
        console.log(`  📋 Found ${photo.filename} in 2025-08-17, preparing to move`);
        
        // Update the photo data to point to correct meeting paths
        const correctedPhoto = {
          ...photo,
          thumbnail: photo.thumbnail.replace('/2025-08-17/', '/2025-08-10/'),
          fullImage: photo.fullImage.replace('/2025-08-17/', '/2025-08-10/'),
          dateFound: '2025-08-10' // Update the date to reflect actual meeting
        };
        
        photosToMoveData.push(correctedPhoto);
        return false; // Remove from 2025-08-17
      }
      return true; // Keep in 2025-08-17
    });
    
    // Add moved photos to 2025-08-10
    const updated2025_08_10 = [...manifest.photosByMeeting['2025-08-10'], ...photosToMoveData];
    
    // Update manifest
    manifest.photosByMeeting['2025-08-17'] = remaining2025_08_17;
    manifest.photosByMeeting['2025-08-10'] = updated2025_08_10;
    manifest.lastUpdated = new Date().toISOString();
    
    console.log('\\nAfter move:');
    console.log(`  2025-08-10: ${manifest.photosByMeeting['2025-08-10'].length} photos`);
    console.log(`  2025-08-17: ${manifest.photosByMeeting['2025-08-17'].length} photos`);
    
    // Write updated manifest
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    
    console.log('\\n✅ Photos moved to correct meeting!');
    console.log(`   📁 Updated manifest: ${manifestPath}`);
    
    console.log('\\n📋 Moved photos:');
    photosToMoveData.forEach(photo => {
      console.log(`  - ${photo.filename} → 2025-08-10`);
    });
    
    console.log('\\n⚠️  Note: You may need to move the actual photos in R2 storage');
    console.log('   The manifest now points to /2025-08-10/ paths, but the files');
    console.log('   are currently uploaded to /2025-08-17/ paths in R2.');
    console.log('   Consider running the photo processing script again to re-upload');
    console.log('   these photos to the correct R2 paths.');
    
  } catch (error) {
    console.error('❌ Failed to move photos:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  movePhotosToCorrectMeeting().catch(console.error);
}

export { movePhotosToCorrectMeeting };