import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera um servidor Node autocontido em .next/standalone para a imagem Docker
  // (usado no deploy via EasyPanel). Ver Dockerfile.
  output: "standalone",
  images: {
    formats: ["image/webp"],
  },
};

export default nextConfig;
