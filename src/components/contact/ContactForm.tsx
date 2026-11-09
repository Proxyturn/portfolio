import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { CONTACT_LIMITS, HONEYPOT_FIELD, type ContactPayload } from '../../../shared/contact';
import { format } from '../../i18n/format';
import { useLanguage } from '../../i18n/context';
import type { Dictionary } from '../../i18n/types';
import { validateContact, type FieldError, type FieldName, type FormErrors } from './validate';

type Status = 'idle' | 'sending' | 'success' | 'error' | 'rateLimited';

export const CONTACT_ENDPOINT = '/api/contact';

const FIELD_ORDER: readonly FieldName[] = ['name', 'email', 'subject', 'message'];

function errorText(error: FieldError, dict: Dictionary): string {
  switch (error.kind) {
    case 'required':
      return dict.contact.errors.required;
    case 'email':
      return dict.contact.errors.email;
    case 'tooLong':
      return format(dict.contact.errors.tooLong, { max: error.max });
    case 'lineBreaks':
      return dict.contact.errors.lineBreaks;
  }
}

export function ContactForm() {
  const { dict } = useLanguage();
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<FormErrors>({});
  const shownAt = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);
  const labels = dict.contact.form;

  useEffect(() => {
    shownAt.current = Date.now();
  }, []);

  async function onSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'sending') return;
    const data = new FormData(event.currentTarget);
    const read = (key: string) => {
      const value = data.get(key);
      return typeof value === 'string' ? value : '';
    };
    const values = {
      name: read('name'),
      email: read('email'),
      subject: read('subject'),
      message: read('message'),
    };
    const found = validateContact(values);
    setErrors(found);
    const firstInvalid = FIELD_ORDER.find((field) => found[field]);
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    const subject = values.subject.trim();
    const payload: ContactPayload = {
      name: values.name.trim(),
      email: values.email.trim(),
      message: values.message.trim(),
      website: read(HONEYPOT_FIELD),
      elapsedMs: Date.now() - shownAt.current,
      ...(subject ? { subject } : {}),
    };

    setStatus('sending');
    try {
      const response = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        setStatus('success');
        formRef.current?.reset();
      } else {
        setStatus(response.status === 429 ? 'rateLimited' : 'error');
      }
    } catch {
      setStatus('error');
    }
  }

  const statusText =
    status === 'success'
      ? labels.success
      : status === 'error'
        ? labels.error
        : status === 'rateLimited'
          ? labels.rateLimited
          : '';

  const field = (name: FieldName, label: string, type: 'text' | 'email' | 'textarea') => {
    const error = errors[name];
    const errorId = `contact-${name}-error`;
    const common = {
      id: `contact-${name}`,
      name,
      maxLength: CONTACT_LIMITS[name],
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? errorId : undefined,
      required: name !== 'subject',
    } as const;
    return (
      <div className="field">
        <label htmlFor={common.id}>{label}</label>
        {type === 'textarea' ? (
          <textarea {...common} rows={6} />
        ) : (
          <input
            {...common}
            type={type}
            autoComplete={name === 'name' ? 'name' : name === 'email' ? 'email' : 'off'}
          />
        )}
        {error && (
          <p className="field__error" id={errorId}>
            {errorText(error, dict)}
          </p>
        )}
      </div>
    );
  };

  return (
    <form
      ref={formRef}
      className="form"
      noValidate
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      aria-label={labels.legend}
    >
      {field('name', labels.name, 'text')}
      {field('email', labels.email, 'email')}
      {field('subject', labels.subject, 'text')}
      {field('message', labels.message, 'textarea')}

      <div className="hp" aria-hidden="true">
        <label htmlFor="contact-website">{labels.honeypot}</label>
        <input
          id="contact-website"
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div>
        <button type="submit" className="button" disabled={status === 'sending'}>
          {status === 'sending' ? labels.sending : labels.submit}
        </button>
      </div>

      <p
        className="form__status"
        role="status"
        aria-live="polite"
        data-state={status === 'success' ? 'success' : statusText ? 'error' : undefined}
      >
        {statusText}
      </p>
    </form>
  );
}
