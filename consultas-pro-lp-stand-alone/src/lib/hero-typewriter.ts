export const HERO_LINES = ['Consultas de crédito', 'inteligentes e modulares.'] as const;

export const DELAY_BEFORE_TYPING = 0.35;
export const STAGGER = 0.038;
export const CHAR_DURATION = 0.12;
export const CURSOR_PAUSE_AFTER_TEXT = 0.1;
export const CURSOR_FADE_DURATION = 0.55;

function getCharacterCount() {
  return HERO_LINES.join('').length;
}

/** Duração aproximada até o cursor do typewriter aparecer (para sincronizar outros efeitos). */
export function getHeroTypewriterCursorStartMs(): number {
  const n = getCharacterCount();
  if (n === 0) return 0;
  return (DELAY_BEFORE_TYPING + (n - 1) * STAGGER + CHAR_DURATION + CURSOR_PAUSE_AFTER_TEXT) * 1000;
}
