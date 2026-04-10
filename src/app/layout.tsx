import type { Metadata } from "next";
import localFont from 'next/font/local';
import "./globals.css";

// Fonts are served from committed WOFF2 files in /public/fonts/ to avoid
// network fetches to fonts.gstatic.com during build (H4 — build reliability).
const pressStart2P = localFont({
  src: '../../public/fonts/PressStart2P-Regular.woff2',
  variable: '--font-pixel',
  display: 'swap',
});

const vt323 = localFont({
  src: '../../public/fonts/VT323-Regular.woff2',
  variable: '--font-vt323',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "bury.lol — A final resting place for things the internet loved and lost",
  description: "Buy a grave. Write a eulogy. Let it go.",
  openGraph: {
    title: "bury.lol",
    description: "A final resting place for things the internet loved and lost.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "bury.lol",
    description: "A final resting place for things the internet loved and lost.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${pressStart2P.variable} ${vt323.variable}`}>
      <body className="min-h-screen bg-bg text-cream antialiased">
        {children}
      </body>
    </html>
  );
}
