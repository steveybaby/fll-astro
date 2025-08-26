# FLL Team Llamas Website

A comprehensive team website built with Astro for managing FIRST LEGO League team activities, meetings, RSVPs, and resources.

## ✨ Features

- **Meeting Management**: Dynamic meeting pages with agenda, notes, and assignments
- **RSVP System**: Real-time RSVP tracking for kids and coaches via Google Sheets
- **Snack Coordination**: Binary snack assignment system with Google Sheets integration
- **Photo Gallery**: Automated photo sync from local folders to Cloudflare R2
- **Calendar Integration**: iCal feed generation for team events
- **Newsletter System**: Markdown-based newsletter publishing
- **Responsive Design**: Mobile-first design with dark/light theme support

## 🚀 Project Structure

```text
/
├── public/                      # Static assets
├── src/
│   ├── components/             # Reusable Astro components
│   │   ├── RSVPComponent.astro # RSVP management interface
│   │   ├── SnackDutyComponent.astro # Snack assignment display
│   │   ├── R2PhotoGallery.astro # Photo gallery with R2 integration
│   │   └── CalendarSubscribe.astro # Calendar subscription widget
│   ├── content/                # Content collections
│   │   ├── meetings/           # Meeting markdown files
│   │   ├── newsletter/         # Newsletter content
│   │   └── blog/              # Blog posts
│   ├── pages/                  # Route pages
│   │   ├── meetings/[...slug].astro # Dynamic meeting pages
│   │   ├── rsvps.astro        # RSVP management page
│   │   ├── snacks.astro       # Snack signup page
│   │   └── calendar.ics.js    # Dynamic iCal generation
│   └── utils/                  # Utility functions
├── source-photos/              # Local photo source folder
├── google-apps-script.js       # Backend API for Google Sheets
└── package.json
```

## 🧞 Commands

All commands are run from the root of the project:

| Command                | Action                                           |
| :--------------------- | :----------------------------------------------- |
| `npm install`          | Installs dependencies                            |
| `npm run dev`          | Starts local dev server at `localhost:4321`      |
| `npm run build`        | Build your production site to `./dist/`          |
| `npm run preview`      | Preview your build locally, before deploying     |
| `npm run sync-photos`  | Sync photos from source-photos to Cloudflare R2  |
| `npm run astro ...`    | Run CLI commands like `astro add`, `astro check` |

## 📸 Photo Management

The website includes an automated photo gallery system that syncs photos from local folders to Cloudflare R2 storage.

### Setting Up Photo Sync

1. **Create source-photos directory structure:**
   ```text
   source-photos/
   ├── 2025-08-20/          # Meeting date (YYYY-MM-DD format)
   │   ├── photo1.jpg
   │   ├── photo2.png
   │   └── group-shot.heic
   └── 2025-08-24/
       ├── robot-testing.jpg
       └── team-work.png
   ```

2. **Configure Cloudflare R2 credentials:**
   ```bash
   # Set environment variables or add to .env
   export CLOUDFLARE_ACCOUNT_ID="your-account-id"
   export CLOUDFLARE_ACCESS_KEY_ID="your-access-key"
   export CLOUDFLARE_SECRET_ACCESS_KEY="your-secret-key"
   export R2_BUCKET_NAME="your-bucket-name"
   ```

3. **Sync photos to R2:**
   ```bash
   npm run sync-photos
   ```

### Photo Organization Guidelines

- **Folder naming**: Use `YYYY-MM-DD` format matching meeting dates
- **Supported formats**: JPG, PNG, HEIC, WebP
- **Automatic processing**: 
  - Generates thumbnails for fast loading
  - Optimizes file sizes for web delivery
  - Creates multiple resolution variants
- **Privacy**: Photos are automatically organized by meeting date and only visible to team members

### Manual Photo Upload

If you prefer manual upload or need to add photos from mobile devices:

1. Use the Cloudflare R2 dashboard
2. Upload to `photos/YYYY-MM-DD/` structure
3. The website will automatically detect and display new photos

## 📅 RSVP & Calendar System

### Google Sheets Integration

The RSVP system uses Google Apps Script to manage attendance data:

