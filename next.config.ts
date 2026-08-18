import type { NextConfig } from "next";

// The real backend origin — set as a (server-only, non-NEXT_PUBLIC_) env
// var on Vercel. Every /api/* call the frontend makes gets transparently
// proxied to it, so from the browser's point of view it never leaves
// medibok.vercel.app. That's what makes the auth cookies first-party:
// a direct cross-site fetch straight to the Render URL has its Set-Cookie
// silently dropped by Safari's ITP (and Chrome's third-party-cookie
// blocking), since the frontend and backend are on different sites
// (vercel.app vs onrender.com). Falls back to the local dev backend.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/:path*` },
    ];
  },
};

export default nextConfig;
