/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  // Build ID fixe pour éviter les problèmes de cache en développement
  generateBuildId: async () => {
    if (process.env.NODE_ENV === 'development') {
      return 'dev-build';
    }
    return 'build-' + Date.now();
  },
  // Optimisations pour le développement
  swcMinify: true,
  // S'assurer que les fichiers CSS sont générés
  experimental: {
    optimizeCss: false,
  },
  // Configuration pour WSL - permettre l'accès depuis Windows
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
