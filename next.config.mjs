/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  // Deck HTML render qua route (dangerouslySetInnerHTML) — nội dung do CFO/Claude kiểm soát trong repo.
  experimental: {
    // Upload nội dung deck (tải file .html/.pdf/.pptx) đi qua Server Action; mặc định Next chặn body 1MB
    // → deck HTML self-contained (ảnh/font nhúng) hay file PDF/PPTX >1MB bị chặn. Nâng khớp nginx (20m ở location /).
    serverActions: { bodySizeLimit: '20mb' },
  },
};

export default nextConfig;
