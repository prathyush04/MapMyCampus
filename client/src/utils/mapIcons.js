
export const CATEGORY_ICON_COLOR = {
  food:     '#f97316',
  academic: '#3b82f6',
  sports:   '#22c55e',
  admin:    '#6b7280',
  medical:  '#ef4444',
  facility: '#8b5cf6',
  other:    '#eab308',
};


export function makeIcon(color = '#3b82f6', selected = false) {
  const size = selected ? 32 : 24;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 36" width="${size}" height="${size * 1.125}">
    <path d="M16 0C8.268 0 2 6.268 2 14c0 10.5 14 22 14 22s14-11.5 14-22C30 6.268 23.732 0 16 0z"
          fill="${color}" stroke="#0f172a" stroke-width="1.5" stroke-opacity="0.5" />
    <circle cx="16" cy="14" r="6" fill="#0f172a" />
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
