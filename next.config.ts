import type { NextConfig } from "next";

// /api/* is proxied to the real backend by app/api/[...path]/route.ts, not
// by a next.config.ts rewrite — a plain rewrite's Headers merges multiple
// Set-Cookie response headers into one broken, comma-joined value, which
// silently mangles the accessToken/refreshToken pair that login sets at
// once. The route handler forwards them individually instead.
const nextConfig: NextConfig = {};

export default nextConfig;
