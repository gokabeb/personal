import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const letter = defineCollection({
  loader: glob({ pattern: 'index.mdoc', base: './src/content/letter' }),
});

const writing = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    kind: z.enum(['poem', 'essay', 'radio', 'book', 'press']),
    blurb: z.string().default(''),
    published: z.boolean().default(false),
    externalUrl: z.string().nullish(),
    text: z.string().nullish(),
  }),
});

export const collections = { letter, writing };
