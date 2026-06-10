// Category → Leaflet marker colour mapping
export const CATEGORY_ICON_COLOR = {
  food:     '#f97316',
  academic: '#3b82f6',
  sports:   '#22c55e',
  admin:    '#6b7280',
  medical:  '#ef4444',
  facility: '#8b5cf6',
  other:    '#eab308',
};

// Returns an SVG data URL for a coloured pin marker
export function makeIcon(color = '#3b82f6', selected = false) {
  const size = selected ? 36 : 28;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="${size}" height="${size}">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z"
          fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
