import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin file tracing to this project (a stray lockfile elsewhere on the machine
  // can otherwise be mistaken for the workspace root).
  outputFileTracingRoot: process.cwd(),
  // The app is fully client-side (no backend). These options keep builds
  // portable across Vercel and Cloudflare Pages.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
