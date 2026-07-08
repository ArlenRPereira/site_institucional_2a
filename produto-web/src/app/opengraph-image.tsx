import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { company } from "@/data/company";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const logoBase64 = readFileSync(join(process.cwd(), "public/logo-2a.png")).toString("base64");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          background: "radial-gradient(ellipse 80% 60% at 50% -10%, #1f3d1c 0%, #0f1f0f 65%)",
        }}
      >
        <img src={`data:image/png;base64,${logoBase64}`} width={104} height={83} alt="" />
        <div style={{ marginTop: 48, fontSize: 56, fontWeight: 800, color: "#ffffff", lineHeight: 1.15 }}>
          2A Desenvolvimento e Tecnologia
        </div>
        <div style={{ marginTop: 24, fontSize: 28, color: "#b7c8b8" }}>{company.ogDescription}</div>
      </div>
    ),
    { ...size }
  );
}
