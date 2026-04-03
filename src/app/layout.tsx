import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from 'next/font/google';
import "./globals.css";

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
  display: 'swap',
});

const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
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
