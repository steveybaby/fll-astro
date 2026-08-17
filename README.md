# FLL Team Llamas Website

A comprehensive team website built with Astro for managing FIRST LEGO League team activities, meetings, RSVPs, and resources.

## ✨ Features

- **Meeting Management**: Dynamic meeting pages with agenda, notes, and assignments
- **RSVP System**: Real-time RSVP tracking for kids and coaches, backed by a Cloudflare Worker and D1
- **Snack Coordination**: Binary snack assignment system on the same Worker
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
│   ├── lib/
│   │   ├── signups.ts          # The only seam between the site and the signups API
│   │   └── signups-config.ts   # Builds the roster/date config the Worker validates against
│   ├── config/season.ts        # Single source of truth for roster, coaches, season
│   └── utils/                  # Utility functions
├── workers/signups/            # Cloudflare Worker + D1 backing RSVPs and snacks
├── source-photos/              # Local photo source folder
├── google-apps-script.js       # RETIRED backend, kept as the rollback path (see below)
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
| `npm test`             | Run the site unit tests                          |
| `npm run test:worker`  | Run the signups Worker tests (in-memory D1)      |
| `npm run worker:dev`   | Run the signups Worker locally                   |
| `npm run worker:deploy`| `wrangler deploy` the signups Worker             |
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

### Signups Worker (Cloudflare Worker + D1)

The site is static and hosted on GitHub Pages, so the browser talks to the
signups API directly. That API is a Cloudflare Worker in `workers/signups/`,
backed by a D1 database.

**Layout**

- `workers/signups/src/index.ts` — router (`/health`, `/signups`, `/signups/all`, `/rsvp`, `/snack`)
- `workers/signups/src/handlers.ts` — reads and writes
- `workers/signups/src/config.ts` — fetches and caches the roster config
- `workers/signups/wrangler.toml` — D1 binding and `CONFIG_URL`
- `src/lib/signups.ts` — the **only** seam the site uses to reach the API

**Storage**

One table, `signups`, with primary key `(meeting_date, person, kind)` and
`kind` being `rsvp` or `snack`. `person` is the display name, which is why
those names must be exact and unique.

**Roster**

The Worker keeps no copy of the roster. `src/config/season.ts` is the single
source of truth; the site publishes it as `/signups-config.json`, and the
Worker fetches that URL (`CONFIG_URL` in `wrangler.toml`) and caches it for
five minutes to validate writes. A name or meeting date the Worker has not
picked up yet is rejected with `400 unknown person` / `400 unknown meeting
date` — so after a mid-season roster change, allow up to five minutes before
the new person can sign up. Reads deliberately degrade: if the config fetch
fails, reads still serve whatever is stored, and only writes are refused
(`503 roster unavailable`).

**Working on it**

```bash
npm run test:worker         # vitest against an in-memory D1 — no live data touched
npm run test:worker:types   # tsc --noEmit
npm run worker:dev          # local wrangler dev
npm run worker:deploy       # wrangler deploy
```

Note that `workers/` is excluded from the root `tsconfig.json`; the Worker has
its own.

**Deploying**

```bash
cd workers/signups && wrangler deploy
```

Schema changes go through `wrangler d1 migrations` against the `fll-signups`
database. Deploying the Worker and deploying the site are independent — but a
roster change is a *site* deploy, since the Worker reads the roster from the
published site.

### Rollback path: `google-apps-script.js`

`google-apps-script.js` and its Google Sheet are the **retired** backend. They
are kept deliberately, and deliberately still deployed, as the rollback path
for at least one meeting cycle after the cutover. Do not delete either until
the Worker has carried a full cycle of real signups. Nothing in the site calls
them any more.

### Calendar Subscription

The site generates a dynamic iCal feed at `/calendar.ics` that includes:
- All scheduled meetings with times and locations
- Automatic updates when new meetings are added
- Compatible with Google Calendar, Apple Calendar, and Outlook

## 🥪 Snack Management

The snack system implements binary assignment logic:
- Only one family can be assigned per meeting
- Visual indicators show assignment status
- Real-time updates through the signups Worker
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
```

The signups API needs no environment variable here: `src/lib/signups.ts` holds
the Worker URL, and the Worker's own settings (D1 binding, `CONFIG_URL`) live
in `workers/signups/wrangler.toml`.

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
   - Exercise the signups backend with `npm run test:worker`, or
     `npm run worker:dev` for a local Worker; the dev site otherwise talks to
     the deployed Worker, which holds real data

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
2. Test signup changes with `npm run test:worker` and `npm test` — never by
   POSTing to the deployed Worker, which writes real rows for real children
3. Verify photo sync works with your R2 setup
4. Update documentation for any new features

## 🆘 Troubleshooting

### Common Issues

**Photos not displaying:**
- Check R2 bucket permissions and CORS settings
- Verify folder naming follows `YYYY-MM-DD` format
- Ensure environment variables are set correctly

**RSVP not updating:**
- `400 unknown person` / `400 unknown meeting date` — the name or date is not
  in `/signups-config.json` yet. Either it is missing from
  `src/config/season.ts`, or the site deploy that publishes it landed less
  than five minutes ago and the Worker's config cache is still stale. Check
  `https://fll.sharpers.com/signups-config.json` first.
- `503 roster unavailable` — the Worker could not fetch `CONFIG_URL` and has
  nothing cached. Reads still work, so the page looks healthy while writes are
  refused. Check the site is up and `CONFIG_URL` in
  `workers/signups/wrangler.toml` is right.
- Anything else — check `wrangler tail` on `fll-signups`, and that
  `/health` returns `{"ok":true}`.

**Calendar subscription not working:**
- Verify `/calendar.ics` endpoint is accessible
- Check that meeting dates are properly formatted
- Ensure iCal MIME type is correctly set

## 📄 License

This project is built for the FLL Team Llamas. Feel free to adapt for your own team needs.