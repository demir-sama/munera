/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // Browser polyfills needed by @solana/web3.js / anchor
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false, os: false, crypto: false };
      config.plugins.push(new webpack.ProvidePlugin({ Buffer: ["buffer", "Buffer"] }));
    }
    config.externals = [...(config.externals || []), "pino-pretty", "encoding"];
    return config;
  },
};
export default nextConfig;
