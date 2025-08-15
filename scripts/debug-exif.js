#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import ExifReader from 'exifreader';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, '..', 'source-photos');

async function debugExif(filename) {
  const filePath = path.join(sourceDir, filename);
  
  try {
    console.log(`\n=== ${filename} ===`);
    
    // Check file stats
    const stats = await fs.stat(filePath);
    console.log(`File modified: ${stats.mtime.toISOString()}`);
    console.log(`File created: ${stats.birthtime.toISOString()}`);
    
    // Check EXIF data
    const buffer = await fs.readFile(filePath);
    const tags = ExifReader.load(buffer);
    
    const dateFields = ['DateTime', 'DateTimeOriginal', 'DateTimeDigitized'];
    
    console.log('EXIF Date Fields:');
    for (const field of dateFields) {
      if (tags[field]) {
        console.log(`  ${field}: ${tags[field].description}`);
      } else {
        console.log(`  ${field}: NOT FOUND`);
      }
    }
    
    // Show what our algorithm would choose
    let extractedDate = null;
    for (const field of dateFields) {
      if (tags[field]) {
        const dateString = tags[field].description;
        const dateMatch = dateString.match(/^(\d{4}):(\d{2}):(\d{2})/);
        if (dateMatch) {
          extractedDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
          console.log(`  → Would use: ${extractedDate} (from ${field})`);
          break;
        }
      }
    }
    
    if (!extractedDate) {
      extractedDate = stats.mtime.toISOString().split('T')[0];
      console.log(`  → Would fallback to file modification: ${extractedDate}`);
    }
    
  } catch (error) {
    console.error(`Error processing ${filename}:`, error.message);
  }
}

async function main() {
  const problemPhotos = [
    '3190850475024400528.jpg',
    '5703217700916735598.jpg', 
    '6132005204961641733.jpg',
    'IMG_0008.JPG',
    'IMG_0009.JPG',
    'IMG_0010.JPG'
  ];
  
  console.log('🔍 Debugging EXIF data for problematic photos...');
  
  for (const photo of problemPhotos) {
    await debugExif(photo);
  }
}

main().catch(console.error);