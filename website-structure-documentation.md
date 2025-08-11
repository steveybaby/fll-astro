# FLL Team Website Structure Documentation

This document provides comprehensive guidance for recreating the Piedmont Makers Club FLL Challenge Team website in Astro framework.

## Overview

**Current Stack:** Jekyll (Ruby-based static site generator)  
**Target Stack:** Astro (JavaScript-based static site generator)  
**Site Purpose:** First Lego League team website with meeting documentation, photo galleries, and resource links  
**Domain:** https://fll.sharpers.com

## Site Configuration

### Core Settings (_config.yml equivalent)
```yaml
title: "Piedmont Makers Club FLL Challenge Team (NEED A NAME!)"
description: "A simple website with blog and photos"
url: "https://fll.sharpers.com"
baseurl: ""
```

### Development vs Production
- Production: baseurl = ""
- Local development: baseurl = "/fll"
- Uses dual config setup for environment switching

## Directory Structure

```
/
├── assets/
│   ├── css/
│   │   └── style.css
│   └── images/
│       └── meetings/
│           └── 2025-08-10/
│               └── [28 JPG/jpeg files]
├── _layouts/
│   ├── default.html
│   └── post.html
├── _posts/
│   └── 2025-08-10-welcome-to-my-site.md
├── meetings/
│   ├── 2025-08-10-season-kickoff.md
│   └── 2025-08-17-follow-up.md
├── index.md (homepage)
├── about.md
├── blog.md
├── meeting-plans.md
├── photos.md
└── _config.yml
```

## Layouts & Templates

### Default Layout (default.html)
**HTML Structure:**
- Standard HTML5 doctype
- Meta tags including cache control for development
- Responsive viewport meta tag
- Dynamic title: `{{ page.title }} | {{ site.title }}`
- CSS with cache busting: `?v={{ site.time | date: '%s' }}`

**Navigation:**
- Header with site title linking to home
- Horizontal nav menu:
  - Home (/)
  - Meetings (/meeting-plans/)
  - About (/about/)
  - Blog (/blog/)
  - Photos (/photos/)

**Footer:**
- Simple copyright with dynamic year
- Format: `© {{ year }} {{ site.title }}`

### Post Layout (post.html)
- Extends default layout
- Article wrapper with header
- Displays title and publication date
- Date format: time element for semantic markup

## Styling System

### Base Styles (assets/css/style.css)
**Typography & Layout:**
- Font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Max width: 800px with auto margins for centering
- Line height: 1.6
- Color scheme: #333 (text), #666 (muted), #007acc (links/accent)

**Component Styles:**
- Clean navigation with flexbox
- Border-bottom separators for sections
- Responsive grid for photo galleries
- Mobile-first responsive design

### Embedded Styles (in default.html)
**Photo Gallery System:**
- CSS Grid layout: `repeat(auto-fit, minmax(150px, 1fr))`
- Image dimensions: 150px height, full width, object-fit: cover
- Hover effects: scale(1.05) transform
- Responsive gap: 10px

**Lightbox Modal:**
- Full viewport overlay with rgba(0,0,0,0.9) background
- Centered image with max 90% width, 80% height
- Navigation arrows (prev/next)
- Close button (×)
- Keyboard navigation support

**Model Cards System:**
- CSS Grid: `repeat(auto-fit, minmax(280px, 1fr))`
- Card styling: #f8f9fa background, rounded corners
- Hover effects: translateY(-4px) with box-shadow
- Assignee badges: #007acc background, white text, pill shape

## Content Organization

### Pages Structure

**Homepage (index.md):**
- Layout: default
- Title: Home
- Content: FLL UNEARTHED™ season resources
- Structure: Categorized resource links with descriptions
- Featured banner with official FLL resources link

**Meeting Plans (meeting-plans.md):**
- Layout: default
- Title: Meetings
- Content: Links to upcoming and past meetings
- Structure: Chronological organization

