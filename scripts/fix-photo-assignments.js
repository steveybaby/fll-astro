#!/usr/bin/env node

/**
 * Fix Photo Assignment Issues
 * 
 * Fixes photos that were assigned to wrong meetings due to missing EXIF data
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const manifestPath = path.join(__dirname, '..', 'src', 'data', 'photo-manifest.json');

// Photos that should be in 2025-08-10 meeting only (based on context)
const photosToFix = [
  '3190850475024400528.jpg',
  '5703217700916735598.jpg', 
  '6132005204961641733.jpg'
];

// Photos that should be in 2025-08-17 meeting only
const aug17Photos = [
  'IMG_0008.jpg',
  'IMG_0009.jpg',
  'IMG_0010.jpg'
];

async function fixPhotoAssignments() {
  console.log('🔧 Fixing photo assignments...');
  
  try {
    // Read existing manifest
    const manifestContent = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    
    console.log('Original counts:');
    for (const [meeting, photos] of Object.entries(manifest.photosByMeeting)) {
      console.log(`  ${meeting}: ${photos.length} photos`);
    }
    
    // Remove duplicates from 2025-08-17 that should be in 2025-08-10
    const filtered2025_08_17 = manifest.photosByMeeting['2025-08-17'].filter(photo => {
      if (photosToFix.includes(photo.filename)) {
        console.log(`  🗑️  Removing ${photo.filename} from 2025-08-17 (duplicate)`);
        return false;
      }
      return true;
    });
    
    // Also check if any aug17 photos are in wrong meeting
    const filtered2025_08_10 = manifest.photosByMeeting['2025-08-10'].filter(photo => {
      if (aug17Photos.includes(photo.filename)) {
        console.log(`  🔄 Moving ${photo.filename} from 2025-08-10 to 2025-08-17`);
        // Add to 2025-08-17 if not already there
        const alreadyIn2025_08_17 = filtered2025_08_17.some(p => p.filename === photo.filename);
        if (!alreadyIn2025_08_17) {
          // Update the photo data to correct meeting paths
          const correctedPhoto = {
            ...photo,
            thumbnail: photo.thumbnail.replace('/2025-08-10/', '/2025-08-17/'),
            fullImage: photo.fullImage.replace('/2025-08-10/', '/2025-08-17/')
          };
          filtered2025_08_17.push(correctedPhoto);
        }
        return false;
      }
      return true;
    });
    
    // Update manifest
    manifest.photosByMeeting['2025-08-17'] = filtered2025_08_17;
    manifest.photosByMeeting['2025-08-10'] = filtered2025_08_10;
    manifest.lastUpdated = new Date().toISOString();
    
    console.log('\\nFixed counts:');
    for (const [meeting, photos] of Object.entries(manifest.photosByMeeting)) {
      console.log(`  ${meeting}: ${photos.length} photos`);
    }
    
    // Write updated manifest
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    
    console.log('\\n✅ Photo assignments fixed!');
    console.log(`   📁 Updated manifest: ${manifestPath}`);
    
    // Show what's in each meeting now
    console.log('\\n📋 Final photo assignments:');
    console.log('2025-08-10 meeting:');
    manifest.photosByMeeting['2025-08-10'].forEach(photo => {
      console.log(`  - ${photo.filename} (dateFound: ${photo.dateFound})`);
    });
    
    console.log('\\n2025-08-17 meeting:');  
    manifest.photosByMeeting['2025-08-17'].forEach(photo => {
      console.log(`  - ${photo.filename} (dateFound: ${photo.dateFound})`);
    });
    
  } catch (error) {
    console.error('❌ Failed to fix photo assignments:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixPhotoAssignments().catch(console.error);
}

export { fixPhotoAssignments };