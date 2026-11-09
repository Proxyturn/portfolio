import { MAX_BODY_BYTES } from '../../shared/contact.js';
import { buildEmail, createResendSender, type SendEmail } from './email.js';
import { createUpstashLimiter, hashIp, type RateLimiter } from './rate-limit.js';
import { contactSchema } from './schema.js';

/** Contact submissions allowed per IP per window (confirmed with William: 5 per hour). */
export const RATE_LIMIT = { limit: 5, window: '1 h' } as const;

export type Env = Readonly<Record<string, string | undefined>>;

export interface LogEvent {
  readonly event: string;
  readonly reason?: string;
  readonly status?: number;
  readonly missing?: readonly string[];
}

export interface HandlerDeps {
  readonly env: Env;
  /** Overrides for tests. When omitted they are built from `env`. */
  readonly sendEmail?: SendEmail;
  readonly rateLimit?: RateLimiter;
  /** Structured, PII-free logging. Never receives the message, name, email or IP. */
  readonly log?: (entry: LogEvent) => void;
}

/** Generic, client-safe messages. Details stay in server logs. */
const MESSAGES = {
  400: 'Invalid request.',
  403: 'Forbidden.',
  405: 'Method not allowed.',
  413: 'Request too large.',
  415: 'Unsupported content type.',
  429: 'Too many requests. Please try again later.',
  500: 'Something went wrong. Please try again later.',
  502: 'The message could not be sent. Please try again later.',
  503: 'Service temporarily unavailable. Please try again later.',
} as const;

type ErrorStatus = keyof typeof MESSAGES;

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

function fail(status: ErrorStatus, headers?: Record<string, string>): Response {
  return json(status, { ok: false, error: MESSAGES[status] }, headers);
}

/** Origins the form may be posted from: explicit list plus this deployment's own URLs. */
export function allowedOrigins(env: Env): Set<string> {
  const origins = new Set<string>();
  for (const origin of (env.ALLOWED_ORIGINS ?? '').split(',')) {
    const trimmed = origin.trim().replace(/\/$/, '');
    if (trimmed) origins.add(trimmed);
  }
  for (const host of [env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL]) {
    if (host) origins.add(`https://${host}`);
  }
  return origins;
}

export function clientIp(request: Request): string {
  const real = request.headers.get('x-real-ip')?.trim();
  if (real) return real;
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || 'unknown';
}

class BodyTooLargeError extends Error {}

/** Reads the body as text, aborting as soon as it exceeds `limit` bytes. */
async function readBody(request: Request, limit: number): Promise<string> {
  if (!request.body) return '';
  const reader = (request.body as ReadableStream<Uint8Array>).getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

const REQUIRED_ENV = ['CONTACT_TO_EMAIL', 'CONTACT_FROM_EMAIL', 'RATE_LIMIT_SALT'];

function redisConfig(env: Env): { url: string; token: string } | null {
  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

const defaultLog = (entry: LogEvent) => {
  console.warn(JSON.stringify({ scope: 'api/contact', ...entry }));
};

export function createContactHandler(deps: HandlerDeps): (request: Request) => Promise<Response> {
  const log = deps.log ?? defaultLog;

  return async function handle(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return fail(405, { Allow: 'POST' });
    }

    const origin = request.headers.get('origin');
    if (!origin || !allowedOrigins(deps.env).has(origin)) {
      log({ event: 'contact_rejected', reason: 'origin' });
      return fail(403);
    }

    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
      return fail(415);
    }

    const declaredLength = Number(request.headers.get('content-length') ?? '0');
    if (declaredLength > MAX_BODY_BYTES) return fail(413);

    const env = deps.env;
    const missing = REQUIRED_ENV.filter((name) => !env[name]);
    if (!deps.sendEmail && !env.RESEND_API_KEY) missing.push('RESEND_API_KEY');
    const redis = redisConfig(env);
    if (!deps.rateLimit && !redis)
      missing.push('UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN');
    if (missing.length > 0) {
      // Names only, never values.
      log({ event: 'contact_misconfigured', missing });
      return fail(500);
    }

    // Rate limit every well-formed attempt, valid or not, so bots cannot probe for free.
    const rateLimit =
      deps.rateLimit ??
      createUpstashLimiter({
        url: redis?.url ?? '',
        token: redis?.token ?? '',
        ...RATE_LIMIT,
      });
    try {
      const result = await rateLimit(hashIp(clientIp(request), env.RATE_LIMIT_SALT ?? ''));
      if (!result.allowed) {
        log({ event: 'contact_rate_limited' });
        return fail(429, { 'Retry-After': String(result.retryAfterSeconds) });
      }
    } catch {
      // Fail closed: without the limiter the form would be an open relay for spam.
      log({ event: 'contact_rate_limit_unavailable' });
      return fail(503);
    }

    let raw: string;
    try {
      raw = await readBody(request, MAX_BODY_BYTES);
    } catch (error) {
      if (error instanceof BodyTooLargeError) return fail(413);
      return fail(400);
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return fail(400);
    }

    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      // Only the failing field names are logged, never their values.
      const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? '')))];
      log({ event: 'contact_invalid', reason: fields.join(',') || 'shape' });
      return fail(400);
    }

    const sendEmail = deps.sendEmail ?? createResendSender(env.RESEND_API_KEY ?? '');
    try {
      await sendEmail(
        buildEmail(parsed.data, {
          from: env.CONTACT_FROM_EMAIL ?? '',
          to: env.CONTACT_TO_EMAIL ?? '',
        }),
      );
    } catch (error) {
      const status =
        typeof error === 'object' && error !== null && 'status' in error
          ? Number(error.status)
          : undefined;
      log({ event: 'contact_send_failed', ...(status !== undefined ? { status } : {}) });
      return fail(502);
    }

    return json(200, { ok: true });
  };
}
