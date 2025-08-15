# 📸 Cloudflare R2 Photo System Setup

This system automatically processes photos, creates thumbnails, uploads to Cloudflare R2, and displays them on meeting pages.

## 🔧 Setup Instructions

### 1. Cloudflare R2 Configuration

#### Create R2 Bucket:
1. Go to Cloudflare Dashboard → R2 Object Storage
2. Create a new bucket (e.g., `fll-photos`)
3. Configure public access or custom domain for serving photos

#### Create API Tokens:

**For GitHub Actions (Account API - Recommended):**
1. Go to Cloudflare Dashboard → My Profile → API Tokens
2. Create Token → Custom token
3. Permissions:
   - Account: Cloudflare R2:Edit
   - Zone Resources: Include All zones
4. Save the token for GitHub Secrets

**For Local Development (User API):**
1. Go to Cloudflare Dashboard → R2 → Manage R2 API tokens
2. Create API token
3. Permissions: Admin Read & Write
4. Save for local `.env` file

### 2. Environment Configuration

#### GitHub Secrets (for Actions):
Go to GitHub → Settings → Secrets and variables → Actions, add:
- `R2_ACCOUNT_ID` - Your Cloudflare Account ID
- `R2_ACCESS_KEY_ID` - Account API Access Key ID  
- `R2_SECRET_ACCESS_KEY` - Account API Secret Access Key
- `R2_BUCKET_NAME` - Your bucket name (e.g., `fll-photos`)
- `R2_PUBLIC_URL` - Your bucket's public URL (e.g., `https://fll-photos.your-domain.com`)

#### Local Development:
1. Copy `.env.example` to `.env`
2. Fill in your User API credentials:
```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_user_api_key
R2_SECRET_ACCESS_KEY=your_user_secret_key
R2_BUCKET_NAME=fll-photos
R2_PUBLIC_URL=https://fll-photos.your-domain.com
```

### 3. Using the System

#### Adding Photos:
1. Place full-size photos in the `source-photos/` directory
2. Run `npm run process-photos` to process and upload

#### Automatic Processing:
- GitHub Actions automatically processes photos when:
  - Photos are added to `source-photos/` directory
  - Photo processing script is updated
  - Manually triggered via workflow dispatch

#### Photo Organization:
- Photos are automatically grouped by meeting date using EXIF data
- Each meeting gets its own folder: `meetings/2025-08-10/`
- Thumbnails are stored in: `meetings/2025-08-10/thumbnails/`

### 4. Integration with Website

#### Using R2PhotoGallery Component:
```astro
---
import R2PhotoGallery from '../components/R2PhotoGallery.astro';
---

<R2PhotoGallery 
  meetingDate="2025-08-10" 
  meetingName="Season Kickoff" 
/>
```

#### Photo Manifest:
The system generates `src/data/photo-manifest.json` with:
- Photo metadata and R2 URLs
- Meeting associations
- Upload timestamps
- R2 configuration

### 5. File Structure

```
source-photos/               # Place your photos here
├── IMG_001.jpg
├── IMG_002.jpg
└── ...

src/data/
└── photo-manifest.json     # Generated manifest

public/                     # No photos stored here!
                           # All served from R2

scripts/
└── process-photos-r2.js   # Processing script

.github/workflows/
└── r2-photo-sync.yml      # Automation
```

### 6. Benefits of R2 Storage

✅ **Unlimited photo storage** (not limited by GitHub)  
✅ **Fast global CDN** delivery  
✅ **Automatic thumbnails** with optimized compression  
✅ **Cost-effective** storage and bandwidth  
✅ **No repository bloat** - photos stored separately  

### 7. Meeting Date Assignment

Photos are automatically assigned to meetings based on:
1. **EXIF date** extracted from photo metadata
2. **Closest meeting date** within 7 days
3. **Fallback** to `uncategorized` if no close meeting

Meeting dates are configured in `scripts/process-photos-r2.js`:
```javascript
const MEETING_DATES = [
  '2025-08-10',
  '2025-08-17',
  // ... add your meeting dates
];
```

### 8. Troubleshooting

**Missing photos**: Check R2 bucket permissions and API credentials  
**Upload failures**: Verify R2_PUBLIC_URL matches your bucket's domain  
**Wrong meeting assignment**: Update MEETING_DATES array in the script  
**Local development issues**: Ensure `.env` file has correct User API credentials  

### 9. Commands

```bash
# Process photos locally
npm run process-photos

# Check for errors in the script
node scripts/process-photos-r2.js

# Install dependencies
npm install
```

The system is designed to be robust and require minimal maintenance once configured! 🦙