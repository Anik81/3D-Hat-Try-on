const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  webpack: (config) => {
    // Handle Three.js modules and GLB/GLTF files
    config.module.rules.push({
      test: /\.(glb|gltf)$/,
      use: [
        {
          loader: 'file-loader',
          options: {
            publicPath: '/_next/static/models/',
            outputPath: 'static/models/',
          },
        },
      ],
    });

    // Configure path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    
    return config;
  },
}

module.exports = nextConfig