/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  compress: true,
  images: {
    unoptimized: true
  },
  // REMOVA a opção appDir que está causando o erro
  // experimental: {} // ← Comente ou remova completamente
}

export default nextConfig;
