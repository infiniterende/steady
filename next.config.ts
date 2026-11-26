import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A self-contained server build, used by the Dockerfile for Google Cloud Run.
  output: "standalone",
};

export default nextConfig;
