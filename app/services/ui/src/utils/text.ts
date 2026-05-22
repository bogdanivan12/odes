export const compareAlphabetical = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

export const toTitleLabel = (value: string): string => value
  .split('_')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

/**
 * Abbreviates a course name so it fits on a single timetable row.
 *
 * - If the name is already short (≤ 16 chars) it is returned unchanged.
 * - Otherwise, each whitespace-separated word whose alphabetic content is
 *   ≥ 3 chars contributes some leading characters; words with fewer than
 *   3 alphabetic characters (articles, prepositions, …) are dropped.
 * - The number of characters taken per word scales with the word count so
 *   that fewer words get more characters each, targeting ~12 chars total:
 *     1 word  → up to 12 chars   ("Informatica" → "Informatica" unchanged ≤16)
 *     2 words → 6 chars each     ("Programare Avansata" → "PrograAvansa")
 *     3 words → 4 chars each     ("Structuri de Date" → "StruDate" — "de" dropped)
 *     4 words → 3 chars each     ("Dezvoltarea Aplicatiilor Web PHP" → "DezAplWebPHP")
 *     5+ words → 2–3 chars each
 *
 * Example: "Dezvoltarea Aplicatiilor Web in PHP" → "DezAplWebPHP"
 */
const ABBREV_THRESHOLD = 16;
const ABBREV_TARGET    = 12;

export function abbreviateCourse(name: string): string {
  if (name.length <= ABBREV_THRESHOLD) return name;

  const words = name
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z]/g, ''))
    .filter((alpha) => alpha.length >= 3);

  if (words.length === 0) return name;

  const charsPerWord = Math.max(1, Math.ceil(ABBREV_TARGET / words.length));

  return words
    .map((alpha) => alpha.charAt(0).toUpperCase() + alpha.slice(1, charsPerWord))
    .join('');
}

