// Bóc tách User-Agent thành trình duyệt + hệ điều hành dễ đọc (không cần thư viện ngoài).
export function parseUA(ua: string | null | undefined): { browser: string; os: string; raw: string } {
  const raw = (ua ?? '').trim();
  if (!raw) return { browser: 'Không rõ', os: 'Không rõ', raw: '' };

  let os = 'Không rõ';
  if (/windows nt 10/i.test(raw)) os = 'Windows 10/11';
  else if (/windows/i.test(raw)) os = 'Windows';
  else if (/iphone|ipad|ipod/i.test(raw)) os = /ipad/i.test(raw) ? 'iPadOS' : 'iOS';
  else if (/mac os x/i.test(raw)) os = 'macOS';
  else if (/android/i.test(raw)) os = 'Android';
  else if (/linux/i.test(raw)) os = 'Linux';

  let browser = 'Không rõ';
  const m = (re: RegExp) => raw.match(re)?.[1];
  if (/edg\//i.test(raw)) browser = `Edge ${m(/edg\/([\d.]+)/i) ?? ''}`.trim();
  else if (/opr\/|opera/i.test(raw)) browser = `Opera ${m(/(?:opr|opera)\/([\d.]+)/i) ?? ''}`.trim();
  else if (/chrome\//i.test(raw) && !/edg\//i.test(raw)) browser = `Chrome ${m(/chrome\/([\d.]+)/i) ?? ''}`.trim();
  else if (/crios\//i.test(raw)) browser = `Chrome iOS ${m(/crios\/([\d.]+)/i) ?? ''}`.trim();
  else if (/firefox\//i.test(raw)) browser = `Firefox ${m(/firefox\/([\d.]+)/i) ?? ''}`.trim();
  else if (/safari\//i.test(raw)) browser = `Safari ${m(/version\/([\d.]+)/i) ?? ''}`.trim();

  const device = /mobile|iphone|android/i.test(raw) ? ' · Di động' : '';
  return { browser: (browser || 'Không rõ') + device, os, raw };
}
