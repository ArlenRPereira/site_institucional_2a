import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { JsonLd } from "@/components/common/JsonLd";
import { company } from "@/data/company";
import { env } from "@/lib/env";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const APP_NAME = "2A Desenvolvimento e Tecnologia";

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  applicationName: APP_NAME,
  title: {
    default: `${APP_NAME} | SaaS, IA, ESG e Engenharia Social`,
    template: `%s | ${APP_NAME}`,
  },
  description: company.seoDescription,
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    locale: "pt_BR",
    url: env.appUrl,
    title: APP_NAME,
    description: company.ogDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: company.ogDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  alternates: { canonical: env.appUrl },
};

export const viewport: Viewport = {
  themeColor: "#0f1f0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans antialiased">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: company.legalName,
            url: env.appUrl,
            email: company.email,
            description: company.ogDescription,
          }}
        />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