1. **Deploy the Google Apps Script:**
   - Copy contents of `google-apps-script.js`
   - Create new Google Apps Script project
   - Deploy as web app with public permissions

2. **Spreadsheet Structure:**
   - Sheet 1: "RSVPs" - Meeting attendance tracking
   - Sheet 2: "Snacks" - Snack assignment coordination
   - Columns: Meeting Date, Jasper, Asher, Kai, Jeremiah, Luca, Ethan

3. **Update API URL:**
   - Replace the `RSVP_API_URL` in components with your deployed script URL

### Calendar Subscription

The site generates a dynamic iCal feed at `/calendar.ics` that includes:
- All scheduled meetings with times and locations
- Automatic updates when new meetings are added
- Compatible with Google Calendar, Apple Calendar, and Outlook

## 🥪 Snack Management

The snack system implements binary assignment logic:
- Only one family can be assigned per meeting
- Visual indicators show assignment status
- Real-time updates via Google Sheets integration
- Integrated display on individual meeting pages

## 🎨 Theming & Customization

The site supports multiple themes:
- **Light theme**: Clean, professional appearance
- **Dark theme**: Reduced eye strain for evening browsing
- **Llama theme**: Fun, team-branded styling with llama motifs

### Custom CSS Variables

Key design tokens can be customized in `src/styles/global.css`:

```css
:root {
  --color-accent: #dc2626;        /* Team red color */
  --color-background: #ffffff;    /* Background color */
  --color-text-primary: #1f2937; /* Primary text */
  --font-heading-primary: 'Oswald'; /* Heading font */
}
```

## 🚦 Environment Setup

### Required Environment Variables

```bash
# Cloudflare R2 Configuration
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=fll-team-photos

# Google Apps Script API (update in component files)
RSVP_API_URL=https://script.google.com/macros/s/.../exec
```

### Local Development

1. **Clone and install:**
   ```bash
   git clone [repository-url]
   cd fll-astro
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Add content:**
   - Create meeting files in `src/content/meetings/`
   - Add photos to `source-photos/YYYY-MM-DD/`
   - Test RSVP functionality with your Google Sheets

## 📝 Content Management

### Adding New Meetings

Create a new markdown file in `src/content/meetings/`:

```markdown
---
title: "Team Meeting"
date: 2025-08-30
startTime: "15:30" # 3:30 PM
duration: 2 # hours
location: "Team Meeting Room"
agenda:
  - "Robot programming"
  - "Project research"
assignments:
  - name: "Sensor calibration"
    assignee: "Jasper"
    status: "pending"
---

# Meeting Content

Your meeting notes and agenda go here...
```

### Newsletter Publishing

Add newsletter content to `src/content/newsletter/`:

```markdown
---
title: "Weekly Update"
date: 2025-08-21
author: "Coach Steve"
---

# Team Updates

Newsletter content with embedded components:

<CalendarSubscribe size="medium" style="card" />
```

## 🚀 Deployment

The site is optimized for static hosting platforms:

- **Netlify**: Connect your repository for automatic deployments
- **Vercel**: Zero-configuration deployment from Git
- **GitHub Pages**: Use GitHub Actions for automated builds
- **Cloudflare Pages**: Integrated with R2 storage for optimal performance

### Build Configuration

```bash
# Production build
npm run build

# Preview build locally
npm run preview
```

## 🤝 Contributing

1. Follow the existing code style and component patterns
2. Test RSVP functionality with actual Google Sheets integration  
3. Verify photo sync works with your R2 setup
4. Update documentation for any new features

## 🆘 Troubleshooting

### Common Issues

**Photos not displaying:**
- Check R2 bucket permissions and CORS settings
- Verify folder naming follows `YYYY-MM-DD` format
- Ensure environment variables are set correctly

**RSVP not updating:**
- Verify Google Apps Script is deployed with public permissions
- Check API URL matches deployed script
- Confirm spreadsheet has correct sheet names and columns

**Calendar subscription not working:**
- Verify `/calendar.ics` endpoint is accessible
- Check that meeting dates are properly formatted
- Ensure iCal MIME type is correctly set

## 📄 License

This project is built for the FLL Team Llamas. Feel free to adapt for your own team needs.