import { buildImageDeckHtml } from './slidesHtml';

// Tên file được coi là tài liệu cần convert (PDF/PPTX…) thay vì HTML.
export function isConvertibleDoc(name: string, type?: string): boolean {
  const n = (name || '').toLowerCase();
  if (/\.(pdf|pptx|ppt|odp|key)$/.test(n)) return true;
  const t = (type || '').toLowerCase();
  return t === 'application/pdf' || t.includes('presentation') || t.includes('powerpoint');
}

// Gọi dịch vụ deck-converter: file (PDF/PPTX) -> ảnh từng slide -> deck HTML self-contained.
// Trả null nếu chưa cấu hình converter hoặc convert lỗi (caller tự xử lý thông báo).
export async function convertDocToDeckHtml(data: ArrayBuffer, filename: string, title: string): Promise<string | null> {
  const base = process.env.CONVERTER_URL;
  if (!base) return null;
  const token = process.env.CONVERTER_TOKEN;
  try {
    const fd = new FormData();
    fd.append('file', new Blob([data]), filename);
    const res = await fetch(`${base}/convert`, {
      method: 'POST',
      headers: token ? { 'x-token': token } : undefined,
      body: fd,
      signal: AbortSignal.timeout(180000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; pages?: unknown };
    if (!json?.ok || !Array.isArray(json.pages) || json.pages.length === 0) return null;
    const pages = json.pages.filter((p): p is string => typeof p === 'string');
    if (!pages.length) return null;
    return buildImageDeckHtml(pages, title);
  } catch {
    return null;
  }
}
