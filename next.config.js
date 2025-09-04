/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  compress: true,
  images: {
    unoptimized: true // Importante para Netlify
  },
  // Remova qualquer configuração experimental problemática
}

module.exports = nextConfig