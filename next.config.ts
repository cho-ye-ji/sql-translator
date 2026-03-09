import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "export",
  basePath: "/sql-translator",
  images: { unoptimized: true },
};

export default nextConfig;
