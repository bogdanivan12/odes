export const compareAlphabetical = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

export const toTitleLabel = (value: string): string => value
  .split('_')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

