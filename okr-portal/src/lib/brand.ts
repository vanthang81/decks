// Nhận diện BTMH. Palette thương hiệu: maroon #7C0312 · gold #C8A951 · ivory #FAF6F0.
// Logo emblem (maroon badge + khung gold + monogram "M") nhúng data-URI (không asset rời).
export const BRAND = {
  name: 'BTMH OKR',
  full: 'BTMH OKR Portal',
  primary: '#7C0312', // maroon
  primaryDark: '#5E0210',
  accent: '#C8A951', // gold
};

const EMBLEM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#7C0312"/><rect x="6" y="6" width="52" height="52" rx="10" fill="none" stroke="#C8A951" stroke-width="2"/><path d="M17 45 V21 L32 35 L47 21 V45" fill="none" stroke="#C8A951" stroke-width="4.2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="15.5" r="2.6" fill="#C8A951"/></svg>`;

export const FAVICON = `data:image/svg+xml;utf8,${encodeURIComponent(EMBLEM_SVG)}`;
export const LOGO = FAVICON;
