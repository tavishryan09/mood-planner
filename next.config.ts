import type { NextConfig } from "next";

// To analyze bundle size, run: ANALYZE=true npm run build
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Performance optimizations
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: ['react-day-picker', 'date-fns', 'cally'],
  },

  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Server-side code optimization
  serverExternalPackages: [
    '@azure/msal-node',
    '@microsoft/microsoft-graph-client',
    'xlsx',
    'bcrypt',
  ],
};

export default withBundleAnalyzer(nextConfig);
