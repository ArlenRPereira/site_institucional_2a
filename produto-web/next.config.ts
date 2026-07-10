import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  // Gera um servidor Node autocontido em .next/standalone para a imagem Docker
  // (usado no deploy via EasyPanel). Ver Dockerfile.
  output: "standalone",
  // Expõe a versão do projeto (package.json) ao bundle — exibida no rodapé.
  // Fonte única de verdade: bumps no package.json refletem automaticamente na UI.
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  images: {
    formats: ["image/webp"],
  },
  // Headers de segurança (A05 Security Misconfiguration) aplicados a toda rota.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
