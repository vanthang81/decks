/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  // Deck HTML render qua route (dangerouslySetInnerHTML) — nội dung do CFO/Claude kiểm soát trong repo.
};

export default nextConfig;
