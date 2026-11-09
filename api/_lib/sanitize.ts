/** Unicode line/paragraph separators and bidi override/isolate controls (can disguise text). */
const INVISIBLE_FORMAT = '\u2028\u2029\u202A-\u202E\u2066-\u2069';

/** C0/C1 control characters except tab (U+0009) and line feed (U+000A). */
const CONTROL = '\u0000-\u0008\u000B-\u001F\u007F-\u009F';

const STRIP = new RegExp(`[${CONTROL}${INVISIBLE_FORMAT}]`, 'g');

/**
 * Removes control and invisible formatting characters that have no place in a plain-text
 * email. CRLF / CR are normalised to LF first.
 */
export function sanitizeMultiline(value: string): string {
  return value.replace(/\r\n?/g, '\n').replace(STRIP, '');
}

/** For header-bound values: also collapses any remaining whitespace runs to one space. */
export function sanitizeHeader(value: string): string {
  return sanitizeMultiline(value).replace(/\s+/g, ' ').trim();
}
