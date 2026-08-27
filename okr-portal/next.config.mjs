/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  // nodemailer không "webpack-friendly" (dynamic require) → giữ external để Next COPY nguyên
  // module vào .next/standalone/node_modules thay vì bundle (tránh MODULE_NOT_FOUND lúc chạy).
  // Next 14: dùng experimental.serverComponentsExternalPackages (top-level serverExternalPackages là Next 15).
  experimental: {
    serverComponentsExternalPackages: ['nodemailer'],
  },
};

export default nextConfig;
