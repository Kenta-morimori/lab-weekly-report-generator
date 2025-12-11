import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://lab-weekly-report-generator.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "研究室・週報 PDF ジェネレーター",
  description: "前週・今週の記録から週報 PDF を作成します。",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "研究室・週報 PDF ジェネレーター",
    description: "前週・今週の記録から週報 PDF を作成します。",
    url: baseUrl,
    siteName: "研究室・週報 PDF ジェネレーター",
    images: [
      {
        url: "/thumbnail.png",
        width: 1200,
        height: 630,
        alt: "週報 PDF ジェネレーター",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "研究室・週報 PDF ジェネレーター",
    description: "前週・今週の記録から週報 PDF を作成します。",
    images: ["/thumbnail.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
