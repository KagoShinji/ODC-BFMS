/** @type {import('next').NextConfig} */
const nextConfig = {
  // Development and production use different webpack chunk layouts.
  // Keep their generated files apart when `next dev` and `next build` overlap.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
