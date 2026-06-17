import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root — a stray lockfile in the home dir confuses inference.
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;
