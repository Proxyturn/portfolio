/**
 * Pure email assembly, shared by the site (`selectors.assembleEmail`) and the CV PDF build
 * (`scripts/cv/build.ts`, which Node loads directly, so this file has no runtime imports).
 */
import type { Identity } from './types';

const reverse = (value: string): string => value.split('').reverse().join('');

/** Builds the address from its reversed parts, in memory only. */
export function emailFromParts(parts: Identity['emailParts']): string {
  return `${reverse(parts.userReversed)}@${reverse(parts.domainReversed)}`;
}
