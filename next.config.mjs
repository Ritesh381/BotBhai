/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pdf-parse", "firebase-admin", "mammoth"],
  // The embed.js file is served as a route handler under /embed-script/loader.js
  // and rewritten to /embed.js via the rewrites below.
  async rewrites() {
    return [
      { source: "/embed.js", destination: "/api/embed-loader" },
    ];
  },
};

export default nextConfig;