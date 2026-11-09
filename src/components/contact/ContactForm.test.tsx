import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONTACT_LIMITS } from '../../../shared/contact';
import { renderWithLang } from '../../test/render';
import { ContactForm, CONTACT_ENDPOINT } from './ContactForm';
import { validateContact } from './validate';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
  await user.type(screen.getByLabelText('Your email'), 'ada@example.com');
  await user.type(screen.getByLabelText('Subject (optional)'), 'Hello');
  await user.type(screen.getByLabelText('Message'), 'I enjoyed your portfolio.');
}

describe('ContactForm', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('shows validation messages and focuses the first invalid field', async () => {
    const user = userEvent.setup();
    renderWithLang(<ContactForm />);
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    const name = screen.getByLabelText('Name');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveFocus();
    expect(name).toHaveAccessibleDescription('This field is required.');
    expect(screen.getByLabelText('Message')).toHaveAccessibleDescription('This field is required.');

    await user.type(screen.getByLabelText('Your email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(screen.getByLabelText('Your email')).toHaveAccessibleDescription(
      'Enter a valid email address.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows messages in Portuguese', async () => {
    const user = userEvent.setup();
    renderWithLang(<ContactForm />, 'pt');
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    expect(screen.getByLabelText('Nome')).toHaveAccessibleDescription('Este campo é obrigatório.');
  });

  it('disables the button while sending, then shows success and clears the form', async () => {
    const user = userEvent.setup();
    const pending = deferred<Response>();
    fetchMock.mockReturnValue(pending.promise);
    renderWithLang(<ContactForm />);
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    const button = screen.getByRole('button', { name: 'Sending…' });
    expect(button).toBeDisabled();

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(CONTACT_ENDPOINT);
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
    const body = JSON.parse(init?.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      subject: 'Hello',
      message: 'I enjoyed your portfolio.',
      website: '',
    });
    expect(typeof body.elapsedMs).toBe('number');

    pending.resolve(new Response('{"ok":true}', { status: 200 }));
    expect(await screen.findByText('Thanks! Your message was sent.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeEnabled();
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });

  it('omits an empty subject', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    renderWithLang(<ContactForm />);
    await user.type(screen.getByLabelText('Name'), 'Ada');
    await user.type(screen.getByLabelText('Your email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Message'), 'Hi');
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as Record<
      string,
      unknown
    >;
    expect(body).not.toHaveProperty('subject');
  });

  it.each([
    [500, 'Sorry, the message could not be sent. Please try again later or use email.'],
    [429, 'Too many messages. Please try again later.'],
  ])('shows an error state for HTTP %i', async (status, message) => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(new Response('{}', { status }));
    renderWithLang(<ContactForm />);
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Ada Lovelace');
  });

  it('shows an error state when the network fails', async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValue(new TypeError('offline'));
    renderWithLang(<ContactForm />);
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(
      await screen.findByText(
        'Sorry, the message could not be sent. Please try again later or use email.',
      ),
    ).toBeInTheDocument();
  });

  it('hides the honeypot from people and assistive tech', () => {
    const { container } = renderWithLang(<ContactForm />);
    const honeypot = container.querySelector('input[name="website"]');
    expect(honeypot).toHaveAttribute('tabindex', '-1');
    expect(honeypot?.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});

describe('validateContact', () => {
  const ok = { name: 'A', email: 'a@b.co', subject: '', message: 'Hi' };

  it('accepts valid input', () => {
    expect(validateContact(ok)).toEqual({});
  });

  it('flags long fields and line breaks', () => {
    expect(validateContact({ ...ok, name: 'x'.repeat(CONTACT_LIMITS.name + 1) }).name).toEqual({
      kind: 'tooLong',
      max: CONTACT_LIMITS.name,
    });
    expect(validateContact({ ...ok, name: 'A\nB' }).name).toEqual({ kind: 'lineBreaks' });
    expect(validateContact({ ...ok, email: `${'x'.repeat(250)}@b.co` }).email?.kind).toBe(
      'tooLong',
    );
    expect(validateContact({ ...ok, subject: 'x'.repeat(151) }).subject?.kind).toBe('tooLong');
    expect(validateContact({ ...ok, message: 'x'.repeat(5001) }).message?.kind).toBe('tooLong');
  });
});
