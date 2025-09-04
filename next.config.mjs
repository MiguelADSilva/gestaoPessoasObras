/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  output: 'standalone', // Otimiza para deploy
  images: {
    unoptimized: true // Para deploy estático
  }
}

export default nextConfig