import { getCurrentSeason } from './config/season';

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

const season = getCurrentSeason();

export const config: SiteConfig = {
  title: season.teamName,
  description: `FIRST LEGO League ${season.challenge} season — meetings, schedule, and progress`,
  author: {
    name: "FLL Team",
    bio: `FIRST LEGO League robotics team sharing our ${season.challenge} season journey.`,
    avatar: "/images/avatar.jpg"
  },
  social: {
    // github: "https://github.com/yourusername",
    // twitter: "https://twitter.com/yourusername",
    // linkedin: "https://linkedin.com/in/yourusername",
    email: "steve@sharpers.com",
  },
  siteUrl: "https://fll.sharpers.com"
};

// Export constant for SEO component
export const SITE_DESCRIPTION = config.description;
