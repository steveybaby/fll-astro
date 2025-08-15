#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import ExifReader from 'exifreader';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, '..', 'source-photos');

async function testDateExtraction(filename) {
  const filePath = path.join(sourceDir, filename);
  
  try {
    console.log(`\n=== ${filename} ===`);
    
    // Check file stats
    const stats = await fs.stat(filePath);
    console.log(`File created: ${stats.birthtime.toISOString()}`);
    console.log(`File modified: ${stats.mtime.toISOString()}`);
    
    // Convert to local timezone
    const creationDate = new Date(stats.birthtime);
    const localDateString = creationDate.toLocaleDateString('en-CA');
    console.log(`Creation date in local timezone: ${localDateString}`);
    
    // Check EXIF data
    const buffer = await fs.readFile(filePath);
    const tags = ExifReader.load(buffer);
    
    const dateFields = ['DateTimeOriginal', 'DateTimeDigitized', 'DateTime'];
    
    console.log('EXIF Date Fields:');
    for (const field of dateFields) {
      if (tags[field]) {
        console.log(`  ${field}: ${tags[field].description}`);
      } else {
        console.log(`  ${field}: NOT FOUND`);
      }
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
  
  console.log('🧪 Testing improved date extraction...');
  
  for (const photo of problemPhotos) {
    await testDateExtraction(photo);
  }
}

main().catch(console.error);