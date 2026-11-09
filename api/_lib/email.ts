import type { ContactInput } from './schema.js';
import { sanitizeHeader, sanitizeMultiline } from './sanitize.js';

export interface OutgoingEmail {
  readonly from: string;
  readonly to: string;
  readonly replyTo: string;
  readonly subject: string;
  readonly text: string;
}

export type SendEmail = (email: OutgoingEmail) => Promise<void>;

/**
 * Builds the plain-text notification. The visitor's address is only ever used as reply-to;
 * `from` is always the site's own verified sender. No HTML body is sent, so user content
 * cannot inject markup.
 */
export function buildEmail(
  input: ContactInput,
  config: { readonly from: string; readonly to: string },
): OutgoingEmail {
  const name = sanitizeHeader(input.name);
  const email = sanitizeHeader(input.email);
  const subjectLine = input.subject ? sanitizeHeader(input.subject) : '';
  const subject = `[Portfolio] ${subjectLine || `Message from ${name}`}`.slice(0, 200);
  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    subjectLine ? `Subject: ${subjectLine}` : null,
    '',
    sanitizeMultiline(input.message),
    '',
    '— Sent from the portfolio contact form',
  ]
    .filter((line) => line !== null)
    .join('\n');

  return { from: config.from, to: config.to, replyTo: email, subject, text };
}

export class EmailProviderError extends Error {
  constructor(readonly status: number) {
    super(`Email provider responded with status ${status}`);
    this.name = 'EmailProviderError';
  }
}

/** Resend REST API via fetch (no SDK dependency). https://resend.com/docs/api-reference */
export function createResendSender(apiKey: string, fetchImpl: typeof fetch = fetch): SendEmail {
  return async (email) => {
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: email.from,
        to: [email.to],
        reply_to: email.replyTo,
        subject: email.subject,
        text: email.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new EmailProviderError(response.status);
  };
}
