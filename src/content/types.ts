/** Supported site languages. `pt` is rendered with `<html lang="pt-BR">`. */
export type Lang = 'en' | 'pt';

/** A string written in both languages, side by side. */
export interface Localized {
  readonly en: string;
  readonly pt: string;
}

/** Calendar month, 1-12. */
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface YearMonth {
  readonly year: number;
  readonly month: Month;
}

/** Story beats, in the order every concept must tell them (spec, section 5). */
export type ChapterId =
  'hook' | 'origins' | 'enterprise' | 'energy' | 'breadth' | 'now' | 'next' | 'toolbox' | 'contact';

/** Industry sector, used by concepts that theme chapters by world. */
export type Sector = 'industrial' | 'banking' | 'energy' | 'corporate' | 'cement' | 'ai';

export type SkillId =
  | 'csharp'
  | 'javascript'
  | 'typescript'
  | 'react'
  | 'angular'
  | 'xamarin'
  | 'mendix'
  | 'rest'
  | 'mvc'
  | 'sqlserver'
  | 'azuredevops'
  | 'cloud'
  | 'oop'
  | 'backend'
  | 'architecture'
  | 'debugging'
  | 'maintenance'
  | 'agile';

export type SkillGroup = 'languages' | 'frameworks' | 'concepts';

export interface Skill {
  readonly id: SkillId;
  readonly group: SkillGroup;
  /** Display name. Most are proper nouns and identical in both languages. */
  readonly name: Localized;
}

export interface Job {
  /** Stable id, used for anchors and test ids. */
  readonly id: string;
  readonly chapter: Extract<ChapterId, 'origins' | 'enterprise' | 'energy' | 'breadth' | 'now'>;
  /** Omitted when the CV names no client or sector for the job. */
  readonly sector?: Sector;
  readonly company: string;
  /** Previous company name, e.g. Semantix "formerly ATOS". */
  readonly formerly?: string;
  /** Project or client names as written in the CV. */
  readonly project?: string;
  readonly role?: Localized;
  readonly start: YearMonth;
  /** `null` means "present". */
  readonly end: YearMonth | null;
  readonly highlights: readonly Localized[];
  /**
   * Skills explicitly named in this job's CV entry. Only technologies or practices the CV
   * text states for this job are listed here; nothing is inferred.
   */
  readonly skills: readonly SkillId[];
}

export interface Education {
  readonly id: string;
  /** Story beat this entry belongs to (degree in Origins, postgraduate in Next). */
  readonly chapter: Extract<ChapterId, 'origins' | 'next'>;
  readonly title: Localized;
  readonly institution: string;
  /** `null` end with `inProgress` = still studying. */
  readonly graduated: YearMonth | null;
  readonly inProgress: boolean;
  readonly topics?: readonly Localized[];
}

export interface Certification {
  readonly id: string;
  readonly title: Localized;
  readonly hours?: number;
}

export type Fluency = 'native' | 'fluent' | 'basic';

export interface SpokenLanguage {
  readonly id: string;
  readonly name: Localized;
  readonly fluency: Fluency;
}

export interface Identity {
  readonly name: string;
  readonly location: Localized;
  /**
   * Email split and reversed so the address never appears as a plain string in HTML or JS.
   * Assemble it only at runtime with `assembleEmail()`.
   */
  readonly emailParts: { readonly userReversed: string; readonly domainReversed: string };
  readonly links: {
    readonly linkedin: string;
    readonly github: string;
  };
  /** Public path of the sanitized CV PDF. */
  readonly cvPath: string;
}

export interface Chapter {
  readonly id: ChapterId;
  /** Short label for chapter navigation. */
  readonly navLabel: Localized;
  readonly title: Localized;
}

export interface CV {
  readonly identity: Identity;
  readonly hook: Localized;
  readonly role: Localized;
  readonly summary: readonly Localized[];
  readonly chapters: readonly Chapter[];
  readonly jobs: readonly Job[];
  readonly skills: readonly Skill[];
  readonly education: readonly Education[];
  readonly certifications: readonly Certification[];
  readonly spokenLanguages: readonly SpokenLanguage[];
}
