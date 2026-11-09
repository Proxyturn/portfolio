import { describe, expect, it, vi } from 'vitest';
import {
  buildEmail,
  createResendSender,
  EmailProviderError,
  type OutgoingEmail,
} from '../../api/_lib/email.js';
import {
  allowedOrigins,
  clientIp,
  createContactHandler,
  type Env,
  type HandlerDeps,
  type LogEvent,
} from '../../api/_lib/handler.js';
import { hashIp, type RateLimiter } from '../../api/_lib/rate-limit.js';
import { sanitizeHeader, sanitizeMultiline } from '../../api/_lib/sanitize.js';
import { MAX_BODY_BYTES } from '../../shared/contact.js';

const ORIGIN = 'https://portfolio.example.vercel.app';
const SECRET = 're_test_secret_key_123';

const env: Env = {
  RESEND_API_KEY: SECRET,
  CONTACT_TO_EMAIL: 'owner@example.com',
  CONTACT_FROM_EMAIL: 'Portfolio <onboarding@resend.dev>',
  RATE_LIMIT_SALT: 'salt',
  UPSTASH_REDIS_REST_URL: 'https://redis.example',
  UPSTASH_REDIS_REST_TOKEN: 'token',
  VERCEL_URL: 'portfolio.example.vercel.app',
};

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'Hello',
  message: 'Hi William,\nI enjoyed your portfolio.',
  website: '',
  elapsedMs: 5000,
};

function setup(overrides: Partial<HandlerDeps> = {}) {
  const sent: OutgoingEmail[] = [];
  const logs: LogEvent[] = [];
  const sendEmail = vi.fn(async (email: OutgoingEmail) => {
    sent.push(email);
  });
  const rateLimit = vi.fn<RateLimiter>(async () => ({ allowed: true, retryAfterSeconds: 0 }));
  const handle = createContactHandler({
    env,
    sendEmail,
    rateLimit,
    log: (entry) => logs.push(entry),
    ...overrides,
  });
  return { handle, sent, logs, sendEmail, rateLimit };
}

function request(
  body: unknown,
  init: { method?: string; headers?: Record<string, string>; raw?: string } = {},
): Request {
  const method = init.method ?? 'POST';
  return new Request('https://portfolio.example.vercel.app/api/contact', {
    method,
    headers: {
      'content-type': 'application/json',
      origin: ORIGIN,
      'x-real-ip': '203.0.113.7',
      ...init.headers,
    },
    ...(method === 'GET' || method === 'HEAD' ? {} : { body: init.raw ?? JSON.stringify(body) }),
  });
}

