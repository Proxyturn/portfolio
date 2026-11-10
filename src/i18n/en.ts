/**
 * English UI strings (interface chrome only; CV facts live in src/content/cv.ts).
 * This object defines the dictionary shape: pt-BR must match it key for key.
 * Placeholders use {name} syntax and are filled by `format()`.
 */
export const en = {
  meta: {
    title: 'William Amaro Finardi · Software Developer',
    description:
      'Software Developer from Porto Alegre, Brazil. Backend and full-stack development across banking, energy and corporate systems; now studying AI Engineering.',
  },
  a11y: {
    skipToContent: 'Skip to content',
    chapterNav: 'Chapters',
    readingProgress: 'Reading progress',
    opensInNewTab: '(opens in a new tab)',
  },
  language: {
    groupLabel: 'Language',
    english: 'English',
    portuguese: 'Português',
  },
  story: {
    role: 'Role',
    skillsUsed: 'Skills used',
    education: 'Education',
    certifications: 'Courses and certifications',
    spokenLanguages: 'Spoken languages',
    skillPrompt: 'Pick a skill to see where it was used.',
    skillUsedIn: 'Used in',
    skillNoJob: 'Part of the overall skill set; not tied to one specific role in the CV.',
    inProgress: 'In progress',
    graduated: 'Graduated {date}',
    hours: '{hours} hours',
    skillGroups: {
      languages: 'Languages',
      frameworks: 'Frameworks and technologies',
      concepts: 'Concepts',
    },
    fluency: {
      native: 'Native',
      fluent: 'Fluent',
      basic: 'Basic',
    },
  },
  contact: {
    intro: 'Send a message, or reach out on LinkedIn or GitHub.',
    linkedin: 'LinkedIn',
    github: 'GitHub',
    downloadCv: 'Download CV (PDF)',
    revealEmail: 'Show email address',
    emailLabel: 'Email',
    form: {
      legend: 'Contact form',
      name: 'Name',
      email: 'Your email',
      subject: 'Subject (optional)',
      message: 'Message',
      honeypot: 'Leave this field empty',
      submit: 'Send message',
      sending: 'Sending…',
      success: 'Thanks! Your message was sent.',
      error: 'Sorry, the message could not be sent. Please try again later or use email.',
      rateLimited: 'Too many messages. Please try again later.',
    },
    errors: {
      required: 'This field is required.',
      email: 'Enter a valid email address.',
      tooLong: 'Use at most {max} characters.',
      lineBreaks: 'Line breaks are not allowed here.',
    },
  },
  footer: {
    rights: '© {year} William Amaro Finardi. All rights reserved.',
  },
  /**
   * Worlds / clickable-world concept (concept/worlds branch only). Version 2 copy approved
   * by William (2026-11-09; first PT option where two were offered).
   */
  worlds: {
    title: 'Six districts, one developer',
    hint: 'Scroll to travel, or choose a building to explore',
    startExploring: 'Start exploring',
    worldMap: 'World map',
    backToMap: 'Back to the map',
    youAreHere: 'You are here',
    districts: {
      industrial: 'Industrial district',
      banking: 'Banking district',
      betweenWorlds: 'Between worlds',
      energy: 'Energy district',
      corporate: 'Corporate district',
      cement: 'Cement, cargo and trucks district',
      ai: 'AI frontier',
      workshop: 'Workshop',
      postOffice: 'Post office',
    },
    /** Map labels approved by William on 2026-11-10 (with the spike). */
    mapLabels: {
      betweenWorldsAtos: 'Between worlds · ATOS',
      computerScience: 'Computer Science · UniRitter',
    },
  },
} as const;
