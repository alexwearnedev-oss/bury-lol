import { z } from 'zod';
import { stripHtml } from './sanitize';

export const checkoutSchema = z.object({
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(50, 'Subject must be 50 characters or less')
    .transform(stripHtml),
  epitaph: z
    .string()
    .max(80, 'Epitaph must be 80 characters or less')
    .optional()
    .transform((val) => (val ? stripHtml(val) : undefined)),
  buried_by: z
    .string()
    .max(30, 'Name must be 30 characters or less')
    .optional()
    .transform((val) => (val ? stripHtml(val) : undefined)),
  tier: z.number().int().min(1).max(4),
  icon: z.string().max(8).optional(),
  preferred_x: z.number().int().min(0).max(9999).optional(),
  preferred_y: z.number().int().min(0).max(9999).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