**Individual Meeting Pages (meetings/*.md):**
- Layout: default
- Front matter includes: title, date
- Sections: Agenda, Model Building Assignments, Meeting Notes, Photos
- Interactive elements: Model assignment cards, photo gallery with lightbox

**About Page (about.md):**
- Simple informational page about the team

**Blog (blog.md):**
- Blog listing page
- Integrates with Jekyll's _posts collection

**Photos (photos.md):**
- Photo gallery instructions and examples
- Sample gallery markup

### Collections & Posts

**Blog Posts (_posts/):**
- Standard Jekyll naming: YYYY-MM-DD-title.md
- Front matter: layout (post), title, date
- Permalink structure: `/:categories/:year/:month/:day/:title/`

**Meeting Documents (meetings/):**
- Date-prefixed naming convention
- Rich content with embedded HTML for interactive elements

## JavaScript Functionality

### Photo Gallery Features
**Image Management:**
- Hardcoded image list (for Jekyll compatibility)
- Dynamic gallery population
- Fallback placeholder when no images exist

**Lightbox Controls:**
- Click to open lightbox
- Keyboard navigation (Escape, Arrow keys)
- Mouse navigation (prev/next arrows)
- Click outside to close

**Implementation Pattern:**
```javascript
// Image list management
const imageList = ['image1.jpg', 'image2.jpg', ...];

// Gallery initialization
document.addEventListener('DOMContentLoaded', function() {
    loadGalleryImages();
});

// Lightbox navigation
function openLightbox(index) { /* ... */ }
function changeImage(direction) { /* ... */ }
```

## Content Strategy

### Meeting Documentation
- **Agenda items with checkboxes** (✅ for completed)
- **Model building assignments** with individual responsibility
- **Core Values integration** in meeting notes
- **Photo documentation** with automated gallery

### Resource Management
- **External FLL resource links** with descriptions
- **PDF document references** for official materials
- **Video embedding** for season content
- **Categorized organization** (General, Core Season, Judging, etc.)

## Static Site Generation Features

### Jekyll Plugins Used
- jekyll-feed (RSS/Atom feed generation)
- jekyll-sitemap (XML sitemap generation)

### File Processing
- Markdown to HTML conversion (kramdown)
- Syntax highlighting (rouge)
- Liquid templating for dynamic content

### Build Output
- Static HTML files in _site/
- Asset copying and processing
- SEO-friendly URLs

## Responsive Design

### Breakpoints
- Mobile: max-width 600px
- Desktop: default layout

### Mobile Adaptations
- Navigation: flex-direction column
- Photo gallery: single column grid
- Reduced spacing and typography scaling

## Development Environment

### Local Development Setup
- Dual configuration system (_config.yml + _config_dev.yml)
- Cache-busting for development
- Local server with file watching

### Deployment
- Static files served from _site/ directory
- Custom domain configuration via CNAME
- Git-based deployment workflow

## Content Management

### Image Management
- Organized by meeting date in assets/images/meetings/
- Multiple formats supported (JPG, jpeg)
- Manual image list maintenance for gallery functionality

### Content Updates
- Markdown-based content editing
- Front matter for page configuration
- Liquid templates for dynamic content insertion

## SEO & Performance

### Meta Tags
- Dynamic page titles
- Responsive viewport configuration
- Cache control for development builds

### Asset Optimization
- CSS cache busting with timestamp
- Optimized image loading
- Semantic HTML structure

## Migration Considerations for Astro

### Direct Equivalents
- Layouts → Astro layouts (.astro files)
- Markdown content → Astro content collections
- Static assets → public/ directory
- Liquid templating → Astro templating syntax

### Key Differences to Address
- Replace Liquid syntax with Astro templating
- Convert Jekyll plugins to Astro integrations
- Migrate JavaScript functionality to Astro components
- Update build configuration and routing
- Adapt CSS processing and asset handling

### Recommended Astro Structure
```
src/
├── layouts/
│   ├── Layout.astro
│   └── Post.astro
├── pages/
│   ├── index.md
│   ├── about.md
│   ├── blog/
│   └── meetings/
├── components/
│   ├── Navigation.astro
│   ├── PhotoGallery.astro
│   └── ModelCard.astro
└── content/
    ├── blog/
    └── meetings/
public/
├── assets/
└── images/
```

This documentation provides the complete blueprint for recreating the FLL team website in Astro while maintaining all current functionality and design patterns.