/**
 * The concept rendered by the app. Each concept branch changes only this file
 * (plus its own folder under src/concepts/), so main stays a clean base.
 */
import type { ComponentType } from 'react';
import type { ThemeId } from '../theme/themes';
import { JourneyStory } from './journey/JourneyStory';

export const activeConcept: { readonly theme: ThemeId; readonly Story: ComponentType } = {
  theme: 'journey',
  Story: JourneyStory,
};
