#!/usr/bin/env node

import dotenv from 'dotenv';
import { S3Client, ListBucketsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Load environment variables
dotenv.config();

const config = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.R2_BUCKET_NAME,
};

console.log('🔧 Testing R2 Connection...');
console.log(`Account ID: ${config.accountId ? '✅ Set' : '❌ Missing'}`);
console.log(`Access Key: ${config.accessKeyId ? '✅ Set' : '❌ Missing'}`);
console.log(`Secret Key: ${config.secretAccessKey ? '✅ Set' : '❌ Missing'}`);
console.log(`Bucket Name: ${config.bucketName || '❌ Missing'}`);

if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
  console.error('❌ Missing required R2 credentials');
  process.exit(1);
}

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
});

async function testConnection() {
  try {
    console.log('\n📡 Testing connection to R2...');
    
    // Skip bucket listing, try direct bucket access instead
    console.log(`Test: Accessing bucket '${config.bucketName}' directly...`);
    const objectsCommand = new ListObjectsV2Command({
      Bucket: config.bucketName,
      MaxKeys: 5
    });
    
    const objectsResponse = await r2Client.send(objectsCommand);
    const objectCount = objectsResponse.KeyCount || 0;
    
    console.log(`✅ Bucket accessible! Found ${objectCount} objects`);
    
    if (objectsResponse.Contents?.length) {
      console.log('Sample objects:');
      objectsResponse.Contents.slice(0, 3).forEach(obj => {
        console.log(`  - ${obj.Key} (${obj.Size} bytes)`);
      });
    }
    
    console.log('\n🎉 R2 connection successful!');
    
  } catch (error) {
    console.error('\n❌ R2 connection failed:');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    
    if (error.name === 'NoSuchBucket') {
      console.log(`\n💡 The bucket '${config.bucketName}' doesn't exist.`);
      console.log('Please create it in Cloudflare Dashboard → R2 Object Storage');
    } else if (error.name === 'InvalidAccessKeyId' || error.name === 'SignatureDoesNotMatch') {
      console.log('\n💡 Authentication failed. Please check:');
      console.log('1. R2_ACCESS_KEY_ID is correct');
      console.log('2. R2_SECRET_ACCESS_KEY is correct');
      console.log('3. API tokens have R2 permissions');
    } else if (error.message.includes('EPROTO') || error.message.includes('SSL')) {
      console.log('\n💡 SSL/Network error. This might be:');
      console.log('1. Network connectivity issue');
      console.log('2. Firewall blocking the connection');
      console.log('3. Cloudflare R2 service temporarily unavailable');
    }
  }
}

testConnection();