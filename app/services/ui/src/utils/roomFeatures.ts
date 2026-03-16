export const parseFeatures = (value: string): string[] => value
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

export const featuresToInput = (features?: string[]) => (features ?? []).join(', ');

