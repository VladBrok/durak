export function getCssVarValue(name: string): number {
  const raw = window.getComputedStyle(document.body).getPropertyValue(name);
  const value = Number.parseFloat(raw);

  if (Number.isNaN(value)) {
    throw new Error(`Failed to parse value '${raw}' of property '${name}'.`);
  }

  return value;
}