async function expectGeneric(response: Response, status: number) {
  expect(response.status).toBe(status);
  expect(response.headers.get('cache-control')).toBe('no-store');
  const text = await response.text();
  const body = JSON.parse(text) as { ok: boolean; error: string };
  expect(body.ok).toBe(false);
  expect(Object.keys(body).sort()).toEqual(['error', 'ok']);
  expect(text).not.toMatch(/stack|at \w+ \(|Error:|re_test|token|salt|resend/i);
}

describe('POST /api/contact', () => {
  it('sends a valid message with the visitor as reply-to, never as from', async () => {
    const { handle, sent, rateLimit } = setup();
    const response = await handle(request(valid));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
    const email = sent[0];
    expect(email?.from).toBe(env.CONTACT_FROM_EMAIL);
    expect(email?.to).toBe(env.CONTACT_TO_EMAIL);
    expect(email?.replyTo).toBe('ada@example.com');
    expect(email?.subject).toBe('[Portfolio] Hello');
    expect(email?.text).toContain('I enjoyed your portfolio.');
    expect(rateLimit).toHaveBeenCalledWith(hashIp('203.0.113.7', 'salt'));
  });

  it('accepts a charset in the content type and a missing subject', async () => {
    const { handle, sent } = setup();
    const { subject: _omit, ...noSubject } = valid;
    const response = await handle(
      request(noSubject, { headers: { 'content-type': 'application/json; charset=utf-8' } }),
    );
    expect(response.status).toBe(200);
    expect(sent[0]?.subject).toBe('[Portfolio] Message from Ada Lovelace');
  });

  it.each(['GET', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])('rejects %s with 405', async (method) => {
    const { handle, sendEmail } = setup();
    const response = await handle(request(valid, { method }));
    await expectGeneric(response, 405);
    expect(response.headers.get('allow')).toBe('POST');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it.each(['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data', ''])(
    'rejects content type "%s" with 415',
    async (type) => {
      const { handle, sendEmail } = setup();
      await expectGeneric(await handle(request(valid, { headers: { 'content-type': type } })), 415);
      expect(sendEmail).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, 'https://evil.example', 'http://portfolio.example.vercel.app', 'null'])(
    'rejects origin %s with 403',
    async (origin) => {
      const { handle, sendEmail, logs } = setup();
      const headers: Record<string, string> = origin === undefined ? {} : { origin };
      const req = request(valid, { headers });
      if (origin === undefined) req.headers.delete('origin');
      await expectGeneric(await handle(req), 403);
      expect(sendEmail).not.toHaveBeenCalled();
      expect(logs).toContainEqual({ event: 'contact_rejected', reason: 'origin' });
    },
  );

  it('accepts origins from ALLOWED_ORIGINS', async () => {
    const { handle } = setup({ env: { ...env, ALLOWED_ORIGINS: 'https://williamfinardi.dev/, ' } });
    const response = await handle(
      request(valid, { headers: { origin: 'https://williamfinardi.dev' } }),
    );
    expect(response.status).toBe(200);
  });

  it('rejects oversized bodies by header and by actual size', async () => {
    const { handle, sendEmail } = setup();
    await expectGeneric(
      await handle(request(valid, { headers: { 'content-length': String(MAX_BODY_BYTES + 1) } })),
      413,
    );
    const huge = JSON.stringify({ ...valid, message: 'x'.repeat(MAX_BODY_BYTES) });
    await expectGeneric(await handle(request(null, { raw: huge })), 413);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON and an empty body', async () => {
    const { handle } = setup();
    await expectGeneric(await handle(request(null, { raw: '{"name":' })), 400);
    await expectGeneric(await handle(request(null, { raw: '' })), 400);
  });

  it.each([
    ['missing name', { ...valid, name: undefined }],
    ['empty name', { ...valid, name: '   ' }],
    ['missing message', { ...valid, message: undefined }],
    ['missing email', { ...valid, email: undefined }],
    ['invalid email', { ...valid, email: 'not-an-email' }],
    ['oversized name', { ...valid, name: 'x'.repeat(101) }],
    ['oversized subject', { ...valid, subject: 'x'.repeat(151) }],
    ['oversized message', { ...valid, message: 'x'.repeat(5001) }],
    ['oversized email', { ...valid, email: `${'x'.repeat(250)}@example.com` }],
    ['wrong type', { ...valid, name: 42 }],
    ['unknown field', { ...valid, isAdmin: true }],
    ['array body', [valid]],
    ['filled honeypot', { ...valid, website: 'https://spam.example' }],
    ['submitted too fast', { ...valid, elapsedMs: 200 }],
    ['missing timing', { ...valid, elapsedMs: undefined }],
  ])('rejects %s with 400', async (_label, body) => {
    const { handle, sendEmail } = setup();
    await expectGeneric(await handle(request(body)), 400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it.each([
    ['CRLF in name', { ...valid, name: 'Ada\r\nBcc: victim@example.com' }],
    ['LF in email', { ...valid, email: 'ada@example.com\nBcc: victim@example.com' }],
    ['CR in subject', { ...valid, subject: 'Hi\rBcc: victim@example.com' }],
    ['encoded CRLF in name', { ...valid, name: 'Ada\u000d\u000aTo: x@example.com' }],
  ])('rejects header injection (%s)', async (_label, body) => {
    const { handle, sendEmail } = setup();
    await expectGeneric(await handle(request(body)), 400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('logs only field names for invalid input, never values', async () => {
    const { handle, logs } = setup();
    await handle(request({ ...valid, email: 'secret-person@nowhere' }));
    expect(logs).toEqual([{ event: 'contact_invalid', reason: 'email' }]);
    expect(JSON.stringify(logs)).not.toContain('secret-person');
  });

  it('returns 429 with Retry-After once the limit is reached', async () => {
    let calls = 0;
    const rateLimit: RateLimiter = async () => {
      calls += 1;
      return { allowed: calls <= 5, retryAfterSeconds: 1800 };
    };
    const { handle, sendEmail } = setup({ rateLimit });
    for (let i = 0; i < 5; i++) expect((await handle(request(valid))).status).toBe(200);
    const blocked = await handle(request(valid));
    await expectGeneric(blocked, 429);
    expect(blocked.headers.get('retry-after')).toBe('1800');
    expect(sendEmail).toHaveBeenCalledTimes(5);
  });

  it('fails closed with 503 when the rate-limit store is down', async () => {
    const { handle, sendEmail, logs } = setup({
      rateLimit: async () => {
        throw new Error('ECONNREFUSED redis.internal:6379 token=abc');
      },
    });
    await expectGeneric(await handle(request(valid)), 503);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(JSON.stringify(logs)).not.toContain('ECONNREFUSED');
  });

  it('hides provider errors behind a generic 502', async () => {
    const { handle, logs } = setup({
      sendEmail: async () => {
        throw new EmailProviderError(422);
      },
    });
    await expectGeneric(await handle(request(valid)), 502);
    expect(logs).toEqual([{ event: 'contact_send_failed', status: 422 }]);
  });

  it('hides unexpected send errors too', async () => {
    const { handle, logs } = setup({
      sendEmail: async () => {
        throw new Error(`boom ${SECRET}`);
      },
    });
    await expectGeneric(await handle(request(valid)), 502);
    expect(JSON.stringify(logs)).not.toContain(SECRET);
  });

  it('returns 500 and logs only variable names when misconfigured', async () => {
    const handle = createContactHandler({
      env: { VERCEL_URL: env.VERCEL_URL },
      log: () => undefined,
    });
    await expectGeneric(await handle(request(valid)), 500);

    const logs: LogEvent[] = [];
    const handle2 = createContactHandler({
      env: { ...env, RESEND_API_KEY: undefined, UPSTASH_REDIS_REST_URL: undefined },
      log: (entry) => logs.push(entry),
    });
    await expectGeneric(await handle2(request(valid)), 500);
    expect(logs[0]?.missing).toEqual([
      'RESEND_API_KEY',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
    ]);
  });

  it('accepts the Vercel Marketplace KV_* variable names for Upstash', async () => {
    const logs: LogEvent[] = [];
    const handle = createContactHandler({
      env: {
        ...env,
        UPSTASH_REDIS_REST_URL: undefined,
        UPSTASH_REDIS_REST_TOKEN: undefined,
        KV_REST_API_URL: 'https://redis.example',
        KV_REST_API_TOKEN: 'token',
      },
      sendEmail: async () => undefined,
      log: (entry) => logs.push(entry),
    });
    // The real Upstash client cannot reach the fake URL: proves config passed, then fails closed.
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    await expectGeneric(await handle(request(valid)), 503);
    expect(logs.some((l) => l.event === 'contact_misconfigured')).toBe(false);
    fetchSpy.mockRestore();
  });
});

describe('helpers', () => {
  it('builds origins from env without trailing slashes', () => {
    expect([
      ...allowedOrigins({
        ALLOWED_ORIGINS: 'https://a.dev/,https://b.dev',
        VERCEL_BRANCH_URL: 'x-git-main.vercel.app',
        VERCEL_PROJECT_PRODUCTION_URL: 'x.vercel.app',
      }),
    ]).toEqual([
      'https://a.dev',
      'https://b.dev',
      'https://x-git-main.vercel.app',
      'https://x.vercel.app',
    ]);
    expect(allowedOrigins({}).size).toBe(0);
  });

  it('reads the client IP from Vercel headers', () => {
    const r = (headers: Record<string, string>) => new Request('https://x', { headers });
    expect(clientIp(r({ 'x-real-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2' }))).toBe('1.1.1.1');
    expect(clientIp(r({ 'x-forwarded-for': '2.2.2.2, 3.3.3.3' }))).toBe('2.2.2.2');
    expect(clientIp(r({}))).toBe('unknown');
  });

  it('hashes IPs with a salt', () => {
    expect(hashIp('1.1.1.1', 'a')).toMatch(/^[0-9a-f]{64}$/);
    expect(hashIp('1.1.1.1', 'a')).not.toBe(hashIp('1.1.1.1', 'b'));
    expect(hashIp('1.1.1.1', 'a')).not.toContain('1.1.1.1');
  });

  it('strips control and bidi characters', () => {
    const rlo = String.fromCharCode(0x202e);
    const nul = String.fromCharCode(0);
    const ls = String.fromCharCode(0x2028);
    expect(sanitizeMultiline(`a\r\nb\rc${nul}d${rlo}e${ls}f\tg`)).toBe('a\nb\ncdef\tg');
    expect(sanitizeHeader('  a \n b\t c ')).toBe('a b c');
  });

  it('builds a plain-text email body with the visitor data as text only', () => {
    const email = buildEmail(
      { ...valid, message: '<script>alert(1)</script>' },
      { from: 'Site <s@example.com>', to: 'o@example.com' },
    );
    expect(email.text).toContain('<script>alert(1)</script>');
    expect(email).not.toHaveProperty('html');
    expect(email.subject.length).toBeLessThanOrEqual(200);
  });
});

describe('Resend sender', () => {
  it('posts JSON with reply_to and bearer auth', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response('{}', { status: 200 }));
    const send = createResendSender('key', fetchImpl);
    await send({ from: 'f', to: 't', replyTo: 'r', subject: 's', text: 'x' });
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe('https://api.resend.com/emails');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer key');
    expect(JSON.parse(init?.body as string)).toEqual({
      from: 'f',
      to: ['t'],
      reply_to: 'r',
      subject: 's',
      text: 'x',
    });
  });

  it('throws a status-only error on failure', async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () => new Response('{"message":"bad key"}', { status: 401 }),
    );
    const send = createResendSender('key', fetchImpl);
    await expect(
      send({ from: 'f', to: 't', replyTo: 'r', subject: 's', text: 'x' }),
    ).rejects.toEqual(new EmailProviderError(401));
  });
});
