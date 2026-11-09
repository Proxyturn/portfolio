import { z } from 'zod';
import { CONTACT_LIMITS, MIN_FILL_MS } from '../../shared/contact.js';

/** No CR/LF anywhere in header-bound fields (prevents email header injection). */
const singleLine = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((value) => !/[\r\n]/.test(value), 'line breaks not allowed');

/**
 * Authoritative validation for /api/contact. `.strict()` rejects unknown fields.
 * The honeypot must be empty and the form must have been open for MIN_FILL_MS.
 */
export const contactSchema = z
  .object({
    name: singleLine(CONTACT_LIMITS.name).pipe(z.string().min(1)),
    email: singleLine(CONTACT_LIMITS.email).pipe(z.email()),
    subject: singleLine(CONTACT_LIMITS.subject).optional(),
    message: z.string().trim().min(1).max(CONTACT_LIMITS.message),
    website: z.string().max(0),
    elapsedMs: z.number().int().min(MIN_FILL_MS).max(86_400_000),
  })
  .strict();

export type ContactInput = z.infer<typeof contactSchema>;
