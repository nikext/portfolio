import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML export: the site is served as plain files (Cloudflare Pages).
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
