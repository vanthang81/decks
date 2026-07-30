// Nhận diện OKR Portal. Favicon SVG nhúng data-URI (không để asset rời).
export const BRAND = {
  name: 'BTMH OKR',
  full: 'BTMH OKR Portal',
  primary: '#4338ca', // indigo 700
  primaryDark: '#3730a3',
  accent: '#0ea5e9',
};

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#4338ca"/><circle cx="32" cy="32" r="17" fill="none" stroke="#fff" stroke-width="6"/><circle cx="32" cy="32" r="5" fill="#0ea5e9"/></svg>`;

export const FAVICON = `data:image/svg+xml;utf8,${encodeURIComponent(FAVICON_SVG)}`;
