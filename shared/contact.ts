/**
 * Contact form contract shared by the browser form (UX validation only) and the
 * /api/contact function (authoritative validation). Keep this file dependency-free:
 * it is compiled for both the browser bundle and the Node function.
 */
export const CONTACT_LIMITS = {
  name: 100,
  email: 254,
  subject: 150,
  message: 5000,
} as const;

/** Hidden field that humans never fill. Bots that fill it are rejected. */
export const HONEYPOT_FIELD = 'website';

/** Submissions faster than this after the form appeared are treated as bots. */
export const MIN_FILL_MS = 3000;

/** Upper bound for the JSON request body. */
export const MAX_BODY_BYTES = 16 * 1024;

export interface ContactPayload {
  name: string;
  email: string;
  subject?: string;
  message: string;
  /** Honeypot: must be an empty string. */
  website: string;
  /** Milliseconds between the form appearing and submit. */
  elapsedMs: number;
}

/** Deliberately simple; the server applies the full Zod email check. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LINE_BREAK = /[\r\n]/;
