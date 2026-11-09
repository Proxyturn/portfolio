import type { ReactNode } from 'react';
import type { YearMonth } from '../../content/types';
import { isoMonth } from './code';

/**
 * One output line. Its parent (a `term-row`) clips it, and the scroll scene slides it up while
 * it fades in, as a whole line. At rest it is simply visible. `scrub` marks lines that the
 * pinned "Now" window reveals with the scroll instead.
 */
export function Line({
  children,
  className,
  scrub = false,
  block = false,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly scrub?: boolean;
  /** A <div>, for a line that holds paragraphs (the message of the day, the README). */
  readonly block?: boolean;
}) {
  const Tag = block ? 'div' : 'span';
  return (
    <Tag
      className={className ? `term-line reveal ${className}` : 'term-line reveal'}
      data-scrub={scrub ? '' : undefined}
    >
      {children}
    </Tag>
  );
}

/** A prompt line: `$ command`, optionally with a translated `# comment`. */
export function Cmd({
  command,
  comment,
  heading = false,
}: {
  readonly command: string;
  readonly comment?: string;
  /** Rendered as an <h3>, for commands that title a block (ls certs/, locale). */
  readonly heading?: boolean;
}) {
  const content = (
    <Line>
      <span className="term-prompt" aria-hidden="true">
        $
      </span>{' '}
      <code lang="en">{command}</code>
      {comment && (
        <span className="term-comment">
          {' '}
          <span aria-hidden="true"># </span>
          {comment}
        </span>
      )}
    </Line>
  );
  return heading ? (
    <h3 className="term-row term-cmd">{content}</h3>
  ) : (
    <p className="term-row term-cmd">{content}</p>
  );
}

/** Terminal or editor window: a decorative title bar and the body, ending in a prompt. */
export function Window({
  children,
  className,
  cursor = true,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  /** The trailing `$ ▌` prompt. Its cursor blinks only while the window's lines reveal. */
  readonly cursor?: boolean;
}) {
  return (
    <div className={className ? `term-window ${className}` : 'term-window'}>
      <div className="term-window__bar" aria-hidden="true">
        <span className="term-window__dot" />
        <span className="term-window__dot" />
        <span className="term-window__dot" />
      </div>
      <div className="term-window__body">
        {children}
        {cursor && (
          <p className="term-row term-cmd term-cmd--idle" aria-hidden="true">
            <Line>
              <span className="term-prompt">$</span> <span className="term-cursor" />
            </Line>
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * The arrow between two log values (`2019-10 → 2021-10`, `[INCIDENT] → [RESOLVED]`). Drawn as
 * SVG because U+2192 is not in the Latin subsets of the self-hosted fonts. Screen readers get
 * an en dash between dates instead.
 */
export function Arrow({ spoken }: { readonly spoken?: string }) {
  return (
    <span className="term-arrow">
      <svg className="term-arrow__icon" viewBox="0 0 18 10" aria-hidden="true" focusable="false">
        <path d="M1 5h15M12 1.5 16 5l-4 3.5" />
      </svg>
      {spoken && <span className="visually-hidden"> {spoken} </span>}
    </span>
  );
}

/** `(2019-10 → 2021-10)`, or `(2022-06)` for a single date. */
export function Period({
  start,
  end = null,
}: {
  readonly start: YearMonth;
  readonly end?: YearMonth | null;
}) {
  return (
    <span className="term-date">
      (<time dateTime={isoMonth(start)}>{isoMonth(start)}</time>
      {end && (
        <>
          <Arrow spoken="–" />
          <time dateTime={isoMonth(end)}>{isoMonth(end)}</time>
        </>
      )}
      )
    </span>
  );
}
