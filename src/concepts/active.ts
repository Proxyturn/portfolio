/**
 * The concept rendered by the app. Each concept branch points this at its Story and adds
 * its own folder under src/concepts/, its i18n group, its E2E spec and any approved
 * dependencies. Changes to shared code land on main first, so main stays a clean base.
 */
import type { ComponentType } from 'react';
import type { ThemeId } from '../theme/themes';
import { BaseStory } from './base/BaseStory';

export const activeConcept: { readonly theme: ThemeId; readonly Story: ComponentType } = {
  theme: 'base',
  Story: BaseStory,
};
