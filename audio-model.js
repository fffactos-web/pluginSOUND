export const defaults = { devices: ['', ''], names: ['Наушники', 'Динамики'], output: 0 };
export function gainFor(volume) {
  if (!Number.isFinite(volume)) throw new Error('Некорректная громкость');
  return Math.max(0, Math.min(100, volume)) / 100;
}
export function nextOutput(output) { return output === 0 ? 1 : 0; }
