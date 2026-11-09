import type { en } from './en';

/** Same keys as `en`, every leaf a string. TypeScript enforces EN/PT key parity. */
type Widen<T> = { readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

export type Dictionary = Widen<typeof en>;
