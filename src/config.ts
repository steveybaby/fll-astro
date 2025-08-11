export interface SiteConfig {
  title: string;
  description: string;
  author: {
    name: string;
    bio: string;
    avatar?: string;
  };
  social: {
    github?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    email?: string;
  };
  siteUrl: string;
}

export const config: SiteConfig = {
  title: "FLL Astro",
  description: "FIRST Lego League team blog and meeting documentation",
  author: {
    name: "FLL Team",
    bio: "FIRST Lego League robotics team sharing our journey, meetings, and progress throughout the season.",
    // avatar: "/images/avatar.jpg" // Uncomment and add your avatar image to public/images/
  },
  social: {
    // github: "https://github.com/yourusername",
    // twitter: "https://twitter.com/yourusername",
    // linkedin: "https://linkedin.com/in/yourusername",
    email: "team@fll-astro.com"
  },
  siteUrl: "https://fll-astro.com"
};

// Export constants for SEO component
export const SITE_TITLE = config.title;
export const SITE_DESCRIPTION = config.description;