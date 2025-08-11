import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
    excerpt: z.string().optional(),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    author: z.string().default('Anonymous'),
    image: z.string().optional(),
  }),
});

const meetings = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    startTime: z.string().optional(), // Format: "16:30" (4:30 PM)
    duration: z.number().optional(), // Duration in hours (e.g., 1.5)
    location: z.string().optional(), // Meeting location
    agenda: z.array(z.string()).default([]),
    assignments: z.array(z.object({
      name: z.string(),
      assignee: z.string(),
      completed: z.boolean().optional(),
      due: z.coerce.date().optional(),
    })).default([]),
    photos: z.array(z.string()).default([]),
  }),
});

export const collections = { blog, meetings };