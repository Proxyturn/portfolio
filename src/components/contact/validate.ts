import { CONTACT_LIMITS, EMAIL_PATTERN, LINE_BREAK } from '../../../shared/contact';

export type FieldName = 'name' | 'email' | 'subject' | 'message';
export type FieldError =
  | { kind: 'required' }
  | { kind: 'email' }
  | { kind: 'tooLong'; max: number }
  | { kind: 'lineBreaks' };

export type FormValues = Record<FieldName, string>;
export type FormErrors = Partial<Record<FieldName, FieldError>>;

/** Browser-side checks for a friendly UX. The server re-validates everything. */
export function validateContact(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const subject = values.subject.trim();
  const message = values.message.trim();

  if (!name) errors.name = { kind: 'required' };
  else if (name.length > CONTACT_LIMITS.name)
    errors.name = { kind: 'tooLong', max: CONTACT_LIMITS.name };
  else if (LINE_BREAK.test(values.name)) errors.name = { kind: 'lineBreaks' };

  if (!email) errors.email = { kind: 'required' };
  else if (email.length > CONTACT_LIMITS.email)
    errors.email = { kind: 'tooLong', max: CONTACT_LIMITS.email };
  else if (!EMAIL_PATTERN.test(email)) errors.email = { kind: 'email' };

  if (subject.length > CONTACT_LIMITS.subject)
    errors.subject = { kind: 'tooLong', max: CONTACT_LIMITS.subject };

  if (!message) errors.message = { kind: 'required' };
  else if (message.length > CONTACT_LIMITS.message)
    errors.message = { kind: 'tooLong', max: CONTACT_LIMITS.message };

  return errors;
}
